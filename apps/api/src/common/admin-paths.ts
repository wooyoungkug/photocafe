/**
 * 관리자(staff) 경로 단일 정의 — 백엔드 미러.
 *
 * 프런트엔드 [admin-paths.ts](../../../web/lib/admin-paths.ts) 의 STAFF_CONTEXT_PATHS 와
 * 동일 목록을 유지해야 한다. 새 staff 경로 추가 시 양쪽을 함께 업데이트할 것.
 *
 * 사용처: jwt.strategy.ts 의 Referer 폴백 검사 (양쪽 쿠키가 모두 있고 X-Auth-Context
 * 헤더가 없을 때 어느 쿠키를 쓸지 결정).
 */

export const STAFF_CONTEXT_PATHS: readonly string[] = [
  '/dashboard',
  '/admin',
  '/admin-login',
  '/company',
  '/product',
  '/products',
  '/order',
  '/orders',
  '/production',
  '/pricing',
  '/schedule',
  '/master',
  '/accounting',
  '/cs',
  '/settings',
  '/statistics',
  '/shooting',
  '/hr-committee',
  '/leave',
  '/analytics',
  '/impositions',
  '/delivery',
  '/basic-info',
  '/editing',
  '/half-products',
  '/image-management',
  '/notifications',
] as const;

/** Referer URL 또는 path 가 staff 컨텍스트 경로를 포함하는지 검사. */
export function isStaffContextReferer(referer: string | undefined | null): boolean {
  if (!referer) return false;
  // /dashboard, /admin-login 등 prefix 매치 — referer 는 풀 URL 일 수도, path 일 수도 있다.
  return STAFF_CONTEXT_PATHS.some((prefix) => referer.includes(prefix));
}
