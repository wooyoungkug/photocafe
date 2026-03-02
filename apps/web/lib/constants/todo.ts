// 우선순위
export const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
} as const;

export const PRIORITY_LABELS = {
  low: '낮음',
  normal: '보통',
  high: '높음',
  urgent: '긴급',
} as const;

// 상태
export const STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
} as const;

export const STATUS_LABELS = {
  pending: '대기',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
} as const;

// 정렬 옵션
export const TODO_SORT_OPTIONS = [
  { value: 'recent', label: '최근등록순' },
  { value: 'dueDate', label: '마감일순' },
  { value: 'priority', label: '우선순위순' },
  { value: 'title', label: '제목순' },
] as const;

export type TodoSortBy = (typeof TODO_SORT_OPTIONS)[number]['value'];
export type TodoCategory = 'all' | 'today' | 'week' | 'important' | 'completed';
