'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Building2, Loader2, User } from 'lucide-react';

interface ContextOption {
  type: 'personal' | 'employee';
  label?: string;
  clientName?: string;
  clientId?: string;
  employmentId?: string;
  companyClientId?: string;
  companyName?: string;
  role?: string;
}

interface PendingContextSelection {
  tempToken: string;
  contexts?: ContextOption[];
  rememberMe: boolean;
}

export default function SelectContextPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [contexts, setContexts] = useState<ContextOption[]>([]);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // sessionStorage에서 pending-context-selection 읽기
        const pendingRaw = sessionStorage.getItem('pending-context-selection');
        if (!pendingRaw) {
          setError('세션이 만료되었습니다. 다시 로그인해주세요.');
          setIsLoading(false);
          return;
        }

        const pending: PendingContextSelection = JSON.parse(pendingRaw);
        setTempToken(pending.tempToken);
        setRememberMe(pending.rememberMe);

        // 이미 contexts가 저장되어 있으면 (email/password 로그인 경로) 바로 사용
        if (pending.contexts && pending.contexts.length > 0) {
          setContexts(pending.contexts);
          // tempToken에서 이메일 추출 (JWT payload 디코딩)
          const tokenEmail = decodeJwtEmail(pending.tempToken);
          setEmail(tokenEmail);
          setIsLoading(false);
          return;
        }

        // contexts가 없으면 (OAuth 로그인 경로) API에서 조회
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
        const res = await fetch(
          `${apiUrl}/auth/my-contexts?tempToken=${encodeURIComponent(pending.tempToken)}`,
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: '컨텍스트 조회에 실패했습니다.' }));
          throw new Error(errData.message || '컨텍스트 조회에 실패했습니다.');
        }

        const data = await res.json();
        setContexts(data.contexts);
        setEmail(data.email);
      } catch (e) {
        setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  /** JWT payload에서 이메일 추출 (클라이언트 디코딩, 서명 검증 없음) */
  function decodeJwtEmail(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      return payload.email || null;
    } catch {
      return null;
    }
  }

  const handleSelectContext = async (context: ContextOption) => {
    if (!tempToken) return;

    setError(null);
    setIsSelecting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/auth/select-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken,
          contextType: context.type,
          employmentId: context.employmentId,
          rememberMe,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: '로그인에 실패했습니다.' }));
        throw new Error(errData.message || '로그인에 실패했습니다.');
      }

      const data = await res.json();

      // sessionStorage 정리
      sessionStorage.removeItem('pending-context-selection');

      // auth store에 인증 정보 설정
      setAuth({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        rememberMe,
      });

      // 메인 페이지로 이동
      router.push('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSelecting(false);
    }
  };

  const handleBack = () => {
    sessionStorage.removeItem('pending-context-selection');
    router.push('/login');
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-300px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <Link href="/" className="inline-block mb-4">
              <div className="w-12 h-12 bg-[#E4007F] rounded-lg flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-2xl">P</span>
              </div>
            </Link>
            <CardTitle className="text-2xl">계정 선택</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // 에러 상태 (contexts 로드 실패)
  if (error && contexts.length === 0) {
    return (
      <div className="min-h-[calc(100vh-300px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <Link href="/" className="inline-block mb-4">
              <div className="w-12 h-12 bg-[#E4007F] rounded-lg flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-2xl">P</span>
              </div>
            </Link>
            <CardTitle className="text-2xl">오류</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 text-[11px] text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              로그인 페이지로 이동
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-300px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="inline-block mb-4">
            <div className="w-12 h-12 bg-[#E4007F] rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
          </Link>
          <CardTitle className="text-2xl">계정 선택</CardTitle>
          <CardDescription className="text-[11px] text-black font-normal">
            {email
              ? `${email} 계정으로 로그인할 방법을 선택해주세요`
              : '로그인할 계정을 선택해주세요'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 text-[11px] text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {contexts.map((context, index) => {
            const isPersonal = context.type === 'personal';
            const title = isPersonal
              ? '내 계정'
              : context.companyName || '알 수 없는 회사';
            const subtitle = isPersonal
              ? (context.clientName || '개인 계정')
              : (context.role === 'MANAGER' ? 'Manager' : 'Staff');

            return (
              <Button
                key={isPersonal ? 'personal' : context.employmentId || index}
                variant="outline"
                className="w-full h-auto py-4 px-4 justify-start gap-3 hover:border-[#E4007F]/50 hover:bg-[#E4007F]/5 transition-colors"
                disabled={isSelecting}
                onClick={() => handleSelectContext(context)}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 shrink-0">
                  {isPersonal ? (
                    <User className="h-5 w-5 text-gray-600" />
                  ) : (
                    <Building2 className="h-5 w-5 text-gray-600" />
                  )}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-[12px] text-black font-medium truncate">
                    {title}
                  </div>
                  <div className="text-[11px] text-black font-normal opacity-60">
                    {subtitle}
                  </div>
                </div>
                {isSelecting && (
                  <Loader2 className="ml-auto h-4 w-4 animate-spin shrink-0" />
                )}
              </Button>
            );
          })}
        </CardContent>

        <CardFooter>
          <Button
            variant="ghost"
            className="w-full text-[11px]"
            onClick={handleBack}
            disabled={isSelecting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            돌아가기
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
