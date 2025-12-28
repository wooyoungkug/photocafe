---
name: pdf-generation
description: PDF 문서 생성 및 처리. 인쇄용 PDF, 견적서, 거래명세서, 주문서, 배송장 생성 작업 시 사용합니다.
---

# PDF 생성 스킬

인쇄업 ERP를 위한 PDF 생성 가이드입니다.

## PDF 종류별 용도

| 문서 유형 | 용도 | 라이브러리 |
|----------|------|-----------|
| 인쇄용 PDF | 고품질 인쇄 출력 | pdf-lib, PDFKit |
| 견적서 | 거래처 견적 발송 | PDFKit, Puppeteer |
| 거래명세서 | 세금계산서 첨부 | PDFKit |
| 주문확인서 | 주문 내역 확인 | Puppeteer |
| 배송장 | 택배 라벨 출력 | PDFKit |

## 라이브러리 선택 가이드

### PDFKit (권장 - 서버 생성)
- 장점: 빠름, 가벼움, Node.js 네이티브
- 용도: 견적서, 명세서, 라벨 등 정형화된 문서

### Puppeteer (HTML → PDF)
- 장점: HTML/CSS 그대로 변환, 복잡한 레이아웃 가능
- 용도: 주문서, 리포트 등 디자인 복잡한 문서

### pdf-lib (PDF 수정)
- 장점: 기존 PDF 편집, 병합, 분할
- 용도: 인쇄용 PDF 합치기, 워터마크 추가

## PDFKit 사용법

### 기본 설정

```typescript
import PDFDocument from 'pdfkit';
import fs from 'fs';

// 한글 폰트 필수
const FONT_PATH = './fonts/NotoSansKR-Regular.otf';
const FONT_BOLD_PATH = './fonts/NotoSansKR-Bold.otf';

function createPDF(): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: '문서 제목',
      Author: '인쇄업 ERP',
      Creator: 'printing-erp'
    }
  });

  // 한글 폰트 등록
  doc.registerFont('Korean', FONT_PATH);
  doc.registerFont('Korean-Bold', FONT_BOLD_PATH);
  doc.font('Korean');

  return doc;
}
```

### 견적서 생성 예시

```typescript
interface QuotationData {
  quotationNo: string;
  date: Date;
  client: {
    name: string;
    businessNo: string;
    address: string;
    contact: string;
  };
  items: {
    name: string;
    spec: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  totalAmount: number;
  validUntil: Date;
}

async function generateQuotation(data: QuotationData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = createPDF();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // 헤더
    doc.font('Korean-Bold').fontSize(24).text('견 적 서', { align: 'center' });
    doc.moveDown();

    // 견적번호 & 날짜
    doc.font('Korean').fontSize(10);
    doc.text(`견적번호: ${data.quotationNo}`, { align: 'right' });
    doc.text(`견적일자: ${formatDate(data.date)}`, { align: 'right' });
    doc.moveDown();

    // 거래처 정보
    doc.font('Korean-Bold').fontSize(12).text('거래처 정보');
    doc.font('Korean').fontSize(10);
    doc.text(`상호: ${data.client.name}`);
    doc.text(`사업자번호: ${data.client.businessNo}`);
    doc.text(`주소: ${data.client.address}`);
    doc.text(`연락처: ${data.client.contact}`);
    doc.moveDown();

    // 품목 테이블
    drawTable(doc, data.items);
    doc.moveDown();

    // 합계
    doc.font('Korean-Bold').fontSize(14);
    doc.text(`합계금액: ${formatCurrency(data.totalAmount)}원`, { align: 'right' });

    // 유효기간
    doc.moveDown();
    doc.font('Korean').fontSize(9);
    doc.text(`※ 본 견적서는 ${formatDate(data.validUntil)}까지 유효합니다.`);

    doc.end();
  });
}

function drawTable(doc: PDFKit.PDFDocument, items: QuotationData['items']) {
  const startX = 50;
  let startY = doc.y;
  const colWidths = [200, 100, 60, 80, 80];
  const headers = ['품목명', '규격', '수량', '단가', '금액'];

  // 헤더
  doc.font('Korean-Bold').fontSize(9);
  let x = startX;
  headers.forEach((header, i) => {
    doc.text(header, x, startY, { width: colWidths[i], align: 'center' });
    x += colWidths[i];
  });

  startY += 20;
  doc.moveTo(startX, startY).lineTo(startX + 520, startY).stroke();

  // 데이터
  doc.font('Korean').fontSize(9);
  items.forEach((item) => {
    startY += 5;
    x = startX;
    doc.text(item.name, x, startY, { width: colWidths[0] });
    x += colWidths[0];
    doc.text(item.spec, x, startY, { width: colWidths[1], align: 'center' });
    x += colWidths[1];
    doc.text(item.quantity.toString(), x, startY, { width: colWidths[2], align: 'center' });
    x += colWidths[2];
    doc.text(formatCurrency(item.unitPrice), x, startY, { width: colWidths[3], align: 'right' });
    x += colWidths[3];
    doc.text(formatCurrency(item.amount), x, startY, { width: colWidths[4], align: 'right' });
    startY += 15;
  });

  doc.moveTo(startX, startY).lineTo(startX + 520, startY).stroke();
  doc.y = startY + 10;
}
```

