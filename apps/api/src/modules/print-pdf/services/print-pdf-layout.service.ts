import { Injectable, Optional } from '@nestjs/common';
import { ImpositionCalcService } from '../../imposition/services/imposition-calc.service';

/** mm → pt 변환 상수 (1mm = 72/25.4 pt) */
export const MM_TO_PT = 72 / 25.4;

/** 인덱스 바 높이 (mm) */
export const INDEX_HEIGHT_MM = 8;

/** 재단선 기본값 (ISO 12647 준수) */
export const CROP_MARK = {
  LENGTH_MM: 5,      // 재단선 길이 (mm) — ISO 12647: 5mm
  OFFSET_MM: 3,      // trim edge에서 떨어진 거리 (mm) — ISO 12647: 3mm
  LINE_WIDTH: 0.5,   // pt — ISO 12647: 0.5pt
};

/** 기본 재단여백 (mm) */
export const DEFAULT_BLEED_MM = 3;

/** 재단선이 바깥으로 나가기 위한 페이지 마진 (mm) = 재단선길이 + 오프셋 + 여유 */
export const CROP_MARGIN_MM = CROP_MARK.LENGTH_MM + CROP_MARK.OFFSET_MM + 1;

export interface PageDimensions {
  /** PDF 페이지 전체 너비 (pt) */
  pageWidthPt: number;
  /** PDF 페이지 전체 높이 (pt) */
  pageHeightPt: number;
  /** 이미지 배치 X (pt) */
  imageX: number;
  /** 이미지 배치 Y (pt) */
  imageY: number;
  /** 이미지 너비 (pt) - bleed 포함 */
  imageWidthPt: number;
  /** 이미지 높이 (pt) - bleed 포함 */
  imageHeightPt: number;
  /** trim 영역 좌표 (pt) - crop mark 렌더링용 */
  trimLeft: number;
  trimTop: number;
  trimRight: number;
  trimBottom: number;
  /** bleed 값 (mm) */
  bleedTop: number;
  bleedBottom: number;
  bleedLeft: number;
  bleedRight: number;
  /** trim 크기 (mm) */
  trimWidthMm: number;
  trimHeightMm: number;
}

export interface NupCell {
  x: number;  // 셀 시작 X (pt)
  y: number;  // 셀 시작 Y (pt)
  width: number;  // 셀 너비 (pt)
  height: number; // 셀 높이 (pt)
  /**
   * 해당 방향의 crop mark 억제.
   * preserveSpread 로 좌우 셀을 붙여 배치할 때 내부(접합)경계 crop mark 제거용.
   */
  suppressCropMarks?: {
    left?: boolean;
    right?: boolean;
    top?: boolean;
    bottom?: boolean;
  };
}

export interface NupLayout {
  /** 용지 원판 크기 (pt) */
  sheetWidthPt: number;
  sheetHeightPt: number;
  /** Nup X/Y */
  nUpX: number;
  nUpY: number;
  /** 각 셀 위치 */
  cells: NupCell[];
  /** 각 셀 내 페이지 레이아웃 */
  cellPageDimensions: PageDimensions;
}

export interface SpecInput {
  trimWidthMm?: number;
  trimHeightMm?: number;
  widthMm: number;
  heightMm: number;
  bleedTop?: number;
  bleedBottom?: number;
  bleedLeft?: number;
  bleedRight?: number;
  nup?: string;
  nUpX?: number;
  nUpY?: number;
}

export interface PaperInput {
  sheetWidthMm?: number;
  sheetHeightMm?: number;
}

@Injectable()
export class PrintPdfLayoutService {
  constructor(@Optional() private readonly impositionCalc?: ImpositionCalcService) {}

  /**
   * 신규 임포지션 엔진 위임 여부 판단.
   * bindingType 이 'compressed' | 'tack' 이면 ImpositionCalcService 로 위임.
   * 이 메서드는 Nup 수만 반환한다(기존 \d+up 파싱 로직과 호환).
   */
  delegateNupFromBinding(
    bindingType: string | null | undefined,
    spec: { widthMm: number; heightMm: number; pages?: number; bleed?: number },
    paper: { sheetWidthMm?: number; sheetHeightMm?: number },
  ): { nup: number; rotation: 0 | 90; utilization: number } | null {
    if (!bindingType) return null;
    const s = bindingType.toLowerCase();
    const kind: 'compressed' | 'tack' | null = s.includes('압축') || s.includes('compressed')
      ? 'compressed'
      : s.includes('타카') || s.includes('tack')
        ? 'tack'
        : null;
    if (!kind) return null;
    if (!this.impositionCalc) return null;
    try {
      const r = this.impositionCalc.calculate({
        productWidth: spec.widthMm,
        productHeight: spec.heightMm,
        pageCount: spec.pages ?? 1,
        bindingType: kind,
        sheetWidth: paper.sheetWidthMm,
        sheetHeight: paper.sheetHeightMm,
        bleed: spec.bleed ?? 3,
      });
      return { nup: r.nup, rotation: r.rotation, utilization: r.utilization };
    } catch {
      return null;
    }
  }

