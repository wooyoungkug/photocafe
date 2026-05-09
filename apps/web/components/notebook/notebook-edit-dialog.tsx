'use client';

import { useEffect, useState } from 'react';
import { Building, Building2, Loader2, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateNotebook,
  useUpdateNotebook,
  type NotebookWithCounts,
} from '@/hooks/use-notebooks';
import { cn } from '@/lib/utils';

const NOTEBOOK_COLORS = [
  '#FEF9C3',
  '#DCFCE7',
  '#DBEAFE',
  '#FCE7F3',
  '#F3E8FF',
  '#FFE4E6',
  '#F3F4F6',
];

const NOTEBOOK_ICONS = ['📁', '📓', '📝', '📌', '⭐', '💡', '🎯', '📅'];

const SCOPES = [
  { value: 'personal', label: '개인', icon: User },
  { value: 'department', label: '부서', icon: Building },
  { value: 'all', label: '전체', icon: Building2 },
] as const;

type NotebookScope = 'personal' | 'department' | 'all';

interface NotebookEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string | null;
  notebook?: NotebookWithCounts | null;
  onSaved?: (id: string) => void;
}

export function NotebookEditDialog({
  open,
  onOpenChange,
  parentId,
  notebook,
  onSaved,
}: NotebookEditDialogProps) {
  const { toast } = useToast();
  const create = useCreateNotebook();
  const update = useUpdateNotebook();
  const [name, setName] = useState('');
  const [color, setColor] = useState(NOTEBOOK_COLORS[0]);
  const [scope, setScope] = useState<NotebookScope>('personal');
  const [icon, setIcon] = useState('');

  useEffect(() => {
    if (open) {
      if (notebook) {
        setName(notebook.name);
        setColor(notebook.color || NOTEBOOK_COLORS[0]);
        setScope((notebook.scope as NotebookScope) || 'personal');
        setIcon(notebook.icon || '');
      } else {
        setName('');
        setColor(NOTEBOOK_COLORS[0]);
        setScope('personal');
        setIcon('');
      }
    }
  }, [open, notebook]);

  const isPending = create.isPending || update.isPending;

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: '노트북 이름을 입력하세요.', variant: 'destructive' });
      return;
    }
    const payload = { name: trimmed, color, scope, icon: icon.trim() || undefined };
    if (notebook) {
      update.mutate(
        { id: notebook.id, data: payload },
        {
          onSuccess: (data) => {
            toast({ title: '노트북이 수정되었습니다.' });
            onSaved?.(data.id);
            onOpenChange(false);
          },
          onError: (e: Error) => {
            toast({ title: e.message || '수정에 실패했습니다.', variant: 'destructive' });
          },
        },
      );
    } else {
      create.mutate(
        { ...payload, parentId: parentId || null },
        {
          onSuccess: (data) => {
            toast({ title: '노트북이 생성되었습니다.' });
            onSaved?.(data.id);
            onOpenChange(false);
          },
          onError: (e: Error) => {
            toast({ title: e.message || '생성에 실패했습니다.', variant: 'destructive' });
          },
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{notebook ? '노트북 수정' : '새 노트북'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-[14px] text-black font-bold">이름</Label>
            <Input
              autoFocus
              value={name}
              placeholder="예: 회의록, 프로젝트A, 매뉴얼"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSubmit();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[14px] text-black font-bold">아이콘 (이모지, 선택)</Label>
            <Input
              value={icon}
              placeholder="📁"
              maxLength={4}
              onChange={(e) => setIcon(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {NOTEBOOK_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`아이콘 ${emoji} 선택`}
                  className={cn(
                    'w-9 h-9 rounded-lg border text-[18px] flex items-center justify-center transition-colors',
                    icon === emoji
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50',
                  )}
                  onClick={() => setIcon(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[14px] text-black font-bold">색상</Label>
            <div className="flex flex-wrap gap-2">
              {NOTEBOOK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-transform',
                    color === c ? 'border-gray-700 scale-110' : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[14px] text-black font-bold">공개 범위</Label>
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.value}
                    type="button"
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-medium transition-colors',
                      scope === s.value
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-black hover:bg-gray-50',
                    )}
                    onClick={() => setScope(s.value)}
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-black/50">
              {scope === 'personal' && '나만 볼 수 있는 노트북입니다.'}
              {scope === 'department' && '같은 부서원이 볼 수 있는 노트북입니다.'}
              {scope === 'all' && '모든 직원이 볼 수 있는 노트북입니다.'}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {notebook ? '수정' : '만들기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