## Puppeteer (HTML → PDF)

### 설정

```typescript
import puppeteer from 'puppeteer';

async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
```

### 주문서 HTML 템플릿

```typescript
function generateOrderHtml(order: Order): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');
        body { font-family: 'Noto Sans KR', sans-serif; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; }
        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .info-table th, .info-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .info-table th { background: #f5f5f5; width: 120px; }
        .items-table { width: 100%; border-collapse: collapse; }
        .items-table th { background: #333; color: white; padding: 10px; }
        .items-table td { border: 1px solid #ddd; padding: 8px; }
        .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">주 문 확 인 서</div>
        <div>주문번호: ${order.orderNo}</div>
      </div>
      <!-- 내용 계속... -->
    </body>
    </html>
  `;
}
```

## pdf-lib (PDF 편집)

### PDF 병합

```typescript
import { PDFDocument } from 'pdf-lib';

async function mergePDFs(pdfBuffers: Buffer[]): Promise<Buffer> {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const pdf = await PDFDocument.load(buffer);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }

  return Buffer.from(await mergedPdf.save());
}
```

### 워터마크 추가

```typescript
async function addWatermark(pdfBuffer: Buffer, text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 2 - 100,
      y: height / 2,
      size: 50,
      opacity: 0.3,
      rotate: degrees(-45)
    });
  }

  return Buffer.from(await pdfDoc.save());
}
```

## NestJS 컨트롤러 예시

```typescript
@Controller('pdf')
export class PdfController {
  constructor(private pdfService: PdfService) {}

  @Get('quotation/:id')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="quotation.pdf"')
  async downloadQuotation(@Param('id') id: string): Promise<StreamableFile> {
    const buffer = await this.pdfService.generateQuotation(id);
    return new StreamableFile(buffer);
  }

  @Get('order/:id')
  async getOrderPdf(
    @Param('id') id: string,
    @Query('inline') inline: boolean,
    @Res() res: Response
  ) {
    const buffer = await this.pdfService.generateOrder(id);
    const disposition = inline ? 'inline' : 'attachment';

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="order-${id}.pdf"`,
      'Content-Length': buffer.length
    });

    res.send(buffer);
  }
}
```

## 유틸리티 함수

```typescript
function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR');
}
```

## 체크리스트

PDF 기능 구현 시 확인사항:

- [ ] 한글 폰트 포함 (NotoSansKR 권장)
- [ ] 파일명 인코딩 처리 (한글 파일명)
- [ ] 메모리 관리 (대용량 PDF 스트리밍)
- [ ] 에러 처리 (폰트 없음, 템플릿 오류)
- [ ] 캐싱 고려 (동일 문서 재생성 방지)
- [ ] 인쇄 최적화 설정 (300 DPI)
