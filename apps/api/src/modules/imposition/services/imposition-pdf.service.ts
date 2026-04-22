import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, PDFPage, degrees, PDFFont, StandardFonts } from 'pdf-lib';
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

/**
 * jobMetaText 용 폰트 임베드.
 * 한글 폰트가 있으면 NanumGothic(subset), 없으면 Helvetica + ASCII 강제 필터.
 */
export async function embedMetaFont(
  doc: PDFDocument,
): Promise<{ font: PDFFont; sanitize: (s: string) => string }> {
  const fontPath = resolveKoreanFontPath();
  if (fontPath) {
    doc.registerFontkit(fontkit);
    const bytes = fs.readFileSync(fontPath);
    const font = await doc.embedFont(bytes, { subset: true });
    return { font, sanitize: (s) => s };
  }
  const font = await doc.embedFont(StandardFonts.Helvetica);
  // WinAnsi 외 문자(한글 포함) 제거 — 없으면 공란
  return {
    font,
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
            // 좌/우 각각 개별 임베드 (원판 페이지는 1 페이지 당 1 콘텐츠 가정)
            const leftIdx = (p.pages[0] - 1);
            const rightIdx = (p.pages[1] - 1);
            const halfW = (wPt - toPt(result.echo.creaseWidth ?? 0)) / 2;
            drawEmbedded(page, embedded, leftIdx, xPt, yPt, halfW, hPt, p.rotation);
            drawEmbedded(
              page,
              embedded,
              rightIdx,
              xPt + halfW + toPt(result.echo.creaseWidth ?? 0),
              yPt,
              halfW,
              hPt,
              p.rotation,
            );
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

        // 압축앨범 crease (상/하 바깥쪽 tick) — Nup>=2 스프레드 페어일 때만
        // Nup=1 (compressed single) / perfect / tack / flat 은 오시 없음
        // 이미지 영역을 가로지르지 않도록 재단선처럼 박스 바깥 위/아래 tick 만 그림
        if (options.drawCreaseMarks !== false && p.isPair && p.creaseXs && p.creaseXs.length > 0) {
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
        drawJobMeta(page, printAreaX, printAreaY, printAreaW, printAreaH, options.jobMetaText, sheet.sheetIndex + 1, result.sheetCount, meta.font, meta.sanitize);
      }
    }

    const bytes = await out.save();
    if (options.outputPath) {
      fs.writeFileSync(options.outputPath, bytes);
    }
    return bytes;
  }
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

export function drawDashedLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number) {
  // pdf-lib 는 dashPattern 지원 제한 → 짧은 세그먼트 반복
  const dashLen = 3;
  const gapLen = 2;
  const col = rgb(0, 0.4, 0.8);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const total = Math.hypot(dx, dy);
  const ux = dx / total;
  const uy = dy / total;
  let pos = 0;
  while (pos < total) {
    const segEnd = Math.min(pos + dashLen, total);
    page.drawLine({
      start: { x: x1 + ux * pos, y: y1 + uy * pos },
      end: { x: x1 + ux * segEnd, y: y1 + uy * segEnd },
      color: col,
      thickness: 0.5,
    });
    pos = segEnd + gapLen;
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

  // 세로 중간선 (컬럼 사이) — 시트 상하 전체 관통
  for (const [rx, lx] of colEdges) {
    const midMm = (rx + lx) / 2;
    const xPt = midMm * MM_TO_PT;
    drawDashedLine(page, xPt, 0, xPt, sheetHpt);
  }

  // 가로 중간선 (행 사이) — 시트 좌우 전체 관통. y 는 bottom-left 원점 변환 필요.
  for (const [by, ty] of rowEdges) {
    const midMmFromTop = (by + ty) / 2;
    const yPt = sheetHpt - midMmFromTop * MM_TO_PT;
    drawDashedLine(page, 0, yPt, sheetWpt, yPt);
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
  sanitize: (s: string) => string,
) {
  // 폰트가 한글 미지원(Helvetica)이면 sanitize 가 비ASCII 제거
  // — 공란이면 시트번호만이라도 표시
  const safeText = sanitize(text);
  const sheetLabel = sanitize(`시트 ${sheetNum}/${sheetTotal}`) || `Sheet ${sheetNum}/${sheetTotal}`;
  const label = safeText ? `${safeText} | ${sheetLabel}` : sheetLabel;
  // 좌상단 레지스트레이션 마크(반지름 3pt + 들여쓰기 3pt + 십자 +2pt = 약 14pt)와 겹치지 않도록
  // x 오프셋을 18pt 이상 두고 시작
  page.drawText(label, {
    x: paX + 18,
    y: paY + paH - 10,
    size: 7,
    color: rgb(0.1, 0.1, 0.1),
    font,
  });
}
