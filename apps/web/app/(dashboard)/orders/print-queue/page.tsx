'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, FileDown, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  usePrintQueue,
  useGeneratePrintPdf,
  usePdfJobStatus,
  useDownloadPdf,
  GeneratePrintPdfRequest,
} from '@/hooks/use-print-pdf';
import PrintQueueTable from './components/PrintQueueTable';
import PdfConvertDialog from './components/PdfConvertDialog';
import PdfProgressTracker from './components/PdfProgressTracker';
import PdfSettingsDialog, { usePdfSettings } from './components/PdfSettingsDialog';

export default function PrintQueuePage() {
  // 필터 상태
  const [studioSearch, setStudioSearch] = useState('');
  const [searchValue, setSearchValue] = useState('');

  // 선택 상태
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 다이얼로그 상태
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Job 상태 (sessionStorage 복원으로 새로고침 내성)
  const [activeJobId, setActiveJobId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('printPdf.activeJobId');
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeJobId) {
      sessionStorage.setItem('printPdf.activeJobId', activeJobId);
    } else {
      sessionStorage.removeItem('printPdf.activeJobId');
    }
  }, [activeJobId]);

  // API 훅
  const { data, isPending, refetch, isFetching } = usePrintQueue({
    studioName: studioSearch || undefined,
  });

  const pdfSettings = usePdfSettings();
  const generateMutation = useGeneratePrintPdf();
  const { data: jobProgress } = usePdfJobStatus(activeJobId);
  const downloadMutation = useDownloadPdf();

  // 404 등으로 Job이 유실된 경우 (failed + results 비어있음) → 자동 초기화
  useEffect(() => {
    if (!activeJobId || !jobProgress) return;
    if (jobProgress.status === 'failed' && (!jobProgress.results || jobProgress.results.length === 0)) {
      setActiveJobId(null);
    }
  }, [activeJobId, jobProgress]);

  const items = data?.items || [];

  const handleSearch = () => {
    setStudioSearch(searchValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleGenerate = (request: GeneratePrintPdfRequest) => {
    generateMutation.mutate(request, {
      onSuccess: (job) => {
        setActiveJobId(job.jobId);
        setConvertDialogOpen(false);
      },
    });
  };

  const handleDownload = (jobId: string) => {
    downloadMutation.mutate(jobId);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] text-black font-normal">출력대기 PDF 변환</h1>
          <p className="text-[14px] text-gray-500 mt-0.5">
            출력대기 주문의 이미지를 인쇄용 PDF로 변환합니다 · 30초 자동 갱신
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsDialogOpen(true)}
            className="gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" />
            설정
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* 필터/액션 바 */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* 스튜디오 검색 */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-[300px]">
              <Input
                placeholder="스튜디오명 검색"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-9 text-[14px]"
              />
              <Button variant="outline" size="sm" onClick={handleSearch} className="h-9 px-3">
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex-1" />

            {/* 선택 정보 + PDF 변환 버튼 */}
            {selectedIds.length > 0 && (
              <span className="text-[14px] text-black font-normal">
                {selectedIds.length}건 선택
              </span>
            )}
            <Button
              onClick={() => setConvertDialogOpen(true)}
              disabled={selectedIds.length === 0}
              className="gap-1.5"
            >
              <FileDown className="h-4 w-4" />
              PDF 변환
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 진행상태 표시 */}
      {activeJobId && jobProgress && (
        <PdfProgressTracker
          job={jobProgress}
          onDownload={handleDownload}
          onClose={() => setActiveJobId(null)}
          isDownloading={downloadMutation.isPending}
          saveToLocal={pdfSettings.saveToLocal}
        />
      )}

      {/* 출력대기 목록 테이블 */}
      <PrintQueueTable
        items={items}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        isLoading={isPending}
      />

      {/* 페이지 정보 */}
      {data && (
        <div className="text-[14px] text-gray-500 text-right">
          총 {data.total}건
        </div>
      )}

      {/* PDF 변환 옵션 다이얼로그 */}
      <PdfConvertDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
        onGenerate={handleGenerate}
        isGenerating={generateMutation.isPending}
      />

      {/* PDF 출력 설정 다이얼로그 */}
      <PdfSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </div>
  );
}
