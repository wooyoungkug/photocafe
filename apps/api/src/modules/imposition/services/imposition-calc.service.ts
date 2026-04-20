import { BadRequestException, Injectable } from '@nestjs/common';

/** mm → pt 변환 상수 */
export const MM_TO_PT = 72 / 25.4;

export type BindingType = 'compressed' | 'tack' | 'perfect' | 'flat';

export interface ImpositionInput {
  productWidth: number;      // mm
  productHeight: number;     // mm
  pageCount: number;
  bindingType: BindingType;
  sheetWidth?: number;       // mm
  sheetHeight?: number;      // mm
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  bleed?: number;
  gutter?: number;
  creaseWidth?: number;
  tackMargin?: number;
  tackEdge?: 'left' | 'right' | 'top' | 'bottom';
  rotationPolicy?: '0' | '90' | 'auto';
  grainDirection?: 'short' | 'long';
  /**
   * 수동 Nup 강제값.
   * - compressed: 1=단면/테이핑, 2/4/6/8=스프레드 페어 N쌍 (cols×rows로 분산)
   * - perfect:    1/2/4…=시트당 페이지 수 (순차)
   * - tack/flat:  시트당 단위박스 수
   */
  manualNup?: number;
}

export interface Placement {
  /** 시트 내 X (mm) */
  x: number;
  /** 시트 내 Y (mm) */
  y: number;
  /** 단위 박스 너비 (mm, 콘텐츠+bleed, 압축앨범이면 2 페이지+오시) */
  width: number;
  /** 단위 박스 높이 (mm) */
  height: number;
  /** 이 단위 박스에 매핑되는 원본 페이지 번호 배열(1-based) */
  pages: number[];
  /** 0 | 90 (콘텐츠 자체 회전 각도) */
  rotation: 0 | 90;
  /** 타카 edge 정보(타카 모드만) */
  tackEdge?: 'left' | 'right' | 'top' | 'bottom';
  /** 압축앨범 crease x-좌표 (mm, 시트기준) — Nup>=2에서는 creaseXs 사용 권장 */
  creaseX?: number;
  /** 압축앨범 Nup>=2 일 때 모든 오시 라인 x-좌표 (mm, 시트기준) */
  creaseXs?: number[];
  /** 이 단위박스가 페어(스프레드) 인지 여부. compressed Nup>=2 → true */
  isPair?: boolean;
  /** 테이핑 필요 플래그 (compressed Nup=1 한정) */
  needsTaping?: boolean;
}

export interface SheetLayout {
  sheetIndex: number;           // 1-based
  placements: Placement[];
  /** 타카 모드 시트에 적용된 edge */
  tackEdge?: 'left' | 'right' | 'top' | 'bottom';
  /** 시트 전체 오시 라인 x-좌표 (compressed Nup>=2) — 모든 페어 중앙 */
  creaseLines?: number[];
}

export interface ImpositionResult {
  nup: number;
  cols: number;
  rows: number;
  rotation: 0 | 90;
  /** 0.0 ~ 1.0 */
  utilization: number;
  sheetWidth: number;
  sheetHeight: number;
  unitWidth: number;      // 단위 박스 너비 (mm)
  unitHeight: number;     // 단위 박스 높이 (mm)
  pageCount: number;      // 보정 후 페이지 수 (홀수 시 +1)
  sheetCount: number;
  sheets: SheetLayout[];
  warnings: string[];
  /** 실제 사용된 입력값 (프리뷰용 에코) */
  echo: {
    productWidth: number;
    productHeight: number;
    bleed: number;
    gutter: number;
    margin: { top: number; right: number; bottom: number; left: number };
    creaseWidth?: number;
    tackMargin?: number;
    tackEdge?: string;
    bindingType: string;
  };
}

@Injectable()
export class ImpositionCalcService {
  /** 인디고 7900 기본 시트 */
  static readonly DEFAULT_SHEET = { width: 330, height: 482 };