  /**
   * 1up 페이지 크기 계산
   */
  calculate1upDimensions(spec: SpecInput, includeBleed: boolean): PageDimensions {
    const trimW = spec.trimWidthMm || spec.widthMm;
    const trimH = spec.trimHeightMm || spec.heightMm;

    const bleedT = includeBleed ? (spec.bleedTop ?? DEFAULT_BLEED_MM) : 0;
    const bleedB = includeBleed ? (spec.bleedBottom ?? DEFAULT_BLEED_MM) : 0;
    const bleedL = includeBleed ? (spec.bleedLeft ?? DEFAULT_BLEED_MM) : 0;
    const bleedR = includeBleed ? (spec.bleedRight ?? DEFAULT_BLEED_MM) : 0;

    // 페이지 = 이미지 + 재단선 마진 (상하좌우)
    const cm = CROP_MARGIN_MM;
    const pageWidthMm = trimW + bleedL + bleedR + cm * 2;
    const pageHeightMm = trimH + bleedT + bleedB + cm * 2;

    const pageWidthPt = pageWidthMm * MM_TO_PT;
    const pageHeightPt = pageHeightMm * MM_TO_PT;

    // 이미지는 마진 안쪽에 배치
    const imageX = cm * MM_TO_PT;
    const imageY = cm * MM_TO_PT;
    const imageWidthPt = (trimW + bleedL + bleedR) * MM_TO_PT;
    const imageHeightPt = (trimH + bleedT + bleedB) * MM_TO_PT;

    // trim 영역 좌표 (페이지 기준, crop mark 용)
    const trimLeft = (cm + bleedL) * MM_TO_PT;
    const trimTop = (cm + bleedT) * MM_TO_PT;
    const trimRight = (cm + bleedL + trimW) * MM_TO_PT;
    const trimBottom = (cm + bleedT + trimH) * MM_TO_PT;

    return {
      pageWidthPt,
      pageHeightPt,
      imageX,
      imageY,
      imageWidthPt,
      imageHeightPt,
      trimLeft,
      trimTop,
      trimRight,
      trimBottom,
      bleedTop: bleedT,
      bleedBottom: bleedB,
      bleedLeft: bleedL,
      bleedRight: bleedR,
      trimWidthMm: trimW,
      trimHeightMm: trimH,
    };
  }

