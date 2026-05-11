'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Mail } from 'lucide-react';
import Image from 'next/image';

function StaffRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staffId = searchParams.get('staffId') || '';

  const [companyEmail, setCompanyEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) {
      setError('잘못된 접근입니다. 소셜 로그인부터 다시 시도해주세요.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${apiUrl}/auth/staff/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, companyEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '등록에 실패했습니다');

      router.push(`/auth/staff/pending?staffId=${staffId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-900/50 backdrop-blur">
        <CardHeader className="space-y-4 pt-8 text-center">
          <div className="mx-auto mb-2">
            <Image
              src="/images/photocafe_logo_v3.png"
              alt="PhotoCafe"
              width={160}
              height={48}
              priority
              className="h-[48px] w-auto"
            />
          </div>
          <div className="w-14 h-14 bg-indigo-600/20 border border-indigo-600/30 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">소속 회사 확인</h2>
            <p className="text-sm text-slate-400 mt-1">
              회사 대표 이메일을 입력하면 승인 후 팀에 합류할 수 있어요
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-6">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-400 bg-red-900/30 border border-red-800/50 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyEmail" className="text-slate-300 text-sm">
                회사 대표 이메일
              </Label>
              <Input
                id="companyEmail"
                type="email"
                placeholder="company@example.com"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                disabled={isLoading}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isLoading || !companyEmail}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              등록하기
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center pb-6">
          <button
            type="button"
            onClick={() => router.push(`/auth/staff/pending?staffId=${staffId}`)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            나중에 등록하기
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function StaffRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      }
    >
      <StaffRegisterContent />
    </Suspense>
  );
}
