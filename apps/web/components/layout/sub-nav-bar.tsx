"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DEFAULT_NAVIGATION } from "@/components/layout/sidebar";
import { useAuthStore } from "@/stores/auth-store";

interface SubNavBarProps {
  /** "bar": 콘텐츠 영역 상단의 전체폭 바 (기본) | "inline": 헤더 중앙 인라인 표시 */
  variant?: "bar" | "inline";
}

export function SubNavBar({ variant = "bar" }: SubNavBarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const isSuperAdmin = user?.isSuperAdmin === true;
  const menuPerms = user?.menuPermissions ?? {};

  const hasPerm = (href: string): boolean => {
    const val = menuPerms[href];
    if (val === true) return true;
    if (val && typeof val === "object" && (val as Record<string, unknown>).canView === true) return true;
    return false;
  };

  const isHostStaff = user?.role === "admin" || user?.role === "staff";
  const noteEnabled = isHostStaff || (user?.enableNote ?? false);

  // 현재 경로에 해당하는 부모 섹션 찾기
  const activeParent = DEFAULT_NAVIGATION.find((item) =>
    item.children?.some(
      (child) => pathname === child.href || pathname.startsWith(child.href + "/")
    )
  );

  if (!activeParent?.children?.length) return null;

  const visibleChildren = isSuperAdmin
    ? activeParent.children.filter((c) => noteEnabled || c.href !== "/schedule/notebook")
    : activeParent.children.filter((c) => {
        if (!noteEnabled && c.href === "/schedule/notebook") return false;
        return hasPerm(c.href);
      });

  if (!visibleChildren.length) return null;

  // 가장 구체적으로 매칭되는 자식 찾기 (가장 긴 prefix 우선)
  let activHref = "";
  let bestLen = 0;
  for (const child of visibleChildren) {
    if (pathname === child.href || pathname.startsWith(child.href + "/")) {
      if (child.href.length > bestLen) {
        bestLen = child.href.length;
        activHref = child.href;
      }
    }
  }

  if (variant === "inline") {
    // 헤더 중앙 인라인 모드 — pill 스타일 탭
    return (
      <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none max-w-[640px]">
        {visibleChildren.map((child) => {
          const isActive = activHref === child.href;
          return (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-[14px] whitespace-nowrap transition-all duration-150 font-medium",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/80"
              )}
            >
              {child.name}
            </Link>
          );
        })}
      </nav>
    );
  }

  // bar 모드 — 전체폭 바, 정중앙 정렬
  return (
    <div className="border-b border-slate-200 bg-white shadow-sm shrink-0">
      <div className="flex flex-wrap items-center justify-center gap-0.5 px-4">
        {visibleChildren.map((child) => {
          const isActive = activHref === child.href;
          return (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "relative px-3 py-2.5 text-[14px] whitespace-nowrap transition-colors duration-150",
                isActive ? "text-indigo-600 font-medium" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {child.name}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
