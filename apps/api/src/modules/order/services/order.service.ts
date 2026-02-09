import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  UpdateShippingDto,
  BulkUpdateStatusDto,
  BulkCancelDto,
  BulkUpdateReceiptDateDto,
  BulkDataCleanupDto,
  ORDER_STATUS,
} from '../dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) { }

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

    // endDate가 날짜만 있으면 해당일 끝(23:59:59.999)까지 포함
    let adjustedEndDate = endDate;
    if (endDate) {
      adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);
    }

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
      ...(startDate || adjustedEndDate
        ? {
          orderedAt: {
            ...(startDate && { gte: startDate }),
            ...(adjustedEndDate && { lte: adjustedEndDate }),
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
          shipping: true,
          items: {
            select: {
              id: true,
              productionNumber: true,
              productName: true,
              size: true,
              pages: true,
              printMethod: true,
              paper: true,
              bindingType: true,
              coverMaterial: true,
              foilName: true,
              foilColor: true,
              finishingOptions: true,
              thumbnailUrl: true,
              totalFileSize: true,
              pageLayout: true,
              bindingDirection: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              files: {
                select: {
                  thumbnailUrl: true,
                  fileUrl: true,
                },
                orderBy: { sortOrder: 'asc' },
                take: 1,
              },
              shipping: true,
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
            shipping: true,
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
    try {
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
      let totalShippingFee = 0;

      const orderItems = items.map((item, index) => {
        const totalPrice = item.unitPrice * item.quantity;
        productPrice += totalPrice;

        // 항목별 배송비 합산
        if (item.shipping) {
          totalShippingFee += item.shipping.deliveryFee || 0;
        }

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
          thumbnailUrl: item.thumbnailUrl,
          totalFileSize: item.totalFileSize ? BigInt(item.totalFileSize) : BigInt(0),
          folderName: item.folderName,
          pageLayout: item.pageLayout,
          bindingDirection: item.bindingDirection,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
          // 항목별 배송 정보가 있으면 함께 생성
          ...(item.shipping ? {
            shipping: {
              create: {
                senderType: item.shipping.senderType,
                senderName: item.shipping.senderName,
                senderPhone: item.shipping.senderPhone,
                senderPostalCode: item.shipping.senderPostalCode,
                senderAddress: item.shipping.senderAddress,
                senderAddressDetail: item.shipping.senderAddressDetail,
                receiverType: item.shipping.receiverType,
                recipientName: item.shipping.recipientName,
                phone: item.shipping.phone,
                postalCode: item.shipping.postalCode,
                address: item.shipping.address,
                addressDetail: item.shipping.addressDetail,
                deliveryMethod: item.shipping.deliveryMethod,
                deliveryFee: item.shipping.deliveryFee,
                deliveryFeeType: item.shipping.deliveryFeeType,
              },
            },
          } : {}),
        };
      });

      // 항목별 배송비가 없으면 주문 단위 배송비 사용
      if (totalShippingFee === 0 && dto.shippingFee) {
        totalShippingFee = dto.shippingFee;
      }

      const tax = Math.round(productPrice * 0.1); // 부가세 10%
      const totalAmount = productPrice + tax;

      const order = await this.prisma.order.create({
        data: {
          orderNumber,
          barcode,
          clientId: dto.clientId,
          productPrice,
          shippingFee: totalShippingFee,
          tax,
          totalAmount: totalAmount + totalShippingFee,
          finalAmount: totalAmount + totalShippingFee,
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
            include: {
              files: true,
              shipping: true,
            },
          },
        },
      });

      // 상품별 주문수 증가 (비동기, 에러 무시)
      const productIds = [...new Set(items.map(item => item.productId))];
      Promise.all(
        productIds.map(productId =>
          this.prisma.product.update({
            where: { id: productId },
            data: { orderCount: { increment: 1 } },
          }).catch(() => { })
        )
      ).catch(() => { });

      return order;
    } catch (error) {
      console.error('Order creation error:', error);
      throw error;
    }
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

  // ==================== 주문항목 개별 삭제 ====================
  async deleteItem(orderId: string, itemId: string) {
    const order = await this.findOne(orderId);

    if (order.status !== ORDER_STATUS.PENDING_RECEIPT && order.status !== ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('접수대기 또는 취소 상태의 주문만 수정할 수 있습니다');
    }

    const item = order.items.find(i => i.id === itemId);
    if (!item) {
      throw new NotFoundException('주문항목을 찾을 수 없습니다');
    }

    if (order.items.length <= 1) {
      throw new BadRequestException('주문에는 최소 1개의 항목이 있어야 합니다. 주문 자체를 삭제해주세요.');
    }

    // 항목 삭제 후 주문 금액 재계산
    const remainingItems = order.items.filter(i => i.id !== itemId);
    const productPrice = remainingItems.reduce((sum, i) => sum + Number(i.totalPrice), 0);
    const tax = Math.round(productPrice * 0.1);
    const shippingFee = Number(order.shippingFee);
    const totalAmount = productPrice + tax + shippingFee;

    await this.prisma.$transaction([
      this.prisma.orderItem.delete({ where: { id: itemId } }),
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          productPrice,
          tax,
          totalAmount,
          finalAmount: totalAmount,
        },
      }),
    ]);

    return { message: '주문항목이 삭제되었습니다', deletedItemId: itemId };
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

  // ==================== 벌크: 상태 일괄 변경 ====================
  async bulkUpdateStatus(dto: BulkUpdateStatusDto, userId: string) {
    const results = { success: 0, failed: [] as string[] };

    await this.prisma.$transaction(async (tx) => {
      for (const orderId of dto.orderIds) {
        try {
          const order = await tx.order.findUnique({ where: { id: orderId } });
          if (!order) { results.failed.push(orderId); continue; }

          await tx.order.update({
            where: { id: orderId },
            data: {
              status: dto.status,
              processHistory: {
                create: {
                  fromStatus: order.status,
                  toStatus: dto.status,
                  processType: 'bulk_status_change',
                  note: dto.note,
                  processedBy: userId,
                },
              },
            },
          });
          results.success++;
        } catch { results.failed.push(orderId); }
      }
    });

    return results;
  }

  // ==================== 벌크: 일괄 취소 ====================
  async bulkCancel(dto: BulkCancelDto, userId: string) {
    const results = { success: 0, failed: [] as string[], skipped: [] as string[] };

    await this.prisma.$transaction(async (tx) => {
      for (const orderId of dto.orderIds) {
        try {
          const order = await tx.order.findUnique({ where: { id: orderId } });
          if (!order) { results.failed.push(orderId); continue; }
          if (order.status === ORDER_STATUS.SHIPPED) { results.skipped.push(orderId); continue; }

          await tx.order.update({
            where: { id: orderId },
            data: {
              status: ORDER_STATUS.CANCELLED,
              processHistory: {
                create: {
                  fromStatus: order.status,
                  toStatus: ORDER_STATUS.CANCELLED,
                  processType: 'bulk_order_cancelled',
                  note: dto.reason,
                  processedBy: userId,
                },
              },
            },
          });
          results.success++;
        } catch { results.failed.push(orderId); }
      }
    });

    return results;
  }

  // ==================== 벌크: 일괄 삭제 ====================
  async bulkDelete(orderIds: string[]) {
    const results = { success: 0, failed: [] as string[], skipped: [] as string[] };

    await this.prisma.$transaction(async (tx) => {
      for (const orderId of orderIds) {
        try {
          const order = await tx.order.findUnique({ where: { id: orderId } });
          if (!order) { results.failed.push(orderId); continue; }
          if (order.status !== ORDER_STATUS.PENDING_RECEIPT && order.status !== ORDER_STATUS.CANCELLED) {
            results.skipped.push(orderId);
            continue;
          }

          await tx.order.delete({ where: { id: orderId } });
          results.success++;
        } catch { results.failed.push(orderId); }
      }
    });

    return results;
  }

  // ==================== 중복 주문 체크 (3개월 이내) ====================
  async checkDuplicateOrders(clientId: string, folderNames: string[]) {
    if (!folderNames.length) return { duplicates: [] };

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const duplicates = await this.prisma.$queryRaw<
      { folderName: string; orderNumber: string; orderedAt: Date; status: string }[]
    >`
      SELECT oi."folderName", o."orderNumber", o."orderedAt", o.status
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      WHERE o."clientId" = ${clientId}
        AND oi."folderName" IN (${Prisma.join(folderNames)})
        AND o."orderedAt" >= ${threeMonthsAgo}
        AND o.status != 'cancelled'
      ORDER BY o."orderedAt" DESC
    `;

    return { duplicates };
  }

  // ==================== 벌크: 일괄 복제 ====================
  async bulkDuplicate(orderIds: string[], userId: string) {
    const results = { success: 0, failed: [] as string[], newOrderIds: [] as string[] };

    for (const orderId of orderIds) {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: { include: { shipping: true } },
            shipping: true,
          },
        });
        if (!order) { results.failed.push(orderId); continue; }

        const newOrderNumber = await this.generateOrderNumber();
        const newBarcode = await this.generateBarcode();

        const newOrder = await this.prisma.order.create({
          data: {
            orderNumber: newOrderNumber,
            barcode: newBarcode,
            clientId: order.clientId,
            productPrice: order.productPrice,
            shippingFee: order.shippingFee,
            tax: order.tax,
            adjustmentAmount: 0,
            totalAmount: order.totalAmount,
            finalAmount: order.finalAmount,
            paymentMethod: order.paymentMethod,
            isUrgent: false,
            customerMemo: order.customerMemo,
            productMemo: order.productMemo,
            status: ORDER_STATUS.PENDING_RECEIPT,
            currentProcess: 'receipt_pending',
            items: {
              create: order.items.map((item, idx) => ({
                productionNumber: this.generateProductionNumber(newOrderNumber, idx),
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
                finishingOptions: item.finishingOptions,
                thumbnailUrl: item.thumbnailUrl,
                totalFileSize: item.totalFileSize,
                pageLayout: item.pageLayout,
                bindingDirection: item.bindingDirection,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                ...(item.shipping ? {
                  shipping: {
                    create: {
                      senderType: item.shipping.senderType,
                      senderName: item.shipping.senderName,
                      senderPhone: item.shipping.senderPhone,
                      senderPostalCode: item.shipping.senderPostalCode,
                      senderAddress: item.shipping.senderAddress,
                      senderAddressDetail: item.shipping.senderAddressDetail,
                      receiverType: item.shipping.receiverType,
                      recipientName: item.shipping.recipientName,
                      phone: item.shipping.phone,
                      postalCode: item.shipping.postalCode,
                      address: item.shipping.address,
                      addressDetail: item.shipping.addressDetail,
                      deliveryMethod: item.shipping.deliveryMethod,
                      deliveryFee: item.shipping.deliveryFee,
                      deliveryFeeType: item.shipping.deliveryFeeType,
                    },
                  },
                } : {}),
              })),
            },
            ...(order.shipping ? {
              shipping: {
                create: {
                  recipientName: order.shipping.recipientName,
                  phone: order.shipping.phone,
                  postalCode: order.shipping.postalCode,
                  address: order.shipping.address,
                  addressDetail: order.shipping.addressDetail,
                },
              },
            } : {}),
            processHistory: {
              create: {
                toStatus: ORDER_STATUS.PENDING_RECEIPT,
                processType: 'order_duplicated',
                note: `원본: ${order.orderNumber}`,
                processedBy: userId,
              },
            },
          },
        });
        results.success++;
        results.newOrderIds.push(newOrder.id);
      } catch { results.failed.push(orderId); }
    }

    return results;
  }

  // ==================== 벌크: 금액 0원 처리 ====================
  async bulkResetAmount(orderIds: string[], userId: string) {
    const results = { success: 0, failed: [] as string[] };

    await this.prisma.$transaction(async (tx) => {
      for (const orderId of orderIds) {
        try {
          const order = await tx.order.findUnique({ where: { id: orderId } });
          if (!order) { results.failed.push(orderId); continue; }

          await tx.order.update({
            where: { id: orderId },
            data: {
              productPrice: 0,
              shippingFee: 0,
              tax: 0,
              adjustmentAmount: 0,
              totalAmount: 0,
              finalAmount: 0,
              processHistory: {
                create: {
                  fromStatus: order.status,
                  toStatus: order.status,
                  processType: 'bulk_amount_reset',
                  note: '금액 0원 처리',
                  processedBy: userId,
                },
              },
            },
          });
          results.success++;
        } catch { results.failed.push(orderId); }
      }
    });

    return results;
  }

  // ==================== 벌크: 접수일 일괄 변경 ====================
  async bulkUpdateReceiptDate(dto: BulkUpdateReceiptDateDto, userId: string) {
    const results = { success: 0, failed: [] as string[] };

    await this.prisma.$transaction(async (tx) => {
      for (const orderId of dto.orderIds) {
        try {
          const order = await tx.order.findUnique({ where: { id: orderId } });
          if (!order) { results.failed.push(orderId); continue; }

          await tx.order.update({
            where: { id: orderId },
            data: {
              orderedAt: dto.receiptDate,
              processHistory: {
                create: {
                  fromStatus: order.status,
                  toStatus: order.status,
                  processType: 'bulk_receipt_date_change',
                  note: `접수일 변경: ${dto.receiptDate.toISOString().slice(0, 10)}`,
                  processedBy: userId,
                },
              },
            },
          });
          results.success++;
        } catch { results.failed.push(orderId); }
      }
    });

    return results;
  }

  // ==================== 벌크: 기간별 데이터 정리 ====================
  async dataCleanup(dto: BulkDataCleanupDto) {
    const where: Prisma.OrderWhereInput = {
      orderedAt: {
        gte: dto.startDate,
        lte: dto.endDate,
      },
    };

    if (dto.deleteThumbnails) {
      await this.prisma.orderItem.updateMany({
        where: { order: where },
        data: { thumbnailUrl: null },
      });
    }

    const deleted = await this.prisma.order.deleteMany({ where });

    return { success: deleted.count, deleted: deleted.count };
  }

  // ==================== 통계 조회 ====================
  async getStatusCounts() {
    const counts = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return counts.reduce(
      (acc: Record<string, number>, curr: { status: string; _count: { id: number } }) => {
        acc[curr.status] = curr._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
