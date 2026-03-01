'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import {
  usePhotographerProfile,
  useUpsertPhotographerProfile,
} from '@/hooks/use-photographer-profile';
import { RegionSelector } from '@/components/recruitment/region-selector';
import type { ShootingType } from '@/lib/types/recruitment';

const SPECIALTY_OPTIONS: { value: ShootingType; label: string }[] = [
  { value: 'wedding_main', label: '본식 촬영' },
  { value: 'wedding_rehearsal', label: '리허설 촬영' },
  { value: 'baby_dol', label: '돌 촬영' },
  { value: 'baby_growth', label: '성장 촬영' },
  { value: 'profile', label: '프로필 촬영' },
  { value: 'other', label: '기타' },
];

interface FormData {
  preferredRegion1: string;
  preferredRegion2: string;
  preferredRegion3: string;
  introduction: string;
  career: string;
  careerYears: number;
  specialties: string[];
  isAvailableForPublic: boolean;
}

const initialFormData: FormData = {
  preferredRegion1: '',
  preferredRegion2: '',
  preferredRegion3: '',
  introduction: '',
  career: '',
  careerYears: 0,
  specialties: [],
  isAvailableForPublic: true,
};

export default function PhotographerProfilePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const { data: profile, isLoading } = usePhotographerProfile();
  const upsertMutation = useUpsertPhotographerProfile();

  const [form, setForm] = useState<FormData>(initialFormData);

  // Sync form with loaded profile data
  useEffect(() => {
    if (profile) {
      setForm({
        preferredRegion1: profile.preferredRegion1 || '',
        preferredRegion2: profile.preferredRegion2 || '',
        preferredRegion3: profile.preferredRegion3 || '',
        introduction: profile.introduction || '',
        career: profile.career || '',
        careerYears: profile.careerYears || 0,
        specialties: profile.specialties || [],
        isAvailableForPublic: profile.isAvailableForPublic ?? true,
      });
    }
  }, [profile]);

  const handleSpecialtyToggle = (specialty: string) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const handleSave = () => {
    upsertMutation.mutate(
      {
        preferredRegion1: form.preferredRegion1 || undefined,
        preferredRegion2: form.preferredRegion2 || undefined,
        preferredRegion3: form.preferredRegion3 || undefined,
        introduction: form.introduction || undefined,
        career: form.career || undefined,
        careerYears: form.careerYears || undefined,
        specialties: form.specialties,
        isAvailableForPublic: form.isAvailableForPublic,
      } as any,
      {
        onSuccess: () => {
          toast({
            title: '저장 완료',
            description: '프로필이 성공적으로 저장되었습니다.',
          });
        },
        onError: (error: any) => {
          toast({
            title: '저장 실패',
            description: error.message || '프로필 저장에 실패했습니다.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-[14px] text-black font-normal mb-4">
              로그인이 필요한 서비스입니다.
            </p>
            <Button
              size="sm"
              onClick={() =>
                router.push('/login?redirect=/mypage/photographer-profile')
              }
            >
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-5">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-3"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-[18px] text-black font-bold">
            내 프로필 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-6">
          {/* 희망 촬영 지역 */}
          <div className="space-y-3">
            <Label className="text-[14px] text-black font-bold">
              희망 촬영 지역 (우선순위)
            </Label>
            <div className="space-y-2 p-4 border rounded-md bg-gray-50">
              <RegionSelector
                label="1순위"
                value={form.preferredRegion1}
                onChange={(v) => setForm((prev) => ({ ...prev, preferredRegion1: v }))}
              />
              <RegionSelector
                label="2순위"
                value={form.preferredRegion2}
                onChange={(v) => setForm((prev) => ({ ...prev, preferredRegion2: v }))}
              />
              <RegionSelector
                label="3순위"
                value={form.preferredRegion3}
                onChange={(v) => setForm((prev) => ({ ...prev, preferredRegion3: v }))}
              />
            </div>
          </div>

          <Separator />

          {/* 자기소개 */}
          <div className="space-y-2">
            <Label htmlFor="introduction" className="text-[14px] text-black font-bold">
              자기소개
            </Label>
            <Textarea
              id="introduction"
              className="text-[14px] text-black font-normal min-h-[100px]"
              placeholder="자기소개를 입력해주세요"
              value={form.introduction}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, introduction: e.target.value }))
              }
            />
          </div>

          <Separator />

          {/* 경력 정보 */}
          <div className="space-y-3">
            <Label className="text-[14px] text-black font-bold">경력 정보</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="careerYears" className="text-[14px] text-black font-normal">
                  경력 년수
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="careerYears"
                    type="number"
                    min={0}
                    max={50}
                    className="h-9 text-[14px] text-black font-normal w-24"
                    value={form.careerYears}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        careerYears: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                  />
                  <span className="text-[14px] text-black font-normal">년</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="career" className="text-[14px] text-black font-normal">
                  주요이력
                </Label>
                <Input
                  id="career"
                  className="h-9 text-[14px] text-black font-normal"
                  placeholder="주요 경력을 입력해주세요"
                  value={form.career}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, career: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 전문 촬영 유형 */}
          <div className="space-y-3">
            <Label className="text-[14px] text-black font-bold">전문 촬영 유형</Label>
            <div className="flex flex-wrap gap-4">
              {SPECIALTY_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`specialty-${opt.value}`}
                    checked={form.specialties.includes(opt.value)}
                    onCheckedChange={() => handleSpecialtyToggle(opt.value)}
                  />
                  <Label
                    htmlFor={`specialty-${opt.value}`}
                    className="text-[14px] text-black font-normal cursor-pointer"
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 공개 구인 수신 */}
          <div className="space-y-3">
            <Label className="text-[14px] text-black font-bold">공개 구인 수신</Label>
            <div className="flex items-center gap-3">
              <Switch
                id="isAvailableForPublic"
                checked={form.isAvailableForPublic}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isAvailableForPublic: checked }))
                }
              />
              <Label
                htmlFor="isAvailableForPublic"
                className="text-[14px] text-black font-normal cursor-pointer"
              >
                {form.isAvailableForPublic ? '수신' : '수신 안함'}
              </Label>
            </div>
          </div>

          <Separator />

          {/* 저장 버튼 */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              className="h-9 text-[14px]"
            >
              <Save className="h-4 w-4 mr-1" />
              {upsertMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
