/**
 * 앨범/출력 설정의 priceGroups[].upPrices[]에 printMethod 별 적용 가능한 nupKey 항목 추가
 *
 * 로직:
 * 1. 각 production_settings의 printMethod → specifications.for* 플래그 매핑
 * 2. 활성 규격 중 해당 flag=true 인 것들의 unique nup 집합 계산 → applicableNups
 * 3. 추가 대상: ['1++up', '1+up'] ∩ applicableNups 중 upPrices에 없는 것
 * 4. 제거 대상(정리): ['1++up', '1+up'] 중 applicableNups에 없는데 upPrices에 있는 항목
 *    단, 값이 1up 항목과 동일한 경우만 제거 (자동 마이그레이션된 것만, 수동 입력 보호)
 *
 * 실행:
 *   npx tsx apps/api/scripts/migrate-album-nup-keys.ts          # dry-run
 *   npx tsx apps/api/scripts/migrate-album-nup-keys.ts --apply  # 적용
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const ALBUM_NUP_KEYS = ['1++up', '1+up'] as const;

// printMethod → Specification.for* 플래그 매핑
const PRINT_METHOD_FLAG_MAP: Record<string, string> = {
  indigo: 'forIndigo',
  inkjet: 'forInkjet',
  album: 'forAlbum', // 잉크젯 앨범
  indigoAlbum: 'forIndigoAlbum',
};

interface UpPrice {
  up?: number;
  nupKey?: string;
  weight?: number;
  [key: string]: any;
}

interface PriceGroup {
  id: string;
  upPrices?: UpPrice[];
  [key: string]: any;
}

// upPrice의 가격 필드가 일치하는지 비교 (weight/up/nupKey 제외)
function priceFieldsEqual(a: UpPrice, b: UpPrice): boolean {
  const priceKeys = [
    'singleSidedPrice',
    'doubleSidedPrice',
    'fourColorSinglePrice',
    'fourColorDoublePrice',
    'sixColorSinglePrice',
    'sixColorDoublePrice',
  ];
  return priceKeys.every((k) => (a[k] ?? 0) === (b[k] ?? 0));
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
  console.log(APPLY ? '🔧 마이그레이션 적용 모드' : '🔍 Dry-run 모드 (--apply 플래그 없음)');
  console.log('='.repeat(70));

  const settings = await prisma.productionSetting.findMany({
    where: {
      printMethod: { in: Object.keys(PRINT_METHOD_FLAG_MAP) },
    },
    select: {
      id: true,
      codeName: true,
      settingName: true,
      printMethod: true,
      priceGroups: true,
    },
  });

  let targetCount = 0;
  let updatedCount = 0;
  let addedEntryCount = 0;
  let removedEntryCount = 0;

  for (const setting of settings) {
    const priceGroups = setting.priceGroups as unknown;
    if (!Array.isArray(priceGroups) || priceGroups.length === 0) continue;
    targetCount++;

    const applicableNups = await computeApplicableNups(setting.printMethod);
    const typedGroups = priceGroups as PriceGroup[];
    const logs: string[] = [];
    let changed = false;

    const updatedGroups = typedGroups.map((group) => {
      let upPrices: UpPrice[] = Array.isArray(group.upPrices) ? [...group.upPrices] : [];
      const baseOneUp = upPrices.find(
        (p) => (p.up === 1 && !p.nupKey) || p.nupKey === '1up',
      );

      // --- 추가 로직 ---
      const existingNupKeys = new Set(
        upPrices.filter((p) => p.nupKey).map((p) => p.nupKey as string),
      );
      const toAdd: UpPrice[] = [];
      for (const nupKey of ALBUM_NUP_KEYS) {
        if (!applicableNups.has(nupKey)) continue; // 이 printMethod에서 지원 안 함
        if (existingNupKeys.has(nupKey)) continue; // 이미 있음

        const entry: UpPrice = baseOneUp
          ? { ...baseOneUp, nupKey }
          : { nupKey, weight: 1 };
        delete entry.up;
        toAdd.push(entry);
      }

      // --- 제거 로직 (잘못 추가된 자동 마이그레이션 항목) ---
      const toRemoveIdx: number[] = [];
      upPrices.forEach((p, idx) => {
        if (!p.nupKey) return;
        if (!ALBUM_NUP_KEYS.includes(p.nupKey as any)) return;
        if (applicableNups.has(p.nupKey)) return; // 적용 가능함 → 유지
        // 적용 불가 + 1up 값과 동일 → 자동 마이그레이션 산물로 간주해 제거
        if (baseOneUp && priceFieldsEqual(p, baseOneUp)) {
          toRemoveIdx.push(idx);
        }
      });

      if (toAdd.length === 0 && toRemoveIdx.length === 0) return group;

      changed = true;
      addedEntryCount += toAdd.length;
      removedEntryCount += toRemoveIdx.length;

      const logParts: string[] = [];
      if (toAdd.length > 0) logParts.push(`추가: ${toAdd.map((a) => a.nupKey).join(', ')}`);
      if (toRemoveIdx.length > 0) {
        const removedKeys = toRemoveIdx.map((i) => upPrices[i].nupKey).join(', ');
        logParts.push(`제거(자동-미지원): ${removedKeys}`);
      }
      logs.push(`  └─ 그룹 ${group.id}: ${logParts.join(' / ')}`);

      // 제거 후 추가 + NUP_ORDER대로 재정렬
      const removeSet = new Set(toRemoveIdx);
      const filtered = upPrices.filter((_, i) => !removeSet.has(i));
      const merged = [...toAdd, ...filtered];
      const NUP_ORDER = ['1++up', '1+up', '1up', '2up', '4up', '6up', '8up'];
      const sorted = merged.sort((a, b) => {
        const aKey = a.nupKey || `${a.up}up`;
        const bKey = b.nupKey || `${b.up}up`;
        const aIdx = NUP_ORDER.indexOf(aKey);
        const bIdx = NUP_ORDER.indexOf(bKey);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });

      return { ...group, upPrices: sorted };
    });

    if (changed) {
      updatedCount++;
      console.log(
        `\n✅ [${setting.codeName}] ${setting.settingName} (${setting.printMethod}) · 적용가능 nup: [${[...applicableNups].sort().join(', ')}]`,
      );
      logs.forEach((l) => console.log(l));

      if (APPLY) {
        await prisma.productionSetting.update({
          where: { id: setting.id },
          data: { priceGroups: updatedGroups as any },
        });
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`📊 요약`);
  console.log(`   대상 설정 수: ${targetCount}개`);
  console.log(`   변경 설정 수: ${updatedCount}개`);
  console.log(`   추가된 upPrices: ${addedEntryCount}개`);
  console.log(`   제거된 upPrices(자동-미지원): ${removedEntryCount}개`);

  if (!APPLY && updatedCount > 0) {
    console.log(`\n💡 실제 적용: npx tsx apps/api/scripts/migrate-album-nup-keys.ts --apply`);
  } else if (APPLY) {
    console.log(`\n✅ 마이그레이션 완료`);
  }
}

main()
  .catch((err) => {
    console.error('❌ 실패:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
