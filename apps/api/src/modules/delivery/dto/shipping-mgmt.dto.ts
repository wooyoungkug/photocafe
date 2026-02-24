import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkTrackingDto {
  @ApiProperty({ description: '주문 ID 목록' })
  @IsArray()
  orderIds: string[];

  @ApiProperty({ description: '택배사 코드' })
  @IsString()
  courierCode: string;

  @ApiProperty({ description: '운송장 번호 목록 (orderIds와 동일 순서)' })
  @IsArray()
  trackingNumbers: string[];
}

export class CreateBundleDto {
  @ApiProperty({ description: '묶을 주문 ID 목록' })
  @IsArray()
  orderIds: string[];
}

export class GenerateLabelDto {
  @ApiPropertyOptional({ description: '발송인명 (미입력시 회사정보 사용)' })
  @IsOptional()
  @IsString()
  senderName?: string;

  @ApiPropertyOptional({ description: '발송인 연락처' })
  @IsOptional()
  @IsString()
  senderPhone?: string;
}
