'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Clock, FolderDown, Download } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  PdfJobProgress,
  savePdfViaAgent,
  downloadAndSaveViaAgent,
  printSlipViaAgent,
} from '@/hooks/use-print-pdf';
import { API_URL } from '@/lib/api';
import {
  saveToLocalFolder,
  getGlobalDirHandle,
  restoreGlobalDirHandle,
  queryHandlePermission,
  requestHandlePermission,
  setGlobalDirHandle,
} from './PdfSettingsDialog';

interface PdfProgressTrackerProps {
  job: PdfJobProgress;
  onDownload: (jobId: string) => void;
  onClose: () => void;
  isDownloading?: boolean;
  saveToLocal?: boolean;
  /** 서버가 이미 지정 경로에 저장했을 경우 브라우저 저장을 스킵하기 위한 플래그 */
  serverAutoSavedPath?: string;
  /** 작업지시서(슬립) 자동 인쇄 활성화 여부 */
  autoPrintEnabled?: boolean;
  /** 인디고용 슬립 인쇄 프린터명 */
  autoPrintNameIndigo?: string;
  /** 잉크젯용 슬립 인쇄 프린터명 */
  autoPrintNameInkjet?: string;
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
  serverAutoSavedPath,
  autoPrintEnabled = false,
  autoPrintNameIndigo = '',
  autoPrintNameInkjet = '',
}: PdfProgressTrackerProps) {
  // 페이지 단위 진행률을 우선 사용 (1% 단위). 페이지 정보가 없으면 항목 단위로 fallback.
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

  // 자동 로컬 저장 (완료 시 한 번만 실행)
  const autoSavedRef = useRef(false);
  const [localSaveStatus, setLocalSaveStatus] = useState<
    'idle' | 'saving' | 'done' | 'error' | 'permission-needed' | 'agent-done'
  >('idle');

  /**
   * 모든 completed 항목을 에이전트로만 저장 시도.
   * 신규: 브라우저는 blob을 받지 않고, Railway → 에이전트 직접 다운로드 방식 사용 (대용량 안정성 ↑)
   * 하나라도 실패하면 allSaved=false 반환 → 호출측은 폴백 경로로 진입.
   * 단, 일부 성공한 PDF는 에이전트에 이미 저장된 상태이므로 다시 저장하지 않는다.
   */
  const trySaveAllViaAgent = async (): Promise<{
    allSaved: boolean;
    savedItemIds: Set<string>;
  }> => {
    const savedItemIds = new Set<string>();
    let allSaved = true;

    for (const result of job.results) {
      if (result.status !== 'completed') continue;

      const fileName = resolveFileName(result);
      const today = new Date();
      const yy = String(today.getFullYear()).slice(-2);
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const subfolder = `${yy}${mm}${dd}/${result.colorMode || '기타'}/${result.side || '기타'}`;

      // 신규: 에이전트가 Railway에서 직접 다운로드 (브라우저 blob 전송 없음)
      const ok = await downloadAndSaveViaAgent(job.jobId, result.orderItemId, fileName, subfolder);
      if (ok) {
        savedItemIds.add(result.orderItemId);
      } else {
        allSaved = false;
        // 첫 실패 시 즉시 중단 (에이전트 미실행/미설정 가능성 → 폴백 경로로 빠르게 진입)
        return { allSaved: false, savedItemIds };
      }
    }

    return { allSaved, savedItemIds };
  };

  /**
   * 공통: completed 항목을 순회하며 저장.
   * 1순위: 로컬 프린트 에이전트 (Z:\ 등 모든 경로 자유, 권한 팝업 없음)
   * 2순위 폴백: File System Access API (브라우저 폴더 핸들)
   * 3순위 폴백: 브라우저 다운로드
   *
   * 반환: { agentSavedCount, fallbackSavedCount }
   */
  const saveCompletedPdfs = async (
    forceHandle?: FileSystemDirectoryHandle,
  ): Promise<{ agentSavedCount: number; fallbackSavedCount: number }> => {
    let agentSavedCount = 0;
    let fallbackSavedCount = 0;

    for (const result of job.results) {
      if (result.status !== 'completed') continue;

      const response = await fetch(
        `${API_URL}/print-pdf/jobs/${job.jobId}/download?itemId=${result.orderItemId}`,
        { credentials: 'include' },
      );
      if (!response.ok) continue;

      const blob = await response.blob();
      const fileName = resolveFileName(result);
      // 저장 경로: {YYMMDD(오늘)}/{인디고도수}/{양면|단면}/
      const today = new Date();
      const yy = String(today.getFullYear()).slice(-2);
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const datePart = `${yy}${mm}${dd}`;
      const colorPart = result.colorMode || '기타';
      const sidePart = result.side || '기타';
      const subfolder = `${datePart}/${colorPart}/${sidePart}`;

      // 1. 에이전트 저장 시도 (가장 신뢰성 높음)
      const agentSaved = await savePdfViaAgent(blob, fileName, subfolder);
      if (agentSaved) {
        agentSavedCount += 1;
        continue;
      }

      // 2. File System Access API 폴백 (또는 브라우저 다운로드)
      await saveToLocalFolder(blob, fileName, forceHandle, subfolder);
      fallbackSavedCount += 1;
    }

    return { agentSavedCount, fallbackSavedCount };
  };

  useEffect(() => {
    if (!isJobDone || !saveToLocal || autoSavedRef.current || !hasCompletedPdfs) return;
    autoSavedRef.current = true;

    // 서버가 지정 경로에 직접 저장한 경우 브라우저 저장 스킵
    if (serverAutoSavedPath) {
      setLocalSaveStatus('done');
      toast.success(`PDF가 ${serverAutoSavedPath} 경로에 자동 저장되었습니다`);
      return;
    }

    (async () => {
      // 1. 먼저 에이전트로 저장 시도 (브라우저 권한 무관)
      //    에이전트가 실행 중이고 savePath가 설정되어 있으면 모든 PDF를 에이전트에 저장.
      //    하나라도 성공하면 폴더 핸들 검증을 건너뛴다.
      setLocalSaveStatus('saving');
      try {
        // 에이전트만 단독으로 시도하기 위해 폴더 핸들은 전달하지 않는다.
        // (saveCompletedPdfs 내부에서 에이전트 실패 시 saveToLocalFolder 폴백이 호출되는데,
        //  이때 dirHandle이 없으면 IDB 복원 → 권한 체크 → 실패 시 브라우저 다운로드로 떨어진다.)
        const agentOnlyResult = await trySaveAllViaAgent();
        if (agentOnlyResult.allSaved) {
          setLocalSaveStatus('agent-done');
          toast.success('PDF가 에이전트를 통해 저장되었습니다');
          return;
        }

        // 에이전트가 일부/전부 실패 → File System Access API 폴백 경로 진입
        // IDB에서 폴더 핸들 복원 (새로고침 후 첫 완료 시 대비)
        const handle = await restoreGlobalDirHandle();

        // 핸들이 없으면 → 브라우저 기본 다운로드 폴더로 폴백 (사용자에게 알림)
        if (!handle) {
          // 에이전트도 없고 폴더 핸들도 없으면 브라우저 기본 다운로드로 폴백
          await saveCompletedPdfs();
          setLocalSaveStatus('done');
          toast.info(
            'C:\\PDF저장 폴더가 설정되지 않았습니다. 다운로드 폴더에 저장됩니다.',
          );
          return;
        }
        const perm = await queryHandlePermission(handle);
        if (perm !== 'granted') {
          setLocalSaveStatus('permission-needed');
          toast.info('폴더 저장 권한이 필요합니다. 아래 "폴더에 저장" 버튼을 클릭해주세요.');
          return;
        }

        // 폴더 핸들이 있으면 이미 저장 못한 항목들을 핸들로 저장
        await saveCompletedPdfs();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJobDone, saveToLocal, hasCompletedPdfs]);

  // 슬립 자동 인쇄 (작업지시서)
  // PDF 변환 완료 후, 설정에서 활성화되어 있으면 에이전트가 로컬 Chrome으로 슬립을 인쇄.
  useEffect(() => {
    if (!isJobDone || !autoPrintEnabled || !hasCompletedPdfs) return;

    (async () => {
      for (const result of job.results) {
        if (result.status !== 'completed') continue;

        // colorMode 에 '잉크젯' 포함이면 잉크젯 프린터, 아니면 인디고 프린터 사용
        const isInkjet = (result.colorMode || '').toLowerCase().includes('잉크젯');
        const printerName = isInkjet
          ? (autoPrintNameInkjet || '')
          : (autoPrintNameIndigo || '');

        const ok = await printSlipViaAgent(result.orderItemId, printerName);
        if (ok) {
          // eslint-disable-next-line no-console
          console.log(`[슬립] 인쇄 요청 완료: ${result.orderNumber}`);
        } else {
          // eslint-disable-next-line no-console
          console.warn(`[슬립] 인쇄 실패: ${result.orderNumber}`);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJobDone, autoPrintEnabled, hasCompletedPdfs]);

  /** 서버가 내려준 fileName 우선, 없으면 레거시 포맷 */
  const resolveFileName = (result: PdfJobProgress['results'][number]): string => {
    if (result.fileName) {
      return result.fileName.replace(/[<>:"/\\|?*]/g, '_');
    }
    return `${result.orderNumber || 'print'}_${result.studioName || ''}.pdf`
      .replace(/[<>:"/\\|?*]/g, '_');
  };

  /**
   * 수동 저장: 이미 저장된 폴더 핸들이 있으면 권한만 재요청하고 즉시 저장,
   * 없으면 폴더 선택 프롬프트 → 저장.
   */
  const handleManualLocalSave = async () => {
    try {
      // 0. 먼저 에이전트로 시도 (가장 신뢰성 높음, 권한 팝업 없음)
      setLocalSaveStatus('saving');
      const agentResult = await trySaveAllViaAgent();
      if (agentResult.allSaved) {
        setLocalSaveStatus('agent-done');
        toast.success('PDF가 에이전트를 통해 저장되었습니다');
        return;
      }

      // 1. 에이전트 미실행/실패 → File System Access API 폴백
      let handle = getGlobalDirHandle() || (await restoreGlobalDirHandle());

      if (handle) {
        const granted = await requestHandlePermission(handle);
        if (!granted) {
          toast.error('폴더 접근 권한이 거부되었습니다. 폴더를 다시 선택해주세요.');
          setGlobalDirHandle(null);
          handle = null;
        }
      }

      if (!handle) {
        if (!('showDirectoryPicker' in window)) {
          onDownload(job.jobId);
          return;
        }
        handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        setGlobalDirHandle(handle);
      }

      await saveCompletedPdfs(handle!);
      setLocalSaveStatus('done');
      toast.success(`PDF가 ${handle!.name} 폴더에 저장되었습니다`);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error(err);
        toast.error('저장 실패');
        setLocalSaveStatus('error');
      }
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
                <>
                  {job.processedPages || 0}/{job.totalPages} 페이지 ({job.completedItems}/{job.totalItems} 건)
                </>
              ) : (
                <>{job.completedItems}/{job.totalItems} 완료</>
              )}
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 로컬 저장 상태 */}
        {saveToLocal && localSaveStatus !== 'idle' && (
          <div className={`text-[14px] px-3 py-2 rounded flex items-center justify-between gap-2 ${
            localSaveStatus === 'saving' ? 'bg-blue-50 text-blue-700' :
            localSaveStatus === 'done' ? 'bg-green-50 text-green-700' :
            localSaveStatus === 'agent-done' ? 'bg-green-50 text-green-700' :
            localSaveStatus === 'permission-needed' ? 'bg-amber-50 text-amber-800' :
            'bg-red-50 text-red-700'
          }`}>
            <span>
              {localSaveStatus === 'saving' && '로컬 PC에 저장 중...'}
              {localSaveStatus === 'agent-done' && '에이전트가 지정 경로에 저장 완료'}
              {localSaveStatus === 'done' && (
                getGlobalDirHandle()
                  ? `선택한 폴더에 저장 완료`
                  : '다운로드 폴더에 저장 완료'
              )}
              {localSaveStatus === 'permission-needed' &&
                '새로고침 후에는 폴더 접근 권한을 다시 허용해야 합니다. 오른쪽 버튼을 클릭해주세요.'}
              {localSaveStatus === 'error' && '로컬 저장 실패 - 수동 다운로드를 이용해주세요'}
            </span>
            {localSaveStatus === 'permission-needed' && isJobDone && hasCompletedPdfs && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualLocalSave}
                className="h-7"
              >
                <FolderDown className="h-3.5 w-3.5 mr-1" />
                폴더에 저장
              </Button>
            )}
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
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
