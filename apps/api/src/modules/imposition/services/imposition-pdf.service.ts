import { Injectable } from '@nestjs/common';
import {
  PDFDocument,
  rgb,
  PDFPage,
  degrees,
  PDFFont,
  StandardFonts,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  closePath,
  clip,
  endPath,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';
import { ImpositionResult, MM_TO_PT } from './imposition-calc.service';

/** NanumGothic.ttf 경로 탐색 (print-pdf-renderer와 동일 규칙) */
function resolveKoreanFontPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'fonts', 'NanumGothic.ttf'),
    path.resolve(__dirname, '../../../../fonts/NanumGothic.ttf'),
    path.resolve(__dirname, '../../../../../fonts/NanumGothic.ttf'),
    '/app/fonts/NanumGothic.ttf',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function resolveKoreanBoldFontPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'fonts', 'NanumGothicBold.ttf'),
    path.resolve(__dirname, '../../../../fonts/NanumGothicBold.ttf'),
    path.resolve(__dirname, '../../../../../fonts/NanumGothicBold.ttf'),
    '/app/fonts/NanumGothicBold.ttf',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * jobMetaText 용 폰트 임베드.
 * 한글 폰트가 있으면 NanumGothic(subset), 없으면 Helvetica + ASCII 강제 필터.
 */
export async function embedMetaFont(
  doc: PDFDocument,
): Promise<{ font: PDFFont; boldFont: PDFFont; sanitize: (s: string) => string }> {
  const fontPath = resolveKoreanFontPath();
  if (fontPath) {
    doc.registerFontkit(fontkit);
    const bytes = fs.readFileSync(fontPath);
    const font = await doc.embedFont(bytes, { subset: true });
    const boldPath = resolveKoreanBoldFontPath();
    // NOTE: boldFont 는 subset: false 로 전체 임베드.
    // pdf-lib + fontkit 이 NanumGothicBold.ttf 서브셋팅 시 일부 GID(1,2,7,9,10 = 디지트 1,2,7,9,0)의
    // glyph 데이터를 손상시키는 버그가 있어 시트번호 중 일부가 빈 글리프로 렌더됨(3,4,5만 보임).
    // 전체 임베드 시 PDF당 약 4.6MB 증가하지만 안정적으로 모든 디지트 렌더 보장.
    const boldFont = boldPath
      ? await doc.embedFont(fs.readFileSync(boldPath))
      : font;
    return { font, boldFont, sanitize: (s) => s };
  }
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  // WinAnsi 외 문자(한글 포함) 제거 — 없으면 공란
  return {
    font,
    boldFont,
    sanitize: (s) => s.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim(),
  };
}

export interface PdfBuildOptions {
  /** 원본 PDF 파일 경로 (페이지 임베드용). null 이면 빈 박스만 그림. */
  sourcePdfPath?: string | null;
  /** 각 단위박스에 그릴 재단선/오시 마크 여부 */
  drawCropMarks?: boolean;
  drawCreaseMarks?: boolean;
  drawTackMargin?: boolean;
  /** 블리드 경계선(재단 안쪽) 표시 */
  drawBleedLines?: boolean;
  /** 시트 모서리 레지스트레이션 마크 표시 */
  drawRegistrationMarks?: boolean;
  /** CMYK 컬러바 표시 */
  drawColorBar?: boolean;
  /** Nup>=2 일 때 셀 사이 중간 재단/접지선 표시 */
  drawFoldLines?: boolean;
  /** JobID/스튜디오명 메타 텍스트 */
  jobMetaText?: string | null;
  /** 주문번호 — 메타 텍스트 안에서 빨간색으로 강조하기 위한 토큰 */
  jobMetaOrderNumber?: string | null;
  /** 임포지션 PDF 저장 경로 (선택) */
  outputPath?: string;
}

/**
 * 임포지션 PDF 렌더러.
 * 각 sheet → 한 PDF 페이지.
 * 원본 PDF 페이지가 있으면 embedPdf 로 임베드, 없으면 빈 박스로 시뮬레이션.
 */
