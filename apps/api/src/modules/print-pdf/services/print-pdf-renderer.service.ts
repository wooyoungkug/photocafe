import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import {
  PrintPdfLayoutService,
  PageDimensions,
  NupLayout,
  MM_TO_PT,
  INDEX_HEIGHT_MM,
  CROP_MARK,
} from './print-pdf-layout.service';
import { IndexOptionsDto } from '../dto/print-pdf.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

// 한글 폰트 경로 (shipping-label.service.ts 패턴 재활용)
function findFontDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'fonts'),
    path.resolve(__dirname, '../../../../fonts'),
    path.resolve(__dirname, '../../../../../fonts'),
    '/app/fonts',
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'NanumGothic.ttf'))) return dir;
  }
  return candidates[0];
}

const FONT_DIR = findFontDir();
const FONT_REGULAR = path.join(FONT_DIR, 'NanumGothic.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'NanumGothicBold.ttf');

/** 인덱스 폰트 크기 (pt) */
const INDEX_FONT_SIZE = 6;
/** 인덱스 텍스트 - 이미지 하단에서 아래로 오프셋 (mm) */
const INDEX_TEXT_OFFSET_MM = 1.5;
/** 인덱스 텍스트 X 시작 위치 (mm) */
const INDEX_TEXT_X_MM = 2;

export interface IndexData {
  orderNumber: string;
  studioName: string;
  spec: string;
  paper: string;
  currentPage: number;
  totalPages: number;
  colorMode: string;
  binding: string;
  nup: string;
  side: string;
  /** 이미지영역 mm 표시 (예: "305×381") */
  imageArea?: string;
}

export interface RenderPageOptions {
  imageInput: string | Buffer;
  dimensions: PageDimensions;
  indexData: IndexData;
  indexOptions: IndexOptionsDto;
  includeCropMarks: boolean;
}

@Injectable()
export class PrintPdfRendererService {
  private readonly logger = new Logger(PrintPdfRendererService.name);
  private fontsAvailable = false;

  constructor(private readonly layoutService: PrintPdfLayoutService) {
    this.fontsAvailable = fs.existsSync(FONT_REGULAR);
    if (!this.fontsAvailable) {
      this.logger.warn(`한글 폰트를 찾을 수 없습니다: ${FONT_REGULAR}`);
    }
  }

  /**
   * 이미지 메타데이터 조회 (sharp - 메타데이터만, 리사이즈 금지)
   */
  async getImageMetadata(imagePath: string): Promise<{
    width: number;
    height: number;
    dpi: number;
  }> {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      dpi: metadata.density || 300,
    };
  }

  /**
   * 1up PDF 생성 (단일 주문항목의 모든 페이지를 하나의 PDF로)
   */
  async generate1upPdf(
    files: Array<{ originalPath: string; sortOrder: number }>,
    outputPath: string,
    dimensions: PageDimensions,
    indexData: Omit<IndexData, 'currentPage' | 'totalPages'>,
    indexOptions: IndexOptionsDto,
    includeCropMarks: boolean,
    indexOrderKeys?: string[],
    indexPosition: 'top' | 'bottom' = 'bottom',
    canvasSize?: { widthMm: number; heightMm: number },
    onPageRendered?: (current: number, total: number) => void,
    imageSize?: { widthMm: number; heightMm: number },
    includeColorBar?: boolean,
  ): Promise<string> {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const sortedFiles = [...files].sort((a, b) => a.sortOrder - b.sortOrder);
    const validFiles = sortedFiles.filter((f) => {
      if (!fs.existsSync(f.originalPath)) {
        this.logger.warn(`File not found, skipping: ${f.originalPath}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      throw new Error('No valid files to generate PDF');
    }

    const totalPages = validFiles.length;

    // 이미지 크기: imageSize 지정 시 해당 크기, 미지정 시 규격(dimensions) 기준
    let imgWidthPt = dimensions.imageWidthPt;
    let imgHeightPt = dimensions.imageHeightPt;
    if (imageSize) {
      imgWidthPt = imageSize.widthMm * MM_TO_PT;
      imgHeightPt = imageSize.heightMm * MM_TO_PT;
    }

    // 캔버스(용지) 크기: canvasSize 지정 시 해당 크기, 미지정 시 이미지+마진 기준
    let pdfPageWidthPt = dimensions.pageWidthPt;
    let pdfPageHeightPt = dimensions.pageHeightPt;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasSize) {
      pdfPageWidthPt = canvasSize.widthMm * MM_TO_PT;
      pdfPageHeightPt = canvasSize.heightMm * MM_TO_PT;
    }

    // 이미지를 캔버스 중앙에 배치
    if (canvasSize || imageSize) {
      offsetX = (pdfPageWidthPt - imgWidthPt) / 2 - dimensions.imageX;
      offsetY = (pdfPageHeightPt - imgHeightPt) / 2 - dimensions.imageY;
    }

    const doc = new PDFDocument({
      autoFirstPage: false,
      compress: false,
    });
    const writeStream = fs.createWriteStream(outputPath);
    const finished = new Promise<string>((resolve, reject) => {
      writeStream.on('finish', () => resolve(outputPath));
      writeStream.on('error', (err: any) => reject(err));
    });
    doc.pipe(writeStream);

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];

      doc.addPage({
        size: [pdfPageWidthPt, pdfPageHeightPt],
        margin: 0,
      });

      // 오프셋 적용한 좌표 계산
      const imgX = offsetX + dimensions.imageX;
      const imgY = offsetY + dimensions.imageY;

      // 1) 이미지 배치
      doc.image(file.originalPath, imgX, imgY, {
        width: imgWidthPt,
        height: imgHeightPt,
      });

      // 오프셋 적용된 dimensions (인덱스/재단선 렌더링용)
      const offsetDims: PageDimensions = {
        ...dimensions,
        pageWidthPt: pdfPageWidthPt,
        pageHeightPt: pdfPageHeightPt,
        imageX: imgX,
        imageY: imgY,
        imageWidthPt: imgWidthPt,
        imageHeightPt: imgHeightPt,
        trimLeft: offsetX + dimensions.trimLeft,
        trimTop: offsetY + dimensions.trimTop,
        trimRight: offsetX + dimensions.trimRight,
        trimBottom: offsetY + dimensions.trimBottom,
      };

      // 2) 인덱스 렌더링
      const pageIndexData: IndexData = {
        ...indexData,
        currentPage: i + 1,
        totalPages,
      };
      this.renderIndex(doc, pageIndexData, indexOptions, offsetDims, indexOrderKeys, indexPosition);

      // 3) 재단선 렌더링
      if (includeCropMarks) {
        this.renderCropMarks(doc, offsetDims);
      }

      // 4) 칼라 컨트롤 바 (돔보바)
      if (includeColorBar) {
        this.renderColorBar(doc, offsetDims);
      }

      // 페이지별 진행률 콜백 + 이벤트 루프 양보 → 폴링 응답 가능
      if (onPageRendered) {
        try { onPageRendered(i + 1, totalPages); } catch { /* ignore */ }
      }
      await new Promise<void>(r => setImmediate(r));
    }

    doc.end();
    return finished;
  }

  /**
   * Nup PDF 생성 (여러 이미지를 하나의 용지에 배치)
   */
  async generateNupPdf(
    files: Array<{ originalPath: string; sortOrder: number }>,
    outputPath: string,
    nupLayout: NupLayout,
    indexData: Omit<IndexData, 'currentPage' | 'totalPages'>,
    indexOptions: IndexOptionsDto,
    includeCropMarks: boolean,
    indexOrderKeys?: string[],
    indexPosition: 'top' | 'bottom' = 'bottom',
    onPageRendered?: (current: number, total: number) => void,
  ): Promise<string> {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const sortedFiles = [...files].sort((a, b) => a.sortOrder - b.sortOrder);
    const validFiles = sortedFiles.filter((f) => fs.existsSync(f.originalPath));

    if (validFiles.length === 0) {
      throw new Error('No valid files to generate PDF');
    }

    const totalPages = validFiles.length;
    const imagesPerSheet = nupLayout.nUpX * nupLayout.nUpY;

    const doc = new PDFDocument({
      autoFirstPage: false,
      compress: false,
    });
    const writeStream = fs.createWriteStream(outputPath);
    const finished = new Promise<string>((resolve, reject) => {
      writeStream.on('finish', () => resolve(outputPath));
      writeStream.on('error', (err: any) => reject(err));
    });
    doc.pipe(writeStream);

    for (let sheetIdx = 0; sheetIdx < Math.ceil(validFiles.length / imagesPerSheet); sheetIdx++) {
      doc.addPage({
        size: [nupLayout.sheetWidthPt, nupLayout.sheetHeightPt],
        margin: 0,
      });

      for (let cellIdx = 0; cellIdx < imagesPerSheet; cellIdx++) {
        const fileIdx = sheetIdx * imagesPerSheet + cellIdx;
        if (fileIdx >= validFiles.length) break;

        const file = validFiles[fileIdx];
        const cell = nupLayout.cells[cellIdx];
        const dims = nupLayout.cellPageDimensions;

        // 셀 내 이미지 배치
        const imgX = cell.x + dims.imageX;
        const imgY = cell.y + dims.imageY;

        doc.image(file.originalPath, imgX, imgY, {
          width: dims.imageWidthPt,
          height: dims.imageHeightPt,
        });

        // 셀 내 인덱스 (첫 번째 셀에만 or 각 셀마다 - 현재: 각 셀마다)
        const pageIndexData: IndexData = {
          ...indexData,
          currentPage: fileIdx + 1,
          totalPages,
        };
        this.renderIndexInCell(doc, pageIndexData, indexOptions, dims, cell.x, cell.y, indexOrderKeys, indexPosition);

        // 셀 내 재단선
        if (includeCropMarks) {
          this.renderCropMarksInCell(doc, dims, cell.x, cell.y, cell.suppressCropMarks);
        }

        // 페이지별 진행률 콜백 + 이벤트 루프 양보
        if (onPageRendered) {
          try { onPageRendered(fileIdx + 1, totalPages); } catch { /* ignore */ }
        }
        await new Promise<void>(r => setImmediate(r));
      }
    }

    doc.end();
    return finished;
  }

  /**
   * 인덱스 텍스트 렌더링
   */
  private renderIndex(
    doc: any,
    data: IndexData,
    options: IndexOptionsDto,
    dims: PageDimensions,
    indexOrderKeys?: string[],
    indexPosition: 'top' | 'bottom' = 'bottom',
  ): void {
    const indexText = this.buildIndexText(data, options, indexOrderKeys);
    if (!indexText) return;

    let indexX: number;
    let indexY: number;
    let textWidth: number;

    // 이미지 바깥의 crop margin 영역에 배치 (재단선·블리드 밖, 크롭마크와 같은 공간)
    const imgBottom = dims.imageY + dims.imageHeightPt;
    const imgTop = dims.imageY;
    const pageBottom = dims.pageHeightPt;

    if (indexPosition === 'top') {
      // 상단: 이미지 바로 위, 재단선 안쪽 (이미지와 1mm 간격)
      indexX = dims.trimLeft + INDEX_TEXT_X_MM * MM_TO_PT;
      indexY = imgTop - INDEX_FONT_SIZE - 1 * MM_TO_PT;
      textWidth = (dims.trimRight - dims.trimLeft) - INDEX_TEXT_X_MM * MM_TO_PT * 2;
    } else {
      // 하단: 이미지 바로 아래, 재단선 안쪽 (이미지와 1mm 간격)
      indexX = dims.trimLeft + INDEX_TEXT_X_MM * MM_TO_PT;
      indexY = imgBottom + 1 * MM_TO_PT;
      textWidth = (dims.trimRight - dims.trimLeft) - INDEX_TEXT_X_MM * MM_TO_PT * 2;
    }

    doc.save();
    if (this.fontsAvailable) {
      doc.font(FONT_REGULAR);
    }
    doc
      .fontSize(INDEX_FONT_SIZE)
      .fillColor('#333333')
      .text(indexText, indexX, indexY, {
        width: textWidth,
        lineBreak: false,
      });
    doc.restore();
  }

  /**
   * 셀 내 인덱스 렌더링 (Nup용)
   */
  private renderIndexInCell(
    doc: any,
    data: IndexData,
    options: IndexOptionsDto,
    dims: PageDimensions,
    cellX: number,
    cellY: number,
    indexOrderKeys?: string[],
    indexPosition: 'top' | 'bottom' = 'bottom',
  ): void {
    const indexText = this.buildIndexText(data, options, indexOrderKeys);
    if (!indexText) return;

    let indexX: number;
    let indexY: number;
    let textWidth: number;

    // 셀 기준 이미지 바깥 crop margin 영역에 배치
    const cellImgTop = cellY + dims.imageY;
    const cellImgBottom = cellY + dims.imageY + dims.imageHeightPt;
    const cellBottom = cellY + dims.pageHeightPt;

    if (indexPosition === 'top') {
      // 이미지 바로 위, 재단선 안쪽 (이미지와 1mm 간격)
      indexX = cellX + dims.trimLeft + INDEX_TEXT_X_MM * MM_TO_PT;
      indexY = cellImgTop - INDEX_FONT_SIZE - 1 * MM_TO_PT;
      textWidth = (dims.trimRight - dims.trimLeft) - INDEX_TEXT_X_MM * MM_TO_PT * 2;
    } else {
      // 이미지 바로 아래, 재단선 안쪽 (이미지와 1mm 간격)
      indexX = cellX + dims.trimLeft + INDEX_TEXT_X_MM * MM_TO_PT;
      indexY = cellImgBottom + 1 * MM_TO_PT;
      textWidth = (dims.trimRight - dims.trimLeft) - INDEX_TEXT_X_MM * MM_TO_PT * 2;
    }

    doc.save();
    if (this.fontsAvailable) {
      doc.font(FONT_REGULAR);
    }
    doc
      .fontSize(INDEX_FONT_SIZE)
      .fillColor('#333333')
      .text(indexText, indexX, indexY, {
        width: textWidth,
        lineBreak: false,
      });
    doc.restore();
  }

  /**
   * 인덱스 텍스트 조합 (indexOrderKeys로 출력 순서 지정 가능)
   */
  private buildIndexText(
    data: IndexData,
    options: IndexOptionsDto,
    indexOrderKeys?: string[],
  ): string {
    const now = new Date();

    // key → 텍스트 매핑
    const keyValueMap: Record<string, () => string> = {
      showDateTime: () => this.formatDateTime(now),
      showOrderNumber: () => data.orderNumber,
      showStudioName: () => data.studioName,
      showSpec: () => data.spec,
      showPaper: () => data.paper,
      showPageInfo: () => `${data.currentPage}/${data.totalPages}P`,
      showColorMode: () => data.colorMode,
      showBinding: () => data.binding,
      showSide: () => data.side,
      showNup: () => data.nup,
      showImageArea: () => data.imageArea ? `영역:${data.imageArea}mm` : '',
    };

    // 순서 결정: indexOrderKeys가 있으면 해당 순서, 없으면 기본 순서
    const orderedKeys = indexOrderKeys?.length
      ? indexOrderKeys
      : Object.keys(keyValueMap);

    const parts: string[] = [];
    for (const key of orderedKeys) {
      if ((options as any)[key] && keyValueMap[key]) {
        const val = keyValueMap[key]();
        if (val) parts.push(val);
      }
    }

    return parts.join(' | ');
  }

  /**
   * 재단선(Crop Mark) 렌더링 - 4모서리, 이미지 영역 바깥에만 그림
   */
  private renderCropMarks(doc: any, dims: PageDimensions): void {
    const markLen = CROP_MARK.LENGTH_MM * MM_TO_PT;
    const gap = CROP_MARK.OFFSET_MM * MM_TO_PT; // 이미지 edge에서 재단선까지 간격

    // 이미지 영역 경계
    const imgLeft = dims.imageX;
    const imgTop = dims.imageY;
    const imgRight = dims.imageX + dims.imageWidthPt;
    const imgBottom = dims.imageY + dims.imageHeightPt;

    doc.save();
    doc.lineWidth(CROP_MARK.LINE_WIDTH).strokeColor('#000000');

    // 좌상
    doc.moveTo(imgLeft - gap - markLen, dims.trimTop).lineTo(imgLeft - gap, dims.trimTop).stroke();
    doc.moveTo(dims.trimLeft, imgTop - gap - markLen).lineTo(dims.trimLeft, imgTop - gap).stroke();

    // 우상
    doc.moveTo(imgRight + gap, dims.trimTop).lineTo(imgRight + gap + markLen, dims.trimTop).stroke();
    doc.moveTo(dims.trimRight, imgTop - gap - markLen).lineTo(dims.trimRight, imgTop - gap).stroke();

    // 좌하
    doc.moveTo(imgLeft - gap - markLen, dims.trimBottom).lineTo(imgLeft - gap, dims.trimBottom).stroke();
    doc.moveTo(dims.trimLeft, imgBottom + gap).lineTo(dims.trimLeft, imgBottom + gap + markLen).stroke();

    // 우하
    doc.moveTo(imgRight + gap, dims.trimBottom).lineTo(imgRight + gap + markLen, dims.trimBottom).stroke();
    doc.moveTo(dims.trimRight, imgBottom + gap).lineTo(dims.trimRight, imgBottom + gap + markLen).stroke();

    doc.restore();
  }

  /**
   * 칼라 컨트롤 바(돔보바) 렌더링 - 이미지 하단 바깥, 재단선 아래에 배치
   * CMYK + RGB 기본 패치 + 그라데이션 스텝으로 핀맞춤 확인용
   */
  private renderColorBar(doc: any, dims: PageDimensions): void {
    const PATCH_SIZE = 3 * MM_TO_PT;  // 각 패치 3mm
    const GAP = 0.5 * MM_TO_PT;       // 패치 간격
    const BAR_OFFSET = 2 * MM_TO_PT;  // 이미지 하단에서 떨어진 거리

    const imgBottom = dims.imageY + dims.imageHeightPt;
    const imgLeft = dims.imageX;
    const barY = imgBottom + CROP_MARK.OFFSET_MM * MM_TO_PT + CROP_MARK.LENGTH_MM * MM_TO_PT + BAR_OFFSET;

    // CMYK 기본 패치 + 오버프린트 조합
    const patches: Array<{ color: string; label?: string }> = [
      { color: '#00FFFF', label: 'C' },     // Cyan
      { color: '#FF00FF', label: 'M' },     // Magenta
      { color: '#FFFF00', label: 'Y' },     // Yellow
      { color: '#000000', label: 'K' },     // Black
      { color: '#FF0000', label: 'R' },     // Red (M+Y)
      { color: '#00FF00', label: 'G' },     // Green (C+Y)
      { color: '#0000FF', label: 'B' },     // Blue (C+M)
      // 그레이 스텝 (10% ~ 100%)
      { color: '#E6E6E6' }, // 10%
      { color: '#CCCCCC' }, // 20%
      { color: '#B3B3B3' }, // 30%
      { color: '#999999' }, // 40%
      { color: '#808080' }, // 50%
      { color: '#666666' }, // 60%
      { color: '#4D4D4D' }, // 70%
      { color: '#333333' }, // 80%
      { color: '#1A1A1A' }, // 90%
      { color: '#000000' }, // 100%
    ];

    doc.save();
    let x = imgLeft;

    for (const patch of patches) {
      doc.rect(x, barY, PATCH_SIZE, PATCH_SIZE).fill(patch.color);
      // 라벨 (CMYKRGB만)
      if (patch.label) {
        doc.fontSize(3).fillColor(patch.color === '#FFFF00' || patch.color === '#00FF00' ? '#000000' : '#FFFFFF')
          .text(patch.label, x, barY + 0.3 * MM_TO_PT, { width: PATCH_SIZE, align: 'center', lineBreak: false });
      }
      x += PATCH_SIZE + GAP;
    }

    // 핀맞춤 십자 마크 (바 오른쪽 끝에)
    x += 2 * MM_TO_PT;
    const crossSize = 2.5 * MM_TO_PT;
    const crossCenter = barY + PATCH_SIZE / 2;
    doc.lineWidth(0.3)
      .strokeColor('#000000')
      .moveTo(x, crossCenter - crossSize).lineTo(x, crossCenter + crossSize).stroke()
      .moveTo(x - crossSize, crossCenter).lineTo(x + crossSize, crossCenter).stroke();
    // 십자 원
    doc.circle(x, crossCenter, 1.5 * MM_TO_PT).lineWidth(0.3).strokeColor('#000000').stroke();

    doc.restore();
  }

  /**
   * 셀 내 재단선 렌더링 (Nup용) - 이미지 영역 바깥에만 그림
   *
   * suppress: 인접 셀과 맞닿은 방향의 corner 마크 전체(H+V)를 억제.
   * 예) suppress.right=true → 우상/우하 코너의 crop mark 전부 제거 (인접 셀 이미지 침범 방지)
   */
  private renderCropMarksInCell(
    doc: any,
    dims: PageDimensions,
    cellX: number,
    cellY: number,
    suppress?: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean },
  ): void {
    const markLen = CROP_MARK.LENGTH_MM * MM_TO_PT;
    const gap = CROP_MARK.OFFSET_MM * MM_TO_PT;

    const imgLeft = cellX + dims.imageX;
    const imgTop = cellY + dims.imageY;
    const imgRight = cellX + dims.imageX + dims.imageWidthPt;
    const imgBottom = cellY + dims.imageY + dims.imageHeightPt;
    const tLeft = cellX + dims.trimLeft;
    const tRight = cellX + dims.trimRight;
    const tTop = cellY + dims.trimTop;
    const tBottom = cellY + dims.trimBottom;

    const supL = suppress?.left === true;
    const supR = suppress?.right === true;
    const supT = suppress?.top === true;
    const supB = suppress?.bottom === true;

    // 코너별로 그릴지 판단: 해당 코너에 접한 두 변 중 어느 쪽도 suppress 되지 않은 경우에만 그림
    const drawTopLeft = !supT && !supL;
    const drawTopRight = !supT && !supR;
    const drawBottomLeft = !supB && !supL;
    const drawBottomRight = !supB && !supR;

    doc.save();
    doc.lineWidth(CROP_MARK.LINE_WIDTH).strokeColor('#000000');

    if (drawTopLeft) {
      doc.moveTo(imgLeft - gap - markLen, tTop).lineTo(imgLeft - gap, tTop).stroke();
      doc.moveTo(tLeft, imgTop - gap - markLen).lineTo(tLeft, imgTop - gap).stroke();
    }
    if (drawTopRight) {
      doc.moveTo(imgRight + gap, tTop).lineTo(imgRight + gap + markLen, tTop).stroke();
      doc.moveTo(tRight, imgTop - gap - markLen).lineTo(tRight, imgTop - gap).stroke();
    }
    if (drawBottomLeft) {
      doc.moveTo(imgLeft - gap - markLen, tBottom).lineTo(imgLeft - gap, tBottom).stroke();
      doc.moveTo(tLeft, imgBottom + gap).lineTo(tLeft, imgBottom + gap + markLen).stroke();
    }
    if (drawBottomRight) {
      doc.moveTo(imgRight + gap, tBottom).lineTo(imgRight + gap + markLen, tBottom).stroke();
      doc.moveTo(tRight, imgBottom + gap).lineTo(tRight, imgBottom + gap + markLen).stroke();
    }

    doc.restore();
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatDateTime(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${this.formatDate(date)} ${h}:${min}`;
  }
}
