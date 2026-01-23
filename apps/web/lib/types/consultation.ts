export type ConsultationStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ConsultationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type FollowUpActionType = 'phone' | 'visit' | 'email' | 'kakao' | 'other';

export interface ConsultationCategory {
  id: string;
  code: string;
  name: string;
  colorCode?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    consultations: number;
  };
}

export interface ConsultationClient {
  id: string;
  clientCode: string;
  clientName: string;
  businessNumber?: string;
  representative?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  addressDetail?: string;
}

export interface ConsultationFollowUp {
  id: string;
  consultationId: string;
  content: string;
  actionType: FollowUpActionType;
  staffId: string;
  staffName: string;
  createdAt: string;
}

export interface Consultation {
  id: string;
  consultNumber: string;
  clientId: string;
  client: ConsultationClient;
  categoryId: string;
  category: ConsultationCategory;
  title: string;
  content: string;
  orderId?: string;
  orderNumber?: string;
  counselorId: string;
  counselorName: string;
  consultedAt: string;
  status: ConsultationStatus;
  priority: ConsultationPriority;
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
  createdAt: string;
  updatedAt: string;
  followUps?: ConsultationFollowUp[];
  _count?: {
    followUps: number;
  };
}

export interface CreateConsultationDto {
  clientId: string;
  categoryId: string;
  title: string;
  content: string;
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

export interface UpdateConsultationDto {
  categoryId?: string;
  title?: string;
  content?: string;
  orderId?: string;
  orderNumber?: string;
  status?: ConsultationStatus;
  priority?: ConsultationPriority;
  resolution?: string;
  followUpDate?: string;
  followUpNote?: string;
  kakaoScheduled?: boolean;
  kakaoSendAt?: string;
  kakaoMessage?: string;
  attachments?: string[];
  internalMemo?: string;
}

export interface CreateConsultationCategoryDto {
  code: string;
  name: string;
  colorCode?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateConsultationCategoryDto {
  code?: string;
  name?: string;
  colorCode?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateFollowUpDto {
  content: string;
  actionType: FollowUpActionType;
  staffId: string;
  staffName: string;
}

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

export interface ConsultationStats {
  total: number;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
  byCategory: Array<{
    categoryId: string;
    category?: ConsultationCategory;
    count: number;
  }>;
  byPriority: Array<{
    priority: string;
    count: number;
  }>;
}

// 상담 분류별 색상 매핑
export const CONSULTATION_CATEGORY_COLORS: Record<string, string> = {
  red: 'bg-red-100 text-red-800 border-red-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  pink: 'bg-pink-100 text-pink-800 border-pink-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
};

// 상담 상태별 색상/레이블
export const CONSULTATION_STATUS_CONFIG: Record<ConsultationStatus, { label: string; color: string }> = {
  open: { label: '접수', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: '처리중', color: 'bg-yellow-100 text-yellow-800' },
  resolved: { label: '해결', color: 'bg-green-100 text-green-800' },
  closed: { label: '종료', color: 'bg-gray-100 text-gray-800' },
};

// 우선순위별 색상/레이블
export const CONSULTATION_PRIORITY_CONFIG: Record<ConsultationPriority, { label: string; color: string }> = {
  low: { label: '낮음', color: 'text-gray-500' },
  normal: { label: '보통', color: 'text-blue-500' },
  high: { label: '높음', color: 'text-orange-500' },
  urgent: { label: '긴급', color: 'text-red-500' },
};

// 후속 조치 유형별 레이블
export const FOLLOW_UP_ACTION_TYPE_CONFIG: Record<FollowUpActionType, { label: string; icon: string }> = {
  phone: { label: '전화', icon: 'Phone' },
  visit: { label: '방문', icon: 'MapPin' },
  email: { label: '이메일', icon: 'Mail' },
  kakao: { label: '카카오톡', icon: 'MessageSquare' },
  other: { label: '기타', icon: 'MoreHorizontal' },
};

// ==================== 상담 메시지 ====================

export type MessageChannel = 'kakao' | 'phone' | 'email' | 'web';
export type MessageDirection = 'inbound' | 'outbound';

export interface ConsultationMessage {
  id: string;
  consultationId: string;
  direction: MessageDirection;
  channel: MessageChannel;
  content: string;
  attachments?: any[];
  senderName?: string;
  senderType?: 'customer' | 'staff' | 'client';
  staffId?: string;
  staffName?: string;
  messageAt: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface CreateMessageDto {
  direction: MessageDirection;
  channel?: MessageChannel;
  content: string;
  attachments?: any[];
  senderName?: string;
  senderType?: 'customer' | 'staff' | 'client';
  staffId?: string;
  staffName?: string;
  messageAt?: string;
}

export interface UpdateMessageDto {
  content?: string;
  attachments?: any[];
}

export const MESSAGE_CHANNEL_CONFIG: Record<MessageChannel, { label: string; icon: string; color: string }> = {
  kakao: { label: '카카오톡', icon: 'MessageSquare', color: 'bg-yellow-100 text-yellow-800' },
  phone: { label: '전화', icon: 'Phone', color: 'bg-green-100 text-green-800' },
  email: { label: '이메일', icon: 'Mail', color: 'bg-blue-100 text-blue-800' },
  web: { label: '웹', icon: 'Globe', color: 'bg-gray-100 text-gray-800' },
};
