// Todo 타입
export interface Todo {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorDeptId?: string;
  creatorDeptName?: string;
  title: string;
  content?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  startDate?: string;
  dueDate?: string;
  isAllDay: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: string;
  completedBy?: string;
  isPersonal: boolean;
  isDepartment: boolean;
  isCompany: boolean;
  sharedDeptIds: string[];
  reminderAt?: string;
  isReminderSent: boolean;
  isRecurring: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringEnd?: string;
  relatedType?: string;
  relatedId?: string;
  color?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoDto {
  title: string;
  content?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  startDate?: string;
  dueDate?: string;
  isAllDay?: boolean;
  isPersonal?: boolean;
  isDepartment?: boolean;
  isCompany?: boolean;
  sharedDeptIds?: string[];
  reminderAt?: string;
  isRecurring?: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringEnd?: string;
  color?: string;
  tags?: string[];
  relatedType?: string;
  relatedId?: string;
}

export interface UpdateTodoDto extends Partial<CreateTodoDto> {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface QueryTodoDto {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scope?: 'personal' | 'department' | 'company' | 'all';
  startDate?: string;
  endDate?: string;
  search?: string;
}

// 반복 설정 타입 (네이버 캘린더 스타일)
export type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurringConfig {
  type: RecurringType;
  interval?: number;           // 반복 간격 (1 = 매일/매주/매월/매년, 2 = 2일마다/2주마다...)
  weekdays?: number[];         // 매주 반복 시 요일 선택 (0=일, 1=월, ..., 6=토)
  monthDay?: number;           // 매월 반복 시 일자 (1-31)
  monthWeek?: number;          // 매월 반복 시 주차 (1=첫째주, 2=둘째주, -1=마지막주)
  monthWeekday?: number;       // 매월 반복 시 요일 (monthWeek와 함께 사용)
  endType?: 'never' | 'date' | 'count';  // 종료 조건
  endDate?: string;            // 종료일 (endType이 'date'인 경우)
  endCount?: number;           // 반복 횟수 (endType이 'count'인 경우)
}

// Schedule 타입
export interface Schedule {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorDeptId?: string;
  creatorDeptName?: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  isPersonal: boolean;
  isDepartment: boolean;
  isCompany: boolean;
  sharedDeptIds: string[];
  scheduleType: 'meeting' | 'event' | 'task' | 'reminder' | 'holiday';
  reminders?: Array<{ type: string; minutes: number }>;
  isRecurring: boolean;
  recurringRule?: string;
  recurringConfig?: RecurringConfig;  // 반복 설정 (UI용)
  recurringEnd?: string;
  parentId?: string;
  attendees?: Array<{ staffId: string; name: string; status?: string }>;
  color?: string;
  tags: string[];
  relatedType?: string;
  relatedId?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleDto {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
  isPersonal?: boolean;
  isDepartment?: boolean;
  isCompany?: boolean;
  sharedDeptIds?: string[];
  scheduleType?: 'meeting' | 'event' | 'task' | 'reminder' | 'holiday';
  reminders?: Array<{ type: string; minutes: number }>;
  isRecurring?: boolean;
  recurringRule?: string;
  recurringConfig?: RecurringConfig;  // 반복 설정 (UI용)
  recurringEnd?: string;
  attendees?: Array<{ staffId: string; name: string; status?: string }>;
  color?: string;
  tags?: string[];
  relatedType?: string;
  relatedId?: string;
}

export interface UpdateScheduleDto extends Partial<CreateScheduleDto> {
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface QueryScheduleDto {
  startDate: string;
  endDate: string;
  scope?: 'personal' | 'department' | 'company' | 'all';
  scheduleType?: 'meeting' | 'event' | 'task' | 'reminder' | 'holiday';
  search?: string;
}

export type MemoContentFormat = 'text' | 'html';

export interface Notebook {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  parentId?: string | null;
  ownerId: string;
  ownerName?: string;
  scope: 'personal' | 'department' | 'all';
  departmentId?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  children?: Notebook[];
}

export interface NoteTagDto {
  id: string;
  name: string;
  color: string;
  ownerId: string;
  createdAt: string;
}

export interface NoteAttachment {
  id: string;
  memoId: string;
  url: string;
  storageKey?: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
}

// Memo 타입
export interface Memo {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorDeptId?: string;
  creatorDeptName?: string;
  title: string;
  content: string;
  contentFormat?: MemoContentFormat;
  summary?: string | null;
  notebookId?: string | null;
  notebook?: { id: string; name: string; color: string; icon?: string | null } | null;
  tags?: { tag: NoteTagDto }[];
  attachments?: NoteAttachment[];
  color: string;
  isPersonal: boolean;
  isDepartment: boolean;
  isCompany: boolean;
  isPinned: boolean;
  lastEditedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoDto {
  title?: string;
  content?: string;
  contentFormat?: MemoContentFormat;
  notebookId?: string | null;
  color?: string;
  isPersonal?: boolean;
  isDepartment?: boolean;
  isCompany?: boolean;
  tagIds?: string[];
}

export interface UpdateMemoDto extends Partial<CreateMemoDto> {
  isPinned?: boolean;
  summary?: string | null;
}

export interface QueryMemoDto {
  scope?: 'personal' | 'department' | 'company' | 'all';
  search?: string;
  notebookId?: string;
  tagId?: string;
}
