"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // localStorage에서 사이드바 접힘 상태 복원
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved === "true") {
      setSidebarCollapsed(true);
    }
    // 초기 모바일 상태 설정
    setIsMobile(window.innerWidth < 1024);
  }, []);

  // 화면 크기 감지 (디바운싱 적용)
  useEffect(() => {
    const checkMobile = () => {
      // 디바운싱: 150ms 후에 실행
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = setTimeout(() => {
        const mobile = window.innerWidth < 1024;
        setIsMobile(mobile);
        if (!mobile) {
          setSidebarOpen(false);
        }
      }, 150);
    };

    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
    };
  }, []);

  // 사이드바 토글 (데스크탑용)
  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
      return newValue;
    });
  };

  // ESC 키로 사이드바 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [sidebarOpen]);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        {/* 모바일 오버레이 */}
        {sidebarOpen && isMobile && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 사이드바 */}
        <aside
          className={cn(
            "fixed lg:static inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out",
            // 모바일: 열림/닫힘
            isMobile
              ? sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full"
              : // 데스크탑: 접힘/펼침
                sidebarCollapsed
                ? "-ml-72"
                : "ml-0"
          )}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
        </aside>

        {/* 사이드바 토글 버튼 (데스크탑) */}
        {!isMobile && (
          <button
            onClick={toggleSidebarCollapsed}
            className={cn(
              "fixed z-[60] top-20 flex items-center gap-2 px-2 py-3 bg-slate-800 hover:bg-indigo-600 text-white rounded-r-lg shadow-lg transition-all duration-300",
              sidebarCollapsed ? "left-0" : "left-72"
            )}
            title={sidebarCollapsed ? "메뉴 펼치기" : "메뉴 접기"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        )}

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            showMenuButton={isMobile}
          />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
