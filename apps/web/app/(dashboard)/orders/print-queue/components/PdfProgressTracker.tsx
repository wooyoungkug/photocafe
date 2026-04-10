'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Clock, FolderDown, Download } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { PdfJobProgress } from '@/hooks/use-print-pdf';
import { API_URL } from '@/lib/api';
import { saveToLocalFolder, getGlobalDirHandle } from './PdfSettingsDialog';

interface PdfProgressTrackerProps {
  job: PdfJobProgress;
  onDownload: (jobId: string) => void;
  onClose: () => void;
  isDownloading?: boolean;
  saveToLocal?: boolean;
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
  saveToLocal = true,
}: PdfProgressTrackerProps) {
  const progress = job.totalItems > 0
    ? Math.round((job.completedItems / job.totalItems) * 100)
    : 0;

  const isJobDone = job.status === 'completed' || job.status === 'failed';
  const hasCompletedPdfs = job.results.some((r) => r.status === 'completed');

  // 자동 로컬 저장 (완료 시 한 번만 실행)
  const autoSavedRef = useRef(false);
  const [localSaveStatus, setLocalSaveStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (!isJobDone || !saveToLocal || autoSavedRef.current || !hasCompletedPdfs) return;
    autoSavedRef.current = true;

    (async () => {
      setLocalSaveStatus('saving');
      try {
        const token =
          sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');

        // 각 완료된 항목을 개별 다운로드하여 로컬에 저장
        for (const result of job.results) {
          if (result.status !== 'completed') continue;

          const response = await fetch(
            `${API_URL}/print-pdf/jobs/${job.jobId}/download?itemId=${result.orderItemId}`,
            {
              headers: { ...(token && { Authorization: `Bearer ${token}` }) },
            },
          );

          if (!response.ok) {
            // 개별 다운로드 실패 시 전체 job 다운로드 시도
            const fallbackResponse = await fetch(
              `${API_URL}/print-pdf/jobs/${job.jobId}/download`,
              {
                headers: { ...(token && { Authorization: `Bearer ${token}` }) },
              },
            );
            if (fallbackResponse.ok) {
              const blob = await fallbackResponse.blob();
              const fileName = `${result.orderNumber || job.jobId}_print.pdf`;
              await saveToLocalFolder(blob, fileName);
            }
            continue;
          }

          const blob = await response.blob();
          const fileName = `${result.orderNumber || 'print'}_${result.studioName || ''}.pdf`
            .replace(/[<>:"/\\|?*]/g, '_');
          await saveToLocalFolder(blob, fileName);
        }

        setLocalSaveStatus('done');
        toast.success(
          getGlobalDirHandle()
            ? `PDF가 선택한 폴더에 저장되었습니다`
            : 'PDF 다운로드가 완료되었습니다',
        );
      } catch (err) {
        console.error('로컬 저장 실패:', err);
        setLocalSaveStatus('error');
        toast.error('로컬 저장에 실패했습니다. 수동 다운로드를 이용해주세요.');
      }
    })();
  }, [isJobDone, saveToLocal, hasCompletedPdfs]);

  const handleManualLocalSave = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        setLocalSaveStatus('saving');

        const token =
          sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');

        const response = await fetch(
          `${API_URL}/print-pdf/jobs/${job.jobId}/download`,
          { headers: { ...(token && { Authorization: `Bearer ${token}` }) } },
        );

        if (response.ok) {
          const blob = await response.blob();
          const fileName = `print_${job.jobId.slice(0, 8)}.pdf`;
          await saveToLocalFolder(blob, fileName, handle);
          setLocalSaveStatus('done');
          toast.success(`PDF가 ${handle.name} 폴더에 저장되었습니다`);
        }
      } else {
        // fallback: 일반 다운로드
        onDownload(job.jobId);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('저장 실패');
        setLocalSaveStatus('error');
      }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-[18px] text-black font-bold">
          PDF 변환 {isJobDone ? '완료' : '진행 중'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 진행률 바 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[14px] text-black font-normal">
            <span>
              {job.completedItems}/{job.totalItems} 완료
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 로컬 저장 상태 */}
        {saveToLocal && localSaveStatus !== 'idle' && (
          <div className={`text-[14px] px-3 py-2 rounded ${
            localSaveStatus === 'saving' ? 'bg-blue-50 text-blue-700' :
            localSaveStatus === 'done' ? 'bg-green-50 text-green-700' :
            'bg-red-50 text-red-700'
          }`}>
            {localSaveStatus === 'saving' && '로컬 PC에 저장 중...'}
            {localSaveStatus === 'done' && (
              getGlobalDirHandle()
                ? `선택한 폴더에 저장 완료`
                : '다운로드 폴더에 저장 완료'
            )}
            {localSaveStatus === 'error' && '로컬 저장 실패 - 수동 다운로드를 이용해주세요'}
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
              <span className="flex-1 truncate">
                {result.orderNumber || result.orderItemId}
              </span>
              <span className="text-gray-500 truncate max-w-[120px]">
                {result.studioName}
              </span>
              {result.error && (
                <span className="text-red-500 text-[12px] truncate max-w-[150px]">
                  {result.error}
                </span>
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
                  onClick={handleManualLocalSave}
                  disabled={isDownloading || localSaveStatus === 'saving'}
                  className="gap-1.5"
                >
                  <FolderDown className="h-4 w-4" />
                  폴더에 저장
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
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
