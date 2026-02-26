import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreateReturnRequestDto,
  ApproveReturnDto,
  RejectReturnDto,
  UpdateReturnTrackingDto,
  ExchangeShipDto,
  ReturnQueryDto,
  RETURN_STATUS,
  REASON_DEFAULT_FEE_CHARGED_TO,
} from '../dto';

@Injectable()
export class ReturnService {
  private readonly logger = new Logger(ReturnService.name);

  constructor(private prisma: PrismaService) {}

  // 반품번호 생성: RR-YYMMDD-NNN
  private async generateReturnNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, '');
    const prefix = `RR-${dateStr}`;

    const lastReturn = await this.prisma.returnRequest.findFirst({
      where: { returnNumber: { startsWith: prefix } },
      orderBy: { returnNumber: 'desc' },
    });

    let seq = 1;
    if (lastReturn) {
      const lastSeq = parseInt(lastReturn.returnNumber.split('-').pop() || '0', 10);
      seq = lastSeq + 1;
    }

    return `${prefix}-${String(seq).padStart(3, '0')}`;
  }

  // 반품/교환 신청
  async createReturnRequest(
    orderId: string,
    dto: CreateReturnRequestDto,
    requestedBy: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        shipping: true,
        client: true,
      },
    });

    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');

    // 배송완료 상태에서만 반품 가능
    if (order.status !== 'shipped') {
      throw new BadRequestException(
        '배송완료(거래완료) 상태의 주문만 반품/교환 신청할 수 있습니다.',
      );
    }

    // 이미 진행 중인 반품이 있는지 확인
    const existingReturn = await this.prisma.returnRequest.findFirst({
      where: {
        orderId,
        status: {
          notIn: [RETURN_STATUS.COMPLETED, RETURN_STATUS.REJECTED],
        },
      },
    });

    if (existingReturn) {
      throw new BadRequestException(
        `이미 진행 중인 반품요청이 있습니다. (${existingReturn.returnNumber})`,
      );
    }

    // 아이템 유효성 검증
    for (const item of dto.items) {
      const orderItem = order.items.find((oi) => oi.id === item.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(
          `주문 아이템을 찾을 수 없습니다: ${item.orderItemId}`,
        );
      }
      if (item.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `반품 수량(${item.quantity})이 주문 수량(${orderItem.quantity})을 초과합니다.`,
        );
      }
    }

    // 환불금액 산출 (부분반품 지원)
    let refundAmount = 0;
    for (const item of dto.items) {
      const orderItem = order.items.find((oi) => oi.id === item.orderItemId)!;
      const unitPrice = Number(orderItem.unitPrice);
      refundAmount += unitPrice * item.quantity;
    }

    // 배송비 부담자 기본값
    const defaultFeeChargedTo =
      REASON_DEFAULT_FEE_CHARGED_TO[dto.reason] || 'company';

    const returnNumber = await this.generateReturnNumber();

    const returnRequest = await this.prisma.$transaction(async (tx) => {
      const rr = await tx.returnRequest.create({
        data: {
          returnNumber,
          orderId,
          clientId: order.clientId,
          type: dto.type,
          status: RETURN_STATUS.REQUESTED,
          reason: dto.reason,
          reasonDetail: dto.reasonDetail,
          shippingFeeChargedTo: defaultFeeChargedTo,
          refundAmount,
          requestedBy,
          items: {
            create: dto.items.map((item) => ({
              orderItemId: item.orderItemId,
              quantity: item.quantity,
              reason: item.reason,
              condition: item.condition,
            })),
          },
        },
        include: {
          items: { include: { orderItem: true } },
        },
      });

      // 이력 기록
      await tx.returnHistory.create({
        data: {
          returnRequestId: rr.id,
          toStatus: RETURN_STATUS.REQUESTED,
          processType: 'status_change',
          note: `${dto.type === 'return' ? '반품' : '교환'} 신청`,
          processedBy: requestedBy,
        },
      });

      // 주문 공정이력에도 기록
      await tx.processHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: order.status,
          processType: 'return_requested',
          note: `${dto.type === 'return' ? '반품' : '교환'} 신청 (${returnNumber})`,
          processedBy: requestedBy,
        },
      });

      return rr;
    });

    this.logger.log(`반품 신청 완료: ${returnNumber} (주문: ${order.orderNumber})`);

    return {
      returnRequest,
      estimatedRefund: refundAmount,
      shippingFeeChargedTo: defaultFeeChargedTo,
    };
  }

  // 반품 승인
  async approve(id: string, dto: ApproveReturnDto, approvedBy: string) {
    const rr = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true, client: true },
    });

    if (!rr) throw new NotFoundException('반품요청을 찾을 수 없습니다.');
    if (rr.status !== RETURN_STATUS.REQUESTED) {
      throw new BadRequestException('신청 상태의 반품만 승인할 수 있습니다.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.returnRequest.update({
        where: { id },
        data: {
          status: RETURN_STATUS.APPROVED,
          shippingFeeChargedTo: dto.shippingFeeChargedTo || rr.shippingFeeChargedTo,
          returnShippingFee: dto.returnShippingFee,
          adminMemo: dto.adminMemo,
          approvedBy,
          approvedAt: new Date(),
        },
      });

      await tx.returnHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: RETURN_STATUS.REQUESTED,
          toStatus: RETURN_STATUS.APPROVED,
          processType: 'status_change',
          note: dto.adminMemo || '반품 승인',
          processedBy: approvedBy,
        },
      });

      return result;
    });

    this.logger.log(`반품 승인: ${rr.returnNumber}`);
    return updated;
  }

  // 반품 거절
  async reject(id: string, dto: RejectReturnDto, rejectedBy: string) {
    const rr = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!rr) throw new NotFoundException('반품요청을 찾을 수 없습니다.');
    if (rr.status !== RETURN_STATUS.REQUESTED) {
      throw new BadRequestException('신청 상태의 반품만 거절할 수 있습니다.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.returnRequest.update({
        where: { id },
        data: {
          status: RETURN_STATUS.REJECTED,
          rejectedReason: dto.rejectedReason,
          completedBy: rejectedBy,
          completedAt: new Date(),
        },
      });

      await tx.returnHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: RETURN_STATUS.REQUESTED,
          toStatus: RETURN_STATUS.REJECTED,
          processType: 'status_change',
          note: `거절 사유: ${dto.rejectedReason}`,
          processedBy: rejectedBy,
        },
      });

      return result;
    });

    this.logger.log(`반품 거절: ${rr.returnNumber}`);
    return updated;
  }

  // 반품 운송장 입력 (수동)
  async updateTracking(
    id: string,
    dto: UpdateReturnTrackingDto,
    updatedBy: string,
  ) {
    const rr = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!rr) throw new NotFoundException('반품요청을 찾을 수 없습니다.');
    if (
      rr.status !== RETURN_STATUS.APPROVED &&
      rr.status !== RETURN_STATUS.COLLECTING
    ) {
      throw new BadRequestException(
        '승인 또는 수거중 상태에서만 운송장을 입력할 수 있습니다.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.returnRequest.update({
        where: { id },
        data: {
          returnCourierCode: dto.courierCode,
          returnTrackingNumber: dto.trackingNumber,
          returnShippedAt: new Date(),
          status: RETURN_STATUS.COLLECTING,
        },
      });

      await tx.returnHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: rr.status,
          toStatus: RETURN_STATUS.COLLECTING,
          processType: 'tracking_update',
          note: `반품 운송장: ${dto.courierCode} / ${dto.trackingNumber}`,
          processedBy: updatedBy,
        },
      });

      return result;
    });

    this.logger.log(`반품 운송장 입력: ${rr.returnNumber} → ${dto.trackingNumber}`);
    return updated;
  }

  // 반품 완료 처리 (환불 + 배송비 청구)
  async complete(id: string, completedBy: string) {
    const rr = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { include: { client: true } },
        items: { include: { orderItem: true } },
      },
    });

    if (!rr) throw new NotFoundException('반품요청을 찾을 수 없습니다.');
    if (
      rr.status !== RETURN_STATUS.COLLECTED &&
      rr.status !== RETURN_STATUS.INSPECTING &&
      rr.status !== RETURN_STATUS.COLLECTING
    ) {
      throw new BadRequestException(
        '수거완료/검수중 상태에서만 반품을 완료할 수 있습니다.',
      );
    }

    const client = rr.order.client;
    const refundAmount = Number(rr.refundAmount || 0);
    const returnShippingFee = Number(rr.returnShippingFee || 0);

    // 고객 부담 배송비가 있으면 환불액에서 차감
    const isCustomerFee = rr.shippingFeeChargedTo === 'customer';
    const netRefund = isCustomerFee
      ? refundAmount - returnShippingFee
      : refundAmount;

    const updated = await this.prisma.$transaction(async (tx) => {
      // 반품 완료 처리
      const result = await tx.returnRequest.update({
        where: { id },
        data: {
          status: RETURN_STATUS.COMPLETED,
          refundAmount: netRefund,
          refundMethod: client.creditEnabled ? 'credit' : 'bank_transfer',
          refundedAt: new Date(),
          completedBy,
          completedAt: new Date(),
        },
      });

      // 환불: 크레딧(포인트)으로 적립
      if (netRefund > 0) {
        await tx.client.update({
          where: { id: client.id },
          data: {
            pendingAdjustmentAmount: { increment: netRefund },
            pendingAdjustmentReason: `반품 환불 (${rr.returnNumber})`,
            pendingAdjustmentAt: new Date(),
          },
        });
      }

      // 고객 부담 배송비 청구 (여신거래)
      if (isCustomerFee && returnShippingFee > 0 && client.creditEnabled) {
        await tx.client.update({
          where: { id: client.id },
          data: {
            pendingAdjustmentAmount: { decrement: returnShippingFee },
            pendingAdjustmentReason: `반품 배송비 (${rr.returnNumber})`,
            pendingAdjustmentAt: new Date(),
          },
        });
      }

      // 매출원장 상태 업데이트
      const salesLedger = await tx.salesLedger.findUnique({
        where: { orderId: rr.orderId },
      });
      if (salesLedger) {
        await tx.salesLedger.update({
          where: { id: salesLedger.id },
          data: { salesStatus: 'RETURNED' },
        });
      }

      // 이력 기록
      await tx.returnHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: rr.status,
          toStatus: RETURN_STATUS.COMPLETED,
          processType: 'refund_processed',
          note: `환불 ${netRefund.toLocaleString()}원 (${client.creditEnabled ? '여신적립' : '무통장입금'})`,
          processedBy: completedBy,
        },
      });

      // 주문 공정이력
      await tx.processHistory.create({
        data: {
          orderId: rr.orderId,
          toStatus: 'shipped',
          processType: 'return_completed',
          note: `반품 완료 (${rr.returnNumber}) - 환불 ${netRefund.toLocaleString()}원`,
          processedBy: completedBy,
        },
      });

      return result;
    });

    this.logger.log(
      `반품 완료: ${rr.returnNumber} - 환불 ${netRefund.toLocaleString()}원`,
    );

    return {
      ...updated,
      netRefund,
      refundMethod: client.creditEnabled ? 'credit' : 'bank_transfer',
      shippingFeeCharged: isCustomerFee ? returnShippingFee : 0,
    };
  }

  // 교환 재발송 등록
  async exchangeShip(id: string, dto: ExchangeShipDto, shippedBy: string) {
    const rr = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!rr) throw new NotFoundException('반품요청을 찾을 수 없습니다.');
    if (rr.type !== 'exchange') {
      throw new BadRequestException('교환 타입의 반품만 교환 발송할 수 있습니다.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.returnRequest.update({
        where: { id },
        data: {
          exchangeCourierCode: dto.courierCode,
          exchangeTrackingNumber: dto.trackingNumber,
          exchangeShippedAt: new Date(),
        },
      });

      await tx.returnHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: rr.status,
          toStatus: rr.status,
          processType: 'exchange_shipped',
          note: `교환 발송: ${dto.courierCode} / ${dto.trackingNumber}`,
          processedBy: shippedBy,
        },
      });

      return result;
    });

    this.logger.log(`교환 발송: ${rr.returnNumber} → ${dto.trackingNumber}`);
    return updated;
  }

  // 반품 상태 변경 (범용)
  async updateStatus(
    id: string,
    newStatus: string,
    updatedBy: string,
    note?: string,
  ) {
    const rr = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!rr) throw new NotFoundException('반품요청을 찾을 수 없습니다.');

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = { status: newStatus };
      if (newStatus === RETURN_STATUS.COLLECTED) {
        data.returnDeliveredAt = new Date();
      }

      const result = await tx.returnRequest.update({ where: { id }, data });

      await tx.returnHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: rr.status,
          toStatus: newStatus,
          processType: 'status_change',
          note: note || `상태 변경: ${rr.status} → ${newStatus}`,
          processedBy: updatedBy,
        },
      });

      return result;
    });

    return updated;
  }

  // 반품 상세 조회
  async findOne(id: string) {
    const rr = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: true,
            shipping: true,
          },
        },
        client: {
          select: {
            id: true,
            clientName: true,
            clientCode: true,
            creditEnabled: true,
          },
        },
        items: {
          include: {
            orderItem: {
              select: {
                id: true,
                productName: true,
                size: true,
                pages: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                folderName: true,
                thumbnailUrl: true,
              },
            },
          },
        },
        history: {
          orderBy: { processedAt: 'desc' },
        },
      },
    });

    if (!rr) throw new NotFoundException('반품요청을 찾을 수 없습니다.');
    return rr;
  }

  // 반품 목록 조회
  async findAll(query: ReturnQueryDto) {
    const { clientId, orderId, status, startDate, endDate, page = 1, limit = 20 } = query;

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;
    if (orderId) where.orderId = orderId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate)
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate)
        (where.createdAt as Record<string, unknown>).lte = new Date(
          endDate + 'T23:59:59',
        );
    }

    const [data, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        include: {
          order: {
            select: { id: true, orderNumber: true, finalAmount: true },
          },
          client: {
            select: { id: true, clientName: true, clientCode: true },
          },
          items: {
            include: {
              orderItem: {
                select: {
                  id: true,
                  productName: true,
                  size: true,
                  folderName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // 주문별 반품 목록
  async findByOrderId(orderId: string) {
    return this.prisma.returnRequest.findMany({
      where: { orderId },
      include: {
        items: {
          include: {
            orderItem: {
              select: {
                id: true,
                productName: true,
                size: true,
                folderName: true,
                quantity: true,
              },
            },
          },
        },
        history: {
          orderBy: { processedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 반품 이력 조회
  async getHistory(id: string) {
    const rr = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!rr) throw new NotFoundException('반품요청을 찾을 수 없습니다.');

    return this.prisma.returnHistory.findMany({
      where: { returnRequestId: id },
      orderBy: { processedAt: 'desc' },
    });
  }
}
