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
import { PrintPdfService } from '../services/print-pdf.service';
import { GeneratePrintPdfDto, PrintQueueQueryDto } from '../dto/print-pdf.dto';

@ApiTags('인쇄용 PDF 변환')
@ApiBearerAuth()
@Controller('print-pdf')
export class PrintPdfController {
  private readonly logger = new Logger(PrintPdfController.name);

  constructor(private readonly printPdfService: PrintPdfService) {}

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
    const job = this.printPdfService.getJobStatus(jobId);
    if (!job) {
      throw new NotFoundException('Job을 찾을 수 없습니다.');
    }
    return job;
  }

  @Get('jobs/:jobId/download')
  @ApiOperation({ summary: '생성된 PDF 다운로드' })
  async downloadPdf(@Param('jobId') jobId: string, @Res() res: Response) {
    const pdfPath = await this.printPdfService.getDownloadPath(jobId);
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      throw new NotFoundException('PDF 파일을 찾을 수 없습니다.');
    }

    const fileName = path.basename(pdfPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fs.statSync(pdfPath).size);

    const readStream = fs.createReadStream(pdfPath);
    readStream.pipe(res);
  }
}
