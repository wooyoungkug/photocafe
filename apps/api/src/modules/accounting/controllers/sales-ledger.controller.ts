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
  GetReceiptsQueryDto,
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

  // ===== 카드/선불 결제 SalesReceipt 백필 =====
  @Post('backfill-receipts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '카드/선불 결제 수금 레코드 백필 (관리자)' })
  async backfillPrepaidReceipts() {
    return this.salesLedgerService.backfillPrepaidReceipts();
  }

  // ===== 전월이월 잔액 조회 =====
  @Get('carry-over')
  @ApiOperation({ summary: '전월이월 잔액 조회 (거래처별)' })
  async getCarryOverBalance(
    @Query('clientId') clientId: string,
    @Query('beforeDate') beforeDate: string,
  ) {
    return this.salesLedgerService.getCarryOverBalance(clientId, beforeDate);
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

  // ===== Aging 분석 (실 데이터) =====
  @Get('aging-analysis')
  @ApiOperation({ summary: 'Aging 분석 (실 데이터 기반)' })
  async getAgingAnalysis(@Query('clientId') clientId?: string) {
    return this.salesLedgerService.getAgingAnalysis(clientId);
  }

  // ===== 거래처별 상세 분석 =====
  @Get('client/:clientId/detail')
  @ApiOperation({ summary: '거래처별 상세 분석 (월별 추이, 수금 패턴)' })
  async getClientDetail(@Param('clientId') clientId: string) {
    return this.salesLedgerService.getClientDetail(clientId);
  }

  // ===== 신용도 자동 평가 =====
  @Post('client/:clientId/calculate-credit-score')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '신용도 자동 평가 및 등급 산정' })
  async calculateCreditScore(@Param('clientId') clientId: string) {
    return this.salesLedgerService.calculateCreditScore(clientId);
  }

  // ===== 수금예정일별 집계 =====
  @Get('due-date-summary')
  @ApiOperation({ summary: '수금예정일별 집계 (오늘/이번주/이번달)' })
  async getDueDateSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesLedgerService.getDueDateSummary({ startDate, endDate });
  }

  // ===== 수금 패턴 분석 =====
  @Get('payment-pattern')
  @ApiOperation({ summary: '수금 패턴 분석 (평균 결제일, 정시 결제율, 계절성)' })
  async getPaymentPattern(
    @Query('clientId') clientId?: string,
    @Query('months') months?: string,
  ) {
    return this.salesLedgerService.getPaymentPattern({
      clientId,
      months: months ? parseInt(months) : 12,
    });
  }

  // ===== 영업담당자별 미수금 요약 =====
  @Get('summary-by-staff')
  @ApiOperation({ summary: '영업담당자별 미수금 요약' })
  async getSummaryByStaff(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesLedgerService.getSummaryByStaff({ startDate, endDate });
  }

  // ===== 영업담당자별 수금 실적 =====
  @Get('collection-by-staff')
  @ApiOperation({ summary: '영업담당자별 수금 실적 (수금방법별 집계 포함)' })
  async getCollectionByStaff(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesLedgerService.getCollectionByStaff({ startDate, endDate });
  }

  // ===== 입금내역 조회 (금일/당월/기간별) =====
  @Get('receipts')
  @ApiOperation({ summary: '입금내역 조회 (금일/당월/기간별)' })
  async getReceipts(@Query() query: GetReceiptsQueryDto) {
    return this.salesLedgerService.getReceipts(query);
  }

  // ===== 영업담당자별 상세 매출원장 목록 =====
  @Get('by-staff/:staffId')
  @ApiOperation({ summary: '영업담당자별 상세 매출원장 목록' })
  async getLedgersByStaff(
    @Param('staffId') staffId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesLedgerService.getLedgersByStaff(staffId, {
      startDate,
      endDate,
      paymentStatus,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // ===== 영업담당자별 거래처 미수금 집계 =====
  @Get('by-staff/:staffId/clients')
  @ApiOperation({ summary: '영업담당자별 거래처 미수금 집계' })
  async getClientsByStaff(
    @Param('staffId') staffId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesLedgerService.getClientsByStaff(staffId, {
      startDate,
      endDate,
    });
  }

  // ===== 매출 직접 등록 (홈페이지 외 매출) =====
  @Post('direct')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '매출 직접 등록 (홈페이지 외 매출)' })
  async createDirect(@Body() dto: {
    clientId: string;
    salesType: string;
    paymentMethod: string;
    supplyAmount: number;
    vatAmount: number;
    totalAmount: number;
    description?: string;
    items: Array<{
      itemName: string;
      specification?: string;
      quantity: number;
      unitPrice: number;
      supplyAmount: number;
      vatAmount: number;
      totalAmount: number;
    }>;
  }) {
    return this.salesLedgerService.createDirect(dto, 'system');
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

  // ===== 연체 알림 발송 =====
  @Post('batch/send-overdue-notifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '연체 거래처 알림 발송' })
  async sendOverdueNotifications() {
    return this.salesLedgerService.sendOverdueNotifications();
  }

  // ===== 기존 매출원장 staffId 일괄 업데이트 =====
  @Post('batch/update-staff-id')
  @ApiOperation({ summary: '기존 매출원장의 담당자 일괄 업데이트' })
  async updateStaffIdFromClients() {
    return this.salesLedgerService.updateStaffIdFromClients();
  }
}
