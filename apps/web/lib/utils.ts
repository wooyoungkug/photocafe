import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// 다국어 카테고리명 반환
export function getLocalizedName(
  item: { name: string; nameEn?: string | null; nameJa?: string | null; nameZh?: string | null } | null | undefined,
  locale: string
): string {
  if (!item) return '';
  switch (locale) {
    case 'en': return item.nameEn || item.name;
    case 'ja': return item.nameJa || item.name;
    case 'zh': return item.nameZh || item.name;
    default: return item.name;
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(value);
}

// 천 단위 구분 기호 포맷팅 (숫자)
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  // 정수로 변환하여 소수점 제거
  return new Intl.NumberFormat("ko-KR").format(Math.round(num));
}

// 천 단위 구분 기호 포맷팅 (가격, ₩ 기호 포함)
export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "₩0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "₩0";
  // 정수로 변환하여 소수점 제거
  return `₩${new Intl.NumberFormat("ko-KR").format(Math.round(num))}`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
