import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SubmitReviewDto } from '../dto';
import { SHOOTING_STATUS } from '../constants/shooting.constants';
import { ShootingNotificationService } from './notification.service';
import { PhotographerService } from './photographer.service';
import { randomBytes } from 'crypto';

@Injectable()
export class ShootingReviewService {
  private readonly logger = new Logger(ShootingReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationService: ShootingNotificationService,
    private readonly photographerService: PhotographerService,
  ) {}

  /**
   * 설문 토큰으로 리뷰 조회 (공개 엔드포인트)
   */
  async findByToken(token: string) {
    const review = await this.prisma.shootingReview.findUnique({
      where: { reviewToken: token },
      include: {
        shooting: {
          select: {
            id: true,
            clientName: true,
            shootingType: true,
            venueName: true,
            shootingDate: true,
          },
        },
        staff: {
          select: { id: true, name: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('유효하지 않은 설문 링크입니다.');
    }

    return review;
  }

  /**
   * 리뷰 제출 (공개 엔드포인트)
   * - 토큰으로 리뷰 조회 후 점수 저장
   * - 작가 통계 업데이트 트리거
   */
  async submitReview(token: string, dto: SubmitReviewDto) {
    const review = await this.prisma.shootingReview.findUnique({
      where: { reviewToken: token },
    });

    if (!review) {
      throw new NotFoundException('유효하지 않은 설문 링크입니다.');
    }

    if (review.isCompleted) {
      throw new BadRequestException('이미 제출된 설문입니다.');
    }

    // 종합 점수 계산 (신뢰도, 친절도의 평균. 기술력은 선택)
    const scores = [dto.trustScore, dto.kindnessScore];
    if (dto.skillScore) {
      scores.push(dto.skillScore);
    }
    const overallScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    const updated = await this.prisma.shootingReview.update({
      where: { reviewToken: token },
      data: {
        trustScore: dto.trustScore,
        kindnessScore: dto.kindnessScore,
        skillScore: dto.skillScore,
        overallScore: Math.round(overallScore * 100) / 100,
        comment: dto.comment,
        reviewerName: dto.reviewerName,
        reviewerType: dto.reviewerType,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    // 작가 통계 업데이트 (비동기)
    this.photographerService
      .recalculateStats(review.staffId)
      .catch((err) => this.logger.error(`작가 통계 업데이트 실패: ${err.message}`));

    this.logger.log(`리뷰 제출 완료: reviewId=${review.id}, staffId=${review.staffId}`);
    return { message: '설문이 제출되었습니다. 감사합니다.', review: updated };
  }

  /**
   * 촬영 ID로 리뷰 조회
   */
  async findByShootingId(shootingId: string) {
    const review = await this.prisma.shootingReview.findUnique({
      where: { shootingId },
      include: {
        staff: {
          select: { id: true, name: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('해당 촬영의 리뷰가 없습니다.');
    }

    return review;
  }

  /**
   * 촬영 완료 시 설문 이메일 발송
   * - ShootingReview 레코드 생성 (미완료 상태)
   * - 고객 이메일로 설문 링크 발송
   */
  async sendReviewRequest(shootingId: string) {
    const shooting = await this.prisma.shootingSchedule.findUnique({
      where: { id: shootingId },
      include: {
        assignedStaff: {
          select: { id: true, name: true },
        },
      },
    });

    if (!shooting) {
      throw new NotFoundException('촬영 일정을 찾을 수 없습니다.');
    }

    if (shooting.status !== SHOOTING_STATUS.COMPLETED) {
      throw new BadRequestException('완료된 촬영에만 설문을 발송할 수 있습니다.');
    }

    if (!shooting.assignedStaffId) {
      throw new BadRequestException('담당 작가가 지정되지 않았습니다.');
    }

    if (!shooting.customerEmail) {
      throw new BadRequestException('고객 이메일이 등록되지 않았습니다.');
    }

    // 이미 리뷰 레코드가 있는지 확인
    const existingReview = await this.prisma.shootingReview.findUnique({
      where: { shootingId },
    });

    if (existingReview) {
      throw new BadRequestException('이미 설문이 발송되었습니다.');
    }

    // 고유 토큰 생성
    const reviewToken = randomBytes(32).toString('hex');

    // 리뷰 레코드 생성 (미완료 상태, 기본 점수 0)
    const review = await this.prisma.shootingReview.create({
      data: {
        shootingId,
        staffId: shooting.assignedStaffId,
        trustScore: 0,
        kindnessScore: 0,
        overallScore: 0,
        reviewToken,
        isCompleted: false,
      },
    });

    // 설문 이메일 발송 (비동기)
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';

    this.notificationService
      .sendReviewRequestEmail({
        customerEmail: shooting.customerEmail,
        customerName: shooting.clientName,
        shootingInfo: {
          shootingType: shooting.shootingType,
          venueName: shooting.venueName,
          shootingDate: shooting.shootingDate,
        },
        reviewToken,
        frontendUrl,
      })
      .catch((err) => this.logger.error(`설문 이메일 발송 실패: ${err.message}`));

    this.logger.log(`설문 발송: shooting=${shootingId}, token=${reviewToken}`);
    return { message: '설문 이메일이 발송되었습니다.', reviewId: review.id };
  }
}
