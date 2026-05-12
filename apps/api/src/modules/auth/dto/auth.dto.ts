import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsNotEmpty, IsOptional, IsIn, IsBoolean, Length } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({ description: 'Refresh Token (쿠키 기반이면 생략 가능)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
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
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다' })
  password: string;

  @ApiProperty({ example: '홍길동', description: '이름' })
  @IsString()
  @IsNotEmpty({ message: '이름을 입력해주세요' })
  name: string;

  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsNotEmpty({ message: '이메일을 입력해주세요' })
  contactEmail: string;

  @ApiPropertyOptional({ example: '01012345678', description: '전화번호' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: true, description: '이메일 수신 동의 (필수)' })
  @IsBoolean({ message: '이메일 수신 동의 여부를 선택해주세요' })
  emailConsent: boolean;
}

// ========== 이메일 링크 인증 / 재발송 DTO ==========

export class ResendVerificationDto {
  @ApiProperty({ example: 'myid123', description: '아이디(loginId)' })
  @IsString()
  @IsNotEmpty({ message: '아이디를 입력해주세요' })
  loginId: string;

  @ApiProperty({ example: 'real@email.com', description: '인증 메일을 받을 실제 이메일 (소셜 가입자용)', required: false })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요' })
  @IsOptional()
  contactEmail?: string;
}

// ========== 중복 확인 DTO ==========

export class CheckDuplicateDto {
  @ApiProperty({ example: 'mobile', description: '확인할 필드 (mobile | email)' })
  @IsString()
  @IsIn(['mobile', 'email'], { message: '유효하지 않은 필드입니다' })
  field: 'mobile' | 'email';

  @ApiProperty({ example: '01012345678', description: '확인할 값' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  value: string;
}

// ========== 비밀번호 재설정 DTO ==========

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: '아이디(loginId, 이메일 형식)' })
  @IsString()
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  loginId: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: '비밀번호 재설정 토큰' })
  @IsString()
  @MinLength(1)
  token: string;

  @ApiProperty({ description: '새 비밀번호 (8~100자)' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다' })
  @MaxLength(100, { message: '비밀번호는 100자 이하여야 합니다' })
  newPassword: string;
}

// ========== 비밀번호 변경 DTO ==========

export class ChangePasswordDto {
  @ApiProperty({ description: '현재 비밀번호' })
  @IsString()
  @IsNotEmpty({ message: '현재 비밀번호를 입력해주세요' })
  currentPassword: string;

  @ApiProperty({ description: '새 비밀번호 (최소 4자)' })
  @IsString()
  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요' })
  @MinLength(4, { message: '비밀번호는 최소 4자 이상이어야 합니다' })
  newPassword: string;
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
