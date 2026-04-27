import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Res,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PrintPdfService } from '../services/print-pdf.service';
import { GeneratePrintPdfDto, PrintQueueQueryDto } from '../dto/print-pdf.dto';

@ApiTags('인쇄용 PDF 변환')
@ApiBearerAuth()
@Controller('print-pdf')
export class PrintPdfController {
  private readonly logger = new Logger(PrintPdfController.name);

  constructor(private readonly printPdfService: PrintPdfService) {}

  @Get('printers')
  @ApiOperation({ summary: '설치된 프린터 목록 조회' })
  async getPrinters() {
    try {
      if (process.platform === 'win32') {
        const output = execSync(
          'powershell -NoProfile -Command "Get-Printer | Select-Object Name,DriverName,PortName | ConvertTo-Json"',
          { encoding: 'utf8', timeout: 5000 },
        );
        const printers = JSON.parse(output);
        return (Array.isArray(printers) ? printers : [printers]).map((p: any) => ({
          name: p.Name,
          driver: p.DriverName,
          port: p.PortName,
        }));
      }
      // Linux/macOS: lpstat
      const output = execSync('lpstat -a 2>/dev/null || echo ""', { encoding: 'utf8', timeout: 5000 });
      return output.split('\n').filter(Boolean).map(line => ({
        name: line.split(' ')[0],
        driver: '',
        port: '',
      }));
    } catch {
      return [];
    }
  }

  @Get('queue')
  @ApiOperation({ summary: '출력대기 주문 목록 조회' })
  async getQueue(@Query() query: PrintQueueQueryDto) {
    return this.printPdfService.getQueue(query);
  }

  @Get('queue/:orderItemId')
  @ApiOperation({ summary: '출력대기 항목 상세 (파일목록 포함)' })
  async getQueueItemDetail(@Param('orderItemId') orderItemId: string) {
    return this.printPdfService.getQueueItemDetail(orderItemId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'PDF 생성 요청' })
  async generatePdf(@Body() dto: GeneratePrintPdfDto) {
    return this.printPdfService.generatePdf(dto);
  }

  @Get('jobs/:jobId/status')
  @ApiOperation({ summary: 'PDF 생성 진행상태 조회' })
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.printPdfService.getJobStatus(jobId);
    if (!job) {
      throw new NotFoundException('Job을 찾을 수 없습니다.');
    }
    return job;
  }

  @Post('jobs/:jobId/cancel')
  @ApiOperation({ summary: '멈춘 PDF 변환 Job 강제 취소' })
  async cancelJob(@Param('jobId') jobId: string) {
    this.printPdfService.clearStuckJob(jobId);
    await this.printPdfService['prisma'].pdfJob
      .update({ where: { id: jobId }, data: { status: 'failed', currentItem: null } })
      .catch(() => {});
    return { message: `Job ${jobId} cancelled` };
  }

  @Post('jobs/cancel-all')
  @ApiOperation({ summary: '모든 멈춘 PDF Job 강제 취소' })
  async cancelAllStuckJobs() {
    const stuckJobs = await this.printPdfService['prisma'].pdfJob.findMany({
      where: { status: { in: ['pending', 'in_progress'] } },
      select: { id: true },
    });
    for (const job of stuckJobs) {
      this.printPdfService.clearStuckJob(job.id);
      await this.printPdfService['prisma'].pdfJob
        .update({ where: { id: job.id }, data: { status: 'failed', currentItem: null } })
        .catch(() => {});
    }
    return { message: `${stuckJobs.length} jobs cancelled` };
  }

  @Get('items/:orderItemId/pdf')
  @ApiOperation({
    summary: '주문항목의 최종 PDF 인라인 열기',
    description:
      'OrderItem.pdfPath 경로의 PDF 를 application/pdf inline 으로 스트림. ' +
      '출력대기 테이블의 PDF변환성공 배지 클릭으로 새 탭 열기 용도.',
  })
  async openItemPdf(
    @Param('orderItemId') orderItemId: string,
    @Res() res: Response,
  ) {
    const item = await this.printPdfService['prisma'].orderItem.findUnique({
      where: { id: orderItemId },
      select: { pdfPath: true, productionNumber: true, productName: true },
    });
    if (!item) throw new NotFoundException('주문항목을 찾을 수 없습니다.');
    if (!item.pdfPath) throw new NotFoundException('이 항목의 PDF 가 아직 생성되지 않았습니다.');
    // 절대경로/상대경로 모두 지원 (운영은 컨테이너 기준 절대경로 저장)
    const abs = path.isAbsolute(item.pdfPath) ? item.pdfPath : path.join(process.cwd(), item.pdfPath);
    if (!fs.existsSync(abs)) {
      throw new NotFoundException('PDF 파일이 디스크에 존재하지 않습니다. 재생성이 필요합니다.');
    }
    const fileName = `${item.productionNumber || item.productName || orderItemId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    // inline → 새 탭에서 PDF 뷰어로 열림 (다운로드 강제 X)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fs.statSync(abs).size);
    fs.createReadStream(abs).pipe(res);
  }

  @Get('jobs/:jobId/download')
  @ApiOperation({ summary: '생성된 PDF 다운로드 (itemId 지정 시 해당 항목의 PDF만 반환)' })
  async downloadPdf(
    @Param('jobId') jobId: string,
    @Res() res: Response,
    @Query('itemId') itemId?: string,
  ) {
    const pdfPath = await this.printPdfService.getDownloadPath(jobId, itemId);
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      throw new NotFoundException('PDF 파일을 찾을 수 없습니다.');
    }

    // 항목별 다운로드 시: 규칙에 따른 파일명 사용. 없으면 디스크 파일명.
    let fileName = path.basename(pdfPath);
    if (itemId) {
      const job = await this.printPdfService.getJobStatus(jobId);
      const target = job?.results.find((r) => r.orderItemId === itemId);
      if (target?.fileName) fileName = target.fileName;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fs.statSync(pdfPath).size);

    const readStream = fs.createReadStream(pdfPath);
    readStream.pipe(res);
  }
}
