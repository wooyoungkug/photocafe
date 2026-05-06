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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { OrderService } from '../services/order.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  UpdateShippingDto,
  UpdateShippingWithFeeDto,
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
  SameDayShippingQueryDto,
  EditOrderWithAuditDto,
  RequestReprintDto,
  SetPrintOperatorDto,
} from '../dto';

@ApiTags('주문')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: '주문 목록 조회' })
  async findAll(@Query() query: OrderQueryDto, @Request() req: any) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    // Employee 주문 스코핑: 거래처 강제 + 본인 주문만 필터
    if (req.user?.type === 'employee') {
      filters.clientId = req.user.clientId;
      if (!req.user.canViewAllOrders) {
        (filters as any).createdByUserId = req.user.sub;
      }
    }

    // staff 타입: salesViewScope='own' 이면 본인 담당 거래처의 주문만 조회
    let clientAssignedStaffId: string | undefined;
    console.log('[SCOPE] type=', req.user?.type, 'sub=', req.user?.sub);
    if (req.user?.type === 'staff') {
      clientAssignedStaffId = await this.orderService.getStaffSalesScopeId(req.user.sub);
      console.log('[SCOPE] clientAssignedStaffId=', clientAssignedStaffId);
    }

    return this.orderService.findAll({
      skip,
      take: limit,
      ...filters,
      ...(clientAssignedStaffId && { clientAssignedStaffId }),
    });
  }

  @Get('status-counts')
  @ApiOperation({ summary: '주문 상태별 건수' })
  async getStatusCounts(@Request() req: any, @Query('clientId') clientId?: string) {
    let createdByUserId: string | undefined;

    // Employee 주문 스코핑: 거래처 강제 + 본인 주문만 필터
    if (req.user?.type === 'employee') {
      clientId = req.user.clientId;
      if (!req.user.canViewAllOrders) {
        createdByUserId = req.user.sub;
      }
    }

    return this.orderService.getStatusCounts(clientId, createdByUserId);
  }

  @Get('production-stage-counts')
  @ApiOperation({ summary: '공정단계별 주문 건수' })
  async getProductionStageCounts(
    @Request() req: any,
    @Query('clientId') clientId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let createdByUserId: string | undefined;

    // Employee 주문 스코핑: 거래처 강제 + 본인 주문만 필터
    if (req.user?.type === 'employee') {
      clientId = req.user.clientId;
      if (!req.user.canViewAllOrders) {
        createdByUserId = req.user.sub;
      }
    }

    return this.orderService.getProductionStageCounts(clientId, createdByUserId, startDate, endDate);
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

  @Get('same-day-shipping')
  @ApiOperation({ summary: '당일 합배송 체크 (조건부 무료배송 적용 여부)' })
  async getSameDayShipping(@Query() query: SameDayShippingQueryDto) {
    return this.orderService.getSameDayShipping(query.clientId);
  }

  @Get('last-product-options')
  @ApiOperation({ summary: '해당 상품의 최근 주문 옵션 조회' })
  async getLastProductOptions(
    @Query('clientId') clientId: string,
    @Query('productId') productId: string,
  ) {
    return this.orderService.getLastProductOptions(clientId, productId);
  }

  @Patch('items/:itemId/slip-printed')
  @ApiOperation({ summary: '작업지시서 출력 완료 확인 (관리자, PDF 완료 후)' })
  async confirmSlipPrinted(@Param('itemId') itemId: string) {
    return this.orderService.confirmSlipPrintedByStaff(itemId);
  }

  @Post('check-duplicates')
  @ApiOperation({ summary: '중복 주문 체크 (3개월 이내)' })
  async checkDuplicates(@Body() dto: CheckDuplicateOrderDto) {
    return this.orderService.checkDuplicateOrders(dto.clientId, dto.folderNames);
  }

  @Post('sync-current-process')
  @ApiOperation({ summary: 'currentProcess 일괄 동기화 (status 기반)' })
  async syncCurrentProcess() {
    return this.orderService.syncCurrentProcess();
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

  @Get('files/:fileId/access-url')
  @ApiOperation({ summary: '원본 파일 접근 URL 조회 (B2 프리사인드 우선, 미설정 시 로컬 URL)' })
  async getFileAccessUrl(@Param('fileId') fileId: string, @Request() req: any) {
    return this.orderService.getOrderFileAccessUrl(fileId, {
      ...req?.user,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '주문 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '주문 생성' })
  async create(@Body() dto: CreateOrderDto, @Request() req: any) {
    // Employee가 주문 생성 시 거래처 강제 + createdByUserId 기록
    if (req.user?.type === 'employee') {
      dto.clientId = req.user.clientId;
      return this.orderService.create(dto, req.user.id, req.user.sub);
    }
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
  @ApiOperation({ summary: '관리자 금액/수량/사양 조정' })
  async adjustOrder(
    @Param('id') id: string,
    @Body() dto: AdjustOrderDto,
    @Request() req: any,
  ) {
    // 최고관리자(super_admin) 만 모든 상태에서 사양 변경 허용.
    // 일반 관리자는 pending_receipt / confirmed 단계만.
    const isSuperAdmin =
      req.user?.isSuperAdmin === true || req.user?.role === 'admin';
    return this.orderService.adjustOrder(id, dto, req.user.id, { isSuperAdmin });
  }

  @Patch(':id/shipping')
  @ApiOperation({ summary: '배송 정보 업데이트' })
  async updateShipping(@Param('id') id: string, @Body() dto: UpdateShippingDto) {
    return this.orderService.updateShipping(id, dto);
  }

  @Patch(':id/shipping-with-fee')
  @ApiOperation({ summary: '고객용 배송정보 수정 + 배송비 정산' })
  async updateShippingWithFee(@Param('id') id: string, @Body() dto: UpdateShippingWithFeeDto) {
    return this.orderService.updateShippingWithFee(id, dto);
  }

  @Patch(':id/delivered')
  @ApiOperation({ summary: '배송 완료 처리' })
  async markAsDelivered(@Param('id') id: string, @Request() req: any) {
    return this.orderService.markAsDelivered(id, req.user.id);
  }

  @Get(':id/cancel-preview')
  @ApiOperation({ summary: '주문 취소 사전 조회 (배송비 재청구 여부)' })
  async getCancelPreview(@Param('id') id: string) {
    return this.orderService.getCancelPreview(id);
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

  @Delete(':id/items/:itemId/files/:fileId')
  @ApiOperation({ summary: '주문 항목 개별 이미지 삭제 (접수대기·소프트 삭제)' })
  async deleteOrderItemFile(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Param('fileId') fileId: string,
    @Request() req: any,
  ) {
    return this.orderService.softDeleteOrderItemFile(id, itemId, fileId, req.user.id);
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

  @Post('repair-thumbnails')
  @ApiOperation({ summary: '깨진 썸네일 복구 (temp URL 또는 누락된 썸네일 재생성)' })
  async repairBrokenThumbnails() {
    return this.orderService.repairBrokenThumbnails();
  }

  @Post('repair-pending-files')
  @ApiOperation({ summary: 'pending 파일 복구 (temp 경로 → 정식 경로 이동)' })
  async repairPendingFiles() {
    return this.orderService.repairPendingFiles();
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

  // ==================== 편집/재출력/담당자/이력 (2026-04-29) ====================

  @Patch(':id/edit-with-message')
  @ApiOperation({ summary: '감사로그+알림 포함 사양/금액 편집' })
  @ApiResponse({ status: 200, description: '편집 완료. editHistoryId, lastEditedAt 포함.' })
  async editWithMessage(
    @Param('id') id: string,
    @Body() dto: EditOrderWithAuditDto,
    @Request() req: any,
  ) {
    const isSuperAdmin = req.user?.isSuperAdmin === true || req.user?.role === 'admin';
    const canChangeOrderAmount = req.user?.canChangeOrderAmount === true || isSuperAdmin;
    return this.orderService.adjustOrderWithAudit(
      id,
      dto,
      { id: req.user.id, name: req.user.name },
      { isSuperAdmin, canChangeOrderAmount },
    );
  }

  @Post(':id/reprint')
  @ApiOperation({ summary: '재출력 요청 (페이지 단위 부분 재출력 + 추가비용 청구)' })
  @ApiResponse({
    status: 201,
    description: 'reprintNumber, additionalCost, jobIds, historyId 반환',
  })
  async requestReprint(
    @Param('id') id: string,
    @Body() dto: RequestReprintDto,
    @Request() req: any,
  ) {
    return this.orderService.requestReprint(id, dto, {
      id: req.user.id,
      name: req.user.name,
    });
  }

  @Get(':id/edit-history')
  @ApiOperation({ summary: '주문 편집/재출력 이력 (시계열 desc)' })
  @ApiResponse({ status: 200, description: 'items[], nextCursor, hasMore' })
  async getEditHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.orderService.getEditHistory(id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor,
    });
  }

  @Patch(':id/print-operator')
  @ApiOperation({ summary: '출력담당자 변경/해제 (단독 변경)' })
  @ApiResponse({ status: 200, description: 'changed, prevOperatorId, newOperatorId' })
  async setPrintOperator(
    @Param('id') id: string,
    @Body() dto: SetPrintOperatorDto,
    @Request() req: any,
  ) {
    return this.orderService.setPrintOperator(id, dto.operatorId, {
      id: req.user.id,
      name: req.user.name,
    });
  }
}
