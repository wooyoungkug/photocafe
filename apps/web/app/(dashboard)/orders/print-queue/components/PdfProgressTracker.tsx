'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Clock, FolderDown, Download } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  PdfJobProgress,
  downloadAndSaveViaAgent,
  printSlipViaAgent,
} from '@/hooks/use-print-pdf';
import { API_URL } from '@/lib/api';

interface PdfProgressTrackerProps {
  job: PdfJobProgress;
  onDownload: (jobId: string) => void;
  onClose: () => void;
  isDownloading?: boolean;
  autoPrintEnabled?: boolean;
  autoPrintNameIndigo?: string;
  autoPrintNameInkjet?: string;
  autoPrintName?: string;
}

const statusIcon = {
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  in_progress: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  pending: <Clock className="h-4 w-4 text-gray-400" />,
};

export default function PdfProgressTracker({
  job,
  onDownload,
  onClose,
  isDownloading,
  autoPrintEnabled = false,
  autoPrintNameIndigo = '',
  autoPrintNameInkjet = '',
  autoPrintName = '',
}: PdfProgressTrackerProps) {
  const progress = (() => {
    if (job.totalPages && job.totalPages > 0) {
      const pct = Math.floor(((job.processedPages || 0) / job.totalPages) * 100);
      return Math.max(0, Math.min(100, pct));
    }
    if (job.totalItems > 0) {
      return Math.round((job.completedItems / job.totalItems) * 100);
    }
    return 0;
  })();

  const isJobDone = job.status === 'completed' || job.status === 'failed';
  const hasCompletedPdfs = job.results.some((r) => r.status === 'completed');

  const autoSavedRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  /** 모든 completed 항목을 에이전트로 저장 */
  const trySaveAllViaAgent = async (): Promise<boolean> => {
    for (const result of job.results) {
      if (result.status !== 'completed') continue;
      const fileName = resolveFileName(result);
      const today = new Date();
      const yy = String(today.getFullYear()).slice(-2);
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const subfolder = `${yy}${mm}${dd}/${result.colorMode || '기타'}/${result.side || '기타'}`;
      const ok = await downloadAndSaveViaAgent(job.jobId, result.orderItemId, fileName, subfolder);
      if (!ok) return false;
    }
    return true;
  };

  // 변환 완료 시 에이전트로 자동 저장
  useEffect(() => {
    if (!isJobDone || autoSavedRef.current || !hasCompletedPdfs) return;
    autoSavedRef.current = true;

    (async () => {
      setSaveStatus('saving');
      try {
        const saved = await trySaveAllViaAgent();
        if (saved) {
          setSaveStatus('done');
          toast.success('PDF가 에이전트를 통해 저장되었습니다');
        } else {
          setSaveStatus('error');
          toast.error('에이전트 저장 실패. 에이전트가 실행 중인지 확인 후 수동 저장 버튼을 클릭하세요.');
        }
      } catch {
        setSaveStatus('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJobDone, hasCompletedPdfs]);

  // 작업지시서 자동 인쇄
  useEffect(() => {
    if (!isJobDone || !autoPrintEnabled || !hasCompletedPdfs) return;
    (async () => {
      for (const result of job.results) {
        if (result.status !== 'completed') continue;
        const isInkjet = (result.colorMode || '').toLowerCase().includes('잉크젯');
        const specific = isInkjet ? autoPrintNameInkjet : autoPrintNameIndigo;
        const printerName = (specific || '').trim() || (autoPrintName || '').trim();
        const ok = await printSlipViaAgent(result.orderItemId, printerName);
        if (!ok) {
          toast.warning(`작업지시서 자동 인쇄 실패: ${result.orderNumber}. 에이전트·프린터 설정을 확인해주세요.`);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJobDone, autoPrintEnabled, hasCompletedPdfs, autoPrintName, autoPrintNameIndigo, autoPrintNameInkjet]);

  const resolveFileName = (result: PdfJobProgress['results'][number]): string => {
    if (result.fileName) return result.fileName.replace(/[<>:"/\\|?*]/g, '_');
    return `${result.orderNumber || 'print'}_${result.studioName || ''}.pdf`.replace(/[<>:"/\\|?*]/g, '_');
  };

  const handleManualSave = async () => {
    setSaveStatus('saving');
    try {
      const saved = await trySaveAllViaAgent();
      if (saved) {
        setSaveStatus('done');
        toast.success('PDF가 에이전트를 통해 저장되었습니다');
      } else {
        setSaveStatus('error');
        toast.error('에이전트가 실행 중인지 확인하세요. (설정 > 에이전트 저장 경로)');
      }
    } catch {
      setSaveStatus('error');
      toast.error('저장 실패');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-[18px] text-black font-bold">
          JDF+PDF 변환 {isJobDone ? '완료' : '진행 중'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 진행률 바 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[14px] text-black font-normal">
            <span>
              {job.totalPages && job.totalPages > 0 ? (
                <>{job.processedPages || 0}/{job.totalPages} 페이지 ({job.completedItems}/{job.totalItems} 건)</>
              ) : (
                <>{job.completedItems}/{job.totalItems} 완료</>
              )}
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 저장 상태 */}
        {saveStatus !== 'idle' && (
          <div className={`text-[14px] px-3 py-2 rounded ${
            saveStatus === 'saving' ? 'bg-blue-50 text-blue-700' :
            saveStatus === 'done'   ? 'bg-green-50 text-green-700' :
                                      'bg-red-50 text-red-700'
          }`}>
            {saveStatus === 'saving' && '에이전트로 저장 중...'}
            {saveStatus === 'done'   && '에이전트 저장 완료'}
            {saveStatus === 'error'  && '에이전트 저장 실패 — 아래 버튼으로 수동 저장하세요'}
          </div>
        )}

        {/* 항목별 상태 */}
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {job.results.map((result, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-[14px] text-black font-normal py-1 px-2 rounded bg-gray-50"
            >
              {statusIcon[result.status]}
              <span className="flex-1 truncate">{result.orderNumber || result.orderItemId}</span>
              <span className="text-gray-500 truncate max-w-[120px]">{result.studioName}</span>
              {result.error && (
                <span className="text-red-500 text-[12px] truncate max-w-[150px]">{result.error}</span>
              )}
            </div>
          ))}
        </div>

        {/* 완료 후 액션 */}
        {isJobDone && (
          <div className="flex gap-2 pt-2">
            {hasCompletedPdfs && (
              <>
                <Button
                  onClick={handleManualSave}
                  disabled={saveStatus === 'saving'}
                  className="gap-1.5"
                >
                  <FolderDown className="h-4 w-4" />
                  에이전트로 저장
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onDownload(job.jobId)}
                  disabled={isDownloading}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  다운로드
                </Button>
              </>
            )}
            {job.status === 'in_progress' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  try {
                    await fetch(`${API_URL}/print-pdf/jobs/${job.jobId}/cancel`, { method: 'POST' });
                    toast.info('변환이 취소되었습니다');
                    onClose();
                  } catch { toast.error('취소 실패'); }
                }}
                className="gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                강제 취소
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>닫기</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
