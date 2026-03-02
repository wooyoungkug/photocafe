'use client';

import { useState, useMemo, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, isToday as checkIsToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Search,
  Star,
  Edit,
  Trash2,
  MoreHorizontal,
  Loader2,
  CheckCircle2,
  Circle,
  ListTodo,
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCheck,
  RefreshCw,
  X,
} from 'lucide-react';
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
} from '@/hooks/use-schedule';
import type { Todo, CreateTodoDto } from '@/lib/types/schedule';
import { cn } from '@/lib/utils';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TODO_SORT_OPTIONS,
  type TodoSortBy,
  type TodoCategory,
} from '@/lib/constants/todo';

// ==================== 카테고리 설정 ====================

const CATEGORIES: { value: TodoCategory; label: string; icon: typeof ListTodo }[] = [
  { value: 'all', label: '전체 할일', icon: ListTodo },
  { value: 'today', label: '오늘 할일', icon: CalendarDays },
  { value: 'week', label: '이번 주 할일', icon: Clock },
  { value: 'important', label: '중요 할일', icon: AlertTriangle },
  { value: 'completed', label: '완료된 할일', icon: CheckCheck },
];

const PRIORITY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

// ==================== TodoView 컴포넌트 ====================

export function TodoView() {
  const { toast } = useToast();

  // 상태
  const [category, setCategory] = useState<TodoCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<TodoSortBy>('recent');
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddImportant, setQuickAddImportant] = useState(false);

  // 다이얼로그 상태
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [todoForm, setTodoForm] = useState<CreateTodoDto>({
    title: '',
    content: '',
    priority: 'normal',
    isPersonal: true,
  });

  // 데이터
  const { data: allTodos, isLoading, refetch } = useTodos({});
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const completeTodo = useCompleteTodo();

  // ==================== 카운트 계산 ====================

  const categoryCounts = useMemo(() => {
    if (!allTodos) return { all: 0, today: 0, week: 0, important: 0, completed: 0 };

    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const ws = startOfWeek(now, { locale: ko });
    const we = endOfWeek(now, { locale: ko });

    const pending = allTodos.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');

    return {
      all: pending.length,
      today: pending.filter((t) => {
        if (!t.dueDate) return false;
        return t.dueDate.substring(0, 10) === todayStr;
      }).length,
      week: pending.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= ws && d <= we;
      }).length,
      important: pending.filter((t) => t.priority === 'high' || t.priority === 'urgent').length,
      completed: allTodos.filter((t) => t.status === 'completed').length,
    };
  }, [allTodos]);

  // ==================== 필터 + 정렬 ====================

  const filteredTodos = useMemo(() => {
    if (!allTodos) return [];

    let filtered = [...allTodos];
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const ws = startOfWeek(now, { locale: ko });
    const we = endOfWeek(now, { locale: ko });

    // 카테고리 필터
    switch (category) {
      case 'today':
        filtered = filtered.filter((t) => t.dueDate && t.dueDate.substring(0, 10) === todayStr);
        break;
      case 'week':
        filtered = filtered.filter((t) => {
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate);
          return d >= ws && d <= we;
        });
        break;
      case 'important':
        filtered = filtered.filter((t) => t.priority === 'high' || t.priority === 'urgent');
        break;
      case 'completed':
        filtered = filtered.filter((t) => t.status === 'completed');
        break;
    }

    // 완료 포함 여부
    if (!includeCompleted && category !== 'completed') {
      filtered = filtered.filter((t) => t.status !== 'completed');
    }

    // 검색
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(term) || t.content?.toLowerCase().includes(term)
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate': {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        case 'priority':
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        case 'title':
          return a.title.localeCompare(b.title, 'ko');
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [allTodos, category, includeCompleted, searchTerm, sortBy]);

  // ==================== 핸들러 ====================

  const handleQuickAdd = useCallback(async () => {
    if (!quickAddTitle.trim()) return;

    try {
      await createTodo.mutateAsync({
        title: quickAddTitle.trim(),
        priority: quickAddImportant ? 'high' : 'normal',
        isPersonal: true,
        dueDate: new Date().toISOString(),
      });
      setQuickAddTitle('');
      setQuickAddImportant(false);
      toast({ title: '할일이 등록되었습니다.' });
    } catch {
      toast({ title: '등록에 실패했습니다.', variant: 'destructive' });
    }
  }, [quickAddTitle, quickAddImportant, createTodo, toast]);

  const openEditDialog = useCallback((todo?: Todo) => {
    if (todo) {
      setEditingTodo(todo);
      setTodoForm({
        title: todo.title,
        content: todo.content || '',
        priority: todo.priority,
        dueDate: todo.dueDate,
        isPersonal: true,
        color: todo.color || '#3B82F6',
      });
    } else {
      setEditingTodo(null);
      setTodoForm({
        title: quickAddTitle.trim(),
        content: '',
        priority: quickAddImportant ? 'high' : 'normal',
        dueDate: new Date().toISOString(),
        isPersonal: true,
        color: '#3B82F6',
      });
    }
    setIsDialogOpen(true);
  }, [quickAddTitle, quickAddImportant]);

  const handleSaveTodo = useCallback(async () => {
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
      setIsDialogOpen(false);
      setQuickAddTitle('');
      setQuickAddImportant(false);
    } catch {
      toast({ title: '저장에 실패했습니다.', variant: 'destructive' });
    }
  }, [todoForm, editingTodo, createTodo, updateTodo, toast]);

  const handleComplete = useCallback(
    async (todoId: string) => {
      try {
        await completeTodo.mutateAsync(todoId);
        toast({ title: '할일이 완료되었습니다.' });
      } catch {
        toast({ title: '완료 처리에 실패했습니다.', variant: 'destructive' });
      }
    },
    [completeTodo, toast]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteTodo.mutateAsync(deleteConfirmId);
      toast({ title: '할일이 삭제되었습니다.' });
      setDeleteConfirmId(null);
      setIsDialogOpen(false);
    } catch {
      toast({ title: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  }, [deleteConfirmId, deleteTodo, toast]);

  // ==================== 렌더링 ====================

  return (
    <div className="space-y-3">
      {/* 모바일: 카테고리 가로 스크롤 필 */}
      <div className="flex lg:hidden gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setCategory(cat.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap border transition-colors',
              category === cat.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            <cat.icon className="h-3 w-3" />
            {cat.label}
            <span className="font-bold">{categoryCounts[cat.value]}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        {/* ==================== 좌측 사이드바 (lg 이상) ==================== */}
        <Card className="hidden lg:block h-fit">
          <CardContent className="p-3 space-y-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-gray-400')} />
                    {cat.label}
                  </div>
                  <span
                    className={cn(
                      'text-[12px] font-bold',
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    )}
                  >
                    {categoryCounts[cat.value]}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* ==================== 메인 영역 ==================== */}
        <div className="space-y-3">
          {/* 헤더: 카운트 + 새로고침 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[14px] text-black font-bold">
              {CATEGORIES.find((c) => c.value === category)?.label}
              <span className="text-gray-400 font-normal">|</span>
              <span className="text-blue-600">{filteredTodos.length}</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className={cn('h-3.5 w-3.5 text-gray-400', isLoading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* 검색 + 필터 + 정렬 */}
          <Card>
            <CardContent className="py-2.5 px-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="할 일 검색"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-[12px]"
                  />
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as TodoSortBy)}>
                  <SelectTrigger className="h-8 w-[120px] text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TODO_SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={includeCompleted}
                    onCheckedChange={(v) => setIncludeCompleted(!!v)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-[12px] text-gray-600 whitespace-nowrap">완료된 할 일 포함</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* 빠른 추가 인풋 */}
          <Card>
            <CardContent className="py-2 px-3">
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                <Input
                  placeholder="내가 해야 할 일을 기록해보세요."
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      handleQuickAdd();
                    }
                  }}
                  className="border-0 shadow-none focus-visible:ring-0 h-8 text-[13px] px-0"
                />
                <button
                  type="button"
                  onClick={() => setQuickAddImportant(!quickAddImportant)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  title="중요 표시"
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      quickAddImportant ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => openEditDialog()}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  title="상세 등록"
                >
                  <Edit className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 할일 리스트 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredTodos.length === 0 ? (
            /* 빈 상태 */
            <div className="text-center py-16">
              <CheckCircle2 className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <p className="text-[14px] text-black font-bold mb-1">기록한 할 일이 없습니다.</p>
              <p className="text-[13px] text-gray-400 mb-4">
                할 일을 등록해서 편리하게 관리해보세요.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog()}
                className="text-[13px]"
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                오늘 할 일을 추가해볼까요?
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onComplete={handleComplete}
                  onEdit={openEditDialog}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================== 등록/수정 다이얼로그 ==================== */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">
              {editingTodo ? '할일 수정' : '할일 등록'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[13px]">제목</Label>
              <Input
                value={todoForm.title}
                onChange={(e) => setTodoForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="할일 제목"
                className="text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">내용</Label>
              <Textarea
                value={todoForm.content || ''}
                onChange={(e) => setTodoForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="상세 내용 (선택사항)"
                rows={3}
                className="text-[13px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">우선순위</Label>
                <Select
                  value={todoForm.priority || 'normal'}
                  onValueChange={(v) =>
                    setTodoForm((f) => ({
                      ...f,
                      priority: v as 'low' | 'normal' | 'high' | 'urgent',
                    }))
                  }
                >
                  <SelectTrigger className="text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-[13px]">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">마감일</Label>
                <Input
                  type="date"
                  value={todoForm.dueDate ? todoForm.dueDate.substring(0, 10) : ''}
                  onChange={(e) =>
                    setTodoForm((f) => ({
                      ...f,
                      dueDate: e.target.value ? `${e.target.value}T23:59:00` : undefined,
                    }))
                  }
                  className="text-[13px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            {editingTodo && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmId(editingTodo.id)}
                className="mr-auto text-[13px]"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                삭제
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="text-[13px]"
            >
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTodo}
              disabled={createTodo.isPending || updateTodo.isPending}
              className="text-[13px]"
            >
              {(createTodo.isPending || updateTodo.isPending) && (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              )}
              {editingTodo ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== 삭제 확인 다이얼로그 ==================== */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">할일 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-gray-600 py-2">이 할일을 삭제하시겠습니까?</p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              className="text-[13px]"
            >
              취소
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteTodo.isPending}
              className="text-[13px]"
            >
              {deleteTodo.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 할일 아이템 ====================

function TodoItem({
  todo,
  onComplete,
  onEdit,
  onDelete,
}: {
  todo: Todo;
  onComplete: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}) {
  const isCompleted = todo.status === 'completed';
  const isOverdue =
    !isCompleted && todo.dueDate && new Date(todo.dueDate) < new Date();

  return (
    <Card className={cn('transition-colors', isCompleted && 'opacity-60')}>
      <CardContent className="py-2.5 px-3">
        <div className="flex items-start gap-2.5">
          {/* 완료 체크 */}
          <button
            type="button"
            onClick={() => !isCompleted && onComplete(todo.id)}
            className="mt-0.5 flex-shrink-0"
            disabled={isCompleted}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
            ) : (
              <Circle className="h-4.5 w-4.5 text-gray-300 hover:text-blue-400 transition-colors" />
            )}
          </button>

          {/* 내용 */}
          <button
            type="button"
            onClick={() => onEdit(todo)}
            className="flex-1 text-left min-w-0"
          >
            <p
              className={cn(
                'text-[14px] text-black truncate',
                isCompleted && 'line-through text-gray-400'
              )}
            >
              {todo.title}
            </p>
            {todo.content && (
              <p className="text-[12px] text-gray-400 truncate mt-0.5">{todo.content}</p>
            )}
          </button>

          {/* 우선순위 + 마감일 + 메뉴 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {todo.priority !== 'normal' && (
              <Badge
                variant="secondary"
                className={cn('text-[10px] px-1.5 py-0', PRIORITY_COLORS[todo.priority])}
              >
                {PRIORITY_LABELS[todo.priority]}
              </Badge>
            )}
            {todo.dueDate && (
              <span
                className={cn(
                  'text-[11px]',
                  isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'
                )}
              >
                {format(new Date(todo.dueDate), 'MM.dd')}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="p-1 rounded hover:bg-gray-100">
                  <MoreHorizontal className="h-3.5 w-3.5 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(todo)} className="text-[13px]">
                  <Edit className="h-3.5 w-3.5 mr-2" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(todo.id)}
                  className="text-[13px] text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
