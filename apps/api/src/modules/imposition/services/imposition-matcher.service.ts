import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface MatchInput {
  /** 'A4' | 'A5' | '210x297' 등 */
  productSize?: string | null;
  bindingType?: 'compressed' | 'tack' | 'perfect' | 'flat' | null;
  pageCount?: number | null;
}

/**
 * 주문 특성(규격·제본방식·페이지수)을 ImpositionRule 목록과 대조해
 * 적합한 ImpositionPreset 을 찾아주는 매처.
 *
 * 매칭 알고리즘:
 *  1. isActive=true 규칙만 대상.
 *  2. productSize 는 정확 일치(null=any).
 *  3. bindingType 은 정확 일치(null=any).
 *  4. pageCount 는 minPages..maxPages 범위 (null=무제한).
 *  5. priority 내림차순 정렬 후 첫 매칭 반환.
 *  6. 매칭 없으면 null 반환 (호출측에서 fallback 처리).
 */
@Injectable()
export class ImpositionMatcherService {
  constructor(private readonly prisma: PrismaService) {}

  async findPreset(input: MatchInput) {
    const rules = await (this.prisma as any).impositionRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      include: { preset: true },
    });

    for (const rule of rules) {
      if (!this.matches(rule, input)) continue;
      return { preset: rule.preset, rule };
    }
    return null;
  }

  /** 규칙 하나가 주어진 입력에 매칭되는지 순수 함수 (테스트 용이) */
  matches(
    rule: {
      productSize: string | null;
      bindingType: string | null;
      minPages: number | null;
      maxPages: number | null;
    },
    input: MatchInput,
  ): boolean {
    if (rule.productSize) {
      if (!input.productSize) return false;
      if (
        rule.productSize.toLowerCase() !== input.productSize.toLowerCase()
      ) {
        return false;
      }
    }
    if (rule.bindingType) {
      if (!input.bindingType) return false;
      if (rule.bindingType !== input.bindingType) return false;
    }
    if (rule.minPages != null && (input.pageCount ?? 0) < rule.minPages) {
      return false;
    }
    if (rule.maxPages != null && (input.pageCount ?? 0) > rule.maxPages) {
      return false;
    }
    return true;
  }
}
