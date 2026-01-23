import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ConsultationController } from './controllers/consultation.controller';
import { ConsultationCategoryController } from './controllers/consultation-category.controller';
import { CSAdvancedController } from './controllers/cs-advanced.controller';
import { ConsultationService } from './services/consultation.service';
import { ConsultationCategoryService } from './services/consultation-category.service';
import { CSAdvancedService } from './services/cs-advanced.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ConsultationController,
    ConsultationCategoryController,
    CSAdvancedController,
  ],
  providers: [
    ConsultationService,
    ConsultationCategoryService,
    CSAdvancedService,
  ],
  exports: [
    ConsultationService,
    ConsultationCategoryService,
    CSAdvancedService,
  ],
})
export class ConsultationModule {}
