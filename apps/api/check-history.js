const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const count = await p.processHistory.count();
    console.log('Total process_histories:', count);

    const orders = await p.order.findMany({
      select: {
        orderNumber: true,
        status: true,
        _count: { select: { processHistory: true } }
      },
      orderBy: { orderedAt: 'desc' },
      take: 12
    });
    console.log(JSON.stringify(orders, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
})();
