import { IsString, IsOptional, IsBoolean, IsInt, IsArray, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertClientAlbumPreferenceDto {
  @ApiPropertyOptional({ description: '선호 편집 스타일', example: 'SPREAD' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredEditStyle?: string;

  @ApiPropertyOptional({ description: '선호 제본 방향', example: 'LEFT_TO_RIGHT' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredBinding?: string;

  @ApiPropertyOptional({ description: '선호 앨범 규격 목록', type: 'array' })
  @IsOptional()
  @IsArray()
  preferredAlbumSizes?: any[];

  @ApiPropertyOptional({ description: '의상 그룹핑 방식', example: 'by_outfit' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  outfitGrouping?: string;

  @ApiPropertyOptional({ description: '색상 그룹 활성화 여부', default: false })
  @IsOptional()
  @IsBoolean()
  colorGroupEnabled?: boolean;

  @ApiPropertyOptional({ description: '선호 원단 ID' })
  @IsOptional()
  @IsString()
  preferredFabricId?: string;

  @ApiPropertyOptional({ description: '선호 코팅 ID' })
  @IsOptional()
  @IsString()
  preferredCoatingId?: string;

  @ApiPropertyOptional({ description: '편집자 참고사항' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  editorNotes?: string;

  @ApiPropertyOptional({ description: '특별 지시사항' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialInstructions?: string;
}

export class UpdateFromOrderDto {
  @ApiPropertyOptional({ description: '사용된 앨범 규격' })
  @IsOptional()
  @IsString()
  albumSize?: string;

  @ApiPropertyOptional({ description: '페이지 수' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageCount?: number;
}
