/**
 * 인디고 7900 임포지션 프리셋 시드.
 *
 * 생성 대상:
 *  - 압축앨범(compressed): A4/A5/A6/B5/200x200 × 1Up/2Up/4Up/6Up/8Up = 25
 *  - 무선제본(perfect):   A4/A5/A6/B5/200x200 × 1Up/2Up/4Up       = 15
 *  - 핀제본  (tack):      A4/A5/A6/B5/200x200 × 1Up/2Up/4Up       = 15
 *  - 단일    (flat):      A4/A5            × 1Up/2Up/4Up/6Up/8Up  = 10
 *  합계 65개 + 각 프리셋당 기본 매칭 규칙 1개.
 *
 * 멱등성: 이름(name) 기준 upsert. 이미 존재하면 업데이트.
 */

import { PrismaClient } from '@prisma/client';

export interface SeedSize {
  code: string;          // 'A4'|'A5'|'200x200'
  width: number;         // mm
  height: number;        // mm
}

const SIZES: SeedSize[] = [
  { code: 'A4', width: 210, height: 297 },
  { code: 'A5', width: 148, height: 210 },
  { code: 'A6', width: 105, height: 148 },
  { code: 'B5', width: 176, height: 250 },
  { code: '200x200', width: 200, height: 200 },
];

const FLAT_SIZES: SeedSize[] = [
  { code: 'A4', width: 210, height: 297 },
  { code: 'A5', width: 148, height: 210 },
];

interface PresetSpec {
  name: string;
  bindingType: 'compressed' | 'tack' | 'perfect' | 'flat';
  productSize: string;
  targetNup: number;
  sheetWidth: number;
  sheetHeight: number;
  creaseWidth?: number;
  tackMargin?: number;
  tackEdge?: 'left' | 'right' | 'top' | 'bottom';
  bleed: number;
  gutter: number;
  description: string;
  priority: number;
}

/** 규격 라벨 + 제본방식 + Nup 기반 priority 계산 (구체적일수록 큰 값) */
function priorityFor(binding: string, nup: number, size: string): number {
  // 기본 100. Nup 이 실용적 중간값(2~4)일수록 우선 → +10
  // 정사각형 같은 비표준은 약간 낮춤 → -5
  let p = 100;
  if (nup === 2 || nup === 4) p += 20;
  else if (nup === 6 || nup === 8) p += 10;
  else if (nup === 1) p += 0;
  if (size === '200x200') p -= 5;
  return p;
}

function buildCompressed(): PresetSpec[] {
  const nups = [1, 2, 4, 6, 8];
  const out: PresetSpec[] = [];
  for (const sz of SIZES) {
    for (const n of nups) {
      out.push({
        name: `압축앨범 ${sz.code} ${n}Up`,
        bindingType: 'compressed',
        productSize: sz.code,
        targetNup: n,
        sheetWidth: 330,
        sheetHeight: 482,
        creaseWidth: 0,
        bleed: 3,
        gutter: 3,
        description:
          n === 1
            ? `${sz.code} 1Up 단면 (테이핑 필요, 경고 배지)`
            : `${sz.code} ${n}Up 스프레드 페어링 (페어 ${n / 2}쌍, 오시 ${n / 2}개)`,
        priority: priorityFor('compressed', n, sz.code),
      });
    }
  }
  return out;
}

function buildPerfect(): PresetSpec[] {
  const nups = [1, 2, 4];
  const out: PresetSpec[] = [];
  for (const sz of SIZES) {
    for (const n of nups) {
      out.push({
        name: `무선제본 ${sz.code} ${n}Up`,
        bindingType: 'perfect',
        productSize: sz.code,
        targetNup: n,
        sheetWidth: 330,
        sheetHeight: 482,
        bleed: 3,
        gutter: 3,
        description: `${sz.code} ${n}Up 화보 gather-and-glue (순차 페이지네이션)`,
        priority: priorityFor('perfect', n, sz.code),
      });
    }
  }
  return out;
}

