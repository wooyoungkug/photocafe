import { IsString, IsNumber, IsBoolean, IsOptional, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type Orientation = 'landscape' | 'portrait' | 'square';

export class CreateSpecificationDto {
    @ApiProperty({ description: '규격명', example: '7x4.7' })
    @IsString()
    name: string;

    @ApiProperty({ description: '가로 (인치)', example: 7 })
    @IsNumber()
    @Min(0)
    widthInch: number;

    @ApiProperty({ description: '세로 (인치)', example: 4.7 })
    @IsNumber()
    @Min(0)
    heightInch: number;

    @ApiProperty({ description: '가로 (mm)', example: 177.8 })
    @IsNumber()
    @Min(0)
    widthMm: number;

    @ApiProperty({ description: '세로 (mm)', example: 119.38 })
    @IsNumber()
    @Min(0)
    heightMm: number;

    @ApiPropertyOptional({ description: '방향 (landscape: 가로형, portrait: 세로형, square: 정방형)', enum: ['landscape', 'portrait', 'square'], default: 'landscape' })
    @IsOptional()
    @IsEnum(['landscape', 'portrait', 'square'])
    orientation?: Orientation;

    @ApiPropertyOptional({ description: '인디고출력전용', default: false })
    @IsOptional()
    @IsBoolean()
    forIndigo?: boolean;

    @ApiPropertyOptional({ description: '잉크젯출력전용', default: false })
    @IsOptional()
    @IsBoolean()
    forInkjet?: boolean;

    @ApiPropertyOptional({ description: '앨범전용', default: false })
    @IsOptional()
    @IsBoolean()
    forAlbum?: boolean;

    @ApiPropertyOptional({ description: '액자전용', default: false })
    @IsOptional()
    @IsBoolean()
    forFrame?: boolean;

    @ApiPropertyOptional({ description: '인쇄책자전용', default: false })
    @IsOptional()
    @IsBoolean()
    forBooklet?: boolean;

    @ApiPropertyOptional({ description: '평방미터 (㎡)' })
    @IsOptional()
    @IsNumber()
    squareMeters?: number;

    @ApiPropertyOptional({ description: '설명' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: '정렬순서', default: 0 })
    @IsOptional()
    @IsNumber()
    sortOrder?: number;

    @ApiPropertyOptional({ description: '쌍 자동 생성 여부', default: true })
    @IsOptional()
    @IsBoolean()
    createPair?: boolean;
}
