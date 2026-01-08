import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { StatisticsService } from '../services/statistics.service';
import {
  StatisticsQueryDto,
  ClientStatisticsQueryDto,
  ProductStatisticsQueryDto,
  SalesCategoryStatisticsQueryDto,
} from '../dto';

@ApiTags('통계')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '대시보드 요약' })
  async getDashboardSummary() {
    return this.statisticsService.getDashboardSummary();
  }

  @Get('sales')
  @ApiOperation({ summary: '매출 통계' })
  async getSalesStatistics(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getSalesStatistics(query);
  }

  @Get('clients')
  @ApiOperation({ summary: '거래처별 통계' })
  async getClientStatistics(@Query() query: ClientStatisticsQueryDto) {
    return this.statisticsService.getClientStatistics(query);
  }

  @Get('bindings')
  @ApiOperation({ summary: '제본방법별 통계' })
  async getBindingStatistics(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getBindingStatistics(query);
  }

  @Get('products')
  @ApiOperation({ summary: '상품별 통계' })
  async getProductStatistics(@Query() query: ProductStatisticsQueryDto) {
    return this.statisticsService.getProductStatistics(query);
  }

  @Get('monthly-trend')
  @ApiOperation({ summary: '월별 추이' })
  @ApiQuery({ name: 'months', required: false, description: '조회 개월 수 (기본 12개월)' })
  async getMonthlyTrend(@Query('months') months?: number) {
    return this.statisticsService.getMonthlyTrend(months || 12);
  }

  @Get('sales-categories')
  @ApiOperation({ summary: '매출품목분류별 통계' })
  async getSalesCategoryStatistics(@Query() query: SalesCategoryStatisticsQueryDto) {
    return this.statisticsService.getSalesCategoryStatistics(query);
  }

  @Get('sales-categories/tree')
  @ApiOperation({ summary: '매출품목분류별 통계 (트리 구조)' })
  async getSalesCategoryTreeStatistics(@Query() query: SalesCategoryStatisticsQueryDto) {
    return this.statisticsService.getSalesCategoryTreeStatistics(query);
  }
}
