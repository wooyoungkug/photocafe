import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 샘플 상품 및 주문 데이터 시딩 시작...');

  // 1. 카테고리 조회
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: { children: true },
  });
  console.log(`📁 카테고리 ${categories.length}개 조회됨`);

  // 2. 거래처 조회
  const clients = await prisma.client.findMany({
    where: { status: 'active' },
  });
  console.log(`👥 거래처 ${clients.length}개 조회됨`);

  if (clients.length === 0) {
    console.log('❌ 거래처가 없습니다. 먼저 거래처를 생성해주세요.');
    return;
  }

  // 3. 샘플 상품 생성
  const sampleProducts = [
    {
      productCode: 'ALB-001',
      productName: '압축 앨범 (8x8)',
      categoryCode: '02000000', // 디지털출력
      basePrice: 25000,
    },
    {
      productCode: 'ALB-002',
      productName: '화보 앨범 (10x10)',
      categoryCode: '02000000', // 디지털출력
      basePrice: 45000,
    },
    {
      productCode: 'PRT-001',
      productName: '포스터 A2 출력',
      categoryCode: '02010000', // HP Indigo
      basePrice: 8000,
    },
    {
      productCode: 'PRT-002',
      productName: '명함 양면 인쇄',
      categoryCode: '02020000', // Cannon 플로터
      basePrice: 5000,
    },
    {
      productCode: 'FRM-001',
      productName: '원목 액자 8x10',
      categoryCode: '01000000', // 액자
      basePrice: 35000,
    },
    {
      productCode: 'FRM-002',
      productName: '아크릴 액자 A4',
      categoryCode: '01020000', // 아크릴액자
      basePrice: 28000,
    },
  ];

  const createdProducts: any[] = [];

  for (const prod of sampleProducts) {
    const category = categories.find((c) => c.code === prod.categoryCode);
    if (!category) {
      console.log(`⚠️ 카테고리 ${prod.categoryCode}를 찾을 수 없습니다. ${prod.productName} 스킵`);
      continue;
    }

    const existing = await prisma.product.findUnique({
      where: { productCode: prod.productCode },
    });

    if (existing) {
      console.log(`⏭️ 상품 ${prod.productCode} 이미 존재`);
      createdProducts.push(existing);
      continue;
    }

    const created = await prisma.product.create({
      data: {
        productCode: prod.productCode,
        productName: prod.productName,
        categoryId: category.id,
        basePrice: new Prisma.Decimal(prod.basePrice),
        isActive: true,
        isNew: true,
      },
    });

    console.log(`✅ 상품 생성: ${created.productName}`);
    createdProducts.push(created);
  }

  console.log(`📦 총 ${createdProducts.length}개 상품 준비됨`);

  // 4. 샘플 주문 생성 (최근 90일 데이터)
  const now = new Date();
  const statuses = ['pending_receipt', 'received', 'in_production', 'completed'];
  const paymentStatuses = ['pending', 'paid'];
  const printMethods = ['HP Indigo', 'Offset', 'Digital'];
  const papers = ['아트지 200g', '모조지 150g', '스노우지 250g'];
  const bindingTypes = ['무선제본', '중철제본', '양장제본', '스프링제본'];
  const sizes = ['A4', 'A3', 'B5', '8x10', '10x10'];

  let orderCount = 0;

  // 3개월치 데이터 생성 (주문 100개 정도)
  for (let dayOffset = 0; dayOffset < 90; dayOffset += 1) {
    const ordersPerDay = Math.floor(Math.random() * 3) + 1; // 1~3개 주문/일

    for (let j = 0; j < ordersPerDay; j++) {
      const orderDate = new Date(now);
      orderDate.setDate(orderDate.getDate() - dayOffset);
      orderDate.setHours(Math.floor(Math.random() * 10) + 9); // 9~18시
      orderDate.setMinutes(Math.floor(Math.random() * 60));

      const client = clients[Math.floor(Math.random() * clients.length)];
      const orderNumber = `ORD-${orderDate.getFullYear()}${String(orderDate.getMonth() + 1).padStart(2, '0')}${String(orderDate.getDate()).padStart(2, '0')}-${String(orderCount + 1).padStart(4, '0')}`;
      const barcode = `BC${Date.now()}${orderCount}`;

      // 주문당 1~4개 상품
      const itemCount = Math.floor(Math.random() * 4) + 1;
      const selectedProducts = [];
      for (let k = 0; k < itemCount; k++) {
        selectedProducts.push(createdProducts[Math.floor(Math.random() * createdProducts.length)]);
      }

      let productPrice = new Prisma.Decimal(0);
      const items: any[] = [];

      for (let k = 0; k < selectedProducts.length; k++) {
        const product = selectedProducts[k];
        const quantity = Math.floor(Math.random() * 10) + 1;
        const unitPrice = product.basePrice;
        const totalPrice = new Prisma.Decimal(Number(unitPrice) * quantity);
        productPrice = productPrice.add(totalPrice);

        items.push({
          productionNumber: `PRD-${orderNumber}-${k + 1}`,
          productId: product.id,
          productName: product.productName,
          size: sizes[Math.floor(Math.random() * sizes.length)],
          pages: Math.floor(Math.random() * 50) + 10,
          printMethod: printMethods[Math.floor(Math.random() * printMethods.length)],
          paper: papers[Math.floor(Math.random() * papers.length)],
          bindingType: bindingTypes[Math.floor(Math.random() * bindingTypes.length)],
          quantity,
          unitPrice,
          totalPrice,
        });
      }

      const shippingFee = new Prisma.Decimal(3000);
      const tax = productPrice.mul(0.1);
      const totalAmount = productPrice.add(shippingFee);
      const finalAmount = totalAmount.add(tax);

      try {
        await prisma.order.create({
          data: {
            orderNumber,
            barcode,
            clientId: client.id,
            productPrice,
            shippingFee,
            tax,
            adjustmentAmount: new Prisma.Decimal(0),
            totalAmount,
            finalAmount,
            paymentMethod: 'postpaid',
            paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            currentProcess: 'receipt_pending',
            isUrgent: Math.random() > 0.8,
            orderedAt: orderDate,
            createdAt: orderDate,
            items: {
              create: items,
            },
          },
        });

        orderCount++;
        if (orderCount % 10 === 0) {
          console.log(`📝 ${orderCount}개 주문 생성됨...`);
        }
      } catch (error: any) {
        console.log(`⚠️ 주문 생성 실패: ${error.message}`);
      }
    }
  }

  console.log(`✅ 총 ${orderCount}개 주문 생성 완료`);

  // 5. 통계 확인
  const orderStats = await prisma.order.aggregate({
    _count: true,
    _sum: {
      productPrice: true,
      totalAmount: true,
    },
  });

  console.log('\n📊 주문 통계:');
  console.log(`  - 총 주문 수: ${orderStats._count}`);
  console.log(`  - 총 상품 금액: ${orderStats._sum.productPrice?.toString()}원`);
  console.log(`  - 총 주문 금액: ${orderStats._sum.totalAmount?.toString()}원`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
