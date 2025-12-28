import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { OrderService } from '../services/order.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  UpdateShippingDto,
  OrderQueryDto,
} from '../dto';

@ApiTags('주문')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: '주문 목록 조회' })
  async findAll(@Query() query: OrderQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    return this.orderService.findAll({ skip, take: limit, ...filters });
  }

  @Get('status-counts')
  @ApiOperation({ summary: '주문 상태별 건수' })
  async getStatusCounts() {
    return this.orderService.getStatusCounts();
  }

  @Get(':id')
  @ApiOperation({ summary: '주문 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '주문 생성' })
  async create(@Body() dto: CreateOrderDto, @Request() req: any) {
    return this.orderService.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: '주문 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orderService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '주문 상태 변경' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req: any,
  ) {
    return this.orderService.updateStatus(id, dto, req.user.id);
  }

  @Patch(':id/shipping')
  @ApiOperation({ summary: '배송 정보 업데이트' })
  async updateShipping(@Param('id') id: string, @Body() dto: UpdateShippingDto) {
    return this.orderService.updateShipping(id, dto);
  }

  @Patch(':id/delivered')
  @ApiOperation({ summary: '배송 완료 처리' })
  async markAsDelivered(@Param('id') id: string, @Request() req: any) {
    return this.orderService.markAsDelivered(id, req.user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: '주문 취소' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.orderService.cancel(id, req.user.id, reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: '주문 삭제' })
  async delete(@Param('id') id: string) {
    return this.orderService.delete(id);
  }
}
