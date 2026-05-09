'use client';

import { useEffect, useMemo, useState } from 'react';
import { diffWords } from 'diff';
import { Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  useNoteAiAssist,
  useNoteAiStatus,
  type NoteAiAction,
} from '@/hooks/use-note-ai';
import { cn } from '@/lib/utils';

const ACTIONS: { value: NoteAiAction; label: string; emoji: string; description: string }[] = [
  { value: 'summarize', label: '요약', emoji: '📝', description: '본문을 1~3문장으로 요약' },
  { value: 'proofread', label: '맞춤법·다듬기', emoji: '✏️', description: '오탈자 교정 + 자연스러운 문장' },
  { value: 'suggest-title', label: '제목 추천', emoji: '🏷️', description: '본문에 어울리는 제목 3개 제안' },
  { value: 'to-bullets', label: '글머리 기호 변환', emoji: '•', description: '핵심을 불릿 리스트로 정리' },
];

interface NoteAiPanelProps {
  noteId: string;
  title: string;
  contentHtml: string;
  contentPlain: string;
  onApplyContent: (newContent: string) => void;
  onApplyTitle: (newTitle: string) => void;
  onClose: () => void;
}

function htmlToPlainPreview(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|li|h[1-6]|tr)\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function plainToHtml(text: string): string {
  if (!text) return '';
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function bulletsToHtml(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*•]\s*/, '').trim())
    .filter((l) => l.length > 0);
  if (!lines.length) return '';
  const items = lines
    .map((l) => `<li>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`)
    .join('');
  return `<ul>${items}</ul>`;
}

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function NoteAiPanel({
  noteId,
  title,
  contentHtml,
  contentPlain,
  onApplyContent,
  onApplyTitle,
  onClose,
}: NoteAiPanelProps) {
  const { toast } = useToast();
  const status = useNoteAiStatus();
  const assist = useNoteAiAssist();
  const [action, setAction] = useState<NoteAiAction>('summarize');
  const [result, setResult] = useState<string | string[] | null>(null);
  const [usage, setUsage] = useState<{ daily: number; dailyLimit: number } | null>(null);

  useEffect(() => {
    setResult(null);
  }, [action, noteId]);

  const enabled = status.data?.enabled === true;

  const handleRun = async () => {
    if (!enabled) {
      toast({
        title: 'AI 보조가 비활성화되어 있습니다.',
        description: '관리자가 ANTHROPIC_API_KEY 를 등록하면 사용 가능합니다.',
        variant: 'destructive',
      });
      return;
    }
    setResult(null);
    try {
      const res = await assist.mutateAsync({
        action,
        noteId,
        title,
        content: contentHtml,
        contentFormat: 'html',
      });
      setResult(res.result);
      setUsage({ daily: res.daily, dailyLimit: res.dailyLimit });
    } catch (e: any) {
      toast({
        title: e?.message || 'AI 호출 실패',
        variant: 'destructive',
      });
    }
  };

  const diffParts: DiffPart[] | null = useMemo(() => {
    if (action !== 'proofread') return null;
    if (typeof result !== 'string' || !result) return null;
    return diffWords(contentPlain, result);
  }, [action, result, contentPlain]);

  const handleApply = () => {
    if (typeof result !== 'string') return;
    if (action === 'summarize') {
      // 요약은 본문 위에 부록으로 추가
      const summaryBlock = `<blockquote><strong>요약:</strong> ${result
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</blockquote>`;
      onApplyContent(summaryBlock + (contentHtml || ''));
    } else if (action === 'proofread') {
      onApplyContent(plainToHtml(result));
    } else if (action === 'to-bullets') {
      onApplyContent(bulletsToHtml(result));
    }
    toast({ title: '본문에 적용했습니다.' });
  };

  const handleApplyTitle = (t: string) => {
    onApplyTitle(t);
    toast({ title: '제목을 적용했습니다.' });
  };

  return (
    <aside className="w-96 shrink-0 border-l bg-white flex flex-col min-h-0">
      <div className="px-4 py-2.5 border-b flex items-center justify-between bg-yellow-50">
        <h3 className="text-[14px] font-bold flex items-center gap-1.5 text-black">
          <Sparkles className="h-4 w-4 text-yellow-600" />
          AI 보조 편집
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 border-b">
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setAction(a.value)}
              className={cn(
                'text-left p-2 rounded-md border text-[12px] transition-colors',
                action === a.value
                  ? 'border-yellow-400 bg-yellow-50 text-black'
                  : 'border-gray-200 bg-white text-black/80 hover:bg-gray-50',
              )}
            >
              <div className="font-bold flex items-center gap-1">
                <span>{a.emoji}</span>
                <span>{a.label}</span>
              </div>
              <div className="text-[11px] text-black/50 mt-0.5">{a.description}</div>
            </button>
          ))}
        </div>
        <Button
          className="w-full mt-3"
          onClick={handleRun}
          disabled={assist.isPending || !enabled || !contentPlain.trim()}
        >
          {assist.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Claude가 작성 중...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              AI 실행
            </>
          )}
        </Button>
        {!enabled && status.data && (
          <p className="text-[11px] text-red-600 mt-2 text-center">
            AI 키가 등록되어 있지 않습니다.
          </p>
        )}
        {usage && (
          <p className="text-[11px] text-black/40 mt-2 text-center tabular-nums">
            오늘 사용량: {usage.daily} / {usage.dailyLimit}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!result ? (
          <p className="text-[12px] text-black/40 text-center py-8">
            기능을 선택하고 "AI 실행"을 눌러보세요.
          </p>
        ) : action === 'suggest-title' && Array.isArray(result) ? (
          <div className="space-y-2">
            <p className="text-[12px] text-black/60 font-bold">추천 제목 (클릭하여 적용)</p>
            {result.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleApplyTitle(t)}
                className="w-full text-left p-2.5 rounded-md border border-gray-200 bg-white hover:bg-yellow-50 hover:border-yellow-400 text-[13px] text-black transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        ) : action === 'proofread' && diffParts ? (
          <div className="space-y-3">
            <p className="text-[12px] text-black/60 font-bold">변경점 미리보기</p>
            <div className="text-[13px] text-black leading-relaxed whitespace-pre-wrap p-3 rounded-md border bg-white">
              {diffParts.map((part, i) => (
                <span
                  key={i}
                  className={cn(
                    part.added && 'bg-green-100 text-green-900',
                    part.removed && 'bg-red-100 text-red-900 line-through',
                  )}
                >
                  {part.value}
                </span>
              ))}
            </div>
            <Button className="w-full" onClick={handleApply}>
              본문에 적용
            </Button>
          </div>
        ) : action === 'summarize' && typeof result === 'string' ? (
          <div className="space-y-3">
            <p className="text-[12px] text-black/60 font-bold">요약 결과</p>
            <p className="text-[13px] text-black leading-relaxed p-3 rounded-md border bg-white whitespace-pre-wrap">
              {result}
            </p>
            <Button className="w-full" onClick={handleApply}>
              본문 위에 추가
            </Button>
          </div>
        ) : action === 'to-bullets' && typeof result === 'string' ? (
          <div className="space-y-3">
            <p className="text-[12px] text-black/60 font-bold">글머리 기호 변환</p>
            <pre className="text-[13px] text-black leading-relaxed p-3 rounded-md border bg-white whitespace-pre-wrap font-sans">
              {result}
            </pre>
            <Button className="w-full" onClick={handleApply}>
              본문에 적용
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
