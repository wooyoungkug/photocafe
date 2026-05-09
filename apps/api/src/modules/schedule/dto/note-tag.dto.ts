import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateNoteTagDto {
  @ApiProperty({ description: '태그 이름' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: '태그 색상 (hex)' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateNoteTagDto {
  @ApiPropertyOptional({ description: '태그 이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '태그 색상 (hex)' })
  @IsOptional()
  @IsString()
  color?: string;
}
