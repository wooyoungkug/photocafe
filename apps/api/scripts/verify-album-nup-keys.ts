/**
 * 앨범/출력 설정 priceGroups[].upPrices[]의 nupKey 구성이 규격 for* 플래그와 일치하는지 검증
 *
 * 검증 항목:
 *   - 각 설정의 printMethod → 허용 nup 집합 계산
 *   - upPrices의 nupKey가 모두 허용 집합 안에 있는지 (불일치 = 과잉)
 *   - 허용 집합의 nupKey 중 누락된 것 (불일치 = 부족)
 *   - priceGroups가 null이거나 비어있는 설정도 별도 리포트
 *
 * 실행:
 *   npx tsx apps/api/scripts/verify-album-nup-keys.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRINT_METHOD_FLAG_MAP: Record<string, string> = {
  indigo: 'forIndigo',
  inkjet: 'forInkjet',
  album: 'forAlbum',
  indigoAlbum: 'forIndigoAlbum',
};

// upPrices에서 확인할 대상 nupKey (앨범 전용)
const CHECKED_ALBUM_NUPS = ['1++up', '1+up'] as const;

interface UpPrice {
  up?: number;
  nupKey?: string;
  [key: string]: any;
}

interface PriceGroup {
  id: string;
  upPrices?: UpPrice[];
  [key: string]: any;
}

async function computeApplicableNups(printMethod: string): Promise<Set<string>> {
  const flag = PRINT_METHOD_FLAG_MAP[printMethod];
  if (!flag) return new Set();
  const specs = await prisma.specification.findMany({
    where: { isActive: true, [flag]: true } as any,
    select: { nup: true },
  });
  return new Set(specs.map((s) => s.nup).filter((n): n is string => !!n));
}

async function main() {
  console.log('🔎 앨범/출력 설정 nupKey 검증');
  console.log('='.repeat(70));

  const settings = await prisma.productionSetting.findMany({
    where: { printMethod: { in: Object.keys(PRINT_METHOD_FLAG_MAP) } },
    select: {
      id: true,
      codeName: true,
      settingName: true,
      printMethod: true,
      pricingType: true,
      priceGroups: true,
    },
    orderBy: [{ printMethod: 'asc' }, { settingName: 'asc' }],
  });

  let total = 0;
  let okCount = 0;
  let skippedCount = 0;
  const issues: { setting: typeof settings[number]; reason: string }[] = [];

  for (const setting of settings) {
    total++;
    const priceGroups = setting.priceGroups as unknown;

    if (!Array.isArray(priceGroups) || priceGroups.length === 0) {
      // priceGroups가 없는 경우: pricingType이 nup_page_range 등일 수 있음
      skippedCount++;
      console.log(
        `⏭  [${setting.codeName}] ${setting.settingName} (${setting.printMethod}/${setting.pricingType}) · priceGroups 없음 (정상 - 다른 구조 사용)`,
      );
      continue;
    }

    const applicableNups = await computeApplicableNups(setting.printMethod);
    const expectedAlbumNups = CHECKED_ALBUM_NUPS.filter((k) => applicableNups.has(k));

    const groupIssues: string[] = [];
    (priceGroups as PriceGroup[]).forEach((group) => {
      const upPrices = Array.isArray(group.upPrices) ? group.upPrices : [];
      const actualNupKeys = new Set(
        upPrices.filter((p) => p.nupKey).map((p) => p.nupKey as string),
      );

      // 과잉: 있지만 있으면 안 되는 앨범 nupKey
      const excess = CHECKED_ALBUM_NUPS.filter(
        (k) => actualNupKeys.has(k) && !applicableNups.has(k),
      );
      // 부족: 있어야 하지만 없는 앨범 nupKey
      const missing = expectedAlbumNups.filter((k) => !actualNupKeys.has(k));

      if (excess.length > 0 || missing.length > 0) {
        const parts: string[] = [];
        if (missing.length > 0) parts.push(`누락: ${missing.join(', ')}`);
        if (excess.length > 0) parts.push(`과잉: ${excess.join(', ')}`);
        groupIssues.push(`그룹 ${group.id}: ${parts.join(' / ')}`);
      }
    });

    if (groupIssues.length === 0) {
      okCount++;
      console.log(
        `✅ [${setting.codeName}] ${setting.settingName} (${setting.printMethod}) · 기대: [${expectedAlbumNups.join(', ') || '없음'}]`,
      );
    } else {
      issues.push({ setting, reason: groupIssues.join(' | ') });
      console.log(
        `❌ [${setting.codeName}] ${setting.settingName} (${setting.printMethod}) · 기대: [${expectedAlbumNups.join(', ') || '없음'}]`,
      );
      groupIssues.forEach((g) => console.log(`   └─ ${g}`));
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`📊 검증 요약`);
  console.log(`   전체 대상 설정: ${total}개`);
  console.log(`   ✅ 정상: ${okCount}개`);
  console.log(`   ⏭  priceGroups 없음(스킵): ${skippedCount}개`);
  console.log(`   ❌ 불일치: ${issues.length}개`);

  if (issues.length > 0) {
    console.log(`\n💡 불일치 해결: npx tsx apps/api/scripts/migrate-album-nup-keys.ts --apply`);
    process.exit(1);
  } else {
    console.log(`\n🎉 모두 정상 상태`);
  }
}

main()
  .catch((err) => {
    console.error('❌ 검증 실패:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