@Injectable()
export class ImpositionPdfService {
  async build(result: ImpositionResult, options: PdfBuildOptions = {}): Promise<Uint8Array> {
    const out = await PDFDocument.create();

    // jobMetaText 가 있으면 한글 지원 폰트 임베드 (없을 때 Helvetica + ASCII 필터)
    const meta = options.jobMetaText ? await embedMetaFont(out) : null;

    // 원본 PDF 임베드(있으면)
    let embedded: import('pdf-lib').PDFEmbeddedPage[] | null = null;
    if (options.sourcePdfPath && fs.existsSync(options.sourcePdfPath)) {
      try {
        const bytes = fs.readFileSync(options.sourcePdfPath);
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pageCount = src.getPageCount();
        const indices = Array.from({ length: pageCount }, (_, i) => i);
        embedded = await out.embedPdf(src, indices);
      } catch {
        embedded = null;
      }
    }

    const toPt = (mm: number) => mm * MM_TO_PT;
    const sheetWpt = toPt(result.sheetWidth);
    const sheetHpt = toPt(result.sheetHeight);
    const bleedPt = toPt(result.echo.bleed ?? 0);

    // 인쇄영역(print area) — 시트에서 margin 을 뺀 유효 영역 (bottom-left 원점, pt)
    const m = result.echo.margin;
    const printAreaX = toPt(m.left);
    const printAreaY = toPt(m.bottom);
    const printAreaW = sheetWpt - toPt(m.left + m.right);
    const printAreaH = sheetHpt - toPt(m.top + m.bottom);

    // source PDF가 이미 2up(스프레드 합본) 인지 감지.
    // 페어 모드(compressed)에서 source 페이지 수 == ceil(album pageCount / 2) 면
    // 각 source 페이지가 1 album 스프레드(=2 album 페이지)를 포함한 것으로 간주.
    // 이 경우 페어 박스에 source 1페이지를 통째로 배치 (분할 X) — JDF 프리뷰와 일치.
    const expectedSpreadCount = Math.ceil(result.pageCount / 2);
    const isSourceSpread =
      embedded != null &&
      result.echo.bindingType === 'compressed' &&
      embedded.length === expectedSpreadCount &&
      result.pageCount > expectedSpreadCount;

    for (const sheet of result.sheets) {
      const page = out.addPage([sheetWpt, sheetHpt]);

      for (const p of sheet.placements) {
        // bottom-left 원점으로 변환
        const xPt = toPt(p.x);
        const yPt = sheetHpt - toPt(p.y) - toPt(p.height);
        const wPt = toPt(p.width);
        const hPt = toPt(p.height);

        // 단위박스 테두리 (얇은 회색)
        page.drawRectangle({
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 0.3,
        });

        // 페이지 임베드
        if (embedded) {
          if (p.isPair && p.pages.length === 2) {
            const creaseWPt = toPt(result.echo.creaseWidth ?? 0);
            if (isSourceSpread) {
              // source PDF가 이미 2up 스프레드 → 페어 박스에 trim 영역만 100% 사이즈로 임베드.
              // 페어 (1,2) → spread idx 0, (3,4) → 1, ...
              const spreadIdx = Math.floor((p.pages[0] - 1) / 2);
              drawEmbeddedTrim(page, embedded, spreadIdx, xPt, yPt, wPt, hPt, p.rotation);
            } else if (p.rotation === 90) {
              // 회전 90°: 페어 박스가 세로로 배치되므로 상/하로 분할 (낱장 입력).
              // CCW 90° 기준 — 원본 좌측(pages[0])이 시각 하단, 우측(pages[1])이 시각 상단.
              const leftIdx = (p.pages[0] - 1);
              const rightIdx = (p.pages[1] - 1);
              const halfH = (hPt - creaseWPt) / 2;
              drawEmbedded(page, embedded, leftIdx, xPt, yPt, wPt, halfH, p.rotation);
              drawEmbedded(page, embedded, rightIdx, xPt, yPt + halfH + creaseWPt, wPt, halfH, p.rotation);
            } else {
              const leftIdx = (p.pages[0] - 1);
              const rightIdx = (p.pages[1] - 1);
              const halfW = (wPt - creaseWPt) / 2;
              drawEmbedded(page, embedded, leftIdx, xPt, yPt, halfW, hPt, p.rotation);
              drawEmbedded(page, embedded, rightIdx, xPt + halfW + creaseWPt, yPt, halfW, hPt, p.rotation);
            }
          } else {
            const idx = (p.pages[0] - 1);
            drawEmbedded(page, embedded, idx, xPt, yPt, wPt, hPt, p.rotation);
          }
        } else {
          // 임베드 없음 → 빈 박스 + 페이지번호 텍스트
          const label = p.pages.join(' / ');
          page.drawText(label, {
            x: xPt + 4,
            y: yPt + hPt - 12,
            size: 8,
            color: rgb(0.3, 0.3, 0.3),
          });
        }

        // 재단선
        if (options.drawCropMarks !== false) {
          drawCropMarks(page, xPt, yPt, wPt, hPt);
        }

        // 블리드 경계선 (단위박스 안쪽 bleed 만큼 들여쓴 사각형)
        if (options.drawBleedLines !== false && bleedPt > 0) {
          drawBleedBox(page, xPt, yPt, wPt, hPt, bleedPt);
        }

        // 압축앨범 crease (페어 박스 바깥쪽 tick) — Nup>=2 스프레드 페어일 때만
        // 회전 0°: 가로 페어 → 세로 오시선(creaseXs), 박스 위/아래 tick
        // 회전 90°: 세로 페어 → 가로 오시선(creaseYs), 박스 좌/우 tick
        if (options.drawCreaseMarks !== false && p.isPair && p.creaseYs && p.creaseYs.length > 0) {
          for (const cyMm of p.creaseYs) {
            // creaseYs 는 top-left 기준 mm → bottom-left 기준 pt 로 변환
            const cyPt = sheetHpt - toPt(cyMm);
            drawCreaseTicksHorizontal(page, cyPt, xPt, xPt + wPt);
          }
        } else if (options.drawCreaseMarks !== false && p.isPair && p.creaseXs && p.creaseXs.length > 0) {
          for (const cxMm of p.creaseXs) {
            drawCreaseTicks(page, toPt(cxMm), yPt, yPt + hPt);
          }
        } else if (options.drawCreaseMarks !== false && p.creaseX !== undefined && !p.needsTaping) {
          // 하위 호환 (creaseXs 미설정 레거시 레이아웃)
          drawCreaseTicks(page, toPt(p.creaseX), yPt, yPt + hPt);
        }

        // 타카 여백 음영
        if (options.drawTackMargin !== false && p.tackEdge) {
          drawTackMarginOverlay(page, xPt, yPt, wPt, hPt, p.tackEdge, result.echo.tackMargin ?? 12);
        }
      }

      // 시트 단위 마크 — 인쇄영역(print area) 안쪽에 배치
      if (options.drawRegistrationMarks !== false) {
        drawRegistrationMarks(page, printAreaX, printAreaY, printAreaW, printAreaH);
      }
      if (options.drawColorBar !== false) {
        drawColorBar(page, printAreaX, printAreaY, printAreaW, printAreaH);
      }
      if (options.drawFoldLines !== false && result.nup >= 2) {
        drawFoldLines(page, sheet.placements, result.sheetWidth, result.sheetHeight);
      }
      if (options.jobMetaText && meta) {
        drawJobMeta(page, printAreaX, printAreaY, printAreaW, printAreaH, options.jobMetaText, sheet.sheetIndex, result.sheetCount, meta.font, meta.boldFont, meta.sanitize, options.jobMetaOrderNumber);
      }
    }

    const bytes = await out.save();
    if (options.outputPath) {
      fs.writeFileSync(options.outputPath, bytes);
    }
    return bytes;
  }
}

