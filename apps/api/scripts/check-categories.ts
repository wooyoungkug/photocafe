import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({
    where: { level: 'large' },
    select: { id: true, name: true, isTopMenu: true, isVisible: true, isActive: true, linkUrl: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  });
  console.log(JSON.stringify(cats, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
