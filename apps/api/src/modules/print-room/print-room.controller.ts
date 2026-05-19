import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { StaffOnlyGuard } from '@/common/guards/staff-only.guard';
import { PrintRoomService } from './print-room.service';
import { QueueQueryDto } from './dto/queue-query.dto';
import { UpdatePrintRoomStatusDto } from './dto/update-status.dto';
import { DownloadLogQueryDto } from './dto/download-log-query.dto';
import { StatsQueryDto } from './dto/stats-query.dto';

@ApiTags('Print Room')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StaffOnlyGuard)
@Controller('print-room')
export class PrintRoomController {
  constructor(private readonly service: PrintRoomService) {}

  @Get('queue')
  @ApiOperation({
    summary: '출력실 Kanban 큐 조회 (status 별 그룹화)',
    description:
      '응답 키: waiting / ready / imposing / imposed / printing / done. ' +
      '각 항목은 OrderItem 단위. printRoomStatus 가 null 인 항목은 제외.',
  })
  getQueue(@Query() query: QueueQueryDto) {
    return this.service.getQueue(query);
  }

  @Get('items/:id')
  @ApiOperation({ summary: '출력실 카드 상세 (OrderItem + 최근 잡/다운로드 5건)' })
  getItem(@Param('id') id: string) {
    return this.service.getItemDetail(id);
  }

  @Patch('items/:id/status')
  @ApiOperation({ summary: '출력실 상태 수동 변경' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePrintRoomStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }

  @Post('items/:id/retry')
  @ApiOperation({
    summary: '출력실 작업 재시도',
    description:
      '최근 실패 잡이 있으면 retryJob, 없으면 새 PrintRoomJob 을 manual=true 로 enqueue.',
  })
  retry(@Param('id') id: string) {
    return this.service.retryItem(id);
  }

  @Get('download-logs')
  @ApiOperation({ summary: '다운로드 이력 조회 (페이지네이션)' })
  getDownloadLogs(@Query() query: DownloadLogQueryDto) {
    return this.service.getDownloadLogs(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: '일별 통계 (기본 최근 7일)',
    description:
      '각 일자별 { date, totalItems, doneItems, downloadCount, failedCount }.',
  })
  getStats(@Query() query: StatsQueryDto) {
    return this.service.getStats(query);
  }
}
