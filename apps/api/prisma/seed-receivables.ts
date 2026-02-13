import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function seedReceivables() {
  console.log('🌱 미수금 테스트 데이터 생성 시작...');

  // 1. 거래처 확인 또는 생성
  const clients = await prisma.client.findMany({ take: 10 });
  if (clients.length === 0) {
    console.log('❌ 거래처가 없습니다. 먼저 거래처를 생성해주세요.');
    return;
  }
  console.log(`✅ 거래처 ${clients.length}개 확인`);

  // 2. 매출원장 생성
  const salesLedgers = [];
  const today = new Date();

  for (let i = 0; i < Math.min(clients.length, 5); i++) {
    const client = clients[i];
    const ledgerDate = new Date(today);
    ledgerDate.setDate(today.getDate() - Math.floor(Math.random() * 60)); // 최근 60일 이내

    const supplyAmount = Math.floor(Math.random() * 2000000) + 500000; // 50만~250만
    const vatAmount = Math.floor(supplyAmount * 0.1);
    const shippingFee = Math.floor(Math.random() * 50000); // 0~5만
    const totalAmount = supplyAmount + vatAmount + shippingFee;

    // 결제 상태 랜덤 (일부는 수금 완료, 일부는 미수)
    const isPaid = Math.random() > 0.5;
    const receivedAmount = isPaid ? totalAmount : (Math.random() > 0.5 ? Math.floor(totalAmount * 0.3) : 0);
    const outstandingAmount = totalAmount - receivedAmount;
    const paymentStatus = receivedAmount === totalAmount ? 'paid' : (receivedAmount > 0 ? 'partial' : 'unpaid');

    // 수금예정일 (30일 후)
    const dueDate = new Date(ledgerDate);
    dueDate.setDate(ledgerDate.getDate() + 30);

    // 주문번호 생성 (타임스탬프 사용으로 고유성 보장)
    const timestamp = Date.now();
    const orderNumber = `TEST-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-${timestamp}-${i}`;
    const ledgerNumber = `SL-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(ledgerDate.getDate()).padStart(2, '0')}-${timestamp}-${i}`;

    const salesLedger = await prisma.salesLedger.create({
      data: {
        ledgerNumber,
        ledgerDate,
        clientId: client.id,
        clientName: client.clientName,
        clientBizNo: client.businessNumber,
        orderId: `test-order-${timestamp}-${i}`,
        orderNumber,
        salesType: 'ALBUM',
        taxType: 'TAXABLE',
        supplyAmount: new Decimal(supplyAmount),
        vatAmount: new Decimal(vatAmount),
        shippingFee: new Decimal(shippingFee),
        totalAmount: new Decimal(totalAmount),
        receivedAmount: new Decimal(receivedAmount),
        outstandingAmount: new Decimal(outstandingAmount),
        paymentMethod: 'postpaid',
        paymentStatus,
        dueDate,
        salesStatus: 'CONFIRMED',
        description: `${client.clientName} 앨범 인쇄 매출`,
        createdBy: 'seed-script',
        items: {
          create: [
            {
              itemName: '웨딩앨범',
              specification: '30x30cm, 40페이지',
              quantity: Math.floor(Math.random() * 10) + 1,
              unitPrice: new Decimal(Math.floor(supplyAmount * 0.6)),
              supplyAmount: new Decimal(Math.floor(supplyAmount * 0.6)),
              vatAmount: new Decimal(Math.floor(supplyAmount * 0.06)),
              totalAmount: new Decimal(Math.floor(supplyAmount * 0.66)),
              salesType: 'ALBUM',
              sortOrder: 0,
            },
            {
              itemName: '디지털 액자',
              specification: '20x30cm',
              quantity: Math.floor(Math.random() * 5) + 1,
              unitPrice: new Decimal(Math.floor(supplyAmount * 0.4)),
              supplyAmount: new Decimal(Math.floor(supplyAmount * 0.4)),
              vatAmount: new Decimal(Math.floor(supplyAmount * 0.04)),
              totalAmount: new Decimal(Math.floor(supplyAmount * 0.44)),
              salesType: 'ALBUM',
              sortOrder: 1,
            },
          ],
        },
      },
    });

    // 부분 수금인 경우 수금 이력 생성
    if (receivedAmount > 0) {
      const receiptDate = new Date(ledgerDate);
      receiptDate.setDate(ledgerDate.getDate() + Math.floor(Math.random() * 15) + 1);
      const receiptNumber = `SR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(receiptDate.getDate()).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`;

      await prisma.salesReceipt.create({
        data: {
          salesLedgerId: salesLedger.id,
          receiptNumber,
          receiptDate,
          amount: new Decimal(receivedAmount),
          paymentMethod: Math.random() > 0.5 ? 'bank_transfer' : 'card',
          bankName: '기업은행',
          depositorName: client.clientName,
          note: `${client.clientName} 수금`,
          createdBy: 'seed-script',
        },
      });
    }

    salesLedgers.push(salesLedger);
    console.log(`✅ ${client.clientName} - ${ledgerNumber} 생성 (${paymentStatus})`);
  }

  // 3. 추가로 연체 건 생성
  const overdueClient = clients[0];
  const overdueDate = new Date(today);
  overdueDate.setDate(today.getDate() - 45); // 45일 전

  const overdueTimestamp = Date.now() + 1000;
  const overdueLedger = await prisma.salesLedger.create({
    data: {
      ledgerNumber: `SL-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}99-${overdueTimestamp}`,
      ledgerDate: overdueDate,
      clientId: overdueClient.id,
      clientName: overdueClient.clientName,
      clientBizNo: overdueClient.businessNumber,
      orderId: `test-overdue-order-${overdueTimestamp}`,
      orderNumber: `TEST-OVERDUE-${overdueTimestamp}`,
      salesType: 'ALBUM',
      taxType: 'TAXABLE',
      supplyAmount: new Decimal(1500000),
      vatAmount: new Decimal(150000),
      shippingFee: new Decimal(30000),
      totalAmount: new Decimal(1680000),
      receivedAmount: new Decimal(0),
      outstandingAmount: new Decimal(1680000),
      paymentMethod: 'postpaid',
      paymentStatus: 'overdue',
      dueDate: new Date(overdueDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      salesStatus: 'CONFIRMED',
      description: `${overdueClient.clientName} 연체 건`,
      createdBy: 'seed-script',
      items: {
        create: [
          {
            itemName: '프리미엄 앨범',
            specification: '40x40cm, 60페이지',
            quantity: 3,
            unitPrice: new Decimal(500000),
            supplyAmount: new Decimal(1500000),
            vatAmount: new Decimal(150000),
            totalAmount: new Decimal(1650000),
            salesType: 'ALBUM',
            sortOrder: 0,
          },
        ],
      },
    },
  });

  console.log(`⚠️  연체 건 생성: ${overdueLedger.ledgerNumber} (1,680,000원)`);

  console.log(`\n✅ 총 ${salesLedgers.length + 1}건의 매출원장 생성 완료`);
  console.log(`📊 미수금 데이터가 준비되었습니다!`);
}

seedReceivables()
  .catch((e) => {
    console.error('❌ 시드 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
