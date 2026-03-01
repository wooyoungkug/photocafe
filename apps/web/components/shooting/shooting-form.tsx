'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddressSearch } from '@/components/address-search';
import { Loader2, Info } from 'lucide-react';
import type { ShootingType, CreateShootingDto, Shooting } from '@/hooks/use-shooting';
import { SHOOTING_TYPE_LABELS } from '@/hooks/use-shooting';
import { useMemo } from 'react';

// ==================== 평균 예산 참고 데이터 ====================

/** 촬영유형별 시간당 평균 예산 (원) */
const AVERAGE_BUDGET_PER_HOUR: Record<string, number> = {
  wedding: 150000,
  studio: 80000,
  outdoor: 100000,
  product: 70000,
  profile: 70000,
  event: 120000,
  other: 80000,
};

/** 촬영유형별 기본 소요시간 (분) */
const DEFAULT_DURATION_MINUTES: Record<string, number> = {
  wedding: 240,
  studio: 120,
  outdoor: 180,
  product: 120,
  profile: 60,
  event: 180,
  other: 120,
};

// ==================== Zod 스키마 ====================

const shootingFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  type: z.string().min(1, '촬영 유형을 선택해주세요'),
  scheduledDate: z.string().min(1, '촬영 날짜를 선택해주세요'),
  scheduledTime: z.string().optional(),
  estimatedDuration: z.coerce.number().min(0).optional(),
  location: z.string().optional(),
  locationAddress: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  budget: z.coerce.number().min(0).optional(),
  clientId: z.string().optional(),
  // 고객 정보 (참조용)
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email('올바른 이메일을 입력해주세요').optional().or(z.literal('')),
});

type ShootingFormValues = z.infer<typeof shootingFormSchema>;

// ==================== 컴포넌트 ====================

