import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ===== 거래처별 미수금 명세서 =====
  async getReceivableStatement(clientId: string, query: { startDate?: string; endDate?: string }) {
    // 1. 거래처 정보
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        clientCode: true,
        clientName: true,
        businessNumber: true,
        representative: true,
        phone: true,
        mobile: true,
        email: true,
        postalCode: true,
        address: true,
        addressDetail: true,
        creditEnabled: true,
        creditPeriodDays: true,
        creditPaymentDay: true,
        paymentTerms: true,
        creditGrade: true,
      },
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다.');
    }

    // 2. 기간 필터
    const where: any = {
      clientId,
      salesStatus: { not: 'CANCELLED' },
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

    // 3. 매출원장 목록 (수금 이력 포함)
    const ledgers = await this.prisma.salesLedger.findMany({
      where,
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        receipts: { orderBy: { receiptDate: 'desc' } },
      },
      orderBy: { ledgerDate: 'asc' },
    });

    // 4. 집계 데이터
    const summary = {
      totalSales: ledgers.reduce((sum, l) => sum + Number(l.totalAmount), 0),
      totalReceived: ledgers.reduce((sum, l) => sum + Number(l.receivedAmount), 0),
      totalOutstanding: ledgers.reduce((sum, l) => sum + Number(l.outstandingAmount), 0),
      ledgerCount: ledgers.length,
      paidCount: ledgers.filter(l => l.paymentStatus === 'paid').length,
      unpaidCount: ledgers.filter(l => l.paymentStatus === 'unpaid').length,
      partialCount: ledgers.filter(l => l.paymentStatus === 'partial').length,
      overdueCount: ledgers.filter(l => l.paymentStatus === 'overdue').length,
    };

    // 5. 수금 이력 (모든 수금 내역)
    const allReceipts = ledgers.flatMap(l =>
      l.receipts.map(r => ({
        ...r,
        ledgerNumber: l.ledgerNumber,
        orderNumber: l.orderNumber,
      }))
    );

    return {
      client,
      summary,
      ledgers,
      receipts: allReceipts.sort(
        (a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime()
      ),
    };
  }
}
