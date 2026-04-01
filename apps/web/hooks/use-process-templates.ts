"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useSystemSettings,
  useBulkUpdateSettings,
  settingsToMap,
} from "@/hooks/use-system-settings";

// 기본 상품 유형 정의
export const DEFAULT_PRODUCT_TYPES: Record<string, string> = {
  compressed_album: "압축앨범",
  pictorial_album: "화보앨범 (스타화보)",
  original_compressed: "원판압축",
  photobook: "포토북",
  acrylic_frame: "아크릴액자",
  double_mat_frame: "더블마트액자",
  copper_plate: "동판",
  single_print: "단품출력",
};

// 하위 호환용
export const PRODUCT_TYPES = DEFAULT_PRODUCT_TYPES;

export type ProductType = string;

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
  shipping_factory: { name: "배송대기(공장출고)", department: "CS" },
  transaction_complete: { name: "배송(거래)완료", department: "CS" },
} as const;

export type ProcessStepCode = keyof typeof PROCESS_STEP_OPTIONS | string;

// 커스텀 공정 단계 타입
export interface CustomStepOption {
  name: string;
  department: string;
}

// 부서 정보
export const DEPARTMENTS = {
  CS: { name: "CS", color: "bg-blue-100 text-blue-700" },
  DESIGN: { name: "디자인", color: "bg-purple-100 text-purple-700" },
  PROD: { name: "생산", color: "bg-green-100 text-green-700" },
} as const;

// 공정 단계 타입
export interface ProcessStep {
  stepOrder: number;
  stepCode: string;
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
    { stepOrder: 9, stepCode: "transaction_complete", stepName: "배송(거래)완료", department: "CS" },
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
    { stepOrder: 9, stepCode: "transaction_complete", stepName: "배송(거래)완료", department: "CS" },
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
    { stepOrder: 9, stepCode: "transaction_complete", stepName: "배송(거래)완료", department: "CS" },
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
    { stepOrder: 9, stepCode: "transaction_complete", stepName: "배송(거래)완료", department: "CS" },
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
    { stepOrder: 9, stepCode: "transaction_complete", stepName: "배송(거래)완료", department: "CS" },
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
    { stepOrder: 9, stepCode: "transaction_complete", stepName: "배송(거래)완료", department: "CS" },
  ],
  // 동판
  copper_plate: [
    { stepOrder: 1, stepCode: "receipt_complete", stepName: "접수완료", department: "CS" },
    { stepOrder: 2, stepCode: "file_inspection", stepName: "파일검수", department: "DESIGN" },
    { stepOrder: 3, stepCode: "print_complete", stepName: "출력완료", department: "PROD" },
    { stepOrder: 4, stepCode: "finishing_complete", stepName: "후가공완료", department: "PROD", isCheckpoint: true },
    { stepOrder: 5, stepCode: "shipping_factory", stepName: "배송대기(공장출고)", department: "CS" },
    { stepOrder: 6, stepCode: "transaction_complete", stepName: "배송(거래)완료", department: "CS" },
  ],
  // 단품출력
  single_print: [
    { stepOrder: 1, stepCode: "receipt_complete", stepName: "접수완료", department: "CS" },
    { stepOrder: 2, stepCode: "file_inspection", stepName: "파일검수", department: "DESIGN" },
    { stepOrder: 3, stepCode: "print_waiting", stepName: "출력대기(인디고출력후)", department: "PROD" },
    { stepOrder: 4, stepCode: "print_complete", stepName: "출력완료", department: "PROD" },
    { stepOrder: 5, stepCode: "shipping_parcel", stepName: "배송대기(택배)", department: "CS" },
    { stepOrder: 6, stepCode: "transaction_complete", stepName: "배송(거래)완료", department: "CS" },
  ],
};

// SystemSetting에 저장/로드할 키 prefix
const SETTING_KEY_PREFIX = "process_template_";
const CUSTOM_STEPS_KEY = "process_custom_steps";
const CUSTOM_PRODUCT_TYPES_KEY = "process_custom_product_types";

/**
 * 상품별 공정 템플릿 관리 훅
 * SystemSetting 테이블에 JSON으로 저장
 */
