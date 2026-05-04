'use client';

import { useCallback, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useScanPrintQueueToFinishing } from '@/hooks/use-print-pdf';
import { toast } from 'sonner';

export function PrintQueueScanStrip() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const mut = useScanPrintQueueToFinishing();

  const submit = useCallback(() => {
    const code = value.trim();
    if (!code || mut.isPending) return;
    mut.mutate(code, {
      onSuccess: (res) => {
        const msg = res.message || (res.already ? '이미 후가공대기입니다.' : '후가공대기로 이동했습니다.');
        if (res.already) toast.info(msg);
        else toast.success(`${res.orderNumber} · ${res.studioName || '—'} — ${msg}`);
        setValue('');
        queueMicrotask(() => inputRef.current?.focus());
      },
      onError: (err: unknown) => {
        const m = err instanceof Error ? err.message : String(err);
        toast.error(m || '처리에 실패했습니다.');
        queueMicrotask(() => inputRef.current?.focus());
      },
    });
  }, [value, mut]);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[14px] text-black font-bold shrink-0">작업지 바코드</span>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="주문번호 또는 생산번호 — 스캔 후 Enter"
          autoComplete="off"
          disabled={mut.isPending}
          className="h-9 flex-1 min-w-[200px] max-w-xl text-[14px] text-black font-normal bg-white"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 text-[14px] text-black font-normal shrink-0"
          disabled={mut.isPending || !value.trim()}
          onClick={submit}
        >
          확인
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 text-[14px] text-black font-normal shrink-0"
          onClick={() => {
            setValue('');
            inputRef.current?.focus();
          }}
        >
          비우기
        </Button>
      </div>
      <p className="text-[14px] text-black font-normal">
        앨범·포토북류만 자동으로 <span className="font-bold">후가공대기</span>로 넘어갑니다. 단품출력 등은 주문 상세에서 공정을 변경해 주세요.
      </p>
    </div>
  );
}
