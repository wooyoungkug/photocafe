import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreateCommitteeDto,
  UpdateCommitteeDto,
  AddMemberDto,
  CommitteeQueryDto,
} from '../dto';

@Injectable()
export class CommitteeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: CommitteeQueryDto) {
    const { page = 1, limit = 20, search, status } = query;

    const where: Prisma.HrCommitteeWhereInput = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.hrCommittee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          members: {
            include: {
              staff: { select: { id: true, name: true, position: true } },
            },
            where: { releasedAt: null },
          },
          _count: { select: { agendas: true } },
        },
      }),
      this.prisma.hrCommittee.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const committee = await this.prisma.hrCommittee.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            staff: { select: { id: true, name: true, position: true, department: true } },
          },
          orderBy: { appointedAt: 'desc' },
        },
        agendas: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            type: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    if (!committee) {
      throw new NotFoundException(`위원회 ID ${id}를 찾을 수 없습니다.`);
    }
    return committee;
  }

  async create(dto: CreateCommitteeDto) {
    return this.prisma.hrCommittee.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateCommitteeDto) {
    await this.ensureExists(id);
    return this.prisma.hrCommittee.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.hrCommittee.delete({ where: { id } });
  }

  async addMember(committeeId: string, dto: AddMemberDto) {
    await this.ensureExists(committeeId);

    const exists = await this.prisma.hrCommitteeMember.findUnique({
      where: { committeeId_staffId: { committeeId, staffId: dto.staffId } },
    });
    if (exists && !exists.releasedAt) {
      throw new ConflictException('이미 해당 위원회에 소속된 위원입니다.');
    }

    // 기존에 해임된 기록이 있으면 삭제 후 재등록
    if (exists) {
      await this.prisma.hrCommitteeMember.delete({ where: { id: exists.id } });
    }

    return this.prisma.hrCommitteeMember.create({
      data: {
        committeeId,
        staffId: dto.staffId,
        role: dto.role || 'MEMBER',
      },
      include: {
        staff: { select: { id: true, name: true, position: true } },
      },
    });
  }

  async removeMember(committeeId: string, memberId: string) {
    const member = await this.prisma.hrCommitteeMember.findFirst({
      where: { id: memberId, committeeId },
    });
    if (!member) {
      throw new NotFoundException(`위원 ID ${memberId}를 찾을 수 없습니다.`);
    }

    return this.prisma.hrCommitteeMember.update({
      where: { id: memberId },
      data: { releasedAt: new Date() },
    });
  }

  private async ensureExists(id: string) {
    const committee = await this.prisma.hrCommittee.findUnique({ where: { id } });
    if (!committee) {
      throw new NotFoundException(`위원회 ID ${id}를 찾을 수 없습니다.`);
    }
    return committee;
  }
}
