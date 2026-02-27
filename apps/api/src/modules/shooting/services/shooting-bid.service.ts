import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateBidDto, SelectBidDto, RejectBidDto } from '../dto';
import {
  SHOOTING_STATUS,
  BID_STATUS,
} from '../constants/shooting.constants';
import { ShootingNotificationService } from './notification.service';

@Injectable()
export class ShootingBidService {
  private readonly logger = new Logger(ShootingBidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: ShootingNotificationService,
  ) {}

  /**
   * 촬영 공고 발행
   * - 상태를 recruiting으로 변경
   * - 모든 촬영 가능 작가에게 이메일 발송
   */
  async publish(shootingId: string, userId: string) {
    const shooting = await this.prisma.shootingSchedule.findUnique({
      where: { id: shootingId },
    });

    if (!shooting) {
      throw new NotFoundException('촬영 일정을 찾을 수 없습니다.');
    }

    if (shooting.status !== SHOOTING_STATUS.DRAFT) {
      throw new BadRequestException('초안(draft) 상태에서만 공고를 발행할 수 있습니다.');
    }

    // 상태 변경
    const updated = await this.prisma.shootingSchedule.update({
      where: { id: shootingId },
      data: { status: SHOOTING_STATUS.RECRUITING },
    });

    // 촬영 가능 작가 목록 조회 (isActive, 작가 역할)
    const photographers = await this.prisma.staff.findMany({
      where: {
        isActive: true,
        email: { not: null },
      },
      select: { email: true },
    });

    const emails = photographers
      .map((s) => s.email)
      .filter((e): e is string => !!e);

    // 비동기 이메일 발송 (응답을 대기하지 않음)
    if (emails.length > 0) {
      this.notificationService
        .sendRecruitingNotification({
          staffEmails: emails,
          shootingInfo: {
            clientName: shooting.clientName,
            shootingType: shooting.shootingType,
            venueName: shooting.venueName,
            venueAddress: shooting.venueAddress,
            shootingDate: shooting.shootingDate,
            notes: shooting.notes || undefined,
          },
          shootingId,
        })
        .catch((err) => this.logger.error(`공고 이메일 발송 실패: ${err.message}`));
    }

    this.logger.log(`공고 발행: ${shootingId}, 대상 작가 ${emails.length}명`);
    return updated;
  }

