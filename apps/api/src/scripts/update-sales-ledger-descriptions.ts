/**
 * 매출원장 description 업데이트 스크립트
 * 기존 "주문번호 매출" 형식을 "상품명" 또는 "상품명 외 N건" 형식으로 변경
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSalesLedgerDescriptions() {
  console.log('매출원장 description 업데이트 시작...');

  try {
    // 모든 매출원장 조회 (주문 정보와 함께)
    const salesLedgers = await prisma.salesLedger.findMany({
      where: {
        salesStatus: { not: 'CANCELLED' },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { ledgerDate: 'desc' },
    });

    console.log(`총 ${salesLedgers.length}건의 매출원장을 처리합니다.`);

    let updated = 0;
    let skipped = 0;

    for (const ledger of salesLedgers) {
      // 아이템이 없으면 건너뛰기
      if (!ledger.items || ledger.items.length === 0) {
        skipped++;
        continue;
      }

      // 새로운 description 생성
      const newDescription =
        ledger.items.length === 1
          ? ledger.items[0].itemName
          : `${ledger.items[0].itemName} 외 ${ledger.items.length - 1}건`;

      // 이미 올바른 형식이면 건너뛰기
      if (ledger.description === newDescription) {
        skipped++;
        continue;
      }

      // 업데이트
      await prisma.salesLedger.update({
        where: { id: ledger.id },
        data: { description: newDescription },
      });

      updated++;

      if (updated % 100 === 0) {
        console.log(`${updated}건 업데이트 완료...`);
      }
    }

    console.log('\n업데이트 완료!');
    console.log(`- 총 처리: ${salesLedgers.length}건`);
    console.log(`- 업데이트: ${updated}건`);
    console.log(`- 건너뛰기: ${skipped}건`);
  } catch (error) {
    console.error('에러 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
updateSalesLedgerDescriptions()
  .then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('스크립트 실행 실패:', error);
    process.exit(1);
  });
