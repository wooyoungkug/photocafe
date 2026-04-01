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
  receipt_complete: { name: "접수완료", department: "CS" },
  file_inspection: { name: "파일검수", department: "DESIGN" },
  receipt_hold_payment: { name: "접수보류(입금대기)", department: "CS" },
  receipt_hold_file_error: { name: "접수보류(파일오류)", department: "DESIGN" },
  print_waiting: { name: "출력대기(인디고출력후)", department: "PROD" },
  print_complete: { name: "출력완료", department: "PROD" },
  finishing_waiting: { name: "후가공대기", department: "PROD" },
  finishing_in_progress: { name: "후가공진행중", department: "PROD" },
  finishing_complete: { name: "후가공완료", department: "PROD" },
  shipping_parcel: { name: "배송대기(택배)", department: "CS" },
  shipping_direct: { name: "배송대기(직배송)", department: "CS" },
  shipping_factory: { name: "배송대기(공장출고)", department: "PROD" },
  transaction_complete: { name: "거래완료", department: "CS" },
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
  // 압축앨범: 접수→파일검수→출력대기→출력완료→후가공→배송→거래완료
  compressed_album: [
    { stepOrder: 1, stepCode: "receipt_complete", stepName: "접수완료", department: "CS" },
    { stepOrder: 2, stepCode: "file_inspection", stepName: "파일검수", department: "DESIGN" },
    { stepOrder: 3, stepCode: "print_waiting", stepName: "출력대기(인디고출력후)", department: "PROD" },
    { stepOrder: 4, stepCode: "print_complete", stepName: "출력완료", department: "PROD" },
    { stepOrder: 5, stepCode: "finishing_waiting", stepName: "후가공대기", department: "PROD" },
    { stepOrder: 6, stepCode: "finishing_in_progress", stepName: "후가공진행중", department: "PROD" },
    { stepOrder: 7, stepCode: "finishing_complete", stepName: "후가공완료", department: "PROD", isCheckpoint: true },
    { stepOrder: 8, stepCode: "shipping_parcel", stepName: "배송대기(택배)", department: "CS" },
    { stepOrder: 9, stepCode: "transaction_complete", stepName: "거래완료", department: "CS" },
  ],
  // 화보앨범: 압축앨범과 동일 흐름
  pictorial_album: [
    { stepOrder: 1, stepCode: "receipt_complete", stepName: "접수완료", department: "CS" },
    { stepOrder: 2, stepCode: "file_inspection", stepName: "파일검수", department: "DESIGN" },
    { stepOrder: 3, stepCode: "print_waiting", stepName: "출력대기(인디고출력후)", department: "PROD" },
    { stepOrder: 4, stepCode: "print_complete", stepName: "출력완료", department: "PROD" },
    { stepOrder: 5, stepCode: "finishing_waiting", stepName: "후가공대기", department: "PROD" },
    { stepOrder: 6, stepCode: "finishing_in_progress", stepName: "후가공진행중", department: "PROD" },
    { stepOrder: 7, stepCode: "finishing_complete", stepName: "후가공완료", department: "PROD", isCheckpoint: true },
    { stepOrder: 8, stepCode: "shipping_parcel", stepName: "배송대기(택배)", department: "CS" },
    { stepOrder: 9, stepCode: "transaction_complete", stepName: "거래완료", department: "CS" },
  ],
  // 원판압축: 압축앨범과 동일 흐름
  original_compressed: [
    { stepOrder: 1, stepCode: "receipt_complete", stepName: "접수완료", department: "CS" },
    { stepOrder: 2, stepCode: "file_inspection", stepName: "파일검수", department: "DESIGN" },
    { stepOrder: 3, stepCode: "print_waiting", stepName: "출력대기(인디고출력후)", department: "PROD" },
    { stepOrder: 4, stepCode: "print_complete", stepName: "출력완료", department: "PROD" },
    { stepOrder: 5, stepCode: "finishing_waiting", stepName: "후가공대기", department: "PROD" },
    { stepOrder: 6, stepCode: "finishing_in_progress", stepName: "후가공진행중", department: "PROD" },
    { stepOrder: 7, stepCode: "finishing_complete", stepName: "후가공완료", department: "PROD", isCheckpoint: true },
    { stepOrder: 8, stepCode: "shipping_parcel", stepName: "배송대기(택배)", department: "CS" },
    { stepOrder: 9, stepCode: "transaction_complete", stepName: "거래완료", department: "CS" },
  ],
  // 포토북
  photobook: [
    { stepOrder: 1, stepCode: "receipt_complete", stepName: "접수완료", department: "CS" },
    { stepOrder: 2, stepCode: "file_inspection", stepName: "파일검수", department: "DESIGN" },
    { stepOrder: 3, stepCode: "print_waiting", stepName: "출력대기(인디고출력후)", department: "PROD" },
    { stepOrder: 4, stepCode: "print_complete", stepName: "출력완료", department: "PROD" },
    { stepOrder: 5, stepCode: "finishing_waiting", stepName: "후가공대기", department: "PROD" },
    { stepOrder: 6, stepCode: "finishing_in_progress", stepName: "후가공진행중", department: "PROD" },
    { stepOrder: 7, stepCode: "finishing_complete", stepName: "후가공완료", department: "PROD", isCheckpoint: true },
    { stepOrder: 8, stepCode: "shipping_parcel", stepName: "배송대기(택배)", department: "CS" },
    { stepOrder: 9, stepCode: "transaction_complete", stepName: "거래완료", department: "CS" },
  ],
  // 아크릴액자
  acrylic_frame: [
    { stepOrder: 1, stepCode: "receipt_complete", stepName: "접수완료", department: "CS" },
    { stepOrder: 2, stepCode: "file_inspection", stepName: "파일검수", department: "DESIGN" },
    { stepOrder: 3, stepCode: "print_waiting", stepName: "출력대기(인디고출력후)", department: "PROD" },
    { stepOrder: 4, stepCode: "print_complete", stepName: "출력완료", department: "PROD" },
    { stepOrder: 5, stepCode: "finishing_waiting", stepName: "후가공대기", department: "PROD" },
    { stepOrder: 6, stepCode: "finishing_in_progress", stepName: "후가공진행중", department: "PROD" },
    { stepOrder: 7, stepCode: "finishing_complete", stepName: "후가공완료", department: "PROD", isCheckpoint: true },
    { stepOrder: 8, stepCode: "shipping_direct", stepName: "배송대기(직배송)", department: "CS" },
    { stepOrder: 9, stepCode: "transaction_complete", stepName: "거래완료", department: "CS" },
  ],
  // 더블마트액자
  double_mat_frame: [
    { stepOrder: 1, stepCode: "receipt_complete", stepName: "접수완료", department: "CS" },
    { stepOrder: 2, stepCode: "file_inspection", stepName: "파일검수", department: "DESIGN" },
    { stepOrder: 3, stepCode: "print_waiting", stepName: "출력대기(인디고출력후)", department: "PROD" },
    { stepOrder: 4, stepCode: "print_complete", stepName: "출력완료", department: "PROD" },
    { stepOrder: 5, stepCode: "finishing_waiting", stepName: "후가공대기", department: "PROD" },
    { stepOrder: 6, stepCode: "finishing_in_progress", stepName: "후가공진행중", department: "PROD" },
    { stepOrder: 7, stepCode: "finishing_complete", stepName: "후가공완료", department: "PROD", isCheckpoint: true },
    { stepOrder: 8, stepCode: "shipping_direct", stepName: "배송대기(직배송)", department: "CS" },
    { stepOrder: 9, stepCode: "transaction_complete", stepName: "거래완료", department: "CS" },
  ],
  // 동판
  copper_plate: [
    { stepOrder: 1, stepCode: "receipt_complete", stepName: "접수완료", department: "CS" },
    { stepOrder: 2, stepCode: "file_inspection", stepName: "파일검수", department: "DESIGN" },
    { stepOrder: 3, stepCode: "print_complete", stepName: "출력완료", department: "PROD" },
    { stepOrder: 4, stepCode: "finishing_complete", stepName: "후가공완료", department: "PROD", isCheckpoint: true },
    { stepOrder: 5, stepCode: "shipping_factory", stepName: "배송대기(공장출고)", department: "PROD" },
    { stepOrder: 6, stepCode: "transaction_complete", stepName: "거래완료", department: "CS" },
  ],
  // 단품출력
  single_print: [
    { stepOrder: 1, stepCode: "receipt_complete", stepName: "접수완료", department: "CS" },
    { stepOrder: 2, stepCode: "file_inspection", stepName: "파일검수", department: "DESIGN" },
    { stepOrder: 3, stepCode: "print_waiting", stepName: "출력대기(인디고출력후)", department: "PROD" },
    { stepOrder: 4, stepCode: "print_complete", stepName: "출력완료", department: "PROD" },
    { stepOrder: 5, stepCode: "shipping_parcel", stepName: "배송대기(택배)", department: "CS" },
    { stepOrder: 6, stepCode: "transaction_complete", stepName: "거래완료", department: "CS" },
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
