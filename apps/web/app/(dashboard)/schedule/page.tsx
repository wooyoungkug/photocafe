'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from '@/hooks/use-schedule';
import type { Todo, Schedule, CreateTodoDto, CreateScheduleDto, RecurringConfig, RecurringType } from '@/lib/types/schedule';
import { cn } from '@/lib/utils';
import { Repeat, X } from 'lucide-react';

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

const scopeIcons = {
  personal: User,
  department: Building,
  company: Building2,
};

// 반복 설정 관련 상수
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

// 반복 설정 요약 텍스트 생성
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
        const days = config.weekdays.sort((a, b) => a - b).map(d => weekdayLabels[d]).join(', ');
        summary = interval === 1 ? `매주 ${days}` : `${interval}주마다 ${days}`;
      } else {
        summary = interval === 1 ? '매주' : `${interval}주마다`;
      }
      break;
    case 'monthly':
      if (config.monthWeek && config.monthWeekday !== undefined) {
        const weekNum = config.monthWeek === -1 ? '마지막' : `${config.monthWeek}번째`;
        summary = interval === 1
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

  // 종료 조건
  if (config.endType === 'date' && config.endDate) {
    summary += ` (${config.endDate}까지)`;
  } else if (config.endType === 'count' && config.endCount) {
    summary += ` (${config.endCount}회)`;
  }

  return summary;
};

