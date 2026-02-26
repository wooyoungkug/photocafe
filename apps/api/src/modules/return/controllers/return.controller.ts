import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ReturnService } from '../services/return.service';
import {
  CreateReturnRequestDto,
  ApproveReturnDto,
  RejectReturnDto,
  UpdateReturnTrackingDto,
  ExchangeShipDto,
  ReturnQueryDto,
} from '../dto';

@ApiTags('반품/교환')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ReturnController {
  constructor(private returnService: ReturnService) {}

  // ===== 고객용: 반품 신청 (주문 하위 리소스) =====

  @Post('orders/:orderId/return-request')
  @ApiOperation({ summary: '반품/교환 신청' })
  async createReturnRequest(
    @Param('orderId') orderId: string,
    @Body() dto: CreateReturnRequestDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.returnService.createReturnRequest(
      orderId,
      dto,
      req.user.sub,
    );
  }

  @Get('orders/:orderId/return-requests')
  @ApiOperation({ summary: '주문별 반품 목록 조회' })
  async findByOrderId(@Param('orderId') orderId: string) {
    return this.returnService.findByOrderId(orderId);
  }

  // ===== 반품 관리 =====

  @Get('return-requests')
  @ApiOperation({ summary: '반품 목록 조회' })
  async findAll(@Query() query: ReturnQueryDto) {
    return this.returnService.findAll(query);
  }

  @Get('return-requests/:id')
  @ApiOperation({ summary: '반품 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.returnService.findOne(id);
  }

  @Get('return-requests/:id/history')
  @ApiOperation({ summary: '반품 이력 조회' })
  async getHistory(@Param('id') id: string) {
    return this.returnService.getHistory(id);
  }

  @Patch('return-requests/:id/approve')
  @ApiOperation({ summary: '반품 승인' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveReturnDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.returnService.approve(id, dto, req.user.sub);
  }

  @Patch('return-requests/:id/reject')
  @ApiOperation({ summary: '반품 거절' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectReturnDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.returnService.reject(id, dto, req.user.sub);
  }

  @Patch('return-requests/:id/tracking')
  @ApiOperation({ summary: '반품 운송장 입력' })
  async updateTracking(
    @Param('id') id: string,
    @Body() dto: UpdateReturnTrackingDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.returnService.updateTracking(id, dto, req.user.sub);
  }

  @Patch('return-requests/:id/complete')
  @ApiOperation({ summary: '반품 완료 처리' })
  async complete(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.returnService.complete(id, req.user.sub);
  }

  @Patch('return-requests/:id/exchange-ship')
  @ApiOperation({ summary: '교환 재발송 등록' })
  async exchangeShip(
    @Param('id') id: string,
    @Body() dto: ExchangeShipDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.returnService.exchangeShip(id, dto, req.user.sub);
  }

  @Patch('return-requests/:id/status')
  @ApiOperation({ summary: '반품 상태 변경' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; note?: string },
    @Request() req: { user: { sub: string } },
  ) {
    return this.returnService.updateStatus(
      id,
      body.status,
      req.user.sub,
      body.note,
    );
  }
}
