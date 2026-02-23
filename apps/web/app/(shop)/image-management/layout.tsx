'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Sparkles, BookOpen, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: '이미지 보정', href: '/image-management/enhancement', icon: Sparkles },
  { label: '앨범 편집도구', href: '/image-management/album-tools', icon: BookOpen },
  { label: '유틸리티', href: '/image-management/utilities', icon: Wrench },
];

export default function ImageManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-[1100px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              쇼핑몰
            </Link>
            <div className="hidden sm:block h-5 w-px bg-neutral-200" />
            <Link
              href="/image-management"
              className={cn(
                "hidden sm:block text-sm font-semibold transition-colors",
                pathname === '/image-management' ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              이미지 도구
            </Link>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1100px] mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
