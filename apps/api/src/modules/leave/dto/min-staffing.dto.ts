import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMinStaffingRuleDto {
  @ApiPropertyOptional({ description: '부서 ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: '팀 ID' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiProperty({ description: '최소 근무인원', example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minCount: number;

  @ApiPropertyOptional({ description: '활성 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMinStaffingRuleDto extends PartialType(CreateMinStaffingRuleDto) {}
