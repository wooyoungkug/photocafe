"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { getFilteredNavigation, type NavItem } from "@/lib/navigation";
import { MegaMenuContent } from "./mega-menu-content";

const HOVER_OPEN_DELAY = 120;
const HOVER_CLOSE_DELAY = 180;

/**
 * 상단 가로 메뉴바 (메인 56px 라인).
 * - hover 진입 시 120ms delay 후 서브메뉴 오픈
 * - 폭이 부족하면 마지막 항목부터 "더보기" 드롭다운으로 이동
 * - 권한 필터 적용
 */
export function TopNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.isSuperAdmin === true || user?.role === "admin";
  const navigation = getFilteredNavigation(user?.menuPermissions, isSuperAdmin);

  const [openId, setOpenId] = useState<string | null>(null);
  const openTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 오버플로우 처리: 보이는 개수 측정
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(navigation.length);

  useEffect(() => {
    const el = containerRef.current;
    const measure = measureRef.current;
    if (!el || !measure) return;

    const calculate = () => {
      const containerWidth = el.clientWidth;
      // "더보기" 드롭다운 폭 예약
      const reservedForMore = 96;
      const available = Math.max(0, containerWidth - reservedForMore);

      const items = Array.from(measure.querySelectorAll<HTMLElement>("[data-nav-measure]"));
      let used = 0;
      let count = 0;
      for (let i = 0; i < items.length; i++) {
        const w = items[i].offsetWidth + 4;
        if (used + w > available) break;
        used += w;
        count = i + 1;
      }
      setVisibleCount(count > 0 ? count : Math.min(1, navigation.length));
    };

    calculate();
    const ro = new ResizeObserver(calculate);
    ro.observe(el);
    return () => ro.disconnect();
  }, [navigation.length]);

  const visibleItems = navigation.slice(0, visibleCount);
  const overflowItems = navigation.slice(visibleCount);

  const handleEnter = (id: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    openTimerRef.current = setTimeout(() => setOpenId(id), HOVER_OPEN_DELAY);
  };

  const handleLeave = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpenId(null), HOVER_CLOSE_DELAY);
  };

  const handleClose = () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenId(null);
  };

  // ESC 키 닫기
  useEffect(() => {
    if (!openId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openId]);

  return (
    <div ref={containerRef} className="flex-1 min-w-0 relative">
      {/* 화면 밖 측정용 동일 항목 (보이지 않음) */}
      <div
        ref={measureRef}
        className="absolute -left-[9999px] top-0 flex gap-1 pointer-events-none"
        aria-hidden="true"
      >
        {navigation.map((item) => (
          <NavTrigger key={`m-${item.id}`} item={item} measureMode />
        ))}
      </div>

      {/* 실제 렌더 */}
      <ul className="flex items-center gap-1">
        {visibleItems.map((item) => {
          const isActive = isPathActive(item, pathname);
          const isOpen = openId === item.id;
          return (
            <li
              key={item.id}
              className="relative"
              onMouseEnter={() => item.children && handleEnter(item.id)}
              onMouseLeave={() => item.children && handleLeave()}
            >
              <NavTrigger item={item} active={isActive} open={isOpen} />
              {isOpen && item.children && (
                <div
                  className="absolute left-0 top-full z-50 pt-1"
                  onMouseEnter={() => {
                    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                  }}
                  onMouseLeave={handleLeave}
                >
                  <MegaMenuContent item={item} onNavigate={handleClose} />
                </div>
              )}
            </li>
          );
        })}

        {overflowItems.length > 0 && (
          <li
            className="relative"
            onMouseEnter={() => handleEnter("__more__")}
            onMouseLeave={handleLeave}
          >
            <button
              type="button"
              className={cn(
                "flex items-center gap-1 rounded-md px-3 h-10 fs-menu-main font-normal text-black transition-colors",
                "hover:bg-slate-100",
                openId === "__more__" && "bg-slate-100",
              )}
              aria-expanded={openId === "__more__" ? "true" : "false"}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span>더보기</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {openId === "__more__" && (
              <div
                className="absolute right-0 top-full z-50 pt-1"
                onMouseEnter={() => {
                  if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                }}
                onMouseLeave={handleLeave}
              >
                <MoreOverflowPanel
                  items={overflowItems}
                  pathname={pathname}
                  onNavigate={handleClose}
                />
              </div>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}

function isPathActive(item: NavItem, pathname: string): boolean {
  if (item.href && (pathname === item.href || pathname.startsWith(item.href + "/"))) return true;
  if (item.children) {
    return item.children.some(
      (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
    );
  }
  return false;
}

function NavTrigger({
  item,
  active,
  open,
  measureMode,
}: {
  item: NavItem;
  active?: boolean;
  open?: boolean;
  measureMode?: boolean;
}) {
  const Icon = item.icon;
  const className = cn(
    "flex items-center gap-1 rounded-md px-3 h-10 text-[14px] font-normal transition-colors whitespace-nowrap",
    active ? "bg-indigo-50 text-indigo-700" : "text-black hover:bg-slate-100",
    open && "bg-slate-100",
  );

  const inner = (
    <>
      <Icon className="h-4 w-4" />
      <span>{item.name}</span>
      {item.children && <ChevronDown className="h-3 w-3 ml-0.5" />}
    </>
  );

  if (measureMode) {
    return (
      <span data-nav-measure className={className}>
        {inner}
      </span>
    );
  }

  if (item.href && !item.children) {
    return (
      <Link href={item.href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-expanded={open ? "true" : "false"}
      aria-haspopup="true"
    >
      {inner}
    </button>
  );
}

function MoreOverflowPanel({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-lg p-3 flex gap-6">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isPathActive(item, pathname);
        return (
          <div key={item.id} className="flex flex-col min-w-[140px]">
            {item.href && !item.children ? (
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-2 py-1.5 fs-menu-main font-bold whitespace-nowrap",
                  active ? "bg-indigo-50 text-indigo-700" : "text-black hover:bg-slate-100",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2 px-2 py-1.5 fs-menu-main font-bold text-slate-700 whitespace-nowrap">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </div>
            )}
            {item.children && (
              <ul className="mb-1">
                {item.children.map((child) => {
                  const childActive =
                    pathname === child.href || pathname.startsWith(child.href + "/");
                  return (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-sm px-2 py-1 fs-menu-sub font-normal whitespace-nowrap",
                          childActive
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-black hover:bg-slate-100",
                        )}
                      >
                        {child.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
