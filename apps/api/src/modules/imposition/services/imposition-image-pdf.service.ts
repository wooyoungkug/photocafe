import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFPage, rgb, degrees } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { ImpositionResult, MM_TO_PT } from './imposition-calc.service';
import {
  drawCropMarks,
  drawDashedLine,
  drawTackMarginOverlay,
  drawBleedBox,
  drawRegistrationMarks,
  drawColorBar,
  drawFoldLines,
  drawJobMeta,
  embedMetaFont,
} from './imposition-pdf.service';

export interface ImageEntry {
  /** 1-based 페이지 번호 — Placement.pages[] 와 매핑 */
  pageNumber: number;
  /** 절대 경로 (.jpg / .jpeg / .png) */
  filePath: string;
}

export interface ImagePdfOptions {
  images: ImageEntry[];
  drawCropMarks?: boolean;    // default: true
  drawCreaseMarks?: boolean;  // default: true
  drawTackMargin?: boolean;   // default: true
  drawBleedLines?: boolean;   // default: true
  drawRegistrationMarks?: boolean;  // default: true
  drawColorBar?: boolean;     // default: true
  drawFoldLines?: boolean;    // default: true (Nup>=2 일 때만 실제 그려짐)
  jobMetaText?: string | null;  // 있으면 상단에 표시
  outputPath?: string;
}

type PDFImage = Awaited<ReturnType<PDFDocument['embedJpg']>>;

@Injectable()
export class ImpositionImagePdfService {
  async build(result: ImpositionResult, options: ImagePdfOptions): Promise<Uint8Array> {
    const out = await PDFDocument.create();
    const toPt = (mm: number) => mm * MM_TO_PT;

    // jobMetaText 가 있으면 한글 지원 폰트 임베드
    const meta = options.jobMetaText ? await embedMetaFont(out) : null;

    // 이미지 사전 임베드 캐시 (pageNumber → PDFImage)
    const imageCache = new Map<number, PDFImage>();
    for (const entry of options.images) {
      if (!fs.existsSync(entry.filePath)) continue;
      try {
        const bytes = fs.readFileSync(entry.filePath);
        const ext = path.extname(entry.filePath).toLowerCase();
        const img = ext === '.png'
          ? await out.embedPng(bytes)
          : await out.embedJpg(bytes);
        imageCache.set(entry.pageNumber, img);
      } catch {
        // 임베드 실패 시 해당 페이지는 회색 폴백으로 처리
      }
    }

    const sheetWpt = toPt(result.sheetWidth);
    const sheetHpt = toPt(result.sheetHeight);
    const bleedPt = toPt(result.echo.bleed ?? 0);

    for (const sheet of result.sheets) {
      const page = out.addPage([sheetWpt, sheetHpt]);

      for (const p of sheet.placements) {
        // pdf-lib 좌표계: bottom-left 원점
        const xPt = toPt(p.x);
        const yPt = sheetHpt - toPt(p.y) - toPt(p.height);
        const wPt = toPt(p.width);
        const hPt = toPt(p.height);

        if (p.isPair && p.pages.length === 2) {
          // 압축앨범 스프레드: 좌/우 절반 각각 배치
          const creaseWPt = toPt(result.echo.creaseWidth ?? 0);
          const halfW = (wPt - creaseWPt) / 2;
          drawImageFit(page, imageCache, p.pages[0], xPt, yPt, halfW, hPt, p.rotation);
          drawImageFit(page, imageCache, p.pages[1], xPt + halfW + creaseWPt, yPt, halfW, hPt, p.rotation);
        } else {
          drawImageFit(page, imageCache, p.pages[0], xPt, yPt, wPt, hPt, p.rotation);
        }

        // 재단선
        if (options.drawCropMarks !== false) {
          drawCropMarks(page, xPt, yPt, wPt, hPt);
        }

        // 블리드 경계선
        if (options.drawBleedLines !== false && bleedPt > 0) {
          drawBleedBox(page, xPt, yPt, wPt, hPt, bleedPt);
        }

        // 압축앨범 오시선 (crease)
        if (options.drawCreaseMarks !== false) {
          if (p.isPair && p.creaseXs && p.creaseXs.length > 0) {
            for (const cxMm of p.creaseXs) {
              drawDashedLine(page, toPt(cxMm), yPt, toPt(cxMm), yPt + hPt);
            }
          } else if (p.creaseX !== undefined && !p.needsTaping) {
            drawDashedLine(page, toPt(p.creaseX), yPt, toPt(p.creaseX), yPt + hPt);
          }
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
      if (options.drawFoldLines !== false && result.nup >= 2) {
        drawFoldLines(page, sheet.placements, result.sheetWidth, result.sheetHeight);
      }
      if (options.jobMetaText && meta) {
        drawJobMeta(page, sheetWpt, sheetHpt, options.jobMetaText, sheet.sheetIndex + 1, result.sheetCount, meta.font, meta.sanitize);
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
 * 이미지를 슬롯 내 aspect-fit 중앙 배치.
 * rotation=90 이면 반시계 90° 회전.
 * 이미지 없으면 회색 사각형 + 페이지 번호 폴백.
 */
function drawImageFit(
  page: PDFPage,
  cache: Map<number, PDFImage>,
  pageNum: number,
  x: number,
  y: number,
  w: number,
  h: number,
  rotation: 0 | 90,
): void {
  const img = cache.get(pageNum);
  if (!img) {
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.93, 0.93, 0.93) });
    page.drawText(`P${pageNum}`, {
      x: x + 4,
      y: y + h - 12,
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
    });
    return;
  }

  const natW = img.width;
  const natH = img.height;

  if (rotation === 90) {
    // 90° 회전: 슬롯의 w/h를 뒤집어 스케일 계산
    const scale = Math.min(h / natW, w / natH);
    const drawW = natW * scale;
    const drawH = natH * scale;
    // pdf-lib rotate는 (x,y)를 pivot으로 반시계 90° 회전.
    // 회전 후 시각적 bbox: 가로=drawH, 세로=drawW, 좌하단=(x-drawH, y).
    // 슬롯 중앙 (x+w/2, y+h/2)에 맞추려면:
    //   anchorX = x + (w + drawH) / 2  (오른쪽으로 drawH 이동)
    //   anchorY = y + (h - drawW) / 2  (y는 동일)
    page.drawImage(img, {
      x: x + (w + drawH) / 2,
      y: y + (h - drawW) / 2,
      width: drawW,
      height: drawH,
      rotate: degrees(90),
    });
  } else {
    const scale = Math.min(w / natW, h / natH);
    const drawW = natW * scale;
    const drawH = natH * scale;
    page.drawImage(img, {
      x: x + (w - drawW) / 2,
      y: y + (h - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }
}
