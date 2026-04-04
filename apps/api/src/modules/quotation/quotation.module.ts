import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { QuotationController } from './controllers/quotation.controller';
import { QuotationService } from './services/quotation.service';

@Module({
  imports: [PrismaModule],
  controllers: [QuotationController],
  providers: [QuotationService],
  exports: [QuotationService],
})
export class QuotationModule {}
