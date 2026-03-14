'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import {
  ShoppingBag,
  Calendar,
  Camera,
  Wallet,
  User,
  MapPin,
  Star,
  Users,
  Briefcase,
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
  canManageSchedule?: boolean;
  canManageRecruitment?: boolean;
  enableSchedule?: boolean;
  enableRecruitment?: boolean;
} | null) {
  const isEmployee = user?.type === 'employee';
  const enableSchedule = user?.enableSchedule ?? true;
  const enableRecruitment = user?.enableRecruitment ?? true;
  const items: { icon: typeof User; label: string; href: string }[] = [
    { icon: User, label: '회원정보', href: '/mypage/profile' },
  ];

  // 거래처 소유자 또는 MANAGER 직원만 직원관리 메뉴 표시
  if (!isEmployee || user?.employeeRole === 'MANAGER') {
    items.push({ icon: Users, label: '직원관리', href: '/mypage/employees' });
  }

  items.push({ icon: MapPin, label: '배송지 관리', href: '/mypage/addresses' });

  // 마이상품: 항상 표시 (모든 직원 포함)
  items.push({ icon: Star, label: '마이상품', href: '/mypage/my-products' });

  // 주문내역: 선택사항 — 거래처 소유자는 항상, 직원은 canViewAllOrders 권한 필요
  if (!isEmployee || user?.canViewAllOrders) {
    items.push({ icon: ShoppingBag, label: '주문내역', href: '/mypage/orders' });
  }

  // 월거래집계, 입금내역: 거래처 소유자 또는 canViewSettlement 권한 직원
  if (!isEmployee || user?.canViewSettlement) {
    items.push({ icon: Calendar, label: '월거래집계', href: '/mypage/monthly-summary' });
    items.push({ icon: Wallet, label: '입금내역', href: '/mypage/deposits' });
  }

  // 일정관리: 1차(스튜디오 활성) AND (거래처 소유자 OR 직원 권한 있음)
  if (enableSchedule && (!isEmployee || user?.canManageSchedule)) {
    items.push({ icon: Camera, label: '일정관리', href: '/mypage/schedule' });
  }

  // 구인방: 1차(스튜디오 활성) AND (거래처 소유자 OR 직원 권한 있음)
  if (enableRecruitment && (!isEmployee || user?.canManageRecruitment)) {
    items.push({ icon: Briefcase, label: '구인방', href: '/mypage/recruitment' });
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
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const menuItems = getMenuItems(user);

  // 마운트 시 최신 서비스 기능 설정 반영 (관리자가 변경했을 수 있으므로)
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (user.role !== 'client' && user.type !== 'employee') return;
    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    fetch(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && (data.enableSchedule !== undefined || data.enableRecruitment !== undefined)) {
          updateUser({ enableSchedule: data.enableSchedule, enableRecruitment: data.enableRecruitment });
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-[18px] text-black font-bold mb-2">로그인이 필요합니다</h2>
            <p className="text-[14px] font-normal text-gray-600 mb-4">
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
    <div className="min-h-screen bg-gray-50 text-[14px] font-normal">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h1 className="text-[18px] text-black font-bold">마이페이지</h1>
          </div>
          <p className="text-[14px] text-gray-500 ml-7 mt-0.5">
            {user?.type === 'employee'
              ? user?.isOwner
                ? `${user?.name}(최고관리자)님, 환영합니다`
                : `${user?.clientName} ${user?.name}(${user?.employeeRole === 'MANAGER' ? 'Manager' : user?.employeeRole === 'EDITOR' ? 'Editor' : 'Staff'})님, 환영합니다`
              : `${user?.name || user?.clientName}(최고관리자)님, 환영합니다`}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* 모바일 가로 스크롤 탭 */}
        <div className="lg:hidden mb-4">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <nav className="flex gap-1 min-w-max pb-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + '/');

                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      type="button"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[14px] font-normal whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-primary text-white font-medium'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </button>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="grid lg:grid-cols-[18%_1fr] gap-5">
          {/* 데스크톱 사이드바 */}
          <aside className="hidden lg:block">
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
                          type="button"
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
            <Card className="mt-3">
              <CardContent className="p-3">
                <h3 className="text-[14px] font-medium text-gray-500 mb-1.5">회원 정보</h3>
                <div className="text-[14px] text-gray-600 space-y-0.5">
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
