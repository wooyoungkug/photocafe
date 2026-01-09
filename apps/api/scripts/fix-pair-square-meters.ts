// 쌍(pair)의 squareMeters 값을 동일하게 맞추는 스크립트
// 사용법: npx ts-node apps/api/scripts/fix-pair-square-meters.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPairSquareMeters() {
    console.log('쌍(pair)의 squareMeters 값 통일 시작...');

    // pairId가 있는 모든 규격 조회
    const specifications = await prisma.specification.findMany({
        where: {
            pairId: { not: null }
        }
    });

    const processedPairs = new Set<string>();
    let updated = 0;

    for (const spec of specifications) {
        if (!spec.pairId) continue;

        // 이미 처리한 쌍은 건너뛰기
        const pairKey = [spec.id, spec.pairId].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // 쌍 찾기
        const pair = await prisma.specification.findUnique({
            where: { id: spec.pairId }
        });

        if (!pair) continue;

        // 두 규격의 squareMeters 계산 (widthMm * heightMm / 1000000, 소수점 4자리)
        const sqm1 = Math.round((Number(spec.widthMm) * Number(spec.heightMm)) / 1000000 * 10000) / 10000;
        const sqm2 = Math.round((Number(pair.widthMm) * Number(pair.heightMm)) / 1000000 * 10000) / 10000;

        // 값이 다르면 동일하게 업데이트
        if (sqm1 !== Number(spec.squareMeters) || sqm2 !== Number(pair.squareMeters)) {
            const commonSqm = Math.round((sqm1 + sqm2) / 2 * 10000) / 10000;

            await prisma.specification.updateMany({
                where: { id: { in: [spec.id, pair.id] } },
                data: { squareMeters: commonSqm }
            });

            console.log(`  ${spec.name} & ${pair.name}: squareMeters = ${commonSqm}`);
            updated++;
        }
    }

    console.log(`\n완료! ${updated}개의 쌍의 squareMeters가 수정되었습니다.`);
}

fixPairSquareMeters()
    .catch((e) => {
        console.error('오류:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
