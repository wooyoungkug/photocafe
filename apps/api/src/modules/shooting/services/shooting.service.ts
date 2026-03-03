import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateShootingDto,
  UpdateShootingDto,
  QueryShootingDto,
  UpdateShootingStatusDto,
} from '../dto';
import {
  SHOOTING_STATUS,
  SHOOTING_TYPE_COLORS,
  STATUS_TRANSITIONS,
} from '../constants/shooting.constants';
import { ScheduleRecruitmentSyncService } from './schedule-recruitment-sync.service';

@Injectable()
export class ShootingService {
  private readonly logger = new Logger(ShootingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: ScheduleRecruitmentSyncService,
  ) {}

  /**
   * 촬영 일정 생성
   * - ShootingSchedule 생성
   * - 기존 Schedule 테이블에 연동 레코드 생성 (relatedType='shooting')
   */
  async create(dto: CreateShootingDto, userId: string) {
    const shootingDate = new Date(dto.shootingDate);
    const durationMinutes = dto.duration || 120;
    const endDate = new Date(shootingDate.getTime() + durationMinutes * 60 * 1000);

    // 촬영 유형 색상
    const color = SHOOTING_TYPE_COLORS[dto.shootingType as keyof typeof SHOOTING_TYPE_COLORS] || '#6B7280';

    return this.prisma.$transaction(async (tx) => {
      // 1. Schedule 테이블에 연동 레코드 생성
      const schedule = await tx.schedule.create({
        data: {
          title: `[촬영] ${dto.clientName} - ${dto.venueName}`,
          description: dto.notes || '',
          location: `${dto.venueName} (${dto.venueAddress})`,
          startAt: shootingDate,
          endAt: endDate,
          isAllDay: false,
          isCompany: true,
          scheduleType: 'event',
          relatedType: 'shooting',
          color,
          creatorId: userId,
          creatorName: '시스템',
        },
      });

      // 2. ShootingSchedule 생성
      const shooting = await tx.shootingSchedule.create({
        data: {
          scheduleId: schedule.id,
          clientName: dto.clientName,
          shootingType: dto.shootingType,
          venueName: dto.venueName,
          venueAddress: dto.venueAddress,
          venueFloor: dto.venueFloor,
          venueHall: dto.venueHall,
          latitude: dto.latitude,
          longitude: dto.longitude,
          shootingDate,
          duration: dto.duration,
          status: SHOOTING_STATUS.DRAFT,
          maxBidders: dto.maxBidders || 3,
          customerPhone: dto.customerPhone,
          customerEmail: dto.customerEmail,
          notes: dto.notes,
          createdBy: userId,
        },
        include: {
          assignedStaff: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      this.logger.log(`촬영 일정 생성: ${shooting.id} (${dto.clientName})`);

      // 구인 연동: enableRecruitment=true이면 구인방에도 등록
      if (dto.enableRecruitment) {
        // recruitmentClientId가 없으면 로그인 유저의 clientId로 fallback
        let clientId = dto.recruitmentClientId;
        if (!clientId) {
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { client: { select: { id: true } } },
          });
          clientId = user?.client?.id || undefined;
        }

        if (clientId) {
          this.syncService
            .syncShootingToRecruitment(shooting.id, {
              clientId,
              title: dto.recruitmentTitle,
              budget: dto.recruitmentBudget,
              description: dto.recruitmentDescription,
              requirements: dto.recruitmentRequirements,
              privateDeadlineHours: dto.recruitmentPrivateDeadlineHours,
            })
            .catch((err) =>
              this.logger.warn(`Shooting→Recruitment sync failed: ${err.message}`),
            );
        } else {
          this.logger.warn(
            `Shooting→Recruitment sync skipped: no clientId for user ${userId}`,
          );
        }
      }

      return shooting;
    });
  }

  /**
   * 촬영 일정 목록 조회 (페이지네이션, 필터링)
   * @param createdByIds 컨트롤러에서 내부적으로 전달하는 생성자 ID 목록 (employee 포함 처리용)
   */
  async findAll(query: QueryShootingDto, createdByIds?: string[]) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ShootingScheduleWhereInput = {};

    // 날짜 범위 필터
    if (query.startDate || query.endDate) {
      where.shootingDate = {};
      if (query.startDate) {
        where.shootingDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        // endDate를 해당 날짜의 23:59:59.999로 설정하여 종일 포함
        where.shootingDate.lte = new Date(query.endDate + 'T23:59:59.999Z');
      }
    }

    // 촬영 유형 필터
    if (query.shootingType) {
      where.shootingType = query.shootingType;
    }

    // 상태 필터
    if (query.status) {
      where.status = query.status;
    }

    // 담당 작가 필터
    if (query.assignedStaffId) {
      where.assignedStaffId = query.assignedStaffId;
    }

    // 생성자 필터: 컨트롤러에서 전달한 목록 우선, 없으면 단일 createdBy 사용
    if (createdByIds && createdByIds.length > 0) {
      where.createdBy = { in: createdByIds };
    } else if (query.createdBy) {
      where.createdBy = query.createdBy;
    }

    // 검색어 필터 (고객명, 장소명)
    if (query.search) {
      where.OR = [
        { clientName: { contains: query.search, mode: 'insensitive' } },
        { venueName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.shootingSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { shootingDate: 'desc' },
        include: {
          assignedStaff: {
            select: { id: true, name: true, email: true },
          },
          bids: {
            select: {
              id: true,
              staffId: true,
              status: true,
              staff: { select: { id: true, name: true } },
            },
          },
          _count: {
            select: { bids: true, locationLogs: true },
          },
        },
      }),
      this.prisma.shootingSchedule.count({ where }),
    ]);

