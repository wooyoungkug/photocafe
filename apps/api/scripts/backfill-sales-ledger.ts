/**
 * 기존 주문에 대한 매출원장 백필 스크립트
 * 실행: npx ts-node scripts/backfill-sales-ledger.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateLedgerNumber(index: number): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `SL-${dateStr}-`;
  return `${prefix}${(index).toString().padStart(3, '0')}`;
}

async function main() {
  console.log('매출원장 백필 시작...');

  // 매출원장이 없는 주문 조회
  const orders = await prisma.order.findMany({
    where: {
      status: { not: 'cancelled' },
    },
    include: {
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          size: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
      client: true,
    },
    orderBy: { orderedAt: 'asc' },
  });

  // 이미 매출원장이 있는 주문 ID 조회
  const existingLedgers = await prisma.salesLedger.findMany({
    select: { orderId: true },
  });
  const existingOrderIds = new Set(existingLedgers.map(l => l.orderId));

  const ordersToBackfill = orders.filter(o => !existingOrderIds.has(o.id));
  console.log(`백필 대상: ${ordersToBackfill.length}건`);

  let created = 0;
  let failed = 0;

  for (let i = 0; i < ordersToBackfill.length; i++) {
    const order = ordersToBackfill[i];
    try {
      const ledgerNumber = await generateLedgerNumber(i + 1);

      const supplyAmount = Number(order.productPrice);
      const vatAmount = Number(order.tax);
      const shippingFee = Number(order.shippingFee);
      const totalAmount = Number(order.finalAmount);

      const isPrepaid = order.paymentMethod === 'prepaid' || order.paymentMethod === 'card';
      const receivedAmount = isPrepaid ? totalAmount : 0;
      const outstandingAmount = isPrepaid ? 0 : totalAmount;
      const paymentStatus = isPrepaid ? 'paid' : 'unpaid';

      const ledgerItems = order.items.map((item, index) => {
        const itemVat = Math.round(Number(item.totalPrice) * 0.1);
        return {
          orderItemId: item.id,
          itemName: item.productName,
          specification: item.size,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          supplyAmount: Number(item.totalPrice),
          vatAmount: itemVat,
          totalAmount: Number(item.totalPrice) + itemVat,
          salesType: 'ALBUM' as const,
          productId: item.productId,
          sortOrder: index,
        };
      });

      await prisma.salesLedger.create({
        data: {
          ledgerNumber,
          ledgerDate: order.orderedAt,
          clientId: order.clientId,
          clientName: order.client.clientName,
          clientBizNo: order.client.businessNumber,
          orderId: order.id,
          orderNumber: order.orderNumber,
          salesType: 'ALBUM',
          taxType: 'TAXABLE',
          supplyAmount,
          vatAmount,
          shippingFee,
          totalAmount,
          receivedAmount,
          outstandingAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus,
          salesStatus: 'REGISTERED',
          description: `${order.orderNumber} 매출`,
          createdBy: 'system-backfill',
          items: {
            create: ledgerItems,
          },
        },
      });
      created++;
      console.log(`  [${created}] ${order.orderNumber} → ${ledgerNumber}`);
    } catch (err: any) {
      console.error(`  실패: ${order.orderNumber} - ${err.message}`);
      failed++;
    }
  }

  console.log(`\n완료: 생성 ${created}건, 실패 ${failed}건`);
  await prisma.$disconnect();
}

main().catch(console.error);
