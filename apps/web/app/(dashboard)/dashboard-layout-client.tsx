"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Toaster } from "@/components/ui/toaster";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageView } from "@/hooks/use-page-view";
import { useNotificationConfig } from "@/hooks/use-notification-config";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  usePageView();
  useNotificationConfig();
  const { user } = useCurrentUser();

  // 브라우저 탭 타이틀에 스튜디오명 표시
  useEffect(() => {
    const studioName = user?.type === 'employee' ? user?.clientName : user?.name;
    document.title = studioName
      ? `printing114 - ${studioName}`
      : 'printing114';
  }, [user?.name, user?.clientName, user?.type]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // localStorage에서 사이드바 접힘 상태 복원 + 초기 모바일 감지 + 파비콘 교체
  useEffect(() => {
    if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true") {
      setSidebarCollapsed(true);
    }
    // 초기 모바일 감지
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);

    // 관리자 페이지 빨간 파비콘 적용 (캐시 무효화용 버전 파라미터)
    const faviconUrl = "/favicon-red.svg?v=2";
    // 기존 아이콘의 href만 변경 (DOM 노드 제거 시 React reconciliation 충돌 방지)
    const existing = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (existing) {
      existing.href = faviconUrl;
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = faviconUrl;
      document.head.appendChild(link);
    }
    return () => {
      // 대시보드를 벗어나면 기본 파비콘 복원
      const icon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (icon) icon.href = "/favicon.svg";
    };
  }, []);

  // matchMedia 기반 브레이크포인트 감지 (디바운스 불필요, macOS Split View/Stage Manager 안전)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setSheetOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 사이드바 토글 (데스크탑)
  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <AuthGuard requireAdmin={true}>
      <div className="flex h-dvh h-screen overflow-hidden bg-slate-50">
        {/* 모바일: Sheet 드로어 */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="left"
            className="w-72 max-w-[85vw] p-0 border-r-0 gap-0 [&>button:last-child]:hidden"
          >
            <SheetTitle className="sr-only">탐색 메뉴</SheetTitle>
            <Sidebar
              onClose={() => setSheetOpen(false)}
              isMobile={true}
            />
          </SheetContent>
        </Sheet>

        {/* 데스크탑: 인라인 사이드바 */}
        <aside
          className={cn(
            "hidden lg:block transition-all duration-300 ease-in-out shrink-0",
            sidebarCollapsed ? "w-0 overflow-hidden" : "w-72"
          )}
        >
          <Sidebar isMobile={false} />
        </aside>

        {/* 사이드바 토글 버튼 (데스크탑) */}
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className={cn(
            "hidden lg:flex fixed z-[60] top-[5.5rem] items-center justify-center w-6 h-12",
            "bg-slate-800/90 hover:bg-indigo-600 text-white/80 hover:text-white",
            "rounded-r-md shadow-lg backdrop-blur-sm",
            "transition-all duration-300 group",
            sidebarCollapsed ? "left-0" : "left-72"
          )}
          title={sidebarCollapsed ? "메뉴 펼치기" : "메뉴 접기"}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4 group-hover:scale-110 transition-transform" />
          ) : (
            <PanelLeftClose className="h-4 w-4 group-hover:scale-110 transition-transform" />
          )}
        </button>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header
            onMenuClick={() => setSheetOpen(true)}
            showMenuButton={isMobile}
          />
          <main className="flex-1 overflow-y-auto bg-slate-50/80 p-3 sm:p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </AuthGuard>
  );
}