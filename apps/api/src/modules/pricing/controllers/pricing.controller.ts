import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { PricingService } from '../services/pricing.service';
import {
  CalculateProductPriceDto,
  CalculateHalfProductPriceDto,
  CalculateAlbumOrderPriceDto,
  SetGroupProductPriceDto,
  SetGroupHalfProductPriceDto,
  SetGroupProductionSettingPricesDto,
  SetClientProductionSettingPricesDto,
  GetAlbumPagePriceDto,
  CloneAllDto,
  ApplyWeightAllDto,
} from '../dto';

@ApiTags('가격관리')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pricing')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  // ==================== 앨범 페이지 단가 조회 ====================

  @Get('album-page-price')
  @Public()
  @ApiOperation({ summary: '앨범 페이지 단가 조회 (DB 기반)' })
  @ApiQuery({ name: 'productionSettingId', required: true, description: '출력 생산설정 ID' })
  @ApiQuery({ name: 'bindingProductionSettingId', required: false, description: '제본 생산설정 ID' })
  @ApiQuery({ name: 'specificationId', required: true, description: '규격 ID' })
  @ApiQuery({ name: 'colorMode', required: true, enum: ['4c', '6c'], description: '색상 모드 (4도/6도)' })
  @ApiQuery({ name: 'pageLayout', required: true, enum: ['single', 'spread'], description: '페이지 레이아웃 (단면/양면)' })
  async getAlbumPagePrice(
    @Query() query: GetAlbumPagePriceDto,
    @Request() req: any,
  ) {
    // 쿼리 파라미터 clientId 우선, 없으면 JWT에서 추출
    const clientId = query.clientId || req.user?.clientId || null;
    return this.pricingService.getAlbumPagePrice(clientId, query);
  }

  // ==================== 가격 계산 ====================

  @Post('calculate/album-order')
  @Public()
  @ApiOperation({ summary: '앨범 주문 가격 계산 (DB 기반)' })
  async calculateAlbumOrderPrice(@Body() dto: CalculateAlbumOrderPriceDto) {
    return this.pricingService.calculateAlbumOrderPrice(dto);
  }

  @Post('calculate/product')
  @ApiOperation({ summary: '상품 가격 계산' })
  async calculateProductPrice(@Body() dto: CalculateProductPriceDto) {
    return this.pricingService.calculateProductPrice(dto);
  }

  @Post('calculate/half-product')
  @ApiOperation({ summary: '반제품 가격 계산' })
  async calculateHalfProductPrice(@Body() dto: CalculateHalfProductPriceDto) {
    return this.pricingService.calculateHalfProductPrice(dto);
  }

  // ==================== 그룹 상품 가격 관리 ====================

  @Get('groups/:groupId/products')
  @ApiOperation({ summary: '그룹별 상품 가격 목록' })
  async getGroupProductPrices(@Param('groupId') groupId: string) {
    return this.pricingService.getGroupProductPrices(groupId);
  }

  @Post('groups/products')
  @ApiOperation({ summary: '그룹 상품 가격 설정' })
  async setGroupProductPrice(@Body() dto: SetGroupProductPriceDto) {
    return this.pricingService.setGroupProductPrice(dto);
  }

  @Delete('groups/:groupId/products/:productId')
  @ApiOperation({ summary: '그룹 상품 가격 삭제' })
  async deleteGroupProductPrice(
    @Param('groupId') groupId: string,
    @Param('productId') productId: string,
  ) {
    return this.pricingService.deleteGroupProductPrice(groupId, productId);
  }

  // ==================== 그룹 반제품 가격 관리 ====================

  @Get('groups/:groupId/half-products')
  @ApiOperation({ summary: '그룹별 반제품 가격 목록' })
  async getGroupHalfProductPrices(@Param('groupId') groupId: string) {
    return this.pricingService.getGroupHalfProductPrices(groupId);
  }

  @Post('groups/half-products')
  @ApiOperation({ summary: '그룹 반제품 가격 설정' })
  async setGroupHalfProductPrice(@Body() dto: SetGroupHalfProductPriceDto) {
    return this.pricingService.setGroupHalfProductPrice(dto);
  }

  @Delete('groups/:groupId/half-products/:halfProductId')
  @ApiOperation({ summary: '그룹 반제품 가격 삭제' })
  async deleteGroupHalfProductPrice(
    @Param('groupId') groupId: string,
    @Param('halfProductId') halfProductId: string,
  ) {
    return this.pricingService.deleteGroupHalfProductPrice(groupId, halfProductId);
  }

  // ==================== 그룹 생산설정 단가 관리 ====================

  @Get('groups/:clientGroupId/production-settings')
  @ApiOperation({ summary: '그룹별 생산설정 단가 목록' })
  @ApiQuery({ name: 'productionSettingId', required: false, description: '생산설정 ID (선택)' })
  async getGroupProductionSettingPrices(
    @Param('clientGroupId') clientGroupId: string,
    @Query('productionSettingId') productionSettingId?: string,
  ) {
    return this.pricingService.getGroupProductionSettingPrices(clientGroupId, productionSettingId);
  }

  @Post('groups/:clientGroupId/clone-standard/:productionSettingId')
  @ApiOperation({ summary: '표준단가를 그룹단가로 복사' })
  async cloneStandardToGroupPrices(
    @Param('clientGroupId') clientGroupId: string,
    @Param('productionSettingId') productionSettingId: string,
  ) {
    return this.pricingService.cloneStandardToGroupPrices(clientGroupId, productionSettingId);
  }

  @Post('groups/production-settings')
  @ApiOperation({ summary: '그룹 생산설정 단가 설정' })
  async setGroupProductionSettingPrices(@Body() dto: SetGroupProductionSettingPricesDto) {
    return this.pricingService.setGroupProductionSettingPrices(dto);
  }

  @Delete('groups/:clientGroupId/production-settings/:productionSettingId')
  @ApiOperation({ summary: '그룹 생산설정 단가 삭제 (특정 설정 전체)' })
  async deleteGroupProductionSettingPrices(
    @Param('clientGroupId') clientGroupId: string,
    @Param('productionSettingId') productionSettingId: string,
  ) {
    return this.pricingService.deleteGroupProductionSettingPrices(clientGroupId, productionSettingId);
  }

  @Delete('groups/production-settings/:id')
  @ApiOperation({ summary: '그룹 생산설정 단가 개별 삭제' })
  async deleteGroupProductionSettingPrice(@Param('id') id: string) {
    return this.pricingService.deleteGroupProductionSettingPrice(id);
  }

  @Post('groups/:targetGroupId/clone-group/:sourceGroupId/:productionSettingId')
  @ApiOperation({ summary: '그룹A 단가를 그룹B로 복사 (설정 단위)' })
  async cloneGroupToGroup(
    @Param('targetGroupId') targetGroupId: string,
    @Param('sourceGroupId') sourceGroupId: string,
    @Param('productionSettingId') productionSettingId: string,
  ) {
    return this.pricingService.cloneGroupToGroup(sourceGroupId, targetGroupId, productionSettingId);
  }

  @Post('groups/:targetGroupId/clone-all')
  @ApiOperation({ summary: '전체 생산설정 단가 일괄 복사 (그룹 대상)' })
  async cloneAllToGroup(
    @Param('targetGroupId') targetGroupId: string,
    @Body() dto: CloneAllDto,
  ) {
    return this.pricingService.cloneAllToGroup(targetGroupId, dto);
  }

  @Post('groups/:clientGroupId/apply-weight-all')
  @ApiOperation({ summary: '그룹 전체 생산설정에 가중치 일괄 적용' })
  async applyWeightAllToGroup(
    @Param('clientGroupId') clientGroupId: string,
    @Body() dto: ApplyWeightAllDto,
  ) {
    return this.pricingService.applyWeightAll('group', clientGroupId, dto);
  }

  // ==================== 거래처 개별 생산설정 단가 관리 ====================

  @Get('clients/:clientId/production-settings')
  @ApiOperation({ summary: '거래처별 개별 생산설정 단가 목록' })
  @ApiQuery({ name: 'productionSettingId', required: false, description: '생산설정 ID (선택)' })
  async getClientProductionSettingPrices(
    @Param('clientId') clientId: string,
    @Query('productionSettingId') productionSettingId?: string,
  ) {
    return this.pricingService.getClientProductionSettingPrices(clientId, productionSettingId);
  }

  @Get('clients/:clientId/production-settings/summary')
  @ApiOperation({ summary: '거래처별 개별 단가 설정된 생산설정 요약 (마킹용)' })
  async getClientProductionSettingSummary(@Param('clientId') clientId: string) {
    return this.pricingService.getClientProductionSettingSummary(clientId);
  }

  @Post('clients/production-settings')
  @ApiOperation({ summary: '거래처 개별 생산설정 단가 설정' })
  async setClientProductionSettingPrices(@Body() dto: SetClientProductionSettingPricesDto) {
    return this.pricingService.setClientProductionSettingPrices(dto);
  }

  @Delete('clients/:clientId/production-settings/:productionSettingId')
  @ApiOperation({ summary: '거래처 개별 생산설정 단가 삭제 (특정 설정 전체)' })
  async deleteClientProductionSettingPrices(
    @Param('clientId') clientId: string,
    @Param('productionSettingId') productionSettingId: string,
  ) {
    return this.pricingService.deleteClientProductionSettingPrices(clientId, productionSettingId);
  }

  @Delete('clients/production-settings/:id')
  @ApiOperation({ summary: '거래처 개별 생산설정 단가 개별 삭제' })
  async deleteClientProductionSettingPrice(@Param('id') id: string) {
    return this.pricingService.deleteClientProductionSettingPrice(id);
  }

  @Post('clients/:clientId/clone-standard/:productionSettingId')
  @ApiOperation({ summary: '표준단가를 거래처 개별단가로 복사' })
  async cloneStandardToClientPrices(
    @Param('clientId') clientId: string,
    @Param('productionSettingId') productionSettingId: string,
  ) {
    return this.pricingService.cloneStandardToClientPrices(clientId, productionSettingId);
  }

  @Post('clients/:clientId/clone-group/:productionSettingId')
  @ApiOperation({ summary: '그룹단가를 거래처 개별단가로 복사' })
  @ApiQuery({ name: 'clientGroupId', required: true, description: '소스 그룹 ID' })
  async cloneGroupToClientPrices(
    @Param('clientId') clientId: string,
    @Param('productionSettingId') productionSettingId: string,
    @Query('clientGroupId') clientGroupId: string,
  ) {
    return this.pricingService.cloneGroupToClientPrices(clientGroupId, clientId, productionSettingId);
  }

  @Post('clients/:targetClientId/clone-client/:sourceClientId/:productionSettingId')
  @ApiOperation({ summary: '거래처A 개별단가를 거래처B로 복사' })
  async cloneClientToClient(
    @Param('targetClientId') targetClientId: string,
    @Param('sourceClientId') sourceClientId: string,
    @Param('productionSettingId') productionSettingId: string,
  ) {
    return this.pricingService.cloneClientToClient(sourceClientId, targetClientId, productionSettingId);
  }

  @Post('clients/:clientId/clone-all')
  @ApiOperation({ summary: '전체 생산설정 단가 일괄 복사 (거래처 대상)' })
  async cloneAllToClient(
    @Param('clientId') clientId: string,
    @Body() dto: CloneAllDto,
  ) {
    return this.pricingService.cloneAllToClient(clientId, dto);
  }

  @Post('clients/:clientId/apply-weight-all')
  @ApiOperation({ summary: '거래처 전체 생산설정에 가중치 일괄 적용' })
  async applyWeightAllToClient(
    @Param('clientId') clientId: string,
    @Body() dto: ApplyWeightAllDto,
  ) {
    return this.pricingService.applyWeightAll('client', clientId, dto);
  }

  // ==================== 표준단가 Flat 조회 ====================

  @Get('standard/:productionSettingId/prices')
  @ApiOperation({ summary: '표준단가를 flat 배열로 조회 (그룹/개별 비교 참조용)' })
  async getStandardPricesFlat(
    @Param('productionSettingId') productionSettingId: string,
  ) {
    return this.pricingService.getStandardPricesFlat(productionSettingId);
  }

  // ==================== 단가 검증 ====================

  @Post('validate')
  @ApiOperation({ summary: '단가 검증 (NUP 일관성, 범위 검사 등)' })
  async validatePrices(
    @Body() dto: { productionSettingId: string; prices: any[]; mode?: string },
  ) {
    return this.pricingService.validatePrices(dto);
  }
}
