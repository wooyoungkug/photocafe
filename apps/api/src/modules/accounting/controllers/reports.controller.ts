import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from '../services/reports.service';

@ApiTags('리포트')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ===== 거래처별 미수금 명세서 =====
  @Get('receivable-statement/:clientId')
  @ApiOperation({ summary: '거래처별 미수금 명세서 (매출내역, 수금이력, 집계)' })
  async getReceivableStatement(
    @Param('clientId') clientId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getReceivableStatement(clientId, { startDate, endDate });
  }
}
