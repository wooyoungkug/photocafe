"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback, useTransition, useEffect } from "react";
import {
  Building2,
  Package,
  DollarSign,
  ClipboardList,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LayoutDashboard,
  Database,
  MessageSquare,
  Headphones,
  Server,
  Wifi,
  WifiOff,
  CalendarDays,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

const defaultNavigation = [
  {
    id: "dashboard",
    name: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "basic-info",
    name: "기초정보",
    icon: Database,
    children: [
      { name: "기초정보 설정", href: "/settings/basic" },
      { name: "용지관리", href: "/master/papers" },
      { name: "원단정보", href: "/master/fabrics" },
      { name: "카테고리", href: "/company/categories" },
      { name: "규격정보", href: "/master/specifications" },
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
      { name: "거래처관리", href: "/company/members" },
      { name: "회원그룹", href: "/company/member-groups" },
    ],
  },
  {
    id: "products",
    name: "상품관리",
    icon: Package,
    children: [
      { name: "상품목록", href: "/products" },
      { name: "상품등록", href: "/products/new" },
      { name: "반제품", href: "/products/half" },
    ],
  },
  {
    id: "orders",
    name: "주문관리",
    icon: ClipboardList,
    children: [
      { name: "주문목록", href: "/orders" },
      { name: "접수대기", href: "/orders/pending" },
      { name: "생산진행", href: "/orders/production" },
      { name: "배송관리", href: "/orders/shipping" },
      { name: "마감관리", href: "/orders/reception" },
    ],
  },
  {
    id: "accounting",
    name: "회계관리",
    icon: Wallet,
    children: [
      { name: "매출관리", href: "/accounting/sales" },
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
    icon: BarChart3,
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
    icon: Settings,
    children: [
      { name: "환경설정", href: "/settings" },
      { name: "모델 관리", href: "/settings/models" },
    ],
  },
];

const STORAGE_KEY = "sidebar-menu-order";
const CHILDREN_STORAGE_KEY = "sidebar-children-order";

// 하위 메뉴 순서 저장 타입
type ChildrenOrder = Record<string, string[]>; // { menuId: [href1, href2, ...] }

// 서버 상태 타입
type ServerStatus = 'connected' | 'disconnected' | 'checking';

// 서버 상태 정보 타입
interface ServerStatusInfo {
  status: ServerStatus;
  responseTime: number | null;
}

// 서버 상태 배지 컴포넌트
function ServerStatusBadge({ status }: { status: ServerStatusInfo }) {
  if (status.status === 'checking') {
    return (
      <div className="flex items-center gap-1">
        <div className="h-1.5 w-1.5 bg-yellow-500 animate-pulse" />
        <span className="text-[9px] text-yellow-500">확인중</span>
      </div>
    );
  }

  if (status.status === 'connected') {
    return (
      <div className="flex items-center gap-1">
        <div className="h-1.5 w-1.5 bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
        <span className="text-[9px] text-green-500">연결됨</span>
        {status.responseTime !== null && (
          <span className="text-[8px] text-slate-500 ml-0.5">{status.responseTime}ms</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="h-1.5 w-1.5 bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)] animate-pulse" />
      <span className="text-[9px] text-red-500">연결안됨</span>
    </div>
  );
}

export function Sidebar({ onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { user } = useAuthStore();

  // 기본적으로 모든 메뉴 접힘 (빈 배열)
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [navigation, setNavigation] = useState(defaultNavigation);

  // 관리자 여부 확인
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';

  // 서버 상태 관리 (API, Frontend, Database)
  const [apiStatus, setApiStatus] = useState<ServerStatusInfo>({ status: 'checking', responseTime: null });
  const [frontendStatus, setFrontendStatus] = useState<ServerStatusInfo>({ status: 'checking', responseTime: null });
  const [dbStatus, setDbStatus] = useState<ServerStatusInfo>({ status: 'checking', responseTime: null });

  // API 서버 상태 체크 함수
  const checkApiStatus = useCallback(async () => {
    setApiStatus(prev => ({ ...prev, status: 'checking' }));
    const startTime = Date.now();
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        setApiStatus({ status: 'connected', responseTime: Date.now() - startTime });
      } else {
        setApiStatus({ status: 'disconnected', responseTime: null });
      }
    } catch {
      setApiStatus({ status: 'disconnected', responseTime: null });
    }
  }, []);

  // Frontend 서버 상태 체크 함수 (self-check)
  const checkFrontendStatus = useCallback(async () => {
    setFrontendStatus(prev => ({ ...prev, status: 'checking' }));
    const startTime = Date.now();
    try {
      // Next.js 자체 상태 확인 (현재 페이지가 로드되었으므로 연결됨)
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        setFrontendStatus({ status: 'connected', responseTime: Date.now() - startTime });
      } else {
        // API 라우트가 없어도 페이지가 로드되면 연결됨으로 처리
        setFrontendStatus({ status: 'connected', responseTime: Date.now() - startTime });
      }
    } catch {
      // 에러가 나도 현재 페이지가 보이면 연결된 것
      setFrontendStatus({ status: 'connected', responseTime: Date.now() - startTime });
    }
  }, []);

  // Database 상태 체크 함수 (API를 통해)
  const checkDbStatus = useCallback(async () => {
    setDbStatus(prev => ({ ...prev, status: 'checking' }));
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/health/db`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          setDbStatus({ status: 'connected', responseTime: data.responseTime || null });
        } else {
          setDbStatus({ status: 'disconnected', responseTime: null });
        }
      } else {
        setDbStatus({ status: 'disconnected', responseTime: null });
      }
    } catch {
      setDbStatus({ status: 'disconnected', responseTime: null });
    }
  }, []);

  // 모든 서버 상태 체크
  const checkAllServers = useCallback(async () => {
    await Promise.all([checkApiStatus(), checkFrontendStatus(), checkDbStatus()]);
  }, [checkApiStatus, checkFrontendStatus, checkDbStatus]);

  // 초기 로드 및 주기적 상태 체크
  useEffect(() => {
    checkAllServers();
    const interval = setInterval(checkAllServers, 30000); // 30초마다 체크
    return () => clearInterval(interval);
  }, [checkAllServers]);

  // localStorage에서 메뉴 순서 불러오기
  useEffect(() => {
    try {
      // 대분류 메뉴 순서 불러오기
      const savedOrder = localStorage.getItem(STORAGE_KEY);
      // 하위 메뉴 순서 불러오기
      const savedChildrenOrder = localStorage.getItem(CHILDREN_STORAGE_KEY);
      const childrenOrder: ChildrenOrder = savedChildrenOrder ? JSON.parse(savedChildrenOrder) : {};

      let result = defaultNavigation;

      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder) as string[];
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          const reordered = orderIds
            .map(id => defaultNavigation.find(item => item.id === id))
            .filter(Boolean) as typeof defaultNavigation;
          // 새로 추가된 메뉴가 있을 수 있으므로 나머지 추가
          const existingIds = new Set(orderIds);
          const newItems = defaultNavigation.filter(item => !existingIds.has(item.id));
          result = [...reordered, ...newItems];
        }
      }

      // 하위 메뉴 순서 적용
      result = result.map(item => {
        if (item.children && childrenOrder[item.id]) {
          const savedHrefs = childrenOrder[item.id];
          const reorderedChildren = savedHrefs
            .map(href => item.children!.find(child => child.href === href))
            .filter(Boolean) as typeof item.children;
          // 새로 추가된 하위 메뉴 처리
          const existingHrefs = new Set(savedHrefs);
          const newChildren = item.children.filter(child => !existingHrefs.has(child.href));
          return { ...item, children: [...reorderedChildren, ...newChildren] };
        }
        return item;
      });

      // 결과가 유효한 배열인지 확인
      if (Array.isArray(result) && result.length > 0) {
        setNavigation(result);
      }
    } catch {
      // 에러 발생 시 기본값 유지
      setNavigation(defaultNavigation);
    }
  }, []);

  // 메뉴 순서 저장
  const saveOrder = useCallback((items: typeof defaultNavigation) => {
    const orderIds = items.map(item => item.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orderIds));
  }, []);

  // 메뉴 위로 이동
  const moveMenuUp = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index <= 0) return;
    setNavigation(prev => {
      const newItems = [...prev];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      saveOrder(newItems);
      return newItems;
    });
  }, [saveOrder]);

  // 메뉴 아래로 이동
  const moveMenuDown = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setNavigation(prev => {
      if (index >= prev.length - 1) return prev;
      const newItems = [...prev];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      saveOrder(newItems);
      return newItems;
    });
  }, [saveOrder]);

  // 하위 메뉴 순서 저장
  const saveChildrenOrder = useCallback((menuId: string, children: { name: string; href: string }[]) => {
    try {
      const savedChildrenOrder = localStorage.getItem(CHILDREN_STORAGE_KEY);
      const childrenOrder: ChildrenOrder = savedChildrenOrder ? JSON.parse(savedChildrenOrder) : {};
      childrenOrder[menuId] = children.map(child => child.href);
      localStorage.setItem(CHILDREN_STORAGE_KEY, JSON.stringify(childrenOrder));
    } catch {
      // 저장 실패 시 무시
    }
  }, []);

  // 하위 메뉴 위로 이동
  const moveChildUp = useCallback((menuId: string, childIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (childIndex <= 0) return;
    setNavigation(prev => {
      return prev.map(item => {
        if (item.id === menuId && item.children) {
          const newChildren = [...item.children];
          [newChildren[childIndex - 1], newChildren[childIndex]] = [newChildren[childIndex], newChildren[childIndex - 1]];
          saveChildrenOrder(menuId, newChildren);
          return { ...item, children: newChildren };
        }
        return item;
      });
    });
  }, [saveChildrenOrder]);

  // 하위 메뉴 아래로 이동
  const moveChildDown = useCallback((menuId: string, childIndex: number, childrenLength: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (childIndex >= childrenLength - 1) return;
    setNavigation(prev => {
      return prev.map(item => {
        if (item.id === menuId && item.children) {
          const newChildren = [...item.children];
          [newChildren[childIndex], newChildren[childIndex + 1]] = [newChildren[childIndex + 1], newChildren[childIndex]];
          saveChildrenOrder(menuId, newChildren);
          return { ...item, children: newChildren };
        }
        return item;
      });
    });
  }, [saveChildrenOrder]);

  const toggleMenu = useCallback((name: string) => {
    // 같은 메뉴 클릭 시 닫기, 다른 메뉴 클릭 시 해당 메뉴만 열기 (기존 메뉴 닫힘)
    setOpenMenu((prev) => (prev === name ? null : name));
  }, []);

  const isMenuOpen = (name: string) => openMenu === name;

  // 빠른 네비게이션을 위한 핸들러
  const handleNavigation = useCallback((href: string, e: React.MouseEvent) => {
    e.preventDefault();
    startTransition(() => {
      router.push(href);
    });
    // 모바일에서 네비게이션 후 사이드바 닫기
    if (isMobile && onClose) {
      onClose();
    }
  }, [router, isMobile, onClose]);

  return (
    <div className="flex h-full w-72 flex-col bg-[#0F172A] border-r border-slate-800 shadow-2xl">
      {/* 로고 영역 */}
      <div className="flex h-20 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center group" onClick={() => isMobile && onClose?.()}>
          <Image
            src="/images/logo.png"
            alt="Printing114 로고"
            width={200}
            height={60}
            className="h-14 w-auto brightness-0 invert group-hover:opacity-80 transition-opacity duration-300"
            priority
          />
        </Link>
        {/* 모바일 닫기 버튼 */}
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="메뉴 닫기"
            aria-label="메뉴 닫기"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar">
        {!isAdmin ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 space-y-3">
              <div className="text-red-400 text-sm font-medium">
                접근 권한 없음
              </div>
              <p className="text-xs text-slate-400">
                관리자 페이지는 관리자만 접근할 수 있습니다.
              </p>
              <Link
                href="/"
                onClick={() => isMobile && onClose?.()}
                className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
              >
                쇼핑몰로 이동
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {(navigation || defaultNavigation).map((item, index) => {
            const isActive = item.href ? pathname === item.href : false;
            const isOpen = isMenuOpen(item.name);

            // 하위 메뉴 중 활성화된 것이 있는지 확인 (부모 메뉴 스타일링용)
            // const hasActiveChild = item.children?.some(child => pathname === child.href);

            return (
              <div key={item.id} className="space-y-1">
                {item.href ? (
                  <div className="flex items-center group/nav">
                    <Link
                      href={item.href}
                      prefetch={true}
                      onClick={(e) => handleNavigation(item.href!, e)}
                      className={cn(
                        "flex-1 flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors duration-100 relative overflow-hidden",
                        isActive
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100",
                        isPending && "opacity-70"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 transition-colors duration-100",
                        isActive ? "text-white" : "text-slate-500 group-hover/nav:text-slate-300"
                      )} />
                      <span className="relative z-10">{item.name}</span>
                    </Link>
                    {/* 이동 버튼 */}
                    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/nav:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => moveMenuUp(index, e)}
                        className="p-1 hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition-colors"
                        title="위로 이동"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => moveMenuDown(index, e)}
                        className="p-1 hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition-colors"
                        title="아래로 이동"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group/nav">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleMenu(item.name)}
                        className={cn(
                          "flex-1 flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-slate-800/50",
                          isOpen ? "text-slate-200" : "text-slate-400"
                        )}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 transition-colors duration-200",
                          isOpen ? "text-indigo-400" : "text-slate-500 group-hover/nav:text-slate-300"
                        )} />
                        <span className="flex-1 text-left">{item.name}</span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-slate-600 transition-transform duration-300",
                            isOpen ? "rotate-90 text-slate-400" : ""
                          )}
                        />
                      </button>
                      {/* 이동 버튼 */}
                      <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/nav:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => moveMenuUp(index, e)}
                          className="p-1 hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition-colors"
                          title="위로 이동"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => moveMenuDown(index, e)}
                          className="p-1 hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition-colors"
                          title="아래로 이동"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "grid transition-all duration-150 ease-out",
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 ml-4 space-y-1 border-l-2 border-slate-800 pl-3 py-1">
                          {item.children?.map((child, childIndex) => {
                            const isChildActive = pathname === child.href;

                            return (
                              <div key={child.href} className="flex items-center group/child">
                                <Link
                                  href={child.href}
                                  prefetch={true}
                                  onClick={(e) => handleNavigation(child.href, e)}
                                  className={cn(
                                    "flex-1 flex items-center justify-between px-3 py-2 text-sm transition-colors duration-100",
                                    isChildActive
                                      ? "bg-slate-800 text-indigo-400 font-medium translate-x-1"
                                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30",
                                    isPending && "opacity-70"
                                  )}
                                >
                                  <span>{child.name}</span>
                                  {isChildActive && (
                                    <div className="h-1.5 w-1.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                  )}
                                </Link>
                                {/* 하위 메뉴 이동 버튼 */}
                                <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/child:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => moveChildUp(item.id, childIndex, e)}
                                    className="p-0.5 hover:bg-slate-700 text-slate-600 hover:text-indigo-400 transition-colors"
                                    title="위로 이동"
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => moveChildDown(item.id, childIndex, item.children!.length, e)}
                                    className="p-0.5 hover:bg-slate-700 text-slate-600 hover:text-indigo-400 transition-colors"
                                    title="아래로 이동"
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
      </nav>

      {/* 하단 정보 */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-800 space-y-3">
        {/* 서버 상태 표시 영역 */}
        <div
          className="bg-slate-800/70 border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors overflow-hidden"
          onClick={checkAllServers}
          title="클릭하여 서버 상태 새로고침"
        >
          {/* API 서버 상태 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-300">API</span>
            </div>
            <ServerStatusBadge status={apiStatus} />
          </div>
          {/* Frontend 서버 상태 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Wifi className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-300">Frontend</span>
            </div>
            <ServerStatusBadge status={frontendStatus} />
          </div>
          {/* Database 서버 상태 */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-300">Database</span>
            </div>
            <ServerStatusBadge status={dbStatus} />
          </div>
        </div>

        {/* DEV 환경 표시 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-amber-900/30 border border-amber-700/50">
            <div className="h-1.5 w-1.5 bg-amber-500 animate-pulse" />
            <span className="text-[10px] text-amber-500 font-medium">DEV MODE</span>
          </div>
        )}

        {/* 사용자 정보 */}
        <div className="flex items-center gap-3 px-2 py-2 bg-slate-800/50 border border-slate-700/50">
          <div className="h-8 w-8 bg-slate-700 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-300">AD</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-medium text-slate-200 truncate">관리자</span>
            <span className="text-[10px] text-slate-500 truncate">admin@printing114.com</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-600 text-center">
          © 2026 Printing114 Inc.
        </div>
      </div>
    </div>
  );
}

