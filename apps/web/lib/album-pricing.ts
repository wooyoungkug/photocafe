/**
 * 가격 포맷팅 유틸리티
 * 모든 가격 계산은 DB에서 조회 (하드코딩 금지)
 */

/**
 * 가격 포맷팅
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR');
}
