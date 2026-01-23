import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CSAdvancedService } from '../services/cs-advanced.service';
import {
  CreateConsultationTagDto,
  UpdateConsultationTagDto,
  AddTagsToConsultationDto,
  CreateAlertDto,
  ResolveAlertDto,
  AlertQueryDto,
  CreateSLADto,
  UpdateSLADto,
  CreateSurveyDto,
  CreateGuideDto,
  UpdateGuideDto,
  DashboardQueryDto,
  ClientTimelineQueryDto,
  CreateChannelLogDto,
} from '../dto';

@ApiTags('CS Advanced')
@Controller('cs')
export class CSAdvancedController {
  constructor(private readonly csService: CSAdvancedService) {}

  // ==================== 대시보드 ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'CS 대시보드 통계' })
  async getDashboardStats(@Query() query: DashboardQueryDto) {
    return this.csService.getDashboardStats(query);
  }

  // ==================== 태그 관리 ====================

  @Get('tags')
  @ApiOperation({ summary: '태그 목록 조회' })
  @ApiQuery({ name: 'category', required: false, enum: ['claim', 'inquiry', 'sales'] })
  async findAllTags(@Query('category') category?: string) {
    return this.csService.findAllTags(category);
  }

  @Post('tags')
  @ApiOperation({ summary: '태그 생성' })
  async createTag(@Body() data: CreateConsultationTagDto) {
    return this.csService.createTag(data);
  }

  @Put('tags/:id')
  @ApiOperation({ summary: '태그 수정' })
  async updateTag(@Param('id') id: string, @Body() data: UpdateConsultationTagDto) {
    return this.csService.updateTag(id, data);
  }

  @Delete('tags/:id')
  @ApiOperation({ summary: '태그 삭제' })
  async deleteTag(@Param('id') id: string) {
    return this.csService.deleteTag(id);
  }

  @Post('consultations/:consultationId/tags')
  @ApiOperation({ summary: '상담에 태그 추가' })
  async addTagsToConsultation(
    @Param('consultationId') consultationId: string,
    @Body() data: AddTagsToConsultationDto,
  ) {
    return this.csService.addTagsToConsultation(consultationId, data);
  }

  @Delete('consultations/:consultationId/tags/:tagId')
  @ApiOperation({ summary: '상담에서 태그 제거' })
  async removeTagFromConsultation(
    @Param('consultationId') consultationId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.csService.removeTagFromConsultation(consultationId, tagId);
  }

  @Get('consultations/:consultationId/tags')
  @ApiOperation({ summary: '상담 태그 목록 조회' })
  async getConsultationTags(@Param('consultationId') consultationId: string) {
    return this.csService.getConsultationTags(consultationId);
  }

  @Post('consultations/:consultationId/auto-tag')
  @ApiOperation({ summary: '상담 자동 태깅' })
  async autoTagConsultation(@Param('consultationId') consultationId: string) {
    return this.csService.autoTagConsultation(consultationId);
  }

  // ==================== 알림 관리 ====================

  @Get('alerts')
  @ApiOperation({ summary: '알림 목록 조회' })
  async findAllAlerts(@Query() query: AlertQueryDto) {
    return this.csService.findAllAlerts(query);
  }

  @Get('alerts/unread-count')
  @ApiOperation({ summary: '읽지 않은 알림 수' })
  async getUnreadAlertCount() {
    return { count: await this.csService.getUnreadAlertCount() };
  }

  @Post('alerts')
  @ApiOperation({ summary: '알림 생성' })
  async createAlert(@Body() data: CreateAlertDto) {
    return this.csService.createAlert(data);
  }

  @Patch('alerts/:id/read')
  @ApiOperation({ summary: '알림 읽음 처리' })
  async markAlertAsRead(@Param('id') id: string, @Body('readBy') readBy: string) {
    return this.csService.markAlertAsRead(id, readBy);
  }

  @Patch('alerts/:id/resolve')
  @ApiOperation({ summary: '알림 해결 처리' })
  async resolveAlert(@Param('id') id: string, @Body() data: ResolveAlertDto) {
    return this.csService.resolveAlert(id, data);
  }

  // ==================== SLA 관리 ====================

  @Get('sla')
  @ApiOperation({ summary: 'SLA 설정 목록' })
  async findAllSLAs() {
    return this.csService.findAllSLAs();
  }

