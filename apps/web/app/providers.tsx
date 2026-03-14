"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { ErrorBoundary } from "@/components/error-boundary";

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// JWT payload에서 만료시간 추출 (라이브러리 없이)
function getTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // ms 변환
  } catch {
    return null;
  }
}

// refresh token으로 새 access token 발급 (providers 전용 - api.ts와 독립)
async function silentRefresh(): Promise<boolean> {
  const refreshToken =
    sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    // 대리로그인 세션(sessionStorage)이 있으면 sessionStorage에 저장 (localStorage 어드민 토큰 보호)
    const useSession = !!sessionStorage.getItem('accessToken');
    const storage = useSession ? sessionStorage : localStorage;
    storage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) storage.setItem('refreshToken', data.refreshToken);

    // Zustand store 동기화
    try {
      const raw = storage.getItem('auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state) {
          parsed.state.accessToken = data.accessToken;
          if (data.refreshToken) parsed.state.refreshToken = data.refreshToken;
          storage.setItem('auth-storage', JSON.stringify(parsed));
        }
      }
    } catch { /* ignore */ }

    // auth-verified 쿠키 갱신
    try {
      const raw = localStorage.getItem('auth-storage') || sessionStorage.getItem('auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        const role = parsed?.state?.user?.role;
        if (role === 'admin' || role === 'staff') {
          document.cookie = `auth-verified=true; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
        }
      }
    } catch { /* ignore */ }

    return true;
  } catch {
    return false;
  }
}

// QueryClient를 모듈 레벨에서 생성하여 재사용
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // SSR: 항상 새 클라이언트 생성
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes - 데이터가 5분간 fresh 상태 유지
          gcTime: 10 * 60 * 1000, // 10 minutes - 캐시 보관 시간 (구 cacheTime)
          refetchOnWindowFocus: false, // 윈도우 포커스 시 재요청 방지
          refetchOnMount: 'always', // SSR: 항상 재요청
          retry: 1, // 실패 시 재시도 횟수 감소 (기본 3 → 1)
        },
      },
    });
  }
  // 브라우저: 싱글톤으로 재사용
  if (!browserQueryClient) {
    browserQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 10 * 60 * 1000, // 10 minutes
          refetchOnWindowFocus: false,
          refetchOnMount: true, // stale 데이터일 때만 마운트 시 재요청 (v5 기본 동작)
          retry: 1,
        },
      },
    });
  }
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const queryClient = getQueryClient();

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 토큰 만료 전 자동 갱신 스케줄링
  const scheduleTokenRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const token =
      sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    if (!token) return;

    const exp = getTokenExp(token);
    if (!exp) return;

    // 만료 5분 전에 갱신 (최소 10초 후)
    const delay = Math.max(exp - Date.now() - 5 * 60 * 1000, 10_000);

    refreshTimerRef.current = setTimeout(async () => {
      const ok = await silentRefresh();
      if (ok) {
        scheduleTokenRefresh(); // 새 토큰으로 다시 스케줄
      }
    }, delay);
  }, []);

  // Zustand persist 수동 하이드레이션 및 토큰 검증 (SSR 호환)
  useEffect(() => {
    useAuthStore.persist.rehydrate();

    // 토큰 유효성 검증
    const checkTokenValidity = () => {
      const { isAuthenticated, logout } = useAuthStore.getState();

      if (isAuthenticated) {
        const hasToken =
          localStorage.getItem('accessToken') ||
          sessionStorage.getItem('accessToken');

        if (!hasToken) {
          logout();
        }
      }
    };

    checkTokenValidity();
    scheduleTokenRefresh();
    setMounted(true);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleTokenRefresh]);

  // 페이지 포커스 복귀 시 토큰 체크 및 갱신 (절전/탭 전환 후)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

      const token =
        sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
      if (!token) return;

      const exp = getTokenExp(token);
      if (!exp) return;

      // 이미 만료되었거나 5분 이내에 만료 예정이면 즉시 갱신
      if (exp - Date.now() < 5 * 60 * 1000) {
        const ok = await silentRefresh();
        if (ok) scheduleTokenRefresh();
      } else {
        scheduleTokenRefresh(); // 타이머 재설정
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [scheduleTokenRefresh]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          {children}
          {mounted && (
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={3000}
            />
          )}
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
