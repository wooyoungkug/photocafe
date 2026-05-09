'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ArrowLeft, Building, Building2, Loader2, Save, StickyNote, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { useMemoDetail, useUpdateMemo } from '@/hooks/use-schedule';
import type { Memo } from '@/lib/types/schedule';
import { cn } from '@/lib/utils';

function plainTextToHtml(text: string): string {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

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

function memoToScope(memo: Memo): MemoScope {
  if (memo.isCompany) return 'company';
  if (memo.isDepartment) return 'department';
  return 'personal';
}

export default function MemoEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { data: memo, isLoading, isError, error } = useMemoDetail(id);
  const updateMemo = useUpdateMemo();

  // 노트장 서비스 가드 (스튜디오는 enableNote=true 일 때만)
  useEffect(() => {
    if (!user) return;
    const isHostStaff = user.role === 'admin' || user.role === 'staff';
    if (!isHostStaff && !user.enableNote) {
      toast({
        title: '노트장이 비활성화되어 있습니다.',
        variant: 'destructive',
      });
      router.replace('/schedule');
    }
  }, [user, router, toast]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#FEF9C3');
  const [scope, setScope] = useState<MemoScope>('personal');

  useEffect(() => {
    if (!memo) return;
    setTitle(memo.title);
    const initial =
      (memo as any).contentFormat === 'html'
        ? memo.content
        : plainTextToHtml(memo.content);
    setContent(initial);
    setColor(memo.color);
    setScope(memoToScope(memo));
  }, [memo]);

  const handleSave = useCallback(() => {
    if (!id) return;
    const stripped = content.replace(/<[^>]*>/g, '').trim();
    if (!title.trim() && !stripped) {
      toast({ title: '제목 또는 내용을 입력하세요.', variant: 'destructive' });
      return;
    }
    const scopeData = {
      isPersonal: scope === 'personal',
      isDepartment: scope === 'department',
      isCompany: scope === 'company',
    };
    updateMemo.mutate(
      {
        id,
        data: {
          title,
          content,
          contentFormat: 'html',
          color,
          ...scopeData,
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: '메모가 저장되었습니다.' });
        },
        onError: (e: Error) => {
          toast({ title: e.message || '저장에 실패했습니다.', variant: 'destructive' });
        },
      },
    );
  }, [id, title, content, color, scope, updateMemo, toast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 's') return;
      e.preventDefault();
      if (!memo || updateMemo.isPending) return;
      handleSave();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [memo, updateMemo.isPending, handleSave]);

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-[14px] text-black font-normal">잘못된 메모 주소입니다.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/schedule?tab=memos">메모장으로</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="text-[14px] text-black font-normal">메모를 불러오는 중...</p>
      </div>
    );
  }

  if (isError || !memo) {
    return (
      <div className="p-6 max-w-lg">
        <p className="text-[14px] text-black font-normal">
          {error instanceof Error ? error.message : '메모를 불러올 수 없습니다.'}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/schedule?tab=memos">메모장으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  const ScopeIcon = memoScopeIcons[scope];

  return (
    <div
      className="flex flex-col min-h-0 flex-1 p-4 md:p-6 gap-4"
      style={{ backgroundColor: color }}
    >
      <div className="flex flex-wrap items-center gap-2 justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="outline" size="sm" asChild className="shrink-0 bg-white/80">
            <Link href="/schedule?tab=memos">
              <ArrowLeft className="h-4 w-4 mr-1" />
              메모장
            </Link>
          </Button>
          <h1 className="text-[18px] text-black font-bold flex items-center gap-2 min-w-0">
            <StickyNote className="h-5 w-5 text-yellow-600 shrink-0" />
            <span className="truncate">메모 편집</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[12px] text-black/45 hidden sm:inline">Ctrl+S 저장</span>
          <Button onClick={handleSave} disabled={updateMemo.isPending}>
            {updateMemo.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            저장
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white/90 shadow-sm p-4 md:p-6 flex flex-col gap-4 flex-1 min-h-0">
        <div className="flex flex-wrap items-center gap-2 text-[14px] text-black font-normal">
          <Badge variant="outline" className="text-[11px]">
            <ScopeIcon className="h-3 w-3 mr-1" />
            {memoScopeLabels[scope]}
          </Badge>
          <span className="text-black/50">
            {memo.creatorName}
            {memo.creatorDeptName ? ` (${memo.creatorDeptName})` : ''}
          </span>
          <span className="text-black/40">
            수정 {format(new Date(memo.updatedAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
          </span>
        </div>

        <div className="space-y-2 shrink-0">
          <Label className="text-[14px] text-black font-bold">제목</Label>
          <Input
            className="text-[14px] text-black font-normal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="메모 제목"
          />
        </div>

        <div className="space-y-2 flex flex-col flex-1 min-h-[50vh]">
          <Label className="text-[14px] text-black font-bold">내용</Label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="메모 내용..."
            className="flex-1 min-h-[min(70vh,720px)]"
          />
        </div>

        <div className="space-y-2 shrink-0">
          <Label className="text-[14px] text-black font-bold">공개범위</Label>
          <div className="flex flex-wrap gap-2">
            {(['personal', 'department', 'company'] as MemoScope[]).map((s) => {
              const Icon = memoScopeIcons[s];
              return (
                <button
                  key={s}
                  type="button"
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-medium transition-colors',
                    scope === s
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-black hover:bg-gray-50',
                  )}
                  onClick={() => setScope(s)}
                >
                  <Icon className="h-4 w-4" />
                  {memoScopeLabels[s]}
                </button>
              );
            })}
          </div>
          <p className="text-[12px] text-black/50">
            {scope === 'personal' && '나만 볼 수 있는 메모입니다.'}
            {scope === 'department' && '같은 부서원이 볼 수 있는 메모입니다.'}
            {scope === 'company' && '모든 직원이 볼 수 있는 메모입니다.'}
          </p>
        </div>

        <div className="space-y-2 shrink-0">
          <Label className="text-[14px] text-black font-bold">배경 색</Label>
          <div className="flex flex-wrap gap-2">
            {MEMO_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                className={cn(
                  'w-8 h-8 rounded-full border-2 transition-transform',
                  color === c.value ? 'border-gray-600 scale-110' : 'border-transparent',
                )}
                style={{ backgroundColor: c.value }}
                onClick={() => setColor(c.value)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
