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

  async create(data: Prisma.ClientGroupCreateInput & { branchId?: string }) {
    // Check for duplicate groupCode
    const existing = await this.prisma.clientGroup.findUnique({
      where: { groupCode: data.groupCode },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 그룹 코드입니다');
    }

    // branchId가 없으면 본사(headquarters) 또는 첫 번째 브랜치 사용
    let branchId = (data as any).branchId;
    if (!branchId) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { isHeadquarters: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!defaultBranch) {
        const firstBranch = await this.prisma.branch.findFirst({
          orderBy: { createdAt: 'asc' },
        });
        branchId = firstBranch?.id;
      } else {
        branchId = defaultBranch.id;
      }
    }

    // 브랜치가 없으면 기본 브랜치 자동 생성
    if (!branchId) {
      const newBranch = await this.prisma.branch.create({
        data: {
          branchCode: 'HQ',
          branchName: '본사',
          isHeadquarters: true,
          isActive: true,
        },
      });
      branchId = newBranch.id;
    }

    // branch 연결 데이터 구성
    const createData: Prisma.ClientGroupCreateInput = {
      groupCode: data.groupCode,
      groupName: data.groupName,
      generalDiscount: data.generalDiscount,
      premiumDiscount: data.premiumDiscount,
      importedDiscount: data.importedDiscount,
      description: data.description,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      branch: {
        connect: { id: branchId },
      },
    };

    return this.prisma.clientGroup.create({
      data: createData,
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
