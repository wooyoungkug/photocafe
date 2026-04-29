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
import PdfSettingsDialog, {
  usePdfSettings,
  restoreGlobalDirHandle,
  requestHandlePermission,
  setGlobalDirHandle,
  getGlobalDirHandle,
} from './components/PdfSettingsDialog';
import ImpositionSettingsDialog from './components/ImpositionSettingsDialog';
import { OrderQuickEditDialog } from '../components/order-quick-edit-dialog';
import type { PrintQueueItem } from '@/hooks/use-print-pdf';
import type { Order } from '@/hooks/use-orders';
import { toast } from 'sonner';

export default function PrintQueuePage() {
  // 필터 상태
  const [studioSearch, setStudioSearch] = useState('');
  const [searchValue, setSearchValue] = useState('');

  // 선택 상태
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 주문 검증 및 수정 다이얼로그
  const [quickEditOrder, setQuickEditOrder] = useState<Pick<Order, 'id'> | null>(null);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);

  // 다이얼로그 상태
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [impositionOpen, setImpositionOpen] = useState(false);
  type ImpositionSeed = {
    orderId: string;
    orderItemId: string;
    productWidth?: number;
    productHeight?: number;
    productUnit?: 'mm' | 'inch';
    pageCount?: number;
    bindingType?: 'compressed' | 'tack' | 'perfect' | 'flat';
    label?: string;
    productSize?: string;
  };
  const [impositionSeed, setImpositionSeed] = useState<ImpositionSeed | null>(null);
  const [impositionAdditionalSeeds, setImpositionAdditionalSeeds] = useState<ImpositionSeed[]>([]);

  const buildSeed = (item: PrintQueueItem): ImpositionSeed => {
    // size 파싱 ("9x12" 또는 "210x297" 또는 "9 x 12" 등)
    const m = (item.size || '').match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
    const rawW = m ? parseFloat(m[1]) : undefined;
    const rawH = m ? parseFloat(m[2]) : undefined;

    // 단위 추정: 두 값 모두 30 이하면 인치(앨범 표준), 그 외는 mm
    const isInch =
      rawW !== undefined && rawH !== undefined && rawW <= 30 && rawH <= 30;
    const productUnit: 'mm' | 'inch' = isInch ? 'inch' : 'mm';
    const MM_PER_INCH = 25.4;
    const pw = rawW !== undefined ? (isInch ? rawW * MM_PER_INCH : rawW) : undefined;
    const ph = rawH !== undefined ? (isInch ? rawH * MM_PER_INCH : rawH) : undefined;

    const bt = (item.bindingType || '').toLowerCase();
    const bindingType: 'compressed' | 'tack' | 'perfect' | 'flat' =
      bt.includes('압축') || bt.includes('compressed')
        ? 'compressed'
        : bt.includes('타카') || bt.includes('tack') || bt.includes('핀')
          ? 'tack'
          : bt.includes('무선') || bt.includes('perfect') || bt.includes('화보')
            ? 'perfect'
            : 'flat';
    return {
      orderId: item.orderId,
      orderItemId: item.id,
      productWidth: pw,
      productHeight: ph,
      productUnit,
      pageCount: item.pages,
      bindingType,
      label: item.orderNumber,
      productSize: item.size,
    };
  };

  const openImposition = (item: PrintQueueItem) => {
    setImpositionSeed(buildSeed(item));
    setImpositionAdditionalSeeds([]);
    setImpositionOpen(true);
  };

  const openImpositionMulti = (selected: PrintQueueItem[]) => {
    if (selected.length === 0) return;
    const [first, ...rest] = selected;
    setImpositionSeed(buildSeed(first));
    setImpositionAdditionalSeeds(rest.map(buildSeed));
    setImpositionOpen(true);
  };

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

  /**
   * PDF 변환 시작 전 폴더 권한을 사용자 제스처 컨텍스트에서 미리 확보.
   * 이렇게 하면 변환 완료 후 자동 저장 시 권한 팝업/다운로드 대화상자 없이 바로 저장됨.
   */
  const ensureFolderReadyForAutoSave = async (): Promise<void> => {
    // 서버 자동 저장 경로가 설정된 경우 브라우저 개입 불필요 (무인 저장)
    if (pdfSettings.outputPath) return;
    if (!pdfSettings.saveToLocal) return;
    let handle = getGlobalDirHandle() || (await restoreGlobalDirHandle());

    // 폴더가 한 번도 선택되지 않았으면 지금 선택받기
    if (!handle) {
      if (!('showDirectoryPicker' in window)) return;
      try {
        handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        if (handle) setGlobalDirHandle(handle);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          toast.info('폴더 선택이 취소되어 브라우저 기본 다운로드 폴더에 저장됩니다.');
        }
        return;
      }
    }

    if (!handle) return;

    // 권한 확보 (필요 시 팝업). 실패 시 핸들 폐기.
    const granted = await requestHandlePermission(handle);
    if (!granted) {
      toast.warning('폴더 권한이 거부되어 브라우저 기본 다운로드로 저장됩니다.');
      setGlobalDirHandle(null);
    }
  };

  const handleGenerate = async (request: GeneratePrintPdfRequest) => {
    // 변환 요청 전에 폴더 권한 확보 (user gesture 컨텍스트)
    await ensureFolderReadyForAutoSave();

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
          <h1 className="text-[24px] text-black font-normal">출력대기 JDF+PDF 변환</h1>
          <p className="text-[14px] text-gray-500 mt-0.5">
            출력대기 주문의 이미지를 인쇄용 JDF+PDF로 변환합니다 · 30초 자동 갱신
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
              onClick={() => {
                if (selectedIds.length === 0) return;
                const selected = selectedIds
                  .map((id) => items.find((it) => it.id === id))
                  .filter((it): it is PrintQueueItem => !!it);
                if (selected.length === 0) {
                  toast.error('선택 항목을 찾을 수 없습니다.');
                  return;
                }
                if (selected.length === 1) {
                  openImposition(selected[0]);
                } else {
                  openImpositionMulti(selected);
                }
              }}
              disabled={selectedIds.length === 0}
              className="gap-1.5"
            >
              <FileDown className="h-4 w-4" />
              JDF+PDF 변환{selectedIds.length > 1 ? ` (${selectedIds.length}건)` : ''}
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
          serverAutoSavedPath={pdfSettings.outputPath || undefined}
        />
      )}

      {/* 출력대기 목록 테이블 */}
      <PrintQueueTable
        items={items}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        isLoading={isPending}
        onImposition={openImposition}
        onOrderClick={(orderId) => {
          setQuickEditOrder({ id: orderId });
          setIsQuickEditOpen(true);
        }}
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

      {/* 주문 검증 및 수정 다이얼로그 */}
      <OrderQuickEditDialog
        order={quickEditOrder as Order | null}
        open={isQuickEditOpen}
        onOpenChange={setIsQuickEditOpen}
      />

      {/* 임포지션 설정 다이얼로그 */}
      <ImpositionSettingsDialog
        open={impositionOpen}
        onOpenChange={(v) => {
          setImpositionOpen(v);
          if (!v) {
            setImpositionSeed(null);
            setImpositionAdditionalSeeds([]);
          }
        }}
        seed={impositionSeed || undefined}
        additionalSeeds={impositionAdditionalSeeds}
      />
    </div>
  );
}
