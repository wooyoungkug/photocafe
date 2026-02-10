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
import { PurchaseLedgerService } from '../services/purchase-ledger.service';
import {
  PurchaseLedgerQueryDto,
  CreatePurchaseLedgerDto,
  CreatePurchasePaymentDto,
} from '../dto/purchase-ledger.dto';

@ApiTags('매입원장')
@Controller('purchase-ledger')
export class PurchaseLedgerController {
  constructor(
    private readonly purchaseLedgerService: PurchaseLedgerService,
  ) {}

  // ===== 매입원장 목록 조회 =====
  @Get()
  @ApiOperation({ summary: '매입원장 목록 조회' })
  async findAll(@Query() query: PurchaseLedgerQueryDto) {
    return this.purchaseLedgerService.findAll(query);
  }

  // ===== 매입원장 요약 (대시보드) =====
  @Get('summary')
  @ApiOperation({ summary: '매입원장 요약 (당월 매입, 지급, 미지급)' })
  async getSummary() {
    return this.purchaseLedgerService.getSummary();
  }

  // ===== 매입처별 매입 집계 =====
  @Get('supplier-summary')
  @ApiOperation({ summary: '매입처별 매입 집계' })
  async getSupplierSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.purchaseLedgerService.getSupplierSummary({ startDate, endDate });
  }

  // ===== 매입원장 상세 조회 =====
  @Get(':id')
  @ApiOperation({ summary: '매입원장 상세 조회' })
  async findById(@Param('id') id: string) {
    return this.purchaseLedgerService.findById(id);
  }

  // ===== 매입원장 등록 =====
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '매입원장 등록' })
  async create(@Body() dto: CreatePurchaseLedgerDto) {
    return this.purchaseLedgerService.create(dto, 'system');
  }

  // ===== 지급 처리 =====
  @Post(':id/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '매입대금 지급 처리' })
  async addPayment(
    @Param('id') id: string,
    @Body() dto: CreatePurchasePaymentDto,
  ) {
    return this.purchaseLedgerService.addPayment(id, dto, 'system');
  }

  // ===== 매입 확정 (검수 완료) =====
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '매입 확정 (검수 완료)' })
  async confirmPurchase(@Param('id') id: string) {
    return this.purchaseLedgerService.confirmPurchase(id, 'system');
  }

  // ===== 매입 취소 =====
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '매입 취소' })
  async cancelPurchase(@Param('id') id: string) {
    return this.purchaseLedgerService.cancelPurchase(id);
  }

  // ===== 연체 일괄 처리 =====
  @Post('batch/update-overdue')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '연체 미지급금 일괄 상태 변경' })
  async updateOverdueStatus() {
    return this.purchaseLedgerService.updateOverdueStatus();
  }
}
