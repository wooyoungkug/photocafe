'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  isToday,
  isSameDay,
  isSameMonth,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Camera,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  MapPin,
  Building2,
  User,
  Loader2,
  Filter,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useHolidaysRange } from '@/hooks/use-holidays';
import { useAuthStore } from '@/stores/auth-store';
import { useShootings, useDeleteShooting } from '@/hooks/use-shooting';
import type { Shooting, ShootingType, ShootingStatus } from '@/hooks/use-shooting';
import { SHOOTING_TYPE_LABELS, SHOOTING_STATUS_LABELS } from '@/hooks/use-shooting';
import { ShootingCalendar } from '@/components/shooting/shooting-calendar';
import { ShootingStatusBadge } from '@/components/shooting/shooting-status-badge';
import { ShootingTypeBadge } from '@/components/shooting/shooting-type-badge';
import { SHOOTING_TYPE_COLORS } from '@/components/shooting/shooting-type-badge';
import type { CalendarViewMode } from '@/stores/shooting-store';
import { TodoView } from '@/components/schedule/todo-view';

// ==================== 상수 ====================

const VIEW_MODE_OPTIONS: { value: CalendarViewMode; label: string }[] = [
  { value: 'day', label: '일간' },
  { value: 'week', label: '주간' },
  { value: 'month', label: '월간' },
  { value: 'list', label: '목록' },
  { value: 'twoWeek', label: '2주' },
];

const ALL_STATUSES: ShootingStatus[] = [
  'draft',
  'recruiting',
  'bidding',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
];

const ALL_TYPES: ShootingType[] = [
  'wedding_main',
  'wedding_rehearsal',
  'baby_dol',
  'baby_growth',
  'profile',
  'other',
];

// ==================== 페이지 컴포넌트 ====================

