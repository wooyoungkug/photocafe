'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, User, Menu, X, Star } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLocale, useTranslations } from 'next-intl';

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
            <Link href="/image-management/quality-analysis" className="hover:text-white transition-colors">{th('imageManagement')}</Link>
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
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
                  className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-1 md:gap-3">
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
                  <Link href="/mypage/orders" className="flex items-center gap-1.5 p-2 hover:opacity-60 transition-opacity">
                    <User className="h-4 w-4 text-neutral-600" />
                    <span className="text-sm text-neutral-700">{user?.name}{th('honorific')}</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors tracking-wide uppercase"
                  >
                    {tc('logout')}
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-3 ml-2">
                  <Link
                    href="/login"
                    className="text-xs text-neutral-600 hover:text-neutral-900 transition-colors tracking-wide uppercase"
                  >
                    {tc('login')}
                  </Link>
                  <Link href="/register">
                    <Button
                      size="sm"
                      className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs tracking-wider uppercase rounded-none h-8 px-4"
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
                className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-neutral-400"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-100">
          <div className="container mx-auto px-4 py-5 space-y-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                  <User className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-medium text-neutral-900">{user?.name}{th('honorific')}</span>
                </div>
                <Link href="/mypage/my-products" className="block py-1.5 text-sm text-neutral-600 hover:text-neutral-900" onClick={() => setMobileMenuOpen(false)}>
                  마이상품
                </Link>
                <Link href="/mypage/orders" className="block py-1.5 text-sm text-neutral-600 hover:text-neutral-900" onClick={() => setMobileMenuOpen(false)}>
                  {th('orderHistory')}
                </Link>
                <button
                  className="block py-1.5 text-sm text-red-500"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  {tc('logout')}
                </button>
              </>
            ) : (
              <div className="flex gap-3">
                <Link href="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full rounded-none text-sm h-10">{tc('login')}</Button>
                </Link>
                <Link href="/register" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full rounded-none bg-neutral-900 hover:bg-neutral-800 text-sm h-10">{tc('register')}</Button>
                </Link>
              </div>
            )}
            <div className="border-t border-neutral-100 pt-4 space-y-1">
              <Link href="/notice" className="block py-1.5 text-sm text-neutral-500 hover:text-neutral-900" onClick={() => setMobileMenuOpen(false)}>
                {th('notice')}
              </Link>
              <Link href="/guide" className="block py-1.5 text-sm text-neutral-500 hover:text-neutral-900" onClick={() => setMobileMenuOpen(false)}>
                {th('guide')}
              </Link>
              <Link href="/support" className="block py-1.5 text-sm text-neutral-500 hover:text-neutral-900" onClick={() => setMobileMenuOpen(false)}>
                {th('support')}
              </Link>
              <Link href="/image-management/quality-analysis" className="block py-1.5 text-sm text-neutral-500 hover:text-neutral-900" onClick={() => setMobileMenuOpen(false)}>
                {th('imageManagement')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
