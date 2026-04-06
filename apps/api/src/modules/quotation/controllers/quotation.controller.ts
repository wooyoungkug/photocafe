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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QuotationService } from '../services/quotation.service';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  QuotationQueryDto,
  SendQuotationDto,
  PriceLookupDto,
} from '../dto';

@ApiTags('Quotations')
@Controller('quotations')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Get('stats')
  @ApiOperation({ summary: '견적 통계' })
  @ApiResponse({ status: 200, description: '견적 통계' })
  async getStats() {
    return this.quotationService.getStats();
  }

  @Get('price-lookup')
  @ApiOperation({ summary: '단가 조회 (거래처/그룹/표준)' })
  @ApiResponse({ status: 200, description: '단가 정보' })
  async priceLookup(@Query() query: PriceLookupDto) {
    return this.quotationService.priceLookup(query);
  }

  @Get()
  @ApiOperation({ summary: '견적 목록 조회' })
  @ApiResponse({ status: 200, description: '견적 목록' })
  async findAll(@Query() query: QuotationQueryDto) {
    return this.quotationService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '견적 상세 조회' })
  @ApiResponse({ status: 200, description: '견적 상세' })
  async findOne(@Param('id') id: string) {
    return this.quotationService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '견적 생성' })
  @ApiResponse({ status: 201, description: '견적 생성 성공' })
  async create(@Body() dto: CreateQuotationDto) {
    return this.quotationService.create(dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: '견적 발송 (카카오/SMS/이메일)' })
  @ApiResponse({ status: 200, description: '발송 성공' })
  async send(@Param('id') id: string, @Body() dto: SendQuotationDto) {
    return this.quotationService.send(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '견적 수정' })
  @ApiResponse({ status: 200, description: '견적 수정 성공' })
  async update(@Param('id') id: string, @Body() dto: UpdateQuotationDto) {
    return this.quotationService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '견적 상태 변경' })
  @ApiResponse({ status: 200, description: '상태 변경 성공' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.quotationService.updateStatus(id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: '견적 삭제' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  async remove(@Param('id') id: string) {
    return this.quotationService.remove(id);
  }
}