export default function SchedulePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  if (isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Camera className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-[18px] text-black font-bold mb-2">일정관리</p>
        <p className="text-[14px] text-gray-500">관리자 계정은 일정관리를 이용할 수 없습니다.</p>
        <p className="text-[14px] text-gray-400">스튜디오 계정으로 로그인해 주세요.</p>
      </div>
    );
  }

  const [pageView, setPageView] = useState<'calendar' | 'todo'>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [deleteTarget, setDeleteTarget] = useState<Shooting | null>(null);
  const deleteMutation = useDeleteShooting();

  // 날짜 범위 계산 (뷰 모드에 따라 범위 확장)
  const dateRange = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ko });
    const calEnd = endOfWeek(monthEnd, { locale: ko });

    if (viewMode === 'week') {
      const ws = startOfWeek(currentMonth, { locale: ko });
      const we = endOfWeek(currentMonth, { locale: ko });
      return {
        startDate: format(ws, 'yyyy-MM-dd'),
        endDate: format(we, 'yyyy-MM-dd'),
      };
    }
    if (viewMode === 'twoWeek') {
      const ws = startOfWeek(currentMonth, { locale: ko });
      const we = endOfWeek(addWeeks(currentMonth, 1), { locale: ko });
      return {
        startDate: format(ws, 'yyyy-MM-dd'),
        endDate: format(we, 'yyyy-MM-dd'),
      };
    }
    if (viewMode === 'day') {
      return {
        startDate: format(currentMonth, 'yyyy-MM-dd'),
        endDate: format(currentMonth, 'yyyy-MM-dd'),
      };
    }

    return {
      startDate: format(calStart, 'yyyy-MM-dd'),
      endDate: format(calEnd, 'yyyy-MM-dd'),
    };
  }, [currentMonth, viewMode]);

  // 촬영 데이터 조회
  const { data: shootingsResponse, isLoading } = useShootings({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    shootingType: (filterType as ShootingType) || undefined,
    status: (filterStatus as ShootingStatus) || undefined,
    limit: 500,
  });

  const shootings = shootingsResponse?.data || [];

  // 공휴일 맵 (API 우선, 정적 데이터 폴백)
  const holidays = useHolidaysRange(currentMonth.getFullYear());

  // 선택된 날짜의 공휴일 이름
  const selectedHolidayName = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return holidays.get(dateStr);
  }, [selectedDate, holidays]);

  // 선택된 날짜의 촬영 목록
  const selectedDateShootings = useMemo(() => {
    return shootings.filter((s) => {
      const dateStr = s.shootingDate.substring(0, 10);
      const selectedStr = format(selectedDate, 'yyyy-MM-dd');
      return dateStr === selectedStr;
    });
  }, [shootings, selectedDate]);

  // 미니 캘린더 날짜 계산
  const miniCalendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ko });
    const calEnd = endOfWeek(monthEnd, { locale: ko });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // 날짜별 촬영 존재 여부 (미니 캘린더 도트 표시용)
  const datesWithShootings = useMemo(() => {
    const dateSet = new Set<string>();
    shootings.forEach((s) => {
      dateSet.add(s.shootingDate.substring(0, 10));
    });
    return dateSet;
  }, [shootings]);

  const handleShootingClick = useCallback(
    (shooting: Shooting) => {
      router.push(`/mypage/schedule/${shooting.id}`);
    },
    [router]
  );

  const handleDateDoubleClick = useCallback(
    (date: Date) => {
      router.push(`/mypage/schedule/new?date=${format(date, 'yyyy-MM-dd')}`);
    },
    [router]
  );

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-gray-700" />
          <h2 className="text-[18px] text-black font-bold">일정관리</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* 일정/할일 뷰 전환 */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setPageView('calendar')}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-[13px] transition-colors border-r',
                pageView === 'calendar'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              일정 보기
            </button>
            <button
              type="button"
              onClick={() => setPageView('todo')}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-[13px] transition-colors',
                pageView === 'todo'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              )}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              할일 보기
            </button>
          </div>

          {/* 캘린더 뷰 모드 전환 (일정 보기일 때만) */}
          {pageView === 'calendar' && (
            <>
              <div className="hidden sm:flex border rounded-lg overflow-hidden">
                {VIEW_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setViewMode(opt.value)}
                    className={cn(
                      'px-3 py-1.5 text-[13px] transition-colors border-r last:border-r-0',
                      viewMode === opt.value
                        ? 'bg-blue-600 text-white font-medium'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                onClick={() => router.push('/mypage/schedule/new')}
                className="text-[13px]"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                일정 등록
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 할일 뷰 */}
      {pageView === 'todo' && <TodoView />}

      {/* 일정 뷰 (캘린더) - 3컬럼 레이아웃 */}
      {pageView === 'calendar' && (
        <div className="flex gap-4 min-h-[600px]">
          {/* 좌측 패널: 미니 캘린더 + 필터 */}
          <div className="hidden md:block w-[240px] flex-shrink-0 space-y-3">
            {/* 미니 캘린더 */}
            <Card>
              <CardContent className="p-3">
                {/* 월 네비게이션 */}
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-[14px] text-black font-bold">
                    {format(currentMonth, 'yyyy.MM')}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* 미니 캘린더 그리드 */}
                <div className="grid grid-cols-7 gap-0">
                  {/* 요일 헤더 */}
                  {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                    <div
                      key={d}
                      className={cn(
                        'text-center text-[11px] py-1',
                        i === 0 && 'text-red-400',
                        i === 6 && 'text-blue-400',
                        i > 0 && i < 6 && 'text-gray-400'
                      )}
                    >
                      {d}
                    </div>
                  ))}
                  {/* 날짜 */}
                  {miniCalendarDays.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const hasShootings = datesWithShootings.has(dateKey);
                    const isHoliday = holidays.has(dateKey);
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);
                    const isCurrentMonth_ = isSameMonth(day, currentMonth);

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          'relative h-7 w-full flex items-center justify-center text-[11px] rounded transition-colors',
                          !isCurrentMonth_ && 'text-gray-300',
                          isCurrentMonth_ && 'text-black hover:bg-gray-100',
                          isCurrentMonth_ && isHoliday && !isSelected && 'text-red-500',
                          isSelected && 'bg-blue-600 text-white hover:bg-blue-700',
                          isTodayDate && !isSelected && 'font-bold text-blue-600'
                        )}
                      >
                        {format(day, 'd')}
                        {hasShootings && !isSelected && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-blue-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 필터 패널 */}
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-[14px] text-black font-bold flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  필터
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-3">
                {/* 유형 필터 */}
                <div>
                  <p className="text-[12px] text-gray-500 mb-1.5">촬영 유형</p>
                  <Select
                    value={filterType || 'all'}
                    onValueChange={(v) => setFilterType(v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="text-[12px] h-8">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {ALL_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: SHOOTING_TYPE_COLORS[t] }}
                            />
                            {SHOOTING_TYPE_LABELS[t]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 상태 필터 */}
                <div>
                  <p className="text-[12px] text-gray-500 mb-1.5">상태</p>
                  <Select
                    value={filterStatus || 'all'}
                    onValueChange={(v) => setFilterStatus(v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="text-[12px] h-8">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SHOOTING_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 유형별 컬러 범례 */}
                <Separator />
                <div>
                  <p className="text-[12px] text-gray-500 mb-1.5">유형 범례</p>
                  <div className="space-y-1">
                    {ALL_TYPES.map((t) => (
                      <div key={t} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SHOOTING_TYPE_COLORS[t] }}
                        />
                        <span className="text-[12px] text-black">{SHOOTING_TYPE_LABELS[t]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 모바일용 가로 필터 (md 미만에서만) */}
          <div className="md:hidden mb-3">
            <Card>
              <CardContent className="py-2.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <Filter className="h-3.5 w-3.5 text-gray-400" />
                  <Select
                    value={filterType || 'all'}
                    onValueChange={(v) => setFilterType(v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="text-[12px] h-8 w-[130px]">
                      <SelectValue placeholder="유형 전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">유형 전체</SelectItem>
                      {ALL_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: SHOOTING_TYPE_COLORS[t] }}
                            />
                            {SHOOTING_TYPE_LABELS[t]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filterStatus || 'all'}
                    onValueChange={(v) => setFilterStatus(v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="text-[12px] h-8 w-[130px]">
                      <SelectValue placeholder="상태 전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">상태 전체</SelectItem>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SHOOTING_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 중앙: 캘린더 */}
          <div className="flex-1 min-w-0">
            <Card className="h-full flex flex-col">
              <CardContent className="flex-1 p-3 flex flex-col min-h-0">
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center min-h-[500px]">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="min-h-[500px] flex-1">
                    <ShootingCalendar
                      shootings={shootings}
                      selectedDate={selectedDate}
                      currentMonth={currentMonth}
                      viewMode={viewMode}
                      onDateSelect={setSelectedDate}
                      onMonthChange={setCurrentMonth}
                      onShootingClick={handleShootingClick}
                      onDateDoubleClick={handleDateDoubleClick}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 우측 패널: 선택된 날짜의 일정 */}
          <div className="w-[260px] flex-shrink-0 hidden md:block">
            <Card className="h-full">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className={cn(
                  'text-[14px] font-bold',
                  selectedHolidayName ? 'text-red-500' : 'text-black'
                )}>
                  {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
                </CardTitle>
                {selectedHolidayName && (
                  <p className="text-[12px] text-red-400">{selectedHolidayName}</p>
                )}
                <p className="text-[12px] text-gray-400">
                  {selectedDateShootings.length > 0
                    ? `${selectedDateShootings.length}건의 일정`
                    : '일정 없음'}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                {selectedDateShootings.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-[14px] text-gray-400">등록된 일정이 없습니다</p>
                  </div>
                ) : (
                  selectedDateShootings.map((shooting) => (
                    <ShootingListItem
                      key={shooting.id}
                      shooting={shooting}
                      onClick={() => handleShootingClick(shooting)}
                      onDelete={() => setDeleteTarget(shooting)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">촬영 일정 삭제</DialogTitle>
            <DialogDescription className="text-[14px]">
              <span className="font-medium text-black">{deleteTarget?.clientName}</span> 일정을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="text-[14px]"
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteMutation.mutateAsync(deleteTarget.id);
                  toast({ title: '삭제 완료', description: '일정이 삭제되었습니다.' });
                  setDeleteTarget(null);
                } catch {
                  toast({ title: '삭제 실패', variant: 'destructive' });
                }
              }}
              disabled={deleteMutation.isPending}
              className="text-[14px]"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 일정 카드 서브컴포넌트 ====================

function ShootingListItem({
  shooting,
  onClick,
  onDelete,
}: {
  shooting: Shooting;
  onClick: () => void;
  onDelete: () => void;
}) {
  const canDelete = !['in_progress', 'completed'].includes(shooting.status);

  return (
    <div className="relative rounded-lg border transition-colors hover:bg-gray-50">
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left p-3"
      >
        {/* 유형/상태 */}
        <div className="flex items-center gap-1.5 mb-1.5 pr-6">
          <ShootingTypeBadge type={shooting.shootingType} />
          <ShootingStatusBadge status={shooting.status} />
        </div>

        {/* 고객명 */}
        <p className="text-[14px] text-black font-bold truncate">{shooting.clientName}</p>

        {/* 시간 */}
        {shooting.shootingDate && (() => {
          const d = new Date(shooting.shootingDate);
          const h = d.getHours();
          const m = d.getMinutes();
          if (h === 0 && m === 0) return null;
          const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          return (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className="text-[12px] text-gray-600">
                {timeStr}
                {shooting.duration && ` (${shooting.duration}분)`}
              </span>
            </div>
          );
        })()}

        {/* 장소 */}
        {shooting.venueName && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 text-gray-400" />
            <span className="text-[12px] text-gray-600 truncate">{shooting.venueName}</span>
          </div>
        )}

        {/* 등록자 */}
        {shooting.creator && (
          <div className="flex items-center gap-1 mt-0.5">
            <Building2 className="h-3 w-3 text-gray-400" />
            <span className="text-[12px] text-gray-600 truncate">
              {shooting.creator.memberType === 'business' && shooting.creator.representative
                ? `${shooting.creator.clientName}(${shooting.creator.representative})`
                : shooting.creator.clientName}
            </span>
          </div>
        )}

        {/* 응찰 수 */}
        {shooting._count && shooting._count.bids > 0 && (
          <div className="mt-1.5">
            <Badge variant="secondary" className="text-[11px]">
              응찰 {shooting._count.bids}건
            </Badge>
          </div>
        )}
      </button>

      {/* 삭제 버튼 (진행중/완료 제외) */}
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="삭제"
          className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
