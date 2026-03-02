'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
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
  venueFloor: z.string().optional(),
  venueHall: z.string().optional(),
  maxBidders: z.coerce.number().min(1).max(10).optional(),
  customerPhone: z.preprocess(
    (val) => {
      if (typeof val !== 'string' || !val) return val;
      const digits = val.replace(/\D/g, '').slice(0, 11);
      if (digits.length <= 3) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    },
    z.string().max(13, '전화번호가 너무 깁니다').optional(),
  ),
  customerEmail: z.string().email('올바른 이메일을 입력해주세요').optional().or(z.literal('')),
  notes: z.string().optional(),
  // 구인 연동
  recruitmentTitle: z.string().optional(),
  recruitmentBudget: z.coerce.number().min(0).optional(),
  recruitmentDescription: z.string().optional(),
  recruitmentRequirements: z.string().optional(),
  recruitmentPrivateDeadlineHours: z.number().optional(),
});

type ShootingFormValues = z.infer<typeof shootingFormSchema>;

const SHOOTING_TYPES = Object.entries(SHOOTING_TYPE_LABELS) as [ShootingType, string][];

const DEADLINE_OPTIONS = [
  { value: 0, label: '즉시 (공개 모집)' },
  { value: 6, label: '6시간' },
  { value: 12, label: '12시간' },
  { value: 24, label: '24시간' },
  { value: 48, label: '48시간' },
];

// ==================== 프리셋 ====================

/** 촬영유형별 상세설명 프리셋 */
const DESCRIPTION_PRESETS: Record<string, { label: string; text: string }[]> = {
  wedding_main: [
    { label: '일반 본식', text: '본식 촬영입니다.\n식장 내 예식 진행 전체 촬영 및 가족사진, 단체사진 포함.\n식전 1시간 전 현장 도착 부탁드립니다.' },
    { label: '야외 본식', text: '야외 본식 촬영입니다.\n야외 예식장에서 진행되며, 자연광 촬영 위주입니다.\n우천 시 실내 대체 공간 있습니다.' },
    { label: '본식+피로연', text: '본식 + 피로연 촬영입니다.\n예식 전체 및 피로연 현장 스냅까지 포함됩니다.' },
  ],
  wedding_rehearsal: [
    { label: '스튜디오 리허설', text: '스튜디오 리허설 촬영입니다.\n드레스/턱시도 착용 촬영이며, 헤어메이크업 포함입니다.\n촬영 컨셉은 현장에서 작가님과 상의합니다.' },
    { label: '야외 리허설', text: '야외 리허설 촬영입니다.\n자연광 위주의 촬영이며, 장소 이동이 있을 수 있습니다.\n의상 1~2벌 준비됩니다.' },
  ],
  baby_dol: [
    { label: '돌잔치 현장', text: '돌잔치 현장 촬영입니다.\n돌잔치 행사 전체 진행 촬영 및 가족사진 포함.\n행사 시작 30분 전 도착 부탁드립니다.' },
    { label: '돌 스냅', text: '돌 스냅 촬영입니다.\n아기 단독 촬영 및 가족사진 위주로 진행됩니다.' },
  ],
  baby_growth: [
    { label: '성장 촬영', text: '아기 성장 촬영입니다.\n50일/100일/돌 등 성장 시기에 맞춘 촬영입니다.\n자연스러운 일상 컷 위주로 진행됩니다.' },
  ],
  profile: [
    { label: '개인 프로필', text: '개인 프로필 촬영입니다.\n증명사진/프로필 촬영이며, 보정본 제공됩니다.' },
    { label: '기업 프로필', text: '기업 단체 프로필 촬영입니다.\n임직원 개별 프로필 및 단체 사진 촬영입니다.\n촬영 인원수 사전 확인 부탁드립니다.' },
  ],
  other: [
    { label: '행사 촬영', text: '행사/이벤트 현장 촬영입니다.\n주요 장면 및 참석자 촬영 포함됩니다.' },
  ],
};

