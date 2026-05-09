/**
 * 관리자(staff) 경로 단일 정의 (Single Source of Truth).
 *
 * 두 가지 개념을 분리:
 *
 *   - STAFF_CONTEXT_PATHS  : staff 세션 컨텍스트로 동작해야 하는 경로 (broad).
 *     쿠키/스토리지/X-Auth-Context 선택에 사용. 합쳐진 superset.
 *
 *   - ADMIN_ONLY_PATHS     : staff_access_token 없으면 /admin-login 으로 리다이렉트
 *     되어야 하는 경로 (narrow). middleware 의 라우트 가드에 사용.
 *
 *   - SHARED_AUTHED_PATHS  : staff 또는 client 토큰 둘 중 하나라도 있으면 통과
 *     되어야 하는 경로. 일정관리/노트장 등 공유 영역.
 *
 * ⚠️ 백엔드 [admin-paths.ts](../../apps/api/src/common/admin-paths.ts) 와 동일한 목록을
 *    유지해야 한다. 새 staff 경로 추가 시 양쪽을 함께 업데이트할 것.
 *    (백엔드 검사는 X-Auth-Context 헤더 fallback — Referer 만 사용한다.)
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

export const ADMIN_ONLY_PATHS: readonly string[] = [
  '/dashboard',
  '/settings',
  '/orders',
  '/company',
  '/production',
  '/accounting',
  '/statistics',
] as const;

export const SHARED_AUTHED_PATHS: readonly string[] = ['/schedule'] as const;

/** 주어진 pathname 이 staff 컨텍스트 경로인지. window 미사용 — SSR 안전. */
export function isStaffContextPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return STAFF_CONTEXT_PATHS.some((prefix) => pathname.startsWith(prefix));
}

/** 브라우저 환경에서 현재 location 기준으로 staff 컨텍스트 여부. SSR 에서는 false. */
export function isStaffContext(): boolean {
  if (typeof window === 'undefined') return false;
  return isStaffContextPath(window.location.pathname);
}
