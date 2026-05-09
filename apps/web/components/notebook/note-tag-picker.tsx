'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2, Plus, Tag as TagIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateNoteTag,
  useNoteTags,
  type NoteTagWithCount,
} from '@/hooks/use-note-tags';
import type { NoteTagDto } from '@/lib/types/schedule';
import { cn } from '@/lib/utils';

interface NoteTagPickerProps {
  selected: NoteTagDto[];
  onChange: (tags: NoteTagDto[]) => void;
}

const PRESET_COLORS = [
  '#94A3B8',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#06B6D4',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
];

export function NoteTagPicker({ selected, onChange }: NoteTagPickerProps) {
  const { data: allTags = [], isLoading } = useNoteTags();
  const createTag = useCreateNoteTag();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedIds = useMemo(() => new Set(selected.map((t) => t.id)), [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTags;
    return allTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [allTags, search]);

  const exactMatch = useMemo(
    () => allTags.find((t) => t.name === search.trim()),
    [allTags, search],
  );

  const toggle = (tag: NoteTagWithCount) => {
    if (selectedIds.has(tag.id)) {
      onChange(selected.filter((t) => t.id !== tag.id));
    } else {
      onChange([...selected, tag]);
    }
  };

  const handleCreate = () => {
    const name = search.trim();
    if (!name) return;
    if (exactMatch) {
      toggle(exactMatch);
      setSearch('');
      return;
    }
    const color = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    createTag.mutate(
      { name, color },
      {
        onSuccess: (tag) => {
          onChange([...selected, tag]);
          setSearch('');
        },
        onError: (e: Error) =>
          toast({ title: e.message || '태그 생성 실패', variant: 'destructive' }),
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="h-6 text-[12px] px-2 gap-1 bg-white/80"
          style={{ borderColor: tag.color, color: tag.color }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          {tag.name}
          <button
            type="button"
            onClick={() => onChange(selected.filter((t) => t.id !== tag.id))}
            className="ml-0.5 hover:opacity-70"
            aria-label={`${tag.name} 태그 제거`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[12px] bg-white/80"
          >
            <TagIcon className="h-3 w-3 mr-1" />
            태그 추가
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-2">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="태그 검색 또는 새로 만들기..."
              className="h-8 text-[13px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-black/40" />
                </div>
              ) : filtered.length === 0 && search.trim() ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={createTag.isPending}
                  className="w-full text-left px-2 py-1.5 rounded text-[13px] hover:bg-gray-100 flex items-center gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="truncate">"{search.trim()}" 태그 만들기</span>
                </button>
              ) : filtered.length === 0 ? (
                <p className="text-center text-[12px] text-black/40 py-3">
                  태그가 없습니다.
                </p>
              ) : (
                filtered.map((tag) => {
                  const checked = selectedIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggle(tag)}
                      className={cn(
                        'w-full px-2 py-1.5 rounded text-[13px] flex items-center gap-2 hover:bg-gray-100',
                        checked && 'bg-red-50',
                      )}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 truncate text-left">{tag.name}</span>
                      <span className="text-[11px] text-black/40">
                        {tag._count?.memos ?? 0}
                      </span>
                      {checked && <Check className="h-3.5 w-3.5 text-red-600" />}
                    </button>
                  );
                })
              )}
              {!exactMatch && search.trim() && filtered.length > 0 && (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={createTag.isPending}
                  className="w-full text-left px-2 py-1.5 mt-1 rounded text-[12px] text-red-600 hover:bg-red-50 flex items-center gap-2 border-t pt-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="truncate">"{search.trim()}" 새로 만들기</span>
                </button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
