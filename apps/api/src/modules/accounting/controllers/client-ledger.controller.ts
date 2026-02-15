import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClientLedgerService } from '../services/client-ledger.service';
import {
  ClientLedgerListQueryDto,
  ClientLedgerDetailQueryDto,
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
}
