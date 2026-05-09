// 노트장 전용 타입 (메모장 = lib/types/schedule.ts 의 Memo 와 분리)

export type NoteContentFormat = 'text' | 'html';

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
  _count?: { notes?: number; children?: number };
}

export interface CreateNotebookDto {
  name: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
  scope?: 'personal' | 'department' | 'all';
  sortOrder?: number;
}

export interface UpdateNotebookDto extends Partial<CreateNotebookDto> {}

export interface NoteTag {
  id: string;
  name: string;
  color: string;
  ownerId: string;
  createdAt: string;
  _count?: { notes?: number };
}

// 호환을 위해 기존 NoteTagDto 도 동일 alias 로 export
export type NoteTagDto = NoteTag;

export interface CreateNoteTagDto {
  name: string;
  color?: string;
}

export interface UpdateNoteTagDto extends Partial<CreateNoteTagDto> {}

export interface NoteAttachment {
  id: string;
  noteId: string;
  url: string;
  storageKey?: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
}

export interface Note {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorDeptId?: string;
  creatorDeptName?: string;
  title: string;
  content: string;
  contentFormat?: NoteContentFormat;
  summary?: string | null;
  notebookId?: string | null;
  notebook?: { id: string; name: string; color: string; icon?: string | null } | null;
  tags?: { tag: NoteTag }[];
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

export interface CreateNoteDto {
  title?: string;
  content?: string;
  contentFormat?: NoteContentFormat;
  notebookId?: string | null;
  color?: string;
  isPersonal?: boolean;
  isDepartment?: boolean;
  isCompany?: boolean;
  tagIds?: string[];
}

export interface UpdateNoteDto extends Partial<CreateNoteDto> {
  isPinned?: boolean;
  summary?: string | null;
}

export interface QueryNoteDto {
  scope?: 'personal' | 'department' | 'company' | 'all';
  search?: string;
  notebookId?: string;
  tagId?: string;
}
