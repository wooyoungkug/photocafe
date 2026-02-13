import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const productId = 'cmlk99e4s0003vfxz27p7fyh3';
    console.log(`Searching for product ID: ${productId}`);

    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
            bindings: true,
            papers: true,
            covers: true,
            foils: true,
            finishings: true,
        }
    });

    if (!product) {
        console.log('Product not found');
        return;
    }

    console.log('Bindings:', JSON.stringify(product.bindings, null, 2));
    console.log('Papers:', JSON.stringify(product.papers, null, 2));
    console.log('Covers:', JSON.stringify(product.covers, null, 2));
    console.log('Foils:', JSON.stringify(product.foils, null, 2));
    console.log('Finishings:', JSON.stringify(product.finishings, null, 2));
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
