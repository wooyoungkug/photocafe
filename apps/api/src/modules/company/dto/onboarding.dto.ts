import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitOnboardingDto {
  @ApiPropertyOptional({ description: '이름/상호명' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  clientName?: string;

  @ApiPropertyOptional({ description: '휴대전화 (하이픈 포함)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string;

  @ApiPropertyOptional({ description: '우편번호' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional({ description: '주소(도로명)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ description: '상세주소' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressDetail?: string;

  @ApiPropertyOptional({ description: '비상연락처 이름' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyContactName?: string;

  @ApiPropertyOptional({ description: '비상연락처 전화' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ description: '비상연락처와의 관계 (부모/배우자/형제 등)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyContactRelation?: string;

  @ApiPropertyOptional({ description: '소속 회사 부서명 (Employment.department 갱신용)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  department?: string;

  @ApiPropertyOptional({ description: '가입경로 (direct | referral | naver_search | google_search | exhibition | sns | etc)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  acquisitionChannel?: string;

  @ApiPropertyOptional({ description: '가입경로 기타 설명' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  acquisitionChannelNote?: string;
}
