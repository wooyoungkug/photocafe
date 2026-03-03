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
    const wasImpersonating = (() => {
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

    logout();

    if (wasImpersonating) {
      // 대리로그인 종료 → 원본 어드민 세션 복원 후 대시보드로 이동
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
  };
  impersonated: boolean;
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
        },
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        rememberMe: false,
      });
      router.push('/dashboard');
    },
  });
}
