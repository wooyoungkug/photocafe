import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { BidReviewService } from '../services/bid-review.service';
import { SubmitBidReviewDto } from '../dto/bid-review.dto';

@ApiTags('응찰 작가 리뷰 (고객용)')
@Controller()
export class BidReviewController {
  constructor(private readonly reviewService: BidReviewService) {}

  @Public()
  @Get('bid-reviews/:token')
  @ApiOperation({ summary: '리뷰 토큰으로 작가 정보 조회 (공개)' })
  async findByToken(@Param('token') token: string) {
    return this.reviewService.findByToken(token);
  }

  @Public()
  @Post('bid-reviews/:token')
  @ApiOperation({ summary: '리뷰 제출 (공개)' })
  async submitReview(
    @Param('token') token: string,
    @Body() dto: SubmitBidReviewDto,
  ) {
    return this.reviewService.submitByToken(token, dto);
  }
}
