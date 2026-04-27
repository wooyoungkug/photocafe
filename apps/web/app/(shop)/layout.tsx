'use client';

import { useEffect } from 'react';
import { ShopHeader } from '@/components/shop/shop-header';
import { CategoryNav } from '@/components/shop/category-nav';
import { ShopFooter } from '@/components/shop/shop-footer';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/stores/auth-store';
import { usePageView } from '@/hooks/use-page-view';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  usePageView();

  // 로그인 시 브라우저 탭 타이틀에 스튜디오명 표시
  const { user, isAuthenticated } = useAuthStore();
  useEffect(() => {
    const studioName = user?.type === 'employee' ? user?.clientName : user?.name;
    document.title = isAuthenticated && studioName
      ? `Photocafe - ${studioName}`
      : 'Photocafe';
  }, [isAuthenticated, user?.name, user?.clientName, user?.type]);

  // 대리로그인 데이터가 있으면 sessionStorage에 직접 적용
  // 쿠키 기반 인증: 사용자 정보만 스토어에 반영
  useEffect(() => {
    const raw = localStorage.getItem('impersonate-data');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      localStorage.removeItem('impersonate-data');
      useAuthStore.getState().setAuth({ user: data.user, rememberMe: false });
    } catch {
      localStorage.removeItem('impersonate-data');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ShopHeader />
      <CategoryNav />
      <main className="flex-1">
        {children}
      </main>
      <ShopFooter />
      <Toaster />
    </div>
  );
}
