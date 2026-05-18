import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { B2StorageService } from '@/modules/upload/services/b2-storage.service';
import { ImpositionCalcService, ImpositionInput, BindingType } from '@/modules/imposition/services/imposition-calc.service';
import { ImpositionImagePdfService, ImageEntry } from '@/modules/imposition/services/imposition-image-pdf.service';
import { getUploadBasePath } from '@/modules/upload/services/file-storage.service';
import { PRINT_ROOM_QUEUE, PrintRoomJobPayload } from './print-room-queue.service';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

/** order.service.sanitizeStorageKeyPart 와 동일 — B2 키 매칭용 */
function sanitizeStorageKeyPart(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\.+/, '')
    .replace(/\.\./g, '_')
    .replace(/[^a-zA-Z0-9._/-]/g, '_');
}

/**
 * OrderItem.size 를 PrintRoomPreset.sizeCode 형식으로 정규화.
 *
 * - "8x10인치" / "8×10" / "8x10" → "8x10"
 * - "A4" + (width>=height ? 가로 : 세로) → "A4가로" / "A4세로"
 * - 인치/inch/in 단위어 제거
 *
 * 매핑되지 않으면 원본 size 를 trim 해서 반환.
 */
export function parseSizeCode(size: string): string {
  if (!size) return '';
  const raw = String(size).trim();
  const cleaned = raw
    .replace(/인치|inch(es)?|in\b/gi, '')
    .replace(/\s+/g, '')
    .trim();

  // A4 / A3 / A5 등 + 방향
  const aMatch = cleaned.match(/^(A\d|B\d)(가로|세로|landscape|portrait)?$/i);
  if (aMatch) {
    const base = aMatch[1].toUpperCase();
    const orient = (aMatch[2] || '').toLowerCase();
    if (orient === '가로' || orient === 'landscape') return `${base}가로`;
    if (orient === '세로' || orient === 'portrait') return `${base}세로`;
    return `${base}세로`; // 기본 세로
  }

  // "WxH" / "W×H" — 다양한 구분자 통일
  const dim = cleaned.replace(/[×Xx]/g, 'x');
  const m = dim.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
  if (m) {
    const w = parseFloat(m[1]);
    const h = parseFloat(m[2]);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      // 정수면 정수로, 소수면 소수로 유지
      const norm = (n: number) => (Number.isInteger(n) ? String(n) : String(n));
      return `${norm(w)}x${norm(h)}`;
    }
  }

  return raw;
}

/**
 * sizeCode → 인쇄물 너비/높이(mm) 추론.
 *
 * - "WxH" 인치 (이 ERP는 사진관 상품 위주로 인치 입력이 표준): 인치 → mm
 * - "A4세로"/"A4가로": ISO 표준
 * - 매칭 실패 시 null
 */
export function sizeCodeToMm(sizeCode: string): { width: number; height: number } | null {
  if (!sizeCode) return null;

  // A 시리즈 (mm 단위)
  const aSeries: Record<string, [number, number]> = {
    A3: [297, 420],
    A4: [210, 297],
    A5: [148, 210],
    A6: [105, 148],
    B4: [250, 353],
    B5: [176, 250],
  };
  const aMatch = sizeCode.match(/^(A\d|B\d)(가로|세로)?$/);
  if (aMatch) {
    const base = aMatch[1];
    const orient = aMatch[2] || '세로';
    const [w, h] = aSeries[base] ?? [];
    if (w && h) {
      return orient === '가로' ? { width: h, height: w } : { width: w, height: h };
    }
  }

  // "WxH" 인치
  const m = sizeCode.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
  if (m) {
    const w = parseFloat(m[1]);
    const h = parseFloat(m[2]);
    if (!isNaN(w) && !isNaN(h)) {
      // 1 inch = 25.4 mm
      return { width: w * 25.4, height: h * 25.4 };
    }
  }
  return null;
}

