import { PDFDocument } from 'pdf-lib';
import { ImpositionCalcService } from './imposition-calc.service';
import { ImpositionPdfService } from './imposition-pdf.service';

describe('ImpositionPdfService', () => {
  const calc = new ImpositionCalcService();
  const pdf = new ImpositionPdfService();

  it('시트 수만큼 PDF 페이지 생성', async () => {
    const r = calc.calculate({
      productWidth: 210,
      productHeight: 297,
      pageCount: 20,
      bindingType: 'compressed',
      bleed: 3,
      creaseWidth: 0,
      sheetWidth: 330,
      sheetHeight: 482,
    });
    const bytes = await pdf.build(r, {});
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(r.sheetCount);
  });

  it('PDF 페이지 크기가 시트 크기와 일치 (pt)', async () => {
    const r = calc.calculate({
      productWidth: 150,
      productHeight: 200,
      pageCount: 4,
      bindingType: 'flat',
      bleed: 3,
      sheetWidth: 330,
      sheetHeight: 482,
    });
    const bytes = await pdf.build(r, {});
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);
    const expectedW = 330 * (72 / 25.4);
    const expectedH = 482 * (72 / 25.4);
    expect(Math.abs(page.getWidth() - expectedW)).toBeLessThan(0.5);
    expect(Math.abs(page.getHeight() - expectedH)).toBeLessThan(0.5);
  });

  it('원본 PDF 없이도 정상 생성 (빈 박스)', async () => {
    const r = calc.calculate({
      productWidth: 100,
      productHeight: 100,
      pageCount: 8,
      bindingType: 'tack',
      bleed: 3,
      tackMargin: 12,
      tackEdge: 'left',
      sheetWidth: 330,
      sheetHeight: 482,
    });
    const bytes = await pdf.build(r, { sourcePdfPath: null });
    expect(bytes.length).toBeGreaterThan(100);
  });
});
