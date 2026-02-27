import {
  IsString,
  IsEmail,
  IsIn,
  IsOptional,
  IsBoolean,
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

  @ApiProperty({ enum: ['MANAGER', 'STAFF'], description: '역할' })
  @IsIn(['MANAGER', 'STAFF'])
  role: 'MANAGER' | 'STAFF';
}

export class UpdateEmploymentDto {
  @ApiPropertyOptional({ enum: ['MANAGER', 'STAFF'] })
  @IsOptional()
  @IsIn(['MANAGER', 'STAFF'])
  role?: 'MANAGER' | 'STAFF';

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
}

export class AcceptInvitationDto {
  @ApiProperty({ description: '초대 토큰' })
  @IsString()
  token: string;

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
