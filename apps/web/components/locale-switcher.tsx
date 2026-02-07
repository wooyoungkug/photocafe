'use client';

import { useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { locales, localeNames, type Locale } from '@/i18n/routing';
import { Globe } from 'lucide-react';

function setLocaleCookie(locale: string) {
  document.cookie = `locale=${locale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
}

function getCurrentLocaleFromCookie(): string {
  const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
  return match ? match[1] : 'ko';
}

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = useCallback((newLocale: string) => {
    setLocaleCookie(newLocale);
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  // Alt+L: cycle through locales
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const current = getCurrentLocaleFromCookie();
        const idx = locales.indexOf(current as Locale);
        const next = locales[(idx + 1) % locales.length];
        handleChange(next);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleChange]);

  return (
    <div className="flex items-center gap-1">
      <Globe className="h-4 w-4 text-gray-400" />
      <select
        value={currentLocale}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="text-xs border border-gray-600 rounded px-1.5 py-1 bg-gray-800 text-gray-200 hover:bg-gray-700 cursor-pointer disabled:opacity-50"
        title="Alt+L"
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeNames[locale as Locale]}
          </option>
        ))}
      </select>
    </div>
  );
}

/** 키보드 단축키만 동작하는 보이지 않는 컴포넌트 (root layout용) */
export function LocaleShortcut() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const current = getCurrentLocaleFromCookie();
        const idx = locales.indexOf(current as Locale);
        const next = locales[(idx + 1) % locales.length];
        setLocaleCookie(next);
        startTransition(() => {
          router.refresh();
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return null;
}
