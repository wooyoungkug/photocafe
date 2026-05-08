'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  useSystemSettings,
  useBulkUpdateSettings,
  settingsToMap,
} from '@/hooks/use-system-settings';
import {
  IndexOptions,
  DEFAULT_INDEX_OPTIONS,
  usePrinterList,
  checkPrintAgentRunning,
  fetchAgentWatchConfig,
  saveAgentWatchConfig,
  getAgentSavePath,
  setAgentSavePath as saveAgentSavePathToAgent,
} from '@/hooks/use-print-pdf';
import { PrintAgentStatusStrip } from './print-agent-status';

interface PdfSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 시스템 설정 키 정의
const SETTING_KEYS = {
  AUTO_CONVERT: 'print_pdf_auto_convert',
  AUTO_INTERVAL: 'print_pdf_auto_interval',
  INDEX_OPTIONS: 'print_pdf_index_options',
  INDEX_ORDER: 'print_pdf_index_order',
  INCLUDE_BLEED: 'print_pdf_include_bleed',
  INCLUDE_CROP_MARKS: 'print_pdf_include_crop_marks',
  DEFAULT_NUP: 'print_pdf_default_nup',
  OUTPUT_PATH: 'print_pdf_output_path',
  BLEED_SIZE: 'print_pdf_bleed_size',
  INDEX_FONT_SIZE: 'print_pdf_index_font_size',
  INDEX_POSITION: 'print_pdf_index_position',
  SAVE_TO_LOCAL: 'print_pdf_save_to_local',
  CANVAS_WIDTH: 'print_pdf_canvas_width',
  CANVAS_HEIGHT: 'print_pdf_canvas_height',
  CANVAS_ENABLED: 'print_pdf_canvas_enabled',
  IMAGE_WIDTH: 'print_pdf_image_width',
  IMAGE_HEIGHT: 'print_pdf_image_height',
  IMAGE_SIZE_ENABLED: 'print_pdf_image_size_enabled',
  INCLUDE_COLOR_BAR: 'print_pdf_include_color_bar',
  AUTO_PRINT_ENABLED: 'print_pdf_auto_print_enabled',
  AUTO_PRINT_NAME: 'print_pdf_auto_print_name',
  AUTO_PRINT_NAME_INDIGO: 'print_pdf_auto_print_name_indigo',
  AUTO_PRINT_NAME_INKJET: 'print_pdf_auto_print_name_inkjet',
  // 임포지션 기본 마크 (JDF+PDF 변환 시 초기값)
  MARK_CROP: 'imposition_mark_crop',
  MARK_BLEED: 'imposition_mark_bleed',
  MARK_REGISTRATION: 'imposition_mark_registration',
  MARK_COLOR_BAR: 'imposition_mark_color_bar',
  MARK_FOLD: 'imposition_mark_fold',
  MARK_JOB_META: 'imposition_mark_job_meta',
} as const;

const CATEGORY = 'print_pdf';

export interface IndexOrderItem {
  key: keyof IndexOptions;
  label: string;
  enabled: boolean;
}

export const DEFAULT_INDEX_ORDER: IndexOrderItem[] = [
  { key: 'showSalesRep', label: '영업담당자', enabled: true },
  { key: 'showDateTime', label: '오늘날짜', enabled: true },
  { key: 'showOrderNumber', label: '주문번호', enabled: true },
  { key: 'showStudioName', label: '스튜디오명', enabled: true },
  { key: 'showPaper', label: '용지명+g', enabled: true },
  { key: 'showBinding', label: '제본', enabled: true },
  { key: 'showSide', label: '양면/단면', enabled: true },
  { key: 'showPageInfo', label: '현재페이지/총페이지', enabled: true },
  { key: 'showSpec', label: '규격', enabled: false },
  { key: 'showColorMode', label: '인디고도수 (4도/6도)', enabled: false },
  { key: 'showNup', label: 'Nup', enabled: false },
  { key: 'showImageArea', label: '이미지영역(mm)', enabled: false },
];

/** 저장된 순서 + 기본 순서 머지: 누락 항목은 뒤에 붙이고, 중복 제거 */
export function mergeIndexOrder(
  saved: Array<{ key: string; enabled?: boolean }> | null | undefined,
  fallbackOptions?: Partial<IndexOptions>,
): IndexOrderItem[] {
  const labelByKey = new Map(DEFAULT_INDEX_ORDER.map((i) => [i.key, i.label]));
  const seen = new Set<string>();
  const result: IndexOrderItem[] = [];
  if (Array.isArray(saved)) {
    for (const it of saved) {
      const k = it?.key as keyof IndexOptions;
      if (!k || seen.has(k) || !labelByKey.has(k)) continue;
      seen.add(k);
      result.push({ key: k, label: labelByKey.get(k)!, enabled: !!it?.enabled });
    }
  }
  for (const def of DEFAULT_INDEX_ORDER) {
    if (seen.has(def.key)) continue;
    const enabled = fallbackOptions
      ? (fallbackOptions[def.key] ?? def.enabled)
      : def.enabled;
    result.push({ ...def, enabled });
  }
  return result;
}

const NUP_OPTIONS = [
  { value: '1up', label: '1up (기본)' },
  { value: '2up', label: '2up (2배치)' },
  { value: '4up', label: '4up (4배치)' },
  { value: '6up', label: '6up (6배치)' },
  { value: '9up', label: '9up (9배치)' },
];

const INTERVAL_OPTIONS = [
  { value: '1', label: '1분' },
  { value: '3', label: '3분' },
  { value: '5', label: '5분' },
  { value: '10', label: '10분' },
  { value: '30', label: '30분' },
];

const INDEX_POSITION_OPTIONS = [
  { value: 'bottom', label: '하단 (블리드 영역)' },
  { value: 'top', label: '상단 (블리드 영역)' },
];

