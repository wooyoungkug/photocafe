'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTopMenuCategories } from '@/hooks/use-categories';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import type { Category } from '@/lib/types/category';
import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedName } from '@/lib/utils';

export function CategoryNav() {
  const pathname = usePathname();
  const { data: topCategories = [], isLoading } = useTopMenuCategories();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const t = useTranslations('category');
  const locale = useLocale();

  if (isLoading) {
    return (
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-12 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </nav>
    );
  }

  // sortOrder 기준 정렬 (API에서 이미 정렬되어 있지만 명시적으로 재정렬)
  const sortedCategories = [...topCategories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <nav className="bg-white border-b relative z-40">
      <div className="container mx-auto px-4">
        {/* Desktop Navigation */}
        <ul className="hidden md:flex items-center h-12 gap-1">
          <li>
            <Link
              href="/"
              className={cn(
                "px-4 py-2 rounded-md font-medium transition-colors",
                pathname === "/" ? "bg-primary text-white" : "hover:bg-gray-100"
              )}
            >
              {t('allProducts')}
            </Link>
          </li>
          {sortedCategories.map((category) => (
            <li
              key={category.id}
              className="relative"
              onMouseEnter={() => setActiveCategory(category.id)}
              onMouseLeave={() => setActiveCategory(null)}
            >
              <Link
                href={`/category/${category.id}`}
                className={cn(
                  "flex items-center gap-1 px-4 py-2 rounded-md font-medium transition-colors",
                  pathname === `/category/${category.id}` || activeCategory === category.id
                    ? "bg-primary text-white"
                    : "hover:bg-gray-100"
                )}
              >
                {category.iconUrl && (
                  <img
                    src={category.iconUrl.startsWith('/api')
                      ? `${API_BASE_URL}${category.iconUrl}`
                      : category.iconUrl}
                    alt=""
                    className="h-5 w-5 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                {getLocalizedName(category, locale)}
                {category.children && category.children.length > 0 && (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Link>

              {/* Dropdown Menu */}
              {category.children && category.children.length > 0 && activeCategory === category.id && (
                <div className="absolute top-full left-0 w-64 bg-white border shadow-lg rounded-lg py-2 pt-3 before:content-[''] before:absolute before:top-[-8px] before:left-0 before:w-full before:h-[10px] before:bg-transparent">
                  {[...category.children]
                    .filter(c => c.isVisible)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((child) => (
                      <CategoryMenuItem key={child.id} category={child} level={1} />
                    ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Mobile Navigation - Horizontal Scroll */}
        <div className="md:hidden overflow-x-auto scrollbar-hide">
          <ul className="flex items-center h-12 gap-2 min-w-max px-2">
            <li>
              <Link
                href="/"
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                  pathname === "/" ? "bg-primary text-white" : "bg-gray-100 hover:bg-gray-200"
                )}
              >
                {t('allShort')}
              </Link>
            </li>
            {sortedCategories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/category/${category.id}`}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                    pathname === `/category/${category.id}`
                      ? "bg-primary text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  )}
                >
                  {category.iconUrl && (
                    <img
                      src={category.iconUrl.startsWith('/api')
                        ? `${API_BASE_URL}${category.iconUrl}`
                        : category.iconUrl}
                      alt=""
                      className="h-4 w-4 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  {getLocalizedName(category, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}

function CategoryMenuItem({ category, level }: { category: Category; level: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const locale = useLocale();

  return (
    <div className="relative">
      <Link
        href={`/category/${category.id}`}
        className={cn(
          "flex items-center justify-between px-4 py-2 transition-colors rounded-md mx-1",
          "hover:bg-primary hover:text-white",
          level > 1 && "pl-8"
        )}
        onMouseEnter={() => hasChildren && setIsOpen(true)}
        onMouseLeave={() => hasChildren && setIsOpen(false)}
      >
        <span className="flex items-center gap-2">
          {category.iconUrl && (
            <img
              src={category.iconUrl.startsWith('/api')
                ? `${API_BASE_URL}${category.iconUrl}`
                : category.iconUrl}
              alt=""
              className="h-4 w-4 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          {getLocalizedName(category, locale)}
        </span>
        {hasChildren && <ChevronRight className="h-4 w-4" />}
      </Link>

      {hasChildren && isOpen && (
        <div
          className="absolute left-full top-0 w-56 bg-white border shadow-lg rounded-lg py-2 pl-2 before:content-[''] before:absolute before:top-0 before:left-[-8px] before:w-[10px] before:h-full before:bg-transparent"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {[...category.children!]
            .filter(c => c.isVisible)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((child) => (
              <CategoryMenuItem key={child.id} category={child} level={level + 1} />
            ))}
        </div>
      )}
    </div>
  );
}
