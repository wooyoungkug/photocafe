import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SalesLedgerService } from '../services/sales-ledger.service';
import {
  SalesLedgerQueryDto,
  CreateSalesReceiptDto,
} from '../dto/sales-ledger.dto';

@ApiTags('매출원장')
@Controller('sales-ledger')
export class SalesLedgerController {
  constructor(private readonly salesLedgerService: SalesLedgerService) {}

  // ===== 매출원장 목록 조회 =====
  @Get()
  @ApiOperation({ summary: '매출원장 목록 조회' })
  async findAll(@Query() query: SalesLedgerQueryDto) {
    return this.salesLedgerService.findAll(query);
  }

  // ===== 매출원장 요약 (대시보드) =====
  @Get('summary')
  @ApiOperation({ summary: '매출원장 요약 (당월 매출, 수금, 미수금)' })
  async getSummary() {
    return this.salesLedgerService.getSummary();
  }

  // ===== 거래처별 매출 집계 =====
  @Get('client-summary')
  @ApiOperation({ summary: '거래처별 매출 집계' })
  async getClientSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesLedgerService.getClientSummary({ startDate, endDate });
  }

  // ===== 월별 매출 추이 =====
  @Get('monthly-trend')
  @ApiOperation({ summary: '월별 매출 추이' })
  async getMonthlyTrend(@Query('months') months?: string) {
    return this.salesLedgerService.getMonthlyTrend(months ? parseInt(months) : 12);
  }

  // ===== 매출원장 상세 조회 =====
  @Get(':id')
  @ApiOperation({ summary: '매출원장 상세 조회' })
  async findById(@Param('id') id: string) {
    return this.salesLedgerService.findById(id);
  }

  // ===== 수금 처리 =====
  @Post(':id/receipts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '수금 처리' })
  async addReceipt(
    @Param('id') id: string,
    @Body() dto: CreateSalesReceiptDto,
  ) {
    // TODO: JWT에서 사용자 ID 추출
    return this.salesLedgerService.addReceipt(id, dto, 'system');
  }

  // ===== 매출 확정 (배송완료 시) =====
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '매출 확정 (K-IFRS: 인도 시점 매출 인식)' })
  async confirmSales(@Param('id') id: string) {
    return this.salesLedgerService.confirmSales(id, 'system');
  }

  // ===== 매출 취소 =====
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '매출 취소' })
  async cancelSales(@Param('id') id: string) {
    return this.salesLedgerService.cancelSales(id);
  }

  // ===== 기존 주문 매출원장 일괄 생성 (백필) =====
  @Post('backfill')
  @ApiOperation({ summary: '기존 주문 매출원장 일괄 생성' })
  async backfillFromOrders() {
    return this.salesLedgerService.backfillFromOrders();
  }

  // ===== 연체 일괄 처리 =====
  @Post('batch/update-overdue')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '연체 미수금 일괄 상태 변경' })
  async updateOverdueStatus() {
    return this.salesLedgerService.updateOverdueStatus();
  }
}
