import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { detectLocaleFromHeader, locales, type Locale } from './i18n/routing';

// 관리자 전용 경로 (로그인 없이 접근 차단)
const ADMIN_PATHS = ['/dashboard', '/settings', '/orders', '/company', '/production', '/accounting', '/statistics'];

async function verifyAccessToken(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 라우트는 스킵
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 관리자 경로 접근 시 HttpOnly staff_access_token 쿠키를 직접 검증.
  // (분리된 cookie 체계: staff 는 staff_access_token, 일반 회원은 access_token)
  if (ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    if (pathname === '/admin-login') {
      return NextResponse.next();
    }

    const staffToken = request.cookies.get('staff_access_token')?.value;
    const isValid = staffToken ? await verifyAccessToken(staffToken) : false;
    if (!isValid) {
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
