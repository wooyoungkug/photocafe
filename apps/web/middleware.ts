import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { detectLocaleFromHeader, locales, type Locale } from './i18n/routing';

// 관리자 전용 경로 (로그인 없이 접근 차단).
// /schedule 은 일정관리/노트장으로 client 도 접근 가능 — admin staff_access_token 또는
// 일반 회원 access_token 중 하나라도 있으면 통과.
const ADMIN_PATHS = ['/dashboard', '/settings', '/orders', '/company', '/production', '/accounting', '/statistics'];
const SHARED_AUTHED_PATHS = ['/schedule'];

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

  // 관리자 전용 경로: staff_access_token 만 허용
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

  // 공유 경로 (일정관리/노트장 등): staff 또는 일반 회원 둘 다 허용
  if (SHARED_AUTHED_PATHS.some(p => pathname.startsWith(p))) {
    const staffToken = request.cookies.get('staff_access_token')?.value;
    const clientToken = request.cookies.get('access_token')?.value;
    const ok =
      (staffToken && (await verifyAccessToken(staffToken))) ||
      (clientToken && (await verifyAccessToken(clientToken)));
    if (!ok) {
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
