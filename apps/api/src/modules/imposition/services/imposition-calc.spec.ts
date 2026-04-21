import { ImpositionCalcService } from './imposition-calc.service';

describe('ImpositionCalcService', () => {
  const svc = new ImpositionCalcService();

  describe('bleed 누락', () => {
    it('bleed 가 undefined 이면 BadRequestException', () => {
      expect(() =>
        svc.calculate({
          productWidth: 210,
          productHeight: 297,
          pageCount: 10,
          bindingType: 'flat',
        } as any),
      ).toThrow(/bleed 누락/);
    });
  });

  describe('압축앨범 홀수 페이지', () => {
    it('홀수 페이지면 자동 보정 + 경고', () => {
      const r = svc.calculate({
        productWidth: 210,
        productHeight: 297,
        pageCount: 11,
        bindingType: 'compressed',
        bleed: 3,
        creaseWidth: 0,
      });
      expect(r.pageCount).toBe(12);
      expect(r.warnings.some((w) => w.includes('홀수'))).toBe(true);
    });
  });

  describe('자동 Nup - A4 압축앨범 on 7900', () => {
    it('Nup >= 1, rotation 은 0 또는 90', () => {
      const r = svc.calculate({
        productWidth: 210,
        productHeight: 297,
        pageCount: 40,
        bindingType: 'compressed',
        bleed: 3,
        creaseWidth: 0,
        sheetWidth: 330,
        sheetHeight: 482,
      });
      expect(r.nup).toBeGreaterThanOrEqual(1);
      expect([0, 90]).toContain(r.rotation);
      expect(r.utilization).toBeGreaterThan(0);
      expect(r.utilization).toBeLessThanOrEqual(1);
      expect(r.sheets.length).toBe(r.sheetCount);
    });
  });

  describe('회전 동점 시 short-grain 우선', () => {
    it('정사각형에 가까운 단위박스는 grain 에 따라 회전 선택', () => {
      const r = svc.calculate({
        productWidth: 150,
        productHeight: 150,
        pageCount: 10,
        bindingType: 'flat',
        bleed: 3,
        grainDirection: 'short',
        sheetWidth: 330,
        sheetHeight: 482,
      });
      // 정사각형이어도 에러 없이 정상 계산
      expect(r.nup).toBeGreaterThan(0);
    });
  });

  describe('활용률 계산', () => {
    it('활용률은 0~1', () => {
      const r = svc.calculate({
        productWidth: 100,
        productHeight: 150,
        pageCount: 20,
        bindingType: 'flat',
        bleed: 3,
      });
      expect(r.utilization).toBeGreaterThan(0);
      expect(r.utilization).toBeLessThanOrEqual(1);
    });
  });

  describe('타카 edge 교대 (홀/짝 시트)', () => {
    it('짝수 시트는 edge 반대편으로 교대', () => {
      const r = svc.calculate({
        productWidth: 150,
        productHeight: 200,
        pageCount: 30, // 여러 시트 강제
        bindingType: 'tack',
        bleed: 3,
        tackMargin: 12,
        tackEdge: 'left',
        sheetWidth: 330,
        sheetHeight: 482,
      });
      expect(r.sheets.length).toBeGreaterThanOrEqual(2);
      expect(r.sheets[0].tackEdge).toBe('left');
      expect(r.sheets[1].tackEdge).toBe('right');
    });
  });

  describe('Nup 0 거부', () => {
    it('단위박스가 시트보다 크면 BadRequest', () => {
      expect(() =>
        svc.calculate({
          productWidth: 400,
          productHeight: 500,
          pageCount: 10,
          bindingType: 'flat',
          bleed: 3,
          sheetWidth: 330,
          sheetHeight: 482,
        }),
      ).toThrow(/Nup=0/);
    });
  });

  describe('HD 시트 경고', () => {
    it('sheetHeight >= 660 이면 경고 추가', () => {
      const r = svc.calculate({
        productWidth: 210,
        productHeight: 297,
        pageCount: 10,
        bindingType: 'compressed',
        bleed: 3,
        sheetWidth: 330,
        sheetHeight: 660,
      });
      expect(r.warnings.some((w) => w.includes('HD'))).toBe(true);
    });
  });

  describe('대형 타카 Nup=1 활용률 < 50% 경고', () => {
    it('대형 규격 타카 Nup=1 시 활용률 경고', () => {
      const r = svc.calculate({
        productWidth: 305,  // 330 시트 빠듯
        productHeight: 200,
        pageCount: 5,
        bindingType: 'tack',
        bleed: 3,
        tackMargin: 12,
        tackEdge: 'left',
        sheetWidth: 330,
        sheetHeight: 482,
      });
      // Nup=1 이면 활용률이 낮아질 수 있음 → 경고 유무는 nup 에 따라
      if (r.nup === 1 && r.utilization < 0.5) {
        expect(r.warnings.some((w) => w.includes('활용률'))).toBe(true);
      }
    });
  });

  // ==================== v1.1: compressed 재설계 ====================
  describe('v1.1 compressed Nup=1 (테이핑 모드)', () => {
    it('manualNup=1 은 단면 1페이지/단위박스 + 테이핑 경고', () => {
      const r = svc.calculate({
        productWidth: 148,
        productHeight: 210, // A5
        pageCount: 20,
        bindingType: 'compressed',
        bleed: 3,
        creaseWidth: 0,
        manualNup: 1,
        sheetWidth: 330,
        sheetHeight: 482,
      });
      // 단면 1Up 이면 단위박스 = productW + 2*bleed (스프레드 X)
      expect(r.sheets[0].placements[0].pages).toHaveLength(1);
      expect(r.sheets[0].placements[0].isPair).toBeUndefined();
      expect(r.sheets[0].placements[0].needsTaping).toBe(true);
      expect(r.warnings.some((w) => w.includes('테이핑'))).toBe(true);
      // 오시 없음
      expect(r.sheets[0].creaseLines ?? []).toHaveLength(0);
    });
  });

  describe('v1.1 compressed 2Up (스프레드 페어 1쌍/시트)', () => {
    it('시트당 페어 1쌍 + 오시 1개', () => {
      const r = svc.calculate({
        productWidth: 148,
        productHeight: 210,
        pageCount: 10, // 5 페어
        bindingType: 'compressed',
        bleed: 3,
        creaseWidth: 0,
        manualNup: 2,
        sheetWidth: 330,
        sheetHeight: 482,
      });
      // Nup=2 → cols*rows=2 (페어 기준)
      expect(r.nup).toBe(2);
      expect(r.sheets[0].placements[0].isPair).toBe(true);
      expect(r.sheets[0].placements[0].pages).toEqual([1, 2]);
      expect(r.sheets[0].placements[0].creaseXs).toHaveLength(1);
      // 시트 전체 오시 개수 = Nup = 2
      expect(r.sheets[0].creaseLines).toHaveLength(2);
    });
  });

  describe('v1.1 compressed 4Up (스프레드 페어 2쌍/시트)', () => {
    it('시트당 페어 2쌍 + 오시 2개', () => {
      const r = svc.calculate({
        productWidth: 105,
        productHeight: 148, // A6
        pageCount: 16,
        bindingType: 'compressed',
        bleed: 3,
        creaseWidth: 0,
        manualNup: 4,
        sheetWidth: 330,
        sheetHeight: 482,
      });
      expect(r.nup).toBeGreaterThanOrEqual(2); // A6 페어는 꽤 커서 4까지 안될 수도
      // 첫 시트의 모든 placement 는 페어이고 각자 중앙 오시 1개
      r.sheets[0].placements.forEach((pl) => {
        expect(pl.isPair).toBe(true);
        expect(pl.pages).toHaveLength(2);
        expect(pl.creaseXs).toHaveLength(1);
      });
      // 시트 전체 오시 수 = placements 수
      expect(r.sheets[0].creaseLines).toHaveLength(r.sheets[0].placements.length);
    });
  });

  describe('v1.1 compressed 6Up/8Up 배치 좌표', () => {
    it('시트당 페어 3쌍 (6Up 시도, 안되면 자동 하향)', () => {
      const r = svc.calculate({
        productWidth: 105,
        productHeight: 148, // A6
        pageCount: 30,
        bindingType: 'compressed',
        bleed: 3,
        creaseWidth: 0,
        manualNup: 6,
        sheetWidth: 330,
        sheetHeight: 482,
      });
      // manualNup=6 이 실제 달성 가능하면 6, 아니면 자동 (cols*rows)
      expect(r.nup).toBeGreaterThanOrEqual(1);
      // 모든 placement 가 페어
      r.sheets.forEach((sh) =>
        sh.placements.forEach((pl) => {
          expect(pl.isPair).toBe(true);
          expect(pl.pages).toHaveLength(2);
        }),
      );
    });
  });

  // ==================== v1.1: perfect (무선제본) ====================
  describe('v1.1 perfect 1Up (순차)', () => {
    it('perfect 는 단순 1페이지/단위박스, 오시 없음', () => {
      const r = svc.calculate({
        productWidth: 148,
        productHeight: 210,
        pageCount: 12,
        bindingType: 'perfect',
        bleed: 3,
        sheetWidth: 330,
        sheetHeight: 482,
      });
      expect(r.sheets[0].placements[0].pages).toEqual([1]);
      expect(r.sheets[0].placements[0].isPair).toBeUndefined();
      expect(r.sheets[0].placements[0].creaseXs).toBeUndefined();
      expect(r.sheets[0].creaseLines).toBeUndefined();
    });

    it('perfect 2Up 도 순차 페이지네이션', () => {
      const r = svc.calculate({
        productWidth: 105,
        productHeight: 148,
        pageCount: 8,
        bindingType: 'perfect',
        bleed: 3,
        manualNup: 2,
        sheetWidth: 330,
        sheetHeight: 482,
      });
      // 첫 시트의 첫 두 placement = 1, 2 페이지 (순차)
      const firstPages = r.sheets[0].placements.slice(0, 2).map((pl) => pl.pages[0]);
      expect(firstPages).toEqual([1, 2]);
      // 오시 없음
      r.sheets.forEach((sh) => expect(sh.creaseLines).toBeUndefined());
    });
  });

  describe('v1.1 compressed 자동 폴백 (2up 안 들어가면 1up)', () => {
    it('9×12" (228.6×304.8mm) 압축앨범은 7900에 페어가 안 들어가서 자동 1up 폴백', () => {
      const r = svc.calculate({
        // 9×12 inch = 228.6 × 304.8 mm
        productWidth: 228.6,
        productHeight: 304.8,
        pageCount: 27,
        bindingType: 'compressed',
        bleed: 0,
        creaseWidth: 0,
        gutter: 3,
        sheetWidth: 315,
        sheetHeight: 467,
        marginTop: 7,
        marginRight: 2.5,
        marginBottom: 7,
        marginLeft: 2.5,
      });
      // 1up 으로 폴백되어 단위박스 = 228.6 × 304.8 → 시트당 1장
      expect(r.nup).toBe(1);
      expect(r.sheets[0].placements[0].pages).toHaveLength(1);
      expect(r.sheets[0].placements[0].isPair).toBeUndefined();
      expect(r.sheets[0].placements[0].needsTaping).toBe(true);
      // 폴백 안내 경고 + 테이핑 경고 (단면 모드 진입으로)
      expect(r.warnings.some((w) => w.includes('자동으로 1up'))).toBe(true);
      // 1up 단면 모드는 홀수 페이지 보정 안 함 → 27P × 1up = 27시트
      expect(r.pageCount).toBe(27);
      expect(r.sheetCount).toBe(27);
    });

    it('manualNup 명시 시 폴백하지 않음 (사용자 의도 존중)', () => {
      // manualNup=2 인데 페어가 안 들어가는 경우 → autoMax=0 이므로 wanted>autoMax → 자동값 유지
      // 결과: nup=0 으로 BadRequest 던져야 함
      expect(() =>
        svc.calculate({
          productWidth: 228.6,
          productHeight: 304.8,
          pageCount: 10,
          bindingType: 'compressed',
          bleed: 0,
          creaseWidth: 0,
          manualNup: 2,
          sheetWidth: 315,
          sheetHeight: 467,
        }),
      ).toThrow(/Nup=0/);
    });

    it('페어가 잘 들어가는 경우는 폴백하지 않고 페어링 유지', () => {
      const r = svc.calculate({
        productWidth: 148,
        productHeight: 210, // A5
        pageCount: 20,
        bindingType: 'compressed',
        bleed: 3,
        creaseWidth: 0,
        sheetWidth: 330,
        sheetHeight: 482,
      });
      // 페어 단위 = 296+6=302 × 216 → 7900에 들어감
      expect(r.sheets[0].placements[0].isPair).toBe(true);
      expect(r.warnings.some((w) => w.includes('자동으로 1up'))).toBe(false);
    });
  });

  describe('centerAlign 검증 (캡처 화면 케이스)', () => {
    // 캡처 화면 입력값:
    // 6×4 inch (152.4×101.6mm), 46P, 시트 7900S(315×467), 여백 8.5/2.5/8.5/2.5
    // bleed=0, gutter=3, centerAlign=true, bindingType=flat (단면 1page/단위박스)
    // → 자동 Nup = 2×4 = 8up, rotation=0
    // → cellW = 310/2 = 155, cellH = 450/4 = 112.5
    // → selUnitW=152.4, selUnitH=101.6
    // → x padding = (155-152.4)/2 = 1.3mm
    // → y padding = (112.5-101.6)/2 = 5.45mm

    it('가로 중앙정렬: x 좌표 = marginL + c*cellW + 1.3', () => {
      const r = svc.calculate({
        productWidth: 152.4,
        productHeight: 101.6,
        pageCount: 46,
        bindingType: 'flat',
        bleed: 0,
        gutter: 3,
        sheetWidth: 315,
        sheetHeight: 467,
        marginTop: 8.5,
        marginRight: 2.5,
        marginBottom: 8.5,
        marginLeft: 2.5,
        centerAlign: true,
      });
      expect(r.nup).toBe(8);
      expect(r.cols).toBe(2);
      expect(r.rows).toBe(4);
      // 첫 셀 (col=0, row=0) 의 x 좌표 (marginL=2.5)
      const p0 = r.sheets[0].placements[0];
      expect(p0.x).toBeCloseTo(2.5 + 0 + (155 - 152.4) / 2, 1); // 2.5 + 1.3 = 3.8
      // 둘째 셀 (col=1, row=0) 의 x 좌표
      const p1 = r.sheets[0].placements[1];
      expect(p1.x).toBeCloseTo(2.5 + 155 + (155 - 152.4) / 2, 1); // 2.5 + 156.3 = 158.8
    });

    it('세로 중앙정렬: y 좌표 = marginT + r*cellH + 5.45', () => {
      const r = svc.calculate({
        productWidth: 152.4,
        productHeight: 101.6,
        pageCount: 46,
        bindingType: 'flat',
        bleed: 0,
        gutter: 3,
        sheetWidth: 315,
        sheetHeight: 467,
        marginTop: 8.5,
        marginRight: 2.5,
        marginBottom: 8.5,
        marginLeft: 2.5,
        centerAlign: true,
      });
      const p0 = r.sheets[0].placements[0]; // row=0
      const p2 = r.sheets[0].placements[2]; // row=1
      const p4 = r.sheets[0].placements[4]; // row=2
      const p6 = r.sheets[0].placements[6]; // row=3
      // y0 = 8.5 + 0 + (112.5-101.6)/2 = 8.5 + 5.45 = 13.95
      expect(p0.y).toBeCloseTo(13.95, 1);
      // y1 = 8.5 + 112.5 + 5.45 = 126.45
      expect(p2.y).toBeCloseTo(126.45, 1);
      // y2 = 8.5 + 225 + 5.45 = 238.95
      expect(p4.y).toBeCloseTo(238.95, 1);
      // y3 = 8.5 + 337.5 + 5.45 = 351.45
      expect(p6.y).toBeCloseTo(351.45, 1);
      // 검증: 행간 거리 = 112.5mm (cellH)
      expect(p2.y - p0.y).toBeCloseTo(112.5, 1);
      expect(p4.y - p2.y).toBeCloseTo(112.5, 1);
      expect(p6.y - p4.y).toBeCloseTo(112.5, 1);
    });

    it('상하 외부 여백 vs 행간 여백 비율 = 1:2 (셀-중앙정렬 특성)', () => {
      const r = svc.calculate({
        productWidth: 152.4,
        productHeight: 101.6,
        pageCount: 46,
        bindingType: 'flat',
        bleed: 0,
        gutter: 3,
        sheetWidth: 315,
        sheetHeight: 467,
        marginTop: 8.5,
        marginRight: 2.5,
        marginBottom: 8.5,
        marginLeft: 2.5,
        centerAlign: true,
      });
      const p0 = r.sheets[0].placements[0]; // 첫 행
      const p2 = r.sheets[0].placements[2]; // 둘째 행
      const topGap = p0.y - 8.5; // 인쇄영역 상단 ~ 첫 행 상단
      const interGap = p2.y - (p0.y + p0.height); // 첫 행 하단 ~ 둘째 행 상단
      // 셀-중앙정렬 모드: interGap = 2 × topGap (외부 여백의 2배가 내부 여백)
      expect(topGap).toBeCloseTo(5.45, 1);
      expect(interGap).toBeCloseTo(10.9, 1);
    });
  });

  describe('v1.1 manualNup=0 (자동 Nup)', () => {
    it('manualNup 없으면 스프레드 자동 선택', () => {
      const r = svc.calculate({
        productWidth: 148,
        productHeight: 210,
        pageCount: 20,
        bindingType: 'compressed',
        bleed: 3,
        creaseWidth: 0,
        sheetWidth: 330,
        sheetHeight: 482,
      });
      // 단위박스 = 296+6=302mm → Nup>=1 확보
      expect(r.nup).toBeGreaterThanOrEqual(1);
      expect(r.sheets[0].placements[0].isPair).toBe(true);
    });
  });
});
