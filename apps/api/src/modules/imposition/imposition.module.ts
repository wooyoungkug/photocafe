import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { UploadModule } from '../upload/upload.module';
import { ImpositionController } from './controllers/imposition.controller';
import { ImpositionCalcService } from './services/imposition-calc.service';
import { ImpositionJdfService } from './services/imposition-jdf.service';
import { ImpositionPdfService } from './services/imposition-pdf.service';
import { ImpositionPresetService } from './services/imposition-preset.service';
import { ImpositionRuleService } from './services/imposition-rule.service';
import { ImpositionMatcherService } from './services/imposition-matcher.service';
import { ImpositionImagePdfService } from './services/imposition-image-pdf.service';
import { PrintPdfSlipPrinterService } from '../print-pdf/services/print-pdf-slip-printer.service';

@Module({
  imports: [PrismaModule, SystemSettingsModule, UploadModule],
  controllers: [ImpositionController],
  providers: [
    ImpositionCalcService,
    ImpositionJdfService,
    ImpositionPdfService,
    ImpositionImagePdfService,
    ImpositionPresetService,
    ImpositionRuleService,
    ImpositionMatcherService,
    PrintPdfSlipPrinterService,
  ],
  exports: [ImpositionCalcService, ImpositionMatcherService],
})
export class ImpositionModule {}
