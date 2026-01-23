import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateMessageDto,
  UpdateMessageDto,
  MessageQueryDto,
  MarkAsReadDto,
} from '../dto';

@Injectable()
export class ConsultationMessageService {
  constructor(private prisma: PrismaService) {}

  async findMessages(consultationId: string, query: MessageQueryDto) {
    const { page = 1, limit = 50, channel } = query;

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('상담을 찾을 수 없습니다.');
    }

    const where: any = { consultationId };
    if (channel) where.channel = channel;

    const [data, total] = await Promise.all([
      this.prisma.consultationMessage.findMany({
        where,
        orderBy: { messageAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.consultationMessage.count({ where }),
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
    const message = await this.prisma.consultationMessage.findUnique({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException('메시지를 찾을 수 없습니다.');
    }

    return message;
  }

  async create(consultationId: string, dto: CreateMessageDto) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('상담을 찾을 수 없습니다.');
    }

    return this.prisma.consultationMessage.create({
      data: {
        consultationId,
        direction: dto.direction,
        channel: dto.channel || 'kakao',
        content: dto.content,
        attachments: dto.attachments
          ? (dto.attachments as unknown as Prisma.InputJsonValue)
          : undefined,
        senderName: dto.senderName,
        senderType: dto.senderType,
        staffId: dto.staffId,
        staffName: dto.staffName,
        messageAt: dto.messageAt ? new Date(dto.messageAt) : new Date(),
      },
    });
  }

  async update(id: string, dto: UpdateMessageDto) {
    await this.findOne(id);

    const updateData: Prisma.ConsultationMessageUpdateInput = {};
    if (dto.content !== undefined) {
      updateData.content = dto.content;
    }
    if (dto.attachments !== undefined) {
      updateData.attachments = dto.attachments as unknown as Prisma.InputJsonValue;
    }

    return this.prisma.consultationMessage.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.consultationMessage.delete({
      where: { id },
    });
  }

  async markAsRead(consultationId: string, dto: MarkAsReadDto) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('상담을 찾을 수 없습니다.');
    }

    const where: any = {
      consultationId,
      isRead: false,
    };

    if (dto.messageIds && dto.messageIds.length > 0) {
      where.id = { in: dto.messageIds };
    }

    return this.prisma.consultationMessage.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadCount(consultationId: string) {
    return this.prisma.consultationMessage.count({
      where: {
        consultationId,
        isRead: false,
        direction: 'inbound',
      },
    });
  }
}
