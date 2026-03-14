'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Camera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { useCreateShooting } from '@/hooks/use-shooting';
import type { CreateShootingDto } from '@/hooks/use-shooting';
import { ShootingForm } from '@/components/shooting/shooting-form';

export default function ScheduleNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  if (isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-[18px] text-black font-bold mb-2">접근 불가</p>
        <p className="text-[14px] text-gray-500">관리자 계정은 일정관리를 이용할 수 없습니다.</p>
        <p className="text-[14px] text-gray-400">스튜디오 계정으로 로그인해 주세요.</p>
      </div>
    );
  }
  const createMutation = useCreateShooting();

  // URL ?date=YYYY-MM-DD 파라미터로 초기 날짜 설정, 기본값은 오늘 + 현재 시간
  const dateParam = searchParams.get('date');

  const now = new Date();
  const y = now.getFullYear();
  const mo = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  const todayStr = `${y}-${mo}-${d}`;
  const h = now.getHours();
  const rawM = now.getMinutes();
  const roundedM = Math.round(rawM / 10) * 10;
  const adjustedM = roundedM === 60 ? 0 : roundedM;
  const adjustedH = roundedM === 60 ? (h + 1) % 24 : h;
  const timeStr = `${adjustedH.toString().padStart(2, '0')}:${adjustedM.toString().padStart(2, '0')}:00`;

  const targetDate = dateParam || todayStr;
  const defaultValues = { shootingDate: `${targetDate}T${timeStr}` };

  const handleSubmit = async (data: CreateShootingDto) => {
    try {
      await createMutation.mutateAsync(data);
      toast({
        title: '등록 완료',
        description: '촬영 일정이 등록되었습니다.',
      });
      router.push('/mypage/schedule');
    } catch {
      toast({
        title: '등록 실패',
        description: '촬영 일정을 등록하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    router.push('/mypage/schedule');
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push('/mypage/schedule')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-gray-700" />
          <h2 className="text-[18px] text-black font-bold">촬영 일정 등록</h2>
        </div>
      </div>

      {/* 폼 */}
      <div className="w-[70%]">
      <ShootingForm
        defaultValues={defaultValues as any}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createMutation.isPending}
        mode="create"
      />
      </div>
    </div>
  );
}
