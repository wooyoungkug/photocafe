import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

// ===== 입력 타입 정의 =====

interface CreateSalesJournalParams {
  salesLedgerId: string;
  clientId: string;
  clientName: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  accountCode?: string; // 매출 계정코드 (기본: '402' 제품매출)
  orderId?: string;
  orderNumber?: string;
  description?: string;
}

interface CreateReceiptJournalParams {
  salesLedgerId: string;
  clientId: string;
  clientName: string;
  amount: number;
  paymentMethod: string;
  bankName?: string;
  description?: string;
}

interface CreatePurchaseJournalParams {
  purchaseLedgerId: string;
  supplierId: string;
  supplierName: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  materialAccountCode: string; // 예: '120' 원재료, '123' 상품
  description?: string;
}

interface CreatePaymentJournalParams {
  purchaseLedgerId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paymentMethod: string;
  bankName?: string;
  description?: string;
}

interface JournalEntryInput {
  accountId: string;
  transactionType: 'DEBIT' | 'CREDIT';
  amount: number;
  description?: string;
  sortOrder: number;
}

@Injectable()
export class JournalEngineService {
  private readonly logger = new Logger(JournalEngineService.name);

  constructor(private prisma: PrismaService) {}

  // ===== 전표번호 채번 =====
  // 형식: JE-YYYYMM-NNNN (월별 순번)
  async generateJournalNo(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `JE-${yearMonth}-`;

    const lastJournal = await this.prisma.journal.findFirst({
      where: { voucherNo: { startsWith: prefix } },
      orderBy: { voucherNo: 'desc' },
      select: { voucherNo: true },
    });

    let sequence = 1;
    if (lastJournal) {
      const parts = lastJournal.voucherNo.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  // ===== 매출 자동분개 =====
  // 매출원장 생성 시 호출 -> 대체전표 자동 생성
  // 차변: 외상매출금(110) = totalAmount
  // 대변: 매출계정(accountCode) = supplyAmount
  // 대변: 예수금-부가세(204) = vatAmount
  async createSalesJournal(params: CreateSalesJournalParams) {
    const {
      salesLedgerId,
      clientId,
      clientName,
      supplyAmount,
      vatAmount,
      totalAmount,
      accountCode = '402',
      orderId,
      orderNumber,
      description,
    } = params;

    // 계정과목 조회
    const [accountReceivable, salesAccount, vatAccount] = await Promise.all([
      this.findAccountByCode('110'), // 외상매출금
      this.findAccountByCode(accountCode), // 매출 계정 (기본: 제품매출)
      this.findAccountByCode('204'), // 예수금(부가세)
    ]);

    // 분개 항목 구성
    const entries: JournalEntryInput[] = [
      {
        accountId: accountReceivable.id,
        transactionType: 'DEBIT',
        amount: totalAmount,
        description: `외상매출금 - ${clientName}`,
        sortOrder: 0,
      },
      {
        accountId: salesAccount.id,
        transactionType: 'CREDIT',
        amount: supplyAmount,
        description: `${salesAccount.name} - ${clientName}`,
        sortOrder: 1,
      },
    ];

    // 부가세가 0원이면 예수금 분개 생략
    if (vatAmount > 0) {
      entries.push({
        accountId: vatAccount.id,
        transactionType: 'CREDIT',
        amount: vatAmount,
        description: `부가세 예수금 - ${clientName}`,
        sortOrder: 2,
      });
    }

    // 차대 균형 검증
    this.validateBalance(entries);

    const voucherNo = await this.generateJournalNo();

    const journal = await this.prisma.$transaction(async (tx) => {
      return tx.journal.create({
        data: {
          voucherNo,
          voucherType: 'TRANSFER',
          journalDate: new Date(),
          clientId,
          clientName,
          description: description || `매출전표 - ${clientName}`,
          totalAmount,
          orderId: orderId || null,
          orderNumber: orderNumber || null,
          sourceType: 'SALES',
          sourceId: salesLedgerId,
          createdBy: 'system',
          entries: {
            create: entries.map((entry) => ({
              accountId: entry.accountId,
              transactionType: entry.transactionType,
              amount: entry.amount,
              description: entry.description,
              sortOrder: entry.sortOrder,
            })),
          },
        },
        include: {
          entries: {
            include: { account: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    this.logger.log(
      `매출 자동분개 생성: ${voucherNo} (매출원장: ${salesLedgerId}, 금액: ${totalAmount})`,
    );

    return journal;
  }

  // ===== 수금(입금) 자동분개 =====
  // 수금 처리 시 호출 -> 입금전표 자동 생성
  // 결제수단별 분기:
  //   현금:       차변 현금(101) / 대변 외상매출금(110)
  //   계좌이체:   차변 보통예금(102) / 대변 외상매출금(110)
  //   카드:       차변 보통예금(102) + 지급수수료(618) / 대변 외상매출금(110)
  //   수표:       차변 보통예금(102) / 대변 외상매출금(110)
  async createReceiptJournal(params: CreateReceiptJournalParams) {
    const {
      salesLedgerId,
      clientId,
      clientName,
      amount,
      paymentMethod,
      bankName,
      description,
    } = params;

    // 결제수단에 따른 차변 계정 결정
    const cashAccountCode = paymentMethod === 'cash' ? '101' : '102';

    // 계정과목 조회
    const [cashAccount, accountReceivable] = await Promise.all([
      this.findAccountByCode(cashAccountCode),
      this.findAccountByCode('110'), // 외상매출금
    ]);

    const paymentDesc = bankName
      ? `${paymentMethod} (${bankName})`
      : paymentMethod;

    const entries: JournalEntryInput[] = [];

    if (paymentMethod === 'card') {
      // 카드 결제: 수수료 자동 분개
      const CARD_FEE_RATE = 0.03; // 카드수수료율 3%
      const cardFee = Math.round(amount * CARD_FEE_RATE);
      const netAmount = amount - cardFee;

      const feeAccount = await this.findAccountByCode('618'); // 지급수수료

      entries.push(
        {
          accountId: cashAccount.id,
          transactionType: 'DEBIT',
          amount: netAmount,
          description: `카드입금 - ${clientName} / ${paymentDesc}`,
          sortOrder: 0,
        },
        {
          accountId: feeAccount.id,
          transactionType: 'DEBIT',
          amount: cardFee,
          description: `카드수수료 ${CARD_FEE_RATE * 100}% - ${clientName}`,
          sortOrder: 1,
        },
        {
          accountId: accountReceivable.id,
          transactionType: 'CREDIT',
          amount,
          description: `외상매출금 회수 - ${clientName}`,
          sortOrder: 2,
        },
      );
    } else {
      // 현금, 계좌이체, 수표 등
      entries.push(
        {
          accountId: cashAccount.id,
          transactionType: 'DEBIT',
          amount,
          description: `입금 - ${clientName} / ${paymentDesc}`,
          sortOrder: 0,
        },
        {
          accountId: accountReceivable.id,
          transactionType: 'CREDIT',
          amount,
          description: `외상매출금 회수 - ${clientName}`,
          sortOrder: 1,
        },
      );
    }

    this.validateBalance(entries);

    const voucherNo = await this.generateJournalNo();

    const journal = await this.prisma.$transaction(async (tx) => {
      return tx.journal.create({
        data: {
          voucherNo,
          voucherType: 'RECEIPT',
          journalDate: new Date(),
          clientId,
          clientName,
          description: description || `수금 - ${clientName} / ${paymentDesc}`,
          totalAmount: amount,
          sourceType: 'RECEIPT',
          sourceId: salesLedgerId,
          createdBy: 'system',
          entries: {
            create: entries.map((entry) => ({
              accountId: entry.accountId,
              transactionType: entry.transactionType,
              amount: entry.amount,
              description: entry.description,
              sortOrder: entry.sortOrder,
            })),
          },
        },
        include: {
          entries: {
            include: { account: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    this.logger.log(
      `수금 자동분개 생성: ${voucherNo} (매출원장: ${salesLedgerId}, 결제수단: ${paymentMethod}, 금액: ${amount})`,
    );

    return journal;
  }

  // ===== 매입 자동분개 =====
  // 매입원장 생성 시 호출 -> 대체전표 자동 생성
  // 차변: 원재료/상품 등(materialAccountCode) = supplyAmount
  // 차변: 부가세대급금(115) = vatAmount
  // 대변: 외상매입금(201) = totalAmount
  async createPurchaseJournal(params: CreatePurchaseJournalParams) {
    const {
      purchaseLedgerId,
      supplierId,
      supplierName,
      supplyAmount,
      vatAmount,
      totalAmount,
      materialAccountCode,
      description,
    } = params;

    // 계정과목 조회
    const [materialAccount, vatInputAccount, accountPayable] =
      await Promise.all([
        this.findAccountByCode(materialAccountCode), // 원재료(120) 또는 상품(123) 등
        this.findAccountByCode('115'), // 부가세대급금
        this.findAccountByCode('201'), // 외상매입금
      ]);

    const entries: JournalEntryInput[] = [
      {
        accountId: materialAccount.id,
        transactionType: 'DEBIT',
        amount: supplyAmount,
        description: `${materialAccount.name} 매입 - ${supplierName}`,
        sortOrder: 0,
      },
    ];

    // 부가세가 0원이면 선급비용 분개 생략
    if (vatAmount > 0) {
      entries.push({
        accountId: vatInputAccount.id,
        transactionType: 'DEBIT',
        amount: vatAmount,
        description: `부가세 대급금 - ${supplierName}`,
        sortOrder: 1,
      });
    }

    entries.push({
      accountId: accountPayable.id,
      transactionType: 'CREDIT',
      amount: totalAmount,
      description: `외상매입금 - ${supplierName}`,
      sortOrder: 2,
    });

    this.validateBalance(entries);

    const voucherNo = await this.generateJournalNo();

    const journal = await this.prisma.$transaction(async (tx) => {
      return tx.journal.create({
        data: {
          voucherNo,
          voucherType: 'TRANSFER',
          journalDate: new Date(),
          clientId: supplierId,
          clientName: supplierName,
          description: description || `매입전표 - ${supplierName}`,
          totalAmount,
          sourceType: 'PURCHASE',
          sourceId: purchaseLedgerId,
          createdBy: 'system',
          entries: {
            create: entries.map((entry) => ({
              accountId: entry.accountId,
              transactionType: entry.transactionType,
              amount: entry.amount,
              description: entry.description,
              sortOrder: entry.sortOrder,
            })),
          },
        },
        include: {
          entries: {
            include: { account: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    this.logger.log(
      `매입 자동분개 생성: ${voucherNo} (매입원장: ${purchaseLedgerId}, 금액: ${totalAmount})`,
    );

    return journal;
  }

  // ===== 지급(출금) 자동분개 =====
  // 매입대금 지급 시 호출 -> 출금전표 자동 생성
  // 결제수단별 분기:
  //   현금:       차변 외상매입금(201) / 대변 현금(101)
  //   계좌이체:   차변 외상매입금(201) / 대변 보통예금(102)
  async createPaymentJournal(params: CreatePaymentJournalParams) {
    const {
      purchaseLedgerId,
      supplierId,
      supplierName,
      amount,
      paymentMethod,
      bankName,
      description,
    } = params;

    // 결제수단에 따른 대변 계정 결정
    const cashAccountCode = paymentMethod === 'cash' ? '101' : '102';

    // 계정과목 조회
    const [accountPayable, cashAccount] = await Promise.all([
      this.findAccountByCode('201'), // 외상매입금
      this.findAccountByCode(cashAccountCode),
    ]);

    const paymentDesc = bankName
      ? `${paymentMethod} (${bankName})`
      : paymentMethod;

    const entries: JournalEntryInput[] = [
      {
        accountId: accountPayable.id,
        transactionType: 'DEBIT',
        amount,
        description: `외상매입금 상환 - ${supplierName}`,
        sortOrder: 0,
      },
      {
        accountId: cashAccount.id,
        transactionType: 'CREDIT',
        amount,
        description: `출금 - ${supplierName} / ${paymentDesc}`,
        sortOrder: 1,
      },
    ];

    this.validateBalance(entries);

    const voucherNo = await this.generateJournalNo();

    const journal = await this.prisma.$transaction(async (tx) => {
      return tx.journal.create({
        data: {
          voucherNo,
          voucherType: 'PAYMENT',
          journalDate: new Date(),
          clientId: supplierId,
          clientName: supplierName,
          description: description || `지급 - ${supplierName} / ${paymentDesc}`,
          totalAmount: amount,
          sourceType: 'PAYMENT',
          sourceId: purchaseLedgerId,
          createdBy: 'system',
          entries: {
            create: entries.map((entry) => ({
              accountId: entry.accountId,
              transactionType: entry.transactionType,
              amount: entry.amount,
              description: entry.description,
              sortOrder: entry.sortOrder,
            })),
          },
        },
        include: {
          entries: {
            include: { account: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    this.logger.log(
      `지급 자동분개 생성: ${voucherNo} (매입원장: ${purchaseLedgerId}, 결제수단: ${paymentMethod}, 금액: ${amount})`,
    );

    return journal;
  }

  // ===== 취소(반대) 전표 자동 생성 =====
  // 원 전표의 차변/대변을 반대로 기입하여 원래 분개를 무효화
  async createCancellationJournal(params: {
    originalJournalId: string;
    reason?: string;
  }) {
    const { originalJournalId, reason } = params;

    const originalJournal = await this.prisma.journal.findUnique({
      where: { id: originalJournalId },
      include: {
        entries: {
          include: { account: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!originalJournal) {
      throw new NotFoundException(`원 전표를 찾을 수 없습니다: ${originalJournalId}`);
    }

    // 반대 분개 항목 생성 (DEBIT ↔ CREDIT)
    const reversedEntries: JournalEntryInput[] = originalJournal.entries.map(
      (entry, index) => ({
        accountId: entry.accountId,
        transactionType:
          entry.transactionType === 'DEBIT'
            ? ('CREDIT' as const)
            : ('DEBIT' as const),
        amount: Number(entry.amount),
        description: `[취소] ${entry.description || ''}`,
        sortOrder: index,
      }),
    );

    this.validateBalance(reversedEntries);

    const voucherNo = await this.generateJournalNo();

    const journal = await this.prisma.$transaction(async (tx) => {
      return tx.journal.create({
        data: {
          voucherNo,
          voucherType: 'TRANSFER',
          journalDate: new Date(),
          clientId: originalJournal.clientId,
          clientName: originalJournal.clientName,
          description: `${reason || '취소전표'} - ${originalJournal.clientName || ''} (원전표: ${originalJournal.voucherNo})`,
          totalAmount: Number(originalJournal.totalAmount),
          orderId: originalJournal.orderId,
          orderNumber: originalJournal.orderNumber,
          sourceType: 'CANCELLATION',
          sourceId: originalJournal.sourceId,
          createdBy: 'system',
          entries: {
            create: reversedEntries.map((entry) => ({
              accountId: entry.accountId,
              transactionType: entry.transactionType,
              amount: entry.amount,
              description: entry.description,
              sortOrder: entry.sortOrder,
            })),
          },
        },
        include: {
          entries: {
            include: { account: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    this.logger.log(
      `취소전표 생성: ${voucherNo} (원전표: ${originalJournal.voucherNo}, 금액: ${originalJournal.totalAmount})`,
    );

    return journal;
  }

  // ===== 차대 균형 검증 =====
  // 차변 합계와 대변 합계가 반드시 일치해야 함
  validateBalance(entries: JournalEntryInput[]): void {
    const debitTotal = entries
      .filter((e) => e.transactionType === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);

    const creditTotal = entries
      .filter((e) => e.transactionType === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0);

    // 소수점 오차 허용 (Decimal 변환 시 발생 가능)
    const diff = Math.abs(debitTotal - creditTotal);
    if (diff > 0.01) {
      throw new BadRequestException(
        `차대 균형 불일치: 차변(${debitTotal.toLocaleString()}) !== 대변(${creditTotal.toLocaleString()}), 차이: ${diff}`,
      );
    }
  }

  // ===== 계정과목 코드로 조회 =====
  async findAccountByCode(code: string) {
    const account = await this.prisma.account.findUnique({
      where: { code },
      select: { id: true, code: true, name: true, type: true, isActive: true },
    });

    if (!account) {
      throw new NotFoundException(
        `계정과목을 찾을 수 없습니다: 코드 '${code}'`,
      );
    }

    if (!account.isActive) {
      throw new BadRequestException(
        `비활성 계정과목은 사용할 수 없습니다: ${account.code} ${account.name}`,
      );
    }

    return account;
  }

  // ===== 원천 기준 전표 조회 =====
  // sourceType + sourceId 조합으로 연결된 전표를 조회
  async getJournalsBySource(sourceType: string, sourceId: string) {
    return this.prisma.journal.findMany({
      where: { sourceType, sourceId },
      include: {
        entries: {
          include: { account: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
