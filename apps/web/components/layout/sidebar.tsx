"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Cog,
  CreditCard,
  Headphones,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  CalendarDays,
  PenTool,
  PieChart,
  Receipt,
  RefreshCw,
  Server,
  ShoppingBag,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

interface NavChild {
  name: string;
  href: string;
}

interface NavItem {
  id: string;
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
}

type ServerStatus = "connected" | "disconnected" | "checking";

interface ServerStatusInfo {
  status: ServerStatus;
  responseTime: number | null;
}

type ChildrenOrder = Record<string, string[]>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "sidebar-menu-order";
const CHILDREN_STORAGE_KEY = "sidebar-children-order";

const DEFAULT_NAVIGATION: NavItem[] = [
  {
    id: "dashboard",
    name: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "basic-info",
    name: "기초정보",
    icon: Layers,
    children: [
      { name: "기초정보 설정", href: "/settings/basic" },
      { name: "용지관리", href: "/master/papers" },
      { name: "원단정보", href: "/master/fabrics" },
      { name: "카테고리", href: "/company/categories" },
      { name: "규격정보", href: "/master/specifications" },
      { name: "공용동판관리", href: "/settings/public-copper-plates" },
      { name: "JDF 표준", href: "/master/jdf" },
      { name: "가격관리", href: "/pricing/production" },
    ],
  },
  {
    id: "company",
    name: "회사정보",
    icon: Building2,
    children: [
      { name: "환경설정", href: "/company/settings" },
      { name: "직원관리", href: "/company/employees" },
      { name: "회원관리", href: "/company/members" },
      { name: "회원그룹", href: "/company/member-groups" },
    ],
  },
  {
    id: "products",
    name: "상품관리",
    icon: ShoppingBag,
    children: [
      { name: "상품목록", href: "/products" },
      { name: "상품등록", href: "/products/new" },
      { name: "반제품", href: "/products/half" },
    ],
  },
  {
    id: "orders",
    name: "주문관리",
    icon: Receipt,
    children: [
      { name: "주문목록", href: "/orders" },
      { name: "접수대기", href: "/orders/pending" },
      { name: "생산진행", href: "/orders/production" },
      { name: "배송관리", href: "/orders/shipping" },
      { name: "마감관리", href: "/orders/reception" },
    ],
  },
  {
    id: "editing",
    name: "편집관리",
    icon: PenTool,
    children: [
      { name: "편집대기", href: "/editing/pending" },
      { name: "편집진행", href: "/editing/progress" },
      { name: "편집완료", href: "/editing/completed" },
      { name: "이미지 품질분석", href: "/image-management/quality-analysis" },
    ],
  },
  {
    id: "accounting",
    name: "회계관리",
    icon: CreditCard,
    children: [
      { name: "계정과목관리", href: "/accounting/accounts" },
      { name: "전표관리", href: "/accounting/journals" },
      { name: "매출원장", href: "/accounting/sales" },
      { name: "매입관리", href: "/accounting/purchases" },
      { name: "미수금관리", href: "/accounting/receivables" },
      { name: "미지급관리", href: "/accounting/payables" },
      { name: "정산관리", href: "/accounting/settlements" },
      { name: "세금계산서관리", href: "/accounting/tax-invoices" },
    ],
  },
  {
    id: "cs",
    name: "CS관리",
    icon: Headphones,
    children: [
      { name: "CS대시보드", href: "/cs" },
      { name: "상담목록", href: "/cs/consultations" },
      { name: "상담등록", href: "/cs/consultations/new" },
      { name: "상담분류", href: "/cs/categories" },
      { name: "상담가이드", href: "/cs/guides" },
    ],
  },
  {
    id: "schedule",
    name: "일정관리",
    href: "/schedule",
    icon: CalendarDays,
  },
  {
    id: "statistics",
    name: "통계",
    icon: PieChart,
    children: [
      { name: "매출통계", href: "/statistics/sales" },
      { name: "품목분류별", href: "/statistics/sales-categories" },
      { name: "회원별", href: "/statistics/members" },
      { name: "제본방법별", href: "/statistics/binding" },
    ],
  },
  {
    id: "settings",
    name: "설정",
    icon: Cog,
    children: [
      { name: "환경설정", href: "/settings" },
      { name: "모델 관리", href: "/settings/models" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper: user initials
// ---------------------------------------------------------------------------

function getUserInitials(name?: string, email?: string): string {
  if (name && name.length > 0) {
    // Korean names: take last 2 characters (usually given name)
    if (/[\uAC00-\uD7AF]/.test(name)) {
      return name.length >= 2 ? name.slice(-2) : name;
    }
    // Non-Korean names: take first two capital letters
    const parts = name.split(/\s+/);
    return parts
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
}

function getRoleBadge(role?: string): { label: string; className: string } {
  switch (role) {
    case "admin":
      return {
        label: "관리자",
        className: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      };
    case "staff":
      return {
        label: "스태프",
        className: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      };
    default:
      return {
        label: "사용자",
        className: "bg-slate-500/20 text-slate-300 border-slate-500/30",
      };
  }
}

// ---------------------------------------------------------------------------
// Sub-component: StatusDot
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: ServerStatusInfo }) {
  if (status.status === "checking") {
    return (
      <span
        className="inline-block h-2 w-2 rounded-full bg-yellow-400 animate-pulse"
        aria-label="확인중"
      />
    );
  }
  if (status.status === "connected") {
    return (
      <span
        className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
        aria-label="연결됨"
      />
    );
  }
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)] animate-pulse"
      aria-label="연결안됨"
    />
  );
}

