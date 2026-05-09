'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { isStaffContext } from '@/lib/admin-paths';

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

  setAuth: (data: { user: User; rememberMe?: boolean; accessToken?: string; refreshToken?: string; isImpersonation?: boolean }) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

const IMPERSONATE_KEYS = [
  'impersonate-session',
  'impersonate-tokens',
  'impersonate-data',
  'owner-session',
  'pending-context-selection',
] as const;

const clearImpersonateKeys = () => {
  if (typeof window === 'undefined') return;
  for (const key of IMPERSONATE_KEYS) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
  // 대리로그인 세션에서 저장된 클라이언트 데이터도 정리
  sessionStorage.removeItem(CLIENT_KEY);
};

// staff/admin → 'auth-storage-staff', client/employee → 'auth-storage-client'
// Zustand는 'auth-storage' 이름으로 호출하지만 내부적으로 역할별 키로 리매핑
const STAFF_KEY = 'auth-storage-staff';
const CLIENT_KEY = 'auth-storage-client';

// staff/admin 컨텍스트 여부는 lib/admin-paths.ts 의 isStaffContext() 사용

const createCustomStorage = (): StateStorage => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  return {
    getItem: (_name: string) => {
      const isImpersonating = !!sessionStorage.getItem('impersonate-session');

      if (isImpersonating) {
        // 대리로그인 중: 클라이언트 세션 우선 반환
        return sessionStorage.getItem(CLIENT_KEY)
            || localStorage.getItem(CLIENT_KEY)
            || null;
      }

      // URL 컨텍스트에 따라 읽을 키 결정
      // → 관리자 경로: staff 세션, 쇼핑몰 경로: client 세션
      // 두 세션이 동시에 존재해도 현재 컨텍스트에 맞는 것만 읽음
      if (isStaffContext()) {
        return sessionStorage.getItem(STAFF_KEY)
            || localStorage.getItem(STAFF_KEY)
            || null;
      } else {
        return sessionStorage.getItem(CLIENT_KEY)
            || localStorage.getItem(CLIENT_KEY)
            || null;
      }
    },
    setItem: (_name: string, value: string) => {
      try {
        const parsed = JSON.parse(value);
        const rememberMe = parsed?.state?.rememberMe ?? false;
        const role = parsed?.state?.user?.role;
        const type = parsed?.state?.user?.type;

        const isStaff = role === 'admin' || role === 'staff' || type === 'staff';
        const storageKey = isStaff ? STAFF_KEY : CLIENT_KEY;

        if (rememberMe) {
          localStorage.setItem(storageKey, value);
          sessionStorage.removeItem(storageKey);
        } else {
          sessionStorage.setItem(storageKey, value);
          if (!isStaff) {
            localStorage.removeItem(storageKey);
          }
        }
      } catch {
        localStorage.setItem('auth-storage', value);
      }
    },
    removeItem: (_name: string) => {
      // 현재 컨텍스트에 해당하는 키만 삭제
      // → 반대편 세션(관리자 ↔ 클라이언트)은 보존
      const key = isStaffContext() ? STAFF_KEY : CLIENT_KEY;
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      // 레거시 정리
      localStorage.removeItem('auth-storage');
      sessionStorage.removeItem('auth-storage');
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

      setAuth: ({ user, rememberMe = false, accessToken = null, refreshToken = null, isImpersonation = false }) => {
        if (typeof window !== 'undefined') {
          // 일반 로그인(대리로그인 아님)이면 잔존 impersonate-* 키를 모두 정리
          // → 직전 세션의 impersonate 토큰이 다음 요청에 끼어드는 사고 방지
          if (!isImpersonation) {
            clearImpersonateKeys();
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
          // 현재 컨텍스트의 쿠키/스토리지만 제거 (반대편 세션 보존)
          const authContext = isStaffContext() ? 'staff' : 'client';
          const storageKey = authContext === 'staff' ? STAFF_KEY : CLIENT_KEY;
          fetch('/api/v1/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-Auth-Context': authContext },
          }).catch(() => {});
          localStorage.removeItem(storageKey);
          sessionStorage.removeItem(storageKey);
          localStorage.removeItem('auth-storage'); // legacy
          sessionStorage.removeItem('auth-storage'); // legacy
          clearImpersonateKeys();
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
