import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 이미지 URL 정규화 (DB 저장 값 → API 서버 절대 URL)
 * API 서버에서 직접 이미지를 로드하여 Next.js rewrite 프록시 우회
 */
const IMAGE_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace(/\/api\/v1\/?$/, '');

export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  // 이미 절대 URL이면 그대로 반환
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // /upload/... → /uploads/... 변환 (레거시 URL 호환)
  if (url.startsWith('/upload/') && !url.startsWith('/uploads/')) {
    url = `/uploads/${url.substring('/upload/'.length)}`;
  }
  // /uploads/... → API 서버 절대 URL로 변환
  if (url.startsWith('/uploads/')) {
    return `${IMAGE_BASE}${url}`;
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
