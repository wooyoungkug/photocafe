'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag,
  Calendar,
  Wallet,
  User,
  MapPin,
  Star,
  Users,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';

function getMenuItems(user: {
  type?: string;
  employeeRole?: string;
  canViewAllOrders?: boolean;
  canManageProducts?: boolean;
  canViewSettlement?: boolean;
} | null) {
  const isEmployee = user?.type === 'employee';
  const items: { icon: typeof User; label: string; href: string }[] = [
    { icon: User, label: '회원정보', href: '/mypage/profile' },
  ];

  // 거래처 소유자 또는 MANAGER 직원만 직원관리 메뉴 표시
  if (!isEmployee || user?.employeeRole === 'MANAGER') {
    items.push({ icon: Users, label: '직원관리', href: '/mypage/employees' });
  }

  items.push({ icon: MapPin, label: '배송지 관리', href: '/mypage/addresses' });

  // 마이상품: 거래처 소유자 또는 canManageProducts 권한 직원
  if (!isEmployee || user?.canManageProducts) {
    items.push({ icon: Star, label: '마이상품', href: '/mypage/my-products' });
  }

  // 주문내역: 항상 표시 (canViewAllOrders=false면 본인 주문만 보임)
  items.push({ icon: ShoppingBag, label: '주문내역', href: '/mypage/orders' });

  // 월거래집계, 입금내역: 거래처 소유자 또는 canViewSettlement 권한 직원
  if (!isEmployee || user?.canViewSettlement) {
    items.push({ icon: Calendar, label: '월거래집계', href: '/mypage/monthly-summary' });
    items.push({ icon: Wallet, label: '입금내역', href: '/mypage/deposits' });
  }

  return items;
}

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const menuItems = getMenuItems(user);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-[15px] font-medium mb-2">로그인이 필요합니다</h2>
            <p className="text-[13px] font-normal text-gray-600 mb-4">
              마이페이지를 이용하려면 로그인이 필요합니다.
            </p>
            <Button size="sm" onClick={() => router.push('/login?redirect=/mypage/orders')}>
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-[13px] font-normal">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h1 className="text-[16px] font-medium">마이페이지</h1>
          </div>
          <p className="text-[12px] text-gray-500 ml-7 mt-0.5">
            {user?.type === 'employee'
              ? `${user?.clientName} ${user?.name}(${user?.employeeRole === 'MANAGER' ? 'Manager' : user?.employeeRole === 'EDITOR' ? 'Editor' : 'Staff'})님, 환영합니다`
              : `${user?.name || user?.clientName} 최고관리자님, 환영합니다`}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[18%_1fr] gap-5">
          {/* Sidebar Navigation */}
          <aside>
            <Card className="sticky top-4">
              <CardContent className="p-0">
                <nav>
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      pathname?.startsWith(item.href + '/');

                    return (
                      <Link key={item.href} href={item.href}>
                        <button
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-[14px] font-normal transition-colors ${
                            isActive
                              ? 'bg-primary text-white font-medium'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </div>
                          {isActive && <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </Link>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>

            {/* User Info Card */}
            <Card className="mt-3 hidden lg:block">
              <CardContent className="p-3">
                <h3 className="text-[12px] font-medium text-gray-500 mb-1.5">회원 정보</h3>
                <div className="text-[12px] text-gray-600 space-y-0.5">
                  <p>{user?.clientName}</p>
                  {user?.email && <p>{user.email}</p>}
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