/** 촬영유형별 요구사항 프리셋 */
const REQUIREMENTS_PRESETS: Record<string, { label: string; text: string }[]> = {
  wedding_main: [
    { label: '기본 요구', text: '본식 촬영 경력 2년 이상\n원본 전체 + 보정본 50장 이상 제공\n촬영 후 2주 이내 납품' },
    { label: '영상 포함', text: '본식 촬영 경력 2년 이상\n사진 원본 전체 + 보정본 50장 이상\n하이라이트 영상 1분 내외 포함\n촬영 후 3주 이내 납품' },
  ],
  wedding_rehearsal: [
    { label: '기본 요구', text: '리허설 촬영 경력 1년 이상\n원본 전체 + 보정본 30장 이상 제공\n촬영 후 2주 이내 납품' },
  ],
  baby_dol: [
    { label: '기본 요구', text: '아기/돌잔치 촬영 경험자\n원본 전체 + 보정본 30장 이상 제공\n촬영 후 2주 이내 납품' },
  ],
  baby_growth: [
    { label: '기본 요구', text: '아기 촬영 경험자\n자연스러운 연출 가능한 분\n보정본 20장 이상 제공' },
  ],
  profile: [
    { label: '기본 요구', text: '프로필/증명 촬영 경험자\n보정본 5장 이상 제공\n촬영 당일 또는 익일 납품' },
  ],
  other: [
    { label: '기본 요구', text: '행사/이벤트 촬영 경험자\n원본 전체 제공\n촬영 후 1주 이내 납품' },
  ],
};

/** 공통 프리셋 (유형 무관) */
const COMMON_DESCRIPTION_PRESETS: { label: string; text: string }[] = [
  { label: '시간 엄수', text: '촬영 시작 시간 엄수 부탁드립니다.' },
  { label: '주차 안내', text: '현장 주차 가능합니다. 주차비 지원됩니다.' },
  { label: '식사 제공', text: '촬영 당일 식사가 제공됩니다.' },
];

