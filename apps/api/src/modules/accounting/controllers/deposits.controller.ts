import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DepositsService } from '../services/deposits.service';
import {
  DepositQueryDto,
  DepositsListResponseDto,
} from '../dto/deposits.dto';

@ApiTags('입금내역')
@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Get()
  @ApiOperation({ summary: '고객별 입금내역 조회' })
  @ApiResponse({
    status: 200,
    description: '입금내역 목록',
    type: DepositsListResponseDto,
  })
  async getDeposits(
    @Query() query: DepositQueryDto,
  ): Promise<DepositsListResponseDto> {
    return this.depositsService.findDepositsByClient(query);
  }
}
