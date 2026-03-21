'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  getDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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
import { useLeaveCalendar, type LeaveCalendarEntry } from '@/hooks/use-leave';
import { useDepartments } from '@/hooks/use-staff';

// ==================== 유형별 색상 ====================

const LEAVE_TYPE_COLORS: Record<string, { dot: string; label: string }> = {
  annual: { dot: 'bg-blue-500', label: '연차' },
  half_am: { dot: 'bg-green-500', label: '오전반차' },
  half_pm: { dot: 'bg-green-500', label: '오후반차' },
  half: { dot: 'bg-green-500', label: '반차' },
  quarter: { dot: 'bg-orange-500', label: '반반차' },
  sick: { dot: 'bg-red-500', label: '병가' },
  special: { dot: 'bg-purple-500', label: '특별휴가' },
  default: { dot: 'bg-gray-500', label: '기타' },
};

function getTypeColor(code: string): { dot: string; label: string } {
  return LEAVE_TYPE_COLORS[code] || LEAVE_TYPE_COLORS.default;
}

// ==================== 페이지 컴포넌트 ====================

export default function LeaveCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const { data: departments } = useDepartments();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data: calendarData, isLoading } = useLeaveCalendar({
    year,
    month,
    departmentId: departmentFilter !== 'all' ? departmentFilter : undefined,
  });

  // 날짜별 엔트리 그룹핑
  const entriesByDate = useMemo(() => {
    const map: Record<string, LeaveCalendarEntry[]> = {};
    if (calendarData) {
      calendarData.forEach((entry) => {
        const dateKey = entry.date.substring(0, 10);
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(entry);
      });
    }
    return map;
  }, [calendarData]);

  // 캘린더 날짜 계산
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ko });
    const calEnd = endOfWeek(monthEnd, { locale: ko });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // 최대 인원 수 (색상 강도 계산용)
  const maxPeoplePerDay = useMemo(() => {
    let max = 0;
    Object.values(entriesByDate).forEach((entries) => {
      const uniqueStaff = new Set(entries.map((e) => e.staffId));
      if (uniqueStaff.size > max) max = uniqueStaff.size;
    });
    return max;
  }, [entriesByDate]);

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-gray-700" />
          <h1 className="text-[24px] text-black font-normal">휴가 캘린더</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[160px] text-[14px]">
              <SelectValue placeholder="부서 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 부서</SelectItem>
              {departments?.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="text-[14px]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              이전
            </Button>
            <h2 className="text-[18px] text-black font-bold">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="text-[14px]"
            >
              다음
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* 캘린더 그리드 */}
              <div className="grid grid-cols-7 border-t border-l">
                {/* 요일 헤더 */}
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                  <div
                    key={d}
                    className={cn(
                      'border-b border-r px-2 py-2 text-center text-[13px] font-medium bg-gray-50',
                      i === 0 && 'text-red-500',
                      i === 6 && 'text-blue-500',
                      i > 0 && i < 6 && 'text-gray-700'
                    )}
                  >
                    {d}
                  </div>
                ))}

                {/* 날짜 셀 */}
                {calendarDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const entries = entriesByDate[dateKey] || [];
                  const uniqueStaff = new Set(entries.map((e) => e.staffId));
                  const staffCount = uniqueStaff.size;
                  const isCurrentMonth_ = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);
                  const dayOfWeek = getDay(day);

                  // 색상 강도
                  const intensity =
                    maxPeoplePerDay > 0 && staffCount > 0
                      ? Math.min(staffCount / maxPeoplePerDay, 1)
                      : 0;

                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        'border-b border-r min-h-[100px] p-1.5 relative',
                        !isCurrentMonth_ && 'bg-gray-50',
                        isCurrentMonth_ && intensity > 0 && `bg-blue-${Math.ceil(intensity * 3) * 50 > 100 ? 100 : Math.ceil(intensity * 3) * 50}`,
                      )}
                      style={
                        isCurrentMonth_ && intensity > 0
                          ? { backgroundColor: `rgba(59, 130, 246, ${intensity * 0.15})` }
                          : undefined
                      }
                    >
                      {/* 날짜 숫자 */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            'text-[13px] inline-flex items-center justify-center w-6 h-6 rounded-full',
                            !isCurrentMonth_ && 'text-gray-300',
                            isCurrentMonth_ && dayOfWeek === 0 && 'text-red-500',
                            isCurrentMonth_ && dayOfWeek === 6 && 'text-blue-500',
                            isCurrentMonth_ && dayOfWeek > 0 && dayOfWeek < 6 && 'text-black',
                            isTodayDate && 'bg-blue-600 text-white font-bold'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {staffCount > 0 && (
                          <span className="text-[11px] text-gray-400">
                            {staffCount}명
                          </span>
                        )}
                      </div>

                      {/* 직원 목록 */}
                      {isCurrentMonth_ && entries.length > 0 && (
                        <div className="space-y-0.5">
                          {/* 그룹핑: staffId별 */}
                          {Array.from(uniqueStaff).slice(0, 4).map((staffId) => {
                            const staffEntries = entries.filter((e) => e.staffId === staffId);
                            const firstEntry = staffEntries[0];
                            const typeColor = getTypeColor(firstEntry.leaveTypeCode);
                            return (
                              <div
                                key={staffId}
                                className="flex items-center gap-1 truncate"
                              >
                                <span
                                  className={cn(
                                    'h-2 w-2 rounded-full flex-shrink-0',
                                    typeColor.dot
                                  )}
                                />
                                <span className="text-[11px] text-black truncate">
                                  {firstEntry.staffName}
                                </span>
                              </div>
                            );
                          })}
                          {uniqueStaff.size > 4 && (
                            <span className="text-[10px] text-gray-400 pl-3">
                              +{uniqueStaff.size - 4}명
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 범례 */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                <span className="text-[12px] text-gray-500 font-medium">범례:</span>
                {Object.entries(LEAVE_TYPE_COLORS)
                  .filter(([key]) => key !== 'default')
                  .map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className={cn('h-2.5 w-2.5 rounded-full', val.dot)} />
                      <span className="text-[12px] text-black">{val.label}</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
