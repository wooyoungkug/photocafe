'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useValidateInvitation } from '@/hooks/use-employment';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function InviteAcceptPage() {
  const params = useParams();
  const token = params.token as string;

  const { data: validation, isLoading, error: fetchError } = useValidateInvitation(token);

  // 로딩
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // 에러 or 무효
  if (fetchError || !validation?.valid) {
    const message = validation?.expired
      ? '초대 링크가 만료되었습니다. 거래처에 새 초대를 요청해주세요.'
      : validation?.alreadyAccepted
        ? '이미 수락된 초대입니다.'
        : '유효하지 않은 초대 링크입니다.';

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-[16px]">초대 확인 불가</CardTitle>
            <CardDescription className="text-[12px]">{message}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/login">
              <Button variant="outline" size="sm">로그인 페이지로</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const inv = validation.invitation!;
  const client = validation.client!;
  const provider = inv.oauthProvider;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <Link href="/" className="inline-block mb-3">
            <div className="w-12 h-12 bg-[#E4007F] rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
          </Link>
          <CardTitle className="text-[24px]">직원 초대</CardTitle>
          <CardDescription className="text-[14px] text-black">
            <span className="font-bold">{client.clientName}</span>에서{' '}
            <span className="font-bold">
              {inv.role === 'MANAGER' ? 'Manager' : inv.role === 'EDITOR' ? 'Editor' : 'Staff'}
            </span>
            (으)로 초대했습니다
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-[14px] text-gray-600 text-center">
            소셜 계정으로 가입하고 초대를 수락합니다
          </p>

          {/* 지정된 Provider만 표시, 미지정(기존 초대) 시 모두 표시 */}
          {(!provider || provider === 'naver') && (
            <a
              href={`${apiUrl}/auth/naver-invite/${token}`}
              className="flex items-center justify-center gap-2 w-full h-10 rounded-md text-[12px] font-medium text-white bg-[#03C75A] hover:bg-[#03C75A]/90"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M13.5 10.56L6.26 0H0v20h6.5V9.44L13.74 20H20V0h-6.5v10.56z" fill="#fff"/></svg>
              네이버로 가입
            </a>
          )}
          {(!provider || provider === 'kakao') && (
            <a
              href={`${apiUrl}/auth/kakao-invite/${token}`}
              className="flex items-center justify-center gap-2 w-full h-10 rounded-md text-[12px] font-medium text-black/85 bg-[#FEE500] hover:bg-[#FEE500]/90"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M10 1C4.477 1 0 4.477 0 8.667c0 2.7 1.746 5.075 4.38 6.423l-.89 3.29a.42.42 0 00.638.46l3.877-2.563c.649.09 1.315.138 1.995.138 5.523 0 10-3.477 10-7.748C20 4.477 15.523 1 10 1z" fill="#191919"/></svg>
              카카오로 가입
            </a>
          )}
          {(!provider || provider === 'google') && (
            <a
              href={`${apiUrl}/auth/google-invite/${token}`}
              className="flex items-center justify-center gap-2 w-full h-10 rounded-md border text-[12px] font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.07l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google로 가입
            </a>
          )}

          <div className="pt-2">
            <Link href="/login">
              <Button variant="outline" size="sm" className="w-full">
                뒤로
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
