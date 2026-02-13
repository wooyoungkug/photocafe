import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('대시보드')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ===== 미수금 대시보드 =====
  @Get('receivables')
  @ApiOperation({ summary: '미수금 대시보드 데이터 (요약, Aging, Top 거래처, 월별 추이)' })
  async getReceivablesDashboard() {
    return this.dashboardService.getReceivablesDashboard();
  }
}
