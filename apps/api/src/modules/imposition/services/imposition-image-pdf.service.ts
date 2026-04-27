import { Injectable } from '@nestjs/common';
import {
  PDFDocument,
  PDFPage,
  rgb,
  degrees,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  closePath,
  clip,
  endPath,
} from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { ImpositionResult, MM_TO_PT } from './imposition-calc.service';
import {
  drawCropMarks,
  drawCreaseTicks,
  drawCreaseTicksHorizontal,
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
  /**
   * 펼침면(spread) 이미지 처리 여부.
   * true이면 각 이미지를 좌/우 절반으로 나눠 2배 페이지 수를 생성한다.
   * (인디고 등 스프레드 전체 규격 출력 불가 장비에서 반잘라 테이핑하는 방식 대응)
   * - 앞 N페이지: 각 이미지 좌측 절반
   * - 뒤 N페이지: 각 이미지 우측 절반
   */
  spreadImages?: boolean;
  /**
   * 제본방향 — 1up + spreadImages 모드에서 첫/마지막 spread의 빈 절반을 출력에서 제외할 때 사용.
   * - 'RIGHT_START_LEFT_END': 첫 페이지가 오른쪽에서 시작 → 첫 시트의 left 절반 = blank (skip),
   *   마지막 페이지가 왼쪽에서 끝 → 마지막 시트의 right 절반 = blank (skip)
   * - 'LEFT_START_RIGHT_END': 첫 시트의 right 절반 = blank (skip),
   *   마지막 시트의 left 절반 = blank (skip)
   * 미지정 시 모든 절반 출력.
   */
  bindingDirection?: 'RIGHT_START_LEFT_END' | 'LEFT_START_RIGHT_END' | string | null;
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

        // ICC 프로파일 주입하지 않음 — 인디고 RIP 측 표준 프로파일이 적용되어야 하므로
        // PDF는 DeviceRGB(태그 없음)로 두고 RIP 가 변환하도록 위임한다.

        imageCache.set(entry.pageNumber, img);
      } catch {
        // 임베드 실패 시 해당 페이지는 회색 폴백으로 처리
      }
    }

    const sheetWpt = toPt(result.sheetWidth);
    const sheetHpt = toPt(result.sheetHeight);
    const bleedPt = toPt(result.echo.bleed ?? 0);

    // 인쇄영역(print area) — 시트에서 margin 을 뺀 유효 영역 (bottom-left 원점, pt)
    const m = result.echo.margin;
    const printAreaX = toPt(m.left);
    const printAreaY = toPt(m.bottom);
    const printAreaW = sheetWpt - toPt(m.left + m.right);
    const printAreaH = sheetHpt - toPt(m.top + m.bottom);

    // 스프레드 입력(spreadImages) + 페어 레이아웃(isPair) 조합 감지.
    // 이 경우 원본 파일 1장(2페이지 스프레드)이 페어박스 하나에 통째로 들어가야 하므로
    // 좌/우 분할 패스를 돌지 않고 1 패스만 실행한다.
    const isPairLayout =
      result.sheets.length > 0 && result.sheets[0].placements.some((p) => p.isPair);
    const useSpreadInPair = options.spreadImages === true && isPairLayout;

    // 스프레드 입력 + 단면(1up) 모드 감지 — pair 박스가 시트에 안 들어가서 폴백된 경우.
    // calc 의 pageCount = album 페이지 수 = 파일수 × 2 (스프레드 입력이므로).
    // 시트 N → 파일 ceil(N/2) 의 좌/우 반쪽, half 는 bindingDirection 으로 결정.
    const fileCount = options.images.length;
    const useSpreadInSingle =
      options.spreadImages === true &&
      !useSpreadInPair &&
      result.nup === 1 &&
      fileCount > 0 &&
      result.pageCount === fileCount * 2;

    // 스프레드 이미지(1up, 페어 없음): 좌/우 절반을 각각 별도 패스로 렌더링.
    // 단면 폴백 모드(useSpreadInSingle): 시트마다 album 페이지 1장 = 1 PDF 페이지 (1 패스).
    // 일반 이미지 또는 스프레드+페어: 1 패스만 실행.
    const passes: Array<'left' | 'right' | 'none'> =
      options.spreadImages && !useSpreadInPair && !useSpreadInSingle
        ? ['left', 'right']
        : ['none'];

    // 1up + spreadImages + bindingDirection 지정 시 첫/마지막 시트의 빈 절반 식별
    // - RIGHT_START_LEFT_END: 첫 시트 left = blank, 마지막 시트 right = blank
    // - LEFT_START_RIGHT_END: 첫 시트 right = blank, 마지막 시트 left = blank
    const skipBlankHalves = options.spreadImages && result.nup === 1 && !!options.bindingDirection;
    let firstImageSheetIdx = -1;
    let lastImageSheetIdx = -1;
    if (skipBlankHalves) {
      for (let i = 0; i < result.sheets.length; i++) {
        const has = result.sheets[i].placements.some((p) =>
          p.pages.some((pn) => imageCache.has(pn)),
        );
        if (has) {
          if (firstImageSheetIdx === -1) firstImageSheetIdx = i;
          lastImageSheetIdx = i;
        }
      }
    }
    const isRightStart = options.bindingDirection === 'RIGHT_START_LEFT_END';
    const blankFirstHalf: 'left' | 'right' | null = isRightStart ? 'left' : 'right';
    const blankLastHalf: 'left' | 'right' | null = isRightStart ? 'right' : 'left';
    // useSpreadInSingle 매핑 shift 값.
    // RIGHT_START 면 첫 파일의 좌측이 splitSpreads 에서 dropped → album 1 이 file 1 의 R 이 됨.
    // 이 경우 album 페이지 N 을 (N+1) 로 shift 시키면 표준 LEFT_START 매핑(L,R,L,R...) 과 정합.
    // 또한 'RIGHT_START' 부분 문자열 검사로 'RIGHT_START_LEFT_END' 외 변형도 안전하게 잡는다.
    const bdUpper = String(options.bindingDirection || '').toUpperCase();
    const dropFirstLeftShift = bdUpper.includes('RIGHT_START') ? 1 : 0;

    for (const pass of passes) {
      for (let sheetIdx = 0; sheetIdx < result.sheets.length; sheetIdx++) {
        const sheet = result.sheets[sheetIdx];
        // 스프레드 모드에서는 실제 이미지가 있는 슬롯만 포함.
        // 이미지 없는 슬롯(회색 폴백)은 건너뛰어 총 페이지 = 파일수 × 2 가 되도록 한다.
        if (options.spreadImages) {
          const hasAnyImage = sheet.placements.some((p) => {
            // 스프레드+페어: 파일 1장 = 페어 1개. 페어 첫 페이지 번호로부터 파일 인덱스 산출.
            // (pair [1,2] → file#1, pair [3,4] → file#2, ...)
            if (useSpreadInPair && p.isPair && p.pages.length === 2) {
              const fileKey = Math.floor((p.pages[0] - 1) / 2) + 1;
              return imageCache.has(fileKey);
            }
            // 스프레드+단면: album 페이지 N → 파일 ceil((N+shift)/2)
            // (shift 는 RIGHT_START 의 첫 파일 L drop 보정 — 위 dropFirstLeftShift 와 동일 공식)
            if (useSpreadInSingle) {
              return p.pages.some((pn) => imageCache.has(Math.ceil((pn + dropFirstLeftShift) / 2)));
            }
            return p.pages.some((pn) => imageCache.has(pn));
          });
          if (!hasAnyImage) continue;
        }
        // 첫/마지막 시트의 blank 절반 skip
        if (skipBlankHalves) {
          if (sheetIdx === firstImageSheetIdx && pass === blankFirstHalf) continue;
          if (sheetIdx === lastImageSheetIdx && pass === blankLastHalf) continue;
        }

        const page = out.addPage([sheetWpt, sheetHpt]);

        // 스프레드 패스일 때 jobMetaText에 좌/우 표시 추가
        const passLabel = pass === 'left' ? ' [L]' : pass === 'right' ? ' [R]' : '';
        const effectiveMeta = options.jobMetaText ? options.jobMetaText + passLabel : null;

        for (const p of sheet.placements) {
          // pdf-lib 좌표계: bottom-left 원점
          const xPt = toPt(p.x);
          const yPt = sheetHpt - toPt(p.y) - toPt(p.height);
          const wPt = toPt(p.width);
          const hPt = toPt(p.height);

          if (p.isPair && p.pages.length === 2) {
            if (useSpreadInPair) {
              // 스프레드 입력 + 페어: 파일 1장(=스프레드)이 페어박스 전체를 채움.
              // 파일 키 = floor((pages[0]-1)/2) + 1
              const fileKey = Math.floor((p.pages[0] - 1) / 2) + 1;
              drawImageFit(page, imageCache, fileKey, xPt, yPt, wPt, hPt, p.rotation);
            } else {
              // 압축앨범 비스프레드 페어: 페이지 2장을 페어박스에 분할 배치 (파일 2장)
              // - 회전 0°: 좌/우 분할 (가로 펼침)
              // - 회전 90°: 상/하 분할 (세로 펼침). CCW 90° 기준 원본 좌측(pages[0])이 시각 하단.
              const creaseWPt = toPt(result.echo.creaseWidth ?? 0);
              if (p.rotation === 90) {
                const halfH = (hPt - creaseWPt) / 2;
                drawImageFit(page, imageCache, p.pages[0], xPt, yPt, wPt, halfH, p.rotation);
                drawImageFit(page, imageCache, p.pages[1], xPt, yPt + halfH + creaseWPt, wPt, halfH, p.rotation);
              } else {
                const halfW = (wPt - creaseWPt) / 2;
                drawImageFit(page, imageCache, p.pages[0], xPt, yPt, halfW, hPt, p.rotation);
                drawImageFit(page, imageCache, p.pages[1], xPt + halfW + creaseWPt, yPt, halfW, hPt, p.rotation);
              }
            }
          } else if (useSpreadInSingle) {
            // 스프레드+단면: album 페이지 N → 파일/half 매핑.
            // print-pdf 의 splitSpreads 와 정합되도록 bindingDirection 의 drop 규칙을 반영한다.
            //
            // LEFT_START_RIGHT_END (drops=0): 첫 파일부터 L,R,L,R,...
            //   album 1 → file 1 L, album 2 → file 1 R, album 3 → file 2 L, ...
            //
            // RIGHT_START_LEFT_END (drops=2): 첫 파일 좌측 drop, 마지막 파일 우측 drop.
            //   → 첫 파일은 R 만 사용, 한 칸 shift 됨.
            //   album 1 → file 1 R, album 2 → file 2 L, album 3 → file 2 R, ...
            //   album 마지막(짝수) → 마지막 파일 L
            //
            // 통일 공식: adjusted = album + dropFirstLeft (한 칸 shift).
            //   fileIdx = ceil(adjusted / 2)
            //   half = adjusted 가 홀수면 L, 짝수면 R
            const albumPage = p.pages[0];
            const adjusted = albumPage + dropFirstLeftShift;
            const fileIdx = Math.ceil(adjusted / 2);
            const half: 'left' | 'right' = adjusted % 2 === 1 ? 'left' : 'right';
            drawImageFit(page, imageCache, fileIdx, xPt, yPt, wPt, hPt, p.rotation, half);
          } else {
            drawImageFit(page, imageCache, p.pages[0], xPt, yPt, wPt, hPt, p.rotation, pass === 'none' ? undefined : pass);
          }

          // 재단선
          if (options.drawCropMarks !== false) {
            drawCropMarks(page, xPt, yPt, wPt, hPt);
          }

          // 블리드 경계선
          if (options.drawBleedLines !== false && bleedPt > 0) {
            drawBleedBox(page, xPt, yPt, wPt, hPt, bleedPt);
          }

          // 압축앨범 오시선 (crease) — 이미지 영역을 가로지르지 않도록 페어박스 바깥쪽 tick.
          // 회전 0°: 세로 오시선(creaseXs) → 박스 상/하 tick
          // 회전 90°: 가로 오시선(creaseYs) → 박스 좌/우 tick
          if (options.drawCreaseMarks !== false) {
            if (p.isPair && p.creaseYs && p.creaseYs.length > 0) {
              for (const cyMm of p.creaseYs) {
                const cyPt = sheetHpt - toPt(cyMm);
                drawCreaseTicksHorizontal(page, cyPt, xPt, xPt + wPt);
              }
            } else if (p.isPair && p.creaseXs && p.creaseXs.length > 0) {
              for (const cxMm of p.creaseXs) {
                drawCreaseTicks(page, toPt(cxMm), yPt, yPt + hPt);
              }
            } else if (p.creaseX !== undefined && !p.needsTaping) {
              drawCreaseTicks(page, toPt(p.creaseX), yPt, yPt + hPt);
            }
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
        if (effectiveMeta && meta) {
          drawJobMeta(page, printAreaX, printAreaY, printAreaW, printAreaH, effectiveMeta, sheet.sheetIndex + 1, result.sheetCount, meta.font, meta.sanitize);
        }
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
 * 이미지를 슬롯 내 배치.
 * - half 없음: aspect-fit 중앙 배치 (일반 이미지)
 * - half='left'/'right': 스프레드 이미지를 클리핑하여 좌/우 절반만 표시.
 *   이미지 높이를 슬롯 높이에 맞춰 100% 스케일 후 좌 또는 우 절반만 클리핑한다.
 *   (인디고 장비에서 24×15 스프레드를 12×15 × 2장으로 반잘라 출력하는 방식)
 * - rotation=90: 반시계 90° 회전
 * - 이미지 없으면 회색 폴백
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
  half?: 'left' | 'right',
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

  // 스프레드 절반 클리핑 모드: 이미지를 슬롯에 맞게 스케일하고 슬롯 경계로 클리핑.
  // rotation=0: 이미지 높이를 슬롯 높이에 맞추고 좌/우 절반 노출.
  // rotation=90: 이미지를 CCW 90° 회전 후 슬롯에 맞춤.
  //   - CCW 90° 회전 시 원본 좌측 절반은 회전 후 시각적으로 하단 절반에 위치
  //   - 원본 우측 절반은 회전 후 시각적으로 상단 절반에 위치
  //   - 슬롯 가로(w)에 회전 후 이미지 가로(drawH=natH*scale)를 맞춤 → scale=w/natH
  if (half === 'left' || half === 'right') {
    // 클리핑 영역 = 슬롯 정확히 (회전과 무관)
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
      const scale = w / natH;
      const drawW = natW * scale; // 회전 후 시각 높이
      const drawH = natH * scale; // 회전 후 시각 가로 (= w)
      // 회전 후 시각 bbox: x ∈ [anchorX-drawH, anchorX], y ∈ [anchorY, anchorY+drawW]
      // anchorX = x + drawH 로 시각 좌측을 슬롯 좌측(x)에 맞춤
      // left: 시각 하단(원본 좌측)이 슬롯 [y, y+h]에 보이도록 anchorY = y
      // right: 시각 상단(원본 우측)이 슬롯에 보이도록 anchorY = y - drawW/2
      const anchorX = x + drawH;
      const anchorY = half === 'left' ? y : y - drawW / 2;
      page.drawImage(img, {
        x: anchorX,
        y: anchorY,
        width: drawW,
        height: drawH,
        rotate: degrees(90),
      });
    } else {
      const scale = h / natH;
      const drawW = natW * scale;
      const drawH = natH * scale;
      const drawX = half === 'left' ? x : x - (drawW - w);
      page.drawImage(img, { x: drawX, y, width: drawW, height: drawH });
    }

    page.pushOperators(popGraphicsState());
    return;
  }

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

