"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  Package,
  DollarSign,
  ClipboardList,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Sparkles,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "기초정보",
    icon: Database,
    children: [
      { name: "기초정보 설정", href: "/basic-info/settings" },
      { name: "공통코드 관리", href: "/basic-info/codes" },
      { name: "규격정보", href: "/basic-info/units" },
      { name: "카테고리", href: "/company/categories" },
      { name: "용지관리", href: "/master/papers" },
    ],
  },
  {
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
    name: "상품관리",
    icon: Package,
    children: [
      { name: "완제품", href: "/products/finished" },
      { name: "반제품", href: "/products/half" },
      { name: "My상품", href: "/products/my" },
    ],
  },
  {
    name: "가격관리",
    icon: DollarSign,
    children: [
      { name: "표준단가", href: "/pricing/standard" },
      { name: "그룹단가", href: "/pricing/group" },
      { name: "생산옵션", href: "/pricing/production" },
    ],
  },
  {
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
    name: "설정",
    icon: Settings,
    children: [
      { name: "환경설정", href: "/settings" },
      { name: "모델 관리", href: "/settings/models" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>(["기초정보", "회사정보", "상품관리", "가격관리", "주문관리", "통계"]);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  const isMenuOpen = (name: string) => openMenus.includes(name);

  return (
    <div className="flex h-full w-64 flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-xl">
      {/* 로고 영역 */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-700/50 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          인쇄업 ERP
        </span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navigation.map((item) => (
            <div key={item.name}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                    pathname === item.href
                      ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border-l-2 border-indigo-400"
                      : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors",
                    pathname === item.href ? "text-indigo-400" : "text-slate-500"
                  )} />
                  {item.name}
                </Link>
              ) : (
                <div>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white rounded-lg transition-all duration-200"
                  >
                    <item.icon className="h-5 w-5 text-slate-500" />
                    {item.name}
                    {isMenuOpen(item.name) ? (
                      <ChevronDown className="ml-auto h-4 w-4 text-slate-500 transition-transform" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-500 transition-transform" />
                    )}
                  </button>
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300",
                      isMenuOpen(item.name) ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="mt-1 ml-4 space-y-1 border-l border-slate-700 pl-4">
                      {item.children?.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block py-2 px-3 text-sm rounded-md transition-all duration-200",
                            pathname === child.href
                              ? "text-indigo-400 font-medium bg-indigo-500/10"
                              : "text-slate-500 hover:text-slate-200 hover:bg-slate-700/30"
                          )}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* 하단 정보 */}
      <div className="border-t border-slate-700/50 p-4">
        <div className="text-xs text-slate-500 text-center">
          © 2026 인쇄업 ERP v2.0
        </div>
      </div>
    </div>
  );
}

