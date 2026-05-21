import {
  Body,
  Controller,
  Delete,
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
import {
  CreatePrintRoomPresetDto,
  UpdatePrintRoomPresetDto,
} from './dto/preset.dto';

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

  @Get('items/:id/print-ready-url')
  @ApiOperation({
    summary: '출력실 항목의 출력 PDF 보기 URL',
    description:
      '최신 PrintReadyFile(인디고=임포지션 PDF)의 프리사인드 URL(5분 유효)을 반환. ' +
      'PDF 미생성 시 404.',
  })
  getPrintReadyUrl(@Param('id') id: string) {
    return this.service.getPrintReadyFileUrl(id);
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

  // ==========================================================
  // PrintRoomPreset CRUD (Phase 6 미리보기/관리)
  // ==========================================================
  @Get('presets')
  @ApiOperation({ summary: '출력실 프리셋 목록 (sizeCode, nup 등 정렬)' })
  listPresets(
    @Query('activeOnly') activeOnly?: string,
    @Query('nup') nup?: string,
  ) {
    return this.service.listPresets({
      activeOnly: activeOnly === 'true' || activeOnly === '1',
      nup,
    });
  }

  @Get('presets/:id')
  @ApiOperation({ summary: '출력실 프리셋 단건 조회' })
  getPreset(@Param('id') id: string) {
    return this.service.getPreset(id);
  }

  @Post('presets')
  @ApiOperation({ summary: '출력실 프리셋 신규 생성' })
  createPreset(@Body() dto: CreatePrintRoomPresetDto) {
    return this.service.createPreset(dto);
  }

  @Patch('presets/:id')
  @ApiOperation({ summary: '출력실 프리셋 수정' })
  updatePreset(
    @Param('id') id: string,
    @Body() dto: UpdatePrintRoomPresetDto,
  ) {
    return this.service.updatePreset(id, dto);
  }

  @Delete('presets/:id')
  @ApiOperation({
    summary: '출력실 프리셋 비활성화 (실삭제 대신 isActive=false)',
  })
  deactivatePreset(@Param('id') id: string) {
    return this.service.deactivatePreset(id);
  }
}
