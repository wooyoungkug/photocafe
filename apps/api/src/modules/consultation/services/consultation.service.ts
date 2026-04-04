import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SmsService } from '../../../common/sms/sms.service';
import { KakaoAlimtalkService } from '../../../common/kakao-alimtalk/kakao-alimtalk.service';
import {
  CreateConsultationDto,
  UpdateConsultationDto,
  UpdateConsultationStatusDto,
  ResolveConsultationDto,
  CreateFollowUpDto,
  ConsultationQueryDto,
  ConsultationStatus,
  SendStaffNotificationDto,
} from '../dto';

@Injectable()
export class ConsultationService {
  private readonly logger = new Logger(ConsultationService.name);

  constructor(
    private prisma: PrismaService,
    private smsService: SmsService,
    private kakaoAlimtalkService: KakaoAlimtalkService,
  ) {}

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
        categoryId: data.categoryId || null,
        title: data.title || null,
        content: data.content || null,
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
        statusChange: data.statusChange || null,
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

  /**
   * 직원에게 카카오톡(알림톡) / SMS 알림 전송
   * 1차: 카카오 알림톡 시도
   * 2차: SMS fallback
   * 3차: 이메일 fallback
   */
  async sendStaffNotification(dto: SendStaffNotificationDto) {
    const staffMembers = await this.prisma.staff.findMany({
      where: { id: { in: dto.staffIds }, isActive: true },
      select: { id: true, name: true, mobile: true, phone: true, email: true },
    });

    if (!staffMembers.length) {
      return { success: false, message: '수신할 직원이 없습니다.', results: [] };
    }

    const results: { staffId: string; name: string; method: string; success: boolean; error?: string }[] = [];

    // 카카오 알림톡이 설정되어 있으면 일괄 발송 시도
    if (this.kakaoAlimtalkService.isConfigured()) {
      const recipients = staffMembers
        .filter(s => s.mobile || s.phone)
        .map(s => ({
          phone: (s.mobile || s.phone)!,
          email: s.email || undefined,
          name: s.name,
        }));

      if (recipients.length > 0) {
        const alimtalkResult = await this.kakaoAlimtalkService.send({
          templateCode: 'KA01TP260404045313904q0sZXiilp8R',
          recipients,
          variables: { '#{내용}': dto.message },
          emailFallback: {
            subject: '[Printing114] CS 상담 알림',
            html: `<p>${dto.message.replace(/\n/g, '<br>')}</p>`,
          },
        });

        if (alimtalkResult.success) {
          staffMembers.forEach(s => {
            results.push({
              staffId: s.id,
              name: s.name,
              method: alimtalkResult.method,
              success: true,
            });
          });
          return { success: true, message: `${results.length}명에게 알림톡 전송 완료`, results };
        }
      }
    }

    // SMS fallback: 개별 발송
    if (this.smsService.isConfigured()) {
      for (const staff of staffMembers) {
        const phoneNumber = staff.mobile || staff.phone;
        if (!phoneNumber) {
          results.push({ staffId: staff.id, name: staff.name, method: 'none', success: false, error: '연락처 없음' });
          continue;
        }

        const smsResult = await this.smsService.sendSms(phoneNumber, dto.message);
        results.push({
          staffId: staff.id,
          name: staff.name,
          method: 'sms',
          success: smsResult.success,
          error: smsResult.error,
        });
      }

      const successCount = results.filter(r => r.success).length;
      return { success: successCount > 0, message: `${successCount}/${results.length}명 SMS 전송 완료`, results };
    }

    // 모두 미설정 시
    this.logger.warn('Solapi SMS/알림톡 미설정 상태입니다.');
    return {
      success: false,
      message: '알림 서비스가 설정되지 않았습니다. .env에 SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_NO를 설정하세요.',
      results: [],
    };
  }
}
