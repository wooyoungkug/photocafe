import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching categories...');
    try {
        const categories = await prisma.category.findMany();
        console.log(`Found ${categories.length} categories`);
        categories.forEach(c => console.log(`${c.id}: ${c.name} (${c.level})`));
    } catch (e) {
        console.error('Error fetching categories:', e);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
