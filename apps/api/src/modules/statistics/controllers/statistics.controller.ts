import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StatisticsService } from '../services/statistics.service';
import {
  StatisticsQueryDto,
  ClientStatisticsQueryDto,
  ProductStatisticsQueryDto,
  CategoryStatisticsQueryDto,
} from '../dto';

@ApiTags('통계')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '대시보드 요약' })
  async getDashboardSummary(@Request() req: any) {
    const staffScopeId = req.user?.type === 'staff'
      ? await this.statisticsService.getStaffSalesScopeId(req.user.sub)
      : undefined;
    return this.statisticsService.getDashboardSummary(staffScopeId);
  }

  @Get('sales')
  @ApiOperation({ summary: '매출 통계' })
  async getSalesStatistics(@Query() query: StatisticsQueryDto, @Request() req: any) {
    const staffScopeId = req.user?.type === 'staff'
      ? await this.statisticsService.getStaffSalesScopeId(req.user.sub)
      : undefined;
    return this.statisticsService.getSalesStatistics(query, staffScopeId);
  }

  @Get('clients')
  @ApiOperation({ summary: '거래처별 통계' })
  async getClientStatistics(@Query() query: ClientStatisticsQueryDto, @Request() req: any) {
    const staffScopeId = req.user?.type === 'staff'
      ? await this.statisticsService.getStaffSalesScopeId(req.user.sub)
      : undefined;
    return this.statisticsService.getClientStatistics(query, staffScopeId);
  }

  @Get('bindings')
  @ApiOperation({ summary: '제본방법별 통계' })
  async getBindingStatistics(@Query() query: StatisticsQueryDto, @Request() req: any) {
    const staffScopeId = req.user?.type === 'staff'
      ? await this.statisticsService.getStaffSalesScopeId(req.user.sub)
      : undefined;
    return this.statisticsService.getBindingStatistics(query, staffScopeId);
  }

  @Get('products')
  @ApiOperation({ summary: '상품별 통계' })
  async getProductStatistics(@Query() query: ProductStatisticsQueryDto, @Request() req: any) {
    const staffScopeId = req.user?.type === 'staff'
      ? await this.statisticsService.getStaffSalesScopeId(req.user.sub)
      : undefined;
    return this.statisticsService.getProductStatistics(query, staffScopeId);
  }

  @Get('monthly-trend')
  @ApiOperation({ summary: '월별 추이' })
  @ApiQuery({ name: 'months', required: false, description: '조회 개월 수 (기본 12개월)' })
  async getMonthlyTrend(@Request() req: any, @Query('months') months?: number) {
    const staffScopeId = req.user?.type === 'staff'
      ? await this.statisticsService.getStaffSalesScopeId(req.user.sub)
      : undefined;
    return this.statisticsService.getMonthlyTrend(months || 12, staffScopeId);
  }

  @Get('categories')
  @ApiOperation({ summary: '카테고리별 통계' })
  async getCategoryStatistics(@Query() query: CategoryStatisticsQueryDto, @Request() req: any) {
    const staffScopeId = req.user?.type === 'staff'
      ? await this.statisticsService.getStaffSalesScopeId(req.user.sub)
      : undefined;
    return this.statisticsService.getCategoryStatistics(query, staffScopeId);
  }

  @Get('categories/tree')
  @ApiOperation({ summary: '카테고리별 통계 (트리 구조)' })
  async getCategoryTreeStatistics(@Query() query: CategoryStatisticsQueryDto, @Request() req: any) {
    const staffScopeId = req.user?.type === 'staff'
      ? await this.statisticsService.getStaffSalesScopeId(req.user.sub)
      : undefined;
    return this.statisticsService.getCategoryTreeStatistics(query, staffScopeId);
  }

  @Get('process-dashboard')
  @ApiOperation({ summary: '공정 현황 대시보드' })
  async getProcessDashboard(@Request() req: any) {
    const staffScopeId = req.user?.type === 'staff'
      ? await this.statisticsService.getStaffSalesScopeId(req.user.sub)
      : undefined;
    return this.statisticsService.getProcessDashboard(staffScopeId);
  }
}
