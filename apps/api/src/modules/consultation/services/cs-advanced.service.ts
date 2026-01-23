import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateConsultationTagDto,
  UpdateConsultationTagDto,
  AddTagsToConsultationDto,
  CreateAlertDto,
  ResolveAlertDto,
  AlertQueryDto,
  CreateSLADto,
  UpdateSLADto,
  CustomerHealthScoreDto,
  CreateSurveyDto,
  CreateGuideDto,
  UpdateGuideDto,
  DashboardQueryDto,
  ClientTimelineQueryDto,
  CreateChannelLogDto,
  AlertType,
  AlertLevel,
} from '../dto';

@Injectable()
export class CSAdvancedService {
  constructor(private prisma: PrismaService) {}

  // ==================== 태그 관리 ====================

  async findAllTags(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;

    return this.prisma.consultationTag.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createTag(data: CreateConsultationTagDto) {
    const existing = await this.prisma.consultationTag.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 태그 코드입니다.');
    }

    return this.prisma.consultationTag.create({
      data: {
        code: data.code,
        name: data.name,
        colorCode: data.colorCode,
        category: data.category || 'claim',
        sortOrder: data.sortOrder || 0,
        isAutoTag: data.isAutoTag || false,
        keywords: data.keywords || [],
      },
    });
  }

  async updateTag(id: string, data: UpdateConsultationTagDto) {
    const tag = await this.prisma.consultationTag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('태그를 찾을 수 없습니다.');
    }

