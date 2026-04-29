'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  Calendar,
  CheckSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Building,
  Building2,
  MoreHorizontal,
  Loader2,
  Trash2,
  Edit,
  Check,
  AlertCircle,
  Search,
  ChevronDown,
  Save,
  StickyNote,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  parseISO,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  useTodos,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
  useCompleteTodo,
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useMemos,
  useCreateMemo,
  useUpdateMemo,
  useDeleteMemo,
} from '@/hooks/use-schedule';
import type {
  Todo,
  Schedule,
  CreateTodoDto,
  CreateScheduleDto,
  RecurringConfig,
  RecurringType,
  Memo,
} from '@/lib/types/schedule';
import { cn } from '@/lib/utils';
import { Repeat } from 'lucide-react';

const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const priorityLabels = {
  low: '낮음',
  normal: '보통',
  high: '높음',
  urgent: '긴급',
};

const statusColors = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const statusLabels = {
  pending: '대기',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
};

const recurringTypeLabels: Record<RecurringType, string> = {
  none: '반복 안함',
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
  yearly: '매년',
  custom: '사용자 정의',
};

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

const getDefaultRecurringConfig = (): RecurringConfig => ({
  type: 'none',
  interval: 1,
  weekdays: [],
  endType: 'never',
});

const getRecurringSummary = (config: RecurringConfig, startDate: Date): string => {
  if (config.type === 'none') return '반복 안함';
  let summary = '';
  const interval = config.interval || 1;
  switch (config.type) {
    case 'daily':
      summary = interval === 1 ? '매일' : `${interval}일마다`;
      break;
    case 'weekly':
      if (config.weekdays && config.weekdays.length > 0) {
        const days = config.weekdays
          .sort((a, b) => a - b)
          .map((d) => weekdayLabels[d])
          .join(', ');
        summary = interval === 1 ? `매주 ${days}` : `${interval}주마다 ${days}`;
      } else {
        summary = interval === 1 ? '매주' : `${interval}주마다`;
      }
      break;
    case 'monthly':
      if (config.monthWeek && config.monthWeekday !== undefined) {
        const weekNum = config.monthWeek === -1 ? '마지막' : `${config.monthWeek}번째`;
        summary =
          interval === 1
            ? `매월 ${weekNum} ${weekdayLabels[config.monthWeekday]}`
            : `${interval}개월마다 ${weekNum} ${weekdayLabels[config.monthWeekday]}`;
      } else {
        const day = config.monthDay || startDate.getDate();
        summary = interval === 1 ? `매월 ${day}일` : `${interval}개월마다 ${day}일`;
      }
      break;
    case 'yearly':
      summary = interval === 1 ? '매년' : `${interval}년마다`;
      break;
    case 'custom':
      summary = '사용자 정의';
      break;
  }
  if (config.endType === 'date' && config.endDate) {
    summary += ` (${config.endDate}까지)`;
  } else if (config.endType === 'count' && config.endCount) {
    summary += ` (${config.endCount}회)`;
  }
  return summary;
};

const MEMO_COLORS = [
  { value: '#FEF9C3', label: '노랑' },
  { value: '#DCFCE7', label: '초록' },
  { value: '#DBEAFE', label: '파랑' },
  { value: '#FCE7F3', label: '핑크' },
  { value: '#F3F4F6', label: '회색' },
];

type MemoScope = 'personal' | 'department' | 'company';

const memoScopeLabels: Record<MemoScope, string> = {
  personal: '개인',
  department: '부서',
  company: '전체',
};

const memoScopeIcons: Record<MemoScope, typeof User> = {
  personal: User,
  department: Building,
  company: Building2,
};