/**
 * 2up 스프레드 소스 PDF 의 trim 영역만 페어 박스에 100% 스케일로 임베드.
 *
 * 소스 페이지는 (cropMargin + bleed) 만큼의 외곽 padding 을 포함하므로,
 * 슬롯(페어 박스) 바깥으로 source 의 (0,0) 을 이동시켜 trim 코너를 슬롯 코너에 정렬한 뒤
 * 슬롯 영역으로 클립하여 padding 콘텐츠(재단마진/배경)를 화면에 노출시키지 않는다.
 *
 * 가정: padding 이 좌우/상하 대칭. (sourceW - trimW)/2, (sourceH - trimH)/2.
 *       trimW × trimH 는 회전 적용 후 슬롯과 동일.
 */
function drawEmbeddedTrim(
  page: PDFPage,
  embedded: import('pdf-lib').PDFEmbeddedPage[],
  idx: number,
  x: number,
  y: number,
  w: number,
  h: number,
  rotation: 0 | 90,
) {
  const pg = embedded[Math.max(0, Math.min(idx, embedded.length - 1))];
  if (!pg) return;
  const sourceW = pg.width;
  const sourceH = pg.height;

  // 회전 적용 후 trim 의 unrotated 치수: rotation=0 → (w, h), rotation=90 → (h, w)
  const trimW_unrot = rotation === 90 ? h : w;
  const trimH_unrot = rotation === 90 ? w : h;
  const padX = (sourceW - trimW_unrot) / 2;
  const padY = (sourceH - trimH_unrot) / 2;

  // padding 이 음수면(소스가 슬롯보다 작음) trim 임베드 의미 없음 → 일반 fit 으로 폴백
  if (padX < 0 || padY < 0) {
    drawEmbedded(page, embedded, idx, x, y, w, h, rotation);
    return;
  }

  // 슬롯으로 클립 (외곽 cropMargin/bleed 콘텐츠 차단)
  page.pushOperators(
    pushGraphicsState(),
    moveTo(x, y),
    lineTo(x + w, y),
    lineTo(x + w, y + h),
    lineTo(x, y + h),
    closePath(),
    clip(),
    endPath(),
  );

  if (rotation === 90) {
    // CCW 90° 회전 + 100% 스케일.
    // 슬롯 좌하단 (x,y) 에 trim 좌하단을 정렬하려면:
    //   anchor = (x + padY + trimH_unrot, y - padX)
    page.drawPage(pg, {
      x: x + padY + trimH_unrot,
      y: y - padX,
      xScale: 1,
      yScale: 1,
      rotate: degrees(90),
    });
  } else {
    // 100% 스케일, source 의 (padX, padY) 가 슬롯의 (x, y) 에 위치하도록 이동.
    page.drawPage(pg, {
      x: x - padX,
      y: y - padY,
      xScale: 1,
      yScale: 1,
    });
  }

  page.pushOperators(popGraphicsState());
}

