import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsObject,
  IsDateString,
  Min,
  Max,
  IsEnum,
  IsNotEmpty,
  MinLength,
} from 'class-validator';

export enum ViewScope {
  OWN = 'own',
  ALL = 'all',
}

// 메뉴 권한 항목
export class MenuPermission {
  @ApiProperty({ description: '메뉴 코드' })
  menuCode: string;

  @ApiProperty({ description: '조회 권한' })
  canView: boolean;

  @ApiPropertyOptional({ description: '수정 권한' })
  canEdit?: boolean;

  @ApiPropertyOptional({ description: '삭제 권한' })
  canDelete?: boolean;
}

// 공정 권한 항목
export class ProcessPermission {
  @ApiProperty({ description: '공정 코드' })
  processCode: string;

  @ApiProperty({ description: '조회 권한' })
  canView: boolean;

  @ApiPropertyOptional({ description: '수정 권한' })
  canEdit?: boolean;

  @ApiPropertyOptional({ description: '삭제 권한' })
  canDelete?: boolean;
}

export class CreateStaffDto {
  @ApiProperty({ description: '직원 ID (로그인용)', example: 'smsl1122' })
  @IsString()
  staffId: string;

  @ApiProperty({ description: '비밀번호 (최소 4자)' })
  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해주세요' })
  @MinLength(4, { message: '비밀번호는 최소 4자 이상이어야 합니다' })
  password: string;

  @ApiProperty({ description: '실명', example: '송민석' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '소속 지점 ID' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: '부서 ID' })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: '직책', example: '대리' })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiPropertyOptional({ description: '전화번호', example: '055-000-0000' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: '휴대폰', example: '011-000-0000' })
  @IsString()
  @IsOptional()
  mobile?: string;

  @ApiPropertyOptional({ description: '이메일', example: '2018602186' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: '우편번호' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ description: '주소' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: '상세주소' })
  @IsString()
  @IsOptional()
  addressDetail?: string;

  @ApiPropertyOptional({ description: '정산등급 (1-15)', example: 15, default: 1 })
  @IsInt()
  @Min(0)
  @Max(15)
  @IsOptional()
  settlementGrade?: number;

  @ApiPropertyOptional({ description: '허용 IP 목록', example: ['1.212.201.147'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedIps?: string[];

  @ApiPropertyOptional({ description: '관리자 화면에서 수정 가능', default: false })
  @IsBoolean()
  @IsOptional()
  canEditInManagerView?: boolean;

  @ApiPropertyOptional({ description: '관리자 로그인 허용', default: false })
  @IsBoolean()
  @IsOptional()
  canLoginAsManager?: boolean;

  @ApiPropertyOptional({ description: '입금대기 단계변경 권한', default: false })
  @IsBoolean()
  @IsOptional()
  canChangeDepositStage?: boolean;

  @ApiPropertyOptional({ description: '접수대기 단계변경 권한', default: false })
  @IsBoolean()
  @IsOptional()
  canChangeReceptionStage?: boolean;

  @ApiPropertyOptional({ description: '주문취소 단계변경 권한', default: false })
  @IsBoolean()
  @IsOptional()
  canChangeCancelStage?: boolean;

  @ApiPropertyOptional({ description: '회원수정 버튼 노출', default: false })
  @IsBoolean()
  @IsOptional()
  canEditMemberInfo?: boolean;

  @ApiPropertyOptional({ description: '정산마감 버튼 노출', default: false })
  @IsBoolean()
  @IsOptional()
  canViewSettlement?: boolean;

  @ApiPropertyOptional({ description: '주문금액변경 버튼 노출', default: false })
  @IsBoolean()
  @IsOptional()
  canChangeOrderAmount?: boolean;

  @ApiPropertyOptional({ description: '회원 조회 범위', enum: ViewScope, default: ViewScope.OWN })
  @IsEnum(ViewScope)
  @IsOptional()
  memberViewScope?: ViewScope;

  @ApiPropertyOptional({ description: '매출 조회 범위', enum: ViewScope, default: ViewScope.OWN })
  @IsEnum(ViewScope)
  @IsOptional()
  salesViewScope?: ViewScope;

  @ApiPropertyOptional({ description: '직원 공개 범위: 개인 (본인만)', default: false })
  @IsBoolean()
  @IsOptional()
  isPersonal?: boolean;

  @ApiPropertyOptional({ description: '직원 공개 범위: 부서 (같은 부서)', default: true })
  @IsBoolean()
  @IsOptional()
  isDepartment?: boolean;

  @ApiPropertyOptional({ description: '직원 공개 범위: 전체 (모든 직원)', default: false })
  @IsBoolean()
  @IsOptional()
  isCompany?: boolean;

  @ApiPropertyOptional({ description: '메뉴 접근 권한' })
  @IsObject()
  @IsOptional()
  menuPermissions?: Record<string, MenuPermission>;

  @ApiPropertyOptional({ description: '카테고리 접근 권한' })
  @IsObject()
  @IsOptional()
  categoryPermissions?: Record<string, boolean>;

  @ApiPropertyOptional({ description: '공정별 권한' })
  @IsObject()
  @IsOptional()
  processPermissions?: Record<string, ProcessPermission>;

  @ApiPropertyOptional({ description: '활성 상태', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '최고 관리자 메모' })
  @IsString()
  @IsOptional()
  adminMemo?: string;

  @ApiPropertyOptional({ description: '입사일' })
  @IsDateString()
  @IsOptional()
  joinDate?: string;
}

export class UpdateStaffDto extends PartialType(CreateStaffDto) { }

export class StaffChangePasswordDto {
  @ApiProperty({ description: '새 비밀번호 (최소 4자)' })
  @IsString()
  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요' })
  @MinLength(4, { message: '비밀번호는 최소 4자 이상이어야 합니다' })
  newPassword: string;
}

export class StaffQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsInt()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20 })
  @IsInt()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '검색어 (이름, 직원ID)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: '지점 ID' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: '부서 ID' })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: '활성 상태만' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AssignClientsDto {
  @ApiProperty({ description: '담당 회원(거래처) ID 목록' })
  @IsArray()
  @IsString({ each: true })
  clientIds: string[];
}

// 부서 DTO
export class CreateDepartmentDto {
  @ApiProperty({ description: '부서 코드', example: 'DEV' })
  @IsString()
  code: string;

  @ApiProperty({ description: '부서명', example: '개발팀' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 상태', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) { }
