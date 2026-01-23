import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ScheduleService } from '../services/schedule.service';
import { CreateScheduleDto, UpdateScheduleDto, QueryScheduleDto } from '../dto';

@ApiTags('일정 관리')
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '일정 생성' })
  create(@Body() dto: CreateScheduleDto, @Req() req: any) {
    const user = this.extractUser(req);
    return this.scheduleService.create(dto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '일정 목록 조회' })
  findAll(@Query() query: QueryScheduleDto, @Req() req: any) {
    const user = this.extractUser(req);
    return this.scheduleService.findAll(query, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '일정 상세 조회' })
  findOne(@Param('id') id: string, @Req() req: any) {
    const user = this.extractUser(req);
    return this.scheduleService.findOne(id, user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '일정 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto, @Req() req: any) {
    const user = this.extractUser(req);
    return this.scheduleService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '일정 삭제 (담당자, 부서장, 관리자만)' })
  delete(@Param('id') id: string, @Req() req: any) {
    const user = this.extractUser(req);
    return this.scheduleService.delete(id, user);
  }

  // 사용자 정보 추출 (임시 - 실제로는 JWT에서 추출)
  private extractUser(req: any) {
    return req.user || {
      id: 'staff-1',
      name: '관리자',
      departmentId: 'dept-1',
      departmentName: '관리팀',
      role: 'admin',
    };
  }
}
