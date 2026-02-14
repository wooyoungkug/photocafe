import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { API_URL, API_BASE_URL } from "./api";

/**
 * 이미지 URL 정규화 (DB 저장 값 → 브라우저 접근 가능 URL)
 * - /upload/... (컨트롤러 형식) → 정적 파일 서빙 /uploads/... 로 변환
 * - /uploads/... (정적 파일 형식) → 그대로 사용
 * - /api/v1/... → API base URL 붙임
 * - http(s)://... → 중복 prefix 제거
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace(/\/api\/v1\/api\/v1\//g, '/api/v1/');
  }
  if (url.startsWith('/api/v1/')) {
    return `${API_BASE_URL}${url}`;
  }
  // 정적 파일 서빙 경로 (/uploads/...)
  if (url.startsWith('/uploads/')) {
    return `${API_BASE_URL}${url}`;
  }
  // 컨트롤러 경로 (/upload/...) → 정적 파일 경로로 변환
  if (url.startsWith('/upload/')) {
    return `${API_BASE_URL}/uploads/${url.substring('/upload/'.length)}`;
  }
  if (url.startsWith('/api/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

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
