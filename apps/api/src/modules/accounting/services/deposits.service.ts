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
      clientId,
      orderedAt: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
      // 결제 완료된 주문만 조회 (입금 내역으로 간주)
      paymentStatus: {
        in: ['paid', 'partial'],
      },
    };

    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }

    // 주문 정보 조회 (결제된 주문 = 입금 내역)
    const orders = await this.prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        finalAmount: true,
        paymentMethod: true,
        paymentStatus: true,
        customerMemo: true,
        orderedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        orderedAt: 'desc',
      },
    });

    // DepositResponseDto로 변환
    const data: DepositResponseDto[] = orders.map((order) => {
      return {
        id: order.id,
        depositDate: order.orderedAt.toISOString(),
        orderNumber: order.orderNumber,
        orderId: order.id,
        orderAmount: parseFloat(order.totalAmount.toString()),
        depositAmount: parseFloat(order.finalAmount.toString()),
        paymentMethod: order.paymentMethod || 'other',
        memo: order.customerMemo || undefined,
        confirmedAt: order.updatedAt.toISOString(),
        confirmedBy: undefined, // 주문 정보에는 확인자 정보가 없음
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
