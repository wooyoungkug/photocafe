import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PricingService } from '../services/pricing.service';
import {
  CalculateProductPriceDto,
  CalculateHalfProductPriceDto,
  SetGroupProductPriceDto,
  SetGroupHalfProductPriceDto,
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
}
