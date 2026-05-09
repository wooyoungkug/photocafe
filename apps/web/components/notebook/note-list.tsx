'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Building, Building2, Loader2, Pin, Plus, Search, StickyNote, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNotes } from '@/hooks/use-schedule';
import type { Memo } from '@/lib/types/schedule';
import { cn } from '@/lib/utils';

const scopeIcons = { personal: User, department: Building, company: Building2 } as const;

function getScope(m: Memo): 'personal' | 'department' | 'company' {
  if (m.isCompany) return 'company';
  if (m.isDepartment) return 'department';
  return 'personal';
}

function htmlToPlain(html: string, format: string | undefined): string {
  if (!html) return '';
  if (format !== 'html') return html;
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

interface NoteListProps {
  notebookFilter: string; // 'all' | 'uncategorized' | notebook id
  tagFilter?: string | null; // tag id
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  search: string;
  onSearchChange: (v: string) => void;
}

export function NoteList({
  notebookFilter,
  tagFilter,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  search,
  onSearchChange,
}: NoteListProps) {
  const query = useMemo(() => {
    const q: { search?: string; notebookId?: string; tagId?: string } = {};
    if (search.trim()) q.search = search.trim();
    if (notebookFilter !== 'all') q.notebookId = notebookFilter;
    if (tagFilter) q.tagId = tagFilter;
    return q;
  }, [notebookFilter, tagFilter, search]);

  const { data: memos = [], isLoading } = useNotes(query);

  return (
    <section className="w-80 shrink-0 border-r bg-white flex flex-col min-h-0">
      <div className="p-3 border-b flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[14px] text-black font-bold flex items-center gap-1.5 truncate">
            <StickyNote className="h-4 w-4 text-yellow-600 shrink-0" />
            <span className="truncate">
              {notebookFilter === 'all' && '모든 노트'}
              {notebookFilter === 'uncategorized' && '미분류'}
              {notebookFilter !== 'all' &&
                notebookFilter !== 'uncategorized' &&
                '선택한 노트북'}
            </span>
            <span className="text-[12px] text-black/40 font-normal tabular-nums">
              {memos.length}
            </span>
          </h2>
          <Button size="sm" onClick={onCreateNote} className="h-7">
            <Plus className="h-3.5 w-3.5 mr-1" />새 노트
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/40" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="노트 검색..."
            className="pl-8 h-8 text-[13px]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-black/40">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : memos.length === 0 ? (
          <div className="text-center py-12 px-4">
            <StickyNote className="h-8 w-8 mx-auto mb-2 text-black/20" />
            <p className="text-[13px] text-black/50">노트가 없습니다.</p>
            <button
              onClick={onCreateNote}
              className="text-[13px] text-red-600 underline mt-1"
            >
              새 노트 만들기
            </button>
          </div>
        ) : (
          <ul className="divide-y">
            {memos.map((memo) => {
              const ScopeIcon = scopeIcons[getScope(memo)];
              const preview =
                memo.summary?.trim() ||
                htmlToPlain(memo.content, memo.contentFormat).slice(0, 140);
              const updated = memo.lastEditedAt || memo.updatedAt;
              return (
                <li key={memo.id}>
                  <button
                    type="button"
                    onClick={() => onSelectNote(memo.id)}
                    className={cn(
                      'w-full text-left px-3 py-3 flex flex-col gap-1.5 transition-colors',
                      selectedNoteId === memo.id
                        ? 'bg-red-50'
                        : 'hover:bg-gray-50',
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {memo.isPinned && (
                        <Pin className="h-3 w-3 text-yellow-600 shrink-0" fill="currentColor" />
                      )}
                      <span
                        className={cn(
                          'text-[14px] font-bold flex-1 truncate',
                          selectedNoteId === memo.id ? 'text-red-700' : 'text-black',
                        )}
                      >
                        {memo.title || '(제목 없음)'}
                      </span>
                    </div>
                    <p className="text-[12px] text-black/60 line-clamp-2 leading-snug">
                      {preview || '(내용 없음)'}
                    </p>
                    {memo.tags && memo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {memo.tags.slice(0, 3).map(({ tag }) => (
                          <span
                            key={tag.id}
                            className="text-[10px] px-1.5 py-0.5 rounded-full border bg-white"
                            style={{ borderColor: tag.color, color: tag.color }}
                          >
                            #{tag.name}
                          </span>
                        ))}
                        {memo.tags.length > 3 && (
                          <span className="text-[10px] text-black/40 self-center">
                            +{memo.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-black/40">
                      <Badge
                        variant="outline"
                        className="h-4 text-[10px] px-1.5 py-0 bg-white"
                      >
                        <ScopeIcon className="h-2.5 w-2.5 mr-0.5" />
                        {memo.isCompany ? '전체' : memo.isDepartment ? '부서' : '개인'}
                      </Badge>
                      {memo.notebook && (
                        <span className="truncate max-w-[80px]">📁 {memo.notebook.name}</span>
                      )}
                      <span className="ml-auto tabular-nums">
                        {format(new Date(updated), 'MM/dd HH:mm', { locale: ko })}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