function drawEmbedded(
  page: PDFPage,
  embedded: import('pdf-lib').PDFEmbeddedPage[],
  idx: number,
  x: number,
  y: number,
  w: number,
  h: number,
  rotation: 0 | 90,
) {
  const pg = embedded[Math.max(0, Math.min(idx, embedded.length - 1))];
  if (!pg) return;
  const natW = pg.width;
  const natH = pg.height;
  if (rotation === 90) {
    const scale = Math.min(h / natW, w / natH);
    const drawW = natW * scale;
    const drawH = natH * scale;
    // pdf-lib rotate: (x,y) pivot 반시계 90°. 회전 후 bbox=(x-drawH~x, y~y+drawW).
    // 슬롯 중앙 정렬: anchorX = x+(w+drawH)/2, anchorY = y+(h-drawW)/2
    page.drawPage(pg, {
      x: x + (w + drawH) / 2,
      y: y + (h - drawW) / 2,
      xScale: scale,
      yScale: scale,
      rotate: degrees(90),
    });
  } else {
    const scale = Math.min(w / natW, h / natH);
    page.drawPage(pg, {
      x,
      y,
      xScale: scale,
      yScale: scale,
    });
  }
}

export function drawCropMarks(page: PDFPage, x: number, y: number, w: number, h: number) {
  const len = 5 * MM_TO_PT;
  const off = 2 * MM_TO_PT;
  const col = rgb(0, 0, 0);
  const lw = 0.4;
  // 좌상
  page.drawLine({ start: { x: x - off, y: y + h }, end: { x: x - off - len, y: y + h }, color: col, thickness: lw });
  page.drawLine({ start: { x, y: y + h + off }, end: { x, y: y + h + off + len }, color: col, thickness: lw });
  // 우상
  page.drawLine({ start: { x: x + w + off, y: y + h }, end: { x: x + w + off + len, y: y + h }, color: col, thickness: lw });
  page.drawLine({ start: { x: x + w, y: y + h + off }, end: { x: x + w, y: y + h + off + len }, color: col, thickness: lw });
  // 좌하
  page.drawLine({ start: { x: x - off, y }, end: { x: x - off - len, y }, color: col, thickness: lw });
  page.drawLine({ start: { x, y: y - off }, end: { x, y: y - off - len }, color: col, thickness: lw });
  // 우하
  page.drawLine({ start: { x: x + w + off, y }, end: { x: x + w + off + len, y }, color: col, thickness: lw });
  page.drawLine({ start: { x: x + w, y: y - off }, end: { x: x + w, y: y - off - len }, color: col, thickness: lw });
}

