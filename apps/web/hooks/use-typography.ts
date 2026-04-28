"use client";

import { useEffect } from "react";
import { useSystemSettings, settingsToMap, getNumericValue } from "./use-system-settings";

/**
 * 기초정보 설정에 저장된 타이포그래피 토큰을 :root CSS 변수로 주입.
 *
 * 키:
 * - typography.body         → --fs-body (본문, 기본 14px)
 * - typography.title        → --fs-title (제목, 기본 18px)
 * - typography.heading      → --fs-heading (큰제목, 기본 24px)
 * - typography.menu_main    → --fs-menu-main (대메뉴, 기본 14px)
 * - typography.menu_sub     → --fs-menu-sub (서브메뉴, 기본 14px)
 * - typography.menu_mega_header → --fs-menu-mega-header (메가 그룹 헤더, 기본 12px)
 * - typography.pin          → --fs-pin (핀 바, 기본 14px)
 */

export const TYPOGRAPHY_KEYS = {
  body: "typography.body",
  title: "typography.title",
  heading: "typography.heading",
  menuMain: "typography.menu_main",
  menuSub: "typography.menu_sub",
  menuMegaHeader: "typography.menu_mega_header",
  pin: "typography.pin",
} as const;

export const TYPOGRAPHY_DEFAULTS: Record<keyof typeof TYPOGRAPHY_KEYS, number> = {
  body: 14,
  title: 18,
  heading: 24,
  menuMain: 14,
  menuSub: 14,
  menuMegaHeader: 12,
  pin: 14,
};

export const TYPOGRAPHY_LABELS: Record<keyof typeof TYPOGRAPHY_KEYS, string> = {
  body: "본문",
  title: "제목",
  heading: "큰제목",
  menuMain: "상단 대메뉴",
  menuSub: "서브메뉴 항목",
  menuMegaHeader: "메가메뉴 그룹 헤더",
  pin: "핀(즐겨찾기) 바",
};

const VAR_MAP: Record<keyof typeof TYPOGRAPHY_KEYS, string> = {
  body: "--fs-body",
  title: "--fs-title",
  heading: "--fs-heading",
  menuMain: "--fs-menu-main",
  menuSub: "--fs-menu-sub",
  menuMegaHeader: "--fs-menu-mega-header",
  pin: "--fs-pin",
};

const RANGE = { min: 10, max: 32 } as const;

function clamp(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(RANGE.min, Math.min(RANGE.max, Math.round(value)));
}

/**
 * 타이포그래피 설정을 SystemSetting 에서 읽어 :root CSS 변수에 주입.
 * 대시보드 레이아웃에서 한 번 호출하면 전역 적용됨.
 */
export function useTypographyApply() {
  const { data: settings } = useSystemSettings("typography");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const map = settings ? settingsToMap(settings) : {};

    (Object.keys(TYPOGRAPHY_KEYS) as Array<keyof typeof TYPOGRAPHY_KEYS>).forEach((tokenKey) => {
      const settingKey = TYPOGRAPHY_KEYS[tokenKey];
      const fallback = TYPOGRAPHY_DEFAULTS[tokenKey];
      const raw = getNumericValue(map, settingKey, fallback);
      const px = clamp(raw, fallback);
      root.style.setProperty(VAR_MAP[tokenKey], `${px}px`);
    });
  }, [settings]);
}

/** 현재 타이포그래피 값 읽기 (설정 화면에서 사용) */
export function useTypographyValues(): Record<keyof typeof TYPOGRAPHY_KEYS, number> {
  const { data: settings } = useSystemSettings("typography");
  const map = settings ? settingsToMap(settings) : {};
  const result = {} as Record<keyof typeof TYPOGRAPHY_KEYS, number>;
  (Object.keys(TYPOGRAPHY_KEYS) as Array<keyof typeof TYPOGRAPHY_KEYS>).forEach((tokenKey) => {
    const fallback = TYPOGRAPHY_DEFAULTS[tokenKey];
    result[tokenKey] = getNumericValue(map, TYPOGRAPHY_KEYS[tokenKey], fallback);
  });
  return result;
}

export { RANGE as TYPOGRAPHY_RANGE };
