import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PhotographerService } from '../services/photographer.service';
import { QueryPhotographerDto } from '../dto';

@ApiTags('촬영 작가')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('photographers')
export class PhotographerController {
  constructor(private readonly photographerService: PhotographerService) {}

  @Get()
  @ApiOperation({ summary: '작가 목록 조회 (신뢰도 포함)' })
  async findAll(@Query() query: QueryPhotographerDto) {
    return this.photographerService.findAll(query);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '작가 통계 상세 조회' })
  async findStats(@Param('id') id: string) {
    return this.photographerService.findStats(id);
  }

  @Post(':id/recalculate')
  @ApiOperation({ summary: '작가 신뢰도 재계산' })
  async recalculate(@Param('id') id: string) {
    return this.photographerService.recalculateStats(id);
  }
}
