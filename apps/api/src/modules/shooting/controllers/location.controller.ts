import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { LocationService } from '../services/location.service';
import { CreateLocationLogDto } from '../dto';

@ApiTags('촬영 위치')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shootings')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post(':id/location')
  @ApiOperation({ summary: '위치 체크인/체크아웃 기록' })
  async createLog(
    @Param('id') id: string,
    @Body() dto: CreateLocationLogDto,
    @Request() req: any,
  ) {
    return this.locationService.createLog(id, req.user.id, dto);
  }

  @Get(':id/location')
  @ApiOperation({ summary: '위치 로그 조회' })
  async findLogs(@Param('id') id: string) {
    return this.locationService.findLogs(id);
  }
}
