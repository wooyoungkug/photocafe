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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
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
  DailySummaryQueryDto,
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

  @Get('daily-summary')
  @ApiOperation({ summary: '일자별 주문/입금 집계 조회' })
  async getDailySummary(@Query() query: DailySummaryQueryDto) {
    return this.orderService.getDailySummary(
      query.clientId,
      query.startDate,
      query.endDate,
    );
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

  @Post('bulk/delete-originals')
  @ApiOperation({ summary: '원본 이미지 일괄 삭제 (배송완료 후)' })
  async bulkDeleteOriginals(@Body() dto: BulkOrderIdsDto, @Request() req: any) {
    return this.orderService.bulkDeleteOriginals(dto.orderIds, req.user.id);
  }

  @Get('last-product-options')
  @ApiOperation({ summary: '해당 상품의 최근 주문 옵션 조회' })
  async getLastProductOptions(
    @Query('clientId') clientId: string,
    @Query('productId') productId: string,
  ) {
    return this.orderService.getLastProductOptions(clientId, productId);
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

  @Get(':id/download-originals')
  @ApiOperation({ summary: '원본 이미지 다운로드 (ZIP)' })
  async downloadOriginals(@Param('id') id: string, @Res() res: Response) {
    return this.orderService.downloadOriginals(id, res);
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

  @Post(':id/regenerate-pdf')
  @ApiOperation({ summary: 'PDF 재생성 (실패 시 재시도)' })
  async regeneratePdf(@Param('id') id: string) {
    return this.orderService.regeneratePdf(id);
  }

  @Delete(':id/originals')
  @ApiOperation({ summary: '주문 전체 원본 이미지 삭제 (배송완료 후)' })
  async deleteOrderOriginals(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.orderService.deleteOrderOriginals(id, req.user.id);
  }

  @Delete(':id/items/:itemId/originals')
  @ApiOperation({ summary: '원본 이미지 삭제 (배송완료 후)' })
  async deleteOriginals(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Request() req: any,
  ) {
    return this.orderService.deleteOriginals(id, itemId, req.user.id);
  }
}
