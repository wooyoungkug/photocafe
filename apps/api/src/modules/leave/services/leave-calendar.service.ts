import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { QueryLeaveCalendarDto } from '../dto';

@Injectable()
export class LeaveCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getCalendar(query: QueryLeaveCalendarDto) {
    const { year, month, departmentId, teamId } = query;

    // 해당 월의 시작일/종료일
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // 직원 필터 조건
    const staffWhere: any = { isActive: true };
    if (departmentId) staffWhere.departmentId = departmentId;
    if (teamId) staffWhere.teamId = teamId;

    const staffIds = await this.prisma.staff.findMany({
      where: staffWhere,
      select: { id: true },
    });

    const staffIdList = staffIds.map((s) => s.id);

    // 승인된 휴가만 조회 (해당 월과 겹치는 모든 휴가)
    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        staffId: { in: staffIdList },
        status: 'APPROVED',
        startDate: { lte: endOfMonth },
        endDate: { gte: startOfMonth },
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            staffId: true,
            departmentId: true,
            teamId: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    // 날짜별로 그룹핑
    const calendarMap = new Map<string, any[]>();

    for (const leave of leaves) {
      const start = new Date(Math.max(leave.startDate.getTime(), startOfMonth.getTime()));
      const end = new Date(Math.min(leave.endDate.getTime(), endOfMonth.getTime()));

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        if (!calendarMap.has(dateKey)) {
          calendarMap.set(dateKey, []);
        }
        calendarMap.get(dateKey)!.push({
          requestId: leave.id,
          staffId: leave.staff.id,
          staffName: leave.staff.name,
          leaveTypeCode: leave.leaveTypeCode,
          days: leave.days,
          startTime: leave.startTime,
          endTime: leave.endTime,
        });
      }
    }

    // Map -> 배열 변환
    const calendar = Array.from(calendarMap.entries())
      .map(([date, entries]) => ({ date, leaves: entries }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      year,
      month,
      calendar,
      totalLeaves: leaves.length,
    };
  }
}
