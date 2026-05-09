import {
  useSystemSettings,
  settingsToMap,
} from '@/hooks/use-system-settings';
import {
  IndexOptions,
  DEFAULT_INDEX_OPTIONS,
} from '@/hooks/use-print-pdf';

export const SETTING_KEYS = {
  AUTO_CONVERT: 'print_pdf_auto_convert',
  AUTO_INTERVAL: 'print_pdf_auto_interval',
  INDEX_OPTIONS: 'print_pdf_index_options',
  INDEX_ORDER: 'print_pdf_index_order',
  INCLUDE_BLEED: 'print_pdf_include_bleed',
  INCLUDE_CROP_MARKS: 'print_pdf_include_crop_marks',
  DEFAULT_NUP: 'print_pdf_default_nup',
  BLEED_SIZE: 'print_pdf_bleed_size',
  INDEX_FONT_SIZE: 'print_pdf_index_font_size',
  INDEX_POSITION: 'print_pdf_index_position',
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
  MARK_CROP: 'imposition_mark_crop',
  MARK_BLEED: 'imposition_mark_bleed',
  MARK_REGISTRATION: 'imposition_mark_registration',
  MARK_COLOR_BAR: 'imposition_mark_color_bar',
  MARK_FOLD: 'imposition_mark_fold',
  MARK_JOB_META: 'imposition_mark_job_meta',
} as const;

export const CATEGORY = 'print_pdf';

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
      bleedSize: 3,
      indexFontSize: 6,
      indexPosition: 'bottom' as const,
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
    bleedSize: parseFloat(map[SETTING_KEYS.BLEED_SIZE] || '3'),
    indexFontSize: parseFloat(map[SETTING_KEYS.INDEX_FONT_SIZE] || '6'),
    indexPosition: (map[SETTING_KEYS.INDEX_POSITION] || 'bottom') as 'top' | 'bottom',
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