function buildTack(): PresetSpec[] {
  const nups = [1, 2, 4];
  const out: PresetSpec[] = [];
  for (const sz of SIZES) {
    for (const n of nups) {
      out.push({
        name: `핀제본 ${sz.code} ${n}Up`,
        bindingType: 'tack',
        productSize: sz.code,
        targetNup: n,
        sheetWidth: 330,
        sheetHeight: 482,
        tackMargin: 12,
        tackEdge: 'left',
        bleed: 3,
        gutter: 3,
        description: `${sz.code} ${n}Up 타카 (좌측 12mm 여백, 시트별 edge 교대)`,
        priority: priorityFor('tack', n, sz.code),
      });
    }
  }
  return out;
}

function buildFlat(): PresetSpec[] {
  const nups = [1, 2, 4, 6, 8];
  const out: PresetSpec[] = [];
  for (const sz of FLAT_SIZES) {
    for (const n of nups) {
      out.push({
        name: `단일 ${sz.code} ${n}Up`,
        bindingType: 'flat',
        productSize: sz.code,
        targetNup: n,
        sheetWidth: 330,
        sheetHeight: 482,
        bleed: 3,
        gutter: 3,
        description: `${sz.code} ${n}Up 단일 출력`,
        priority: priorityFor('flat', n, sz.code),
      });
    }
  }
  return out;
}

async function upsertPresetAndRule(prisma: PrismaClient, spec: PresetSpec) {
  // 프리셋 upsert (name 기준)
  const existing = await (prisma as any).impositionPreset.findFirst({
    where: { name: spec.name },
  });

  const presetData = {
    name: spec.name,
    bindingType: spec.bindingType,
    productSize: spec.productSize,
    targetNup: spec.targetNup,
    sheetWidth: spec.sheetWidth,
    sheetHeight: spec.sheetHeight,
    marginTop: 5,
    marginRight: 5,
    marginBottom: 5,
    marginLeft: 5,
    creaseWidth: spec.creaseWidth ?? null,
    tackMargin: spec.tackMargin ?? null,
    tackEdge: spec.tackEdge ?? null,
    gutter: spec.gutter,
    bleed: spec.bleed,
    grainDirection: 'short',
    rotationPolicy: 'auto',
    isDefault: false,
  };

  let preset: any;
  if (existing) {
    preset = await (prisma as any).impositionPreset.update({
      where: { id: existing.id },
      data: presetData,
    });
  } else {
    preset = await (prisma as any).impositionPreset.create({
      data: presetData,
    });
  }

  // 매칭 규칙 upsert: presetId + productSize + bindingType 조합을 유일 기준으로 사용
  const ruleExisting = await (prisma as any).impositionRule.findFirst({
    where: {
      presetId: preset.id,
      productSize: spec.productSize,
      bindingType: spec.bindingType,
    },
  });

  const ruleData = {
    productSize: spec.productSize,
    bindingType: spec.bindingType,
    minPages: null,
    maxPages: null,
    priority: spec.priority,
    presetId: preset.id,
    description: spec.description,
    isActive: true,
  };

  if (ruleExisting) {
    await (prisma as any).impositionRule.update({
      where: { id: ruleExisting.id },
      data: ruleData,
    });
  } else {
    await (prisma as any).impositionRule.create({ data: ruleData });
  }
}

export async function seedImposition(prisma: PrismaClient) {
  const all = [
    ...buildCompressed(),
    ...buildPerfect(),
    ...buildTack(),
    ...buildFlat(),
  ];
  console.log(`Imposition seed: upserting ${all.length} presets + rules...`);
  for (const spec of all) {
    await upsertPresetAndRule(prisma, spec);
  }
  console.log(`Imposition seed: done — ${all.length} presets + rules.`);
  return all.length;
}

// 독립 실행 지원: `npx ts-node prisma/seed-imposition.ts`
if (require.main === module) {
  const prisma = new PrismaClient();
  seedImposition(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());
}
