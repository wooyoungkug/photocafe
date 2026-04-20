import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SystemSettingsService } from '../../system-settings/system-settings.service';
import { PrintPdfService } from './print-pdf.service';
import type { GeneratePrintPdfDto } from '../dto/print-pdf.dto';

/**
 * PDF 무인 자동 변환 스케줄러.
 * 매 1분마다 동작하며, 시스템 설정의 auto_convert/auto_interval에 따라
 * N분마다 pending/미완료 출력대기 항목들을 자동 변환한다.
 *
 * 동시 실행 방지: 이전 실행이 끝나기 전에는 중복 실행하지 않음.
 * 경로 지정: print_pdf_output_path 가 비어있으면 스킵 (브라우저 개입이 필요하므로 무인에 부적합)
 */
@Injectable()
export class PrintPdfAutoConvertService {
  private readonly logger = new Logger(PrintPdfAutoConvertService.name);
  private isRunning = false;
  private lastRunAt: number = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SystemSettingsService,
    private readonly printPdf: PrintPdfService,
  ) {}

  @Cron('0 * * * * *', { timeZone: 'Asia/Seoul' })
  async tick() {
    if (this.isRunning) return;

    // 1) 활성화 여부
    const enabled = (await this.settings.getValue('print_pdf_auto_convert', 'false')) === 'true';
    if (!enabled) return;

    // 2) 간격 체크 (분)
    const intervalMin = await this.settings.getNumericValue('print_pdf_auto_interval', 5);
    const elapsedMs = Date.now() - this.lastRunAt;
    if (this.lastRunAt > 0 && elapsedMs < intervalMin * 60 * 1000) return;

    // 3) 무인 저장 경로 확인
    const outputPath = (await this.settings.getValue('print_pdf_output_path', '')).trim();
    if (!outputPath) {
      this.logger.debug('auto-convert skipped: print_pdf_output_path not configured');
      return;
    }

    // 4) 이미 진행중인 Job이 있으면 스킵 (단, 30분 이상 멈춘 Job은 failed 처리)
    const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30분
    const activeJob = await this.prisma.pdfJob.findFirst({
      where: { status: { in: ['pending', 'in_progress'] } },
      select: { id: true, status: true, updatedAt: true, currentItem: true },
    });
    if (activeJob) {
      const elapsed = Date.now() - new Date(activeJob.updatedAt).getTime();
      if (elapsed > STUCK_THRESHOLD_MS) {
        this.logger.warn(`stuck job detected: ${activeJob.id} (${Math.round(elapsed / 60000)}min idle) → marking as failed`);
        await this.prisma.pdfJob.update({
          where: { id: activeJob.id },
          data: { status: 'failed', currentItem: null },
        }).catch(() => {});
        // 해당 Job의 in_progress 항목도 failed 처리
        if (activeJob.currentItem) {
          await this.prisma.orderItem.update({
            where: { id: activeJob.currentItem },
            data: { pdfStatus: 'failed' },
          }).catch(() => {});
        }
        // 메모리 Map에서도 제거
        this.printPdf.clearStuckJob(activeJob.id);
      } else {
        this.logger.debug(`auto-convert skipped: job ${activeJob.id} still active (${Math.round(elapsed / 60000)}min)`);
        return;
      }
    }

    // 5) 대상 항목 조회
    const items = await this.findPendingItems();
    if (items.length === 0) {
      this.lastRunAt = Date.now();
      return;
    }

    this.isRunning = true;
    this.lastRunAt = Date.now();
    this.logger.log(`auto-convert start: ${items.length} items → ${outputPath}`);

    try {
      const dto = await this.buildDto(items, outputPath);
      const job = await this.printPdf.generatePdf(dto);
      this.logger.log(`auto-convert job created: ${job.jobId}`);
      // 생성 요청만 하고 즉시 반환 (processJob은 비동기). 다음 tick은 pdf_jobs 상태 확인으로 재진입 차단.
    } catch (err: any) {
      this.logger.error(`auto-convert failed: ${err.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * pending 상태 대기 항목 조회.
   * 제외: completed(이미 성공), in_progress(현재 처리 중),
   *      failed(자동 재시도 시 무한 루프 방지 — 사용자가 수동으로 재시도하도록 유도)
   */
  private async findPendingItems(): Promise<Array<{ id: string }>> {
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { status: 'in_production', currentProcess: 'print_waiting' },
          { status: 'print_waiting' },
        ],
      },
      select: {
        items: {
          where: {
            OR: [
              { pdfStatus: null },
              { pdfStatus: { notIn: ['completed', 'in_progress', 'failed'] } },
            ],
            // 원본 파일이 하나라도 있는 항목만
            files: { some: { originalPath: { not: null } } },
          },
          select: { id: true },
        },
      },
    });
    return orders.flatMap((o) => o.items);
  }

  /** 시스템설정을 읽어 GeneratePrintPdfDto 구성 */
  private async buildDto(items: Array<{ id: string }>, outputPath: string): Promise<GeneratePrintPdfDto> {
    const indexOptionsRaw = await this.settings.getValue('print_pdf_index_options', '');
    let indexOptions: any = {
      showDateTime: true,
      showOrderNumber: true,
      showStudioName: true,
      showSpec: true,
      showPaper: true,
      showPageInfo: true,
      showColorMode: true,
      showBinding: true,
      showNup: true,
    };
    try {
      if (indexOptionsRaw) indexOptions = { ...indexOptions, ...JSON.parse(indexOptionsRaw) };
    } catch { /* ignore malformed */ }

    const includeBleed = (await this.settings.getValue('print_pdf_include_bleed', 'true')) !== 'false';
    const includeCropMarks = (await this.settings.getValue('print_pdf_include_crop_marks', 'true')) !== 'false';
    const defaultNup = await this.settings.getValue('print_pdf_default_nup', '1up');
    const indexPosition = (await this.settings.getValue('print_pdf_index_position', 'bottom')) as 'top' | 'bottom';
    const canvasEnabled = (await this.settings.getValue('print_pdf_canvas_enabled', 'false')) === 'true';
    const canvasWidth = await this.settings.getNumericValue('print_pdf_canvas_width', 310);
    const canvasHeight = await this.settings.getNumericValue('print_pdf_canvas_height', 450);

    return {
      orderItemIds: items.map((i) => i.id),
      outputPath,
      indexOptions,
      includeBleed,
      includeCropMarks,
      nupOverride: defaultNup !== '1up' ? defaultNup : undefined,
      indexPosition,
      ...(canvasEnabled && { canvasWidthMm: canvasWidth, canvasHeightMm: canvasHeight }),
    } as GeneratePrintPdfDto;
  }
}
