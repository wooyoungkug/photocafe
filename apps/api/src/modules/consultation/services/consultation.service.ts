import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateConsultationDto,
  UpdateConsultationDto,
  UpdateConsultationStatusDto,
  ResolveConsultationDto,
  CreateFollowUpDto,
  ConsultationQueryDto,
  ConsultationStatus,
} from '../dto';

@Injectable()
export class ConsultationService {
  constructor(private prisma: PrismaService) {}

  private async generateConsultNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const lastConsultation = await this.prisma.consultation.findFirst({
      where: {
        consultNumber: {
          startsWith: `CS-${dateStr}`,
        },
      },
      orderBy: {
        consultNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastConsultation) {
      const lastSeq = parseInt(lastConsultation.consultNumber.split('-')[2], 10);
      sequence = lastSeq + 1;
    }

    return `CS-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  async findAll(query: ConsultationQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      clientId,
      categoryId,
      status,
      priority,
      counselorId,
      startDate,
      endDate,
    } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { consultNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { client: { clientName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (clientId) where.clientId = clientId;
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (counselorId) where.counselorId = counselorId;

    if (startDate || endDate) {
      where.consultedAt = {};
      if (startDate) where.consultedAt.gte = new Date(startDate);
      if (endDate) where.consultedAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.consultation.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              clientName: true,
              phone: true,
              mobile: true,
              email: true,
            },
          },
          category: true,
          _count: {
            select: { followUps: true },
          },
        },
        orderBy: { consultedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.consultation.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
            businessNumber: true,
            representative: true,
            phone: true,
            mobile: true,
            email: true,
            address: true,
            addressDetail: true,
          },
        },
        category: true,
        followUps: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException('상담 내역을 찾을 수 없습니다.');
    }

    return consultation;
  }

  async findByClient(clientId: string, limit = 10) {
    return this.prisma.consultation.findMany({
      where: { clientId },
      include: {
        category: true,
      },
      orderBy: { consultedAt: 'desc' },
      take: limit,
    });
  }

  async create(data: CreateConsultationDto) {
    const consultNumber = await this.generateConsultNumber();

    return this.prisma.consultation.create({
      data: {
        consultNumber,
        clientId: data.clientId || null,
        categoryId: data.categoryId,
        title: data.title,
        content: data.content,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        counselorId: data.counselorId,
        counselorName: data.counselorName,
        consultedAt: data.consultedAt ? new Date(data.consultedAt) : new Date(),
        status: data.status || ConsultationStatus.OPEN,
        priority: data.priority || 'normal',
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        followUpNote: data.followUpNote,
        kakaoScheduled: data.kakaoScheduled || false,
        kakaoSendAt: data.kakaoSendAt ? new Date(data.kakaoSendAt) : null,
        kakaoMessage: data.kakaoMessage,
        attachments: data.attachments,
        internalMemo: data.internalMemo,
      },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        category: true,
      },
    });
  }

  async update(id: string, data: UpdateConsultationDto) {
    await this.findOne(id);

    const updateData: any = { ...data };

    if (data.followUpDate) {
      updateData.followUpDate = new Date(data.followUpDate);
    }
    if (data.kakaoSendAt) {
      updateData.kakaoSendAt = new Date(data.kakaoSendAt);
    }

    return this.prisma.consultation.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        category: true,
      },
    });
  }

  async updateStatus(id: string, data: UpdateConsultationStatusDto) {
    await this.findOne(id);

    // 상태별 변경 이력 데이터 구성
    const statusHistoryData: Record<string, any> = {
      status: data.status,
    };

    const now = new Date();
    const updatedBy = data.updatedBy || null;

    switch (data.status) {
      case 'in_progress':
        statusHistoryData.inProgressAt = now;
        statusHistoryData.inProgressBy = updatedBy;
        break;
      case 'resolved':
        statusHistoryData.resolvedAt = now;
        statusHistoryData.resolvedBy = updatedBy;
        break;
      case 'closed':
        statusHistoryData.closedAt = now;
        statusHistoryData.closedBy = updatedBy;
        break;
    }

    return this.prisma.consultation.update({
      where: { id },
      data: statusHistoryData,
    });
  }

  async resolve(id: string, data: ResolveConsultationDto) {
    await this.findOne(id);

    return this.prisma.consultation.update({
      where: { id },
      data: {
        status: ConsultationStatus.RESOLVED,
        resolution: data.resolution,
        resolvedBy: data.resolvedBy,
        resolvedAt: new Date(),
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    return this.prisma.consultation.delete({
      where: { id },
    });
  }

  async addFollowUp(consultationId: string, data: CreateFollowUpDto) {
    await this.findOne(consultationId);

    return this.prisma.consultationFollowUp.create({
      data: {
        consultationId,
        content: data.content,
        actionType: data.actionType,
        staffId: data.staffId,
        staffName: data.staffName,
      },
    });
  }

  async getStats(startDate?: string, endDate?: string) {
    const where: any = {};

    if (startDate || endDate) {
      where.consultedAt = {};
      if (startDate) where.consultedAt.gte = new Date(startDate);
      if (endDate) where.consultedAt.lte = new Date(endDate);
    }

    const [
      total,
      byStatus,
      byCategory,
      byPriority,
    ] = await Promise.all([
      this.prisma.consultation.count({ where }),
      this.prisma.consultation.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.consultation.groupBy({
        by: ['categoryId'],
        where,
        _count: true,
      }),
      this.prisma.consultation.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
    ]);

    const categories = await this.prisma.consultationCategory.findMany();
    const categoryMap = new Map(categories.map((c: any) => [c.id, c]));

    return {
      total,
      byStatus: byStatus.map((item: any) => ({
        status: item.status,
        count: item._count,
      })),
      byCategory: byCategory.map((item: any) => ({
        categoryId: item.categoryId,
        category: categoryMap.get(item.categoryId),
        count: item._count,
      })),
      byPriority: byPriority.map((item: any) => ({
        priority: item.priority,
        count: item._count,
      })),
    };
  }
}
