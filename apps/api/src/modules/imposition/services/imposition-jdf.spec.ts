import { ImpositionCalcService } from './imposition-calc.service';
import { ImpositionJdfService } from './imposition-jdf.service';

describe('ImpositionJdfService', () => {
  const calc = new ImpositionCalcService();
  const jdf = new ImpositionJdfService();

  it('압축앨범 JDF 에는 FoldingParams(F2-1) 이 포함된다', () => {
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
    const xml = jdf.build(r, {
      jobId: 'JOB1',
      jobName: 'test',
      sourcePdfFileName: 'src.pdf',
      sourcePdfTotalPages: 20,
      bindingType: 'compressed',
    });
    expect(xml).toContain('FoldCatalog="F2-1"');
    expect(xml).toContain('<FoldingParams');
    expect(xml).toContain('<LayoutPreparationParams');
    expect(xml).toContain('<Media');
    expect(xml).toContain('<CuttingParams');
    expect(xml).toContain('<RunList');
  });

  it('타카 JDF 에는 FoldingParams 가 없다', () => {
    const r = calc.calculate({
      productWidth: 150,
      productHeight: 200,
      pageCount: 10,
      bindingType: 'tack',
      bleed: 3,
      tackMargin: 12,
      tackEdge: 'left',
      sheetWidth: 330,
      sheetHeight: 482,
    });
    const xml = jdf.build(r, {
      jobId: 'JOB2',
      jobName: 'tack-test',
      sourcePdfFileName: 'src.pdf',
      sourcePdfTotalPages: 10,
      bindingType: 'tack',
    });
    expect(xml).not.toContain('FoldingParams');
    expect(xml).toContain('<CuttingParams');
  });

  it('Layout 의 PlacedObject Ord 는 0 부터 시작', () => {
    const r = calc.calculate({
      productWidth: 210,
      productHeight: 297,
      pageCount: 4,
      bindingType: 'flat',
      bleed: 3,
      sheetWidth: 330,
      sheetHeight: 482,
    });
    const xml = jdf.build(r, {
      jobId: 'JOB3',
      jobName: 't',
      sourcePdfFileName: 'src.pdf',
      sourcePdfTotalPages: 4,
      bindingType: 'flat',
    });
    expect(xml).toMatch(/Ord="0"/);
  });

  // ==================== v1.1 ====================
  it('v1.1 compressed Nup>=2: placement 별 CreaseLine MarkObject 포함', () => {
    const r = calc.calculate({
      productWidth: 148,
      productHeight: 210, // A5
      pageCount: 8,
      bindingType: 'compressed',
      bleed: 3,
      creaseWidth: 0,
      manualNup: 2,
      sheetWidth: 330,
      sheetHeight: 482,
    });
    const xml = jdf.build(r, {
      jobId: 'J_P2',
      jobName: 'pair-2up',
      sourcePdfFileName: 'src.pdf',
      sourcePdfTotalPages: 8,
      bindingType: 'compressed',
    });
    // FoldingParams 포함
    expect(xml).toContain('FoldCatalog="F2-1"');
    // CreaseLine MarkObject (최소 1개 이상)
    expect(xml).toMatch(/MarkType="CreaseLine"/);
  });

  it('v1.1 compressed Nup=1 (테이핑): FoldingParams 없음', () => {
    const r = calc.calculate({
      productWidth: 148,
      productHeight: 210,
      pageCount: 5,
      bindingType: 'compressed',
      bleed: 3,
      creaseWidth: 0,
      manualNup: 1,
      sheetWidth: 330,
      sheetHeight: 482,
    });
    const xml = jdf.build(r, {
      jobId: 'J_S1',
      jobName: 'single-1up',
      sourcePdfFileName: 'src.pdf',
      sourcePdfTotalPages: 5,
      bindingType: 'compressed',
    });
    expect(xml).not.toContain('FoldingParams');
    expect(xml).not.toContain('MarkType="CreaseLine"');
  });

  it('v1.1 perfect: FoldingParams 없음 + CreaseLine 없음', () => {
    const r = calc.calculate({
      productWidth: 148,
      productHeight: 210,
      pageCount: 12,
      bindingType: 'perfect',
      bleed: 3,
      sheetWidth: 330,
      sheetHeight: 482,
    });
    const xml = jdf.build(r, {
      jobId: 'J_PERF',
      jobName: 'perfect',
      sourcePdfFileName: 'src.pdf',
      sourcePdfTotalPages: 12,
      bindingType: 'perfect',
    });
    expect(xml).not.toContain('FoldingParams');
    expect(xml).not.toContain('MarkType="CreaseLine"');
    // 기본 리소스는 포함
    expect(xml).toContain('<Media');
    expect(xml).toContain('<LayoutPreparationParams');
    expect(xml).toContain('<CuttingParams');
    expect(xml).toContain('<RunList');
  });

  it('스냅샷: 간단 시나리오 JDF 구조', () => {
    const r = calc.calculate({
      productWidth: 100,
      productHeight: 150,
      pageCount: 2,
      bindingType: 'compressed',
      bleed: 3,
      creaseWidth: 0,
      sheetWidth: 330,
      sheetHeight: 482,
    });
    const xml = jdf.build(r, {
      jobId: 'SNAP',
      jobName: 'snap',
      sourcePdfFileName: 'src.pdf',
      sourcePdfTotalPages: 2,
      bindingType: 'compressed',
    });
    // 구조적 핵심만 스냅샷 (좌표 변동으로 flaky 방지)
    const structural = xml
      .split('\n')
      .filter((ln) =>
        /^\s*<(JDF|ResourcePool|ResourceLinkPool|Media|LayoutPreparationParams|Layout|Signature|Sheet|Surface|CuttingParams|FoldingParams|RunList|LayoutElement)\b/.test(ln),
      )
      .map((ln) => ln.replace(/\s+(CTM|BlockTrf|Dimension|Position|ClipBox|Pages|BlockSize)="[^"]*"/g, ''))
      .join('\n');
    expect(structural).toMatchSnapshot();
  });
});
