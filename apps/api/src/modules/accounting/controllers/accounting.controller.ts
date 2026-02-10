import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AccountingService } from '../services/accounting.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  CreateJournalDto,
  JournalQueryDto,
  CreateReceivableDto,
  CreateReceivablePaymentDto,
  ReceivableQueryDto,
  CreatePayableDto,
  CreatePayablePaymentDto,
  PayableQueryDto,
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CreateSettlementDto,
  SettlementQueryDto,
} from '../dto/accounting.dto';

@ApiTags('회계관리')
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ===== 계정과목 =====

  @Get('accounts')
  @ApiOperation({ summary: '계정과목 목록 조회' })
  async getAccounts() {
    return this.accountingService.findAllAccounts();
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: '계정과목 상세 조회' })
  async getAccountById(@Param('id') id: string) {
    return this.accountingService.findAccountById(id);
  }

  @Post('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '계정과목 등록' })
  async createAccount(@Body() dto: CreateAccountDto) {
    return this.accountingService.createAccount(dto);
  }

  @Put('accounts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '계정과목 수정' })
  async updateAccount(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountingService.updateAccount(id, dto);
  }

  @Delete('accounts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '계정과목 삭제' })
  async deleteAccount(@Param('id') id: string) {
    return this.accountingService.deleteAccount(id);
  }

  // ===== 전표 (Journal) =====

  @Get('journals')
  @ApiOperation({ summary: '전표 목록 조회' })
  async getJournals(@Query() query: JournalQueryDto) {
    return this.accountingService.findAllJournals(query);
  }

  @Get('journals/:id')
  @ApiOperation({ summary: '전표 상세 조회' })
  async getJournalById(@Param('id') id: string) {
    return this.accountingService.findJournalById(id);
  }

  @Post('journals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '전표 등록' })
  async createJournal(@Body() dto: CreateJournalDto) {
    // TODO: 실제로는 JWT에서 사용자 ID 추출
    return this.accountingService.createJournal(dto, 'system');
  }

  @Delete('journals/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '전표 삭제' })
  async deleteJournal(@Param('id') id: string) {
    return this.accountingService.deleteJournal(id);
  }

  // ===== 미수금 (Receivable) =====

  @Get('receivables')
  @ApiOperation({ summary: '미수금 목록 조회' })
  async getReceivables(@Query() query: ReceivableQueryDto) {
    return this.accountingService.findAllReceivables(query);
  }

  @Get('receivables/summary')
  @ApiOperation({ summary: '미수금 요약 조회' })
  async getReceivableSummary() {
    return this.accountingService.getReceivableSummary();
  }

  @Get('receivables/:id')
  @ApiOperation({ summary: '미수금 상세 조회' })
  async getReceivableById(@Param('id') id: string) {
    return this.accountingService.findReceivableById(id);
  }

  @Post('receivables')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '미수금 등록' })
  async createReceivable(@Body() dto: CreateReceivableDto) {
    return this.accountingService.createReceivable(dto);
  }

  @Post('receivables/:id/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '미수금 수금 처리' })
  async addReceivablePayment(
    @Param('id') id: string,
    @Body() dto: CreateReceivablePaymentDto,
  ) {
    return this.accountingService.addReceivablePayment(id, dto);
  }

  // ===== 미지급금 (Payable) =====

  @Get('payables')
  @ApiOperation({ summary: '미지급금 목록 조회' })
  async getPayables(@Query() query: PayableQueryDto) {
    return this.accountingService.findAllPayables(query);
  }

  @Get('payables/summary')
  @ApiOperation({ summary: '미지급금 요약 조회' })
  async getPayableSummary() {
    return this.accountingService.getPayableSummary();
  }

  @Get('payables/:id')
  @ApiOperation({ summary: '미지급금 상세 조회' })
  async getPayableById(@Param('id') id: string) {
    return this.accountingService.findPayableById(id);
  }

  @Post('payables')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '미지급금 등록' })
  async createPayable(@Body() dto: CreatePayableDto) {
    return this.accountingService.createPayable(dto);
  }

  @Post('payables/:id/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '미지급금 지급 처리' })
  async addPayablePayment(
    @Param('id') id: string,
    @Body() dto: CreatePayablePaymentDto,
  ) {
    return this.accountingService.addPayablePayment(id, dto);
  }

  // ===== 은행계좌 =====

  @Get('bank-accounts')
  @ApiOperation({ summary: '은행계좌 목록 조회' })
  async getBankAccounts() {
    return this.accountingService.findAllBankAccounts();
  }

  @Get('bank-accounts/:id')
  @ApiOperation({ summary: '은행계좌 상세 조회' })
  async getBankAccountById(@Param('id') id: string) {
    return this.accountingService.findBankAccountById(id);
  }

  @Post('bank-accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '은행계좌 등록' })
  async createBankAccount(@Body() dto: CreateBankAccountDto) {
    return this.accountingService.createBankAccount(dto);
  }

  @Put('bank-accounts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '은행계좌 수정' })
  async updateBankAccount(@Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.accountingService.updateBankAccount(id, dto);
  }

  @Delete('bank-accounts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '은행계좌 삭제' })
  async deleteBankAccount(@Param('id') id: string) {
    return this.accountingService.deleteBankAccount(id);
  }

  // ===== 정산 =====

  @Get('settlements')
  @ApiOperation({ summary: '정산 목록 조회' })
  async getSettlements(@Query() query: SettlementQueryDto) {
    return this.accountingService.findAllSettlements(query);
  }

  @Post('settlements')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '정산 생성' })
  async createSettlement(@Body() dto: CreateSettlementDto) {
    return this.accountingService.createSettlement(dto);
  }

  @Post('settlements/:id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '정산 확정' })
  async confirmSettlement(@Param('id') id: string) {
    // TODO: 실제로는 JWT에서 사용자 ID 추출
    return this.accountingService.confirmSettlement(id, 'system');
  }

  // ===== 요약/통계 =====

  @Get('summary')
  @ApiOperation({ summary: '회계 요약 조회' })
  async getAccountingSummary() {
    return this.accountingService.getAccountingSummary();
  }

  @Get('daily-summary')
  @ApiOperation({ summary: '일별 요약 조회' })
  async getDailySummary(@Query('date') date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.accountingService.getDailySummary(targetDate);
  }
}
