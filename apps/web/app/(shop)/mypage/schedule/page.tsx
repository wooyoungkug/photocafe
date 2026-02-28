'use client';

import { useState, useMemo, useCallback } from 'react';
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
  List,
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
import { useShootings } from '@/hooks/use-shooting';
import type { Shooting, ShootingType, ShootingStatus } from '@/hooks/use-shooting';
import { SHOOTING_TYPE_LABELS, SHOOTING_STATUS_LABELS } from '@/hooks/use-shooting';
import { ShootingStatusBadge } from '@/components/shooting/shooting-status-badge';
import { ShootingTypeBadge } from '@/components/shooting/shooting-type-badge';
import { SHOOTING_TYPE_COLORS } from '@/components/shooting/shooting-type-badge';

// ==================== 상수 ====================

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

export default function SchedulePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // 날짜 범위 계산
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

  // 날짜별 촬영 존재 여부
  const datesWithShootings = useMemo(() => {
    const dateSet = new Set<string>();
    shootings.forEach((s) => {
      dateSet.add(s.scheduledDate.substring(0, 10));
    });
    return dateSet;
  }, [shootings]);

  // 전체 촬영 목록 (리스트 뷰용)
  const allShootingsSorted = useMemo(() => {
    return [...shootings].sort(
      (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  }, [shootings]);

  const handleShootingClick = useCallback(
    (shooting: Shooting) => {
      router.push(`/mypage/schedule/${shooting.id}`);
    },
    [router]
  );

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-gray-700" />
          <h2 className="text-[18px] text-black font-bold">일정관리</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* 뷰 모드 전환 */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={cn(
                'px-2.5 py-1 text-[12px] transition-colors',
                viewMode === 'calendar'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'px-2.5 py-1 text-[12px] transition-colors',
                viewMode === 'list'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => router.push('/mypage/schedule/new')}
            className="text-[13px]"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            일정 등록
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="py-2.5">
          <div className="flex items-center gap-3">
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

      {viewMode === 'calendar' ? (
        /* ===== 캘린더 뷰 ===== */
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          {/* 캘린더 */}
          <Card>
            <CardContent className="p-3">
              {/* 월 네비게이션 */}
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[14px] text-black font-bold">
                  {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-0">
                  {/* 요일 헤더 */}
                  {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                    <div
                      key={d}
                      className={cn(
                        'text-center text-[11px] py-1.5 font-medium',
                        i === 0 && 'text-red-400',
                        i === 6 && 'text-blue-400',
                        i > 0 && i < 6 && 'text-gray-400'
                      )}
                    >
                      {d}
                    </div>
                  ))}
                  {/* 날짜 그리드 */}
                  {miniCalendarDays.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const hasShootings = datesWithShootings.has(dateKey);
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);
                    const isCurrentMonth_ = isSameMonth(day, currentMonth);

                    // 해당 날짜의 촬영 목록
                    const dayShootings = shootings.filter(
                      (s) => s.scheduledDate.substring(0, 10) === dateKey
                    );

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          'relative min-h-[72px] p-1 border-t text-left transition-colors',
                          !isCurrentMonth_ && 'bg-gray-50/50',
                          isCurrentMonth_ && 'hover:bg-gray-50',
                          isSelected && 'bg-blue-50 ring-1 ring-blue-300'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex items-center justify-center h-5 w-5 rounded-full text-[11px]',
                            !isCurrentMonth_ && 'text-gray-300',
                            isCurrentMonth_ && 'text-black',
                            isTodayDate && 'bg-blue-600 text-white font-bold',
                            isSelected && !isTodayDate && 'font-bold text-blue-600'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {/* 촬영 표시 (최대 2개) */}
                        <div className="mt-0.5 space-y-0.5">
                          {dayShootings.slice(0, 2).map((s) => (
                            <div
                              key={s.id}
                              className="text-[10px] truncate px-0.5 rounded"
                              style={{
                                backgroundColor: SHOOTING_TYPE_COLORS[s.type] + '20',
                                color: SHOOTING_TYPE_COLORS[s.type],
                              }}
                            >
                              {s.scheduledTime
                                ? s.scheduledTime.substring(0, 5) + ' '
                                : ''}
                              {s.title}
                            </div>
                          ))}
                          {dayShootings.length > 2 && (
                            <div className="text-[10px] text-gray-400 px-0.5">
                              +{dayShootings.length - 2}건
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 우측: 선택된 날짜의 일정 */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] text-black font-bold">
                {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedDateShootings.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-[13px] text-gray-400">등록된 일정이 없습니다</p>
                </div>
              ) : (
                selectedDateShootings.map((shooting) => (
                  <ShootingListItem
                    key={shooting.id}
                    shooting={shooting}
                    onClick={() => handleShootingClick(shooting)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ===== 리스트 뷰 ===== */
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-black font-bold">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })} 일정
              <Badge variant="secondary" className="ml-2 text-[11px]">
                {allShootingsSorted.length}건
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[12px]"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                이전달
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[12px]"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                다음달
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : allShootingsSorted.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-[14px] text-gray-400">등록된 일정이 없습니다</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-[13px]"
                  onClick={() => router.push('/mypage/schedule/new')}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  일정 등록하기
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {allShootingsSorted.map((shooting) => (
                  <ShootingListItem
                    key={shooting.id}
                    shooting={shooting}
                    onClick={() => handleShootingClick(shooting)}
                    showDate
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== 일정 카드 서브컴포넌트 ====================

function ShootingListItem({
  shooting,
  onClick,
  showDate = false,
}: {
  shooting: Shooting;
  onClick: () => void;
  showDate?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border transition-colors hover:bg-gray-50"
    >
      {/* 유형/상태 */}
      <div className="flex items-center gap-1.5 mb-1">
        <ShootingTypeBadge type={shooting.type} />
        <ShootingStatusBadge status={shooting.status} />
      </div>

      {/* 제목 */}
      <p className="text-[14px] text-black font-bold truncate">{shooting.title}</p>

      {/* 날짜 (리스트 뷰에서만) */}
      {showDate && (
        <div className="flex items-center gap-1 mt-1">
          <CalendarIcon className="h-3 w-3 text-gray-400" />
          <span className="text-[12px] text-gray-600">
            {format(new Date(shooting.scheduledDate), 'M월 d일 (EEE)', { locale: ko })}
          </span>
        </div>
      )}

      {/* 시간 */}
      {shooting.scheduledTime && (
        <div className="flex items-center gap-1 mt-0.5">
          <Clock className="h-3 w-3 text-gray-400" />
          <span className="text-[12px] text-gray-600">
            {shooting.scheduledTime.substring(0, 5)}
            {shooting.estimatedDuration && ` (${shooting.estimatedDuration}분)`}
          </span>
        </div>
      )}

      {/* 장소 */}
      {shooting.location && (
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 text-gray-400" />
          <span className="text-[12px] text-gray-600 truncate">{shooting.location}</span>
        </div>
      )}

      {/* 고객 */}
      {shooting.clientName && (
        <div className="flex items-center gap-1 mt-0.5">
          <User className="h-3 w-3 text-gray-400" />
          <span className="text-[12px] text-gray-600">{shooting.clientName}</span>
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
  );
}
