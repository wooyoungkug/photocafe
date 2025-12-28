import { IsString, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateClientGroupDto {
  @ApiProperty({ description: '그룹 코드' })
  @IsString()
  groupCode: string;

  @ApiProperty({ description: '그룹명' })
  @IsString()
  groupName: string;

  @ApiProperty({ description: '지점 ID' })
  @IsString()
  branchId: string;

  @ApiPropertyOptional({ description: '일반 할인율 (100 = 정가)', default: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  generalDiscount?: number;

  @ApiPropertyOptional({ description: '프리미엄 할인율 (100 = 정가)', default: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  premiumDiscount?: number;

  @ApiPropertyOptional({ description: '수입 할인율 (100 = 정가)', default: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  importedDiscount?: number;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '활성화 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateClientGroupDto extends PartialType(CreateClientGroupDto) {}

export class ClientGroupQueryDto {
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

  @ApiPropertyOptional({ description: '검색어 (그룹명, 코드)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '지점 ID 필터' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: '활성화 여부 필터' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
