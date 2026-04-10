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

## 인쇄용 PDF 변환 시스템 (PrintPdfModule)

2026-04-10 구축 완료. 출력대기 주문의 JPG → 인쇄용 PDF 변환 (재단여백 + 인덱스 + Nup).

### 모듈 구조

```
apps/api/src/modules/print-pdf/
  print-pdf.module.ts                          # NestJS 모듈
  controllers/print-pdf.controller.ts          # API 엔드포인트
  services/
    print-pdf.service.ts                       # 오케스트레이션 + Job 관리
    print-pdf-renderer.service.ts              # PDFKit 렌더링 (이미지+인덱스+재단선)
    print-pdf-layout.service.ts                # 1up/Nup 페이지 크기 계산
  dto/print-pdf.dto.ts                         # DTO 정의

apps/web/app/(dashboard)/orders/print-queue/
  page.tsx                                     # 메인 페이지
  components/
    PrintQueueTable.tsx                        # 출력대기 테이블 (체크박스 선택)
    PdfConvertDialog.tsx                       # 변환 옵션 (인덱스 10개 ON/OFF)
    PdfProgressTracker.tsx                     # 진행상태 + 다운로드

apps/web/hooks/use-print-pdf.ts                # TanStack Query 훅
```

### API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/print-pdf/queue` | 출력대기 주문목록 (currentProcess='print_waiting') |
| GET | `/print-pdf/queue/:orderItemId` | 항목 상세 (파일목록 포함) |
| POST | `/print-pdf/generate` | PDF 생성 요청 (비동기 Job) |
| GET | `/print-pdf/jobs/:jobId/status` | 진행상태 |
| GET | `/print-pdf/jobs/:jobId/download` | PDF 다운로드 (스트리밍) |

### PDF 페이지 레이아웃

```
+--------------------------------------------------+
| 인덱스 영역 (8mm) - 재단 후 잘려나감               |
| 2026-04-10 15:30 | ORD-260410-001 | 스마일스튜디오 |
+==================================================+ ← crop mark
| bleed top (3mm)                                   |
+--------------------------------------------------+
|           원본 이미지 (trim 영역, 무손실 100%)      |
+--------------------------------------------------+
| bleed bottom (3mm)                                |
+==================================================+ ← crop mark
```

### 핵심 기술

- **화질 무손실**: PDFKit이 JPEG 원본 바이트스트림을 그대로 임베딩 (`compress: false`)
- **인덱스 10항목**: 출력날짜, 날짜+시간, 주문번호, 스튜디오명, 규격, 용지명, 페이지정보, 인디고도수(4도/6도), 제본방법, Nup
- **재단선**: ISO 12647 L자형 crop mark (0.25pt 헤어라인, 5mm 길이, 1mm offset)
- **Nup 지원**: 1up/2up/4up/6up/9up, 용지 원판 크기 기준 셀 배치
- **한글 폰트**: NanumGothic.ttf (`apps/api/fonts/`), 6pt

### 페이지 크기 계산식

```
trimW  = Specification.jdfTrimWidth  || widthMm
trimH  = Specification.jdfTrimHeight || heightMm
bleed  = jdfBleed* (기본 3mm)
INDEX_HEIGHT = 8mm
MM_TO_PT = 72 / 25.4

pageW_pt = (trimW + bleedL + bleedR) * MM_TO_PT
pageH_pt = (trimH + bleedT + bleedB + INDEX_HEIGHT) * MM_TO_PT
```

### 데이터 소스 (인덱스 항목)

| 항목 | 소스 |
|------|------|
| 규격 | OrderItem.size / Specification 모델 |
| 용지명 | OrderItem.paper / Paper.name |
| 인디고도수 | ColorIntent.displayNameKo (colorIntentId로 조회) |
| 제본방법 | OrderItem.bindingType |
| Nup | Specification.nup |

### 저장 경로

```
uploads/orders/{YYYY}/{MM}/{DD}/{company}/{orderNumber}/print-pdf/
  {productionNumber}_print_{timestamp}.pdf
```

### GeneratePrintPdfDto 주요 필드

```typescript
{
  orderItemIds: string[];       // 변환할 주문항목 ID
  indexOptions: IndexOptionsDto; // 10개 항목 개별 ON/OFF
  includeBleed: boolean;        // 재단여백 포함
  includeCropMarks: boolean;    // 재단선 표시
  nupOverride?: string;         // Nup 수동 지정 (예: "2up")
}
```

### 비동기 Job 방식

1. `POST /print-pdf/generate` → jobId 반환
2. 프론트에서 `GET /jobs/:jobId/status` 2초 폴링
3. 완료 시 `GET /jobs/:jobId/download`로 다운로드
4. Job 상태는 메모리(Map) 저장 (서버 재시작 시 초기화)

## 체크리스트

PDF 기능 구현 시 확인사항:

- [ ] 한글 폰트 포함 (NanumGothic.ttf - `apps/api/fonts/`)
- [ ] 파일명 인코딩 처리 (한글 파일명)
- [ ] 메모리 관리 (대용량 PDF 스트리밍)
- [ ] 에러 처리 (폰트 없음, 템플릿 오류)
- [ ] 캐싱 고려 (동일 문서 재생성 방지)
- [ ] 인쇄 최적화 설정 (300 DPI)
- [ ] 인쇄용 PDF: 무손실 이미지 임베딩 (sharp 리사이즈 금지)
- [ ] crop mark: ISO 12647 표준 준수
- [ ] Nup 배치 시 셀 간 gutter 확보
