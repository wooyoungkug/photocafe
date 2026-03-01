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
  // 대리로그인 데이터가 있으면 sessionStorage에 직접 적용
  // setAuth를 쓰면 localStorage의 관리자 토큰이 삭제되므로, 직접 sessionStorage에 저장
  useEffect(() => {
    const raw = localStorage.getItem('impersonate-data');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      localStorage.removeItem('impersonate-data');

      // sessionStorage에 직접 토큰 저장 (localStorage 건드리지 않음)
      sessionStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem('refreshToken', data.refreshToken);
      // 대리로그인 세션 플래그 (logout 시 localStorage 보호용)
      sessionStorage.setItem('impersonate-session', 'true');

      // Zustand auth-storage도 sessionStorage에 직접 저장
      const authStorage = JSON.stringify({
        state: {
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
          rememberMe: false,
        },
        version: 0,
      });
      sessionStorage.setItem('auth-storage', authStorage);

      // Zustand 스토어 rehydrate하여 UI 반영
      useAuthStore.persist.rehydrate();
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
    </div>
  );
}
