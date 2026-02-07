'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { locales, localeNames, type Locale } from '@/i18n/routing';
import { Globe } from 'lucide-react';

function setLocaleCookie(locale: string) {
  document.cookie = `locale=${locale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
}

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (newLocale: string) => {
    setLocaleCookie(newLocale);
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Globe className="h-4 w-4 text-gray-500" />
      <select
        value={currentLocale}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="text-xs border rounded px-1.5 py-1 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50"
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
