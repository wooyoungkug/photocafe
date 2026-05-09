'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  staffId?: string;
  isSuperAdmin?: boolean;
  canEditMemberInfo?: boolean;
  profileImage?: string;
  status?: string;
  clientId?: string;
  clientName?: string;
  mobile?: string;
  businessNumber?: string;
  representative?: string;
  address?: string;
  addressDetail?: string;
  contactPerson?: string;
  // Employee-specific fields
  type?: 'client' | 'employee';
  employmentId?: string;
  employeeRole?: 'MANAGER' | 'STAFF' | 'EDITOR';
  isOwner?: boolean;
  canViewAllOrders?: boolean;
  canManageProducts?: boolean;
  canViewSettlement?: boolean;
  canManageSchedule?: boolean;
  canManageRecruitment?: boolean;
  enableSchedule?: boolean;
  enableRecruitment?: boolean;
  enableShooting?: boolean;
  enableNote?: boolean;
  menuPermissions?: Record<string, boolean>;
  oauthProvider?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;

  setAuth: (data: { user: User; rememberMe?: boolean; accessToken?: string; refreshToken?: string }) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

// 커스텀 스토리지: rememberMe 상태에 따라 localStorage 또는 sessionStorage 사용
const createCustomStorage = (): StateStorage => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  return {
    getItem: (name: string) => {
      // sessionStorage 우선: 대리로그인 등 탭별 독립 세션 지원
      const sessionData = sessionStorage.getItem(name);
      if (sessionData) return sessionData;
      return localStorage.getItem(name);
    },
    setItem: (name: string, value: string) => {
      try {
        const parsed = JSON.parse(value);
        const rememberMe = parsed?.state?.rememberMe ?? false;

        // localStorage에 admin 세션이 있고 rememberMe 없으면 → sessionStorage에만 저장
        // (비관리자 로그인 + 직원 대리로그인 모두 포함)
        if (!rememberMe && name === 'auth-storage') {
          const existing = localStorage.getItem(name);
          if (existing) {
            try {
              const existingParsed = JSON.parse(existing);
              const existingRole = existingParsed?.state?.user?.role;
              if (existingRole === 'admin' || existingRole === 'staff') {
                sessionStorage.setItem(name, value);
                return; // localStorage 덮어쓰지 않음
              }
            } catch { /* fall through */ }
          }
        }

        if (rememberMe) {
          localStorage.setItem(name, value);
          sessionStorage.removeItem(name);
        } else {
          sessionStorage.setItem(name, value);
          localStorage.removeItem(name);
        }
      } catch {
        localStorage.setItem(name, value);
      }
    },
    removeItem: (name: string) => {
      localStorage.removeItem(name);
      sessionStorage.removeItem(name);
    },
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      rememberMe: false,

      setAuth: ({ user, rememberMe = false, accessToken = null, refreshToken = null }) => {
        if (typeof window !== 'undefined') {
          const isNewLoginAdmin = user.role === 'admin' || user.role === 'staff';

          // localStorage에 관리자 세션이 이미 있는지 확인
          const hasAdminInLocal = (() => {
            try {
              const raw = localStorage.getItem('auth-storage');
              if (!raw) return false;
              const parsed = JSON.parse(raw);
              const role = parsed?.state?.user?.role;
              return role === 'admin' || role === 'staff';
            } catch { return false; }
          })();

          // rememberMe 정책에 따라 auth-storage 저장 위치만 분기
          if (hasAdminInLocal && !rememberMe) {
            // localStorage에 admin 세션이 있으면 sessionStorage에만 저장해 원본 세션 보호
          }

          // 미들웨어 인증은 HttpOnly access_token 쿠키(백엔드 발급)로 검증하므로
          // JS로 auth-verified 쿠키를 별도 설정하지 않음
          void isNewLoginAdmin;
        }
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          rememberMe,
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          // 쿠키 세션 로그아웃
          fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
          localStorage.removeItem('auth-storage');
          sessionStorage.removeItem('auth-storage');
          sessionStorage.removeItem('impersonate-session');
          sessionStorage.removeItem('impersonate-tokens');
          localStorage.removeItem('impersonate-tokens');
          sessionStorage.removeItem('owner-session');
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          rememberMe: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      skipHydration: true,
      storage: createJSONStorage(createCustomStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
      }),
    }
  )
);
