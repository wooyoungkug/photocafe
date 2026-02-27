import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateBidDto {
  @ApiPropertyOptional({ description: '응찰 메시지 (자기소개, 경력 등)' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class SelectBidDto {
  @ApiPropertyOptional({ description: '확정 메시지 (작가에게 전달)' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class RejectBidDto {
  @ApiPropertyOptional({ description: '거절 사유' })
  @IsOptional()
  @IsString()
  reason?: string;
}
