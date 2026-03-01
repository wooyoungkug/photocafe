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
  phone: string;
  verificationId: string;
  contactEmail?: string;
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

export function useSendPhoneVerification() {
  return useMutation({
    mutationFn: (phone: string) =>
      api.post<{ success: boolean; message: string }>('/auth/client/send-phone-verification', { phone }),
  });
}

export function useVerifyPhone() {
  return useMutation({
    mutationFn: (data: { phone: string; code: string }) =>
      api.post<{ verified: boolean; verificationId: string }>('/auth/client/verify-phone', data),
  });
}

export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  return () => {
    logout();
    router.push('/login');
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
