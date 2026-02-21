"use client";

<<<<<<< Updated upstream
import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";
=======
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
>>>>>>> Stashed changes

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
<<<<<<< Updated upstream
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // localStorage에서 사이드바 접힘 상태 복원 + 초기 모바일 감지
  useEffect(() => {
    if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true") {
      setSidebarCollapsed(true);
    }
    setIsMobile(window.innerWidth < 1024);
  }, []);

  // 화면 크기 감지 (디바운싱)
  useEffect(() => {
    const checkMobile = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        const mobile = window.innerWidth < 1024;
        setIsMobile(mobile);
        if (!mobile) setSidebarOpen(false);
      }, 150);
    };

    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, []);

  // 사이드바 토글 (데스크탑)
  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  // ESC 키로 모바일 사이드바 닫기
  useEffect(() => {
    if (!sidebarOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [sidebarOpen]);

  return (
    <AuthGuard requireAdmin={true}>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        {/* 모바일 백드롭 */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
            sidebarOpen && isMobile
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          )}
          onClick={() => setSidebarOpen(false)}
        />
=======
  const [isMobile, setIsMobile] = useState(false);

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
>>>>>>> Stashed changes

        {/* 사이드바 */}
        <aside
          className={cn(
<<<<<<< Updated upstream
            "fixed lg:static inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out",
            isMobile
              ? sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full"
              : sidebarCollapsed
                ? "-ml-72"
                : "ml-0"
=======
            "fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
>>>>>>> Stashed changes
          )}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
        </aside>

<<<<<<< Updated upstream
        {/* 사이드바 토글 버튼 (데스크탑) */}
        {!isMobile && (
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className={cn(
              "fixed z-[60] top-[5.5rem] flex items-center justify-center w-6 h-12",
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

=======
>>>>>>> Stashed changes
        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            showMenuButton={isMobile}
          />
<<<<<<< Updated upstream
          <main className="flex-1 overflow-y-auto bg-slate-50/80 p-3 sm:p-4 lg:p-6">
=======
          <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4 lg:p-6">
>>>>>>> Stashed changes
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
