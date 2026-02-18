import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClientLedgerService } from '../services/client-ledger.service';
import {
  ClientLedgerListQueryDto,
  ClientLedgerDetailQueryDto,
  SendStatementEmailDto,
} from '../dto/client-ledger.dto';

@ApiTags('거래처원장')
@Controller('client-ledger')
export class ClientLedgerController {
  constructor(private readonly clientLedgerService: ClientLedgerService) {}

  @Get()
  @ApiOperation({ summary: '거래처원장 목록 조회 (매출/매입 집계)' })
  async findAll(@Query() query: ClientLedgerListQueryDto) {
    return this.clientLedgerService.findAll(query);
  }

  @Get(':clientId')
  @ApiOperation({ summary: '거래처원장 상세 조회 (일별 거래내역, 잔액 누적)' })
  async getDetail(
    @Param('clientId') clientId: string,
    @Query() query: ClientLedgerDetailQueryDto,
  ) {
    return this.clientLedgerService.getDetail(clientId, query);
  }

  @Post(':clientId/send-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '거래내역서 이메일 발송' })
  async sendStatementEmail(
    @Param('clientId') clientId: string,
    @Body() dto: SendStatementEmailDto,
  ) {
    return this.clientLedgerService.sendStatementEmail(clientId, dto);
  }
}
