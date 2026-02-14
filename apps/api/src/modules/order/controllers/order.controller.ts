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
  AdjustOrderDto,
  OrderQueryDto,
  BulkOrderIdsDto,
  BulkUpdateStatusDto,
  BulkCancelDto,
  BulkUpdateReceiptDateDto,
  BulkDataCleanupDto,
  CheckDuplicateOrderDto,
  MonthlySummaryQueryDto,
  InspectFileDto,
  HoldInspectionDto,
  CompleteInspectionDto,
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

  @Get('monthly-summary')
  @ApiOperation({ summary: '월거래집계 조회' })
  async getMonthlySummary(@Query() query: MonthlySummaryQueryDto) {
    const summary = await this.orderService.getMonthlySummary(
      query.clientId,
      query.startDate,
      query.endDate,
    );
    return { data: summary };
  }

  // ==================== 벌크 작업 (반드시 :id 라우트 위에 배치) ====================
  @Post('bulk/update-status')
  @ApiOperation({ summary: '주문 일괄 상태 변경' })
  async bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto, @Request() req: any) {
    return this.orderService.bulkUpdateStatus(dto, req.user.id);
  }

  @Post('bulk/cancel')
  @ApiOperation({ summary: '주문 일괄 취소' })
  async bulkCancel(@Body() dto: BulkCancelDto, @Request() req: any) {
    return this.orderService.bulkCancel(dto, req.user.id);
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: '주문 일괄 삭제' })
  async bulkDelete(@Body() dto: BulkOrderIdsDto) {
    return this.orderService.bulkDelete(dto.orderIds);
  }

  @Post('bulk/duplicate')
  @ApiOperation({ summary: '주문 일괄 복제' })
  async bulkDuplicate(@Body() dto: BulkOrderIdsDto, @Request() req: any) {
    return this.orderService.bulkDuplicate(dto.orderIds, req.user.id);
  }

  @Post('bulk/reset-amount')
  @ApiOperation({ summary: '주문 금액 일괄 0원 처리' })
  async bulkResetAmount(@Body() dto: BulkOrderIdsDto, @Request() req: any) {
    return this.orderService.bulkResetAmount(dto.orderIds, req.user.id);
  }

  @Post('bulk/update-receipt-date')
  @ApiOperation({ summary: '접수일 일괄 변경' })
  async bulkUpdateReceiptDate(@Body() dto: BulkUpdateReceiptDateDto, @Request() req: any) {
    return this.orderService.bulkUpdateReceiptDate(dto, req.user.id);
  }

  @Post('bulk/data-cleanup')
  @ApiOperation({ summary: '기간별 데이터 정리' })
  async dataCleanup(@Body() dto: BulkDataCleanupDto) {
    return this.orderService.dataCleanup(dto);
  }

  @Post('check-duplicates')
  @ApiOperation({ summary: '중복 주문 체크 (3개월 이내)' })
  async checkDuplicates(@Body() dto: CheckDuplicateOrderDto) {
    return this.orderService.checkDuplicateOrders(dto.clientId, dto.folderNames);
  }

  @Get(':id/history')
  @ApiOperation({ summary: '주문 공정 이력 조회' })
  async getProcessHistory(@Param('id') id: string) {
    return this.orderService.getProcessHistory(id);
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

  @Patch(':id/adjust')
  @ApiOperation({ summary: '관리자 금액/수량 조정' })
  async adjustOrder(
    @Param('id') id: string,
    @Body() dto: AdjustOrderDto,
    @Request() req: any,
  ) {
    return this.orderService.adjustOrder(id, dto, req.user.id);
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

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: '주문항목 개별 삭제' })
  async deleteItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.orderService.deleteItem(id, itemId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '주문 삭제' })
  async delete(@Param('id') id: string) {
    return this.orderService.delete(id);
  }

  // ==================== 파일검수 관련 ====================

  @Post(':id/start-inspection')
  @ApiOperation({ summary: '파일검수 시작 (자동 호출)' })
  async startInspection(@Param('id') id: string, @Request() req: any) {
    return this.orderService.startInspection(id, req.user.id);
  }

  @Patch(':id/files/:fileId/inspect')
  @ApiOperation({ summary: '개별 파일 검수 승인/거부' })
  async inspectFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Body() dto: InspectFileDto,
    @Request() req: any,
  ) {
    return this.orderService.inspectFile(id, fileId, dto, req.user.id);
  }

  @Post(':id/hold-inspection')
  @ApiOperation({ summary: '검수 보류 (SMS 발송 옵션)' })
  async holdInspection(
    @Param('id') id: string,
    @Body() dto: HoldInspectionDto,
    @Request() req: any,
  ) {
    return this.orderService.holdInspection(id, dto, req.user.id);
  }

  @Post(':id/complete-inspection')
  @ApiOperation({ summary: '파일검수 완료' })
  async completeInspection(
    @Param('id') id: string,
    @Body() dto: CompleteInspectionDto,
    @Request() req: any,
  ) {
    return this.orderService.completeInspection(id, req.user.id, dto);
  }
}
