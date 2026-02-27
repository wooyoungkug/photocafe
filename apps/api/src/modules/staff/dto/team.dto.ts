import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeamDto {
  @ApiProperty({ description: '팀 코드 (영문/숫자)', example: 'T001' })
  @IsString()
  @MinLength(2)
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: '팀 코드는 영문, 숫자, 하이픈, 언더스코어만 사용 가능합니다' })
  code: string;

  @ApiProperty({ description: '팀명', example: '1팀' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ description: '소속 부서 ID' })
  @IsString()
  departmentId: string;

  @ApiPropertyOptional({ description: '팀 리더 Staff ID' })
  @IsString()
  @IsOptional()
  leaderId?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 상태', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}

export class TeamQueryDto {
  @ApiPropertyOptional({ description: '부서 ID로 필터' })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: '활성 상태 필터' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AssignTeamMembersDto {
  @ApiProperty({ description: '배정할 직원 ID 목록' })
  @IsArray()
  @IsString({ each: true })
  staffIds: string[];
}

export class SetTeamLeaderDto {
  @ApiProperty({ description: '팀 리더로 지정할 직원 ID' })
  @IsString()
  staffId: string;
}
