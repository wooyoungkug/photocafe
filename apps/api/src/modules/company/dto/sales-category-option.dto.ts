import { IsString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateSalesCategoryOptionDto {
    @ApiProperty({ description: '매출품목 분류 코드 (영문)', example: 'album' })
    @IsString()
    code: string;

    @ApiProperty({ description: '매출품목 분류 이름', example: '앨범' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @ApiPropertyOptional({ description: '활성화 여부', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateSalesCategoryOptionDto extends PartialType(CreateSalesCategoryOptionDto) { }
