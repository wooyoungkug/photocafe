import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SystemSettingsService } from '@/modules/system-settings/system-settings.service';
import { Prisma } from '@prisma/client';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  UpdateShippingDto,
  AdjustOrderDto,
  BulkUpdateStatusDto,
  BulkCancelDto,
  BulkUpdateReceiptDateDto,
  BulkDataCleanupDto,
  ORDER_STATUS,
} from '../dto';
import { SalesLedgerService } from '../../accounting/services/sales-ledger.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private systemSettings: SystemSettingsService,
    private salesLedgerService: SalesLedgerService,
  ) { }

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

  // ==================== processedBy ID → 이름 변환 ====================
  private async resolveProcessedByNames(ids: string[]): Promise<Record<string, string>> {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (!uniqueIds.length) return {};

    const nameMap: Record<string, string> = {};

    // Staff 테이블에서 조회 (관리자 작업이 대부분)
    const staffRecords = await this.prisma.staff.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true },
    });
    staffRecords.forEach(s => { nameMap[s.id] = s.name; });

    // 미해결 ID → User 테이블
    const unresolvedIds = uniqueIds.filter(id => !nameMap[id]);
    if (unresolvedIds.length) {
      const userRecords = await this.prisma.user.findMany({
        where: { id: { in: unresolvedIds } },
        select: { id: true, name: true },
      });
      userRecords.forEach(u => { nameMap[u.id] = u.name; });
    }

    // 미해결 ID → Client 테이블
    const stillUnresolved = uniqueIds.filter(id => !nameMap[id]);
    if (stillUnresolved.length) {
      const clientRecords = await this.prisma.client.findMany({
        where: { id: { in: stillUnresolved } },
        select: { id: true, clientName: true },
      });
      clientRecords.forEach(c => { nameMap[c.id] = c.clientName; });
    }

    return nameMap;
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
              assignedStaff: {
                where: { isPrimary: true },
                select: {
                  staff: {
                    select: { id: true, name: true },
                  },
                },
                take: 1,
              },
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
              fabricName: true,
              folderName: true,
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
          processHistory: {
            take: 1,
            orderBy: { processedAt: 'desc' },
            select: {
              id: true,
              toStatus: true,
              processType: true,
              processedBy: true,
              processedAt: true,
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

    // processedBy ID → 이름 변환
    const processedByIds = data.flatMap(
      order => order.processHistory?.map(h => h.processedBy) || [],
    );
    const nameMap = await this.resolveProcessedByNames(processedByIds);

    const enrichedData = data.map(order => ({
      ...order,
      processHistory: order.processHistory?.map(h => ({
        ...h,
        processedByName: nameMap[h.processedBy] || '-',
      })),
    }));

    return {
      data: enrichedData,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  // ==================== 주문 공정 이력 조회 (이름 포함) ====================
  async getProcessHistory(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다');

    const history = await this.prisma.processHistory.findMany({
      where: { orderId },
      orderBy: { processedAt: 'desc' },
    });

    const processedByIds = history.map(h => h.processedBy).filter(Boolean);
    const nameMap = await this.resolveProcessedByNames(processedByIds);

    return history.map(h => ({
      ...h,
      processedByName: nameMap[h.processedBy] || '-',
    }));
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
            files: { orderBy: { sortOrder: 'asc' }, take: 200 },
            shipping: true,
          },
        },
        processHistory: {
          orderBy: { processedAt: 'desc' },
          take: 50,
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
          fabricName: item.fabricName,
          thumbnailUrl: item.thumbnailUrl,
          totalFileSize: item.totalFileSize ? BigInt(item.totalFileSize) : BigInt(0),
          folderName: item.folderName?.trim().replace(/\s+/g, ' '),
          pageLayout: item.pageLayout,
          bindingDirection: item.bindingDirection,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
          // 파일 정보가 있으면 함께 생성
          ...(item.files?.length ? {
            files: {
              create: item.files.map((f, fi) => ({
                fileName: f.fileName,
                fileUrl: f.fileUrl,
                thumbnailUrl: f.thumbnailUrl,
                pageRange: f.pageRange,
                pageStart: f.pageStart,
                pageEnd: f.pageEnd,
                width: f.width || 0,
                height: f.height || 0,
                widthInch: f.widthInch || 0,
                heightInch: f.heightInch || 0,
                dpi: f.dpi || 0,
                fileSize: f.fileSize || 0,
                sortOrder: f.sortOrder ?? fi,
              })),
            },
          } : {}),
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
          isDuplicateOverride: dto.isDuplicateOverride || false,
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

      // 매출원장 자동 등록 (비동기, 에러 시 주문은 유지)
      this.salesLedgerService.createFromOrder({
        id: order.id,
        orderNumber: order.orderNumber,
        clientId: order.clientId,
        productPrice: Number(order.productPrice),
        shippingFee: Number(order.shippingFee),
        tax: Number(order.tax),
        totalAmount: Number(order.totalAmount),
        finalAmount: Number(order.finalAmount),
        paymentMethod: order.paymentMethod,
        items: order.items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
      }, userId).catch((err) => {
        console.error('매출원장 자동등록 실패:', err.message);
      });

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

  // ==================== 관리자 금액/수량 조정 ====================
  async adjustOrder(id: string, dto: AdjustOrderDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. 항목별 수량/단가 수정
      if (dto.itemUpdates?.length) {
        for (const update of dto.itemUpdates) {
          const item = order.items.find(i => i.id === update.itemId);
          if (!item) continue;

          const newQuantity = update.quantity ?? item.quantity;
          const newUnitPrice = update.unitPrice !== undefined
            ? update.unitPrice
            : Number(item.unitPrice);
          const newTotalPrice = newUnitPrice * newQuantity;

          await tx.orderItem.update({
            where: { id: update.itemId },
            data: {
              quantity: newQuantity,
              unitPrice: newUnitPrice,
              totalPrice: newTotalPrice,
              ...(update.pageLayout !== undefined && { pageLayout: update.pageLayout }),
              ...(update.bindingDirection !== undefined && { bindingDirection: update.bindingDirection }),
              ...(update.fabricName !== undefined && { fabricName: update.fabricName }),
            },
          });
        }
      }

      // 2. 수정된 항목 기준으로 총액 재계산
      const updatedItems = await tx.orderItem.findMany({
        where: { orderId: id },
      });
      const productPrice = updatedItems.reduce(
        (sum, item) => sum + Number(item.totalPrice), 0,
      );
      const tax = Math.round(productPrice * 0.1);
      const shippingFee = Number(order.shippingFee);
      const adjustmentAmount = dto.adjustmentAmount ?? Number(order.adjustmentAmount);
      const totalAmount = productPrice + tax + shippingFee;
      const finalAmount = totalAmount - adjustmentAmount;

      // 3. 주문 금액 업데이트 + 이력 기록
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          productPrice,
          tax,
          adjustmentAmount,
          totalAmount,
          finalAmount: Math.max(0, finalAmount),
          processHistory: {
            create: {
              fromStatus: order.status,
              toStatus: order.status,
              processType: 'admin_adjustment',
              note: dto.adjustmentReason || `금액조정: 할인 ${adjustmentAmount.toLocaleString()}원`,
              processedBy: userId,
            },
          },
        },
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              clientName: true,
              assignedStaff: {
                where: { isPrimary: true },
                select: { staff: { select: { id: true, name: true } } },
                take: 1,
              },
            },
          },
          shipping: true,
          items: {
            include: { files: { orderBy: { sortOrder: 'asc' }, take: 1 }, shipping: true },
          },
        },
      });

      // 4. 매출원장도 연동 업데이트 (존재하는 경우)
      try {
        const ledger = await tx.salesLedger.findUnique({
          where: { orderId: id },
        });
        if (ledger) {
          const supplyAmount = productPrice;
          const vatAmount = tax;
          const ledgerTotal = supplyAmount + vatAmount + shippingFee - adjustmentAmount;
          await tx.salesLedger.update({
            where: { orderId: id },
            data: {
              supplyAmount,
              vatAmount,
              shippingFee,
              adjustmentAmount,
              totalAmount: Math.max(0, ledgerTotal),
              outstandingAmount: Math.max(0, ledgerTotal - Number(ledger.receivedAmount)),
            },
          });
        }
      } catch (e) {
        console.error('매출원장 연동 업데이트 실패:', e);
      }

      return updatedOrder;
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

  // ==================== 중복 주문 체크 (설정 기간 이내) ====================
  async checkDuplicateOrders(clientId: string, folderNames: string[]) {
    // 공백 정규화: trim + 연속 공백을 단일 공백으로
    const normalized = folderNames
      .map(n => n.trim().replace(/\s+/g, ' '))
      .filter(n => n.length > 0);
    if (!normalized.length) return { duplicates: [], months: 0 };

    // 거래처별 개별 설정 우선, 없으면 시스템 기본값
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { duplicateCheckMonths: true },
    });
    const months = client?.duplicateCheckMonths
      ?? await this.systemSettings.getNumericValue('order_duplicate_check_months', 3);
    if (months <= 0) return { duplicates: [], months: 0 };

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const duplicates = await this.prisma.$queryRaw<
      { folderName: string; orderNumber: string; orderedAt: Date; status: string }[]
    >`
      SELECT oi."folderName", o."orderNumber", o."orderedAt", o.status
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      WHERE o."clientId" = ${clientId}
        AND TRIM(REGEXP_REPLACE(oi."folderName", '\\s+', ' ', 'g')) IN (${Prisma.join(normalized)})
        AND o."orderedAt" >= ${cutoffDate}
        AND o.status != 'cancelled'
      ORDER BY o."orderedAt" DESC
    `;

    return { duplicates, months };
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
                fabricName: item.fabricName,
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
