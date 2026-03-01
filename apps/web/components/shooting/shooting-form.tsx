'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VenueSearchInput } from '@/components/recruitment/venue-search-input';
import { Loader2, Info, Briefcase } from 'lucide-react';
import type { CreateShootingDto, Shooting } from '@/hooks/use-shooting';
import { SHOOTING_TYPE_LABELS } from '@/lib/constants/shooting-types';
import type { ShootingType } from '@/lib/constants/shooting-types';
import { useAverageBudget } from '@/hooks/use-recruitment';
import { useAuthStore } from '@/stores/auth-store';

// ==================== Zod 스키마 ====================

const shootingFormSchema = z.object({
  clientName: z.string().min(1, '고객명을 입력해주세요'),
  shootingType: z.string().min(1, '촬영 유형을 선택해주세요'),
  shootingDate: z.string().min(1, '촬영 날짜를 선택해주세요'),
  shootingTime: z.string().optional(),
  duration: z.coerce.number().min(0).optional(),
  venueName: z.string().min(1, '장소명을 입력해주세요'),
  venueAddress: z.string().optional(),
  maxBidders: z.coerce.number().min(1).max(10).optional(),
  customerPhone: z.string().max(13, '전화번호가 너무 깁니다').optional(),
  customerEmail: z.string().email('올바른 이메일을 입력해주세요').optional().or(z.literal('')),
  notes: z.string().optional(),
  // 구인 연동
  recruitmentTitle: z.string().optional(),
  recruitmentBudget: z.coerce.number().min(0).optional(),
  recruitmentDescription: z.string().optional(),
  recruitmentRequirements: z.string().optional(),
});

type ShootingFormValues = z.infer<typeof shootingFormSchema>;

const SHOOTING_TYPES = Object.entries(SHOOTING_TYPE_LABELS) as [ShootingType, string][];

// ==================== 유틸 ====================

/** 숫자만 추출 후 한국 전화번호 형식으로 자동 포맷 (010-0000-0000) */
function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// ==================== 컴포넌트 ====================

