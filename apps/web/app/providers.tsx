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
  const queryClient = getQueryClient();

  // Zustand persist 수동 하이드레이션 (SSR 호환)
  useEffect(() => {
    useAuthStore.persist.rehydrate();
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