    // 등록자(creator) 정보 배치 조회 (createdBy = Client.id)
    const creatorIds = [...new Set(data.map((s) => s.createdBy).filter(Boolean))];
    const creators = creatorIds.length
      ? await this.prisma.client.findMany({
          where: { id: { in: creatorIds } },
          select: {
            id: true,
            clientName: true,
            representative: true,
            memberType: true,
            mobile: true,
          },
        })
      : [];
    const creatorMap = Object.fromEntries(creators.map((c) => [c.id, c]));

    const enrichedData = data.map((s) => ({
      ...s,
      creator: creatorMap[s.createdBy] ?? null,
    }));

    return {
      data: enrichedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 촬영 일정 상세 조회
   */
  async findOne(id: string) {
    const shooting = await this.prisma.shootingSchedule.findUnique({
      where: { id },
      include: {
        assignedStaff: {
          select: { id: true, name: true, email: true, phone: true },
        },
        bids: {
          include: {
            staff: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
          orderBy: { bidAt: 'asc' },
        },
        locationLogs: {
          orderBy: { recordedAt: 'asc' },
        },
        review: true,
        linkedRecruitment: {
          select: {
            id: true,
            title: true,
            budget: true,
            description: true,
            requirements: true,
            privateDeadlineHours: true,
          },
        },
      },
    });

    if (!shooting) {
      throw new NotFoundException('촬영 일정을 찾을 수 없습니다.');
    }

    // 등록자 정보 조회 (createdBy = Client.id)
    const creator = await this.prisma.client.findUnique({
      where: { id: shooting.createdBy },
      select: {
        id: true,
        clientName: true,
        representative: true,
        memberType: true,
        mobile: true,
      },
    });

    return { ...shooting, creator: creator ?? null };
  }

  /**
   * 촬영 일정 수정
   */
  async update(id: string, dto: UpdateShootingDto) {
    const shooting = await this.prisma.shootingSchedule.findUnique({
      where: { id },
    });

    if (!shooting) {
      throw new NotFoundException('촬영 일정을 찾을 수 없습니다.');
    }

    // 완료/취소 상태에서는 수정 불가
    if ([SHOOTING_STATUS.COMPLETED, SHOOTING_STATUS.CANCELLED].includes(shooting.status as any)) {
      throw new BadRequestException('완료 또는 취소된 일정은 수정할 수 없습니다.');
    }

    const updateData: Prisma.ShootingScheduleUpdateInput = {};

    if (dto.clientName !== undefined) updateData.clientName = dto.clientName;
    if (dto.shootingType !== undefined) updateData.shootingType = dto.shootingType;
    if (dto.venueName !== undefined) updateData.venueName = dto.venueName;
    if (dto.venueAddress !== undefined) updateData.venueAddress = dto.venueAddress;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.shootingDate !== undefined) updateData.shootingDate = new Date(dto.shootingDate);
    if (dto.duration !== undefined) updateData.duration = dto.duration;
    if (dto.maxBidders !== undefined) updateData.maxBidders = dto.maxBidders;
    if (dto.customerPhone !== undefined) updateData.customerPhone = dto.customerPhone;
    if (dto.customerEmail !== undefined) updateData.customerEmail = dto.customerEmail;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shootingSchedule.update({
        where: { id },
        data: updateData,
        include: {
          assignedStaff: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 연동된 Schedule 레코드 동기화
      if (shooting.scheduleId) {
        const scheduleUpdateData: any = {};
        if (dto.clientName || dto.venueName) {
          scheduleUpdateData.title = `[촬영] ${dto.clientName || shooting.clientName} - ${dto.venueName || shooting.venueName}`;
        }
        if (dto.venueName || dto.venueAddress) {
          scheduleUpdateData.location = `${dto.venueName || shooting.venueName} (${dto.venueAddress || shooting.venueAddress})`;
        }
        if (dto.shootingDate) {
          const newDate = new Date(dto.shootingDate);
          const duration = dto.duration || shooting.duration || 120;
          scheduleUpdateData.startAt = newDate;
          scheduleUpdateData.endAt = new Date(newDate.getTime() + duration * 60 * 1000);
        }
        if (dto.notes !== undefined) {
          scheduleUpdateData.description = dto.notes || '';
        }

        if (Object.keys(scheduleUpdateData).length > 0) {
          await tx.schedule.update({
            where: { id: shooting.scheduleId },
            data: scheduleUpdateData,
          });
        }
      }

      // 구인 연동: enableRecruitment=true이고 아직 연동된 구인이 없으면 새로 생성
      if (dto.enableRecruitment && !shooting.linkedRecruitmentId) {
        let clientId = dto.recruitmentClientId;
        if (!clientId) {
          const user = await this.prisma.user.findUnique({
            where: { id: shooting.createdBy },
            select: { client: { select: { id: true } } },
          });
          clientId = user?.client?.id || undefined;
        }

        if (clientId) {
          this.syncService
            .syncShootingToRecruitment(id, {
              clientId,
              title: dto.recruitmentTitle,
              budget: dto.recruitmentBudget,
              description: dto.recruitmentDescription,
              requirements: dto.recruitmentRequirements,
              privateDeadlineHours: dto.recruitmentPrivateDeadlineHours,
            })
            .catch((err) =>
              this.logger.warn(`Shooting→Recruitment sync failed: ${err.message}`),
            );
        }
      } else {
        // 구인방 연동 동기화 (공통 필드 변경 시)
        this.syncService
          .syncFieldUpdate('shooting', id, dto)
          .catch((err) =>
            this.logger.warn(`Shooting field sync failed: ${err.message}`),
          );
      }

      return updated;
    });
  }

  /**
   * 촬영 일정 삭제
   */
  async delete(id: string) {
    const shooting = await this.prisma.shootingSchedule.findUnique({
      where: { id },
    });

    if (!shooting) {
      throw new NotFoundException('촬영 일정을 찾을 수 없습니다.');
    }

    // 진행중/완료 상태에서는 삭제 불가
    if ([SHOOTING_STATUS.IN_PROGRESS, SHOOTING_STATUS.COMPLETED].includes(shooting.status as any)) {
      throw new BadRequestException('진행 중이거나 완료된 일정은 삭제할 수 없습니다.');
    }

    // 구인방 연동 해제 (삭제 전)
    await this.syncService
      .unlinkRecords('shooting', id)
      .catch((err) =>
        this.logger.warn(`Shooting unlink failed: ${err.message}`),
      );

    return this.prisma.$transaction(async (tx) => {
      await tx.shootingSchedule.delete({ where: { id } });

      // 연동된 Schedule 레코드도 삭제
      if (shooting.scheduleId) {
        await tx.schedule.delete({ where: { id: shooting.scheduleId } }).catch(() => {
          // Schedule이 이미 삭제된 경우 무시
        });
      }

      this.logger.log(`촬영 일정 삭제: ${id}`);
      return { message: '촬영 일정이 삭제되었습니다.' };
    });
  }

  /**
   * 촬영 일정 상태 변경
   * - 상태 전이 유효성 검증
   */
  async updateStatus(id: string, dto: UpdateShootingStatusDto) {
    const shooting = await this.prisma.shootingSchedule.findUnique({
      where: { id },
    });

    if (!shooting) {
      throw new NotFoundException('촬영 일정을 찾을 수 없습니다.');
    }

    // 상태 전이 유효성 검증
    const allowedTransitions = STATUS_TRANSITIONS[shooting.status];
    if (!allowedTransitions || !allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `'${shooting.status}' 상태에서 '${dto.status}'로 변경할 수 없습니다. 가능한 상태: [${allowedTransitions?.join(', ') || '없음'}]`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shootingSchedule.update({
        where: { id },
        data: { status: dto.status },
        include: {
          assignedStaff: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 연동된 Schedule 상태도 동기화
      if (shooting.scheduleId) {
        const scheduleStatus = dto.status === SHOOTING_STATUS.CANCELLED ? 'cancelled' : 'confirmed';
        await tx.schedule.update({
          where: { id: shooting.scheduleId },
          data: { status: scheduleStatus },
        }).catch(() => {});
      }

      // 구인방 상태 동기화
      this.syncService
        .syncStatusChange('shooting', id, dto.status)
        .catch((err) =>
          this.logger.warn(`Shooting status sync failed: ${err.message}`),
        );

      this.logger.log(`촬영 상태 변경: ${id} (${shooting.status} -> ${dto.status})`);
      return updated;
    });
  }
}
