import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

interface PdfFileInput {
  originalPath: string;
  fileName: string;
  widthInch: number;
  heightInch: number;
  sortOrder: number;
}

const DEFAULT_DPI = 300;
/** 가로/세로 비율이 이 값 이상이면 펼침(spread)으로 판정 */
const SPREAD_RATIO = 1.3;
/** 빈 페이지 판정 임계값 */
const BLANK_MEAN_THRESHOLD = 250;
const BLANK_STD_THRESHOLD = 5;

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  /** 스프레드 이미지에서 좌/우 한 면만 추출 (버퍼 반환) */
  private async extractSpreadSide(
    source: string,
    side: 'left' | 'right',
    imgWidth: number,
    imgHeight: number,
  ): Promise<Buffer> {
    const halfWidth = Math.floor(imgWidth / 2);
    if (side === 'left') {
      return sharp(source)
        .extract({ left: 0, top: 0, width: halfWidth, height: imgHeight })
        .toBuffer();
    }
    return sharp(source)
      .extract({ left: halfWidth, top: 0, width: imgWidth - halfWidth, height: imgHeight })
      .toBuffer();
  }

  /** 빈 페이지(흰색) 여부 판정 */
  private async isBlankPage(imageInput: string | Buffer): Promise<boolean> {
    try {
      const stats = await sharp(imageInput).stats();
      return stats.channels.every(
        (ch: any) => ch.mean > BLANK_MEAN_THRESHOLD && ch.stdev < BLANK_STD_THRESHOLD,
      );
    } catch {
      return false;
    }
  }

  /** 이미지(파일 경로 또는 Buffer) → 단일 PDF 생성 */
  private generateSinglePagePdf(
    imageInput: string | Buffer,
    pdfPath: string,
    widthPt: number,
    heightPt: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ autoFirstPage: false });
        const writeStream = createWriteStream(pdfPath);
        writeStream.on('finish', () => resolve(pdfPath));
        writeStream.on('error', (err: any) => reject(err));
        doc.pipe(writeStream);
        doc.addPage({ size: [widthPt, heightPt], margin: 0 });
        doc.image(imageInput, 0, 0, { width: widthPt, height: heightPt });
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 주문항목의 이미지들을 낱장 PDF로 변환
   *
   * - 펼침(spread) 이미지(가로 > 세로×1.3): 좌/우 분할 → 2페이지
   * - 단면 이미지: 그대로 1페이지
   * - 앞뒤 빈 페이지 제거, 중간 빈 페이지는 유지
   * - 1P부터 순차 페이지네이션
   *
   * @returns pdf 디렉토리 경로
   */
  async generatePdf(
    files: PdfFileInput[],
    outputDir: string,
    pdfFileName: string,
  ): Promise<string> {
    const pdfDir = join(outputDir, 'pdf');
    if (!existsSync(pdfDir)) {
      mkdirSync(pdfDir, { recursive: true });
    }

    const sortedFiles = [...files].sort((a, b) => a.sortOrder - b.sortOrder);

    const validFiles = sortedFiles.filter(f => {
      if (!existsSync(f.originalPath)) {
        this.logger.warn(`File not found, skipping: ${f.originalPath}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      throw new Error('No valid files to generate PDF');
    }

    // ── 1단계: 페이지 메타정보만 수집 (버퍼 미적재) ──
    const pageMeta: Array<{
      source: string;
      isSpread: boolean;
      side?: 'left' | 'right';
      imgWidth: number;
      imgHeight: number;
      dpi: number;
      widthInch: number;
      heightInch: number;
    }> = [];

    for (const file of validFiles) {
      const metadata = await sharp(file.originalPath).metadata();
      const imgWidth = metadata.width || 0;
      const imgHeight = metadata.height || 0;
      const dpi = metadata.density || DEFAULT_DPI;
      const isSpread = imgWidth > imgHeight * SPREAD_RATIO;

      if (isSpread) {
        const halfWidth = Math.floor(imgWidth / 2);
        const heightInch = imgHeight / dpi;
        pageMeta.push(
          { source: file.originalPath, isSpread: true, side: 'left', imgWidth, imgHeight, dpi, widthInch: halfWidth / dpi, heightInch },
          { source: file.originalPath, isSpread: true, side: 'right', imgWidth, imgHeight, dpi, widthInch: (imgWidth - halfWidth) / dpi, heightInch },
        );
      } else {
        const widthInch = file.widthInch > 0 ? file.widthInch : imgWidth / dpi;
        const heightInch = file.heightInch > 0 ? file.heightInch : imgHeight / dpi;
        pageMeta.push({ source: file.originalPath, isSpread: false, imgWidth, imgHeight, dpi, widthInch, heightInch });
      }
    }

    // ── 2단계: 앞뒤 빈 페이지 제거 (메타 기반, 필요 시에만 버퍼 로드) ──
    let startIdx = 0;
    let endIdx = pageMeta.length - 1;

    while (startIdx <= endIdx) {
      const p = pageMeta[startIdx];
      const input = p.isSpread
        ? await this.extractSpreadSide(p.source, p.side!, p.imgWidth, p.imgHeight)
        : p.source;
      if (await this.isBlankPage(input)) { startIdx++; } else { break; }
    }
    while (endIdx >= startIdx) {
      const p = pageMeta[endIdx];
      const input = p.isSpread
        ? await this.extractSpreadSide(p.source, p.side!, p.imgWidth, p.imgHeight)
        : p.source;
      if (await this.isBlankPage(input)) { endIdx--; } else { break; }
    }

    if (startIdx > endIdx) {
      throw new Error('All pages were blank, no PDF generated');
    }

    // ── 3단계: 1P부터 순차 PDF 생성 (한 장씩 버퍼 로드→PDF→해제) ──
    let pageNum = 0;
    const skippedLeading = startIdx;
    const skippedTrailing = pageMeta.length - 1 - endIdx;

    for (let i = startIdx; i <= endIdx; i++) {
      const page = pageMeta[i];
      pageNum++;

      const widthPt = page.widthInch * 72;
      const heightPt = page.heightInch * 72;
      const num = pageNum.toString().padStart(3, '0');
      const pagePdfPath = join(pdfDir, `${pdfFileName}_${num}.pdf`);

      // 스프레드는 해당 면만 추출, 단면은 파일 경로 직접 사용
      const imageInput = page.isSpread
        ? await this.extractSpreadSide(page.source, page.side!, page.imgWidth, page.imgHeight)
        : page.source;

      await this.generateSinglePagePdf(imageInput, pagePdfPath, widthPt, heightPt);
      // Buffer는 이 루프 반복 끝나면 GC 대상
    }

    this.logger.log(
      `PDF generated: ${pdfDir} (${pageNum} pages from ${validFiles.length} files, leading=${skippedLeading} trailing=${skippedTrailing} blank skipped)`,
    );

    return pdfDir;
  }
}
