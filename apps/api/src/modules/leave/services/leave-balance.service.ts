import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { QueryLeaveBalanceDto, GenerateLeaveBalanceDto, AdjustLeaveBalanceDto } from '../dto';

@Injectable()
export class LeaveBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryLeaveBalanceDto) {
    const { staffId, year } = query;
    const where: any = {};
    if (staffId) where.staffId = staffId;
    if (year) where.year = year;

    return this.prisma.leaveBalance.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true, staffId: true, departmentId: true, teamId: true } },
      },
      orderBy: [{ year: 'desc' }, { leaveTypeCode: 'asc' }],
    });
  }

  /**
   * 연차 자동 생성 (근로기준법 기준)
   * - 1년 미만: 매월 1일씩 (월차)
   * - 1년 이상: 15일 + 2년마다 1일 추가 (최대 25일)
   */
  async generateYearlyBalances(dto: GenerateLeaveBalanceDto) {
    const { year } = dto;

    const activeStaff = await this.prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true, joinDate: true },
    });

    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { isActive: true },
    });

    const annualType = leaveTypes.find((t) => t.code === 'annual');
    if (!annualType) {
      throw new BadRequestException('연차(annual) 휴가 유형이 등록되어 있지 않습니다.');
    }

    const results: { staffId: string; staffName: string; totalDays: number; type: string }[] = [];

    for (const staff of activeStaff) {
      const joinDate = new Date(staff.joinDate);
      const yearStart = new Date(year, 0, 1); // 해당 연도 1월 1일
      const tenureMs = yearStart.getTime() - joinDate.getTime();
      const tenureDays = tenureMs / (1000 * 60 * 60 * 24);
      const tenureYears = Math.floor(tenureDays / 365);

      let totalDays: number;
      let typeCode: string;

      if (tenureYears < 1) {
        // 1년 미만: 입사일부터 해당연도 내 근무월수 계산
        const monthsWorked = this.calcMonthsInYear(joinDate, year);
        totalDays = monthsWorked; // 월 1일
        typeCode = 'monthly';
      } else {
        // 1년 이상: 15일 기본 + 2년마다 1일 추가 (최대 25일)
        const extraYears = Math.max(0, tenureYears - 1);
        const extraDays = Math.floor(extraYears / 2);
        totalDays = Math.min(15 + extraDays, 25);
        typeCode = 'annual';
      }

      // 해당 유형이 등록되어 있는지 확인, 없으면 annual 사용
      const matchedType = leaveTypes.find((t) => t.code === typeCode);
      const finalTypeCode = matchedType ? typeCode : 'annual';

      await this.prisma.leaveBalance.upsert({
        where: {
          staffId_year_leaveTypeCode: {
            staffId: staff.id,
            year,
            leaveTypeCode: finalTypeCode,
          },
        },
        create: {
          staffId: staff.id,
          year,
          leaveTypeCode: finalTypeCode,
          totalDays,
          usedDays: 0,
          adjustedDays: 0,
        },
        update: {
          totalDays,
        },
      });

      results.push({
        staffId: staff.id,
        staffName: staff.name,
        totalDays,
        type: finalTypeCode,
      });
    }

    return {
      year,
      generatedCount: results.length,
      results,
    };
  }

  async adjust(id: string, dto: AdjustLeaveBalanceDto) {
    const balance = await this.prisma.leaveBalance.findUnique({ where: { id } });
    if (!balance) {
      throw new NotFoundException(`잔여 휴가를 찾을 수 없습니다: ${id}`);
    }

    return this.prisma.leaveBalance.update({
      where: { id },
      data: {
        adjustedDays: { increment: dto.adjustedDays },
        memo: dto.memo || balance.memo,
      },
    });
  }

  /** 해당 연도에 근무한 월수 계산 (1년 미만 직원용) */
  private calcMonthsInYear(joinDate: Date, year: number): number {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const effectiveStart = joinDate > yearStart ? joinDate : yearStart;
    if (effectiveStart > yearEnd) return 0;

    const startMonth = effectiveStart.getMonth();
    const endMonth = 11; // 12월까지
    return endMonth - startMonth + 1;
  }
}
