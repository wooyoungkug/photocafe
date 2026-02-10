import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { JournalEngineService } from './journal-engine.service';

// ===== 매입원장 생성 DTO =====

interface CreatePurchaseLedgerItemDto {
  itemName: string;
  specification?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  purchaseType?: string;
  accountCode?: string;
  sortOrder?: number;
  remark?: string;
}

interface CreatePurchaseLedgerDto {
  supplierId: string;
  purchaseType: string;
  taxType?: string;
  accountCode?: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  dueDate?: string;
  description?: string;
  items: CreatePurchaseLedgerItemDto[];
}

// ===== 지급 등록 DTO =====

interface CreatePurchasePaymentDto {
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  bankName?: string;
  accountNumber?: string;
  note?: string;
}

// ===== 매입원장 조회 DTO =====

interface PurchaseLedgerQueryDto {
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  purchaseType?: string;
  paymentStatus?: string;
  purchaseStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ===== 매입처별 집계 조회 DTO =====

interface SupplierSummaryQueryDto {
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class PurchaseLedgerService {
  constructor(
    private prisma: PrismaService,
    private journalEngine: JournalEngineService,
  ) {}

  // ===== 매입전표번호 생성 =====
  // 형식: PL-YYYYMMDD-NNN (일별 순번)
  async generateLedgerNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PL-${dateStr}-`;

    const lastLedger = await this.prisma.purchaseLedger.findFirst({
      where: { ledgerNumber: { startsWith: prefix } },
      orderBy: { ledgerNumber: 'desc' },
    });

    let sequence = 1;
    if (lastLedger) {
      const lastSeq = parseInt(lastLedger.ledgerNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  }

  // ===== 지급번호 생성 =====
  // 형식: PP-YYYYMMDD-NNN (일별 순번)
  async generatePaymentNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PP-${dateStr}-`;

    const lastPayment = await this.prisma.purchasePayment.findFirst({
      where: { paymentNumber: { startsWith: prefix } },
      orderBy: { paymentNumber: 'desc' },
    });

    let sequence = 1;
    if (lastPayment) {
      const lastSeq = parseInt(lastPayment.paymentNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  }

  // ===== 매입원장 등록 =====
  async create(dto: CreatePurchaseLedgerDto, createdBy: string) {
    // 매입처(거래처) 정보 조회
    const supplier = await this.prisma.client.findUnique({
      where: { id: dto.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException('매입처를 찾을 수 없습니다.');
    }

    const ledgerNumber = await this.generateLedgerNumber();

    const accountCode = dto.accountCode || '120';
    const taxType = dto.taxType || 'TAXABLE';
    const paymentMethod = dto.paymentMethod || 'postpaid';

    // 선불/카드 결제인 경우 즉시 지급 완료 처리
    const isPrepaid = paymentMethod === 'prepaid' || paymentMethod === 'card';
    const paidAmount = isPrepaid ? dto.totalAmount : 0;
    const outstandingAmount = isPrepaid ? 0 : dto.totalAmount;
    const paymentStatus = isPrepaid ? 'paid' : 'unpaid';

    // 결제기한 산정
    let dueDate: Date | null = null;
    if (dto.dueDate) {
      dueDate = new Date(dto.dueDate);
    } else if (supplier.creditEnabled && supplier.creditPeriodDays) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + supplier.creditPeriodDays);
    } else if (supplier.creditEnabled && supplier.creditPaymentDay) {
      dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(supplier.creditPaymentDay);
    }

    // 매입원장 라인아이템 생성 데이터
    const ledgerItems = dto.items.map((item, index) => ({
      itemName: item.itemName,
      specification: item.specification,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      supplyAmount: item.supplyAmount,
      vatAmount: item.vatAmount,
      totalAmount: item.totalAmount,
      purchaseType: (item.purchaseType || dto.purchaseType) as any,
      accountCode: item.accountCode || accountCode,
      sortOrder: item.sortOrder ?? index,
      remark: item.remark,
    }));

    const purchaseLedger = await this.prisma.purchaseLedger.create({
      data: {
        ledgerNumber,
        ledgerDate: new Date(),
        supplierId: supplier.id,
        supplierName: supplier.clientName,
        supplierBizNo: supplier.businessNumber,
        purchaseType: dto.purchaseType as any,
        taxType: taxType as any,
        accountCode,
        supplyAmount: dto.supplyAmount,
        vatAmount: dto.vatAmount,
        totalAmount: dto.totalAmount,
        paidAmount,
        outstandingAmount,
        paymentMethod,
        paymentStatus,
        dueDate,
        purchaseStatus: 'REGISTERED',
        description: dto.description,
        createdBy,
        items: {
          create: ledgerItems,
        },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        supplier: true,
      },
    });

    // 자동분개 생성 (실패해도 매입원장 생성은 유지)
    try {
      await this.journalEngine.createPurchaseJournal({
        purchaseLedgerId: purchaseLedger.id,
        supplierId: supplier.id,
        supplierName: supplier.clientName,
        supplyAmount: Number(dto.supplyAmount),
        vatAmount: Number(dto.vatAmount),
        totalAmount: Number(dto.totalAmount),
        materialAccountCode: accountCode,
        description: `${ledgerNumber} 매입 - ${supplier.clientName}`,
      });
    } catch (err) {
      console.error('매입 자동분개 생성 실패:', err);
    }

    return purchaseLedger;
  }

  // ===== 매입원장 목록 조회 =====
  async findAll(query: PurchaseLedgerQueryDto) {
    const {
      startDate,
      endDate,
      supplierId,
      purchaseType,
      paymentStatus,
      purchaseStatus,
      search,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.PurchaseLedgerWhereInput = {};

    // 기간 필터
    if (startDate || endDate) {
      where.ledgerDate = {};
      if (startDate) where.ledgerDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.ledgerDate.lte = end;
      }
    }

    if (supplierId) where.supplierId = supplierId;
    if (purchaseType) where.purchaseType = purchaseType as any;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (purchaseStatus) where.purchaseStatus = purchaseStatus as any;

    // 검색 (매입처명, 전표번호, 적요)
    if (search) {
      where.OR = [
        { supplierName: { contains: search, mode: 'insensitive' } },
        { ledgerNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseLedger.findMany({
        where,
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          payments: { orderBy: { paymentDate: 'desc' } },
          supplier: {
            select: { id: true, clientCode: true, clientName: true, businessNumber: true },
          },
        },
        orderBy: { ledgerDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseLedger.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ===== 매입원장 상세 조회 =====
  async findById(id: string) {
    const ledger = await this.prisma.purchaseLedger.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
        supplier: {
          select: {
            id: true, clientCode: true, clientName: true,
            businessNumber: true, phone: true, email: true,
            address: true, addressDetail: true,
          },
        },
      },
    });

    if (!ledger) {
      throw new NotFoundException('매입원장을 찾을 수 없습니다.');
    }

    return ledger;
  }

  // ===== 지급 처리 =====
  async addPayment(purchaseLedgerId: string, dto: CreatePurchasePaymentDto, createdBy: string) {
    const ledger = await this.findById(purchaseLedgerId);

    const currentOutstanding = Number(ledger.outstandingAmount);
    if (dto.amount > currentOutstanding) {
      throw new BadRequestException(
        `지급액(${dto.amount})이 미지급 잔액(${currentOutstanding})을 초과합니다.`,
      );
    }

    if (ledger.purchaseStatus === 'CANCELLED') {
      throw new BadRequestException('취소된 매입원장에는 지급할 수 없습니다.');
    }

    const paymentNumber = await this.generatePaymentNumber();
    const newPaid = Number(ledger.paidAmount) + dto.amount;
    const newOutstanding = Number(ledger.totalAmount) - newPaid;
    const newPaymentStatus = newOutstanding <= 0 ? 'paid' : 'partial';

    const [payment] = await this.prisma.$transaction([
      this.prisma.purchasePayment.create({
        data: {
          purchaseLedgerId,
          paymentNumber,
          paymentDate: new Date(dto.paymentDate),
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          note: dto.note,
          createdBy,
        },
      }),
      this.prisma.purchaseLedger.update({
        where: { id: purchaseLedgerId },
        data: {
          paidAmount: newPaid,
          outstandingAmount: newOutstanding,
          paymentStatus: newPaymentStatus,
        },
      }),
    ]);

    // 지급 자동분개 생성 (실패해도 지급 처리는 유지)
    try {
      const journal = await this.journalEngine.createPaymentJournal({
        purchaseLedgerId,
        supplierId: ledger.supplierId,
        supplierName: ledger.supplierName,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        bankName: dto.bankName,
        description: `${ledger.ledgerNumber} 지급 (${dto.paymentMethod})`,
      });

      // 지급 레코드에 전표 ID 연결
      await this.prisma.purchasePayment.update({
        where: { id: payment.id },
        data: { journalId: journal.id },
      });
    } catch (err) {
      console.error('지급분개 생성 실패:', err);
    }

    return this.findById(purchaseLedgerId);
  }

  // ===== 매입 확정 (검수 완료) =====
  async confirmPurchase(id: string, confirmedBy: string) {
    const ledger = await this.findById(id);

    if (ledger.purchaseStatus === 'CONFIRMED') {
      throw new BadRequestException('이미 매입 확정된 원장입니다.');
    }
    if (ledger.purchaseStatus === 'CANCELLED') {
      throw new BadRequestException('취소된 원장은 확정할 수 없습니다.');
    }

    return this.prisma.purchaseLedger.update({
      where: { id },
      data: {
        purchaseStatus: 'CONFIRMED',
        confirmDate: new Date(),
        confirmedBy,
        confirmedAt: new Date(),
      },
      include: { items: true, payments: true },
    });
  }

  // ===== 매입 취소 =====
  async cancelPurchase(id: string) {
    const ledger = await this.findById(id);

    if (Number(ledger.paidAmount) > 0) {
      throw new BadRequestException(
        '지급 이력이 있는 매입은 취소할 수 없습니다. 먼저 지급을 환불 처리하세요.',
      );
    }

    if (ledger.purchaseStatus === 'CANCELLED') {
      throw new BadRequestException('이미 취소된 매입원장입니다.');
    }

    return this.prisma.purchaseLedger.update({
      where: { id },
      data: {
        purchaseStatus: 'CANCELLED',
        paymentStatus: 'unpaid',
        outstandingAmount: 0,
      },
      include: { items: true },
    });
  }

  // ===== 매입원장 요약 (대시보드) =====
  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 당월 매입 합계
    const monthlyPurchases = await this.prisma.purchaseLedger.aggregate({
      where: {
        ledgerDate: { gte: startOfMonth },
        purchaseStatus: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true, paidAmount: true },
      _count: { id: true },
    });

    // 총 미지급 잔액
    const totalOutstanding = await this.prisma.purchaseLedger.aggregate({
      where: {
        paymentStatus: { in: ['unpaid', 'partial', 'overdue'] },
        purchaseStatus: { not: 'CANCELLED' },
      },
      _sum: { outstandingAmount: true },
    });

    // 연체 미지급 (결제기한 초과)
    const overdueAmount = await this.prisma.purchaseLedger.aggregate({
      where: {
        paymentStatus: { in: ['unpaid', 'partial'] },
        dueDate: { lt: now },
        purchaseStatus: { not: 'CANCELLED' },
      },
      _sum: { outstandingAmount: true },
    });

    // 미지급 매입처 수
    const suppliersWithOutstanding = await this.prisma.purchaseLedger.findMany({
      where: {
        paymentStatus: { in: ['unpaid', 'partial', 'overdue'] },
        purchaseStatus: { not: 'CANCELLED' },
      },
      select: { supplierId: true },
      distinct: ['supplierId'],
    });

    return {
      totalPurchases: Number(monthlyPurchases._sum.totalAmount || 0),
      totalPaid: Number(monthlyPurchases._sum.paidAmount || 0),
      totalOutstanding: Number(totalOutstanding._sum.outstandingAmount || 0),
      totalOverdue: Number(overdueAmount._sum.outstandingAmount || 0),
      ledgerCount: monthlyPurchases._count.id,
      supplierCount: suppliersWithOutstanding.length,
    };
  }

  // ===== 매입처별 매입 집계 =====
  async getSupplierSummary(query: SupplierSummaryQueryDto) {
    const where: Prisma.PurchaseLedgerWhereInput = {
      purchaseStatus: { not: 'CANCELLED' },
    };

    if (query.startDate || query.endDate) {
      where.ledgerDate = {};
      if (query.startDate) where.ledgerDate.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.ledgerDate.lte = end;
      }
    }

    const ledgers = await this.prisma.purchaseLedger.findMany({
      where,
      select: {
        supplierId: true,
        supplierName: true,
        totalAmount: true,
        paidAmount: true,
        outstandingAmount: true,
        ledgerDate: true,
        supplier: {
          select: { clientCode: true },
        },
      },
      orderBy: { ledgerDate: 'desc' },
    });

    // 매입처별 집계
    const supplierMap = new Map<string, {
      supplierId: string;
      supplierName: string;
      supplierCode: string;
      totalPurchases: number;
      totalPaid: number;
      outstanding: number;
      ledgerCount: number;
      lastPurchaseDate: string;
    }>();

    for (const l of ledgers) {
      const existing = supplierMap.get(l.supplierId);
      if (existing) {
        existing.totalPurchases += Number(l.totalAmount);
        existing.totalPaid += Number(l.paidAmount);
        existing.outstanding += Number(l.outstandingAmount);
        existing.ledgerCount += 1;
      } else {
        supplierMap.set(l.supplierId, {
          supplierId: l.supplierId,
          supplierName: l.supplierName,
          supplierCode: l.supplier.clientCode,
          totalPurchases: Number(l.totalAmount),
          totalPaid: Number(l.paidAmount),
          outstanding: Number(l.outstandingAmount),
          ledgerCount: 1,
          lastPurchaseDate: l.ledgerDate.toISOString(),
        });
      }
    }

    return Array.from(supplierMap.values()).sort((a, b) => b.totalPurchases - a.totalPurchases);
  }

  // ===== 연체 처리 (배치/수동) =====
  async updateOverdueStatus() {
    const now = new Date();
    const result = await this.prisma.purchaseLedger.updateMany({
      where: {
        paymentStatus: { in: ['unpaid', 'partial'] },
        dueDate: { lt: now },
        purchaseStatus: { not: 'CANCELLED' },
      },
      data: { paymentStatus: 'overdue' },
    });
    return { updatedCount: result.count };
  }
}
