// 지원 언어 목록 및 기본 설정
export const locales = ['ko', 'en', 'ja', 'zh'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ko';

// 언어명 표시용
export const localeNames: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
};

// Accept-Language 헤더에서 최적 locale 감지
export function detectLocaleFromHeader(acceptLanguage: string): Locale {
  // "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6" 형식 파싱
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, qParam] = lang.trim().split(';');
      const q = qParam ? parseFloat(qParam.split('=')[1]) : 1;
      return { code: code.trim().toLowerCase(), q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { code } of languages) {
    // 정확한 매치 (ko-kr → ko)
    const primary = code.split('-')[0];
    if (locales.includes(primary as Locale)) {
      return primary as Locale;
    }
    // zh-cn, zh-tw → zh
    if (primary === 'zh') return 'zh';
  }

  return defaultLocale;
}
