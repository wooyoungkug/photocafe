import { Module } from '@nestjs/common';
import { AccountingController } from './controllers/accounting.controller';
import { SalesLedgerController } from './controllers/sales-ledger.controller';
import { PurchaseLedgerController } from './controllers/purchase-ledger.controller';
import { AccountingService } from './services/accounting.service';
import { SalesLedgerService } from './services/sales-ledger.service';
import { PurchaseLedgerService } from './services/purchase-ledger.service';
import { JournalEngineService } from './services/journal-engine.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [AccountingController, SalesLedgerController, PurchaseLedgerController],
  providers: [AccountingService, SalesLedgerService, PurchaseLedgerService, JournalEngineService, PrismaService],
  exports: [AccountingService, SalesLedgerService, PurchaseLedgerService, JournalEngineService],
})
export class AccountingModule {}
