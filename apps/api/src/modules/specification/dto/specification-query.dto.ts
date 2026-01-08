import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SpecificationQueryDto {
    @ApiPropertyOptional({ description: '출력전용 필터' })
    @IsOptional()
    @IsBoolean()
    forOutput?: boolean;

    @ApiPropertyOptional({ description: '앨범전용 필터' })
    @IsOptional()
    @IsBoolean()
    forAlbum?: boolean;

    @ApiPropertyOptional({ description: '액자전용 필터' })
    @IsOptional()
    @IsBoolean()
    forFrame?: boolean;

    @ApiPropertyOptional({ description: '인쇄책자전용 필터' })
    @IsOptional()
    @IsBoolean()
    forBooklet?: boolean;

    @ApiPropertyOptional({ description: '활성화 상태 필터' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ description: '검색어' })
    @IsOptional()
    @IsString()
    search?: string;
}
