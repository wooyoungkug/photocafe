import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateRecruitmentBidDto } from '../dto';
import {
  RECRUITMENT_STATUS,
  RECRUITMENT_BID_STATUS,
  RECRUITMENT_PHASE,
} from '../constants/recruitment.constants';
import { RecruitmentNotificationService } from './recruitment-notification.service';
import { ScheduleRecruitmentSyncService } from '@/modules/shooting/services/schedule-recruitment-sync.service';

@Injectable()
export class RecruitmentBidService {
  private readonly logger = new Logger(RecruitmentBidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: RecruitmentNotificationService,
    private readonly syncService: ScheduleRecruitmentSyncService,
  ) {}

  /**
   * 전속 모집 시작 (draft → private_recruiting)
   * - 소속 포토그래퍼에게 카톡 발송
   */
  async publishPrivate(
    recruitmentId: string,
    requesterId: string,
    privateDeadlineHours = 24,
  ) {
    const recruitment = await this.prisma.recruitment.findUnique({
      where: { id: recruitmentId },
      include: { client: { select: { clientName: true } } },
    });

    if (!recruitment) {
      throw new NotFoundException('구인 정보를 찾을 수 없습니다.');
    }

    if (recruitment.status !== RECRUITMENT_STATUS.DRAFT) {
      throw new BadRequestException('초안(draft) 상태에서만 모집을 시작할 수 있습니다.');
    }

    const privateDeadline = new Date();
    privateDeadline.setHours(privateDeadline.getHours() + privateDeadlineHours);

    const updated = await this.prisma.recruitment.update({
      where: { id: recruitmentId },
      data: {
        status: RECRUITMENT_STATUS.PRIVATE_RECRUITING,
        recruitmentPhase: RECRUITMENT_PHASE.PRIVATE,
        privateDeadline,
      },
      include: { client: { select: { clientName: true } } },
    });

    // 비동기: 소속 포토그래퍼에게 카톡 발송
    this.notificationService
      .sendPrivateRecruitingNotification(recruitment.clientId, {
        id: recruitment.id,
        title: recruitment.title,
        shootingType: recruitment.shootingType,
        shootingDate: recruitment.shootingDate,
        shootingTime: recruitment.shootingTime || undefined,
        venueName: recruitment.venueName,
        venueAddress: recruitment.venueAddress || undefined,
        budget: recruitment.budget || undefined,
        clientName: recruitment.client.clientName,
      })
      .catch((err) => this.logger.error(`전속 모집 알림 실패: ${err.message}`));

    // 일정관리 상태 동기화 (private_recruiting → recruiting)
    this.syncService
      .syncStatusChange('recruitment', recruitmentId, RECRUITMENT_STATUS.PRIVATE_RECRUITING)
      .catch((err) =>
        this.logger.warn(`PublishPrivate status sync failed: ${err.message}`),
      );

    this.logger.log(
      `전속 모집 시작: ${recruitmentId}, 마감: ${privateDeadline.toISOString()}`,
    );

    return updated;
  }

  /**
   * 공개 전환 (private_recruiting → public_recruiting)
   * - 전체 포토그래퍼에게 카톡 발송
   */
  async goPublic(recruitmentId: string, requesterId: string) {
    const recruitment = await this.prisma.recruitment.findUnique({
      where: { id: recruitmentId },
      include: { client: { select: { clientName: true } } },
    });

    if (!recruitment) {
      throw new NotFoundException('구인 정보를 찾을 수 없습니다.');
    }

    if (
      recruitment.status !== RECRUITMENT_STATUS.PRIVATE_RECRUITING &&
      recruitment.status !== RECRUITMENT_STATUS.DRAFT
    ) {
      throw new BadRequestException('전속 모집 또는 초안 상태에서만 공개 전환할 수 있습니다.');
    }

    const updated = await this.prisma.recruitment.update({
      where: { id: recruitmentId },
      data: {
        status: RECRUITMENT_STATUS.PUBLIC_RECRUITING,
        recruitmentPhase: RECRUITMENT_PHASE.PUBLIC,
      },
    });

    // 비동기: 지역우선 공개 구인 알림 (희망지역 기반 100명 타겟팅)
    this.notificationService
      .sendPublicRecruitingNotificationWithRegionPriority({
        id: recruitment.id,
        title: recruitment.title,
        shootingType: recruitment.shootingType,
        shootingDate: recruitment.shootingDate,
        shootingTime: recruitment.shootingTime || undefined,
        duration: recruitment.duration || undefined,
        venueName: recruitment.venueName,
        venueAddress: recruitment.venueAddress || undefined,
        budget: recruitment.budget || undefined,
        clientName: recruitment.client.clientName,
      })
      .catch((err) => this.logger.error(`공개 모집 알림 실패: ${err.message}`));

    // 일정관리 상태 동기화 (public_recruiting → recruiting)
    this.syncService
      .syncStatusChange('recruitment', recruitmentId, RECRUITMENT_STATUS.PUBLIC_RECRUITING)
      .catch((err) =>
        this.logger.warn(`GoPublic status sync failed: ${err.message}`),
      );

    this.logger.log(`공개 전환: ${recruitmentId}`);
    return updated;
  }

