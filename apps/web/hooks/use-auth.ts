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

  return () => {
    // 대리로그인 세션 여부 확인 (logout() 호출 전에 체크)
    const wasAdminImpersonating = (() => {
      if (typeof window === 'undefined') return false;
      const hasSessionToken = !!sessionStorage.getItem('accessToken');
      if (!hasSessionToken) return false;
      try {
        const raw = localStorage.getItem('auth-storage');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        const role = parsed?.state?.user?.role;
        return (role === 'admin' || role === 'staff') && !!localStorage.getItem('accessToken');
      } catch { return false; }
    })();

    // 직원 대리로그인 세션 여부 확인
    const ownerSessionRaw = typeof window !== 'undefined' ? sessionStorage.getItem('owner-session') : null;

    logout();

    if (ownerSessionRaw) {
      // 직원 대리로그인 종료 → 원본 소유자 세션 복원
      try {
        const ownerSession = JSON.parse(ownerSessionRaw);
        sessionStorage.removeItem('owner-session');
        sessionStorage.removeItem('impersonate-session');
        const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;
        storage.setItem('accessToken', ownerSession.accessToken);
        storage.setItem('refreshToken', ownerSession.refreshToken);
        useAuthStore.setState({
          user: ownerSession.user,
          accessToken: ownerSession.accessToken,
          refreshToken: ownerSession.refreshToken,
          isAuthenticated: true,
          rememberMe: false,
        });
        router.push('/mypage/employees');
      } catch {
        router.push('/login');
      }
    } else if (wasAdminImpersonating) {
      // 관리자 대리로그인 종료 → 원본 어드민 세션 복원 후 대시보드로 이동
      useAuthStore.persist.rehydrate();
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
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
  const { user, accessToken, refreshToken } = useAuthStore();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (employmentId: string) =>
      api.post<{ accessToken: string; refreshToken: string; user: any; impersonated: boolean }>(
        `/auth/impersonate-employee/${employmentId}`
      ),
    onSuccess: (response) => {
      // 원본 소유자 세션 백업 (로그아웃 시 복원용)
      if (user && accessToken) {
        sessionStorage.setItem('owner-session', JSON.stringify({ user, accessToken, refreshToken }));
      }
      // 대리로그인 세션을 sessionStorage에 저장
      sessionStorage.setItem('accessToken', response.accessToken);
      sessionStorage.setItem('refreshToken', response.refreshToken);
      sessionStorage.setItem('impersonate-session', 'true');
      // zustand state 갱신
      useAuthStore.setState({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
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
      router.push('/dashboard');
    },
  });
}