const COMMON_REQUIREMENTS_PRESETS: { label: string; text: string }[] = [
  { label: '장비 지참', text: '개인 장비(카메라, 조명) 지참' },
  { label: '정장 착용', text: '단정한 복장(정장 또는 비즈니스 캐주얼) 착용' },
  { label: '경력 증빙', text: '포트폴리오 또는 경력 증빙 가능한 분' },
];

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
  const [enableRecruitment, setEnableRecruitment] = useState(
    !!defaultValues?.linkedRecruitmentId,
  );
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
      venueFloor: defaultValues?.venueFloor || '',
      venueHall: defaultValues?.venueHall || '',
      maxBidders: defaultValues?.maxBidders || 3,
      customerPhone: defaultValues?.customerPhone || '',
      customerEmail: defaultValues?.customerEmail || '',
      notes: defaultValues?.notes || '',
      recruitmentTitle: '',
      recruitmentBudget: undefined,
      recruitmentDescription: '',
      recruitmentRequirements: '',
      recruitmentPrivateDeadlineHours: 24,
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

  // 촬영유형 변경 또는 구인 연동 켤 때 상세설명/요구사항 첫 번째 프리셋 자동 채우기
  useEffect(() => {
    if (!watchedType || !enableRecruitment) return;

    const descPresets = DESCRIPTION_PRESETS[watchedType];
    const reqPresets = REQUIREMENTS_PRESETS[watchedType];

    const currentDesc = watch('recruitmentDescription') || '';
    const currentReq = watch('recruitmentRequirements') || '';

    // 빈 필드일 때만 자동 채우기 (수동 입력 보호)
    if (!currentDesc && descPresets?.length) {
      setValue('recruitmentDescription', descPresets[0].text);
    }
    if (!currentReq && reqPresets?.length) {
      setValue('recruitmentRequirements', reqPresets[0].text);
    }
  }, [watchedType, enableRecruitment]); // eslint-disable-line react-hooks/exhaustive-deps

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
      venueFloor: values.venueFloor || undefined,
      venueHall: values.venueHall || undefined,
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
      dto.recruitmentPrivateDeadlineHours = values.recruitmentPrivateDeadlineHours ?? 24;
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
                    {Array.from({ length: 12 }, (_, i) => (i + 9).toString().padStart(2, '0')).map((h) => (
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
              <Label className="text-[14px] text-black font-normal">예상 소요시간</Label>
              <Select
                value={watch('duration')?.toString() || ''}
                onValueChange={(val) => setValue('duration', Number(val))}
              >
                <SelectTrigger className="text-[14px]">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 16 }, (_, i) => (i + 1) * 30).map((min) => (
                    <SelectItem key={min} value={min.toString()}>
                      {min >= 60 ? `${Math.floor(min / 60)}시간${min % 60 ? ' 30분' : ''}` : `${min}분`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">층</Label>
              <Input
                inputMode="numeric"
                value={watch('venueFloor') || ''}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setValue('venueFloor', digits);
                }}
                placeholder="예: 3"
                className="text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">홀</Label>
              <Input
                {...register('venueHall')}
                lang="ko"
                placeholder="예: 그랜드볼룸"
                className="text-[14px]"
              />
            </div>
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
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {(DESCRIPTION_PRESETS[watchedType] || []).map((p) => {
                    const current = watch('recruitmentDescription') || '';
                    const isSelected = current === p.text;
                    return (
                      <Badge
                        key={p.label}
                        variant="outline"
                        className={`cursor-pointer transition-colors text-[12px] ${isSelected ? 'bg-red-600 text-white border-red-600' : 'hover:bg-red-600 hover:text-white hover:border-red-600'}`}
                        onClick={() => setValue('recruitmentDescription', p.text)}
                      >
                        {isSelected ? '✓ ' : ''}{p.label}
                      </Badge>
                    );
                  })}
                  {COMMON_DESCRIPTION_PRESETS.map((p) => {
                    const current = watch('recruitmentDescription') || '';
                    const alreadyIncluded = current.includes(p.text);
                    return (
                      <Badge
                        key={p.label}
                        variant="outline"
                        className={`cursor-pointer transition-colors text-[12px] ${alreadyIncluded ? 'bg-red-600 text-white border-red-600' : 'hover:bg-red-600 hover:text-white hover:border-red-600'}`}
                        onClick={() => {
                          if (alreadyIncluded) {
                            const removed = current
                              .split('\n')
                              .filter((line) => line !== p.text)
                              .join('\n');
                            setValue('recruitmentDescription', removed);
                          } else {
                            const newText = current ? `${current}\n${p.text}` : p.text;
                            setValue('recruitmentDescription', newText);
                          }
                        }}
                      >
                        {alreadyIncluded ? '✓' : '+'} {p.label}
                      </Badge>
                    );
                  })}
                </div>
                <Textarea
                  {...register('recruitmentDescription')}
                  placeholder="촬영 상세 내용 (위 태그를 클릭하면 자동 입력됩니다)"
                  rows={4}
                  className="text-[14px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">요구사항</Label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {(REQUIREMENTS_PRESETS[watchedType] || []).map((p) => {
                    const current = watch('recruitmentRequirements') || '';
                    const isSelected = current === p.text;
                    return (
                      <Badge
                        key={p.label}
                        variant="outline"
                        className={`cursor-pointer transition-colors text-[12px] ${isSelected ? 'bg-red-600 text-white border-red-600' : 'hover:bg-red-600 hover:text-white hover:border-red-600'}`}
                        onClick={() => setValue('recruitmentRequirements', p.text)}
                      >
                        {isSelected ? '✓ ' : ''}{p.label}
                      </Badge>
                    );
                  })}
                  {COMMON_REQUIREMENTS_PRESETS.map((p) => {
                    const current = watch('recruitmentRequirements') || '';
                    const alreadyIncluded = current.includes(p.text);
                    return (
                      <Badge
                        key={p.label}
                        variant="outline"
                        className={`cursor-pointer transition-colors text-[12px] ${alreadyIncluded ? 'bg-red-600 text-white border-red-600' : 'hover:bg-red-600 hover:text-white hover:border-red-600'}`}
                        onClick={() => {
                          if (alreadyIncluded) {
                            const removed = current
                              .split('\n')
                              .filter((line) => line !== p.text)
                              .join('\n');
                            setValue('recruitmentRequirements', removed);
                          } else {
                            const newText = current ? `${current}\n${p.text}` : p.text;
                            setValue('recruitmentRequirements', newText);
                          }
                        }}
                      >
                        {alreadyIncluded ? '✓' : '+'} {p.label}
                      </Badge>
                    );
                  })}
                </div>
                <Textarea
                  {...register('recruitmentRequirements')}
                  placeholder="작가에게 요구하는 조건 (위 태그를 클릭하면 자동 입력됩니다)"
                  rows={3}
                  className="text-[14px]"
                />
              </div>

              {/* 모집 설정 */}
              <div className="space-y-1.5 pt-3 border-t">
                <p className="text-[14px] text-black font-bold">모집 설정</p>
                <div className="space-y-1.5">
                  <Label className="text-[14px] text-black font-normal">전속 모집 마감 시간</Label>
                  <p className="text-[12px] text-gray-500">
                    전속 모집 기간이 지나면 자동으로 공개 모집으로 전환됩니다
                  </p>
                  <Select
                    value={String(watch('recruitmentPrivateDeadlineHours') ?? 24)}
                    onValueChange={(v) => setValue('recruitmentPrivateDeadlineHours', Number(v))}
                  >
                    <SelectTrigger className="text-[14px] w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEADLINE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
