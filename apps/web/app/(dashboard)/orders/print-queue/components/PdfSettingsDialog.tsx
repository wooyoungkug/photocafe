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
import { toast } from 'sonner';
import {
  useSystemSettings,
  useBulkUpdateSettings,
  settingsToMap,
} from '@/hooks/use-system-settings';
import { IndexOptions, DEFAULT_INDEX_OPTIONS, usePrinterList } from '@/hooks/use-print-pdf';

interface PdfSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 시스템 설정 키 정의
const SETTING_KEYS = {
  AUTO_CONVERT: 'print_pdf_auto_convert',
  AUTO_INTERVAL: 'print_pdf_auto_interval',
  INDEX_OPTIONS: 'print_pdf_index_options',
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
} as const;

const CATEGORY = 'print_pdf';

const INDEX_OPTION_LABELS: { key: keyof IndexOptions; label: string }[] = [
  { key: 'showDateTime', label: '출력날짜+시간' },
  { key: 'showOrderNumber', label: '주문번호' },
  { key: 'showStudioName', label: '스튜디오명' },
  { key: 'showSpec', label: '규격' },
  { key: 'showPaper', label: '용지명' },
  { key: 'showPageInfo', label: '페이지 정보 (현재/총)' },
  { key: 'showColorMode', label: '인디고도수 (4도/6도)' },
  { key: 'showBinding', label: '제본방법' },
  { key: 'showSide', label: '양면/단면' },
  { key: 'showNup', label: 'Nup' },
];

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
  // 시스템 설정 로드
  const { data: settingsData } = useSystemSettings(CATEGORY);
  const bulkUpdate = useBulkUpdateSettings();

  // 로컬 상태
  const [autoConvert, setAutoConvert] = useState(false);
  const [autoInterval, setAutoInterval] = useState('5');
  const [indexOptions, setIndexOptions] = useState<IndexOptions>({ ...DEFAULT_INDEX_OPTIONS });
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
  const { data: printers = [] } = usePrinterList();
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const [autoPrintName, setAutoPrintName] = useState('');
  const [autoPrintNameIndigo, setAutoPrintNameIndigo] = useState('');
  const [autoPrintNameInkjet, setAutoPrintNameInkjet] = useState('');

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

    // 인덱스 옵션 파싱
    try {
      const saved = map[SETTING_KEYS.INDEX_OPTIONS];
      if (saved) {
        setIndexOptions({ ...DEFAULT_INDEX_OPTIONS, ...JSON.parse(saved) });
      }
    } catch {
      // 파싱 실패 시 기본값 유지
    }
  }, [settingsData]);

  const toggleIndexOption = (key: keyof IndexOptions) => {
    setIndexOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    const settings = [
      { key: SETTING_KEYS.AUTO_CONVERT, value: String(autoConvert), category: CATEGORY, label: '자동변환 사용' },
      { key: SETTING_KEYS.AUTO_INTERVAL, value: autoInterval, category: CATEGORY, label: '자동변환 간격(분)' },
      { key: SETTING_KEYS.INDEX_OPTIONS, value: JSON.stringify(indexOptions), category: CATEGORY, label: '인덱스 표기 항목' },
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
            PDF 출력 설정
          </DialogTitle>
        </DialogHeader>

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
                    출력대기 주문이 들어오면 자동으로 PDF를 생성합니다
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

          {/* ===== 2. 인덱스 표기 항목 설정 ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] text-black font-bold">인덱스 표기 항목</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[12px] text-gray-500">
                PDF 페이지에 표시할 작업 정보를 선택합니다
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {INDEX_OPTION_LABELS.map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`setting-${key}`}
                      checked={indexOptions[key]}
                      onCheckedChange={() => toggleIndexOption(key)}
                    />
                    <Label
                      htmlFor={`setting-${key}`}
                      className="text-[14px] text-black font-normal cursor-pointer"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </div>

              <Separator />

              {/* 인덱스 세부 설정 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[14px] text-black font-normal">폰트 크기</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={indexFontSize}
                      onChange={(e) => setIndexFontSize(e.target.value)}
                      className="h-9 w-20 text-[14px]"
                      min="4"
                      max="12"
                    />
                    <span className="text-[14px] text-gray-500">pt</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[14px] text-black font-normal">인덱스 위치</Label>
                  <Select value={indexPosition} onValueChange={setIndexPosition}>
                    <SelectTrigger className="h-9 text-[14px]">
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
              </div>
            </CardContent>
          </Card>

          {/* ===== 3. PDF 옵션 설정 ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] text-black font-bold">PDF 옵션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 재단여백 */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] text-black font-normal">재단여백 포함</Label>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    이미지 주변에 재단여백(bleed)을 추가합니다
                  </p>
                </div>
                <Switch
                  checked={includeBleed}
                  onCheckedChange={setIncludeBleed}
                />
              </div>

              {includeBleed && (
                <div className="flex items-center gap-3 pl-4">
                  <Label className="text-[14px] text-black font-normal whitespace-nowrap">
                    여백 크기
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={bleedSize}
                      onChange={(e) => setBleedSize(e.target.value)}
                      className="h-9 w-20 text-[14px]"
                      min="1"
                      max="10"
                    />
                    <span className="text-[14px] text-gray-500">mm</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* 재단선 */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] text-black font-normal">재단선 (Crop Mark)</Label>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    ISO 12647 표준 재단선을 네 모서리에 표시합니다
                  </p>
                </div>
                <Switch
                  checked={includeCropMarks}
                  onCheckedChange={setIncludeCropMarks}
                />
              </div>

              {/* 칼라 컨트롤 바 (돔보바) */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] text-black font-normal">칼라 컨트롤 바 (돔보바)</Label>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    CMYK 핀맞춤용 칼라 패치를 이미지 하단에 표시합니다
                  </p>
                </div>
                <Switch
                  checked={includeColorBar}
                  onCheckedChange={setIncludeColorBar}
                />
              </div>

              <Separator />

              {/* 캔버스(용지) 크기 */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] text-black font-normal">캔버스 크기 (용지 크기)</Label>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    PDF 페이지의 전체 용지 크기를 지정합니다
                  </p>
                </div>
                <Switch
                  checked={canvasEnabled}
                  onCheckedChange={setCanvasEnabled}
                />
              </div>

              {canvasEnabled && (
                <div className="flex items-center gap-3 pl-4">
                  <Label className="text-[14px] text-black font-normal whitespace-nowrap">용지</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={canvasWidth}
                      onChange={(e) => setCanvasWidth(e.target.value)}
                      className="h-9 w-20 text-[14px]"
                      min="100"
                      max="1000"
                      placeholder="너비"
                    />
                    <span className="text-[14px] text-gray-500">x</span>
                    <Input
                      type="number"
                      value={canvasHeight}
                      onChange={(e) => setCanvasHeight(e.target.value)}
                      className="h-9 w-20 text-[14px]"
                      min="100"
                      max="1000"
                      placeholder="높이"
                    />
                    <span className="text-[14px] text-gray-500">mm</span>
                  </div>
                  <span className="text-[12px] text-gray-400 whitespace-nowrap">
                    ({(parseFloat(canvasWidth) / 25.4).toFixed(1)}&quot; x {(parseFloat(canvasHeight) / 25.4).toFixed(1)}&quot;)
                  </span>
                </div>
              )}

              {/* 이미지 크기 */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] text-black font-normal">이미지 크기 (출력 크기)</Label>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    이미지를 지정한 크기로 배치합니다 (미사용 시 규격 기준)
                  </p>
                </div>
                <Switch
                  checked={imageSizeEnabled}
                  onCheckedChange={setImageSizeEnabled}
                />
              </div>

              {imageSizeEnabled && (
                <div className="flex items-center gap-3 pl-4">
                  <Label className="text-[14px] text-black font-normal whitespace-nowrap">이미지</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={imageWidth}
                      onChange={(e) => setImageWidth(e.target.value)}
                      className="h-9 w-20 text-[14px]"
                      min="50"
                      max="1000"
                      placeholder="너비"
                    />
                    <span className="text-[14px] text-gray-500">x</span>
                    <Input
                      type="number"
                      value={imageHeight}
                      onChange={(e) => setImageHeight(e.target.value)}
                      className="h-9 w-20 text-[14px]"
                      min="50"
                      max="1000"
                      placeholder="높이"
                    />
                    <span className="text-[14px] text-gray-500">mm</span>
                  </div>
                  <span className="text-[12px] text-gray-400 whitespace-nowrap">
                    ({(parseFloat(imageWidth) / 25.4).toFixed(1)}&quot; x {(parseFloat(imageHeight) / 25.4).toFixed(1)}&quot;)
                  </span>
                </div>
              )}

              <Separator />

              {/* 기본 Nup */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-[14px] text-black font-normal">기본 Nup 배치</Label>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    한 용지에 배치할 이미지 수 (규격별 자동 설정 우선)
                  </p>
                </div>
                <Select value={defaultNup} onValueChange={setDefaultNup}>
                  <SelectTrigger className="w-[140px] h-9 text-[14px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NUP_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* 저장 위치 */}
              <div className="space-y-3">
                {/* 서버 자동 저장 경로 (무인 모드) */}
                <div className="space-y-1.5 p-3 bg-blue-50 border border-blue-200 rounded">
                  <Label className="text-[14px] text-black font-bold">
                    무인 자동 저장 경로 (야간 자동 변환 권장)
                  </Label>
                  <Input
                    placeholder={String.raw`예: Z:\출력팀\Wooceo_출력백업\!2025년\접수대기`}
                    value={outputPath}
                    onChange={(e) => setOutputPath(e.target.value)}
                    className="h-9 text-[14px] bg-white"
                  />
                  <p className="text-[12px] text-gray-600">
                    서버가 이 경로에 <code className="bg-white px-1 rounded">YYMMDD/인디고도수/양면|단면/</code> 구조로 PDF를 직접 저장합니다.<br/>
                    브라우저 팝업/다운로드 대화상자 없이 완전 무인으로 동작합니다.<br/>
                    <strong className="text-blue-700">경로가 설정되면 아래 "로컬 PC 저장"은 무시됩니다.</strong>
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[14px] text-black font-normal">로컬 PC에 저장 (폴백)</Label>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      서버 자동 저장 경로가 비어있을 때만 적용. 브라우저 폴더 선택이 필요합니다.
                    </p>
                  </div>
                  <Switch
                    checked={saveToLocal}
                    onCheckedChange={setSaveToLocal}
                    disabled={!!outputPath}
                  />
                </div>

                {saveToLocal && (
                  <div className="pl-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-[14px]"
                        onClick={async () => {
                          try {
                            if ('showDirectoryPicker' in window) {
                              const handle = await (window as any).showDirectoryPicker({
                                mode: 'readwrite',
                              });
                              setGlobalDirHandle(handle);  // 전역 핸들 저장
                              setLocalDirHandle(handle);  // 컴포넌트 로컬
                              setLocalDirName(handle.name);
                              toast.success(`폴더 선택: ${handle.name}`);
                            } else {
                              toast.error('이 브라우저는 폴더 선택을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요.');
                            }
                          } catch (err: any) {
                            if (err.name !== 'AbortError') {
                              toast.error('폴더 선택 실패');
                            }
                          }
                        }}
                      >
                        폴더 선택
                      </Button>
                      {localDirName && (
                        <span className="text-[14px] text-black font-normal">
                          {localDirName}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-500">
                      Chrome/Edge에서 폴더를 선택하면 PDF가 해당 폴더에 자동 저장됩니다.
                      폴더를 선택하지 않으면 브라우저 기본 다운로드 폴더에 저장됩니다.
                    </p>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>

          {/* ===== 4. 작업지시서 자동 인쇄 ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] text-black font-bold">작업지시서 자동 인쇄</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[14px] text-black font-normal">자동 인쇄 사용</Label>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    PDF 1건이 만들어질 때마다 작업지시서(슬립)를 프린터로 출력합니다
                  </p>
                </div>
                <Switch checked={autoPrintEnabled} onCheckedChange={setAutoPrintEnabled} />
              </div>

              {autoPrintEnabled && (
                <div className="space-y-3 pl-4">
                  {printers.length === 0 && (
                    <p className="text-[12px] text-amber-600 bg-amber-50 px-3 py-2 rounded">
                      설치된 프린터를 찾을 수 없습니다. 프린터를 설치한 후 새로고침 해주세요.
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
              toast.info('임포지션 프리셋은 행 [임포지션] 다이얼로그 상단에서 저장/선택할 수 있습니다.');
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
const IDB_DB_NAME = 'printing114';
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
      isLoaded: false,
    };
  }

  const map = settingsToMap(settingsData);

  let indexOptions = { ...DEFAULT_INDEX_OPTIONS };
  try {
    const saved = map[SETTING_KEYS.INDEX_OPTIONS];
    if (saved) indexOptions = { ...DEFAULT_INDEX_OPTIONS, ...JSON.parse(saved) };
  } catch { /* 기본값 유지 */ }

  return {
    autoConvert: map[SETTING_KEYS.AUTO_CONVERT] === 'true',
    autoInterval: parseInt(map[SETTING_KEYS.AUTO_INTERVAL] || '5', 10),
    indexOptions,
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
    isLoaded: true,
  };
}