export default function SchedulePage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'todos' | 'memos'>('calendar');

  // 메모 상태
  const [memoScopeFilter, setMemoScopeFilter] = useState<
    'all' | 'personal' | 'department' | 'company'
  >('all');
  const [memoSearch, setMemoSearch] = useState('');
  const { data: memos = [], isLoading: memosLoading } = useMemos({
    scope: memoScopeFilter,
    search: memoSearch || undefined,
  });
  const createMemo = useCreateMemo();
  const updateMemo = useUpdateMemo();
  const deleteMemo = useDeleteMemo();
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [isMemoDialogOpen, setIsMemoDialogOpen] = useState(false);
  const [memoForm, setMemoForm] = useState({
    title: '',
    content: '',
    color: '#FEF9C3',
    scope: 'personal' as MemoScope,
  });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenMemoDialog = useCallback((memo?: Memo) => {
    if (memo) {
      setEditingMemo(memo);
      const scope: MemoScope = memo.isCompany
        ? 'company'
        : memo.isDepartment
          ? 'department'
          : 'personal';
      setMemoForm({ title: memo.title, content: memo.content, color: memo.color, scope });
    } else {
      setEditingMemo(null);
      setMemoForm({ title: '', content: '', color: '#FEF9C3', scope: 'personal' });
    }
    setIsMemoDialogOpen(true);
  }, []);

  const handleSaveMemo = useCallback(() => {
    if (!memoForm.title.trim() && !memoForm.content.trim()) {
      toast({ title: '제목 또는 내용을 입력하세요.', variant: 'destructive' });
      return;
    }
    const scopeData = {
      isPersonal: memoForm.scope === 'personal',
      isDepartment: memoForm.scope === 'department',
      isCompany: memoForm.scope === 'company',
    };
    if (editingMemo) {
      updateMemo.mutate(
        {
          id: editingMemo.id,
          data: {
            title: memoForm.title,
            content: memoForm.content,
            color: memoForm.color,
            ...scopeData,
          },
        },
        {
          onSuccess: () => {
            setIsMemoDialogOpen(false);
            toast({ title: '메모가 수정되었습니다.' });
          },
        },
      );
    } else {
      createMemo.mutate(
        { title: memoForm.title, content: memoForm.content, color: memoForm.color, ...scopeData },
        {
          onSuccess: () => {
            setIsMemoDialogOpen(false);
            toast({ title: '메모가 저장되었습니다.' });
          },
        },
      );
    }
  }, [memoForm, editingMemo, createMemo, updateMemo, toast]);

  const handleDeleteMemo = useCallback(
    (id: string) => {
      deleteMemo.mutate(id, {
        onSuccess: () => toast({ title: '메모가 삭제되었습니다.' }),
      });
    },
    [deleteMemo, toast],
  );

  const handleMemoContentChange = useCallback(
    (id: string, content: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateMemo.mutate({ id, data: { content } });
      }, 800);
    },
    [updateMemo],
  );

  const [scopeFilter, setScopeFilter] = useState<'all' | 'personal' | 'department' | 'company'>(
    'all',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  // 다이얼로그 상태
  const [isTodoDialogOpen, setIsTodoDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'todo' | 'schedule';
    id: string;
  } | null>(null);

  const [todoForm, setTodoForm] = useState<CreateTodoDto>({
    title: '',
    content: '',
    priority: 'normal',
    isPersonal: true,
    isDepartment: false,
    isCompany: false,
    color: '#3B82F6',
  });

  const [scheduleForm, setScheduleForm] = useState<CreateScheduleDto>({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    isAllDay: false,
    isPersonal: true,
    isDepartment: false,
    isCompany: false,
    scheduleType: 'meeting',
    color: '#3B82F6',
  });

  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>(
    getDefaultRecurringConfig(),
  );
  const [showRecurringDetail, setShowRecurringDetail] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: todos, isLoading: todosLoading } = useTodos({
    scope: scopeFilter === 'all' ? undefined : scopeFilter,
    startDate: format(monthStart, 'yyyy-MM-dd'),
    endDate: format(monthEnd, 'yyyy-MM-dd'),
  });

  const { data: schedules, isLoading: schedulesLoading } = useSchedules({
    scope: scopeFilter === 'all' ? undefined : scopeFilter,
    startDate: format(monthStart, 'yyyy-MM-dd'),
    endDate: format(monthEnd, 'yyyy-MM-dd'),
  });

  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const completeTodo = useCompleteTodo();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const filteredTodos = useMemo(() => {
    if (!todos) return [];
    if (!searchTerm.trim()) return todos;
    const term = searchTerm.toLowerCase();
    return todos.filter(
      (todo) =>
        todo.title.toLowerCase().includes(term) ||
        todo.content?.toLowerCase().includes(term) ||
        todo.creatorName?.toLowerCase().includes(term),
    );
  }, [todos, searchTerm]);

  const activeTodos = useMemo(
    () => filteredTodos.filter((t) => t.status !== 'completed'),
    [filteredTodos],
  );
  const completedTodos = useMemo(
    () => filteredTodos.filter((t) => t.status === 'completed'),
    [filteredTodos],
  );

  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    if (!searchTerm.trim()) return schedules;
    const term = searchTerm.toLowerCase();
    return schedules.filter(
      (schedule) =>
        schedule.title.toLowerCase().includes(term) ||
        schedule.description?.toLowerCase().includes(term) ||
        schedule.location?.toLowerCase().includes(term) ||
        schedule.creatorName?.toLowerCase().includes(term),
    );
  }, [schedules, searchTerm]);

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTodos =
      filteredTodos?.filter((todo) => {
        if (todo.dueDate) return format(parseISO(todo.dueDate), 'yyyy-MM-dd') === dateStr;
        if (todo.startDate) return format(parseISO(todo.startDate), 'yyyy-MM-dd') === dateStr;
        if (todo.createdAt) return format(parseISO(todo.createdAt), 'yyyy-MM-dd') === dateStr;
        return false;
      }) || [];
    const daySchedules =
      filteredSchedules?.filter((schedule) => {
        const scheduleStart = format(parseISO(schedule.startAt), 'yyyy-MM-dd');
        const scheduleEnd = format(parseISO(schedule.endAt), 'yyyy-MM-dd');
        return dateStr >= scheduleStart && dateStr <= scheduleEnd;
      }) || [];
    return { todos: dayTodos, schedules: daySchedules };
  };

  const openTodoDialog = (todo?: Todo) => {
    if (todo) {
      setEditingTodo(todo);
      setTodoForm({
        title: todo.title,
        content: todo.content || '',
        priority: todo.priority,
        startDate: todo.startDate,
        dueDate: todo.dueDate,
        isAllDay: todo.isAllDay,
        isPersonal: todo.isPersonal,
        isDepartment: todo.isDepartment,
        isCompany: todo.isCompany,
        color: todo.color || '#3B82F6',
      });
    } else {
      setEditingTodo(null);
      const nowStr = format(new Date(), "yyyy-MM-dd'T'HH:mm");
      setTodoForm({
        title: '',
        content: '',
        priority: 'normal',
        startDate: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : nowStr,
        dueDate: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : nowStr,
        isPersonal: true,
        isDepartment: false,
        isCompany: false,
        color: '#3B82F6',
      });
    }
    setIsTodoDialogOpen(true);
  };

  const openScheduleDialog = (schedule?: Schedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setScheduleForm({
        title: schedule.title,
        description: schedule.description || '',
        location: schedule.location || '',
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        isAllDay: schedule.isAllDay,
        isPersonal: schedule.isPersonal,
        isDepartment: schedule.isDepartment,
        isCompany: schedule.isCompany,
        scheduleType: schedule.scheduleType,
        color: schedule.color || '#3B82F6',
      });
      if (schedule.recurringConfig) {
        setRecurringConfig(schedule.recurringConfig);
      } else if (schedule.isRecurring) {
        setRecurringConfig({ ...getDefaultRecurringConfig(), type: 'custom' });
      } else {
        setRecurringConfig(getDefaultRecurringConfig());
      }
    } else {
      setEditingSchedule(null);
      const defaultStart = selectedDate || new Date();
      const defaultEnd = new Date(defaultStart);
      defaultEnd.setHours(defaultEnd.getHours() + 1);
      setScheduleForm({
        title: '',
        description: '',
        location: '',
        startAt: format(defaultStart, "yyyy-MM-dd'T'HH:mm"),
        endAt: format(defaultEnd, "yyyy-MM-dd'T'HH:mm"),
        isAllDay: false,
        isPersonal: true,
        isDepartment: false,
        isCompany: false,
        scheduleType: 'meeting',
        color: '#3B82F6',
      });
      setRecurringConfig(getDefaultRecurringConfig());
    }
    setShowRecurringDetail(false);
    setIsScheduleDialogOpen(true);
  };

  const handleSaveTodo = async () => {
    if (!todoForm.title.trim()) {
      toast({ title: '제목을 입력해주세요.', variant: 'destructive' });
      return;
    }
    try {
      if (editingTodo) {
        await updateTodo.mutateAsync({ id: editingTodo.id, data: todoForm });
        toast({ title: '할일이 수정되었습니다.' });
      } else {
        await createTodo.mutateAsync(todoForm);
        toast({ title: '할일이 등록되었습니다.' });
      }
      setIsTodoDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '저장에 실패했습니다.';
      toast({ title: message, variant: 'destructive' });
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.title.trim()) {
      toast({ title: '제목을 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!scheduleForm.startAt || !scheduleForm.endAt) {
      toast({ title: '시작/종료 시간을 입력해주세요.', variant: 'destructive' });
      return;
    }
    const dataToSave: CreateScheduleDto = {
      ...scheduleForm,
      startAt: new Date(scheduleForm.startAt).toISOString(),
      endAt: new Date(scheduleForm.endAt).toISOString(),
      isRecurring: recurringConfig.type !== 'none',
      recurringConfig: recurringConfig.type !== 'none' ? recurringConfig : undefined,
      recurringEnd: recurringConfig.endType === 'date' ? recurringConfig.endDate : undefined,
    };
    try {
      if (editingSchedule) {
        await updateSchedule.mutateAsync({ id: editingSchedule.id, data: dataToSave });
        toast({ title: '일정이 수정되었습니다.' });
      } else {
        await createSchedule.mutateAsync(dataToSave);
        toast({ title: '일정이 등록되었습니다.' });
      }
      setIsScheduleDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '저장에 실패했습니다.';
      toast({ title: message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'todo') {
        await deleteTodo.mutateAsync(deleteConfirm.id);
        toast({ title: '할일이 삭제되었습니다.' });
      } else {
        await deleteSchedule.mutateAsync(deleteConfirm.id);
        toast({ title: '일정이 삭제되었습니다.' });
      }
      setDeleteConfirm(null);
    } catch {
      toast({ title: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleCompleteTodo = async (todoId: string) => {
    try {
      await completeTodo.mutateAsync(todoId);
      toast({ title: '할일이 완료되었습니다.' });
    } catch {
      toast({ title: '완료 처리에 실패했습니다.', variant: 'destructive' });
    }
  };

  const renderScopeIcon = (item: Todo | Schedule) => {
    if (item.isCompany) return <Building2 className="h-3 w-3 text-purple-500" />;
    if (item.isDepartment) return <Building className="h-3 w-3 text-blue-500" />;
    return <User className="h-3 w-3 text-gray-500" />;
  };

  const isLoading = todosLoading || schedulesLoading;

  // 선택된 날짜의 일정/할일
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return { todos: [], schedules: [] };
    return getEventsForDate(selectedDate);
  }, [selectedDate, filteredTodos, filteredSchedules]);

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-white shrink-0">
        <Calendar className="h-5 w-5 text-blue-600" />
        <h1 className="text-[24px] text-black font-normal">일정 관리</h1>

        {/* 탭 전환 */}
        <div className="flex items-center rounded-lg border overflow-hidden ml-4">
          {(
            [
              { key: 'calendar', label: '캘린더', Icon: Calendar },
              { key: 'todos', label: '할일목록', Icon: CheckSquare },
              { key: 'memos', label: '메모장', Icon: StickyNote },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                'px-3 py-1.5 text-[13px] font-medium flex items-center gap-1.5 transition-colors',
                activeTab === key
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-white text-black hover:bg-slate-50',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => openTodoDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            할일 추가
          </Button>
          <Button size="sm" variant="outline" onClick={() => openScheduleDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            일정 추가
          </Button>
        </div>
      </div>

      {/* ── 캘린더 탭 : 3-컬럼 ── */}
      {activeTab === 'calendar' && (
        <div className="flex-1 flex gap-3 min-h-0 overflow-hidden p-3">
          {/* ── 왼쪽 패널 ── */}
          <div className="w-[220px] shrink-0 flex flex-col gap-3 overflow-y-auto">
            {/* 미니 캘린더 */}
            <Card className="shadow-none">
              <CardContent className="p-3">
                {/* 월 네비게이션 */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    aria-label="이전 달"
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="p-0.5 rounded hover:bg-slate-100"
                  >
                    <ChevronLeft className="h-4 w-4 text-slate-500" />
                  </button>
                  <span className="text-[13px] font-medium text-black">
                    {format(currentDate, 'yyyy년 M월', { locale: ko })}
                  </span>
                  <button
                    type="button"
                    aria-label="다음 달"
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="p-0.5 rounded hover:bg-slate-100"
                  >
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </button>
                </div>
                {/* 미니 그리드 */}
                <div className="grid grid-cols-7 gap-px">
                  {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                    <div
                      key={d}
                      className={cn(
                        'text-center text-[11px] font-medium py-0.5',
                        i === 0 && 'text-red-500',
                        i === 6 && 'text-blue-500',
                      )}
                    >
                      {d}
                    </div>
                  ))}
                  {calendarDays.map((day) => {
                    const { todos: dt, schedules: ds } = getEventsForDate(day);
                    const hasEvents = dt.length + ds.length > 0;
                    const dow = day.getDay();
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          'relative flex flex-col items-center rounded py-0.5 text-[12px] transition-colors',
                          !isSameMonth(day, currentDate) && 'opacity-30',
                          isToday(day) && 'font-bold',
                          selectedDate && isSameDay(day, selectedDate)
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-slate-100',
                          dow === 0 &&
                            !(selectedDate && isSameDay(day, selectedDate)) &&
                            'text-red-500',
                          dow === 6 &&
                            !(selectedDate && isSameDay(day, selectedDate)) &&
                            'text-blue-500',
                        )}
                      >
                        {format(day, 'd')}
                        {hasEvents && (
                          <span
                            className={cn(
                              'h-1 w-1 rounded-full mt-0.5',
                              selectedDate && isSameDay(day, selectedDate)
                                ? 'bg-white'
                                : 'bg-blue-400',
                            )}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* 오늘 버튼 */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentDate(new Date());
                    setSelectedDate(new Date());
                  }}
                  className="mt-2 w-full text-[12px] text-blue-600 hover:underline text-center"
                >
                  오늘
                </button>
              </CardContent>
            </Card>

            {/* 범위 필터 */}
            <Card className="shadow-none">
              <CardContent className="p-3 space-y-1">
                <p className="text-[11px] font-medium text-slate-500 mb-1.5">보기 범위</p>
                {(
                  [
                    { value: 'all', label: '전체', Icon: Calendar },
                    { value: 'personal', label: '개인', Icon: User },
                    { value: 'department', label: '부서', Icon: Building },
                    { value: 'company', label: '전사', Icon: Building2 },
                  ] as const
                ).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScopeFilter(value)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                      scopeFilter === value
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-black hover:bg-slate-100',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="일정/할일 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[13px] border rounded-md outline-none focus:ring-2 focus:ring-blue-200 bg-white"
              />
            </div>

            {/* 범례 */}
            <div className="flex flex-col gap-1.5 px-1">
              <div className="flex items-center gap-2 text-[12px] text-slate-500">
                <div className="w-3 h-3 rounded bg-blue-100 border-l-2 border-blue-500 shrink-0" />
                일정
              </div>
              <div className="flex items-center gap-2 text-[12px] text-slate-500">
                <div className="w-3 h-3 rounded bg-emerald-100 border-l-2 border-emerald-500 shrink-0" />
                할일
              </div>
            </div>
          </div>

          {/* ── 가운데 : 메인 캘린더 ── */}
          <Card className="flex-1 min-w-0 shadow-none overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0">
              <span className="text-[18px] text-black font-bold">
                {format(currentDate, 'yyyy년 M월', { locale: ko })}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[13px]"
                  onClick={() => {
                    setCurrentDate(new Date());
                    setSelectedDate(new Date());
                  }}
                >
                  오늘
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardContent className="flex-1 overflow-auto p-0">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-px bg-slate-200 h-full min-h-[480px]">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                    <div
                      key={day}
                      className={cn(
                        'bg-slate-50 py-1.5 text-center text-[13px] font-medium',
                        i === 0 && 'text-red-500',
                        i === 6 && 'text-blue-500',
                      )}
                    >
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((day) => {
                    const { todos: dayTodos, schedules: daySchedules } = getEventsForDate(day);
                    const dow = day.getDay();
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          'min-h-20 bg-white p-1 cursor-pointer hover:bg-slate-50 transition-colors',
                          !isSameMonth(day, currentDate) && 'bg-slate-50/50 opacity-50',
                          isToday(day) && 'bg-blue-50',
                          selectedDate &&
                            isSameDay(day, selectedDate) &&
                            'ring-2 ring-blue-500 ring-inset',
                        )}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div
                          className={cn(
                            'text-[13px] font-medium mb-0.5',
                            dow === 0 && 'text-red-500',
                            dow === 6 && 'text-blue-500',
                            isToday(day) &&
                              'bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px]',
                          )}
                        >
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-0.5 overflow-hidden max-h-16">
                          {daySchedules.slice(0, 2).map((schedule) => (
                            <div
                              key={schedule.id}
                              className="text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-0.5 bg-blue-100 text-blue-700 border-l-2 border-blue-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                openScheduleDialog(schedule);
                              }}
                            >
                              <Clock className="h-2.5 w-2.5 shrink-0" />
                              {schedule.title}
                            </div>
                          ))}
                          {dayTodos.slice(0, 2).map((todo) => (
                            <div
                              key={todo.id}
                              className={cn(
                                'text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-0.5 bg-emerald-100 text-emerald-700 border-l-2 border-emerald-500',
                                todo.status === 'completed' &&
                                  'line-through opacity-50 bg-gray-100 text-gray-500 border-gray-400',
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                openTodoDialog(todo);
                              }}
                            >
                              <CheckSquare className="h-2.5 w-2.5 shrink-0" />
                              {todo.title}
                            </div>
                          ))}
                          {daySchedules.length + dayTodos.length > 4 && (
                            <div className="text-[10px] text-slate-400 text-center">
                              +{daySchedules.length + dayTodos.length - 4}개
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 오른쪽 : 선택 날짜 패널 ── */}
          <div className="w-[260px] shrink-0 flex flex-col gap-3 overflow-y-auto">
            <Card className="shadow-none flex-1">
              <CardContent className="p-3">
                {!selectedDate ? (
                  <div className="text-center py-8 text-[13px] text-slate-400">
                    날짜를 선택하세요
                  </div>
                ) : (
                  <>
                    {/* 날짜 헤더 */}
                    <div className="mb-3">
                      <p className="text-[16px] text-black font-bold">
                        {format(selectedDate, 'M월 d일', { locale: ko })}
                      </p>
                      <p className="text-[12px] text-slate-500">
                        {format(selectedDate, 'EEEE', { locale: ko })}
                        {isToday(selectedDate) && (
                          <span className="ml-1.5 text-blue-600 font-medium">오늘</span>
                        )}
                      </p>
                    </div>

                    {/* 빠른 추가 버튼 */}
                    <div className="flex gap-1.5 mb-3">
                      <button
                        type="button"
                        onClick={() => openScheduleDialog()}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border text-[12px] text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        일정
                      </button>
                      <button
                        type="button"
                        onClick={() => openTodoDialog()}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border text-[12px] text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        할일
                      </button>
                    </div>

                    {/* 일정 목록 */}
                    {selectedDateEvents.schedules.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[11px] font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          일정 {selectedDateEvents.schedules.length}건
                        </p>
                        <div className="space-y-1">
                          {selectedDateEvents.schedules.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-start gap-2 p-2 rounded-md bg-blue-50 border border-blue-100 group"
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                                style={{ backgroundColor: s.color || '#3B82F6' }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-black font-medium truncate">
                                  {s.title}
                                </p>
                                {!s.isAllDay && (
                                  <p className="text-[11px] text-slate-500">
                                    {format(parseISO(s.startAt), 'HH:mm')} ~{' '}
                                    {format(parseISO(s.endAt), 'HH:mm')}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                aria-label="일정 수정"
                                onClick={() => openScheduleDialog(s)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-blue-200"
                              >
                                <Edit className="h-3 w-3 text-blue-600" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 할일 목록 */}
                    {selectedDateEvents.todos.length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                          <CheckSquare className="h-3 w-3" />
                          할일 {selectedDateEvents.todos.length}건
                        </p>
                        <div className="space-y-1">
                          {selectedDateEvents.todos.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-start gap-2 p-2 rounded-md bg-emerald-50 border border-emerald-100 group"
                            >
                              <Checkbox
                                checked={t.status === 'completed'}
                                onCheckedChange={() =>
                                  t.status !== 'completed' && handleCompleteTodo(t.id)
                                }
                                className="mt-0.5 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    'text-[13px] text-black font-medium truncate',
                                    t.status === 'completed' && 'line-through text-slate-400',
                                  )}
                                >
                                  {t.title}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] px-1 py-0 h-4 mt-0.5',
                                    priorityColors[t.priority],
                                  )}
                                >
                                  {priorityLabels[t.priority]}
                                </Badge>
                              </div>
                              <button
                                type="button"
                                aria-label="할일 수정"
                                onClick={() => openTodoDialog(t)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-emerald-200"
                              >
                                <Edit className="h-3 w-3 text-emerald-600" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDateEvents.schedules.length === 0 &&
                      selectedDateEvents.todos.length === 0 && (
                        <div className="text-center py-6 text-[13px] text-slate-400">
                          이 날의 일정이 없습니다
                        </div>
                      )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── 할일목록 탭 ── */}
      {activeTab === 'todos' && (
        <div className="flex-1 overflow-y-auto p-4">
          <Card>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : activeTodos.length === 0 && completedTodos.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  {searchTerm ? '검색 결과가 없습니다.' : '등록된 할일이 없습니다.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {activeTodos.length === 0 ? (
                    <div className="text-center py-6 text-[14px] text-slate-400">
                      미완료 항목이 없습니다.
                    </div>
                  ) : (
                    activeTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                      >
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => handleCompleteTodo(todo.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] text-black font-medium">{todo.title}</span>
                            {renderScopeIcon(todo)}
                            <Badge variant="outline" className={priorityColors[todo.priority]}>
                              {priorityLabels[todo.priority]}
                            </Badge>
                            <Badge variant="outline" className={statusColors[todo.status]}>
                              {statusLabels[todo.status]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[12px] text-slate-500">
                            <span>작성: {todo.creatorName}</span>
                            {todo.dueDate && (
                              <span>
                                마감: {format(parseISO(todo.dueDate), 'yyyy-MM-dd HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openTodoDialog(todo)}>
                              <Edit className="h-4 w-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCompleteTodo(todo.id)}>
                              <Check className="h-4 w-4 mr-2" />
                              완료
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setDeleteConfirm({ type: 'todo', id: todo.id })
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
                  )}
                  {completedTodos.length > 0 && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setShowCompleted(!showCompleted)}
                        className="flex items-center gap-2 text-[13px] text-slate-500 hover:text-black transition-colors py-2"
                      >
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform',
                            showCompleted && 'rotate-180',
                          )}
                        />
                        완료된 항목 {completedTodos.length}개
                      </button>
                      {showCompleted && (
                        <div className="space-y-2 mt-2">
                          {completedTodos.map((todo) => (
                            <div
                              key={todo.id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50 opacity-60"
                            >
                              <Checkbox checked={true} disabled />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[14px] font-medium line-through">
                                    {todo.title}
                                  </span>
                                  {renderScopeIcon(todo)}
                                  <Badge
                                    variant="outline"
                                    className={priorityColors[todo.priority]}
                                  >
                                    {priorityLabels[todo.priority]}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[12px] text-slate-500">
                                  <span>작성: {todo.creatorName}</span>
                                  {todo.completedAt && (
                                    <span className="text-green-600">
                                      완료: {format(parseISO(todo.completedAt), 'yyyy-MM-dd HH:mm')} ({todo.completedBy})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() =>
                                      setDeleteConfirm({ type: 'todo', id: todo.id })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── 메모장 탭 ── */}
      {activeTab === 'memos' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[18px] text-black font-bold flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-yellow-500" />
                메모장
              </h2>
              <p className="text-[14px] text-black font-normal mt-0.5">
                개인/부서/전체 범위로 메모를 공유할 수 있습니다.
              </p>
            </div>
            <Button onClick={() => handleOpenMemoDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              메모 추가
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex rounded-lg border overflow-hidden">
              {(['all', 'personal', 'department', 'company'] as const).map((scope) => {
                const ScopeIcon = scope === 'all' ? Search : memoScopeIcons[scope as MemoScope];
                return (
                  <button
                    key={scope}
                    type="button"
                    className={cn(
                      'px-3 py-1.5 text-[13px] font-medium flex items-center gap-1.5 transition-colors',
                      memoScopeFilter === scope
                        ? 'bg-red-50 text-red-700 border-red-300'
                        : 'bg-white text-black hover:bg-gray-100',
                    )}
                    onClick={() => setMemoScopeFilter(scope)}
                  >
                    <ScopeIcon className="h-3.5 w-3.5" />
                    {scope === 'all' ? '전체보기' : memoScopeLabels[scope as MemoScope]}
                  </button>
                );
              })}
            </div>
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="메모 검색..."
                value={memoSearch}
                onChange={(e) => setMemoSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {memosLoading ? (
            <div className="text-center py-16">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-gray-400" />
              <p className="text-[14px] text-black font-normal">메모를 불러오는 중...</p>
            </div>
          ) : memos.length === 0 ? (
            <div className="text-center py-16 text-slate-400 border-2 border-dashed rounded-xl">
              <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-[14px]">메모가 없습니다.</p>
              <p className="text-[14px] mt-1">상단 버튼으로 새 메모를 추가하세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {memos.map((memo) => {
                const memoScope: MemoScope = memo.isCompany
                  ? 'company'
                  : memo.isDepartment
                    ? 'department'
                    : 'personal';
                const ScopeIcon = memoScopeIcons[memoScope];
                return (
                  <div
                    key={memo.id}
                    className="rounded-xl p-4 shadow-sm border border-black/5 flex flex-col gap-2 min-h-[180px] relative group"
                    style={{ backgroundColor: memo.color }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[11px] px-1.5 py-0 h-5 bg-white/60"
                        >
                          <ScopeIcon className="h-3 w-3 mr-1" />
                          {memoScopeLabels[memoScope]}
                        </Badge>
                        <span className="text-[14px] text-black font-bold flex-1 break-words leading-snug truncate">
                          {memo.title || '(제목 없음)'}
                        </span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleOpenMemoDialog(memo)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteMemo(memo.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <textarea
                      className="flex-1 resize-none text-[14px] text-black font-normal bg-transparent border-none outline-none w-full leading-relaxed min-h-[80px]"
                      defaultValue={memo.content}
                      placeholder="내용을 입력하세요..."
                      onChange={(e) => handleMemoContentChange(memo.id, e.target.value)}
                    />
                    <div className="flex items-center justify-between gap-1 text-[12px] text-black/40 mt-auto pt-1 border-t border-black/10">
                      <span>
                        {memo.creatorName}
                        {memo.creatorDeptName ? ` (${memo.creatorDeptName})` : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Save className="h-3 w-3" />
                        {format(new Date(memo.updatedAt), 'MM/dd HH:mm', { locale: ko })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 메모 다이얼로그 */}
      <Dialog open={isMemoDialogOpen} onOpenChange={setIsMemoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-yellow-500" />
              {editingMemo ? '메모 수정' : '새 메모'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>제목</Label>
              <Input
                placeholder="메모 제목"
                value={memoForm.title}
                onChange={(e) => setMemoForm({ ...memoForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                placeholder="메모 내용..."
                rows={6}
                value={memoForm.content}
                onChange={(e) => setMemoForm({ ...memoForm, content: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>공개범위</Label>
              <div className="flex gap-2">
                {(['personal', 'department', 'company'] as MemoScope[]).map((scope) => {
                  const ScopeIcon = memoScopeIcons[scope];
                  return (
                    <button
                      key={scope}
                      type="button"
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-medium transition-colors',
                        memoForm.scope === scope
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-black hover:bg-gray-50',
                      )}
                      onClick={() => setMemoForm({ ...memoForm, scope })}
                    >
                      <ScopeIcon className="h-4 w-4" />
                      {memoScopeLabels[scope]}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12px] text-black/50">
                {memoForm.scope === 'personal' && '나만 볼 수 있는 메모입니다.'}
                {memoForm.scope === 'department' && '같은 부서원이 볼 수 있는 메모입니다.'}
                {memoForm.scope === 'company' && '모든 직원이 볼 수 있는 메모입니다.'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>색상</Label>
              <div className="flex gap-2">
                {MEMO_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-transform',
                      memoForm.color === c.value ? 'border-gray-600 scale-110' : 'border-transparent',
                    )}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setMemoForm({ ...memoForm, color: c.value })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMemoDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveMemo}
              disabled={createMemo.isPending || updateMemo.isPending}
            >
              {(createMemo.isPending || updateMemo.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Save className="h-4 w-4 mr-2" />
              {editingMemo ? '수정' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Todo 다이얼로그 */}
      <Dialog open={isTodoDialogOpen} onOpenChange={setIsTodoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-green-600" />
              {editingTodo ? '할일 수정' : '할일 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>제목 *</Label>
              <Input
                placeholder="할일 제목"
                value={todoForm.title}
                onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                placeholder="상세 내용"
                rows={3}
                value={todoForm.content || ''}
                onChange={(e) => setTodoForm({ ...todoForm, content: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>마감일시</Label>
                <Input
                  type="datetime-local"
                  value={todoForm.dueDate || ''}
                  onChange={(e) => setTodoForm({ ...todoForm, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>우선순위</Label>
                <Select
                  value={todoForm.priority}
                  onValueChange={(v) => setTodoForm({ ...todoForm, priority: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">낮음</SelectItem>
                    <SelectItem value="normal">보통</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="urgent">긴급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>일정 범위</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={todoForm.isPersonal}
                    onCheckedChange={(c) => setTodoForm({ ...todoForm, isPersonal: !!c })}
                  />
                  <User className="h-4 w-4" />
                  <span className="text-sm">개인</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={todoForm.isDepartment}
                    onCheckedChange={(c) => setTodoForm({ ...todoForm, isDepartment: !!c })}
                  />
                  <Building className="h-4 w-4" />
                  <span className="text-sm">부서</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={todoForm.isCompany}
                    onCheckedChange={(c) => setTodoForm({ ...todoForm, isCompany: !!c })}
                  />
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">전체</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>색상</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={todoForm.color || '#3B82F6'}
                  onChange={(e) => setTodoForm({ ...todoForm, color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={todoForm.color || '#3B82F6'}
                  onChange={(e) => setTodoForm({ ...todoForm, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            {editingTodo && (
              <Button
                variant="destructive"
                onClick={() => {
                  setIsTodoDialogOpen(false);
                  setDeleteConfirm({ type: 'todo', id: editingTodo.id });
                }}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsTodoDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveTodo}
              disabled={createTodo.isPending || updateTodo.isPending}
            >
              {(createTodo.isPending || updateTodo.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingTodo ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule 다이얼로그 */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              {editingSchedule ? '일정 수정' : '일정 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label>제목 *</Label>
              <Input
                placeholder="일정 제목"
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                placeholder="상세 설명"
                rows={3}
                value={scheduleForm.description || ''}
                onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>장소</Label>
              <Input
                placeholder="장소"
                value={scheduleForm.location || ''}
                onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작 *</Label>
                <Input
                  type="datetime-local"
                  value={scheduleForm.startAt || ''}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, startAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>종료 *</Label>
                <Input
                  type="datetime-local"
                  value={scheduleForm.endAt || ''}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, endAt: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>일정 타입</Label>
              <Select
                value={scheduleForm.scheduleType}
                onValueChange={(v) =>
                  setScheduleForm({ ...scheduleForm, scheduleType: v as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">회의</SelectItem>
                  <SelectItem value="event">이벤트</SelectItem>
                  <SelectItem value="task">작업</SelectItem>
                  <SelectItem value="reminder">리마인더</SelectItem>
                  <SelectItem value="holiday">휴일</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 반복 설정 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                반복 설정
              </Label>
              <div className="border rounded-lg p-3 space-y-3">
                <Select
                  value={recurringConfig.type}
                  onValueChange={(v) => {
                    const newType = v as RecurringType;
                    setRecurringConfig({
                      ...recurringConfig,
                      type: newType,
                      weekdays:
                        newType === 'weekly' && scheduleForm.startAt
                          ? [new Date(scheduleForm.startAt).getDay()]
                          : recurringConfig.weekdays,
                      monthDay:
                        newType === 'monthly' && scheduleForm.startAt
                          ? new Date(scheduleForm.startAt).getDate()
                          : recurringConfig.monthDay,
                    });
                    setShowRecurringDetail(newType !== 'none');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="반복 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">반복 안함</SelectItem>
                    <SelectItem value="daily">매일</SelectItem>
                    <SelectItem value="weekly">매주</SelectItem>
                    <SelectItem value="monthly">매월</SelectItem>
                    <SelectItem value="yearly">매년</SelectItem>
                    <SelectItem value="custom">사용자 정의</SelectItem>
                  </SelectContent>
                </Select>

                {showRecurringDetail && recurringConfig.type !== 'none' && (
                  <div className="space-y-3 pt-2 border-t">
                    {recurringConfig.type === 'custom' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={recurringConfig.interval || 1}
                          onChange={(e) =>
                            setRecurringConfig({
                              ...recurringConfig,
                              interval: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-20"
                        />
                        <Select
                          value={recurringConfig.type === 'custom' ? 'daily' : recurringConfig.type}
                          onValueChange={(v) =>
                            setRecurringConfig({
                              ...recurringConfig,
                              type: v as RecurringType,
                            })
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">일</SelectItem>
                            <SelectItem value="weekly">주</SelectItem>
                            <SelectItem value="monthly">월</SelectItem>
                            <SelectItem value="yearly">년</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-slate-500">마다</span>
                      </div>
                    )}

                    {recurringConfig.type === 'weekly' && (
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">반복 요일</Label>
                        <div className="flex gap-1">
                          {weekdayLabels.map((day, idx) => (
                            <Button
                              key={idx}
                              type="button"
                              variant={
                                recurringConfig.weekdays?.includes(idx) ? 'default' : 'outline'
                              }
                              size="sm"
                              className={cn(
                                'w-9 h-9 p-0',
                                idx === 0 && 'text-red-500',
                                idx === 6 && 'text-blue-500',
                                recurringConfig.weekdays?.includes(idx) &&
                                  idx === 0 &&
                                  'bg-red-500 hover:bg-red-600 text-white',
                                recurringConfig.weekdays?.includes(idx) &&
                                  idx === 6 &&
                                  'bg-blue-500 hover:bg-blue-600 text-white',
                              )}
                              onClick={() => {
                                const weekdays = recurringConfig.weekdays || [];
                                const newWeekdays = weekdays.includes(idx)
                                  ? weekdays.filter((d) => d !== idx)
                                  : [...weekdays, idx];
                                setRecurringConfig({ ...recurringConfig, weekdays: newWeekdays });
                              }}
                            >
                              {day}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {recurringConfig.type === 'monthly' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="monthlyType"
                              checked={!recurringConfig.monthWeek}
                              onChange={() =>
                                setRecurringConfig({
                                  ...recurringConfig,
                                  monthWeek: undefined,
                                  monthWeekday: undefined,
                                })
                              }
                              className="w-4 h-4"
                            />
                            <span className="text-sm">매월</span>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              value={
                                recurringConfig.monthDay ||
                                (scheduleForm.startAt
                                  ? new Date(scheduleForm.startAt).getDate()
                                  : 1)
                              }
                              onChange={(e) =>
                                setRecurringConfig({
                                  ...recurringConfig,
                                  monthDay: parseInt(e.target.value) || 1,
                                  monthWeek: undefined,
                                  monthWeekday: undefined,
                                })
                              }
                              className="w-16"
                              disabled={!!recurringConfig.monthWeek}
                            />
                            <span className="text-sm">일</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="monthlyType"
                              checked={!!recurringConfig.monthWeek}
                              onChange={() => {
                                const startDate = scheduleForm.startAt
                                  ? new Date(scheduleForm.startAt)
                                  : new Date();
                                const weekOfMonth = Math.ceil(startDate.getDate() / 7);
                                setRecurringConfig({
                                  ...recurringConfig,
                                  monthDay: undefined,
                                  monthWeek: weekOfMonth,
                                  monthWeekday: startDate.getDay(),
                                });
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">매월</span>
                            <Select
                              value={String(recurringConfig.monthWeek || 1)}
                              onValueChange={(v) =>
                                setRecurringConfig({
                                  ...recurringConfig,
                                  monthDay: undefined,
                                  monthWeek: parseInt(v),
                                })
                              }
                              disabled={!recurringConfig.monthWeek}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">첫번째</SelectItem>
                                <SelectItem value="2">두번째</SelectItem>
                                <SelectItem value="3">세번째</SelectItem>
                                <SelectItem value="4">네번째</SelectItem>
                                <SelectItem value="-1">마지막</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={String(recurringConfig.monthWeekday ?? 0)}
                              onValueChange={(v) =>
                                setRecurringConfig({
                                  ...recurringConfig,
                                  monthDay: undefined,
                                  monthWeekday: parseInt(v),
                                })
                              }
                              disabled={!recurringConfig.monthWeek}
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {weekdayLabels.map((day, idx) => (
                                  <SelectItem key={idx} value={String(idx)}>
                                    {day}요일
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs text-slate-500">종료 조건</Label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="endType"
                            checked={recurringConfig.endType === 'never'}
                            onChange={() =>
                              setRecurringConfig({ ...recurringConfig, endType: 'never' })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm">종료 없음</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="endType"
                            checked={recurringConfig.endType === 'date'}
                            onChange={() =>
                              setRecurringConfig({ ...recurringConfig, endType: 'date' })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm">종료일</span>
                          <Input
                            type="date"
                            value={recurringConfig.endDate || ''}
                            onChange={(e) =>
                              setRecurringConfig({
                                ...recurringConfig,
                                endType: 'date',
                                endDate: e.target.value,
                              })
                            }
                            className="w-40"
                            disabled={recurringConfig.endType !== 'date'}
                          />
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="endType"
                            checked={recurringConfig.endType === 'count'}
                            onChange={() =>
                              setRecurringConfig({
                                ...recurringConfig,
                                endType: 'count',
                                endCount: 10,
                              })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm">반복 횟수</span>
                          <Input
                            type="number"
                            min={1}
                            max={999}
                            value={recurringConfig.endCount || 10}
                            onChange={(e) =>
                              setRecurringConfig({
                                ...recurringConfig,
                                endType: 'count',
                                endCount: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-20"
                            disabled={recurringConfig.endType !== 'count'}
                          />
                          <span className="text-sm">회</span>
                        </label>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded p-2 text-sm text-slate-500">
                      <span className="font-medium">요약:</span>{' '}
                      {getRecurringSummary(
                        recurringConfig,
                        scheduleForm.startAt ? new Date(scheduleForm.startAt) : new Date(),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>일정 범위</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={scheduleForm.isPersonal}
                    onCheckedChange={(c) =>
                      setScheduleForm({ ...scheduleForm, isPersonal: !!c })
                    }
                  />
                  <User className="h-4 w-4" />
                  <span className="text-sm">개인</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={scheduleForm.isDepartment}
                    onCheckedChange={(c) =>
                      setScheduleForm({ ...scheduleForm, isDepartment: !!c })
                    }
                  />
                  <Building className="h-4 w-4" />
                  <span className="text-sm">부서</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={scheduleForm.isCompany}
                    onCheckedChange={(c) =>
                      setScheduleForm({ ...scheduleForm, isCompany: !!c })
                    }
                  />
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">전체</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>색상</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={scheduleForm.color || '#3B82F6'}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, color: e.target.value })}
                  className="w-12 h-8 p-1"
                />
                <Input
                  value={scheduleForm.color || '#3B82F6'}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            {editingSchedule && (
              <Button
                variant="destructive"
                onClick={() => {
                  setIsScheduleDialogOpen(false);
                  setDeleteConfirm({ type: 'schedule', id: editingSchedule.id });
                }}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={createSchedule.isPending || updateSchedule.isPending}
            >
              {(createSchedule.isPending || updateSchedule.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingSchedule ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {deleteConfirm?.type === 'todo' ? '할일 삭제' : '일정 삭제'}
            </DialogTitle>
            <DialogDescription>정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTodo.isPending || deleteSchedule.isPending}
            >
              {(deleteTodo.isPending || deleteSchedule.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
