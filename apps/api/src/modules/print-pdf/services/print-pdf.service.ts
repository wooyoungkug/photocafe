import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  GeneratePrintPdfDto,
  PdfJobProgress,
  PDF_JOB_STATUS,
  PrintQueueQueryDto,
} from '../dto/print-pdf.dto';
import { PrintPdfRendererService, IndexData } from './print-pdf-renderer.service';
import { PrintPdfLayoutService, SpecInput, PaperInput } from './print-pdf-layout.service';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

@Injectable()
export class PrintPdfService implements OnModuleInit {
  private readonly logger = new Logger(PrintPdfService.name);

  /** 메모리 기반 Job 상태 캐시 (DB와 병행) */
  private jobs = new Map<string, PdfJobProgress>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: PrintPdfRendererService,
    private readonly layout: PrintPdfLayoutService,
  ) {}

  /**
   * 서버 부팅 시 좀비 상태 회수.
   * - 이전 실행에서 in_progress/pending 상태로 남은 PdfJob → failed로 전환
   * - OrderItem.pdfStatus도 in_progress 상태면 failed로 회수
   */
  async onModuleInit() {
    try {
      const zombieJobs = await this.prisma.pdfJob.updateMany({
        where: { status: { in: ['pending', 'in_progress'] } },
        data: { status: 'failed' },
      });
      const zombieItems = await (this.prisma as any).pdfJobItem?.updateMany?.({
        where: { status: { in: ['pending', 'in_progress'] } },
        data: { status: 'failed', error: 'Server restarted' },
      });
      const zombieOrderItems = await this.prisma.orderItem.updateMany({
        where: { pdfStatus: 'in_progress' },
        data: { pdfStatus: 'failed' },
      });
      if (zombieJobs.count || zombieOrderItems.count) {
        this.logger.warn(
          `PDF Job recovery on boot: jobs=${zombieJobs.count}, items=${zombieItems?.count ?? 0}, orderItems=${zombieOrderItems.count}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`PDF Job recovery failed: ${err.message}`);
    }
  }

  /**
   * 출력대기 주문 목록 조회
   */
  async getQueue(query: PrintQueueQueryDto) {
    const where: any = {
      OR: [
        { status: 'in_production', currentProcess: 'print_waiting' },
        { status: 'print_waiting' },
      ],
    };

    // 날짜 필터
    if (query.dateFrom || query.dateTo) {
      where.orderedAt = {};
      if (query.dateFrom) where.orderedAt.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const endDate = new Date(query.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        where.orderedAt.lt = endDate;
      }
    }

    // 스튜디오명 검색
    if (query.studioName) {
      where.client = { clientName: { contains: query.studioName, mode: 'insensitive' } };
    }

    // 긴급만
    if (query.urgentOnly) {
      where.isUrgent = true;
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          client: { select: { id: true, clientName: true } },
          items: {
            include: {
              files: { orderBy: { sortOrder: 'asc' } },
            },
          },
        },
        orderBy: [{ isUrgent: 'desc' }, { orderedAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    // 규격별 nup 조회를 위한 Specification 캐시
    const sizeSet = new Set<string>();
    orders.forEach((order) =>
      order.items.forEach((item: any) => {
        if (item.size) sizeSet.add(item.size);
      }),
    );
    const specs = await this.prisma.specification.findMany({
      where: { name: { in: Array.from(sizeSet) } },
      select: { name: true, nup: true },
    });
    const nupMap = new Map(specs.map((s) => [s.name, s.nup]));

    // 항목별로 규격, 용지 필터 적용 (후처리)
    const items = orders.flatMap((order) =>
      order.items
        .filter((item: any) => {
          if (query.spec && item.size !== query.spec) return false;
          if (query.paper && item.paper !== query.paper) return false;
          return true;
        })
        .map((item: any) => ({
          id: item.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          isUrgent: order.isUrgent,
          studioName: order.client?.clientName || '-',
          clientId: order.client?.id,
          productionNumber: item.productionNumber,
          productName: item.productName,
          folderName: item.folderName,
          size: item.size,
          pages: item.pages,
          printMethod: item.printMethod,
          paper: item.paper,
          bindingType: item.bindingType,
          colorIntentId: item.colorIntentId,
          fileCount: item.files?.length || 0,
          nup: nupMap.get(item.size) || null,
          orderedAt: order.orderedAt,
          requestedDeliveryDate: order.requestedDeliveryDate,
          pdfStatus: item.pdfStatus || (
            // 유효한 원본 파일이 없으면 실패로 표시
            (item.files || []).every((f: any) => !f.originalPath || f.storageStatus === 'deleted' || f.storageStatus === 'missing')
              ? 'failed'
              : null
          ),
        })),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 개별 항목 상세 (파일 목록 포함)
   */
  async getQueueItemDetail(orderItemId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        files: { orderBy: { sortOrder: 'asc' } },
        order: {
          include: {
            client: { select: { id: true, clientName: true } },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('주문 항목을 찾을 수 없습니다.');
    }

    return item;
  }

  /**
   * PDF 생성 요청 (비동기 Job 방식)
   */
  async generatePdf(dto: GeneratePrintPdfDto): Promise<PdfJobProgress> {
    const jobId = crypto.randomUUID();

    // 대기 항목부터 주문번호/스튜디오명을 표시하기 위해 먼저 조회
    const metas = await this.prisma.orderItem.findMany({
      where: { id: { in: dto.orderItemIds } },
      select: {
        id: true,
        order: {
          select: {
            orderNumber: true,
            client: { select: { clientName: true } },
          },
        },
      },
    });
    const metaById = new Map(metas.map((m) => [m.id, m]));

    const job: PdfJobProgress = {
      jobId,
      status: 'pending',
      totalItems: dto.orderItemIds.length,
      completedItems: 0,
      results: dto.orderItemIds.map((id) => {
        const m = metaById.get(id);
        return {
          orderItemId: id,
          orderNumber: m?.order?.orderNumber || '',
          studioName: m?.order?.client?.clientName || '',
          status: 'pending',
        };
      }),
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // DB에 Job 영속화 (재시작 대비)
    try {
      await this.prisma.pdfJob.create({
        data: {
          id: jobId,
          status: 'pending',
          totalItems: job.totalItems,
          completedItems: 0,
          items: {
            create: job.results.map((r, idx) => ({
              orderItemId: r.orderItemId,
              orderNumber: r.orderNumber || '',
              studioName: r.studioName || '',
              status: 'pending',
              sortOrder: idx,
            })),
          },
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to persist PdfJob ${jobId}: ${err.message}`);
    }

    // 비동기로 실행 (await 하지 않음)
    this.processJob(jobId, dto).catch((err) => {
      this.logger.error(`Job ${jobId} failed: ${err.message}`, err.stack);
      const j = this.jobs.get(jobId);
      if (j) {
        j.status = 'failed';
      }
      this.prisma.pdfJob
        .update({ where: { id: jobId }, data: { status: 'failed' } })
        .catch(() => {});
    });

    return job;
  }

  /**
   * Job 상태 조회 (메모리 우선, 없으면 DB에서 복원)
   */
  async getJobStatus(jobId: string): Promise<PdfJobProgress | undefined> {
    const cached = this.jobs.get(jobId);
    if (cached) return cached;

    try {
      const dbJob = await this.prisma.pdfJob.findUnique({
        where: { id: jobId },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
      if (!dbJob) return undefined;

      return {
        jobId: dbJob.id,
        status: dbJob.status as PdfJobProgress['status'],
        totalItems: dbJob.totalItems,
        completedItems: dbJob.completedItems,
        currentItem: dbJob.currentItem ?? undefined,
        results: dbJob.items.map((it) => ({
          orderItemId: it.orderItemId,
          orderNumber: it.orderNumber,
          studioName: it.studioName,
          status: it.status as PdfJobProgress['results'][number]['status'],
          pdfPath: it.pdfPath ?? undefined,
          fileName: it.fileName ?? undefined,
          error: it.error ?? undefined,
        })),
        createdAt: dbJob.createdAt,
      };
    } catch (err: any) {
      this.logger.error(`getJobStatus DB lookup failed: ${err.message}`);
      return undefined;
    }
  }

  /**
   * PDF 다운로드 경로 반환
   * - itemId 지정 시: 해당 orderItem의 PDF 반환 (job 완료 전에도 개별 항목 완료 시점에 다운로드 가능)
   * - itemId 미지정 시: job 완료 후 첫 번째 완료 PDF 반환 (하위 호환)
   */
  async getDownloadPath(jobId: string, itemId?: string): Promise<string | null> {
    const job = this.jobs.get(jobId) || (await this.getJobStatus(jobId));
    if (!job) return null;

    if (itemId) {
      const target = job.results.find(
        (r) => r.orderItemId === itemId && r.status === 'completed' && r.pdfPath,
      );
      return target?.pdfPath || null;
    }

    if (job.status !== 'completed') return null;

    const completedResults = job.results.filter((r) => r.status === 'completed' && r.pdfPath);
    if (completedResults.length === 0) return null;

    // 다건이면 첫 번째 반환 (ZIP은 Phase 4에서 구현)
    return completedResults[0].pdfPath!;
  }

  // ==================== Private ====================

  /** 동시 처리 항목 수 (PDF 렌더링은 CPU/IO 부담이 크므로 과도한 병렬은 피함) */
  private static readonly PROCESS_CONCURRENCY = 4;

  private async processJob(jobId: string, dto: GeneratePrintPdfDto) {
    const job = this.jobs.get(jobId)!;
    job.status = 'in_progress';
    await this.prisma.pdfJob
      .update({ where: { id: jobId }, data: { status: 'in_progress' } })
      .catch(() => {});

    // 고정 크기 워커 풀로 병렬 처리 (순서 보존 X, 완료 카운터만 증가)
    const total = dto.orderItemIds.length;
    let cursor = 0;
    const worker = async () => {
      while (true) {
        const i = cursor++;
        if (i >= total) return;
        await this.processItem(jobId, dto, i);
      }
    };
    const concurrency = Math.min(PrintPdfService.PROCESS_CONCURRENCY, total);
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    job.status = 'completed';
    job.currentItem = undefined;
    await this.prisma.pdfJob
      .update({
        where: { id: jobId },
        data: { status: 'completed', currentItem: null, completedItems: job.completedItems },
      })
      .catch(() => {});
  }

  private async processItem(jobId: string, dto: GeneratePrintPdfDto, i: number): Promise<void> {
    const job = this.jobs.get(jobId)!;
    const orderItemId = dto.orderItemIds[i];
    const result = job.results[i];
    result.status = 'in_progress';
    job.currentItem = orderItemId;

    // DB에 진행중 상태 업데이트
    await Promise.all([
      this.prisma.orderItem
        .update({ where: { id: orderItemId }, data: { pdfStatus: 'in_progress' } })
        .catch(() => {}),
      this.prisma.pdfJob
        .update({ where: { id: jobId }, data: { currentItem: orderItemId } })
        .catch(() => {}),
      this.prisma.pdfJobItem
        .updateMany({
          where: { jobId, orderItemId, sortOrder: i },
          data: { status: 'in_progress' },
        })
        .catch(() => {}),
    ]);

    let files: Array<{ originalPath: string; sortOrder: number; isTemp?: boolean }> = [];

    try {
      // 주문항목 + 파일 조회
      const item = await this.prisma.orderItem.findUnique({
        where: { id: orderItemId },
        include: {
          files: { orderBy: { sortOrder: 'asc' } },
          order: {
            include: {
              client: { select: { id: true, clientName: true } },
            },
          },
        },
      });

      if (!item) {
        result.status = 'failed';
        result.error = '주문 항목을 찾을 수 없습니다.';
        await this.prisma.pdfJobItem
          .updateMany({
            where: { jobId, orderItemId, sortOrder: i },
            data: { status: 'failed', error: result.error },
          })
          .catch(() => {});
        return;
      }

      result.orderNumber = item.order.orderNumber;
      result.studioName = item.order.client?.clientName || '-';

      // 규격 정보 조회
      const specData = await this.resolveSpecification(item);
      const paperData = await this.resolvePaper(item);
      const colorMode = await this.resolveColorMode(item);

      // 레이아웃 계산
      const specInput: SpecInput = {
        widthMm: specData.widthMm,
        heightMm: specData.heightMm,
        trimWidthMm: specData.trimWidthMm,
        trimHeightMm: specData.trimHeightMm,
        bleedTop: specData.bleedTop,
        bleedBottom: specData.bleedBottom,
        bleedLeft: specData.bleedLeft,
        bleedRight: specData.bleedRight,
        nup: specData.nup,
        nUpX: specData.nUpX,
        nUpY: specData.nUpY,
      };

      const paperInput: PaperInput = {
        sheetWidthMm: paperData.sheetWidthMm,
        sheetHeightMm: paperData.sheetHeightMm,
      };

      const nupLayout = this.layout.calculateNupLayout(
        specInput,
        paperInput,
        dto.includeBleed,
        dto.nupOverride,
      );

      // 인덱스 데이터
      const indexData: Omit<IndexData, 'currentPage' | 'totalPages'> = {
        orderNumber: item.order.orderNumber,
        studioName: item.order.client?.clientName || '-',
        spec: item.size || `${specData.widthMm}x${specData.heightMm}`,
        paper: item.paper || paperData.name || '-',
        colorMode: colorMode,
        binding: item.bindingType || '-',
        nup: specData.nup || '1up',
      };

      // 파일 준비: originalPath(디스크) 또는 fileUrl(base64/URL) 사용
      const tempDir = path.join(process.cwd(), 'uploads', 'temp', 'pdf-convert');

      for (const f of (item.files || [])) {
        try {
          // 1) 디스크 파일이 있으면 그대로 사용
          if (f.originalPath && fs.existsSync(f.originalPath)) {
            files.push({ originalPath: f.originalPath, sortOrder: f.sortOrder || 0 });
            continue;
          }

          // 2) base64 데이터 → 임시 파일 저장
          if (f.fileUrl && f.fileUrl.startsWith('data:')) {
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const base64Match = f.fileUrl.match(/^data:image\/([^;]+);base64,(.+)$/s);
            if (base64Match) {
              const ext = base64Match[1] === 'jpeg' ? 'jpg' : base64Match[1];
              const tempFile = path.join(tempDir, `${f.id || crypto.randomUUID()}.${ext}`);
              fs.writeFileSync(tempFile, Buffer.from(base64Match[2], 'base64'));
              files.push({ originalPath: tempFile, sortOrder: f.sortOrder || 0, isTemp: true });
              continue;
            }
          }

          // 3) fileUrl이 서버 경로(/uploads/...)인 경우
          if (f.fileUrl && (f.fileUrl.startsWith('/uploads/') || f.fileUrl.startsWith('uploads/'))) {
            const basePath = process.env.UPLOAD_BASE_PATH || path.join(process.cwd(), 'uploads');
            const relativePath = f.fileUrl.replace(/^\/?uploads\/?/, '');
            // URL 인코딩된 한글/특수문자 디코딩 시도 (인코딩된 경로 / 디코딩된 경로 둘 다 확인)
            const candidates = new Set<string>();
            candidates.add(path.join(basePath, relativePath));
            try {
              candidates.add(path.join(basePath, decodeURIComponent(relativePath)));
            } catch { /* malformed URI는 무시 */ }
            let found = false;
            for (const candidate of candidates) {
              if (fs.existsSync(candidate)) {
                files.push({ originalPath: candidate, sortOrder: f.sortOrder || 0 });
                found = true;
                break;
              }
            }
            if (found) continue;
          }

          // 4) fileUrl이 API URL인 경우 (/api/v1/upload/...)
          if (f.fileUrl && f.fileUrl.startsWith('/api/')) {
            this.logger.warn(`File ${f.fileName}: URL-based fileUrl not supported for PDF conversion: ${f.fileUrl.substring(0, 80)}`);
            continue;
          }

          this.logger.warn(`File ${f.fileName}: no valid source (originalPath=${f.originalPath}, fileUrl type=${f.fileUrl?.substring(0, 20)})`);
        } catch (fileErr: any) {
          this.logger.error(`File ${f.fileName} processing failed: ${fileErr.message}`);
        }
      }

      // 펼친면(spread) 주문 → 이미지를 좌/우로 분할 (좌 우선)
      // 제본방향에 따라 첫/막 페이지 한 쪽 절반을 버림
      // - bindingDirection에 'RIGHT_START' 포함 → 첫 이미지의 왼쪽 절반 버림
      // - bindingDirection에 'LEFT_END' 포함 → 마지막 이미지의 오른쪽 절반 버림
      if ((item.pageLayout || '').toLowerCase() === 'spread' && files.length > 0) {
        files = await this.splitSpreads(files, item.bindingDirection, tempDir);
      }

      if (files.length === 0) {
        const totalFiles = item.files?.length || 0;
        const fileUrlSample = item.files?.[0]?.fileUrl?.substring(0, 50) || 'none';
        result.status = 'failed';
        result.error = `유효한 이미지 파일이 없습니다. (총 ${totalFiles}개 파일, originalPath=${item.files?.[0]?.originalPath || 'null'}, urlType=${fileUrlSample}...)`;
        this.logger.error(`No valid files for item ${orderItemId}: total=${totalFiles}, sample originalPath=${item.files?.[0]?.originalPath}, sample fileUrl prefix=${fileUrlSample}`);
        await Promise.all([
          this.prisma.orderItem
            .update({ where: { id: orderItemId }, data: { pdfStatus: 'failed' } })
            .catch(() => {}),
          this.prisma.pdfJobItem
            .updateMany({
              where: { jobId, orderItemId, sortOrder: i },
              data: { status: 'failed', error: result.error },
            })
            .catch(() => {}),
        ]);
        return;
      }

      // 출력 경로 결정
      const outputPath = this.resolveOutputPath(
        dto.outputPath,
        item.order.orderNumber,
        item.order.client?.clientName || 'unknown',
        item.productionNumber || `item-${i + 1}`,
      );

      // PDF 생성
      const indexPosition = dto.indexPosition || 'bottom';
      const canvasSize = dto.canvasWidthMm && dto.canvasHeightMm
        ? { widthMm: dto.canvasWidthMm, heightMm: dto.canvasHeightMm }
        : undefined;

      if (nupLayout.nUpX === 1 && nupLayout.nUpY === 1) {
        await this.renderer.generate1upPdf(
          files,
          outputPath,
          nupLayout.cellPageDimensions,
          indexData,
          dto.indexOptions,
          dto.includeCropMarks,
          dto.indexOrderKeys,
          indexPosition,
          canvasSize,
        );
      } else {
        await this.renderer.generateNupPdf(
          files,
          outputPath,
          nupLayout,
          indexData,
          dto.indexOptions,
          dto.includeCropMarks,
          dto.indexOrderKeys,
          indexPosition,
        );
      }

      result.status = 'completed';
      result.pdfPath = outputPath;
      result.fileName = this.buildDownloadFileName(item);
      job.completedItems++;

      // DB에 pdfStatus 업데이트
      await Promise.all([
        this.prisma.orderItem.update({
          where: { id: orderItemId },
          data: {
            pdfStatus: 'completed',
            pdfPath: outputPath,
            pdfGeneratedAt: new Date(),
          },
        }),
        this.prisma.pdfJobItem
          .updateMany({
            where: { jobId, orderItemId, sortOrder: i },
            data: { status: 'completed', pdfPath: outputPath, fileName: result.fileName },
          })
          .catch(() => {}),
        this.prisma.pdfJob
          .update({
            where: { id: jobId },
            data: { completedItems: job.completedItems },
          })
          .catch(() => {}),
      ]);

      this.logger.log(`PDF generated: ${outputPath} (${files.length} pages)`);
    } catch (err: any) {
      result.status = 'failed';
      result.error = err.message;
      this.logger.error(`Failed to generate PDF for item ${orderItemId}: ${err.message}`);

      // DB에 실패 상태 업데이트
      await Promise.all([
        this.prisma.orderItem
          .update({ where: { id: orderItemId }, data: { pdfStatus: 'failed' } })
          .catch(() => {}),
        this.prisma.pdfJobItem
          .updateMany({
            where: { jobId, orderItemId, sortOrder: i },
            data: { status: 'failed', error: err.message },
          })
          .catch(() => {}),
      ]);
    } finally {
      // 임시 파일 정리
      for (const f of files) {
        if ((f as any).isTemp) {
          try { fs.unlinkSync(f.originalPath); } catch { /* ignore */ }
        }
      }
    }
  }

  /**
   * 펼친면 이미지를 좌/우로 분할한 파일 리스트 생성.
   * 좌→우 순서로 배치. 제본방향 규칙에 따라 첫/막 절반을 드롭.
   */
  private async splitSpreads(
    files: Array<{ originalPath: string; sortOrder: number; isTemp?: boolean }>,
    bindingDirection: string | null | undefined,
    tempDir: string,
  ): Promise<Array<{ originalPath: string; sortOrder: number; isTemp?: boolean }>> {
    const spreadDir = path.join(tempDir, 'spread-split');
    if (!fs.existsSync(spreadDir)) fs.mkdirSync(spreadDir, { recursive: true });

    const sorted = [...files].sort((a, b) => a.sortOrder - b.sortOrder);
    const bd = (bindingDirection || '').toUpperCase();
    const dropLeftOfFirst = bd.includes('RIGHT_START');
    const dropRightOfLast = bd.includes('LEFT_END');

    const out: Array<{ originalPath: string; sortOrder: number; isTemp?: boolean }> = [];
    let order = 0;

    for (let i = 0; i < sorted.length; i++) {
      const f = sorted[i];
      const isFirst = i === 0;
      const isLast = i === sorted.length - 1;

      let meta: any;
      try {
        meta = await sharp(f.originalPath).metadata();
      } catch (err: any) {
        this.logger.warn(`spread split: metadata failed for ${f.originalPath}: ${err.message}`);
        out.push({ ...f, sortOrder: order++ });
        continue;
      }
      const w = meta.width || 0;
      const h = meta.height || 0;
      if (w < 2 || h < 1) {
        out.push({ ...f, sortOrder: order++ });
        continue;
      }
      const halfW = Math.floor(w / 2);

      // 좌 절반
      if (!(isFirst && dropLeftOfFirst)) {
        const leftPath = path.join(spreadDir, `${crypto.randomUUID()}_L.jpg`);
        await sharp(f.originalPath)
          .extract({ left: 0, top: 0, width: halfW, height: h })
          .jpeg({ quality: 92 })
          .toFile(leftPath);
        out.push({ originalPath: leftPath, sortOrder: order++, isTemp: true });
      }

      // 우 절반
      if (!(isLast && dropRightOfLast)) {
        const rightPath = path.join(spreadDir, `${crypto.randomUUID()}_R.jpg`);
        await sharp(f.originalPath)
          .extract({ left: halfW, top: 0, width: w - halfW, height: h })
          .jpeg({ quality: 92 })
          .toFile(rightPath);
        out.push({ originalPath: rightPath, sortOrder: order++, isTemp: true });
      }
    }

    return out;
  }

  /**
   * 규격 정보 조회 (OrderItem → Specification)
   */
  private async resolveSpecification(item: any) {
    // fileSpecId가 있으면 Specification 조회
    if (item.fileSpecId) {
      const spec = await this.prisma.specification.findUnique({
        where: { id: item.fileSpecId },
      });
      if (spec) {
        return {
          widthMm: Number(spec.widthMm),
          heightMm: Number(spec.heightMm),
          trimWidthMm: spec.jdfTrimWidth ? Number(spec.jdfTrimWidth) : undefined,
          trimHeightMm: spec.jdfTrimHeight ? Number(spec.jdfTrimHeight) : undefined,
          bleedTop: spec.jdfBleedTop ? Number(spec.jdfBleedTop) : undefined,
          bleedBottom: spec.jdfBleedBottom ? Number(spec.jdfBleedBottom) : undefined,
          bleedLeft: spec.jdfBleedLeft ? Number(spec.jdfBleedLeft) : undefined,
          bleedRight: spec.jdfBleedRight ? Number(spec.jdfBleedRight) : undefined,
          nup: spec.nup || undefined,
          nUpX: spec.jdfNumberUpX || undefined,
          nUpY: spec.jdfNumberUpY || undefined,
        };
      }
    }

    // size 문자열에서 파싱 (예: "10x8")
    if (item.size) {
      const match = item.size.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
      if (match) {
        const wInch = parseFloat(match[1]);
        const hInch = parseFloat(match[2]);
        return {
          widthMm: wInch * 25.4,
          heightMm: hInch * 25.4,
          trimWidthMm: undefined,
          trimHeightMm: undefined,
          bleedTop: undefined,
          bleedBottom: undefined,
          bleedLeft: undefined,
          bleedRight: undefined,
          nup: undefined,
          nUpX: undefined,
          nUpY: undefined,
        };
      }
    }

    // 기본값 (A4)
    return {
      widthMm: 210,
      heightMm: 297,
      trimWidthMm: undefined,
      trimHeightMm: undefined,
      bleedTop: undefined,
      bleedBottom: undefined,
      bleedLeft: undefined,
      bleedRight: undefined,
      nup: undefined,
      nUpX: undefined,
      nUpY: undefined,
    };
  }

  /**
   * 용지 정보 조회
   */
  private async resolvePaper(item: any) {
    if (item.paper) {
      const paper = await this.prisma.paper.findFirst({
        where: { name: item.paper },
      });
      if (paper) {
        return {
          name: paper.name,
          sheetWidthMm: paper.sheetWidthMm ? Number(paper.sheetWidthMm) : undefined,
          sheetHeightMm: paper.sheetHeightMm ? Number(paper.sheetHeightMm) : undefined,
        };
      }
    }
    return { name: item.paper || '-', sheetWidthMm: undefined, sheetHeightMm: undefined };
  }

  /**
   * 인디고 도수 정보 조회
   */
  private async resolveColorMode(item: any): Promise<string> {
    if (item.colorIntentId) {
      const colorIntent = await this.prisma.colorIntent.findUnique({
        where: { id: item.colorIntentId },
      });
      if (colorIntent) {
        return colorIntent.displayNameKo || colorIntent.name || '-';
      }
    }
    return '-';
  }

  /**
   * 다운로드 파일명 생성: {주문번호}_{파일명}_{용지}_{양면|단면}.pdf
   * - 파일명: folderName 우선, 없으면 productionNumber
   * - 양면/단면: pageLayout === 'spread'면 양면
   */
  private buildDownloadFileName(item: any): string {
    const orderNumber = item?.order?.orderNumber || 'order';
    const fileLabel = item?.folderName || item?.productionNumber || 'item';
    const paper = item?.paper || '';
    const isSpread = String(item?.pageLayout || '').toLowerCase() === 'spread';
    const sideText = isSpread ? '양면' : '단면';

    const parts = [orderNumber, fileLabel];
    if (paper) parts.push(paper);
    parts.push(sideText);

    const raw = parts.join('_') + '.pdf';
    // 파일시스템 금지문자 치환
    return raw.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, ' ').trim();
  }

  /**
   * PDF 출력 경로 결정
   */
  private resolveOutputPath(
    customPath: string | undefined,
    orderNumber: string,
    companyName: string,
    productionNumber: string,
  ): string {
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime();

    // 거래처명에서 파일시스템 안전 문자만 남기기
    const safeCompany = companyName.replace(/[<>:"/\\|?*]/g, '_');
    const safeProdNum = productionNumber.replace(/[<>:"/\\|?*]/g, '_');

    if (customPath) {
      if (!fs.existsSync(customPath)) {
        fs.mkdirSync(customPath, { recursive: true });
      }
      return path.join(customPath, `${safeProdNum}_print_${timestamp}.pdf`);
    }

    // 기본 경로: uploads/orders/{YYYY}/{MM}/{DD}/{company}/{orderNumber}/print-pdf/
    const basePath = process.env.UPLOAD_BASE_PATH || path.join(process.cwd(), 'uploads');
    const outputDir = path.join(
      basePath,
      'orders',
      yyyy,
      mm,
      dd,
      safeCompany,
      orderNumber,
      'print-pdf',
    );

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    return path.join(outputDir, `${safeProdNum}_print_${timestamp}.pdf`);
  }
}
