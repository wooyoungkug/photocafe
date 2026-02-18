const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 최근 10개 주문을 결제 완료 상태로 변경
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { orderedAt: 'desc' },
      select: { id: true, orderNumber: true },
    });

    console.log(`${orders.length}개 주문을 결제 완료 상태로 변경합니다...`);

    for (const order of orders) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'paid' },
      });
      console.log(`✓ ${order.orderNumber} - 결제 완료`);
    }

    console.log('\n완료! 결제 상태별 통계:');
    const statusCount = await prisma.order.groupBy({
      by: ['paymentStatus'],
      _count: true,
    });
    console.log(JSON.stringify(statusCount, null, 2));
  } catch (error) {
    console.error('에러 발생:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