  /**
   * 응찰 처리 (PostgreSQL advisory lock)
   */
  async createBid(
    recruitmentId: string,
    bidderId: string,
    dto: CreateRecruitmentBidDto,
  ) {
    const recruitment = await this.prisma.recruitment.findUnique({
      where: { id: recruitmentId },
    });

    if (!recruitment) {
      throw new NotFoundException('구인 정보를 찾을 수 없습니다.');
    }

    const validStatuses = [
      RECRUITMENT_STATUS.PRIVATE_RECRUITING,
      RECRUITMENT_STATUS.PUBLIC_RECRUITING,
    ];
    if (!validStatuses.includes(recruitment.status as any)) {
      throw new BadRequestException('모집 중인 구인에만 응찰할 수 있습니다.');
    }

    // 본인 구인에 응찰 불가
    if (recruitment.clientId === bidderId || recruitment.createdBy === bidderId) {
      throw new BadRequestException('본인이 등록한 구인에는 응찰할 수 없습니다.');
    }

    // 촬영일(예식일)이 지난 구인에는 응찰 불가 (날짜 단위 비교, 당일은 허용)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shootingDay = new Date(recruitment.shootingDate);
    shootingDay.setHours(0, 0, 0, 0);
    if (shootingDay.getTime() < today.getTime()) {
      throw new BadRequestException('촬영일이 지난 구인에는 응찰할 수 없습니다.');
    }

    // 인원 옵션 검증
    const allowedSizes = recruitment.crewSizes ?? [];
    let crewSize = dto.crewSize;
    if (allowedSizes.length > 0) {
      if (crewSize) {
        if (!allowedSizes.includes(crewSize)) {
          throw new BadRequestException(
            '선택한 촬영 인원 옵션이 모집 조건에 포함되지 않습니다.',
          );
        }
      } else if (allowedSizes.length === 1) {
        crewSize = allowedSizes[0];
      } else {
        throw new BadRequestException('촬영 인원 옵션(1인/2인)을 선택해주세요.');
      }
    }

    // Advisory lock + 트랜잭션
    return this.prisma.$transaction(async (tx) => {
      // Advisory lock (recruitmentId 기반 해시)
      const lockKey = Buffer.from(recruitmentId).reduce(
        (acc, byte) => acc * 31 + byte,
        0,
      );
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(${lockKey & 0x7fffffff})`,
      );

      // 중복 응찰 확인 (취소된 경우 재응찰 허용)
      const existing = await tx.recruitmentBid.findUnique({
        where: { recruitmentId_bidderId: { recruitmentId, bidderId } },
      });
      if (existing && existing.status !== RECRUITMENT_BID_STATUS.CANCELLED) {
        throw new ConflictException('이미 응찰한 구인입니다.');
      }

      // 최대 응찰자 수 확인
      const bidCount = await tx.recruitmentBid.count({
        where: { recruitmentId, status: RECRUITMENT_BID_STATUS.PENDING },
      });
      if (bidCount >= recruitment.maxBidders) {
        throw new BadRequestException('최대 응찰자 수를 초과했습니다.');
      }

      // 취소된 이전 응찰이 있으면 재활성화, 없으면 신규 생성
      const bid = existing
        ? await tx.recruitmentBid.update({
            where: { id: existing.id },
            data: {
              message: dto.message,
              proposedBudget: dto.proposedBudget,
              crewSize,
              status: RECRUITMENT_BID_STATUS.PENDING,
              bidAt: new Date(),
            },
            include: { bidder: { select: { clientName: true } } },
          })
        : await tx.recruitmentBid.create({
            data: {
              recruitmentId,
              bidderId,
              message: dto.message,
              proposedBudget: dto.proposedBudget,
              crewSize,
            },
            include: { bidder: { select: { clientName: true } } },
          });

      this.logger.log(
        `응찰: ${recruitmentId}, 작가: ${bidderId} (${bid.bidder.clientName})`,
      );

      return bid;
    });
  }

  /**
   * 응찰자 목록 조회 (각 응찰자별 누적 응찰 통계 포함)
   */
  async findBids(recruitmentId: string) {
    const bids = await this.prisma.recruitmentBid.findMany({
      where: { recruitmentId, status: { not: RECRUITMENT_BID_STATUS.CANCELLED } },
      include: {
        bidder: {
          select: {
            clientName: true,
            profileImage: true,
            phone: true,
            mobile: true,
            email: true,
          },
        },
      },
      orderBy: { bidAt: 'asc' },
    });

    if (bids.length === 0) return bids;

    // 누적 응찰 통계 + 좋아요 + 본 응찰 리뷰토큰 1~3회 쿼리로 일괄 조회 (N+1 방지)
    const bidderIds = Array.from(new Set(bids.map((b) => b.bidderId)));
    const bidIds = bids.map((b) => b.id);

    const [bidAggregates, likedAggregates, reviews] = await Promise.all([
      this.prisma.recruitmentBid.groupBy({
        by: ['bidderId', 'status'],
        where: { bidderId: { in: bidderIds } },
        _count: { id: true },
      }),
      this.prisma.bidReview.groupBy({
        by: ['bidderId'],
        where: { bidderId: { in: bidderIds }, isCompleted: true, liked: true },
        _count: { id: true },
      }),
      this.prisma.bidReview.findMany({
        where: { bidId: { in: bidIds } },
        select: {
          bidId: true,
          reviewToken: true,
          isCompleted: true,
          liked: true,
          rating: true,
          comment: true,
          reviewerName: true,
          completedAt: true,
        },
      }),
    ]);

    const statsMap = new Map<
      string,
      {
        totalBids: number;
        selectedCount: number;
        pendingCount: number;
        rejectedCount: number;
        cancelledCount: number;
        likedCount: number;
        tier: string;
      }
    >();
    for (const id of bidderIds) {
      statsMap.set(id, {
        totalBids: 0,
        selectedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        cancelledCount: 0,
        likedCount: 0,
        tier: 'NEW',
      });
    }
    for (const row of bidAggregates) {
      const s = statsMap.get(row.bidderId);
      if (!s) continue;
      if (row.status !== RECRUITMENT_BID_STATUS.CANCELLED) {
        s.totalBids += row._count.id;
      }
      if (row.status === RECRUITMENT_BID_STATUS.SELECTED) {
        s.selectedCount += row._count.id;
      } else if (row.status === RECRUITMENT_BID_STATUS.PENDING) {
        s.pendingCount += row._count.id;
      } else if (row.status === RECRUITMENT_BID_STATUS.REJECTED) {
        s.rejectedCount += row._count.id;
      } else if (row.status === RECRUITMENT_BID_STATUS.CANCELLED) {
        s.cancelledCount += row._count.id;
      }
    }
    for (const row of likedAggregates) {
      const s = statsMap.get(row.bidderId);
      if (!s) continue;
      s.likedCount = row._count.id;
    }
    // 등급 산정
    for (const s of statsMap.values()) {
      if (s.selectedCount >= 30) s.tier = 'PLATINUM';
      else if (s.selectedCount >= 10) s.tier = 'GOLD';
      else if (s.selectedCount >= 3) s.tier = 'SILVER';
      else if (s.selectedCount >= 1) s.tier = 'BRONZE';
      else s.tier = 'NEW';
    }
    const reviewByBidId = new Map(reviews.map((r) => [r.bidId, r]));

    return bids.map((b) => ({
      ...b,
      bidderStats: statsMap.get(b.bidderId) ?? {
        totalBids: 0,
        selectedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        cancelledCount: 0,
        likedCount: 0,
        tier: 'NEW',
      },
      review: reviewByBidId.get(b.id) ?? null,
    }));
  }

  /**
   * 내 응찰 통계 (응찰자 본인용)
   * - 누적 응찰 / 선택 / 좋아요 / 최근 리뷰
   */
  async getMyBidderStats(bidderId: string) {
    const [bidAggregates, likedAggregate, recentReviews, completedReviewsCount] =
      await Promise.all([
        this.prisma.recruitmentBid.groupBy({
          by: ['status'],
          where: { bidderId },
          _count: { id: true },
        }),
        this.prisma.bidReview.count({
          where: { bidderId, isCompleted: true, liked: true },
        }),
        this.prisma.bidReview.findMany({
          where: { bidderId, isCompleted: true },
          orderBy: { completedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            liked: true,
            rating: true,
            comment: true,
            reviewerName: true,
            completedAt: true,
          },
        }),
        this.prisma.bidReview.count({
          where: { bidderId, isCompleted: true },
        }),
      ]);

    let totalBids = 0;
    let selectedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    for (const row of bidAggregates) {
      totalBids += row._count.id;
      if (row.status === RECRUITMENT_BID_STATUS.SELECTED) {
        selectedCount = row._count.id;
      } else if (row.status === RECRUITMENT_BID_STATUS.PENDING) {
        pendingCount = row._count.id;
      } else if (row.status === RECRUITMENT_BID_STATUS.REJECTED) {
        rejectedCount = row._count.id;
      }
    }

    const ratingAgg = await this.prisma.bidReview.aggregate({
      where: { bidderId, isCompleted: true, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // 등급 산정 (selectedCount 기준)
    let tier = 'NEW';
    if (selectedCount >= 30) tier = 'PLATINUM';
    else if (selectedCount >= 10) tier = 'GOLD';
    else if (selectedCount >= 3) tier = 'SILVER';
    else if (selectedCount >= 1) tier = 'BRONZE';

    return {
      totalBids,
      selectedCount,
      pendingCount,
      rejectedCount,
      likedCount: likedAggregate,
      completedReviewsCount,
      avgRating: ratingAgg._avg.rating ?? null,
      ratingCount: ratingAgg._count.rating,
      acceptanceRate:
        totalBids > 0 ? Math.round((selectedCount / totalBids) * 100) : 0,
      tier,
      recentReviews,
    };
  }

  /**
   * 내가 응찰한 목록 조회 (응찰자 본인)
   */
  async findMyBids(bidderId: string) {
    return this.prisma.recruitmentBid.findMany({
      where: { bidderId },
      include: {
        recruitment: {
          select: {
            id: true,
            title: true,
            status: true,
            shootingDate: true,
            shootingTime: true,
            venueName: true,
            budget: true,
            shootingType: true,
          },
        },
      },
      orderBy: { bidAt: 'desc' },
    });
  }

  /**
   * 내 응찰 취소 (pending 상태만 가능)
   */
  async cancelMyBid(recruitmentId: string, bidderId: string) {
    const bid = await this.prisma.recruitmentBid.findUnique({
      where: { recruitmentId_bidderId: { recruitmentId, bidderId } },
    });

    if (!bid) {
      throw new NotFoundException('응찰 정보를 찾을 수 없습니다.');
    }

    if (bid.status !== RECRUITMENT_BID_STATUS.PENDING) {
      throw new BadRequestException('대기 상태의 응찰만 취소할 수 있습니다.');
    }

    await this.prisma.recruitmentBid.update({
      where: { id: bid.id },
      data: { status: RECRUITMENT_BID_STATUS.CANCELLED },
    });

    this.logger.log(`응찰 취소: ${recruitmentId}, 작가: ${bidderId}`);

    return { success: true };
  }

  /**
   * 작가 확정
   */
  async selectBid(
    recruitmentId: string,
    bidId: string,
    requesterId: string,
  ) {
    const recruitment = await this.prisma.recruitment.findUnique({
      where: { id: recruitmentId },
      include: { client: { select: { clientName: true } } },
    });

    if (!recruitment) {
      throw new NotFoundException('구인 정보를 찾을 수 없습니다.');
    }

    const bid = await this.prisma.recruitmentBid.findUnique({
      where: { id: bidId },
      include: { bidder: { select: { clientName: true } } },
    });

    if (!bid || bid.recruitmentId !== recruitmentId) {
      throw new NotFoundException('응찰 정보를 찾을 수 없습니다.');
    }

    if (bid.status !== RECRUITMENT_BID_STATUS.PENDING) {
      throw new BadRequestException('대기 상태의 응찰만 확정할 수 있습니다.');
    }

    // 트랜잭션: 확정 + 나머지 거절 + 상태 변경 + 리뷰 토큰 생성
    const result = await this.prisma.$transaction(async (tx) => {
      // 선택된 응찰 확정
      const selectedBid = await tx.recruitmentBid.update({
        where: { id: bidId },
        data: { status: RECRUITMENT_BID_STATUS.SELECTED },
      });

      // 나머지 응찰 거절
      await tx.recruitmentBid.updateMany({
        where: {
          recruitmentId,
          id: { not: bidId },
          status: RECRUITMENT_BID_STATUS.PENDING,
        },
        data: { status: RECRUITMENT_BID_STATUS.REJECTED },
      });

      // 구인 상태 → filled
      const updatedRecruitment = await tx.recruitment.update({
        where: { id: recruitmentId },
        data: { status: RECRUITMENT_STATUS.FILLED },
      });

      // 고객용 리뷰 토큰 자동 발급 (이미 있으면 skip)
      const existingReview = await tx.bidReview.findUnique({
        where: { bidId },
      });
      if (!existingReview) {
        await tx.bidReview.create({
          data: {
            bidId,
            recruitmentId,
            bidderId: bid.bidderId,
          },
        });
      }

      return { selectedBid, updatedRecruitment };
    });

    // 비동기: 확정 알림
    this.notificationService
      .sendSelectionNotification(bid.bidderId, {
        id: recruitment.id,
        title: recruitment.title,
        shootingType: recruitment.shootingType,
        shootingDate: recruitment.shootingDate,
        shootingTime: recruitment.shootingTime || undefined,
        venueName: recruitment.venueName,
        venueAddress: recruitment.venueAddress || undefined,
        budget: recruitment.budget || undefined,
        clientName: recruitment.client.clientName,
      })
      .catch((err) => this.logger.error(`확정 알림 실패: ${err.message}`));

    // 비동기: 거절 작가들에게 알림
    const rejectedBids = await this.prisma.recruitmentBid.findMany({
      where: { recruitmentId, status: RECRUITMENT_BID_STATUS.REJECTED },
    });
    for (const rb of rejectedBids) {
      this.notificationService
        .sendRejectionNotification(rb.bidderId, {
          id: recruitment.id,
          title: recruitment.title,
          shootingType: recruitment.shootingType,
          shootingDate: recruitment.shootingDate,
          shootingTime: recruitment.shootingTime || undefined,
          venueName: recruitment.venueName,
          venueAddress: recruitment.venueAddress || undefined,
          budget: recruitment.budget || undefined,
          clientName: recruitment.client.clientName,
        })
        .catch((err) => this.logger.error(`거절 알림 실패: ${err.message}`));
    }

    // 일정관리 연동: 외부 작가 확정 → SS status=confirmed + assignedClientId 설정
    this.syncService
      .syncBidSelection(recruitmentId, bid.bidderId)
      .catch((err) =>
        this.logger.warn(`Bid selection sync failed: ${err.message}`),
      );

    this.logger.log(
      `작가 확정: ${recruitmentId}, 작가: ${bid.bidderId} (${bid.bidder.clientName})`,
    );

    return result;
  }

  /**
   * 응찰 거절
   */
  async rejectBid(
    recruitmentId: string,
    bidId: string,
    requesterId: string,
    reason?: string,
  ) {
    const bid = await this.prisma.recruitmentBid.findUnique({
      where: { id: bidId },
    });

    if (!bid || bid.recruitmentId !== recruitmentId) {
      throw new NotFoundException('응찰 정보를 찾을 수 없습니다.');
    }

    if (bid.status !== RECRUITMENT_BID_STATUS.PENDING) {
      throw new BadRequestException('대기 상태의 응찰만 거절할 수 있습니다.');
    }

    const updated = await this.prisma.recruitmentBid.update({
      where: { id: bidId },
      data: { status: RECRUITMENT_BID_STATUS.REJECTED },
    });

    const recruitment = await this.prisma.recruitment.findUnique({
      where: { id: recruitmentId },
      include: { client: { select: { clientName: true } } },
    });

    if (recruitment) {
      this.notificationService
        .sendRejectionNotification(bid.bidderId, {
          id: recruitment.id,
          title: recruitment.title,
          shootingType: recruitment.shootingType,
          shootingDate: recruitment.shootingDate,
          shootingTime: recruitment.shootingTime || undefined,
          venueName: recruitment.venueName,
          venueAddress: recruitment.venueAddress || undefined,
          budget: recruitment.budget || undefined,
          clientName: recruitment.client.clientName,
        }, reason)
        .catch((err) => this.logger.error(`거절 알림 실패: ${err.message}`));
    }

    return updated;
  }
}
