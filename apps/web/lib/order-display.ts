/** API·로컬 주문 객체 공통 (필드만 맞으면 됨) */
export type OrderAmountDisplayInput = {
  status?: string | null;
  currentProcess?: string | null;
  finalAmount?: unknown;
};

/** 취소 주문: status + 공정값 불일치(레거시) 모두 반영 */
export function isOrderCancelled(order: OrderAmountDisplayInput): boolean {
  const st = (order.status || '').toLowerCase();
  if (st === 'cancelled') return true;
  return order.currentProcess === 'order_cancelled';
}

/** 목록·집계용: 취소 주문은 항상 0원으로 표시 */
export function displayFinalAmount(order: OrderAmountDisplayInput): number {
  if (isOrderCancelled(order)) return 0;
  return Math.round(Number(order.finalAmount)) || 0;
}
