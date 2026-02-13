import { Module } from '@nestjs/common';
import { AccountingController } from './controllers/accounting.controller';
import { SalesLedgerController } from './controllers/sales-ledger.controller';
import { PurchaseLedgerController } from './controllers/purchase-ledger.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { ReportsController } from './controllers/reports.controller';
import { AccountingService } from './services/accounting.service';
import { SalesLedgerService } from './services/sales-ledger.service';
import { PurchaseLedgerService } from './services/purchase-ledger.service';
import { JournalEngineService } from './services/journal-engine.service';
import { DashboardService } from './services/dashboard.service';
import { ReportsService } from './services/reports.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [
    AccountingController,
    SalesLedgerController,
    PurchaseLedgerController,
    DashboardController,
    ReportsController,
  ],
  providers: [
    AccountingService,
    SalesLedgerService,
    PurchaseLedgerService,
    JournalEngineService,
    DashboardService,
    ReportsService,
    PrismaService,
  ],
  exports: [
    AccountingService,
    SalesLedgerService,
    PurchaseLedgerService,
    JournalEngineService,
    DashboardService,
    ReportsService,
  ],
})
export class AccountingModule {}
