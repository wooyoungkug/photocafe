import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SubmitBidReviewDto } from '../dto/bid-review.dto';

@Injectable()
export class BidReviewService {
  private readonly logger = new Logger(BidReviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 토큰으로 리뷰 정보 조회 (고객용, 인증 불필요)
   * - 작가/촬영 기본 정보를 함께 반환해 고객이 누구를 평가하는지 확인 가능
   */
  async findByToken(token: string) {
    const review = await this.prisma.bidReview.findUnique({
      where: { reviewToken: token },
      include: {
        bid: {
          include: {
            bidder: {
              select: {
                clientName: true,
                profileImage: true,
              },
            },
            recruitment: {
              select: {
                title: true,
                shootingType: true,
                shootingDate: true,
                venueName: true,
                customerName: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('유효하지 않은 리뷰 링크입니다.');
    }

    return review;
  }

  /**
   * 토큰으로 리뷰 제출 (고객용, 인증 불필요)
   * - 1회만 제출 가능 (isCompleted=true 면 거부)
   */
  async submitByToken(token: string, dto: SubmitBidReviewDto) {
    const review = await this.prisma.bidReview.findUnique({
      where: { reviewToken: token },
    });

    if (!review) {
      throw new NotFoundException('유효하지 않은 리뷰 링크입니다.');
    }

    if (review.isCompleted) {
      throw new BadRequestException('이미 제출된 리뷰입니다.');
    }

    const updated = await this.prisma.bidReview.update({
      where: { id: review.id },
      data: {
        reviewerName: dto.reviewerName?.trim() || null,
        liked: dto.liked ?? true,
        rating: dto.rating ?? null,
        comment: dto.comment?.trim() || null,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `리뷰 제출 완료: bidId=${review.bidId}, bidder=${review.bidderId}, liked=${updated.liked}`,
    );

    return { success: true };
  }
}
