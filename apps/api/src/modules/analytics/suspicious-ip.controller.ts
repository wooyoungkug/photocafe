import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffOnlyGuard } from '@/common/guards/staff-only.guard';
import { SuspiciousIpService } from './suspicious-ip.service';
import {
  CreateSuspiciousIpDto,
  UpdateSuspiciousIpDto,
  SuspiciousIpQueryDto,
} from './dto/suspicious-ip.dto';

@ApiTags('suspicious-ip')
@ApiBearerAuth()
@UseGuards(StaffOnlyGuard)
@Controller('analytics/suspicious-ips')
export class SuspiciousIpController {
  constructor(private readonly suspiciousIpService: SuspiciousIpService) {}

  @Get()
  @ApiOperation({ summary: '의심 IP 목록 조회' })
  async findAll(@Query() query: SuspiciousIpQueryDto) {
    return this.suspiciousIpService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: '의심 IP 등록' })
  async create(@Body() dto: CreateSuspiciousIpDto) {
    return this.suspiciousIpService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '의심 IP 수정 (조치 변경, 메모 등)' })
  async update(@Param('id') id: string, @Body() dto: UpdateSuspiciousIpDto) {
    return this.suspiciousIpService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '의심 IP 삭제' })
  async remove(@Param('id') id: string) {
    await this.suspiciousIpService.remove(id);
  }
}
