import {
  Controller,
  Get,
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
}
