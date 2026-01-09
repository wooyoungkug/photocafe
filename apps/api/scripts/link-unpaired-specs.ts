// 쌍으로 연결되지 않은 규격들을 자동으로 연결하는 스크립트
// 같은 치수(가로↔세로 스왑)를 가진 규격들을 pairId로 연결
// 사용법: npx ts-node apps/api/scripts/link-unpaired-specs.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkUnpairedSpecs() {
    console.log('연결되지 않은 쌍 찾기 시작...\n');

    // pairId가 null인 모든 규격 조회
    const unpairedSpecs = await prisma.specification.findMany({
        where: { pairId: null }
    });

    console.log(`pairId가 없는 규격: ${unpairedSpecs.length}개\n`);

    let linked = 0;

    for (const spec of unpairedSpecs) {
        // 이미 연결됐으면 건너뛰기
        const currentSpec = await prisma.specification.findUnique({
            where: { id: spec.id }
        });
        if (currentSpec?.pairId) continue;

        // 치수가 스왑된 쌍 찾기 (widthMm ↔ heightMm)
        const potential = await prisma.specification.findFirst({
            where: {
                id: { not: spec.id },
                pairId: null,
                widthMm: spec.heightMm,
                heightMm: spec.widthMm,
            }
        });

        if (potential) {
            // squareMeters 통일
            const sqm = Math.round((Number(spec.widthMm) * Number(spec.heightMm)) / 1000000 * 10000) / 10000;

            // 양쪽 pairId 연결
            await prisma.specification.update({
                where: { id: spec.id },
                data: { pairId: potential.id, squareMeters: sqm }
            });
            await prisma.specification.update({
                where: { id: potential.id },
                data: { pairId: spec.id, squareMeters: sqm }
            });

            console.log(`  연결됨: ${spec.name} ↔ ${potential.name} (squareMeters: ${sqm})`);
            linked++;
        }
    }

    console.log(`\n완료! ${linked}개의 쌍이 연결되었습니다.`);
}

linkUnpairedSpecs()
    .catch((e) => {
        console.error('오류:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
