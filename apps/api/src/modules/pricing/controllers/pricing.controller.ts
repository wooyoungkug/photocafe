import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PricingService } from '../services/pricing.service';
import {
  CalculateProductPriceDto,
  CalculateHalfProductPriceDto,
  SetGroupProductPriceDto,
  SetGroupHalfProductPriceDto,
  SetGroupProductionSettingPricesDto,
  SetClientProductionSettingPricesDto,
} from '../dto';

@ApiTags('가격관리')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pricing')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  // ==================== 가격 계산 ====================

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
}
