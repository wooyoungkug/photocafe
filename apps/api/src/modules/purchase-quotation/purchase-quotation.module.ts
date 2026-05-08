import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { PurchaseQuotationController } from './controllers/purchase-quotation.controller';
import { PurchaseQuotationService } from './services/purchase-quotation.service';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [PurchaseQuotationController],
  providers: [PurchaseQuotationService],
  exports: [PurchaseQuotationService],
})
export class PurchaseQuotationModule {}
