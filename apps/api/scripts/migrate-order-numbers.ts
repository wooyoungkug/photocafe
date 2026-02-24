/**
 * 주문번호 형식 변경 마이그레이션 스크립트
 *
 * 변경: ORD-20260214-0027 → 260214-027
 *
 * ⚠️ 주의: 이 스크립트는 되돌릴 수 없습니다!
 * 실행 전 반드시 DB 백업을 진행하세요.
 *
 * 실행 방법:
 * npx tsx apps/api/scripts/migrate-order-numbers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 주문번호 변환 함수: ORD-20260214-0027 → 260214-027
function convertOrderNumber(oldOrderNumber: string): string {
  // ORD- 형식이 아니면 그대로 반환 (이미 새 형식)
  if (!oldOrderNumber.startsWith('ORD-')) {
    return oldOrderNumber;
  }

  // ORD-20260214-0027 형식에서 추출
  // [0]='ORD', [1]='20260214', [2]='0027'
  const parts = oldOrderNumber.split('-');

  if (parts.length !== 3) {
    console.warn(`⚠️  잘못된 형식: ${oldOrderNumber}`);
    return oldOrderNumber;
  }

  const dateStr = parts[1]; // '20260214'
  const sequence = parts[2]; // '0027'

  // YYYYMMDD → YYMMDD
  const shortDate = dateStr.slice(2); // '260214'

  // 앞의 0 제거 후 자릿수에 맞게 패딩 (999 이하 → 3자리, 1000 이상 → 4자리)
  const numSeq = parseInt(sequence, 10);
  const digits = numSeq >= 1000 ? 4 : 3;
  const shortSeq = numSeq.toString().padStart(digits, '0');

  return `${shortDate}-${shortSeq}`;
}

// 생산번호 변환 함수: ORD-20260214-0027-01 → 260214-027-01
function convertProductionNumber(oldProductionNumber: string): string {
  // ORD- 형식이 아니면 그대로 반환
  if (!oldProductionNumber.startsWith('ORD-')) {
    return oldProductionNumber;
  }

  // ORD-20260214-0027-01 형식에서 추출
  // [0]='ORD', [1]='20260214', [2]='0027', [3]='01'
  const parts = oldProductionNumber.split('-');

  if (parts.length !== 4) {
    console.warn(`⚠️  잘못된 생산번호 형식: ${oldProductionNumber}`);
    return oldProductionNumber;
  }

  const dateStr = parts[1]; // '20260214'
  const sequence = parts[2]; // '0027'
  const itemIndex = parts[3]; // '01'

  // YYYYMMDD → YYMMDD
  const shortDate = dateStr.slice(2); // '260214'

  const numSeq = parseInt(sequence, 10);
  const digits = numSeq >= 1000 ? 4 : 3;
  const shortSeq = numSeq.toString().padStart(digits, '0');

  return `${shortDate}-${shortSeq}-${itemIndex}`;
}

async function main() {
  console.log('🚀 주문번호 형식 변경 마이그레이션 시작\n');

  // 1. 통계 확인
  const totalOrders = await prisma.order.count();
  const oldFormatOrders = await prisma.order.count({
    where: { orderNumber: { startsWith: 'ORD-' } },
  });

  console.log('📊 현재 통계:');
  console.log(`   전체 주문: ${totalOrders}건`);
  console.log(`   구형식 주문: ${oldFormatOrders}건`);
  console.log(`   신형식 주문: ${totalOrders - oldFormatOrders}건\n`);

  if (oldFormatOrders === 0) {
    console.log('✅ 변경할 주문이 없습니다.');
    return;
  }

  // 2. 사용자 확인
  console.log('⚠️  경고: 이 작업은 되돌릴 수 없습니다!');
  console.log('⚠️  실행 전 DB 백업을 했는지 확인하세요.\n');
  console.log(`🔄 ${oldFormatOrders}건의 주문번호를 변경합니다.\n`);

  // 실제 환경에서는 readline으로 확인받기
  // 여기서는 자동 진행 (주석 처리하고 수동 확인 가능)

  // 3. Order 테이블 업데이트
  console.log('📝 Step 1/3: Order 테이블 업데이트 중...');
  const orders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: 'ORD-' } },
    select: { id: true, orderNumber: true },
  });

  let orderUpdated = 0;
  for (const order of orders) {
    const newOrderNumber = convertOrderNumber(order.orderNumber);

    try {
      await prisma.order.update({
        where: { id: order.id },
        data: { orderNumber: newOrderNumber },
      });
      orderUpdated++;

      if (orderUpdated % 100 === 0) {
        console.log(`   진행: ${orderUpdated}/${orders.length}`);
      }
    } catch (error) {
      console.error(`❌ 주문 업데이트 실패 (ID: ${order.id}):`, error);
    }
  }
  console.log(`✅ Order 업데이트 완료: ${orderUpdated}건\n`);

  // 4. OrderItem 테이블 업데이트
  console.log('📝 Step 2/3: OrderItem 테이블 업데이트 중...');
  const orderItems = await prisma.orderItem.findMany({
    where: { productionNumber: { startsWith: 'ORD-' } },
    select: { id: true, productionNumber: true },
  });

  let itemUpdated = 0;
  for (const item of orderItems) {
    const newProductionNumber = convertProductionNumber(item.productionNumber);

    try {
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { productionNumber: newProductionNumber },
      });
      itemUpdated++;

      if (itemUpdated % 100 === 0) {
        console.log(`   진행: ${itemUpdated}/${orderItems.length}`);
      }
    } catch (error) {
      console.error(`❌ OrderItem 업데이트 실패 (ID: ${item.id}):`, error);
    }
  }
  console.log(`✅ OrderItem 업데이트 완료: ${itemUpdated}건\n`);

  // 5. 결과 확인
  console.log('📝 Step 3/3: 결과 검증 중...');
  const finalOldFormat = await prisma.order.count({
    where: { orderNumber: { startsWith: 'ORD-' } },
  });
  const finalNewFormat = await prisma.order.count({
    where: {
      orderNumber: { not: { startsWith: 'ORD-' } },
    },
  });

  console.log('\n✅ 마이그레이션 완료!');
  console.log('📊 최종 통계:');
  console.log(`   구형식 주문: ${finalOldFormat}건`);
  console.log(`   신형식 주문: ${finalNewFormat}건`);
  console.log(`   업데이트된 주문: ${orderUpdated}건`);
  console.log(`   업데이트된 항목: ${itemUpdated}건\n`);

  // 6. 샘플 출력
  console.log('📋 변환 샘플 (최근 5건):');
  const samples = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      orderNumber: true,
      items: {
        take: 1,
        select: { productionNumber: true },
      },
    },
  });

  samples.forEach((sample, idx) => {
    console.log(`   ${idx + 1}. 주문: ${sample.orderNumber}`);
    if (sample.items[0]) {
      console.log(`      생산: ${sample.items[0].productionNumber}`);
    }
  });

  console.log('\n⚠️  파일 디렉토리는 수동으로 변경해야 합니다:');
  console.log('   /uploads/orders/ORD-20260214-0027/ → /uploads/orders/260214-027/');
}

main()
  .catch((e) => {
    console.error('❌ 마이그레이션 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
