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

@Injectable()
export class RecruitmentBidService {
  private readonly logger = new Logger(RecruitmentBidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: RecruitmentNotificationService,
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

    // Advisory lock + 트랜잭션
    return this.prisma.$transaction(async (tx) => {
      // Advisory lock (recruitmentId 기반 해시)
      const lockKey = Buffer.from(recruitmentId).reduce(
        (acc, byte) => acc * 31 + byte,
        0,
      );
      await tx.$queryRawUnsafe(
        `SELECT pg_advisory_xact_lock(${lockKey & 0x7fffffff})`,
      );

      // 중복 응찰 확인
      const existing = await tx.recruitmentBid.findUnique({
        where: { recruitmentId_bidderId: { recruitmentId, bidderId } },
      });
      if (existing) {
        throw new ConflictException('이미 응찰한 구인입니다.');
      }

      // 최대 응찰자 수 확인
      const bidCount = await tx.recruitmentBid.count({
        where: { recruitmentId, status: RECRUITMENT_BID_STATUS.PENDING },
      });
      if (bidCount >= recruitment.maxBidders) {
        throw new BadRequestException('최대 응찰자 수를 초과했습니다.');
      }

      const bid = await tx.recruitmentBid.create({
        data: {
          recruitmentId,
          bidderId,
          message: dto.message,
          proposedBudget: dto.proposedBudget,
        },
        include: {
          bidder: { select: { clientName: true } },
        },
      });

      this.logger.log(
        `응찰: ${recruitmentId}, 작가: ${bidderId} (${bid.bidder.clientName})`,
      );

      return bid;
    });
  }

  /**
   * 응찰자 목록 조회
   */
  async findBids(recruitmentId: string) {
    return this.prisma.recruitmentBid.findMany({
      where: { recruitmentId },
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

    // 트랜잭션: 확정 + 나머지 거절 + 상태 변경
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
