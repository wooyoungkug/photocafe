"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

// 시스템 설정 타입
export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  category: string;
  label?: string;
  createdAt: string;
  updatedAt: string;
}

// 설정 카테고리
export const SETTING_CATEGORIES = {
  printing: "인쇄비",
  shipping: "택배비",
  company: "회사정보",
  process: "공정단계",
  server: "서버설정",
  system: "시스템",
} as const;

// 공정단계 정의
export const PROCESS_STAGES = {
  // 접수 단계
  reception_waiting: { name: "접수대기", category: "reception", order: 1 },
  file_inspection: { name: "파일검수", category: "reception", order: 2 },
  payment_waiting: { name: "입금대기", category: "reception", order: 3 },
  reception_hold: { name: "접수보류", category: "reception", order: 4 },
  reception_complete: { name: "접수완료", category: "reception", order: 5 },

  // 출력 단계
  print_waiting: { name: "출력대기", category: "print", order: 10 },
  print_received: { name: "출력접수완료", category: "print", order: 11 },
  printing: { name: "출력중", category: "print", order: 12 },
  print_complete: { name: "출력완료", category: "print", order: 13 },

  // 제본 단계
  binding_waiting: { name: "제본대기", category: "binding", order: 20 },
  binding: { name: "제본중", category: "binding", order: 21 },
  binding_complete: { name: "제본완료", category: "binding", order: 22 },

  // 액자 단계
  frame_waiting: { name: "액자대기", category: "frame", order: 30 },
  framing: { name: "액자제작중", category: "frame", order: 31 },
  frame_complete: { name: "액자제작완료", category: "frame", order: 32 },

  // 후가공 단계
  finishing_waiting: { name: "후가공대기", category: "finishing", order: 40 },
  finishing: { name: "후가공중", category: "finishing", order: 41 },
  finishing_complete: { name: "후가공완료", category: "finishing", order: 42 },

  // 검수 단계
  qc_waiting: { name: "검수대기", category: "qc", order: 50 },
  qc_complete: { name: "검수완료", category: "qc", order: 51 },

  // 배송 단계
  shipping_waiting: { name: "배송대기", category: "shipping", order: 60 },
  visit_waiting: { name: "방문대기", category: "shipping", order: 61 },
  quick_waiting: { name: "퀵출고대기", category: "shipping", order: 62 },
  freight_waiting: { name: "화물출고대기", category: "shipping", order: 63 },
  shipping: { name: "배송중", category: "shipping", order: 64 },
  delivered: { name: "배송완료", category: "shipping", order: 65 },

  // 완료/취소
  transaction_complete: { name: "거래완료", category: "complete", order: 90 },
  order_cancelled: { name: "주문취소", category: "complete", order: 91 },
  refund_requested: { name: "환불요청", category: "complete", order: 92 },
  refund_complete: { name: "환불완료", category: "complete", order: 93 },
} as const;

export const PROCESS_CATEGORIES = {
  reception: "접수",
  print: "출력",
  binding: "제본",
  frame: "액자",
  finishing: "후가공",
  qc: "검수",
  shipping: "배송",
  complete: "완료/취소",
} as const;

// 전체 설정 조회
export function useSystemSettings(category?: string) {
  return useQuery({
    queryKey: ["system-settings", category],
    queryFn: async () => {
      const url = category
        ? `/system-settings?category=${category}`
        : "/system-settings";
      const response = await api.get<SystemSetting[]>(url);
      return response;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 특정 설정 조회
export function useSystemSetting(key: string) {
  return useQuery({
    queryKey: ["system-settings", "key", key],
    queryFn: async () => {
      const response = await api.get<SystemSetting>(`/system-settings/${key}`);
      return response;
    },
    enabled: !!key,
  });
}

// 설정 수정
export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
      category,
      label,
    }: {
      key: string;
      value: string;
      category: string;
      label?: string;
    }) => {
      const response = await api.put<SystemSetting>(`/system-settings/${key}`, {
        value,
        category,
        label,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "설정 저장 실패",
        description: error.message,
      });
    },
  });
}

// 일괄 설정 저장
export function useBulkUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      settings: { key: string; value: string; category: string; label?: string }[]
    ) => {
      const response = await api.post<SystemSetting[]>(
        "/system-settings/bulk",
        { settings }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast({
        title: "설정이 저장되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "설정 저장 실패",
        description: error.message,
      });
    },
  });
}

// 설정값을 맵으로 변환하는 유틸리티
export function settingsToMap(settings: SystemSetting[]): Record<string, string> {
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, string>);
}

// 숫자 설정값 가져오기
export function getNumericValue(
  settings: Record<string, string>,
  key: string,
  defaultValue: number = 0
): number {
  const value = settings[key];
  if (value === undefined || value === "") return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}
