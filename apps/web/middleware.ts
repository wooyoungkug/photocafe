import { NextRequest, NextResponse } from 'next/server';
import { detectLocaleFromHeader, locales, type Locale } from './i18n/routing';

export function middleware(request: NextRequest) {
  // API 라우트는 스킵
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 이미 locale 쿠키가 설정되어 있으면 스킵
  const existingLocale = request.cookies.get('locale')?.value;
  if (existingLocale && locales.includes(existingLocale as Locale)) {
    return NextResponse.next();
  }

  // Accept-Language 헤더에서 locale 자동감지
  const acceptLanguage = request.headers.get('accept-language') || '';
  const detectedLocale = detectLocaleFromHeader(acceptLanguage);

  // 감지된 locale을 쿠키에 저장 (1년)
  const response = NextResponse.next();
  response.cookies.set('locale', detectedLocale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
  });

  return response;
}

export const config = {
  // 정적 파일, _next, favicon 등은 제외
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)'],
};
