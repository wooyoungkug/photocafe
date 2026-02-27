import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { ShootingReviewService } from '../services/shooting-review.service';
import { SubmitReviewDto } from '../dto';

@ApiTags('촬영 리뷰')
@Controller()
export class ShootingReviewController {
  constructor(private readonly reviewService: ShootingReviewService) {}

  // --- 공개 엔드포인트 (토큰 기반) ---

  @Public()
  @Get('reviews/:token')
  @ApiOperation({ summary: '설문 페이지 조회 (공개)' })
  async findByToken(@Param('token') token: string) {
    return this.reviewService.findByToken(token);
  }

  @Public()
  @Post('reviews/:token')
  @ApiOperation({ summary: '설문 제출 (공개)' })
  async submitReview(
    @Param('token') token: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.reviewService.submitReview(token, dto);
  }

  // --- 인증 필요 엔드포인트 ---

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('shootings/:id/review')
  @ApiOperation({ summary: '촬영 리뷰 조회' })
  async findByShootingId(@Param('id') id: string) {
    return this.reviewService.findByShootingId(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('shootings/:id/review/send')
  @ApiOperation({ summary: '설문 이메일 발송' })
  async sendReviewRequest(@Param('id') id: string) {
    return this.reviewService.sendReviewRequest(id);
  }
}
