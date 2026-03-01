import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreateRecruitmentDto,
  UpdateRecruitmentDto,
  QueryRecruitmentDto,
} from '../dto';
import {
  RECRUITMENT_STATUS,
  RECRUITMENT_STATUS_TRANSITIONS,
  URGENCY_THRESHOLDS,
  URGENCY_LEVEL,
} from '../constants/recruitment.constants';
import { ScheduleRecruitmentSyncService } from '@/modules/shooting/services/schedule-recruitment-sync.service';

@Injectable()
export class RecruitmentService {
  private readonly logger = new Logger(RecruitmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: ScheduleRecruitmentSyncService,
  ) {}

  /** 긴급도 자동 계산 */
  private calculateUrgency(shootingDate: Date): string {
    const now = new Date();
    const diffMs = shootingDate.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= URGENCY_THRESHOLDS.EMERGENCY_DAYS) return URGENCY_LEVEL.EMERGENCY;
    if (diffDays <= URGENCY_THRESHOLDS.URGENT_DAYS) return URGENCY_LEVEL.URGENT;
    return URGENCY_LEVEL.NORMAL;
  }

  async create(dto: CreateRecruitmentDto, clientId: string, createdBy: string) {
    const shootingDate = new Date(dto.shootingDate);

    const recruitment = await this.prisma.recruitment.create({
      data: {
        clientId,
        title: dto.title,
        shootingType: dto.shootingType,
        shootingDate,
        shootingTime: dto.shootingTime,
        duration: dto.duration,
        venueName: dto.venueName,
        venueAddress: dto.venueAddress,
        latitude: dto.latitude,
        longitude: dto.longitude,
        budget: dto.budget,
        description: dto.description,
        requirements: dto.requirements,
        customerName: dto.customerName,
        maxBidders: dto.maxBidders || 5,
        urgencyLevel: this.calculateUrgency(shootingDate),
        createdBy,
      },
      include: {
        client: { select: { clientName: true } },
        _count: { select: { bids: true } },
      },
    });

    // 일정관리에 자동 생성 (항상)
    await this.syncService
      .syncRecruitmentToShooting(recruitment.id, createdBy)
      .catch((err) =>
        this.logger.warn(`Recruitment→Shooting sync failed: ${err.message}`),
      );

    return recruitment;
  }

  async findAll(query: QueryRecruitmentDto) {
    const {
      clientId,
      status,
      shootingType,
      phase,
      urgencyLevel,
      startDate,
      endDate,
      publicOnly,
      page = 1,
      limit = 20,
      sort = 'latest',
    } = query;

    const where: any = {};

    if (publicOnly === 'true') {
      where.status = RECRUITMENT_STATUS.PUBLIC_RECRUITING;
    } else if (status) {
      where.status = status;
    }

    if (clientId) where.clientId = clientId;
    if (shootingType) where.shootingType = shootingType;
    if (phase) where.recruitmentPhase = phase;
    if (urgencyLevel) where.urgencyLevel = urgencyLevel;

    if (startDate || endDate) {
      where.shootingDate = {};
      if (startDate) where.shootingDate.gte = new Date(startDate);
      if (endDate) where.shootingDate.lte = new Date(endDate);
    }

    const orderBy: any =
      sort === 'deadline' ? { privateDeadline: 'asc' }
      : sort === 'budget_high' ? { budget: 'desc' }
      : sort === 'budget_low' ? { budget: 'asc' }
      : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.recruitment.findMany({
        where,
        include: {
          client: { select: { clientName: true, profileImage: true } },
          _count: { select: { bids: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.recruitment.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const recruitment = await this.prisma.recruitment.findUnique({
      where: { id },
      include: {
        client: {
          select: { clientName: true, profileImage: true, phone: true, email: true },
        },
        bids: {
          include: {
            bidder: {
              select: { clientName: true, profileImage: true, phone: true, email: true },
            },
          },
          orderBy: { bidAt: 'asc' },
        },
        _count: { select: { bids: true } },
      },
    });

    if (!recruitment) {
      throw new NotFoundException('구인 정보를 찾을 수 없습니다.');
    }

    return recruitment;
  }

  async update(id: string, dto: UpdateRecruitmentDto, requesterId: string) {
    const recruitment = await this.prisma.recruitment.findUnique({
      where: { id },
    });

    if (!recruitment) {
      throw new NotFoundException('구인 정보를 찾을 수 없습니다.');
    }

    if (recruitment.createdBy !== requesterId && recruitment.clientId !== requesterId) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }

    if ([RECRUITMENT_STATUS.FILLED, RECRUITMENT_STATUS.CANCELLED].includes(recruitment.status as any)) {
      throw new BadRequestException('완료/취소된 구인은 수정할 수 없습니다.');
    }

    const data: any = { ...dto };
    if (dto.shootingDate) {
      data.shootingDate = new Date(dto.shootingDate);
      data.urgencyLevel = this.calculateUrgency(data.shootingDate);
    }

    const updated = await this.prisma.recruitment.update({
      where: { id },
      data,
      include: {
        client: { select: { clientName: true } },
        _count: { select: { bids: true } },
      },
    });

    // 일정관리 필드 동기화
    this.syncService
      .syncFieldUpdate('recruitment', id, dto)
      .catch((err) =>
        this.logger.warn(`Recruitment field sync failed: ${err.message}`),
      );

    return updated;
  }

  async delete(id: string, requesterId: string) {
    const recruitment = await this.prisma.recruitment.findUnique({
      where: { id },
    });

    if (!recruitment) {
      throw new NotFoundException('구인 정보를 찾을 수 없습니다.');
    }

    if (recruitment.createdBy !== requesterId && recruitment.clientId !== requesterId) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }

    if (recruitment.status === RECRUITMENT_STATUS.FILLED) {
      throw new BadRequestException('확정된 구인은 삭제할 수 없습니다.');
    }

    // 일정관리 연동 해제 (삭제 전)
    await this.syncService
      .unlinkRecords('recruitment', id)
      .catch((err) =>
        this.logger.warn(`Recruitment unlink failed: ${err.message}`),
      );

    return this.prisma.recruitment.delete({ where: { id } });
  }

  /** 촬영유형별 평균 예산 조회 (budget이 있는 구인만 집계) */
  async getAverageBudgetByType() {
    const result = await this.prisma.recruitment.groupBy({
      by: ['shootingType'],
      _avg: { budget: true },
      _count: { budget: true },
      where: {
        budget: { not: null, gt: 0 },
      },
    });

    const averages: Record<string, { avg: number; count: number }> = {};
    for (const row of result) {
      averages[row.shootingType] = {
        avg: Math.round(row._avg.budget ?? 0),
        count: row._count.budget,
      };
    }

    return averages;
  }

  async updateStatus(id: string, newStatus: string, requesterId: string) {
    const recruitment = await this.prisma.recruitment.findUnique({
      where: { id },
    });

    if (!recruitment) {
      throw new NotFoundException('구인 정보를 찾을 수 없습니다.');
    }

    const allowed = RECRUITMENT_STATUS_TRANSITIONS[recruitment.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `'${recruitment.status}'에서 '${newStatus}'로 변경할 수 없습니다.`,
      );
    }

    const updated = await this.prisma.recruitment.update({
      where: { id },
      data: { status: newStatus },
    });

    // 일정관리 상태 동기화
    this.syncService
      .syncStatusChange('recruitment', id, newStatus)
      .catch((err) =>
        this.logger.warn(`Recruitment status sync failed: ${err.message}`),
      );

    return updated;
  }
}
