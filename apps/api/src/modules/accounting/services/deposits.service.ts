import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  DepositQueryDto,
  DepositResponseDto,
  DepositsListResponseDto,
  CreateDepositDto,
  UpdateDepositDto,
  DailySummaryQueryDto,
  DailySummaryResponseDto,
  MonthlySummaryQueryDto,
  MonthlySummaryResponseDto,
  DailyDepositSummaryDto,
  MonthlyDepositSummaryDto,
} from '../dto/deposits.dto';

@Injectable()
export class DepositsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 고객별 입금내역 조회 (SalesReceipt 기반)
   * clientId optional로 변경 - 없으면 전체 조회
   */
  async findDepositsByClient(
    query: DepositQueryDto,
  ): Promise<DepositsListResponseDto> {
    const { clientId, startDate, endDate, paymentMethod } = query;

    // WHERE 조건 구성 (SalesReceipt 기반) - 날짜를 로컬 자정 기준으로 설정하여 timezone 이슈 방지
    const startDateTime = new Date(startDate + 'T00:00:00');
    const endDateTime = new Date(endDate + 'T23:59:59.999');
    const whereClause: any = {
      receiptDate: {
        gte: startDateTime,
        lte: endDateTime,
      },
    };

    // clientId가 있으면 필터링, 없으면 전체 조회
    if (clientId) {
      whereClause.salesLedger = { clientId };
    }

    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }

    // SalesReceipt 조회 (입금 기록 테이블)
    const receipts = await this.prisma.salesReceipt.findMany({
      where: whereClause,
      include: {
        salesLedger: {
          select: {
            orderId: true,
            orderNumber: true,
            totalAmount: true,
            receivedAmount: true,
            outstandingAmount: true,
            paymentStatus: true,
            clientId: true,
            clientName: true,
          },
        },
      },
      orderBy: {
        receiptDate: 'desc',
      },
    });

    // DepositResponseDto로 변환
    const data: DepositResponseDto[] = receipts.map((receipt) => {
      return {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        receiptDate: receipt.receiptDate.toISOString(),
        orderNumber: receipt.salesLedger.orderNumber,
        orderId: receipt.salesLedger.orderId,
        clientId: receipt.salesLedger.clientId,
        clientName: receipt.salesLedger.clientName,
        orderAmount: parseFloat(receipt.salesLedger.totalAmount.toString()),
        depositAmount: parseFloat(receipt.amount.toString()),
        receivedAmount: parseFloat(receipt.salesLedger.receivedAmount.toString()),
        outstandingAmount: parseFloat(receipt.salesLedger.outstandingAmount.toString()),
        paymentStatus: receipt.salesLedger.paymentStatus,
        paymentMethod: receipt.paymentMethod,
        bankName: receipt.bankName || undefined,
        depositorName: receipt.depositorName || undefined,
        note: receipt.note || undefined,
        createdAt: receipt.createdAt.toISOString(),
        createdBy: receipt.createdBy,
      };
    });

    // 요약 정보 계산
    const summary = {
      totalCount: data.length,
      totalAmount: data.reduce((sum, d) => sum + d.depositAmount, 0),
      totalOrderAmount: data.reduce((sum, d) => sum + d.orderAmount, 0),
    };

    return {
      data,
      summary,
    };
  }

  /**
   * 일자별 합계 조회 (거래처별 일자별 집계)
   */
  async findDailySummary(
    query: DailySummaryQueryDto,
  ): Promise<DailySummaryResponseDto> {
    const { startDate, endDate, clientId, paymentMethod } = query;

    // Raw SQL 집계 쿼리 (날짜 문자열을 직접 캐스팅하여 timezone 이슈 방지)
    const rawSummary = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE(sr."receiptDate") as date,
        sl."clientId",
        sl."clientName",
        COUNT(sr.id)::int as count,
        SUM(sr.amount)::decimal as "totalDepositAmount",
        SUM(sl."totalAmount")::decimal as "totalOrderAmount"
      FROM sales_receipts sr
      INNER JOIN sales_ledgers sl ON sr."salesLedgerId" = sl.id
      WHERE sr."receiptDate" >= ${startDate}::date
        AND sr."receiptDate" < (${endDate}::date + interval '1 day')
        ${clientId ? Prisma.sql`AND sl."clientId" = ${clientId}` : Prisma.empty}
        ${paymentMethod ? Prisma.sql`AND sr."paymentMethod" = ${paymentMethod}` : Prisma.empty}
      GROUP BY DATE(sr."receiptDate"), sl."clientId", sl."clientName"
      ORDER BY date DESC, sl."clientName" ASC
    `;

    // DTO 변환
    const data: DailyDepositSummaryDto[] = rawSummary.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      clientId: row.clientId,
      clientName: row.clientName,
      count: row.count,
      totalDepositAmount: parseFloat(row.totalDepositAmount),
      totalOrderAmount: parseFloat(row.totalOrderAmount),
    }));

    // 전체 요약 계산
    const uniqueClients = new Set(data.map((d) => d.clientId)).size;
    const uniqueDays = new Set(data.map((d) => d.date)).size;
    const totalCount = data.reduce((sum, d) => sum + d.count, 0);
    const totalDepositAmount = data.reduce((sum, d) => sum + d.totalDepositAmount, 0);
    const totalOrderAmount = data.reduce((sum, d) => sum + d.totalOrderAmount, 0);
    const averagePerDay = uniqueDays > 0 ? totalDepositAmount / uniqueDays : 0;

    return {
      data,
      summary: {
        totalClients: uniqueClients,
        totalDays: uniqueDays,
        totalCount,
        totalDepositAmount,
        totalOrderAmount,
        averagePerDay,
      },
    };
  }

  /**
   * 월별 합계 조회 (거래처별 월별 집계)
   */
  async findMonthlySummary(
    query: MonthlySummaryQueryDto,
  ): Promise<MonthlySummaryResponseDto> {
    const { year, clientId } = query;

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Raw SQL 집계 쿼리 (날짜 문자열을 직접 캐스팅하여 timezone 이슈 방지)
    const rawSummary = await this.prisma.$queryRaw<any[]>`
      SELECT
        TO_CHAR(sr."receiptDate", 'YYYY-MM') as month,
        sl."clientId",
        sl."clientName",
        COUNT(sr.id)::int as count,
        SUM(sr.amount)::decimal as "totalDepositAmount",
        SUM(sl."totalAmount")::decimal as "totalOrderAmount"
      FROM sales_receipts sr
      INNER JOIN sales_ledgers sl ON sr."salesLedgerId" = sl.id
      WHERE sr."receiptDate" >= ${startDate}::date
        AND sr."receiptDate" < (${endDate}::date + interval '1 day')
        ${clientId ? Prisma.sql`AND sl."clientId" = ${clientId}` : Prisma.empty}
      GROUP BY TO_CHAR(sr."receiptDate", 'YYYY-MM'), sl."clientId", sl."clientName"
      ORDER BY month DESC, sl."clientName" ASC
    `;

    // DTO 변환
    const data: MonthlyDepositSummaryDto[] = rawSummary.map((row) => ({
      month: row.month,
      clientId: row.clientId,
      clientName: row.clientName,
      count: row.count,
      totalDepositAmount: parseFloat(row.totalDepositAmount),
      totalOrderAmount: parseFloat(row.totalOrderAmount),
    }));

    // 전체 요약 계산
    const uniqueClients = new Set(data.map((d) => d.clientId)).size;
    const uniqueMonths = new Set(data.map((d) => d.month)).size;
    const totalCount = data.reduce((sum, d) => sum + d.count, 0);
    const totalDepositAmount = data.reduce((sum, d) => sum + d.totalDepositAmount, 0);
    const totalOrderAmount = data.reduce((sum, d) => sum + d.totalOrderAmount, 0);

    return {
      data,
      summary: {
        totalClients: uniqueClients,
        totalMonths: uniqueMonths,
        totalCount,
        totalDepositAmount,
        totalOrderAmount,
      },
    };
  }

  /**
   * 입금 상세 조회
   */
  async findOne(id: string): Promise<DepositResponseDto> {
    const receipt = await this.prisma.salesReceipt.findUnique({
      where: { id },
      include: {
        salesLedger: {
          select: {
            orderId: true,
            orderNumber: true,
            totalAmount: true,
            receivedAmount: true,
            outstandingAmount: true,
            paymentStatus: true,
            clientId: true,
            clientName: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('입금 내역을 찾을 수 없습니다');
    }

    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      receiptDate: receipt.receiptDate.toISOString(),
      orderNumber: receipt.salesLedger.orderNumber,
      orderId: receipt.salesLedger.orderId,
      clientId: receipt.salesLedger.clientId,
      clientName: receipt.salesLedger.clientName,
      orderAmount: parseFloat(receipt.salesLedger.totalAmount.toString()),
      depositAmount: parseFloat(receipt.amount.toString()),
      receivedAmount: parseFloat(receipt.salesLedger.receivedAmount.toString()),
      outstandingAmount: parseFloat(receipt.salesLedger.outstandingAmount.toString()),
      paymentStatus: receipt.salesLedger.paymentStatus,
      paymentMethod: receipt.paymentMethod,
      bankName: receipt.bankName || undefined,
      depositorName: receipt.depositorName || undefined,
      note: receipt.note || undefined,
      createdAt: receipt.createdAt.toISOString(),
      createdBy: receipt.createdBy,
    };
  }

  /**
   * 입금 등록
   */
  async createDeposit(dto: CreateDepositDto, userId: string) {
    // 1. SalesLedger 조회 및 검증
    const ledger = await this.prisma.salesLedger.findUnique({
      where: { id: dto.salesLedgerId },
      include: {
        order: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!ledger) {
      throw new NotFoundException('매출원장을 찾을 수 없습니다');
    }

    // 2. 입금액 검증 (미수금 초과 여부)
    if (dto.amount > Number(ledger.outstandingAmount)) {
      throw new BadRequestException('입금액이 미수금을 초과합니다');
    }

    // 3. 트랜잭션 실행
    return await this.prisma.$transaction(async (tx) => {
      // 3-1. 수금번호 생성
      const receiptNumber = await this.generateReceiptNumber();

      // 3-2. SalesReceipt 생성
      const receipt = await tx.salesReceipt.create({
        data: {
          salesLedgerId: dto.salesLedgerId,
          receiptNumber,
          receiptDate: new Date(dto.receiptDate),
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          bankName: dto.bankName,
          depositorName: dto.depositorName,
          note: dto.note,
          createdBy: userId,
        },
      });

      // 3-3. SalesLedger 금액 업데이트
      const newReceived = Number(ledger.receivedAmount) + dto.amount;
      const newOutstanding = Number(ledger.totalAmount) - newReceived;
      const newStatus =
        newOutstanding <= 0 ? 'paid' : newReceived > 0 ? 'partial' : 'unpaid';

      await tx.salesLedger.update({
        where: { id: dto.salesLedgerId },
        data: {
          receivedAmount: newReceived,
          outstandingAmount: newOutstanding,
          paymentStatus: newStatus,
        },
      });

      // 3-4. Order.paymentStatus 동기화
      await tx.order.update({
        where: { id: ledger.order.id },
        data: { paymentStatus: newStatus },
      });

      return receipt;
    });
  }

  /**
   * 입금 수정
   */
  async updateDeposit(id: string, dto: UpdateDepositDto, userId: string) {
    // 1. 기존 입금 조회
    const receipt = await this.prisma.salesReceipt.findUnique({
      where: { id },
      include: {
        salesLedger: {
          include: {
            order: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('입금 내역을 찾을 수 없습니다');
    }

    // 2. 트랜잭션 실행
    return await this.prisma.$transaction(async (tx) => {
      const ledger = receipt.salesLedger;

      // 2-1. 기존 입금액 롤백
      const receivedWithoutThis =
        Number(ledger.receivedAmount) - Number(receipt.amount);

      // 2-2. 새 입금액 검증
      const newAmount = dto.amount !== undefined ? dto.amount : Number(receipt.amount);
      const newReceived = receivedWithoutThis + newAmount;

      if (newReceived > Number(ledger.totalAmount)) {
        throw new BadRequestException('입금액이 총액을 초과합니다');
      }

      // 2-3. SalesReceipt 수정
      const updated = await tx.salesReceipt.update({
        where: { id },
        data: {
          ...(dto.receiptDate && { receiptDate: new Date(dto.receiptDate) }),
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
          ...(dto.bankName !== undefined && { bankName: dto.bankName }),
          ...(dto.depositorName !== undefined && {
            depositorName: dto.depositorName,
          }),
          ...(dto.note !== undefined && { note: dto.note }),
        },
      });

      // 2-4. SalesLedger 재계산
      const newOutstanding = Number(ledger.totalAmount) - newReceived;
      const newStatus =
        newOutstanding <= 0 ? 'paid' : newReceived > 0 ? 'partial' : 'unpaid';

      await tx.salesLedger.update({
        where: { id: ledger.id },
        data: {
          receivedAmount: newReceived,
          outstandingAmount: newOutstanding,
          paymentStatus: newStatus,
        },
      });

      // 2-5. Order 업데이트
      await tx.order.update({
        where: { id: ledger.order.id },
        data: { paymentStatus: newStatus },
      });

      return updated;
    });
  }

  /**
   * 입금 삭제
   */
  async deleteDeposit(id: string): Promise<void> {
    // 1. 기존 입금 조회
    const receipt = await this.prisma.salesReceipt.findUnique({
      where: { id },
      include: {
        salesLedger: {
          include: {
            order: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('입금 내역을 찾을 수 없습니다');
    }

    // 2. 트랜잭션 실행
    await this.prisma.$transaction(async (tx) => {
      // 2-1. SalesReceipt 삭제
      await tx.salesReceipt.delete({ where: { id } });

      // 2-2. SalesLedger 금액 롤백
      const ledger = receipt.salesLedger;
      const newReceived = Number(ledger.receivedAmount) - Number(receipt.amount);
      const newOutstanding = Number(ledger.totalAmount) - newReceived;
      const newStatus =
        newReceived <= 0 ? 'unpaid' : newOutstanding <= 0 ? 'paid' : 'partial';

      await tx.salesLedger.update({
        where: { id: ledger.id },
        data: {
          receivedAmount: newReceived,
          outstandingAmount: newOutstanding,
          paymentStatus: newStatus,
        },
      });

      // 2-3. Order 업데이트
      await tx.order.update({
        where: { id: ledger.order.id },
        data: { paymentStatus: newStatus },
      });
    });
  }

  /**
   * 수금번호 생성 (SR-YYYYMMDD-NNN)
   */
  private async generateReceiptNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SR-${dateStr}-`;

    const lastReceipt = await this.prisma.salesReceipt.findFirst({
      where: { receiptNumber: { startsWith: prefix } },
      orderBy: { receiptNumber: 'desc' },
    });

    let sequence = 1;
    if (lastReceipt) {
      const lastSeq = parseInt(lastReceipt.receiptNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  }
}
