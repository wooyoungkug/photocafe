import { ImpositionMatcherService } from './imposition-matcher.service';

// 순수 `matches()` 메서드만 테스트 (PrismaService 의존성 없이).
describe('ImpositionMatcherService.matches', () => {
  // prisma 주입은 사용되지 않으므로 any 로 우회.
  const svc = new ImpositionMatcherService({} as any);

  const rule = (patch: Partial<{
    productSize: string | null;
    bindingType: string | null;
    minPages: number | null;
    maxPages: number | null;
  }>) => ({
    productSize: null,
    bindingType: null,
    minPages: null,
    maxPages: null,
    ...patch,
  });

  describe('정확 매칭', () => {
    it('productSize + bindingType 이 정확 일치하면 true', () => {
      const r = rule({ productSize: 'A4', bindingType: 'compressed' });
      expect(
        svc.matches(r, { productSize: 'A4', bindingType: 'compressed', pageCount: 24 }),
      ).toBe(true);
    });

    it('productSize 대소문자 무시', () => {
      const r = rule({ productSize: 'A4' });
      expect(svc.matches(r, { productSize: 'a4' })).toBe(true);
    });

    it('productSize 가 다르면 false', () => {
      const r = rule({ productSize: 'A4' });
      expect(svc.matches(r, { productSize: 'A5' })).toBe(false);
    });

    it('bindingType 이 다르면 false', () => {
      const r = rule({ bindingType: 'compressed' });
      expect(svc.matches(r, { bindingType: 'perfect' })).toBe(false);
    });
  });

  describe('null = any', () => {
    it('rule.productSize 가 null 이면 모든 productSize 매칭', () => {
      const r = rule({ productSize: null, bindingType: 'compressed' });
      expect(
        svc.matches(r, { productSize: 'A4', bindingType: 'compressed' }),
      ).toBe(true);
      expect(
        svc.matches(r, { productSize: 'A5', bindingType: 'compressed' }),
      ).toBe(true);
    });

    it('rule.bindingType 이 null 이면 모든 bindingType 매칭', () => {
      const r = rule({ productSize: 'A4', bindingType: null });
      expect(
        svc.matches(r, { productSize: 'A4', bindingType: 'compressed' }),
      ).toBe(true);
      expect(svc.matches(r, { productSize: 'A4', bindingType: 'tack' })).toBe(true);
    });

    it('rule 에 productSize 가 있는데 입력이 없으면 false', () => {
      const r = rule({ productSize: 'A4' });
      expect(svc.matches(r, { productSize: undefined })).toBe(false);
    });
  });

  describe('페이지 범위', () => {
    it('minPages / maxPages 범위 포함', () => {
      const r = rule({ minPages: 10, maxPages: 30 });
      expect(svc.matches(r, { pageCount: 20 })).toBe(true);
      expect(svc.matches(r, { pageCount: 10 })).toBe(true);
      expect(svc.matches(r, { pageCount: 30 })).toBe(true);
      expect(svc.matches(r, { pageCount: 9 })).toBe(false);
      expect(svc.matches(r, { pageCount: 31 })).toBe(false);
    });

    it('minPages 만 있으면 그 이상은 매칭', () => {
      const r = rule({ minPages: 100 });
      expect(svc.matches(r, { pageCount: 200 })).toBe(true);
      expect(svc.matches(r, { pageCount: 50 })).toBe(false);
    });

    it('maxPages 만 있으면 그 이하만 매칭', () => {
      const r = rule({ maxPages: 50 });
      expect(svc.matches(r, { pageCount: 10 })).toBe(true);
      expect(svc.matches(r, { pageCount: 100 })).toBe(false);
    });

    it('범위 모두 null 이면 페이지 무제한', () => {
      const r = rule({ minPages: null, maxPages: null });
      expect(svc.matches(r, { pageCount: 1 })).toBe(true);
      expect(svc.matches(r, { pageCount: 9999 })).toBe(true);
    });
  });

  describe('복합 조건', () => {
    it('모든 조건 AND', () => {
      const r = rule({
        productSize: 'A5',
        bindingType: 'compressed',
        minPages: 10,
        maxPages: 100,
      });
      expect(
        svc.matches(r, { productSize: 'A5', bindingType: 'compressed', pageCount: 50 }),
      ).toBe(true);
      // bindingType 만 틀려도 false
      expect(
        svc.matches(r, { productSize: 'A5', bindingType: 'tack', pageCount: 50 }),
      ).toBe(false);
      // 페이지 범위 벗어나면 false
      expect(
        svc.matches(r, { productSize: 'A5', bindingType: 'compressed', pageCount: 200 }),
      ).toBe(false);
    });
  });
});
