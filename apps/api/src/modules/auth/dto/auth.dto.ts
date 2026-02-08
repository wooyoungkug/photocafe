import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsIn, IsBoolean } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com', description: '이메일' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호' })
  @IsString()
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호' })
  @IsString()
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다' })
  password: string;

  @ApiProperty({ example: '홍길동', description: '이름' })
  @IsString()
  @IsNotEmpty({ message: '이름은 필수입니다' })
  name: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh Token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword', description: '현재 비밀번호' })
  @IsString()
  @IsNotEmpty({ message: '현재 비밀번호는 필수입니다' })
  currentPassword: string;

  @ApiProperty({ example: 'newPassword123', description: '새 비밀번호' })
  @IsString()
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다' })
  newPassword: string;
}

// ========== 고객 회원가입 DTO ==========

// 개인 고객 회원가입
export class RegisterIndividualDto {
  @ApiProperty({ example: '홍길동', description: '이름' })
  @IsString()
  @IsNotEmpty({ message: '이름은 필수입니다' })
  name: string;

  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호' })
  @IsString()
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다' })
  password: string;

  @ApiPropertyOptional({ example: '010-1234-5678', description: '휴대폰 번호' })
  @IsOptional()
  @IsString()
  mobile?: string;
}

// 스튜디오(B2B) 회원가입
export class RegisterStudioDto {
  // 기본 인적 사항
  @ApiProperty({ example: '행복스튜디오', description: '스튜디오명 (상호)' })
  @IsString()
  @IsNotEmpty({ message: '스튜디오명은 필수입니다' })
  studioName: string;

  @ApiProperty({ example: '홍길동', description: '대표자명' })
  @IsString()
  @IsNotEmpty({ message: '대표자명은 필수입니다' })
  representative: string;

  @ApiPropertyOptional({ example: '김영희', description: '실무 담당자명' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ example: '010-9876-5432', description: '실무 담당자 연락처' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ example: '02-1234-5678', description: '대표 전화번호' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '010-1234-5678', description: '휴대폰 번호' })
  @IsString()
  @IsNotEmpty({ message: '휴대폰 번호는 필수입니다' })
  mobile: string;

  @ApiProperty({ example: 'studio@example.com', description: '이메일' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호' })
  @IsString()
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다' })
  password: string;

  // 사업자 정보
  @ApiProperty({ example: '123-45-67890', description: '사업자등록번호' })
  @IsString()
  @IsNotEmpty({ message: '사업자등록번호는 필수입니다' })
  businessNumber: string;

  @ApiPropertyOptional({ example: '사진촬영업', description: '업태' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ example: '웨딩, 베이비', description: '종목' })
  @IsOptional()
  @IsString()
  businessCategory?: string;

  @ApiPropertyOptional({ example: '06234', description: '우편번호' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: '서울시 강남구 테헤란로 123', description: '사업장 주소' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '456호', description: '상세주소' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional({ example: 'tax@example.com', description: '세금계산서 수신 이메일' })
  @IsOptional()
  @IsEmail()
  taxInvoiceEmail?: string;

  @ApiPropertyOptional({ example: 'electronic', description: '세금계산서 발행 방법' })
  @IsOptional()
  @IsIn(['electronic', 'fax', 'mail'])
  taxInvoiceMethod?: string;

  // 스튜디오 특성 (영업 데이터)
  @ApiPropertyOptional({ example: 'wedding', description: '주력 촬영 장르' })
  @IsOptional()
  @IsIn(['wedding', 'baby', 'profile', 'snap', 'family', 'commercial', 'etc'])
  mainGenre?: string;

  @ApiPropertyOptional({ example: '10to50', description: '월 평균 주문 예상량' })
  @IsOptional()
  @IsIn(['under10', '10to50', 'over50'])
  monthlyOrderVolume?: string;

  @ApiPropertyOptional({ example: 'sRGB', description: '주요 사용 색상 프로필' })
  @IsOptional()
  @IsIn(['sRGB', 'AdobeRGB'])
  colorProfile?: string;

  @ApiPropertyOptional({ example: 'referral', description: '유입 경로' })
  @IsOptional()
  @IsIn(['referral', 'search', 'exhibition', 'sns', 'etc'])
  acquisitionChannel?: string;

  // 제품 선호도
  @ApiPropertyOptional({ example: '11x14', description: '선호 앨범 규격' })
  @IsOptional()
  @IsString()
  preferredSize?: string;

  @ApiPropertyOptional({ example: 'glossy', description: '선호 내지 재질' })
  @IsOptional()
  @IsIn(['glossy', 'matte', 'luster', 'metallic'])
  preferredFinish?: string;

  @ApiPropertyOptional({ example: false, description: '로고/낙관 사용 여부' })
  @IsOptional()
  @IsBoolean()
  hasLogo?: boolean;

  @ApiPropertyOptional({ example: '박스에 유리주의 스티커 필수', description: '배송 요청사항' })
  @IsOptional()
  @IsString()
  deliveryNote?: string;
}

// 클라이언트 로그인 DTO
export class ClientLoginDto {
  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호' })
  @IsString()
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다' })
  password: string;
}

// 관리자(직원) 로그인 DTO
export class AdminLoginDto {
  @ApiProperty({ example: 'smsl1122', description: '직원 ID' })
  @IsString()
  @IsNotEmpty({ message: '직원 ID는 필수입니다' })
  staffId: string;

  @ApiProperty({ example: 'password123', description: '비밀번호' })
  @IsString()
  @MinLength(4, { message: '비밀번호는 최소 4자 이상이어야 합니다' })
  password: string;

  @ApiPropertyOptional({ example: true, description: '로그인 상태 유지' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
