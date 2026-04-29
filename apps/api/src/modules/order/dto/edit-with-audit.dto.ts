import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { AdjustOrderDto, AdjustOrderItemDto } from './order.dto';

/** 감사로그 + 알림이 포함된 사양/금액 편집 DTO. AdjustOrderDto 의 확장. */
export class EditOrderWithAuditDto extends AdjustOrderDto {
  @ApiPropertyOptional({ description: '편집 메시지 (편집이력 + 출력담당자 알림에 사용)' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: '출력담당자에게 알림 발송 여부', default: false })
  @IsOptional()
  @IsBoolean()
  notifyOperator?: boolean;

  @ApiPropertyOptional({ description: '출력담당자 변경/배정 (Staff.id)' })
  @IsOptional()
  @IsString()
  assignPrintOperatorId?: string;
}

/** 출력담당자 단독 변경용 DTO. null 전달 시 해제. */
export class SetPrintOperatorDto {
  @ApiProperty({ description: '신규 담당자 Staff.id (해제 시 null)', nullable: true })
  @IsOptional()
  @IsString()
  operatorId!: string | null;
}
