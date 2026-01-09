// 모든 규격의 정렬 상태 확인
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSpecs() {
    const specs = await prisma.specification.findMany({
        orderBy: [{ squareMeters: 'asc' }, { widthMm: 'desc' }],
        select: {
            name: true,
            widthMm: true,
            heightMm: true,
            squareMeters: true,
            pairId: true,
            id: true,
        }
    });

    console.log('현재 정렬 순서:\n');
    specs.forEach((s, i) => {
        const hasPair = s.pairId ? '✓' : '✗';
        console.log(`${(i + 1).toString().padStart(2)}. ${s.name.padEnd(20)} ${Number(s.widthMm).toFixed(1).padStart(6)} x ${Number(s.heightMm).toFixed(1).padStart(6)} | sqm: ${Number(s.squareMeters).toFixed(4)} | pair: ${hasPair}`);
    });
}

checkSpecs()
    .finally(() => prisma.$disconnect());
