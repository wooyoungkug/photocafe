'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, User, Menu, X } from 'lucide-react';
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
    <header className="bg-white border-b sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-gray-900 text-white text-sm">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <span>{th('slogan')}</span>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/notice" className="hover:text-gray-300">{th('notice')}</Link>
            <Link href="/guide" className="hover:text-gray-300">{th('guide')}</Link>
            <Link href="/support" className="hover:text-gray-300">{th('support')}</Link>
            <Link href="/image-management/quality-analysis" className="hover:text-gray-300">{th('imageManagement')}</Link>
            {/* <LocaleSwitcher currentLocale={locale} /> */}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <span className="hidden sm:block text-xl font-bold text-gray-900">
              PhotoCafe
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Input
                type="search"
                placeholder={th('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 h-11 rounded-full border-gray-300 focus:border-primary"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-9 w-9"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Cart */}
            <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full">
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Link>

            {/* User */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3">
                <Link href="/mypage/orders" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
                  <User className="h-5 w-5" />
                  <span className="font-medium text-sm">{user?.name}{th('honorific')}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>
                  {tc('logout')}
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">{tc('login')}</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">{tc('register')}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar - Mobile */}
        <form onSubmit={handleSearch} className="md:hidden pb-3">
          <div className="relative w-full">
            <Input
              type="search"
              placeholder={th('searchPlaceholderMobile')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 h-10 rounded-full"
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="h-5 w-5" />
                  <span className="font-medium">{user?.name}{th('honorific')}</span>
                </div>
                <Link href="/mypage/orders" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                  {th('orderHistory')}
                </Link>
                <button
                  className="block py-2 text-red-600"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  {tc('logout')}
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">{tc('login')}</Button>
                </Link>
                <Link href="/register" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">{tc('register')}</Button>
                </Link>
              </div>
            )}
            <div className="border-t pt-4 space-y-2">
              <Link href="/notice" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                {th('notice')}
              </Link>
              <Link href="/guide" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                {th('guide')}
              </Link>
              <Link href="/support" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                {th('support')}
              </Link>
              <Link href="/image-management/quality-analysis" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                {th('imageManagement')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
