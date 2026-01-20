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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ConsultationService } from '../services/consultation.service';
import {
  CreateConsultationDto,
  UpdateConsultationDto,
  UpdateConsultationStatusDto,
  ResolveConsultationDto,
  CreateFollowUpDto,
  ConsultationQueryDto,
} from '../dto';

@ApiTags('Consultations')
@Controller('consultations')
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Get()
  @ApiOperation({ summary: '상담 목록 조회' })
  @ApiResponse({ status: 200, description: '상담 목록' })
  async findAll(@Query() query: ConsultationQueryDto) {
    return this.consultationService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '상담 통계' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: '상담 통계' })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.consultationService.getStats(startDate, endDate);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: '특정 고객의 상담 이력' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '고객 상담 이력' })
  async findByClient(
    @Param('clientId') clientId: string,
    @Query('limit') limit?: string,
  ) {
    return this.consultationService.findByClient(
      clientId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '상담 상세 조회' })
  @ApiResponse({ status: 200, description: '상담 상세 정보' })
  async findOne(@Param('id') id: string) {
    return this.consultationService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '상담 등록' })
  @ApiResponse({ status: 201, description: '상담 등록 완료' })
  async create(@Body() data: CreateConsultationDto) {
    return this.consultationService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '상담 수정' })
  @ApiResponse({ status: 200, description: '상담 수정 완료' })
  async update(@Param('id') id: string, @Body() data: UpdateConsultationDto) {
    return this.consultationService.update(id, data);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '상담 상태 변경' })
  @ApiResponse({ status: 200, description: '상담 상태 변경 완료' })
  async updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateConsultationStatusDto,
  ) {
    return this.consultationService.updateStatus(id, data);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: '상담 해결 처리' })
  @ApiResponse({ status: 200, description: '상담 해결 처리 완료' })
  async resolve(@Param('id') id: string, @Body() data: ResolveConsultationDto) {
    return this.consultationService.resolve(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '상담 삭제' })
  @ApiResponse({ status: 200, description: '상담 삭제 완료' })
  async delete(@Param('id') id: string) {
    return this.consultationService.delete(id);
  }

  @Post(':id/follow-up')
  @ApiOperation({ summary: '후속 조치 등록' })
  @ApiResponse({ status: 201, description: '후속 조치 등록 완료' })
  async addFollowUp(
    @Param('id') id: string,
    @Body() data: CreateFollowUpDto,
  ) {
    return this.consultationService.addFollowUp(id, data);
  }
}
