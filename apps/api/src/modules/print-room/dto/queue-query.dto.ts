import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

/**
 * 출력실 Kanban 큐 조회 쿼리.
 * 기본 동작: 오늘 주문 + 미완료(done 포함) 묶음 반환.
 */
export class QueueQueryDto {
  @ApiPropertyOptional({
    description: '주문 일자 필터 (YYYY-MM-DD). 비우면 전체.',
    example: '2026-05-19',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date 형식은 YYYY-MM-DD 입니다.' })
  date?: string;

  @ApiPropertyOptional({
    description: '출력 방식 필터',
    enum: ['indigo', 'inkjet'],
  })
  @IsOptional()
  @IsIn(['indigo', 'inkjet'])
  printMethod?: 'indigo' | 'inkjet';
}