  /**
   * 응찰 처리
   * - PostgreSQL advisory lock으로 동시성 제어
   * - 최대 응찰자 수 검증
   * - 중복 응찰 방지
   */
  async createBid(shootingId: string, staffId: string, dto: CreateBidDto) {
    const shooting = await this.prisma.shootingSchedule.findUnique({
      where: { id: shootingId },
    });

    if (!shooting) {
      throw new NotFoundException('촬영 일정을 찾을 수 없습니다.');
    }

    if (![SHOOTING_STATUS.RECRUITING, SHOOTING_STATUS.BIDDING].includes(shooting.status as any)) {
      throw new BadRequestException('모집 중인 촬영에만 응찰할 수 있습니다.');
    }

    // advisory lock 키: shootingId hash
    const lockKey = this.hashStringToInt(shootingId);

    return this.prisma.$transaction(async (tx) => {
      // PostgreSQL advisory lock 획득
      await tx.$queryRawUnsafe(`SELECT pg_advisory_xact_lock(${lockKey})`);

      // 중복 응찰 확인
      const existingBid = await tx.shootingBid.findUnique({
        where: {
          shootingId_staffId: { shootingId, staffId },
        },
      });

      if (existingBid) {
        throw new BadRequestException('이미 응찰한 촬영입니다.');
      }

      // 현재 응찰 수 확인
      const currentBidCount = await tx.shootingBid.count({
        where: { shootingId },
      });

      if (currentBidCount >= shooting.maxBidders) {
        throw new BadRequestException(
          `최대 응찰자 수(${shooting.maxBidders}명)를 초과했습니다.`,
        );
      }

      // 응찰 생성
      const bid = await tx.shootingBid.create({
        data: {
          shootingId,
          staffId,
          status: BID_STATUS.PENDING,
          message: dto.message,
        },
        include: {
          staff: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 상태가 recruiting이면 bidding으로 변경
      if (shooting.status === SHOOTING_STATUS.RECRUITING) {
        await tx.shootingSchedule.update({
          where: { id: shootingId },
          data: { status: SHOOTING_STATUS.BIDDING },
        });
      }

      this.logger.log(`응찰 완료: shooting=${shootingId}, staff=${staffId}`);
      return bid;
    });
  }

  /**
   * 응찰자 목록 조회
   */
  async findBids(shootingId: string) {
    const shooting = await this.prisma.shootingSchedule.findUnique({
      where: { id: shootingId },
    });

    if (!shooting) {
      throw new NotFoundException('촬영 일정을 찾을 수 없습니다.');
    }

    const bids = await this.prisma.shootingBid.findMany({
      where: { shootingId },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { bidAt: 'asc' },
    });

    // 각 응찰자의 통계 정보도 함께 조회
    const staffIds = bids.map((b) => b.staffId);
    const stats = await this.prisma.photographerStats.findMany({
      where: { staffId: { in: staffIds } },
    });

    const statsMap = new Map(stats.map((s) => [s.staffId, s]));

    return bids.map((bid) => ({
      ...bid,
      photographerStats: statsMap.get(bid.staffId) || null,
    }));
  }

  /**
   * 작가 확정
   * - 선택된 작가를 confirmed로 변경
   * - 나머지 응찰자를 rejected로 변경
   * - 확정 이메일 발송
   */
  async selectBid(shootingId: string, bidId: string, dto: SelectBidDto) {
    const shooting = await this.prisma.shootingSchedule.findUnique({
      where: { id: shootingId },
    });

    if (!shooting) {
      throw new NotFoundException('촬영 일정을 찾을 수 없습니다.');
    }

    if (![SHOOTING_STATUS.BIDDING, SHOOTING_STATUS.RECRUITING].includes(shooting.status as any)) {
      throw new BadRequestException('응찰/모집 상태에서만 작가를 확정할 수 있습니다.');
    }

    const bid = await this.prisma.shootingBid.findUnique({
      where: { id: bidId },
      include: {
        staff: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!bid) {
      throw new NotFoundException('응찰 정보를 찾을 수 없습니다.');
    }

    if (bid.shootingId !== shootingId) {
      throw new BadRequestException('해당 촬영의 응찰이 아닙니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. 선택된 응찰 상태 변경
      await tx.shootingBid.update({
        where: { id: bidId },
        data: { status: BID_STATUS.SELECTED },
      });

      // 2. 나머지 응찰자 rejected 처리
      await tx.shootingBid.updateMany({
        where: {
          shootingId,
          id: { not: bidId },
          status: BID_STATUS.PENDING,
        },
        data: { status: BID_STATUS.REJECTED },
      });

      // 3. 촬영 일정에 확정 작가 지정 + 상태 변경
      const updated = await tx.shootingSchedule.update({
        where: { id: shootingId },
        data: {
          assignedStaffId: bid.staffId,
          status: SHOOTING_STATUS.CONFIRMED,
        },
        include: {
          assignedStaff: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 4. 작가 통계 totalShootings 증가 (upsert)
      await tx.photographerStats.upsert({
        where: { staffId: bid.staffId },
        create: {
          staffId: bid.staffId,
          totalShootings: 1,
        },
        update: {
          totalShootings: { increment: 1 },
        },
      });

      // 5. 확정 이메일 발송 (비동기)
      if (bid.staff.email) {
        this.notificationService
          .sendSelectionNotification({
            staffEmail: bid.staff.email,
            staffName: bid.staff.name,
            shootingInfo: {
              clientName: shooting.clientName,
              shootingType: shooting.shootingType,
              venueName: shooting.venueName,
              venueAddress: shooting.venueAddress,
              shootingDate: shooting.shootingDate,
            },
            message: dto.message,
          })
          .catch((err) => this.logger.error(`확정 이메일 발송 실패: ${err.message}`));
      }

      // 6. 거절된 응찰자들에게 거절 이메일 발송 (비동기)
      const rejectedBids = await tx.shootingBid.findMany({
        where: {
          shootingId,
          status: BID_STATUS.REJECTED,
        },
        include: {
          staff: { select: { name: true, email: true } },
        },
      });

      for (const rejected of rejectedBids) {
        if (rejected.staff.email) {
          this.notificationService
            .sendRejectionNotification({
              staffEmail: rejected.staff.email,
              staffName: rejected.staff.name,
              shootingInfo: {
                clientName: shooting.clientName,
                shootingType: shooting.shootingType,
                shootingDate: shooting.shootingDate,
              },
            })
            .catch((err) => this.logger.error(`거절 이메일 발송 실패: ${err.message}`));
        }
      }

      this.logger.log(`작가 확정: shooting=${shootingId}, staff=${bid.staffId}`);
      return updated;
    });
  }

  /**
   * 작가 거절
   */
  async rejectBid(shootingId: string, bidId: string, dto: RejectBidDto) {
    const shooting = await this.prisma.shootingSchedule.findUnique({
      where: { id: shootingId },
    });

    if (!shooting) {
      throw new NotFoundException('촬영 일정을 찾을 수 없습니다.');
    }

    const bid = await this.prisma.shootingBid.findUnique({
      where: { id: bidId },
      include: {
        staff: { select: { id: true, name: true, email: true } },
      },
    });

    if (!bid) {
      throw new NotFoundException('응찰 정보를 찾을 수 없습니다.');
    }

    if (bid.shootingId !== shootingId) {
      throw new BadRequestException('해당 촬영의 응찰이 아닙니다.');
    }

    if (bid.status !== BID_STATUS.PENDING) {
      throw new BadRequestException('대기 중인 응찰만 거절할 수 있습니다.');
    }

    const updated = await this.prisma.shootingBid.update({
      where: { id: bidId },
      data: { status: BID_STATUS.REJECTED },
      include: {
        staff: { select: { id: true, name: true, email: true } },
      },
    });

    // 거절 이메일 발송 (비동기)
    if (bid.staff.email) {
      this.notificationService
        .sendRejectionNotification({
          staffEmail: bid.staff.email,
          staffName: bid.staff.name,
          shootingInfo: {
            clientName: shooting.clientName,
            shootingType: shooting.shootingType,
            shootingDate: shooting.shootingDate,
          },
          reason: dto.reason,
        })
        .catch((err) => this.logger.error(`거절 이메일 발송 실패: ${err.message}`));
    }

    this.logger.log(`작가 거절: shooting=${shootingId}, bid=${bidId}`);
    return updated;
  }

  /**
   * 문자열을 정수 해시로 변환 (advisory lock 키용)
   */
  private hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    return Math.abs(hash);
  }
}
