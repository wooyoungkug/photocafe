// 조회 범위
export type ViewScope = 'own' | 'all';

// 메뉴 권한
export interface MenuPermission {
  menuCode: string;
  canView: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

// 공정 권한
export interface ProcessPermission {
  processCode: string;
  canView: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

// 부서
export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    staff: number;
  };
}

// 지점 (간소화)
export interface BranchSimple {
  id: string;
  branchCode: string;
  branchName: string;
}

// 담당 회원(거래처) 정보
export interface AssignedClient {
  id: string;
  clientId: string;
  isPrimary: boolean;
  createdAt: string;
  client: {
    id: string;
    clientCode: string;
    clientName: string;
    status: string;
  };
}

// 직원
export interface Staff {
  id: string;
  staffId: string;
  name: string;

  // 소속 정보
  branchId?: string;
  branch?: BranchSimple;
  departmentId?: string;
  department?: Department;
  position?: string;

  // 연락처 정보
  phone?: string;
  mobile?: string;
  email?: string;

  // 주소 정보
  postalCode?: string;
  address?: string;
  addressDetail?: string;

  // 정산 등급
  settlementGrade: number;

  // 접근 IP 제한
  allowedIps: string[];

  // View 권한 설정
  canEditInManagerView: boolean;

  // 최고관리자 여부
  isSuperAdmin: boolean;

  // 접근 권한 설정
  canLoginAsManager: boolean;

  // 단계변경 권한
  canChangeDepositStage: boolean;
  canChangeReceptionStage: boolean;
  canChangeCancelStage: boolean;

  // 버튼 노출 권한
  canEditMemberInfo: boolean;
  canViewSettlement: boolean;
  canChangeOrderAmount: boolean;

  // 조회 범위
  memberViewScope: ViewScope;
  salesViewScope: ViewScope;

  // 직원 공개 범위 (일정 관리와 동일한 방식)
  isPersonal: boolean;    // 개인: 본인만 볼 수 있음
  isDepartment: boolean;  // 부서: 같은 부서 직원들이 볼 수 있음
  isCompany: boolean;     // 전체: 모든 직원이 볼 수 있음

  // 권한 설정 (JSON)
  menuPermissions?: Record<string, MenuPermission>;
  categoryPermissions?: Record<string, boolean>;
  processPermissions?: Record<string, ProcessPermission>;

  // 상태
  isActive: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;

  // 메모
  adminMemo?: string;

  // 입사일
  joinDate: string;

  createdAt: string;
  updatedAt: string;

  // 담당 회원
  assignedClients?: AssignedClient[];
  _count?: {
    assignedClients: number;
  };
}

// 직원 생성 요청
export interface CreateStaffRequest {
  staffId: string;
  password: string;
  name: string;
  branchId?: string;
  departmentId?: string;
  position?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  settlementGrade?: number;
  allowedIps?: string[];
  canEditInManagerView?: boolean;
  isSuperAdmin?: boolean;
  canLoginAsManager?: boolean;
  canChangeDepositStage?: boolean;
  canChangeReceptionStage?: boolean;
  canChangeCancelStage?: boolean;
  canEditMemberInfo?: boolean;
  canViewSettlement?: boolean;
  canChangeOrderAmount?: boolean;
  memberViewScope?: ViewScope;
  salesViewScope?: ViewScope;
  isPersonal?: boolean;
  isDepartment?: boolean;
  isCompany?: boolean;
  menuPermissions?: Record<string, MenuPermission>;
  categoryPermissions?: Record<string, boolean>;
  processPermissions?: Record<string, ProcessPermission>;
  isActive?: boolean;
  adminMemo?: string;
  joinDate?: string;
}

// 직원 수정 요청
export type UpdateStaffRequest = Partial<CreateStaffRequest>;

// 직원 쿼리
export interface StaffQuery {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  departmentId?: string;
  isActive?: boolean;
}

