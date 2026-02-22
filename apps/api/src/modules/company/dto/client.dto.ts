import { IsString, IsOptional, IsEmail, IsIn, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ description: '거래처 코드' })
  @IsString()
  clientCode: string;

  @ApiProperty({ description: '거래처명' })
  @IsString()
  clientName: string;

  @ApiPropertyOptional({ description: '사업자등록번호' })
  @IsOptional()
  @IsString()
  businessNumber?: string;

  @ApiPropertyOptional({ description: '대표자명' })
  @IsOptional()
  @IsString()
  representative?: string;

  @ApiPropertyOptional({ description: '전화번호' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '휴대폰번호' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ description: '이메일' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '비밀번호 (일반가입 시)' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: '우편번호' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: '주소' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '상세주소' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional({ description: '거래처 그룹 ID' })
  @IsOptional()
  @IsString()
  groupId?: string;

  // 회원 타입
  @ApiPropertyOptional({ description: '회원 타입', enum: ['individual', 'business'], default: 'individual' })
  @IsOptional()
  @IsIn(['individual', 'business'])
  memberType?: string;

  // OAuth 정보
  @ApiPropertyOptional({ description: 'OAuth 제공자', enum: ['google', 'naver', 'kakao'] })
  @IsOptional()
  @IsIn(['google', 'naver', 'kakao'])
  oauthProvider?: string;

  @ApiPropertyOptional({ description: 'OAuth 고유 ID' })
  @IsOptional()
  @IsString()
  oauthId?: string;

  // 가격 적용
  @ApiPropertyOptional({ description: '가격 적용 타입', enum: ['standard', 'group'], default: 'standard' })
  @IsOptional()
  @IsIn(['standard', 'group'])
  priceType?: string;

  // 결제 방식
  @ApiPropertyOptional({ description: '결제 방식', enum: ['order', 'credit'], default: 'order' })
  @IsOptional()
  @IsIn(['order', 'credit'])
  paymentType?: string;

  // 신용거래 설정 (관리자 전용)
  @ApiPropertyOptional({ description: '신용거래 허용 여부' })
  @IsOptional()
  @IsBoolean()
  creditEnabled?: boolean;

  @ApiPropertyOptional({ description: '신용거래 기간 (일)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  creditPeriodDays?: number;

  @ApiPropertyOptional({ description: '결제일 (매월 N일)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  creditPaymentDay?: number;

  // 배송 설정 (관리자 전용)
  @ApiPropertyOptional({ description: '배송조건', enum: ['conditional', 'free', 'prepaid', 'cod'], default: 'conditional' })
  @IsOptional()
  @IsIn(['conditional', 'free', 'prepaid', 'cod'])
  shippingType?: string;

  @ApiPropertyOptional({ description: '조건부 무료배송 기준금액 (조건부택배 시 적용)', default: 90000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  freeShippingThreshold?: number;

  @ApiPropertyOptional({ description: '신용등급', enum: ['A', 'B', 'C', 'D'] })
  @IsOptional()
  @IsIn(['A', 'B', 'C', 'D'])
  creditGrade?: string;

  @ApiPropertyOptional({ description: '결제조건 (일)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  paymentTerms?: number;

  @ApiPropertyOptional({ description: '결제조건 구분', enum: ['당월말', '익월말', '2개월여신'] })
  @IsOptional()
  @IsIn(['당월말', '익월말', '2개월여신'])
  paymentCondition?: string;

  @ApiPropertyOptional({ description: '상태', enum: ['active', 'inactive', 'suspended'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: string;

  @ApiPropertyOptional({ description: '중복주문 체크 기간 (개월), null이면 시스템 기본값 사용' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24)
  duplicateCheckMonths?: number;

  @ApiPropertyOptional({ description: '데이터 원본 보관 기간 (개월), 기본값 3개월' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  fileRetentionMonths?: number;

  @ApiPropertyOptional({ description: '영업담당자 (직원 ID)', nullable: true })
  @IsOptional()
  assignedManager?: string | null;

  @ApiPropertyOptional({ description: '실무담당자 이름' })
  @IsOptional()
  @IsString()
  practicalManagerName?: string;

  @ApiPropertyOptional({ description: '실무담당자 연락처' })
  @IsOptional()
  @IsString()
  practicalManagerPhone?: string;

  @ApiPropertyOptional({ description: '결재담당자 이름' })
  @IsOptional()
  @IsString()
  approvalManagerName?: string;

  @ApiPropertyOptional({ description: '결재담당자 연락처' })
  @IsOptional()
  @IsString()
  approvalManagerPhone?: string;

  @ApiPropertyOptional({ description: '담당자' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ description: '담당자 연락처' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: '관리자 메모 (고객에게 비공개)' })
  @IsOptional()
  @IsString()
  adminMemo?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) { }

export class ClientQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: '검색어 (거래처명, 코드, 사업자번호)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '그룹 ID 필터' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ description: '상태 필터' })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: string;

  @ApiPropertyOptional({ description: '회원 타입 필터', enum: ['individual', 'business'] })
  @IsOptional()
  @IsIn(['individual', 'business'])
  memberType?: string;
}

export class ChangeClientGroupDto {
  @ApiPropertyOptional({ description: '그룹 ID (null이면 그룹 해제)' })
  @IsOptional()
  @IsString()
  groupId?: string | null;
}
