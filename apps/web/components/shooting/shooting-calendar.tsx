'use client';

import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  isToday,
  getDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Shooting } from '@/hooks/use-shooting';
import { SHOOTING_TYPE_LABELS } from '@/hooks/use-shooting';
import { SHOOTING_TYPE_COLORS } from './shooting-type-badge';
import type { CalendarViewMode } from '@/stores/shooting-store';
import { getHolidaysForRange } from '@/lib/constants/holidays';

interface ShootingCalendarProps {
  shootings: Shooting[];
  selectedDate: Date;
  currentMonth: Date;
  viewMode: CalendarViewMode;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  onShootingClick?: (shooting: Shooting) => void;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function ShootingCalendar({
  shootings,
  selectedDate,
  currentMonth,
  viewMode,
  onDateSelect,
  onMonthChange,
  onShootingClick,
}: ShootingCalendarProps) {
  // 이전/다음 네비게이션
  const handlePrev = () => {
    switch (viewMode) {
      case 'month':
        onMonthChange(subMonths(currentMonth, 1));
        break;
      case 'week':
        onMonthChange(subWeeks(currentMonth, 1));
        break;
      case 'day':
        onMonthChange(subDays(currentMonth, 1));
        onDateSelect(subDays(currentMonth, 1));
        break;
      case 'twoWeek':
        onMonthChange(subWeeks(currentMonth, 2));
        break;
      case 'list':
        onMonthChange(subMonths(currentMonth, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'month':
        onMonthChange(addMonths(currentMonth, 1));
        break;
      case 'week':
        onMonthChange(addWeeks(currentMonth, 1));
        break;
      case 'day':
        onMonthChange(addDays(currentMonth, 1));
        onDateSelect(addDays(currentMonth, 1));
        break;
      case 'twoWeek':
        onMonthChange(addWeeks(currentMonth, 2));
        break;
      case 'list':
        onMonthChange(addMonths(currentMonth, 1));
        break;
    }
  };

  const handleToday = () => {
    const today = new Date();
    onMonthChange(today);
    onDateSelect(today);
  };

  // 공휴일 맵 (현재 월 기준 전후 연도 포함)
  const holidays = useMemo(() => {
    const year = currentMonth.getFullYear();
    return getHolidaysForRange(year - 1, year + 1);
  }, [currentMonth]);

  // 날짜별 촬영 그룹핑
  const shootingsByDate = useMemo(() => {
    const map = new Map<string, Shooting[]>();
    shootings.forEach((s) => {
      const dateKey = s.scheduledDate.substring(0, 10);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(s);
    });
    return map;
  }, [shootings]);

  // 네이버 스타일 날짜 타이틀
  const titleText = useMemo(() => {
    switch (viewMode) {
      case 'month':
      case 'list':
        return format(currentMonth, 'yyyy.MM');
      case 'week': {
        const weekStart = startOfWeek(currentMonth, { locale: ko });
        const weekEnd = endOfWeek(currentMonth, { locale: ko });
        return `${format(weekStart, 'MM.dd')}-${format(weekEnd, 'MM.dd')}`;
      }
      case 'twoWeek': {
        const weekStart = startOfWeek(currentMonth, { locale: ko });
        const weekEnd = endOfWeek(addWeeks(currentMonth, 1), { locale: ko });
        return `${format(weekStart, 'MM.dd')}-${format(weekEnd, 'MM.dd')}`;
      }
      case 'day':
        return format(currentMonth, 'yyyy.MM.dd');
    }
  }, [currentMonth, viewMode]);

  return (
    <div className="flex flex-col h-full">
      {/* 네이버 스타일 헤더 네비게이션 */}
      <div className="flex items-center gap-3 pb-3 border-b mb-3">
        <span className="text-[18px] text-black font-bold min-w-[120px]">{titleText}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={handleNext}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleToday} className="text-[12px] h-7 px-3">
          오늘
        </Button>
      </div>

      {/* 뷰별 렌더링 */}
      {viewMode === 'month' && (
        <MonthView
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          shootingsByDate={shootingsByDate}
          holidays={holidays}
          onDateSelect={onDateSelect}
          onShootingClick={onShootingClick}
        />
      )}

      {viewMode === 'week' && (
        <WeekView
          currentDate={currentMonth}
          selectedDate={selectedDate}
          shootingsByDate={shootingsByDate}
          holidays={holidays}
          onDateSelect={onDateSelect}
          onShootingClick={onShootingClick}
        />
      )}

      {viewMode === 'day' && (
        <DayView
          currentDate={currentMonth}
          shootingsByDate={shootingsByDate}
          holidays={holidays}
          onDateSelect={onDateSelect}
          onShootingClick={onShootingClick}
        />
      )}

      {viewMode === 'list' && (
        <ListView
          currentMonth={currentMonth}
          shootingsByDate={shootingsByDate}
          holidays={holidays}
          onDateSelect={onDateSelect}
          onShootingClick={onShootingClick}
        />
      )}

      {viewMode === 'twoWeek' && (
        <TwoWeekView
          currentDate={currentMonth}
          selectedDate={selectedDate}
          shootingsByDate={shootingsByDate}
          holidays={holidays}
          onDateSelect={onDateSelect}
          onShootingClick={onShootingClick}
        />
      )}
    </div>
  );
}

// ==================== 월간 뷰 ====================

interface MonthViewProps {
  currentMonth: Date;
  selectedDate: Date;
  shootingsByDate: Map<string, Shooting[]>;
  holidays: Map<string, string>;
  onDateSelect: (date: Date) => void;
  onShootingClick?: (shooting: Shooting) => void;
}

function MonthView({
  currentMonth,
  selectedDate,
  shootingsByDate,
  holidays,
  onDateSelect,
  onShootingClick,
}: MonthViewProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ko });
    const calEnd = endOfWeek(monthEnd, { locale: ko });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  return (
    <div className="flex-1 flex flex-col">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              'text-center py-2 text-[12px] font-medium border-r last:border-r-0',
              i === 0 && 'text-red-500',
              i === 6 && 'text-blue-500',
              i > 0 && i < 6 && 'text-gray-500'
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayShootings = shootingsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const dayOfWeek = getDay(day);
          const holidayName = holidays.get(dateKey);
          const isHolidayDate = !!holidayName;

          return (
            <div
              key={dateKey}
              onClick={() => onDateSelect(day)}
              className={cn(
                'border-b border-r p-1 min-h-[100px] cursor-pointer transition-colors hover:bg-gray-50',
                !isCurrentMonth && 'bg-gray-50/50',
                isSelected && 'bg-blue-50 ring-1 ring-blue-200 ring-inset'
              )}
            >
              {/* 날짜 숫자 + 공휴일 이름 */}
              <div className="flex items-center gap-1 mb-1">
                <span
                  className={cn(
                    'inline-flex items-center justify-center h-6 w-6 rounded-full text-[12px] flex-shrink-0',
                    isTodayDate && 'bg-blue-600 text-white font-bold',
                    !isTodayDate && !isCurrentMonth && 'text-gray-300',
                    !isTodayDate && isCurrentMonth && (dayOfWeek === 0 || isHolidayDate) && 'text-red-500',
                    !isTodayDate && isCurrentMonth && dayOfWeek === 6 && !isHolidayDate && 'text-blue-500',
                    !isTodayDate && isCurrentMonth && dayOfWeek > 0 && dayOfWeek < 6 && !isHolidayDate && 'text-black'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {holidayName && isCurrentMonth && (
                  <span className="text-[10px] text-red-400 truncate leading-tight">
                    {holidayName}
                  </span>
                )}
              </div>

              {/* 촬영 일정 표시 */}
              <div className="space-y-0.5 overflow-hidden">
                {dayShootings.slice(0, 3).map((shooting) => (
                  <button
                    key={shooting.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShootingClick?.(shooting);
                    }}
                    className="w-full text-left rounded px-1 py-0.5 text-[11px] truncate transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: `${SHOOTING_TYPE_COLORS[shooting.type]}15`,
                      color: SHOOTING_TYPE_COLORS[shooting.type],
                      borderLeft: `2px solid ${SHOOTING_TYPE_COLORS[shooting.type]}`,
                    }}
                  >
                    {shooting.scheduledTime
                      ? `${shooting.scheduledTime.substring(0, 5)} `
                      : ''}
                    {shooting.title}
                  </button>
                ))}
                {dayShootings.length > 3 && (
                  <span className="text-[11px] text-gray-500 pl-1">
                    +{dayShootings.length - 3}건
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 주간 뷰 ====================

interface WeekViewProps {
  currentDate: Date;
  selectedDate: Date;
  shootingsByDate: Map<string, Shooting[]>;
  holidays: Map<string, string>;
  onDateSelect: (date: Date) => void;
  onShootingClick?: (shooting: Shooting) => void;
}

function WeekView({
  currentDate,
  selectedDate,
  shootingsByDate,
  holidays,
  onDateSelect,
  onShootingClick,
}: WeekViewProps) {
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { locale: ko });
    const weekEnd = endOfWeek(currentDate, { locale: ko });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // 시간 슬롯 (1시 ~ 12시 오전, 오후 1시 ~ 12시)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* 요일 헤더 - 네이버 스타일 */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-white z-10">
        <div className="border-r" />
        {weekDays.map((day) => {
          const isTodayDate = isToday(day);
          const isSelected = isSameDay(day, selectedDate);
          const dayOfWeek = getDay(day);
          const dateKey = format(day, 'yyyy-MM-dd');
          const holidayName = holidays.get(dateKey);
          const isHolidayDate = !!holidayName;
          return (
            <div
              key={dateKey}
              onClick={() => onDateSelect(day)}
              className={cn(
                'text-center py-2 cursor-pointer hover:bg-gray-50 border-r last:border-r-0',
                isSelected && 'bg-blue-50'
              )}
            >
              <div className="flex items-center justify-center gap-1">
                <span
                  className={cn(
                    'inline-flex items-center justify-center h-7 w-7 rounded-full text-[14px] font-medium',
                    isTodayDate && 'bg-blue-600 text-white',
                    !isTodayDate && (dayOfWeek === 0 || isHolidayDate) && 'text-red-500',
                    !isTodayDate && dayOfWeek === 6 && !isHolidayDate && 'text-blue-500',
                    !isTodayDate && dayOfWeek > 0 && dayOfWeek < 6 && !isHolidayDate && 'text-black'
                  )}
                >
                  {format(day, 'd')}
                </span>
                <span
                  className={cn(
                    'text-[12px]',
                    (dayOfWeek === 0 || isHolidayDate) && 'text-red-500',
                    dayOfWeek === 6 && !isHolidayDate && 'text-blue-500',
                    dayOfWeek > 0 && dayOfWeek < 6 && !isHolidayDate && 'text-gray-500'
                  )}
                >
                  {WEEKDAY_LABELS[dayOfWeek]}
                </span>
              </div>
              {holidayName && (
                <div className="text-[10px] text-red-400 truncate px-1">{holidayName}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 종일 일정 행 */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-h-[32px]">
        <div className="border-r flex items-center justify-end pr-2">
          <span className="text-[11px] text-gray-400">종일</span>
        </div>
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayShootings = (shootingsByDate.get(dateKey) || []).filter(
            (s) => !s.scheduledTime
          );
          return (
            <div key={`allday-${dateKey}`} className="border-r last:border-r-0 p-0.5">
              {dayShootings.map((shooting) => (
                <button
                  key={shooting.id}
                  type="button"
                  onClick={() => onShootingClick?.(shooting)}
                  className="w-full text-left rounded px-1 py-0.5 mb-0.5 text-[11px] truncate"
                  style={{
                    backgroundColor: `${SHOOTING_TYPE_COLORS[shooting.type]}20`,
                    color: SHOOTING_TYPE_COLORS[shooting.type],
                    borderLeft: `2px solid ${SHOOTING_TYPE_COLORS[shooting.type]}`,
                  }}
                >
                  {shooting.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* 시간 그리드 */}
      <div className="flex-1">
        {hours.map((hour) => {
          const isAfternoon = hour >= 12;
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          const label = hour === 12 ? '오후 12시' : hour === 0 ? '오전 12시' : isAfternoon ? `${displayHour}시` : `${displayHour}시`;
          const showAmPm = hour === 6; // 오전 6시에 "오전" 표시

          return (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-h-[48px]">
              <div className="border-r flex items-start justify-end pr-2 pt-0.5">
                <span className="text-[11px] text-gray-400">
                  {showAmPm && <span className="block text-[10px]">오전</span>}
                  {hour === 12 && <span className="block text-[10px]">오후</span>}
                  {displayHour}시
                </span>
              </div>
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayShootings = (shootingsByDate.get(dateKey) || []).filter((s) => {
                  if (!s.scheduledTime) return false;
                  const h = parseInt(s.scheduledTime.substring(0, 2), 10);
                  return h === hour;
                });

                return (
                  <div key={`${dateKey}-${hour}`} className="border-r last:border-r-0 p-0.5 relative">
                    {dayShootings.map((shooting) => (
                      <button
                        key={shooting.id}
                        type="button"
                        onClick={() => onShootingClick?.(shooting)}
                        className="w-full text-left rounded px-1 py-0.5 mb-0.5 text-[11px] truncate"
                        style={{
                          backgroundColor: `${SHOOTING_TYPE_COLORS[shooting.type]}20`,
                          color: SHOOTING_TYPE_COLORS[shooting.type],
                          borderLeft: `2px solid ${SHOOTING_TYPE_COLORS[shooting.type]}`,
                        }}
                      >
                        {shooting.scheduledTime?.substring(0, 5)} {shooting.title}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 일간 뷰 ====================

interface DayViewProps {
  currentDate: Date;
  shootingsByDate: Map<string, Shooting[]>;
  holidays: Map<string, string>;
  onDateSelect: (date: Date) => void;
  onShootingClick?: (shooting: Shooting) => void;
}

function DayView({
  currentDate,
  shootingsByDate,
  holidays,
  onDateSelect,
  onShootingClick,
}: DayViewProps) {
  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const dayShootings = shootingsByDate.get(dateKey) || [];
  const dayOfWeek = getDay(currentDate);
  const holidayName = holidays.get(dateKey);
  const isHolidayDate = !!holidayName;

  // 24시간 슬롯
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 종일 일정 (시간 미지정)
  const allDayShootings = dayShootings.filter((s) => !s.scheduledTime);

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* 날짜 헤더 - 네이버 스타일 */}
      <div className="grid grid-cols-[80px_1fr] border-b sticky top-0 bg-white z-10">
        <div className="border-r" />
        <div className="py-2 px-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center justify-center h-8 w-8 rounded-full text-[16px] font-bold',
                isToday(currentDate) && 'bg-blue-600 text-white',
                !isToday(currentDate) && (dayOfWeek === 0 || isHolidayDate) && 'text-red-500',
                !isToday(currentDate) && dayOfWeek === 6 && !isHolidayDate && 'text-blue-500',
                !isToday(currentDate) && dayOfWeek > 0 && dayOfWeek < 6 && !isHolidayDate && 'text-black'
              )}
            >
              {format(currentDate, 'd')}
            </span>
            <span
              className={cn(
                'text-[14px]',
                (dayOfWeek === 0 || isHolidayDate) && 'text-red-500',
                dayOfWeek === 6 && !isHolidayDate && 'text-blue-500',
                dayOfWeek > 0 && dayOfWeek < 6 && !isHolidayDate && 'text-gray-600'
              )}
            >
              {WEEKDAY_LABELS[dayOfWeek]}
            </span>
            {holidayName && (
              <span className="text-[12px] text-red-400">{holidayName}</span>
            )}
          </div>
        </div>
      </div>

      {/* 종일 일정 행 */}
      {allDayShootings.length > 0 && (
        <div className="grid grid-cols-[80px_1fr] border-b">
          <div className="border-r flex items-center justify-end pr-3">
            <span className="text-[12px] text-gray-400">종일</span>
          </div>
          <div className="p-1 space-y-1">
            {allDayShootings.map((shooting) => (
              <button
                key={shooting.id}
                type="button"
                onClick={() => onShootingClick?.(shooting)}
                className="w-full text-left rounded-lg px-3 py-2 transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: `${SHOOTING_TYPE_COLORS[shooting.type]}15`,
                  borderLeft: `3px solid ${SHOOTING_TYPE_COLORS[shooting.type]}`,
                }}
              >
                <span className="text-[14px] text-black font-normal">{shooting.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 시간 그리드 */}
      {hours.map((hour) => {
        const isAfternoon = hour >= 12;
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const hourShootings = dayShootings.filter((s) => {
          if (!s.scheduledTime) return false;
          const h = parseInt(s.scheduledTime.substring(0, 2), 10);
          return h === hour;
        });

        return (
          <div
            key={hour}
            className="grid grid-cols-[80px_1fr] border-b min-h-[60px]"
          >
            <div className="border-r flex items-start justify-end pr-3 pt-1">
              <div className="text-right">
                {hour === 12 && (
                  <span className="text-[10px] text-gray-500 block">오후</span>
                )}
                {hour === 6 && (
                  <span className="text-[10px] text-gray-500 block">오전</span>
                )}
                <span className="text-[12px] text-gray-400">
                  {displayHour}시
                </span>
              </div>
            </div>
            <div className="p-1">
              {hourShootings.map((shooting) => (
                <button
                  key={shooting.id}
                  type="button"
                  onClick={() => onShootingClick?.(shooting)}
                  className="w-full text-left rounded-lg px-3 py-2 mb-1 transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: `${SHOOTING_TYPE_COLORS[shooting.type]}15`,
                    borderLeft: `3px solid ${SHOOTING_TYPE_COLORS[shooting.type]}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[14px] font-medium"
                      style={{ color: SHOOTING_TYPE_COLORS[shooting.type] }}
                    >
                      {shooting.scheduledTime?.substring(0, 5)}
                    </span>
                    <span className="text-[14px] text-black font-normal">
                      {shooting.title}
                    </span>
                  </div>
                  {shooting.location && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-[12px] text-gray-500">{shooting.location}</span>
                    </div>
                  )}
                  {shooting.clientName && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <User className="h-3 w-3 text-gray-400" />
                      <span className="text-[12px] text-gray-500">{shooting.clientName}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== 목록 뷰 (네이버 캘린더 벤치마킹) ====================

interface ListViewProps {
  currentMonth: Date;
  shootingsByDate: Map<string, Shooting[]>;
  holidays: Map<string, string>;
  onDateSelect: (date: Date) => void;
  onShootingClick?: (shooting: Shooting) => void;
}

function ListView({
  currentMonth,
  shootingsByDate,
  holidays,
  onDateSelect,
  onShootingClick,
}: ListViewProps) {
  // 현재 월의 모든 날짜
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* 테이블 헤더 */}
      <div className="grid grid-cols-[100px_40px_80px_1fr] border-b sticky top-0 bg-gray-50 z-10">
        <div className="py-2 px-3 text-[12px] text-gray-500 font-medium border-r">일자</div>
        <div className="py-2 px-1 text-[12px] text-gray-500 font-medium border-r text-center">추가</div>
        <div className="py-2 px-3 text-[12px] text-gray-500 font-medium border-r">시간</div>
        <div className="py-2 px-3 text-[12px] text-gray-500 font-medium">내용</div>
      </div>

      {/* 날짜별 행 */}
      {monthDays.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayShootings = shootingsByDate.get(dateKey) || [];
        const dayOfWeek = getDay(day);
        const isTodayDate = isToday(day);
        const holidayName = holidays.get(dateKey);
        const isHolidayDate = !!holidayName;

        if (dayShootings.length === 0) {
          return (
            <div
              key={dateKey}
              className={cn(
                'grid grid-cols-[100px_40px_80px_1fr] border-b min-h-[36px] hover:bg-gray-50 cursor-pointer',
                isTodayDate && 'bg-blue-50/50'
              )}
              onClick={() => onDateSelect(day)}
            >
              <div className="py-2 px-3 border-r">
                <span
                  className={cn(
                    'text-[13px] font-medium',
                    isTodayDate && 'text-blue-600 font-bold',
                    !isTodayDate && (dayOfWeek === 0 || isHolidayDate) && 'text-red-500',
                    !isTodayDate && dayOfWeek === 6 && !isHolidayDate && 'text-blue-500',
                    !isTodayDate && dayOfWeek > 0 && dayOfWeek < 6 && !isHolidayDate && 'text-black'
                  )}
                >
                  {format(day, 'MM.dd')} {WEEKDAY_LABELS[dayOfWeek]}
                  {holidayName && <span className="text-[10px] text-red-400 ml-1">{holidayName}</span>}
                </span>
              </div>
              <div className="py-2 px-1 border-r flex items-center justify-center">
                <Plus className="h-3.5 w-3.5 text-gray-300 hover:text-blue-500 cursor-pointer" />
              </div>
              <div className="py-2 px-3 border-r" />
              <div className="py-2 px-3" />
            </div>
          );
        }

        return dayShootings.map((shooting, idx) => (
          <div
            key={shooting.id}
            className={cn(
              'grid grid-cols-[100px_40px_80px_1fr] border-b min-h-[36px] hover:bg-gray-50 cursor-pointer',
              isTodayDate && 'bg-blue-50/50'
            )}
            onClick={() => onShootingClick?.(shooting)}
          >
            {/* 일자 (첫 번째 일정에만 표시) */}
            <div className="py-2 px-3 border-r">
              {idx === 0 && (
                <span
                  className={cn(
                    'text-[13px] font-medium',
                    isTodayDate && 'text-blue-600 font-bold',
                    !isTodayDate && (dayOfWeek === 0 || isHolidayDate) && 'text-red-500',
                    !isTodayDate && dayOfWeek === 6 && !isHolidayDate && 'text-blue-500',
                    !isTodayDate && dayOfWeek > 0 && dayOfWeek < 6 && !isHolidayDate && 'text-black'
                  )}
                >
                  {format(day, 'MM.dd')} {WEEKDAY_LABELS[dayOfWeek]}
                  {holidayName && <span className="text-[10px] text-red-400 ml-1">{holidayName}</span>}
                </span>
              )}
            </div>
            {/* 추가 */}
            <div className="py-2 px-1 border-r flex items-center justify-center">
              {idx === 0 && (
                <Plus className="h-3.5 w-3.5 text-gray-300 hover:text-blue-500 cursor-pointer" />
              )}
            </div>
            {/* 시간 */}
            <div className="py-2 px-3 border-r">
              <span className="text-[12px] text-gray-600">
                {shooting.scheduledTime ? shooting.scheduledTime.substring(0, 5) : '종일'}
              </span>
            </div>
            {/* 내용 */}
            <div className="py-2 px-3 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: SHOOTING_TYPE_COLORS[shooting.type] }}
              />
              <span className="text-[13px] text-black truncate">{shooting.title}</span>
              {shooting.location && (
                <span className="text-[11px] text-gray-400 truncate flex-shrink-0">
                  {shooting.location}
                </span>
              )}
            </div>
          </div>
        ));
      })}
    </div>
  );
}

// ==================== 2주 뷰 ====================

interface TwoWeekViewProps {
  currentDate: Date;
  selectedDate: Date;
  shootingsByDate: Map<string, Shooting[]>;
  holidays: Map<string, string>;
  onDateSelect: (date: Date) => void;
  onShootingClick?: (shooting: Shooting) => void;
}

function TwoWeekView({
  currentDate,
  selectedDate,
  shootingsByDate,
  holidays,
  onDateSelect,
  onShootingClick,
}: TwoWeekViewProps) {
  const twoWeekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { locale: ko });
    const twoWeekEnd = endOfWeek(addWeeks(currentDate, 1), { locale: ko });
    return eachDayOfInterval({ start: weekStart, end: twoWeekEnd });
  }, [currentDate]);

  return (
    <div className="flex-1 flex flex-col">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              'text-center py-2 text-[12px] font-medium border-r last:border-r-0',
              i === 0 && 'text-red-500',
              i === 6 && 'text-blue-500',
              i > 0 && i < 6 && 'text-gray-500'
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 2주 그리드 */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {twoWeekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayShootings = shootingsByDate.get(dateKey) || [];
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const dayOfWeek = getDay(day);
          const holidayName = holidays.get(dateKey);
          const isHolidayDate = !!holidayName;

          return (
            <div
              key={dateKey}
              onClick={() => onDateSelect(day)}
              className={cn(
                'border-b border-r p-1 min-h-[120px] cursor-pointer transition-colors hover:bg-gray-50',
                isSelected && 'bg-blue-50 ring-1 ring-blue-200 ring-inset'
              )}
            >
              {/* 날짜 숫자 + 공휴일 이름 */}
              <div className="flex items-center gap-1 mb-1">
                <span
                  className={cn(
                    'inline-flex items-center justify-center h-6 w-6 rounded-full text-[12px] flex-shrink-0',
                    isTodayDate && 'bg-blue-600 text-white font-bold',
                    !isTodayDate && (dayOfWeek === 0 || isHolidayDate) && 'text-red-500',
                    !isTodayDate && dayOfWeek === 6 && !isHolidayDate && 'text-blue-500',
                    !isTodayDate && dayOfWeek > 0 && dayOfWeek < 6 && !isHolidayDate && 'text-black'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {holidayName && (
                  <span className="text-[10px] text-red-400 truncate leading-tight">
                    {holidayName}
                  </span>
                )}
              </div>

              {/* 촬영 일정 표시 */}
              <div className="space-y-0.5 overflow-hidden">
                {dayShootings.slice(0, 4).map((shooting) => (
                  <button
                    key={shooting.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShootingClick?.(shooting);
                    }}
                    className="w-full text-left rounded px-1 py-0.5 text-[11px] truncate transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: `${SHOOTING_TYPE_COLORS[shooting.type]}15`,
                      color: SHOOTING_TYPE_COLORS[shooting.type],
                      borderLeft: `2px solid ${SHOOTING_TYPE_COLORS[shooting.type]}`,
                    }}
                  >
                    {shooting.scheduledTime
                      ? `${shooting.scheduledTime.substring(0, 5)} `
                      : ''}
                    {shooting.title}
                  </button>
                ))}
                {dayShootings.length > 4 && (
                  <span className="text-[11px] text-gray-500 pl-1">
                    +{dayShootings.length - 4}건
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
