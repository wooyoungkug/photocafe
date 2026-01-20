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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      { name: "카테고리", href: "/company/categories" },
      { name: "규격정보", href: "/master/specifications" },
      { name: "내부함수", href: "/settings/functions" },
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
      { name: "상담관리", href: "/company/consultations" },
    ],
  },
  {
    id: "products",
    name: "상품관리",
    icon: Package,
    children: [
      { name: "완제품", href: "/products/finished" },
      { name: "반제품", href: "/products/half" },
      { name: "My상품", href: "/products/my" },
    ],
  },
  {
    id: "pricing",
    name: "가격관리",
    icon: DollarSign,
    children: [
      { name: "표준단가", href: "/pricing/production" },
      { name: "그룹단가", href: "/pricing/group" },
      { name: "단가조정", href: "/pricing/rounding" },
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // 기본적으로 모든 메뉴 접힘 (빈 배열)
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [navigation, setNavigation] = useState(defaultNavigation);

  // localStorage에서 메뉴 순서 불러오기
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem(STORAGE_KEY);
      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder) as string[];
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          const reordered = orderIds
            .map(id => defaultNavigation.find(item => item.id === id))
            .filter(Boolean) as typeof defaultNavigation;
          // 새로 추가된 메뉴가 있을 수 있으므로 나머지 추가
          const existingIds = new Set(orderIds);
          const newItems = defaultNavigation.filter(item => !existingIds.has(item.id));
          const result = [...reordered, ...newItems];
          // 결과가 유효한 배열인지 확인
          if (Array.isArray(result) && result.length > 0) {
            setNavigation(result);
          }
        }
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
  }, [router]);

  return (
    <div className="flex h-full w-72 flex-col bg-[#0F172A] border-r border-slate-800 shadow-2xl">
      {/* 로고 영역 */}
      <div className="flex h-20 items-center px-4">
        <Link href="/dashboard" className="flex items-center group">
          <Image
            src="/images/logo.png"
            alt="Printing114 로고"
            width={200}
            height={60}
            className="h-14 w-auto brightness-0 invert group-hover:opacity-80 transition-opacity duration-300"
            priority
          />
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar">
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
                        "flex-1 flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors duration-100 relative overflow-hidden",
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
                        className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition-colors"
                        title="위로 이동"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => moveMenuDown(index, e)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition-colors"
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
                          "flex-1 flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-slate-800/50",
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
                          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition-colors"
                          title="위로 이동"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => moveMenuDown(index, e)}
                          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition-colors"
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
                          {item.children?.map((child) => {
                            const isChildActive = pathname === child.href;

                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                prefetch={true}
                                onClick={(e) => handleNavigation(child.href, e)}
                                className={cn(
                                  "flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors duration-100",
                                  isChildActive
                                    ? "bg-slate-800 text-indigo-400 font-medium translate-x-1"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30",
                                  isPending && "opacity-70"
                                )}
                              >
                                <span>{child.name}</span>
                                {isChildActive && (
                                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                )}
                              </Link>
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
      </nav>

      {/* 하단 정보 */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-300">AD</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-medium text-slate-200 truncate">관리자</span>
            <span className="text-[10px] text-slate-500 truncate">admin@printing114.com</span>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-slate-600 text-center">
          © 2026 Printing114 Inc.
        </div>
      </div>
    </div>
  );
}