  @Post('sla')
  @ApiOperation({ summary: 'SLA 설정 생성' })
  async createSLA(@Body() data: CreateSLADto) {
    return this.csService.createSLA(data);
  }

  @Put('sla/:id')
  @ApiOperation({ summary: 'SLA 설정 수정' })
  async updateSLA(@Param('id') id: string, @Body() data: UpdateSLADto) {
    return this.csService.updateSLA(id, data);
  }

  @Delete('sla/:id')
  @ApiOperation({ summary: 'SLA 설정 삭제' })
  async deleteSLA(@Param('id') id: string) {
    return this.csService.deleteSLA(id);
  }

  // ==================== 고객 건강 점수 ====================

  @Get('health-scores/at-risk')
  @ApiOperation({ summary: '이탈 위험 고객 목록' })
  async getAtRiskCustomers() {
    return this.csService.getAtRiskCustomers();
  }

  @Get('health-scores/:clientId')
  @ApiOperation({ summary: '고객 건강 점수 조회' })
  async getCustomerHealthScore(@Param('clientId') clientId: string) {
    return this.csService.getCustomerHealthScore(clientId);
  }

  @Post('health-scores/:clientId/calculate')
  @ApiOperation({ summary: '고객 건강 점수 재계산' })
  async calculateHealthScore(@Param('clientId') clientId: string) {
    return this.csService.calculateAndSaveHealthScore(clientId);
  }

  // ==================== 만족도 조사 ====================

  @Post('surveys')
  @ApiOperation({ summary: '만족도 조사 등록' })
  async createSurvey(@Body() data: CreateSurveyDto) {
    return this.csService.createSurvey(data);
  }

  @Get('surveys/stats')
  @ApiOperation({ summary: '만족도 조사 통계' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSurveyStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.csService.getSurveyStats(startDate, endDate);
  }

  // ==================== 상담 가이드 ====================

  @Get('guides')
  @ApiOperation({ summary: '상담 가이드 목록' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'tagCodes', required: false, isArray: true })
  async findAllGuides(
    @Query('categoryId') categoryId?: string,
    @Query('tagCodes') tagCodes?: string[],
  ) {
    return this.csService.findAllGuides(categoryId, tagCodes);
  }

  @Post('guides')
  @ApiOperation({ summary: '상담 가이드 생성' })
  async createGuide(@Body() data: CreateGuideDto) {
    return this.csService.createGuide(data);
  }

  @Put('guides/:id')
  @ApiOperation({ summary: '상담 가이드 수정' })
  async updateGuide(@Param('id') id: string, @Body() data: UpdateGuideDto) {
    return this.csService.updateGuide(id, data);
  }

  @Delete('guides/:id')
  @ApiOperation({ summary: '상담 가이드 삭제' })
  async deleteGuide(@Param('id') id: string) {
    return this.csService.deleteGuide(id);
  }

  @Post('guides/:id/use')
  @ApiOperation({ summary: '가이드 사용 횟수 증가' })
  async incrementGuideUsage(@Param('id') id: string) {
    return this.csService.incrementGuideUsage(id);
  }

  @Post('guides/:id/helpful')
  @ApiOperation({ summary: '가이드 도움됨 표시' })
  async markGuideHelpful(@Param('id') id: string) {
    return this.csService.markGuideHelpful(id);
  }

  @Get('consultations/:consultationId/recommended-guides')
  @ApiOperation({ summary: '상담 기반 가이드 추천' })
  async recommendGuides(@Param('consultationId') consultationId: string) {
    return this.csService.recommendGuides(consultationId);
  }

  // ==================== 고객 타임라인 ====================

  @Get('clients/:clientId/timeline')
  @ApiOperation({ summary: '고객 타임라인 조회' })
  async getClientTimeline(
    @Param('clientId') clientId: string,
    @Query() query: ClientTimelineQueryDto,
  ) {
    return this.csService.getClientTimeline(clientId, query);
  }

  // ==================== 채널 기록 ====================

  @Post('channels')
  @ApiOperation({ summary: '채널 기록 추가' })
  async createChannelLog(@Body() data: CreateChannelLogDto) {
    return this.csService.createChannelLog(data);
  }

  @Get('channels/stats')
  @ApiOperation({ summary: '채널별 통계' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getChannelStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.csService.getChannelStats(startDate, endDate);
  }
}
