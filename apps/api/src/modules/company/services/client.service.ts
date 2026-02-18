import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) { }

  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    groupId?: string;
    status?: string;
    memberType?: string;
  }) {
    const { skip = 0, take = 20, search, groupId, status, memberType } = params;

    const where: Prisma.ClientWhereInput = {
      ...(search && {
        OR: [
          { clientName: { contains: search } },
          { clientCode: { contains: search } },
          { businessNumber: { contains: search } },
          { email: { contains: search } },
        ],
      }),
      ...(groupId && { groupId }),
      ...(status && { status }),
      ...(memberType && { memberType }),
    };

    const [clients, total] = await Promise.all([
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
          assignedStaff: {
            include: {
              staff: {
                select: {
                  id: true,
                  name: true,
                  staffId: true,
                  position: true,
                },
              },
            },
            orderBy: [
              { isPrimary: 'desc' },
              { createdAt: 'asc' },
            ],
          },
          _count: {
            select: {
              consultations: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    // 미완료 상담 건수 계산
    const clientIds = clients.map((c: { id: string }) => c.id);
    const openConsultationsCount = await this.prisma.consultation.groupBy({
      by: ['clientId'],
      where: {
        clientId: { in: clientIds },
        status: { in: ['open', 'in_progress'] },
      },
      _count: true,
    });

    const openCountMap = new Map(
      openConsultationsCount.map((item: { clientId: string; _count: number }) => [item.clientId, item._count])
    );

    const data = clients.map((client: any) => ({
      ...client,
      _count: {
        consultations: client._count.consultations,
        openConsultations: openCountMap.get(client.id) || 0,
      },
    }));

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
        assignedStaff: {
          include: {
            staff: {
              select: {
                id: true,
                name: true,
                staffId: true,
                position: true,
                departmentId: true,
              },
            },
          },
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' },
          ],
        },
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
    // 자동 그룹 할당: group이 없고 memberType이 있는 경우
    if (!data.group && data.memberType) {
      const groupName = data.memberType === 'individual' ? '일반고객그룹' : '스튜디오회원';
      const defaultGroup = await this.prisma.clientGroup.findFirst({
        where: { groupName },
      });

      if (defaultGroup) {
        data.group = { connect: { id: defaultGroup.id } };
      }
    }

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

  async getNextClientCode(): Promise<string> {
    // M0001 형식으로 다음 코드 생성
    const lastClient = await this.prisma.client.findFirst({
      where: {
        clientCode: {
          startsWith: 'M',
        },
      },
      orderBy: {
        clientCode: 'desc',
      },
      select: {
        clientCode: true,
      },
    });

    if (!lastClient) {
      return 'M0001';
    }

    // M0001에서 숫자 부분 추출
    const match = lastClient.clientCode.match(/^M(\d+)$/);
    if (!match) {
      return 'M0001';
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `M${nextNumber.toString().padStart(4, '0')}`;
  }

  // ==================== 영업담당자 할당 ====================
  async assignStaff(clientId: string, staffIds: string[], primaryStaffId?: string) {
    await this.findOne(clientId);

    // 기존 할당 제거
    await this.prisma.staffClient.deleteMany({
      where: { clientId },
    });

    // 새로운 담당자 할당
    if (staffIds.length > 0) {
      await this.prisma.staffClient.createMany({
        data: staffIds.map(staffId => ({
          clientId,
          staffId,
          isPrimary: staffId === primaryStaffId,
        })),
      });
    }

    return this.findOne(clientId);
  }

  async removeStaff(clientId: string, staffId: string) {
    await this.findOne(clientId);

    await this.prisma.staffClient.deleteMany({
      where: {
        clientId,
        staffId,
      },
    });

    return this.findOne(clientId);
  }
}
