const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 주문 데이터 확인
    const orderCount = await prisma.order.count();
    console.log('주문 총 개수:', orderCount);

    if (orderCount > 0) {
      const orders = await prisma.order.findMany({
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          finalAmount: true,
          paymentStatus: true,
          paymentMethod: true,
          clientId: true,
          orderedAt: true,
        },
        orderBy: { orderedAt: 'desc' },
      });
      console.log('\n최근 주문 (결제 상태 포함):');
      console.log(JSON.stringify(orders, null, 2));

      // 결제 상태별 통계
      const statusCount = await prisma.order.groupBy({
        by: ['paymentStatus'],
        _count: true,
      });
      console.log('\n결제 상태별 통계:');
      console.log(JSON.stringify(statusCount, null, 2));
    }

    // 채권 데이터 확인
    const receivableCount = await prisma.receivable.count();
    console.log('\n채권 총 개수:', receivableCount);

    if (receivableCount > 0) {
      const receivables = await prisma.receivable.findMany({
        take: 3,
        select: {
          id: true,
          clientId: true,
          clientName: true,
          orderId: true,
          orderNumber: true,
          originalAmount: true,
          paidAmount: true,
          balance: true,
        },
      });
      console.log('\n채권 목록:');
      console.log(JSON.stringify(receivables, null, 2));
    }

    // 입금 데이터 확인
    const paymentCount = await prisma.receivablePayment.count();
    console.log('\n입금 총 개수:', paymentCount);

    if (paymentCount > 0) {
      const payments = await prisma.receivablePayment.findMany({
        take: 3,
        include: {
          receivable: {
            select: {
              clientName: true,
              orderNumber: true,
            },
          },
        },
      });
      console.log('\n입금 목록:');
      console.log(JSON.stringify(payments, null, 2));
    }
  } catch (error) {
    console.error('에러 발생:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
