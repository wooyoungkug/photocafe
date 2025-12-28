import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    groupId?: string;
    status?: string;
  }) {
    const { skip = 0, take = 20, search, groupId, status } = params;

    const where: Prisma.ClientWhereInput = {
      ...(search && {
        OR: [
          { clientName: { contains: search } },
          { clientCode: { contains: search } },
          { businessNumber: { contains: search } },
        ],
      }),
      ...(groupId && { groupId }),
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take,
        include: {
          group: {
            select: {
              id: true,
              groupName: true,
              groupCode: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
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
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        group: true,
        orders: {
          take: 10,
          orderBy: { orderedAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다');
    }

    return client;
  }

  async create(data: Prisma.ClientCreateInput) {
    return this.prisma.client.create({
      data,
      include: { group: true },
    });
  }

  async update(id: string, data: Prisma.ClientUpdateInput) {
    await this.findOne(id);

    return this.prisma.client.update({
      where: { id },
      data,
      include: { group: true },
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    return this.prisma.client.delete({
      where: { id },
    });
  }

  async updateGroup(id: string, groupId: string | null) {
    await this.findOne(id);

    return this.prisma.client.update({
      where: { id },
      data: { groupId },
      include: { group: true },
    });
  }
}
