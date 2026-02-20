// ==================== 상담 관련 타입 ====================

export type ConsultationStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ConsultationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type FollowUpActionType = 'phone' | 'visit' | 'email' | 'kakao' | 'other';
export type AlertType = 'repeat_claim' | 'urgent' | 'sla_breach' | 'at_risk' | 'follow_up_due';
export type AlertLevel = 'info' | 'warning' | 'critical';

// 상담 분류
export interface ConsultationCategory {
  id: string;
  code: string;
  name: string;
  colorCode?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsultationCategoryDto {
  code: string;
  name: string;
  colorCode?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateConsultationCategoryDto = Partial<CreateConsultationCategoryDto>;

// 상담 태그
export interface ConsultationTag {
  id: string;
  code: string;
  name: string;
  colorCode?: string;
  category: 'claim' | 'inquiry' | 'sales';
  sortOrder: number;
  isActive: boolean;
  isAutoTag: boolean;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
}

// 상담 태그 매핑
export interface ConsultationTagMapping {
  id: string;
  consultationId: string;
  tagId: string;
  tag: ConsultationTag;
  isAutoTagged: boolean;
  confidence?: number;
  createdAt: string;
}

// 상담 후속 조치
export interface ConsultationFollowUp {
  id: string;
  consultationId: string;
  content: string;
  actionType: FollowUpActionType;
  staffId: string;
  staffName: string;
  createdAt: string;
}

// 상담 내역
export interface Consultation {
  id: string;
  consultNumber: string;
  clientId?: string | null;
  client?: {
    id: string;
    clientCode: string;
    clientName: string;
    phone?: string;
    mobile?: string;
    email?: string;
    businessNumber?: string;
    representative?: string;
    address?: string;
    addressDetail?: string;
  } | null;
  categoryId?: string | null;
  category?: ConsultationCategory | null;
  title?: string | null;
  content?: string | null;
  orderId?: string;
  orderNumber?: string;
  counselorId: string;
  counselorName: string;
  consultedAt: string;
  status: ConsultationStatus;
  priority: ConsultationPriority;
  // 상태 변경 이력
  openedAt?: string;
  openedBy?: string;
  inProgressAt?: string;
  inProgressBy?: string;
  closedAt?: string;
  closedBy?: string;
  // 해결 정보
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  followUpDate?: string;
  followUpNote?: string;
  kakaoScheduled: boolean;
  kakaoSendAt?: string;
  kakaoSentAt?: string;
  kakaoMessage?: string;
  attachments?: string[];
  internalMemo?: string;
  followUps: ConsultationFollowUp[];
  tags?: ConsultationTagMapping[];
  _count?: {
    followUps: number;
  };
  createdAt: string;
  updatedAt: string;
}

// 알림
export interface ConsultationAlert {
  id: string;
  clientId?: string;
  consultationId?: string;
  alertType: AlertType;
  alertLevel: AlertLevel;
  title: string;
  message: string;
  triggerCondition?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  readBy?: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  createdAt: string;
  expiresAt?: string;
}

// SLA 설정
export interface ConsultationSLA {
  id: string;
  name: string;
  categoryId?: string;
  priority?: string;
  firstResponseTarget: number;
  resolutionTarget: number;
  escalationTime?: number;
  escalateTo?: string;
  warningThreshold: number;
  criticalThreshold: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 고객 건강 점수
export interface CustomerHealthScore {
  id: string;
  clientId: string;
  client: {
    id: string;
    clientCode: string;
    clientName: string;
    phone?: string;
    mobile?: string;
    email?: string;
  };
  claimScore: number;
  satisfactionScore: number;
  loyaltyScore: number;
  communicationScore: number;
  totalScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  isAtRisk: boolean;
  riskReason?: string;
  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

// 만족도 조사
export interface ConsultationSurvey {
  id: string;
  consultationId: string;
  satisfactionScore: number;
  responseSpeedScore?: number;
  resolutionScore?: number;
  friendlinessScore?: number;
  feedback?: string;
  wouldRecommend?: boolean;
  surveyMethod: 'email' | 'kakao' | 'web' | 'phone';
  surveyedAt: string;
  createdAt: string;
}

// 상담 가이드
export interface ConsultationGuide {
  id: string;
  categoryId?: string;
  tagCodes: string[];
  title: string;
  problem: string;
  solution: string;
  scripts?: { step: number; text: string }[];
  relatedGuideIds: string[];
  attachments?: string[];
  usageCount: number;
  helpfulCount: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 채널 기록
export interface ConsultationChannel {
  id: string;
  consultationId: string;
  channel: 'phone' | 'kakao' | 'web' | 'email' | 'visit' | 'other';
  channelDetail?: string;
  direction: 'inbound' | 'outbound';
  callDuration?: number;
  callRecordUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ==================== DTO 타입 ====================

export interface CreateConsultationDto {
  clientId?: string;
  categoryId?: string;
  title?: string;
  content?: string;
  orderId?: string;
  orderNumber?: string;
  counselorId: string;
  counselorName: string;
  consultedAt?: string;
  status?: ConsultationStatus;
  priority?: ConsultationPriority;
  followUpDate?: string;
  followUpNote?: string;
  kakaoScheduled?: boolean;
  kakaoSendAt?: string;
  kakaoMessage?: string;
  attachments?: string[];
  internalMemo?: string;
}

export type UpdateConsultationDto = Partial<CreateConsultationDto>;

export interface CreateFollowUpDto {
  content: string;
  actionType: FollowUpActionType;
  staffId: string;
  staffName: string;
}

export interface CreateTagDto {
  code: string;
  name: string;
  colorCode?: string;
  category?: 'claim' | 'inquiry' | 'sales';
  sortOrder?: number;
  isAutoTag?: boolean;
  keywords?: string[];
}

export type UpdateTagDto = Partial<CreateTagDto> & { isActive?: boolean };

export interface CreateAlertDto {
  clientId?: string;
  consultationId?: string;
  alertType: AlertType;
  alertLevel?: AlertLevel;
  title: string;
  message: string;
  triggerCondition?: Record<string, any>;
  expiresAt?: string;
}

export interface ResolveAlertDto {
  resolvedBy: string;
  resolution?: string;
}

export interface CreateSLADto {
  name: string;
  categoryId?: string;
  priority?: string;
  firstResponseTarget?: number;
  resolutionTarget?: number;
  escalationTime?: number;
  escalateTo?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export type UpdateSLADto = Partial<CreateSLADto> & { isActive?: boolean };

export interface CreateSurveyDto {
  consultationId: string;
  satisfactionScore: number;
  responseSpeedScore?: number;
  resolutionScore?: number;
  friendlinessScore?: number;
  feedback?: string;
  wouldRecommend?: boolean;
  surveyMethod?: 'email' | 'kakao' | 'web' | 'phone';
}

export interface CreateGuideDto {
  categoryId?: string;
  tagCodes?: string[];
  title: string;
  problem: string;
  solution: string;
  scripts?: { step: number; text: string }[];
  relatedGuideIds?: string[];
  attachments?: string[];
}

export type UpdateGuideDto = Partial<CreateGuideDto> & { isActive?: boolean };

export interface CreateChannelLogDto {
  consultationId: string;
  channel: 'phone' | 'kakao' | 'web' | 'email' | 'visit' | 'other';
  channelDetail?: string;
  direction?: 'inbound' | 'outbound';
  callDuration?: number;
  callRecordUrl?: string;
  metadata?: Record<string, any>;
}

// ==================== 조회 쿼리 타입 ====================

export interface ConsultationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  clientId?: string;
  categoryId?: string;
  status?: ConsultationStatus;
  priority?: ConsultationPriority;
  counselorId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AlertQueryParams {
  page?: number;
  limit?: number;
  alertType?: AlertType;
  alertLevel?: AlertLevel;
  isRead?: boolean;
  isResolved?: boolean;
  clientId?: string;
}

export interface ClientTimelineQueryParams {
  page?: number;
  limit?: number;
  eventTypes?: string[];
}

// ==================== 응답 타입 ====================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  summary: {
    totalCount: number;
    todayCount: number;
    openCount: number;
    inProgressCount: number;
    resolvedCount: number;
    closedCount: number;
    urgentCount: number;
    unreadAlerts: number;
    atRiskCustomers: number;
    avgResolutionTime: number;
  };
  byCategory: {
    categoryId: string;
    category: ConsultationCategory;
    count: number;
  }[];
  surveyStats: SurveyStats;
}

export interface SurveyStats {
  count: number;
  avgSatisfaction: number;
  avgResponseSpeed: number;
  avgResolution: number;
  avgFriendliness: number;
  recommendRate: number;
}

export interface ClientTimeline {
  client: {
    id: string;
    clientCode: string;
    clientName: string;
    phone?: string;
    mobile?: string;
    email?: string;
    group?: {
      id: string;
      groupName: string;
    };
    healthScore?: CustomerHealthScore;
  };
  stats: {
    totalConsultations: number;
    totalOrders: number;
    claimCount: number;
    lastOrderDate?: string;
    lastConsultationDate?: string;
  };
  timeline: TimelineEvent[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TimelineEvent {
  type: 'consultation' | 'order';
  id: string;
  date: string;
  title: string;
  status: string;
  priority?: string;
  category?: ConsultationCategory;
  data: any;
}

export interface ChannelStats {
  byChannel: {
    channel: string;
    count: number;
  }[];
  byDirection: {
    direction: string;
    count: number;
  }[];
}
