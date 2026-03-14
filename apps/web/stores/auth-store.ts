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
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;

  setAuth: (data: { user: User; accessToken: string; refreshToken: string; rememberMe?: boolean }) => void;
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

      setAuth: ({ user, accessToken, refreshToken, rememberMe = false }) => {
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

          if (hasAdminInLocal && !rememberMe) {
            // localStorage에 admin 세션이 있고 rememberMe 없으면 → sessionStorage에만 저장
            // (비관리자 대리로그인 + 직원 대리로그인 모두 포함, 원본 어드민 세션 보호)
            sessionStorage.setItem('accessToken', accessToken);
            sessionStorage.setItem('refreshToken', refreshToken);
          } else {
            // 일반 로그인 또는 관리자 로그인
            const storage = rememberMe ? localStorage : sessionStorage;
            const otherStorage = rememberMe ? sessionStorage : localStorage;
            storage.setItem('accessToken', accessToken);
            storage.setItem('refreshToken', refreshToken);
            otherStorage.removeItem('accessToken');
            otherStorage.removeItem('refreshToken');
          }

          // 관리자/직원 로그인 시 미들웨어 인증 쿠키 설정
          if (isNewLoginAdmin) {
            const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
            document.cookie = `auth-verified=true; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
          }
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
          // sessionStorage에 토큰이 있고, localStorage에 별도 admin 세션이 있는 경우
          // → sessionStorage만 정리 (다른 탭의 admin 세션 보호)
          const hasSessionToken = !!sessionStorage.getItem('accessToken');
          const hasLocalAdminSession = (() => {
            try {
              const raw = localStorage.getItem('auth-storage');
              if (!raw) return false;
              const parsed = JSON.parse(raw);
              const role = parsed?.state?.user?.role;
              return (role === 'admin' || role === 'staff') && !!localStorage.getItem('accessToken');
            } catch { return false; }
          })();

          if (hasSessionToken && hasLocalAdminSession) {
            // 대리로그인 세션 종료: sessionStorage만 정리 (원본 어드민 세션 보존)
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
            sessionStorage.removeItem('auth-storage');
            sessionStorage.removeItem('impersonate-session');
            return; // set({ user: null }) 호출 안 함 → 어드민 세션 메모리 유지
          } else {
            // 일반 로그아웃: 모두 정리
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
            localStorage.removeItem('auth-storage');
            sessionStorage.removeItem('auth-storage');
            sessionStorage.removeItem('impersonate-session');
            document.cookie = 'auth-verified=; path=/; max-age=0';
          }
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
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
      }),
      onRehydrateStorage: () => (state) => {
        // Rehydrate 완료 후 토큰 동기화 검증
        if (typeof window !== 'undefined' && state?.isAuthenticated) {
          const hasToken =
            localStorage.getItem('accessToken') ||
            sessionStorage.getItem('accessToken');

          // 토큰이 없으면 인증 상태 초기화
          if (!hasToken) {
            state.user = null;
            state.accessToken = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            state.rememberMe = false;
          }
        }
      },
    }
  )
);