/**
 * 오시선(crease) 눈금 — 이미지 영역을 가로지르지 않고
 * 페어박스의 상/하 바깥쪽에 짧은 세로 tick 만 그린다 (재단선 스타일).
 * 제본 작업자는 두 눈금을 이은 가상의 선 위로 크리저를 맞춤.
 *
 * @param cx   오시 x-좌표 (pt)
 * @param yBot 페어박스 하단 y-좌표 (pt, bottom-left 원점)
 * @param yTop 페어박스 상단 y-좌표 (pt, bottom-left 원점)
 */
export function drawCreaseTicks(page: PDFPage, cx: number, yBot: number, yTop: number) {
  const len = 5 * MM_TO_PT; // 재단선과 동일한 길이
  const off = 2 * MM_TO_PT; // 박스 경계에서의 간격
  // 상단: 박스 위로 len 만큼 뻗는 점선
  drawDashedLine(page, cx, yTop + off, cx, yTop + off + len);
  // 하단: 박스 아래로 len 만큼 뻗는 점선
  drawDashedLine(page, cx, yBot - off, cx, yBot - off - len);
}

/**
 * 가로 오시선 tick — 회전 90° 페어 박스 좌/우 바깥쪽에 짧은 가로 점선 tick.
 *
 * @param cy   오시 y-좌표 (pt, bottom-left 원점)
 * @param xLeft  페어박스 좌측 x-좌표 (pt)
 * @param xRight 페어박스 우측 x-좌표 (pt)
 */
export function drawCreaseTicksHorizontal(page: PDFPage, cy: number, xLeft: number, xRight: number) {
  const len = 5 * MM_TO_PT;
  const off = 2 * MM_TO_PT;
  drawDashedLine(page, xLeft - off, cy, xLeft - off - len, cy);
  drawDashedLine(page, xRight + off, cy, xRight + off + len, cy);
}

export function drawDashedLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number) {
  // pdf-lib 는 dashPattern 지원 제한 → 짧은 세그먼트 반복
  // 색/굵기: 연회색 + 얇게 (crop mark 검정 tick과 시각적 충돌 최소화)
  const dashLen = 3;
  const gapLen = 2;
  const col = rgb(0.55, 0.55, 0.55);
  const lw = 0.3;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const total = Math.hypot(dx, dy);
  if (total <= 0) return;
  const ux = dx / total;
  const uy = dy / total;
  let pos = 0;
  while (pos < total) {
    const segEnd = Math.min(pos + dashLen, total);
    page.drawLine({
      start: { x: x1 + ux * pos, y: y1 + uy * pos },
      end: { x: x1 + ux * segEnd, y: y1 + uy * segEnd },
      color: col,
      thickness: lw,
    });
    pos = segEnd + gapLen;
  }
}

/**
 * 수평/수직 점선을 여러 구간으로 끊어서 그린다.
 * crop mark tick 이 관통하는 구간을 시각적으로 비워 점선과 tick 이 겹치지 않게 한다.
 *
 * @param orientation 'horizontal' 이면 y1===y2 인 수평선, 'vertical' 이면 x1===x2 인 수직선
 * @param gapCenters  점선 경로에서 건너뛸 좌표들 (horizontal 이면 x, vertical 이면 y)
 * @param gapHalf     각 tick 중심에서 좌우(또는 상하)로 비울 반경 (pt)
 */
