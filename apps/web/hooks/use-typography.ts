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
  tableHead: "typography.table_head",
  tableBody: "typography.table_body",
} as const;

export const TYPOGRAPHY_DEFAULTS: Record<keyof typeof TYPOGRAPHY_KEYS, number> = {
  body: 14,
  title: 18,
  heading: 24,
  menuMain: 14,
  menuSub: 14,
  menuMegaHeader: 12,
  pin: 14,
  tableHead: 13,
  tableBody: 14,
};

export const TYPOGRAPHY_LABELS: Record<keyof typeof TYPOGRAPHY_KEYS, string> = {
  body: "본문",
  title: "제목",
  heading: "큰제목",
  menuMain: "상단 대메뉴",
  menuSub: "서브메뉴 항목",
  menuMegaHeader: "메가메뉴 그룹 헤더",
  pin: "핀(즐겨찾기) 바",
  tableHead: "표 헤더",
  tableBody: "표 셀(데이터)",
};

export const TYPOGRAPHY_VAR_MAP: Record<keyof typeof TYPOGRAPHY_KEYS, string> = {
  body: "--fs-body",
  title: "--fs-title",
  heading: "--fs-heading",
  menuMain: "--fs-menu-main",
  menuSub: "--fs-menu-sub",
  menuMegaHeader: "--fs-menu-mega-header",
  pin: "--fs-pin",
  tableHead: "--fs-table-head",
  tableBody: "--fs-table-body",
};

const RANGE = { min: 10, max: 32 } as const;

function clamp(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(RANGE.min, Math.min(RANGE.max, Math.round(value)));
}

/**
 * 주어진 값들을 :root CSS 변수에 즉시 주입.
 * - DB 저장 없이 화면 미리보기 용도
 * - 페이지 새로고침/재마운트 시 useTypographyApply 가 다시 DB 값으로 덮어씀
 */
export function applyTypographyVars(values: Partial<Record<keyof typeof TYPOGRAPHY_KEYS, number>>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  (Object.keys(values) as Array<keyof typeof TYPOGRAPHY_KEYS>).forEach((tokenKey) => {
    const fallback = TYPOGRAPHY_DEFAULTS[tokenKey];
    const px = clamp(values[tokenKey] ?? fallback, fallback);
    root.style.setProperty(TYPOGRAPHY_VAR_MAP[tokenKey], `${px}px`);
  });
}

// ---------------------------------------------------------------------------
// 완서(볼드/기울기/컬러) 토큰 — 메뉴 4개 + 표 2개
// ---------------------------------------------------------------------------

export type MenuStyleToken =
  | "menuMain"
  | "menuSub"
  | "menuMegaHeader"
  | "pin"
  | "tableHead"
  | "tableBody";

export const MENU_STYLE_TOKENS: MenuStyleToken[] = [
  "menuMain",
  "menuSub",
  "menuMegaHeader",
  "pin",
  "tableHead",
  "tableBody",
];

/**
 * 각 토큰을 적용할 CSS 셀렉터.
 * 표 토큰은 시멘틱 th/td 와 ARIA grid 역할을 모두 포함하여 shadcn Table 등 호환.
 */
const MENU_CLASS_MAP: Record<MenuStyleToken, string> = {
  menuMain: ".fs-menu-main",
  menuSub: ".fs-menu-sub",
  menuMegaHeader: ".fs-menu-mega-header",
  pin: ".fs-pin",
  tableHead: 'th, [role="columnheader"]',
  tableBody: 'td, [role="cell"], [role="gridcell"]',
};

export interface MenuStyleValues {
  bold?: boolean;
  italic?: boolean;
  color?: string; // "" or undefined = 기본값 사용
}

export const MENU_STYLE_KEYS = {
  menuMain: { bold: "typography.menu_main.bold", italic: "typography.menu_main.italic", color: "typography.menu_main.color" },
  menuSub: { bold: "typography.menu_sub.bold", italic: "typography.menu_sub.italic", color: "typography.menu_sub.color" },
  menuMegaHeader: { bold: "typography.menu_mega_header.bold", italic: "typography.menu_mega_header.italic", color: "typography.menu_mega_header.color" },
  pin: { bold: "typography.pin.bold", italic: "typography.pin.italic", color: "typography.pin.color" },
  tableHead: { bold: "typography.table_head.bold", italic: "typography.table_head.italic", color: "typography.table_head.color" },
  tableBody: { bold: "typography.table_body.bold", italic: "typography.table_body.italic", color: "typography.table_body.color" },
} as const;

const STYLE_TAG_ID = "typography-menu-style-overrides";

/**
 * 메뉴 토큰별 볼드/기울기/컬러 오버라이드를 <style> 태그에 주입.
 * 기본값(false/false/empty)인 경우 규칙을 emit 하지 않아 기존 Tailwind 클래스가 그대로 동작.
 */
export function applyMenuStyleOverrides(values: Partial<Record<MenuStyleToken, MenuStyleValues>>) {
  if (typeof document === "undefined") return;
  let css = "";
  for (const token of MENU_STYLE_TOKENS) {
    const v = values[token];
    if (!v) continue;
    const decls: string[] = [];
    if (v.bold === true) decls.push("font-weight: 700 !important;");
    if (v.italic === true) decls.push("font-style: italic !important;");
    if (v.color && v.color.trim()) decls.push(`color: ${v.color} !important;`);
    if (decls.length === 0) continue;
    css += `${MENU_CLASS_MAP[token]} { ${decls.join(" ")} }\n`;
  }
  let el = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_TAG_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function parseBool(v: string | undefined): boolean {
  return v === "true" || v === "1";
}

/**
 * 메뉴 스타일 값을 SystemSetting 에서 읽어 <style> 태그에 주입.
 * 대시보드 레이아웃에서 useTypographyApply 와 함께 호출됨.
 */
export function useMenuStyleApply() {
  const { data: settings } = useSystemSettings("typography");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const map = settings ? settingsToMap(settings) : {};
    const values: Partial<Record<MenuStyleToken, MenuStyleValues>> = {};
    for (const token of MENU_STYLE_TOKENS) {
      const keys = MENU_STYLE_KEYS[token];
      values[token] = {
        bold: parseBool(map[keys.bold]),
        italic: parseBool(map[keys.italic]),
        color: map[keys.color] ?? "",
      };
    }
    applyMenuStyleOverrides(values);
  }, [settings]);
}

/** 현재 메뉴 스타일 값 읽기 (설정 화면에서 사용) */
export function useMenuStyleValues(): Record<MenuStyleToken, MenuStyleValues> {
  const { data: settings } = useSystemSettings("typography");
  const map = settings ? settingsToMap(settings) : {};
  const result = {} as Record<MenuStyleToken, MenuStyleValues>;
  for (const token of MENU_STYLE_TOKENS) {
    const keys = MENU_STYLE_KEYS[token];
    result[token] = {
      bold: parseBool(map[keys.bold]),
      italic: parseBool(map[keys.italic]),
      color: map[keys.color] ?? "",
    };
  }
  return result;
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
      root.style.setProperty(TYPOGRAPHY_VAR_MAP[tokenKey], `${px}px`);
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
