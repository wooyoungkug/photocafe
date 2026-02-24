import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CreatePageViewDto } from './dto/create-page-view.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Post('page-view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '페이지 방문 기록' })
  async createPageView(
    @Body() dto: CreatePageViewDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.analyticsService.createPageView(dto, req);
  }

  @Get('stats')
  @ApiOperation({ summary: '접속 통계 요약' })
  async getStats(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getStats(query);
  }

  @Get('top-pages')
  @ApiOperation({ summary: '인기 페이지 Top N' })
  async getTopPages(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTopPages(query);
  }

  @Get('os-stats')
  @ApiOperation({ summary: 'OS 분포' })
  async getOsStats(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOsStats(query);
  }

  @Get('geo-stats')
  @ApiOperation({ summary: '국내/해외 분포' })
  async getGeoStats(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getGeoStats(query);
  }

  @Get('trend')
  @ApiOperation({ summary: '일별 방문 추이' })
  async getTrend(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTrend(query);
  }
}
