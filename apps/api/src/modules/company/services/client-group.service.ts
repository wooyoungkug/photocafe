import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientGroupService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    branchId?: string;
    isActive?: boolean;
  }) {
    const { skip = 0, take = 20, search, branchId, isActive } = params;

    const where: Prisma.ClientGroupWhereInput = {
      ...(search && {
        OR: [
          { groupName: { contains: search } },
          { groupCode: { contains: search } },
        ],
      }),
      ...(branchId && { branchId }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.clientGroup.findMany({
        where,
        skip,
        take,
        include: {
          branch: {
            select: {
              id: true,
              branchName: true,
            },
          },
          _count: {
            select: { clients: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.clientGroup.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const group = await this.prisma.clientGroup.findUnique({
      where: { id },
      include: {
        branch: true,
        clients: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
            status: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('거래처 그룹을 찾을 수 없습니다');
    }

    return group;
  }

  async create(data: Prisma.ClientGroupCreateInput) {
    // Check for duplicate groupCode
    const existing = await this.prisma.clientGroup.findUnique({
      where: { groupCode: data.groupCode },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 그룹 코드입니다');
    }

    return this.prisma.clientGroup.create({
      data,
      include: { branch: true },
    });
  }

  async update(id: string, data: Prisma.ClientGroupUpdateInput) {
    await this.findOne(id);

    return this.prisma.clientGroup.update({
      where: { id },
      data,
      include: { branch: true },
    });
  }

  async delete(id: string) {
    const group = await this.findOne(id);

    // Check if group has clients
    if (group.clients.length > 0) {
      throw new ConflictException('소속 거래처가 있는 그룹은 삭제할 수 없습니다');
    }

    return this.prisma.clientGroup.delete({
      where: { id },
    });
  }

  async getClients(id: string) {
    await this.findOne(id);

    return this.prisma.client.findMany({
      where: { groupId: id },
      orderBy: { clientName: 'asc' },
    });
  }
}
