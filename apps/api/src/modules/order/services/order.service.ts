import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SystemSettingsService } from '@/modules/system-settings/system-settings.service';
import { FileStorageService } from '@/modules/upload/services/file-storage.service';
import { PdfGeneratorService } from '@/modules/upload/services/pdf-generator.service';
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
  PROCESS_STATUS,
  INSPECTION_PROCESS_TYPES,
  InspectFileDto,
  HoldInspectionDto,
  CompleteInspectionDto,
} from '../dto';
import { SalesLedgerService } from '../../accounting/services/sales-ledger.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private prisma: PrismaService,
    private systemSettings: SystemSettingsService,
    private salesLedgerService: SalesLedgerService,
    private fileStorage: FileStorageService,
    private pdfGenerator: PdfGeneratorService,
  ) { }

  // ==================== 주문번호 생성 (원자적) ====================
  private async generateOrderNumber(
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<string> {
    const today = new Date();

    // 날짜 형식: YYMMDD
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Advisory lock으로 동시 요청 직렬화 (트랜잭션 종료 시 자동 해제)
    const lockKey = parseInt(`${year}${month}${day}`, 10);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    // lock 획득 후 시퀀스 조회 → 동시 요청이 같은 번호를 받을 수 없음
    const result = await tx.$queryRaw<{ next_seq: bigint }[]>`
      SELECT COALESCE(
        MAX(CAST(SPLIT_PART("orderNumber", '-', 2) AS INTEGER)),
        0
      ) + 1 AS next_seq
      FROM "orders"
      WHERE "orderNumber" LIKE ${dateStr + '-%'}
    `;

    const sequence = Number(result[0]?.next_seq || 1);

    // 일일 999건 제한 검증
    if (sequence > 999) {
      throw new BadRequestException(
        '일일 주문 한도(999건)를 초과했습니다. 시스템 관리자에게 문의하세요.',
      );
    }

    // 형식: YYMMDD-NNN
    return `${dateStr}-${sequence.toString().padStart(3, '0')}`;
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

    // 시스템 자동 생성 이력 처리
    uniqueIds.forEach(id => { if (id === 'system') nameMap[id] = '시스템'; });

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
              originalsDeleted: true,
              pdfStatus: true,
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
      select: { id: true, status: true, clientId: true, orderedAt: true },
    });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다');

    let history = await this.prisma.processHistory.findMany({
      where: { orderId },
      orderBy: { processedAt: 'desc' },
    });

    // 이력이 없는 기존 주문: 현재 상태 기반으로 초기 이력 자동 생성
    if (history.length === 0) {
      const initialHistory = await this.prisma.processHistory.create({
        data: {
          orderId,
          toStatus: ORDER_STATUS.PENDING_RECEIPT,
          processType: 'order_created',
          processedBy: order.clientId,
          processedAt: order.orderedAt,
        },
      });

      // 현재 상태가 접수대기가 아닌 경우, 상태 변경 이력도 추가
      if (order.status !== ORDER_STATUS.PENDING_RECEIPT) {
        await this.prisma.processHistory.create({
          data: {
            orderId,
            fromStatus: ORDER_STATUS.PENDING_RECEIPT,
            toStatus: order.status,
            processType: 'status_change',
            note: '기존 주문 이력 자동 생성',
            processedBy: 'system',
            processedAt: order.orderedAt,
          },
        });
      }

      history = await this.prisma.processHistory.findMany({
        where: { orderId },
        orderBy: { processedAt: 'desc' },
      });
    }

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

  // ==================== 주문 생성 (트랜잭션 + Advisory Lock으로 주문번호 원자적 생성) ====================
  async create(dto: CreateOrderDto, userId: string): Promise<any> {
    const { items, shipping, ...orderData } = dto;

    // 거래처 확인 (트랜잭션 밖에서 수행)
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다');
    }

    // 트랜잭션 내에서 주문번호 생성 + 주문 생성 (advisory lock으로 직렬화)
    const order = await this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.generateOrderNumber(tx);
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

      return tx.order.create({
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
    }, { timeout: 60000 });

    // 비동기 후처리 (트랜잭션 밖에서 실행, 실패해도 주문은 유지)

    // 상품별 주문수 증가
    const productIds = [...new Set(items.map(item => item.productId))];
    Promise.all(
      productIds.map(productId =>
        this.prisma.product.update({
          where: { id: productId },
          data: { orderCount: { increment: 1 } },
        }).catch(() => { })
      )
    ).catch(() => { });

    // 임시 파일 → 정식 경로 이동
    this.moveTemporaryFiles(order).catch((err: Error) => {
      this.logger.error(`임시 파일 이동 최종 실패 (주문: ${order.orderNumber}):`, err.message);
    });

    // 매출원장 자동 등록
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
    }, userId).catch(() => {
      // 매출원장 자동등록 실패 시 주문 생성은 계속 진행
    });

    return order;
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
      } catch {
        // 매출원장 연동 업데이트 실패 시 주문 업데이트는 계속 진행
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

        const newOrder = await this.prisma.$transaction(async (tx) => {
          const newOrderNumber = await this.generateOrderNumber(tx);
          const newBarcode = await this.generateBarcode();

          return tx.order.create({
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
            include: { items: true },
          });
        }, { timeout: 15000 });
        results.success++;
        results.newOrderIds.push(newOrder.id);

        // 매출원장 자동 등록 (복제된 주문도 매출 연동)
        this.salesLedgerService.createFromOrder({
          id: newOrder.id,
          orderNumber: newOrder.orderNumber,
          clientId: newOrder.clientId,
          productPrice: Number(newOrder.productPrice),
          shippingFee: Number(newOrder.shippingFee),
          tax: Number(newOrder.tax),
          totalAmount: Number(newOrder.totalAmount),
          finalAmount: Number(newOrder.finalAmount),
          paymentMethod: newOrder.paymentMethod,
          items: newOrder.items.map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            size: item.size,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
          })),
        }, userId).catch(() => {
          // 복제 주문 매출원장 자동등록 실패 시 건너뜀
        });
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

  // ==================== 월거래집계 조회 ====================
  async getMonthlySummary(clientId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // 종료일 끝까지 포함

    // 해당 기간의 주문 조회
    const orders = await this.prisma.order.findMany({
      where: {
        clientId,
        orderedAt: {
          gte: start,
          lte: end,
        },
        status: { not: ORDER_STATUS.CANCELLED },
      },
      include: {
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });

    // 총 주문 건수 및 금액
    const orderCount = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);

    // 매출원장에서 입금완료 금액 조회 (해당 기간 주문에 대한 입금액)
    const orderIds = orders.map(o => o.id);
    let paidAmount = 0;
    let unpaidAmount = 0;

    if (orderIds.length > 0) {
      // 매출원장 조회
      const ledgers = await this.prisma.salesLedger.findMany({
        where: {
          orderId: { in: orderIds },
        },
        select: {
          receivedAmount: true,
          outstandingAmount: true,
        },
      });

      paidAmount = ledgers.reduce((sum, ledger) => sum + (Number(ledger.receivedAmount) || 0), 0);
      unpaidAmount = ledgers.reduce((sum, ledger) => sum + (Number(ledger.outstandingAmount) || 0), 0);
    }

    // 카테고리별 집계 (상품명 기준)
    const categoryMap = new Map<string, { count: number; amount: number }>();

    orders.forEach(order => {
      order.items.forEach(item => {
        const category = item.productName || '기타';
        const existing = categoryMap.get(category) || { count: 0, amount: 0 };
        categoryMap.set(category, {
          count: existing.count + (item.quantity || 0),
          amount: existing.amount + (Number(item.unitPrice) || 0) * (item.quantity || 0),
        });
      });
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
    }));

    return {
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      orderCount,
      totalAmount,
      paidAmount,
      unpaidAmount,
      categoryBreakdown,
    };
  }

  // ==================== 파일검수 관련 ====================

  /**
   * 파일검수 시작 (자동 호출)
   */
  async startInspection(orderId: string, userId: string) {
    const order = await this.findOne(orderId);

    // 이미 검수 중이거나 검수가 완료된 경우 스킵
    if (order.currentProcess === PROCESS_STATUS.INSPECTION ||
        order.status !== ORDER_STATUS.PENDING_RECEIPT) {
      return order;
    }

    // 파일이 없는 주문은 자동으로 접수완료로 변경
    const hasFiles = await this.prisma.orderFile.count({
      where: {
        orderItem: {
          orderId,
        },
      },
    });

    if (hasFiles === 0) {
      // 파일이 없으면 바로 접수완료
      return this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.RECEIPT_COMPLETED,
          currentProcess: PROCESS_STATUS.COMPLETED,
          processHistory: {
            create: {
              fromStatus: order.status,
              toStatus: ORDER_STATUS.RECEIPT_COMPLETED,
              processType: 'status_change',
              note: '파일 없음 - 자동 접수완료',
              processedBy: userId,
            },
          },
        },
      });
    }

    // 파일검수 시작
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        currentProcess: PROCESS_STATUS.INSPECTION,
        processHistory: {
          create: {
            fromStatus: order.currentProcess,
            toStatus: PROCESS_STATUS.INSPECTION,
            processType: INSPECTION_PROCESS_TYPES.FILE_INSPECTION_STARTED,
            note: '파일검수 시작',
            processedBy: userId,
          },
        },
      },
    });
  }

  /**
   * 개별 파일 검수 (승인/거부)
   */
  async inspectFile(
    orderId: string,
    fileId: string,
    dto: InspectFileDto,
    userId: string,
  ) {
    const order = await this.findOne(orderId);

    if (order.currentProcess !== PROCESS_STATUS.INSPECTION) {
      throw new BadRequestException('파일검수 상태가 아닙니다.');
    }

    // 파일 검수 상태 업데이트
    const file = await this.prisma.orderFile.update({
      where: { id: fileId },
      data: {
        inspectionStatus: dto.inspectionStatus,
        inspectionNote: dto.inspectionNote,
      },
    });

    // ProcessHistory 기록
    await this.prisma.processHistory.create({
      data: {
        orderId,
        fromStatus: 'pending',
        toStatus: dto.inspectionStatus,
        processType: dto.inspectionStatus === 'approved'
          ? INSPECTION_PROCESS_TYPES.FILE_APPROVED
          : INSPECTION_PROCESS_TYPES.FILE_REJECTED,
        note: dto.inspectionNote || `파일 ${dto.inspectionStatus === 'approved' ? '승인' : '거부'}: ${file.fileName}`,
        processedBy: userId,
      },
    });

    // 모든 파일이 승인되었는지 확인
    const allFiles = await this.prisma.orderFile.findMany({
      where: {
        orderItem: {
          orderId,
        },
      },
      select: {
        id: true,
        inspectionStatus: true,
      },
    });

    const allApproved = allFiles.every(f => f.inspectionStatus === 'approved');
    const hasRejected = allFiles.some(f => f.inspectionStatus === 'rejected');

    // 모든 파일이 승인되면 자동으로 검수 완료
    if (allApproved && allFiles.length > 0) {
      return this.completeInspection(orderId, userId, {
        note: '모든 파일 승인 완료 - 자동 접수완료',
      });
    }

    // 거부된 파일이 있으면 알림 (선택적)
    if (hasRejected) {
      // TODO: 거부된 파일이 있을 때 추가 처리 로직
    }

    return file;
  }

  /**
   * 검수 보류 (SMS 발송 옵션)
   */
  async holdInspection(
    orderId: string,
    dto: HoldInspectionDto,
    userId: string,
  ) {
    const order = await this.findOne(orderId);

    if (order.currentProcess !== PROCESS_STATUS.INSPECTION) {
      throw new BadRequestException('파일검수 상태가 아닙니다.');
    }

    // 상태를 접수대기로 롤백
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.PENDING_RECEIPT,
        currentProcess: PROCESS_STATUS.RECEIPT_PENDING,
        processHistory: {
          create: {
            fromStatus: order.status,
            toStatus: ORDER_STATUS.PENDING_RECEIPT,
            processType: INSPECTION_PROCESS_TYPES.INSPECTION_HOLD,
            note: `검수 보류: ${dto.reason}`,
            processedBy: userId,
          },
        },
      },
      include: {
        client: {
          select: {
            name: true,
            mobile: true,
          },
        },
      },
    });

    // SMS 발송 (옵션)
    if (dto.sendSms !== false && updatedOrder.client.mobile) {
      const smsSent = await this.sendInspectionHoldSms(
        updatedOrder,
        dto.reason,
      );

      if (smsSent) {
        // SMS 발송 성공 기록
        await this.prisma.processHistory.create({
          data: {
            orderId,
            fromStatus: '',
            toStatus: '',
            processType: INSPECTION_PROCESS_TYPES.INSPECTION_SMS_SENT,
            note: `고객 통지 완료: ${updatedOrder.client.mobile}`,
            processedBy: userId,
          },
        });
      }
    }

    return updatedOrder;
  }

  /**
   * 검수 완료 (접수완료로 전환)
   */
  async completeInspection(
    orderId: string,
    userId: string,
    dto?: CompleteInspectionDto,
  ) {
    const order = await this.findOne(orderId);

    // 모든 파일이 승인되었는지 확인
    const files = await this.prisma.orderFile.findMany({
      where: {
        orderItem: {
          orderId,
        },
      },
      select: {
        inspectionStatus: true,
      },
    });

    const allApproved = files.every(f => f.inspectionStatus === 'approved');
    if (files.length > 0 && !allApproved) {
      throw new BadRequestException('모든 파일이 승인되어야 검수를 완료할 수 있습니다.');
    }

    // 비동기 PDF 생성 트리거 (접수확정 응답을 차단하지 않음)
    this.triggerPdfGeneration(orderId).catch(err => {
      this.logger.error(`PDF 생성 실패 (주문 ${orderId}):`, err);
    });

    // 접수완료로 상태 변경
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.RECEIPT_COMPLETED,
        currentProcess: PROCESS_STATUS.COMPLETED,
        processHistory: {
          create: {
            fromStatus: order.status,
            toStatus: ORDER_STATUS.RECEIPT_COMPLETED,
            processType: INSPECTION_PROCESS_TYPES.FILE_INSPECTION_COMPLETED,
            note: dto?.note || '파일검수 완료',
            processedBy: userId,
          },
        },
      },
    });
  }

  /**
   * SMS 발송 (private)
   */
  private async sendInspectionHoldSms(
    order: any,
    reason: string,
  ): Promise<boolean> {
    try {
      // TODO: SMS 서비스 연동
      return true; // 임시로 성공 반환
    } catch {
      return false; // 실패해도 전체 작업은 계속 진행
    }
  }

  // ==================== 파일 관리 ====================

  /**
   * 임시 파일을 정식 주문 경로로 이동
   */
  private async moveTemporaryFiles(order: any, retryCount = 0): Promise<void> {
    const MAX_RETRIES = 2;
    try {
      for (const item of order.items) {
        if (!item.files?.length) continue;

        const firstFile = item.files[0];
        if (!firstFile.fileUrl || !firstFile.fileUrl.includes('/temp/')) continue;

        const urlParts = firstFile.fileUrl.replace(/\\/g, '/').split('/temp/');
        if (urlParts.length < 2) continue;
        const tempFolderId = urlParts[1].split('/')[0];

        const companyName = order.client?.name || 'unknown';
        const { orderDir, movedFiles } = this.fileStorage.moveToOrderDir(
          tempFolderId,
          order.orderNumber,
          companyName,
        );

        // 배치 업데이트: N+1 → 단일 트랜잭션
        const updates: { id: string; fileUrl: string; originalPath: string; thumbnailUrl: string; thumbnailPath: string | null }[] = [];
        for (const moved of movedFiles) {
          const matchingFile = item.files.find(
            (f: any) => f.fileUrl.includes(moved.fileName),
          );
          if (matchingFile) {
            updates.push({
              id: matchingFile.id,
              fileUrl: this.fileStorage.toRelativeUrl(moved.original),
              originalPath: moved.original,
              thumbnailUrl: moved.thumbnail ? this.fileStorage.toRelativeUrl(moved.thumbnail) : matchingFile.thumbnailUrl,
              thumbnailPath: moved.thumbnail || null,
            });
          }
        }

        // 50개씩 배치 처리
        const BATCH_SIZE = 50;
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
          const batch = updates.slice(i, i + BATCH_SIZE);
          await this.prisma.$transaction(
            batch.map(u =>
              this.prisma.orderFile.update({
                where: { id: u.id },
                data: {
                  fileUrl: u.fileUrl,
                  originalPath: u.originalPath,
                  thumbnailUrl: u.thumbnailUrl,
                  thumbnailPath: u.thumbnailPath,
                  storageStatus: 'uploaded',
                },
              })
            )
          );
        }
      }
    } catch (err) {
      if (retryCount < MAX_RETRIES) {
        this.logger.warn(`임시 파일 이동 재시도 (${retryCount + 1}/${MAX_RETRIES}): ${(err as Error).message}`);
        await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
        return this.moveTemporaryFiles(order, retryCount + 1);
      }
      throw err;
    }
  }

  /**
   * 접수확정 시 PDF 생성 트리거 (비동기)
   */
  private async triggerPdfGeneration(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });
    if (!order) return;

    const items = await this.prisma.orderItem.findMany({
      where: { orderId },
      include: {
        files: {
          where: { inspectionStatus: 'approved', storageStatus: 'uploaded' },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    for (const item of items) {
      if (item.files.length === 0) continue;

      try {
        await this.prisma.orderItem.update({
          where: { id: item.id },
          data: { pdfStatus: 'generating' },
        });

        // 원본 파일 경로에서 디렉토리 추출
        const firstFilePath = item.files[0].originalPath;
        if (!firstFilePath) {
          this.logger.warn(`No original path for item ${item.id}, skipping PDF`);
          await this.prisma.orderItem.update({
            where: { id: item.id },
            data: { pdfStatus: 'failed' },
          });
          continue;
        }

        const { join, dirname } = require('path');
        const orderDir = dirname(dirname(firstFilePath)); // originals/ 상위

        const pdfFiles = item.files
          .filter(f => f.originalPath)
          .map(f => ({
            originalPath: f.originalPath!,
            fileName: f.fileName,
            widthInch: f.widthInch,
            heightInch: f.heightInch,
            sortOrder: f.sortOrder,
          }));

        const pdfPath = await this.pdfGenerator.generatePdf(
          pdfFiles,
          orderDir,
          item.productionNumber,
        );

        await this.prisma.orderItem.update({
          where: { id: item.id },
          data: {
            pdfPath,
            pdfStatus: 'completed',
            pdfGeneratedAt: new Date(),
          },
        });

        this.logger.log(`PDF generated for item ${item.productionNumber}`);
      } catch (err) {
        this.logger.error(`PDF generation failed for item ${item.id}:`, err);
        await this.prisma.orderItem.update({
          where: { id: item.id },
          data: { pdfStatus: 'failed' },
        });
      }
    }
  }

  /**
   * PDF 수동 재생성
   */
  async regeneratePdf(orderId: string) {
    const failedItems = await this.prisma.orderItem.findMany({
      where: { orderId, pdfStatus: 'failed' },
    });

    if (failedItems.length === 0) {
      throw new BadRequestException('재생성할 PDF가 없습니다.');
    }

    // 비동기 실행
    this.triggerPdfGeneration(orderId).catch(err => {
      this.logger.error(`PDF 재생성 실패: ${orderId}`, err);
    });

    return { message: `${failedItems.length}건의 PDF 재생성을 시작합니다.` };
  }

  /**
   * 원본 이미지 삭제 (배송완료 후 관리자 수동)
   */
  async deleteOriginals(orderId: string, itemId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, orderNumber: true },
    });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다');

    if (order.status !== ORDER_STATUS.SHIPPED) {
      throw new BadRequestException('배송완료 상태의 주문만 원본을 삭제할 수 있습니다.');
    }

    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { files: true },
    });
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('주문항목을 찾을 수 없습니다');
    }

    if (item.originalsDeleted) {
      throw new BadRequestException('이미 원본이 삭제된 항목입니다.');
    }

    // 디스크에서 원본 파일 삭제
    const firstFile = item.files.find(f => f.originalPath);
    let deletedCount = 0;
    let freedBytes = 0;

    if (firstFile?.originalPath) {
      const { dirname } = require('path');
      const orderDir = dirname(dirname(firstFile.originalPath));
      const result = this.fileStorage.deleteOriginals(orderDir);
      deletedCount = result.deletedCount;
      freedBytes = result.freedBytes;
    }

    // DB 업데이트
    await this.prisma.$transaction([
      this.prisma.orderFile.updateMany({
        where: { orderItemId: itemId },
        data: {
          storageStatus: 'deleted',
          deletedAt: new Date(),
        },
      }),
      this.prisma.orderItem.update({
        where: { id: itemId },
        data: { originalsDeleted: true, totalFileSize: 0 },
      }),
      this.prisma.processHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: order.status,
          processType: 'originals_deleted',
          note: `원본 이미지 삭제: ${deletedCount}개 파일, ${Math.round(freedBytes / 1024 / 1024)}MB 확보`,
          processedBy: userId,
        },
      }),
    ]);

    return {
      message: '원본 이미지가 삭제되었습니다.',
      deletedCount,
      freedBytes,
      freedMB: Math.round(freedBytes / 1024 / 1024),
    };
  }

  /**
   * 원본 이미지 ZIP 다운로드
   */
  async downloadOriginals(orderId: string, res: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        items: {
          select: {
            id: true,
            folderName: true,
            originalsDeleted: true,
            files: {
              select: {
                originalPath: true,
                fileName: true,
                storageStatus: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다');

    const { existsSync } = require('fs');
    const filesToZip: { path: string; name: string; folder: string }[] = [];

    for (const item of order.items) {
      if (item.originalsDeleted) continue;
      for (const file of item.files) {
        if (file.originalPath && file.storageStatus !== 'deleted') {
          if (existsSync(file.originalPath)) {
            filesToZip.push({
              path: file.originalPath,
              name: file.fileName,
              folder: item.folderName || item.id,
            });
          }
        }
      }
    }

    if (filesToZip.length === 0) {
      throw new BadRequestException('다운로드할 원본 파일이 없습니다.');
    }

    const zipFileName = `${order.orderNumber}_originals.zip`;
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFileName)}"`,
    });

    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 1 } });

    archive.on('error', (err: any) => {
      this.logger.error(`ZIP 생성 실패: ${orderId}`, err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'ZIP 생성 중 오류가 발생했습니다.' });
      }
    });

    archive.pipe(res);

    for (const file of filesToZip) {
      archive.file(file.path, { name: `${file.folder}/${file.name}` });
    }

    await archive.finalize();
  }

  /**
   * 주문 단위 원본 이미지 삭제 (모든 항목)
   */
  async deleteOrderOriginals(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        orderNumber: true,
        items: {
          select: {
            id: true,
            pdfStatus: true,
            originalsDeleted: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다');
    if (order.status !== ORDER_STATUS.SHIPPED) {
      throw new BadRequestException('배송완료 상태의 주문만 원본을 삭제할 수 있습니다.');
    }

    let totalDeleted = 0;
    let totalFreed = 0;

    for (const item of order.items) {
      if (item.originalsDeleted) continue;

      try {
        const result = await this.deleteOriginals(orderId, item.id, userId);
        totalDeleted += result.deletedCount;
        totalFreed += result.freedBytes;
      } catch (err) {
        this.logger.warn(`원본 삭제 실패 (item: ${item.id}): ${err.message}`);
      }
    }

    return {
      message: '원본 이미지 삭제 완료',
      totalDeletedCount: totalDeleted,
      totalFreedBytes: totalFreed,
      totalFreedMB: Math.round(totalFreed / 1024 / 1024),
    };
  }

  /**
   * 원본 이미지 일괄 삭제
   */
  async bulkDeleteOriginals(orderIds: string[], userId: string) {
    let successCount = 0;
    const failed: string[] = [];

    for (const orderId of orderIds) {
      try {
        await this.deleteOrderOriginals(orderId, userId);
        successCount++;
      } catch (err) {
        failed.push(orderId);
        this.logger.warn(`원본 일괄 삭제 실패: ${orderId} - ${err.message}`);
      }
    }

    return { success: successCount, failed };
  }
}
