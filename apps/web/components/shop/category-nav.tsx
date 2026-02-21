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
      <nav className="bg-white border-b border-neutral-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-11 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-3 w-16 bg-neutral-100 animate-pulse" />
            ))}
          </div>
        </div>
      </nav>
    );
  }

  const sortedCategories = [...topCategories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <nav className="bg-white border-b border-neutral-100 relative z-40">
      <div className="container mx-auto px-4">
        {/* Desktop Navigation */}
        <ul className="hidden md:flex items-center h-11 gap-0">
          <li>
            <Link
              href="/"
              className={cn(
                "px-4 py-2 text-xs tracking-wider uppercase font-medium transition-colors",
                pathname === "/"
                  ? "text-gold"
                  : "text-neutral-500 hover:text-neutral-900"
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
                  "flex items-center gap-1.5 px-4 py-2 text-xs tracking-wider uppercase font-medium transition-colors",
                  pathname === `/category/${category.id}` || activeCategory === category.id
                    ? "text-gold"
                    : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                {category.iconUrl && (
                  <img
                    src={category.iconUrl.startsWith('/api')
                      ? `${API_BASE_URL}${category.iconUrl}`
                      : category.iconUrl}
                    alt=""
<<<<<<< Updated upstream
                    className="h-4 w-auto object-contain"
=======
                    className="h-5 w-5 object-contain"
>>>>>>> Stashed changes
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                {getLocalizedName(category, locale)}
                {category.children && category.children.length > 0 && (
                  <ChevronDown className="h-3 w-3 opacity-50" />
                )}
              </Link>

              {/* Dropdown Menu */}
              {category.children && category.children.length > 0 && activeCategory === category.id && (
                <div className="absolute top-full left-0 w-56 bg-white border border-neutral-100 shadow-lg py-2 pt-3 before:content-[''] before:absolute before:top-[-8px] before:left-0 before:w-full before:h-[10px] before:bg-transparent">
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
          <ul className="flex items-center h-10 gap-1 min-w-max px-1">
            <li>
              <Link
                href="/"
                className={cn(
                  "px-3 py-1 text-[11px] tracking-wider uppercase font-medium transition-colors whitespace-nowrap",
                  pathname === "/"
                    ? "text-gold border-b-2 border-gold"
                    : "text-neutral-500 hover:text-neutral-900"
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
                    "flex items-center px-3 py-1 text-[11px] tracking-wider uppercase font-medium transition-colors whitespace-nowrap",
                    pathname === `/category/${category.id}`
                      ? "text-gold border-b-2 border-gold"
                      : "text-neutral-500 hover:text-neutral-900"
                  )}
                >
                  {category.iconUrl && (
                    <img
                      src={category.iconUrl.startsWith('/api')
                        ? `${API_BASE_URL}${category.iconUrl}`
                        : category.iconUrl}
                      alt=""
<<<<<<< Updated upstream
                      className="h-3.5 w-auto object-contain mr-1"
=======
                      className="h-4 w-4 object-contain"
>>>>>>> Stashed changes
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
          "flex items-center justify-between px-4 py-2 text-sm transition-colors",
          "text-neutral-600 hover:text-gold hover:bg-neutral-50",
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
<<<<<<< Updated upstream
              className="h-4 w-auto object-contain"
=======
              className="h-4 w-4 object-contain"
>>>>>>> Stashed changes
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          {getLocalizedName(category, locale)}
        </span>
        {hasChildren && <ChevronRight className="h-3 w-3 opacity-40" />}
      </Link>

      {hasChildren && isOpen && (
        <div
          className="absolute left-full top-0 w-52 bg-white border border-neutral-100 shadow-lg py-2 pl-1 before:content-[''] before:absolute before:top-0 before:left-[-8px] before:w-[10px] before:h-full before:bg-transparent"
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
