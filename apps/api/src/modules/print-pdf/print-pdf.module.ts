import { Module } from '@nestjs/common';
import { PrintPdfController } from './controllers/print-pdf.controller';
import { PrintPdfService } from './services/print-pdf.service';
import { PrintPdfRendererService } from './services/print-pdf-renderer.service';
import { PrintPdfLayoutService } from './services/print-pdf-layout.service';
import { PrintPdfAutoConvertService } from './services/print-pdf-auto-convert.service';
import { PrintPdfSlipPrinterService } from './services/print-pdf-slip-printer.service';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { ImpositionModule } from '../imposition/imposition.module';

@Module({
  imports: [SystemSettingsModule, ImpositionModule],
  controllers: [PrintPdfController],
  providers: [
    PrintPdfService,
    PrintPdfRendererService,
    PrintPdfLayoutService,
    PrintPdfAutoConvertService,
    PrintPdfSlipPrinterService,
  ],
  exports: [PrintPdfService],
})
export class PrintPdfModule {}
