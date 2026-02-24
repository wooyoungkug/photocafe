import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ShippingMgmtService } from '../services/shipping-mgmt.service';
import { CreateBundleDto, BulkTrackingDto } from '../dto/shipping-mgmt.dto';

@ApiTags('delivery-shipping')
@Controller('delivery/shipping')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShippingMgmtController {
  constructor(private readonly service: ShippingMgmtService) {}

  @Get('ready')
  @ApiOperation({ summary: '배송준비 주문 목록' })
  getReadyOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('courierCode') courierCode?: string,
  ) {
    return this.service.getReadyOrders({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      search,
      courierCode,
    });
  }

  @Get('scan/:barcode')
  @ApiOperation({ summary: '바코드로 주문 조회' })
  getOrderByBarcode(@Param('barcode') barcode: string) {
    return this.service.getOrderByBarcode(barcode);
  }

  @Post('bundle/detect')
  @ApiOperation({ summary: '묶음배송 가능 주문 감지' })
  detectBundles() {
    return this.service.detectBundles();
  }

  @Post('bundle')
  @ApiOperation({ summary: '묶음배송 생성' })
  createBundle(@Body() dto: CreateBundleDto, @Request() req: any) {
    return this.service.createBundle(dto, req.user.id);
  }

  @Delete('bundle/:id')
  @ApiOperation({ summary: '묶음배송 해제' })
  dissolveBundle(@Param('id') id: string) {
    return this.service.dissolveBundle(id);
  }

  @Patch('bundle/:id/tracking')
  @ApiOperation({ summary: '묶음배송 송장 일괄 등록' })
  updateBundleTracking(
    @Param('id') id: string,
    @Body() body: { courierCode: string; trackingNumber: string },
    @Request() req: any,
  ) {
    return this.service.updateBundleTracking(
      id,
      body.courierCode,
      body.trackingNumber,
      req.user.id,
    );
  }

  @Patch('bulk-tracking')
  @ApiOperation({ summary: '다건 송장 일괄 입력' })
  bulkUpdateTracking(@Body() dto: BulkTrackingDto, @Request() req: any) {
    return this.service.bulkUpdateTracking(dto, req.user.id);
  }
}
