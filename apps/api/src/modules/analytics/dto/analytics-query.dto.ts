import { IsOptional, IsString, IsIn } from 'class-validator';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsIn(['today', '7d', '30d', '90d'])
  period?: 'today' | '7d' | '30d' | '90d';

  @IsOptional()
  @IsString()
  limit?: string;
}
