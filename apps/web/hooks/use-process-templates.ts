"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useSystemSettings,
  useBulkUpdateSettings,
  settingsToMap,
} from "@/hooks/use-system-settings";

// 상품 유형 정의
export const PRODUCT_TYPES = {
  compressed_album: "압축앨범",
  pictorial_album: "화보앨범 (스타화보)",
  original_compressed: "원판압축",
  photobook: "포토북",
  acrylic_frame: "아크릴액자",
  double_mat_frame: "더블마트액자",
  copper_plate: "동판",
  single_print: "단품출력",
} as const;

export type ProductType = keyof typeof PRODUCT_TYPES;

// 공정 단계 코드 (사용 가능한 공정 목록)
export const PROCESS_STEP_OPTIONS = {
  order_receipt: { name: "수주", department: "CS" },
  file_correction: { name: "파일보정", department: "DESIGN" },
  design_review: { name: "도안확인", department: "DESIGN" },
  indigo_print: { name: "인디고출력", department: "PROD" },
  inkjet_print: { name: "잉크젯출력", department: "PROD" },
  coating: { name: "코팅", department: "PROD" },
  cutting: { name: "재단", department: "PROD" },
  compressed_binding: { name: "압축제본", department: "PROD" },
  hardcover_binding: { name: "양장제본", department: "PROD" },
  softcover_binding: { name: "무선제본", department: "PROD" },
  cover_making: { name: "커버제작", department: "PROD" },
  acrylic_processing: { name: "아크릴가공", department: "PROD" },
  wood_frame_assembly: { name: "원목프레임조립", department: "PROD" },
  assembly: { name: "조립", department: "PROD" },
  laser_engraving: { name: "레이저각인", department: "PROD" },
  packaging: { name: "포장", department: "PROD" },
  qc: { name: "QC", department: "PROD" },
  shipping: { name: "출하", department: "CS" },
} as const;

export type ProcessStepCode = keyof typeof PROCESS_STEP_OPTIONS;

// 부서 정보
export const DEPARTMENTS = {
  CS: { name: "CS", color: "bg-blue-100 text-blue-700" },
  DESIGN: { name: "디자인", color: "bg-purple-100 text-purple-700" },
  PROD: { name: "생산", color: "bg-green-100 text-green-700" },
} as const;

// 공정 단계 타입
export interface ProcessStep {
  stepOrder: number;
  stepCode: ProcessStepCode;
  stepName: string;
  department: string;
  estimatedHours?: number;
  isCheckpoint?: boolean;
}

