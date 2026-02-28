'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
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
} from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Trash2,
  Check,
  Loader2,
  Lock,
  Users,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useTodos,
  useCreateTodo,
  useUpdateTodo,
  useCompleteTodo,
  useDeleteTodo,
} from '@/hooks/use-schedule';
import { useDepartments } from '@/hooks/use-staff';
import type {
  Schedule,
  Todo,
  CreateScheduleDto,
  CreateTodoDto,
} from '@/lib/types/schedule';
import { cn } from '@/lib/utils';

// ==================== Constants ====================

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6시~22시

type ViewMode = 'day' | 'week' | 'month' | 'list' | '2week';

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  meeting: '미팅',
  event: '행사',
  task: '업무',
  reminder: '알림',
  holiday: '휴일',
};

const SCHEDULE_TYPE_COLORS: Record<string, string> = {
  meeting: '#3B82F6',
  event: '#8B5CF6',
  task: '#F59E0B',
  reminder: '#10B981',
  holiday: '#EF4444',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: '낮음',
  normal: '보통',
  high: '높음',
  urgent: '긴급',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

type ScopeFilter = 'personal' | 'department' | 'company' | 'all';

const SCOPE_TABS: { value: ScopeFilter; label: string; icon: typeof Lock }[] = [
  { value: 'all', label: '모두', icon: CalendarDays },
  { value: 'personal', label: '나만', icon: Lock },
  { value: 'department', label: '부서', icon: Users },
  { value: 'company', label: '전체', icon: Building2 },
];

// ==================== Helpers ====================

function getScopeIcon(s: Schedule) {
  if (s.isCompany) return Building2;
  if (s.isDepartment) return Users;
  return Lock;
}

function getScopeLabel(s: Schedule) {
  if (s.isCompany) return '전체';
  if (s.isDepartment) return '부서';
  return '개인';
}

function getScheduleColor(s: Schedule) {
  return s.color || SCHEDULE_TYPE_COLORS[s.scheduleType] || '#6B7280';
}

function getTimeLabel(s: Schedule) {
  if (s.isAllDay) return '종일';
  return `${format(parseISO(s.startAt), 'HH:mm')} - ${format(parseISO(s.endAt), 'HH:mm')}`;
}

function getDateRange(viewMode: ViewMode, baseDate: Date): { start: Date; end: Date } {
  switch (viewMode) {
    case 'day':
      return { start: baseDate, end: baseDate };
    case 'week':
      return {
        start: startOfWeek(baseDate, { locale: ko }),
        end: endOfWeek(baseDate, { locale: ko }),
      };
    case '2week':
      return {
        start: startOfWeek(baseDate, { locale: ko }),
        end: endOfWeek(addWeeks(baseDate, 1), { locale: ko }),
      };
    case 'month':
    case 'list':
    default:
      return { start: startOfMonth(baseDate), end: endOfMonth(baseDate) };
  }
}

function navigate(viewMode: ViewMode, baseDate: Date, direction: 1 | -1): Date {
  switch (viewMode) {
    case 'day':
      return direction === 1 ? addDays(baseDate, 1) : subDays(baseDate, 1);
    case 'week':
      return direction === 1 ? addWeeks(baseDate, 1) : subWeeks(baseDate, 1);
    case '2week':
      return direction === 1 ? addWeeks(baseDate, 2) : subWeeks(baseDate, 2);
    case 'month':
    case 'list':
    default:
      return direction === 1 ? addMonths(baseDate, 1) : subMonths(baseDate, 1);
  }
}

function getTitle(viewMode: ViewMode, baseDate: Date): string {
  switch (viewMode) {
    case 'day':
      return format(baseDate, 'yyyy.MM.dd (EEEE)', { locale: ko });
    case 'week': {
      const ws = startOfWeek(baseDate, { locale: ko });
      const we = endOfWeek(baseDate, { locale: ko });
      return `${format(ws, 'MM.dd', { locale: ko })}-${format(we, 'MM.dd', { locale: ko })}`;
    }
    case '2week': {
      const ws2 = startOfWeek(baseDate, { locale: ko });
      const we2 = endOfWeek(addWeeks(baseDate, 1), { locale: ko });
      return `${format(ws2, 'MM.dd', { locale: ko })}-${format(we2, 'MM.dd', { locale: ko })}`;
    }
    default:
      return format(baseDate, 'yyyy.MM', { locale: ko });
  }
}

// ==================== Page Component ====================

export default function MypageSchedulePage() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [baseDate, setBaseDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');

  // Dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [quickTodoTitle, setQuickTodoTitle] = useState('');

  // Date range for query
  const range = getDateRange(viewMode, baseDate);
  const queryStart = format(startOfMonth(subMonths(range.start, 1)), 'yyyy-MM-dd');
  const queryEnd = format(endOfMonth(addMonths(range.end, 1)), 'yyyy-MM-dd');

  const { data: schedules = [] } = useSchedules({
    startDate: queryStart,
    endDate: queryEnd,
    scope: scopeFilter,
  });
  const { data: todos = [] } = useTodos({ scope: scopeFilter });

  // Mutations
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const completeTodo = useCompleteTodo();
  const deleteTodo = useDeleteTodo();

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    schedules.forEach((s) => {
      const dateKey = s.startAt.substring(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(s);
    });
    // Sort each day by time
    map.forEach((list) => list.sort((a, b) => a.startAt.localeCompare(b.startAt)));
    return map;
  }, [schedules]);

  // Todo lists
  const pendingTodos = useMemo(
    () => todos.filter((t) => t.status !== 'completed' && t.status !== 'cancelled'),
    [todos]
  );
  const completedTodos = useMemo(
    () => todos.filter((t) => t.status === 'completed'),
    [todos]
  );

  // Navigation
  const handlePrev = () => setBaseDate(navigate(viewMode, baseDate, -1));
  const handleNext = () => setBaseDate(navigate(viewMode, baseDate, 1));
  const handleToday = () => {
    const today = new Date();
    setBaseDate(today);
    setSelectedDate(today);
  };

  // Actions
  const openNewSchedule = () => { setEditingSchedule(null); setScheduleDialogOpen(true); };
  const openEditSchedule = (s: Schedule) => { setEditingSchedule(s); setScheduleDialogOpen(true); };
  const openNewTodo = () => { setEditingTodo(null); setTodoDialogOpen(true); };
  const openEditTodo = (t: Todo) => { setEditingTodo(t); setTodoDialogOpen(true); };

  const handleToggleTodo = (todo: Todo) => {
    if (todo.status === 'completed') {
      updateTodo.mutate({ id: todo.id, data: { status: 'pending' } });
    } else {
      completeTodo.mutate(todo.id);
    }
  };

  const handleQuickAddTodo = () => {
    if (!quickTodoTitle.trim()) return;
    createTodo.mutate(
      { title: quickTodoTitle.trim(), isPersonal: true },
      { onSuccess: () => { setQuickTodoTitle(''); toast({ title: '할일이 추가되었습니다' }); } }
    );
  };

  const handleDeleteSchedule = (id: string) => {
    deleteSchedule.mutate(id, { onSuccess: () => toast({ title: '일정이 삭제되었습니다' }) });
  };

  const handleDeleteTodo = (id: string) => {
    deleteTodo.mutate(id, { onSuccess: () => toast({ title: '할일이 삭제되었습니다' }) });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-[18px] text-black font-bold">일정관리</h1>
          </div>
          {/* Scope filter tabs */}
          <div className="flex border rounded-md overflow-hidden">
            {SCOPE_TABS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setScopeFilter(value)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-[12px] border-r last:border-r-0 transition-colors',
                  scopeFilter === value
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={openNewTodo}>
            <Check className="h-4 w-4 mr-1" />
            할일 추가
          </Button>
          <Button size="sm" onClick={openNewSchedule}>
            <Plus className="h-4 w-4 mr-1" />
            일정 등록
          </Button>
        </div>
      </div>

      {/* Main grid: Calendar + Side panel */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        {/* Calendar area */}
        <Card>
          <CardContent className="p-4">
            {/* Toolbar: nav + view toggle */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={handleToday}>
                  오늘
                </Button>
                <h2 className="text-[16px] text-black font-bold ml-2">
                  {getTitle(viewMode, baseDate)}
                </h2>
              </div>
              {/* View mode buttons */}
              <div className="flex border rounded-md overflow-hidden">
                {([
                  ['day', '일간'],
                  ['week', '주간'],
                  ['month', '월간'],
                  ['list', '목록'],
                  ['2week', '2주'],
                ] as [ViewMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'px-2.5 py-1 text-[12px] border-r last:border-r-0 transition-colors',
                      viewMode === mode
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* View content */}
            {viewMode === 'month' && (
              <MonthView
                baseDate={baseDate}
                selectedDate={selectedDate}
                schedulesByDate={schedulesByDate}
                onDateSelect={(d) => { setSelectedDate(d); }}
                onScheduleClick={openEditSchedule}
              />
            )}
            {viewMode === 'day' && (
              <DayView
                baseDate={baseDate}
                schedulesByDate={schedulesByDate}
                onScheduleClick={openEditSchedule}
              />
            )}
            {(viewMode === 'week' || viewMode === '2week') && (
              <WeekView
                baseDate={baseDate}
                weeks={viewMode === '2week' ? 2 : 1}
                selectedDate={selectedDate}
                schedulesByDate={schedulesByDate}
                onDateSelect={setSelectedDate}
                onScheduleClick={openEditSchedule}
              />
            )}
            {viewMode === 'list' && (
              <ListView
                baseDate={baseDate}
                schedulesByDate={schedulesByDate}
                onScheduleClick={openEditSchedule}
                onAddClick={(dateStr) => {
                  setSelectedDate(parseISO(dateStr));
                  openNewSchedule();
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Right panel: selected day + todos */}
        <div className="space-y-4">
          {/* Selected day schedules */}
          <SelectedDayPanel
            selectedDate={selectedDate}
            schedulesByDate={schedulesByDate}
            onEdit={openEditSchedule}
            onDelete={handleDeleteSchedule}
          />

          {/* Todo panel */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-[14px] font-bold">
                할일 ({pendingTodos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex gap-1">
                <Input
                  className="text-[13px] h-8"
                  placeholder="빠른 추가..."
                  value={quickTodoTitle}
                  onChange={(e) => setQuickTodoTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickAddTodo()}
                />
                <Button
                  size="sm" variant="ghost" className="h-8 px-2"
                  disabled={!quickTodoTitle.trim() || createTodo.isPending}
                  onClick={handleQuickAddTodo}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {pendingTodos.length === 0 && (
                <p className="text-[12px] text-gray-400 py-2 text-center">할일이 없습니다</p>
              )}
              {pendingTodos.map((t) => (
                <div key={t.id} className="group flex items-center gap-2 py-1.5 px-1 rounded hover:bg-gray-50">
                  <Checkbox checked={false} onCheckedChange={() => handleToggleTodo(t)} className="h-4 w-4" />
                  <button type="button" className="flex-1 text-left min-w-0" onClick={() => openEditTodo(t)}>
                    <span className="text-[13px] text-black truncate block">{t.title}</span>
                    {t.dueDate && <span className="text-[11px] text-gray-400">마감: {format(parseISO(t.dueDate), 'M/d')}</span>}
                  </button>
                  <Badge className={cn('text-[10px] px-1.5 py-0', PRIORITY_COLORS[t.priority])}>{PRIORITY_LABELS[t.priority]}</Badge>
                  <button type="button" aria-label="할일 삭제" onClick={() => handleDeleteTodo(t.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {completedTodos.length > 0 && (
                <details className="pt-1">
                  <summary className="text-[11px] text-gray-400 cursor-pointer">완료된 항목 ({completedTodos.length})</summary>
                  <div className="mt-1 space-y-1">
                    {completedTodos.slice(0, 5).map((t) => (
                      <div key={t.id} className="group flex items-center gap-2 py-1 px-1">
                        <Checkbox checked={true} onCheckedChange={() => handleToggleTodo(t)} className="h-4 w-4" />
                        <span className="text-[12px] text-gray-400 line-through truncate flex-1">{t.title}</span>
                        <button type="button" aria-label="할일 삭제" onClick={() => handleDeleteTodo(t.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Schedule Dialog */}
      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        schedule={editingSchedule}
        selectedDate={selectedDate}
        onSave={(data) => {
          if (editingSchedule) {
            updateSchedule.mutate({ id: editingSchedule.id, data }, {
              onSuccess: () => { setScheduleDialogOpen(false); toast({ title: '일정이 수정되었습니다' }); },
              onError: () => toast({ title: '수정 실패', variant: 'destructive' }),
            });
          } else {
            createSchedule.mutate(data, {
              onSuccess: () => { setScheduleDialogOpen(false); toast({ title: '일정이 등록되었습니다' }); },
              onError: () => toast({ title: '등록 실패', variant: 'destructive' }),
            });
          }
        }}
        isPending={createSchedule.isPending || updateSchedule.isPending}
      />

      {/* Todo Dialog */}
      <TodoDialog
        open={todoDialogOpen}
        onOpenChange={setTodoDialogOpen}
        todo={editingTodo}
        onSave={(data) => {
          if (editingTodo) {
            updateTodo.mutate({ id: editingTodo.id, data }, {
              onSuccess: () => { setTodoDialogOpen(false); toast({ title: '할일이 수정되었습니다' }); },
              onError: () => toast({ title: '수정 실패', variant: 'destructive' }),
            });
          } else {
            createTodo.mutate(data, {
              onSuccess: () => { setTodoDialogOpen(false); toast({ title: '할일이 추가되었습니다' }); },
              onError: () => toast({ title: '추가 실패', variant: 'destructive' }),
            });
          }
        }}
        isPending={createTodo.isPending || updateTodo.isPending}
      />
    </div>
  );
}

// ==================== Selected Day Panel ====================

function SelectedDayPanel({ selectedDate, schedulesByDate, onEdit, onDelete }: {
  selectedDate: Date;
  schedulesByDate: Map<string, Schedule[]>;
  onEdit: (s: Schedule) => void;
  onDelete: (id: string) => void;
}) {
  const key = format(selectedDate, 'yyyy-MM-dd');
  const daySchedules = schedulesByDate.get(key) || [];

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-[14px] font-bold">
          {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {daySchedules.length === 0 ? (
          <p className="text-[13px] text-gray-400 py-3 text-center">등록된 일정이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {daySchedules.map((s) => {
              const ScopeIcon = getScopeIcon(s);
              return (
                <div
                  key={s.id}
                  className="group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => onEdit(s)}
                >
                  <div className="w-1 h-full min-h-[32px] rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: getScheduleColor(s) }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-[13px] text-black font-medium truncate">{s.title}</p>
                      <ScopeIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{getTimeLabel(s)}</span>
                      {s.creatorName && <span className="text-gray-400">- {s.creatorName}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="일정 삭제"
                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== Month View ====================

function MonthView({ baseDate, selectedDate, schedulesByDate, onDateSelect, onScheduleClick }: {
  baseDate: Date;
  selectedDate: Date;
  schedulesByDate: Map<string, Schedule[]>;
  onDateSelect: (d: Date) => void;
  onScheduleClick: (s: Schedule) => void;
}) {
  const days = useMemo(() => {
    const ms = startOfMonth(baseDate);
    const me = endOfMonth(baseDate);
    return eachDayOfInterval({ start: startOfWeek(ms, { locale: ko }), end: endOfWeek(me, { locale: ko }) });
  }, [baseDate]);

  return (
    <div>
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_LABELS.map((l, i) => (
          <div key={l} className={cn('text-center py-2 text-[12px] font-medium', i === 0 && 'text-red-500', i === 6 && 'text-blue-500', i > 0 && i < 6 && 'text-gray-500')}>
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dk = format(day, 'yyyy-MM-dd');
          const ds = schedulesByDate.get(dk) || [];
          const cm = isSameMonth(day, baseDate);
          const sel = isSameDay(day, selectedDate);
          const td = isToday(day);
          const dow = day.getDay();
          return (
            <button
              key={dk} type="button" onClick={() => onDateSelect(day)}
              className={cn('border-b border-r p-1.5 min-h-[80px] text-left transition-colors hover:bg-gray-50', !cm && 'bg-gray-50/50', sel && 'bg-blue-50 ring-1 ring-blue-200 ring-inset')}
            >
              <div className="flex items-center justify-center mb-1">
                <span className={cn('inline-flex items-center justify-center h-6 w-6 rounded-full text-[12px]', td && 'bg-blue-600 text-white font-bold', !td && !cm && 'text-gray-300', !td && cm && dow === 0 && 'text-red-500', !td && cm && dow === 6 && 'text-blue-500', !td && cm && dow > 0 && dow < 6 && 'text-black')}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {ds.slice(0, 2).map((s) => {
                  const SIcon = getScopeIcon(s);
                  return (
                    <div
                      key={s.id}
                      onClick={(e) => { e.stopPropagation(); onScheduleClick(s); }}
                      className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: `${getScheduleColor(s)}15`, color: getScheduleColor(s), borderLeft: `2px solid ${getScheduleColor(s)}` }}
                    >
                      <SIcon className="h-2.5 w-2.5 flex-shrink-0 opacity-60" />
                      <span className="truncate">{s.title}</span>
                    </div>
                  );
                })}
                {ds.length > 2 && <span className="text-[10px] text-gray-400 pl-1">+{ds.length - 2}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Day View ====================

function DayView({ baseDate, schedulesByDate, onScheduleClick }: {
  baseDate: Date;
  schedulesByDate: Map<string, Schedule[]>;
  onScheduleClick: (s: Schedule) => void;
}) {
  const dk = format(baseDate, 'yyyy-MM-dd');
  const daySchedules = schedulesByDate.get(dk) || [];
  const allDay = daySchedules.filter((s) => s.isAllDay);
  const timed = daySchedules.filter((s) => !s.isAllDay);

  return (
    <div className="flex flex-col overflow-auto max-h-[600px]">
      {/* All-day section */}
      {allDay.length > 0 && (
        <div className="border-b px-2 py-1.5 bg-gray-50 sticky top-0 z-10">
          <span className="text-[11px] text-gray-500 mr-2">종일</span>
          {allDay.map((s) => (
            <button
              key={s.id} type="button" onClick={() => onScheduleClick(s)}
              className="inline-block mr-1 mb-0.5 rounded px-2 py-0.5 text-[12px] hover:opacity-80"
              style={{ backgroundColor: `${getScheduleColor(s)}20`, color: getScheduleColor(s), borderLeft: `3px solid ${getScheduleColor(s)}` }}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}
      {/* Time grid */}
      {HOURS.map((hour) => {
        const hourSchedules = timed.filter((s) => {
          const h = parseInt(s.startAt.substring(11, 13), 10);
          return h === hour;
        });
        return (
          <div key={hour} className="grid grid-cols-[70px_1fr] border-b min-h-[52px]">
            <div className="border-r flex items-start justify-end pr-2 pt-1">
              <span className="text-[11px] text-gray-400">{String(hour).padStart(2, '0')}:00</span>
            </div>
            <div className="p-1">
              {hourSchedules.map((s) => (
                <button
                  key={s.id} type="button" onClick={() => onScheduleClick(s)}
                  className="w-full text-left rounded-lg px-3 py-1.5 mb-0.5 hover:opacity-80"
                  style={{ backgroundColor: `${getScheduleColor(s)}15`, borderLeft: `3px solid ${getScheduleColor(s)}` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium" style={{ color: getScheduleColor(s) }}>
                      {format(parseISO(s.startAt), 'HH:mm')}
                    </span>
                    <span className="text-[13px] text-black">{s.title}</span>
                    {(() => { const SI = getScopeIcon(s); return <SI className="h-3 w-3 text-gray-400 flex-shrink-0" />; })()}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.location && <p className="text-[11px] text-gray-500 mt-0.5">{s.location}</p>}
                    {s.creatorName && <span className="text-[11px] text-gray-400 mt-0.5">{s.creatorName}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== Week View (also 2-week) ====================

function WeekView({ baseDate, weeks, selectedDate, schedulesByDate, onDateSelect, onScheduleClick }: {
  baseDate: Date;
  weeks: number;
  selectedDate: Date;
  schedulesByDate: Map<string, Schedule[]>;
  onDateSelect: (d: Date) => void;
  onScheduleClick: (s: Schedule) => void;
}) {
  const weekDays = useMemo(() => {
    const ws = startOfWeek(baseDate, { locale: ko });
    const we = endOfWeek(addWeeks(baseDate, weeks - 1), { locale: ko });
    return eachDayOfInterval({ start: ws, end: we });
  }, [baseDate, weeks]);

  const colCount = weekDays.length;

  return (
    <div className="flex flex-col overflow-auto max-h-[600px]">
      {/* Day header */}
      <div className={`grid border-b sticky top-0 bg-white z-10`} style={{ gridTemplateColumns: `60px repeat(${colCount}, 1fr)` }}>
        <div className="border-r" />
        {weekDays.map((day) => {
          const td = isToday(day);
          const sel = isSameDay(day, selectedDate);
          const dow = day.getDay();
          return (
            <div
              key={format(day, 'yyyy-MM-dd')}
              onClick={() => onDateSelect(day)}
              className={cn('text-center py-1.5 cursor-pointer hover:bg-gray-50 border-r', sel && 'bg-blue-50')}
            >
              <div className={cn('text-[11px]', dow === 0 && 'text-red-500', dow === 6 && 'text-blue-500', dow > 0 && dow < 6 && 'text-gray-500')}>
                {WEEKDAY_LABELS[dow]}
              </div>
              <div className={cn('inline-flex items-center justify-center h-6 w-6 rounded-full text-[13px]', td && 'bg-blue-600 text-white font-bold', !td && 'text-black')}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>
      {/* Time grid */}
      {HOURS.map((hour) => (
        <div key={hour} className="border-b min-h-[48px]" style={{ display: 'grid', gridTemplateColumns: `60px repeat(${colCount}, 1fr)` }}>
          <div className="border-r flex items-start justify-end pr-2 pt-0.5">
            <span className="text-[11px] text-gray-400">{String(hour).padStart(2, '0')}:00</span>
          </div>
          {weekDays.map((day) => {
            const dk = format(day, 'yyyy-MM-dd');
            const hourSchedules = (schedulesByDate.get(dk) || []).filter((s) => {
              if (s.isAllDay) return hour === 6; // Show all-day at top
              const h = parseInt(s.startAt.substring(11, 13), 10);
              return h === hour;
            });
            return (
              <div key={`${dk}-${hour}`} className="border-r p-0.5">
                {hourSchedules.map((s) => (
                  <button
                    key={s.id} type="button" onClick={() => onScheduleClick(s)}
                    className="w-full text-left rounded px-1 py-0.5 mb-0.5 text-[11px] truncate hover:opacity-80"
                    style={{ backgroundColor: `${getScheduleColor(s)}20`, color: getScheduleColor(s), borderLeft: `2px solid ${getScheduleColor(s)}` }}
                  >
                    {s.isAllDay ? s.title : `${format(parseISO(s.startAt), 'HH:mm')} ${s.title}`}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ==================== List View ====================

function ListView({ baseDate, schedulesByDate, onScheduleClick, onAddClick }: {
  baseDate: Date;
  schedulesByDate: Map<string, Schedule[]>;
  onScheduleClick: (s: Schedule) => void;
  onAddClick: (dateStr: string) => void;
}) {
  const days = useMemo(() => {
    const ms = startOfMonth(baseDate);
    const me = endOfMonth(baseDate);
    return eachDayOfInterval({ start: ms, end: me });
  }, [baseDate]);

  return (
    <div className="max-h-[600px] overflow-auto">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b">
            <th className="text-left py-2 px-2 font-medium text-gray-500 w-[90px]">일자</th>
            <th className="text-center py-2 px-1 font-medium text-gray-500 w-[40px]">추가</th>
            <th className="text-left py-2 px-2 font-medium text-gray-500 w-[60px]">시간</th>
            <th className="text-left py-2 px-2 font-medium text-gray-500">내용</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const dk = format(day, 'yyyy-MM-dd');
            const ds = schedulesByDate.get(dk) || [];
            const dow = day.getDay();
            const td = isToday(day);

            return ds.length > 0 ? (
              ds.map((s, si) => (
                <tr key={s.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => onScheduleClick(s)}>
                  {si === 0 && (
                    <>
                      <td rowSpan={ds.length} className={cn('py-1.5 px-2 align-top font-medium', dow === 0 && 'text-red-500', dow === 6 && 'text-blue-500', td && 'text-blue-600')}>
                        {format(day, 'MM.dd EEE', { locale: ko })}
                      </td>
                      <td rowSpan={ds.length} className="text-center align-top py-1.5">
                        <button type="button" aria-label="일정 추가" onClick={(e) => { e.stopPropagation(); onAddClick(dk); }} className="text-gray-400 hover:text-primary">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </>
                  )}
                  <td className="py-1.5 px-2 text-gray-500 text-[12px]">
                    {s.isAllDay ? '종일' : format(parseISO(s.startAt), 'HH:mm')}
                  </td>
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getScheduleColor(s) }} />
                      <span>{s.title}</span>
                      {(() => { const SI = getScopeIcon(s); return <SI className="h-3 w-3 text-gray-400 flex-shrink-0" />; })()}
                      {s.creatorName && <span className="text-[11px] text-gray-400 flex-shrink-0">{s.creatorName}</span>}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr key={dk} className="border-b">
                <td className={cn('py-1.5 px-2 font-medium', dow === 0 && 'text-red-500', dow === 6 && 'text-blue-500', td && 'text-blue-600')}>
                  {format(day, 'MM.dd EEE', { locale: ko })}
                </td>
                <td className="text-center py-1.5">
                  <button type="button" aria-label="일정 추가" onClick={() => onAddClick(dk)} className="text-gray-400 hover:text-primary">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </td>
                <td className="py-1.5 px-2" />
                <td className="py-1.5 px-2" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ==================== Schedule Dialog ====================

function ScheduleDialog({ open, onOpenChange, schedule, selectedDate, onSave, isPending }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schedule: Schedule | null;
  selectedDate: Date;
  onSave: (data: CreateScheduleDto) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [scheduleType, setScheduleType] = useState<string>('task');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState('#3B82F6');
  const [visibility, setVisibility] = useState<'personal' | 'department' | 'company'>('personal');
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  const { data: departments = [] } = useDepartments();

  const handleOpenChange = (v: boolean) => {
    if (v) {
      if (schedule) {
        setTitle(schedule.title); setDescription(schedule.description || ''); setLocation(schedule.location || '');
        setScheduleType(schedule.scheduleType); setIsAllDay(schedule.isAllDay);
        setStartDate(schedule.startAt.substring(0, 10)); setStartTime(schedule.startAt.substring(11, 16) || '09:00');
        setEndDate(schedule.endAt.substring(0, 10)); setEndTime(schedule.endAt.substring(11, 16) || '10:00');
        setColor(schedule.color || '#3B82F6');
        // Restore visibility
        if (schedule.isCompany) { setVisibility('company'); }
        else if (schedule.isDepartment) { setVisibility('department'); }
        else { setVisibility('personal'); }
        setSelectedDeptIds(schedule.sharedDeptIds || []);
      } else {
        const d = format(selectedDate, 'yyyy-MM-dd');
        setTitle(''); setDescription(''); setLocation(''); setScheduleType('task'); setIsAllDay(false);
        setStartDate(d); setStartTime('09:00'); setEndDate(d); setEndTime('10:00'); setColor('#3B82F6');
        setVisibility('personal'); setSelectedDeptIds([]);
      }
    }
    onOpenChange(v);
  };

  const toggleDept = (deptId: string) => {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(), description: description.trim() || undefined, location: location.trim() || undefined,
      scheduleType: scheduleType as CreateScheduleDto['scheduleType'], isAllDay,
      startAt: isAllDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`,
      endAt: isAllDay ? `${endDate}T23:59:59` : `${endDate}T${endTime}:00`,
      color,
      isPersonal: visibility === 'personal',
      isDepartment: visibility === 'department',
      isCompany: visibility === 'company',
      sharedDeptIds: visibility === 'department' ? selectedDeptIds : [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px]">{schedule ? '일정 수정' : '일정 등록'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-[13px]">제목</Label>
            <Input className="text-[13px]" placeholder="일정 제목" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[13px]">유형</Label>
              <Select value={scheduleType} onValueChange={setScheduleType}>
                <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SCHEDULE_TYPE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k} className="text-[13px]">{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[13px]">색상</Label>
              <div className="flex gap-1.5 mt-1.5">
                {['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899'].map((c) => (
                  <button key={c} type="button" aria-label={`색상 ${c}`} className={cn('w-6 h-6 rounded-full border-2 transition-all', color === c ? 'border-gray-800 scale-110' : 'border-transparent')} style={{ backgroundColor: c }} onClick={() => setColor(c)} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isAllDay} onCheckedChange={(v) => setIsAllDay(!!v)} id="allday" />
            <Label htmlFor="allday" className="text-[13px]">종일</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[13px]">시작</Label>
              <Input type="date" className="text-[13px]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              {!isAllDay && <Input type="time" className="text-[13px] mt-1" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}
            </div>
            <div>
              <Label className="text-[13px]">종료</Label>
              <Input type="date" className="text-[13px]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              {!isAllDay && <Input type="time" className="text-[13px] mt-1" value={endTime} onChange={(e) => setEndTime(e.target.value)} />}
            </div>
          </div>

          {/* Visibility / 공개범위 */}
          <div>
            <Label className="text-[13px] font-medium">공개범위</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)} className="flex gap-4 mt-1.5">
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="personal" id="vis-personal" />
                <Label htmlFor="vis-personal" className="text-[13px] flex items-center gap-1 cursor-pointer">
                  <Lock className="h-3 w-3 text-gray-500" />개인
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="department" id="vis-department" />
                <Label htmlFor="vis-department" className="text-[13px] flex items-center gap-1 cursor-pointer">
                  <Users className="h-3 w-3 text-blue-500" />부서
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="company" id="vis-company" />
                <Label htmlFor="vis-company" className="text-[13px] flex items-center gap-1 cursor-pointer">
                  <Building2 className="h-3 w-3 text-green-500" />전체
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Department multi-select (shown when visibility=department) */}
          {visibility === 'department' && (
            <div>
              <Label className="text-[13px]">공유 부서 선택</Label>
              <div className="mt-1.5 border rounded-md p-2 max-h-[120px] overflow-y-auto space-y-1">
                {departments.length === 0 ? (
                  <p className="text-[12px] text-gray-400 py-1 text-center">등록된 부서가 없습니다</p>
                ) : (
                  departments.filter((d) => d.isActive).map((dept) => (
                    <label key={dept.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox
                        checked={selectedDeptIds.includes(dept.id)}
                        onCheckedChange={() => toggleDept(dept.id)}
                        className="h-4 w-4"
                      />
                      <span className="text-[13px] text-black">{dept.name}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedDeptIds.length === 0 && (
                <p className="text-[11px] text-orange-500 mt-1">부서를 선택하지 않으면 본인 부서에만 공유됩니다</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-[13px]">장소 (선택)</Label>
            <Input className="text-[13px]" placeholder="장소" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label className="text-[13px]">메모 (선택)</Label>
            <Textarea className="text-[13px] resize-none" rows={2} placeholder="메모" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>취소</Button>
          <Button size="sm" disabled={!title.trim() || isPending} onClick={handleSubmit}>
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {schedule ? '수정' : '등록'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Todo Dialog ====================

function TodoDialog({ open, onOpenChange, todo, onSave, isPending }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  todo: Todo | null;
  onSave: (data: CreateTodoDto) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<string>('normal');
  const [dueDate, setDueDate] = useState('');
  const [visibility, setVisibility] = useState<'personal' | 'department' | 'company'>('personal');
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);

  const { data: departments = [] } = useDepartments();

  const handleOpenChange = (v: boolean) => {
    if (v) {
      if (todo) {
        setTitle(todo.title); setContent(todo.content || ''); setPriority(todo.priority); setDueDate(todo.dueDate?.substring(0, 10) || '');
        if (todo.isCompany) { setVisibility('company'); }
        else if (todo.isDepartment) { setVisibility('department'); }
        else { setVisibility('personal'); }
        setSelectedDeptIds(todo.sharedDeptIds || []);
      } else {
        setTitle(''); setContent(''); setPriority('normal'); setDueDate('');
        setVisibility('personal'); setSelectedDeptIds([]);
      }
    }
    onOpenChange(v);
  };

  const toggleDept = (deptId: string) => {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px]">{todo ? '할일 수정' : '할일 추가'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-[13px]">제목</Label>
            <Input className="text-[13px]" placeholder="할일 제목" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[13px]">우선순위</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (<SelectItem key={k} value={k} className="text-[13px]">{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[13px]">마감일 (선택)</Label>
              <Input type="date" className="text-[13px]" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Visibility / 공개범위 */}
          <div>
            <Label className="text-[13px] font-medium">공개범위</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)} className="flex gap-4 mt-1.5">
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="personal" id="todo-vis-personal" />
                <Label htmlFor="todo-vis-personal" className="text-[13px] flex items-center gap-1 cursor-pointer">
                  <Lock className="h-3 w-3 text-gray-500" />개인
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="department" id="todo-vis-department" />
                <Label htmlFor="todo-vis-department" className="text-[13px] flex items-center gap-1 cursor-pointer">
                  <Users className="h-3 w-3 text-blue-500" />부서
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="company" id="todo-vis-company" />
                <Label htmlFor="todo-vis-company" className="text-[13px] flex items-center gap-1 cursor-pointer">
                  <Building2 className="h-3 w-3 text-green-500" />전체
                </Label>
              </div>
            </RadioGroup>
          </div>

          {visibility === 'department' && (
            <div>
              <Label className="text-[13px]">공유 부서 선택</Label>
              <div className="mt-1.5 border rounded-md p-2 max-h-[120px] overflow-y-auto space-y-1">
                {departments.length === 0 ? (
                  <p className="text-[12px] text-gray-400 py-1 text-center">등록된 부서가 없습니다</p>
                ) : (
                  departments.filter((d) => d.isActive).map((dept) => (
                    <label key={dept.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox
                        checked={selectedDeptIds.includes(dept.id)}
                        onCheckedChange={() => toggleDept(dept.id)}
                        className="h-4 w-4"
                      />
                      <span className="text-[13px] text-black">{dept.name}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedDeptIds.length === 0 && (
                <p className="text-[11px] text-orange-500 mt-1">부서를 선택하지 않으면 본인 부서에만 공유됩니다</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-[13px]">내용 (선택)</Label>
            <Textarea className="text-[13px] resize-none" rows={3} placeholder="상세 내용" value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>취소</Button>
          <Button size="sm" disabled={!title.trim() || isPending} onClick={() => {
            if (!title.trim()) return;
            onSave({
              title: title.trim(), content: content.trim() || undefined,
              priority: priority as CreateTodoDto['priority'], dueDate: dueDate || undefined,
              isPersonal: visibility === 'personal',
              isDepartment: visibility === 'department',
              isCompany: visibility === 'company',
              sharedDeptIds: visibility === 'department' ? selectedDeptIds : [],
            });
          }}>
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {todo ? '수정' : '추가'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
