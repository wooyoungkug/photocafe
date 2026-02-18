import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  CreateJournalDto,
  JournalQueryDto,
  CreateReceivableDto,
  CreateReceivablePaymentDto,
  ReceivableQueryDto,
  CreatePayableDto,
  CreatePayablePaymentDto,
  PayableQueryDto,
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CreateSettlementDto,
  SettlementQueryDto,
  VoucherType,
} from '../dto/accounting.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  // ===== 계정과목 =====

  async findAllAccounts() {
    return this.prisma.account.findMany({
      where: { isActive: true },
      include: {
        parent: true,
        children: true,
      },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  async findAccountById(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: { parent: true, children: true },
    });
    if (!account) {
      throw new NotFoundException('계정과목을 찾을 수 없습니다.');
    }
    return account;
  }

  async createAccount(dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
        description: dto.description,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async updateAccount(id: string, dto: UpdateAccountDto) {
    return this.prisma.account.update({
      where: { id },
      data: dto,
    });
  }

  async deleteAccount(id: string) {
    return this.prisma.account.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async seedStandardAccounts(): Promise<{ created: number; updated: number; total: number }> {
    const STANDARD_ACCOUNTS: Array<{
      code: string;
      name: string;
      type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
      sortOrder: number;
    }> = [
      // 자산 (ASSET)
      { code: '101', name: '현금', type: 'ASSET', sortOrder: 1 },
      { code: '102', name: '보통예금', type: 'ASSET', sortOrder: 2 },
      { code: '103', name: '정기예금', type: 'ASSET', sortOrder: 3 },
      { code: '108', name: '받을어음', type: 'ASSET', sortOrder: 4 },
      { code: '110', name: '외상매출금', type: 'ASSET', sortOrder: 5 },
      { code: '111', name: '미수금', type: 'ASSET', sortOrder: 6 },
      { code: '112', name: '선급금', type: 'ASSET', sortOrder: 7 },
      { code: '113', name: '선급비용', type: 'ASSET', sortOrder: 8 },
      { code: '115', name: '부가세대급금', type: 'ASSET', sortOrder: 8.5 },
      { code: '120', name: '원재료', type: 'ASSET', sortOrder: 9 },
      { code: '121', name: '재공품', type: 'ASSET', sortOrder: 10 },
      { code: '122', name: '제품', type: 'ASSET', sortOrder: 11 },
      { code: '123', name: '상품', type: 'ASSET', sortOrder: 12 },
      { code: '124', name: '저장품', type: 'ASSET', sortOrder: 13 },
      { code: '130', name: '비품', type: 'ASSET', sortOrder: 14 },
      { code: '131', name: '기계장치', type: 'ASSET', sortOrder: 15 },
      { code: '132', name: '차량운반구', type: 'ASSET', sortOrder: 16 },
      { code: '139', name: '감가상각누계액', type: 'ASSET', sortOrder: 17 },
      // 부채 (LIABILITY)
      { code: '201', name: '외상매입금', type: 'LIABILITY', sortOrder: 18 },
      { code: '202', name: '미지급금', type: 'LIABILITY', sortOrder: 19 },
      { code: '203', name: '선수금', type: 'LIABILITY', sortOrder: 20 },
      { code: '204', name: '예수금', type: 'LIABILITY', sortOrder: 21 },
      { code: '205', name: '미지급비용', type: 'LIABILITY', sortOrder: 22 },
      { code: '208', name: '지급어음', type: 'LIABILITY', sortOrder: 23 },
      { code: '210', name: '단기차입금', type: 'LIABILITY', sortOrder: 24 },
      { code: '220', name: '장기차입금', type: 'LIABILITY', sortOrder: 25 },
      // 자본 (EQUITY)
      { code: '301', name: '자본금', type: 'EQUITY', sortOrder: 26 },
      { code: '331', name: '이익잉여금', type: 'EQUITY', sortOrder: 27 },
      // 수익 (REVENUE)
      { code: '401', name: '상품매출', type: 'REVENUE', sortOrder: 28 },
      { code: '402', name: '제품매출', type: 'REVENUE', sortOrder: 29 },
      { code: '403', name: '출력매출', type: 'REVENUE', sortOrder: 30 },
      { code: '404', name: '용역매출', type: 'REVENUE', sortOrder: 31 },
      { code: '409', name: '매출할인', type: 'REVENUE', sortOrder: 32 },
      { code: '410', name: '매출환입', type: 'REVENUE', sortOrder: 33 },
      { code: '490', name: '잡이익', type: 'REVENUE', sortOrder: 34 },
      // 비용 (EXPENSE)
      { code: '501', name: '상품매출원가', type: 'EXPENSE', sortOrder: 35 },
      { code: '510', name: '기초원재료재고', type: 'EXPENSE', sortOrder: 36 },
      { code: '511', name: '원재료매입', type: 'EXPENSE', sortOrder: 37 },
      { code: '512', name: '기말원재료재고', type: 'EXPENSE', sortOrder: 38 },
      { code: '520', name: '직접노무비', type: 'EXPENSE', sortOrder: 39 },
      { code: '530', name: '제조경비', type: 'EXPENSE', sortOrder: 40 },
      { code: '540', name: '기초제품재고', type: 'EXPENSE', sortOrder: 41 },
      { code: '541', name: '기말제품재고', type: 'EXPENSE', sortOrder: 42 },
      { code: '601', name: '급여', type: 'EXPENSE', sortOrder: 43 },
      { code: '602', name: '퇴직급여', type: 'EXPENSE', sortOrder: 44 },
      { code: '603', name: '복리후생비', type: 'EXPENSE', sortOrder: 45 },
      { code: '604', name: '여비교통비', type: 'EXPENSE', sortOrder: 46 },
      { code: '605', name: '접대비', type: 'EXPENSE', sortOrder: 47 },
      { code: '606', name: '통신비', type: 'EXPENSE', sortOrder: 48 },
      { code: '607', name: '수도광열비', type: 'EXPENSE', sortOrder: 49 },
      { code: '608', name: '세금과공과', type: 'EXPENSE', sortOrder: 50 },
      { code: '609', name: '감가상각비', type: 'EXPENSE', sortOrder: 51 },
      { code: '610', name: '지급임차료', type: 'EXPENSE', sortOrder: 52 },
      { code: '611', name: '수선비', type: 'EXPENSE', sortOrder: 53 },
      { code: '612', name: '보험료', type: 'EXPENSE', sortOrder: 54 },
      { code: '613', name: '차량유지비', type: 'EXPENSE', sortOrder: 55 },
      { code: '614', name: '운반비', type: 'EXPENSE', sortOrder: 56 },
      { code: '615', name: '교육훈련비', type: 'EXPENSE', sortOrder: 57 },
      { code: '616', name: '디자인외주비', type: 'EXPENSE', sortOrder: 58 },
      { code: '617', name: '소모품비', type: 'EXPENSE', sortOrder: 59 },
      { code: '618', name: '지급수수료', type: 'EXPENSE', sortOrder: 60 },
      { code: '619', name: '광고선전비', type: 'EXPENSE', sortOrder: 61 },
      { code: '620', name: '대손상각비', type: 'EXPENSE', sortOrder: 62 },
      { code: '650', name: '잡손실', type: 'EXPENSE', sortOrder: 63 },
    ];

    let created = 0;
    let updated = 0;

    for (const account of STANDARD_ACCOUNTS) {
      const existing = await this.prisma.account.findUnique({
        where: { code: account.code },
      });

      await this.prisma.account.upsert({
        where: { code: account.code },
        create: {
          code: account.code,
          name: account.name,
          type: account.type,
          sortOrder: account.sortOrder,
          isActive: true,
        },
        update: {
          name: account.name,
          type: account.type,
          sortOrder: account.sortOrder,
          isActive: true,
        },
      });

      if (existing) {
        updated++;
      } else {
        created++;
      }
    }

    return { created, updated, total: STANDARD_ACCOUNTS.length };
  }

  // ===== 전표 (Journal) =====

  async generateVoucherNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `V-${year}-`;

    const lastJournal = await this.prisma.journal.findFirst({
      where: { voucherNo: { startsWith: prefix } },
      orderBy: { voucherNo: 'desc' },
    });

    let sequence = 1;
    if (lastJournal) {
      const lastSeq = parseInt(lastJournal.voucherNo.split('-')[2]);
      sequence = lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }

  async findAllJournals(query: JournalQueryDto) {
    const { startDate, endDate, voucherType, clientId, search, page = 1, limit = 20 } = query;

    const where: Prisma.JournalWhereInput = {};

    if (startDate || endDate) {
      where.journalDate = {};
      if (startDate) where.journalDate.gte = new Date(startDate);
      if (endDate) where.journalDate.lte = new Date(endDate);
    }

    if (voucherType) where.voucherType = voucherType;
    if (clientId) where.clientId = clientId;

    if (search) {
      where.OR = [
        { voucherNo: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.journal.findMany({
        where,
        include: {
          entries: {
            include: { account: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { journalDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.journal.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findJournalById(id: string) {
    const journal = await this.prisma.journal.findUnique({
      where: { id },
      include: {
        entries: {
          include: { account: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!journal) {
      throw new NotFoundException('전표를 찾을 수 없습니다.');
    }
    return journal;
  }

  async createJournal(dto: CreateJournalDto, createdBy: string) {
    // 차대 균형 검증
    const debitTotal = dto.entries
      .filter((e) => e.transactionType === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);
    const creditTotal = dto.entries
      .filter((e) => e.transactionType === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0);

    if (debitTotal !== creditTotal) {
      throw new BadRequestException('차변과 대변의 합계가 일치하지 않습니다.');
    }

    const voucherNo = await this.generateVoucherNo();

    return this.prisma.journal.create({
      data: {
        voucherNo,
        voucherType: dto.voucherType,
        journalDate: new Date(dto.journalDate),
        clientId: dto.clientId,
        clientName: dto.clientName,
        description: dto.description,
        totalAmount: dto.totalAmount,
        orderId: dto.orderId,
        orderNumber: dto.orderNumber,
        createdBy,
        entries: {
          create: dto.entries.map((entry, index) => ({
            accountId: entry.accountId,
            transactionType: entry.transactionType,
            amount: entry.amount,
            description: entry.description,
            sortOrder: index,
          })),
        },
      },
      include: {
        entries: { include: { account: true } },
      },
    });
  }

  async deleteJournal(id: string) {
    return this.prisma.journal.delete({ where: { id } });
  }

  // ===== 미수금 (Receivable) =====

  async findAllReceivables(query: ReceivableQueryDto) {
    const { status, clientId, overdue, startDate, endDate } = query;

    const where: Prisma.ReceivableWhereInput = {};

    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (overdue) {
      where.status = 'overdue';
    }
    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) where.issueDate.gte = new Date(startDate);
      if (endDate) where.issueDate.lte = new Date(endDate);
    }

    const data = await this.prisma.receivable.findMany({
      where,
      include: { payments: { orderBy: { paymentDate: 'desc' } } },
      orderBy: { issueDate: 'desc' },
    });

    return { data, meta: { total: data.length } };
  }

  async findReceivableById(id: string) {
    const receivable = await this.prisma.receivable.findUnique({
      where: { id },
      include: { payments: { orderBy: { paymentDate: 'desc' } } },
    });
    if (!receivable) {
      throw new NotFoundException('미수금을 찾을 수 없습니다.');
    }
    return receivable;
  }

  async createReceivable(dto: CreateReceivableDto) {
    return this.prisma.receivable.create({
      data: {
        clientId: dto.clientId,
        clientName: dto.clientName,
        clientCode: dto.clientCode,
        orderId: dto.orderId,
        orderNumber: dto.orderNumber,
        originalAmount: dto.originalAmount,
        paidAmount: 0,
        balance: dto.originalAmount,
        issueDate: new Date(dto.issueDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        description: dto.description,
        status: 'outstanding',
      },
    });
  }

  async addReceivablePayment(receivableId: string, dto: CreateReceivablePaymentDto, createdBy?: string) {
    const receivable = await this.findReceivableById(receivableId);

    if (dto.amount > Number(receivable.balance)) {
      throw new BadRequestException('수금액이 잔액을 초과합니다.');
    }

    const newPaidAmount = Number(receivable.paidAmount) + dto.amount;
    const newBalance = Number(receivable.originalAmount) - newPaidAmount;
    const newStatus = newBalance === 0 ? 'paid' : 'partial';

    await this.prisma.$transaction([
      this.prisma.receivablePayment.create({
        data: {
          receivableId,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod,
          description: dto.description,
          createdBy,
        },
      }),
      this.prisma.receivable.update({
        where: { id: receivableId },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
        },
      }),
    ]);

    return this.findReceivableById(receivableId);
  }

  async getReceivableSummary() {
    const receivables = await this.prisma.receivable.findMany({
      where: { status: { not: 'paid' } },
    });

    const totalReceivables = receivables.reduce((sum: number, r: any) => sum + Number(r.balance), 0);
    const overdueAmount = receivables
      .filter((r: any) => r.status === 'overdue')
      .reduce((sum: number, r: any) => sum + Number(r.balance), 0);

    // aging 분석
    const now = new Date();
    const aging = { under30: 0, days30to60: 0, days60to90: 0, over90: 0 };

    receivables.forEach((r: any) => {
      const daysDiff = Math.floor((now.getTime() - new Date(r.issueDate).getTime()) / (1000 * 60 * 60 * 24));
      const balance = Number(r.balance);
      if (daysDiff < 30) aging.under30 += balance;
      else if (daysDiff < 60) aging.days30to60 += balance;
      else if (daysDiff < 90) aging.days60to90 += balance;
      else aging.over90 += balance;
    });

    return {
      totalReceivables,
      overdueAmount,
      clientCount: new Set(receivables.map((r: any) => r.clientId)).size,
      aging,
    };
  }

  // ===== 미지급금 (Payable) =====

  async findAllPayables(query: PayableQueryDto) {
    const { status, supplierId, overdue, startDate, endDate } = query;

    const where: Prisma.PayableWhereInput = {};

    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (overdue) {
      where.status = 'overdue';
    }
    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) where.issueDate.gte = new Date(startDate);
      if (endDate) where.issueDate.lte = new Date(endDate);
    }

    const data = await this.prisma.payable.findMany({
      where,
      include: { payments: { orderBy: { paymentDate: 'desc' } } },
      orderBy: { issueDate: 'desc' },
    });

    return { data, meta: { total: data.length } };
  }

  async findPayableById(id: string) {
    const payable = await this.prisma.payable.findUnique({
      where: { id },
      include: { payments: { orderBy: { paymentDate: 'desc' } } },
    });
    if (!payable) {
      throw new NotFoundException('미지급금을 찾을 수 없습니다.');
    }
    return payable;
  }

  async createPayable(dto: CreatePayableDto) {
    return this.prisma.payable.create({
      data: {
        supplierId: dto.supplierId,
        supplierName: dto.supplierName,
        supplierCode: dto.supplierCode,
        originalAmount: dto.originalAmount,
        paidAmount: 0,
        balance: dto.originalAmount,
        issueDate: new Date(dto.issueDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        description: dto.description,
        status: 'outstanding',
      },
    });
  }

  async addPayablePayment(payableId: string, dto: CreatePayablePaymentDto, createdBy?: string) {
    const payable = await this.findPayableById(payableId);

    if (dto.amount > Number(payable.balance)) {
      throw new BadRequestException('지급액이 잔액을 초과합니다.');
    }

    const newPaidAmount = Number(payable.paidAmount) + dto.amount;
    const newBalance = Number(payable.originalAmount) - newPaidAmount;
    const newStatus = newBalance === 0 ? 'paid' : 'partial';

    await this.prisma.$transaction([
      this.prisma.payablePayment.create({
        data: {
          payableId,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod,
          description: dto.description,
          createdBy,
        },
      }),
      this.prisma.payable.update({
        where: { id: payableId },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
        },
      }),
    ]);

    return this.findPayableById(payableId);
  }

  async getPayableSummary() {
    const payables = await this.prisma.payable.findMany({
      where: { status: { not: 'paid' } },
    });

    const totalPayables = payables.reduce((sum: number, p: any) => sum + Number(p.balance), 0);

    return {
      totalPayables,
      supplierCount: new Set(payables.map((p: any) => p.supplierId)).size,
    };
  }

  // ===== 은행계좌 =====

  async findAllBankAccounts() {
    return this.prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { accountName: 'asc' }],
    });
  }

  async findBankAccountById(id: string) {
    const account = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException('은행계좌를 찾을 수 없습니다.');
    }
    return account;
  }

  async createBankAccount(dto: CreateBankAccountDto) {
    // 기본 계좌로 설정 시 기존 기본 계좌 해제
    if (dto.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.bankAccount.create({
      data: {
        accountName: dto.accountName,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountHolder: dto.accountHolder,
        balance: dto.balance || 0,
        isDefault: dto.isDefault || false,
        description: dto.description,
      },
    });
  }

  async updateBankAccount(id: string, dto: UpdateBankAccountDto) {
    if (dto.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data: dto,
    });
  }

  async deleteBankAccount(id: string) {
    return this.prisma.bankAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ===== 정산 =====

  async findAllSettlements(query: SettlementQueryDto) {
    const { periodType, startDate, endDate, status } = query;

    const where: Prisma.SettlementWhereInput = {};

    if (periodType) where.periodType = periodType;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.periodStart = {};
      if (startDate) where.periodStart.gte = new Date(startDate);
      if (endDate) where.periodStart.lte = new Date(endDate);
    }

    return this.prisma.settlement.findMany({
      where,
      orderBy: { periodStart: 'desc' },
    });
  }

  async createSettlement(dto: CreateSettlementDto) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    // 해당 기간 매출 (입금전표 합계)
    const receipts = await this.prisma.journal.aggregate({
      where: {
        voucherType: VoucherType.RECEIPT,
        journalDate: { gte: periodStart, lte: periodEnd },
      },
      _sum: { totalAmount: true },
    });

    // 해당 기간 매입 (출금전표 합계)
    const payments = await this.prisma.journal.aggregate({
      where: {
        voucherType: VoucherType.PAYMENT,
        journalDate: { gte: periodStart, lte: periodEnd },
      },
      _sum: { totalAmount: true },
    });

    // 미수금 잔액
    const receivables = await this.prisma.receivable.aggregate({
      where: { status: { not: 'paid' } },
      _sum: { balance: true },
    });

    // 미지급금 잔액
    const payables = await this.prisma.payable.aggregate({
      where: { status: { not: 'paid' } },
      _sum: { balance: true },
    });

    const totalIncome = Number(receipts._sum.totalAmount || 0);
    const totalExpense = Number(payments._sum.totalAmount || 0);
    const receivablesBalance = Number(receivables._sum.balance || 0);
    const payablesBalance = Number(payables._sum.balance || 0);

    return this.prisma.settlement.create({
      data: {
        periodType: dto.periodType,
        periodStart,
        periodEnd,
        totalSales: totalIncome, // 간단화: 입금=매출
        totalPurchases: totalExpense,
        totalIncome,
        totalExpense,
        receivablesBalance,
        payablesBalance,
        netProfit: totalIncome - totalExpense,
        netCashFlow: totalIncome - totalExpense,
        status: 'draft',
      },
    });
  }

  async confirmSettlement(id: string, confirmedBy: string) {
    return this.prisma.settlement.update({
      where: { id },
      data: {
        status: 'confirmed',
        confirmedBy,
        confirmedAt: new Date(),
      },
    });
  }

  // ===== 요약/통계 =====

  async getAccountingSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 당월 입금
    const monthlyReceipts = await this.prisma.journal.aggregate({
      where: {
        voucherType: VoucherType.RECEIPT,
        journalDate: { gte: startOfMonth },
      },
      _sum: { totalAmount: true },
    });

    // 당월 출금
    const monthlyPayments = await this.prisma.journal.aggregate({
      where: {
        voucherType: VoucherType.PAYMENT,
        journalDate: { gte: startOfMonth },
      },
      _sum: { totalAmount: true },
    });

    // 미수금 총액
    const receivables = await this.prisma.receivable.aggregate({
      where: { status: { not: 'paid' } },
      _sum: { balance: true },
    });

    // 미지급금 총액
    const payables = await this.prisma.payable.aggregate({
      where: { status: { not: 'paid' } },
      _sum: { balance: true },
    });

    const totalSales = Number(monthlyReceipts._sum.totalAmount || 0);
    const totalPurchases = Number(monthlyPayments._sum.totalAmount || 0);

    return {
      totalSales,
      totalPurchases,
      totalIncome: totalSales,
      totalExpense: totalPurchases,
      receivablesBalance: Number(receivables._sum.balance || 0),
      payablesBalance: Number(payables._sum.balance || 0),
      netCashFlow: totalSales - totalPurchases,
    };
  }

  async getDailySummary(date: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // 당일 입금
    const dailyReceipts = await this.prisma.journal.aggregate({
      where: {
        voucherType: VoucherType.RECEIPT,
        journalDate: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { totalAmount: true },
    });

    // 당일 출금
    const dailyPayments = await this.prisma.journal.aggregate({
      where: {
        voucherType: VoucherType.PAYMENT,
        journalDate: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { totalAmount: true },
    });

    const totalIncome = Number(dailyReceipts._sum.totalAmount || 0);
    const totalExpense = Number(dailyPayments._sum.totalAmount || 0);

    return {
      date,
      totalSales: totalIncome,
      totalExpenses: totalExpense,
      totalIncome,
      totalOutcome: totalExpense,
      netCashFlow: totalIncome - totalExpense,
    };
  }
}
