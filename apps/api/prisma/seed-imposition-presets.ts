/**
 * 출력실 HP Indigo 임포지션 프리셋 시드 — PrintRoomPreset 테이블.
 *
 * NUP 그룹:
 *   16up (4×4): 3x4, 4x3
 *   8up  (4×2): 6x4, 4x6
 *   4up  (2×2): 5x7, 7x5, 7x5.5, 5.5x7, 5.5x7.5, 7.5x5.5, 6x7.5, 7.5x6, 6x8, 8x6
 *   2up  (2×1): 8x8, 8x10, 10x8, 11x8, 8x11, 11x8.25, 8.25x11, 11x8.6, 8.6x11, A4세로, A4가로
 *   1up  (1×1): 10x10, 11x11
 *   1+up (1×1): 13x10, 10x13, 14x11, 11x14, 11x15, 15x11, 16x11, 11x16, 12x15, 15x12, 14x14
 *   1++up(1×1): 14x16, 16x14
 *
 * 멱등성: (sizeCode, nup) 복합 유니크 기준 upsert.
 */

import { PrismaClient } from '@prisma/client';

interface PrintRoomPresetData {
  sizeCode: string;
  nup: string;
  paperOrientation: string;
  gridCols: number;
  gridRows: number;
  marginMm: number;
  cropMarkLengthMm: number;
  cropMarkThicknessPt: number;
  cropMarkColor: string;
  pdfVersion: string;
  isActive: boolean;
}

const DEFAULTS = {
  marginMm: 10,
  cropMarkLengthMm: 5,
  cropMarkThicknessPt: 0.25,
  cropMarkColor: 'K100',
  pdfVersion: '1.4',
  isActive: true,
};

function p(
  sizeCode: string,
  nup: string,
  paperOrientation: string,
  gridCols: number,
  gridRows: number,
): PrintRoomPresetData {
  return { sizeCode, nup, paperOrientation, gridCols, gridRows, ...DEFAULTS };
}

const PRESETS: PrintRoomPresetData[] = [
  // ─── 16up (4×4, landscape) ──────────────────────────────────────────
  p('3x4',     '16up',  'landscape', 4, 4),
  p('4x3',     '16up',  'landscape', 4, 4),

  // ─── 8up (4×2, landscape) ───────────────────────────────────────────
  p('6x4',     '8up',   'landscape', 4, 2),
  p('4x6',     '8up',   'landscape', 4, 2),

  // ─── 4up (2×2, landscape) ───────────────────────────────────────────
  p('5x7',     '4up',   'landscape', 2, 2),
  p('7x5',     '4up',   'landscape', 2, 2),
  p('7x5.5',   '4up',   'landscape', 2, 2),
  p('5.5x7',   '4up',   'landscape', 2, 2),
  p('5.5x7.5', '4up',   'landscape', 2, 2),
  p('7.5x5.5', '4up',   'landscape', 2, 2),
  p('6x7.5',   '4up',   'landscape', 2, 2),
  p('7.5x6',   '4up',   'landscape', 2, 2),
  p('6x8',     '4up',   'landscape', 2, 2),
  p('8x6',     '4up',   'landscape', 2, 2),

  // ─── 2up (2×1, landscape) ───────────────────────────────────────────
  p('8x8',     '2up',   'landscape', 2, 1),
  p('8x10',    '2up',   'landscape', 2, 1),
  p('10x8',    '2up',   'landscape', 2, 1),
  p('11x8',    '2up',   'landscape', 2, 1),
  p('8x11',    '2up',   'landscape', 2, 1),
  p('11x8.25', '2up',   'landscape', 2, 1),
  p('8.25x11', '2up',   'landscape', 2, 1),
  p('11x8.6',  '2up',   'landscape', 2, 1),
  p('8.6x11',  '2up',   'landscape', 2, 1),
  p('A4세로',   '2up',   'landscape', 2, 1),
  p('A4가로',   '2up',   'landscape', 2, 1),

  // ─── 1up (1×1, portrait) ────────────────────────────────────────────
  p('10x10',   '1up',   'portrait',  1, 1),
  p('11x11',   '1up',   'portrait',  1, 1),

  // ─── 1+up (1×1, portrait) ───────────────────────────────────────────
  p('13x10',   '1+up',  'portrait',  1, 1),
  p('10x13',   '1+up',  'portrait',  1, 1),
  p('14x11',   '1+up',  'portrait',  1, 1),
  p('11x14',   '1+up',  'portrait',  1, 1),
  p('11x15',   '1+up',  'portrait',  1, 1),
  p('15x11',   '1+up',  'portrait',  1, 1),
  p('16x11',   '1+up',  'portrait',  1, 1),
  p('11x16',   '1+up',  'portrait',  1, 1),
  p('12x15',   '1+up',  'portrait',  1, 1),
  p('15x12',   '1+up',  'portrait',  1, 1),
  p('14x14',   '1+up',  'portrait',  1, 1),

  // ─── 1++up (1×1, portrait) ──────────────────────────────────────────
  p('14x16',   '1++up', 'portrait',  1, 1),
  p('16x14',   '1++up', 'portrait',  1, 1),
];

export async function seedIndigoPresets(prisma: PrismaClient): Promise<void> {
  console.log(`PrintRoomPreset seed: upserting ${PRESETS.length} presets...`);

  for (const data of PRESETS) {
    await prisma.printRoomPreset.upsert({
      where: { sizeCode_nup: { sizeCode: data.sizeCode, nup: data.nup } },
      update: {
        paperOrientation: data.paperOrientation,
        gridCols: data.gridCols,
        gridRows: data.gridRows,
        marginMm: data.marginMm,
        cropMarkLengthMm: data.cropMarkLengthMm,
        cropMarkThicknessPt: data.cropMarkThicknessPt,
        cropMarkColor: data.cropMarkColor,
        pdfVersion: data.pdfVersion,
        isActive: data.isActive,
      },
      create: data,
    });
  }

  // 잘못 삽입된 indigo bindingType 임포지션 프리셋 정리
  const deleted = await prisma.impositionPreset.deleteMany({
    where: { bindingType: 'indigo' },
  });
  if (deleted.count > 0) {
    console.log(`  → 이전 잘못 삽입된 ImpositionPreset(indigo) ${deleted.count}개 정리됨`);
  }

  console.log(`PrintRoomPreset seed: done — ${PRESETS.length} presets.`);
}
