/**
 * 네비게이션 메뉴 트리 - Single Source of Truth
 *
 * 사이드바 / 상단 메뉴바 / 모바일 시트 / 권한 관리 / 핀(즐겨찾기) 모두 이 데이터를 사용합니다.
 *
 * Backward compatibility:
 * - `DEFAULT_NAV_DATA`, `NavItemDef`, `NavChildDef`, `getPermissionEntries`, `PermissionEntry`
 *   는 권한 관리 화면에서 계속 사용됩니다 (apps/web/app/(dashboard)/company/employees/page.tsx).
 *   `NAVIGATION` 으로부터 자동 파생됩니다.
 */

import {
  Building2,
  CalendarDays,
  CreditCard,
  Headphones,
  Layers,
  PieChart,
  Receipt,
  ShoppingBag,
  BarChart2,
  TreePalm,
  Users,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (icon-aware, primary)
// ---------------------------------------------------------------------------

export interface NavChild {
  name: string;
  href: string;
  /** 메가메뉴 컬럼 그룹핑용 (선택). 같은 group 값이면 같은 컬럼에 배치 */
  group?: string;
}

export interface NavItem {
  id: string;
  name: string;
  href?: string;
  icon: LucideIcon;
  children?: NavChild[];
}

// ---------------------------------------------------------------------------
// Types (legacy, icon-less — kept for backward compatibility)
// ---------------------------------------------------------------------------

export interface NavChildDef {
  name: string;
  href: string;
}

export interface NavItemDef {
  id: string;
  name: string;
  href?: string;
  children?: NavChildDef[];
}

export interface PermissionEntry {
  key: string;
  label: string;
  parentId?: string;
}

// ---------------------------------------------------------------------------
// Navigation tree (SSOT)
// ---------------------------------------------------------------------------

export const NAVIGATION: NavItem[] = [
  {
    id: "basic-info",
    name: "기초정보",
    icon: Layers,
    children: [
      { name: "기초정보 설정", href: "/settings/basic", group: "설정" },
      { name: "감사로그", href: "/settings/audit-logs", group: "설정" },
      { name: "용지관리", href: "/master/papers", group: "원자재" },
      { name: "표지원단정보", href: "/master/fabrics", group: "원자재" },
      { name: "카테고리", href: "/company/categories", group: "분류" },
      { name: "규격정보", href: "/master/specifications", group: "분류" },
      { name: "공용동판관리", href: "/settings/public-copper-plates", group: "생산" },
      { name: "JDF 표준", href: "/master/jdf", group: "생산" },
      { name: "임포지션 프리셋", href: "/settings/imposition-presets", group: "생산" },
      { name: "가격관리", href: "/pricing/production", group: "가격" },
    ],
  },
  {
    id: "company",
    name: "회사정보",
    icon: Building2,
    children: [
      { name: "환경설정", href: "/company/settings" },
      { name: "직원관리", href: "/company/employees" },
      { name: "부서/팀관리", href: "/company/departments" },
      { name: "회원관리", href: "/company/members" },
      { name: "회원그룹", href: "/company/member-groups" },
    ],
  },
  {
    id: "products",
    name: "상품관리",
    icon: ShoppingBag,
    children: [
      { name: "상품목록", href: "/products" },
      { name: "상품등록", href: "/products/new" },
      { name: "반제품", href: "/products/half" },
    ],
  },
  {
    id: "orders",
    name: "주문관리",
    icon: Receipt,
    children: [
      { name: "주문목록", href: "/orders", group: "주문" },
      { name: "접수대기", href: "/orders/pending", group: "주문" },
      { name: "공정 현황", href: "/orders/production", group: "공정" },
      { name: "공정 스캔", href: "/orders/process-scan", group: "공정" },
      { name: "출력대기", href: "/orders/print-queue", group: "공정" },
      { name: "배송관리", href: "/orders/shipping", group: "마감" },
      { name: "마감관리", href: "/orders/reception", group: "마감" },
    ],
  },
  {
    id: "accounting",
    name: "회계관리",
    icon: CreditCard,
    children: [
      { name: "계정과목관리", href: "/accounting/accounts", group: "기준정보" },
      { name: "전표관리", href: "/accounting/journals", group: "기준정보" },
      { name: "매출원장", href: "/accounting/sales", group: "매출관리" },
      { name: "매출거래처원장", href: "/accounting/client-ledger/sales", group: "매출관리" },
      { name: "미수금관리", href: "/accounting/receivables", group: "매출관리" },
      { name: "입금내역 조회", href: "/accounting/deposits", group: "매출관리" },
      { name: "매입관리", href: "/accounting/purchases", group: "매입/지급" },
      { name: "매입거래처원장", href: "/accounting/client-ledger/purchases", group: "매입/지급" },
      { name: "미지급관리", href: "/accounting/payables", group: "매입/지급" },
      { name: "정산관리", href: "/accounting/settlements", group: "정산/세금" },
      { name: "세금계산서관리", href: "/accounting/tax-invoices", group: "정산/세금" },
    ],
  },
  {
    id: "cs",
    name: "CS관리",
    icon: Headphones,
    children: [
      { name: "CS대시보드", href: "/cs", group: "현황" },
      { name: "상담목록", href: "/cs/consultations", group: "상담" },
      { name: "상담등록", href: "/cs/consultations/new", group: "상담" },
      { name: "상담분류", href: "/cs/categories", group: "설정" },
      { name: "상담가이드", href: "/cs/guides", group: "설정" },
      { name: "매입처 견적관리", href: "/cs/purchase-quotations", group: "견적" },
      { name: "매출처 견적관리", href: "/cs/quotations", group: "견적" },
    ],
  },
  {
    id: "shooting",
    name: "일정관리",
    icon: CalendarDays,
    children: [
      { name: "일정관리", href: "/schedule" },
      { name: "노트장", href: "/schedule/notebook" },
      { name: "촬영일정", href: "/shooting" },
      { name: "작가관리", href: "/shooting/photographers" },
    ],
  },
  {
    id: "hr-committee",
    name: "인사위원회",
    icon: Users,
    children: [
      { name: "위원회 관리", href: "/hr-committee" },
      { name: "안건 목록", href: "/hr-committee/agendas" },
      { name: "포상/징계", href: "/hr-committee/discipline" },
    ],
  },
  {
    id: "leave",
    name: "휴가관리",
    icon: TreePalm,
    children: [
      { name: "내 휴가현황", href: "/leave" },
      { name: "휴가신청 관리", href: "/leave/requests" },
      { name: "휴가 캘린더", href: "/leave/calendar" },
      { name: "잔여일수 관리", href: "/leave/balances" },
      { name: "휴가 설정", href: "/leave/settings" },
    ],
  },
  {
    id: "statistics",
    name: "통계",
    icon: PieChart,
    children: [
      { name: "매출통계", href: "/statistics/sales" },
      { name: "품목분류별", href: "/statistics/sales-categories" },
      { name: "회원별", href: "/statistics/members" },
      { name: "제본방법별", href: "/statistics/binding" },
    ],
  },
  {
    id: "analytics",
    name: "접속 통계",
    icon: BarChart2,
    children: [
      { name: "방문 통계", href: "/analytics" },
      { name: "의심 IP 관리", href: "/analytics/suspicious-ips" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Legacy data (auto-derived from NAVIGATION)
// ---------------------------------------------------------------------------

export const DEFAULT_NAV_DATA: NavItemDef[] = NAVIGATION.map(({ id, name, href, children }) => ({
  id,
  name,
  ...(href ? { href } : {}),
  ...(children
    ? { children: children.map(({ name: cName, href: cHref }) => ({ name: cName, href: cHref })) }
    : {}),
}));

export function getPermissionEntries(): PermissionEntry[] {
  const entries: PermissionEntry[] = [];
  for (const item of DEFAULT_NAV_DATA) {
    entries.push({ key: item.id, label: item.name });
    if (item.children) {
      for (const child of item.children) {
        entries.push({ key: child.href, label: child.name, parentId: item.id });
      }
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// 권한 필터
// ---------------------------------------------------------------------------

export type MenuPermissions = Record<string, unknown>;

function hasPerm(menuPerms: MenuPermissions, key: string): boolean {
  const val = menuPerms[key];
  if (val === true) return true;
  if (val && typeof val === "object" && (val as Record<string, unknown>).canView === true) {
    return true;
  }
  return false;
}

export function getFilteredNavigation(
  menuPermissions: MenuPermissions | undefined,
  isSuperAdmin: boolean,
  navigation: NavItem[] = NAVIGATION,
): NavItem[] {
  if (isSuperAdmin) return navigation;
  const perms = menuPermissions ?? {};

  return navigation
    .map((item) => {
      if (!perms[item.id]) return null;
      if (!item.children) return item;
      const visibleChildren = item.children.filter((child) => hasPerm(perms, child.href));
      if (visibleChildren.length === 0) return null;
      return { ...item, children: visibleChildren };
    })
    .filter(Boolean) as NavItem[];
}

/** 사용자가 특정 href에 접근 가능한지 확인 (핀 메뉴 필터용) */
export function canAccessHref(
  href: string,
  menuPermissions: MenuPermissions | undefined,
  isSuperAdmin: boolean,
  navigation: NavItem[] = NAVIGATION,
): boolean {
  if (isSuperAdmin) return true;
  const perms = menuPermissions ?? {};
  for (const item of navigation) {
    if (item.href === href) return !!perms[item.id];
    if (item.children) {
      const child = item.children.find((c) => c.href === href);
      if (child) return !!perms[item.id] && hasPerm(perms, child.href);
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// 메가메뉴 적용 기준 (서브 6개 이상)
// ---------------------------------------------------------------------------

export const MEGA_MENU_THRESHOLD = 6;

export function shouldUseMegaMenu(item: NavItem): boolean {
  return !!item.children && item.children.length >= MEGA_MENU_THRESHOLD;
}

/** 메가메뉴 컬럼 그룹핑 - { groupName: NavChild[] } 순서를 유지하여 반환 */
export function groupChildrenByGroup(children: NavChild[]): Array<[string, NavChild[]]> {
  const map = new Map<string, NavChild[]>();
  for (const child of children) {
    const key = child.group ?? "기타";
    const list = map.get(key);
    if (list) list.push(child);
    else map.set(key, [child]);
  }
  return Array.from(map.entries());
}

// ---------------------------------------------------------------------------
// 핀 메뉴 lookup
// ---------------------------------------------------------------------------

export interface FlatMenuEntry {
  href: string;
  name: string;
  parentName?: string;
  parentId?: string;
  icon: LucideIcon;
}

/** href로 메뉴 항목 검색 — 핀 라벨/아이콘 표시용 */
export function findMenuByHref(
  href: string,
  navigation: NavItem[] = NAVIGATION,
): FlatMenuEntry | null {
  for (const item of navigation) {
    if (item.href === href) {
      return { href, name: item.name, icon: item.icon, parentId: item.id };
    }
    if (item.children) {
      const child = item.children.find((c) => c.href === href);
      if (child) {
        return {
          href: child.href,
          name: child.name,
          parentName: item.name,
          parentId: item.id,
          icon: item.icon,
        };
      }
    }
  }
  return null;
}

/** 모든 메뉴 항목 평탄화 — 핀 추가 다이얼로그 검색용 */
export function flattenNavigation(navigation: NavItem[] = NAVIGATION): FlatMenuEntry[] {
  const list: FlatMenuEntry[] = [];
  for (const item of navigation) {
    if (item.href) {
      list.push({ href: item.href, name: item.name, icon: item.icon, parentId: item.id });
    }
    if (item.children) {
      for (const child of item.children) {
        list.push({
          href: child.href,
          name: child.name,
          parentName: item.name,
          parentId: item.id,
          icon: item.icon,
        });
      }
    }
  }
  return list;
}
