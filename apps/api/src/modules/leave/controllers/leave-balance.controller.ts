import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { LeaveBalanceService } from '../services/leave-balance.service';
import { QueryLeaveBalanceDto, GenerateLeaveBalanceDto, AdjustLeaveBalanceDto } from '../dto';

@ApiTags('휴가 잔여일수')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leave-balances')
export class LeaveBalanceController {
  constructor(private readonly leaveBalanceService: LeaveBalanceService) {}

  @Get()
  @ApiOperation({ summary: '휴가 잔여일수 조회' })
  async findAll(@Query() query: QueryLeaveBalanceDto) {
    return this.leaveBalanceService.findAll(query);
  }

  @Post('generate')
  @ApiOperation({ summary: '연간 휴가 자동 생성 (근속연수 기준)' })
  async generate(@Body() dto: GenerateLeaveBalanceDto) {
    return this.leaveBalanceService.generateYearlyBalances(dto);
  }

  @Patch(':id/adjust')
  @ApiOperation({ summary: '휴가 일수 수동 조정' })
  async adjust(@Param('id') id: string, @Body() dto: AdjustLeaveBalanceDto) {
    return this.leaveBalanceService.adjust(id, dto);
  }
}
