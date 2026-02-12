'use client';

import { useEffect } from 'react';
import { ShopHeader } from '@/components/shop/shop-header';
import { CategoryNav } from '@/components/shop/category-nav';
import { ShopFooter } from '@/components/shop/shop-footer';
import { useAuthStore } from '@/stores/auth-store';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const setAuth = useAuthStore((state) => state.setAuth);

  // 대리로그인 데이터가 있으면 sessionStorage에 적용 (관리자 탭 토큰 보존)
  useEffect(() => {
    const raw = localStorage.getItem('impersonate-data');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      localStorage.removeItem('impersonate-data');
      // rememberMe=false → sessionStorage에 저장 (탭별 독립)
      setAuth({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        rememberMe: false,
      });
    } catch {
      localStorage.removeItem('impersonate-data');
    }
  }, [setAuth]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ShopHeader />
      <CategoryNav />
      <main className="flex-1">
        {children}
      </main>
      <ShopFooter />
    </div>
  );
}
