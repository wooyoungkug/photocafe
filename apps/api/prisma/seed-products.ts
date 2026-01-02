import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProducts() {
  console.log('Seeding products...');

  // 카테고리 조회
  const categories = await prisma.category.findMany();
  const categoryMap: Record<string, string> = {};
  categories.forEach(c => {
    if (c.code) {
      categoryMap[c.code] = c.id;
    }
  });

  // 상품 데이터
  const products = [
    // 포토북 - 하드커버
    {
      productCode: 'PB-HC-001',
      productName: '프리미엄 하드커버 포토북 8x8',
      categoryCode: '02010000',
      basePrice: 45000,
      description: '고급 하드커버 재질의 8x8 정사각 포토북입니다.',
      isNew: true,
      isBest: true,
    },
    {
      productCode: 'PB-HC-002',
      productName: '프리미엄 하드커버 포토북 10x10',
      categoryCode: '02010000',
      basePrice: 55000,
      description: '고급 하드커버 재질의 10x10 정사각 포토북입니다.',
      isNew: true,
    },
    {
      productCode: 'PB-HC-003',
      productName: '프리미엄 하드커버 포토북 A4',
      categoryCode: '02010000',
      basePrice: 65000,
      description: '고급 하드커버 재질의 A4 세로형 포토북입니다.',
    },
    // 포토북 - 소프트커버
    {
      productCode: 'PB-SC-001',
      productName: '소프트커버 포토북 A5',
      categoryCode: '02020000',
      basePrice: 25000,
      description: '가볍고 실용적인 A5 소프트커버 포토북입니다.',
    },
    {
      productCode: 'PB-SC-002',
      productName: '소프트커버 포토북 A4',
      categoryCode: '02020000',
      basePrice: 35000,
      description: '가볍고 실용적인 A4 소프트커버 포토북입니다.',
      isBest: true,
    },
    // 포토북 - 레이플랫
    {
      productCode: 'PB-LF-001',
      productName: '레이플랫 포토북 12x12',
      categoryCode: '02030000',
      basePrice: 85000,
      description: '180도 펼침이 가능한 프리미엄 레이플랫 포토북입니다.',
      isNew: true,
      isBest: true,
    },
    // 앨범 - 웨딩앨범
    {
      productCode: 'AL-WD-001',
      productName: '프리미엄 웨딩앨범 30페이지',
      categoryCode: '03010000',
      basePrice: 350000,
      description: '결혼식의 아름다운 순간을 담은 프리미엄 웨딩앨범입니다.',
      isBest: true,
    },
    {
      productCode: 'AL-WD-002',
      productName: '프리미엄 웨딩앨범 40페이지',
      categoryCode: '03010000',
      basePrice: 450000,
      description: '결혼식의 아름다운 순간을 담은 프리미엄 웨딩앨범입니다.',
    },
    // 앨범 - 가족앨범
    {
      productCode: 'AL-FM-001',
      productName: '가족사진 앨범 20페이지',
      categoryCode: '03020000',
      basePrice: 120000,
      description: '가족의 소중한 추억을 담은 고급 앨범입니다.',
    },
    // 앨범 - 베이비앨범
    {
      productCode: 'AL-BB-001',
      productName: '베이비 성장앨범 12개월',
      categoryCode: '03030000',
      basePrice: 150000,
      description: '아기의 첫 1년을 기록하는 특별한 성장앨범입니다.',
      isNew: true,
    },
    // 액자 - 우드액자
    {
      productCode: 'FR-WD-001',
      productName: '원목 우드액자 5x7',
      categoryCode: '04010000',
      basePrice: 25000,
      description: '자연스러운 원목 느낌의 5x7 액자입니다.',
    },
    {
      productCode: 'FR-WD-002',
      productName: '원목 우드액자 8x10',
      categoryCode: '04010000',
      basePrice: 35000,
      description: '자연스러운 원목 느낌의 8x10 액자입니다.',
      isBest: true,
    },
    // 액자 - 메탈액자
    {
      productCode: 'FR-MT-001',
      productName: '메탈 프레임 액자 A4',
      categoryCode: '04020000',
      basePrice: 40000,
      description: '모던한 메탈 프레임의 A4 액자입니다.',
    },
    // 액자 - 아크릴액자
    {
      productCode: 'FR-AC-001',
      productName: '아크릴 액자 6x8',
      categoryCode: '04030000',
      basePrice: 30000,
      description: '투명하고 깔끔한 아크릴 액자입니다.',
      isNew: true,
    },
    // 출력물 - 포스터
    {
      productCode: 'PR-PS-001',
      productName: 'A3 포스터 출력',
      categoryCode: '05010000',
      basePrice: 5000,
      description: '고품질 A3 사이즈 포스터 출력입니다.',
    },
    {
      productCode: 'PR-PS-002',
      productName: 'A2 포스터 출력',
      categoryCode: '05010000',
      basePrice: 8000,
      description: '고품질 A2 사이즈 포스터 출력입니다.',
    },
    // 출력물 - 캔버스
    {
      productCode: 'PR-CV-001',
      productName: '캔버스 프린트 30x40',
      categoryCode: '05020000',
      basePrice: 45000,
      description: '고급 캔버스에 인쇄된 30x40cm 사진입니다.',
      isBest: true,
    },
    // 굿즈 - 달력
    {
      productCode: 'GD-CL-001',
      productName: '탁상 달력 (13매)',
      categoryCode: '06010000',
      basePrice: 15000,
      description: '사진으로 만드는 나만의 탁상 달력입니다.',
      isNew: true,
    },
    {
      productCode: 'GD-CL-002',
      productName: '벽걸이 달력 (13매)',
      categoryCode: '06010000',
      basePrice: 20000,
      description: '사진으로 만드는 나만의 벽걸이 달력입니다.',
    },
    // 굿즈 - 머그컵
    {
      productCode: 'GD-MG-001',
      productName: '포토 머그컵',
      categoryCode: '06020000',
      basePrice: 12000,
      description: '사진이 인쇄된 개성 있는 머그컵입니다.',
    },
    // 굿즈 - 폰케이스
    {
      productCode: 'GD-PC-001',
      productName: '커스텀 폰케이스',
      categoryCode: '06030000',
      basePrice: 18000,
      description: '나만의 사진으로 만드는 폰케이스입니다.',
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    const { categoryCode, ...productData } = product;
    const categoryId = categoryMap[categoryCode];

    if (!categoryId) {
      console.log(`Skipping ${product.productName}: category ${categoryCode} not found`);
      skipped++;
      continue;
    }

    const existing = await prisma.product.findFirst({
      where: { productCode: product.productCode },
    });

    const productRecord = existing || await prisma.product.create({
      data: {
        ...productData,
        categoryId,
        isActive: true,
      },
    });

    if (!existing) {
      console.log(`Created: ${product.productName}`);
      created++;
    } else {
      console.log(`Exists: ${product.productName}`);
      skipped++;
    }

    // 규격 옵션 추가
    const specCount = await prisma.productSpecification.count({ where: { productId: productRecord.id } });
    if (specCount === 0) {
      const specs = [
        { name: 'A4 세로', widthMm: 210, heightMm: 297, price: 0, isDefault: true, sortOrder: 0 },
        { name: 'A4 가로', widthMm: 297, heightMm: 210, price: 5000, isDefault: false, sortOrder: 1 },
        { name: 'A3', widthMm: 297, heightMm: 420, price: 15000, isDefault: false, sortOrder: 2 },
      ];
      for (const spec of specs) {
        await prisma.productSpecification.create({ data: { productId: productRecord.id, ...spec } });
      }
      console.log(`  - 규격 옵션 추가됨`);
    }

    // 제본 옵션 추가 (포토북, 앨범만)
    if (product.productCode.startsWith('PB') || product.productCode.startsWith('AL')) {
      const bindingCount = await prisma.productBinding.count({ where: { productId: productRecord.id } });
      if (bindingCount === 0) {
        const bindings = [
          { name: '무선제본', price: 0, isDefault: true, sortOrder: 0 },
          { name: '양장제본', price: 8000, isDefault: false, sortOrder: 1 },
          { name: '스프링제본', price: 3000, isDefault: false, sortOrder: 2 },
        ];
        for (const b of bindings) {
          await prisma.productBinding.create({ data: { productId: productRecord.id, ...b } });
        }
        console.log(`  - 제본 옵션 추가됨`);
      }
    }

    // 용지 옵션 추가 (포토북, 출력물만)
    if (product.productCode.startsWith('PB') || product.productCode.startsWith('PR')) {
      const paperCount = await prisma.productPaper.count({ where: { productId: productRecord.id } });
      if (paperCount === 0) {
        const papers = [
          { name: '스노우화이트 200g', type: 'normal', price: 0, isDefault: true, sortOrder: 0 },
          { name: '아트지 250g', type: 'premium', price: 5000, isDefault: false, sortOrder: 1 },
          { name: '모조지 150g', type: 'normal', price: -3000, isDefault: false, sortOrder: 2 },
        ];
        for (const p of papers) {
          await prisma.productPaper.create({ data: { productId: productRecord.id, ...p } });
        }
        console.log(`  - 용지 옵션 추가됨`);
      }
    }
  }

  console.log(`\nSeeding completed! Created: ${created}, Skipped: ${skipped}`);
}

seedProducts()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
