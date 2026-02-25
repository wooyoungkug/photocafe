import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateBundleDto, BulkTrackingDto } from '../dto/shipping-mgmt.dto';
import { format } from 'date-fns';

@Injectable()
export class ShippingMgmtService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 배송준비 주문 목록 조회
   * - status = 'ready_for_shipping' 인 주문만 조회
   * - 검색, 택배사 필터, 페이지네이션 지원
   * - 묶음배송 후보(같은 수령인+연락처+주소) 자동 감지
   */
  async getReadyOrders(params: {
    page?: number;
    limit?: number;
    search?: string;
    courierCode?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ready_for_shipping',
      ...(params.search && {
        OR: [
          { orderNumber: { contains: params.search } },
          { shipping: { recipientName: { contains: params.search } } },
          { client: { clientName: { contains: params.search } } },
        ],
      }),
      ...(params.courierCode && {
        shipping: { courierCode: params.courierCode },
      }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { orderedAt: 'desc' },
        include: {
          client: { select: { clientCode: true, clientName: true } },
          shipping: true,
          items: {
            select: { productName: true, quantity: true, folderName: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // 묶음 가능 주문 감지 (같은 수령인+연락처+주소)
    const bundleCandidates = this.detectBundleCandidates(orders);

    return {
      data: orders.map((o) => ({
        ...o,
        bundleKey: bundleCandidates.get(o.id) || null,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * 바코드로 주문 조회 (바코드 스캔 기능용)
   */
  async getOrderByBarcode(barcode: string) {
    const include = {
      client: { select: { clientCode: true, clientName: true } },
      shipping: true,
      items: {
        select: { productName: true, quantity: true, folderName: true },
      },
    };
    const order =
      (await this.prisma.order.findUnique({ where: { barcode }, include })) ??
      (await this.prisma.order.findUnique({ where: { orderNumber: barcode }, include }));
    if (!order)
      throw new NotFoundException(`바코드 "${barcode}"에 해당하는 주문이 없습니다.`);
    return { order };
  }

  /**
   * 묶음배송 후보 감지
   * - ready_for_shipping 상태인 주문 중 같은 수령인+연락처+주소인 건을 그룹화
   * - 2건 이상인 그룹만 반환
   */
  async detectBundles() {
    const orders = await this.prisma.order.findMany({
      where: { status: 'ready_for_shipping' },
      include: {
        shipping: true,
        client: { select: { clientCode: true, clientName: true } },
        items: {
          select: { productName: true, quantity: true, folderName: true },
        },
      },
    });

    const groups = new Map<string, typeof orders>();
    for (const order of orders) {
      if (!order.shipping) continue;
      const key = [
        order.shipping.recipientName.trim(),
        order.shipping.phone.replace(/\D/g, ''),
        order.shipping.address.trim(),
      ].join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(order);
    }

    const candidates = Array.from(groups.entries())
      .filter(([, groupOrders]) => groupOrders.length > 1)
      .map(([, groupOrders]) => ({
        recipientName: groupOrders[0].shipping!.recipientName,
        address: groupOrders[0].shipping!.address,
        orders: groupOrders,
      }));

    const totalBundleable = candidates.reduce(
      (sum, c) => sum + c.orders.length,
      0,
    );

    return { candidates, totalBundleable };
  }

  /**
   * 묶음배송 생성
   * - 2건 이상의 주문을 하나의 묶음으로 그룹화
   * - 대표 수령인 정보는 첫 번째 주문의 배송정보 사용
   * - 공정이력에 묶음 생성 기록
   */
  async createBundle(dto: CreateBundleDto, userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { id: { in: dto.orderIds } },
      include: { shipping: true },
    });

    if (orders.length < 2) {
      throw new BadRequestException('묶음배송은 2건 이상이어야 합니다.');
    }

    const ordersWithShipping = orders.filter((o) => o.shipping);
    if (ordersWithShipping.length < 2) {
      throw new BadRequestException(
        '배송정보가 있는 주문이 2건 이상이어야 합니다.',
      );
    }

    const representative = ordersWithShipping[0].shipping!;
    const bundleNumber = await this.generateBundleNumber();

    const bundle = await this.prisma.$transaction(async (tx) => {
      const b = await tx.shipmentBundle.create({
        data: {
          bundleNumber,
          recipientName: representative.recipientName,
          recipientPhone: representative.phone,
          address: representative.address,
          status: 'pending',
        },
      });

      // 하위 주문 배송정보에 bundle 연결
      for (let i = 0; i < ordersWithShipping.length; i++) {
        await tx.orderShipping.update({
          where: { orderId: ordersWithShipping[i].id },
          data: { bundleId: b.id, bundleSeq: i + 1 },
        });

        // 공정이력 기록
        await tx.processHistory.create({
          data: {
            orderId: ordersWithShipping[i].id,
            fromStatus: ordersWithShipping[i].status,
            toStatus: ordersWithShipping[i].status,
            processType: 'bundle_created',
            note: `묶음배송 그룹: ${bundleNumber}`,
            processedBy: userId,
          },
        });
      }

      return b;
    });

    return this.prisma.shipmentBundle.findUnique({
      where: { id: bundle.id },
      include: { shipments: { include: { order: true } } },
    });
  }

  /**
   * 묶음배송 해제
   * - 연결된 OrderShipping의 bundleId, bundleSeq를 null로 변경
   * - ShipmentBundle 레코드 삭제
   */
  async dissolveBundle(bundleId: string) {
    const bundle = await this.prisma.shipmentBundle.findUnique({
      where: { id: bundleId },
    });
    if (!bundle) throw new NotFoundException('묶음배송을 찾을 수 없습니다.');

    await this.prisma.orderShipping.updateMany({
      where: { bundleId },
      data: { bundleId: null, bundleSeq: null },
    });
    await this.prisma.shipmentBundle.delete({ where: { id: bundleId } });
    return { success: true };
  }

  /**
   * 묶음배송 송장 일괄 업데이트
   * - 묶음에 포함된 모든 주문에 동일 송장번호 적용
   * - 주문 상태를 shipped로 변경
   * - 공정이력에 출고 기록
   */
  async updateBundleTracking(
    bundleId: string,
    courierCode: string,
    trackingNumber: string,
    userId: string,
  ) {
    const bundle = await this.prisma.shipmentBundle.findUnique({
      where: { id: bundleId },
      include: { shipments: true },
    });
    if (!bundle) throw new NotFoundException('묶음배송을 찾을 수 없습니다.');

    await this.prisma.$transaction(async (tx) => {
      // 묶음 자체 업데이트
      await tx.shipmentBundle.update({
        where: { id: bundleId },
        data: {
          courierCode,
          trackingNumber,
          status: 'shipped',
          shippedAt: new Date(),
        },
      });

      // 하위 주문들 일괄 업데이트
      for (const shipping of bundle.shipments) {
        await tx.orderShipping.update({
          where: { id: shipping.id },
          data: { courierCode, trackingNumber, shippedAt: new Date() },
        });
        await tx.order.update({
          where: { id: shipping.orderId },
          data: { status: 'shipped' },
        });
        await tx.processHistory.create({
          data: {
            orderId: shipping.orderId,
            fromStatus: 'ready_for_shipping',
            toStatus: 'shipped',
            processType: 'bundle_shipped',
            note: `묶음배송 출고: ${bundle.bundleNumber} / 송장: ${trackingNumber}`,
            processedBy: userId,
          },
        });
      }
    });

    return { success: true, bundleId, trackingNumber };
  }

  /**
   * 다건 송장 일괄 입력
   * - orderIds와 trackingNumbers를 순서대로 매칭하여 등록
   * - 개별 건이 실패하더라도 나머지 건은 계속 처리
   */
  async bulkUpdateTracking(dto: BulkTrackingDto, userId: string) {
    if (dto.orderIds.length !== dto.trackingNumbers.length) {
      throw new BadRequestException(
        '주문 ID 수와 운송장 번호 수가 일치하지 않습니다.',
      );
    }

    const results: Array<{
      orderId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (let i = 0; i < dto.orderIds.length; i++) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.orderShipping.update({
            where: { orderId: dto.orderIds[i] },
            data: {
              courierCode: dto.courierCode,
              trackingNumber: dto.trackingNumbers[i],
              shippedAt: new Date(),
            },
          });
          await tx.order.update({
            where: { id: dto.orderIds[i] },
            data: { status: 'shipped' },
          });
          await tx.processHistory.create({
            data: {
              orderId: dto.orderIds[i],
              fromStatus: 'ready_for_shipping',
              toStatus: 'shipped',
              processType: 'shipped',
              note: `송장 등록: ${dto.trackingNumbers[i]}`,
              processedBy: userId,
            },
          });
        });
        results.push({ orderId: dto.orderIds[i], success: true });
      } catch (e) {
        results.push({
          orderId: dto.orderIds[i],
          success: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return results;
  }

  /**
   * 같은 수령인+연락처+주소인 주문들을 묶음배송 후보로 감지
   * 2건 이상 있는 그룹만 Map에 포함
   */
  private detectBundleCandidates(orders: any[]) {
    const keyMap = new Map<string, string[]>();
    for (const o of orders) {
      if (!o.shipping) continue;
      const key = [
        o.shipping.recipientName?.trim(),
        o.shipping.phone?.replace(/\D/g, ''),
        o.shipping.address?.trim(),
      ].join('|');
      if (!keyMap.has(key)) keyMap.set(key, []);
      keyMap.get(key)!.push(o.id);
    }
    const result = new Map<string, string>();
    for (const [key, ids] of keyMap) {
      if (ids.length > 1) ids.forEach((id) => result.set(id, key));
    }
    return result;
  }

  /**
   * 묶음배송 번호 생성 (BND-YYYYMMDD-001 형식)
   */
  private async generateBundleNumber() {
    const today = format(new Date(), 'yyyyMMdd');
    const count = await this.prisma.shipmentBundle.count({
      where: { bundleNumber: { startsWith: `BND-${today}` } },
    });
    return `BND-${today}-${String(count + 1).padStart(3, '0')}`;
  }
}