  /**
   * Nup 레이아웃 계산
   *
   * @param options.preserveSpread
   *   2x2 (4up) 배치에서 좌우 셀을 서로 붙여(내부 크롭마진 제거) 좌우 페이지가
   *   seam 없이 이어지도록 배치. 상/하 행 사이에는 정상 크롭마진을 유지.
   *   양면(spread) 입력 + 4up 케이스용.
   */
  calculateNupLayout(
    spec: SpecInput,
    paper: PaperInput,
    includeBleed: boolean,
    nupOverride?: string,
    options?: { preserveSpread?: boolean },
  ): NupLayout {
    // Nup 결정
    let nUpX = spec.nUpX ?? 1;
    let nUpY = spec.nUpY ?? 1;

    if (nupOverride) {
      const match = nupOverride.match(/^(\d+)up$/i);
      if (match) {
        const total = parseInt(match[1], 10);
        if (total === 2) { nUpX = 2; nUpY = 1; }
        else if (total === 4) { nUpX = 2; nUpY = 2; }
        else if (total === 6) { nUpX = 3; nUpY = 2; }
        else if (total === 9) { nUpX = 3; nUpY = 3; }
        else { nUpX = total; nUpY = 1; }
      }
    } else if (spec.nup) {
      const match = spec.nup.match(/^(\d+)/);
      if (match) {
        const total = parseInt(match[1], 10);
        if (total === 2) { nUpX = 2; nUpY = 1; }
        else if (total === 4) { nUpX = 2; nUpY = 2; }
        else if (total === 6) { nUpX = 3; nUpY = 2; }
        else if (total === 9) { nUpX = 3; nUpY = 3; }
      }
    }

    // 1up이면 단순 계산
    if (nUpX === 1 && nUpY === 1) {
      const dims = this.calculate1upDimensions(spec, includeBleed);
      return {
        sheetWidthPt: dims.pageWidthPt,
        sheetHeightPt: dims.pageHeightPt,
        nUpX: 1,
        nUpY: 1,
        cells: [{ x: 0, y: 0, width: dims.pageWidthPt, height: dims.pageHeightPt }],
        cellPageDimensions: dims,
      };
    }

    // preserveSpread: 2x2(4up) 에서 좌우 셀을 붙여 배치 (내부 크롭마진 제거)
    if (options?.preserveSpread && nUpX === 2 && nUpY === 2) {
      return this.calculatePreserveSpread2x2Layout(spec, includeBleed);
    }

    // Nup > 1: 용지 원판 크기 기준
    const sheetW = paper.sheetWidthMm ?? (spec.widthMm * nUpX + 20);
    const sheetH = paper.sheetHeightMm ?? (spec.heightMm * nUpY + 20);
    const sheetWidthPt = sheetW * MM_TO_PT;
    const sheetHeightPt = sheetH * MM_TO_PT;

    const cellW = sheetWidthPt / nUpX;
    const cellH = sheetHeightPt / nUpY;

    const cells: NupCell[] = [];
    for (let row = 0; row < nUpY; row++) {
      for (let col = 0; col < nUpX; col++) {
        cells.push({
          x: col * cellW,
          y: row * cellH,
          width: cellW,
          height: cellH,
        });
      }
    }

    const cellPageDimensions = this.calculate1upDimensions(spec, includeBleed);

    return {
      sheetWidthPt,
      sheetHeightPt,
      nUpX,
      nUpY,
      cells,
      cellPageDimensions,
    };
  }

  /**
   * preserveSpread 전용 2x2 레이아웃.
   *
   * 일반 2x2:
   *   sheetW = 2 × pageW,  L/R 셀 사이에 크롭마진 × 2 (= 18mm) 틈새 존재
   *
   * preserveSpread 2x2:
   *   sheetW = 2 × pageW - 2 × crop_margin  (내부 크롭마진 제거)
   *   L 셀: x=0, 우측 crop mark 억제 (우측이 R 셀과 맞닿음)
   *   R 셀: x=pageW - 2*crop_margin, 좌측 crop mark 억제 (좌측이 L 셀과 맞닿음)
   *   상하 행은 정상 2 × pageH 로 유지 → 각 spread 사이엔 크롭마진 존재
   */
  private calculatePreserveSpread2x2Layout(spec: SpecInput, includeBleed: boolean): NupLayout {
    const dims = this.calculate1upDimensions(spec, includeBleed);
    const cmPt = CROP_MARGIN_MM * MM_TO_PT;

    const sheetWidthPt = 2 * dims.pageWidthPt - 2 * cmPt;
    const sheetHeightPt = 2 * dims.pageHeightPt;

    // R 셀 x좌표: pageW(=imageX+imageW+imageX) - 2*cm = imageX + imageW - cm
    // 결과적으로 R 이미지 시작 = col1X + imageX = (pageW - 2cm) + cm = pageW - cm = imageX + imageW
    // (= L 이미지 끝과 정확히 일치 → seam 0)
    const col1X = dims.pageWidthPt - 2 * cmPt;
    const row1Y = dims.pageHeightPt;

    const cells: NupCell[] = [
      { x: 0,      y: 0,     width: dims.pageWidthPt, height: dims.pageHeightPt, suppressCropMarks: { right: true } },
      { x: col1X,  y: 0,     width: dims.pageWidthPt, height: dims.pageHeightPt, suppressCropMarks: { left: true } },
      { x: 0,      y: row1Y, width: dims.pageWidthPt, height: dims.pageHeightPt, suppressCropMarks: { right: true } },
      { x: col1X,  y: row1Y, width: dims.pageWidthPt, height: dims.pageHeightPt, suppressCropMarks: { left: true } },
    ];

    return {
      sheetWidthPt,
      sheetHeightPt,
      nUpX: 2,
      nUpY: 2,
      cells,
      cellPageDimensions: dims,
    };
  }
}
