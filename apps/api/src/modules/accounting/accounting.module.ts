import { Module } from '@nestjs/common';
import { AccountingController } from './controllers/accounting.controller';
import { SalesLedgerController } from './controllers/sales-ledger.controller';
import { AccountingService } from './services/accounting.service';
import { SalesLedgerService } from './services/sales-ledger.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [AccountingController, SalesLedgerController],
  providers: [AccountingService, SalesLedgerService, PrismaService],
  exports: [AccountingService, SalesLedgerService],
})
export class AccountingModule {}
