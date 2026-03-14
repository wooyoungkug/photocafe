'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { useShooting, useUpdateShooting } from '@/hooks/use-shooting';
import type { CreateShootingDto } from '@/hooks/use-shooting';
import { ShootingForm } from '@/components/shooting/shooting-form';

export default function ScheduleEditPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const shootingId = params.id as string;

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

  const { data: shooting, isLoading, error } = useShooting(shootingId);
  const updateMutation = useUpdateShooting();

  const handleSubmit = async (data: CreateShootingDto) => {
    try {
      await updateMutation.mutateAsync({ id: shootingId, data });
      toast({
        title: '수정 완료',
        description: '촬영 일정이 수정되었습니다.',
      });
      router.push(`/mypage/schedule/${shootingId}`);
    } catch {
      toast({
        title: '수정 실패',
        description: '촬영 일정을 수정하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    router.push(`/mypage/schedule/${shootingId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !shooting) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-10 w-10 text-gray-300" />
        <p className="text-[14px] text-gray-500">촬영 정보를 불러올 수 없습니다.</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/mypage/schedule')}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[70%] mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCancel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-gray-700" />
          <h2 className="text-[18px] text-black font-bold">촬영 일정 수정</h2>
        </div>
      </div>

      {/* 폼 */}
      <ShootingForm
        defaultValues={shooting}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={updateMutation.isPending}
        mode="edit"
      />
    </div>
  );
}
