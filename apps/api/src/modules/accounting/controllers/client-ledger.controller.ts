import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClientLedgerService } from '../services/client-ledger.service';
import {
  ClientLedgerQueryDto,
  ClientLedgerDetailQueryDto,
  PeriodUnit,
} from '../dto/client-ledger.dto';

@ApiTags('거래처원장')
@Controller('client-ledger')
export class ClientLedgerController {
  constructor(private readonly clientLedgerService: ClientLedgerService) {}

  // ===== 거래처원장 목록 조회 =====
  @Get()
  @ApiOperation({ summary: '거래처원장 목록 (매출/매입 거래처 통합)' })
  async findAllClientLedgers(@Query() query: ClientLedgerQueryDto) {
    return this.clientLedgerService.findAllClientLedgers(query);
  }

  // ===== 거래처원장 통계 =====
  @Get('stats')
  @ApiOperation({ summary: '거래처원장 통계 (거래처 수, 미수/미지급 잔액, 당월 실적)' })
  async getClientLedgerStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.clientLedgerService.getClientLedgerStats({ startDate, endDate });
  }

  // ===== 거래처별 상세 원장 =====
  @Get(':clientId')
  @ApiOperation({ summary: '거래처별 상세 원장 (일별 거래내역, 전기이월~잔액)' })
  async getClientLedgerDetail(
    @Param('clientId') clientId: string,
    @Query() query: ClientLedgerDetailQueryDto,
  ) {
    return this.clientLedgerService.getClientLedgerDetail(clientId, query);
  }

  // ===== 거래처별 기간 요약 =====
  @Get(':clientId/summary')
  @ApiOperation({ summary: '거래처별 기간 요약 (월별/분기별 매출/매입/수금/지급 합계)' })
  async getClientLedgerSummary(
    @Param('clientId') clientId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('periodUnit') periodUnit?: PeriodUnit,
  ) {
    return this.clientLedgerService.getClientLedgerSummary(clientId, {
      startDate,
      endDate,
      periodUnit,
    });
  }
}
