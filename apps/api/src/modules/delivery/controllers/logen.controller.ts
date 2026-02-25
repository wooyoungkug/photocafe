import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { LogenService } from '../services/logen.service';
import { Public } from '@/common/decorators/public.decorator';
import {
  GenerateLogenTrackingDto,
  BulkGenerateLogenTrackingDto,
} from '../dto/logen.dto';

@ApiTags('delivery')
@Controller('delivery/logen')
export class LogenController {
  constructor(private readonly logenService: LogenService) {}

  @Get('status')
  @Public()
  @ApiOperation({ summary: '로젠택배 API 연동 상태 확인' })
  getStatus() {
    return this.logenService.getStatus();
  }

  @Post('generate-tracking')
  @ApiOperation({ summary: '단건 송장 자동 발급 (로젠택배)' })
  generateTracking(
    @Body() dto: GenerateLogenTrackingDto,
    @Request() req: any,
  ) {
    return this.logenService.generateTrackingForOrder(dto.orderId, req.user.id);
  }

  @Post('generate-tracking/bulk')
  @ApiOperation({ summary: '복수건 송장 일괄 자동 발급 (로젠택배)' })
  generateTrackingBulk(
    @Body() dto: BulkGenerateLogenTrackingDto,
    @Request() req: any,
  ) {
    return this.logenService.generateTrackingBulk(dto.orderIds, req.user.id);
  }

  @Get('print-url')
  @ApiOperation({ summary: '로젠택배 운송장 출력 팝업 URL' })
  @ApiQuery({ name: 'takeDt', required: false, description: '접수일 (YYYYMMDD)' })
  getPrintUrl(@Query('takeDt') takeDt?: string) {
    return { url: this.logenService.getInvoicePrintUrl(takeDt) };
  }
}
