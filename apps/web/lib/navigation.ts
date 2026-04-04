/**
 * 사이드바 메뉴 데이터 - Single Source of Truth
 * 접근권한 관리와 사이드바 렌더링 모두 이 데이터를 사용합니다.
 */

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
  key: string;       // id for categories, href for children
  label: string;
  parentId?: string; // undefined for top-level
}

/**
 * 메뉴 데이터 (아이콘 제외)
 * sidebar.tsx에서 아이콘을 매핑하여 사용합니다.
 */
export const DEFAULT_NAV_DATA: NavItemDef[] = [
  {
    id: "dashboard",
    name: "대시보드",
    href: "/dashboard",
  },
  {
    id: "basic-info",
    name: "기초정보",
    children: [
      { name: "기초정보 설정", href: "/settings/basic" },
      { name: "용지관리", href: "/master/papers" },
      { name: "표지원단정보", href: "/master/fabrics" },
      { name: "카테고리", href: "/company/categories" },
      { name: "규격정보", href: "/master/specifications" },
      { name: "공용동판관리", href: "/settings/public-copper-plates" },
      { name: "JDF 표준", href: "/master/jdf" },
      { name: "가격관리", href: "/pricing/production" },
    ],
  },
  {
    id: "company",
    name: "회사정보",
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
    children: [
      { name: "상품목록", href: "/products" },
      { name: "상품등록", href: "/products/new" },
      { name: "반제품", href: "/products/half" },
    ],
  },
  {
    id: "orders",
    name: "주문관리",
    children: [
      { name: "주문목록", href: "/orders" },
      { name: "접수대기", href: "/orders/pending" },
      { name: "공정 현황", href: "/orders/production" },
      { name: "공정 스캔", href: "/orders/process-scan" },
      { name: "배송관리", href: "/orders/shipping" },
      { name: "마감관리", href: "/orders/reception" },
    ],
  },
  {
    id: "accounting",
    name: "회계관리",
    children: [
      { name: "계정과목관리", href: "/accounting/accounts" },
      { name: "전표관리", href: "/accounting/journals" },
      { name: "매출거래처원장", href: "/accounting/client-ledger/sales" },
      { name: "매입거래처원장", href: "/accounting/client-ledger/purchases" },
      { name: "매출원장", href: "/accounting/sales" },
      { name: "매입관리", href: "/accounting/purchases" },
      { name: "미수금관리", href: "/accounting/receivables" },
      { name: "입금내역 조회", href: "/accounting/deposits" },
      { name: "미지급관리", href: "/accounting/payables" },
      { name: "정산관리", href: "/accounting/settlements" },
      { name: "세금계산서관리", href: "/accounting/tax-invoices" },
    ],
  },
  {
    id: "cs",
    name: "CS관리",
    children: [
      { name: "CS대시보드", href: "/cs" },
      { name: "상담목록", href: "/cs/consultations" },
      { name: "상담등록", href: "/cs/consultations/new" },
      { name: "상담분류", href: "/cs/categories" },
      { name: "상담가이드", href: "/cs/guides" },
    ],
  },
  {
    id: "schedule",
    name: "일정관리",
    href: "/schedule",
  },
  {
    id: "shooting",
    name: "촬영관리",
    children: [
      { name: "촬영일정", href: "/shooting" },
      { name: "작가관리", href: "/shooting/photographers" },
    ],
  },
  {
    id: "hr-committee",
    name: "인사위원회",
    children: [
      { name: "위원회 관리", href: "/hr-committee" },
      { name: "안건 목록", href: "/hr-committee/agendas" },
      { name: "포상/징계", href: "/hr-committee/discipline" },
    ],
  },
  {
    id: "leave",
    name: "휴가관리",
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
    children: [
      { name: "방문 통계", href: "/analytics" },
      { name: "의심 IP 관리", href: "/analytics/suspicious-ips" },
    ],
  },
];

/**
 * 메뉴 데이터를 flat한 권한 항목 리스트로 변환
 */
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
