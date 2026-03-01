'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Briefcase,
  Loader2,
  Info,
  BookmarkPlus,
  ChevronDown,
  Trash2,
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { useCreateRecruitment } from '@/hooks/use-recruitment';
import {
  useRecruitmentTemplates,
  useCreateRecruitmentTemplate,
  useDeleteRecruitmentTemplate,
} from '@/hooks/use-recruitment-template';
import { VenueSearchInput } from '@/components/recruitment/venue-search-input';
import { SHOOTING_TYPE_LABELS } from '@/lib/types/recruitment';
import type { ShootingType } from '@/lib/types/recruitment';

// Zod 스키마
const recruitmentSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이내로 입력해주세요'),
  shootingType: z.string().min(1, '촬영유형을 선택해주세요'),
  shootingDate: z.string().min(1, '촬영일을 선택해주세요'),
  shootingTime: z.string().optional(),
  duration: z.coerce.number().min(0).optional(),
  venueName: z.string().min(1, '장소명을 입력해주세요'),
  venueAddress: z.string().optional(),
  budget: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  customerName: z.string().optional(),
  privateDeadlineHours: z.number().optional(),
});

type RecruitmentFormData = z.infer<typeof recruitmentSchema>;

const DEADLINE_OPTIONS = [
  { value: 0, label: '즉시 (공개 모집)' },
  { value: 6, label: '6시간' },
  { value: 12, label: '12시간' },
  { value: 24, label: '24시간' },
  { value: 48, label: '48시간' },
];

