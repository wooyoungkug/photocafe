import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateMinStaffingRuleDto, UpdateMinStaffingRuleDto } from '../dto';

@Injectable()
export class MinStaffingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.minStaffingRule.findMany({
      orderBy: { departmentId: 'asc' },
    });
  }

  async create(dto: CreateMinStaffingRuleDto) {
    return this.prisma.minStaffingRule.create({ data: dto });
  }

  async update(id: string, dto: UpdateMinStaffingRuleDto) {
    const rule = await this.prisma.minStaffingRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`최소 근무인원 규칙을 찾을 수 없습니다: ${id}`);
    }

    return this.prisma.minStaffingRule.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const rule = await this.prisma.minStaffingRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`최소 근무인원 규칙을 찾을 수 없습니다: ${id}`);
    }

    return this.prisma.minStaffingRule.delete({ where: { id } });
  }

  /**
   * 최소 근무인원 충족 여부 확인
   * 해당 기간에 이미 승인된 휴가자를 제외한 인원이 최소 기준 이상인지 체크
   */
  async checkMinStaffing(
    departmentId: string | null,
    teamId: string | null,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    // 관련 규칙 조회
    const rules = await this.prisma.minStaffingRule.findMany({
      where: {
        isActive: true,
        OR: [
          { departmentId, teamId: null },
          { teamId },
          { departmentId: null, teamId: null }, // 전사 규칙
        ].filter((c) => {
          if (c.departmentId === null && c.teamId === null) return true;
          if (c.departmentId && c.departmentId !== null) return !!departmentId;
          if (c.teamId && c.teamId !== null) return !!teamId;
          return false;
        }),
      },
    });

    if (rules.length === 0) return true; // 규칙 없으면 통과

    // 가장 엄격한 규칙 적용
    const maxMinCount = Math.max(...rules.map((r) => r.minCount));

    // 해당 부서/팀의 전체 활성 직원 수
    const staffWhere: any = { isActive: true };
    if (teamId) {
      staffWhere.teamId = teamId;
    } else if (departmentId) {
      staffWhere.departmentId = departmentId;
    }

    const totalStaff = await this.prisma.staff.count({ where: staffWhere });

    // 해당 기간에 이미 승인된 휴가 인원
    const approvedLeaves = await this.prisma.leaveRequest.count({
      where: {
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        staff: staffWhere,
      },
    });

    // 남은 인원 (신청자 본인 포함하므로 -1)
    const remainingStaff = totalStaff - approvedLeaves - 1;

    return remainingStaff >= maxMinCount;
  }
}
