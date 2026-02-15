import { Module } from '@nestjs/common';
import { AccountingController } from './controllers/accounting.controller';
import { SalesLedgerController } from './controllers/sales-ledger.controller';
import { PurchaseLedgerController } from './controllers/purchase-ledger.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { ReportsController } from './controllers/reports.controller';
import { DepositsController } from './controllers/deposits.controller';
import { ClientLedgerController } from './controllers/client-ledger.controller';
import { AccountingService } from './services/accounting.service';
import { SalesLedgerService } from './services/sales-ledger.service';
import { PurchaseLedgerService } from './services/purchase-ledger.service';
import { JournalEngineService } from './services/journal-engine.service';
import { DashboardService } from './services/dashboard.service';
import { ReportsService } from './services/reports.service';
import { DepositsService } from './services/deposits.service';
import { ClientLedgerService } from './services/client-ledger.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [
    AccountingController,
    SalesLedgerController,
    PurchaseLedgerController,
    DashboardController,
    ReportsController,
    DepositsController,
    ClientLedgerController,
  ],
  providers: [
    AccountingService,
    SalesLedgerService,
    PurchaseLedgerService,
    JournalEngineService,
    DashboardService,
    ReportsService,
    DepositsService,
    ClientLedgerService,
    PrismaService,
  ],
  exports: [
    AccountingService,
    SalesLedgerService,
    PurchaseLedgerService,
    JournalEngineService,
    DashboardService,
    ReportsService,
    DepositsService,
    ClientLedgerService,
  ],
})
export class AccountingModule {}
