import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { LeaveTypeService } from '../services/leave-type.service';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from '../dto';

@ApiTags('휴가 유형')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leave-types')
export class LeaveTypeController {
  constructor(private readonly leaveTypeService: LeaveTypeService) {}

  @Get()
  @ApiOperation({ summary: '휴가 유형 목록 조회' })
  async findAll() {
    return this.leaveTypeService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '휴가 유형 생성' })
  async create(@Body() dto: CreateLeaveTypeDto) {
    return this.leaveTypeService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '휴가 유형 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateLeaveTypeDto) {
    return this.leaveTypeService.update(id, dto);
  }
}