export function useProcessTemplates() {
  const { data: settings, isLoading } = useSystemSettings("process_template");
  const bulkUpdate = useBulkUpdateSettings();
  const [templates, setTemplates] = useState<Record<string, ProcessStep[]>>(
    { ...DEFAULT_PROCESS_TEMPLATES }
  );
  const [customSteps, setCustomSteps] = useState<Record<string, CustomStepOption>>({});
  const [customProductTypes, setCustomProductTypes] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // 모든 상품 유형 (기본 + 커스텀)
  const allProductTypes: Record<string, string> = {
    ...DEFAULT_PRODUCT_TYPES,
    ...customProductTypes,
  };

  // 모든 사용 가능한 공정 옵션 (기본 + 커스텀)
  const allStepOptions: Record<string, { name: string; department: string }> = {
    ...PROCESS_STEP_OPTIONS,
    ...customSteps,
  };

  // 설정에서 로드
  useEffect(() => {
    if (settings) {
      const map = settingsToMap(settings);
      const loaded: Record<string, ProcessStep[]> = { ...DEFAULT_PROCESS_TEMPLATES };

      // 커스텀 공정 로드
      if (map[CUSTOM_STEPS_KEY]) {
        try {
          setCustomSteps(JSON.parse(map[CUSTOM_STEPS_KEY]));
        } catch { /* 기본값 유지 */ }
      }

      // 커스텀 상품 유형 로드
      let loadedCustomTypes: Record<string, string> = {};
      if (map[CUSTOM_PRODUCT_TYPES_KEY]) {
        try {
          loadedCustomTypes = JSON.parse(map[CUSTOM_PRODUCT_TYPES_KEY]);
          setCustomProductTypes(loadedCustomTypes);
        } catch { /* 기본값 유지 */ }
      }

      // 모든 상품 유형의 템플릿 로드
      const allTypes = { ...DEFAULT_PRODUCT_TYPES, ...loadedCustomTypes };
      Object.keys(allTypes).forEach((pt) => {
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

  // 커스텀 공정 추가
  const addCustomStep = useCallback(
    (code: string, name: string, department: string) => {
      setCustomSteps((prev) => ({ ...prev, [code]: { name, department } }));
      setHasChanges(true);
    },
    []
  );

  // 공정 용어 수정 (기본/커스텀 모두 - 오버라이드 방식)
  const updateStepOption = useCallback(
    (code: string, name: string, department: string) => {
      setCustomSteps((prev) => ({ ...prev, [code]: { name, department } }));
      // 이미 사용 중인 템플릿의 stepName/department도 갱신
      setTemplates((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((pt) => {
          next[pt] = next[pt].map((s) =>
            s.stepCode === code ? { ...s, stepName: name, department } : s
          );
        });
        return next;
      });
      setHasChanges(true);
    },
    []
  );

  // 커스텀 공정 삭제
  const removeCustomStep = useCallback(
    (code: string) => {
      setCustomSteps((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
      setHasChanges(true);
    },
    []
  );

  // 상품 유형 추가
  const addProductType = useCallback(
    (code: string, name: string) => {
      setCustomProductTypes((prev) => ({ ...prev, [code]: name }));
      // 빈 공정 템플릿 생성
      setTemplates((prev) => ({
        ...prev,
        [code]: [
          { stepOrder: 1, stepCode: "receipt_complete", stepName: "접수완료", department: "CS" },
          { stepOrder: 2, stepCode: "transaction_complete", stepName: "배송(거래)완료", department: "CS" },
        ],
      }));
      setHasChanges(true);
    },
    []
  );

  // 상품 유형 이름 수정
  const renameProductType = useCallback(
    (code: string, newName: string) => {
      if (DEFAULT_PRODUCT_TYPES[code]) {
        // 기본 상품은 커스텀으로 오버라이드
        setCustomProductTypes((prev) => ({ ...prev, [code]: newName }));
      } else {
        setCustomProductTypes((prev) => ({ ...prev, [code]: newName }));
      }
      setHasChanges(true);
    },
    []
  );

  // 상품 유형 삭제 (커스텀만 삭제 가능)
  const removeProductType = useCallback(
    (code: string) => {
      setCustomProductTypes((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
      setTemplates((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
      setHasChanges(true);
    },
    []
  );

  // 저장 (템플릿 + 커스텀 공정 + 커스텀 상품유형 함께)
  const saveTemplates = useCallback(
    async (productType?: string) => {
      const allTypes = { ...DEFAULT_PRODUCT_TYPES, ...customProductTypes };
      const typesToSave = productType
        ? [productType]
        : Object.keys(allTypes);

      const settingsToSave = [
        ...typesToSave
          .filter((pt) => templates[pt])
          .map((pt) => ({
            key: `${SETTING_KEY_PREFIX}${pt}`,
            value: JSON.stringify(templates[pt]),
            category: "process_template",
            label: `${allTypes[pt] || pt} 공정 템플릿`,
          })),
        {
          key: CUSTOM_STEPS_KEY,
          value: JSON.stringify(customSteps),
          category: "process_template",
          label: "사용자 정의 공정 단계",
        },
        {
          key: CUSTOM_PRODUCT_TYPES_KEY,
          value: JSON.stringify(customProductTypes),
          category: "process_template",
          label: "사용자 정의 상품 유형",
        },
      ];

      await bulkUpdate.mutateAsync(settingsToSave);
      setHasChanges(false);
    },
    [templates, customSteps, customProductTypes, bulkUpdate]
  );

  // 기본값 복원
  const resetTemplate = useCallback(
    (productType: string) => {
      if (DEFAULT_PROCESS_TEMPLATES[productType as keyof typeof DEFAULT_PROCESS_TEMPLATES]) {
        setTemplates((prev) => ({
          ...prev,
          [productType]: [...DEFAULT_PROCESS_TEMPLATES[productType as keyof typeof DEFAULT_PROCESS_TEMPLATES]],
        }));
      }
      setHasChanges(true);
    },
    []
  );

  // 전체 기본값 복원
  const resetAllTemplates = useCallback(() => {
    setTemplates({ ...DEFAULT_PROCESS_TEMPLATES });
    setCustomProductTypes({});
    setHasChanges(true);
  }, []);

  return {
    templates,
    customSteps,
    customProductTypes,
    allProductTypes,
    allStepOptions,
    isLoading,
    isSaving: bulkUpdate.isPending,
    hasChanges,
    updateTemplate,
    addCustomStep,
    updateStepOption,
    removeCustomStep,
    addProductType,
    renameProductType,
    removeProductType,
    saveTemplates,
    resetTemplate,
    resetAllTemplates,
  };
}
