// 조회 범위
export type ViewScope = 'own' | 'all';

// 메뉴 권한 (Record<string, boolean> - key: 메뉴 id 또는 href, value: 접근 허용 여부)
export type MenuPermissions = Record<string, boolean>;

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
  teams?: TeamSummary[];
  _count?: {
    staff: number;
    teams: number;
  };
}

// 팀 요약 (부서 목록 내)
export interface TeamSummary {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  leaderId?: string;
  leader?: { id: string; staffId: string; name: string };
  _count?: { staff: number };
}

// 팀
export interface Team {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  department?: { id: string; code: string; name: string };
  leaderId?: string;
  leader?: { id: string; staffId: string; name: string; position?: string };
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  staff?: { id: string; staffId: string; name: string; position?: string; email?: string; isActive: boolean }[];
  _count?: { staff: number };
}

export interface CreateTeamRequest {
  code: string;
  name: string;
  departmentId: string;
  leaderId?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateTeamRequest = Partial<CreateTeamRequest>;

export interface TeamQuery {
  departmentId?: string;
  isActive?: boolean;
}

// 감사 로그
export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, { old: any; new: any }>;
  performedBy: string;
  performerName: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
  performedBy?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
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
  teamId?: string;
  team?: Team;
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
  menuPermissions?: MenuPermissions;
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
  teamId?: string;
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
  menuPermissions?: MenuPermissions;
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
  teamId?: string;
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

// 메뉴 권한 목록은 lib/navigation.ts의 DEFAULT_NAV_DATA에서 자동 생성됩니다.

// 카테고리 권한 목록
export const CATEGORY_PERMISSIONS = {
  output: { label: '출력전용', code: 'output' },
  album: { label: '앨범전용', code: 'album' },
  frame: { label: '액자전용', code: 'frame' },
  booklet: { label: '인쇄책자전용', code: 'booklet' },
  goods: { label: '굿즈전용', code: 'goods' },
} as const;
