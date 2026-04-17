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

    // 캔버스 크기가 지정되면 PDF 페이지를 캔버스 크기로, 출력물을 중앙 배치
    let pdfPageWidthPt = dimensions.pageWidthPt;
    let pdfPageHeightPt = dimensions.pageHeightPt;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasSize) {
      pdfPageWidthPt = canvasSize.widthMm * MM_TO_PT;
      pdfPageHeightPt = canvasSize.heightMm * MM_TO_PT;
      offsetX = (pdfPageWidthPt - dimensions.pageWidthPt) / 2;
      offsetY = (pdfPageHeightPt - dimensions.pageHeightPt) / 2;
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          autoFirstPage: false,
          compress: false,
        });
        const writeStream = fs.createWriteStream(outputPath);
        writeStream.on('finish', () => resolve(outputPath));
        writeStream.on('error', (err: any) => reject(err));
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
            width: dimensions.imageWidthPt,
            height: dimensions.imageHeightPt,
          });

          // 오프셋 적용된 dimensions (인덱스/재단선 렌더링용)
          const offsetDims: PageDimensions = {
            ...dimensions,
            pageWidthPt: pdfPageWidthPt,
            pageHeightPt: pdfPageHeightPt,
            imageX: imgX,
            imageY: imgY,
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
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
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

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          autoFirstPage: false,
          compress: false,
        });
        const writeStream = fs.createWriteStream(outputPath);
        writeStream.on('finish', () => resolve(outputPath));
        writeStream.on('error', (err: any) => reject(err));
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
              this.renderCropMarksInCell(doc, dims, cell.x, cell.y);
            }
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
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

    // 블리드 영역: 이미지 안쪽 ~ 재단선 사이
    const imgBottom = dims.imageY + dims.imageHeightPt;
    const imgTop = dims.imageY;

    if (indexPosition === 'top') {
      // 상단 블리드 영역 (imageY ~ trimTop) 중앙
      indexX = dims.trimLeft + INDEX_TEXT_X_MM * MM_TO_PT;
      indexY = imgTop + (dims.trimTop - imgTop - INDEX_FONT_SIZE) / 2;
      textWidth = (dims.trimRight - dims.trimLeft) - INDEX_TEXT_X_MM * MM_TO_PT * 2;
    } else {
      // 하단 블리드 영역 (trimBottom ~ imageBottom) 중앙
      indexX = dims.trimLeft + INDEX_TEXT_X_MM * MM_TO_PT;
      indexY = dims.trimBottom + (imgBottom - dims.trimBottom - INDEX_FONT_SIZE) / 2;
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

    const cellImgBottom = cellY + dims.imageY + dims.imageHeightPt;
    const cellImgTop = cellY + dims.imageY;

    if (indexPosition === 'top') {
      indexX = cellX + dims.trimLeft + INDEX_TEXT_X_MM * MM_TO_PT;
      indexY = cellImgTop + (cellY + dims.trimTop - cellImgTop - INDEX_FONT_SIZE) / 2;
      textWidth = (dims.trimRight - dims.trimLeft) - INDEX_TEXT_X_MM * MM_TO_PT * 2;
    } else {
      indexX = cellX + dims.trimLeft + INDEX_TEXT_X_MM * MM_TO_PT;
      indexY = cellY + dims.trimBottom + (cellImgBottom - (cellY + dims.trimBottom) - INDEX_FONT_SIZE) / 2;
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
      showNup: () => data.nup,
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
   * 셀 내 재단선 렌더링 (Nup용) - 이미지 영역 바깥에만 그림
   */
  private renderCropMarksInCell(
    doc: any,
    dims: PageDimensions,
    cellX: number,
    cellY: number,
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

    doc.save();
    doc.lineWidth(CROP_MARK.LINE_WIDTH).strokeColor('#000000');

    // 좌상
    doc.moveTo(imgLeft - gap - markLen, tTop).lineTo(imgLeft - gap, tTop).stroke();
    doc.moveTo(tLeft, imgTop - gap - markLen).lineTo(tLeft, imgTop - gap).stroke();
    // 우상
    doc.moveTo(imgRight + gap, tTop).lineTo(imgRight + gap + markLen, tTop).stroke();
    doc.moveTo(tRight, imgTop - gap - markLen).lineTo(tRight, imgTop - gap).stroke();
    // 좌하
    doc.moveTo(imgLeft - gap - markLen, tBottom).lineTo(imgLeft - gap, tBottom).stroke();
    doc.moveTo(tLeft, imgBottom + gap).lineTo(tLeft, imgBottom + gap + markLen).stroke();
    // 우하
    doc.moveTo(imgRight + gap, tBottom).lineTo(imgRight + gap + markLen, tBottom).stroke();
    doc.moveTo(tRight, imgBottom + gap).lineTo(tRight, imgBottom + gap + markLen).stroke();

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
