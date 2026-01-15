"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
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
          staleTime: 60 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  // 브라우저: 싱글톤으로 재사용
  if (!browserQueryClient) {
    browserQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const rehydrated = useRef(false);
  const queryClient = getQueryClient();

  // Zustand persist 수동 하이드레이션 (SSR 호환) - 한 번만 실행
  useEffect(() => {
    if (!rehydrated.current) {
      rehydrated.current = true;
      try {
        useAuthStore.persist.rehydrate();
      } catch (e) {
        console.error('Auth store rehydration error:', e);
      }
    }
    setMounted(true);
  }, []);

  // SSR 중에도 children을 렌더링하되, 클라이언트에서 hydration 후 정상 동작
  // 로딩 스피너를 보여주는 대신 바로 children 렌더링 (깜빡임 감소)
  if (!mounted) {
    // SSR에서는 children을 그대로 렌더링하여 초기 로딩 속도 향상
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
