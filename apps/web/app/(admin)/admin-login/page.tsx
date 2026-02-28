'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-900/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">관리자 로그인</CardTitle>
          <CardDescription className="text-slate-400">
            소셜 계정으로 로그인하세요
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <a
            href={`${API_URL}/auth/staff/naver`}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-md text-sm font-medium text-white transition-colors bg-[#03C75A] hover:bg-[#02b351]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
            </svg>
            네이버로 로그인
          </a>

          <a
            href={`${API_URL}/auth/staff/kakao`}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-md text-sm font-medium text-black/85 transition-colors bg-[#FEE500] hover:bg-[#FDD835]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.735 1.81 5.13 4.534 6.487l-1.15 4.23a.3.3 0 00.462.334l4.96-3.278c.39.032.785.05 1.194.05 5.523 0 10-3.463 10-7.732S17.523 3 12 3" />
            </svg>
            카카오로 로그인
          </a>

          <a
            href={`${API_URL}/auth/staff/google`}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-md text-sm font-medium text-slate-200 border border-slate-600 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google로 로그인
          </a>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-xs text-slate-400 text-center">
            처음 로그인 시 관리자 승인이 필요합니다.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
