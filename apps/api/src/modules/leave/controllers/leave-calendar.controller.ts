import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { LeaveCalendarService } from '../services/leave-calendar.service';
import { QueryLeaveCalendarDto } from '../dto';

@ApiTags('휴가 캘린더')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leave-calendar')
export class LeaveCalendarController {
  constructor(private readonly leaveCalendarService: LeaveCalendarService) {}

  @Get()
  @ApiOperation({ summary: '휴가 캘린더 조회 (월별)' })
  async getCalendar(@Query() query: QueryLeaveCalendarDto) {
    return this.leaveCalendarService.getCalendar(query);
  }
}
