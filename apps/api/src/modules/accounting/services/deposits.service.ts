import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  DepositQueryDto,
  DepositResponseDto,
  DepositsListResponseDto,
} from '../dto/deposits.dto';

@Injectable()
export class DepositsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 고객별 입금내역 조회
   */
  async findDepositsByClient(
    query: DepositQueryDto,
  ): Promise<DepositsListResponseDto> {
    const { clientId, startDate, endDate, paymentMethod } = query;

    // WHERE 조건 구성
    const whereClause: any = {
      receivable: {
        clientId,
      },
      paymentDate: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
    };

    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }

    // 입금내역 조회 (ReceivablePayment + Receivable 조인)
    const payments = await this.prisma.receivablePayment.findMany({
      where: whereClause,
      include: {
        receivable: true,
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    // 주문 정보를 조회하기 위해 orderId 목록 추출
    const orderIds = payments
      .map((p) => p.receivable.orderId)
      .filter((id): id is string => !!id);

    // 주문 정보 조회
    const orders = await this.prisma.order.findMany({
      where: {
        id: {
          in: orderIds,
        },
      },
      select: {
        id: true,
        orderNo: true,
        total: true,
      },
    });

    // orderId를 키로 하는 Map 생성
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    // DepositResponseDto로 변환
    const data: DepositResponseDto[] = payments.map((payment) => {
      const order = payment.receivable.orderId
        ? orderMap.get(payment.receivable.orderId)
        : null;

      return {
        id: payment.id,
        depositDate: payment.paymentDate.toISOString(),
        orderNumber: order?.orderNo || payment.receivable.orderNumber || '-',
        orderId: payment.receivable.orderId || '',
        orderAmount: order?.total
          ? parseFloat(order.total.toString())
          : parseFloat(payment.receivable.originalAmount.toString()),
        depositAmount: parseFloat(payment.amount.toString()),
        paymentMethod: payment.paymentMethod || 'other',
        memo: payment.description || undefined,
        confirmedAt: payment.createdAt.toISOString(),
        confirmedBy: payment.createdBy || undefined,
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
}
