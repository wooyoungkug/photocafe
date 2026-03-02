'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Camera,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  Clock,
  MapPin,
  User,
  Loader2,
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
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useShootingStore } from '@/stores/shooting-store';
import type { CalendarViewMode } from '@/stores/shooting-store';
import { useShootings } from '@/hooks/use-shooting';
import type { Shooting, ShootingType, ShootingStatus } from '@/hooks/use-shooting';
import { SHOOTING_TYPE_LABELS, SHOOTING_STATUS_LABELS } from '@/hooks/use-shooting';
import { ShootingCalendar } from '@/components/shooting/shooting-calendar';
import { ShootingStatusBadge } from '@/components/shooting/shooting-status-badge';
import { ShootingTypeBadge } from '@/components/shooting/shooting-type-badge';
import { SHOOTING_TYPE_COLORS } from '@/components/shooting/shooting-type-badge';

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
  'published',
  'bidding',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
];

const ALL_TYPES: ShootingType[] = [
  'wedding',
  'studio',
  'outdoor',
  'product',
  'profile',
  'event',
  'other',
];

// ==================== 페이지 컴포넌트 ====================

export default function ShootingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
  } = useShootingStore();

  // 날짜 범위 계산 (캘린더에 표시할 범위)
  const dateRange = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ko });
    const calEnd = endOfWeek(monthEnd, { locale: ko });
    return {
      startDate: format(calStart, 'yyyy-MM-dd'),
      endDate: format(calEnd, 'yyyy-MM-dd'),
    };
  }, [currentMonth]);

  // 촬영 데이터 조회
  const { data: shootingsResponse, isLoading } = useShootings({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    type: (filterType as ShootingType) || undefined,
    status: (filterStatus as ShootingStatus) || undefined,
    limit: 500,
  });

  const shootings = shootingsResponse?.data || [];

  // 선택된 날짜의 촬영 목록
  const selectedDateShootings = useMemo(() => {
    return shootings.filter((s) => {
      const dateStr = s.scheduledDate.substring(0, 10);
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
      dateSet.add(s.scheduledDate.substring(0, 10));
    });
    return dateSet;
  }, [shootings]);

  const handleShootingClick = useCallback(
    (shooting: Shooting) => {
      router.push(`/shooting/${shooting.id}`);
    },
    [router]
  );

  return (
    <div className="h-full flex flex-col">
      {/* 페이지 헤더 - 네이버 캘린더 스타일 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Camera className="h-6 w-6 text-gray-700" />
          <h1 className="text-[24px] text-black font-normal">촬영 관리</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* 네이버 스타일 뷰 모드 전환 */}
          <div className="flex border rounded-lg overflow-hidden">
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
          <Button onClick={() => router.push('/shooting/new')} className="text-[14px]">
            <Plus className="h-4 w-4 mr-1.5" />
            촬영 일정 등록
          </Button>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 좌측 패널: 미니 캘린더 + 필터 */}
        <div className="w-[240px] flex-shrink-0 space-y-3 overflow-auto">
          {/* 미니 캘린더 - 네이버 스타일 */}
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

        {/* 중앙: 캘린더 */}
        <div className="flex-1 min-w-0">
          <Card className="h-full flex flex-col">
            <CardContent className="flex-1 p-3 flex flex-col min-h-0">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <ShootingCalendar
                  shootings={shootings}
                  selectedDate={selectedDate}
                  currentMonth={currentMonth}
                  viewMode={viewMode}
                  onDateSelect={setSelectedDate}
                  onMonthChange={setCurrentMonth}
                  onShootingClick={handleShootingClick}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* 우측 패널: 선택된 날짜의 일정 */}
        <div className="w-[260px] flex-shrink-0 overflow-auto">
          <Card className="h-full">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-[14px] text-black font-bold">
                {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
              </CardTitle>
              <p className="text-[12px] text-gray-400">
                {selectedDateShootings.length > 0
                  ? `${selectedDateShootings.length}건의 촬영`
                  : '일정 없음'}
              </p>
            </CardHeader>
            <CardContent className="space-y-2 pb-3">
              {selectedDateShootings.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-[14px] text-gray-400">등록된 촬영이 없습니다</p>
                </div>
              ) : (
                selectedDateShootings.map((shooting) => (
                  <button
                    key={shooting.id}
                    type="button"
                    onClick={() => handleShootingClick(shooting)}
                    className="w-full text-left p-3 rounded-lg border transition-colors hover:bg-gray-50"
                  >
                    {/* 유형/상태 */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ShootingTypeBadge type={shooting.type} />
                      <ShootingStatusBadge status={shooting.status} />
                    </div>

                    {/* 제목 */}
                    <p className="text-[14px] text-black font-bold truncate">
                      {shooting.title}
                    </p>

                    {/* 시간 */}
                    {shooting.scheduledTime && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-[12px] text-gray-600">
                          {shooting.scheduledTime.substring(0, 5)}
                          {shooting.estimatedDuration &&
                            ` (${shooting.estimatedDuration}분)`}
                        </span>
                      </div>
                    )}

                    {/* 장소 */}
                    {shooting.location && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-[12px] text-gray-600 truncate">
                          {shooting.location}
                        </span>
                      </div>
                    )}

                    {/* 고객 */}
                    {shooting.clientName && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-[12px] text-gray-600">
                          {shooting.clientName}
                        </span>
                      </div>
                    )}

                    {/* 응찰 수 */}
                    {shooting.bidCount !== undefined && shooting.bidCount > 0 && (
                      <div className="mt-1.5">
                        <Badge variant="secondary" className="text-[11px]">
                          응찰 {shooting.bidCount}건
                        </Badge>
                      </div>
                    )}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
