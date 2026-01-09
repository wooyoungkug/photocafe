// 규격명에서 (가로형), (세로형), (정방형) 제거 스크립트
// 사용법: npx ts-node apps/api/scripts/clean-spec-names.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanSpecNames() {
    console.log('규격명 정리 시작...');

    // 모든 규격 조회
    const specifications = await prisma.specification.findMany();

    let updated = 0;

    for (const spec of specifications) {
        // (가로형), (세로형), (정방형) 패턴 제거
        const cleanName = spec.name
            .replace(/\s*\(가로형\)\s*$/, '')
            .replace(/\s*\(세로형\)\s*$/, '')
            .replace(/\s*\(정방형\)\s*$/, '')
            .trim();

        if (cleanName !== spec.name) {
            await prisma.specification.update({
                where: { id: spec.id },
                data: { name: cleanName },
            });
            console.log(`  ${spec.name} → ${cleanName}`);
            updated++;
        }
    }

    console.log(`\n완료! ${updated}개의 규격명이 수정되었습니다.`);
}

cleanSpecNames()
    .catch((e) => {
        console.error('오류:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