@Processor(PRINT_ROOM_QUEUE)
export class PrintRoomProcessor extends WorkerHost {
  private readonly logger = new Logger(PrintRoomProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly b2: B2StorageService,
    private readonly impositionCalc: ImpositionCalcService,
    private readonly impositionImagePdf: ImpositionImagePdfService,
  ) {
    super();
  }

  async process(job: Job<PrintRoomJobPayload>): Promise<void> {
    const { printRoomJobId, orderItemId } = job.data;
    this.logger.log(`[처리시작] PrintRoomJob ${printRoomJobId} (OrderItem ${orderItemId})`);

    // PrintRoomJob 을 processing 으로
    await this.prisma.printRoomJob.update({
      where: { id: printRoomJobId },
      data: { status: 'processing' },
    });

    try {
      await this.runJob(printRoomJobId, orderItemId);
      this.logger.log(`[처리완료] PrintRoomJob ${printRoomJobId}`);
    } catch (err) {
      const message = (err as Error)?.message || String(err);
      const stack = (err as Error)?.stack;
      this.logger.error(`[처리실패] PrintRoomJob ${printRoomJobId}: ${message}`, stack);

      await this.prisma.printRoomJob.update({
        where: { id: printRoomJobId },
        data: {
          status: 'failed',
          errorLog: message.substring(0, 4000),
          processedAt: new Date(),
        },
      });
      await this.prisma.orderItem.update({
        where: { id: orderItemId },
        data: { printRoomStatus: 'waiting' },
      });
      throw err; // BullMQ 재시도 동작 (attempts: 3)
    }
  }

  private async runJob(printRoomJobId: string, orderItemId: string): Promise<void> {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: { select: { id: true, orderNumber: true } },
        files: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!item) {
      throw new Error(`OrderItem ${orderItemId} 없음`);
    }
    if (!item.files.length) {
      throw new Error(`OrderItem ${orderItemId} 에 활성 파일이 없습니다`);
    }

    const printMethod = (item.printMethod || '').toLowerCase();
    const isIndigo = printMethod.includes('indigo') || printMethod.includes('인디고');

