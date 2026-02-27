'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useValidateInvitation,
  useAcceptInvitation,
  useAcceptInvitationExisting,
} from '@/hooks/use-employment';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2, UserPlus, LogIn } from 'lucide-react';

type AcceptMode = 'choose' | 'new' | 'existing';

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { data: validation, isLoading, error: fetchError } = useValidateInvitation(token);
  const acceptNewMutation = useAcceptInvitation();
  const acceptExistingMutation = useAcceptInvitationExisting();

  const [mode, setMode] = useState<AcceptMode>('choose');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 신규 계정 폼
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // 기존 계정 폼
  const [existEmail, setExistEmail] = useState('');
  const [existPassword, setExistPassword] = useState('');

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

  // 성공 완료
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-[16px]">초대 수락 완료</CardTitle>
            <CardDescription className="text-[12px]">
              {validation.client?.clientName}의 직원으로 등록되었습니다.
              직원 로그인으로 이용해주세요.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/login">
              <Button size="sm">로그인하기</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleAcceptNew = () => {
    setError(null);
    acceptNewMutation.mutate(
      { token, name: newName, password: newPassword, phone: newPhone || undefined },
      {
        onSuccess: () => setSuccess(true),
        onError: (err) =>
          setError(err instanceof Error ? err.message : '수락에 실패했습니다'),
      },
    );
  };

  const handleAcceptExisting = () => {
    setError(null);
    acceptExistingMutation.mutate(
      { token, email: existEmail, password: existPassword },
      {
        onSuccess: () => setSuccess(true),
        onError: (err) =>
          setError(err instanceof Error ? err.message : '수락에 실패했습니다'),
      },
    );
  };

  const inv = validation.invitation!;
  const client = validation.client!;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <Link href="/" className="inline-block mb-3">
            <div className="w-12 h-12 bg-[#E4007F] rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
          </Link>
          <CardTitle className="text-[16px]">직원 초대</CardTitle>
          <CardDescription className="text-[12px]">
            <strong>{client.clientName}</strong>에서{' '}
            <span className="font-medium">
              {inv.role === 'MANAGER' ? '관리자' : '직원'}
            </span>
            로 초대했습니다
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-[11px] text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'choose' && (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-auto py-3 justify-start"
                onClick={() => setMode('new')}
              >
                <UserPlus className="h-4 w-4 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-[12px] font-medium">새 계정 만들기</div>
                  <div className="text-[10px] text-gray-500">처음 가입하는 경우</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full h-auto py-3 justify-start"
                onClick={() => setMode('existing')}
              >
                <LogIn className="h-4 w-4 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-[12px] font-medium">기존 계정으로 연결</div>
                  <div className="text-[10px] text-gray-500">이미 계정이 있는 경우</div>
                </div>
              </Button>
            </div>
          )}

          {mode === 'new' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">이름</Label>
                <Input
                  className="text-[11px]"
                  placeholder="이름을 입력하세요"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">비밀번호</Label>
                <Input
                  className="text-[11px]"
                  type="password"
                  placeholder="6자 이상"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">연락처 (선택)</Label>
                <Input
                  className="text-[11px]"
                  placeholder="010-0000-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setMode('choose')}
                >
                  뒤로
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!newName || newPassword.length < 6 || acceptNewMutation.isPending}
                  onClick={handleAcceptNew}
                >
                  {acceptNewMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  )}
                  가입 및 수락
                </Button>
              </div>
            </div>
          )}

          {mode === 'existing' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">이메일</Label>
                <Input
                  className="text-[11px]"
                  type="email"
                  placeholder="기존 계정 이메일"
                  value={existEmail}
                  onChange={(e) => setExistEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">비밀번호</Label>
                <Input
                  className="text-[11px]"
                  type="password"
                  placeholder="기존 계정 비밀번호"
                  value={existPassword}
                  onChange={(e) => setExistPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setMode('choose')}
                >
                  뒤로
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!existEmail || !existPassword || acceptExistingMutation.isPending}
                  onClick={handleAcceptExisting}
                >
                  {acceptExistingMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  )}
                  연결 및 수락
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
