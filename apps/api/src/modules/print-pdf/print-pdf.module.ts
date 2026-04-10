import { Module } from '@nestjs/common';
import { PrintPdfController } from './controllers/print-pdf.controller';
import { PrintPdfService } from './services/print-pdf.service';
import { PrintPdfRendererService } from './services/print-pdf-renderer.service';
import { PrintPdfLayoutService } from './services/print-pdf-layout.service';

@Module({
  controllers: [PrintPdfController],
  providers: [PrintPdfService, PrintPdfRendererService, PrintPdfLayoutService],
  exports: [PrintPdfService],
})
export class PrintPdfModule {}