  calculate(input: ImpositionInput): ImpositionResult {
    if (!input.productWidth || !input.productHeight) {
      throw new BadRequestException('productWidth / productHeight 필수');
    }
    if (!input.pageCount || input.pageCount < 1) {
      throw new BadRequestException('pageCount 필수 (>=1)');
    }
    if (input.bleed === undefined || input.bleed === null) {
      throw new BadRequestException('bleed 누락 — 재단여백(mm)은 필수 입력입니다');
    }
    if (input.bleed < 0) {
      throw new BadRequestException('bleed 값은 0 이상이어야 합니다');
    }

    const sheetW = input.sheetWidth ?? ImpositionCalcService.DEFAULT_SHEET.width;
    const sheetH = input.sheetHeight ?? ImpositionCalcService.DEFAULT_SHEET.height;
    const marginT = input.marginTop ?? 5;
    const marginR = input.marginRight ?? 5;
    const marginB = input.marginBottom ?? 5;
    const marginL = input.marginLeft ?? 5;
    const bleed = input.bleed ?? 3;
    const gutter = input.gutter ?? 3;
    const creaseWidth = input.creaseWidth ?? 0;
    const tackMargin = input.tackMargin ?? 12;
    const tackEdge = input.tackEdge ?? 'left';
    const rotationPolicy = input.rotationPolicy ?? 'auto';
    const grainDirection = input.grainDirection ?? 'short';
    const bindingType = input.bindingType;

    // 유효 인쇄영역
    const usableW = sheetW - marginL - marginR;
    const usableH = sheetH - marginT - marginB;

    if (usableW <= 0 || usableH <= 0) {
      throw new BadRequestException('여백이 시트보다 커서 유효 인쇄영역이 없습니다');
    }

    // ===== compressed 특례: Nup=1 결정 =====
    // manualNup===1 → 단면/테이핑 모드 (스프레드 아님, 1 페이지/단위박스)
    // manualNup===undefined/0 → 기본 스프레드 페어링 (Nup>=2 자동)
    // manualNup===2,4,6,8 → 페어링 N쌍 (compressed 에서는 pair count 로 해석)
    const compressedSingleMode =
      bindingType === 'compressed' && input.manualNup === 1;
    const isPairingMode = bindingType === 'compressed' && !compressedSingleMode;

    // 단위 박스 계산 (모드별)
    let unitW: number;
    let unitH: number;
    if (isPairingMode) {
      // 스프레드 페어: 좌우 2페이지 나란히 + 중앙 오시 1개
      unitW = input.productWidth * 2 + creaseWidth + bleed * 2;
      unitH = input.productHeight + bleed * 2;
    } else if (compressedSingleMode) {
      // compressed Nup=1: 단면 출력 (1페이지/단위박스), 테이핑 경고
      unitW = input.productWidth + bleed * 2;
      unitH = input.productHeight + bleed * 2;
    } else if (bindingType === 'tack') {
      // 타카는 콘텐츠 한쪽(제본변)에 여백 추가
      const isHorizontalEdge = tackEdge === 'left' || tackEdge === 'right';
      unitW = input.productWidth + bleed * 2 + (isHorizontalEdge ? tackMargin : 0);
      unitH = input.productHeight + bleed * 2 + (!isHorizontalEdge ? tackMargin : 0);
    } else {
      // perfect (무선제본 화보) / flat: 단순 1페이지/단위박스
      unitW = input.productWidth + bleed * 2;
      unitH = input.productHeight + bleed * 2;
    }

    // 회전 후보 계산
    const candidates: Array<{ rotation: 0 | 90; cols: number; rows: number; score: number }> = [];

    const computeGrid = (uW: number, uH: number) => {
      // gutter 포함: cols*uW + (cols-1)*gutter <= usableW
      const cols = Math.max(0, Math.floor((usableW + gutter) / (uW + gutter)));
      const rows = Math.max(0, Math.floor((usableH + gutter) / (uH + gutter)));
      return { cols, rows };
    };

    // 0°
    const rot0 = computeGrid(unitW, unitH);
    // 90° (단위박스 회전)
    const rot90 = computeGrid(unitH, unitW);

    const grainScore = (rotation: 0 | 90) => {
      // short-grain 우선: 단위박스의 긴변이 sheet의 짧은변과 평행이면 페널티 없음
      // 간단 휴리스틱: rotation 0 은 unitW 기준, rotation 90 은 unitH 기준
      const shorterSheet = Math.min(sheetW, sheetH);
      const longerSide = rotation === 0
        ? Math.max(unitW, unitH)
        : Math.max(unitH, unitW);
      // longer side 가 짧은변과 평행이면 short-grain 부합
      const aligned = rotation === 0
        ? (unitH >= unitW ? sheetH <= sheetW : sheetW <= sheetH)
        : (unitW >= unitH ? sheetH <= sheetW : sheetW <= sheetH);
      // grainDirection==short 인데 aligned 가 false 면 -10%
      if (grainDirection === 'short' && !aligned) return -0.1;
      return 0;
    };

    candidates.push({
      rotation: 0,
      cols: rot0.cols,
      rows: rot0.rows,
      score: rot0.cols * rot0.rows * (1 + grainScore(0)),
    });
    candidates.push({
      rotation: 90,
      cols: rot90.cols,
      rows: rot90.rows,
      score: rot90.cols * rot90.rows * (1 + grainScore(90)),
    });

    // rotationPolicy 필터
    let filtered = candidates;
    if (rotationPolicy === '0') filtered = [candidates[0]];
    else if (rotationPolicy === '90') filtered = [candidates[1]];

    // 최고 점수 선택. 동점(정확) 시 short-grain 우선 (score 가 동일하더라도 rotation 결정)
    filtered.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // 동점 → grain 일치하는 쪽 (grainScore 0 인 쪽) 우선
      return grainScore(b.rotation) - grainScore(a.rotation);
    });

    let best = filtered[0];

    // ===== manualNup 강제 적용 =====
    // compressed 페어링: manualNup 은 "페어 개수" (2,4,6,8)
    //   → 실제 자동 계산 값이 충분히 큰 경우만 수동값으로 제한
    // perfect/tack/flat: manualNup 은 시트당 단위박스 수
    if (input.manualNup && input.manualNup > 0) {
      const wanted = input.manualNup;
      const autoMax = best.cols * best.rows;
      if (wanted <= autoMax) {
        // 적합한 cols×rows 조합 선택: wanted 를 cols=최대, rows=wanted/cols 로 분배
        // 스프레드 페어링은 cols 우선 (가로로 나란히 배치 자연스러움)
        let chosenCols = 1;
        let chosenRows = 1;
        // wanted 의 약수 중 cols<=best.cols, rows<=best.rows 를 만족하며 곱=wanted 인 조합 탐색
        for (let c = best.cols; c >= 1; c--) {
          if (wanted % c === 0) {
            const r = wanted / c;
            if (r <= best.rows) {
              chosenCols = c;
              chosenRows = r;
              break;
            }
          }
        }
        if (chosenCols * chosenRows === wanted) {
          best = { ...best, cols: chosenCols, rows: chosenRows };
        }
        // 약수 매칭 실패 시 자동값 유지
      }
      // wanted > autoMax 면 경고만 붙이고 autoMax 유지
    }

    const nup = Math.max(0, best.cols * best.rows);
    if (nup === 0) {
      throw new BadRequestException('단위박스가 시트보다 커서 Nup=0 입니다. 시트/여백/규격을 확인하세요');
    }

    const selUnitW = best.rotation === 0 ? unitW : unitH;
    const selUnitH = best.rotation === 0 ? unitH : unitW;

    // 활용률
    const utilization = (nup * selUnitW * selUnitH) / (usableW * usableH);

    // 페어링/페이지 배열 구성
    const warnings: string[] = [];
    let correctedPageCount = input.pageCount;
    let pagePairs: number[][]; // 각 원소 = 단위박스 1개에 들어갈 페이지 배열
    if (isPairingMode) {
      // compressed Nup>=2: 스프레드 페어링 (1,2)(3,4)...
      if (correctedPageCount % 2 !== 0) {
        correctedPageCount += 1;
        warnings.push(
          `압축앨범 페이지 수가 홀수입니다. 마지막에 빈 페이지를 자동 삽입했습니다 (총 ${correctedPageCount}P).`,
        );
      }
      pagePairs = [];
      for (let i = 0; i < correctedPageCount; i += 2) {
        pagePairs.push([i + 1, i + 2]);
      }
    } else {
      // compressed Nup=1 / perfect / tack / flat: 순차 1페이지씩
      pagePairs = [];
      for (let i = 0; i < correctedPageCount; i++) {
        pagePairs.push([i + 1]);
      }
      if (compressedSingleMode) {
        warnings.push(
          '압축앨범 1Up — 단면 1페이지 출력 방식입니다. 제본 시 별도 테이핑이 필요합니다.',
        );
      }
    }

    const sheetCount = Math.ceil(pagePairs.length / nup);

    // 배치 좌표 생성
    const sheets: SheetLayout[] = [];
    const totalGridW = best.cols * selUnitW + (best.cols - 1) * gutter;
    const totalGridH = best.rows * selUnitH + (best.rows - 1) * gutter;
    const originX = marginL + (usableW - totalGridW) / 2;
    const originY = marginT + (usableH - totalGridH) / 2;

    for (let s = 0; s < sheetCount; s++) {
      const placements: Placement[] = [];
      // 타카: 짝수 시트는 반대편으로 교대
      const sheetTackEdge: 'left' | 'right' | 'top' | 'bottom' =
        bindingType === 'tack'
          ? (s % 2 === 0 ? tackEdge : flipEdge(tackEdge))
          : tackEdge;

      for (let r = 0; r < best.rows; r++) {
        for (let c = 0; c < best.cols; c++) {
          const slotIndex = s * nup + r * best.cols + c;
          if (slotIndex >= pagePairs.length) break;
          const pages = pagePairs[slotIndex];
          const x = originX + c * (selUnitW + gutter);
          const y = originY + r * (selUnitH + gutter);

          const placement: Placement = {
            x,
            y,
            width: selUnitW,
            height: selUnitH,
            pages,
            rotation: best.rotation,
          };

          if (isPairingMode) {
            // 스프레드 페어: crease X 는 단위박스 가로 중앙 (회전 0 기준)
            // 회전 90° 시에도 단위박스 내부의 "페어 중앙" 이므로 x + selUnitW/2 가 올바름
            const creaseX = x + selUnitW / 2;
            placement.creaseX = creaseX;
            placement.creaseXs = [creaseX];
            placement.isPair = true;
          }
          if (compressedSingleMode) {
            placement.needsTaping = true;
          }
          if (bindingType === 'tack') {
            placement.tackEdge = sheetTackEdge;
          }
          placements.push(placement);
        }
      }

      const sheetCreaseLines = isPairingMode
        ? placements
            .map((pl) => pl.creaseX)
            .filter((v): v is number => v !== undefined)
        : undefined;

      sheets.push({
        sheetIndex: s + 1,
        placements,
        tackEdge: bindingType === 'tack' ? sheetTackEdge : undefined,
        creaseLines: sheetCreaseLines,
      });
    }

    // 대형 규격 × 타카 × Nup 1 × 50% 미만 경고
    if (bindingType === 'tack' && nup === 1 && utilization < 0.5) {
      warnings.push(
        `활용률 ${(utilization * 100).toFixed(1)}% — 대형 규격 타카 배치가 50% 미만입니다. Nup=1 시트 낭비가 큽니다.`,
      );
    }
    // HD 시트(660) 플래그
    if (sheetH >= 660 || sheetW >= 660) {
      warnings.push('HD 시트(660mm) 사용 — 인디고 7900 HD DFE 호환성 확인 필요.');
    }

    return {
      nup,
      cols: best.cols,
      rows: best.rows,
      rotation: best.rotation,
      utilization,
      sheetWidth: sheetW,
      sheetHeight: sheetH,
      unitWidth: selUnitW,
      unitHeight: selUnitH,
      pageCount: correctedPageCount,
      sheetCount,
      sheets,
      warnings,
      echo: {
        productWidth: input.productWidth,
        productHeight: input.productHeight,
        bleed,
        gutter,
        margin: { top: marginT, right: marginR, bottom: marginB, left: marginL },
        creaseWidth: bindingType === 'compressed' ? creaseWidth : undefined,
        tackMargin: bindingType === 'tack' ? tackMargin : undefined,
        tackEdge: bindingType === 'tack' ? tackEdge : undefined,
        bindingType,
      },
    };
  }
}

function flipEdge(edge: 'left' | 'right' | 'top' | 'bottom'): 'left' | 'right' | 'top' | 'bottom' {
  switch (edge) {
    case 'left': return 'right';
    case 'right': return 'left';
    case 'top': return 'bottom';
    case 'bottom': return 'top';
  }
}
