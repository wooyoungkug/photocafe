import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProductionCategories() {
  console.log('Seeding production categories...');

  // 대분류 생성
  const largeCategories = [
    {
      code: '01010000',
      name: '출력전용',
      description: '기본 출력 옵션 (포토북, 앨범 등)',
      categoryType: 'HALF',
      pricingUnit: 'paper_based',
    },
    {
      code: '16050000',
      name: '박',
      description: '박(호일) 종류',
      categoryType: 'HALF',
    },
    {
      code: '16090000',
      name: '박위치',
      description: '박 적용 위치',
      categoryType: 'HALF',
    },
  ];

  const createdLarge: Record<string, string> = {};

  for (const cat of largeCategories) {
    const existing = await prisma.category.findFirst({
      where: { code: cat.code },
    });

    if (!existing) {
      const created = await prisma.category.create({
        data: {
          ...cat,
          level: 'large',
          depth: 1,
          isActive: true,
          isTopMenu: false,
        },
      });
      createdLarge[cat.code] = created.id;
      console.log('Created large: ' + cat.name);
    } else {
      createdLarge[cat.code] = existing.id;
      console.log('Exists large: ' + cat.name);
    }
  }

  // 중분류 - 출력전용 하위
  const outputCategories = [
    { code: '01010600', name: '포토북', parentCode: '01010000', description: '용지별 출력단가', pricingUnit: 'paper_based' },
    { code: '01010300', name: '초중고졸업', parentCode: '01010000', description: '용지별 출력단가', pricingUnit: 'paper_based' },
    { code: '01010100', name: '웨딩베이비', parentCode: '01010000', description: '용지별 출력단가', pricingUnit: 'paper_based' },
    { code: '01010200', name: '유치원졸업', parentCode: '01010000', description: '용지별 출력단가', pricingUnit: 'paper_based' },
    { code: '01010400', name: '인디고스냅고정단가', parentCode: '01010000', description: '후가공/규격별/페이지당', pricingUnit: 'size_based' },
    { code: '01010500', name: 'No Price', parentCode: '01010000', description: '용지별 출력단가', pricingUnit: 'paper_based' },
    { code: '01010700', name: '앨범수리용', parentCode: '01010000', description: '후가공/규격별/페이지당', pricingUnit: 'size_based' },
    { code: '01011000', name: '인디고출력고정단가', parentCode: '01010000', description: '후가공/규격별/페이지당', pricingUnit: 'size_based' },
    { code: '01011100', name: '잉크젯_앨범고정단가', parentCode: '01010000', description: '후가공/규격별/페이지당', pricingUnit: 'per_item' },
    { code: '01011200', name: '잉크젯 출력(액자출력)', parentCode: '01010000', description: '후가공/규격별/페이지당', pricingUnit: 'size_based' },
  ];

  // 중분류 - 박 하위
  const foilCategories = [
    { code: '16050100', name: '무광금박', parentCode: '16050000', description: '박Color' },
    { code: '16050200', name: '유광금박', parentCode: '16050000', description: '박Color' },
    { code: '16050300', name: '무광은박', parentCode: '16050000', description: '박Color' },
    { code: '16050400', name: '유광은박', parentCode: '16050000', description: '박Color' },
    { code: '16050500', name: '브라운', parentCode: '16050000', description: '박Color' },
    { code: '16050600', name: '블랙', parentCode: '16050000', description: '박Color' },
    { code: '16050700', name: '볼박', parentCode: '16050000', description: '박Color' },
    { code: '16050800', name: '화이트', parentCode: '16050000', description: '박Color' },
  ];

  // 중분류 - 박위치 하위
  const foilPositionCategories = [
    { code: '16090100', name: '정중앙', parentCode: '16090000', description: '박위치' },
    { code: '16090200', name: '상단중앙', parentCode: '16090000', description: '박위치' },
    { code: '16090300', name: '하단중앙', parentCode: '16090000', description: '박위치' },
    { code: '16090400', name: '좌측상단', parentCode: '16090000', description: '박위치' },
    { code: '16090500', name: '우측상단', parentCode: '16090000', description: '박위치' },
    { code: '16090600', name: '좌측하단', parentCode: '16090000', description: '박위치' },
    { code: '16090700', name: '우측하단', parentCode: '16090000', description: '박위치' },
  ];

  const allMediumCategories = [...outputCategories, ...foilCategories, ...foilPositionCategories];

  for (const cat of allMediumCategories) {
    const { parentCode, ...catData } = cat;
    const parentId = createdLarge[parentCode];

    if (!parentId) {
      console.log('Skipping ' + cat.name + ': parent not found');
      continue;
    }

    const existing = await prisma.category.findFirst({
      where: { code: cat.code },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          ...catData,
          parentId,
          level: 'medium',
          depth: 2,
          isActive: true,
          isTopMenu: false,
          categoryType: 'HALF',
        },
      });
      console.log('Created medium: ' + cat.name);
    } else {
      console.log('Exists medium: ' + cat.name);
    }
  }

  console.log('Production categories seeding completed!');
}

seedProductionCategories()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
