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
      openConsultationsCount.map((item: any) => [item.clientId, item._count])
    );

    const data = clients.map((client: any) => {
      const { password, ...rest } = client;
      return {
        ...rest,
        hasPassword: !!password,
        _count: {
          consultations: client._count.consultations,
          openConsultations: openCountMap.get(client.id) || 0,
        },
      };
    });

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

    const { password, ...clientData } = client;
    return { ...clientData, hasPassword: !!password };
  }

  async checkEmailDuplicate(email: string, excludeId?: string) {
    if (!email) return { exists: false };

    const existing = await this.prisma.client.findFirst({
      where: {
        email,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        clientCode: true,
        clientName: true,
        email: true,
        oauthProvider: true,
        memberType: true,
        status: true,
        createdAt: true,
        group: { select: { groupName: true } },
      },
    });

    if (!existing) return { exists: false };

    return {
      exists: true,
      member: {
        clientCode: existing.clientCode,
        clientName: existing.clientName,
        email: existing.email,
        oauthProvider: existing.oauthProvider,
        memberType: existing.memberType,
        status: existing.status,
        groupName: existing.group?.groupName || null,
        createdAt: existing.createdAt,
      },
    };
  }

  async create(data: Prisma.ClientCreateInput) {
    // 이메일 중복 체크
    if (data.email) {
      const dup = await this.checkEmailDuplicate(data.email);
      if (dup.exists) {
        throw new ConflictException('이미 등록된 이메일입니다');
      }
    }

    // 자동 그룹 할당: groupId도 없고 group도 없는 경우에만 자동 할당
    if (!data.group && !(data as any).groupId && data.memberType) {
      const groupName = data.memberType === 'individual' ? '일반고객그룹' : '스튜디오회원';
      const defaultGroup = await this.prisma.clientGroup.findFirst({
        where: { groupName },
      });

      if (defaultGroup) {
        data.group = { connect: { id: defaultGroup.id } };
      }
    }

    // groupId(스칼라)가 있으면 group 중첩 객체 제거 (Prisma XOR 충돌 방지)
    if ((data as any).groupId && data.group) {
      delete data.group;
    }

    return this.prisma.client.create({
      data,
      include: { group: true },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    } else {
      delete data.password;
    }

    const result = await this.prisma.client.update({
      where: { id },
      data,
      include: { group: true },
    });

    const { password, ...rest } = result;
    return { ...rest, hasPassword: !!password };
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

  // ==================== 사업자 전환 ====================
  async convertToBusiness(id: string, data: {
    clientName: string;
    businessNumber?: string;
    representative?: string;
    businessType?: string;
    businessCategory?: string;
    taxInvoiceEmail?: string;
    taxInvoiceMethod?: string;
  }) {
    const client = await this.findOne(id);

    if (client.memberType !== 'individual') {
      throw new ConflictException('이미 사업자 회원입니다');
    }

    // 사업자 전용 기본 그룹 조회
    const businessGroup = await this.prisma.clientGroup.findFirst({
      where: { groupName: '스튜디오회원' },
    });

    return this.prisma.client.update({
      where: { id },
      data: {
        memberType: 'business',
        clientName: data.clientName,
        businessNumber: data.businessNumber || null,
        representative: data.representative || null,
        businessType: data.businessType || null,
        businessCategory: data.businessCategory || null,
        taxInvoiceEmail: data.taxInvoiceEmail || null,
        taxInvoiceMethod: data.taxInvoiceMethod || null,
        ...(businessGroup && !client.groupId ? { groupId: businessGroup.id } : {}),
      },
      include: { group: true },
    });
  }
}
