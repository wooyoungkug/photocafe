import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const PAPER_ORIENTATIONS = ['portrait', 'landscape'] as const;
export type PaperOrientation = (typeof PAPER_ORIENTATIONS)[number];

export class CreatePrintRoomPresetDto {
  @ApiProperty({ description: '규격코드 (예: "10x10", "A4세로")' })
  @IsString()
  sizeCode!: string;

  @ApiProperty({
    description: 'NUP (1up / 1+up / 1++up / 2up / 4up / 8up / 16up)',
  })
  @IsString()
  nup!: string;

  @ApiProperty({ enum: PAPER_ORIENTATIONS })
  @IsIn(PAPER_ORIENTATIONS as unknown as string[])
  paperOrientation!: PaperOrientation;

  @ApiProperty({ minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  gridCols!: number;

  @ApiProperty({ minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  gridRows!: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  marginMm?: number;

  @ApiProperty({ required: false, default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  cropMarkLengthMm?: number;

  @ApiProperty({ required: false, default: 0.25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  cropMarkThicknessPt?: number;

  @ApiProperty({ required: false, default: 'K100' })
  @IsOptional()
  @IsString()
  cropMarkColor?: string;

  @ApiProperty({ required: false, default: '1.4' })
  @IsOptional()
  @IsString()
  pdfVersion?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePrintRoomPresetDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn(PAPER_ORIENTATIONS as unknown as string[])
  paperOrientation?: PaperOrientation;

  @ApiProperty({ required: false, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  gridCols?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  gridRows?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  marginMm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  cropMarkLengthMm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  cropMarkThicknessPt?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cropMarkColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pdfVersion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
