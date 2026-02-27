import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { QueryPhotographerDto } from '../dto';
import {
  RELIABILITY_WEIGHTS,
  GRADE_THRESHOLDS,
  PHOTOGRAPHER_GRADE,
  SHOOTING_STATUS,
} from '../constants/shooting.constants';

@Injectable()
export class PhotographerService {
  private readonly logger = new Logger(PhotographerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 작가 목록 조회 (신뢰도 포함)
   */
  async findAll(query: QueryPhotographerDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PhotographerStatsWhereInput = {};

    // 등급 필터
    if (query.grade) {
      where.grade = query.grade;
    }

    // 검색어 필터 (작가명)
    if (query.search) {
      where.staff = {
        name: { contains: query.search, mode: 'insensitive' },
      };
    }

    // 정렬
    const sortBy = query.sortBy || 'reliabilityIndex';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: Prisma.PhotographerStatsOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      this.prisma.photographerStats.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          staff: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.photographerStats.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 작가 통계 상세 조회
   */
  async findStats(staffId: string) {
    const stats = await this.prisma.photographerStats.findUnique({
      where: { staffId },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
      },
    });

    if (!stats) {
      throw new NotFoundException('작가 통계를 찾을 수 없습니다.');
    }

    // 최근 리뷰 목록도 함께 조회
    const recentReviews = await this.prisma.shootingReview.findMany({
      where: {
        staffId,
        isCompleted: true,
      },
      include: {
        shooting: {
          select: {
            clientName: true,
            shootingType: true,
            shootingDate: true,
            venueName: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    return {
      ...stats,
      recentReviews,
    };
  }

  /**
   * 작가 신뢰도 재계산
   *
   * RI = (0.40 x 고객만족도) + (0.25 x 정시도착률) + (0.20 x 완수율) + (0.15 x 경력가중치)
   *
   * - 고객만족도: 평균 종합점수 / 5 * 100
   * - 정시도착률: (정시 도착 건수 / 총 도착 기록 건수) * 100
   * - 완수율: (완료 건수 / 배정 건수) * 100
   * - 경력가중치: min(총 촬영 건수 / 100, 1) * 100
   */
  async recalculateStats(staffId: string) {
    // 1. 완료된 리뷰 통계
    const reviews = await this.prisma.shootingReview.findMany({
      where: {
        staffId,
        isCompleted: true,
      },
      select: {
        trustScore: true,
        kindnessScore: true,
        skillScore: true,
        overallScore: true,
      },
    });

    // 2. 촬영 통계
    const totalShootings = await this.prisma.shootingSchedule.count({
      where: { assignedStaffId: staffId },
    });

    const completedCount = await this.prisma.shootingSchedule.count({
      where: {
        assignedStaffId: staffId,
        status: SHOOTING_STATUS.COMPLETED,
      },
    });

    // 3. 정시 도착 통계 (arrival 로그에서 distance <= ARRIVAL_RADIUS_METERS인 건)
    const arrivalLogs = await this.prisma.locationLog.findMany({
      where: {
        staffId,
        type: 'arrival',
      },
      select: { distance: true },
    });

    const totalArrivals = arrivalLogs.length;
    const onTimeArrivals = arrivalLogs.filter(
      (log) => log.distance !== null && log.distance <= 200,
    ).length;

    // 4. 지연 카운트 (도착 거리 > 200m)
    const lateCount = arrivalLogs.filter(
      (log) => log.distance !== null && log.distance > 200,
    ).length;

    // 5. 평균 점수 계산
    const reviewCount = reviews.length;
    const avgTrustScore = reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.trustScore, 0) / reviewCount
      : 0;
    const avgKindnessScore = reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.kindnessScore, 0) / reviewCount
      : 0;
    const avgOverallScore = reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.overallScore, 0) / reviewCount
      : 0;

    // 6. 신뢰도 지수 계산
    const customerSatisfaction = reviewCount > 0 ? (avgOverallScore / 5) * 100 : 0;
    const onTimeRate = totalArrivals > 0 ? (onTimeArrivals / totalArrivals) * 100 : 0;
    const completionRate = totalShootings > 0 ? (completedCount / totalShootings) * 100 : 0;
    const experienceWeight = Math.min(totalShootings / 100, 1) * 100;

    const reliabilityIndex =
      RELIABILITY_WEIGHTS.CUSTOMER_SATISFACTION * customerSatisfaction +
      RELIABILITY_WEIGHTS.ON_TIME_RATE * onTimeRate +
      RELIABILITY_WEIGHTS.COMPLETION_RATE * completionRate +
      RELIABILITY_WEIGHTS.EXPERIENCE * experienceWeight;

    // 7. 등급 산출
    const grade = this.calculateGrade(reliabilityIndex, totalShootings);

    // 8. 통계 업데이트 (upsert)
    const stats = await this.prisma.photographerStats.upsert({
      where: { staffId },
      create: {
        staffId,
        totalShootings,
        completedCount,
        avgTrustScore: Math.round(avgTrustScore * 100) / 100,
        avgKindnessScore: Math.round(avgKindnessScore * 100) / 100,
        avgOverallScore: Math.round(avgOverallScore * 100) / 100,
        onTimeRate: Math.round((onTimeRate / 100) * 100) / 100, // 0~1 범위로 저장
        lateCount,
        reliabilityIndex: Math.round(reliabilityIndex * 100) / 100,
        grade,
      },
      update: {
        totalShootings,
        completedCount,
        avgTrustScore: Math.round(avgTrustScore * 100) / 100,
        avgKindnessScore: Math.round(avgKindnessScore * 100) / 100,
        avgOverallScore: Math.round(avgOverallScore * 100) / 100,
        onTimeRate: Math.round((onTimeRate / 100) * 100) / 100,
        lateCount,
        reliabilityIndex: Math.round(reliabilityIndex * 100) / 100,
        grade,
      },
    });

    this.logger.log(
      `작가 통계 재계산: staffId=${staffId}, RI=${reliabilityIndex.toFixed(2)}, grade=${grade}`,
    );

    return stats;
  }

  /**
   * 등급 산출
   */
  private calculateGrade(reliabilityIndex: number, totalShootings: number): string {
    // 최소 촬영 건수 미만이면 NEW
    if (totalShootings < GRADE_THRESHOLDS.NEW_MIN_SHOOTINGS) {
      return PHOTOGRAPHER_GRADE.NEW;
    }

    if (reliabilityIndex >= GRADE_THRESHOLDS.PLATINUM) {
      return PHOTOGRAPHER_GRADE.PLATINUM;
    }
    if (reliabilityIndex >= GRADE_THRESHOLDS.GOLD) {
      return PHOTOGRAPHER_GRADE.GOLD;
    }
    if (reliabilityIndex >= GRADE_THRESHOLDS.SILVER) {
      return PHOTOGRAPHER_GRADE.SILVER;
    }
    if (reliabilityIndex >= GRADE_THRESHOLDS.BRONZE) {
      return PHOTOGRAPHER_GRADE.BRONZE;
    }

    return PHOTOGRAPHER_GRADE.NEW;
  }
}
