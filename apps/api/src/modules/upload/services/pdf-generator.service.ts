import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

interface PdfFileInput {
  originalPath: string;
  fileName: string;
  widthInch: number;
  heightInch: number;
  sortOrder: number;
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

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

        for (const file of validFiles) {
          // 1 inch = 72 PDF points
          const pageWidthPt = file.widthInch * 72;
          const pageHeightPt = file.heightInch * 72;

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
