import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, ValidateNested, ArrayMinSize, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 재출력 대상 페이지 항목 (단일 OrderItem 기준) */
export class ReprintItemDto {
  @ApiProperty({ description: '재출력할 OrderItem ID' })
  @IsString()
  itemId!: string;

  @ApiProperty({ description: '재출력 대상 페이지 번호 배열', type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  pages!: number[];

  @ApiProperty({ description: '재출력 사유' })
  @IsString()
  reason!: string;
}

/** 재출력 요청 DTO */
export class RequestReprintDto {
  @ApiProperty({ description: '재출력 대상 항목들', type: [ReprintItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReprintItemDto)
  items!: ReprintItemDto[];

  @ApiPropertyOptional({
    description: '정산 방식 (현재는 append_pending 만 지원)',
    enum: ['append_pending'],
    default: 'append_pending',
  })
  @IsOptional()
  @IsIn(['append_pending'])
  settlementMode?: 'append_pending';

  @ApiPropertyOptional({ description: '출력담당자에게 알림 발송 여부', default: true })
  @IsOptional()
  @IsBoolean()
  notifyOperator?: boolean;
}
