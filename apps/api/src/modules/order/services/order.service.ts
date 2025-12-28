import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  UpdateShippingDto,
  ORDER_STATUS,
} from '../dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  // ==================== 주문번호 생성 ====================
  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // 오늘 날짜의 마지막 주문번호 조회
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        orderNumber: { startsWith: `ORD-${dateStr}` },
      },
      orderBy: { orderNumber: 'desc' },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNumber.slice(-4), 10);
      sequence = lastSeq + 1;
    }

    return `ORD-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  private async generateBarcode(): Promise<string> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${timestamp}${random}`;
  }

  private generateProductionNumber(orderNumber: string, itemIndex: number): string {
    return `${orderNumber}-${(itemIndex + 1).toString().padStart(2, '0')}`;
  }

  // ==================== 주문 목록 조회 ====================
  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    clientId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    isUrgent?: boolean;
  }) {
    const { skip = 0, take = 20, search, clientId, status, startDate, endDate, isUrgent } = params;

    const where: Prisma.OrderWhereInput = {
      ...(search && {
        OR: [
          { orderNumber: { contains: search } },
          { client: { clientName: { contains: search } } },
        ],
      }),
      ...(clientId && { clientId }),
      ...(status && { status }),
      ...(isUrgent !== undefined && { isUrgent }),
      ...(startDate || endDate
        ? {
            orderedAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              clientName: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { orderedAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  // ==================== 주문 상세 조회 ====================
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        shipping: true,
        items: {
          include: {
            files: { orderBy: { sortOrder: 'asc' } },
          },
        },
        processHistory: {
          orderBy: { processedAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다');
    }

    return order;
  }

  // ==================== 주문 생성 ====================
  async create(dto: CreateOrderDto, userId: string) {
    const { items, shipping, ...orderData } = dto;

    // 거래처 확인
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다');
    }

    const orderNumber = await this.generateOrderNumber();
    const barcode = await this.generateBarcode();

    // 가격 계산
    let productPrice = 0;
    const orderItems = items.map((item, index) => {
      const totalPrice = item.unitPrice * item.quantity;
      productPrice += totalPrice;

      return {
        productionNumber: this.generateProductionNumber(orderNumber, index),
        productId: item.productId,
        productName: item.productName,
        size: item.size,
        pages: item.pages,
        printMethod: item.printMethod,
        paper: item.paper,
        bindingType: item.bindingType,
        coverMaterial: item.coverMaterial,
        foilName: item.foilName,
        foilColor: item.foilColor,
        finishingOptions: item.finishingOptions || [],
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
        files: item.files?.length
          ? { create: item.files }
          : undefined,
      };
    });

    const tax = Math.round(productPrice * 0.1); // 부가세 10%
    const totalAmount = productPrice + tax;

    return this.prisma.order.create({
      data: {
        orderNumber,
        barcode,
        clientId: dto.clientId,
        productPrice,
        tax,
        totalAmount,
        finalAmount: totalAmount,
        paymentMethod: dto.paymentMethod || 'postpaid',
        isUrgent: dto.isUrgent || false,
        requestedDeliveryDate: dto.requestedDeliveryDate,
        customerMemo: dto.customerMemo,
        productMemo: dto.productMemo,
        status: ORDER_STATUS.PENDING_RECEIPT,
        currentProcess: 'receipt_pending',
        items: { create: orderItems },
        shipping: { create: shipping },
        processHistory: {
          create: {
            toStatus: ORDER_STATUS.PENDING_RECEIPT,
            processType: 'order_created',
            processedBy: userId,
          },
        },
      },
      include: {
        client: true,
        shipping: true,
        items: {
          include: { files: true },
        },
      },
    });
  }

  // ==================== 주문 수정 ====================
  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.findOne(id);

    if (order.status !== ORDER_STATUS.PENDING_RECEIPT) {
      throw new BadRequestException('접수대기 상태의 주문만 수정할 수 있습니다');
    }

    const { items, shipping, ...orderData } = dto;

    return this.prisma.order.update({
      where: { id },
      data: {
        ...orderData,
        ...(shipping && {
          shipping: {
            update: shipping,
          },
        }),
      },
      include: {
        client: true,
        shipping: true,
        items: true,
      },
    });
  }

  // ==================== 주문 상태 변경 ====================
  async updateStatus(id: string, dto: UpdateOrderStatusDto, userId: string) {
    const order = await this.findOne(id);

    return this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        currentProcess: dto.currentProcess || order.currentProcess,
        processHistory: {
          create: {
            fromStatus: order.status,
            toStatus: dto.status,
            processType: 'status_change',
            note: dto.note,
            processedBy: userId,
          },
        },
      },
      include: {
        client: true,
        shipping: true,
        processHistory: {
          orderBy: { processedAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  // ==================== 배송 정보 업데이트 ====================
  async updateShipping(id: string, dto: UpdateShippingDto) {
    await this.findOne(id);

    return this.prisma.orderShipping.update({
      where: { orderId: id },
      data: {
        ...dto,
        ...(dto.trackingNumber && { shippedAt: new Date() }),
      },
    });
  }

  // ==================== 배송 완료 처리 ====================
  async markAsDelivered(id: string, userId: string) {
    const order = await this.findOne(id);

    return this.prisma.$transaction([
      this.prisma.orderShipping.update({
        where: { orderId: id },
        data: { deliveredAt: new Date() },
      }),
      this.prisma.order.update({
        where: { id },
        data: {
          status: ORDER_STATUS.SHIPPED,
          processHistory: {
            create: {
              fromStatus: order.status,
              toStatus: ORDER_STATUS.SHIPPED,
              processType: 'delivery_completed',
              processedBy: userId,
            },
          },
        },
      }),
    ]);
  }

  // ==================== 주문 취소 ====================
  async cancel(id: string, userId: string, reason?: string) {
    const order = await this.findOne(id);

    if (order.status === ORDER_STATUS.SHIPPED) {
      throw new BadRequestException('배송완료된 주문은 취소할 수 없습니다');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: ORDER_STATUS.CANCELLED,
        processHistory: {
          create: {
            fromStatus: order.status,
            toStatus: ORDER_STATUS.CANCELLED,
            processType: 'order_cancelled',
            note: reason,
            processedBy: userId,
          },
        },
      },
    });
  }

  // ==================== 주문 삭제 ====================
  async delete(id: string) {
    const order = await this.findOne(id);

    if (order.status !== ORDER_STATUS.PENDING_RECEIPT && order.status !== ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('접수대기 또는 취소 상태의 주문만 삭제할 수 있습니다');
    }

    return this.prisma.order.delete({
      where: { id },
    });
  }

  // ==================== 통계 조회 ====================
  async getStatusCounts() {
    const counts = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return counts.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
