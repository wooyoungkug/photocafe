import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import * as sharp from 'sharp';
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

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  /**
   * 이미지에서 실제 크기(inch) 읽기 - widthInch/heightInch가 0일 때 fallback
   */
  private async getImageSizeInch(filePath: string): Promise<{ widthInch: number; heightInch: number }> {
    try {
      const metadata = await sharp(filePath).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const dpi = metadata.density || DEFAULT_DPI;
      return {
        widthInch: width / dpi,
        heightInch: height / dpi,
      };
    } catch (err) {
      this.logger.warn(`Failed to read image metadata: ${filePath}, using A4 default`);
      return { widthInch: 8.27, heightInch: 11.69 }; // A4 fallback
    }
  }

  /**
   * 주문항목의 승인된 이미지들을 PDF로 변환
   * pdfkit 스트리밍 방식: 페이지별로 JPEG를 읽어 출력하므로 메모리 사용 최소화
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

    const pdfPath = join(pdfDir, `${pdfFileName}.pdf`);
    const sortedFiles = [...files].sort((a, b) => a.sortOrder - b.sortOrder);

    // 존재하는 파일만 필터링
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

    // widthInch/heightInch가 0인 파일의 실제 크기를 미리 조회
    const fileSizes = await Promise.all(
      validFiles.map(async (file) => {
        if (file.widthInch > 0 && file.heightInch > 0) {
          return { widthInch: file.widthInch, heightInch: file.heightInch };
        }
        this.logger.warn(`Missing dimensions for ${file.fileName}, reading from image`);
        return this.getImageSizeInch(file.originalPath);
      }),
    );

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ autoFirstPage: false });
        const writeStream = createWriteStream(pdfPath);

        writeStream.on('finish', () => {
          this.logger.log(`PDF generated: ${pdfPath} (${validFiles.length} pages)`);
          resolve(pdfPath);
        });

        writeStream.on('error', (err) => {
          this.logger.error(`PDF write stream error: ${err.message}`);
          reject(err);
        });

        doc.pipe(writeStream);

        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i];
          const size = fileSizes[i];

          // 1 inch = 72 PDF points
          const pageWidthPt = size.widthInch * 72;
          const pageHeightPt = size.heightInch * 72;

          doc.addPage({
            size: [pageWidthPt, pageHeightPt],
            margin: 0,
          });

          doc.image(file.originalPath, 0, 0, {
            width: pageWidthPt,
            height: pageHeightPt,
          });
        }

        doc.end();
      } catch (err) {
        this.logger.error(`PDF generation error: ${err.message}`);
        reject(err);
      }
    });
  }
}