    if (isIndigo) {
      await this.processIndigo(printRoomJobId, item);
    } else {
      // 기본은 잉크젯 — 파일 그대로 print-ready/ 로 복사
      await this.processInkjet(printRoomJobId, item);
    }
  }

  /** 인디고: 임포지션 PDF 생성 → B2 업로드 */
  private async processIndigo(
    printRoomJobId: string,
    item: Awaited<ReturnType<PrintRoomProcessor['fetchItem']>>,
  ): Promise<void> {
    await this.prisma.orderItem.update({
      where: { id: item.id },
      data: { printRoomStatus: 'imposing' },
    });

    const orderNumber = item.order.orderNumber;
    const sizeCode = parseSizeCode(item.size);

    // 활성 PrintRoomPreset 조회
    const preset = await this.prisma.printRoomPreset.findFirst({
      where: { sizeCode, isActive: true },
    });

    // 인쇄물 mm 산출
    const sizeMm = sizeCodeToMm(sizeCode);
    if (!sizeMm) {
      throw new Error(`사이즈 코드 변환 실패: "${item.size}" → "${sizeCode}"`);
    }

    const marginMm = preset?.marginMm ?? 10;
    const gridCols = preset?.gridCols ?? 1;
    const gridRows = preset?.gridRows ?? 1;
    const paperOrientation = preset?.paperOrientation ?? 'landscape';

    // 시트 크기 — preset 의 grid 와 인쇄물 크기로 산출
    // grid 가 1x1 이면 단순히 인쇄물 + 여백, 그 이상이면 cols/rows 만큼 곱해 산출
    const productW = sizeMm.width;
    const productH = sizeMm.height;
    let sheetW = gridCols * productW + 2 * marginMm;
    let sheetH = gridRows * productH + 2 * marginMm;
    // paperOrientation 이 landscape 인데 sheetW < sheetH 면 swap
    if (paperOrientation === 'landscape' && sheetW < sheetH) {
      const tmp = sheetW;
      sheetW = sheetH;
      sheetH = tmp;
    }
    if (paperOrientation === 'portrait' && sheetW > sheetH) {
      const tmp = sheetW;
      sheetW = sheetH;
      sheetH = tmp;
    }

    // B2 → 로컬 캐시 다운로드 (Railway 컨테이너 재시작 대응)
    const uploadBase = getUploadBasePath();
    const filesForHydrate = item.files.map((f) => ({
      originalPath: f.originalPath,
      fileUrl: f.fileUrl,
      fileName: f.fileName,
    }));
    await this.b2.hydrateB2CacheForFiles(
      orderNumber,
      filesForHydrate,
      uploadBase,
      (f: any) => resolveLocalPath(f, uploadBase),
    );

    // 임포지션 계산
    const bindingType: BindingType =
      ((item.bindingType || '').toLowerCase() as BindingType) || 'flat';
    const calcInput: ImpositionInput = {
      productWidth: productW,
      productHeight: productH,
      pageCount: item.pages || item.files.length,
      bindingType: ['compressed', 'tack', 'perfect', 'flat'].includes(bindingType)
        ? bindingType
        : 'flat',
      sheetWidth: sheetW,
      sheetHeight: sheetH,
      marginTop: marginMm,
      marginRight: marginMm,
      marginBottom: marginMm,
      marginLeft: marginMm,
      bleed: 0,
      gutter: 0,
    };
    const calcResult = this.impositionCalc.calculate(calcInput);

    // 이미지 엔트리: pageNumber 는 1-based — files 의 sortOrder 순서
    const images: ImageEntry[] = [];
    for (let i = 0; i < item.files.length; i++) {
      const f = item.files[i];
      const localPath = resolveLocalPath(
        {
          originalPath: f.originalPath,
          fileUrl: f.fileUrl,
          fileName: f.fileName,
        },
        uploadBase,
      );
      if (!localPath) {
        this.logger.warn(`[인디고] 파일 ${f.fileName} 로컬 경로 없음 — 회색 폴백 처리`);
        continue;
      }
      if (!existsSync(localPath)) {
        this.logger.warn(`[인디고] 파일 ${f.fileName} 존재하지 않음: ${localPath}`);
        continue;
      }
      images.push({ pageNumber: i + 1, filePath: localPath });
    }

    if (images.length === 0) {
      throw new Error('임포지션할 이미지가 하나도 없습니다 (모두 다운로드 실패)');
    }

    // PDF 빌드
    const pdfBytes = await this.impositionImagePdf.build(calcResult, {
      images,
      jobMetaText: `${orderNumber} / ${item.productName} / ${item.size}`,
      jobMetaOrderNumber: orderNumber,
    });

    // B2 업로드 — print-ready/{YYMMDD}/인디고/{orderNum}/imposed_{jobId}.pdf
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${yy}${mm}${dd}`;
    const safeOrder = sanitizeStorageKeyPart(orderNumber);
    const pdfFileName = `imposed_${printRoomJobId}.pdf`;
    const b2Key = `print-ready/${datePrefix}/인디고/${safeOrder}/${pdfFileName}`;

    await this.b2.putPrivateObject(b2Key, Buffer.from(pdfBytes), 'application/pdf');

    // PrintReadyFile 레코드 생성
    await this.prisma.printReadyFile.create({
      data: {
        orderItemId: item.id,
        b2Key,
        fileName: pdfFileName,
        fileSize: pdfBytes.byteLength,
        printMethod: 'indigo',
        fileType: 'pdf',
      },
    });

    // PrintRoomJob 완료 기록
    await this.prisma.printRoomJob.update({
      where: { id: printRoomJobId },
      data: {
        status: 'done',
        pdfB2Key: b2Key,
        pageCount: calcResult.sheetCount,
        sourceFileCount: images.length,
        presetId: preset?.id ?? null,
        processedAt: new Date(),
      },
    });

    await this.prisma.orderItem.update({
      where: { id: item.id },
      data: {
        printRoomStatus: 'imposed',
        printRoomReadyAt: new Date(),
      },
    });
  }

  /** 잉크젯: 원본 파일을 B2 print-ready/ 로 서버사이드 복사 */
  private async processInkjet(
    printRoomJobId: string,
    item: Awaited<ReturnType<PrintRoomProcessor['fetchItem']>>,
  ): Promise<void> {
    const orderNumber = item.order.orderNumber;
    const safeOrder = sanitizeStorageKeyPart(orderNumber);

    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${yy}${mm}${dd}`;

    let copiedCount = 0;
    let totalBytes = 0;

    for (const f of item.files) {
      const safeName = sanitizeStorageKeyPart(f.fileName);
      const sourceKey = `orders/${safeOrder}/originals/${safeName}`;
      const destKey = `print-ready/${datePrefix}/잉크젯/${safeOrder}/${safeName}`;

      try {
        await this.b2.copyObject(sourceKey, destKey);
      } catch (err) {
        this.logger.warn(
          `[잉크젯] 복사 실패 ${sourceKey} → ${destKey}: ${(err as Error)?.message}`,
        );
        continue;
      }

      const ext = (safeName.split('.').pop() || '').toLowerCase();
      const fileType = ext === 'pdf' ? 'pdf' : 'jpg';

      await this.prisma.printReadyFile.create({
        data: {
          orderItemId: item.id,
          b2Key: destKey,
          fileName: f.fileName,
          fileSize: f.fileSize ?? 0,
          printMethod: 'inkjet',
          fileType,
        },
      });

      copiedCount++;
      totalBytes += f.fileSize ?? 0;
    }

    if (copiedCount === 0) {
      throw new Error('B2 복사된 파일이 0개 — 원본 키 매칭 실패');
    }

    await this.prisma.printRoomJob.update({
      where: { id: printRoomJobId },
      data: {
        status: 'done',
        sourceFileCount: copiedCount,
        processedAt: new Date(),
      },
    });

    await this.prisma.orderItem.update({
      where: { id: item.id },
      data: {
        printRoomStatus: 'ready',
        printRoomReadyAt: new Date(),
      },
    });
  }

  /** TS 타입 유틸 — include 결과 타입 추론용 (실행되지 않음) */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async fetchItem(orderItemId: string) {
    return this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: { select: { id: true, orderNumber: true } },
        files: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' as const },
        },
      },
    }) as Promise<NonNullable<Awaited<ReturnType<PrismaService['orderItem']['findUnique']>>> & {
      order: { id: string; orderNumber: string };
      files: Array<{
        id: string;
        fileName: string;
        fileUrl: string;
        originalPath: string | null;
        fileSize: number;
        sortOrder: number;
      }>;
    }>;
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<PrintRoomJobPayload>, err: Error) {
    this.logger.error(
      `[Worker] Job ${job?.id} failed after ${job?.attemptsMade}/${job?.opts?.attempts ?? '?'} attempts: ${err?.message}`,
    );
  }
}

/**
 * OrderFile 의 로컬 경로 해석.
 *
 * 우선순위:
 *   1) originalPath (절대 경로) → 존재하면 그대로
 *   2) .b2-cache/{orderNumber}/{fileName} (hydrate 가 mutate 했을 수 있음)
 *   3) fileUrl 이 '/uploads/...' 형식이면 uploadBase + 나머지
 */
function resolveLocalPath(
  f: { originalPath?: string | null; fileUrl?: string | null; fileName?: string | null },
  uploadBase: string,
): string {
  if (f.originalPath) {
    if (existsSync(f.originalPath)) return f.originalPath;
  }
  const url = f.fileUrl || '';
  if (url.startsWith('/uploads/')) {
    const candidate = join(uploadBase, url.replace(/^\/uploads\//, ''));
    if (existsSync(candidate)) return candidate;
  }
  return '';
}
