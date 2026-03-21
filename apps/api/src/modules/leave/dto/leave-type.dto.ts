import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLeaveTypeDto {
  @ApiProperty({ description: '휴가 유형 코드 (예: annual, half_am)', example: 'annual' })
  @IsString()
  code: string;

  @ApiProperty({ description: '휴가 유형 이름', example: '연차' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '기본 부여일수', example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  defaultDays?: number;

  @ApiProperty({ description: '차감일수 (1.0, 0.5, 0.25)', example: 1.0 })
  @Type(() => Number)
  @IsNumber()
  deductDays: number;

  @ApiPropertyOptional({ description: '활성 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateLeaveTypeDto extends PartialType(CreateLeaveTypeDto) {}
