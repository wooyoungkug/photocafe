'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  clientName?: string;
  mobile?: string;
  businessNumber?: string;
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
      // localStorage 먼저 확인 (로그인 상태 유지)
      const localData = localStorage.getItem(name);
      if (localData) return localData;
      // sessionStorage 확인 (세션 로그인)
      return sessionStorage.getItem(name);
    },
    setItem: (name: string, value: string) => {
      try {
        const parsed = JSON.parse(value);
        const rememberMe = parsed?.state?.rememberMe ?? false;

        if (rememberMe) {
          // 로그인 상태 유지: localStorage에 저장
          localStorage.setItem(name, value);
          sessionStorage.removeItem(name);
        } else {
          // 세션 로그인: sessionStorage에 저장
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
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      rememberMe: false,

      setAuth: ({ user, accessToken, refreshToken, rememberMe = false }) => {
        // 토큰 저장 (api.ts에서 사용)
        if (typeof window !== 'undefined') {
          const storage = rememberMe ? localStorage : sessionStorage;
          const otherStorage = rememberMe ? sessionStorage : localStorage;

          storage.setItem('accessToken', accessToken);
          storage.setItem('refreshToken', refreshToken);
          // 다른 스토리지에서 제거
          otherStorage.removeItem('accessToken');
          otherStorage.removeItem('refreshToken');
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
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refreshToken');
          localStorage.removeItem('auth-storage');
          sessionStorage.removeItem('auth-storage');
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
    }
  )
);