// 부서 생성/수정 요청
export interface CreateDepartmentRequest {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest>;

// 메뉴 권한 목록 (프론트엔드용)
export const MENU_PERMISSIONS = {
  // 환경설정
  settingsEnv: { label: '환경설정', code: 'settings_env' },
  staffManagement: { label: '직원관리', code: 'staff_management' },

  // 홈페이지 관리
  homepageManagement: { label: '홈페이지관리', code: 'homepage_management' },
  homepageMenu: { label: '홈페이지 메뉴관리', code: 'homepage_menu' },
  homepageDesign: { label: '홈페이지 디자인관리', code: 'homepage_design' },
  homepagePopup: { label: '홈페이지 팝업관리', code: 'homepage_popup' },
  noticeManagement: { label: '게시판관리', code: 'notice_management' },

  // 설정 관리
  settingManagement: { label: '세팅관리', code: 'setting_management' },
  formManagement: { label: '폼지관리', code: 'form_management' },
  specManagement: { label: '규격관리', code: 'spec_management' },
  paperManagement: { label: '표지관리', code: 'paper_management' },
  equipmentManagement: { label: '동판관리', code: 'equipment_management' },
  connectionManagement: { label: '접속관리', code: 'connection_management' },

  // 가격 관리
  priceManagement: { label: '가격관리', code: 'price_management' },
  standardPrice: { label: '표준가격관리', code: 'standard_price' },
  groupPrice: { label: '그룹가격관리', code: 'group_price' },

  // 상품 관리
  productRegistration: { label: '상품등록', code: 'product_registration' },
  halfProductCategory: { label: '반제품 분류관리', code: 'half_product_category' },
  halfProductRegistration: { label: '반제품 등록관리', code: 'half_product_registration' },
  podProductManagement: { label: 'POD상품관리', code: 'pod_product_management' },

  // 주문 관리
  orderManagement: { label: '주문관리', code: 'order_management' },
  orderList: { label: '주문관리', code: 'order_list' },
  testOrderManagement: { label: '테스트입금관리', code: 'test_order_management' },
  transactionHistory: { label: '거래내역관리', code: 'transaction_history' },
  watermarkManagement: { label: '접수마감관리', code: 'watermark_management' },
  warehouseManagement: { label: '외장등록관리', code: 'warehouse_management' },

  // 생산 관리
  productionManagement: { label: '생산관리', code: 'production_management' },
  productionSchedule: { label: '커버생산 관리대장', code: 'production_schedule' },
  coverInputManagement: { label: '커버 입고관리', code: 'cover_input_management' },
  productionSummary: { label: '생산별 집계표', code: 'production_summary' },
  productionOutputSummary: { label: '생산별 매출집계표', code: 'production_output_summary' },

  // 거래 관리
  transactionManagement: { label: '거래관리', code: 'transaction_management' },
  dailyTransaction: { label: '일별 거래내역관리', code: 'daily_transaction' },
  monthlyTransaction: { label: '월별 거래내역관리', code: 'monthly_transaction' },
  customerTransaction: { label: '거래처별관리대장', code: 'customer_transaction' },
  taxInvoice: { label: '세금계산서발행', code: 'tax_invoice' },

  // 입출금 관리
  cashManagement: { label: '입출금관리', code: 'cash_management' },
  depositManagement: { label: '입금관리', code: 'deposit_management' },
  depositHistory: { label: '퇴직금 사항내역', code: 'deposit_history' },
  adminModification: { label: '관리자 수정내역', code: 'admin_modification' },
  personalPayment: { label: '개인결제관리', code: 'personal_payment' },

  // 통계
  statisticsDisplay: { label: '통계및게시판', code: 'statistics_display' },
  salesStatistics: { label: '매출통계', code: 'sales_statistics' },
} as const;

// 카테고리 권한 목록
export const CATEGORY_PERMISSIONS = {
  output: { label: '출력전용', code: 'output' },
  album: { label: '앨범전용', code: 'album' },
  frame: { label: '액자전용', code: 'frame' },
  booklet: { label: '인쇄책자전용', code: 'booklet' },
  goods: { label: '굿즈전용', code: 'goods' },
} as const;
