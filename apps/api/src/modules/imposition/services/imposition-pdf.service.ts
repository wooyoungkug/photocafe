import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, PDFPage, degrees } from 'pdf-lib';
import * as fs from 'fs';
import { ImpositionResult, MM_TO_PT } from './imposition-calc.service';

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

        // 압축앨범 crease (중앙 점선) — Nup>=2 스프레드 페어일 때만
        // Nup=1 (compressed single) / perfect / tack / flat 은 오시 없음
        if (options.drawCreaseMarks !== false && p.isPair && p.creaseXs && p.creaseXs.length > 0) {
          for (const cxMm of p.creaseXs) {
            const cx = toPt(cxMm);
            drawDashedLine(page, cx, yPt, cx, yPt + hPt);
          }
        } else if (options.drawCreaseMarks !== false && p.creaseX !== undefined && !p.needsTaping) {
          // 하위 호환 (creaseXs 미설정 레거시 레이아웃)
          const cx = toPt(p.creaseX);
          drawDashedLine(page, cx, yPt, cx, yPt + hPt);
        }

        // 타카 여백 음영
        if (options.drawTackMargin !== false && p.tackEdge) {
          drawTackMarginOverlay(page, xPt, yPt, wPt, hPt, p.tackEdge, result.echo.tackMargin ?? 12);
        }
      }

      // 시트 단위 마크
      if (options.drawRegistrationMarks !== false) {
        drawRegistrationMarks(page, sheetWpt, sheetHpt);
      }
      if (options.drawColorBar !== false) {
        drawColorBar(page, sheetWpt, sheetHpt);
      }
      if (options.jobMetaText) {
        drawJobMeta(page, sheetWpt, sheetHpt, options.jobMetaText, sheet.sheetIndex + 1, result.sheetCount);
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
 * 레지스트레이션 마크 — 시트 4 모서리 외곽 여백에 십자 원형 타깃.
 * 인쇄기 판 맞춤(register)용.
 */
export function drawRegistrationMarks(page: PDFPage, sheetW: number, sheetH: number) {
  const r = 3; // 반지름(pt)
  const off = 5; // 시트 가장자리에서의 오프셋(pt)
  const positions = [
    { x: off + r, y: off + r },                       // 좌하
    { x: sheetW - off - r, y: off + r },              // 우하
    { x: off + r, y: sheetH - off - r },              // 좌상
    { x: sheetW - off - r, y: sheetH - off - r },    // 우상
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
 * 컬러바 — 시트 하단 중앙에 CMYK + RGB + 그레이 스텝.
 * 각 패치 약 8x6pt, 좌→우 순서.
 */
export function drawColorBar(page: PDFPage, sheetW: number, sheetH: number) {
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
  const startX = (sheetW - totalW) / 2;
  const y = 2; // 시트 하단 2pt 여백
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
export function drawJobMeta(
  page: PDFPage,
  sheetW: number,
  sheetH: number,
  text: string,
  sheetNum: number,
  sheetTotal: number,
) {
  const label = `${text} | 시트 ${sheetNum}/${sheetTotal}`;
  page.drawText(label, {
    x: 12,
    y: sheetH - 10,
    size: 7,
    color: rgb(0.1, 0.1, 0.1),
  });
}
