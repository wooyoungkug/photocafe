import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CreateTeamDto, UpdateTeamDto, TeamQueryDto } from '../dto/team.dto';

interface Performer {
  id: string;
  name: string;
}

@Injectable()
export class TeamService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async findAll(query: TeamQueryDto) {
    const where: any = {};
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return this.prisma.team.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        department: { select: { id: true, code: true, name: true } },
        leader: { select: { id: true, staffId: true, name: true, position: true } },
        _count: { select: { staff: true } },
      },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, code: true, name: true } },
        leader: { select: { id: true, staffId: true, name: true, position: true } },
        staff: {
          select: {
            id: true,
            staffId: true,
            name: true,
            position: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('팀을 찾을 수 없습니다');
    }

    return team;
  }

  async create(data: CreateTeamDto, performer: Performer) {
    // 코드 중복 체크
    const existing = await this.prisma.team.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new ConflictException('이미 존재하는 팀 코드입니다');
    }

    // 부서 존재 확인
    const department = await this.prisma.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!department) {
      throw new BadRequestException('존재하지 않는 부서입니다');
    }

    const team = await this.prisma.team.create({
      data: {
        code: data.code,
        name: data.name,
        departmentId: data.departmentId,
        leaderId: data.leaderId,
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        leader: { select: { id: true, staffId: true, name: true } },
      },
    });

    await this.auditLogService.log({
      entityType: 'team',
      entityId: team.id,
      action: 'create',
      changes: { name: { old: null, new: team.name }, code: { old: null, new: team.code } },
      performedBy: performer.id,
      performerName: performer.name,
    });

    return team;
  }

  async update(id: string, data: UpdateTeamDto, performer: Performer) {
    const existing = await this.findOne(id);

    // 코드 변경 시 중복 체크
    if (data.code && data.code !== existing.code) {
      const codeExists = await this.prisma.team.findFirst({
        where: { code: data.code, NOT: { id } },
      });
      if (codeExists) {
        throw new ConflictException('이미 존재하는 팀 코드입니다');
      }
    }

    const changes: Record<string, { old: any; new: any }> = {};
    if (data.name !== undefined && data.name !== existing.name) changes.name = { old: existing.name, new: data.name };
    if (data.code !== undefined && data.code !== existing.code) changes.code = { old: existing.code, new: data.code };
    if (data.departmentId !== undefined && data.departmentId !== existing.departmentId) changes.departmentId = { old: existing.departmentId, new: data.departmentId };
    if (data.leaderId !== undefined && data.leaderId !== existing.leaderId) changes.leaderId = { old: existing.leaderId, new: data.leaderId };
    if (data.isActive !== undefined && data.isActive !== existing.isActive) changes.isActive = { old: existing.isActive, new: data.isActive };

    const team = await this.prisma.team.update({
      where: { id },
      data,
      include: {
        department: { select: { id: true, code: true, name: true } },
        leader: { select: { id: true, staffId: true, name: true } },
      },
    });

    if (Object.keys(changes).length > 0) {
      await this.auditLogService.log({
        entityType: 'team',
        entityId: id,
        action: 'update',
        changes,
        performedBy: performer.id,
        performerName: performer.name,
      });
    }

    return team;
  }

  async delete(id: string, performer: Performer) {
    const team = await this.findOne(id);

    if (team.staff.length > 0) {
      throw new ConflictException('소속 직원이 있는 팀은 삭제할 수 없습니다. 먼저 직원을 다른 팀으로 이동시키세요.');
    }

    await this.prisma.team.delete({ where: { id } });

    await this.auditLogService.log({
      entityType: 'team',
      entityId: id,
      action: 'delete',
      changes: { name: { old: team.name, new: null }, code: { old: team.code, new: null } },
      performedBy: performer.id,
      performerName: performer.name,
    });

    return { success: true, message: '팀이 삭제되었습니다' };
  }

  async assignMembers(teamId: string, staffIds: string[], performer: Performer) {
    const team = await this.findOne(teamId);

    // 지정된 직원들의 teamId를 이 팀으로 설정
    await this.prisma.staff.updateMany({
      where: { id: { in: staffIds } },
      data: { teamId, departmentId: team.departmentId },
    });

    await this.auditLogService.log({
      entityType: 'team',
      entityId: teamId,
      action: 'update',
      metadata: { action: 'assign_members', staffIds },
      performedBy: performer.id,
      performerName: performer.name,
    });

    return this.findOne(teamId);
  }

  async removeMember(teamId: string, staffId: string, performer: Performer) {
    await this.findOne(teamId);

    await this.prisma.staff.update({
      where: { id: staffId },
      data: { teamId: null },
    });

    await this.auditLogService.log({
      entityType: 'team',
      entityId: teamId,
      action: 'update',
      metadata: { action: 'remove_member', staffId },
      performedBy: performer.id,
      performerName: performer.name,
    });

    return { success: true, message: '팀원이 제거되었습니다' };
  }

  async setLeader(teamId: string, staffId: string, performer: Performer) {
    const team = await this.findOne(teamId);

    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      throw new BadRequestException('존재하지 않는 직원입니다');
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: { leaderId: staffId },
      include: {
        leader: { select: { id: true, staffId: true, name: true } },
      },
    });

    await this.auditLogService.log({
      entityType: 'team',
      entityId: teamId,
      action: 'update',
      changes: { leaderId: { old: team.leaderId, new: staffId } },
      performedBy: performer.id,
      performerName: performer.name,
    });

    return updated;
  }
}