// ---------------------------------------------------------------------------
// Sub-component: ReorderButtons (parent menu)
// ---------------------------------------------------------------------------

function ReorderButtons({
  index,
  total,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  total: number;
  onMoveUp: (i: number, e: React.MouseEvent) => void;
  onMoveDown: (i: number, e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex items-center gap-px ml-1 opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200">
      <button
        type="button"
        onClick={(e) => onMoveUp(index, e)}
        disabled={index === 0}
        className="p-0.5 rounded text-slate-600 hover:text-indigo-400 hover:bg-white/5 disabled:opacity-20 disabled:cursor-default transition-colors"
        title="위로 이동"
        aria-label="위로 이동"
      >
        <ChevronUp className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={(e) => onMoveDown(index, e)}
        disabled={index === total - 1}
        className="p-0.5 rounded text-slate-600 hover:text-indigo-400 hover:bg-white/5 disabled:opacity-20 disabled:cursor-default transition-colors"
        title="아래로 이동"
        aria-label="아래로 이동"
      >
        <ChevronDown className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: ChildReorderButtons
// ---------------------------------------------------------------------------

function ChildReorderButtons({
  menuId,
  childIndex,
  childrenLength,
  onMoveUp,
  onMoveDown,
}: {
  menuId: string;
  childIndex: number;
  childrenLength: number;
  onMoveUp: (menuId: string, idx: number, e: React.MouseEvent) => void;
  onMoveDown: (menuId: string, idx: number, len: number, e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex items-center gap-px ml-1 opacity-0 group-hover/child:opacity-100 transition-opacity duration-200">
      <button
        type="button"
        onClick={(e) => onMoveUp(menuId, childIndex, e)}
        disabled={childIndex === 0}
        className="p-0.5 rounded text-slate-600 hover:text-indigo-400 hover:bg-white/5 disabled:opacity-20 disabled:cursor-default transition-colors"
        title="위로 이동"
        aria-label="위로 이동"
      >
        <ChevronUp className="h-2.5 w-2.5" />
      </button>
      <button
        type="button"
        onClick={(e) => onMoveDown(menuId, childIndex, childrenLength, e)}
        disabled={childIndex === childrenLength - 1}
        className="p-0.5 rounded text-slate-600 hover:text-indigo-400 hover:bg-white/5 disabled:opacity-20 disabled:cursor-default transition-colors"
        title="아래로 이동"
        aria-label="아래로 이동"
      >
        <ChevronDown className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hooks: useServerStatus
// ---------------------------------------------------------------------------

function useServerStatus() {
  const [apiStatus, setApiStatus] = useState<ServerStatusInfo>({
    status: "checking",
    responseTime: null,
  });
  const [dbStatus, setDbStatus] = useState<ServerStatusInfo>({
    status: "checking",
    responseTime: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkApiStatus = useCallback(async () => {
    setApiStatus((prev) => ({ ...prev, status: "checking" }));
    const start = Date.now();
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
      const res = await fetch(`${apiUrl}/health`, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      setApiStatus(
        res.ok
          ? { status: "connected", responseTime: Date.now() - start }
          : { status: "disconnected", responseTime: null }
      );
    } catch {
      setApiStatus({ status: "disconnected", responseTime: null });
    }
  }, []);

  const checkDbStatus = useCallback(async () => {
    setDbStatus((prev) => ({ ...prev, status: "checking" }));
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
      const res = await fetch(`${apiUrl}/health/db`, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        setDbStatus(
          data.status === "ok"
            ? { status: "connected", responseTime: data.responseTime || null }
            : { status: "disconnected", responseTime: null }
        );
      } else {
        setDbStatus({ status: "disconnected", responseTime: null });
      }
    } catch {
      setDbStatus({ status: "disconnected", responseTime: null });
    }
  }, []);

  const checkAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([checkApiStatus(), checkDbStatus()]);
    setIsRefreshing(false);
  }, [checkApiStatus, checkDbStatus]);

  // Check once on mount + on window focus
  useEffect(() => {
    checkAll();
    const handleFocus = () => checkAll();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [checkAll]);

  return { apiStatus, dbStatus, isRefreshing, checkAll };
}

// ---------------------------------------------------------------------------
// Hooks: useMenuOrder
// ---------------------------------------------------------------------------

function useMenuOrder() {
  const [navigation, setNavigation] = useState(DEFAULT_NAVIGATION);

  // Load saved order from localStorage
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem(STORAGE_KEY);
      const savedChildrenOrder = localStorage.getItem(CHILDREN_STORAGE_KEY);
      const childrenOrder: ChildrenOrder = savedChildrenOrder
        ? JSON.parse(savedChildrenOrder)
        : {};

      let result = DEFAULT_NAVIGATION;

      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder) as string[];
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          const reordered = orderIds
            .map((id) => DEFAULT_NAVIGATION.find((item) => item.id === id))
            .filter(Boolean) as NavItem[];
          const existingIds = new Set(orderIds);
          const newItems = DEFAULT_NAVIGATION.filter(
            (item) => !existingIds.has(item.id)
          );
          result = [...reordered, ...newItems];
        }
      }

      // Apply children order
      result = result.map((item) => {
        if (item.children && childrenOrder[item.id]) {
          const savedHrefs = childrenOrder[item.id];
          const reorderedChildren = savedHrefs
            .map((href) => item.children!.find((child) => child.href === href))
            .filter(Boolean) as NavChild[];
          const existingHrefs = new Set(savedHrefs);
          const newChildren = item.children.filter(
            (child) => !existingHrefs.has(child.href)
          );
          return { ...item, children: [...reorderedChildren, ...newChildren] };
        }
        return item;
      });

      if (Array.isArray(result) && result.length > 0) {
        setNavigation(result);
      }
    } catch {
      setNavigation(DEFAULT_NAVIGATION);
    }
  }, []);

  const saveOrder = useCallback((items: NavItem[]) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.map((i) => i.id))
    );
  }, []);

  const saveChildrenOrder = useCallback(
    (menuId: string, children: NavChild[]) => {
      try {
        const raw = localStorage.getItem(CHILDREN_STORAGE_KEY);
        const order: ChildrenOrder = raw ? JSON.parse(raw) : {};
        order[menuId] = children.map((c) => c.href);
        localStorage.setItem(CHILDREN_STORAGE_KEY, JSON.stringify(order));
      } catch {
        /* ignore */
      }
    },
    []
  );

  const moveMenuUp = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (index <= 0) return;
      setNavigation((prev) => {
        const next = [...prev];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        saveOrder(next);
        return next;
      });
    },
    [saveOrder]
  );

  const moveMenuDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setNavigation((prev) => {
        if (index >= prev.length - 1) return prev;
        const next = [...prev];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        saveOrder(next);
        return next;
      });
    },
    [saveOrder]
  );

  const moveChildUp = useCallback(
    (menuId: string, childIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (childIndex <= 0) return;
      setNavigation((prev) =>
        prev.map((item) => {
          if (item.id === menuId && item.children) {
            const next = [...item.children];
            [next[childIndex - 1], next[childIndex]] = [
              next[childIndex],
              next[childIndex - 1],
            ];
            saveChildrenOrder(menuId, next);
            return { ...item, children: next };
          }
          return item;
        })
      );
    },
    [saveChildrenOrder]
  );

  const moveChildDown = useCallback(
    (
      menuId: string,
      childIndex: number,
      childrenLength: number,
      e: React.MouseEvent
    ) => {
      e.preventDefault();
      e.stopPropagation();
      if (childIndex >= childrenLength - 1) return;
      setNavigation((prev) =>
        prev.map((item) => {
          if (item.id === menuId && item.children) {
            const next = [...item.children];
            [next[childIndex], next[childIndex + 1]] = [
              next[childIndex + 1],
              next[childIndex],
            ];
            saveChildrenOrder(menuId, next);
            return { ...item, children: next };
          }
          return item;
        })
      );
    },
    [saveChildrenOrder]
  );

  return {
    navigation,
    moveMenuUp,
    moveMenuDown,
    moveChildUp,
    moveChildDown,
  };
}

