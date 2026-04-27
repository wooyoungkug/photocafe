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
  /**
   * 중앙정렬: 유효 인쇄영역을 cols×rows 동일 셀로 나누고 각 셀 중앙에 단위박스 배치.
   * 기본(false)은 좌상단에서 tight-pack.
   */
  centerAlign?: boolean;
  /**
   * 여백없음: gutter=0 강제 (단위박스 간격 제거하여 붙여서 출력).
   */
  noGutter?: boolean;
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
  /** 압축앨범 crease x-좌표 (mm, 시트기준) — 회전 0° 페어. Nup>=2에서는 creaseXs 사용 권장 */
  creaseX?: number;
  /** 압축앨범 Nup>=2 일 때 모든 오시 라인 x-좌표 (mm, 시트기준) */
  creaseXs?: number[];
  /** 압축앨범 crease y-좌표 (mm, 시트기준) — 회전 90° 페어 (가로 오시선) */
  creaseY?: number;
  /** 회전 90° 페어 Nup>=2 일 때 모든 오시 라인 y-좌표 */
  creaseYs?: number[];
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
  /** 시트 전체 오시 라인 x-좌표 (compressed Nup>=2, 회전 0°) — 모든 페어 중앙 */
  creaseLines?: number[];
  /** 시트 전체 오시 라인 y-좌표 (compressed Nup>=2, 회전 90°) */
  creaseLinesY?: number[];
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
    // noGutter 옵션: gutter=0 강제 (붙여서 출력)
    const gutter = input.noGutter ? 0 : (input.gutter ?? 3);
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
    let compressedSingleMode =
      bindingType === 'compressed' && input.manualNup === 1;
    let isPairingMode = bindingType === 'compressed' && !compressedSingleMode;

    // 단위 박스 계산기 (모드별 함수로 분리 — 폴백 재계산 용이)
    const pairingUnit = () => ({
      // 스프레드 페어: 좌우 2페이지 나란히 + 중앙 오시 1개
      uW: input.productWidth * 2 + creaseWidth + bleed * 2,
      uH: input.productHeight + bleed * 2,
    });
    const singleUnit = () => ({
      // 단면 1페이지/단위박스
      uW: input.productWidth + bleed * 2,
      uH: input.productHeight + bleed * 2,
    });
    const tackUnit = () => {
      const isHorizontalEdge = tackEdge === 'left' || tackEdge === 'right';
      return {
        uW: input.productWidth + bleed * 2 + (isHorizontalEdge ? tackMargin : 0),
        uH: input.productHeight + bleed * 2 + (!isHorizontalEdge ? tackMargin : 0),
      };
    };

    let unitW: number;
    let unitH: number;
    if (isPairingMode) {
      ({ uW: unitW, uH: unitH } = pairingUnit());
    } else if (compressedSingleMode) {
      ({ uW: unitW, uH: unitH } = singleUnit());
    } else if (bindingType === 'tack') {
      ({ uW: unitW, uH: unitH } = tackUnit());
    } else {
      // perfect (무선제본 화보) / flat: 단순 1페이지/단위박스
      ({ uW: unitW, uH: unitH } = singleUnit());
    }

    // 회전 후보 계산기 — 폴백 시 재실행 가능
    const computeGrid = (uW: number, uH: number) => {
      // gutter 포함: cols*uW + (cols-1)*gutter <= usableW
      const cols = Math.max(0, Math.floor((usableW + gutter) / (uW + gutter)));
      const rows = Math.max(0, Math.floor((usableH + gutter) / (uH + gutter)));
      return { cols, rows };
    };

    const grainScoreFor = (rotation: 0 | 90, uW: number, uH: number) => {
      // short-grain 우선: 단위박스의 긴변이 sheet의 짧은변과 평행이면 페널티 없음
      const aligned = rotation === 0
        ? (uH >= uW ? sheetH <= sheetW : sheetW <= sheetH)
        : (uW >= uH ? sheetH <= sheetW : sheetW <= sheetH);
      if (grainDirection === 'short' && !aligned) return -0.1;
      return 0;
    };

    /**
     * 오리엔테이션 매칭 보너스.
     * 제품과 시트의 긴축 방향이 같으면(둘 다 세로형, 둘 다 가로형, 또는 제품이 정사각형)
     * rotation=0(회전 없음)을 우선한다. 사용자 직관(세로 시트에 세로/정사각 제품은 그대로 표시)에 맞추기 위함.
     * 보너스값 0.15 > grain 페널티 0.1 이어야 grain 보다 우선됨.
     */
    const orientationBonusFor = (rotation: 0 | 90, uW: number, uH: number): number => {
      const sheetPortrait = sheetH >= sheetW;
      // rotation 적용 후 단위박스의 방향
      const effW = rotation === 0 ? uW : uH;
      const effH = rotation === 0 ? uH : uW;
      const unitPortrait = effH > effW;
      const unitSquare = Math.abs(effH - effW) < 0.01;
      // 정사각형: rotation=0을 선호 (둘 중 뭘 택해도 동일하지만 의미상 회전 없음이 자연스러움)
      if (unitSquare) return rotation === 0 ? 0.15 : 0;
      // 방향 일치: 매칭되는 회전에 보너스
      const matches = unitPortrait === sheetPortrait;
      return matches ? 0.15 : 0;
    };

    const pickBest = (uW: number, uH: number) => {
      const rot0 = computeGrid(uW, uH);
      const rot90 = computeGrid(uH, uW);
      const cands = [
        {
          rotation: 0 as 0 | 90,
          cols: rot0.cols,
          rows: rot0.rows,
          score: rot0.cols * rot0.rows * (1 + grainScoreFor(0, uW, uH) + orientationBonusFor(0, uW, uH)),
        },
        {
          rotation: 90 as 0 | 90,
          cols: rot90.cols,
          rows: rot90.rows,
          score: rot90.cols * rot90.rows * (1 + grainScoreFor(90, uW, uH) + orientationBonusFor(90, uW, uH)),
        },
      ];
      let filt = cands;
      if (rotationPolicy === '0') filt = [cands[0]];
      else if (rotationPolicy === '90') filt = [cands[1]];
      filt.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // 동률: 오리엔테이션 매칭 → grain → rotation=0 순
        const oa = orientationBonusFor(a.rotation, uW, uH);
        const ob = orientationBonusFor(b.rotation, uW, uH);
        if (ob !== oa) return ob - oa;
        const ga = grainScoreFor(a.rotation, uW, uH);
        const gb = grainScoreFor(b.rotation, uW, uH);
        if (gb !== ga) return gb - ga;
        return a.rotation - b.rotation; // rotation=0 우선
      });
      return filt[0];
    };

    let best = pickBest(unitW, unitH);

    // ===== 압축앨범 자동 폴백: 2up(페어링) 안 들어가면 1up(단면)으로 전환 =====
    // 인쇄 현장 정의: 1up=시트당 페이지 1장, 2up=2장 좌우 무여백 페어
    // 사용자가 manualNup 으로 명시 지정한 경우는 폴백하지 않음 (사용자 의도 존중)
    let autoFellBackToSingle = false;
    if (
      isPairingMode &&
      best.cols * best.rows === 0 &&
      !input.manualNup
    ) {
      autoFellBackToSingle = true;
      isPairingMode = false;
      compressedSingleMode = true;
      ({ uW: unitW, uH: unitH } = singleUnit());
      best = pickBest(unitW, unitH);
    }

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
    if (autoFellBackToSingle) {
      warnings.push(
        '압축앨범 2up(스프레드 페어)가 시트에 들어가지 않아 자동으로 1up(단면)으로 전환되었습니다. 인쇄 후 테이핑 작업이 필요합니다.',
      );
    }
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
    // 중앙정렬 모드: 유효 인쇄영역을 cols×rows 동일 셀로 분할, 각 셀 중앙에 단위박스 배치
    // 일반(tight-pack): 좌상단부터 gutter 간격으로 붙여 배치 (전체 그리드 중앙 정렬)
    const useCenter = input.centerAlign === true;
    const cellW = useCenter ? usableW / best.cols : 0;
    const cellH = useCenter ? usableH / best.rows : 0;
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
          const x = useCenter
            ? marginL + c * cellW + (cellW - selUnitW) / 2
            : originX + c * (selUnitW + gutter);
          const y = useCenter
            ? marginT + r * cellH + (cellH - selUnitH) / 2
            : originY + r * (selUnitH + gutter);

          const placement: Placement = {
            x,
            y,
            width: selUnitW,
            height: selUnitH,
            pages,
            rotation: best.rotation,
          };

          if (isPairingMode) {
            // 스프레드 페어 오시선:
            // - 회전 0°: 페어 박스 가로 중앙 (세로 오시선) → creaseX
            // - 회전 90°: 페어 박스 세로 중앙 (가로 오시선) → creaseY
            //   (회전된 슬롯에서 페이지가 위/아래로 분할되므로 오시는 가로 방향)
            if (best.rotation === 90) {
              const creaseY = y + selUnitH / 2;
              placement.creaseY = creaseY;
              placement.creaseYs = [creaseY];
            } else {
              const creaseX = x + selUnitW / 2;
              placement.creaseX = creaseX;
              placement.creaseXs = [creaseX];
            }
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

      const sheetCreaseLines = isPairingMode && best.rotation !== 90
        ? placements
            .map((pl) => pl.creaseX)
            .filter((v): v is number => v !== undefined)
        : undefined;
      const sheetCreaseLinesY = isPairingMode && best.rotation === 90
        ? placements
            .map((pl) => pl.creaseY)
            .filter((v): v is number => v !== undefined)
        : undefined;

      sheets.push({
        sheetIndex: s + 1,
        placements,
        tackEdge: bindingType === 'tack' ? sheetTackEdge : undefined,
        creaseLines: sheetCreaseLines,
        creaseLinesY: sheetCreaseLinesY,
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
