import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixEncoding() {
  console.log('Fixing encoding issues...');

  // 1. 사용자 이름 수정
  const users = await prisma.user.findMany();
  for (const user of users) {
    if (user.email === 'admin@printing114.com') {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: '관리자' },
      });
      console.log('Updated user name: 관리자');
    }
  }

  // 2. 카테고리 이름 수정 - 대분류
  const largeCategories = [
    { code: '01000000', name: 'Premium Photobook' },
    { code: '02000000', name: '포토북' },
    { code: '03000000', name: '앨범' },
    { code: '04000000', name: '액자' },
    { code: '05000000', name: '출력물' },
    { code: '06000000', name: '굿즈' },
  ];

  // 3. 중분류
  const mediumCategories = [
    { code: '02010000', name: '하드커버' },
    { code: '02020000', name: '소프트커버' },
    { code: '02030000', name: '레이플랫' },
    { code: '03010000', name: '웨딩앨범' },
    { code: '03020000', name: '가족앨범' },
    { code: '03030000', name: '베이비앨범' },
    { code: '04010000', name: '우드액자' },
    { code: '04020000', name: '메탈액자' },
    { code: '04030000', name: '아크릴액자' },
    { code: '05010000', name: '포스터' },
    { code: '05020000', name: '캔버스' },
    { code: '05030000', name: '배너' },
    { code: '06010000', name: '달력' },
    { code: '06020000', name: '머그컵' },
    { code: '06030000', name: '폰케이스' },
    { code: '06040000', name: '에코백' },
  ];

  // 4. 소분류
  const smallCategories = [
    { code: '02010100', name: '8x8 정사각' },
    { code: '02010200', name: '10x10 정사각' },
    { code: '02010300', name: 'A4 세로형' },
    { code: '02020100', name: 'A5 가로형' },
    { code: '02020200', name: 'A4 가로형' },
    { code: '03010100', name: '프리미엄 30p' },
    { code: '03010200', name: '프리미엄 40p' },
    { code: '04010100', name: '5x7 우드' },
    { code: '04010200', name: '8x10 우드' },
    { code: '05010100', name: 'A3 포스터' },
  ];

  // 모든 카테고리 업데이트
  const allCategories = [...largeCategories, ...mediumCategories, ...smallCategories];

  for (const cat of allCategories) {
    try {
      const existing = await prisma.category.findFirst({
        where: { code: cat.code },
      });

      if (existing) {
        await prisma.category.update({
          where: { id: existing.id },
          data: { name: cat.name },
        });
        console.log(`Updated category: ${cat.code} -> ${cat.name}`);
      }
    } catch (error) {
      console.log(`Skipping ${cat.code}: not found`);
    }
  }

  console.log('Encoding fix completed!');
}

fixEncoding()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