// ===========================================================================
// Sidebar Component
// ===========================================================================

export function Sidebar({ onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "staff";
  const roleBadge = getRoleBadge(user?.role);
  const initials = getUserInitials(user?.name, user?.email);

  const { apiStatus, dbStatus, isRefreshing, checkAll } = useServerStatus();
  const { navigation, moveMenuUp, moveMenuDown, moveChildUp, moveChildDown } =
    useMenuOrder();

  const toggleMenu = useCallback((name: string) => {
    setOpenMenu((prev) => (prev === name ? null : name));
  }, []);

  const handleNavigation = useCallback(() => {
    if (isMobile && onClose) onClose();
  }, [isMobile, onClose]);

  return (
    <div
      className={cn(
        "flex h-full w-72 flex-col",
        "bg-gradient-to-b from-[#0F172A] via-[#0F172A] to-[#0B1120]",
        "border-r border-slate-800/60",
        "shadow-2xl shadow-black/30"
      )}
    >
      {/* ── Logo ── */}
      <div className="flex h-[72px] items-center justify-between px-5 border-b border-white/[0.04]">
        <Link
          href="/dashboard"
          className="flex items-center group"
          onClick={() => isMobile && onClose?.()}
          aria-label="대시보드로 이동"
        >
          <Image
            src="/images/logo.png"
            alt="Printing114 로고"
            width={200}
            height={60}
            className="h-12 w-auto brightness-0 invert opacity-90 group-hover:opacity-100 transition-opacity duration-300"
            priority
          />
        </Link>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="메뉴 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 custom-scrollbar">
        {!isAdmin ? (
          /* Access denied state */
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-6 space-y-3 backdrop-blur-sm">
              <p className="text-red-400 text-sm font-medium">
                접근 권한 없음
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                관리자 페이지는 관리자만 접근할 수 있습니다.
              </p>
              <Link
                href="/"
                onClick={() => isMobile && onClose?.()}
                className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors"
              >
                쇼핑몰로 이동
              </Link>
            </div>
          </div>
        ) : (
          /* Menu list */
          <ul className="space-y-0.5" role="list">
            {navigation.map((item, index) => {
              const isActive = item.href ? pathname === item.href : false;
              const isOpen = openMenu === item.name;
              const hasActiveChild = item.children?.some(
                (child) => pathname === child.href
              );
              const Icon = item.icon;

              return (
                <li key={item.id}>
                  {item.href ? (
                    /* ── Direct link item ── */
                    <div className="flex items-center group/nav">
                      <Link
                        href={item.href}
                        onClick={handleNavigation}
                        className={cn(
                          "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 relative",
                          isActive
                            ? "bg-indigo-600/15 text-indigo-300 border-l-[3px] border-indigo-400 pl-[9px]"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border-l-[3px] border-transparent pl-[9px]"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                            isActive
                              ? "text-indigo-400"
                              : "text-slate-500 group-hover/nav:text-slate-400"
                          )}
                        />
                        <span>{item.name}</span>
                      </Link>
                      <ReorderButtons
                        index={index}
                        total={navigation.length}
                        onMoveUp={moveMenuUp}
                        onMoveDown={moveMenuDown}
                      />
                    </div>
                  ) : (
                    /* ── Expandable menu item ── */
                    <div className="group/nav">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => toggleMenu(item.name)}
                          className={cn(
                            "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 border-l-[3px] pl-[9px]",
                            isOpen || hasActiveChild
                              ? "text-slate-200 bg-white/[0.03] border-indigo-500/40"
                              : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border-transparent"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                              isOpen || hasActiveChild
                                ? "text-indigo-400"
                                : "text-slate-500"
                            )}
                          />
                          <span className="flex-1 text-left">{item.name}</span>
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 text-slate-600 transition-transform duration-200",
                              isOpen && "rotate-90 text-slate-400"
                            )}
                          />
                        </button>
                        <ReorderButtons
                          index={index}
                          total={navigation.length}
                          onMoveUp={moveMenuUp}
                          onMoveDown={moveMenuDown}
                        />
                      </div>

                      {/* ── Children ── */}
                      <div
                        className={cn(
                          "grid transition-[grid-template-rows] duration-200 ease-in-out",
                          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        )}
                      >
                        <div className="overflow-hidden">
                          <ul className="mt-1 ml-5 space-y-px border-l border-slate-700/50 pl-3 py-1">
                            {item.children?.map((child, childIndex) => {
                              const isChildActive = pathname === child.href;

                              return (
                                <li
                                  key={child.href}
                                  className="flex items-center group/child"
                                >
                                  <Link
                                    href={child.href}
                                    onClick={handleNavigation}
                                    className={cn(
                                      "flex-1 flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[12.5px] transition-all duration-200",
                                      isChildActive
                                        ? "text-indigo-300 bg-indigo-600/10 font-medium"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                                    )}
                                  >
                                    {/* Dot indicator */}
                                    <span
                                      className={cn(
                                        "h-1 w-1 rounded-full shrink-0 transition-all duration-200",
                                        isChildActive
                                          ? "bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.5)]"
                                          : "bg-slate-700 group-hover/child:bg-slate-500"
                                      )}
                                    />
                                    <span>{child.name}</span>
                                  </Link>
                                  <ChildReorderButtons
                                    menuId={item.id}
                                    childIndex={childIndex}
                                    childrenLength={item.children!.length}
                                    onMoveUp={moveChildUp}
                                    onMoveDown={moveChildDown}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* ── Footer ── */}
      <div className="p-4 border-t border-white/[0.04] space-y-3 bg-gradient-to-b from-transparent to-black/20">
        {/* Server status - compact single row */}
        <button
          type="button"
          onClick={checkAll}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors group/status"
          title="클릭하여 서버 상태 새로고침"
          aria-label="서버 상태 새로고침"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Server className="h-3 w-3 text-slate-500" />
              <span className="text-[10px] text-slate-400">API</span>
              <StatusDot status={apiStatus} />
              {apiStatus.responseTime !== null && (
                <span className="text-[9px] text-slate-600">
                  {apiStatus.responseTime}ms
                </span>
              )}
            </div>
            <div className="w-px h-3 bg-slate-700/50" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">DB</span>
              <StatusDot status={dbStatus} />
              {dbStatus.responseTime !== null && (
                <span className="text-[9px] text-slate-600">
                  {dbStatus.responseTime}ms
                </span>
              )}
            </div>
          </div>
          <RefreshCw
            className={cn(
              "h-3 w-3 text-slate-600 group-hover/status:text-slate-400 transition-colors",
              isRefreshing && "animate-spin"
            )}
          />
        </button>

        {/* DEV badge */}
        {process.env.NODE_ENV === "development" && (
          <div className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-md bg-amber-900/20 border border-amber-700/30">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] text-amber-400/80 font-medium tracking-wide">
              DEV
            </span>
          </div>
        )}

        {/* User info card */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
          {/* Avatar with initials */}
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/20">
            <span className="text-[11px] font-bold text-white/90 tracking-tight">
              {initials}
            </span>
          </div>
          <div className="flex flex-col min-w-0 gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-200 truncate">
                {user?.name || "사용자"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-px rounded text-[9px] font-medium border",
                  roleBadge.className
                )}
              >
                {roleBadge.label}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 truncate">
              {user?.email || ""}
            </span>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-[10px] text-slate-700 text-center select-none">
          &copy; 2026 Printing114 Inc.
        </p>
      </div>
    </div>
  );
}