interface ShootingFormProps {
  defaultValues?: Partial<Shooting>;
  onSubmit: (data: CreateShootingDto) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const SHOOTING_TYPES = Object.entries(SHOOTING_TYPE_LABELS) as [ShootingType, string][];

export function ShootingForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: ShootingFormProps) {
  const form = useForm<ShootingFormValues>({
    resolver: zodResolver(shootingFormSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      type: defaultValues?.type || '',
      scheduledDate: defaultValues?.scheduledDate
        ? defaultValues.scheduledDate.substring(0, 10)
        : '',
      scheduledTime: defaultValues?.scheduledTime || '',
      estimatedDuration: defaultValues?.estimatedDuration || undefined,
      location: defaultValues?.location || '',
      locationAddress: defaultValues?.locationAddress || '',
      description: defaultValues?.description || '',
      requirements: defaultValues?.requirements || '',
      budget: defaultValues?.budget || undefined,
      clientId: defaultValues?.clientId || '',
      clientName: defaultValues?.clientName || '',
      clientPhone: '',
      clientEmail: '',
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const watchedType = watch('type');
  const watchedDuration = watch('estimatedDuration');

  const averageBudgetInfo = useMemo(() => {
    if (!watchedType || !AVERAGE_BUDGET_PER_HOUR[watchedType]) return null;

    const durationMin = watchedDuration || DEFAULT_DURATION_MINUTES[watchedType] || 120;
    const hours = durationMin / 60;
    const avgBudget = Math.round(AVERAGE_BUDGET_PER_HOUR[watchedType] * hours);
    const typeLabel = SHOOTING_TYPE_LABELS[watchedType as ShootingType] || watchedType;
    const isDefault = !watchedDuration;

    return {
      amount: avgBudget,
      label: `${typeLabel} ${hours}시간${isDefault ? '(기본)' : ''} 평균 예산`,
      formatted: avgBudget.toLocaleString('ko-KR'),
    };
  }, [watchedType, watchedDuration]);

  const handleFormSubmit = (values: ShootingFormValues) => {
    const dto: CreateShootingDto = {
      title: values.title,
      type: values.type as ShootingType,
      scheduledDate: values.scheduledDate,
      scheduledTime: values.scheduledTime || undefined,
      estimatedDuration: values.estimatedDuration || undefined,
      location: values.location || undefined,
      locationAddress: values.locationAddress || undefined,
      description: values.description || undefined,
      requirements: values.requirements || undefined,
      budget: values.budget || undefined,
      clientId: values.clientId || undefined,
    };
    onSubmit(dto);
  };

  const handleAddressComplete = (data: {
    postalCode: string;
    address: string;
  }) => {
    setValue('locationAddress', data.address, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 제목 */}
          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">
              제목 <span className="text-red-500">*</span>
            </Label>
            <Input
              {...register('title')}
              placeholder="촬영 제목을 입력해주세요"
              className="text-[14px]"
            />
            {errors.title && (
              <p className="text-[12px] text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* 촬영 유형 */}
          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">
              촬영 유형 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch('type')}
              onValueChange={(val) => {
                setValue('type', val);
                form.trigger('type');
              }}
            >
              <SelectTrigger className="text-[14px]">
                <SelectValue placeholder="유형 선택" />
              </SelectTrigger>
              <SelectContent>
                {SHOOTING_TYPES.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-[12px] text-red-500">{errors.type.message}</p>
            )}
          </div>

          {/* 날짜/시간 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">
                촬영일 <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                {...register('scheduledDate')}
                className="text-[14px]"
              />
              {errors.scheduledDate && (
                <p className="text-[12px] text-red-500">{errors.scheduledDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">촬영 시간</Label>
              <Input
                type="time"
                {...register('scheduledTime')}
                className="text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">예상 소요시간 (분)</Label>
              <Input
                type="number"
                {...register('estimatedDuration')}
                placeholder="예: 120"
                min={0}
                className="text-[14px]"
              />
            </div>
          </div>

          {/* 촬영예산 */}
          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">촬영예산 (원)</Label>
            <Input
              type="number"
              {...register('budget')}
              placeholder={averageBudgetInfo ? `평균 ${averageBudgetInfo.formatted}원` : '촬영 예산'}
              min={0}
              className="text-[14px]"
            />
            {averageBudgetInfo && (
              <p className="text-[12px] text-gray-500 flex items-center gap-1">
                <Info className="h-3 w-3" />
                {averageBudgetInfo.label}: {averageBudgetInfo.formatted}원
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 장소 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">장소 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">장소명</Label>
            <Input
              {...register('location')}
              placeholder="예: 롯데호텔 서울"
              className="text-[14px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">주소</Label>
            <div className="flex gap-2 items-start">
              <Input
                {...register('locationAddress')}
                placeholder="주소를 검색해주세요"
                readOnly
                className="text-[14px] flex-1"
              />
              <AddressSearch
                onComplete={handleAddressComplete}
                inline
                size="default"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 고객 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">고객 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">고객명</Label>
              <Input
                {...register('clientName')}
                placeholder="고객명"
                className="text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">연락처</Label>
              <Input
                {...register('clientPhone')}
                placeholder="010-0000-0000"
                className="text-[14px]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">이메일</Label>
            <Input
              {...register('clientEmail')}
              type="email"
              placeholder="email@example.com"
              className="text-[14px]"
            />
            {errors.clientEmail && (
              <p className="text-[12px] text-red-500">{errors.clientEmail.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 상세 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">상세 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">설명</Label>
            <Textarea
              {...register('description')}
              placeholder="촬영에 대한 설명을 입력해주세요"
              rows={3}
              className="text-[14px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">요구사항</Label>
            <Textarea
              {...register('requirements')}
              placeholder="촬영 요구사항을 입력해주세요"
              rows={3}
              className="text-[14px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* 버튼 */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="text-[14px]"
        >
          취소
        </Button>
        <Button type="submit" disabled={isLoading} className="text-[14px]">
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === 'create' ? '등록' : '수정'}
        </Button>
      </div>
    </form>
  );
}
