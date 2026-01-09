// 모든 규격의 squareMeters를 정확하게 재계산 (소수점 4자리)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculateSquareMeters() {
    console.log('모든 규격의 squareMeters 재계산 시작...\n');

    const specs = await prisma.specification.findMany();
    let updated = 0;

    for (const spec of specs) {
        const sqm = Number(spec.widthMm) * Number(spec.heightMm) / 1000000;
        // 소수점 6자리까지 정밀하게 저장
        const roundedSqm = Math.round(sqm * 1000000) / 1000000;

        if (Number(spec.squareMeters).toFixed(6) !== roundedSqm.toFixed(6)) {
            await prisma.specification.update({
                where: { id: spec.id },
                data: { squareMeters: roundedSqm }
            });
            console.log(`  ${spec.name}: ${Number(spec.squareMeters).toFixed(6)} → ${roundedSqm.toFixed(6)}`);
            updated++;
        }
    }

    console.log(`\n완료! ${updated}개의 규격이 수정되었습니다.`);

    // 결과 확인
    console.log('\n--- 수정 후 정렬 순서 ---\n');
    const sorted = await prisma.specification.findMany({
        orderBy: [{ squareMeters: 'asc' }, { widthMm: 'desc' }],
        select: { name: true, widthMm: true, heightMm: true, squareMeters: true }
    });

    sorted.forEach((s, i) => {
        console.log(`${(i + 1).toString().padStart(2)}. ${s.name.padEnd(12)} ${Number(s.widthMm).toFixed(1).padStart(6)} x ${Number(s.heightMm).toFixed(1).padStart(6)} | sqm: ${Number(s.squareMeters).toFixed(6)}`);
    });
}

recalculateSquareMeters()
    .catch(e => { console.error('오류:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
