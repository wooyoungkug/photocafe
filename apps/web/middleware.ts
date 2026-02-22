import { NextRequest, NextResponse } from 'next/server';
import { detectLocaleFromHeader, locales, type Locale } from './i18n/routing';

// 관리자 전용 경로 (로그인 없이 접근 차단)
const ADMIN_PATHS = ['/dashboard', '/settings', '/orders', '/company', '/production', '/accounting', '/statistics'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 라우트는 스킵
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 관리자 경로 접근 시 토큰 유무 체크 (클라이언트 사이드 보완)
  // 쿠키에서 auth 토큰 확인 - localStorage는 서버에서 접근 불가하므로
  // 실제 인증은 AuthGuard + API 레벨에서 수행하지만, 추가 방어막으로 동작
  if (ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    // admin-login 경로는 제외
    if (pathname === '/admin-login') {
      return NextResponse.next();
    }

    // Referer 헤더가 없고, 직접 URL 접근인 경우 로그 남기기 용도
    // (실제 차단은 AuthGuard에서 처리하지만 이중 방어)
    const authCookie = request.cookies.get('auth-verified')?.value;
    if (!authCookie) {
      // 인증 쿠키가 없으면 로그인 페이지로 리다이렉트
      const loginUrl = new URL('/admin-login', request.url);
      return NextResponse.redirect(loginUrl);
    }
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
