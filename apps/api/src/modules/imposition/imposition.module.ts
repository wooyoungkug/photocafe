import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { ImpositionController } from './controllers/imposition.controller';
import { ImpositionCalcService } from './services/imposition-calc.service';
import { ImpositionJdfService } from './services/imposition-jdf.service';
import { ImpositionPdfService } from './services/imposition-pdf.service';
import { ImpositionPresetService } from './services/imposition-preset.service';
import { ImpositionRuleService } from './services/imposition-rule.service';
import { ImpositionMatcherService } from './services/imposition-matcher.service';
import { ImpositionImagePdfService } from './services/imposition-image-pdf.service';

@Module({
  imports: [PrismaModule],
  controllers: [ImpositionController],
  providers: [
    ImpositionCalcService,
    ImpositionJdfService,
    ImpositionPdfService,
    ImpositionImagePdfService,
    ImpositionPresetService,
    ImpositionRuleService,
    ImpositionMatcherService,
  ],
  exports: [ImpositionCalcService, ImpositionMatcherService],
})
export class ImpositionModule {}
