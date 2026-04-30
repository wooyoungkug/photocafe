import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  GeneratePrintPdfDto,
  PdfJobProgress,
  PDF_JOB_STATUS,
  PrintQueueQueryDto,
} from '../dto/print-pdf.dto';
import { PrintPdfRendererService, IndexData } from './print-pdf-renderer.service';
import { PrintPdfLayoutService, SpecInput, PaperInput } from './print-pdf-layout.service';
import { PrintPdfSlipPrinterService } from './print-pdf-slip-printer.service';
import { ImpositionMatcherService } from '../../imposition/services/imposition-matcher.service';
import { B2StorageService } from '../../upload/services/b2-storage.service';
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

  /**
   * 동일 outputPath 동시 쓰기 차단용 락 Set.
   * 2개 concurrent job이 같은 PDF 파일에 doc.pipe(writeStream)하여
   * blank 페이지가 삽입되는 현상을 방어한다.
   */
  private activeOutputs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: PrintPdfRendererService,
    private readonly layout: PrintPdfLayoutService,
    private readonly slipPrinter: PrintPdfSlipPrinterService,
    private readonly b2Storage: B2StorageService,
    @Optional() private readonly matcher?: ImpositionMatcherService,
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
    // printQueueStatus='pending' 이 주 필터. 레거시 조건은 아직 플래그가 채워지지 않은
    // 주문을 위한 안전망(fallback). 마이그레이션 이후에도 신규 주문이 미설정 상태로
    // 남는 경우가 있을 수 있어 유지.
    const where: any = {
      OR: [
        { printQueueStatus: 'pending' },
        {
          AND: [
            { printQueueStatus: null },
            {
              OR: [
                { status: 'in_production', currentProcess: 'print_waiting' },
                { status: 'print_waiting' },
              ],
            },
          ],
        },
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
          client: {
            select: {
              id: true,
              clientName: true,
              assignedStaff: {
                where: { isPrimary: true },
                take: 1,
                select: { staff: { select: { name: true } } },
              },
            },
          },
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

    // 규격별 nup 조회를 위한 Specification 캐시 (문자 정규화: ×→x, 인치 제거)
    const sizeSet = new Set<string>();
    orders.forEach((order) =>
      order.items.forEach((item: any) => {
        if (item.size) {
          sizeSet.add(item.size);
          sizeSet.add(this.normalizeSizeName(item.size));
        }
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
        .map((item: any) => {
          // 누락 정보 경고 수집
          const warnings: string[] = [];
          if (!item.colorIntentId) warnings.push('도수(colorIntent) 미설정→기본4도');
          if (!item.paper) warnings.push('용지 미설정');
          if (!item.bindingType) warnings.push('제본 미설정');
          const resolvedNup = nupMap.get(item.size) || nupMap.get(this.normalizeSizeName(item.size || '')) || null;
          if (!resolvedNup) warnings.push('Nup 규격매칭 실패');

          const fileCount = item.files?.length || 0;
          const isSpread = String(item.pageLayout || '').toLowerCase() === 'spread';
          let calculatedPages: number;
          if (!isSpread) {
            calculatedPages = fileCount;
          } else {
            const bd = String(item.bindingDirection || '').toUpperCase();
            calculatedPages = fileCount * 2;
            if (bd.includes('RIGHT_START')) calculatedPages -= 1;
            if (bd.includes('LEFT_END')) calculatedPages -= 1;
            calculatedPages = Math.max(calculatedPages, 0);
          }

          return {
            id: item.id,
            orderId: order.id,
            orderNumber: order.orderNumber,
            isUrgent: order.isUrgent,
            studioName: order.client?.clientName || '-',
            salesRep: (order.client as any)?.assignedStaff?.[0]?.staff?.name || '',
            quantity: item.quantity ?? 1,
            clientId: order.client?.id,
            productionNumber: item.productionNumber,
            productName: item.productName,
            folderName: item.folderName,
            size: item.size,
            pages: calculatedPages,
            pageLayout: item.pageLayout,
            bindingDirection: item.bindingDirection,
            printMethod: item.printMethod,
            paper: item.paper,
            bindingType: item.bindingType,
            colorIntentId: item.colorIntentId,
            fileCount,
            nup: resolvedNup,
            orderedAt: order.orderedAt,
            requestedDeliveryDate: order.requestedDeliveryDate,
            pdfStatus: item.pdfStatus || (
              // 유효한 원본 파일이 없으면 실패로 표시
              (item.files || []).every((f: any) => !f.originalPath || f.storageStatus === 'deleted' || f.storageStatus === 'missing')
                ? 'failed'
                : null
            ),
            // 출력대기 배지에서 PDF 인라인 열기 링크 노출 여부 — pdfPath 존재 + 파일 디스크 확인까지는
            // 비용이 크므로 pdfPath 존재만으로 판단. 실제 열기 시 엔드포인트에서 NotFound 처리.
            printSide: item.printSide,
            hasPdf: !!item.pdfPath,
            warnings: warnings.length > 0 ? warnings : undefined,
          };
        }),
    );

    // 실패 항목의 에러 사유 조회 (pdf_job_items에서 최신 에러)
    const failedItemIds = items.filter(it => it.pdfStatus === 'failed').map(it => it.id);
    if (failedItemIds.length > 0) {
      try {
        const failedJobItems = await this.prisma.pdfJobItem.findMany({
          where: { orderItemId: { in: failedItemIds }, status: 'failed', error: { not: null } },
          select: { orderItemId: true, error: true },
          orderBy: { sortOrder: 'desc' },
        });
        const errorMap = new Map<string, string>();
        for (const ji of failedJobItems) {
          if (!errorMap.has(ji.orderItemId)) {
            errorMap.set(ji.orderItemId, ji.error!);
          }
        }
        for (const item of items) {
          if (item.pdfStatus === 'failed') {
            (item as any).pdfError = errorMap.get(item.id) || '유효한 이미지 파일이 없습니다';
          }
        }
      } catch { /* pdf_job_items 조회 실패 시 무시 */ }
    }

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
   *
   * 중복 Job 방지: 이미 pending/in_progress 상태인 orderItemId는 제외하여
   * 동일 outputPath에 두 Job이 동시에 쓰는 race condition을 차단한다.
   */
  async generatePdf(dto: GeneratePrintPdfDto): Promise<PdfJobProgress> {
    const jobId = crypto.randomUUID();

    // ─── 중복 Job 차단: 이미 처리중(pending/in_progress)인 orderItemId 제외 ───
    if (!dto.orderItemIds || dto.orderItemIds.length === 0) {
      throw new BadRequestException('처리할 주문 항목이 없습니다.');
    }
    try {
      const activeItems = await this.prisma.pdfJobItem.findMany({
        where: {
          orderItemId: { in: dto.orderItemIds },
          status: { in: ['pending', 'in_progress'] },
        },
        select: { orderItemId: true, jobId: true, status: true },
      });
      if (activeItems.length > 0) {
        const activeSet = new Set(activeItems.map((i) => i.orderItemId));
        const filtered = dto.orderItemIds.filter((id) => !activeSet.has(id));
        const excludedCount = dto.orderItemIds.length - filtered.length;
        if (filtered.length === 0) {
          this.logger.warn(
            `중복 PDF Job 차단: 모든 항목이 이미 처리중입니다. orderItemIds=${dto.orderItemIds.join(',')}`,
          );
          throw new BadRequestException('이미 처리 중인 주문 항목입니다.');
        }
        this.logger.warn(
          `중복 PDF Job 제외: ${excludedCount}건 (이미 처리중) / ${dto.orderItemIds.length}건 중 ${filtered.length}건만 진행`,
        );
        dto = { ...dto, orderItemIds: filtered };
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`중복 Job 체크 실패 (계속 진행): ${err.message}`);
    }

    // 대기 항목의 메타(주문번호/스튜디오/페이지레이아웃/파일수)를 한 번에 조회
    const metas = await this.prisma.orderItem.findMany({
      where: { id: { in: dto.orderItemIds } },
      select: {
        id: true,
        pageLayout: true,
        bindingDirection: true,
        _count: { select: { files: true } },
        order: {
          select: {
            orderNumber: true,
            client: { select: { clientName: true } },
          },
        },
      },
    });
    const metaById = new Map(metas.map((m) => [m.id, m]));

    // 전체 페이지 수 사전 계산 (spread는 좌/우 분할 x2, 제본방향 따라 첫/마지막 절반 드롭)
    const totalPagesGuess = dto.orderItemIds.reduce((sum, id) => {
      const m = metaById.get(id);
      const fileCount = m?._count?.files ?? 0;
      const isSpread = String(m?.pageLayout || '').toLowerCase() === 'spread';
      if (!isSpread) return sum + fileCount;
      const bd = String(m?.bindingDirection || '').toUpperCase();
      let pages = fileCount * 2;
      if (bd.includes('RIGHT_START')) pages -= 1;
      if (bd.includes('LEFT_END')) pages -= 1;
      return sum + Math.max(pages, 0);
    }, 0);

    const job: PdfJobProgress = {
      jobId,
      status: 'pending',
      totalItems: dto.orderItemIds.length,
      completedItems: 0,
      totalPages: totalPagesGuess,
      processedPages: 0,
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
          totalPages: totalPagesGuess,
          processedPages: 0,
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
        totalPages: dbJob.totalPages,
        processedPages: dbJob.processedPages,
        currentItem: dbJob.currentItem ?? undefined,
        results: dbJob.items.map((it) => ({
          orderItemId: it.orderItemId,
          orderNumber: it.orderNumber,
          studioName: it.studioName,
          status: it.status as PdfJobProgress['results'][number]['status'],
          pdfPath: it.pdfPath ?? undefined,
          fileName: it.fileName ?? undefined,
          side: it.side ?? undefined,
          colorMode: it.colorMode ?? undefined,
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

  /** 멈춘 Job을 메모리에서 제거 (auto-convert에서 호출) */
  clearStuckJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.currentItem = undefined;
      this.jobs.delete(jobId);
      this.logger.warn(`Stuck job cleared from memory: ${jobId}`);
    }
  }

  // ==================== Private ====================

  /** 동시 처리 항목 수. 1=순차 처리 (세밀한 페이지 단위 진행률 제공) */
  private static readonly PROCESS_CONCURRENCY = 1;

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
    // 예측 페이지 수와 실제 처리 페이지 수가 다를 수 있으므로 100%로 보정
    if (job.totalPages && (job.processedPages || 0) < job.totalPages) {
      job.processedPages = job.totalPages;
    } else if (job.processedPages && (!job.totalPages || job.processedPages > job.totalPages)) {
      job.totalPages = job.processedPages;
    }
    await this.prisma.pdfJob
      .update({
        where: { id: jobId },
        data: {
          status: 'completed',
          currentItem: null,
          completedItems: job.completedItems,
          processedPages: job.processedPages ?? 0,
          totalPages: job.totalPages ?? 0,
        },
      })
      .catch(() => {});
  }

  /** 개별 아이템 처리 (10분 타임아웃) */
  private static readonly ITEM_TIMEOUT_MS = 10 * 60 * 1000;

  private async processItem(jobId: string, dto: GeneratePrintPdfDto, i: number): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`PDF 변환 타임아웃 (${PrintPdfService.ITEM_TIMEOUT_MS / 60000}분 초과)`)), PrintPdfService.ITEM_TIMEOUT_MS),
    );

    try {
      await Promise.race([
        this._processItemCore(jobId, dto, i),
        timeoutPromise,
      ]);
    } catch (err: any) {
      const job = this.jobs.get(jobId);
      if (job) {
        const result = job.results[i];
        if (result.status !== 'completed') {
          result.status = 'failed';
          result.error = err.message || 'Unknown error';
          this.logger.error(`Item ${i} failed: ${err.message}`);
          await Promise.all([
            this.prisma.orderItem.update({ where: { id: dto.orderItemIds[i] }, data: { pdfStatus: 'failed' } }).catch(() => {}),
            this.prisma.pdfJobItem.updateMany({ where: { jobId, orderItemId: dto.orderItemIds[i], sortOrder: i }, data: { status: 'failed', error: err.message } }).catch(() => {}),
          ]);
        }
      }
    }
  }

  private async _processItemCore(jobId: string, dto: GeneratePrintPdfDto, i: number): Promise<void> {
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
              client: {
                select: {
                  id: true,
                  clientName: true,
                  assignedStaff: {
                    where: { isPrimary: true },
                    take: 1,
                    include: { staff: { select: { name: true } } },
                  },
                },
              },
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

      // 임포지션 프리셋 매칭: JDF 옵션(시트크기·블리드) 적용
      const impositionBinding = this.resolveImpositionBinding(item.bindingType);
      const resolvedNupOverride = dto.nupOverride;
      let presetSheetSize: { widthMm: number; heightMm: number } | null = null;
      if (this.matcher && impositionBinding && impositionBinding !== 'flat') {
        try {
          const matched = await this.matcher.findPreset({
            productSize: item.size || null,
            bindingType: impositionBinding,
            pageCount: item.pages || null,
          });
          if (matched?.preset) {
            const p = matched.preset as any;
            if (p.sheetWidth && p.sheetHeight) {
              paperInput.sheetWidthMm = Number(p.sheetWidth);
              paperInput.sheetHeightMm = Number(p.sheetHeight);
              presetSheetSize = { widthMm: Number(p.sheetWidth), heightMm: Number(p.sheetHeight) };
            }
            const pb = p.bleed != null ? Number(p.bleed) : null;
            if (pb != null && pb >= 0) {
              specInput.bleedTop = pb;
              specInput.bleedBottom = pb;
              specInput.bleedLeft = pb;
              specInput.bleedRight = pb;
            }
          }
        } catch (err: any) {
          this.logger.warn(`Imposition preset lookup failed: ${err.message}`);
        }
      }

      // preserveSpread: 양면(spread) 입력 + 4up 인 경우 좌우 셀 내부 틈새(크롭마진)를 제거하여
      // 좌우 페이지가 seam 없이 붙어보이도록 배치.
      const isSpreadInput = String(item.pageLayout || '').toLowerCase() === 'spread';
      const resolvedNupText = (resolvedNupOverride || specData.nup || '').toLowerCase();
      const resolvedNupCount = (() => {
        const m = resolvedNupText.match(/^(\d+)up$/);
        if (m) return parseInt(m[1], 10);
        return (specData.nUpX || 1) * (specData.nUpY || 1);
      })();
      const preserveSpread = isSpreadInput && resolvedNupCount === 4;

      const nupLayout = this.layout.calculateNupLayout(
        specInput,
        paperInput,
        dto.includeBleed,
        resolvedNupOverride,
        { preserveSpread },
      );

      // 이미지영역(mm) 계산: imageSize 지정 시 해당 값, 아니면 레이아웃 기준
      const imgAreaWMm = dto.imageWidthMm || (nupLayout.cellPageDimensions.imageWidthPt / (72 / 25.4));
      const imgAreaHMm = dto.imageHeightMm || (nupLayout.cellPageDimensions.imageHeightPt / (72 / 25.4));

      // 인덱스 데이터
      const indexData: Omit<IndexData, 'currentPage' | 'totalPages'> = {
        orderNumber: item.order.orderNumber,
        studioName: item.order.client?.clientName || '-',
        spec: item.size || `${specData.widthMm}x${specData.heightMm}`,
        paper: (() => {
          const name = item.paper || paperData.name || '-';
          if (paperData.grammageDisplay) return `${name} ${paperData.grammageDisplay}`;
          if (paperData.grammage) return `${name} ${paperData.grammage}g`;
          return name;
        })(),
        colorMode: colorMode,
        binding: item.bindingType || '-',
        nup: specData.nup || '1up',
        side: String(item.printSide || '').toLowerCase() === 'double' ? '양면' : '단면',
        imageArea: `${Math.round(imgAreaWMm)}×${Math.round(imgAreaHMm)}`,
        salesRep: (item.order.client as any)?.assignedStaff?.[0]?.staff?.name || '',
      };

      // 파일 준비: originalPath(디스크) 또는 fileUrl(base64/URL) 사용
      const tempDir = path.join(process.cwd(), 'uploads', 'temp', 'pdf-convert');

      // ===== B2 폴백 다운로드: 로컬 디스크에 없으면 B2 백업에서 복원 =====
      // Railway 컨테이너 재시작 시 /app/uploads 가 비워져도 원본 파일을
      // /app/uploads/.b2-cache/{orderNumber}/{fileName} 로 자동 복원한다.
      // imposition 흐름과 동일 헬퍼 사용 — 두 경로의 파일 해석 정합성 유지.
      const uploadBase = process.env.UPLOAD_BASE_PATH || path.join(process.cwd(), 'uploads');
      const isLocallyAvailable = (f: any): string => {
        if (f.originalPath && fs.existsSync(f.originalPath)) return f.originalPath;
        // base64 데이터는 즉시 사용 가능 — B2 다운로드 불필요
        if (typeof f.fileUrl === 'string' && f.fileUrl.startsWith('data:')) return 'inline';
        const url: string | undefined = f.fileUrl;
        if (url && (url.startsWith('/uploads/') || url.startsWith('uploads/'))) {
          const rel = url.replace(/^\/?uploads\/?/, '');
          const candidates = new Set<string>([path.join(uploadBase, rel)]);
          try {
            candidates.add(path.join(uploadBase, decodeURIComponent(rel)));
          } catch { /* malformed URI 무시 */ }
          for (const c of candidates) {
            if (fs.existsSync(c)) return c;
          }
        }
        return '';
      };
      await this.b2Storage.hydrateB2CacheForFiles(
        item.order.orderNumber,
        (item.files || []) as any,
        uploadBase,
        isLocallyAvailable,
      );

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

          // B2 폴백은 위(루프 진입 전) hydrateB2CacheForFiles 가 처리하여 f.originalPath 를
          // 캐시 경로로 갱신해두므로, 여기 도달했다는 건 B2 에서도 받지 못한 것을 의미한다.
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

      // 파일명/출력 경로 결정 (customPath 있으면 {YYMMDD}/{인디고도수}/{양면|단면}/{fileName} 구조로 저장)
      const nupCountEarly = resolvedNupOverride
        ? (parseInt(resolvedNupOverride.replace(/\D/g, ''), 10) || 1)
        : (specData.nUpX || 1) * (specData.nUpY || 1);
      const isDoubleSidedEarly = String(item?.printSide || '').toLowerCase() === 'double';
      const sideEarly = isDoubleSidedEarly ? '양면' : '단면';
      const fileNameEarly = this.buildDownloadFileName(item, {
        colorMode,
        nup: `${nupCountEarly}up`,
      });
      const outputPath = this.resolveOutputPathV2(dto.outputPath, {
        fileName: fileNameEarly,
        colorMode: colorMode && colorMode !== '-' ? colorMode : undefined,
        side: sideEarly,
        printMethod: item.printMethod || undefined,
        orderNumber: item.order.orderNumber,
        companyName: item.order.client?.clientName || 'unknown',
        productionNumber: item.productionNumber || `item-${i + 1}`,
      });

      // PDF 생성
      const indexPosition = dto.indexPosition || 'bottom';
      const canvasSize = dto.canvasWidthMm && dto.canvasHeightMm
        ? { widthMm: dto.canvasWidthMm, heightMm: dto.canvasHeightMm }
        : (presetSheetSize
          ? { widthMm: presetSheetSize.widthMm, heightMm: presetSheetSize.heightMm }
          : undefined);
      const imageSize = dto.imageWidthMm && dto.imageHeightMm
        ? { widthMm: dto.imageWidthMm, heightMm: dto.imageHeightMm }
        : undefined;

      // 페이지 단위 progress 콜백: 메모리 즉시 반영 + DB는 주기적으로만 write
      let lastDbWrite = 0;
      const onPageRendered = (current: number, _total: number) => {
        const j = this.jobs.get(jobId);
        if (!j) return;
        j.processedPages = (j.processedPages || 0) + 1;
        const now = Date.now();
        if (now - lastDbWrite > 500) {
          lastDbWrite = now;
          this.prisma.pdfJob
            .update({ where: { id: jobId }, data: { processedPages: j.processedPages } })
            .catch(() => {});
        }
      };

      // ─── 동일 outputPath 동시 쓰기 차단 락 ───
      // 만약 다른 Job이 동일 경로에 쓰고 있다면 즉시 예외를 던져
      // writeStream 교란으로 인한 blank 페이지 삽입을 방지한다.
      if (this.activeOutputs.has(outputPath)) {
        throw new Error(`동일 경로 동시 쓰기 차단: ${outputPath}`);
      }
      this.activeOutputs.add(outputPath);
      try {
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
            onPageRendered,
            imageSize,
            dto.includeColorBar,
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
            onPageRendered as any,
          );
        }
      } finally {
        this.activeOutputs.delete(outputPath);
      }

      result.status = 'completed';
      result.pdfPath = outputPath;
      result.side = sideEarly;
      result.colorMode = colorMode && colorMode !== '-' ? colorMode : undefined;
      result.fileName = fileNameEarly;
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
            data: {
              status: 'completed',
              pdfPath: outputPath,
              fileName: result.fileName,
              side: result.side,
              colorMode: result.colorMode,
            },
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

      // 작업 지시서 자동 인쇄 (활성화 시) - fire-and-forget
      this.slipPrinter
        .printSlipIfEnabled({
          orderNumber: item.order.orderNumber,
          studioName: item.order.client?.clientName || '-',
          fileName: fileNameEarly,
          paper: item.paper || '-',
          spec: item.size || '-',
          pages: files.length,
          colorMode: colorMode || '-',
          side: sideEarly,
          binding: item.bindingType || '-',
          nup: `${nupCountEarly}up`,
          outputPath,
          printMethod: item.printMethod || 'indigo',
        })
        .catch((err: any) => { this.logger.error(`슬립 인쇄 실패 (${item.order.orderNumber}): ${err?.message}`); });
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

      // 이미지를 1번만 읽어 버퍼로 캐시 (2번 읽기 방지)
      let buffer: Buffer;
      let meta: any;
      try {
        buffer = await fs.promises.readFile(f.originalPath);
        meta = await sharp(buffer).metadata();
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

      const needLeft = !(isFirst && dropLeftOfFirst);
      const needRight = !(isLast && dropRightOfLast);

      // 좌/우 분할을 병렬 실행 (버퍼 재사용으로 디스크 읽기 1회)
      const leftPath = needLeft ? path.join(spreadDir, `${crypto.randomUUID()}_L.jpg`) : '';
      const rightPath = needRight ? path.join(spreadDir, `${crypto.randomUUID()}_R.jpg`) : '';

      const tasks: Promise<void>[] = [];
      if (needLeft) {
        tasks.push(
          sharp(buffer)
            .extract({ left: 0, top: 0, width: halfW, height: h })
            .jpeg({ quality: 100 })
            .toFile(leftPath)
            .then(() => {}),
        );
      }
      if (needRight) {
        tasks.push(
          sharp(buffer)
            .extract({ left: halfW, top: 0, width: w - halfW, height: h })
            .jpeg({ quality: 100 })
            .toFile(rightPath)
            .then(() => {}),
        );
      }
      await Promise.all(tasks);

      if (needLeft) {
        out.push({ originalPath: leftPath, sortOrder: order++, isTemp: true });
      }
      if (needRight) {
        out.push({ originalPath: rightPath, sortOrder: order++, isTemp: true });
      }
    }

    return out;
  }

  /**
   * 제본 타입 문자열 → 임포지션 엔진 바인딩 타입 변환
   */
  private resolveImpositionBinding(
    binding: string | null | undefined,
  ): 'compressed' | 'tack' | 'perfect' | 'flat' | null {
    if (!binding) return null;
    const s = binding.toLowerCase();
    if (s.includes('압축') || s.includes('compressed')) return 'compressed';
    if (s.includes('타카') || s.includes('tack')) return 'tack';
    if (s.includes('무선') || s.includes('perfect') || s.includes('화보')) return 'perfect';
    return 'flat';
  }

  /**
   * nup 텍스트("4up", "2up", "8up" 등)에서 X/Y 레이아웃 도출
   * jdfNumberUpX/Y가 설정되지 않았을 때(1×1) 사용
   */
  private deriveNupXY(nupText: string | null | undefined): { nUpX: number; nUpY: number } | undefined {
    if (!nupText) return undefined;
    const m = nupText.match(/^(\d+)\+?up$/i);
    if (!m) return undefined;
    const n = parseInt(m[1], 10);
    if (n <= 1) return undefined;
    // 일반적인 Nup 배치: 2up=2×1, 4up=2×2, 6up=3×2, 8up=4×2, 9up=3×3
    const layouts: Record<number, [number, number]> = {
      2: [2, 1], 4: [2, 2], 6: [3, 2], 8: [4, 2], 9: [3, 3], 16: [4, 4],
    };
    if (layouts[n]) return { nUpX: layouts[n][0], nUpY: layouts[n][1] };
    // 정사각에 가까운 배치
    const sq = Math.ceil(Math.sqrt(n));
    return { nUpX: sq, nUpY: Math.ceil(n / sq) };
  }

  /**
   * item.size 문자열 정규화 → spec name 형식 (예: "7×5.5인치" → "7x5.5")
   */
  private normalizeSizeName(size: string): string {
    return size
      .replace(/[×✕]/g, 'x')       // 전각 곱셈기호 → 반각 x
      .replace(/인치$/, '')           // "인치" 접미어 제거
      .trim();
  }

  /**
   * Specification 결과를 공통 형식으로 변환
   */
  private specToResult(spec: any) {
    const nupXY = (spec.jdfNumberUpX > 1 || spec.jdfNumberUpY > 1)
      ? { nUpX: spec.jdfNumberUpX, nUpY: spec.jdfNumberUpY }
      : this.deriveNupXY(spec.nup);
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
      nUpX: nupXY?.nUpX || undefined,
      nUpY: nupXY?.nUpY || undefined,
    };
  }

  /**
   * 규격 정보 조회 (OrderItem → Specification)
   */
  private async resolveSpecification(item: any) {
    // 1) fileSpecId가 있으면 Specification 조회
    if (item.fileSpecId) {
      const spec = await this.prisma.specification.findUnique({
        where: { id: item.fileSpecId },
      });
      if (spec) return this.specToResult(spec);
    }

    // 2) fileSpecId 없으면 size 이름으로 Specification 매칭 시도
    if (item.size) {
      const normalized = this.normalizeSizeName(item.size);
      const spec = await this.prisma.specification.findFirst({
        where: { name: normalized },
      });
      if (spec) return this.specToResult(spec);

      // 3) Specification 매칭 실패 → size 문자열에서 파싱 (예: "10x8")
      const match = item.size.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
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
          grammage: paper.grammage ?? undefined,
          grammageDisplay: (paper as any).grammageDisplay ?? undefined,
        };
      }
    }
    return { name: item.paper || '-', sheetWidthMm: undefined, sheetHeightMm: undefined, grammage: undefined, grammageDisplay: undefined };
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
    // colorIntentId 없으면 printMethod로 폴백
    if (item.printMethod) {
      if (item.printMethod.toLowerCase().includes('inkjet')) return '잉크젯';
      if (item.printMethod.toLowerCase().includes('indigo')) return '인디고';
    }
    return '-';
  }

  /**
   * 다운로드 파일명 생성: {주문번호}_{스튜디오명}_{인디고도수}_{양면|단면}_{제본방법}_{Nup}.pdf
   */
  private buildDownloadFileName(
    item: any,
    context: { colorMode?: string; nup?: string } = {},
  ): string {
    const orderNumber = item?.order?.orderNumber || 'order';
    const studio = item?.order?.client?.clientName || '';
    const colorMode = (context.colorMode || '').trim();
    const isDoubleSided = String(item?.printSide || '').toLowerCase() === 'double';
    const sideText = isDoubleSided ? '양면' : '단면';
    const binding = item?.bindingType || '';
    const nup = context.nup || '1up';

    const parts = [orderNumber];
    if (studio) parts.push(studio);
    if (colorMode && colorMode !== '-') parts.push(colorMode);
    parts.push(sideText);
    if (binding && binding !== '-') parts.push(binding);
    parts.push(nup);

    const raw = parts.join('_') + '.pdf';
    // 파일시스템 금지문자 치환
    return raw.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, ' ').trim();
  }

  /**
   * PDF 출력 경로 결정
   * customPath가 있으면: {customPath}/{YYMMDD}/{colorMode}/{side}/{fileName}
   *                      (무인 저장 — 서버가 네트워크 드라이브 등에 직접 기록)
   * customPath가 없으면: 기존 uploads/orders/... 구조 유지 (기본값)
   */
  private resolveOutputPathV2(
    customPath: string | undefined,
    ctx: { fileName: string; colorMode?: string; side?: string; printMethod?: string; orderNumber: string; companyName: string; productionNumber: string },
  ): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePart = `${yy}${mm}${dd}`;

    const sanitizeSeg = (s: string) => (s || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || '_';
    const safeFileName = sanitizeSeg(ctx.fileName) || 'output.pdf';

    if (customPath) {
      // 폴더 구조:
      //   인디고: {날짜}/인디고/인디고{도수}{양면|단면}/   (예: 260427/인디고/인디고6도단면)
      //   잉크젯: {날짜}/잉크젯/
      const isInkjet = (ctx.printMethod || '').toLowerCase().includes('inkjet');
      const methodSeg = isInkjet ? '잉크젯' : '인디고';
      const sideSeg = ctx.side || '단면';

      let outputDir: string;
      if (isInkjet) {
        outputDir = path.join(customPath, datePart, methodSeg);
      } else {
        const dosu = (ctx.colorMode || '').match(/(\d+도)/)?.[1] || '4도';
        outputDir = path.join(customPath, datePart, methodSeg, `인디고${dosu}${sideSeg}`);
      }
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      return path.join(outputDir, safeFileName);
    }

    // 기본 경로: uploads/orders/{YYYY}/{MM}/{DD}/{company}/{orderNumber}/print-pdf/
    const basePath = process.env.UPLOAD_BASE_PATH || path.join(process.cwd(), 'uploads');
    const yyyy = now.getFullYear().toString();
    const safeCompany = sanitizeSeg(ctx.companyName);
    const outputDir = path.join(basePath, 'orders', yyyy, mm, dd, safeCompany, ctx.orderNumber, 'print-pdf');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    return path.join(outputDir, safeFileName);
  }

  /**
   * (레거시) PDF 출력 경로 결정 - 유지용, 호출부는 V2로 이관
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
