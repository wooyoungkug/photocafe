'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, User, Menu, Star, ClipboardList, BarChart3, MapPin, CreditCard, CalendarDays, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLocale, useTranslations } from 'next-intl';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';

export function ShopHeader() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { items } = useCartStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const locale = useLocale();
  const th = useTranslations('header');
  const tc = useTranslations('common');

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="bg-white sticky top-0 z-50">
      {/* Announcement Bar */}
      <div className="bg-neutral-900 text-neutral-400 text-[11px]">
        <div className="container mx-auto px-4 py-1.5 flex justify-between items-center">
          <span className="tracking-wider">{th('slogan')}</span>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/notice" className="hover:text-white transition-colors">{th('notice')}</Link>
            <Link href="/guide" className="hover:text-white transition-colors">{th('guide')}</Link>
            <Link href="/support" className="hover:text-white transition-colors">{th('support')}</Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="border-b border-neutral-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 -ml-2"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="메뉴 열기"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="shop-heading text-xl md:text-2xl font-light tracking-tight text-neutral-900">
                printing<span className="font-normal">114</span>
              </span>
            </Link>

            {/* Search Bar - Desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-10">
              <div className="relative w-full">
                <Input
                  type="search"
                  placeholder={th('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 h-9 text-sm border-neutral-200 focus:border-neutral-400 rounded-none bg-neutral-50 placeholder:text-neutral-400"
                />
                <button
                  type="submit"
                  title={tc('search')}
                  aria-label={tc('search')}
                  className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-1 md:gap-3">
              {/* Quick Links - 로그인 시만 표시 */}
              {isAuthenticated && (
                <>
                  <Link href="/mypage/orders" className="hidden md:flex relative p-2 hover:opacity-60 transition-opacity" title="주문내역">
                    <ClipboardList className="h-5 w-5 text-neutral-700" />
                  </Link>
                  <Link href="/mypage/monthly-summary" className="hidden md:flex relative p-2 hover:opacity-60 transition-opacity" title="월거래집계">
                    <BarChart3 className="h-5 w-5 text-neutral-700" />
                  </Link>
                  <Link href="/mypage/addresses" className="hidden md:flex relative p-2 hover:opacity-60 transition-opacity" title="배송지관리">
                    <MapPin className="h-5 w-5 text-neutral-700" />
                  </Link>
                </>
              )}

              {/* Cart */}
              <Link href="/cart" className="relative p-2 hover:opacity-60 transition-opacity">
                <ShoppingCart className="h-5 w-5 text-neutral-700" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gold text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-medium">
                    {cartItemCount > 99 ? '99' : cartItemCount}
                  </span>
                )}
              </Link>

              {/* My Products */}
              {isAuthenticated && (
                <Link href="/mypage/my-products" className="hidden md:flex relative p-2 hover:opacity-60 transition-opacity" title="마이상품">
                  <Star className="h-5 w-5 text-neutral-700" />
                </Link>
              )}

              {/* User */}
              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-2 ml-2">
                  <Link href="/mypage/profile" className="flex items-center gap-1.5 p-2 hover:opacity-60 transition-opacity">
                    <User className="h-4 w-4 text-neutral-600" />
                    <span className="text-sm text-neutral-700">
                      {user?.type === 'employee'
                        ? `${user?.clientName ? user.clientName + ' ' : ''}${user?.name}(${user?.employeeRole === 'MANAGER' ? 'Manager' : user?.employeeRole === 'EDITOR' ? 'Editor' : 'Staff'})`
                        : user?.name}
                      {th('honorific')}
                    </span>
                  </Link>
                  <button
                    onClick={logout}
                    className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors tracking-wide uppercase"
                  >
                    {tc('logout')}
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2 ml-2">
                  <Link href="/login">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs tracking-wider uppercase rounded-none h-8 px-4 border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                    >
                      {tc('login')}
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs tracking-wider uppercase rounded-none h-8 px-4 border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                    >
                      {tc('register')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar - Mobile */}
          <form onSubmit={handleSearch} className="md:hidden pb-2.5">
            <div className="relative w-full">
              <Input
                type="search"
                placeholder={th('searchPlaceholderMobile')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 h-9 text-sm border-neutral-200 rounded-none bg-neutral-50 placeholder:text-neutral-400"
              />
              <button
                type="submit"
                title={tc('search')}
                aria-label={tc('search')}
                className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-neutral-400"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Menu - Sheet 드로어 */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] p-0 border-r-0 gap-0 [&>button:last-child]:hidden">
          <SheetTitle className="sr-only">메뉴</SheetTitle>
          <div className="flex flex-col h-full bg-white">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center">
                <span className="text-xl font-light tracking-tight text-neutral-900">
                  printing<span className="font-normal">114</span>
                </span>
              </Link>
            </div>

            {/* 메뉴 콘텐츠 */}
            <nav className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-1">
              {isAuthenticated ? (
                <>
                  {/* 사용자 정보 */}
                  <div className="flex items-center gap-2 pb-3 mb-3 border-b border-neutral-100">
                    <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-neutral-500" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-neutral-900 block">
                        {user?.type === 'employee'
                          ? `${user?.clientName} ${user?.name}`
                          : user?.name}
                        {th('honorific')}
                      </span>
                      {user?.type === 'employee' && (
                        <span className="text-[11px] text-neutral-400">
                          {user?.employeeRole === 'MANAGER' ? 'Manager' : user?.employeeRole === 'EDITOR' ? 'Editor' : 'Staff'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 메뉴 링크 */}
                  <Link href="/mypage/orders" className="flex items-center gap-3 py-2.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    <ClipboardList className="h-4 w-4 text-neutral-400" />
                    {th('orderHistory')}
                  </Link>
                  <Link href="/mypage/my-products" className="flex items-center gap-3 py-2.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    <Star className="h-4 w-4 text-neutral-400" />
                    마이상품
                  </Link>
                  <Link href="/mypage/monthly-summary" className="flex items-center gap-3 py-2.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    <BarChart3 className="h-4 w-4 text-neutral-400" />
                    월거래집계
                  </Link>
                  <Link href="/mypage/addresses" className="flex items-center gap-3 py-2.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    <MapPin className="h-4 w-4 text-neutral-400" />
                    배송지 관리
                  </Link>
                  <Link href="/mypage/deposits" className="flex items-center gap-3 py-2.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    <CreditCard className="h-4 w-4 text-neutral-400" />
                    입금내역
                  </Link>
                  <Link href="/mypage/schedule" className="flex items-center gap-3 py-2.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    <CalendarDays className="h-4 w-4 text-neutral-400" />
                    일정관리
                  </Link>
                  <Link href="/mypage/recruitment" className="flex items-center gap-3 py-2.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    <Users className="h-4 w-4 text-neutral-400" />
                    구인방
                  </Link>
                  <Link href="/mypage/profile" className="flex items-center gap-3 py-2.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    <User className="h-4 w-4 text-neutral-400" />
                    회원정보
                  </Link>

                  {/* 로그아웃 */}
                  <div className="pt-3 mt-3 border-t border-neutral-100">
                    <button
                      type="button"
                      className="flex items-center gap-3 py-2.5 text-sm text-red-500 hover:text-red-600 transition-colors w-full"
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      {tc('logout')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex gap-3 mb-4">
                  <Link href="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-none border-neutral-300 text-neutral-700 text-sm h-10">{tc('login')}</Button>
                  </Link>
                  <Link href="/register" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-none border-neutral-300 text-neutral-700 text-sm h-10">{tc('register')}</Button>
                  </Link>
                </div>
              )}

              {/* 공통 링크 */}
              <div className="border-t border-neutral-100 pt-3 mt-3 space-y-1">
                <Link href="/notice" className="block py-2.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  {th('notice')}
                </Link>
                <Link href="/guide" className="block py-2.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  {th('guide')}
                </Link>
                <Link href="/support" className="block py-2.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  {th('support')}
                </Link>
              </div>
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

// 아이콘 헬퍼 (lucide에서 추가 import 대신 간단 SVG)
function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 2v4" /><path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
