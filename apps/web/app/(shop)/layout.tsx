'use client';

import { useEffect, useState } from 'react';
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

  const [isImpersonating, setIsImpersonating] = useState(false);

  // 로그인 시 브라우저 탭 타이틀에 스튜디오명 표시
  const { user, isAuthenticated } = useAuthStore();
  useEffect(() => {
    const studioName = user?.type === 'employee' ? user?.clientName : user?.name;
    document.title = isAuthenticated && studioName
      ? `Photocafe - ${studioName}`
      : 'Photocafe';
  }, [isAuthenticated, user?.name, user?.clientName, user?.type]);

  // 대리로그인 세션 여부 확인 — providers.tsx 모듈 레벨에서 sessionStorage 세팅이 끝난 뒤 mount 됨
  // (이전엔 여기서 impersonate-data 를 직접 소비했지만 impersonate-tokens 누락 race 가 발생해 제거)
  useEffect(() => {
    setIsImpersonating(!!sessionStorage.getItem('impersonate-session'));
  }, []);

  const studioName = user?.clientName || user?.name;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {isImpersonating && (
        <div className="bg-amber-500 text-white text-[13px] font-bold px-4 py-2 flex items-center justify-between">
          <span>🔑 대리로그인 중 — {studioName}</span>
          <button
            className="text-white underline text-[12px] font-normal hover:opacity-80"
            type="button"
            onClick={() => {
              sessionStorage.removeItem('impersonate-session');
              window.close();
            }}
          >
            탭 닫기
          </button>
        </div>
      )}
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
