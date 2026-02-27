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
import { ShootingBidService } from '../services/shooting-bid.service';
import { CreateBidDto, SelectBidDto, RejectBidDto } from '../dto';

@ApiTags('촬영 응찰')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shootings')
export class ShootingBidController {
  constructor(private readonly bidService: ShootingBidService) {}

  @Post(':id/publish')
  @ApiOperation({ summary: '촬영 공고 발행 (모집 시작)' })
  async publish(@Param('id') id: string, @Request() req: any) {
    return this.bidService.publish(id, req.user.id);
  }

  @Post(':id/bids')
  @ApiOperation({ summary: '촬영 응찰' })
  async createBid(
    @Param('id') id: string,
    @Body() dto: CreateBidDto,
    @Request() req: any,
  ) {
    return this.bidService.createBid(id, req.user.id, dto);
  }

  @Get(':id/bids')
  @ApiOperation({ summary: '응찰자 목록 조회' })
  async findBids(@Param('id') id: string) {
    return this.bidService.findBids(id);
  }

  @Post(':id/bids/:bidId/select')
  @ApiOperation({ summary: '작가 확정' })
  async selectBid(
    @Param('id') id: string,
    @Param('bidId') bidId: string,
    @Body() dto: SelectBidDto,
  ) {
    return this.bidService.selectBid(id, bidId, dto);
  }

  @Post(':id/bids/:bidId/reject')
  @ApiOperation({ summary: '작가 거절' })
  async rejectBid(
    @Param('id') id: string,
    @Param('bidId') bidId: string,
    @Body() dto: RejectBidDto,
  ) {
    return this.bidService.rejectBid(id, bidId, dto);
  }
}
