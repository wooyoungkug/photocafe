'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isToday,
  isSameDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Camera,
  Plus,
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  MapPin,
  User,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getHolidaysForRange } from '@/lib/constants/holidays';
import { useAuthStore } from '@/stores/auth-store';
import { useShootings } from '@/hooks/use-shooting';
import type { Shooting, ShootingType, ShootingStatus } from '@/hooks/use-shooting';
import { SHOOTING_TYPE_LABELS, SHOOTING_STATUS_LABELS } from '@/hooks/use-shooting';
import { ShootingCalendar } from '@/components/shooting/shooting-calendar';
import { ShootingStatusBadge } from '@/components/shooting/shooting-status-badge';
import { ShootingTypeBadge } from '@/components/shooting/shooting-type-badge';
import { SHOOTING_TYPE_COLORS } from '@/components/shooting/shooting-type-badge';
import type { CalendarViewMode } from '@/stores/shooting-store';
import { Filter } from 'lucide-react';
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

  const [pageView, setPageView] = useState<'calendar' | 'todo'>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // 날짜 범위 계산 (뷰 모드에 따라 범위 확장)
  const dateRange = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ko });
    const calEnd = endOfWeek(monthEnd, { locale: ko });

    // 주간/2주 뷰일 때 범위 보정
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
    type: (filterType as ShootingType) || undefined,
    status: (filterStatus as ShootingStatus) || undefined,
    limit: 500,
  });

  const shootings = shootingsResponse?.data || [];

  // 공휴일 맵
  const holidays = useMemo(() => {
    const year = currentMonth.getFullYear();
    return getHolidaysForRange(year - 1, year + 1);
  }, [currentMonth]);

  // 선택된 날짜의 공휴일 이름
  const selectedHolidayName = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return holidays.get(dateStr);
  }, [selectedDate, holidays]);

  // 선택된 날짜의 촬영 목록
  const selectedDateShootings = useMemo(() => {
    return shootings.filter((s) => {
      const dateStr = s.scheduledDate.substring(0, 10);
      const selectedStr = format(selectedDate, 'yyyy-MM-dd');
      return dateStr === selectedStr;
    });
  }, [shootings, selectedDate]);

  const handleShootingClick = useCallback(
    (shooting: Shooting) => {
      router.push(`/mypage/schedule/${shooting.id}`);
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

      {/* 일정 뷰 (캘린더) */}
      {pageView === 'calendar' && (
        <>
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

          {/* 메인 컨텐츠: 캘린더 + 선택일 패널 */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            {/* 캘린더 (ShootingCalendar 재사용) */}
            <Card>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[500px]">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="min-h-[500px]">
                    <ShootingCalendar
                      shootings={shootings}
                      selectedDate={selectedDate}
                      currentMonth={currentMonth}
                      viewMode={viewMode}
                      onDateSelect={setSelectedDate}
                      onMonthChange={setCurrentMonth}
                      onShootingClick={handleShootingClick}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 우측: 선택된 날짜의 일정 */}
            <Card className="h-fit">
              <CardHeader className="pb-2">
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
        </>
      )}
    </div>
  );
}

// ==================== 일정 카드 서브컴포넌트 ====================

function ShootingListItem({
  shooting,
  onClick,
}: {
  shooting: Shooting;
  onClick: () => void;
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
