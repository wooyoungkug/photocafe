import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DepositsService } from '../services/deposits.service';
import {
  DepositQueryDto,
  DepositsListResponseDto,
  DepositResponseDto,
  CreateDepositDto,
  UpdateDepositDto,
} from '../dto/deposits.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DepositPermissionGuard } from '../guards/deposit-permission.guard';

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

  @Get(':id')
  @ApiOperation({ summary: '입금 상세 조회' })
  @ApiResponse({
    status: 200,
    description: '입금 상세 정보',
    type: DepositResponseDto,
  })
  async getDeposit(@Param('id') id: string): Promise<DepositResponseDto> {
    return this.depositsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, DepositPermissionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '입금 등록 (관리자만)' })
  @ApiResponse({
    status: 201,
    description: '입금이 등록되었습니다',
  })
  async createDeposit(
    @Body() dto: CreateDepositDto,
    @Request() req,
  ): Promise<any> {
    return this.depositsService.createDeposit(dto, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, DepositPermissionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '입금 수정 (관리자만)' })
  @ApiResponse({
    status: 200,
    description: '입금이 수정되었습니다',
  })
  async updateDeposit(
    @Param('id') id: string,
    @Body() dto: UpdateDepositDto,
    @Request() req,
  ): Promise<any> {
    return this.depositsService.updateDeposit(id, dto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, DepositPermissionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '입금 삭제 (관리자만)' })
  @ApiResponse({
    status: 200,
    description: '입금이 삭제되었습니다',
  })
  async deleteDeposit(@Param('id') id: string): Promise<{ message: string }> {
    await this.depositsService.deleteDeposit(id);
    return { message: '입금이 삭제되었습니다' };
  }
}
