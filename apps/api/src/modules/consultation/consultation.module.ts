import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ConsultationController } from './controllers/consultation.controller';
import { ConsultationCategoryController } from './controllers/consultation-category.controller';
import { ConsultationService } from './services/consultation.service';
import { ConsultationCategoryService } from './services/consultation-category.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConsultationController, ConsultationCategoryController],
  providers: [ConsultationService, ConsultationCategoryService],
  exports: [ConsultationService, ConsultationCategoryService],
})
export class ConsultationModule {}
