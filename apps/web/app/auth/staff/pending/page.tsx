'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, Mail } from 'lucide-react';

function StaffPendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staffId = searchParams.get('staffId');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-900/50 backdrop-blur text-center">
        <CardHeader className="space-y-4 pt-8">
          <div className="w-16 h-16 bg-amber-600/20 border border-amber-600/30 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">승인을 기다리고 있어요</h2>
        </CardHeader>
        <CardContent className="space-y-3 px-8">
          <p className="text-sm text-slate-400">
            가입 요청이 접수되었습니다.
          </p>
          <p className="text-sm text-slate-400">
            관리자가 승인하면 로그인할 수 있습니다.
          </p>
          {staffId && (
            <button
              type="button"
              onClick={() => router.push(`/auth/staff/register?staffId=${staffId}`)}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
            >
              <Mail className="h-3.5 w-3.5" />
              회사 이메일 등록하기
            </button>
          )}
        </CardContent>
        <CardFooter className="flex justify-center pb-8">
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => router.push('/admin-login')}
          >
            <LogOut className="mr-2 h-4 w-4" />
            로그인 페이지로 돌아가기
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function StaffPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      }
    >
      <StaffPendingContent />
    </Suspense>
  );
}