// 기본 공정 템플릿 (하드코딩된 기본값)
export const DEFAULT_PROCESS_TEMPLATES: Record<ProductType, ProcessStep[]> = {
  compressed_album: [
    { stepOrder: 1, stepCode: "order_receipt", stepName: "수주", department: "CS" },
    { stepOrder: 2, stepCode: "file_correction", stepName: "파일보정", department: "DESIGN" },
    { stepOrder: 3, stepCode: "indigo_print", stepName: "인디고출력", department: "PROD" },
    { stepOrder: 4, stepCode: "coating", stepName: "코팅", department: "PROD" },
    { stepOrder: 5, stepCode: "cutting", stepName: "재단", department: "PROD" },
    { stepOrder: 6, stepCode: "compressed_binding", stepName: "압축제본", department: "PROD" },
    { stepOrder: 7, stepCode: "qc", stepName: "QC", department: "PROD", isCheckpoint: true },
    { stepOrder: 8, stepCode: "shipping", stepName: "출하", department: "CS" },
  ],
  pictorial_album: [
    { stepOrder: 1, stepCode: "order_receipt", stepName: "수주", department: "CS" },
    { stepOrder: 2, stepCode: "file_correction", stepName: "파일보정", department: "DESIGN" },
    { stepOrder: 3, stepCode: "indigo_print", stepName: "인디고출력", department: "PROD" },
    { stepOrder: 4, stepCode: "coating", stepName: "코팅", department: "PROD" },
    { stepOrder: 5, stepCode: "cutting", stepName: "재단", department: "PROD" },
    { stepOrder: 6, stepCode: "hardcover_binding", stepName: "양장제본", department: "PROD" },
    { stepOrder: 7, stepCode: "cover_making", stepName: "커버제작", department: "PROD" },
    { stepOrder: 8, stepCode: "qc", stepName: "QC", department: "PROD", isCheckpoint: true },
    { stepOrder: 9, stepCode: "shipping", stepName: "출하", department: "CS" },
  ],
  original_compressed: [
    { stepOrder: 1, stepCode: "order_receipt", stepName: "수주", department: "CS" },
    { stepOrder: 2, stepCode: "file_correction", stepName: "파일보정", department: "DESIGN" },
    { stepOrder: 3, stepCode: "indigo_print", stepName: "인디고출력", department: "PROD" },
    { stepOrder: 4, stepCode: "coating", stepName: "코팅", department: "PROD" },
    { stepOrder: 5, stepCode: "cutting", stepName: "재단", department: "PROD" },
    { stepOrder: 6, stepCode: "compressed_binding", stepName: "압축제본", department: "PROD" },
    { stepOrder: 7, stepCode: "qc", stepName: "QC", department: "PROD", isCheckpoint: true },
    { stepOrder: 8, stepCode: "shipping", stepName: "출하", department: "CS" },
  ],
  photobook: [
    { stepOrder: 1, stepCode: "order_receipt", stepName: "수주", department: "CS" },
    { stepOrder: 2, stepCode: "file_correction", stepName: "파일보정", department: "DESIGN" },
    { stepOrder: 3, stepCode: "indigo_print", stepName: "인디고출력", department: "PROD" },
    { stepOrder: 4, stepCode: "coating", stepName: "코팅", department: "PROD" },
    { stepOrder: 5, stepCode: "cutting", stepName: "재단", department: "PROD" },
    { stepOrder: 6, stepCode: "hardcover_binding", stepName: "양장제본", department: "PROD" },
    { stepOrder: 7, stepCode: "qc", stepName: "QC", department: "PROD", isCheckpoint: true },
    { stepOrder: 8, stepCode: "shipping", stepName: "출하", department: "CS" },
  ],
  acrylic_frame: [
    { stepOrder: 1, stepCode: "order_receipt", stepName: "수주", department: "CS" },
    { stepOrder: 2, stepCode: "file_correction", stepName: "파일보정", department: "DESIGN" },
    { stepOrder: 3, stepCode: "inkjet_print", stepName: "잉크젯출력", department: "PROD" },
    { stepOrder: 4, stepCode: "cutting", stepName: "재단", department: "PROD" },
    { stepOrder: 5, stepCode: "acrylic_processing", stepName: "아크릴가공", department: "PROD" },
    { stepOrder: 6, stepCode: "assembly", stepName: "조립", department: "PROD" },
    { stepOrder: 7, stepCode: "packaging", stepName: "포장", department: "PROD" },
    { stepOrder: 8, stepCode: "qc", stepName: "QC", department: "PROD", isCheckpoint: true },
    { stepOrder: 9, stepCode: "shipping", stepName: "출하", department: "CS" },
  ],
  double_mat_frame: [
    { stepOrder: 1, stepCode: "order_receipt", stepName: "수주", department: "CS" },
    { stepOrder: 2, stepCode: "file_correction", stepName: "파일보정", department: "DESIGN" },
    { stepOrder: 3, stepCode: "inkjet_print", stepName: "잉크젯출력", department: "PROD" },
    { stepOrder: 4, stepCode: "cutting", stepName: "재단", department: "PROD" },
    { stepOrder: 5, stepCode: "wood_frame_assembly", stepName: "원목프레임조립", department: "PROD" },
    { stepOrder: 6, stepCode: "packaging", stepName: "포장", department: "PROD" },
    { stepOrder: 7, stepCode: "qc", stepName: "QC", department: "PROD", isCheckpoint: true },
    { stepOrder: 8, stepCode: "shipping", stepName: "출하", department: "CS" },
  ],
  copper_plate: [
    { stepOrder: 1, stepCode: "order_receipt", stepName: "수주", department: "CS" },
    { stepOrder: 2, stepCode: "design_review", stepName: "도안확인", department: "DESIGN" },
    { stepOrder: 3, stepCode: "laser_engraving", stepName: "레이저각인", department: "PROD" },
    { stepOrder: 4, stepCode: "qc", stepName: "QC", department: "PROD", isCheckpoint: true },
    { stepOrder: 5, stepCode: "shipping", stepName: "출하", department: "CS" },
  ],
  single_print: [
    { stepOrder: 1, stepCode: "order_receipt", stepName: "수주", department: "CS" },
    { stepOrder: 2, stepCode: "file_correction", stepName: "파일보정", department: "DESIGN" },
    { stepOrder: 3, stepCode: "inkjet_print", stepName: "잉크젯출력", department: "PROD" },
    { stepOrder: 4, stepCode: "cutting", stepName: "재단", department: "PROD" },
    { stepOrder: 5, stepCode: "qc", stepName: "QC", department: "PROD", isCheckpoint: true },
    { stepOrder: 6, stepCode: "shipping", stepName: "출하", department: "CS" },
  ],
};