export function drawDashedLineSegmented(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  orientation: 'horizontal' | 'vertical',
  gapCenters: number[],
  gapHalf: number,
) {
  const [start, end] =
    orientation === 'horizontal'
      ? [Math.min(x1, x2), Math.max(x1, x2)]
      : [Math.min(y1, y2), Math.max(y1, y2)];
  const gaps = gapCenters.filter((g) => g > start && g < end).sort((a, b) => a - b);
  let cursor = start;
  const segments: Array<[number, number]> = [];
  for (const g of gaps) {
    const gs = g - gapHalf;
    const ge = g + gapHalf;
    if (gs > cursor) segments.push([cursor, gs]);
    cursor = Math.max(cursor, ge);
  }
  if (cursor < end) segments.push([cursor, end]);
  for (const [a, b] of segments) {
    if (orientation === 'horizontal') drawDashedLine(page, a, y1, b, y1);
    else drawDashedLine(page, x1, a, x1, b);
  }
}

export function drawTackMarginOverlay(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  edge: 'left' | 'right' | 'top' | 'bottom',
  marginMm: number,
) {
  const m = marginMm * MM_TO_PT;
  const col = rgb(1, 0.93, 0.7);
  let rect: { x: number; y: number; width: number; height: number };
  if (edge === 'left') rect = { x, y, width: m, height: h };
  else if (edge === 'right') rect = { x: x + w - m, y, width: m, height: h };
  else if (edge === 'top') rect = { x, y: y + h - m, width: w, height: m };
  else rect = { x, y, width: w, height: m };
  page.drawRectangle({ ...rect, color: col, opacity: 0.35 });
}

/**
 * 블리드 경계선 — 단위박스 안쪽으로 bleed(pt) 만큼 들여쓴 사각형.
 * 재단선(crop mark)은 외부 모서리, 블리드 라인은 내부 trim box 경계.
 */
export function drawBleedBox(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  bleedPt: number,
) {
  if (bleedPt <= 0) return;
  page.drawRectangle({
    x: x + bleedPt,
    y: y + bleedPt,
    width: w - bleedPt * 2,
    height: h - bleedPt * 2,
    borderColor: rgb(0, 0.5, 0.3),
    borderWidth: 0.3,
    opacity: 0,
    borderOpacity: 0.9,
  });
}

/**
 * 레지스트레이션 마크 — 인쇄영역(print area) 4 모서리 안쪽에 십자 원형 타깃.
 * 인쇄기 판 맞춤(register)용. 시트 가장자리(여백)는 인쇄 불가 영역이라 안쪽으로 배치.
 */
export function drawRegistrationMarks(
  page: PDFPage,
  paX: number,
  paY: number,
  paW: number,
  paH: number,
) {
  const r = 3; // 반지름(pt)
  const inset = 3; // 인쇄영역 모서리에서의 들여쓰기(pt)
  const positions = [
    { x: paX + inset + r, y: paY + inset + r },                   // 좌하
    { x: paX + paW - inset - r, y: paY + inset + r },             // 우하
    { x: paX + inset + r, y: paY + paH - inset - r },             // 좌상
    { x: paX + paW - inset - r, y: paY + paH - inset - r },       // 우상
  ];
  const col = rgb(0, 0, 0);
  for (const pos of positions) {
    // 원형 근사 (정사각형 + 십자)
    page.drawCircle({ x: pos.x, y: pos.y, size: r, borderColor: col, borderWidth: 0.4 });
    // 십자
    page.drawLine({ start: { x: pos.x - r - 2, y: pos.y }, end: { x: pos.x + r + 2, y: pos.y }, color: col, thickness: 0.4 });
    page.drawLine({ start: { x: pos.x, y: pos.y - r - 2 }, end: { x: pos.x, y: pos.y + r + 2 }, color: col, thickness: 0.4 });
  }
}

