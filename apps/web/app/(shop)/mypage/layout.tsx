'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag,
  Calendar,
  BookOpen,
  Wallet,
  User,
  MapPin,
  Star,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';

const MENU_ITEMS = [
  {
    icon: User,
    label: '회원정보',
    href: '/mypage/profile',
  },
  {
    icon: MapPin,
    label: '배송지 관리',
    href: '/mypage/addresses',
  },
  {
    icon: Star,
    label: '마이상품',
    href: '/mypage/my-products',
  },
  {
    icon: ShoppingBag,
    label: '주문내역',
    href: '/mypage/orders',
  },
  {
    icon: Calendar,
    label: '월거래집계',
    href: '/mypage/monthly-summary',
  },
  {
    icon: BookOpen,
    label: '거래대장',
    href: '/mypage/ledger',
  },
  {
    icon: Wallet,
    label: '입금내역',
    href: '/mypage/deposits',
  },
];

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-bold mb-2">로그인이 필요합니다</h2>
            <p className="text-gray-600 mb-6">
              마이페이지를 이용하려면 로그인이 필요합니다.
            </p>
            <Button onClick={() => router.push('/login?redirect=/mypage/orders')}>
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">마이페이지</h1>
          </div>
          <p className="text-gray-500 ml-11">
            {user?.clientName || user?.email}님, 환영합니다
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {MENU_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      pathname?.startsWith(item.href + '/');

                    return (
                      <Link key={item.href} href={item.href}>
                        <button
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                            isActive
                              ? 'bg-primary text-white font-medium'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </div>
                          {isActive && <ChevronRight className="h-4 w-4" />}
                        </button>
                      </Link>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>

            {/* User Info Card (Mobile Hidden) */}
            <Card className="mt-4 hidden lg:block">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">회원 정보</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{user?.clientName}</p>
                  {user?.email && <p className="text-xs">{user.email}</p>}
                  {user?.mobile && <p className="text-xs">{user.mobile}</p>}
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">{children}</main>
        </div>
      </div>
    </div>
  );
}
