import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { MinStaffingService } from '../services/min-staffing.service';
import { CreateMinStaffingRuleDto, UpdateMinStaffingRuleDto } from '../dto';

@ApiTags('최소 근무인원')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('min-staffing-rules')
export class MinStaffingController {
  constructor(private readonly minStaffingService: MinStaffingService) {}

  @Get()
  @ApiOperation({ summary: '최소 근무인원 규칙 목록 조회' })
  async findAll() {
    return this.minStaffingService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '최소 근무인원 규칙 생성' })
  async create(@Body() dto: CreateMinStaffingRuleDto) {
    return this.minStaffingService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '최소 근무인원 규칙 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateMinStaffingRuleDto) {
    return this.minStaffingService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '최소 근무인원 규칙 삭제' })
  async remove(@Param('id') id: string) {
    return this.minStaffingService.remove(id);
  }
}
