import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateLeaveRequestDto,
  QueryLeaveRequestDto,
  ApproveLeaveRequestDto,
} from '../dto';
import { MinStaffingService } from './min-staffing.service';

@Injectable()
export class LeaveRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minStaffingService: MinStaffingService,
  ) {}

  async findAll(query: QueryLeaveRequestDto) {
    const { staffId, status, startDate, endDate, page = 1, limit = 20 } = query;
    const where: Prisma.LeaveRequestWhereInput = {};

    if (staffId) where.staffId = staffId;
    if (status) where.status = status as any;
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) (where.startDate as any).gte = new Date(startDate);
      if (endDate) (where.startDate as any).lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: {
          staff: { select: { id: true, name: true, staffId: true, departmentId: true, teamId: true } },
          approvals: {
            include: {
              approver: { select: { id: true, name: true, staffId: true } },
            },
            orderBy: { step: 'asc' },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        staff: { select: { id: true, name: true, staffId: true, departmentId: true, teamId: true, position: true } },
        approvals: {
          include: {
            approver: { select: { id: true, name: true, staffId: true, position: true } },
          },
          orderBy: { step: 'asc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`휴가 신청을 찾을 수 없습니다: ${id}`);
    }

    return request;
  }

  async create(dto: CreateLeaveRequestDto, userId: string) {
    // 1. 신청자 정보 조회
    const staff = await this.prisma.staff.findUnique({
      where: { id: userId },
      select: { id: true, teamId: true, departmentId: true },
    });
    if (!staff) {
      throw new NotFoundException('직원 정보를 찾을 수 없습니다.');
    }

    // 2. 잔여 연차 확인
    const year = new Date(dto.startDate).getFullYear();
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        staffId_year_leaveTypeCode: {
          staffId: userId,
          year,
          leaveTypeCode: dto.leaveTypeCode,
        },
      },
    });

    if (!balance) {
      const leaveType = await this.prisma.leaveType.findUnique({
        where: { code: dto.leaveTypeCode },
        select: { name: true },
      });
      const typeLabel = leaveType?.name ?? dto.leaveTypeCode;
      throw new BadRequestException(
        `${year}년 ${typeLabel} 잔여 일수가 등록되어 있지 않습니다. 관리자에게 잔여일수 등록을 요청하세요. (휴가관리 > 잔여일수 관리)`,
      );
    }

    const remaining = balance.totalDays + balance.adjustedDays - balance.usedDays;
    if (remaining < dto.days) {
      throw new BadRequestException(`잔여 휴가일수가 부족합니다. (남은 일수: ${remaining}, 신청 일수: ${dto.days})`);
    }

    // 3. 최소 근무인원 체크
    const canTakeLeave = await this.minStaffingService.checkMinStaffing(
      staff.departmentId,
      staff.teamId,
      new Date(dto.startDate),
      new Date(dto.endDate),
    );
    if (!canTakeLeave) {
      throw new BadRequestException('해당 기간에 최소 근무인원 기준을 충족하지 못합니다.');
    }

    // 4. 결재 단계 결정
    const approvalSteps = await this.buildApprovalSteps(staff.teamId, staff.departmentId);

    // 5. 휴가 신청 + 결재 단계 생성
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.create({
        data: {
          staffId: userId,
          leaveTypeCode: dto.leaveTypeCode,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          startTime: dto.startTime,
          endTime: dto.endTime,
          days: dto.days,
          reason: dto.reason,
          status: 'PENDING',
        },
      });

      for (const stepInfo of approvalSteps) {
        await tx.leaveApproval.create({
          data: {
            requestId: request.id,
            approverStaffId: stepInfo.approverStaffId,
            step: stepInfo.step,
            status: 'PENDING',
          },
        });
      }

      return tx.leaveRequest.findUnique({
        where: { id: request.id },
        include: {
          approvals: {
            include: {
              approver: { select: { id: true, name: true, staffId: true } },
            },
            orderBy: { step: 'asc' },
          },
        },
      });
    });
  }

  async cancel(id: string, userId: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { approvals: true },
    });

    if (!request) {
      throw new NotFoundException(`휴가 신청을 찾을 수 없습니다: ${id}`);
    }

    if (request.staffId !== userId) {
      throw new ForbiddenException('본인의 휴가 신청만 취소할 수 있습니다.');
    }

    if (request.status === 'CANCELLED') {
      throw new BadRequestException('이미 취소된 신청입니다.');
    }

    if (request.status === 'REJECTED') {
      throw new BadRequestException('반려된 신청은 취소할 수 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 승인된 상태였다면 잔여일수 복원
      if (request.status === 'APPROVED') {
        const year = request.startDate.getFullYear();
        await tx.leaveBalance.update({
          where: {
            staffId_year_leaveTypeCode: {
              staffId: request.staffId,
              year,
              leaveTypeCode: request.leaveTypeCode,
            },
          },
          data: { usedDays: { decrement: request.days } },
        });
      }

      return tx.leaveRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }

  async approve(id: string, dto: ApproveLeaveRequestDto, approverUserId: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { approvals: { orderBy: { step: 'asc' } } },
    });

    if (!request) {
      throw new NotFoundException(`휴가 신청을 찾을 수 없습니다: ${id}`);
    }

    if (request.status === 'CANCELLED' || request.status === 'REJECTED') {
      throw new BadRequestException('취소 또는 반려된 신청은 처리할 수 없습니다.');
    }

    // 해당 단계의 결재 정보 확인
    const approval = request.approvals.find(
      (a) => a.step === dto.step && a.approverStaffId === approverUserId,
    );
    if (!approval) {
      throw new ForbiddenException('해당 결재 단계의 결재자가 아닙니다.');
    }

    if (approval.status !== 'PENDING') {
      throw new BadRequestException('이미 처리된 결재 단계입니다.');
    }

    // 이전 단계가 승인되지 않았으면 거부
    if (dto.step > 1) {
      const prevApproval = request.approvals.find((a) => a.step === dto.step - 1);
      if (prevApproval && prevApproval.status !== 'APPROVED') {
        throw new BadRequestException('이전 단계의 결재가 완료되지 않았습니다.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 결재 처리
      await tx.leaveApproval.update({
        where: { id: approval.id },
        data: {
          status: dto.status,
          comment: dto.comment,
          decidedAt: new Date(),
        },
      });

      if (dto.status === 'REJECTED') {
        // 반려: 전체 요청 반려
        return tx.leaveRequest.update({
          where: { id },
          data: { status: 'REJECTED' },
          include: {
            approvals: {
              include: { approver: { select: { id: true, name: true } } },
              orderBy: { step: 'asc' },
            },
          },
        });
      }

      // 승인: 다음 단계 확인
      const maxStep = Math.max(...request.approvals.map((a) => a.step));
      const isFinalStep = dto.step >= maxStep;

      let newStatus: string;
      if (isFinalStep) {
        newStatus = 'APPROVED';
      } else if (dto.step === 1) {
        newStatus = 'TEAM_APPROVED';
      } else {
        newStatus = 'APPROVED';
      }

      const updated = await tx.leaveRequest.update({
        where: { id },
        data: { status: newStatus as any },
        include: {
          approvals: {
            include: { approver: { select: { id: true, name: true } } },
            orderBy: { step: 'asc' },
          },
        },
      });

      // 최종 승인 시 잔여일수 차감
      if (newStatus === 'APPROVED') {
        const year = request.startDate.getFullYear();
        await tx.leaveBalance.update({
          where: {
            staffId_year_leaveTypeCode: {
              staffId: request.staffId,
              year,
              leaveTypeCode: request.leaveTypeCode,
            },
          },
          data: { usedDays: { increment: request.days } },
        });
      }

      return updated;
    });
  }

  async findPendingApprovals(approverUserId: string) {
    const pendingApprovals = await this.prisma.leaveApproval.findMany({
      where: {
        approverStaffId: approverUserId,
        status: 'PENDING',
        request: {
          status: { in: ['PENDING', 'TEAM_APPROVED'] },
        },
      },
      include: {
        request: {
          include: {
            staff: { select: { id: true, name: true, staffId: true, departmentId: true, teamId: true } },
            approvals: {
              include: {
                approver: { select: { id: true, name: true } },
              },
              orderBy: { step: 'asc' },
            },
          },
        },
      },
      orderBy: { request: { createdAt: 'desc' } },
    });

    return pendingApprovals.map((a) => a.request);
  }

  /**
   * 결재 단계 생성 로직
   * - 팀이 있으면: step 1 = 팀장, step 2 = 부서장
   * - 팀이 없으면: step 1 = 부서장
   */
  private async buildApprovalSteps(
    teamId: string | null,
    departmentId: string | null,
  ): Promise<{ step: number; approverStaffId: string }[]> {
    const steps: { step: number; approverStaffId: string }[] = [];

    // Step 1: 팀장 (팀이 있는 경우)
    if (teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
        select: { leaderId: true, departmentId: true },
      });

      if (team?.leaderId) {
        steps.push({ step: 1, approverStaffId: team.leaderId });
      }

      // 부서 ID가 없으면 팀의 부서 사용
      if (!departmentId && team) {
        departmentId = team.departmentId;
      }
    }

    // Step 2 (또는 Step 1 if 팀 없음): 부서장
    if (departmentId) {
      const deptHead = await this.prisma.staff.findFirst({
        where: {
          departmentId,
          isActive: true,
          OR: [
            { position: { contains: '부서장' } },
            { position: { contains: '팀장' } },
          ],
        },
        select: { id: true },
      });

      if (deptHead) {
        // 팀장과 같은 사람이면 중복 추가하지 않음
        const alreadyAdded = steps.some((s) => s.approverStaffId === deptHead.id);
        if (!alreadyAdded) {
          const nextStep = steps.length > 0 ? steps[steps.length - 1].step + 1 : 1;
          steps.push({ step: nextStep, approverStaffId: deptHead.id });
        }
      }
    }

    // 결재자가 없으면 관리자(isSuperAdmin) 배정
    if (steps.length === 0) {
      const admin = await this.prisma.staff.findFirst({
        where: { isSuperAdmin: true, isActive: true },
        select: { id: true },
      });

      if (admin) {
        steps.push({ step: 1, approverStaffId: admin.id });
      }
    }

    return steps;
  }
}