/**
 * 컬러바 — 인쇄영역 하단 중앙에 CMYK + RGB + 그레이 스텝.
 * 각 패치 약 8x6pt, 좌→우 순서.
 */
export function drawColorBar(
  page: PDFPage,
  paX: number,
  paY: number,
  paW: number,
  _paH: number,
) {
  const patchW = 8;
  const patchH = 6;
  const swatches: Array<[number, number, number]> = [
    [0, 1, 1],    // C
    [1, 0, 1],    // M
    [1, 1, 0],    // Y
    [0, 0, 0],    // K
    [1, 0, 0],    // R
    [0, 1, 0],    // G
    [0, 0, 1],    // B
    [0.25, 0.25, 0.25],
    [0.5, 0.5, 0.5],
    [0.75, 0.75, 0.75],
  ];
  const totalW = patchW * swatches.length;
  const startX = paX + (paW - totalW) / 2;
  const y = paY + 2; // 인쇄영역 하단 안쪽 2pt
  for (let i = 0; i < swatches.length; i++) {
    const [r, g, b] = swatches[i];
    page.drawRectangle({
      x: startX + i * patchW,
      y,
      width: patchW,
      height: patchH,
      color: rgb(r, g, b),
    });
  }
}

/**
 * JobID/스튜디오명 — 시트 상단 좌측에 작은 텍스트.
 * 시트 번호(1/N) 자동 부착.
 */
/**
 * 셀 사이 중간 재단/접지선 — Nup >= 2 일 때만 의미.
 * 시트의 placements 를 스캔해서
 *   - 인접한 컬럼 사이 세로선 (col N 우측 ↔ col N+1 좌측 중간)
 *   - 인접한 행 사이 가로선 (row N 하단 ↔ row N+1 상단 중간)
 * 을 시트 전체(마진 포함 영역)를 가로지르도록 그린다.
 * 재단 작업자의 가이드 — 스티커를 붙인 상태에서 한 번에 자를 수 있게.
 */
export function drawFoldLines(
  page: PDFPage,
  placements: Array<{ x: number; y: number; width: number; height: number }>,
  sheetWMm: number,
  sheetHMm: number,
) {
  if (placements.length < 2) return;

  // 컬럼 경계: 각 placement 의 우측 x 값과 다음 placement 의 좌측 x 값이 다르면
  // 그 사이 gutter 의 중점이 재단선. 동일 우측 x 가 여러 개 → set 으로 중복 제거.
  const colEdges = new Map<number, number>(); // rightX → leftX_of_next
  const rightXs = Array.from(new Set(placements.map((p) => p.x + p.width))).sort((a, b) => a - b);
  const leftXs = Array.from(new Set(placements.map((p) => p.x))).sort((a, b) => a - b);
  for (const rx of rightXs) {
    // 이 rx 보다 큰 leftX 중 최소값이 "다음 컬럼 좌측"
    const nextLx = leftXs.find((lx) => lx > rx + 0.1);
    if (nextLx !== undefined) colEdges.set(rx, nextLx);
  }

  // 행 경계 (y 축 — placements 는 top-left 원점 mm)
  const rowEdges = new Map<number, number>();
  const bottomYs = Array.from(new Set(placements.map((p) => p.y + p.height))).sort((a, b) => a - b);
  const topYs = Array.from(new Set(placements.map((p) => p.y))).sort((a, b) => a - b);
  for (const by of bottomYs) {
    const nextTy = topYs.find((ty) => ty > by + 0.1);
    if (nextTy !== undefined) rowEdges.set(by, nextTy);
  }

  const sheetWpt = sheetWMm * MM_TO_PT;
  const sheetHpt = sheetHMm * MM_TO_PT;

  // crop mark tick 이 그려지는 좌표 (셀 좌/우 edge → x, 셀 상/하 edge → y)
  // — 가로 점선은 이 x 좌표들을 비워서, 세로 점선은 이 y 좌표들을 비워서 그린다.
  const tickXsPt = Array.from(
    new Set(placements.flatMap((p) => [p.x, p.x + p.width])),
  )
    .sort((a, b) => a - b)
    .map((mm) => mm * MM_TO_PT);
  // placements 는 top-left 원점 mm → PDF 좌표(bottom-left 원점 pt) 로 변환
  const tickYsPt = Array.from(
    new Set(placements.flatMap((p) => [p.y, p.y + p.height])),
  )
    .sort((a, b) => a - b)
    .map((mm) => sheetHpt - mm * MM_TO_PT);

  const gapHalf = 2 * MM_TO_PT; // 각 tick 주변 ±2mm 를 비움

  // 세로 중간선 (컬럼 사이) — 행 tick y 좌표에서 끊김
  for (const [rx, lx] of colEdges) {
    const midMm = (rx + lx) / 2;
    const xPt = midMm * MM_TO_PT;
    drawDashedLineSegmented(page, xPt, 0, xPt, sheetHpt, 'vertical', tickYsPt, gapHalf);
  }

  // 가로 중간선 (행 사이) — 컬럼 tick x 좌표에서 끊김
  for (const [by, ty] of rowEdges) {
    const midMmFromTop = (by + ty) / 2;
    const yPt = sheetHpt - midMmFromTop * MM_TO_PT;
    drawDashedLineSegmented(page, 0, yPt, sheetWpt, yPt, 'horizontal', tickXsPt, gapHalf);
  }
}

