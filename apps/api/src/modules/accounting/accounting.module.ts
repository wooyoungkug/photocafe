import { Module } from '@nestjs/common';
import { AccountingController } from './controllers/accounting.controller';
import { AccountingService } from './services/accounting.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [AccountingController],
  providers: [AccountingService, PrismaService],
  exports: [AccountingService],
})
export class AccountingModule {}