export default function PdfSettingsDialog({
  open,
  onOpenChange,
}: PdfSettingsDialogProps) {
  const router = useRouter();
  // 시스템 설정 로드
  const { data: settingsData } = useSystemSettings(CATEGORY);
  const bulkUpdate = useBulkUpdateSettings();

  // 로컬 상태
  const [autoConvert, setAutoConvert] = useState(false);
  const [autoInterval, setAutoInterval] = useState('5');
  const [indexOrder, setIndexOrder] = useState<IndexOrderItem[]>(() =>
    DEFAULT_INDEX_ORDER.map((i) => ({ ...i })),
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [includeBleed, setIncludeBleed] = useState(true);
  const [includeCropMarks, setIncludeCropMarks] = useState(true);
  const [defaultNup, setDefaultNup] = useState('1up');
  const [outputPath, setOutputPath] = useState('');
  const [bleedSize, setBleedSize] = useState('3');
  const [indexFontSize, setIndexFontSize] = useState('6');
  const [indexPosition, setIndexPosition] = useState('bottom');
  const [saveToLocal, setSaveToLocal] = useState(true);
  const [localDirName, setLocalDirName] = useState('');
  const [localDirHandle, setLocalDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [canvasEnabled, setCanvasEnabled] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState('310');
  const [canvasHeight, setCanvasHeight] = useState('450');
  const [imageSizeEnabled, setImageSizeEnabled] = useState(false);
  const [imageWidth, setImageWidth] = useState('297');
  const [imageHeight, setImageHeight] = useState('420');
  const [includeColorBar, setIncludeColorBar] = useState(false);
  // 임포지션 기본 마크 ON/OFF (JDF+PDF 변환 다이얼로그의 초기값으로 사용)
  const [markCrop, setMarkCrop] = useState(true);
  const [markBleed, setMarkBleed] = useState(true);
  const [markRegistration, setMarkRegistration] = useState(true);
  const [markColorBar, setMarkColorBar] = useState(true);
  const [markFold, setMarkFold] = useState(true);
  const [markJobMeta, setMarkJobMeta] = useState(true);
  const { data: printers = [], refetch: refetchPrinters } = usePrinterList();
  const [agentRunning, setAgentRunning] = useState<boolean | null>(null);
  const [agentRetrying, setAgentRetrying] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const [autoPrintName, setAutoPrintName] = useState('');
  const [autoPrintNameIndigo, setAutoPrintNameIndigo] = useState('');
  const [autoPrintNameInkjet, setAutoPrintNameInkjet] = useState('');
  // 폴더 감시 자동 인쇄 (에이전트 로컬 설정)
  const [watchEnabled, setWatchEnabled] = useState(false);
  const [watchFolder, setWatchFolder] = useState('');
  const [watchIndigoPrinter, setWatchIndigoPrinter] = useState('');
  const [watchInkjetPrinter, setWatchInkjetPrinter] = useState('');
  const [watchSaving, setWatchSaving] = useState(false);
  // 에이전트 PDF 저장 경로 (브라우저 권한 무관, 가장 권장)
  // localStorage에 캐시 → 대화상자 열 때 즉시 표시 (에이전트 응답 전에도)
  const LS_AGENT_PATH_KEY = 'photocafe:agent-save-path';
  const [agentSavePath, setAgentSavePath] = useState(
    () => typeof window !== 'undefined' ? (localStorage.getItem('photocafe:agent-save-path') || '') : '',
  );

  // 프린트 에이전트 상태 + watch 설정 로드
  useEffect(() => {
    if (!open) return;
    checkPrintAgentRunning().then((running) => {
      setAgentRunning(running);
      if (running) {
        fetchAgentWatchConfig().then((cfg) => {
          if (!cfg) return;
          setWatchEnabled(cfg.watchEnabled);
          setWatchFolder(cfg.watchFolder);
          setWatchIndigoPrinter(cfg.indigoPrinter);
          setWatchInkjetPrinter(cfg.inkjetPrinter);
        });
        getAgentSavePath().then((path) => {
          if (path) {
            setAgentSavePath(path);
            localStorage.setItem(LS_AGENT_PATH_KEY, path);
          }
        });
      }
    });
  }, [open]);

  const handleSaveAgentPath = async () => {
    const ok = await saveAgentSavePathToAgent(agentSavePath);
    if (ok) {
      localStorage.setItem(LS_AGENT_PATH_KEY, agentSavePath);
      toast.success('에이전트 저장 경로가 설정되었습니다.');
    } else {
      toast.error('에이전트에 연결할 수 없습니다.');
    }
  };

  const handleAgentRecheck = async () => {
    setAgentRetrying(true);
    const ok = await checkPrintAgentRunning();
    setAgentRunning(ok);
    if (ok) {
      refetchPrinters();
      fetchAgentWatchConfig().then((cfg) => {
        if (!cfg) return;
        setWatchEnabled(cfg.watchEnabled);
        setWatchFolder(cfg.watchFolder);
        setWatchIndigoPrinter(cfg.indigoPrinter);
        setWatchInkjetPrinter(cfg.inkjetPrinter);
      });
      getAgentSavePath().then((path) => {
        if (path) {
          setAgentSavePath(path);
          localStorage.setItem(LS_AGENT_PATH_KEY, path);
        }
      });
      toast.success('에이전트 연결 성공! 프린터 목록을 불러옵니다.');
    } else {
      toast.error('에이전트에 연결할 수 없습니다. 에이전트가 실행 중인지 확인해주세요.');
    }
    setAgentRetrying(false);
  };

  // IDB에 저장된 폴더 핸들 복원 (새로고침 내성)
  useEffect(() => {
    restoreGlobalDirHandle().then((handle) => {
      if (handle) {
        setLocalDirHandle(handle);
        setLocalDirName(handle.name);
      }
    });
  }, []);

  // 설정 로드 시 로컬 상태 반영
  useEffect(() => {
    if (!settingsData) return;
    const map = settingsToMap(settingsData);

    setAutoConvert(map[SETTING_KEYS.AUTO_CONVERT] === 'true');
    setAutoInterval(map[SETTING_KEYS.AUTO_INTERVAL] || '5');
    setIncludeBleed(map[SETTING_KEYS.INCLUDE_BLEED] !== 'false');
    setIncludeCropMarks(map[SETTING_KEYS.INCLUDE_CROP_MARKS] !== 'false');
    setDefaultNup(map[SETTING_KEYS.DEFAULT_NUP] || '1up');
    setOutputPath(map[SETTING_KEYS.OUTPUT_PATH] || '');
    setBleedSize(map[SETTING_KEYS.BLEED_SIZE] || '3');
    setIndexFontSize(map[SETTING_KEYS.INDEX_FONT_SIZE] || '6');
    setIndexPosition(map[SETTING_KEYS.INDEX_POSITION] || 'top');
    setSaveToLocal(map[SETTING_KEYS.SAVE_TO_LOCAL] !== 'false');
    setCanvasEnabled(map[SETTING_KEYS.CANVAS_ENABLED] === 'true');
    setCanvasWidth(map[SETTING_KEYS.CANVAS_WIDTH] || '310');
    setCanvasHeight(map[SETTING_KEYS.CANVAS_HEIGHT] || '450');
    setImageSizeEnabled(map[SETTING_KEYS.IMAGE_SIZE_ENABLED] === 'true');
    setImageWidth(map[SETTING_KEYS.IMAGE_WIDTH] || '297');
    setImageHeight(map[SETTING_KEYS.IMAGE_HEIGHT] || '420');
    setIncludeColorBar(map[SETTING_KEYS.INCLUDE_COLOR_BAR] === 'true');
    setAutoPrintEnabled(map[SETTING_KEYS.AUTO_PRINT_ENABLED] === 'true');
    setAutoPrintName(map[SETTING_KEYS.AUTO_PRINT_NAME] || '');
    setAutoPrintNameIndigo(map[SETTING_KEYS.AUTO_PRINT_NAME_INDIGO] || '');
    setAutoPrintNameInkjet(map[SETTING_KEYS.AUTO_PRINT_NAME_INKJET] || '');
    // 마크 기본값 (미설정 시 true)
    setMarkCrop(map[SETTING_KEYS.MARK_CROP] !== 'false');
    setMarkBleed(map[SETTING_KEYS.MARK_BLEED] !== 'false');
    setMarkRegistration(map[SETTING_KEYS.MARK_REGISTRATION] !== 'false');
    setMarkColorBar(map[SETTING_KEYS.MARK_COLOR_BAR] !== 'false');
    setMarkFold(map[SETTING_KEYS.MARK_FOLD] !== 'false');
    setMarkJobMeta(map[SETTING_KEYS.MARK_JOB_META] !== 'false');

    // 인덱스 옵션(legacy) 파싱: 저장된 순서가 없을 때 활성화 상태 추론용
    let parsedOptions: IndexOptions = { ...DEFAULT_INDEX_OPTIONS };
    try {
      const saved = map[SETTING_KEYS.INDEX_OPTIONS];
      if (saved) {
        parsedOptions = { ...DEFAULT_INDEX_OPTIONS, ...JSON.parse(saved) };
      }
    } catch {
      // 파싱 실패 시 기본값 유지
    }

    // 인덱스 순서 + 활성화 파싱 (저장된 순서가 없으면 옵션값 기반으로 머지)
    try {
      const savedOrder = map[SETTING_KEYS.INDEX_ORDER];
      const parsed = savedOrder ? JSON.parse(savedOrder) : null;
      setIndexOrder(mergeIndexOrder(parsed, parsedOptions));
    } catch {
      setIndexOrder(mergeIndexOrder(null, parsedOptions));
    }
  }, [settingsData]);

  const toggleOrderItem = (idx: number) => {
    setIndexOrder((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], enabled: !next[idx].enabled };
      return next;
    });
  };

  const moveOrderItem = (idx: number, direction: 'up' | 'down') => {
    const to = direction === 'up' ? idx - 1 : idx + 1;
    setIndexOrder((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  };

  const handleOrderDragStart = (idx: number) => setDragIdx(idx);
  const handleOrderDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setIndexOrder((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(dragIdx, 1);
      next.splice(idx, 0, dragged);
      return next;
    });
    setDragIdx(idx);
  };
  const handleOrderDragEnd = () => setDragIdx(null);

  const handleSave = () => {
    // 순서 + 활성화 상태로부터 indexOptions 객체 재구성 (legacy 호환)
    const optionsFromOrder: IndexOptions = { ...DEFAULT_INDEX_OPTIONS };
    for (const it of indexOrder) {
      optionsFromOrder[it.key] = it.enabled;
    }
    const orderPayload = indexOrder.map((i) => ({ key: i.key, enabled: i.enabled }));

    const settings = [
      { key: SETTING_KEYS.AUTO_CONVERT, value: String(autoConvert), category: CATEGORY, label: '자동변환 사용' },
      { key: SETTING_KEYS.AUTO_INTERVAL, value: autoInterval, category: CATEGORY, label: '자동변환 간격(분)' },
      { key: SETTING_KEYS.INDEX_OPTIONS, value: JSON.stringify(optionsFromOrder), category: CATEGORY, label: '인덱스 표기 항목' },
      { key: SETTING_KEYS.INDEX_ORDER, value: JSON.stringify(orderPayload), category: CATEGORY, label: '인덱스 표기 순서' },
      { key: SETTING_KEYS.INCLUDE_BLEED, value: String(includeBleed), category: CATEGORY, label: '재단여백 포함' },
      { key: SETTING_KEYS.INCLUDE_CROP_MARKS, value: String(includeCropMarks), category: CATEGORY, label: '재단선 표시' },
      { key: SETTING_KEYS.DEFAULT_NUP, value: defaultNup, category: CATEGORY, label: '기본 Nup' },
      { key: SETTING_KEYS.OUTPUT_PATH, value: outputPath, category: CATEGORY, label: 'PDF 저장경로' },
      { key: SETTING_KEYS.BLEED_SIZE, value: bleedSize, category: CATEGORY, label: '재단여백 크기(mm)' },
      { key: SETTING_KEYS.INDEX_FONT_SIZE, value: indexFontSize, category: CATEGORY, label: '인덱스 폰트크기(pt)' },
      { key: SETTING_KEYS.INDEX_POSITION, value: indexPosition, category: CATEGORY, label: '인덱스 위치' },
      { key: SETTING_KEYS.SAVE_TO_LOCAL, value: String(saveToLocal), category: CATEGORY, label: '로컬 PC 저장' },
      { key: SETTING_KEYS.CANVAS_ENABLED, value: String(canvasEnabled), category: CATEGORY, label: '캔버스 크기 사용' },
      { key: SETTING_KEYS.CANVAS_WIDTH, value: canvasWidth, category: CATEGORY, label: '캔버스 너비(mm)' },
      { key: SETTING_KEYS.CANVAS_HEIGHT, value: canvasHeight, category: CATEGORY, label: '캔버스 높이(mm)' },
      { key: SETTING_KEYS.IMAGE_SIZE_ENABLED, value: String(imageSizeEnabled), category: CATEGORY, label: '이미지 크기 지정' },
      { key: SETTING_KEYS.IMAGE_WIDTH, value: imageWidth, category: CATEGORY, label: '이미지 너비(mm)' },
      { key: SETTING_KEYS.IMAGE_HEIGHT, value: imageHeight, category: CATEGORY, label: '이미지 높이(mm)' },
      { key: SETTING_KEYS.INCLUDE_COLOR_BAR, value: String(includeColorBar), category: CATEGORY, label: '칼라 컨트롤 바' },
      { key: SETTING_KEYS.AUTO_PRINT_ENABLED, value: String(autoPrintEnabled), category: CATEGORY, label: '작업지시서 자동 인쇄' },
      { key: SETTING_KEYS.AUTO_PRINT_NAME, value: autoPrintName, category: CATEGORY, label: '자동 인쇄 프린터명' },
      { key: SETTING_KEYS.AUTO_PRINT_NAME_INDIGO, value: autoPrintNameIndigo === '__none__' ? '' : autoPrintNameIndigo, category: CATEGORY, label: '인디고 프린터명' },
      { key: SETTING_KEYS.AUTO_PRINT_NAME_INKJET, value: autoPrintNameInkjet === '__none__' ? '' : autoPrintNameInkjet, category: CATEGORY, label: '잉크젯 프린터명' },
      // 임포지션 기본 마크
      { key: SETTING_KEYS.MARK_CROP, value: String(markCrop), category: CATEGORY, label: '임포지션 기본 마크: 재단선' },
      { key: SETTING_KEYS.MARK_BLEED, value: String(markBleed), category: CATEGORY, label: '임포지션 기본 마크: 블리드' },
      { key: SETTING_KEYS.MARK_REGISTRATION, value: String(markRegistration), category: CATEGORY, label: '임포지션 기본 마크: 레지' },
      { key: SETTING_KEYS.MARK_COLOR_BAR, value: String(markColorBar), category: CATEGORY, label: '임포지션 기본 마크: 컬러바' },
      { key: SETTING_KEYS.MARK_FOLD, value: String(markFold), category: CATEGORY, label: '임포지션 기본 마크: 중간재단선' },
      { key: SETTING_KEYS.MARK_JOB_META, value: String(markJobMeta), category: CATEGORY, label: '임포지션 기본 마크: JobID/스튜디오명' },
    ];

    bulkUpdate.mutate(settings, {
      onSuccess: () => {
        toast.success('PDF 설정이 저장되었습니다.');
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[18px] text-black font-bold">
            JDF+PDF 출력 설정
          </DialogTitle>
        </DialogHeader>

        <PrintAgentStatusStrip
          agentRunning={agentRunning}
          rechecking={agentRetrying}
          onRecheck={handleAgentRecheck}
        />

        <div className="space-y-5 py-2">

          {/* ===== 1. 자동변환 설정 ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] text-black font-bold">자동변환</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] text-black font-normal">자동변환 사용</Label>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    출력대기 주문이 들어오면 자동으로 JDF+PDF를 생성합니다
                  </p>
                </div>
                <Switch
                  checked={autoConvert}
                  onCheckedChange={setAutoConvert}
                />
              </div>

              {autoConvert && (
                <div className="flex items-center gap-3">
                  <Label className="text-[14px] text-black font-normal whitespace-nowrap">
                    변환 주기
                  </Label>
                  <Select value={autoInterval} onValueChange={setAutoInterval}>
                    <SelectTrigger className="w-[120px] h-9 text-[14px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVAL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[12px] text-gray-500">마다 자동 실행</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== 1-2. 인덱스 표기 항목 ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] text-black font-bold">인덱스 표기 항목</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[12px] text-gray-500">
                JDF+PDF 변환 시 인쇄물 외곽에 표시되는 인덱스 항목입니다. 체크로 표시 여부를, 드래그/화살표로 순서를 변경합니다.
              </p>
              <div className="border rounded-lg divide-y">
                {indexOrder.map((item, idx) => (
                  <div
                    key={item.key}
                    draggable
                    onDragStart={() => handleOrderDragStart(idx)}
                    onDragOver={(e) => handleOrderDragOver(e, idx)}
                    onDragEnd={handleOrderDragEnd}
                    className={`flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing transition-colors ${
                      dragIdx === idx ? 'bg-blue-50' : 'hover:bg-gray-50'
                    } ${!item.enabled ? 'opacity-50' : ''}`}
                  >
                    <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-[12px] text-gray-400 w-5 text-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <Checkbox
                      checked={item.enabled}
                      onCheckedChange={() => toggleOrderItem(idx)}
                    />
                    <Label
                      className="text-[14px] text-black font-normal flex-1 cursor-pointer"
                      onClick={() => toggleOrderItem(idx)}
                    >
                      {item.label}
                    </Label>
                    <div className="flex flex-col gap-0">
                      <button
                        type="button"
                        title="위로 이동"
                        onClick={() => moveOrderItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 text-gray-400 hover:text-black disabled:opacity-30"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="아래로 이동"
                        onClick={() => moveOrderItem(idx, 'down')}
                        disabled={idx === indexOrder.length - 1}
                        className="p-0.5 text-gray-400 hover:text-black disabled:opacity-30"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {indexOrder.some((i) => i.enabled) && (
                <div className="px-3 py-2 bg-gray-100 rounded text-[11px] text-gray-600 font-mono break-all">
                  {indexOrder.filter((i) => i.enabled).map((i) => i.label).join(' | ')}
                </div>
              )}

              <Separator />

              <div className="flex items-center gap-3">
                <Label className="text-[14px] text-black font-normal whitespace-nowrap">
                  인덱스 위치
                </Label>
                <Select value={indexPosition} onValueChange={setIndexPosition}>
                  <SelectTrigger className="w-[200px] h-9 text-[14px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDEX_POSITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-[14px] text-black font-normal whitespace-nowrap">
                  폰트 크기
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={indexFontSize}
                    onChange={(e) => setIndexFontSize(e.target.value)}
                    className="h-9 w-20 text-[14px]"
                    min="4"
                    max="24"
                    step="0.5"
                  />
                  <span className="text-[14px] text-gray-500">pt</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ===== 2. 임포지션 기본 마크 ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] text-black font-bold">임포지션 기본 마크</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[12px] text-gray-500">
                JDF+PDF 변환 다이얼로그가 열릴 때 기본으로 체크되는 마크를 지정합니다. 개별 변환 시 변경 가능합니다.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { checked: markCrop, set: setMarkCrop, label: '재단선' },
                  { checked: markBleed, set: setMarkBleed, label: '블리드' },
                  { checked: markRegistration, set: setMarkRegistration, label: '레지스트레이션' },
                  { checked: markColorBar, set: setMarkColorBar, label: '컬러바 (CMYK/RGB)' },
                  { checked: markFold, set: setMarkFold, label: '중간 재단선 (Nup≥2)' },
                  { checked: markJobMeta, set: setMarkJobMeta, label: 'JobID/스튜디오명' },
                ].map((m) => (
                  <label key={m.label} className="flex items-center gap-2 text-[14px] text-black font-normal cursor-pointer">
                    <Checkbox checked={m.checked} onCheckedChange={(v) => m.set(!!v)} />
                    {m.label}
                  </label>
                ))}
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Label className="text-[14px] text-black font-normal whitespace-nowrap">
                  기본 블리드 크기
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={bleedSize}
                    onChange={(e) => setBleedSize(e.target.value)}
                    className="h-9 w-20 text-[14px]"
                    min="0"
                    max="10"
                    step="0.5"
                  />
                  <span className="text-[14px] text-gray-500">mm</span>
                </div>
                <span className="text-[12px] text-gray-400">
                  임포지션 프리셋의 bleed 값이 우선 적용됩니다.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ===== 3. 저장 위치 ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] text-black font-bold">저장 위치</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* 에이전트 저장 경로 (권장) */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[14px] text-black font-bold">에이전트 저장 경로</Label>
                  <span className="text-[11px] text-green-600 font-medium">✅ 권장</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={String.raw`예: C:\PDF저장  또는  Z:\출력팀\접수대기`}
                    value={agentSavePath}
                    onChange={(e) => setAgentSavePath(e.target.value)}
                    className="h-9 text-[14px] flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 whitespace-nowrap"
                    onClick={handleSaveAgentPath}
                    disabled={!agentRunning}
                  >
                    적용
                  </Button>
                </div>
                <p className="text-[12px] text-gray-500">
                  {agentRunning
                    ? '에이전트 실행 중 — 브라우저 팝업 없이 이 폴더에 저장됩니다.'
                    : '에이전트 미실행 — run-print-agent.bat을 먼저 실행하세요.'}
                </p>
              </div>

              <Separator />

              {/* 무인 자동 저장 경로 */}
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">무인 자동 저장 경로</Label>
                <Input
                  placeholder={String.raw`예: Z:\출력팀\Wooceo_출력백업\!2025년\접수대기`}
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  className="h-9 text-[14px]"
                />
                {/^[A-Za-z]:[/\\]/.test(outputPath) && (
                  <p className="text-[12px] text-red-600">
                    ⚠️ C:\, Z:\ 경로는 서버(Railway)에서 접근 불가 — 위 에이전트 경로를 사용하세요.
                  </p>
                )}
              </div>

              <Separator />

              {/* 로컬 PC 저장 (폴백) */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] text-black font-normal">로컬 PC에 저장 (폴백)</Label>
                  <p className="text-[12px] text-gray-500 mt-0.5">에이전트 미사용 시 브라우저 폴더 선택</p>
                </div>
                <Switch checked={saveToLocal} onCheckedChange={setSaveToLocal} />
              </div>

              {saveToLocal && (
                <div className="pl-4 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[14px]"
                    onClick={async () => {
                      try {
                        if ('showDirectoryPicker' in window) {
                          const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
                          setGlobalDirHandle(handle);
                          setLocalDirHandle(handle);
                          setLocalDirName(handle.name);
                          toast.success(`폴더 선택: ${handle.name}`);
                        } else {
                          toast.error('Chrome 또는 Edge를 사용해주세요.');
                        }
                      } catch (err: any) {
                        if (err.name !== 'AbortError') toast.error('폴더 선택 실패');
                      }
                    }}
                  >
                    폴더 선택
                  </Button>
                  {localDirName && <span className="text-[14px] text-black font-normal">{localDirName}</span>}
                </div>
              )}

            </CardContent>
          </Card>

          {/* ===== 4. PDF 파일 자동 인쇄 (에이전트 폴더 감시) ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] text-black font-bold">
                인쇄용 PDF 자동 인쇄 (폴더 감시)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[12px] text-gray-600 leading-relaxed">
                <strong className="text-black">작업지시서(슬립)는 여기가 아닙니다.</strong> 아래「작업지시서 자동 인쇄」에서 따로 켭니다.
              </p>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                여기서 말하는 PDF는 <strong className="text-black">출력대기에서 JDF+PDF 변환으로 만들어진 인쇄용 PDF 파일</strong>입니다.
                PC에 둔 프린트 에이전트가 감시 폴더를 보다가 <strong className="text-black">그 PDF가 새로 생기면</strong> 곧바로 지정한
                인디고/잉크젯 프린터로 인쇄합니다. 위「무인 자동 저장 경로」와 <strong className="text-black">같은 경로</strong>를 넣으면
                변환 직후 곧바로 출력됩니다.
              </p>

              {agentRunning === false && (
                <div className="text-[12px] bg-amber-50 border border-amber-200 px-3 py-2.5 rounded">
                  <p className="text-amber-700 font-medium">에이전트가 실행 중이 아닙니다.</p>
                  <p className="text-amber-600 mt-0.5">
                    <span className="font-mono bg-amber-100 px-1 rounded">tools/print-agent/run-print-agent.bat</span> 를 실행한 뒤 연결 재시도를 눌러주세요.
                  </p>
                </div>
              )}

              {agentRunning !== false && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-[14px] text-black font-normal">폴더 감시 자동 인쇄</Label>
                      <p className="text-[12px] text-gray-500 mt-0.5">
                        활성화하면 에이전트 재시작 시에도 자동으로 감시를 재개합니다.
                      </p>
                    </div>
                    <Switch checked={watchEnabled} onCheckedChange={setWatchEnabled} />
                  </div>

                  {watchEnabled && (
                    <div className="space-y-3 pl-4">
                      <div className="space-y-1.5">
                        <Label className="text-[14px] text-black font-normal">감시 폴더 경로</Label>
                        <Input
                          placeholder={String.raw`예: Z:\출력팀\Wooceo_출력백업\!2025년\접수대기`}
                          value={watchFolder}
                          onChange={(e) => setWatchFolder(e.target.value)}
                          className="h-9 text-[14px]"
                        />
                        <p className="text-[12px] text-gray-500">
                          하위 폴더(날짜/인디고/단면 등)까지 재귀적으로 감시합니다.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[14px] text-black font-normal">인디고 프린터 (4도/6도)</Label>
                        <Select value={watchIndigoPrinter || '__none__'} onValueChange={(v) => setWatchIndigoPrinter(v === '__none__' ? '' : v)}>
                          <SelectTrigger className="h-9 text-[14px]">
                            <SelectValue placeholder="프린터 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">미지정</SelectItem>
                            {printers.map((p) => (
                              <SelectItem key={`watch-indigo-${p.name}`} value={p.name}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[14px] text-black font-normal">잉크젯 프린터</Label>
                        <Select value={watchInkjetPrinter || '__none__'} onValueChange={(v) => setWatchInkjetPrinter(v === '__none__' ? '' : v)}>
                          <SelectTrigger className="h-9 text-[14px]">
                            <SelectValue placeholder="프린터 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">미지정</SelectItem>
                            {printers.map((p) => (
                              <SelectItem key={`watch-inkjet-${p.name}`} value={p.name}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[12px] text-gray-500">
                        폴더명에 "잉크젯"이 포함된 파일은 잉크젯 프린터로, 나머지는 인디고 프린터로 전송합니다.
                      </p>
                    </div>
                  )}

                  <p className="text-[12px] text-gray-500 border-t pt-3">
                    <strong className="text-black">「감시 설정을 PC에 저장」</strong>은 PDF 파일을 서버에 올리는 기능이 아닙니다.
                    감시 켜기/끄기, 감시 폴더 경로, 인디고·잉크젯 프린터 이름만{' '}
                    <strong className="text-black">이 PC에서 돌아가는 프린트 에이전트 설정</strong>에 기록합니다.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={watchSaving || agentRunning !== true}
                    className="text-[14px]"
                    onClick={async () => {
                      setWatchSaving(true);
                      const ok = await saveAgentWatchConfig({
                        watchEnabled,
                        watchFolder,
                        indigoPrinter: watchIndigoPrinter,
                        inkjetPrinter: watchInkjetPrinter,
                      });
                      setWatchSaving(false);
                      if (ok) {
                        toast.success('PC 에이전트에 감시 설정이 저장되었습니다.');
                      } else {
                        toast.error('저장 실패. 에이전트가 실행 중인지 확인해주세요.');
                      }
                    }}
                  >
                    {watchSaving ? '저장 중...' : '감시 설정을 PC에 저장'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* ===== 6. 작업지시서 자동 인쇄 ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] text-black font-bold">작업지시서 자동 인쇄</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[12px] text-gray-600 leading-relaxed">
                위「인쇄용 PDF 자동 인쇄」와 별개입니다. <strong className="text-black">주문용 인쇄 PDF가 아니라</strong> 바코드·썸네일이
                들어간 <strong className="text-black">작업지시서(슬립) A4</strong>를 프린터로 냅니다.
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] text-black font-normal">자동 인쇄 사용</Label>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    인쇄용 PDF 1건이 만들어질 때마다 작업지시서(슬립)를 한 장 인쇄합니다.
                  </p>
                </div>
                <Switch checked={autoPrintEnabled} onCheckedChange={setAutoPrintEnabled} />
              </div>

              {autoPrintEnabled && (
                <div className="space-y-3 pl-4">
                  {agentRunning === false && (
                    <div className="text-[12px] bg-amber-50 border border-amber-200 px-3 py-2.5 rounded space-y-1.5">
                      <p className="text-amber-700 font-medium">로컬 프린트 에이전트가 실행되지 않았습니다.</p>
                      <p className="text-amber-600">
                        PC에서 <span className="font-mono bg-amber-100 px-1 rounded">tools/print-agent/print-agent.js</span> 를 실행하면 프린터 목록을 불러올 수 있습니다.
                      </p>
                      <p className="text-amber-500">명령어: <span className="font-mono bg-amber-100 px-1 rounded">node tools/print-agent/print-agent.js</span></p>
                      <button
                        type="button"
                        disabled={agentRetrying}
                        className="text-[11px] text-amber-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleAgentRecheck()}
                      >
                        {agentRetrying ? '확인 중...' : '에이전트 연결 재시도'}
                      </button>
                    </div>
                  )}
                  {agentRunning === true && printers.length === 0 && (
                    <p className="text-[12px] text-amber-600 bg-amber-50 px-3 py-2 rounded">
                      에이전트가 실행 중이지만 설치된 프린터가 없습니다.
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-[14px] text-black font-normal">인디고 프린터 (4도/6도)</Label>
                    <Select value={autoPrintNameIndigo} onValueChange={setAutoPrintNameIndigo}>
                      <SelectTrigger className="h-9 text-[14px]">
                        <SelectValue placeholder="프린터를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">미지정 (공통 프린터 사용)</SelectItem>
                        {printers.map((p) => (
                          <SelectItem key={`indigo-${p.name}`} value={p.name}>
                            {p.name} {p.driver ? `(${p.driver})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[14px] text-black font-normal">잉크젯 프린터</Label>
                    <Select value={autoPrintNameInkjet} onValueChange={setAutoPrintNameInkjet}>
                      <SelectTrigger className="h-9 text-[14px]">
                        <SelectValue placeholder="프린터를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">미지정 (공통 프린터 사용)</SelectItem>
                        {printers.map((p) => (
                          <SelectItem key={`inkjet-${p.name}`} value={p.name}>
                            {p.name} {p.driver ? `(${p.driver})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[14px] text-black font-normal">공통 프린터 (미지정 시 사용)</Label>
                    <Select value={autoPrintName || '__default__'} onValueChange={(v) => setAutoPrintName(v === '__default__' ? '' : v)}>
                      <SelectTrigger className="h-9 text-[14px]">
                        <SelectValue placeholder="Windows 기본 프린터" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Windows 기본 프린터</SelectItem>
                        {printers.map((p) => (
                          <SelectItem key={`common-${p.name}`} value={p.name}>
                            {p.name} {p.driver ? `(${p.driver})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[12px] text-gray-500">
                    인디고/잉크젯 프린터가 미지정이면 공통 프린터로 출력됩니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        <DialogFooter>
          <Button
            variant="link"
            type="button"
            className="mr-auto text-[14px] text-black font-normal"
            onClick={() => {
              onOpenChange(false);
              router.push('/settings/imposition-presets');
            }}
          >
            임포지션 프리셋 관리 →
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={bulkUpdate.isPending}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={bulkUpdate.isPending}>
            {bulkUpdate.isPending ? '저장 중...' : '설정 저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 시스템 설정에서 PDF 설정을 읽어 기본값으로 사용하는 유틸
 */
// 로컬 폴더 핸들을 전역 + IndexedDB로 영속화 (새로고침 내성)
const IDB_DB_NAME = 'photocafe';
const IDB_STORE = 'pdf-folder-handle';
const IDB_KEY = 'selected';
let _localDirHandle: FileSystemDirectoryHandle | null = null;

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPutHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGetHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIdb();
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle;
  } catch {
    return null;
  }
}

async function idbClearHandle(): Promise<void> {
  try {
    const db = await openIdb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch { /* ignore */ }
}

/** 권한 상태만 확인 (passive). 'granted' | 'prompt' | 'denied' */
export async function queryHandlePermission(
  handle: FileSystemDirectoryHandle,
): Promise<'granted' | 'prompt' | 'denied'> {
  try {
    const opts = { mode: 'readwrite' as const };
    const anyHandle = handle as any;
    const current = await anyHandle.queryPermission?.(opts);
    return (current as any) || 'prompt';
  } catch {
    return 'denied';
  }
}

/** readwrite 권한 요청 (user gesture 필요). false면 거부. */
export async function requestHandlePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const opts = { mode: 'readwrite' as const };
    const anyHandle = handle as any;
    const current = await anyHandle.queryPermission?.(opts);
    if (current === 'granted') return true;
    const requested = await anyHandle.requestPermission?.(opts);
    return requested === 'granted';
  } catch {
    return false;
  }
}

export function setGlobalDirHandle(handle: FileSystemDirectoryHandle | null) {
  _localDirHandle = handle;
  if (typeof window === 'undefined') return;
  if (handle) {
    idbPutHandle(handle).catch((err) => console.warn('IDB put handle failed:', err));
  } else {
    idbClearHandle();
  }
}

export function getGlobalDirHandle(): FileSystemDirectoryHandle | null {
  return _localDirHandle;
}

/** 페이지 로드 시 IndexedDB에서 핸들 복원 (권한은 이 시점에 재요청 불가 → 실제 쓰기 직전에 재요청) */
export async function restoreGlobalDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof window === 'undefined') return null;
  if (_localDirHandle) return _localDirHandle;
  const handle = await idbGetHandle();
  if (handle) _localDirHandle = handle;
  return _localDirHandle;
}

/**
 * 로컬 PC에 PDF blob을 저장하는 유틸
 * - subfolder 지정 시 선택 폴더 아래 자동으로 하위 폴더를 생성하여 분리 저장
 */
export async function saveToLocalFolder(
  blob: Blob,
  fileName: string,
  dirHandle?: FileSystemDirectoryHandle | null,
  subfolder?: string,
): Promise<boolean> {
  let handle = dirHandle || _localDirHandle;
  if (!handle) {
    handle = await restoreGlobalDirHandle();
  }

  if (handle) {
    // passive 체크만 수행 (폴링 컨텍스트에선 requestPermission 불가)
    const perm = await queryHandlePermission(handle);
    if (perm === 'granted') {
      try {
        // subfolder: "260418/양면" 같은 계층 경로 지원 → 각 단계별로 생성
        let targetDir: FileSystemDirectoryHandle = handle;
        if (subfolder) {
          const segments = subfolder
            .split(/[\\/]/)
            .map((s) => s.replace(/[<>:"|?*\x00-\x1f]/g, '_').trim())
            .filter(Boolean);
          for (const seg of segments) {
            targetDir = await (targetDir as any).getDirectoryHandle(seg, { create: true });
          }
        }
        const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (err) {
        console.error('로컬 폴더 저장 실패, 다운로드로 전환:', err);
      }
    } else {
      console.warn(`폴더 권한 상태: ${perm} → 수동 저장 버튼을 사용해주세요.`);
    }
  }

  // fallback: 브라우저 다운로드
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

export function usePdfSettings() {
  const { data: settingsData } = useSystemSettings(CATEGORY);

  if (!settingsData) {
    return {
      autoConvert: false,
      autoInterval: 5,
      indexOptions: { ...DEFAULT_INDEX_OPTIONS },
      indexOrder: DEFAULT_INDEX_ORDER.map((i) => ({ ...i })),
      includeBleed: true,
      includeCropMarks: true,
      includeColorBar: false,
      defaultNup: '1up',
      outputPath: '',
      bleedSize: 3,
      indexFontSize: 6,
      indexPosition: 'bottom' as const,
      saveToLocal: true,
      canvasEnabled: false,
      canvasWidth: 310,
      canvasHeight: 450,
      imageSizeEnabled: false,
      imageWidth: 297,
      imageHeight: 420,
      markCrop: true,
      markBleed: true,
      markRegistration: true,
      markColorBar: true,
      markFold: true,
      markJobMeta: true,
      autoPrintEnabled: false,
      autoPrintName: '',
      autoPrintNameIndigo: '',
      autoPrintNameInkjet: '',
      isLoaded: false,
    };
  }

  const map = settingsToMap(settingsData);

  let indexOptions = { ...DEFAULT_INDEX_OPTIONS };
  try {
    const saved = map[SETTING_KEYS.INDEX_OPTIONS];
    if (saved) indexOptions = { ...DEFAULT_INDEX_OPTIONS, ...JSON.parse(saved) };
  } catch { /* 기본값 유지 */ }

  let indexOrder: IndexOrderItem[];
  try {
    const savedOrder = map[SETTING_KEYS.INDEX_ORDER];
    const parsed = savedOrder ? JSON.parse(savedOrder) : null;
    indexOrder = mergeIndexOrder(parsed, indexOptions);
  } catch {
    indexOrder = mergeIndexOrder(null, indexOptions);
  }
  // 순서가 저장돼 있으면 옵션 ON/OFF도 순서 기준으로 일관 적용
  for (const it of indexOrder) {
    indexOptions[it.key] = it.enabled;
  }

  return {
    autoConvert: map[SETTING_KEYS.AUTO_CONVERT] === 'true',
    autoInterval: parseInt(map[SETTING_KEYS.AUTO_INTERVAL] || '5', 10),
    indexOptions,
    indexOrder,
    includeBleed: map[SETTING_KEYS.INCLUDE_BLEED] !== 'false',
    includeCropMarks: map[SETTING_KEYS.INCLUDE_CROP_MARKS] !== 'false',
    includeColorBar: map[SETTING_KEYS.INCLUDE_COLOR_BAR] === 'true',
    defaultNup: map[SETTING_KEYS.DEFAULT_NUP] || '1up',
    outputPath: map[SETTING_KEYS.OUTPUT_PATH] || '',
    bleedSize: parseFloat(map[SETTING_KEYS.BLEED_SIZE] || '3'),
    indexFontSize: parseFloat(map[SETTING_KEYS.INDEX_FONT_SIZE] || '6'),
    indexPosition: (map[SETTING_KEYS.INDEX_POSITION] || 'bottom') as 'top' | 'bottom' | 'bottom',
    saveToLocal: map[SETTING_KEYS.SAVE_TO_LOCAL] !== 'false',
    canvasEnabled: map[SETTING_KEYS.CANVAS_ENABLED] === 'true',
    canvasWidth: parseFloat(map[SETTING_KEYS.CANVAS_WIDTH] || '310'),
    canvasHeight: parseFloat(map[SETTING_KEYS.CANVAS_HEIGHT] || '450'),
    imageSizeEnabled: map[SETTING_KEYS.IMAGE_SIZE_ENABLED] === 'true',
    imageWidth: parseFloat(map[SETTING_KEYS.IMAGE_WIDTH] || '297'),
    imageHeight: parseFloat(map[SETTING_KEYS.IMAGE_HEIGHT] || '420'),
    markCrop: map[SETTING_KEYS.MARK_CROP] !== 'false',
    markBleed: map[SETTING_KEYS.MARK_BLEED] !== 'false',
    markRegistration: map[SETTING_KEYS.MARK_REGISTRATION] !== 'false',
    markColorBar: map[SETTING_KEYS.MARK_COLOR_BAR] !== 'false',
    markFold: map[SETTING_KEYS.MARK_FOLD] !== 'false',
    markJobMeta: map[SETTING_KEYS.MARK_JOB_META] !== 'false',
    autoPrintEnabled: map[SETTING_KEYS.AUTO_PRINT_ENABLED] === 'true',
    autoPrintName: map[SETTING_KEYS.AUTO_PRINT_NAME] || '',
    autoPrintNameIndigo: map[SETTING_KEYS.AUTO_PRINT_NAME_INDIGO] || '',
    autoPrintNameInkjet: map[SETTING_KEYS.AUTO_PRINT_NAME_INKJET] || '',
    isLoaded: true,
  };
}
