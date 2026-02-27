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
  parseISO,
  getHours,
  getMinutes,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Shooting, ShootingType } from '@/hooks/use-shooting';
import { SHOOTING_TYPE_LABELS } from '@/hooks/use-shooting';
import { SHOOTING_TYPE_COLORS } from './shooting-type-badge';
import type { CalendarViewMode } from '@/stores/shooting-store';

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
    }
  };

  const handleToday = () => {
    const today = new Date();
    onMonthChange(today);
    onDateSelect(today);
  };

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

  // 타이틀 텍스트
  const titleText = useMemo(() => {
    switch (viewMode) {
      case 'month':
        return format(currentMonth, 'yyyy년 M월', { locale: ko });
      case 'week': {
        const weekStart = startOfWeek(currentMonth, { locale: ko });
        const weekEnd = endOfWeek(currentMonth, { locale: ko });
        return `${format(weekStart, 'M월 d일', { locale: ko })} - ${format(weekEnd, 'M월 d일', { locale: ko })}`;
      }
      case 'day':
        return format(currentMonth, 'yyyy년 M월 d일 (EEEE)', { locale: ko });
    }
  }, [currentMonth, viewMode]);

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 네비게이션 */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            오늘
          </Button>
          <Button variant="ghost" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-[18px] text-black font-bold ml-2">{titleText}</h2>
        </div>
      </div>

      {/* 월간 뷰 */}
      {viewMode === 'month' && (
        <MonthView
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          shootingsByDate={shootingsByDate}
          onDateSelect={onDateSelect}
          onShootingClick={onShootingClick}
        />
      )}

      {/* 주간 뷰 */}
      {viewMode === 'week' && (
        <WeekView
          currentDate={currentMonth}
          selectedDate={selectedDate}
          shootingsByDate={shootingsByDate}
          onDateSelect={onDateSelect}
          onShootingClick={onShootingClick}
        />
      )}

      {/* 일간 뷰 */}
      {viewMode === 'day' && (
        <DayView
          currentDate={currentMonth}
          shootingsByDate={shootingsByDate}
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
  onDateSelect: (date: Date) => void;
  onShootingClick?: (shooting: Shooting) => void;
}

function MonthView({
  currentMonth,
  selectedDate,
  shootingsByDate,
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
              'text-center py-2 text-[12px] font-medium',
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
          const dayOfWeek = day.getDay();

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
              {/* 날짜 숫자 */}
              <div className="flex items-center justify-center mb-1">
                <span
                  className={cn(
                    'inline-flex items-center justify-center h-6 w-6 rounded-full text-[12px]',
                    isTodayDate && 'bg-blue-600 text-white font-bold',
                    !isTodayDate && !isCurrentMonth && 'text-gray-300',
                    !isTodayDate && isCurrentMonth && dayOfWeek === 0 && 'text-red-500',
                    !isTodayDate && isCurrentMonth && dayOfWeek === 6 && 'text-blue-500',
                    !isTodayDate && isCurrentMonth && dayOfWeek > 0 && dayOfWeek < 6 && 'text-black'
                  )}
                >
                  {format(day, 'd')}
                </span>
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
  onDateSelect: (date: Date) => void;
  onShootingClick?: (shooting: Shooting) => void;
}

function WeekView({
  currentDate,
  selectedDate,
  shootingsByDate,
  onDateSelect,
  onShootingClick,
}: WeekViewProps) {
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { locale: ko });
    const weekEnd = endOfWeek(currentDate, { locale: ko });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // 시간 슬롯 (6시 ~ 22시)
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-white z-10">
        <div className="border-r" />
        {weekDays.map((day) => {
          const isTodayDate = isToday(day);
          const isSelected = isSameDay(day, selectedDate);
          const dayOfWeek = day.getDay();
          return (
            <div
              key={format(day, 'yyyy-MM-dd')}
              onClick={() => onDateSelect(day)}
              className={cn(
                'text-center py-2 cursor-pointer hover:bg-gray-50 border-r',
                isSelected && 'bg-blue-50'
              )}
            >
              <div
                className={cn(
                  'text-[12px]',
                  dayOfWeek === 0 && 'text-red-500',
                  dayOfWeek === 6 && 'text-blue-500',
                  dayOfWeek > 0 && dayOfWeek < 6 && 'text-gray-500'
                )}
              >
                {WEEKDAY_LABELS[dayOfWeek]}
              </div>
              <div
                className={cn(
                  'inline-flex items-center justify-center h-7 w-7 rounded-full text-[14px]',
                  isTodayDate && 'bg-blue-600 text-white font-bold',
                  !isTodayDate && 'text-black'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* 시간 그리드 */}
      <div className="flex-1">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-h-[60px]">
            <div className="border-r flex items-start justify-end pr-2 pt-0.5">
              <span className="text-[11px] text-gray-400">
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>
            {weekDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayShootings = (shootingsByDate.get(dateKey) || []).filter((s) => {
                if (!s.scheduledTime) return hour === 9; // 시간 미지정 시 9시에 표시
                const h = parseInt(s.scheduledTime.substring(0, 2), 10);
                return h === hour;
              });

              return (
                <div key={`${dateKey}-${hour}`} className="border-r p-0.5 relative">
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
        ))}
      </div>
    </div>
  );
}

// ==================== 일간 뷰 ====================

interface DayViewProps {
  currentDate: Date;
  shootingsByDate: Map<string, Shooting[]>;
  onShootingClick?: (shooting: Shooting) => void;
}

function DayView({
  currentDate,
  shootingsByDate,
  onShootingClick,
}: DayViewProps) {
  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const dayShootings = shootingsByDate.get(dateKey) || [];

  // 시간 슬롯 (6시 ~ 22시)
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {hours.map((hour) => {
        const hourShootings = dayShootings.filter((s) => {
          if (!s.scheduledTime) return hour === 9;
          const h = parseInt(s.scheduledTime.substring(0, 2), 10);
          return h === hour;
        });

        return (
          <div
            key={hour}
            className="grid grid-cols-[80px_1fr] border-b min-h-[60px]"
          >
            <div className="border-r flex items-start justify-end pr-3 pt-1">
              <span className="text-[12px] text-gray-400">
                {String(hour).padStart(2, '0')}:00
              </span>
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
                      {shooting.scheduledTime
                        ? shooting.scheduledTime.substring(0, 5)
                        : '시간 미정'}
                    </span>
                    <span className="text-[14px] text-black font-normal">
                      {shooting.title}
                    </span>
                  </div>
                  {shooting.location && (
                    <p className="text-[12px] text-gray-500 mt-0.5">{shooting.location}</p>
                  )}
                  {shooting.clientName && (
                    <p className="text-[12px] text-gray-500">고객: {shooting.clientName}</p>
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
