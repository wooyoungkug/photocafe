import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RecruitmentService } from '../services/recruitment.service';
import { RecruitmentNotificationService } from '../services/recruitment-notification.service';
import {
  CreateRecruitmentDto,
  UpdateRecruitmentDto,
  QueryRecruitmentDto,
} from '../dto';

@ApiTags('구인방')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recruitments')
export class RecruitmentController {
  constructor(
    private readonly recruitmentService: RecruitmentService,
    private readonly notificationService: RecruitmentNotificationService,
  ) {}

  @Post()
  @ApiOperation({ summary: '구인 등록' })
  async create(@Body() dto: CreateRecruitmentDto, @Request() req: any) {
    // 관리자(staff)가 직접 구인 등록할 경우 sub(=staffId)를 사용, 거래처 사용자는 clientId
    const clientId = req.user.clientId || req.user.id;
    if (!clientId) {
      throw new BadRequestException('구인 등록에 필요한 사용자 정보가 없습니다.');
    }
    return this.recruitmentService.create(dto, clientId, clientId);
  }

  @Get()
  @ApiOperation({ summary: '구인 목록 조회' })
  async findAll(@Query() query: QueryRecruitmentDto) {
    return this.recruitmentService.findAll(query);
  }

  @Get('stats/average-budget')
  @ApiOperation({ summary: '촬영유형별 평균 예산 조회' })
  async getAverageBudget() {
    return this.recruitmentService.getAverageBudgetByType();
  }

  @Get(':id')
  @ApiOperation({ summary: '구인 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.recruitmentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '구인 수정' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRecruitmentDto,
    @Request() req: any,
  ) {
    return this.recruitmentService.update(id, dto, req.user.clientId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '구인 삭제' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.recruitmentService.delete(id, req.user.clientId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '구인 상태 변경' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    return this.recruitmentService.updateStatus(id, status, req.user.clientId);
  }

  @Get(':id/notifications')
  @ApiOperation({ summary: '구인 알림 발송 이력 조회' })
  async getNotificationLogs(@Param('id') id: string) {
    return this.notificationService.getNotificationLogs(id);
  }

  @Post(':id/resend')
  @ApiOperation({ summary: '구인 알림 재발송' })
  async resendNotifications(@Param('id') id: string) {
    const recruitment = await this.recruitmentService.findOne(id);
    return this.notificationService.sendPublicRecruitingNotificationWithRegionPriority(recruitment);
  }
}
