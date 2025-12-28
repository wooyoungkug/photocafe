import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed completed - no data inserted');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
