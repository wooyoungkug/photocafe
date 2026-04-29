/**
 * 주문 상태(Order.status) 정규화 스크립트
 *
 * 배경: DB 에 DTO 표준 상수 (`ORDER_STATUS`) 와 불일치하는 status 값이 누적돼 있다.
 *  - 예: `print_waiting`, `confirmed`, `print_ready`, `shipping`, `shipping_ready`
 *
 * 본 스크립트는 dry-run 으로 카운트만 출력하거나(--dry, 기본),
 * --apply 로 표준 값으로 UPDATE 한다.
 *
 * ⚠️ 주의:
 *  - 운영 적용 전 반드시 DB 백업 (GitHub Actions `db-backup.yml` 수동 트리거)
 *  - 매핑 테이블 (`STATUS_MAP`) 은 운영팀 검토 필수
 *  - 정규화된 행은 ProcessHistory 에 `processType='status_normalization'` 으로 기록
 *
 * 실행:
 *   npx tsx apps/api/scripts/normalize-order-status.ts            # dry-run (카운트만)
 *   npx tsx apps/api/scripts/normalize-order-status.ts --apply    # 실제 적용
 *   npx tsx apps/api/scripts/normalize-order-status.ts --apply --actor=admin
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 표준 OrderStatus (DTO ORDER_STATUS 와 일치해야 함)
const STANDARD_STATUSES = new Set<string>([
  'pending_receipt',
  'receipt_completed',
  'in_production',
  'printed',
  'ready_for_shipping',
  'shipped',
  'cancelled',
  'reprint_requested',
  'reprint_in_production',
]);

// 비표준 → 표준 매핑. 운영팀 검토 후 조정.
const STATUS_MAP: Record<string, string> = {
  // 접수 단계
  confirmed: 'receipt_completed',

  // 출력/생산 단계
  print_waiting: 'in_production',     // 출력대기 → 생산진행
  print_ready: 'in_production',       // 출력준비 → 생산진행

  // 배송 단계
  shipping_ready: 'ready_for_shipping',
  shipping: 'ready_for_shipping',     // 배송 중간단계 → 배송준비로 통합 (SHIPPED 아님)
};

interface CliOptions {
  apply: boolean;
  actor: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const actorArg = args.find((a) => a.startsWith('--actor='));
  const actor = actorArg ? actorArg.split('=')[1] : 'system_normalize_script';
  return { apply, actor };
}

async function reportCounts() {
  const grouped = await prisma.order.groupBy({
    by: ['status'],
    _count: { _all: true },
    orderBy: { _count: { id: 'desc' } },
  });

  console.log('\n현재 status 분포 (전체):');
  console.log('─'.repeat(60));
  let total = 0;
  let nonStandardTotal = 0;
  for (const row of grouped) {
    const isStandard = STANDARD_STATUSES.has(row.status);
    const mapped = STATUS_MAP[row.status];
    const flag = isStandard
      ? '   표준'
      : mapped
        ? `→  ${mapped}`
        : '⚠ 미매핑';
    console.log(
      `  ${row.status.padEnd(28)} ${String(row._count._all).padStart(6)}건  ${flag}`,
    );
    total += row._count._all;
    if (!isStandard) nonStandardTotal += row._count._all;
  }
  console.log('─'.repeat(60));
  console.log(`  합계 ${total}건 / 비표준 ${nonStandardTotal}건\n`);

  // 미매핑 비표준 값 경고
  const unmapped = grouped.filter(
    (row) => !STANDARD_STATUSES.has(row.status) && !STATUS_MAP[row.status],
  );
  if (unmapped.length > 0) {
    console.error(
      '⚠ STATUS_MAP 에 매핑이 없는 비표준 값이 있습니다. 스크립트를 수정하세요:',
    );
    for (const row of unmapped) {
      console.error(`   - ${row.status} (${row._count._all}건)`);
    }
  }

  return { grouped, total, nonStandardTotal, unmapped };
}

async function applyNormalization(actor: string) {
  console.log(`\n[APPLY] actor=${actor}, 정규화 시작...\n`);
  let updated = 0;

  for (const [from, to] of Object.entries(STATUS_MAP)) {
    const ids = await prisma.order.findMany({
      where: { status: from },
      select: { id: true },
    });
    if (ids.length === 0) continue;

    await prisma.$transaction(async (tx) => {
      // 1) status 일괄 UPDATE
      const result = await tx.order.updateMany({
        where: { status: from },
        data: { status: to },
      });

      // 2) ProcessHistory 일괄 기록 (createMany 로 N+1 회피)
      await tx.processHistory.createMany({
        data: ids.map((o) => ({
          orderId: o.id,
          fromStatus: from,
          toStatus: to,
          processType: 'status_normalization',
          note: `자동 정규화 스크립트 적용: ${from} → ${to}`,
          processedBy: actor,
        })),
      });

      console.log(`  ${from.padEnd(28)} → ${to.padEnd(22)} ${result.count}건`);
      updated += result.count;
    });
  }

  console.log(`\n[APPLY] 완료: 총 ${updated}건 정규화\n`);
}

async function main() {
  const { apply, actor } = parseArgs();

  console.log('='.repeat(60));
  console.log(' 주문 상태 정규화 스크립트');
  console.log(`  모드: ${apply ? 'APPLY (실제 UPDATE)' : 'DRY-RUN (카운트만)'}`);
  console.log('='.repeat(60));

  const report = await reportCounts();

  if (!apply) {
    console.log('실제 적용하려면 --apply 를 추가하세요.');
    console.log('예: npx tsx apps/api/scripts/normalize-order-status.ts --apply --actor=admin');
    return;
  }

  if (report.unmapped.length > 0) {
    console.error('\n⚠ 미매핑 값이 있어 적용을 중단합니다. STATUS_MAP 을 보완 후 재실행하세요.');
    process.exit(1);
  }

  if (report.nonStandardTotal === 0) {
    console.log('정규화 대상이 없습니다. 종료.');
    return;
  }

  await applyNormalization(actor);

  // 사후 검증
  console.log('\n[검증] 정규화 후 분포:');
  await reportCounts();
}

main()
  .catch((err) => {
    console.error('치명적 오류:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
