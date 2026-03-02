import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RecruitmentBidService } from '../services/recruitment-bid.service';
import { CreateRecruitmentBidDto } from '../dto';

@ApiTags('구인방 - 응찰')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recruitments')
export class RecruitmentBidController {
  constructor(private readonly bidService: RecruitmentBidService) {}

  @Post(':id/publish')
  @ApiOperation({ summary: '전속 모집 시작 (소속 작가에게 카톡 발송)' })
  async publishPrivate(
    @Param('id') id: string,
    @Body('privateDeadlineHours') hours: number,
    @Request() req: any,
  ) {
    return this.bidService.publishPrivate(id, req.user.clientId, hours || 24);
  }

  @Post(':id/go-public')
  @ApiOperation({ summary: '공개 전환 (전체 포토그래퍼에게 알림)' })
  async goPublic(@Param('id') id: string, @Request() req: any) {
    return this.bidService.goPublic(id, req.user.clientId);
  }

  @Post(':id/bids')
  @ApiOperation({ summary: '응찰' })
  async createBid(
    @Param('id') id: string,
    @Body() dto: CreateRecruitmentBidDto,
    @Request() req: any,
  ) {
    return this.bidService.createBid(id, req.user.clientId, dto);
  }

  @Get(':id/bids')
  @ApiOperation({ summary: '응찰자 목록' })
  async findBids(@Param('id') id: string) {
    return this.bidService.findBids(id);
  }

  @Post(':id/bids/:bidId/select')
  @ApiOperation({ summary: '작가 확정' })
  async selectBid(
    @Param('id') id: string,
    @Param('bidId') bidId: string,
    @Request() req: any,
  ) {
    return this.bidService.selectBid(id, bidId, req.user.clientId);
  }

  @Post(':id/bids/:bidId/reject')
  @ApiOperation({ summary: '응찰 거절' })
  async rejectBid(
    @Param('id') id: string,
    @Param('bidId') bidId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.bidService.rejectBid(id, bidId, req.user.clientId, reason);
  }
}
