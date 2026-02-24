import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ShippingLabelService } from '../services/shipping-label.service';
import * as fs from 'fs';

@ApiTags('delivery-label')
@Controller('delivery/label')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShippingLabelController {
  constructor(private readonly service: ShippingLabelService) {}

  @Post('generate/:orderId')
  @ApiOperation({ summary: '운송장 PDF 생성' })
  generate(@Param('orderId') orderId: string) {
    return this.service.generateLabel(orderId);
  }

  @Post('generate-batch')
  @ApiOperation({ summary: '운송장 PDF 일괄 생성' })
  generateBatch(@Body() body: { orderIds: string[] }) {
    return this.service.generateBatchLabels(body.orderIds);
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
}
