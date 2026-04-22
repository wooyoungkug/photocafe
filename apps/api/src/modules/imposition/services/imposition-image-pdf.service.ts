import { Injectable } from '@nestjs/common';
import {
  PDFDocument,
  PDFPage,
  rgb,
  degrees,
  PDFName,
  PDFStream,
  PDFRef,
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
  /**
   * 펼침면(spread) 이미지 처리 여부.
   * true이면 각 이미지를 좌/우 절반으로 나눠 2배 페이지 수를 생성한다.
   * (인디고 등 스프레드 전체 규격 출력 불가 장비에서 반잘라 테이핑하는 방식 대응)
   * - 앞 N페이지: 각 이미지 좌측 절반
   * - 뒤 N페이지: 각 이미지 우측 절반
   */
  spreadImages?: boolean;
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

        // JPEG: APP2 ICC_PROFILE이 있으면 PDF Image XObject의 ColorSpace를
        // /ICCBased stream으로 교체. 없으면 pdf-lib 기본(DeviceRGB) 유지.
        if (ext !== '.png') {
          try {
            const icc = extractIccProfile(bytes);
            if (icc) {
              await injectIccColorSpace(out, img, icc, 3);
            }
          } catch {
            // ICC 주입 실패는 무시 (원본 DeviceRGB 유지)
          }
        }

        imageCache.set(entry.pageNumber, img);
      } catch {
        // 임베드 실패 시 해당 페이지는 회색 폴백으로 처리
      }
    }

    const sheetWpt = toPt(result.sheetWidth);
    const sheetHpt = toPt(result.sheetHeight);
    const bleedPt = toPt(result.echo.bleed ?? 0);

    // 스프레드 이미지: 좌/우 절반을 각각 별도 패스로 렌더링. 총 페이지 = 2 × sheets.length
    // 일반 이미지: 1 패스만 실행
    const passes: Array<'left' | 'right' | 'none'> = options.spreadImages
      ? ['left', 'right']
      : ['none'];

    for (const pass of passes) {
      for (const sheet of result.sheets) {
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
            // 압축앨범 스프레드 페어: 좌/우 절반 각각 배치
            const creaseWPt = toPt(result.echo.creaseWidth ?? 0);
            const halfW = (wPt - creaseWPt) / 2;
            drawImageFit(page, imageCache, p.pages[0], xPt, yPt, halfW, hPt, p.rotation);
            drawImageFit(page, imageCache, p.pages[1], xPt + halfW + creaseWPt, yPt, halfW, hPt, p.rotation);
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
        if (effectiveMeta && meta) {
          drawJobMeta(page, sheetWpt, sheetHpt, effectiveMeta, sheet.sheetIndex + 1, result.sheetCount, meta.font, meta.sanitize);
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

  // 스프레드 절반 클리핑 모드: 이미지 높이를 슬롯 높이에 맞추고(scale=h/natH)
  // 슬롯 경계로 클리핑하여 좌/우 절반만 표시한다.
  if (half === 'left' || half === 'right') {
    const scale = h / natH;
    const drawW = natW * scale;
    const drawH = natH * scale;
    // 좌측 절반: 이미지 왼쪽 끝을 슬롯 왼쪽 끝에 맞춤
    // 우측 절반: 이미지 오른쪽 끝을 슬롯 오른쪽 끝에 맞춤
    const drawX = half === 'left' ? x : x - (drawW - w);

    // 클리핑 영역 = 슬롯 정확히
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
    page.drawImage(img, { x: drawX, y, width: drawW, height: drawH });
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

/**
 * JPEG의 APP2(0xFFE2) 세그먼트에서 ICC 프로파일을 추출.
 * 여러 청크로 나뉜 경우 chunk 번호 순서대로 이어 붙여 반환.
 * ICC 프로파일이 없으면 null.
 */
function extractIccProfile(jpegBytes: Buffer | Uint8Array): Buffer | null {
  const buf = Buffer.isBuffer(jpegBytes) ? jpegBytes : Buffer.from(jpegBytes);
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;

  const chunks = new Map<number, Buffer>();
  let totalChunks = 0;
  let i = 2; // SOI 다음부터 스캔

  while (i < buf.length - 4) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    // SOS(0xDA) 이후는 압축 데이터 구간 — 더 이상 APP 세그먼트 없음
    if (marker === 0xda) break;
    // 0xFF 패딩 스킵
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    // 세그먼트 없는 마커 (RSTn, SOI, EOI, TEM)
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0x01
    ) {
      i += 2;
      continue;
    }
    if (i + 4 > buf.length) break;
    const segLen = buf.readUInt16BE(i + 2);
    if (segLen < 2 || i + 2 + segLen > buf.length) break;

    if (marker === 0xe2 && segLen > 16) {
      // APP2 payload: "ICC_PROFILE\0" (12 bytes) + chunkNum(1) + chunkCnt(1) + profileData
      const sig = buf.slice(i + 4, i + 16).toString('ascii');
      if (sig === 'ICC_PROFILE\0') {
        const chunkNum = buf[i + 16]; // 1-based
        const chunkCnt = buf[i + 17];
        totalChunks = chunkCnt;
        const start = i + 18;
        const end = i + 2 + segLen;
        chunks.set(chunkNum, buf.slice(start, end));
      }
    }
    i += 2 + segLen;
  }

  if (chunks.size === 0 || totalChunks === 0) return null;
  const parts: Buffer[] = [];
  for (let n = 1; n <= totalChunks; n++) {
    const c = chunks.get(n);
    if (!c) return null; // 누락 청크 — 안전하게 포기
    parts.push(c);
  }
  return Buffer.concat(parts);
}

/**
 * 이미 임베드된 PDFImage의 Image XObject에 /ColorSpace [/ICCBased <stream>]를 주입.
 *
 * pdf-lib의 embedJpg/embedPng는 ref만 예약하고 실제 스트림은 save()에서 할당하므로,
 * 여기서 수동으로 image.embed()를 await한 뒤 lookup으로 dict를 얻어 ColorSpace 키를 교체한다.
 * image.embed()는 멱등적이며 이후 save() 시 skip된다.
 */
async function injectIccColorSpace(
  doc: PDFDocument,
  pdfImage: PDFImage,
  iccProfile: Buffer,
  nComponents: 1 | 3 | 4,
): Promise<void> {
  // 1) JPEG bytes가 이미 context에 실제 스트림으로 등록되도록 embed 강제 실행
  await (pdfImage as any).embed();

  // 2) Image XObject 스트림 조회 (이제 존재). lookup은 PDFRawStream 오버로드가 없으므로
  //    PDFStream으로 조회 — 실제 인스턴스는 PDFRawStream이며 .dict 속성을 공유한다.
  const imgRef: PDFRef = (pdfImage as any).ref;
  const imgStream = doc.context.lookup(imgRef, PDFStream);
  if (!imgStream) return;

  // 3) ICC 프로파일 raw stream 생성 — PDF writer가 자동으로 /Length 삽입하므로
  //    dict에는 N(컴포넌트 수)만 명시.
  const iccStream = doc.context.stream(iccProfile, {
    N: nComponents,
  });
  const iccRef = doc.context.register(iccStream);

  // 4) ICCBased ColorSpace 배열 [/ICCBased <ref>] 생성 후 기존 /ColorSpace 덮어쓰기
  const csArray = doc.context.obj([PDFName.of('ICCBased'), iccRef]);
  imgStream.dict.set(PDFName.of('ColorSpace'), csArray);
}
