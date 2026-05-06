import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SystemSettingsService } from '@/modules/system-settings/system-settings.service';
import { FileStorageService, getUploadBasePath } from '@/modules/upload/services/file-storage.service';
import { PdfGeneratorService } from '@/modules/upload/services/pdf-generator.service';
import { ThumbnailService } from '@/modules/upload/services/thumbnail.service';
import { B2StorageService } from '@/modules/upload/services/b2-storage.service';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { Prisma } from '@prisma/client';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import {
  CreateOrderDto,
  CreateOrderItemDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  UpdateShippingDto,
  UpdateShippingWithFeeDto,
  UpdateShippingWithFeeResult,
  AdjustOrderDto,
  BulkUpdateStatusDto,
  BulkCancelDto,
  BulkUpdateReceiptDateDto,
  BulkDataCleanupDto,
  ORDER_STATUS,
  ORDER_EDIT_BLOCKED_STATUSES,
  ORDER_REPRINT_REQUIRED_STATUSES,
  PROCESS_STATUS,
  INSPECTION_PROCESS_TYPES,
  PRINT_QUEUE_STATUS,
  PRINT_QUEUE_PROCESS_TYPES,
  InspectFileDto,
  HoldInspectionDto,
  CompleteInspectionDto,
  EditOrderWithAuditDto,
  RequestReprintDto,
} from '../dto';
import { SalesLedgerService } from '../../accounting/services/sales-ledger.service';
import { NotificationService } from '@/modules/notification/notification.service';
import { NOTIFICATION_TYPES } from '@/modules/notification/dto/notification.dto';
import { KakaoAlimtalkService } from '@/common/kakao-alimtalk/kakao-alimtalk.service';
import { PrintPdfSlipPrinterService } from '@/modules/print-pdf/services/print-pdf-slip-printer.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private prisma: PrismaService,
    private systemSettings: SystemSettingsService,
    private salesLedgerService: SalesLedgerService,
    private fileStorage: FileStorageService,
    private pdfGenerator: PdfGeneratorService,
    private thumbnailService: ThumbnailService,
    private b2Storage: B2StorageService,
    private auditLogService: AuditLogService,
    private notificationService: NotificationService,
    private kakaoAlimtalk: KakaoAlimtalkService,
    private slipPrinter: PrintPdfSlipPrinterService,
  ) { }

  private readonly STATUS_LABELS: Record<string, string> = {
    receipt_completed: '접수완료',
    in_production: '생산진행',
    ready_for_shipping: '배송준비',
    shipped: '배송완료',
  };

  private async sendOrderStatusSms(orderId: string, newStatus: string): Promise<void> {
    const label = this.STATUS_LABELS[newStatus];
    if (!label) return;

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          orderNumber: true,
          client: {
            select: {
              mobile: true,
              phone: true,
              email: true,
              clientName: true,
              smsNotificationStages: true,
              notificationChannel: true,
            },
          },
        },
      });
      if (!order?.client) return;

      const { mobile, phone, email, clientName, smsNotificationStages, notificationChannel } = order.client;
      if (!smsNotificationStages.includes(newStatus)) return;

      const contactNo = mobile || phone;
      if (!contactNo) return;

      const text = `[포토카페] ${clientName}님, 주문번호 ${order.orderNumber} 공정이 [${label}] 단계로 변경되었습니다.`;

      if (notificationChannel === 'kakao') {
        // 카카오 알림톡 → SMS fallback 자동 처리
        await this.kakaoAlimtalk.send({
          templateCode: 'ORDER_STATUS_CHANGE',
          recipients: [{ phone: contactNo, email: email || undefined, name: clientName }],
          variables: {
            '#{고객명}': clientName,
            '#{주문번호}': order.orderNumber,
            '#{공정}': label,
            '#{내용}': text,
          },
          emailFallback: { subject: `[포토카페] 주문 공정 변경 알림`, html: `<p>${text}</p>` },
        });
      } else {
        await this.kakaoAlimtalk.sendPlainSms(contactNo, text);
      }
    } catch (err) {
      this.logger.error(`주문 상태 알림 발송 실패: ${(err as Error).message}`);
    }
  }

  /**
   * staff 직원의 salesViewScope 조회
   * 'own' 이고 isSuperAdmin=false 면 staffId 반환 → client.assignedManager 필터에 사용
   * 그 외엔 undefined (전체 조회)
   */
  async getStaffSalesScopeId(staffId: string): Promise<string | undefined> {
    if (!staffId) return undefined;
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, isSuperAdmin: true, salesViewScope: true },
    });
    if (!staff || staff.isSuperAdmin) return undefined;
    return staff.salesViewScope === 'own' ? staff.id : undefined;
  }

  private getContentType(fileName: string, fallback = 'application/octet-stream'): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.avif')) return 'image/avif';
    if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'image/tiff';
    if (lower.endsWith('.pdf')) return 'application/pdf';
    return fallback;
  }

  private sanitizeStorageKeyPart(value: string): string {
    return value
      .replace(/\\/g, '/')
      .replace(/^\.+/, '')
      .replace(/\.\./g, '_')
      .replace(/[^a-zA-Z0-9._/-]/g, '_');
  }

  private async uploadMovedFileToB2(
    orderNumber: string,
    moved: { original: string; thumbnail: string; fileName: string },
  ): Promise<{ uploadedOriginal: boolean; publicThumbnailUrl: string | null; publicThumbnailKey: string | null }> {
    if (!this.b2Storage.isEnabled()) {
      return { uploadedOriginal: false, publicThumbnailUrl: null, publicThumbnailKey: null };
    }

    try {
      const { readFile } = await import('fs/promises');
      const safeOrder = this.sanitizeStorageKeyPart(orderNumber);
      const safeName = this.sanitizeStorageKeyPart(moved.fileName);
      const originalKey = `orders/${safeOrder}/originals/${safeName}`;
      const originalBuffer = await readFile(moved.original);
      await this.b2Storage.putPrivateObject(
        originalKey,
        originalBuffer,
        this.getContentType(moved.fileName),
      );

      if (moved.thumbnail && this.b2Storage.getPublicBucket()) {
        const thumbName = this.sanitizeStorageKeyPart(this.fileStorage.getThumbName(moved.fileName));
        const thumbKey = `orders/${safeOrder}/thumbnails/${thumbName}`;
        const thumbBuffer = await readFile(moved.thumbnail);
        await this.b2Storage.putPublicObject(thumbKey, thumbBuffer, 'image/jpeg');
        return {
          uploadedOriginal: true,
          publicThumbnailUrl: this.b2Storage.getPublicObjectUrl(thumbKey),
          publicThumbnailKey: thumbKey,
        };
      }

      return { uploadedOriginal: true, publicThumbnailUrl: null, publicThumbnailKey: null };
    } catch (err) {
      this.logger.warn(`B2 업로드 실패 (order: ${orderNumber}, file: ${moved.fileName}) - ${(err as Error).message}`);
      return { uploadedOriginal: false, publicThumbnailUrl: null, publicThumbnailKey: null };
    }
  }

  async getOrderFileAccessUrl(fileId: string, actor?: {
    id?: string;
    sub?: string;
    name?: string;
    username?: string;
    employeeId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{
    fileId: string;
    url: string;
    source: 'b2-presigned' | 'local';
    expiresIn: number | null;
  }> {
    const file = await this.prisma.orderFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        orderItem: {
          select: {
            order: {
              select: { orderNumber: true },
            },
          },
        },
      },
    });
    if (!file) {
      throw new NotFoundException('파일을 찾을 수 없습니다.');
    }

    const localUrl = file.fileUrl;
    const performedBy = actor?.id || actor?.sub || 'system';
    const performerName = actor?.name || actor?.username || actor?.employeeId || 'system';

    if (!this.b2Storage.isEnabled()) {
      await this.auditLogService.log({
        entityType: 'order_file',
        entityId: file.id,
        action: 'file_access_url_issued',
        performedBy,
        performerName,
        ipAddress: actor?.ipAddress,
        userAgent: actor?.userAgent,
        metadata: {
          source: 'local',
          reason: 'b2_not_configured',
          orderNumber: file.orderItem?.order?.orderNumber || null,
          fileName: file.fileName,
        },
      });
      return { fileId: file.id, url: localUrl, source: 'local', expiresIn: null };
    }

    try {
      const orderNumber = file.orderItem?.order?.orderNumber;
      if (!orderNumber) {
        return { fileId: file.id, url: localUrl, source: 'local', expiresIn: null };
      }

      const key = `orders/${this.sanitizeStorageKeyPart(orderNumber)}/originals/${this.sanitizeStorageKeyPart(file.fileName)}`;
      const fromEnv = parseInt(process.env.B2_PRESIGN_EXPIRES_IN || '300', 10);
      const expiresIn = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 300;
      const url = await this.b2Storage.getPrivatePresignedUrl(key, expiresIn);
      await this.auditLogService.log({
        entityType: 'order_file',
        entityId: file.id,
        action: 'file_access_url_issued',
        performedBy,
        performerName,
        ipAddress: actor?.ipAddress,
        userAgent: actor?.userAgent,
        metadata: {
          source: 'b2-presigned',
          expiresIn,
          orderNumber,
          fileName: file.fileName,
          key,
        },
      });
      return { fileId: file.id, url, source: 'b2-presigned', expiresIn };
    } catch (err) {
      this.logger.warn(`프리사인드 URL 생성 실패(fileId=${file.id}): ${(err as Error).message}`);
      await this.auditLogService.log({
        entityType: 'order_file',
        entityId: file.id,
        action: 'file_access_url_issued',
        performedBy,
        performerName,
        ipAddress: actor?.ipAddress,
        userAgent: actor?.userAgent,
        metadata: {
          source: 'local',
          reason: 'presign_failed',
          orderNumber: file.orderItem?.order?.orderNumber || null,
          fileName: file.fileName,
          error: (err as Error).message,
        },
      });
      return { fileId: file.id, url: localUrl, source: 'local', expiresIn: null };
    }
  }

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

    // 형식: YYMMDD-NNN (999 이하) 또는 YYMMDD-NNNN (1000 이상)
    const digits = sequence >= 1000 ? 4 : 3;
    return `${dateStr}-${sequence.toString().padStart(digits, '0')}`;
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

    // 미해결 ID → Client 테이블 (User 통합됨)
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

  /** 관리자 주문목록 — 세부 공정 탭 필터 */
  private buildProductionStageWhere(stage: string): Prisma.OrderWhereInput {
    switch (stage) {
      // 검수 보류 이력이 있는 receipt_pending 만 보류 (신규 주문도 receipt_pending 이라 이력으로 구분)
      case 'reception_hold':
        return {
          status: ORDER_STATUS.PENDING_RECEIPT,
          currentProcess: PROCESS_STATUS.RECEIPT_PENDING,
          processHistory: {
            some: { processType: INSPECTION_PROCESS_TYPES.INSPECTION_HOLD },
          },
        };
      // 접수대기: 파일검수(inspection) 제외 + (보류 전용 receipt_pending+보류이력) 제외 — 신규 receipt_pending 포함
      case 'reception_pending':
        return {
          status: ORDER_STATUS.PENDING_RECEIPT,
          AND: [
            { NOT: { currentProcess: PROCESS_STATUS.INSPECTION } },
            {
              NOT: {
                AND: [
                  { currentProcess: PROCESS_STATUS.RECEIPT_PENDING },
                  {
                    processHistory: {
                      some: { processType: INSPECTION_PROCESS_TYPES.INSPECTION_HOLD },
                    },
                  },
                ],
              },
            },
          ],
        };
      case 'reception_done':
        return { status: ORDER_STATUS.RECEIPT_COMPLETED };
      case 'print_queue':
        return {
          OR: [
            { status: 'print_waiting' },
            { status: ORDER_STATUS.IN_PRODUCTION, currentProcess: 'print_waiting' },
          ],
        };
      case 'data_inspection':
        return {
          status: ORDER_STATUS.PENDING_RECEIPT,
          currentProcess: PROCESS_STATUS.INSPECTION,
        };
      case 'finishing_wait':
        return {
          status: ORDER_STATUS.IN_PRODUCTION,
          currentProcess: PROCESS_STATUS.POST_PROCESSING,
        };
      case 'finishing_progress':
        return {
          status: ORDER_STATUS.IN_PRODUCTION,
          currentProcess: PROCESS_STATUS.BINDING,
        };
      case 'outbound_qc':
        return { status: ORDER_STATUS.READY_FOR_SHIPPING };
      case 'shipping_progress':
        return {
          status: ORDER_STATUS.SHIPPED,
          OR: [{ shipping: null }, { shipping: { deliveredAt: null } }],
        };
      case 'shipping_done':
        return {
          status: ORDER_STATUS.SHIPPED,
          shipping: { deliveredAt: { not: null } },
        };
      default:
        return {};
    }
  }

  // ==================== 주문 목록 조회 ====================
  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    searchType?: string;
    clientId?: string;
    createdByUserId?: string;
    status?: string;
    /** 관리자 주문목록 세부 단계 탭 — 있으면 status 필터 대신 적용 */
    productionStage?: string;
    startDate?: Date;
    endDate?: Date;
    isUrgent?: boolean;
    clientAssignedStaffId?: string; // salesViewScope='own' 일 때 staff.id
  }) {
    const {
      skip = 0,
      take = 20,
      search,
      searchType,
      clientId,
      createdByUserId,
      status,
      productionStage,
      startDate,
      endDate,
      isUrgent,
      clientAssignedStaffId,
    } = params;

    // 날짜 문자열("YYYY-MM-DD")을 KST 기준으로 해석
    // new Date("2026-02-20") = UTC 자정이므로, KST 자정(UTC-9h)으로 보정
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
    let adjustedStartDate: Date | undefined;
    let adjustedEndDate: Date | undefined;
    if (startDate) {
      adjustedStartDate = new Date(startDate.getTime() - KST_OFFSET_MS);
    }
    if (endDate) {
      // KST 해당일 자정 - 9h + 24h - 1ms = KST 23:59:59.999 in UTC
      adjustedEndDate = new Date(endDate.getTime() - KST_OFFSET_MS + 24 * 60 * 60 * 1000 - 1);
    }

    // searchType에 따라 검색 조건 분기
    let searchCondition: Prisma.OrderWhereInput | undefined;
    if (search) {
      switch (searchType) {
        case 'orderTitle':
          // 주문제목 = 폴더명(folderName) 검색
          searchCondition = {
            items: { some: { folderName: { contains: search, mode: 'insensitive' } } },
          };
          break;
        case 'productName':
          // 주문내용 = 상품명 검색
          searchCondition = {
            items: { some: { productName: { contains: search, mode: 'insensitive' } } },
          };
          break;
        case 'spec':
          // 재질 및 규격 = 사이즈, 용지, 제본, 커버재질 검색
          searchCondition = {
            items: {
              some: {
                OR: [
                  { size: { contains: search, mode: 'insensitive' } },
                  { paper: { contains: search, mode: 'insensitive' } },
                  { bindingType: { contains: search, mode: 'insensitive' } },
                  { coverMaterial: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          };
          break;
        case 'orderNumber':
        default:
          // 주문번호 (기본) + 상품명/폴더명 통합 검색
          searchCondition = {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { client: { clientName: { contains: search, mode: 'insensitive' } } },
              { items: { some: { productName: { contains: search, mode: 'insensitive' } } } },
              { items: { some: { folderName: { contains: search, mode: 'insensitive' } } } },
            ],
          };
          break;
      }
    }

    // status 는 단일값 또는 쉼표구분 다중값 허용 (예: "in_production,print_waiting")
    let statusCondition: any = undefined;
    if (status && !productionStage) {
      const parts = status.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length === 1) statusCondition = parts[0];
      else if (parts.length > 1) statusCondition = { in: parts };
    }

    const stageWhere = productionStage ? this.buildProductionStageWhere(productionStage) : undefined;

    const where: Prisma.OrderWhereInput = {
      ...searchCondition,
      ...(clientId && { clientId }),
      ...(createdByUserId && { createdByUserId }),
      ...(clientAssignedStaffId && {
        client: { assignedManager: clientAssignedStaffId },
      }),
      ...(stageWhere ?? (statusCondition !== undefined ? { status: statusCondition } : {})),
      ...(isUrgent !== undefined && { isUrgent }),
      ...(adjustedStartDate || adjustedEndDate
        ? {
          orderedAt: {
            ...(adjustedStartDate && { gte: adjustedStartDate }),
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
              assignedManager: true,
              assignedStaff: {
                orderBy: { isPrimary: 'desc' },
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
              foilPosition: true,
              finishingOptions: true,
              fabricName: true,
              fabricSnapshot: true,
              folderName: true,
              thumbnailUrl: true,
              totalFileSize: true,
              pageLayout: true,
              bindingDirection: true,
              printSide: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              originalsDeleted: true,
              pdfStatus: true,
              slipAutoPrintedAt: true,
              files: {
                where: { deletedAt: null },
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
          salesLedger: {
            select: {
              id: true,
              receivedAmount: true,
              outstandingAmount: true,
              paymentStatus: true,
              totalAmount: true,
            },
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

    // assignedManager(거래처 영업담당자) ID → 이름 변환
    const managerIds = Array.from(
      new Set(
        data
          .map(o => (o.client as any)?.assignedManager as string | null | undefined)
          .filter((id): id is string => !!id),
      ),
    );
    const managerNameMap: Record<string, string> = {};
    if (managerIds.length > 0) {
      const managerRecords = await this.prisma.staff.findMany({
        where: { id: { in: managerIds } },
        select: { id: true, name: true },
      });
      managerRecords.forEach(s => { managerNameMap[s.id] = s.name; });
    }

    // 각 주문 아이템별 원본 파일(uploaded) 수 조회
    const allItemIds = data.flatMap(order => order.items.map(item => item.id));
    const originalFileCounts = allItemIds.length > 0
      ? await this.prisma.orderFile.groupBy({
          by: ['orderItemId'],
          where: {
            orderItemId: { in: allItemIds },
            originalPath: { not: null },
            storageStatus: 'uploaded',
            deletedAt: null,
          },
          _count: true,
        })
      : [];
    const originalCountMap = new Map(
      originalFileCounts.map(r => [r.orderItemId, r._count]),
    );

    // 규격명 → nup 조회 (specificationId FK가 없는 아이템을 위한 size 이름 기반 fallback)
    const normalizeSize = (s: string) => s.replace(/[×✕]/g, 'x').replace(/인치$/, '').trim();
    const sizeSet = new Set<string>();
    data.forEach(order => order.items.forEach((item: any) => {
      if (item.size) { sizeSet.add(item.size); sizeSet.add(normalizeSize(item.size)); }
    }));
    const specNupRows = sizeSet.size > 0
      ? await this.prisma.specification.findMany({
          where: { name: { in: Array.from(sizeSet) } },
          select: { name: true, nup: true },
        })
      : [];
    const sizeNupMap = new Map(specNupRows.map(s => [s.name, s.nup]));

    const enrichedData = data.map(order => {
      const client = order.client as any;
      const managerId = client?.assignedManager as string | null | undefined;
      const managerName = managerId ? managerNameMap[managerId] || null : null;
      // assignedManager(단일 컬럼) 우선, 없으면 assignedStaff(junction) fallback
      const fallbackStaffName = client?.assignedStaff?.[0]?.staff?.name || null;
      return {
        ...order,
        client: {
          ...client,
          managerName: managerName || fallbackStaffName,
        },
        items: order.items.map((item: any) => ({
          ...item,
          originalFileCount: originalCountMap.get(item.id) || 0,
          nup: sizeNupMap.get(item.size) || sizeNupMap.get(normalizeSize(item.size || '')) || null,
        })),
        processHistory: order.processHistory?.map(h => ({
          ...h,
          processedByName: nameMap[h.processedBy] || '-',
        })),
      };
    });

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
            files: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
            shipping: true,
          },
        },
        processHistory: {
          orderBy: { processedAt: 'desc' },
          take: 50,
        },
        salesLedger: {
          select: {
            receivedAmount: true,
            outstandingAmount: true,
            paymentStatus: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다');
    }

    // 파일 보관정책 정보 계산
    const retentionDays = (order.client as any).fileRetentionDays ?? 90;
    const retentionMonths = Math.round(retentionDays / 30);
    const shippedAt = order.shipping?.shippedAt;
    let retentionDeadline: string | null = null;
    let isExpired = false;

    if (shippedAt) {
      const deadline = new Date(shippedAt);
      deadline.setDate(deadline.getDate() + retentionDays);
      retentionDeadline = deadline.toISOString();
      isExpired = new Date() > deadline;
    }

    return {
      ...order,
      fileRetention: { retentionMonths, shippedAt, retentionDeadline, isExpired },
    };
  }

  // ==================== 주문 생성 (트랜잭션 + Advisory Lock으로 주문번호 원자적 생성) ====================
  async create(dto: CreateOrderDto, userId: string, createdByUserId?: string): Promise<any> {
    const { items, shipping, ...orderData } = dto;

    // 거래처 확인 (트랜잭션 밖에서 수행)
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다');
    }

    // temp 파일 존재 검증 (세션 복원 등으로 만료된 temp URL 참조 방지)
    // 파일이 있는데 전부 temp 경로를 참조하고, 해당 temp 폴더가 비어있거나 없으면 에러
    for (const item of items) {
      if (!item.files?.length) continue;
      const firstUrl = item.files[0].fileUrl || '';
      if (!firstUrl.includes('/temp/')) continue;
      const parts = firstUrl.replace(/\\/g, '/').split('/temp/');
      if (parts.length < 2) continue;
      const tempFolderId = parts[1].split('/')[0];
      const tempOriginalsDir = this.fileStorage.getTempOriginalsDir(tempFolderId);
      const { readdirSync, existsSync } = require('fs');
      let uploadedCount = 0;
      if (existsSync(tempOriginalsDir)) {
        try { uploadedCount = readdirSync(tempOriginalsDir).length; } catch { /* ignore */ }
      }
      if (uploadedCount === 0) {
        throw new BadRequestException(
          `업로드된 파일이 만료되었거나 존재하지 않습니다.\n` +
          `장바구니에서 "${item.folderName || '해당 항목'}" 항목을 삭제한 뒤, 상품 페이지에서 파일을 다시 업로드해주세요.`,
        );
      }
    }

    // colorIntentCode → colorIntentId 자동 매핑 (트랜잭션 밖에서 1회 조회)
    const colorIntents = await this.prisma.colorIntent.findMany();
    const colorIntentByCode = new Map(colorIntents.map(ci => [ci.code, ci.id]));

    // printMethod에서 colorIntentCode 자동 도출 (프론트엔드가 보내지 않은 경우)
    const resolveColorIntentId = (item: CreateOrderItemDto): string | null => {
      // 1) colorIntentCode 직접 전달된 경우
      if (item.colorIntentCode) {
        return colorIntentByCode.get(item.colorIntentCode) || null;
      }
      // 2) printMethod에서 자동 도출 (인디고6도→6도, 인디고4도→4도 등)
      const pm = (item.printMethod || '').toLowerCase();
      if (pm.includes('잉크젯') || pm.includes('inkjet')) return null; // 잉크젯은 불필요
      const is6c = pm.includes('6도') || pm.includes('6c');
      const isSingle = item.printSide === 'single' || (item.pageLayout !== 'spread');
      if (is6c) {
        return colorIntentByCode.get(isSingle ? 'CI-6C-1S' : 'CI-6C-2S') || null;
      }
      // 기본: 4도
      return colorIntentByCode.get(isSingle ? 'CI-4C-1S' : 'CI-4C-2S') || null;
    };

    // L4 최종 방어선: 필수 필드 검증 (누락 시 주문 차단)
    const validationErrors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const label = item.folderName || item.productName || `항목 ${i + 1}`;

      // 공통 필수 필드
      if (!item.productName) validationErrors.push(`[${label}] 상품명이 없습니다`);
      if (!item.size) validationErrors.push(`[${label}] 규격이 설정되지 않았습니다`);
      if (!item.paper) validationErrors.push(`[${label}] 용지가 설정되지 않았습니다`);
      if (!item.bindingType) validationErrors.push(`[${label}] 제본방식이 설정되지 않았습니다`);
      if (!item.printMethod) validationErrors.push(`[${label}] 출력기종이 설정되지 않았습니다`);
      if (!item.quantity || item.quantity < 1) validationErrors.push(`[${label}] 수량이 올바르지 않습니다`);
      if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice < 0) {
        validationErrors.push(`[${label}] 단가가 올바르지 않습니다`);
      }

      const pm = (item.printMethod || '').toLowerCase();
      const isIndigo = pm.includes('인디고') || pm.includes('indigo');
      if (isIndigo && !resolveColorIntentId(item)) {
        validationErrors.push(`[${label}] 인디고 도수(4도/6도) 정보를 확인할 수 없습니다`);
      }

      // 앨범 주문 특유 검증 (files 존재 시 = 앨범 주문으로 간주)
      if (item.files && item.files.length > 0) {
        if (!item.pageLayout) validationErrors.push(`[${label}] 편집스타일(낱장/펼침면)이 설정되지 않았습니다`);
        if (!item.bindingDirection) validationErrors.push(`[${label}] 제본방향이 설정되지 않았습니다`);
        if (!item.pages || item.pages < 1) validationErrors.push(`[${label}] 페이지 수가 올바르지 않습니다`);
      }
    }
    if (validationErrors.length > 0) {
      throw new BadRequestException(
        `주문 정보가 누락되어 주문을 생성할 수 없습니다:\n${validationErrors.join('\n')}`,
      );
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
          colorIntentId: resolveColorIntentId(item),
          coverMaterial: item.coverMaterial,
          foilName: item.foilName,
          foilColor: item.foilColor,
          foilPosition: item.foilPosition,
          finishingOptions: item.finishingOptions || [],
          fabricName: item.fabricName,
          fabricSnapshot: item.fabricSnapshot ?? Prisma.JsonNull,
          thumbnailUrl: item.thumbnailUrl,
          totalFileSize: item.totalFileSize ? BigInt(item.totalFileSize) : BigInt(0),
          folderName: item.folderName?.trim().replace(/\s+/g, ' '),
          pageLayout: item.pageLayout,
          bindingDirection: item.bindingDirection,
          printSide: item.printSide ?? (item.pageLayout === 'spread' ? 'double' : 'single'),
          ...(item.fileSpecId ? { fileSpecId: item.fileSpecId } : {}),
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
                fareType: item.shipping.fareType,
                deliveryMemo: item.shipping.deliveryMemo,
              },
            },
          } : {}),
        };
      });

      // 항목별 배송비가 없으면 주문 단위 배송비 사용
      if (totalShippingFee === 0 && dto.shippingFee) {
        totalShippingFee = dto.shippingFee;
      }

      // conditional 거래처: 당일 이미 배송비가 청구된 스튜디오 배송 주문이 있으면 배송비 0 자동 적용
      // (고객직배송 아이템이 포함된 주문은 합배송 대상 아님)
      if (totalShippingFee > 0 && (client as any).shippingType === 'conditional') {
        const hasDirectCustomer = items.some(i => i.shipping?.receiverType === 'direct_customer');
        if (!hasDirectCustomer) {
          const KST_OFFSET_BUNDLE = 9 * 60 * 60 * 1000;
          const nowKstBundle = Date.now() + KST_OFFSET_BUNDLE;
          const kstMidnightBundle = nowKstBundle - (nowKstBundle % (24 * 60 * 60 * 1000));
          const todayStartBundle = new Date(kstMidnightBundle - KST_OFFSET_BUNDLE);
          const todayEndBundle = new Date(kstMidnightBundle - KST_OFFSET_BUNDLE + 24 * 60 * 60 * 1000 - 1);

          const todayOrdersWithFee = await tx.order.findMany({
            where: {
              clientId: dto.clientId,
              orderedAt: { gte: todayStartBundle, lte: todayEndBundle },
              status: { not: 'cancelled' },
              shippingFee: { gt: 0 },
            },
            select: {
              orderNumber: true,
              items: { select: { shipping: { select: { receiverType: true } } } },
            },
          });

          const existingStudioOrder = todayOrdersWithFee.find(o =>
            !o.items.some(i => i.shipping?.receiverType === 'direct_customer'),
          );

          if (existingStudioOrder) {
            this.logger.log(`합배송 자동 적용: 거래처 ${dto.clientId}, 기준 주문 ${existingStudioOrder.orderNumber} → 배송비 0원 (원래 ${totalShippingFee}원)`);
            totalShippingFee = 0;
          }
        }
      }

      const tax = 0; // 가격은 부가세 포함 금액
      const totalAmount = productPrice;

      // Race condition 방어: adjustmentAmount > 0 (합배송 환급)인 경우
      // 트랜잭션 안에서 당일 이미 적용된 환급 누계를 재확인하여 중복 환급 차단
      let adjustmentAmount = dto.adjustmentAmount ?? 0;
      if (adjustmentAmount > 0) {
        // KST 기준 오늘 범위: UTC로 변환 (KST = UTC+9)
        const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
        const nowUtc = Date.now();
        const nowKst = nowUtc + KST_OFFSET_MS;
        const kstMidnight = nowKst - (nowKst % (24 * 60 * 60 * 1000));
        const todayStart = new Date(kstMidnight - KST_OFFSET_MS);
        const todayEnd = new Date(kstMidnight - KST_OFFSET_MS + 24 * 60 * 60 * 1000 - 1);
        const alreadyRefunded = await tx.order.aggregate({
          where: {
            clientId: dto.clientId,
            orderedAt: { gte: todayStart, lte: todayEnd },
            status: { not: 'cancelled' },
          },
          _sum: { adjustmentAmount: true },
        });
        const alreadyRefundedTotal = Number(alreadyRefunded._sum.adjustmentAmount ?? 0);
        const cappedAdjustment = Math.max(0, adjustmentAmount - alreadyRefundedTotal);

        // 잘린 초과분 → 고객 부채(음수)로 pending에 이월 저장
        const excess = adjustmentAmount - cappedAdjustment;
        if (excess > 0) {
          const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
          await tx.client.update({
            where: { id: dto.clientId },
            data: {
              pendingAdjustmentAmount: { decrement: excess },
              pendingAdjustmentReason: `${today} 합배송 환급 중 중복 발생 (다음 주문 복구: ${excess.toLocaleString()}원)`,
              pendingAdjustmentAt: new Date(),
            } as any,
          });
          this.logger.warn(`합배송 중복환급 감지 → pending 이월: 거래처 ${dto.clientId}, 금액 -${excess}원`);
        }

        adjustmentAmount = cappedAdjustment;
      }

      // 미결 조정금액(pendingAdjustment) 자동 적용 후 초기화
      // 양수: 다음 주문 할인(크레딧), 음수: 다음 주문 추가청구(부채)
      const clientForPending = await tx.client.findUnique({
        where: { id: dto.clientId },
        select: { pendingAdjustmentAmount: true, pendingAdjustmentReason: true } as any,
      }) as { pendingAdjustmentAmount: any; pendingAdjustmentReason: string | null } | null;
      const pendingAdj = Number(clientForPending?.pendingAdjustmentAmount ?? 0);
      if (pendingAdj !== 0) {
        adjustmentAmount += pendingAdj;
        await tx.client.update({
          where: { id: dto.clientId },
          data: { pendingAdjustmentAmount: 0, pendingAdjustmentReason: null, pendingAdjustmentAt: null } as any,
        });
        this.logger.log(`미결 조정금액 적용 완료: 거래처 ${dto.clientId}, 금액 ${pendingAdj}원`);
      }

      return tx.order.create({
        data: {
          orderNumber,
          barcode,
          clientId: dto.clientId,
          ...(createdByUserId && { createdByUserId }),
          productPrice,
          shippingFee: totalShippingFee,
          tax,
          adjustmentAmount,
          totalAmount: totalAmount + totalShippingFee,
          finalAmount: totalAmount + totalShippingFee - adjustmentAmount,
          paymentMethod: dto.paymentMethod,
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
            create: [
              {
                toStatus: ORDER_STATUS.PENDING_RECEIPT,
                processType: 'order_created',
                processedBy: userId,
              },
              // 조정금액이 있으면 사유 이력 자동 기록
              ...(adjustmentAmount !== 0 ? [{
                fromStatus: ORDER_STATUS.PENDING_RECEIPT,
                toStatus: ORDER_STATUS.PENDING_RECEIPT,
                processType: 'admin_adjustment',
                note: (() => {
                  const parts: string[] = [];
                  const origAdj = dto.adjustmentAmount ?? 0;
                  if (origAdj > 0) parts.push(`합배송 환급 ${origAdj.toLocaleString()}원`);
                  if (pendingAdj > 0) parts.push(`미결 크레딧 적용 ${pendingAdj.toLocaleString()}원`);
                  if (pendingAdj < 0) parts.push(`미결 추가청구 ${Math.abs(pendingAdj).toLocaleString()}원`);
                  return parts.length > 0 ? parts.join(' + ') : `조정금액 ${adjustmentAmount.toLocaleString()}원`;
                })(),
                processedBy: userId,
              }] : []),
            ],
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

    // 임시 파일 → 정식 경로 이동 (백그라운드 처리)
    // 이미 트랜잭션 시작 전 temp 파일 존재가 검증되었으므로 응답 후 비동기 실행으로 체감 속도 개선
    // OrderFile.storageStatus 가 'pending' → 'uploaded' 로 갱신되며, 실패 시 로그로 추적/복구
    this.moveTemporaryFiles(order)
      .then(() => this.logger.log(`[주문생성] moveTemporaryFiles 완료 (주문: ${order.orderNumber})`))
      .catch((err) => this.logger.error(
        `임시 파일 이동 최종 실패 (주문: ${order.orderNumber}):`,
        (err as Error).message,
        (err as Error).stack,
      ));

    // 매출원장 자동 등록 (백그라운드 처리, 실패 시 로그)
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
      items: (order as any).items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        size: item.size,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    }, userId)
      .catch((err) => this.logger.error(
        `매출원장 자동등록 실패 (주문번호: ${order.orderNumber}):`,
        (err as Error).message,
      ));

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

  // ==================== status → currentProcess 자동 매핑 ====================
  private getDefaultProcessForStatus(status: string): string | null {
    const STATUS_TO_PROCESS: Record<string, string> = {
      pending_receipt: 'reception_waiting',
      receipt_completed: 'reception_complete',
      in_production: 'print_waiting',
      ready_for_shipping: 'shipping_waiting',
      shipped: 'shipping',
      cancelled: 'order_cancelled',
    };
    return STATUS_TO_PROCESS[status] || null;
  }

  // ==================== 출력대기 큐 상태 전이 계산 ====================
  // 주문 status가 변경될 때 printQueueStatus를 어떻게 바꿔야 하는지 계산.
  // 반환값이 null이면 변경 없음. Why: 출력대기 목록 멤버십을 status+currentProcess 조합에
  // 의존하지 않고 별도 플래그로 관리하여, 의도치 않은 상태 변경으로 목록에서 사라지지 않도록 함.
  private computeQueueTransition(
    currentQueueStatus: string | null,
    oldOrderStatus: string,
    newOrderStatus: string,
  ): { next: string; processType: string; reason: string } | null {
    // 진입: 생산진행 진입 + 아직 큐 상태 미설정 → pending
    if (newOrderStatus === ORDER_STATUS.IN_PRODUCTION && !currentQueueStatus) {
      return {
        next: PRINT_QUEUE_STATUS.PENDING,
        processType: PRINT_QUEUE_PROCESS_TYPES.ENTERED,
        reason: `status_change:${oldOrderStatus}→${newOrderStatus}`,
      };
    }
    // pending 상태에서만 이탈 판정 (printed/skipped는 이미 이탈한 상태)
    if (currentQueueStatus !== PRINT_QUEUE_STATUS.PENDING) return null;

    // 배송준비/배송완료 → printed (정상 진행)
    if (
      newOrderStatus === ORDER_STATUS.READY_FOR_SHIPPING ||
      newOrderStatus === ORDER_STATUS.SHIPPED
    ) {
      return {
        next: PRINT_QUEUE_STATUS.PRINTED,
        processType: PRINT_QUEUE_PROCESS_TYPES.EXITED_PRINTED,
        reason: `status_change:${oldOrderStatus}→${newOrderStatus}`,
      };
    }
    // 취소 → skipped
    if (newOrderStatus === ORDER_STATUS.CANCELLED) {
      return {
        next: PRINT_QUEUE_STATUS.SKIPPED,
        processType: PRINT_QUEUE_PROCESS_TYPES.EXITED_SKIPPED,
        reason: `status_change:${oldOrderStatus}→${newOrderStatus}`,
      };
    }
    // pending_receipt/receipt_completed로의 롤백은 pending 유지 (롤백 후 재생산 시나리오 대비)
    return null;
  }

  // 큐 전이 결과를 data에 병합하여 반환 (DB update data와 합쳐 1회 트랜잭션 처리).
  // historyEntry를 반환하여 호출자가 processHistory.create에 함께 넣을 수 있도록 함.
  private buildQueueTransitionPatch(transition: ReturnType<OrderService['computeQueueTransition']>) {
    if (!transition) return { data: {}, historyEntry: null };
    const now = new Date();
    const data: any = { printQueueStatus: transition.next };
    if (transition.next === PRINT_QUEUE_STATUS.PENDING) {
      data.printQueueEnteredAt = now;
      data.printQueueExitedAt = null;
      data.printQueueExitReason = null;
    } else {
      data.printQueueExitedAt = now;
      data.printQueueExitReason = transition.reason;
    }
    const historyEntry = {
      fromStatus: transition.processType === PRINT_QUEUE_PROCESS_TYPES.ENTERED
        ? ''
        : PRINT_QUEUE_STATUS.PENDING,
      toStatus: transition.next,
      processType: transition.processType,
      note: `[출력대기] ${transition.reason}`,
    };
    return { data, historyEntry };
  }

  /**
   * 출력대기(print_waiting) 전: 승인·업로드된 파일이 있는 품목은 PDF 완료 + 작업지시서 출력 확정(slipAutoPrintedAt) 필수.
   */
  private async assertPrintWaitingRequirements(orderId: string): Promise<void> {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId },
      select: {
        id: true,
        productionNumber: true,
        folderName: true,
        productName: true,
        pdfStatus: true,
        slipAutoPrintedAt: true,
        files: {
          where: { inspectionStatus: 'approved', storageStatus: 'uploaded', deletedAt: null },
          select: { id: true },
        },
      },
    });

    const lines: string[] = [];
    for (const it of items) {
      if (it.files.length === 0) continue;
      const label = it.folderName || it.productionNumber || it.productName || it.id;
      const parts: string[] = [];
      if (it.pdfStatus !== 'completed') {
        if (it.pdfStatus === 'failed') parts.push('PDF 변환 실패');
        else if (it.pdfStatus === 'generating') parts.push('PDF 변환 중');
        else parts.push('PDF 미완료');
      }
      if (!it.slipAutoPrintedAt) {
        parts.push('작업지시서 미확정');
      }
      if (parts.length) {
        lines.push(`「${label}」 ${parts.join(', ')}`);
      }
    }

    if (lines.length > 0) {
      throw new BadRequestException(
        `출력대기로 바꾸려면 인쇄 대상 품목마다 PDF와 작업지시서가 모두 완료되어야 합니다.\n${lines.join('\n')}`,
      );
    }
  }

  /** 관리자: 브라우저에서 지시서 출력 후 "출력 완료" 기록 (PDF 완료 후에만 허용) */
  async confirmSlipPrintedByStaff(orderItemId: string): Promise<{ ok: boolean; reason?: string }> {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: {
        orderId: true,
        pdfStatus: true,
        slipAutoPrintedAt: true,
        order: { select: { status: true } },
      },
    });
    if (!item) throw new NotFoundException('품목을 찾을 수 없습니다.');
    if (item.order.status === ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('취소된 주문입니다.');
    }
    if (item.pdfStatus !== 'completed') {
      throw new BadRequestException('PDF가 완료된 뒤에만 작업지시서 출력 완료를 기록할 수 있습니다.');
    }
    if (item.slipAutoPrintedAt) {
      return { ok: true, reason: 'already' };
    }
    await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { slipAutoPrintedAt: new Date() },
    });
    return { ok: true };
  }

  // ==================== 주문 상태 변경 ====================
  async updateStatus(id: string, dto: UpdateOrderStatusDto, userId: string) {
    const order = await this.findOne(id);

    // ===== 단계변경 권한 체크 =====
    const staff = await this.prisma.staff.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true, canChangeReceptionStage: true, canChangeCancelStage: true },
    });
    if (staff && !staff.isSuperAdmin) {
      if (order.status === ORDER_STATUS.PENDING_RECEIPT && !staff.canChangeReceptionStage) {
        throw new ForbiddenException('접수대기 주문의 단계변경 권한이 없습니다.');
      }
      if (dto.status === 'cancelled' && !staff.canChangeCancelStage) {
        throw new ForbiddenException('주문취소 권한이 없습니다.');
      }
    }

    if (dto.status === 'print_waiting') {
      await this.assertPrintWaitingRequirements(id);
    }

    // currentProcess 결정: DTO에 명시 > status 기반 자동매핑 > 기존값 유지
    const currentProcess =
      dto.currentProcess ||
      this.getDefaultProcessForStatus(dto.status) ||
      order.currentProcess;

    // 출력대기 큐 전이 계산 (status 변경에 따라 printQueueStatus 자동 동기화)
    const transition = this.computeQueueTransition(
      (order as any).printQueueStatus ?? null,
      order.status,
      dto.status,
    );
    const queuePatch = this.buildQueueTransitionPatch(transition);

    const historyEntries: any[] = [
      {
        fromStatus: order.status,
        toStatus: dto.status,
        processType: 'status_change',
        note: dto.note,
        processedBy: userId,
      },
    ];
    if (queuePatch.historyEntry) {
      historyEntries.push({ ...queuePatch.historyEntry, processedBy: userId });
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        currentProcess,
        ...queuePatch.data,
        processHistory: { create: historyEntries },
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

    this.sendOrderStatusSms(id, dto.status).catch(() => {});
    return updated;
  }

  // ==================== 배송 정보 업데이트 ====================
  async updateShipping(id: string, dto: UpdateShippingDto) {
    const order = await this.findOne(id);

    if (order.status === ORDER_STATUS.SHIPPED) {
      throw new BadRequestException('배송완료된 주문의 배송정보는 수정할 수 없습니다.');
    }
    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('취소된 주문의 배송정보는 수정할 수 없습니다.');
    }

    return this.prisma.orderShipping.update({
      where: { orderId: id },
      data: {
        ...dto,
        ...(dto.trackingNumber && { shippedAt: new Date() }),
      },
    });
  }

  // ==================== 고객용 배송정보 수정 + 배송비 정산 ====================
  async updateShippingWithFee(id: string, dto: UpdateShippingWithFeeDto): Promise<UpdateShippingWithFeeResult> {
    const order = await this.findOne(id);

    if (order.status === ORDER_STATUS.SHIPPED) {
      throw new BadRequestException('배송완료된 주문의 배송정보는 수정할 수 없습니다.');
    }
    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('취소된 주문의 배송정보는 수정할 수 없습니다.');
    }

    const client = order.client as any;
    const currentShippingFee = Number(order.shippingFee ?? 0);

    // 새 receiverType에 따라 배송비 재계산
    const newReceiverType = dto.receiverType ?? order.shipping?.receiverType ?? '';
    let newShippingFee = currentShippingFee;

    if (newReceiverType === 'direct_customer') {
      // 고객 직배송: 택배 기본요금 조회
      const parcelPricing = await this.prisma.deliveryPricing.findUnique({
        where: { deliveryMethod: 'parcel' },
      });
      newShippingFee = parcelPricing ? Number(parcelPricing.baseFee ?? 0) : 0;
    } else if (newReceiverType === 'studio') {
      // 스튜디오 배송: 거래처 shippingType에 따라 계산
      const shippingType = client.shippingType ?? 'conditional';
      if (shippingType === 'free') {
        newShippingFee = 0;
      } else if (shippingType === 'conditional') {
        const threshold = Number(client.freeShippingThreshold ?? 90000);
        const productPrice = Number(order.productPrice ?? 0);
        if (productPrice >= threshold) {
          newShippingFee = 0;
        } else {
          const parcelPricing = await this.prisma.deliveryPricing.findUnique({
            where: { deliveryMethod: 'parcel' },
          });
          newShippingFee = parcelPricing ? Number(parcelPricing.baseFee ?? 0) : 0;
        }
      } else {
        // standard: 항상 택배요금
        const parcelPricing = await this.prisma.deliveryPricing.findUnique({
          where: { deliveryMethod: 'parcel' },
        });
        newShippingFee = parcelPricing ? Number(parcelPricing.baseFee ?? 0) : 0;
      }
    }

    const feeDifference = newShippingFee - currentShippingFee;

    let creditAdded = 0;
    let paymentRequired = false;
    let bankAccount: string | undefined;

    if (feeDifference > 0) {
      // 추가요금 발생 (스튜디오→고객직배송 등)
      paymentRequired = true;
      // 정산조건이 있거나(당월말 등) creditEnabled=true이면 여신거래 가능
      const canUseCredit = client.creditEnabled || !!client.paymentCondition;
      if (dto.paymentMethod === 'credit' && canUseCredit) {
        // 여신 거래: Client.pendingAdjustmentAmount에 음수 누적 (나중에 청구)
        await this.prisma.client.update({
          where: { id: client.id },
          data: {
            pendingAdjustmentAmount: { decrement: feeDifference },
            pendingAdjustmentReason: `주문 ${order.orderNumber} 배송정보 수정 추가배송비`,
            pendingAdjustmentAt: new Date(),
          },
        });
        paymentRequired = false;
      } else {
        // 무통장입금: 계좌정보 조회
        const bankName = await this.systemSettings.getValue('companyBankName', '');
        const bankAccountNum = await this.systemSettings.getValue('companyBankAccount', '');
        const bankHolder = await this.systemSettings.getValue('companyBankHolder', '');
        if (bankName || bankAccountNum) {
          bankAccount = `${bankName} ${bankAccountNum}${bankHolder ? ` (예금주: ${bankHolder})` : ''}`.trim();
        }
      }
    } else if (feeDifference < 0) {
      // 환불 발생 (고객직배송→스튜디오 등) → 포인트(크레딧) 적립
      creditAdded = Math.abs(feeDifference);
      await this.prisma.client.update({
        where: { id: client.id },
        data: {
          pendingAdjustmentAmount: { increment: creditAdded },
          pendingAdjustmentReason: `주문 ${order.orderNumber} 배송정보 수정 배송비 환불`,
          pendingAdjustmentAt: new Date(),
        },
      });
    }

    // 주문 shippingFee + finalAmount 업데이트
    const currentAdjustment = Number(order.adjustmentAmount ?? 0);
    const newFinalAmount = Number(order.productPrice ?? 0) + Number(order.tax ?? 0) + newShippingFee - currentAdjustment;

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id },
        data: {
          shippingFee: newShippingFee,
          finalAmount: newFinalAmount,
        },
      }),
      this.prisma.orderShipping.update({
        where: { orderId: id },
        data: {
          receiverType: dto.receiverType ?? undefined,
          recipientName: dto.recipientName,
          phone: dto.phone,
          postalCode: dto.postalCode,
          address: dto.address,
          addressDetail: dto.addressDetail ?? undefined,
          deliveryMemo: dto.deliveryMemo ?? undefined,
        },
      }),
    ]);

    return { feeDifference, newShippingFee, creditAdded, paymentRequired, bankAccount };
  }

  // ==================== 배송 완료 처리 ====================
  async markAsDelivered(id: string, userId: string) {
    const order = await this.findOne(id);

    // 출력대기 큐 전이 (pending → printed, 이미 인쇄 완료된 상태로 배송된 것으로 간주)
    const transition = this.computeQueueTransition(
      (order as any).printQueueStatus ?? null,
      order.status,
      ORDER_STATUS.SHIPPED,
    );
    const queuePatch = this.buildQueueTransitionPatch(transition);
    const historyEntries: any[] = [
      {
        fromStatus: order.status,
        toStatus: ORDER_STATUS.SHIPPED,
        processType: 'delivery_completed',
        processedBy: userId,
      },
    ];
    if (queuePatch.historyEntry) {
      historyEntries.push({ ...queuePatch.historyEntry, processedBy: userId });
    }

    return this.prisma.$transaction([
      this.prisma.orderShipping.update({
        where: { orderId: id },
        data: { deliveredAt: new Date() },
      }),
      this.prisma.order.update({
        where: { id },
        data: {
          status: ORDER_STATUS.SHIPPED,
          currentProcess: 'delivered',
          ...queuePatch.data,
          processHistory: { create: historyEntries },
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

    // 출력대기 큐 전이 (pending → skipped)
    const transition = this.computeQueueTransition(
      (order as any).printQueueStatus ?? null,
      order.status,
      ORDER_STATUS.CANCELLED,
    );
    const queuePatch = this.buildQueueTransitionPatch(transition);
    const historyEntries: any[] = [
      {
        fromStatus: order.status,
        toStatus: ORDER_STATUS.CANCELLED,
        processType: 'order_cancelled',
        note: reason,
        processedBy: userId,
      },
    ];
    if (queuePatch.historyEntry) {
      historyEntries.push({ ...queuePatch.historyEntry, processedBy: userId });
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: ORDER_STATUS.CANCELLED,
        currentProcess: 'order_cancelled',
        ...queuePatch.data,
        processHistory: { create: historyEntries },
      },
    });

    // 매출원장 취소 + 취소전표 생성
    try {
      const salesLedger = await this.prisma.salesLedger.findUnique({
        where: { orderId: id },
      });
      if (salesLedger) {
        await this.salesLedgerService.cancelSales(salesLedger.id);
      }
    } catch (err) {
      this.logger.warn(`주문 취소 시 매출원장 취소 실패 (${id}): ${(err as Error).message}`);
    }

    // 당일 합배송 배송비 재계산 (취소로 누적금액 미달 시 환급 취소 + 재청구 전표 생성)
    let shippingRecharged = false;
    let shippingRechargeAmount = 0;
    try {
      const rechargeResult = await this.recalculateSameDayShipping(order.clientId);
      shippingRecharged = rechargeResult.recharged;
      shippingRechargeAmount = rechargeResult.rechargeAmount;
    } catch (err) {
      this.logger.warn(`주문 취소 후 합배송 재계산 실패 (${id}): ${(err as Error).message}`);
    }

    return {
      ...updatedOrder,
      shippingRecharged,
      shippingRechargeAmount,
      effectiveRefundAmount: Math.max(0, Number(order.finalAmount) - shippingRechargeAmount),
    };
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
    const tax = 0; // 가격은 부가세 포함 금액
    const shippingFee = Number(order.shippingFee);
    const totalAmount = productPrice + shippingFee;

    // adjustmentAmount도 재계산에 반영
    const adjustmentAmount = Number(order.adjustmentAmount);
    const finalAmount = totalAmount - adjustmentAmount;

    await this.prisma.$transaction([
      this.prisma.orderItem.delete({ where: { id: itemId } }),
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          productPrice,
          tax,
          totalAmount,
          finalAmount: Math.max(0, finalAmount),
        },
      }),
    ]);

    // 당일 합배송 배송비 재계산 (항목 삭제로 누적금액 미달 시 환급 취소)
    try {
      await this.recalculateSameDayShipping(order.clientId);
    } catch (err) {
      this.logger.warn(`항목 삭제 후 합배송 재계산 실패 (${orderId}): ${(err as Error).message}`);
    }

    return { message: '주문항목이 삭제되었습니다', deletedItemId: itemId };
  }

  /**
   * 주문 항목의 개별 이미지 소프트 삭제 (접수대기 전용).
   * 로컬 원본/썸네일 경로가 있으면 디스크에서도 제거 시도한다.
   */
  async softDeleteOrderItemFile(
    orderId: string,
    itemId: string,
    fileId: string,
    userId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, orderNumber: true },
    });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다');
    if (order.status !== ORDER_STATUS.PENDING_RECEIPT) {
      throw new BadRequestException('접수대기 주문에서만 개별 이미지를 삭제할 수 있습니다.');
    }

    const file = await this.prisma.orderFile.findFirst({
      where: { id: fileId, orderItemId: itemId, deletedAt: null },
      include: {
        orderItem: {
          select: { id: true, orderId: true, originalsDeleted: true, totalFileSize: true },
        },
      },
    });
    if (!file || file.orderItem.orderId !== orderId) {
      throw new NotFoundException('파일을 찾을 수 없습니다');
    }
    if (file.orderItem.originalsDeleted) {
      throw new BadRequestException('원본이 이미 일괄 삭제된 항목입니다.');
    }

    const activeCount = await this.prisma.orderFile.count({
      where: { orderItemId: itemId, deletedAt: null },
    });
    if (activeCount <= 1) {
      throw new BadRequestException(
        '마지막 이미지는 삭제할 수 없습니다. 폴더(항목)를 삭제하거나 다른 이미지를 먼저 추가해 주세요.',
      );
    }

    const dec = BigInt(Math.max(0, file.fileSize));
    const prevTotal = file.orderItem.totalFileSize ?? BigInt(0);
    const nextTotal = prevTotal > dec ? prevTotal - dec : BigInt(0);

    await this.prisma.$transaction([
      this.prisma.orderFile.update({
        where: { id: fileId },
        data: { deletedAt: new Date(), storageStatus: 'deleted' },
      }),
      this.prisma.orderItem.update({
        where: { id: itemId },
        data: { totalFileSize: nextTotal },
      }),
      this.prisma.processHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: order.status,
          processType: 'order_file_deleted',
          note: `이미지 삭제: ${file.fileName}`,
          processedBy: userId,
        },
      }),
    ]);

    this.fileStorage.tryUnlinkLocalPath(file.originalPath ?? undefined);
    this.fileStorage.tryUnlinkLocalPath(file.thumbnailPath ?? undefined);

    const firstRemaining = await this.prisma.orderFile.findFirst({
      where: { orderItemId: itemId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: { thumbnailUrl: true },
    });
    if (firstRemaining?.thumbnailUrl) {
      await this.prisma.orderItem.update({
        where: { id: itemId },
        data: { thumbnailUrl: firstRemaining.thumbnailUrl },
      });
    }

    return { message: '이미지가 삭제되었습니다', fileId };
  }

  // ==================== 주문 디스크 디렉토리 경로 수집 ====================
  private async getOrderDirectories(orderIds: string[]): Promise<string[]> {
    const files = await this.prisma.orderFile.findMany({
      where: {
        deletedAt: null,
        orderItem: { orderId: { in: orderIds } },
        originalPath: { not: null },
      },
      select: { originalPath: true },
      distinct: ['orderItemId'],
    });

    const orderDirs = new Set<string>();
    for (const file of files) {
      if (file.originalPath) {
        // originalPath: .../orders/YYYY/MM/DD/company/orderNumber/originals/filename
        const orderDir = dirname(dirname(file.originalPath));
        orderDirs.add(orderDir);
      }
    }
    return Array.from(orderDirs);
  }

  // ==================== 주문 삭제 ====================
  async delete(id: string) {
    const order = await this.findOne(id);

    if (order.status !== ORDER_STATUS.PENDING_RECEIPT && order.status !== ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('접수대기 또는 취소 상태의 주문만 삭제할 수 있습니다');
    }

    // 매출원장 먼저 삭제 (items → ledger 순서)
    const ledger = await this.prisma.salesLedger.findUnique({ where: { orderId: id } });
    if (ledger) {
      await this.prisma.salesLedgerItem.deleteMany({ where: { salesLedgerId: ledger.id } });
      await this.prisma.salesLedger.delete({ where: { id: ledger.id } });
    }

    // 디스크 파일 경로 수집 (DB 삭제 전)
    const orderDirs = await this.getOrderDirectories([id]);
    const clientId = order.clientId;

    const result = await this.prisma.order.delete({
      where: { id },
    });

    // DB 삭제 후 디스크 파일 비동기 삭제 (Windows rmSync 크래시 방지)
    for (const dir of orderDirs) {
      this.fileStorage.deleteOrderDirectoryAsync(dir).catch((err) => {
        this.logger.warn(`디스크 파일 삭제 실패 (${id}): ${(err as Error).message}`);
      });
    }

    // 당일 합배송 배송비 재계산 (주문 삭제로 누적금액 미달 시 환급 취소)
    try {
      await this.recalculateSameDayShipping(clientId);
    } catch (err) {
      this.logger.warn(`주문 삭제 후 합배송 재계산 실패 (${id}): ${(err as Error).message}`);
    }

    return result;
  }

  // ==================== 관리자 금액/수량 조정 ====================
  async adjustOrder(
    id: string,
    dto: AdjustOrderDto,
    userId: string,
    opts?: { isSuperAdmin?: boolean },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다');
    }

    // ===== 상태 가드 (관리자 사양 편집) =====
    // 신규 정책 (2026-04-29): 배송완료/취소만 편집 차단. 그 외는 ReprintJob 분기 또는 직접 수정 허용.
    // 출력완료 이후 단계의 사양 변경은 컨트롤러/별도 메서드(requestReprint)에서 분기 처리.
    const hasItemUpdate =
      (dto.itemUpdates && dto.itemUpdates.length > 0) ||
      dto.adjustmentAmount !== undefined;
    if (hasItemUpdate && (ORDER_EDIT_BLOCKED_STATUSES as readonly string[]).includes(order.status)) {
      throw new BadRequestException(
        `현재 상태(${order.status})에서는 편집 불가합니다. 배송완료/취소 주문은 수정할 수 없습니다.`,
      );
    }

    // 가격 차액 계산을 위한 이전 finalAmount 보존
    const previousFinalAmount = Number(order.finalAmount);

    return this.prisma.$transaction(async (tx) => {
      // 1. 항목별 수량/단가/사양 수정
      if (dto.itemUpdates?.length) {
        for (const update of dto.itemUpdates) {
          const item = order.items.find(i => i.id === update.itemId);
          if (!item) continue;

          const newQuantity = update.quantity ?? item.quantity;
          const newUnitPrice = update.unitPrice !== undefined
            ? update.unitPrice
            : Number(item.unitPrice);
          const newTotalPrice = newUnitPrice * newQuantity;

          // ===== 사양 호환성 검증 (관리자 사양 편집) =====
          const effectivePrintMethod = update.printMethod ?? item.printMethod ?? null;
          const isIndigoMethod = (pm: string) => {
            const s = pm.toLowerCase();
            return s.includes('indigo') || s.includes('인디고');
          };
          if (
            update.colorIntentId &&
            effectivePrintMethod &&
            !isIndigoMethod(String(effectivePrintMethod))
          ) {
            throw new BadRequestException(
              `잉크젯 출력에는 도수(colorIntent)를 지정할 수 없습니다. (item ${update.itemId})`,
            );
          }
          // printSide 단/양/스프레드 외 값 차단
          if (
            update.printSide &&
            !['single', 'double', 'spread'].includes(update.printSide)
          ) {
            throw new BadRequestException(
              `printSide 는 single/double/spread 중 하나여야 합니다. (item ${update.itemId})`,
            );
          }
          // fileSpecId 가 들어오면 실존 검증
          if (update.fileSpecId) {
            const spec = await tx.specification.findUnique({
              where: { id: update.fileSpecId },
              select: { id: true },
            });
            if (!spec) {
              throw new BadRequestException(
                `존재하지 않는 규격(fileSpecId)입니다: ${update.fileSpecId}`,
              );
            }
          }
          // colorIntentId 가 들어오면 실존 검증
          if (update.colorIntentId) {
            const ci = await tx.colorIntent.findUnique({
              where: { id: update.colorIntentId },
              select: { id: true },
            });
            if (!ci) {
              throw new BadRequestException(
                `존재하지 않는 도수(colorIntentId)입니다: ${update.colorIntentId}`,
              );
            }
          }

          await tx.orderItem.update({
            where: { id: update.itemId },
            data: {
              quantity: newQuantity,
              unitPrice: newUnitPrice,
              totalPrice: newTotalPrice,
              ...(update.pageLayout !== undefined && { pageLayout: update.pageLayout }),
              ...(update.bindingDirection !== undefined && { bindingDirection: update.bindingDirection }),
              ...(update.fabricName !== undefined && { fabricName: update.fabricName }),
              ...(update.fabricSnapshot !== undefined && { fabricSnapshot: update.fabricSnapshot }),
              ...(update.foilName !== undefined && { foilName: update.foilName }),
              ...(update.foilColor !== undefined && { foilColor: update.foilColor }),
              ...(update.foilPosition !== undefined && { foilPosition: update.foilPosition }),
              // 신규 사양 필드
              ...(update.paper !== undefined && { paper: update.paper }),
              ...(update.printMethod !== undefined && { printMethod: update.printMethod }),
              ...(update.colorIntentId !== undefined && { colorIntentId: update.colorIntentId }),
              ...(update.printSide !== undefined && { printSide: update.printSide }),
              ...(update.fileSpecId !== undefined && { fileSpecId: update.fileSpecId }),
              ...(update.bindingType !== undefined && { bindingType: update.bindingType }),
              ...(update.finishingOptions !== undefined && { finishingOptions: update.finishingOptions }),
              ...(update.folderName !== undefined && { folderName: update.folderName }),
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
      const tax = 0; // 가격은 부가세 포함 금액
      const shippingFee = Number(order.shippingFee);
      const adjustmentAmount = dto.adjustmentAmount ?? Number(order.adjustmentAmount);
      const totalAmount = productPrice + shippingFee;
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
              note: dto.adjustmentReason || (adjustmentAmount < 0 ? `금액조정: 추가 ${Math.abs(adjustmentAmount).toLocaleString()}원` : `금액조정: 할인 ${adjustmentAmount.toLocaleString()}원`),
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
                orderBy: { isPrimary: 'desc' },
                select: { staff: { select: { id: true, name: true } } },
                take: 1,
              },
            },
          },
          shipping: true,
          items: {
            include: {
              files: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' }, take: 1 },
              shipping: true,
            },
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

      // 가격 차액 (이전 finalAmount → 신규 finalAmount)
      // 클라이언트가 ±20% 이상 변동 시 사용자 confirm 표시 등에 활용.
      const newFinalAmount = Number(updatedOrder.finalAmount);
      const priceDelta = newFinalAmount - previousFinalAmount;
      const priceDeltaRatio = previousFinalAmount > 0
        ? priceDelta / previousFinalAmount
        : 0;

      return {
        ...updatedOrder,
        priceDelta,
        priceDeltaRatio,
        previousFinalAmount,
      };
    });
  }

  // ==================== 벌크: 상태 일괄 변경 ====================
  async bulkUpdateStatus(
    dto: BulkUpdateStatusDto,
    userId: string,
  ): Promise<{ success: number; failed: string[]; failedDetails?: Array<{ orderId: string; message: string }> }> {
    const failedDetails: Array<{ orderId: string; message: string }> = [];
    const eligibleIds: string[] = [];

    for (const orderId of dto.orderIds) {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        failedDetails.push({ orderId, message: '주문을 찾을 수 없습니다.' });
        continue;
      }
      if (dto.status === 'print_waiting') {
        try {
          await this.assertPrintWaitingRequirements(orderId);
        } catch (e: any) {
          const raw = e instanceof BadRequestException ? e.getResponse() : e?.message;
          const msg =
            typeof raw === 'string'
              ? raw
              : Array.isArray((raw as any)?.message)
                ? (raw as any).message.join(', ')
                : (raw as any)?.message || '출력대기 조건을 만족하지 않습니다.';
          failedDetails.push({ orderId, message: msg });
          continue;
        }
      }
      eligibleIds.push(orderId);
    }

    let success = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const orderId of eligibleIds) {
        try {
          const order = await tx.order.findUnique({ where: { id: orderId } });
          if (!order) {
            failedDetails.push({ orderId, message: '주문을 찾을 수 없습니다.' });
            continue;
          }

          // 출력대기 큐 전이 동기화 (단건 updateStatus와 동일 규칙)
          const transition = this.computeQueueTransition(
            (order as any).printQueueStatus ?? null,
            order.status,
            dto.status,
          );
          const queuePatch = this.buildQueueTransitionPatch(transition);
          const historyEntries: any[] = [
            {
              fromStatus: order.status,
              toStatus: dto.status,
              processType: 'bulk_status_change',
              note: dto.note,
              processedBy: userId,
            },
          ];
          if (queuePatch.historyEntry) {
            historyEntries.push({ ...queuePatch.historyEntry, processedBy: userId });
          }

          await tx.order.update({
            where: { id: orderId },
            data: {
              status: dto.status,
              ...queuePatch.data,
              processHistory: { create: historyEntries },
            },
          });
          success++;
        } catch (e: any) {
          failedDetails.push({
            orderId,
            message: e?.message || '상태 변경에 실패했습니다.',
          });
        }
      }
    });

    return {
      success,
      failed: failedDetails.map((f) => f.orderId),
      ...(failedDetails.length > 0 ? { failedDetails } : {}),
    };
  }

  // ==================== 벌크: 일괄 취소 ====================
  async bulkCancel(dto: BulkCancelDto, userId: string) {
    const results = { success: 0, failed: [] as string[], skipped: [] as string[] };
    const cancelledOrderIds: string[] = [];
    const cancelledClientIds = new Set<string>();

    await this.prisma.$transaction(async (tx) => {
      for (const orderId of dto.orderIds) {
        try {
          const order = await tx.order.findUnique({ where: { id: orderId } });
          if (!order) { results.failed.push(orderId); continue; }
          if (order.status === ORDER_STATUS.SHIPPED) { results.skipped.push(orderId); continue; }

          const transition = this.computeQueueTransition(
            (order as any).printQueueStatus ?? null,
            order.status,
            ORDER_STATUS.CANCELLED,
          );
          const queuePatch = this.buildQueueTransitionPatch(transition);
          const historyEntries: any[] = [
            {
              fromStatus: order.status,
              toStatus: ORDER_STATUS.CANCELLED,
              processType: 'bulk_order_cancelled',
              note: dto.reason,
              processedBy: userId,
            },
          ];
          if (queuePatch.historyEntry) {
            historyEntries.push({ ...queuePatch.historyEntry, processedBy: userId });
          }

          await tx.order.update({
            where: { id: orderId },
            data: {
              status: ORDER_STATUS.CANCELLED,
              ...queuePatch.data,
              processHistory: { create: historyEntries },
            },
          });

          // 매출원장도 완전 취소 처리 (주문취소와 atomic 커밋)
          await tx.salesLedger.updateMany({
            where: { orderId },
            data: {
              salesStatus: 'CANCELLED',
              outstandingAmount: 0,
              paymentStatus: 'unpaid',
            },
          });

          results.success++;
          cancelledOrderIds.push(orderId);
          cancelledClientIds.add(order.clientId);
        } catch { results.failed.push(orderId); }
      }
    });

    // 취소전표 생성 + 누락된 매출원장 fallback 취소 처리 (트랜잭션 밖)
    for (const orderId of cancelledOrderIds) {
      try {
        const salesLedger = await this.prisma.salesLedger.findUnique({
          where: { orderId },
        });
        if (!salesLedger) continue;

        if (salesLedger.salesStatus !== 'CANCELLED') {
          // 트랜잭션에서 누락된 경우: cancelSales로 완전 취소 + 취소전표 생성
          await this.salesLedgerService.cancelSales(salesLedger.id);
        }
        // 이미 CANCELLED인 경우: 트랜잭션에서 정상 처리됨 (취소전표는 생략)
      } catch (err) {
        this.logger.warn(`일괄취소 매출원장 처리 실패 (${orderId}): ${(err as Error).message}`);
        // Fallback: 직접 업데이트로 반드시 취소 상태 보장
        try {
          await this.prisma.salesLedger.updateMany({
            where: { orderId, salesStatus: { not: 'CANCELLED' } },
            data: { salesStatus: 'CANCELLED', outstandingAmount: 0, paymentStatus: 'unpaid' },
          });
        } catch (fallbackErr) {
          this.logger.error(`일괄취소 매출원장 fallback 실패 (${orderId}): ${(fallbackErr as Error).message}`);
        }
      }
    }

    // 거래처별 합배송 배송비 재계산 (배송비 환급 취소 + 재청구 전표 생성)
    for (const clientId of cancelledClientIds) {
      try {
        await this.recalculateSameDayShipping(clientId);
      } catch (err) {
        this.logger.warn(`일괄취소 합배송 재계산 실패 (거래처: ${clientId}): ${(err as Error).message}`);
      }
    }

    return results;
  }

  // ==================== 벌크: 일괄 삭제 ====================
  async bulkDelete(orderIds: string[]) {
    const results = { success: 0, failed: [] as string[], skipped: [] as string[] };

    for (const orderId of orderIds) {
      try {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) { results.failed.push(orderId); continue; }
        if (order.status !== ORDER_STATUS.PENDING_RECEIPT && order.status !== ORDER_STATUS.CANCELLED) {
          results.skipped.push(orderId);
          continue;
        }

        // 파일 경로 수집 (DB 삭제 전)
        let dirs: string[] = [];
        try {
          dirs = await this.getOrderDirectories([orderId]);
        } catch (err) {
          this.logger.warn(`파일 경로 수집 실패 (${orderId}): ${(err as Error).message}`);
        }

        // 매출원장 먼저 삭제
        const ledger = await this.prisma.salesLedger.findUnique({ where: { orderId } });
        if (ledger) {
          await this.prisma.salesLedgerItem.deleteMany({ where: { salesLedgerId: ledger.id } });
          await this.prisma.salesLedger.delete({ where: { id: ledger.id } });
        }

        // 주문 삭제 (cascade로 관련 레코드 자동 삭제)
        await this.prisma.order.delete({ where: { id: orderId } });

        results.success++;

        // DB 삭제 성공 후 디스크 파일 비동기 삭제 (Windows rmSync 크래시 방지)
        for (const dir of dirs) {
          this.fileStorage.deleteOrderDirectoryAsync(dir).catch((err) => {
            this.logger.warn(`디스크 파일 삭제 실패 (${orderId}): ${(err as Error).message}`);
          });
        }
      } catch (err) {
        this.logger.error(`주문 삭제 실패 (${orderId}): ${(err as Error).message}`);
        results.failed.push(orderId);
      }
    }

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

  // ==================== 최근 주문 옵션 조회 ====================
  async getLastProductOptions(clientId: string, productId: string) {
    const item = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          clientId,
          status: { not: 'cancelled' },
        },
      },
      orderBy: {
        order: { orderedAt: 'desc' },
      },
      select: {
        bindingType: true,
        paper: true,
        printMethod: true,
        coverMaterial: true,
        foilName: true,
        foilColor: true,
        foilPosition: true,
        finishingOptions: true,
        fabricName: true,
        fabricSnapshot: true,
      },
    });
    return item;
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
                  foilPosition: item.foilPosition,
                  finishingOptions: item.finishingOptions,
                  fabricName: item.fabricName,
                  fabricSnapshot: item.fabricSnapshot ?? Prisma.JsonNull,
                  thumbnailUrl: item.thumbnailUrl,
                  totalFileSize: item.totalFileSize,
                  pageLayout: item.pageLayout,
                  bindingDirection: item.bindingDirection,
                  ...(item.fileSpecId ? { fileSpecId: item.fileSpecId } : {}),
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
                    senderType: order.shipping.senderType,
                    senderName: order.shipping.senderName,
                    senderPhone: order.shipping.senderPhone,
                    senderPostalCode: order.shipping.senderPostalCode,
                    senderAddress: order.shipping.senderAddress,
                    senderAddressDetail: order.shipping.senderAddressDetail,
                    receiverType: order.shipping.receiverType,
                    recipientName: order.shipping.recipientName,
                    phone: order.shipping.phone,
                    postalCode: order.shipping.postalCode,
                    address: order.shipping.address,
                    addressDetail: order.shipping.addressDetail,
                    deliveryMethod: order.shipping.deliveryMethod,
                    deliveryFee: order.shipping.deliveryFee,
                    deliveryFeeType: order.shipping.deliveryFeeType,
                    fareType: order.shipping.fareType,
                    deliveryMemo: order.shipping.deliveryMemo,
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
          items: (newOrder as any).items.map((item: any) => ({
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
    // 종료일을 해당 일자 끝(23:59:59.999)으로 설정
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    const where: Prisma.OrderWhereInput = {
      orderedAt: {
        gte: dto.startDate,
        lte: endDate,
      },
    };

    // 삭제 전에 대상 주문 ID 및 파일 경로 수집
    const ordersToDelete = await this.prisma.order.findMany({
      where,
      select: { id: true },
    });
    const orderIds = ordersToDelete.map(o => o.id);

    // 디스크 파일 경로 수집 (썸네일 함께 삭제 옵션 시)
    const orderDirs = dto.deleteThumbnails && orderIds.length > 0
      ? await this.getOrderDirectories(orderIds)
      : [];

    const deleted = await this.prisma.order.deleteMany({ where });

    // 디스크 파일 삭제 (썸네일 파일도 함께 삭제 옵션)
    for (const dir of orderDirs) {
      this.fileStorage.deleteOrderDirectoryAsync(dir).catch((err) => {
        this.logger.warn(`데이터정리 디스크 삭제 실패: ${(err as Error).message}`);
      });
    }

    return { success: deleted.count, deleted: deleted.count };
  }

  // ==================== 통계 조회 ====================
  async getStatusCounts(clientId?: string, createdByUserId?: string) {
    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (createdByUserId) where.createdByUserId = createdByUserId;

    const counts = await this.prisma.order.groupBy({
      by: ['status'],
      ...(Object.keys(where).length > 0 && { where }),
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

  // ==================== 공정단계별 주문 건수 ====================
  async getProductionStageCounts(clientId?: string, createdByUserId?: string) {
    const baseWhere: Prisma.OrderWhereInput = {};
    if (clientId) baseWhere.clientId = clientId;
    if (createdByUserId) baseWhere.createdByUserId = createdByUserId;

    const stages = [
      'reception_hold',
      'reception_pending',
      'reception_done',
      'print_queue',
      'data_inspection',
      'finishing_wait',
      'finishing_progress',
      'outbound_qc',
      'shipping_progress',
      'shipping_done',
    ];

    const hasBaseWhere = Object.keys(baseWhere).length > 0;

    const results = await Promise.all(
      stages.map(async (stage) => {
        const stageWhere = this.buildProductionStageWhere(stage);
        const where: Prisma.OrderWhereInput = hasBaseWhere
          ? { AND: [baseWhere, stageWhere] }
          : stageWhere;
        const count = await this.prisma.order.count({ where });
        return [stage, count] as const;
      }),
    );

    return Object.fromEntries(results) as Record<string, number>;
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
    const totalAmount = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);

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

  /**
   * 일자별 주문/입금 집계 조회 (전월이월잔액 포함)
   */
  async getDailySummary(clientId: string, startDate: string, endDate: string) {
    // 전월이월잔액: startDate 이전의 총매출 - 총수금
    // KST 기준 날짜 비교: orderedAt을 'Asia/Seoul' 타임존으로 변환 후 날짜 추출
    const carryForwardRaw = await this.prisma.$queryRaw<any[]>`
      SELECT
        COALESCE(SUM(o."finalAmount"), 0)::decimal as "totalOrderAmount",
        COALESCE(SUM(sl."receivedAmount"), 0)::decimal as "totalDepositAmount"
      FROM orders o
      LEFT JOIN sales_ledgers sl ON o.id = sl."orderId"
      WHERE o."clientId" = ${clientId}
        AND (o."orderedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::date < ${startDate}::date
        AND o.status != 'cancelled'
    `;

    const carryForwardBalance =
      parseFloat(carryForwardRaw[0]?.totalOrderAmount || '0') -
      parseFloat(carryForwardRaw[0]?.totalDepositAmount || '0');

    // 일자별 집계 (KST 기준으로 날짜 그룹핑)
    const rawData = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE(o."orderedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') as date,
        COUNT(DISTINCT o.id)::int as "orderCount",
        COALESCE(SUM(o."finalAmount"), 0)::decimal as "orderAmount",
        COALESCE(SUM(sl."receivedAmount"), 0)::decimal as "depositAmount"
      FROM orders o
      LEFT JOIN sales_ledgers sl ON o.id = sl."orderId"
      WHERE o."clientId" = ${clientId}
        AND (o."orderedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::date >= ${startDate}::date
        AND (o."orderedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::date <= ${endDate}::date
        AND o.status != 'cancelled'
      GROUP BY DATE(o."orderedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')
      ORDER BY date ASC
    `;

    const data = rawData.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      orderCount: row.orderCount,
      orderAmount: parseFloat(row.orderAmount),
      depositAmount: parseFloat(row.depositAmount),
    }));

    const totalOrders = data.reduce((s, d) => s + d.orderCount, 0);
    const totalOrderAmount = data.reduce((s, d) => s + d.orderAmount, 0);
    const totalDepositAmount = data.reduce((s, d) => s + d.depositAmount, 0);

    return {
      data,
      summary: {
        carryForwardBalance,
        totalOrders,
        totalOrderAmount,
        totalDepositAmount,
        totalOutstanding: totalOrderAmount - totalDepositAmount,
        closingBalance: carryForwardBalance + totalOrderAmount - totalDepositAmount,
      },
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
        deletedAt: null,
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

    const fileOk = await this.prisma.orderFile.findFirst({
      where: { id: fileId, deletedAt: null, orderItem: { orderId } },
      select: { id: true },
    });
    if (!fileOk) {
      throw new NotFoundException('파일을 찾을 수 없습니다');
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
        deletedAt: null,
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
            clientName: true,
            mobile: true,
          },
        },
      },
    });

    // SMS 발송 (옵션)
    if (dto.sendSms !== false && (updatedOrder as any).client.mobile) {
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
            note: `고객 통지 완료: ${(updatedOrder as any).client.mobile}`,
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
        deletedAt: null,
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
   * 임시 파일을 정식 주문 경로로 이동 (아이템별 독립 처리)
   */
  private async moveTemporaryFiles(order: any): Promise<void> {
    this.logger.log(`[moveTemporaryFiles] 시작 (주문: ${order.orderNumber}, items: ${order.items?.length}, client: ${order.client?.clientName})`);
    for (const item of order.items) {
      if (!item.files?.length) {
        this.logger.log(`[moveTemporaryFiles] item ${item.id}: 파일 없음, 건너뜀`);
        continue;
      }

      const firstFile = item.files[0];
      this.logger.log(`[moveTemporaryFiles] item ${item.id}: 첫번째 파일 URL = ${firstFile.fileUrl}`);
      if (!firstFile.fileUrl || !firstFile.fileUrl.includes('/temp/')) {
        this.logger.log(`[moveTemporaryFiles] item ${item.id}: temp 경로 아님, 건너뜀`);
        continue;
      }

      const urlParts = firstFile.fileUrl.replace(/\\/g, '/').split('/temp/');
      if (urlParts.length < 2) continue;
      const tempFolderId = urlParts[1].split('/')[0];

      const companyName = order.client?.clientName;
      if (!companyName) {
        throw new Error(`거래처 정보 누락 (주문: ${order.orderNumber}, clientId: ${order.clientId})`);
      }

      this.logger.log(`파일 이동 시작 (주문: ${order.orderNumber}, temp: ${tempFolderId}, DB파일수: ${item.files.length})`);

      // 즉시 업로드가 완료될 때까지 대기 (최대 30초)
      const tempOriginalsDir = this.fileStorage.getTempOriginalsDir(tempFolderId);
      this.logger.log(`[DEBUG] tempOriginalsDir = ${tempOriginalsDir}`);
      const expectedFileCount = item.files.length;
      for (let attempt = 0; attempt < 30; attempt++) {
        try {
          const { readdirSync, existsSync } = require('fs');
          if (existsSync(tempOriginalsDir)) {
            const currentCount = readdirSync(tempOriginalsDir).length;
            if (currentCount >= expectedFileCount) {
              this.logger.log(`[DEBUG] temp 파일 준비 완료: ${currentCount}/${expectedFileCount}개`);
              break;
            }
            this.logger.log(`업로드 대기 중 (주문: ${order.orderNumber}): ${currentCount}/${expectedFileCount}개, ${attempt + 1}초 경과`);
          } else {
            this.logger.log(`temp 폴더 없음, 대기 중 (주문: ${order.orderNumber}): attempt ${attempt + 1}`);
          }
        } catch (waitErr) {
          this.logger.error(`[DEBUG] 대기 중 에러: ${(waitErr as Error).message}`);
        }
        await new Promise(r => setTimeout(r, 1000));
      }
      // 대기 후 최종 상태 로깅
      try {
        const { readdirSync, existsSync } = require('fs');
        const exists = existsSync(tempOriginalsDir);
        const files = exists ? readdirSync(tempOriginalsDir) : [];
        this.logger.log(`[DEBUG] 대기 완료 후 temp 상태: exists=${exists}, fileCount=${files.length}, expected=${expectedFileCount}`);
      } catch { /* ignore */ }

      let movedFiles: Array<{ original: string; thumbnail: string; fileName: string }>;
      try {
        const result = await this.fileStorage.moveToOrderDir(
          tempFolderId,
          order.orderNumber,
          companyName,
        );
        movedFiles = result.movedFiles;
        this.logger.log(`[DEBUG] moveToOrderDir 결과: orderDir=${result.orderDir}, movedFiles=${movedFiles.length}`);
      } catch (moveErr) {
        this.logger.error(`[DEBUG] moveToOrderDir 에러 (주문: ${order.orderNumber}):`, (moveErr as Error).message, (moveErr as Error).stack);
        continue;
      }

      if (movedFiles.length === 0) {
        this.logger.warn(`파일 이동 0건 (주문: ${order.orderNumber}, temp: ${tempFolderId}, DB파일수: ${item.files.length})`);
        // 2단계 복구: 이미 이동된 파일이 있는지 orders 디렉토리에서 확인
        try {
          await this.recoverFromOrderDir(order, item, companyName);
        } catch (recoverErr) {
          this.logger.error(`[DEBUG] 복구 실패 (주문: ${order.orderNumber}):`, (recoverErr as Error).message);
        }
        continue;
      }

      this.logger.log(`파일 이동 완료 (주문: ${order.orderNumber}): ${movedFiles.length}개 (썸네일: ${movedFiles.filter(m => m.thumbnail).length}개)`);

      // 배치 업데이트: N+1 → 단일 트랜잭션
      const updates: { id: string; fileUrl: string; originalPath: string; thumbnailUrl: string; thumbnailPath: string | null }[] = [];
      let matchFailed = 0;
      for (const moved of movedFiles) {
        const matchingFile = item.files.find(
          (f: any) => {
            const decodedUrl = decodeURIComponent(f.fileUrl);
            const decodedFileName = decodeURIComponent(moved.fileName);
            return decodedUrl.includes(moved.fileName)
              || f.fileUrl.includes(moved.fileName)
              || decodedUrl.includes(decodedFileName)
              || f.fileName === moved.fileName
              || f.fileName === decodedFileName;
          },
        );
        if (matchingFile) {
          const b2Result = await this.uploadMovedFileToB2(order.orderNumber, moved);
          const nextThumbUrl =
            b2Result.publicThumbnailUrl
            || (moved.thumbnail ? this.fileStorage.toRelativeUrl(moved.thumbnail) : matchingFile.thumbnailUrl);
          updates.push({
            id: matchingFile.id,
            fileUrl: this.fileStorage.toRelativeUrl(moved.original),
            originalPath: moved.original,
            thumbnailUrl: nextThumbUrl,
            thumbnailPath: b2Result.publicThumbnailKey || moved.thumbnail || null,
          });
        } else {
          matchFailed++;
          this.logger.warn(`파일 매칭 실패 (주문: ${order.orderNumber}): moved="${moved.fileName}", DB파일들=[${item.files.slice(0, 3).map((f: any) => f.fileName).join(', ')}...]`);
        }
      }

      if (matchFailed > 0) {
        this.logger.warn(`파일 매칭 실패 총 ${matchFailed}건 (주문: ${order.orderNumber})`);
      }

      // 50개씩 배치 처리
      const BATCH_SIZE = 50;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        try {
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
        } catch (dbErr) {
          this.logger.error(`DB 배치 업데이트 실패 (주문: ${order.orderNumber}, batch ${i}-${i + batch.length}):`, (dbErr as Error).message);
          // 개별 업데이트로 폴백
          for (const u of batch) {
            try {
              await this.prisma.orderFile.update({
                where: { id: u.id },
                data: {
                  fileUrl: u.fileUrl,
                  originalPath: u.originalPath,
                  thumbnailUrl: u.thumbnailUrl,
                  thumbnailPath: u.thumbnailPath,
                  storageStatus: 'uploaded',
                },
              });
            } catch (singleErr) {
              this.logger.error(`개별 DB 업데이트 실패 (파일: ${u.id}):`, (singleErr as Error).message);
            }
          }
        }
      }

      this.logger.log(`DB 업데이트 완료 (주문: ${order.orderNumber}): ${updates.length}건`);

      if (updates.length > 0) {
        const firstUpdate = [...updates].sort((a, b) => {
          const af = item.files.find((f: any) => f.id === a.id);
          const bf = item.files.find((f: any) => f.id === b.id);
          return (af?.sortOrder ?? 0) - (bf?.sortOrder ?? 0);
        })[0];
        if (firstUpdate?.thumbnailUrl) {
          try {
            await this.prisma.orderItem.update({
              where: { id: item.id },
              data: { thumbnailUrl: firstUpdate.thumbnailUrl },
            });
          } catch (err) {
            this.logger.warn(`OrderItem 썸네일 동기화 실패 (item: ${item.id}): ${(err as Error).message}`);
          }
        }
      }

      // DB 업데이트 성공 후 temp 폴더 삭제 (모든 파일이 이동된 경우에만)
      if (updates.length > 0) {
        const totalDbFiles = item.files.length;
        if (updates.length >= totalDbFiles) {
          this.fileStorage.cleanupTempFolder(tempFolderId);
          this.logger.log(`temp 폴더 삭제 (주문: ${order.orderNumber}, temp: ${tempFolderId}) - 전체 ${totalDbFiles}건 이동 완료`);
        } else {
          this.logger.warn(`temp 폴더 보존 (주문: ${order.orderNumber}, temp: ${tempFolderId}) - ${updates.length}/${totalDbFiles}건만 이동됨, 미이동 파일 존재`);
        }
      }
    }
  }

  /**
   * 파일 이동 실패 시 이미 orders 디렉토리에 이동된 파일로 DB 복구
   */
  private async recoverFromOrderDir(order: any, item: any, companyName: string): Promise<void> {
    const { readdirSync, existsSync } = require('fs');
    const { join } = require('path');
    const orderDir = this.fileStorage.getOrderDir(order.orderNumber, companyName);
    const originalsDir = join(orderDir, 'originals');
    const thumbnailsDir = join(orderDir, 'thumbnails');

    if (!existsSync(originalsDir)) {
      this.logger.warn(`[복구] orders 원본 디렉토리 없음: ${originalsDir}`);
      return;
    }

    const diskFiles = readdirSync(originalsDir) as string[];
    if (diskFiles.length === 0) {
      this.logger.warn(`[복구] orders 원본 디렉토리 비어있음: ${originalsDir}`);
      return;
    }

    this.logger.log(`[복구] orders에서 ${diskFiles.length}개 파일 발견 (주문: ${order.orderNumber})`);

    const updates: { id: string; fileUrl: string; originalPath: string; thumbnailUrl: string; thumbnailPath: string | null }[] = [];

    for (const diskFileName of diskFiles) {
      const originalPath = join(originalsDir, diskFileName);
      const thumbName = this.fileStorage.getThumbName(diskFileName);
      const thumbPath = join(thumbnailsDir, thumbName);
      let hasThumb = existsSync(thumbPath);

      // 썸네일 없으면 원본에서 재생성 시도
      if (!hasThumb) {
        try {
          await this.thumbnailService.generateThumbnail(originalPath, thumbnailsDir, diskFileName);
          hasThumb = existsSync(thumbPath);
          if (hasThumb) {
            this.logger.log(`[복구] 썸네일 재생성 성공: ${diskFileName}`);
          }
        } catch (thumbErr) {
          this.logger.warn(`[복구] 썸네일 재생성 실패: ${diskFileName} - ${(thumbErr as Error).message}`);
        }
      }

      // DB 파일과 매칭
      const matchingFile = item.files.find((f: any) => {
        const decodedUrl = decodeURIComponent(f.fileUrl || '');
        const decodedFileName = decodeURIComponent(diskFileName);
        return decodedUrl.includes(diskFileName)
          || (f.fileUrl || '').includes(diskFileName)
          || decodedUrl.includes(decodedFileName)
          || f.fileName === diskFileName
          || f.fileName === decodedFileName;
      });

        if (matchingFile) {
          const b2Result = await this.uploadMovedFileToB2(order.orderNumber, {
            original: originalPath,
            thumbnail: hasThumb ? thumbPath : '',
            fileName: diskFileName,
          });
        updates.push({
          id: matchingFile.id,
          fileUrl: this.fileStorage.toRelativeUrl(originalPath),
          originalPath,
            thumbnailUrl: b2Result.publicThumbnailUrl || (hasThumb ? this.fileStorage.toRelativeUrl(thumbPath) : ''),
            thumbnailPath: b2Result.publicThumbnailKey || (hasThumb ? thumbPath : null),
        });
      }
    }

    if (updates.length > 0) {
      this.logger.log(`[복구] ${updates.length}건 DB 업데이트 시작 (주문: ${order.orderNumber})`);
      for (const u of updates) {
        try {
          await this.prisma.orderFile.update({
            where: { id: u.id },
            data: {
              fileUrl: u.fileUrl,
              originalPath: u.originalPath,
              thumbnailUrl: u.thumbnailUrl,
              thumbnailPath: u.thumbnailPath,
              storageStatus: 'uploaded',
            },
          });
        } catch (err) {
          this.logger.error(`[복구] DB 업데이트 실패 (파일: ${u.id}):`, (err as Error).message);
        }
      }
      this.logger.log(`[복구] DB 업데이트 완료: ${updates.length}건 (주문: ${order.orderNumber})`);
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
          where: { inspectionStatus: 'approved', storageStatus: 'uploaded', deletedAt: null },
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

        const orderForSlip = await this.prisma.order.findUnique({
          where: { id: orderId },
          select: {
            orderNumber: true,
            client: { select: { clientName: true } },
          },
        });
        if (orderForSlip) {
          const isDoubleSided = String(item.printSide || '').toLowerCase() === 'double';
          const sideLabel = isDoubleSided ? '양면' : '단면';
          this.slipPrinter
            .printSlipIfEnabled({
              orderNumber: orderForSlip.orderNumber,
              studioName: orderForSlip.client?.clientName || '-',
              fileName: item.files[0]?.fileName || item.productionNumber,
              paper: item.paper || '-',
              spec: item.size || '-',
              pages: item.pages,
              colorMode: '-',
              side: sideLabel,
              binding: item.bindingType || '-',
              nup: '1up',
              outputPath: pdfPath,
              printMethod: item.printMethod || 'indigo',
              orderItemId: item.id,
            })
            .catch((err: any) => {
              this.logger.error(
                `레거시 PDF 후 슬립 트리거 실패 (${orderForSlip.orderNumber}): ${err?.message}`,
              );
            });
        }
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
   * 깨진 파일/썸네일 복구:
   * 1) originalPath 존재 + 썸네일 없음 → 썸네일 재생성
   * 2) fileUrl이 /temp/ 경로 → temp 원본이 있으면 이동 재시도, 없으면 DB 정리(null)
   */
  async repairBrokenThumbnails() {
    let repaired = 0;
    let failed = 0;
    let cleaned = 0;

    // Case 1: 원본 파일 있고 썸네일만 깨진 경우 → 썸네일 재생성
    const brokenThumbFiles = await this.prisma.orderFile.findMany({
      where: {
        deletedAt: null,
        OR: [
          { thumbnailUrl: { contains: '/temp/' } },
          { thumbnailUrl: null },
          { thumbnailUrl: '' },
        ],
        originalPath: { not: null },
      },
      select: { id: true, originalPath: true, thumbnailUrl: true, fileName: true },
    });

    for (const file of brokenThumbFiles) {
      if (!file.originalPath || !existsSync(file.originalPath)) continue;
      const thumbDir = join(dirname(file.originalPath), '..', 'thumbnails');
      try {
        const thumbPath = await this.thumbnailService.generateThumbnail(file.originalPath, thumbDir, file.fileName);
        await this.prisma.orderFile.update({
          where: { id: file.id },
          data: { thumbnailUrl: this.fileStorage.toRelativeUrl(thumbPath), thumbnailPath: thumbPath },
        });
        repaired++;
      } catch { failed++; }
    }

    // Case 2: fileUrl이 /temp/ 경로인 파일 → 파일 이동 미완료
    const tempUrlFiles = await this.prisma.orderFile.findMany({
      where: { deletedAt: null, fileUrl: { contains: '/temp/' } },
      select: { id: true, fileUrl: true, thumbnailUrl: true, fileName: true, orderItemId: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (tempUrlFiles.length > 0) {
      // orderItemId별로 그룹핑하여 주문별 처리
      const byItem = new Map<string, typeof tempUrlFiles>();
      for (const f of tempUrlFiles) {
        const list = byItem.get(f.orderItemId) || [];
        list.push(f);
        byItem.set(f.orderItemId, list);
      }

      for (const [orderItemId, files] of byItem) {
        // temp 원본 경로 확인
        const firstUrl = files[0].fileUrl;
        const tempParts = firstUrl.replace(/\\/g, '/').split('/temp/');
        if (tempParts.length < 2) continue;
        const tempFolderId = tempParts[1].split('/')[0];
        const tempOrigDir = join(getUploadBasePath(), 'temp', tempFolderId, 'originals');

        if (!existsSync(tempOrigDir)) {
          // temp 폴더 삭제됨 → orders 디렉토리에서 복구 시도
          const orderItem = await this.prisma.orderItem.findUnique({
            where: { id: orderItemId },
            select: {
              id: true,
              order: { select: { orderNumber: true, client: { select: { clientName: true } } } },
              files: {
                where: { deletedAt: null },
                select: { id: true, fileName: true, fileUrl: true, thumbnailUrl: true, storageStatus: true },
              },
            },
          });
          if (orderItem?.order?.client?.clientName) {
            try {
              await this.recoverFromOrderDir(
                { orderNumber: orderItem.order.orderNumber, client: orderItem.order.client },
                orderItem,
                orderItem.order.client.clientName,
              );
              // 복구 성공한 파일 수 계산
              const recoveredCount = await this.prisma.orderFile.count({
                where: { orderItemId, storageStatus: 'uploaded', deletedAt: null },
              });
              if (recoveredCount > 0) {
                repaired += recoveredCount;
                this.logger.log(`[복구] orders 디렉토리에서 ${recoveredCount}건 복구 (orderItem: ${orderItemId})`);
              }
            } catch (recoverErr) {
              this.logger.warn(`[복구] orders 디렉토리 복구 실패: ${(recoverErr as Error).message}`);
            }
          }
          // 복구되지 못한 파일만 missing 처리
          const stillTempFiles = await this.prisma.orderFile.findMany({
            where: { deletedAt: null, orderItemId, fileUrl: { contains: '/temp/' } },
            select: { id: true },
          });
          for (const f of stillTempFiles) {
            await this.prisma.orderFile.update({
              where: { id: f.id },
              data: { storageStatus: 'missing' },
            });
            cleaned++;
          }
          continue;
        }

        // temp 원본이 아직 존재 → 이동 재시도
        const orderItem = await this.prisma.orderItem.findUnique({
          where: { id: orderItemId },
          select: {
            order: { select: { orderNumber: true, client: { select: { clientName: true } } } },
          },
        });
        if (!orderItem?.order?.client?.clientName) { failed += files.length; continue; }

        try {
          const { movedFiles } = await this.fileStorage.moveToOrderDir(
            tempFolderId,
            orderItem.order.orderNumber,
            orderItem.order.client.clientName,
          );
          for (const moved of movedFiles) {
            const matchingFile = files.find(f => decodeURIComponent(f.fileUrl).includes(moved.fileName) || f.fileUrl.includes(moved.fileName));
            if (matchingFile) {
              const b2Result = await this.uploadMovedFileToB2(orderItem.order.orderNumber, moved);
              await this.prisma.orderFile.update({
                where: { id: matchingFile.id },
                data: {
                  fileUrl: this.fileStorage.toRelativeUrl(moved.original),
                  originalPath: moved.original,
                  thumbnailUrl: b2Result.publicThumbnailUrl || (moved.thumbnail ? this.fileStorage.toRelativeUrl(moved.thumbnail) : null),
                  thumbnailPath: b2Result.publicThumbnailKey || moved.thumbnail || null,
                  storageStatus: 'uploaded',
                },
              });
              repaired++;
            }
          }
        } catch { failed += files.length; }
      }
    }

    // Case 3: storageStatus가 'missing'인 파일 → orders 디렉토리에서 복구 시도
    const missingFiles = await this.prisma.orderFile.findMany({
      where: { deletedAt: null, storageStatus: 'missing' },
      select: { id: true, fileName: true, fileUrl: true, thumbnailUrl: true, orderItemId: true },
    });

    if (missingFiles.length > 0) {
      const byItemMissing = new Map<string, typeof missingFiles>();
      for (const f of missingFiles) {
        const list = byItemMissing.get(f.orderItemId) || [];
        list.push(f);
        byItemMissing.set(f.orderItemId, list);
      }

      for (const [orderItemId, files] of byItemMissing) {
        const orderItem = await this.prisma.orderItem.findUnique({
          where: { id: orderItemId },
          select: {
            id: true,
            order: { select: { orderNumber: true, client: { select: { clientName: true } } } },
            files: {
              where: { deletedAt: null },
              select: { id: true, fileName: true, fileUrl: true, thumbnailUrl: true, storageStatus: true },
            },
          },
        });
        if (!orderItem?.order?.client?.clientName) continue;

        try {
          const beforeCount = await this.prisma.orderFile.count({
            where: { orderItemId, storageStatus: 'uploaded', deletedAt: null },
          });
          await this.recoverFromOrderDir(
            { orderNumber: orderItem.order.orderNumber, client: orderItem.order.client },
            orderItem,
            orderItem.order.client.clientName,
          );
          const afterCount = await this.prisma.orderFile.count({
            where: { orderItemId, storageStatus: 'uploaded', deletedAt: null },
          });
          const recovered = afterCount - beforeCount;
          if (recovered > 0) {
            repaired += recovered;
            this.logger.log(`[복구] missing → uploaded ${recovered}건 (주문: ${orderItem.order.orderNumber})`);
          }
        } catch (err) {
          this.logger.warn(`[복구] missing 복구 실패 (${orderItem.order.orderNumber}): ${(err as Error).message}`);
          failed += files.length;
        }
      }
    }

    return { total: brokenThumbFiles.length + tempUrlFiles.length + missingFiles.length, repaired, failed, cleaned };
  }

  /**
   * pending 상태 파일 복구:
   * 1단계: temp 폴더가 있으면 정식 경로로 이동
   * 2단계: temp 폴더가 없으면 order 디렉토리에서 이미 이동된 파일 탐색
   * 3단계: 썸네일 누락 시 원본에서 재생성
   */
  async repairPendingFiles() {
    // storageStatus가 pending이고 fileUrl에 /temp/가 포함된 파일들
    const pendingFiles = await this.prisma.orderFile.findMany({
      where: {
        deletedAt: null,
        storageStatus: 'pending',
        fileUrl: { contains: '/temp/' },
      },
      include: {
        orderItem: {
          include: {
            order: {
              include: { client: true },
            },
          },
        },
      },
    });

    if (pendingFiles.length === 0) {
      return { total: 0, repaired: 0, failed: 0, skipped: 0, details: [] };
    }

    // 주문별로 그룹핑
    const orderMap = new Map<string, { orderNumber: string; companyName: string; files: typeof pendingFiles }>();
    for (const file of pendingFiles) {
      const order = file.orderItem.order;
      if (!orderMap.has(order.id)) {
        orderMap.set(order.id, {
          orderNumber: order.orderNumber,
          companyName: order.client?.clientName || 'unknown',
          files: [],
        });
      }
      orderMap.get(order.id)!.files.push(file);
    }

    let repaired = 0;
    let failed = 0;
    let skipped = 0;
    const details: string[] = [];

    for (const [, orderInfo] of orderMap) {
      // 각 파일의 tempFolderId 추출
      const tempFolderIds = new Set<string>();
      for (const file of orderInfo.files) {
        const match = file.fileUrl.match(/\/temp\/([^/]+)\//);
        if (match) tempFolderIds.add(match[1]);
      }

      for (const tempFolderId of tempFolderIds) {
        const relatedFiles = orderInfo.files.filter(f => f.fileUrl.includes(tempFolderId));

        try {
          // 1단계: temp 폴더가 존재하면 정식 경로로 이동
          const { orderDir, movedFiles } = await this.fileStorage.moveToOrderDir(
            tempFolderId,
            orderInfo.orderNumber,
            orderInfo.companyName,
          );

          if (movedFiles.length > 0) {
            // temp에서 이동 성공한 파일 DB 업데이트
            for (const moved of movedFiles) {
              const matchingFile = relatedFiles.find(f => {
                const decoded = decodeURIComponent(f.fileUrl);
                return decoded.includes(moved.fileName) || f.fileUrl.includes(moved.fileName);
              });
              if (matchingFile) {
                const b2Result = await this.uploadMovedFileToB2(orderInfo.orderNumber, moved);
                await this.prisma.orderFile.update({
                  where: { id: matchingFile.id },
                  data: {
                    fileUrl: this.fileStorage.toRelativeUrl(moved.original),
                    originalPath: moved.original,
                    thumbnailUrl: b2Result.publicThumbnailUrl || (moved.thumbnail ? this.fileStorage.toRelativeUrl(moved.thumbnail) : matchingFile.thumbnailUrl),
                    thumbnailPath: b2Result.publicThumbnailKey || moved.thumbnail || null,
                    storageStatus: 'uploaded',
                  },
                });
                repaired++;
              }
            }
            details.push(`${orderInfo.orderNumber}: temp에서 ${movedFiles.length}개 이동 성공`);
          }

          // 2단계: 아직 pending인 파일들 → order 디렉토리에서 탐색
          const stillPending = relatedFiles.filter(f => {
            // 이미 위에서 처리된 파일은 제외
            return !movedFiles.some(m => {
              const decoded = decodeURIComponent(f.fileUrl);
              return decoded.includes(m.fileName) || f.fileUrl.includes(m.fileName);
            });
          });

          if (stillPending.length > 0) {
            const repairResult = await this.repairFromOrderDir(stillPending, orderDir, orderInfo.orderNumber);
            repaired += repairResult.repaired;
            skipped += repairResult.skipped;
            if (repairResult.repaired > 0) {
              details.push(`${orderInfo.orderNumber}: order dir에서 ${repairResult.repaired}개 복구`);
            }
            if (repairResult.skipped > 0) {
              details.push(`${orderInfo.orderNumber}: ${repairResult.skipped}개 파일 찾기 실패 (원본 유실)`);
            }
          }
        } catch (err) {
          this.logger.error(`pending 파일 복구 실패 (주문: ${orderInfo.orderNumber}, temp: ${tempFolderId}):`, (err as Error).message);
          failed += relatedFiles.length;
          details.push(`${orderInfo.orderNumber}: 오류 - ${(err as Error).message}`);
        }
      }
    }

    return { total: pendingFiles.length, repaired, failed, skipped, details };
  }

  /**
   * order 디렉토리에서 이미 이동된 파일을 찾아 DB 업데이트 + 썸네일 재생성
   */
  private async repairFromOrderDir(
    files: Array<{ id: string; fileName: string; fileUrl: string; thumbnailUrl: string | null }>,
    orderDir: string,
    orderNumber: string,
  ) {
    const { join, extname } = await import('path');
    const { existsSync } = await import('fs');

    const originalsDir = join(orderDir, 'originals');
    const thumbnailsDir = join(orderDir, 'thumbnails');
    let repaired = 0;
    let skipped = 0;

    for (const file of files) {
      const originalPath = join(originalsDir, file.fileName);

      if (!existsSync(originalPath)) {
        // 파일명이 다를 수 있으므로 디코딩된 이름으로도 시도
        const decodedName = decodeURIComponent(file.fileName);
        const altPath = join(originalsDir, decodedName);
        if (!existsSync(altPath)) {
          this.logger.warn(`원본 파일 찾기 실패 (주문: ${orderNumber}): ${file.fileName}`);
          skipped++;
          continue;
        }
      }

      const actualOriginalPath = existsSync(join(originalsDir, file.fileName))
        ? join(originalsDir, file.fileName)
        : join(originalsDir, decodeURIComponent(file.fileName));

      // 썸네일 확인/재생성
      const ext = extname(file.fileName);
      const base = file.fileName.slice(0, -ext.length);
      const thumbName = `${base}_thumb.jpg`;
      let thumbPath = join(thumbnailsDir, thumbName);

      if (!existsSync(thumbPath)) {
        // 썸네일 재생성
        try {
          if (!existsSync(thumbnailsDir)) {
            const { mkdirSync } = await import('fs');
            mkdirSync(thumbnailsDir, { recursive: true });
          }
          thumbPath = await this.thumbnailService.generateThumbnail(
            actualOriginalPath,
            thumbnailsDir,
            file.fileName,
          );
          this.logger.log(`썸네일 재생성 성공 (주문: ${orderNumber}): ${file.fileName}`);
        } catch (err) {
          this.logger.warn(`썸네일 재생성 실패 (주문: ${orderNumber}): ${file.fileName} - ${(err as Error).message}`);
          thumbPath = '';
        }
      }

      // DB 업데이트
      try {
        const b2Result = await this.uploadMovedFileToB2(orderNumber, {
          original: actualOriginalPath,
          thumbnail: thumbPath || '',
          fileName: file.fileName,
        });
        await this.prisma.orderFile.update({
          where: { id: file.id },
          data: {
            fileUrl: this.fileStorage.toRelativeUrl(actualOriginalPath),
            originalPath: actualOriginalPath,
            thumbnailUrl: b2Result.publicThumbnailUrl || (thumbPath ? this.fileStorage.toRelativeUrl(thumbPath) : null),
            thumbnailPath: b2Result.publicThumbnailKey || thumbPath || null,
            storageStatus: 'uploaded',
          },
        });
        repaired++;
      } catch (err) {
        this.logger.error(`DB 업데이트 실패 (주문: ${orderNumber}, 파일: ${file.id}):`, (err as Error).message);
        skipped++;
      }
    }

    return { repaired, skipped };
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
              where: { deletedAt: null },
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
        this.logger.warn(`원본 삭제 실패 (item: ${item.id}): ${(err as Error).message}`);
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
        this.logger.warn(`원본 일괄 삭제 실패: ${orderId} - ${(err as Error).message}`);
      }
    }

    return { success: successCount, failed };
  }

  // ===== 주문 취소/삭제 시 당일 합배송 배송비 재계산 =====
  // 취소로 인해 당일 누적금액이 기준금액 미만으로 떨어지면
  // 이전 주문들의 adjustmentAmount(배송비 환급)를 0으로 리셋하고 배송비 재청구 전표 생성
  private async recalculateSameDayShipping(
    clientId: string,
    excludeOrderId?: string,
  ): Promise<{ recharged: boolean; rechargeAmount: number }> {
    // 1. 거래처 조회 - conditional이 아니면 skip
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { shippingType: true, freeShippingThreshold: true } as any,
    }) as { shippingType: string; freeShippingThreshold: number | null } | null;

    if (!client || client.shippingType !== 'conditional') {
      return { recharged: false, rechargeAmount: 0 };
    }

    const freeThreshold = client.freeShippingThreshold ?? 90000;

    // 2. KST 기준 오늘 범위
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const nowUtc = Date.now();
    const nowKst = nowUtc + KST_OFFSET_MS;
    const kstMidnight = nowKst - (nowKst % (24 * 60 * 60 * 1000));
    const todayStart = new Date(kstMidnight - KST_OFFSET_MS);
    const todayEnd = new Date(kstMidnight - KST_OFFSET_MS + 24 * 60 * 60 * 1000 - 1);

    // 3. 당일 비취소 주문 조회 (excludeOrderId가 있으면 삭제 예정 주문 제외)
    const whereClause: any = {
      clientId,
      orderedAt: { gte: todayStart, lte: todayEnd },
      status: { not: 'cancelled' },
    };
    if (excludeOrderId) {
      whereClause.id = { not: excludeOrderId };
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        orderNumber: true,
        productPrice: true,
        shippingFee: true,
        tax: true,
        totalAmount: true,
        adjustmentAmount: true,
        status: true,
        items: { select: { shipping: { select: { receiverType: true } } } },
      },
    });

    // 4. 스튜디오 배송 주문만 누적 (direct_customer 제외)
    let totalProductAmount = 0;
    const studioOrders: typeof orders = [];

    for (const order of orders) {
      const hasDirectCustomer = order.items.some(
        (i) => i.shipping?.receiverType === 'direct_customer',
      );
      if (!hasDirectCustomer) {
        totalProductAmount += Number(order.productPrice);
        studioOrders.push(order);
      }
    }

    // 5. 누적금액이 기준금액 이상이면 환급 유지 → 재계산 불필요
    if (totalProductAmount >= freeThreshold) {
      return { recharged: false, rechargeAmount: 0 };
    }

    // 6. 기준금액 미만 → adjustmentAmount가 0보다 큰 주문들의 환급을 리셋
    const ordersToReset = studioOrders.filter(
      (o) => Number(o.adjustmentAmount) > 0,
    );

    if (ordersToReset.length === 0) {
      return { recharged: false, rechargeAmount: 0 };
    }

    // 7. 재청구 대상 수집 (트랜잭션 후 전표 생성용)
    type RechargeTarget = {
      salesLedgerId: string;
      clientId: string;
      clientName: string;
      shippingFee: number;
      orderId: string;
      orderNumber: string;
    };
    const shippingRechargeTargets: RechargeTarget[] = [];
    let totalRechargeAmount = 0;

    // 8. 트랜잭션으로 일괄 업데이트
    await this.prisma.$transaction(async (tx) => {
      for (const order of ordersToReset) {
        const shippingFee = Number(order.shippingFee);
        const productPrice = Number(order.productPrice);
        const tax = Number(order.tax);
        const totalAmount = productPrice + tax + shippingFee;
        const finalAmount = totalAmount; // adjustmentAmount = 0이므로

        await tx.order.update({
          where: { id: order.id },
          data: {
            adjustmentAmount: 0,
            finalAmount: Math.max(0, finalAmount),
            processHistory: {
              create: {
                fromStatus: order.status,
                toStatus: order.status,
                processType: 'shipping_recalc',
                note: `합배송 환급 취소: 당일 누적 ${totalProductAmount.toLocaleString()}원 < 기준 ${freeThreshold.toLocaleString()}원`,
                processedBy: 'system',
              },
            },
          },
        });

        // 매출원장 연동 업데이트 + 재청구 대상 수집
        try {
          const ledger = await tx.salesLedger.findUnique({
            where: { orderId: order.id },
            select: { id: true, clientId: true, clientName: true, receivedAmount: true },
          });
          if (ledger) {
            const ledgerTotal = productPrice + tax + shippingFee; // adjustmentAmount = 0
            await tx.salesLedger.update({
              where: { orderId: order.id },
              data: {
                adjustmentAmount: 0,
                totalAmount: Math.max(0, ledgerTotal),
                outstandingAmount: Math.max(0, ledgerTotal - Number(ledger.receivedAmount)),
              },
            });
            if (shippingFee > 0) {
              shippingRechargeTargets.push({
                salesLedgerId: ledger.id,
                clientId: ledger.clientId,
                clientName: ledger.clientName,
                shippingFee,
                orderId: order.id,
                orderNumber: order.orderNumber,
              });
              totalRechargeAmount += shippingFee;
            }
          }
        } catch (err) {
          this.logger.warn(`합배송 재계산 매출원장 업데이트 실패 (${order.id}): ${(err as Error).message}`);
        }
      }
    });

    // 9. 배송비 재청구 회계 전표 생성 (트랜잭션 외부 — 실패 시 warn만)
    for (const target of shippingRechargeTargets) {
      try {
        await this.salesLedgerService.createShippingRechargeEntry(target);
      } catch (err) {
        this.logger.warn(`배송비 재청구 전표 생성 실패 (${target.orderId}): ${(err as Error).message}`);
      }
    }

    this.logger.log(
      `합배송 배송비 재계산: 거래처 ${clientId}, 당일누적 ${totalProductAmount}원 < 기준 ${freeThreshold}원 → ${ordersToReset.length}건 환급 취소, 재청구 ${totalRechargeAmount}원`,
    );

    return { recharged: shippingRechargeTargets.length > 0, rechargeAmount: totalRechargeAmount };
  }

  // ===== 합배송 체크: 당일 조건부 무료배송 적용 여부 =====
  async getSameDayShipping(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: { shippingType: true, freeShippingThreshold: true, pendingAdjustmentAmount: true, pendingAdjustmentReason: true } as any,
    }) as { shippingType: string; freeShippingThreshold: number; pendingAdjustmentAmount: any; pendingAdjustmentReason: string | null } | null;

    if (!client) {
      return {
        applicable: false,
        shippingType: null,
        totalProductAmount: 0,
        totalShippingCharged: 0,
        freeThreshold: 90000,
        ordersWithFee: [],
        pendingAdjustmentAmount: 0,
        pendingAdjustmentReason: null,
      };
    }

    // KST 기준 오늘 범위: UTC로 변환 (KST = UTC+9)
    const KST_OFFSET_MS_SD = 9 * 60 * 60 * 1000;
    const nowUtcSD = Date.now();
    const nowKstSD = nowUtcSD + KST_OFFSET_MS_SD;
    const kstMidnightSD = nowKstSD - (nowKstSD % (24 * 60 * 60 * 1000));
    const todayStart = new Date(kstMidnightSD - KST_OFFSET_MS_SD);
    const todayEnd = new Date(kstMidnightSD - KST_OFFSET_MS_SD + 24 * 60 * 60 * 1000 - 1);

    const orders = await this.prisma.order.findMany({
      where: {
        clientId,
        orderedAt: { gte: todayStart, lte: todayEnd },
        status: { not: 'cancelled' },
      },
      select: {
        id: true,
        orderNumber: true,
        productPrice: true,
        shippingFee: true,
        adjustmentAmount: true,
        items: { select: { shipping: { select: { receiverType: true } } } },
      },
    });

    let totalProductAmount = 0;
    let totalShippingCharged = 0;
    let totalAdjustmentApplied = 0;
    const ordersWithFee: { orderId: string; orderNumber: string; shippingFee: number }[] = [];

    for (const order of orders) {
      // 고객직배송(receiverType=direct_customer) 포함 주문은 합배송 집계 제외
      const hasDirectCustomer = order.items.some((i) => i.shipping?.receiverType === 'direct_customer');
      if (!hasDirectCustomer) {
        totalProductAmount += Number(order.productPrice);
        const fee = Number(order.shippingFee);
        if (fee > 0) {
          totalShippingCharged += fee;
          ordersWithFee.push({ orderId: order.id, orderNumber: order.orderNumber, shippingFee: fee });
        }
        totalAdjustmentApplied += Number(order.adjustmentAmount);
      }
    }

    // conditional 거래처: 조건부 무료배송 로직 전체 반환
    if (client.shippingType === 'conditional') {
      const netShippingCharged = Math.max(0, totalShippingCharged - totalAdjustmentApplied);
      return {
        applicable: true,
        shippingType: client.shippingType,
        totalProductAmount,
        totalShippingCharged: netShippingCharged,
        totalShippingOriginal: totalShippingCharged,
        totalShippingRefunded: Math.min(totalAdjustmentApplied, totalShippingCharged),
        ordersWithFee,
        freeThreshold: (client as any).freeShippingThreshold ?? 90000,
        pendingAdjustmentAmount: Number((client as any).pendingAdjustmentAmount ?? 0),
        pendingAdjustmentReason: (client as any).pendingAdjustmentReason ?? null,
      };
    }

    // 그 외 거래처(prepaid/cod 등): 금일 총주문금액만 반환 (배송비 무관)
    return {
      applicable: false,
      shippingType: client.shippingType,
      totalProductAmount,
      totalShippingCharged: 0,
      freeThreshold: 0,
      ordersWithFee: [],
      pendingAdjustmentAmount: Number((client as any).pendingAdjustmentAmount ?? 0),
      pendingAdjustmentReason: (client as any).pendingAdjustmentReason ?? null,
    };
  }

  // ===== 주문 취소 사전 조회 (배송비 재청구 여부 시뮬레이션) =====
  // DB 변경 없이 취소 시 배송비 재청구 여부와 실제 환불 금액을 계산하여 반환
  async getCancelPreview(orderId: string) {
    const order = await this.findOne(orderId);
    const orderAmount = Number(order.finalAmount);

    const client = await this.prisma.client.findUnique({
      where: { id: order.clientId },
      select: { shippingType: true, freeShippingThreshold: true } as any,
    }) as { shippingType: string; freeShippingThreshold: number | null } | null;

    if (!client || client.shippingType !== 'conditional') {
      return {
        orderAmount,
        shippingRecharged: false,
        shippingRechargeAmount: 0,
        effectiveRefundAmount: orderAmount,
      };
    }

    const freeThreshold = client.freeShippingThreshold ?? 90000;

    // KST 기준 오늘 범위
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const nowUtc = Date.now();
    const nowKst = nowUtc + KST_OFFSET_MS;
    const kstMidnight = nowKst - (nowKst % (24 * 60 * 60 * 1000));
    const todayStart = new Date(kstMidnight - KST_OFFSET_MS);
    const todayEnd = new Date(kstMidnight - KST_OFFSET_MS + 24 * 60 * 60 * 1000 - 1);

    // 해당 주문 제외 후 당일 나머지 주문의 누적 상품금액 계산
    const orders = await this.prisma.order.findMany({
      where: {
        clientId: order.clientId,
        orderedAt: { gte: todayStart, lte: todayEnd },
        status: { not: 'cancelled' },
        id: { not: orderId },
      },
      select: {
        id: true,
        productPrice: true,
        adjustmentAmount: true,
        shippingFee: true,
        items: { select: { shipping: { select: { receiverType: true } } } },
      },
    });

    let remainingProductAmount = 0;
    let rechargeAmount = 0;

    for (const o of orders) {
      const hasDirectCustomer = o.items.some(
        (i) => i.shipping?.receiverType === 'direct_customer',
      );
      if (!hasDirectCustomer) {
        remainingProductAmount += Number(o.productPrice);
        // 현재 adjustmentAmount(환급)가 있는 주문 = 취소 후 재청구 대상
        if (Number(o.adjustmentAmount) > 0 && Number(o.shippingFee) > 0) {
          rechargeAmount += Number(o.shippingFee);
        }
      }
    }

    const willBeBelowThreshold = remainingProductAmount < freeThreshold;

    return {
      orderAmount,
      shippingRecharged: willBeBelowThreshold && rechargeAmount > 0,
      shippingRechargeAmount: willBeBelowThreshold ? rechargeAmount : 0,
      effectiveRefundAmount: willBeBelowThreshold
        ? Math.max(0, orderAmount - rechargeAmount)
        : orderAmount,
    };
  }

  // ==================== currentProcess 일괄 동기화 (기존 데이터 보정) ====================
  async syncCurrentProcess() {
    const mismatched = await this.prisma.order.findMany({
      where: {
        NOT: { status: 'pending_receipt' },
        currentProcess: 'receipt_pending',
      },
      select: { id: true, status: true },
    });

    let updated = 0;
    for (const order of mismatched) {
      const newProcess = this.getDefaultProcessForStatus(order.status);
      if (newProcess) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { currentProcess: newProcess },
        });
        updated++;
      }
    }

    return { total: mismatched.length, updated };
  }

  // ==================== 편집/재출력/담당자/이력 (2026-04-29) ====================

  /** 두 객체 간 변경된 필드 diff 를 단순 비교로 추출 (얕은 비교, items 는 따로). */
  private diffOrderFields(prev: any, next: any, fields: string[]): Array<{ field: string; before: any; after: any }> {
    const out: Array<{ field: string; before: any; after: any }> = [];
    for (const f of fields) {
      const a = prev?.[f];
      const b = next?.[f];
      const aN = a === null || a === undefined ? null : (typeof a === 'object' ? JSON.stringify(a) : a);
      const bN = b === null || b === undefined ? null : (typeof b === 'object' ? JSON.stringify(b) : b);
      if (aN !== bN) out.push({ field: f, before: a ?? null, after: b ?? null });
    }
    return out;
  }

  /**
   * 감사로그 + 알림이 포함된 사양/금액 편집.
   * adjustOrder 와 동일한 가격 재계산을 수행하되, 변경 전/후 스냅샷을 비교하여 OrderEditHistory 를 남긴다.
   */
  async adjustOrderWithAudit(
    id: string,
    dto: EditOrderWithAuditDto,
    actor: { id: string; name?: string },
    opts?: { isSuperAdmin?: boolean; canChangeOrderAmount?: boolean },
  ) {
    // 1. 변경 전 스냅샷 (얕은 비교용)
    const prev = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!prev) throw new NotFoundException('주문을 찾을 수 없습니다');

    // 권한 체크: canChangeOrderAmount=false 인 일반 직원은 출력완료 이후 단계의 사양/금액 변경 불가
    const wantsAmountChange =
      dto.adjustmentAmount !== undefined ||
      (dto.itemUpdates?.some((u) => u.unitPrice !== undefined || u.quantity !== undefined) ?? false);
    const isPostProduction =
      (ORDER_REPRINT_REQUIRED_STATUSES as readonly string[]).includes(prev.status);
    if (wantsAmountChange && isPostProduction && opts?.canChangeOrderAmount === false) {
      throw new BadRequestException(
        '출력완료 이후 단계의 금액/수량 변경은 권한이 필요합니다 (canChangeOrderAmount).',
      );
    }

    // 2. 출력담당자 변경 (있을 경우)
    if (dto.assignPrintOperatorId !== undefined) {
      // 신규 담당자 실존 검증
      if (dto.assignPrintOperatorId) {
        const exists = await this.prisma.staff.findUnique({
          where: { id: dto.assignPrintOperatorId },
          select: { id: true },
        });
        if (!exists) {
          throw new BadRequestException(`존재하지 않는 직원입니다: ${dto.assignPrintOperatorId}`);
        }
      }
      await this.prisma.order.update({
        where: { id },
        data: {
          printOperatorId: dto.assignPrintOperatorId,
          printOperatorAssignedAt: new Date(),
        },
      });
    }

    // 3. 기존 adjustOrder 로직 재활용 (가격 재계산 + adjustmentReason 기록)
    const adjustDto: AdjustOrderDto = {
      adjustmentAmount: dto.adjustmentAmount,
      adjustmentReason: dto.adjustmentReason,
      itemUpdates: dto.itemUpdates,
    };
    const updated = await this.adjustOrder(id, adjustDto, actor.id, opts);

    // 4. 변경 후 스냅샷
    const next = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!next) throw new NotFoundException('주문이 사라졌습니다');

    // 5. diff 계산 (Order 헤더 + 각 OrderItem)
    const orderFields = ['adjustmentAmount', 'finalAmount', 'productPrice', 'totalAmount', 'printOperatorId'];
    const itemFields = [
      'quantity', 'unitPrice', 'totalPrice', 'pageLayout', 'bindingDirection',
      'fabricName', 'foilName', 'foilColor', 'foilPosition',
      'paper', 'printMethod', 'colorIntentId', 'printSide', 'fileSpecId',
      'bindingType', 'finishingOptions',
    ];
    const headerDiff = this.diffOrderFields(prev, next, orderFields);
    const itemDiffs: Array<{ itemId: string; changes: Array<{ field: string; before: any; after: any }> }> = [];
    for (const nextItem of next.items) {
      const prevItem = prev.items.find((p) => p.id === nextItem.id);
      const changes = this.diffOrderFields(prevItem, nextItem, itemFields);
      if (changes.length) itemDiffs.push({ itemId: nextItem.id, changes });
    }

    const changedFields: Prisma.InputJsonValue = {
      header: headerDiff,
      items: itemDiffs,
    };

    // 6. OrderEditHistory + lastEditedAt
    const history = await this.prisma.orderEditHistory.create({
      data: {
        orderId: id,
        editorId: actor.id,
        editorName: actor.name ?? actor.id,
        changedFields,
        message: dto.message ?? null,
        notifyOperator: dto.notifyOperator ?? false,
      },
    });
    await this.prisma.order.update({
      where: { id },
      data: { lastEditedAt: new Date() },
    });

    // 7. 알림 발송 (트랜잭션 외부 — fire-and-forget)
    if (dto.notifyOperator && next.printOperatorId) {
      try {
        await this.notificationService.create({
          recipientStaffId: next.printOperatorId,
          type: NOTIFICATION_TYPES.ORDER_EDIT,
          title: `주문 ${next.orderNumber} 사양 수정`,
          body: dto.message ?? '주문 사양이 수정되었습니다. 변경사항을 확인해 주세요.',
          payload: {
            orderId: id,
            orderNumber: next.orderNumber,
            changedFields,
            historyId: history.id,
          },
          link: `/orders/${id}`,
        });
      } catch (err) {
        this.logger.warn(`편집 알림 발송 실패 (${id}): ${(err as Error).message}`);
      }
    }

    return { ...updated, editHistoryId: history.id, lastEditedAt: new Date() };
  }

  /**
   * 재출력 요청 — OrderItem 의 일부 페이지에 대해 추가 출력 작업을 생성하고
   * Client.pendingAdjustmentAmount 에 추가비용을 음수로 누적한다.
   * Future: printSide / printMethod 변경에 따른 단가차이 반영 (1차 버전 SKIP — 페이지단가만 사용)
   */
  async requestReprint(
    orderId: string,
    dto: RequestReprintDto,
    actor: { id: string; name?: string },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, client: true },
    });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다');

    // 출력완료 이후 상태에서만 재출력 의미가 있음
    if (!(ORDER_REPRINT_REQUIRED_STATUSES as readonly string[]).includes(order.status)) {
      throw new BadRequestException(
        `재출력 요청은 출력완료 이후 단계에서만 가능합니다 (현재: ${order.status})`,
      );
    }

    // 기존 reprint job 수 (전체 주문 단위) → reprintNumber 결정
    const existingCount = await this.prisma.reprintJob.count({ where: { orderId } });
    const reprintNumber = existingCount + 1;

    // 항목별 비용 계산
    let totalAdditionalCost = 0;
    const jobsToCreate: Array<{
      parentOrderItemId: string;
      pages: number[];
      reason: string;
      additionalCost: number;
      reprintPages: Array<{ pageNumber: number; reason: string }>;
    }> = [];
    for (const item of dto.items) {
      const parent = order.items.find((i) => i.id === item.itemId);
      if (!parent) {
        throw new BadRequestException(`주문항목을 찾을 수 없습니다: ${item.itemId}`);
      }
      const totalPages = parent.pages || 0;
      if (!totalPages) {
        throw new BadRequestException(
          `재출력 단가 계산 불가: 항목 ${item.itemId} 의 pages 가 0 입니다`,
        );
      }
      // 페이지 범위 검증
      for (const p of item.pages) {
        if (p < 1 || p > totalPages) {
          throw new BadRequestException(
            `잘못된 페이지 번호: ${p} (item ${item.itemId}, total=${totalPages})`,
          );
        }
      }
      const unitPriceNum = Number(parent.unitPrice);
      const pagePrice = Math.round((unitPriceNum / totalPages) * 100) / 100;
      const itemCost = Math.round(pagePrice * item.pages.length * 100) / 100;
      totalAdditionalCost += itemCost;
      jobsToCreate.push({
        parentOrderItemId: item.itemId,
        pages: item.pages,
        reason: item.reason,
        additionalCost: itemCost,
        reprintPages: item.pages.map((pageNumber) => ({ pageNumber, reason: item.reason })),
      });
    }
    totalAdditionalCost = Math.round(totalAdditionalCost * 100) / 100;

    // 트랜잭션 내 처리
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. ReprintJob 생성 (다건)
      const createdJobs = [] as { id: string; parentOrderItemId: string; additionalCost: any }[];
      for (const job of jobsToCreate) {
        const created = await tx.reprintJob.create({
          data: {
            orderId,
            parentOrderItemId: job.parentOrderItemId,
            reprintNumber,
            reprintPages: job.reprintPages as Prisma.InputJsonValue,
            reason: job.reason,
            additionalCost: new Prisma.Decimal(job.additionalCost),
            status: 'requested',
            requestedById: actor.id,
          },
          select: { id: true, parentOrderItemId: true, additionalCost: true },
        });
        createdJobs.push(created);
      }

      // 2. OrderEditHistory (대표 1건 — items 정보를 changedFields 에 압축)
      const primaryHistory = await tx.orderEditHistory.create({
        data: {
          orderId,
          editorId: actor.id,
          editorName: actor.name ?? actor.id,
          changedFields: {
            type: 'reprint_request',
            reprintNumber,
            items: dto.items.map((i) => ({ itemId: i.itemId, pages: i.pages, reason: i.reason })),
            additionalCost: totalAdditionalCost,
          } as unknown as Prisma.InputJsonValue,
          changedPages: dto.items.map((i) => ({ itemId: i.itemId, pageNumbers: i.pages })) as unknown as Prisma.InputJsonValue,
          message: `재출력(${reprintNumber}차) 요청`,
          notifyOperator: dto.notifyOperator ?? true,
          reprintJobId: createdJobs[0]?.id ?? null,
        },
      });

      // 3. ProcessHistory + Order status 변경 (출력대기 큐 재인큐 포함)
      const transition = this.computeQueueTransition(
        (order as any).printQueueStatus ?? null,
        order.status,
        ORDER_STATUS.IN_PRODUCTION, // 큐 재진입 의도
      );
      const queuePatch = this.buildQueueTransitionPatch(transition);
      const historyEntries: any[] = [
        {
          fromStatus: order.status,
          toStatus: ORDER_STATUS.REPRINT_REQUESTED,
          processType: 'reprint_charge_added',
          note: `재출력(${reprintNumber}차) 추가비용 ${totalAdditionalCost.toLocaleString()}원 청구`,
          processedBy: actor.id,
        },
      ];
      if (queuePatch.historyEntry) {
        historyEntries.push({ ...queuePatch.historyEntry, processedBy: actor.id });
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.REPRINT_REQUESTED,
          lastEditedAt: new Date(),
          ...queuePatch.data,
          processHistory: { create: historyEntries },
        },
      });

      // 4. Client.pendingAdjustmentAmount 차감 (양수 비용을 음수로 누적)
      if (totalAdditionalCost > 0) {
        await tx.client.update({
          where: { id: order.clientId },
          data: {
            pendingAdjustmentAmount: { decrement: totalAdditionalCost },
            pendingAdjustmentReason: `주문 ${order.orderNumber} 재출력(${reprintNumber}차)`,
            pendingAdjustmentAt: new Date(),
          } as any,
        });
      }

      return {
        reprintNumber,
        additionalCost: totalAdditionalCost,
        jobIds: createdJobs.map((j) => j.id),
        historyId: primaryHistory.id,
      };
    });

    // 5. 알림 발송 (트랜잭션 외부)
    if ((dto.notifyOperator ?? true)) {
      if (order.printOperatorId) {
        try {
          await this.notificationService.create({
            recipientStaffId: order.printOperatorId,
            type: NOTIFICATION_TYPES.REPRINT_REQUEST,
            title: `주문 ${order.orderNumber} 재출력 요청 (${result.reprintNumber}차)`,
            body: `재출력이 요청되었습니다. 추가비용: ${result.additionalCost.toLocaleString()}원`,
            payload: {
              orderId,
              orderNumber: order.orderNumber,
              reprintNumber: result.reprintNumber,
              jobIds: result.jobIds,
            },
            link: `/orders/${orderId}`,
          });
        } catch (err) {
          this.logger.warn(`재출력 알림 발송 실패 (${orderId}): ${(err as Error).message}`);
        }
      } else {
        this.logger.warn(
          `재출력 알림 생략: 주문 ${order.orderNumber} 에 출력담당자가 지정되지 않았습니다`,
        );
      }
    }

    return result;
  }

  /**
   * 출력담당자 단독 변경/해제. 신·구 양쪽에 알림 발송하고 ProcessHistory 1건 기록.
   */
  async setPrintOperator(
    orderId: string,
    newOperatorId: string | null,
    actor: { id: string; name?: string },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, status: true, printOperatorId: true },
    });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다');

    // 신규 담당자 실존 검증
    if (newOperatorId) {
      const exists = await this.prisma.staff.findUnique({
        where: { id: newOperatorId },
        select: { id: true },
      });
      if (!exists) throw new BadRequestException(`존재하지 않는 직원입니다: ${newOperatorId}`);
    }

    const prevOperatorId = order.printOperatorId;
    if (prevOperatorId === newOperatorId) {
      return { changed: false, prevOperatorId, newOperatorId };
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        printOperatorId: newOperatorId,
        printOperatorAssignedAt: newOperatorId ? new Date() : null,
        processHistory: {
          create: {
            fromStatus: order.status,
            toStatus: order.status,
            processType: 'print_operator_changed',
            note: `출력담당자 변경: ${prevOperatorId ?? '(없음)'} → ${newOperatorId ?? '(해제)'}`,
            processedBy: actor.id,
          },
        },
      },
    });

    // 알림 (신·구 양쪽)
    const dtos: Array<Parameters<NotificationService['create']>[0]> = [];
    if (newOperatorId) {
      dtos.push({
        recipientStaffId: newOperatorId,
        type: NOTIFICATION_TYPES.PRINT_OPERATOR_ASSIGNED,
        title: `주문 ${order.orderNumber} 출력담당자 배정`,
        body: '귀하가 해당 주문의 출력담당자로 배정되었습니다.',
        payload: { orderId, orderNumber: order.orderNumber },
        link: `/orders/${orderId}`,
      });
    }
    if (prevOperatorId && prevOperatorId !== newOperatorId) {
      dtos.push({
        recipientStaffId: prevOperatorId,
        type: NOTIFICATION_TYPES.PRINT_OPERATOR_UNASSIGNED,
        title: `주문 ${order.orderNumber} 출력담당자 해제`,
        body: '해당 주문의 출력담당자에서 해제되었습니다.',
        payload: { orderId, orderNumber: order.orderNumber },
        link: `/orders/${orderId}`,
      });
    }
    if (dtos.length) {
      await this.notificationService.createMany(dtos).catch((err) => {
        this.logger.warn(`담당자 변경 알림 실패 (${orderId}): ${(err as Error).message}`);
      });
    }

    return { changed: true, prevOperatorId, newOperatorId };
  }

  /**
   * 주문 편집/재출력 이력 시계열 조회 (최신순). cursor=createdAt+id 페이지네이션.
   */
  async getEditHistory(
    orderId: string,
    opts: { limit?: number; cursor?: string } = {},
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다');

    const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
    let cursorClause: Prisma.OrderEditHistoryWhereUniqueInput | undefined;
    if (opts.cursor) {
      try {
        const decoded = Buffer.from(opts.cursor, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded) as { id: string };
        if (parsed?.id) cursorClause = { id: parsed.id };
      } catch {
        // ignore invalid cursor
      }
    }

    const items = await this.prisma.orderEditHistory.findMany({
      where: { orderId },
      include: {
        reprintJob: true,
        editor: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursorClause ? { cursor: cursorClause, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last
      ? Buffer.from(JSON.stringify({ id: last.id, createdAt: last.createdAt })).toString('base64')
      : null;

    return { items: data, nextCursor, hasMore };
  }
}
