import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ImpositionPreviewQueryDto {
  @ApiProperty({ description: 'OrderItem.id' })
  @IsString()
  orderItemId!: string;

  @ApiPropertyOptional({
    description: 'ImpositionPreset.id. 비우면 자동 매칭.',
  })
  @IsOptional()
  @IsString()
  presetId?: string;
}
