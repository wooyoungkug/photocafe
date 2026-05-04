'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { checkPrintAgentRunning } from '@/hooks/use-print-pdf';
import { ClipboardCopy, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const RUN_HELP_TEXT = `[포토카페 프린트 에이전트 실행]

1) 저장소(또는 설치 폴더)에서 tools\\print-agent 폴더를 연다.

2) 아래 중 하나를 더블클릭한다.
   - run-print-agent.bat (영문 파일명 권장)
   - 또는 프린트에이전트_실행.bat

3) 검은 창이 뜨면 닫지 말고 둔다. (닫으면 localhost:9199가 꺼진다.)

4) 이 화면에서 「연결 재확인」을 누른다.

※ Node.js가 없으면 https://nodejs.org 에서 LTS를 설치한다.

※ 포터블 설치본: 설치 폴더의「2_에이전트_시작.bat」를 사용한다.`;

function PrintAgentIllustration({ connected }: { connected: boolean | null }) {
  const on = connected === true;
  const off = connected === false;
  const lamp = on ? '#22c55e' : off ? '#ef4444' : '#94a3b8';
  const cable = on ? '#16a34a' : '#cbd5e1';

  return (
    <svg
      width="140"
      height="88"
      viewBox="0 0 140 88"
      className="shrink-0"
      aria-hidden
    >
      <rect x="8" y="18" width="64" height="48" rx="4" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
      <rect x="16" y="26" width="48" height="28" rx="2" fill="#e2e8f0" />
      <rect x="22" y="32" width="14" height="8" rx="1" fill="#64748b" />
      <rect x="40" y="32" width="14" height="8" rx="1" fill="#64748b" />
      <rect x="58" y="32" width="6" height="16" rx="1" fill="#64748b" />
      <path d="M72 42h18c6 0 10 4 10 10v6" fill="none" stroke={cable} strokeWidth="3" strokeLinecap="round" />
      <rect x="96" y="14" width="36" height="56" rx="6" fill="#fff" stroke="#0f172a" strokeWidth="2" />
      <circle cx="114" cy="28" r="6" fill={lamp} />
      {on && (
        <circle cx="114" cy="28" r="10" fill="none" stroke="#86efac" strokeWidth="2" opacity="0.9">
          <animate attributeName="r" values="10;14;10" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" repeatCount="indefinite" />
        </circle>
      )}
      <text x="114" y="52" textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="system-ui, sans-serif">
        9199
      </text>
      <text x="114" y="64" textAnchor="middle" fill="#64748b" fontSize="6" fontFamily="system-ui, sans-serif">
        agent
      </text>
    </svg>
  );
}

export function PrintAgentRunHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const copyHelp = async () => {
    try {
      await navigator.clipboard.writeText(RUN_HELP_TEXT);
      toast.success('실행 안내가 복사되었습니다.');
    } catch {
      toast.error('복사에 실패했습니다. 브라우저 권한을 확인해주세요.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-[14px] text-black font-normal">
        <DialogHeader>
          <DialogTitle className="text-[18px] text-black font-bold">프린트 에이전트 실행</DialogTitle>
          <DialogDescription className="text-[14px] text-gray-600 font-normal text-left pt-1">
            웹 브라우저는 보안상 이 PC에서 프로그램을 대신 실행할 수 없습니다. 아래 순서대로 출력용 PC에서 직접
            실행해 주세요.
          </DialogDescription>
        </DialogHeader>
        <pre className="whitespace-pre-wrap rounded-md border bg-slate-50 p-3 text-[12px] leading-relaxed text-black max-h-[40vh] overflow-y-auto">
          {RUN_HELP_TEXT}
        </pre>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={copyHelp} className="gap-1.5 text-[14px]">
            <ClipboardCopy className="h-4 w-4" />
            안내 복사
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)} className="text-[14px]">
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PrintAgentStatusCard({ pollMs = 15000 }: { pollMs?: number }) {
  const [running, setRunning] = useState<boolean | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await checkPrintAgentRunning();
      setRunning(ok);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (pollMs <= 0) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [pollMs, refresh]);

  const label =
    running === null ? '확인 중…' : running ? '에이전트 연결됨' : '에이전트 꺼짐';
  const sub =
    running === true
      ? '이 PC에서 localhost:9199 로 응답 중입니다. 프린터 목록·자동 인쇄·폴더 저장을 사용할 수 있습니다.'
      : running === false
        ? 'run-print-agent.bat 등으로 에이전트를 실행한 뒤「연결 재확인」을 눌러주세요.'
        : '잠시만 기다려 주세요.';

  return (
    <>
      <Card className="border-slate-200 bg-slate-50/80">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <PrintAgentIllustration connected={running} />
            <div className="min-w-0">
              <p className="text-[18px] text-black font-bold">{label}</p>
              <p className="text-[14px] text-black font-normal text-gray-700 mt-0.5">{sub}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => refresh()}
              className="gap-1.5 text-[14px]"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              연결 재확인
            </Button>
            {running !== true && (
              <Button type="button" size="sm" onClick={() => setHelpOpen(true)} className="text-[14px]">
                실행 방법
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <PrintAgentRunHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}

/** 설정 다이얼로그 상단 등 — 이미 알고 있는 running 값으로 표시 */
export function PrintAgentStatusStrip({
  agentRunning,
  onRecheck,
  rechecking,
}: {
  agentRunning: boolean | null;
  rechecking: boolean;
  onRecheck: () => void | Promise<void>;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  const label =
    agentRunning === null ? '에이전트 확인 중…' : agentRunning ? '에이전트 연결됨' : '에이전트 꺼짐';

  return (
    <>
      <Card className="border-slate-200 bg-slate-50/80">
        <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <PrintAgentIllustration connected={agentRunning} />
            <p className="text-[14px] text-black font-bold">{label}</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={rechecking}
              onClick={() => onRecheck()}
              className="gap-1.5 text-[14px]"
            >
              {rechecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              연결 재확인
            </Button>
            {agentRunning !== true && (
              <Button type="button" size="sm" onClick={() => setHelpOpen(true)} className="text-[14px]">
                실행 방법
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <PrintAgentRunHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
