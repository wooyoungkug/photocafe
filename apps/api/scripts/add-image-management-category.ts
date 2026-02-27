/**
 * 이미지관리 카테고리 생성 스크립트
 * 실행: npx tsx scripts/add-image-management-category.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 이미 존재하는지 확인
  const existing = await prisma.category.findFirst({
    where: { name: '이미지관리' },
  });

  if (existing) {
    console.log('이미지관리 카테고리가 이미 존재합니다:', existing.id);
    return;
  }

  // 현재 대분류 최대 sortOrder 조회
  const maxSort = await prisma.category.aggregate({
    where: { level: 'large', parentId: null },
    _max: { sortOrder: true },
  });
  const nextSortOrder = (maxSort._max.sortOrder ?? 0) + 1;

  const category = await prisma.category.create({
    data: {
      code: '99000000',
      name: '이미지관리',
      nameEn: 'Image Management',
      nameJa: '画像管理',
      nameZh: '图片管理',
      level: 'large',
      depth: 1,
      isVisible: true,
      isTopMenu: true,
      loginVisibility: 'logged_in',
      categoryType: 'HTML',
      linkUrl: '/image-management',
      sortOrder: nextSortOrder,
      isActive: true,
    },
  });

  console.log('이미지관리 카테고리 생성 완료:', category.id, category.name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