interface ShootingFormProps {
  defaultValues?: Partial<Shooting>;
  onSubmit: (data: CreateShootingDto) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export function ShootingForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: ShootingFormProps) {
  const [enableRecruitment, setEnableRecruitment] = useState(false);
  const { user } = useAuthStore();

  // shootingDate에서 날짜/시간 분리
  const defaultDate = defaultValues?.shootingDate
    ? defaultValues.shootingDate.substring(0, 10)
    : '';
  const defaultTime = defaultValues?.shootingDate
    ? (() => {
        const d = new Date(defaultValues.shootingDate);
        const h = d.getHours();
        const m = d.getMinutes();
        if (h === 0 && m === 0) return '';
        // 10분 단위로 반올림
        const rounded = Math.round(m / 10) * 10;
        const adjustedM = rounded === 60 ? 0 : rounded;
        const adjustedH = rounded === 60 ? (h + 1) % 24 : h;
        return `${adjustedH.toString().padStart(2, '0')}:${adjustedM.toString().padStart(2, '0')}`;
      })()
    : '';

  const form = useForm<ShootingFormValues>({
    resolver: zodResolver(shootingFormSchema),
    defaultValues: {
      clientName: defaultValues?.clientName || '',
      shootingType: defaultValues?.shootingType || '',
      shootingDate: defaultDate,
      shootingTime: defaultTime,
      duration: defaultValues?.duration || undefined,
      venueName: defaultValues?.venueName || '',
      venueAddress: defaultValues?.venueAddress || '',
      maxBidders: defaultValues?.maxBidders || 3,
      customerPhone: defaultValues?.customerPhone || '',
      customerEmail: defaultValues?.customerEmail || '',
      notes: defaultValues?.notes || '',
      recruitmentTitle: '',
      recruitmentBudget: undefined,
      recruitmentDescription: '',
      recruitmentRequirements: '',
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const watchedType = watch('shootingType');

  const { data: avgBudgetData } = useAverageBudget();

  // 평균 예산 (구인방 데이터 기준 - 동일한 촬영유형)
  const averageBudgetInfo = (() => {
    if (!watchedType || !avgBudgetData) return null;
    const d = avgBudgetData[watchedType];
    if (!d || d.avg <= 0) return null;
    const avg = Math.round(d.avg);
    const typeLabel = SHOOTING_TYPE_LABELS[watchedType as ShootingType] || watchedType;
    return {
      formatted: avg.toLocaleString('ko-KR'),
      label: `${typeLabel} 평균 예산 (${d.count}건 기준)`,
    };
  })();

  const handleFormSubmit = (values: ShootingFormValues) => {
    // 날짜 + 시간 → ISO DateTime
    let shootingDateISO = values.shootingDate;
    if (values.shootingTime) {
      shootingDateISO = `${values.shootingDate}T${values.shootingTime}:00`;
    }

    const dto: CreateShootingDto = {
      clientName: values.clientName,
      shootingType: values.shootingType as ShootingType,
      venueName: values.venueName,
      venueAddress: values.venueAddress || '',
      shootingDate: shootingDateISO,
      duration: values.duration || undefined,
      maxBidders: values.maxBidders || 3,
      customerPhone: values.customerPhone || undefined,
      customerEmail: values.customerEmail || undefined,
      notes: values.notes || undefined,
    };

    // 구인 연동
    if (enableRecruitment) {
      dto.enableRecruitment = true;
      dto.recruitmentClientId = user?.clientId || undefined;
      dto.recruitmentTitle = values.recruitmentTitle || undefined;
      dto.recruitmentBudget = values.recruitmentBudget || undefined;
      dto.recruitmentDescription = values.recruitmentDescription || undefined;
      dto.recruitmentRequirements = values.recruitmentRequirements || undefined;
    }

    onSubmit(dto);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 고객명 */}
          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">
              고객명 <span className="text-red-500">*</span>
            </Label>
            <Input
              {...register('clientName')}
              placeholder="예: 홍길동/김영희"
              className="text-[14px]"
            />
            {errors.clientName && (
              <p className="text-[12px] text-red-500">{errors.clientName.message}</p>
            )}
          </div>

          {/* 촬영 유형 */}
          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">
              촬영 유형 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch('shootingType')}
              onValueChange={(val) => {
                setValue('shootingType', val);
                form.trigger('shootingType');
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
            {errors.shootingType && (
              <p className="text-[12px] text-red-500">{errors.shootingType.message}</p>
            )}
          </div>

          {/* 날짜/시간/소요시간 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">
                촬영일 <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                {...register('shootingDate')}
                className="text-[14px]"
              />
              {errors.shootingDate && (
                <p className="text-[12px] text-red-500">{errors.shootingDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">촬영 시간</Label>
              <div className="flex items-center gap-1">
                <Select
                  value={watch('shootingTime')?.split(':')[0] || ''}
                  onValueChange={(h) => {
                    const m = watch('shootingTime')?.split(':')[1] || '00';
                    setValue('shootingTime', `${h}:${m}`);
                  }}
                >
                  <SelectTrigger className="text-[14px] w-[80px]">
                    <SelectValue placeholder="시" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((h) => (
                      <SelectItem key={h} value={h}>{h}시</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[14px] text-black">:</span>
                <Select
                  value={watch('shootingTime')?.split(':')[1] || ''}
                  onValueChange={(m) => {
                    const h = watch('shootingTime')?.split(':')[0] || '00';
                    setValue('shootingTime', `${h}:${m}`);
                  }}
                >
                  <SelectTrigger className="text-[14px] w-[80px]">
                    <SelectValue placeholder="분" />
                  </SelectTrigger>
                  <SelectContent>
                    {['00', '10', '20', '30', '40', '50'].map((m) => (
                      <SelectItem key={m} value={m}>{m}분</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">예상 소요시간 (분)</Label>
              <Input
                type="number"
                {...register('duration')}
                placeholder="예: 120"
                min={0}
                className="text-[14px]"
              />
            </div>
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
            <Label className="text-[14px] text-black font-normal">
              장소명 <span className="text-red-500">*</span>
            </Label>
            <VenueSearchInput
              value={watch('venueName')}
              onChange={(val) => setValue('venueName', val)}
              onSelect={(place) => {
                setValue('venueName', place.name);
                setValue('venueAddress', place.address);
              }}
              placeholder="예: 롯데호텔 서울"
              error={errors.venueName?.message}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">주소</Label>
            <Input
              {...register('venueAddress')}
              placeholder="장소명을 입력하면 자동으로 채워집니다"
              readOnly
              className="text-[14px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* 고객 연락처 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">고객 연락처</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">연락처</Label>
              <Input
                type="tel"
                inputMode="numeric"
                value={watch('customerPhone') || ''}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setValue('customerPhone', formatted);
                }}
                placeholder="010-0000-0000"
                maxLength={13}
                className="text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">이메일</Label>
              <Input
                {...register('customerEmail')}
                type="email"
                placeholder="email@example.com"
                className="text-[14px]"
              />
              {errors.customerEmail && (
                <p className="text-[12px] text-red-500">{errors.customerEmail.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">메모</Label>
            <Textarea
              {...register('notes')}
              placeholder="내부 참고용 메모"
              rows={2}
              className="text-[14px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* 구인 연동 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            구인 연동
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] text-black font-normal">구인방에도 동시 등록</p>
              <p className="text-[12px] text-gray-500">
                내부 작가 배정이 어려운 경우, 외부 작가 구인을 함께 등록합니다
              </p>
            </div>
            <Switch
              checked={enableRecruitment}
              onCheckedChange={setEnableRecruitment}
            />
          </div>

          {enableRecruitment && (
            <div className="space-y-4 pt-3 border-t">
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">구인 제목</Label>
                <Input
                  {...register('recruitmentTitle')}
                  placeholder={
                    watchedType
                      ? `${SHOOTING_TYPE_LABELS[watchedType as ShootingType] || ''} 작가 구인`
                      : '구인 제목'
                  }
                  className="text-[14px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">보수 (원)</Label>
                <Input
                  type="number"
                  {...register('recruitmentBudget')}
                  placeholder={averageBudgetInfo ? `평균 ${averageBudgetInfo.formatted}원` : '보수 금액'}
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

              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">상세설명</Label>
                <Textarea
                  {...register('recruitmentDescription')}
                  placeholder="촬영 상세 내용"
                  rows={3}
                  className="text-[14px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">요구사항</Label>
                <Textarea
                  {...register('recruitmentRequirements')}
                  placeholder="작가에게 요구하는 조건"
                  rows={2}
                  className="text-[14px]"
                />
              </div>
            </div>
          )}
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
