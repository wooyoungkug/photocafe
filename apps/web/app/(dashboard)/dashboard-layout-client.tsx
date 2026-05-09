"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PinBar } from "@/components/layout/pin-bar";
import { SubNavBar } from "@/components/layout/sub-nav-bar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Toaster } from "@/components/ui/toaster";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageView } from "@/hooks/use-page-view";
import { useNotificationConfig } from "@/hooks/use-notification-config";
import { useCurrentUser } from "@/hooks/use-auth";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useTypographyApply, useMenuStyleApply } from "@/hooks/use-typography";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { Bell, X } from "lucide-react";
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
  useTypographyApply();
  useMenuStyleApply();
  const { user, isAuthenticated } = useCurrentUser();
  const { requestPermission } = usePushSubscription(isAuthenticated);
  const NOTIF_DISMISSED_KEY = 'notif-banner-dismissed';
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [notifDenied, setNotifDenied] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const perm = Notification.permission;
    if (perm === 'default' && localStorage.getItem(NOTIF_DISMISSED_KEY) !== '1') setShowNotifBanner(true);
    if (perm === 'denied' && localStorage.getItem(NOTIF_DISMISSED_KEY) !== '1') setNotifDenied(true);
  }, []);
  const { data: prefs } = useUserPreferences();
  const layoutMode = prefs?.layoutMode ?? "top";
  const isTopMode = layoutMode === "top";

  // 브라우저 탭 타이틀에 스튜디오명 표시
  useEffect(() => {
    const studioName = user?.type === 'employee' ? user?.clientName : user?.name;
    document.title = studioName
      ? `Photocafe - ${studioName}`
      : 'Photocafe';
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
    const faviconUrl = "/images/favicon-512x512_Brown.png?v=7";
    // 기존 아이콘의 href만 변경 (DOM 노드 제거 시 React reconciliation 충돌 방지)
    const existing = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (existing) {
      existing.href = faviconUrl;
      existing.type = "image/png";
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.href = faviconUrl;
      document.head.appendChild(link);
    }
    return () => {
      // 대시보드를 벗어나면 기본(프론트) 파비콘 복원
      const icon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (icon) {
        icon.href = "/images/favicon-512x512_red.png";
        icon.type = "image/png";
      }
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

  // 사이드바 표시 여부: 모바일은 항상 Sheet, 데스크탑은 side 모드일 때만
  const showDesktopSidebar = !isTopMode;

  return (
    <AuthGuard requireAdmin={true}>
      <div className="flex h-dvh h-screen overflow-hidden bg-slate-50">
        {/* 모바일: Sheet 드로어 (top 모드/side 모드 공통) */}
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

        {/* 데스크탑: 사이드바 (side 모드 전용) */}
        {showDesktopSidebar && (
          <aside
            className={cn(
              "hidden lg:block transition-all duration-300 ease-in-out shrink-0",
              sidebarCollapsed ? "w-0 overflow-hidden" : "w-72"
            )}
          >
            <Sidebar isMobile={false} />
          </aside>
        )}

        {/* 사이드바 토글 버튼 (side 모드 데스크탑 전용) */}
        {showDesktopSidebar && (
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
        )}

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header
            onMenuClick={() => setSheetOpen(true)}
            showMenuButton={isMobile}
            layoutMode={layoutMode}
          />
          {/* 핀 바 (데스크탑 전용, 모든 레이아웃 모드에서 표시) */}
          <div className="hidden lg:block">
            <PinBar />
          </div>
          {/* 서브 내비게이션 바 — 사이드바 2차 메뉴를 콘텐츠 상단에 표시 */}
          <SubNavBar />
          {/* 웹 푸시 알림 허용 배너 */}
          {(showNotifBanner || notifDenied) && (
            <div className={`flex items-center gap-3 px-4 py-2 border-b text-[13px] ${notifDenied ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
              <Bell className={`h-4 w-4 shrink-0 ${notifDenied ? 'text-amber-500' : 'text-blue-500'}`} />
              {notifDenied ? (
                <span className="flex-1">브라우저 알림이 차단되어 있습니다. 주소창 자물쇠 아이콘 → 알림 → <b>허용</b>으로 변경해 주세요.</span>
              ) : (
                <span className="flex-1">담당자 알림을 받으려면 브라우저 알림을 허용해 주세요.</span>
              )}
              {!notifDenied && (
                <button
                  type="button"
                  onClick={async () => {
                    await requestPermission();
                    setShowNotifBanner(false);
                  }}
                  className="px-3 py-1 rounded bg-blue-500 text-white text-[12px] hover:bg-blue-600 shrink-0"
                >
                  알림 허용
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(NOTIF_DISMISSED_KEY, '1');
                  setShowNotifBanner(false);
                  setNotifDenied(false);
                }}
                className={`p-1 rounded ${notifDenied ? 'hover:bg-amber-100' : 'hover:bg-blue-100'}`}
                aria-label="닫기"
              >
                <X className={`h-3.5 w-3.5 ${notifDenied ? 'text-amber-400' : 'text-blue-400'}`} />
              </button>
            </div>
          )}
          <main className="flex-1 overflow-y-auto bg-slate-50/80 p-3 sm:p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </AuthGuard>
  );
}