// SystemSetting에 저장/로드할 키 prefix
const SETTING_KEY_PREFIX = "process_template_";

/**
 * 상품별 공정 템플릿 관리 훅
 * SystemSetting 테이블에 JSON으로 저장
 */
export function useProcessTemplates() {
  const { data: settings, isLoading } = useSystemSettings("process_template");
  const bulkUpdate = useBulkUpdateSettings();
  const [templates, setTemplates] = useState<Record<ProductType, ProcessStep[]>>(
    { ...DEFAULT_PROCESS_TEMPLATES }
  );
  const [hasChanges, setHasChanges] = useState(false);

  // 설정에서 로드
  useEffect(() => {
    if (settings) {
      const map = settingsToMap(settings);
      const loaded = { ...DEFAULT_PROCESS_TEMPLATES };

      (Object.keys(PRODUCT_TYPES) as ProductType[]).forEach((pt) => {
        const key = `${SETTING_KEY_PREFIX}${pt}`;
        if (map[key]) {
          try {
            loaded[pt] = JSON.parse(map[key]);
          } catch {
            // 파싱 실패 시 기본값 유지
          }
        }
      });

      setTemplates(loaded);
    }
  }, [settings]);

  // 특정 상품의 공정 업데이트
  const updateTemplate = useCallback(
    (productType: ProductType, steps: ProcessStep[]) => {
      // stepOrder 재정렬
      const reordered = steps.map((s, i) => ({ ...s, stepOrder: i + 1 }));
      setTemplates((prev) => ({ ...prev, [productType]: reordered }));
      setHasChanges(true);
    },
    []
  );

  // 저장
  const saveTemplates = useCallback(
    async (productType?: ProductType) => {
      const typesToSave = productType
        ? [productType]
        : (Object.keys(PRODUCT_TYPES) as ProductType[]);

      const settingsToSave = typesToSave.map((pt) => ({
        key: `${SETTING_KEY_PREFIX}${pt}`,
        value: JSON.stringify(templates[pt]),
        category: "process_template",
        label: `${PRODUCT_TYPES[pt]} 공정 템플릿`,
      }));

      await bulkUpdate.mutateAsync(settingsToSave);
      setHasChanges(false);
    },
    [templates, bulkUpdate]
  );

  // 기본값 복원
  const resetTemplate = useCallback(
    (productType: ProductType) => {
      setTemplates((prev) => ({
        ...prev,
        [productType]: [...DEFAULT_PROCESS_TEMPLATES[productType]],
      }));
      setHasChanges(true);
    },
    []
  );

  // 전체 기본값 복원
  const resetAllTemplates = useCallback(() => {
    setTemplates({ ...DEFAULT_PROCESS_TEMPLATES });
    setHasChanges(true);
  }, []);

  return {
    templates,
    isLoading,
    isSaving: bulkUpdate.isPending,
    hasChanges,
    updateTemplate,
    saveTemplates,
    resetTemplate,
    resetAllTemplates,
  };
}