export function drawJobMeta(
  page: PDFPage,
  paX: number,
  paY: number,
  _paW: number,
  paH: number,
  text: string,
  sheetNum: number,
  sheetTotal: number,
  font: PDFFont,
  boldFont: PDFFont,
  sanitize: (s: string) => string,
  highlightOrderNumber?: string | null,
) {
  const safeText = sanitize(text);
  const sheetWord = sanitize('시트 ') || 'Sheet ';
  const currentStr = sheetNum.toString();
  const suffix = `/${sheetTotal}`;

  const fontSize = 7;
  // 현재 시트번호는 강조를 위해 본문보다 2pt 크게 표시
  const currentFontSize = fontSize + 2;
  // 좌상단 레지스트레이션 마크(반지름 3pt + 들여쓰기 3pt + 십자 +2pt = 약 14pt)와 겹치지 않도록
  // x 오프셋을 18pt 이상 두고 시작
  const x = paX + 18;
  const y = paY + paH - 10;
  const darkColor = rgb(0.1, 0.1, 0.1);
  const blueColor = rgb(0, 0.45, 0.85);
  const redColor = rgb(0.85, 0.1, 0.1);
  const sepText = ' | ';
  const sepWidth = font.widthOfTextAtSize(sepText, fontSize);
  const safeOrderNum = highlightOrderNumber ? sanitize(highlightOrderNumber) : '';

  // 본문 segments: safeText 를 ' | ' 로 분리 → 주문번호는 빨강, 나머지는 검정
  // segments 사이의 ' | ' 구분기호는 파랑.
  let cursor = x;
  const segments = safeText ? safeText.split(' | ') : [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isOrderNum = !!safeOrderNum && seg === safeOrderNum;
    page.drawText(seg, {
      x: cursor,
      y,
      size: fontSize,
      color: isOrderNum ? redColor : darkColor,
      font,
    });
    cursor += font.widthOfTextAtSize(seg, fontSize);
    // 다음 세그먼트 또는 sheetWord 앞에 파란 구분기호
    page.drawText(sepText, {
      x: cursor,
      y,
      size: fontSize,
      color: blueColor,
      font,
    });
    cursor += sepWidth;
  }

  // "시트 " (한글 또는 ASCII fallback) — 본문과 동일 색상
  page.drawText(sheetWord, { x: cursor, y, size: fontSize, color: darkColor, font });
  cursor += font.widthOfTextAtSize(sheetWord, fontSize);

  // 현재 시트번호 — 파란 굵은 글씨 + 2pt 큼
  page.drawText(currentStr, {
    x: cursor,
    y,
    size: currentFontSize,
    color: blueColor,
    font: boldFont,
  });
  cursor += boldFont.widthOfTextAtSize(currentStr, currentFontSize);

  // "/총개수"
  page.drawText(suffix, { x: cursor, y, size: fontSize, color: darkColor, font });
}
