"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { ErrorBoundary } from "@/components/error-boundary";

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
          refetchOnMount: false, // 마운트 시 자동 재요청 방지 (stale 상태일 때만)
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
          refetchOnMount: false,
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

  // Zustand persist 수동 하이드레이션 및 토큰 검증 (SSR 호환)
  useEffect(() => {
    useAuthStore.persist.rehydrate();

    // 토큰 유효성 검증
    const checkTokenValidity = () => {
      const { isAuthenticated, logout } = useAuthStore.getState();

      if (isAuthenticated) {
        // localStorage 또는 sessionStorage에 토큰이 있는지 확인
        const hasToken =
          localStorage.getItem('accessToken') ||
          sessionStorage.getItem('accessToken');

        // 인증 상태는 true인데 토큰이 없으면 로그아웃 처리
        if (!hasToken) {
          console.warn('[Auth] 토큰이 없어서 자동 로그아웃 처리합니다.');
          logout();
        }
      }
    };

    checkTokenValidity();
    setMounted(true);
  }, []);

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
