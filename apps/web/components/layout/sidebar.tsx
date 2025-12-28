"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Package,
  DollarSign,
  ClipboardList,
  BarChart3,
  Settings,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "대시보드",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    name: "회사정보",
    icon: Building2,
    children: [
      { name: "환경설정", href: "/company/settings" },
      { name: "직원관리", href: "/company/employees" },
      { name: "부서관리", href: "/company/departments" },
      { name: "거래처관리", href: "/company/clients" },
      { name: "거래처그룹", href: "/company/client-groups" },
      { name: "카테고리", href: "/company/categories" },
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
      { name: "거래처별", href: "/statistics/clients" },
      { name: "제본방법별", href: "/statistics/binding" },
    ],
  },
  {
    name: "설정",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-xl font-bold text-primary">인쇄업 ERP</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {navigation.map((item) => (
          <div key={item.name}>
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-6 py-2 text-sm font-medium",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ) : (
              <div className="px-6 py-2">
                <div className="flex items-center gap-3 text-sm font-medium text-gray-900">
                  <item.icon className="h-5 w-5" />
                  {item.name}
                  <ChevronDown className="ml-auto h-4 w-4" />
                </div>
                <div className="mt-1 space-y-1 pl-8">
                  {item.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "block py-1.5 text-sm",
                        pathname === child.href
                          ? "text-primary font-medium"
                          : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
