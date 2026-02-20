import { IsString, IsNumber, IsBoolean, IsOptional, Min, IsEnum, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export type Orientation = 'landscape' | 'portrait' | 'square';

// ==================== CIP4 JDF LayoutIntent 상수 ====================

// JDF PageOrder (페이지 순서)
export const JDF_PAGE_ORDER_OPTIONS = ['Booklet', 'Sequential', 'Spread'] as const;
export type JdfPageOrder = typeof JDF_PAGE_ORDER_OPTIONS[number];

// JDF Sides (인쇄 면)
export const JDF_SIDES_OPTIONS = ['OneSided', 'TwoSidedHeadToHead', 'TwoSidedHeadToFoot'] as const;
export type JdfSides = typeof JDF_SIDES_OPTIONS[number];

// JDF SpreadType (스프레드 유형)
export const JDF_SPREAD_TYPE_OPTIONS = ['Single', 'Spread'] as const;
export type JdfSpreadType = typeof JDF_SPREAD_TYPE_OPTIONS[number];

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

    @ApiPropertyOptional({ description: '잉크젯앨범전용', default: false })
    @IsOptional()
    @IsBoolean()
    forAlbum?: boolean;

    @ApiPropertyOptional({ description: '인디고앨범전용', default: false })
    @IsOptional()
    @IsBoolean()
    forIndigoAlbum?: boolean;

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

    @ApiPropertyOptional({ description: 'Nup 설정 (앨범 전용)', enum: ['1++up', '1+up', '1up', '2up', '4up'] })
    @IsOptional()
    @IsString()
    nup?: string;

    @ApiPropertyOptional({ description: 'Nup 면적 (sq inch)' })
    @IsOptional()
    @IsNumber()
    nupSqInch?: number;

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

    // ==================== CIP4 JDF LayoutIntent 필드 ====================

    @ApiPropertyOptional({ description: 'JDF 완성 가로 (mm)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    jdfFinishedWidth?: number;

    @ApiPropertyOptional({ description: 'JDF 완성 세로 (mm)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    jdfFinishedHeight?: number;

    @ApiPropertyOptional({ description: 'JDF 도련 상단 (mm)', default: 3 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    jdfBleedTop?: number;

    @ApiPropertyOptional({ description: 'JDF 도련 하단 (mm)', default: 3 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    jdfBleedBottom?: number;

    @ApiPropertyOptional({ description: 'JDF 도련 좌측 (mm)', default: 3 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    jdfBleedLeft?: number;

    @ApiPropertyOptional({ description: 'JDF 도련 우측 (mm)', default: 3 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    jdfBleedRight?: number;

    @ApiPropertyOptional({ description: 'JDF 재단 가로 (mm)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    jdfTrimWidth?: number;

    @ApiPropertyOptional({ description: 'JDF 재단 세로 (mm)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    jdfTrimHeight?: number;

    @ApiPropertyOptional({ description: 'JDF 페이지 순서', enum: JDF_PAGE_ORDER_OPTIONS, default: 'Booklet' })
    @IsOptional()
    @IsString()
    jdfPageOrder?: string;

    @ApiPropertyOptional({ description: 'JDF 인쇄 면', enum: JDF_SIDES_OPTIONS, default: 'TwoSidedHeadToHead' })
    @IsOptional()
    @IsString()
    jdfSides?: string;

    @ApiPropertyOptional({ description: 'JDF 임포지션 가로 배치 수', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    jdfNumberUpX?: number;

    @ApiPropertyOptional({ description: 'JDF 임포지션 세로 배치 수', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    jdfNumberUpY?: number;

    @ApiPropertyOptional({ description: 'JDF 스프레드 유형', enum: JDF_SPREAD_TYPE_OPTIONS, default: 'Single' })
    @IsOptional()
    @IsString()
    jdfSpreadType?: string;
}