export default function RecruitmentNewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const createMutation = useCreateRecruitment();

  // 자주사용 문구 관련
  const { data: descTemplates = [] } = useRecruitmentTemplates('description');
  const { data: reqTemplates = [] } = useRecruitmentTemplates('requirements');
  const createTemplate = useCreateRecruitmentTemplate();
  const deleteTemplate = useDeleteRecruitmentTemplate();
  const [saveDialog, setSaveDialog] = useState<{
    open: boolean;
    category: 'description' | 'requirements';
    content: string;
  }>({ open: false, category: 'description', content: '' });
  const [saveTitle, setSaveTitle] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RecruitmentFormData>({
    resolver: zodResolver(recruitmentSchema),
    defaultValues: {
      title: '',
      shootingType: '',
      shootingDate: '',
      shootingTime: '',
      duration: undefined,
      venueName: '',
      venueAddress: '',
      budget: undefined,
      description: '',
      requirements: '',
      customerName: '',
      privateDeadlineHours: 24,
    },
  });

  const shootingType = watch('shootingType');
  const privateDeadlineHours = watch('privateDeadlineHours');

  const handleSaveTemplate = async () => {
    if (!saveTitle.trim()) {
      toast({ title: '제목을 입력해주세요', variant: 'destructive' });
      return;
    }
    try {
      await createTemplate.mutateAsync({
        category: saveDialog.category,
        title: saveTitle.trim(),
        content: saveDialog.content,
      });
      toast({ title: '자주사용 문구가 저장되었습니다' });
      setSaveDialog({ open: false, category: 'description', content: '' });
      setSaveTitle('');
    } catch {
      toast({ title: '저장 실패', variant: 'destructive' });
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteTemplate.mutateAsync(id);
      toast({ title: '삭제되었습니다' });
    } catch {
      toast({ title: '삭제 실패', variant: 'destructive' });
    }
  };

  // 필수 필드 순서 (검증 실패 시 첫 번째 에러 필드로 이동)
  const REQUIRED_FIELDS: { key: keyof RecruitmentFormData; id: string }[] = [
    { key: 'title', id: 'field-title' },
    { key: 'shootingType', id: 'field-shootingType' },
    { key: 'shootingDate', id: 'field-shootingDate' },
    { key: 'venueName', id: 'field-venueName' },
  ];

  const onInvalid = (fieldErrors: FieldErrors<RecruitmentFormData>) => {
    const firstError = REQUIRED_FIELDS.find((f) => fieldErrors[f.key]);
    if (firstError) {
      const el = document.getElementById(firstError.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => el.focus(), 300);
      }
    }
    const messages = REQUIRED_FIELDS
      .filter((f) => fieldErrors[f.key])
      .map((f) => fieldErrors[f.key]?.message)
      .filter(Boolean);
    toast({
      title: '필수 항목을 확인해주세요',
      description: messages.join(', '),
      variant: 'destructive',
    });
  };

  const onSubmit = async (data: RecruitmentFormData) => {
    try {
      const result = await createMutation.mutateAsync({
        title: data.title,
        shootingType: data.shootingType as ShootingType,
        shootingDate: data.shootingDate,
        shootingTime: data.shootingTime || undefined,
        duration: data.duration || undefined,
        venueName: data.venueName,
        venueAddress: data.venueAddress || undefined,
        budget: data.budget || undefined,
        description: data.description || undefined,
        requirements: data.requirements || undefined,
        customerName: data.customerName || undefined,
        privateDeadlineHours: data.privateDeadlineHours,
      });
      toast({
        title: '구인 등록 완료',
        description: '구인이 초안으로 저장되었습니다.',
      });
      router.push(`/mypage/recruitment/${result.id}`);
    } catch (error: any) {
      toast({
        title: '등록 실패',
        description: error?.message || '구인 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Briefcase className="h-5 w-5 text-gray-700" />
        <h2 className="text-[18px] text-black font-bold">구인 등록</h2>
      </div>

      {/* 일정관리 연동 안내 */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-[13px] text-blue-700">
          구인을 등록하면 관리자 일정관리에 자동으로 촬영 일정이 추가됩니다.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
        {/* 기본 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-bold">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 제목 */}
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">
                제목 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="field-title"
                {...register('title')}
                placeholder="예: 3/15 본식 촬영 작가 구합니다"
                className="text-[14px]"
              />
              {errors.title && (
                <p className="text-[12px] text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* 촬영유형 */}
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">
                촬영유형 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={shootingType}
                onValueChange={(v) => setValue('shootingType', v, { shouldValidate: true })}
              >
                <SelectTrigger id="field-shootingType" className="text-[14px]">
                  <SelectValue placeholder="촬영유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SHOOTING_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.shootingType && (
                <p className="text-[12px] text-red-500">{errors.shootingType.message}</p>
              )}
            </div>

            {/* 촬영일 + 촬영시간 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">
                  촬영일 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="field-shootingDate"
                  type="date"
                  {...register('shootingDate')}
                  className="text-[14px]"
                />
                {errors.shootingDate && (
                  <p className="text-[12px] text-red-500">{errors.shootingDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">촬영시간</Label>
                <Input
                  type="time"
                  {...register('shootingTime')}
                  className="text-[14px]"
                />
              </div>
            </div>

            {/* 소요시간 */}
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">소요시간 (분)</Label>
              <Input
                type="number"
                {...register('duration')}
                placeholder="예: 120"
                className="text-[14px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* 장소 정보 */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-bold">장소 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">
                장소명 <span className="text-red-500">*</span>
              </Label>
              <VenueSearchInput
                id="field-venueName"
                value={watch('venueName')}
                onChange={(val) => setValue('venueName', val)}
                onSelect={(place) => {
                  setValue('venueName', place.name, { shouldValidate: true });
                  setValue('venueAddress', place.address);
                }}
                placeholder="예: 더채플앳청담"
                error={errors.venueName?.message}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">주소</Label>
              <Input
                {...register('venueAddress')}
                placeholder="장소명을 입력하면 자동으로 채워집니다"
                className="text-[14px]"
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        {/* 보수 및 조건 */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-bold">보수 및 조건</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">보수 (원)</Label>
              <Input
                type="number"
                {...register('budget')}
                placeholder="예: 500000"
                className="text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-medium">상세설명</Label>
                <div className="flex items-center gap-1">
                  {watch('description')?.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[11px] text-gray-500 hover:text-blue-600"
                      onClick={() => {
                        setSaveDialog({
                          open: true,
                          category: 'description',
                          content: watch('description') || '',
                        });
                        setSaveTitle('');
                      }}
                    >
                      <BookmarkPlus className="h-3 w-3 mr-0.5" />
                      저장
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-1.5 text-[11px]"
                      >
                        자주사용 문구
                        <ChevronDown className="h-3 w-3 ml-0.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[280px]">
                      {descTemplates.length === 0 ? (
                        <div className="px-3 py-2 text-[12px] text-gray-400">
                          저장된 문구가 없습니다
                        </div>
                      ) : (
                        descTemplates.map((t) => (
                          <DropdownMenuItem
                            key={t.id}
                            className="flex items-start justify-between gap-2 cursor-pointer"
                            onSelect={() =>
                              setValue('description', t.content, { shouldDirty: true })
                            }
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium truncate">{t.title}</p>
                              <p className="text-[11px] text-gray-400 truncate">{t.content}</p>
                            </div>
                            <button
                              type="button"
                              title="삭제"
                              className="flex-shrink-0 p-0.5 text-gray-300 hover:text-red-500"
                              onClick={(e) => handleDeleteTemplate(t.id, e)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <Textarea
                {...register('description')}
                placeholder="촬영 상세 내용을 입력해주세요"
                rows={4}
                className="text-[14px] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-medium">요구사항</Label>
                <div className="flex items-center gap-1">
                  {watch('requirements')?.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[11px] text-gray-500 hover:text-blue-600"
                      onClick={() => {
                        setSaveDialog({
                          open: true,
                          category: 'requirements',
                          content: watch('requirements') || '',
                        });
                        setSaveTitle('');
                      }}
                    >
                      <BookmarkPlus className="h-3 w-3 mr-0.5" />
                      저장
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-1.5 text-[11px]"
                      >
                        자주사용 문구
                        <ChevronDown className="h-3 w-3 ml-0.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[280px]">
                      {reqTemplates.length === 0 ? (
                        <div className="px-3 py-2 text-[12px] text-gray-400">
                          저장된 문구가 없습니다
                        </div>
                      ) : (
                        reqTemplates.map((t) => (
                          <DropdownMenuItem
                            key={t.id}
                            className="flex items-start justify-between gap-2 cursor-pointer"
                            onSelect={() =>
                              setValue('requirements', t.content, { shouldDirty: true })
                            }
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium truncate">{t.title}</p>
                              <p className="text-[11px] text-gray-400 truncate">{t.content}</p>
                            </div>
                            <button
                              type="button"
                              title="삭제"
                              className="flex-shrink-0 p-0.5 text-gray-300 hover:text-red-500"
                              onClick={(e) => handleDeleteTemplate(t.id, e)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <Textarea
                {...register('requirements')}
                placeholder="작가에게 요구하는 조건이나 스타일 등을 입력해주세요"
                rows={3}
                className="text-[14px] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">고객명</Label>
              <Input
                {...register('customerName')}
                placeholder="예: 홍길동"
                className="text-[14px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* 모집 설정 */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-bold">모집 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">전속 모집 마감 시간</Label>
              <p className="text-[12px] text-gray-500">
                전속 모집 기간이 지나면 자동으로 공개 모집으로 전환됩니다
              </p>
              <Select
                value={String(privateDeadlineHours ?? 24)}
                onValueChange={(v) => setValue('privateDeadlineHours', Number(v))}
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
          </CardContent>
        </Card>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="text-[14px]"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="text-[14px]"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장 (초안)'
            )}
          </Button>
        </div>
      </form>

      {/* 자주사용 문구 저장 다이얼로그 */}
      <Dialog
        open={saveDialog.open}
        onOpenChange={(open) => {
          if (!open) setSaveDialog({ open: false, category: 'description', content: '' });
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-bold">
              자주사용 문구 저장
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">제목</Label>
              <Input
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="예: 본식 기본 설명"
                className="text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">내용</Label>
              <div className="rounded-md border p-2 bg-gray-50 text-[13px] text-gray-700 whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                {saveDialog.content}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-[13px]"
              onClick={() => setSaveDialog({ open: false, category: 'description', content: '' })}
            >
              취소
            </Button>
            <Button
              size="sm"
              className="text-[13px]"
              disabled={createTemplate.isPending}
              onClick={handleSaveTemplate}
            >
              {createTemplate.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