export default function SchedulePage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'personal' | 'department' | 'company'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 다이얼로그 상태
  const [isTodoDialogOpen, setIsTodoDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'todo' | 'schedule'; id: string } | null>(null);

  // 폼 상태
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

  // 반복 설정 상태
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>(getDefaultRecurringConfig());
  const [showRecurringDetail, setShowRecurringDetail] = useState(false);

  // 데이터 쿼리
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

  // Mutations
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const completeTodo = useCompleteTodo();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  // 캘린더 날짜 계산
  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // 검색어로 필터링된 데이터
  const filteredTodos = useMemo(() => {
    if (!todos) return [];
    if (!searchTerm.trim()) return todos;
    const term = searchTerm.toLowerCase();
    return todos.filter(todo =>
      todo.title.toLowerCase().includes(term) ||
      todo.content?.toLowerCase().includes(term) ||
      todo.creatorName?.toLowerCase().includes(term)
    );
  }, [todos, searchTerm]);

  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    if (!searchTerm.trim()) return schedules;
    const term = searchTerm.toLowerCase();
    return schedules.filter(schedule =>
      schedule.title.toLowerCase().includes(term) ||
      schedule.description?.toLowerCase().includes(term) ||
      schedule.location?.toLowerCase().includes(term) ||
      schedule.creatorName?.toLowerCase().includes(term)
    );
  }, [schedules, searchTerm]);

  // 날짜별 일정/할일 그룹핑
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    const dayTodos = filteredTodos?.filter(todo => {
      // 마감일 기준
      if (todo.dueDate) {
        return format(parseISO(todo.dueDate), 'yyyy-MM-dd') === dateStr;
      }
      // 시작일 기준
      if (todo.startDate) {
        return format(parseISO(todo.startDate), 'yyyy-MM-dd') === dateStr;
      }
      // 마감일/시작일 없으면 생성일 기준으로 표시
      if (todo.createdAt) {
        return format(parseISO(todo.createdAt), 'yyyy-MM-dd') === dateStr;
      }
      return false;
    }) || [];

    const daySchedules = filteredSchedules?.filter(schedule => {
      const scheduleStart = format(parseISO(schedule.startAt), 'yyyy-MM-dd');
      const scheduleEnd = format(parseISO(schedule.endAt), 'yyyy-MM-dd');
      return dateStr >= scheduleStart && dateStr <= scheduleEnd;
    }) || [];

    return { todos: dayTodos, schedules: daySchedules };
  };

  // Todo 다이얼로그 열기
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
      setTodoForm({
        title: '',
        content: '',
        priority: 'normal',
        startDate: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : undefined,
        dueDate: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'23:59") : undefined,
        isPersonal: true,
        isDepartment: false,
        isCompany: false,
        color: '#3B82F6',
      });
    }
    setIsTodoDialogOpen(true);
  };

  // Schedule 다이얼로그 열기
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
      // 기존 반복 설정 복원
      if (schedule.recurringConfig) {
        setRecurringConfig(schedule.recurringConfig);
      } else if (schedule.isRecurring) {
        // 기존 RRULE 기반 설정이 있는 경우 (기본값으로 설정)
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

  // Todo 저장
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

  // Schedule 저장
  const handleSaveSchedule = async () => {
    if (!scheduleForm.title.trim()) {
      toast({ title: '제목을 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!scheduleForm.startAt || !scheduleForm.endAt) {
      toast({ title: '시작/종료 시간을 입력해주세요.', variant: 'destructive' });
      return;
    }

    // 반복 설정 포함 + 날짜를 ISO 형식으로 변환
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
<<<<<<< Updated upstream
=======
      console.error('Schedule 저장 에러:', error);
>>>>>>> Stashed changes
      const message = error instanceof Error ? error.message : '저장에 실패했습니다.';
      toast({ title: message, variant: 'destructive' });
    }
  };

  // 삭제 처리
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

  // Todo 완료 처리
  const handleCompleteTodo = async (todoId: string) => {
    try {
      await completeTodo.mutateAsync(todoId);
      toast({ title: '할일이 완료되었습니다.' });
    } catch {
      toast({ title: '완료 처리에 실패했습니다.', variant: 'destructive' });
    }
  };

  // 범위 아이콘 렌더링
  const renderScopeIcon = (item: Todo | Schedule) => {
    if (item.isCompany) return <Building2 className="h-3 w-3 text-purple-500" />;
    if (item.isDepartment) return <Building className="h-3 w-3 text-blue-500" />;
    return <User className="h-3 w-3 text-gray-500" />;
  };

  const isLoading = todosLoading || schedulesLoading;

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            일정 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            개인/부서/전체 일정과 할일을 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="일정/할일 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="personal">개인</SelectItem>
              <SelectItem value="department">부서</SelectItem>
              <SelectItem value="company">회사</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => openTodoDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            할일 추가
          </Button>
          <Button variant="outline" onClick={() => openScheduleDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            일정 추가
          </Button>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            캘린더
          </TabsTrigger>
          <TabsTrigger value="todos">
            <CheckSquare className="h-4 w-4 mr-2" />
            할일 목록
          </TabsTrigger>
        </TabsList>

        {/* 캘린더 탭 */}
        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle className="text-lg">
                    {format(currentDate, 'yyyy년 M월', { locale: ko })}
                  </CardTitle>
                  {/* 범례 */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-blue-100 border-l-2 border-blue-500"></div>
                      <span className="text-muted-foreground">일정</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-emerald-100 border-l-2 border-emerald-500"></div>
                      <span className="text-muted-foreground">할일</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
                    오늘
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
                  {/* 요일 헤더 */}
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                    <div
                      key={day}
                      className={cn(
                        'bg-slate-50 p-2 text-center text-sm font-medium',
                        i === 0 && 'text-red-500',
                        i === 6 && 'text-blue-500'
                      )}
                    >
                      {day}
                    </div>
                  ))}
                  {/* 날짜 셀 */}
                  {calendarDays.map((day) => {
                    const { todos: dayTodos, schedules: daySchedules } = getEventsForDate(day);
                    const dayOfWeek = day.getDay();

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          'min-h-24 bg-white p-1 cursor-pointer hover:bg-slate-50 transition-colors',
                          !isSameMonth(day, currentDate) && 'bg-slate-50/50 opacity-50',
                          isToday(day) && 'bg-blue-50',
                          selectedDate && isSameDay(day, selectedDate) && 'ring-2 ring-blue-500 ring-inset'
                        )}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className={cn(
                          'text-sm font-medium mb-1',
                          dayOfWeek === 0 && 'text-red-500',
                          dayOfWeek === 6 && 'text-blue-500',
                          isToday(day) && 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
                        )}>
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
                                todo.status === 'completed' && 'line-through opacity-50 bg-gray-100 text-gray-500 border-gray-400'
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
                          {(daySchedules.length + dayTodos.length) > 4 && (
                            <div className="text-[10px] text-muted-foreground text-center">
                              +{daySchedules.length + dayTodos.length - 4}개 더
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
        </TabsContent>

        {/* 할일 목록 탭 */}
        <TabsContent value="todos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-green-600" />
                할일 목록
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTodos?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  {searchTerm ? '검색 결과가 없습니다.' : '등록된 할일이 없습니다.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTodos?.map((todo) => (
                    <div
                      key={todo.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors',
                        todo.status === 'completed' && 'opacity-60 bg-slate-50'
                      )}
                    >
                      <Checkbox
                        checked={todo.status === 'completed'}
                        onCheckedChange={() => todo.status !== 'completed' && handleCompleteTodo(todo.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('font-medium', todo.status === 'completed' && 'line-through')}>
                            {todo.title}
                          </span>
                          {renderScopeIcon(todo)}
                          <Badge variant="outline" className={priorityColors[todo.priority]}>
                            {priorityLabels[todo.priority]}
                          </Badge>
                          <Badge variant="outline" className={statusColors[todo.status]}>
                            {statusLabels[todo.status]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>작성: {todo.creatorName}</span>
                          {todo.dueDate && (
                            <span>마감: {format(parseISO(todo.dueDate), 'yyyy-MM-dd HH:mm')}</span>
                          )}
                          {todo.completedAt && (
                            <span className="text-green-600">완료: {format(parseISO(todo.completedAt), 'yyyy-MM-dd HH:mm')} ({todo.completedBy})</span>
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
                          {todo.status !== 'completed' && (
                            <DropdownMenuItem onClick={() => handleCompleteTodo(todo.id)}>
                              <Check className="h-4 w-4 mr-2" />
                              완료
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteConfirm({ type: 'todo', id: todo.id })}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
            <Button onClick={handleSaveTodo} disabled={createTodo.isPending || updateTodo.isPending}>
              {(createTodo.isPending || updateTodo.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
                onValueChange={(v) => setScheduleForm({ ...scheduleForm, scheduleType: v as any })}
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

            {/* 반복 설정 (네이버 캘린더 스타일) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                반복 설정
              </Label>
              <div className="border rounded-lg p-3 space-y-3">
                {/* 반복 타입 선택 */}
                <Select
                  value={recurringConfig.type}
                  onValueChange={(v) => {
                    const newType = v as RecurringType;
                    setRecurringConfig({
                      ...recurringConfig,
                      type: newType,
                      // 매주 선택 시 현재 요일을 기본 선택
                      weekdays: newType === 'weekly' && scheduleForm.startAt
                        ? [new Date(scheduleForm.startAt).getDay()]
                        : recurringConfig.weekdays,
                      // 매월 선택 시 현재 일자를 기본값으로
                      monthDay: newType === 'monthly' && scheduleForm.startAt
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

                {/* 반복 상세 설정 */}
                {showRecurringDetail && recurringConfig.type !== 'none' && (
                  <div className="space-y-3 pt-2 border-t">
                    {/* 반복 간격 */}
                    {recurringConfig.type === 'custom' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={recurringConfig.interval || 1}
                          onChange={(e) => setRecurringConfig({
                            ...recurringConfig,
                            interval: parseInt(e.target.value) || 1,
                          })}
                          className="w-20"
                        />
                        <Select
                          value={recurringConfig.type === 'custom' ? 'daily' : recurringConfig.type}
                          onValueChange={(v) => setRecurringConfig({
                            ...recurringConfig,
                            type: v as RecurringType,
                          })}
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
                        <span className="text-sm text-muted-foreground">마다</span>
                      </div>
                    )}

                    {/* 매주 - 요일 선택 */}
                    {recurringConfig.type === 'weekly' && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">반복 요일</Label>
                        <div className="flex gap-1">
                          {weekdayLabels.map((day, idx) => (
                            <Button
                              key={idx}
                              type="button"
                              variant={recurringConfig.weekdays?.includes(idx) ? 'default' : 'outline'}
                              size="sm"
                              className={cn(
                                'w-9 h-9 p-0',
                                idx === 0 && 'text-red-500',
                                idx === 6 && 'text-blue-500',
                                recurringConfig.weekdays?.includes(idx) && idx === 0 && 'bg-red-500 hover:bg-red-600 text-white',
                                recurringConfig.weekdays?.includes(idx) && idx === 6 && 'bg-blue-500 hover:bg-blue-600 text-white',
                              )}
                              onClick={() => {
                                const weekdays = recurringConfig.weekdays || [];
                                const newWeekdays = weekdays.includes(idx)
                                  ? weekdays.filter(d => d !== idx)
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

                    {/* 매월 - 일자 또는 주차+요일 선택 */}
                    {recurringConfig.type === 'monthly' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="monthlyType"
                              checked={!recurringConfig.monthWeek}
                              onChange={() => setRecurringConfig({
                                ...recurringConfig,
                                monthWeek: undefined,
                                monthWeekday: undefined,
                              })}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">매월</span>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              value={recurringConfig.monthDay || (scheduleForm.startAt ? new Date(scheduleForm.startAt).getDate() : 1)}
                              onChange={(e) => setRecurringConfig({
                                ...recurringConfig,
                                monthDay: parseInt(e.target.value) || 1,
                                monthWeek: undefined,
                                monthWeekday: undefined,
                              })}
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
                                const startDate = scheduleForm.startAt ? new Date(scheduleForm.startAt) : new Date();
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
                              onValueChange={(v) => setRecurringConfig({
                                ...recurringConfig,
                                monthDay: undefined,
                                monthWeek: parseInt(v),
                              })}
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
                              onValueChange={(v) => setRecurringConfig({
                                ...recurringConfig,
                                monthDay: undefined,
                                monthWeekday: parseInt(v),
                              })}
                              disabled={!recurringConfig.monthWeek}
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {weekdayLabels.map((day, idx) => (
                                  <SelectItem key={idx} value={String(idx)}>{day}요일</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* 종료 조건 */}
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs text-muted-foreground">종료 조건</Label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="endType"
                            checked={recurringConfig.endType === 'never'}
                            onChange={() => setRecurringConfig({ ...recurringConfig, endType: 'never' })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">종료 없음</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="endType"
                            checked={recurringConfig.endType === 'date'}
                            onChange={() => setRecurringConfig({ ...recurringConfig, endType: 'date' })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">종료일</span>
                          <Input
                            type="date"
                            value={recurringConfig.endDate || ''}
                            onChange={(e) => setRecurringConfig({
                              ...recurringConfig,
                              endType: 'date',
                              endDate: e.target.value,
                            })}
                            className="w-40"
                            disabled={recurringConfig.endType !== 'date'}
                          />
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="endType"
                            checked={recurringConfig.endType === 'count'}
                            onChange={() => setRecurringConfig({ ...recurringConfig, endType: 'count', endCount: 10 })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">반복 횟수</span>
                          <Input
                            type="number"
                            min={1}
                            max={999}
                            value={recurringConfig.endCount || 10}
                            onChange={(e) => setRecurringConfig({
                              ...recurringConfig,
                              endType: 'count',
                              endCount: parseInt(e.target.value) || 1,
                            })}
                            className="w-20"
                            disabled={recurringConfig.endType !== 'count'}
                          />
                          <span className="text-sm">회</span>
                        </label>
                      </div>
                    </div>

                    {/* 반복 요약 */}
                    <div className="bg-slate-50 rounded p-2 text-sm text-muted-foreground">
                      <span className="font-medium">요약:</span>{' '}
                      {getRecurringSummary(recurringConfig, scheduleForm.startAt ? new Date(scheduleForm.startAt) : new Date())}
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
                    onCheckedChange={(c) => setScheduleForm({ ...scheduleForm, isPersonal: !!c })}
                  />
                  <User className="h-4 w-4" />
                  <span className="text-sm">개인</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={scheduleForm.isDepartment}
                    onCheckedChange={(c) => setScheduleForm({ ...scheduleForm, isDepartment: !!c })}
                  />
                  <Building className="h-4 w-4" />
                  <span className="text-sm">부서</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={scheduleForm.isCompany}
                    onCheckedChange={(c) => setScheduleForm({ ...scheduleForm, isCompany: !!c })}
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
            <Button onClick={handleSaveSchedule} disabled={createSchedule.isPending || updateSchedule.isPending}>
              {(createSchedule.isPending || updateSchedule.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
            <DialogDescription>
              정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
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
              {(deleteTodo.isPending || deleteSchedule.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
