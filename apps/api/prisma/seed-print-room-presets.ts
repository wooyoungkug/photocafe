import { PrismaClient } from '@prisma/client';

/**
 * 출력실 통합관리 시스템 — PrintRoomPreset 시드.
 *
 * 기획서 v2 Phase 2: 37+개 인디고 규격 초기 프리셋.
 *
 * 공통 기본값:
 * - marginMm: 10
 * - cropMarkLengthMm: 5
 * - cropMarkThicknessPt: 0.25
 * - cropMarkColor: "K100"
 * - pdfVersion: "1.4"
 * - isActive: true
 *
 * idempotent: (sizeCode, nup) 복합 UNIQUE 키로 이미 존재 시 skip.
 */

interface PresetSeed {
  sizeCode: string;
  nup: string;
  paperOrientation: 'landscape' | 'portrait';
  gridCols: number;
  gridRows: number;
}

const PRESETS: PresetSeed[] = [
  // 16up — 4×4 grid (landscape)
  { sizeCode: '3x4', nup: '16up', paperOrientation: 'landscape', gridCols: 4, gridRows: 4 },
  { sizeCode: '4x3', nup: '16up', paperOrientation: 'landscape', gridCols: 4, gridRows: 4 },

  // 8up — 4×2 grid (landscape) [인디고 전용]
  { sizeCode: '6x4', nup: '8up', paperOrientation: 'landscape', gridCols: 4, gridRows: 2 },
  { sizeCode: '4x6', nup: '8up', paperOrientation: 'landscape', gridCols: 4, gridRows: 2 },

  // 4up — 2×2 grid (landscape)
  { sizeCode: '5x7', nup: '4up', paperOrientation: 'landscape', gridCols: 2, gridRows: 2 },
  { sizeCode: '7x5', nup: '4up', paperOrientation: 'landscape', gridCols: 2, gridRows: 2 },
  { sizeCode: '7x5.5', nup: '4up', paperOrientation: 'landscape', gridCols: 2, gridRows: 2 },
  { sizeCode: '5.5x7', nup: '4up', paperOrientation: 'landscape', gridCols: 2, gridRows: 2 },
  { sizeCode: '5.5x7.5', nup: '4up', paperOrientation: 'landscape', gridCols: 2, gridRows: 2 },
  { sizeCode: '7.5x5.5', nup: '4up', paperOrientation: 'landscape', gridCols: 2, gridRows: 2 },
  { sizeCode: '6x7.5', nup: '4up', paperOrientation: 'landscape', gridCols: 2, gridRows: 2 },
  { sizeCode: '7.5x6', nup: '4up', paperOrientation: 'landscape', gridCols: 2, gridRows: 2 },
  { sizeCode: '6x8', nup: '4up', paperOrientation: 'landscape', gridCols: 2, gridRows: 2 },
  { sizeCode: '8x6', nup: '4up', paperOrientation: 'landscape', gridCols: 2, gridRows: 2 },

  // 2up — 2×1 grid (landscape, A4세로만 portrait)
  { sizeCode: '8x8', nup: '2up', paperOrientation: 'landscape', gridCols: 2, gridRows: 1 },
  { sizeCode: '8x10', nup: '2up', paperOrientation: 'landscape', gridCols: 2, gridRows: 1 },
  { sizeCode: '10x8', nup: '2up', paperOrientation: 'landscape', gridCols: 2, gridRows: 1 },
  { sizeCode: '11x8', nup: '2up', paperOrientation: 'landscape', gridCols: 2, gridRows: 1 },
  { sizeCode: '8x11', nup: '2up', paperOrientation: 'landscape', gridCols: 2, gridRows: 1 },
  { sizeCode: '11x8.25', nup: '2up', paperOrientation: 'landscape', gridCols: 2, gridRows: 1 },
  { sizeCode: '8.25x11', nup: '2up', paperOrientation: 'landscape', gridCols: 2, gridRows: 1 },
  { sizeCode: '11x8.6', nup: '2up', paperOrientation: 'landscape', gridCols: 2, gridRows: 1 },
  { sizeCode: '8.6x11', nup: '2up', paperOrientation: 'landscape', gridCols: 2, gridRows: 1 },
  { sizeCode: 'A4세로', nup: '2up', paperOrientation: 'portrait', gridCols: 1, gridRows: 2 },
  { sizeCode: 'A4가로', nup: '2up', paperOrientation: 'landscape', gridCols: 2, gridRows: 1 },

  // 1up — 1×1 grid (portrait)
  { sizeCode: '10x10', nup: '1up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
  { sizeCode: '11x11', nup: '1up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },

  // 1+up — 1×1 grid (portrait, 큰 규격)
  { sizeCode: '13x10', nup: '1+up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
  { sizeCode: '10x13', nup: '1+up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
  { sizeCode: '14x11', nup: '1+up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
  { sizeCode: '11x14', nup: '1+up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
  { sizeCode: '11x15', nup: '1+up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
  { sizeCode: '15x11', nup: '1+up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
  { sizeCode: '16x11', nup: '1+up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
  { sizeCode: '11x16', nup: '1+up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
  { sizeCode: '12x15', nup: '1+up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
  { sizeCode: '15x12', nup: '1+up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
  { sizeCode: '14x14', nup: '1+up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },

  // 1++up — 1×1 grid (portrait, 최대 규격)
  { sizeCode: '14x16', nup: '1++up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
  { sizeCode: '16x14', nup: '1++up', paperOrientation: 'portrait', gridCols: 1, gridRows: 1 },
];

export async function seedPrintRoomPresets(prisma: PrismaClient): Promise<void> {
  console.log(`Seeding PrintRoomPresets (${PRESETS.length} entries)...`);

  let created = 0;
  let skipped = 0;

  for (const p of PRESETS) {
    const existing = await prisma.printRoomPreset.findUnique({
      where: { sizeCode_nup: { sizeCode: p.sizeCode, nup: p.nup } },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.printRoomPreset.create({
      data: {
        sizeCode: p.sizeCode,
        nup: p.nup,
        paperOrientation: p.paperOrientation,
        gridCols: p.gridCols,
        gridRows: p.gridRows,
        marginMm: 10,
        cropMarkLengthMm: 5,
        cropMarkThicknessPt: 0.25,
        cropMarkColor: 'K100',
        pdfVersion: '1.4',
        isActive: true,
      },
    });
    created++;
  }

  console.log(
    `PrintRoomPresets seeded: created=${created}, skipped=${skipped}, total=${PRESETS.length}`,
  );
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedPrintRoomPresets(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
