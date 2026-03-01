import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsIn, IsBoolean, Length } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh Token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// ========== 고객 이메일/PW 로그인 DTO ==========

export class ClientLoginDto {
  @ApiProperty({ example: 'myid123', description: '아이디' })
  @IsString()
  @IsNotEmpty({ message: '아이디를 입력해주세요' })
  loginId: string;

  @ApiProperty({ example: 'password123', description: '비밀번호' })
  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해주세요' })
  password: string;
}

export class ClientRegisterDto {
  @ApiProperty({ example: 'myid123', description: '아이디' })
  @IsString()
  @IsNotEmpty({ message: '아이디를 입력해주세요' })
  @MinLength(4, { message: '아이디는 4자 이상이어야 합니다' })
  loginId: string;

  @ApiProperty({ example: 'password123', description: '비밀번호' })
  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해주세요' })
  @MinLength(6, { message: '비밀번호는 6자 이상이어야 합니다' })
  password: string;

  @ApiProperty({ example: '홍길동', description: '이름' })
  @IsString()
  @IsNotEmpty({ message: '이름을 입력해주세요' })
  name: string;

  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsNotEmpty({ message: '이메일을 입력해주세요' })
  contactEmail: string;

  @ApiProperty({ example: 'cuid_verification_id', description: '이메일 인증 ID' })
  @IsString()
  @IsNotEmpty({ message: '이메일 인증이 필요합니다' })
  verificationId: string;

  @ApiPropertyOptional({ example: '01012345678', description: '전화번호' })
  @IsOptional()
  @IsString()
  phone?: string;
}

// ========== 이메일 인증 DTO ==========

export class SendEmailVerificationDto {
  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsNotEmpty({ message: '이메일을 입력해주세요' })
  email: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsNotEmpty({ message: '이메일을 입력해주세요' })
  email: string;

  @ApiProperty({ example: '123456', description: '인증코드 6자리' })
  @IsString()
  @IsNotEmpty({ message: '인증코드를 입력해주세요' })
  @Length(6, 6, { message: '인증코드는 6자리입니다' })
  code: string;
}

// ========== 직원 ID/PW 로그인 DTO ==========

export class StaffLoginDto {
  @ApiProperty({ example: 'admin', description: '직원 ID' })
  @IsString()
  @IsNotEmpty({ message: '직원 ID를 입력해주세요' })
  staffId: string;

  @ApiProperty({ example: 'password123', description: '비밀번호' })
  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해주세요' })
  password: string;
}

// ========== 직원 소셜 로그인 DTO ==========

// 직원 회사 이메일 등록
export class StaffRegisterCompanyEmailDto {
  @ApiProperty({ example: 'admin@photomi.co.kr', description: '회사 대표 이메일' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  companyEmail: string;
}

// 직원 승인
export class ApproveStaffDto {
  @ApiProperty({ example: 'employee', description: '부여할 역할 (admin | employee)' })
  @IsString()
  @IsIn(['admin', 'employee'], { message: '유효하지 않은 역할입니다' })
  role: string;
}

// 직원 역할 변경
export class ChangeStaffRoleDto {
  @ApiProperty({ example: 'admin', description: '변경할 역할 (super_admin | admin | employee)' })
  @IsString()
  @IsIn(['super_admin', 'admin', 'employee'], { message: '유효하지 않은 역할입니다' })
  role: string;
}

// 로그인 컨텍스트 선택
export class SelectContextDto {
  @ApiProperty({ description: '임시 인증 토큰' })
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @ApiProperty({ example: 'personal', description: '컨텍스트 타입 (personal | employee)' })
  @IsString()
  @IsIn(['personal', 'employee'])
  contextType: string;

  @ApiPropertyOptional({ description: '선택한 Employment ID (employee 선택 시 필수)' })
  @IsOptional()
  @IsString()
  employmentId?: string;

  @ApiPropertyOptional({ example: true, description: '로그인 상태 유지' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
