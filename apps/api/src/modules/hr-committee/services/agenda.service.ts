import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreateAgendaDto,
  AgendaQueryDto,
  UpdateAgendaStatusDto,
  CastVoteDto,
  MakeDecisionDto,
} from '../dto';

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AgendaQueryDto) {
    const { page = 1, limit = 20, committeeId, status, type } = query;

    const where: Prisma.HrAgendaWhereInput = {};
    if (committeeId) where.committeeId = committeeId;
    if (status) where.status = status;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.hrAgenda.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          committee: { select: { id: true, name: true } },
          targetStaff: { select: { id: true, name: true, position: true } },
          _count: { select: { votes: true } },
        },
      }),
      this.prisma.hrAgenda.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const agenda = await this.prisma.hrAgenda.findUnique({
      where: { id },
      include: {
        committee: {
          include: {
            members: {
              where: { releasedAt: null },
              include: {
                staff: { select: { id: true, name: true } },
              },
            },
          },
        },
        targetStaff: { select: { id: true, name: true, position: true, department: true } },
        votes: {
          include: {
            voter: { select: { id: true, name: true } },
          },
          orderBy: { votedAt: 'desc' },
        },
        decision: true,
      },
    });
    if (!agenda) {
      throw new NotFoundException(`안건 ID ${id}를 찾을 수 없습니다.`);
    }
    return agenda;
  }

  async create(dto: CreateAgendaDto, createdBy: string) {
    // 위원회 존재 확인
    const committee = await this.prisma.hrCommittee.findUnique({
      where: { id: dto.committeeId },
    });
    if (!committee) {
      throw new NotFoundException(`위원회 ID ${dto.committeeId}를 찾을 수 없습니다.`);
    }

    return this.prisma.hrAgenda.create({
      data: {
        ...dto,
        createdBy,
      },
      include: {
        committee: { select: { id: true, name: true } },
        targetStaff: { select: { id: true, name: true } },
      },
    });
  }

  async submit(id: string) {
    const agenda = await this.ensureExists(id);
    if (agenda.status !== 'DRAFT') {
      throw new BadRequestException('초안 상태의 안건만 제출할 수 있습니다.');
    }

    return this.prisma.hrAgenda.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async updateStatus(id: string, dto: UpdateAgendaStatusDto) {
    await this.ensureExists(id);

    return this.prisma.hrAgenda.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async castVote(agendaId: string, voterId: string, dto: CastVoteDto) {
    const agenda = await this.ensureExists(agendaId);

    if (agenda.status !== 'IN_REVIEW' && agenda.status !== 'SUBMITTED') {
      throw new BadRequestException('심의중 또는 제출 상태의 안건에만 투표할 수 있습니다.');
    }

    // 위원인지 확인
    const member = await this.prisma.hrCommitteeMember.findFirst({
      where: {
        committeeId: agenda.committeeId,
        staffId: voterId,
        releasedAt: null,
      },
    });
    if (!member) {
      throw new BadRequestException('해당 위원회의 위원만 투표할 수 있습니다.');
    }

    // 이미 투표했는지 확인
    const existingVote = await this.prisma.hrAgendaVote.findUnique({
      where: { agendaId_voterId: { agendaId, voterId } },
    });
    if (existingVote) {
      throw new ConflictException('이미 투표하셨습니다.');
    }

    // 투표 기록 및 자동 상태 전환
    return this.prisma.$transaction(async (tx) => {
      const vote = await tx.hrAgendaVote.create({
        data: {
          agendaId,
          voterId,
          vote: dto.vote,
          comment: dto.comment,
        },
        include: {
          voter: { select: { id: true, name: true } },
        },
      });

      // 모든 위원이 투표했는지 확인
      const activeMembers = await tx.hrCommitteeMember.count({
        where: {
          committeeId: agenda.committeeId,
          releasedAt: null,
        },
      });
      const voteCount = await tx.hrAgendaVote.count({
        where: { agendaId },
      });

      if (voteCount >= activeMembers) {
        await tx.hrAgenda.update({
          where: { id: agendaId },
          data: { status: 'VOTED' },
        });
      }

      return vote;
    });
  }

  async makeDecision(agendaId: string, dto: MakeDecisionDto) {
    const agenda = await this.ensureExists(agendaId);

    if (agenda.status !== 'VOTED') {
      throw new BadRequestException('투표완료 상태의 안건에만 결정을 기록할 수 있습니다.');
    }

    // 이미 결정 있는지 확인
    const existingDecision = await this.prisma.hrAgendaDecision.findUnique({
      where: { agendaId },
    });
    if (existingDecision) {
      throw new ConflictException('이미 결정이 기록된 안건입니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const decision = await tx.hrAgendaDecision.create({
        data: {
          agendaId,
          decision: dto.decision,
          summary: dto.summary,
          effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        },
      });

      await tx.hrAgenda.update({
        where: { id: agendaId },
        data: { status: 'CLOSED' },
      });

      return decision;
    });
  }

  private async ensureExists(id: string) {
    const agenda = await this.prisma.hrAgenda.findUnique({ where: { id } });
    if (!agenda) {
      throw new NotFoundException(`안건 ID ${id}를 찾을 수 없습니다.`);
    }
    return agenda;
  }
}
