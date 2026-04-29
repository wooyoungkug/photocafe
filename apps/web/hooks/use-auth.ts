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
  verificationId?: string;
  phone?: string;
}

export function useClientLogin() {
  return useMutation({
    mutationFn: (data: ClientLoginRequest) =>
      api.post<ClientLoginResponse>('/auth/client/login', data),
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
      router.push('/login?registered=true');
    },
  });
}

export function useSendEmailVerification() {
  return useMutation({
    mutationFn: (email: string) =>
      api.post<{ success: boolean; message: string }>('/auth/client/send-email-verification', { email }),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (data: { email: string; code: string }) =>
      api.post<{ verified: boolean; verificationId: string }>('/auth/client/verify-email', data),
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
      setAuth({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        rememberMe: false,
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
      });
      // Bearer 헤더용 토큰 저장 (api.ts에서 읽어 Authorization 헤더로 전송)
      if (typeof window !== 'undefined' && response.accessToken) {
        sessionStorage.setItem('impersonate-session', 'true');
        sessionStorage.setItem('impersonate-tokens', JSON.stringify({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken ?? '',
        }));
      }
      router.push('/dashboard');
    },
  });
}
