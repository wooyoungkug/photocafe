import {
  IsString,
  IsEmail,
  IsIn,
  IsOptional,
  IsBoolean,
  IsInt,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ description: '초대할 거래처 ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: '초대할 이메일' })
  @IsEmail()
  inviteeEmail: string;

  @ApiProperty({ enum: ['MANAGER', 'STAFF', 'EDITOR'], description: '역할' })
  @IsIn(['MANAGER', 'STAFF', 'EDITOR'])
  role: 'MANAGER' | 'STAFF' | 'EDITOR';
}

export class UpdateEmploymentDto {
  @ApiPropertyOptional({ enum: ['MANAGER', 'STAFF', 'EDITOR'] })
  @IsOptional()
  @IsIn(['MANAGER', 'STAFF', 'EDITOR'])
  role?: 'MANAGER' | 'STAFF' | 'EDITOR';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewAllOrders?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canManageProducts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewSettlement?: boolean;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';

  @ApiPropertyOptional({ description: '부서명' })
  @IsOptional()
  @IsString()
  department?: string;
}

export class AcceptInvitationDto {
  @ApiProperty({ description: '초대 토큰' })
  @IsString()
  token: string;

  @ApiProperty({ description: '아이디 (4자 이상)' })
  @IsString()
  @MinLength(4)
  loginId: string;

  @ApiProperty({ description: '이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: '비밀번호 (6자 이상)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: '전화번호' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '이메일' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateClientDepartmentDto {
  @ApiProperty({ description: '거래처 ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: '부서명' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateClientDepartmentDto {
  @ApiPropertyOptional({ description: '부서명' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class AcceptInvitationExistingDto {
  @ApiProperty({ description: '초대 토큰' })
  @IsString()
  token: string;

  @ApiProperty({ description: '기존 계정 이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '기존 계정 비밀번호' })
  @IsString()
  password: string;
}
