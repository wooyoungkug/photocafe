import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateScheduleDto, UpdateScheduleDto, QueryScheduleDto } from '../dto';

interface CurrentUser {
  id: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  role: string;
}

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateScheduleDto, user: CurrentUser) {
    // 반복 설정이 있는 경우 RRULE 생성
    let recurringRule = dto.recurringRule;
    if (dto.recurringConfig && dto.recurringConfig.type !== 'none') {
      recurringRule = this.generateRRule(dto.recurringConfig, new Date(dto.startAt));
    }

    return this.prisma.schedule.create({
      data: {
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        isAllDay: dto.isAllDay || false,
        isPersonal: dto.isPersonal ?? true,
        isDepartment: dto.isDepartment ?? false,
        isCompany: dto.isCompany ?? false,
        sharedDeptIds: dto.sharedDeptIds || [],
        scheduleType: dto.scheduleType || 'meeting',
        reminders: dto.reminders || Prisma.JsonNull,
        isRecurring: dto.isRecurring || false,
        recurringRule: recurringRule,
        recurringConfig: (dto.recurringConfig as any) || Prisma.JsonNull,
        recurringEnd: dto.recurringEnd ? new Date(dto.recurringEnd) : null,
        attendees: dto.attendees || Prisma.JsonNull,
        color: dto.color || '#3B82F6',
        tags: dto.tags || [],
        relatedType: dto.relatedType,
        relatedId: dto.relatedId,
        creatorId: user.id,
        creatorName: user.name || '사용자',
        creatorDeptId: user.departmentId || null,
        creatorDeptName: user.departmentName || null,
      },
    });
  }

  // 반복 설정을 RRULE로 변환
  private generateRRule(config: any, startDate: Date): string {
    const parts: string[] = ['RRULE:'];

    // 반복 주기
    switch (config.type) {
      case 'daily':
        parts.push('FREQ=DAILY');
        break;
      case 'weekly':
        parts.push('FREQ=WEEKLY');
        break;
      case 'monthly':
        parts.push('FREQ=MONTHLY');
        break;
      case 'yearly':
        parts.push('FREQ=YEARLY');
        break;
      default:
        return '';
    }

    // 반복 간격
    if (config.interval && config.interval > 1) {
      parts.push(`;INTERVAL=${config.interval}`);
    }

    // 매주 반복 시 요일 설정
    if (config.type === 'weekly' && config.weekdays && config.weekdays.length > 0) {
      const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const days = config.weekdays.map((d: number) => dayNames[d]).join(',');
      parts.push(`;BYDAY=${days}`);
    }

    // 매월 반복 시 설정
    if (config.type === 'monthly') {
      if (config.monthWeek && config.monthWeekday !== undefined) {
        // n번째 요일
        const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        parts.push(`;BYDAY=${config.monthWeek}${dayNames[config.monthWeekday]}`);
      } else if (config.monthDay) {
        // 특정 일자
        parts.push(`;BYMONTHDAY=${config.monthDay}`);
      }
    }

    // 종료 조건
    if (config.endType === 'date' && config.endDate) {
      const endDate = new Date(config.endDate);
      const until = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      parts.push(`;UNTIL=${until}`);
    } else if (config.endType === 'count' && config.endCount) {
      parts.push(`;COUNT=${config.endCount}`);
    }

    return parts.join('');
  }

  async findAll(query: QueryScheduleDto, user: CurrentUser) {
    const where: any = {
      // 기간 필터 (필수)
      OR: [
        // 시작일이 조회 범위 내
        {
          startAt: {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
          },
        },
        // 종료일이 조회 범위 내
        {
          endAt: {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
          },
        },
        // 조회 범위를 포함하는 일정
        {
          startAt: { lte: new Date(query.startDate) },
          endAt: { gte: new Date(query.endDate) },
        },
      ],
    };

    // 일정 타입 필터
    if (query.scheduleType) {
      where.scheduleType = query.scheduleType;
    }

    // 검색어 필터
    if (query.search) {
      where.AND = [
        {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { location: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // 범위 필터 (개인/부서/전체)
    const scopeConditions: any[] = [];

    if (query.scope === 'personal' || query.scope === 'all' || !query.scope) {
      scopeConditions.push({
        creatorId: user.id,
        isPersonal: true,
      });
    }

    if (query.scope === 'department' || query.scope === 'all' || !query.scope) {
      if (user.departmentId) {
        scopeConditions.push({
          isDepartment: true,
          OR: [
            { creatorDeptId: user.departmentId },
            { sharedDeptIds: { has: user.departmentId } },
          ],
        });
      }
    }

    if (query.scope === 'company' || query.scope === 'all' || !query.scope) {
      scopeConditions.push({
        isCompany: true,
      });
    }

    // 관리자가 아닌 경우 범위 조건 적용
    if (user.role !== 'admin' && scopeConditions.length > 0) {
      where.AND = where.AND
        ? [...where.AND, { OR: scopeConditions }]
        : [{ OR: scopeConditions }];
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      orderBy: [{ startAt: 'asc' }],
    });

    return schedules;
  }

  async findOne(id: string, user: CurrentUser) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException('일정을 찾을 수 없습니다.');
    }

    // 접근 권한 확인
    if (!this.canAccess(schedule, user)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return schedule;
  }

  async update(id: string, dto: UpdateScheduleDto, user: CurrentUser) {
    const schedule = await this.findOne(id, user);

    // 수정 권한 확인 (작성자만 수정 가능)
    if (!this.canEdit(schedule, user)) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }

    const updateData: any = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.startAt !== undefined) updateData.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) updateData.endAt = new Date(dto.endAt);
    if (dto.isAllDay !== undefined) updateData.isAllDay = dto.isAllDay;
    if (dto.isPersonal !== undefined) updateData.isPersonal = dto.isPersonal;
    if (dto.isDepartment !== undefined) updateData.isDepartment = dto.isDepartment;
    if (dto.isCompany !== undefined) updateData.isCompany = dto.isCompany;
    if (dto.sharedDeptIds !== undefined)
      updateData.sharedDeptIds = dto.sharedDeptIds;
    if (dto.scheduleType !== undefined)
      updateData.scheduleType = dto.scheduleType;
    if (dto.reminders !== undefined) updateData.reminders = dto.reminders;
    if (dto.isRecurring !== undefined) updateData.isRecurring = dto.isRecurring;
    if (dto.recurringRule !== undefined)
      updateData.recurringRule = dto.recurringRule;
    if (dto.recurringConfig !== undefined) {
      updateData.recurringConfig = dto.recurringConfig;
      // 반복 설정이 있는 경우 RRULE 자동 생성
      if (dto.recurringConfig && dto.recurringConfig.type !== 'none') {
        const startAt = dto.startAt ? new Date(dto.startAt) : schedule.startAt;
        updateData.recurringRule = this.generateRRule(dto.recurringConfig, startAt);
      }
    }
    if (dto.recurringEnd !== undefined)
      updateData.recurringEnd = dto.recurringEnd
        ? new Date(dto.recurringEnd)
        : null;
    if (dto.attendees !== undefined) updateData.attendees = dto.attendees;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.status !== undefined) updateData.status = dto.status;

    return this.prisma.schedule.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, user: CurrentUser) {
    const schedule = await this.findOne(id, user);

    // 삭제 권한 확인 (담당자, 부서장, 관리자만)
    if (!this.canDelete(schedule, user)) {
      throw new ForbiddenException(
        '삭제 권한이 없습니다. (담당자, 부서장, 관리자만 삭제 가능)',
      );
    }

    return this.prisma.schedule.delete({
      where: { id },
    });
  }

  // 접근 권한 확인
  private canAccess(schedule: any, user: CurrentUser): boolean {
    // 관리자는 모든 접근 가능
    if (user.role === 'admin') return true;

    // 작성자 본인
    if (schedule.creatorId === user.id) return true;

    // 전체 일정
    if (schedule.isCompany) return true;

    // 부서 일정 (본인 부서 또는 공유된 부서)
    if (schedule.isDepartment) {
      if (schedule.creatorDeptId === user.departmentId) return true;
      if (schedule.sharedDeptIds?.includes(user.departmentId)) return true;
    }

    // 참석자인 경우
    if (schedule.attendees) {
      const attendeeIds = schedule.attendees.map((a: any) => a.staffId);
      if (attendeeIds.includes(user.id)) return true;
    }

    return false;
  }

  // 수정 권한 확인
  private canEdit(schedule: any, user: CurrentUser): boolean {
    // 관리자는 모든 수정 가능
    if (user.role === 'admin') return true;

    // 작성자 본인만 수정 가능
    return schedule.creatorId === user.id;
  }

  // 삭제 권한 확인 (담당자, 부서장, 관리자)
  private canDelete(schedule: any, user: CurrentUser): boolean {
    // 관리자는 모든 삭제 가능
    if (user.role === 'admin') return true;

    // 부서장 (같은 부서의 일정)
    if (user.role === 'manager' && schedule.creatorDeptId === user.departmentId) {
      return true;
    }

    // 작성자 본인
    return schedule.creatorId === user.id;
  }
}
