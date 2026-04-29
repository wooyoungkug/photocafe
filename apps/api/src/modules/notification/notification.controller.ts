import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import {
  ListNotificationsQueryDto,
  NotificationResponseDto,
  PushSubscribeDto,
  PushUnsubscribeDto,
} from './dto/notification.dto';

/** 직원 인앱 알림 — JWT 로그인 사용자 본인 알림 전용 라우트. */
@ApiTags('알림')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get('me')
  @ApiOperation({ summary: '내 알림 목록 (cursor 페이지네이션)' })
  @ApiResponse({ status: 200, type: NotificationResponseDto, isArray: true })
  async listMine(@Query() query: ListNotificationsQueryDto, @Request() req: any) {
    return this.notifications.listForStaff(req.user.id, {
      unreadOnly: query.unreadOnly,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: '내 미확인 알림 개수 (배지용)' })
  @ApiResponse({ status: 200, schema: { properties: { count: { type: 'number' } } } })
  async unreadCount(@Request() req: any) {
    const count = await this.notifications.unreadCount(req.user.id);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '알림 단건 읽음 처리' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  async markRead(@Param('id') id: string, @Request() req: any) {
    return this.notifications.markRead(id, req.user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: '내 모든 미확인 알림 일괄 읽음 처리' })
  @ApiResponse({ status: 200, schema: { properties: { updated: { type: 'number' } } } })
  async markAllRead(@Request() req: any) {
    return this.notifications.markAllRead(req.user.id);
  }

  @Post('push-subscribe')
  @HttpCode(204)
  @ApiOperation({ summary: 'Web Push 구독 등록 (브라우저 PushManager.subscribe 결과 전송)' })
  @ApiResponse({ status: 204, description: '등록 완료' })
  async subscribePush(@Body() dto: PushSubscribeDto, @Request() req: any) {
    await this.notifications.subscribePush(req.user.id, dto);
  }

  @Delete('push-subscribe')
  @HttpCode(204)
  @ApiOperation({ summary: 'Web Push 구독 해제' })
  @ApiResponse({ status: 204, description: '해제 완료' })
  async unsubscribePush(@Body() dto: PushUnsubscribeDto, @Request() req: any) {
    await this.notifications.unsubscribePush(req.user.id, dto.endpoint);
  }
}
