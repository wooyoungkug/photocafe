"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { ErrorBoundary } from "@/components/error-boundary";

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// 대리로그인 데이터 처리 — 모듈 로드 시점에 동기 실행
// 자식 컴포넌트의 useEffect 보다 먼저 sessionStorage를 채워야
// 첫 fetch 에서 Bearer 헤더가 누락되는 race condition을 방지한다.
// Why: (shop)/layout.tsx 에 동일 처리가 있던 시절 자식 effect 가 먼저 돌면서
//      impersonate-data 만 소비하고 impersonate-tokens 는 저장 못 해 401 → 로그아웃 됨.
let pendingImpersonateUser: any = null;
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('impersonate-data');
    if (raw) {
      const data = JSON.parse(raw);
      localStorage.removeItem('impersonate-data');
      sessionStorage.setItem('impersonate-session', 'true');
      if (data.accessToken) {
        sessionStorage.setItem(
          'impersonate-tokens',
          JSON.stringify({ accessToken: data.accessToken, refreshToken: data.refreshToken ?? '' }),
        );
      }
      pendingImpersonateUser = data.user;
    }
  } catch {
    localStorage.removeItem('impersonate-data');
  }
  // 잔존 localStorage impersonate-tokens 제거 (탭 간 토큰 오염 방지)
  localStorage.removeItem('impersonate-tokens');
}

// refresh token으로 새 access token 발급 (providers 전용 - api.ts와 독립)
async function silentRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    });
    if (!res.ok) return false;
    await res.json().catch(() => ({}));

    // auth-verified 쿠키 갱신 (staff 세션 확인)
    try {
      const raw = sessionStorage.getItem('auth-storage-staff')
        || localStorage.getItem('auth-storage-staff')
        || sessionStorage.getItem('auth-storage') // legacy
        || localStorage.getItem('auth-storage');  // legacy
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

  // 쿠키 세션 주기 갱신 스케줄링
  const scheduleTokenRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    refreshTimerRef.current = setTimeout(async () => {
      const ok = await silentRefresh();
      if (ok) {
        scheduleTokenRefresh();
      }
    }, 30 * 60 * 1000);
  }, []);

  // Zustand persist 수동 하이드레이션 및 토큰 검증 (SSR 호환)
  useEffect(() => {
    // 모듈 레벨에서 sessionStorage 세팅은 끝났으므로 여기서는 Zustand 만 적용
    if (pendingImpersonateUser) {
      useAuthStore
        .getState()
        .setAuth({ user: pendingImpersonateUser, rememberMe: false, isImpersonation: true });
      pendingImpersonateUser = null;
    }

    useAuthStore.persist.rehydrate();

    scheduleTokenRefresh();
    setMounted(true);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleTokenRefresh]);

  // 페이지 포커스 복귀 시 세션 갱신
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const ok = await silentRefresh();
      if (ok) scheduleTokenRefresh();
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
