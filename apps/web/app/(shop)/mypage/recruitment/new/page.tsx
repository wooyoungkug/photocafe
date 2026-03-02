'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCreateShooting } from '@/hooks/use-shooting';
import type { CreateShootingDto } from '@/hooks/use-shooting';
import { ShootingForm } from '@/components/shooting/shooting-form';

export default function RecruitmentNewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createMutation = useCreateShooting();

  const handleSubmit = async (data: CreateShootingDto) => {
    try {
      const result = await createMutation.mutateAsync({
        ...data,
        enableRecruitment: true,
      });
      toast({
        title: '구인 등록 완료',
        description: '구인이 등록되었습니다.',
      });
      if (result.linkedRecruitmentId) {
        router.push(`/mypage/recruitment/${result.linkedRecruitmentId}`);
      } else {
        router.push('/mypage/recruitment');
      }
    } catch {
      toast({
        title: '등록 실패',
        description: '구인 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    router.push('/mypage/recruitment');
  };

  return (
    <div className="space-y-4">
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
          <Briefcase className="h-5 w-5 text-gray-700" />
          <h2 className="text-[18px] text-black font-bold">구인 등록</h2>
        </div>
      </div>

      {/* 폼 */}
      <ShootingForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createMutation.isPending}
        mode="create"
        defaultEnableRecruitment={true}
      />
    </div>
  );
}
