import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ShippingLabelService, LabelFormat } from '../services/shipping-label.service';
import * as fs from 'fs';

@ApiTags('delivery-label')
@Controller('delivery/label')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShippingLabelController {
  constructor(private readonly service: ShippingLabelService) {}

  @Post('generate/:orderId')
  @ApiOperation({ summary: '운송장 PDF 생성' })
  @ApiQuery({ name: 'format', required: false, enum: ['a5', 'thermal_100x150'] })
  generate(
    @Param('orderId') orderId: string,
    @Query('format') format?: string,
  ) {
    const labelFormat: LabelFormat =
      format === 'thermal_100x150' ? 'thermal_100x150' : 'a5';
    return this.service.generateLabel(orderId, labelFormat);
  }

  @Post('generate-batch')
  @ApiOperation({ summary: '운송장 PDF 일괄 생성' })
  @ApiQuery({ name: 'format', required: false, enum: ['a5', 'thermal_100x150'] })
  generateBatch(
    @Body() body: { orderIds: string[] },
    @Query('format') format?: string,
  ) {
    const labelFormat: LabelFormat =
      format === 'thermal_100x150' ? 'thermal_100x150' : 'a5';
    return this.service.generateBatchLabels(body.orderIds, labelFormat);
  }

  @Get('download/:orderId')
  @ApiOperation({ summary: '운송장 PDF 다운로드' })
  async download(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.service.getLabelFile(orderId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="shipping-label-${orderId}.pdf"`,
    );
    fs.createReadStream(filePath).pipe(res);
  }

  @Get('view/:orderId')
  @ApiOperation({ summary: '운송장 PDF 인라인 뷰 (자동출력용)' })
  async view(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.service.getLabelFile(orderId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    fs.createReadStream(filePath).pipe(res);
  }
}
