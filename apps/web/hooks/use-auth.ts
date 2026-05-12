'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface ClientLoginRequest {
  loginId: string;
  password: string;
}

interface ClientLoginResponse {
  needsContext?: boolean;
  tempToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    [key: string]: any;
  };
}

interface ClientRegisterRequest {
  loginId: string;
  password: string;
  name: string;
  contactEmail: string;
  emailConsent: boolean;
  phone?: string;
}

/** 이메일 미인증 사용자 로그인 시도 시 던지는 에러 (페이지에서 catch) */
export class EmailNotVerifiedError extends Error {
  email?: string;
  constructor(message: string, email?: string) {
    super(message);
    this.name = 'EmailNotVerifiedError';
    this.email = email;
  }
}

export function useClientLogin() {
  return useMutation({
    mutationFn: async (data: ClientLoginRequest) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      // fetch 기반 api 클라이언트는 응답 body(code)를 노출하지 않으므로
      // 이메일 미인증(403, EMAIL_NOT_VERIFIED) 분기를 위해 raw fetch 사용
      const authContext = 'client';
      const res = await fetch(`${apiUrl}/auth/client/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Context': authContext },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        // NestJS 예외 필터가 payload를 details 안에 래핑함
        const code = body?.code ?? body?.details?.code;
        if (code === 'EMAIL_NOT_VERIFIED') {
          const email = body?.email ?? body?.details?.email;
          const message = body?.message ?? body?.details?.message ?? '이메일 인증이 완료되지 않았습니다.';
          throw new EmailNotVerifiedError(message, email);
        }
        throw new Error(body?.message || '로그인 권한이 없습니다.');
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: '로그인에 실패했습니다.' }));
        const message = Array.isArray(body.message) ? body.message.join(', ') : (body.message || `HTTP error ${res.status}`);
        throw new Error(message);
      }

      const text = await res.text();
      return (text ? JSON.parse(text) : undefined) as ClientLoginResponse;
    },
  });
}

export function useCheckLoginId() {
  return useMutation({
    mutationFn: (loginId: string) =>
      api.get<{ available: boolean }>(`/auth/client/check-login-id?loginId=${encodeURIComponent(loginId)}`),
  });
}

export function useClientRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: ClientRegisterRequest) =>
      api.post<{ success: boolean; message: string }>('/auth/client/register', data),
    onSuccess: () => {
      router.push('/login?registered=true&checkEmail=1');
    },
  });
}

/** 이메일 인증 메일 재발송 (rate limit 1회/분 → 429 가능) */
export function useResendVerification() {
  return useMutation({
    mutationFn: (loginId: string) =>
      api.post<{ success: boolean; alreadyVerified?: boolean }>('/auth/client/resend-verification', { loginId }),
  });
}

/** 이메일 인증 링크(token) 처리 */
export function useVerifyEmailToken() {
  return useMutation({
    mutationFn: (token: string) =>
      api.get<{ success: boolean; email?: string }>('/auth/client/verify-email', { token }),
  });
}

export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  return () => {
    const isAdmin = user?.role === 'admin' || user?.role === 'staff';
    logout();
    router.push(isAdmin ? '/admin-login' : '/login');
  };
}

/** 대리로그인 중인지 확인 */
export function useIsImpersonating() {
  if (typeof window === 'undefined') return false;
  return !!sessionStorage.getItem('impersonate-session') || !!sessionStorage.getItem('owner-session');
}

/** 대리로그인 종료 → 원래 관리자/소유자 세션 복원 */
export function useEndImpersonation() {
  const router = useRouter();

  return () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('impersonate-session');
    useAuthStore.getState().logout();
    router.push('/dashboard');
  };
}

export function useCurrentUser() {
  const { user, isAuthenticated } = useAuthStore();
  return { user, isAuthenticated };
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) =>
      api.patch<{ success: boolean; message: string }>('/auth/change-password', data),
  });
}

interface ImpersonateStaffResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    staffId: string;
    name: string;
    role: string;
    email?: string;
    isSuperAdmin?: boolean;
    menuPermissions?: Record<string, boolean>;
  };
  impersonated: boolean;
}

export function useImpersonateEmployee() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (employmentId: string) =>
      api.post<{ accessToken: string; refreshToken: string; user: any; impersonated: boolean }>(
        `/auth/impersonate-employee/${employmentId}`
      ),
    onSuccess: (response) => {
      sessionStorage.setItem('impersonate-session', 'true');
      // 대리로그인 토큰은 현재 탭(sessionStorage)에만 저장 — localStorage는 탭 간 오염 위험
      if (response.accessToken) {
        const tokenJson = JSON.stringify({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken ?? '',
        });
        sessionStorage.setItem('impersonate-tokens', tokenJson);
      }
      setAuth({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        rememberMe: false,
        isImpersonation: true,
      });
      router.push('/');
    },
  });
}

export function useImpersonateStaff() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (staffId: string) =>
      api.post<ImpersonateStaffResponse>(`/auth/impersonate-staff/${staffId}`),
    onSuccess: (response) => {
      // Bearer 헤더용 토큰은 현재 탭(sessionStorage)에만 저장 — localStorage는 탭 간 오염 위험
      if (typeof window !== 'undefined' && response.accessToken) {
        const tokenJson = JSON.stringify({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken ?? '',
        });
        sessionStorage.setItem('impersonate-session', 'true');
        sessionStorage.setItem('impersonate-tokens', tokenJson);
      }
      setAuth({
        user: {
          id: response.user.id,
          email: response.user.email || response.user.staffId,
          name: response.user.name,
          role: response.user.role,
          staffId: response.user.staffId,
          isSuperAdmin: response.user.isSuperAdmin ?? false,
          menuPermissions: response.user.menuPermissions,
        },
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        rememberMe: false,
        isImpersonation: true,
      });
      router.push('/dashboard');
    },
  });
}
