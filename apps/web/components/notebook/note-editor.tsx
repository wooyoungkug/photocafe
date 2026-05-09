'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Building,
  Building2,
  ExternalLink,
  Loader2,
  Pin,
  Save,
  StickyNote,
  Trash2,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import {
  useDeleteNote,
  useNoteDetail,
  useUpdateNote,
} from '@/hooks/use-notes';
import { useNotebooks } from '@/hooks/use-notebooks';
import type { Note as Memo, NoteTagDto } from '@/lib/types/note';
import { cn } from '@/lib/utils';
import { NoteTagPicker } from './note-tag-picker';
import { NoteAttachmentList } from './note-attachment-list';

type Scope = 'personal' | 'department' | 'company';
const scopeIcons: Record<Scope, typeof User> = {
  personal: User,
  department: Building,
  company: Building2,
};
const scopeLabels: Record<Scope, string> = {
  personal: '개인',
  department: '부서',
  company: '전체',
};

const COLORS = [
  '#FFFFFF',
  '#FEF9C3',
  '#DCFCE7',
  '#DBEAFE',
  '#FCE7F3',
  '#F3F4F6',
];

function plainTextToHtml(text: string): string {
  if (!text) return '';
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function memoToScope(m: Memo): Scope {
  if (m.isCompany) return 'company';
  if (m.isDepartment) return 'department';
  return 'personal';
}

interface NoteEditorProps {
  noteId: string | null;
  onDeleted?: () => void;
}

export function NoteEditor({ noteId, onDeleted }: NoteEditorProps) {
  const { toast } = useToast();
  const { data: memo, isLoading } = useNoteDetail(noteId || '');
  const update = useUpdateNote();
  const remove = useDeleteNote();
  const { data: notebooks = [] } = useNotebooks();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#FFFFFF');
  const [scope, setScope] = useState<Scope>('personal');
  const [notebookId, setNotebookId] = useState<string>('none');
  const [isPinned, setIsPinned] = useState(false);
  const [tags, setTags] = useState<NoteTagDto[]>([]);

  useEffect(() => {
    if (!memo) return;
    setTitle(memo.title);
    setContent(
      memo.contentFormat === 'html' ? memo.content : plainTextToHtml(memo.content),
    );
    setColor(memo.color || '#FFFFFF');
    setScope(memoToScope(memo));
    setNotebookId(memo.notebookId || 'none');
    setIsPinned(memo.isPinned);
    setTags((memo.tags || []).map((t) => t.tag));
  }, [memo?.id]);

  const handleSave = useCallback(() => {
    if (!noteId) return;
    update.mutate(
      {
        id: noteId,
        title,
        content,
        contentFormat: 'html',
        color,
        notebookId: notebookId === 'none' ? null : notebookId,
        isPersonal: scope === 'personal',
        isDepartment: scope === 'department',
        isCompany: scope === 'company',
        isPinned,
        tagIds: tags.map((t) => t.id),
      } as any,
      {
        onSuccess: () => toast({ title: '저장되었습니다.' }),
        onError: (e: Error) =>
          toast({ title: e.message || '저장 실패', variant: 'destructive' }),
      },
    );
  }, [noteId, title, content, color, notebookId, scope, isPinned, tags, update, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 's') return;
      if (!noteId || update.isPending) return;
      e.preventDefault();
      handleSave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [noteId, update.isPending, handleSave]);

  const handleDelete = () => {
    if (!noteId) return;
    if (!window.confirm('이 노트를 삭제할까요?')) return;
    remove.mutate(noteId, {
      onSuccess: () => {
        toast({ title: '삭제되었습니다.' });
        onDeleted?.();
      },
      onError: (e: Error) =>
        toast({ title: e.message || '삭제 실패', variant: 'destructive' }),
    });
  };

  const flatNotebooks = useMemo(
    () =>
      [...notebooks].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [notebooks],
  );

  if (!noteId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-black/40">
          <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">왼쪽에서 노트를 선택하거나</p>
          <p className="text-[14px]">새 노트를 만들어 주세요.</p>
        </div>
      </div>
    );
  }

  if (isLoading || !memo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-black/40" />
      </div>
    );
  }

  const ScopeIcon = scopeIcons[scope];

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: color }}>
      <div className="px-4 py-2.5 border-b bg-white/70 flex items-center gap-2 flex-wrap shrink-0">
        <Badge variant="outline" className="h-6 text-[11px] bg-white">
          <ScopeIcon className="h-3 w-3 mr-1" />
          {scopeLabels[scope]}
        </Badge>
        <span className="text-[12px] text-black/50 truncate max-w-[200px]">
          {memo.creatorName}
          {memo.creatorDeptName ? ` (${memo.creatorDeptName})` : ''}
        </span>
        <span className="text-[12px] text-black/40">
          {format(new Date(memo.lastEditedAt || memo.updatedAt), 'yyyy.MM.dd HH:mm', {
            locale: ko,
          })}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={isPinned ? '고정 해제' : '고정'}
            onClick={() => setIsPinned((v) => !v)}
          >
            <Pin
              className={cn('h-4 w-4', isPinned && 'text-yellow-600')}
              fill={isPinned ? 'currentColor' : 'none'}
            />
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="새 창에서 편집">
            <Link
              href={`/schedule/memo/${noteId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={remove.isPending}
            title="삭제"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <span className="hidden lg:inline text-[11px] text-black/40 ml-1">Ctrl+S</span>
          <Button onClick={handleSave} disabled={update.isPending} size="sm" className="ml-1">
            {update.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            저장
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-4 gap-3 overflow-y-auto">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="노트 제목"
          className="text-[18px] font-bold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto py-1 placeholder:text-black/30"
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-[12px] text-black/60 shrink-0">노트북</Label>
            <Select value={notebookId} onValueChange={setNotebookId}>
              <SelectTrigger className="h-8 w-44 text-[13px] bg-white/80">
                <SelectValue placeholder="미분류" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">미분류</SelectItem>
                {flatNotebooks.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.icon ? `${n.icon} ` : '📁 '}
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-[12px] text-black/60 shrink-0">범위</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <SelectTrigger className="h-8 w-28 text-[13px] bg-white/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">개인</SelectItem>
                <SelectItem value="department">부서</SelectItem>
                <SelectItem value="company">전체</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-[12px] text-black/60 mr-1">색상</Label>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                className={cn(
                  'w-6 h-6 rounded-full border-2',
                  color === c ? 'border-gray-700 scale-110' : 'border-gray-200',
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Label className="text-[12px] text-black/60 shrink-0 mt-1">태그</Label>
          <div className="flex-1 min-w-0">
            <NoteTagPicker selected={tags} onChange={setTags} />
          </div>
        </div>

        <NoteAttachmentList noteId={noteId} />

        <div className="flex-1 min-h-[60vh]">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="노트 내용을 작성하세요..."
            className="h-full bg-white"
          />
        </div>
      </div>
    </div>
  );
}
