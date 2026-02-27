import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsIn, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLocationLogDto {
  @ApiProperty({
    description: '위치 유형',
    enum: ['arrival', 'departure', 'checkpoint'],
  })
  @IsIn(['arrival', 'departure', 'checkpoint'])
  type: string;

  @ApiProperty({ description: '위도' })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ description: '경도' })
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({ description: '자동 GPS 기록 여부', default: true })
  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;
}