    return this.prisma.consultationTag.update({
      where: { id },
      data,
    });
  }

  async deleteTag(id: string) {
    const tag = await this.prisma.consultationTag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('태그를 찾을 수 없습니다.');
    }

    return this.prisma.consultationTag.delete({ where: { id } });
  }

  async addTagsToConsultation(consultationId: string, data: AddTagsToConsultationDto) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation) {
      throw new NotFoundException('상담 내역을 찾을 수 없습니다.');
    }

    const mappings = data.tagIds.map((tagId) => ({
      consultationId,
      tagId,
      isAutoTagged: false,
    }));

    await this.prisma.consultationTagMapping.createMany({
      data: mappings,
      skipDuplicates: true,
    });

    return this.getConsultationTags(consultationId);
  }

  async removeTagFromConsultation(consultationId: string, tagId: string) {
    await this.prisma.consultationTagMapping.deleteMany({
      where: { consultationId, tagId },
    });
  }

  async getConsultationTags(consultationId: string) {
    return this.prisma.consultationTagMapping.findMany({
      where: { consultationId },
      include: { tag: true },
    });
  }

  async autoTagConsultation(consultationId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation) {
      throw new NotFoundException('상담 내역을 찾을 수 없습니다.');
    }

    const autoTags = await this.prisma.consultationTag.findMany({
      where: { isAutoTag: true, isActive: true },
    });

    const contentLower = (consultation.title + ' ' + consultation.content).toLowerCase();
    const matchedTags: { tagId: string; confidence: number }[] = [];

    for (const tag of autoTags) {
      const keywords = tag.keywords as string[];
      if (keywords && keywords.length > 0) {
        let matchCount = 0;
        for (const keyword of keywords) {
          if (contentLower.includes(keyword.toLowerCase())) {
            matchCount++;
          }
        }
        if (matchCount > 0) {
          const confidence = Math.min(matchCount / keywords.length, 1);
          matchedTags.push({ tagId: tag.id, confidence });
        }
      }
    }

    if (matchedTags.length > 0) {
      await this.prisma.consultationTagMapping.createMany({
        data: matchedTags.map((t) => ({
          consultationId,
          tagId: t.tagId,
          isAutoTagged: true,
          confidence: t.confidence,
        })),
        skipDuplicates: true,
      });
    }

    return this.getConsultationTags(consultationId);
  }

  // ==================== 알림 관리 ====================

  async findAllAlerts(query: AlertQueryDto) {
    const { page = 1, limit = 20, alertType, alertLevel, isRead, isResolved, clientId } = query;

    const where: any = {};
    if (alertType) where.alertType = alertType;
    if (alertLevel) where.alertLevel = alertLevel;
    if (isRead !== undefined) where.isRead = isRead;
    if (isResolved !== undefined) where.isResolved = isResolved;
    if (clientId) where.clientId = clientId;

    // 만료되지 않은 알림만
    where.OR = [{ expiresAt: null }, { expiresAt: { gte: new Date() } }];

    const [data, total] = await Promise.all([
      this.prisma.consultationAlert.findMany({
        where,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.consultationAlert.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createAlert(data: CreateAlertDto) {
    return this.prisma.consultationAlert.create({
      data: {
        clientId: data.clientId,
        consultationId: data.consultationId,
        alertType: data.alertType,
        alertLevel: data.alertLevel || AlertLevel.WARNING,
        title: data.title,
        message: data.message,
        triggerCondition: data.triggerCondition,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  async markAlertAsRead(id: string, readBy: string) {
    const alert = await this.prisma.consultationAlert.findUnique({ where: { id } });
    if (!alert) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    return this.prisma.consultationAlert.update({
      where: { id },
      data: { isRead: true, readAt: new Date(), readBy },
    });
  }

  async resolveAlert(id: string, data: ResolveAlertDto) {
    const alert = await this.prisma.consultationAlert.findUnique({ where: { id } });
    if (!alert) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    return this.prisma.consultationAlert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: data.resolvedBy,
        resolution: data.resolution,
      },
    });
  }

  async getUnreadAlertCount() {
    return this.prisma.consultationAlert.count({
      where: {
        isRead: false,
        isResolved: false,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    });
  }

  // 반복 클레임 체크 및 알림 생성
  async checkRepeatClaims(clientId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentClaims = await this.prisma.consultation.count({
      where: {
        clientId,
        consultedAt: { gte: thirtyDaysAgo },
        category: {
          code: { startsWith: 'claim' },
        },
      },
    });

    if (recentClaims >= 3) {
      // 기존 알림이 있는지 확인
      const existingAlert = await this.prisma.consultationAlert.findFirst({
        where: {
          clientId,
          alertType: AlertType.REPEAT_CLAIM,
          isResolved: false,
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      if (!existingAlert) {
        const client = await this.prisma.client.findUnique({
          where: { id: clientId },
          select: { clientName: true, clientCode: true },
        });

        await this.createAlert({
          clientId,
          alertType: AlertType.REPEAT_CLAIM,
          alertLevel: AlertLevel.CRITICAL,
          title: '반복 클레임 발생',
          message: `${client?.clientName}(${client?.clientCode}) 고객이 최근 30일 내 ${recentClaims}건의 클레임을 접수했습니다. 집중 관리가 필요합니다.`,
          triggerCondition: { claimCount: recentClaims, period: '30days' },
        });
      }
    }
  }

  // ==================== SLA 관리 ====================

  async findAllSLAs() {
    return this.prisma.consultationSLA.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createSLA(data: CreateSLADto) {
    return this.prisma.consultationSLA.create({
      data: {
        name: data.name,
        categoryId: data.categoryId,
        priority: data.priority,
        firstResponseTarget: data.firstResponseTarget || 60,
        resolutionTarget: data.resolutionTarget || 1440,
        escalationTime: data.escalationTime,
        escalateTo: data.escalateTo,
        warningThreshold: data.warningThreshold || 80,
        criticalThreshold: data.criticalThreshold || 100,
      },
    });
  }

  async updateSLA(id: string, data: UpdateSLADto) {
    const sla = await this.prisma.consultationSLA.findUnique({ where: { id } });
    if (!sla) {
      throw new NotFoundException('SLA 설정을 찾을 수 없습니다.');
    }

    return this.prisma.consultationSLA.update({
      where: { id },
      data,
    });
  }

  async deleteSLA(id: string) {
    const sla = await this.prisma.consultationSLA.findUnique({ where: { id } });
    if (!sla) {
      throw new NotFoundException('SLA 설정을 찾을 수 없습니다.');
    }

    return this.prisma.consultationSLA.delete({ where: { id } });
  }

  // ==================== 고객 건강 점수 ====================

  async getCustomerHealthScore(clientId: string) {
    let healthScore = await this.prisma.customerHealthScore.findUnique({
      where: { clientId },
      include: {
        client: {
          select: { id: true, clientCode: true, clientName: true },
        },
      },
    });

    if (!healthScore) {
      // 자동 생성
      healthScore = await this.calculateAndSaveHealthScore(clientId);
    }

    return healthScore;
  }

  async calculateAndSaveHealthScore(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException('고객을 찾을 수 없습니다.');
    }

    // 클레임 점수 계산 (최근 90일 클레임 수 기반)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const claimCount = await this.prisma.consultation.count({
      where: {
        clientId,
        consultedAt: { gte: ninetyDaysAgo },
        category: { code: { startsWith: 'claim' } },
      },
    });
    const claimScore = Math.max(0, 100 - claimCount * 15);

    // 만족도 점수 (최근 설문 평균)
    // 먼저 해당 고객의 상담 ID 목록을 조회
    const clientConsultations = await this.prisma.consultation.findMany({
      where: { clientId },
      select: { id: true },
    });
    const consultationIds = clientConsultations.map((c: { id: string }) => c.id);

    const surveys = await this.prisma.consultationSurvey.findMany({
      where: {
        consultationId: { in: consultationIds },
      },
      orderBy: { surveyedAt: 'desc' },
      take: 5,
    });
    const satisfactionScore = surveys.length > 0
      ? Math.round(surveys.reduce((sum: number, s: any) => sum + s.satisfactionScore, 0) / surveys.length * 20)
      : 100;

    // 충성도 점수 (주문 횟수 기반)
    const orderCount = await this.prisma.order.count({
      where: { clientId },
    });
    const loyaltyScore = Math.min(100, orderCount * 5);

    // 소통 점수 (응답 속도)
    const communicationScore = 80; // 기본값

    // 총점 계산 (가중 평균)
    const totalScore = Math.round(
      claimScore * 0.3 +
      satisfactionScore * 0.3 +
      loyaltyScore * 0.2 +
      communicationScore * 0.2
    );

    // 등급 결정
    let grade = 'F';
    if (totalScore >= 90) grade = 'A';
    else if (totalScore >= 75) grade = 'B';
    else if (totalScore >= 60) grade = 'C';
    else if (totalScore >= 40) grade = 'D';

    // 위험 플래그
    const isAtRisk = totalScore < 50 || claimScore < 40;
    const riskReason = isAtRisk
      ? (claimScore < 40 ? '잦은 클레임 발생' : '전반적 건강 점수 저하')
      : null;

    return this.prisma.customerHealthScore.upsert({
      where: { clientId },
      update: {
        claimScore,
        satisfactionScore,
        loyaltyScore,
        communicationScore,
        totalScore,
        grade,
        isAtRisk,
        riskReason,
        lastCalculatedAt: new Date(),
      },
      create: {
        clientId,
        claimScore,
        satisfactionScore,
        loyaltyScore,
        communicationScore,
        totalScore,
        grade,
        isAtRisk,
        riskReason,
        lastCalculatedAt: new Date(),
      },
      include: {
        client: {
          select: { id: true, clientCode: true, clientName: true },
        },
      },
    });
  }

  async getAtRiskCustomers() {
    return this.prisma.customerHealthScore.findMany({
      where: { isAtRisk: true },
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
      },
      orderBy: { totalScore: 'asc' },
    });
  }

  // ==================== 만족도 조사 ====================

  async createSurvey(data: CreateSurveyDto) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: data.consultationId },
    });
    if (!consultation) {
      throw new NotFoundException('상담 내역을 찾을 수 없습니다.');
    }

    const survey = await this.prisma.consultationSurvey.create({
      data: {
        consultationId: data.consultationId,
        satisfactionScore: data.satisfactionScore,
        responseSpeedScore: data.responseSpeedScore,
        resolutionScore: data.resolutionScore,
        friendlinessScore: data.friendlinessScore,
        feedback: data.feedback,
        wouldRecommend: data.wouldRecommend,
        surveyMethod: data.surveyMethod || 'email',
      },
    });

    // 건강 점수 재계산
    await this.calculateAndSaveHealthScore(consultation.clientId);

    return survey;
  }

  async getSurveyStats(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.surveyedAt = {};
      if (startDate) where.surveyedAt.gte = new Date(startDate);
      if (endDate) where.surveyedAt.lte = new Date(endDate);
    }

    const surveys = await this.prisma.consultationSurvey.findMany({ where });

    if (surveys.length === 0) {
      return {
        count: 0,
        avgSatisfaction: 0,
        avgResponseSpeed: 0,
        avgResolution: 0,
        avgFriendliness: 0,
        recommendRate: 0,
      };
    }

    const count = surveys.length;
    const avgSatisfaction = surveys.reduce((sum: number, s: any) => sum + s.satisfactionScore, 0) / count;
    const speedScores = surveys.filter((s: any) => s.responseSpeedScore).map((s: any) => s.responseSpeedScore!);
    const avgResponseSpeed = speedScores.length > 0 ? speedScores.reduce((a: number, b: number) => a + b, 0) / speedScores.length : 0;
    const resolutionScores = surveys.filter((s: any) => s.resolutionScore).map((s: any) => s.resolutionScore!);
    const avgResolution = resolutionScores.length > 0 ? resolutionScores.reduce((a: number, b: number) => a + b, 0) / resolutionScores.length : 0;
    const friendlinessScores = surveys.filter((s: any) => s.friendlinessScore).map((s: any) => s.friendlinessScore!);
    const avgFriendliness = friendlinessScores.length > 0 ? friendlinessScores.reduce((a: number, b: number) => a + b, 0) / friendlinessScores.length : 0;
    const recommendCount = surveys.filter((s: any) => s.wouldRecommend === true).length;
    const recommendTotal = surveys.filter((s: any) => s.wouldRecommend !== null).length;
    const recommendRate = recommendTotal > 0 ? (recommendCount / recommendTotal) * 100 : 0;

    return {
      count,
      avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
      avgResponseSpeed: Math.round(avgResponseSpeed * 10) / 10,
      avgResolution: Math.round(avgResolution * 10) / 10,
      avgFriendliness: Math.round(avgFriendliness * 10) / 10,
      recommendRate: Math.round(recommendRate * 10) / 10,
    };
  }

  // ==================== 상담 가이드 ====================

  async findAllGuides(categoryId?: string, tagCodes?: string[]) {
    const where: any = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (tagCodes && tagCodes.length > 0) {
      where.tagCodes = { hasSome: tagCodes };
    }

    return this.prisma.consultationGuide.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async createGuide(data: CreateGuideDto) {
    return this.prisma.consultationGuide.create({
      data: {
        categoryId: data.categoryId,
        tagCodes: data.tagCodes || [],
        title: data.title,
        problem: data.problem,
        solution: data.solution,
        scripts: data.scripts,
        relatedGuideIds: data.relatedGuideIds || [],
        attachments: data.attachments,
      },
    });
  }

  async updateGuide(id: string, data: UpdateGuideDto) {
    const guide = await this.prisma.consultationGuide.findUnique({ where: { id } });
    if (!guide) {
      throw new NotFoundException('가이드를 찾을 수 없습니다.');
    }

    return this.prisma.consultationGuide.update({
      where: { id },
      data,
    });
  }

  async deleteGuide(id: string) {
    const guide = await this.prisma.consultationGuide.findUnique({ where: { id } });
    if (!guide) {
      throw new NotFoundException('가이드를 찾을 수 없습니다.');
    }

    return this.prisma.consultationGuide.delete({ where: { id } });
  }

  async incrementGuideUsage(id: string) {
    return this.prisma.consultationGuide.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  async markGuideHelpful(id: string) {
    return this.prisma.consultationGuide.update({
      where: { id },
      data: { helpfulCount: { increment: 1 } },
    });
  }

  // 상담 내용 기반 가이드 추천
  async recommendGuides(consultationId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { category: true },
    });
    if (!consultation) {
      throw new NotFoundException('상담 내역을 찾을 수 없습니다.');
    }

    // 태그 기반 가이드 조회
    const tags = await this.getConsultationTags(consultationId);
    const tagCodes = tags.map((t: any) => t.tag.code);

    // 카테고리 및 태그 기반 가이드 추천
    const guides = await this.prisma.consultationGuide.findMany({
      where: {
        isActive: true,
        OR: [
          { categoryId: consultation.categoryId },
          { tagCodes: { hasSome: tagCodes } },
        ],
      },
      orderBy: [{ usageCount: 'desc' }, { helpfulCount: 'desc' }],
      take: 5,
    });

    return guides;
  }

  // ==================== 대시보드/통계 ====================

  async getDashboardStats(query: DashboardQueryDto) {
    const { startDate, endDate, counselorId } = query;

    const where: any = {};
    if (startDate || endDate) {
      where.consultedAt = {};
      if (startDate) where.consultedAt.gte = new Date(startDate);
      if (endDate) where.consultedAt.lte = new Date(endDate);
    }
    if (counselorId) where.counselorId = counselorId;

    // 기본 통계
    const [
      totalCount,
      openCount,
      inProgressCount,
      resolvedCount,
      closedCount,
      urgentCount,
      unreadAlerts,
      atRiskCustomers,
    ] = await Promise.all([
      this.prisma.consultation.count({ where }),
      this.prisma.consultation.count({ where: { ...where, status: 'open' } }),
      this.prisma.consultation.count({ where: { ...where, status: 'in_progress' } }),
      this.prisma.consultation.count({ where: { ...where, status: 'resolved' } }),
      this.prisma.consultation.count({ where: { ...where, status: 'closed' } }),
      this.prisma.consultation.count({ where: { ...where, priority: 'urgent' } }),
      this.getUnreadAlertCount(),
      this.prisma.customerHealthScore.count({ where: { isAtRisk: true } }),
    ]);

    // 카테고리별 통계
    const byCategory = await this.prisma.consultation.groupBy({
      by: ['categoryId'],
      where,
      _count: true,
    });

    const categories = await this.prisma.consultationCategory.findMany();
    const categoryMap = new Map(categories.map((c: any) => [c.id, c]));

    // 오늘 상담
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.consultation.count({
      where: { ...where, consultedAt: { gte: today } },
    });

    // 평균 해결 시간
    const resolvedConsultations = await this.prisma.consultation.findMany({
      where: { ...where, status: 'resolved', resolvedAt: { not: null } },
      select: { consultedAt: true, resolvedAt: true },
    });

    let avgResolutionTime = 0;
    if (resolvedConsultations.length > 0) {
      const totalMinutes = resolvedConsultations.reduce((sum: number, c: any) => {
        const diff = (c.resolvedAt!.getTime() - c.consultedAt.getTime()) / (1000 * 60);
        return sum + diff;
      }, 0);
      avgResolutionTime = Math.round(totalMinutes / resolvedConsultations.length);
    }

    // 만족도 통계
    const surveyStats = await this.getSurveyStats(startDate, endDate);

    return {
      summary: {
        totalCount,
        todayCount,
        openCount,
        inProgressCount,
        resolvedCount,
        closedCount,
        urgentCount,
        unreadAlerts,
        atRiskCustomers,
        avgResolutionTime,
      },
      byCategory: byCategory.map((item: any) => ({
        categoryId: item.categoryId,
        category: categoryMap.get(item.categoryId),
        count: item._count,
      })),
      surveyStats,
    };
  }

  // 고객 타임라인
  async getClientTimeline(clientId: string, query: ClientTimelineQueryDto) {
    const { page = 1, limit = 20, eventTypes } = query;

    // 상담 이력
    const consultations = await this.prisma.consultation.findMany({
      where: { clientId },
      include: { category: true },
      orderBy: { consultedAt: 'desc' },
    });

    // 주문 이력
    const orders = await this.prisma.order.findMany({
      where: { clientId },
      select: {
        id: true,
        orderNumber: true,
        orderedAt: true,
        status: true,
        finalAmount: true,
      },
      orderBy: { orderedAt: 'desc' },
    });

    // 타임라인 통합
    const timeline: any[] = [];

    for (const c of consultations) {
      if (!eventTypes || eventTypes.includes('consultation') || eventTypes.includes(c.category?.code || '')) {
        timeline.push({
          type: 'consultation',
          id: c.id,
          date: c.consultedAt,
          title: c.title,
          status: c.status,
          priority: c.priority,
          category: c.category,
          data: c,
        });
      }
    }

    for (const o of orders) {
      if (!eventTypes || eventTypes.includes('order')) {
        timeline.push({
          type: 'order',
          id: o.id,
          date: o.orderedAt,
          title: `주문 ${o.orderNumber}`,
          status: o.status,
          data: o,
        });
      }
    }

    // 날짜순 정렬
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = timeline.length;
    const paginatedTimeline = timeline.slice((page - 1) * limit, page * limit);

    // 고객 정보
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        group: true,
        healthScore: true,
      },
    });

    // 통계 요약
    const stats = {
      totalConsultations: consultations.length,
      totalOrders: orders.length,
      claimCount: consultations.filter((c: any) => c.category?.code?.startsWith('claim')).length,
      lastOrderDate: orders[0]?.orderedAt,
      lastConsultationDate: consultations[0]?.consultedAt,
    };

    return {
      client,
      stats,
      timeline: paginatedTimeline,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== 채널 기록 ====================

  async createChannelLog(data: CreateChannelLogDto) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: data.consultationId },
    });
    if (!consultation) {
      throw new NotFoundException('상담 내역을 찾을 수 없습니다.');
    }

    return this.prisma.consultationChannel.create({
      data: {
        consultationId: data.consultationId,
        channel: data.channel,
        channelDetail: data.channelDetail,
        direction: data.direction || 'inbound',
        callDuration: data.callDuration,
        callRecordUrl: data.callRecordUrl,
        metadata: data.metadata,
      },
    });
  }

  async getChannelStats(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const byChannel = await this.prisma.consultationChannel.groupBy({
      by: ['channel'],
      where,
      _count: true,
    });

    const byDirection = await this.prisma.consultationChannel.groupBy({
      by: ['direction'],
      where,
      _count: true,
    });

    return {
      byChannel: byChannel.map((item: any) => ({
        channel: item.channel,
        count: item._count,
      })),
      byDirection: byDirection.map((item: any) => ({
        direction: item.direction,
        count: item._count,
      })),
    };
  }
}
