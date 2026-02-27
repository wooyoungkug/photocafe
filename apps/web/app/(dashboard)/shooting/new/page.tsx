'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { useCreateShooting } from '@/hooks/use-shooting';
import type { CreateShootingDto } from '@/hooks/use-shooting';
import { ShootingForm } from '@/components/shooting/shooting-form';

export default function ShootingNewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const createMutation = useCreateShooting();

  const handleSubmit = async (data: CreateShootingDto) => {
    try {
      await createMutation.mutateAsync(data);
      toast({
        title: '등록 완료',
        description: '촬영 일정이 등록되었습니다.',
      });
      router.push('/shooting');
    } catch {
      toast({
        title: '등록 실패',
        description: '촬영 일정을 등록하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    router.push('/shooting');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/shooting')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Camera className="h-6 w-6 text-gray-700" />
          <h1 className="text-[24px] text-black font-normal">촬영 일정 등록</h1>
        </div>
      </div>

      {/* 폼 */}
      <ShootingForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createMutation.isPending}
        mode="create"
      />
    </div>
  );
}
