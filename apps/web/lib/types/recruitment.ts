export type RecruitmentStatus =
  | 'draft'
  | 'private_recruiting'
  | 'public_recruiting'
  | 'filled'
  | 'expired'
  | 'cancelled';

export type RecruitmentPhase = 'private' | 'public';

export type UrgencyLevel = 'normal' | 'urgent' | 'emergency';

export type RecruitmentBidStatus = 'pending' | 'selected' | 'rejected';

// 공용 상수에서 import & re-export
import type { ShootingType } from '@/lib/constants/shooting-types';
export type { ShootingType };
export { SHOOTING_TYPE_LABELS } from '@/lib/constants/shooting-types';

export const RECRUITMENT_STATUS_LABELS: Record<RecruitmentStatus, string> = {
  draft: '초안',
  private_recruiting: '전속 모집중',
  public_recruiting: '공개 모집중',
  filled: '확정',
  expired: '만료',
  cancelled: '취소',
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  normal: '일반',
  urgent: '긴급',
  emergency: '급구',
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  normal: '#6B7280',
  urgent: '#F97316',
  emergency: '#EF4444',
};

export interface Recruitment {
  id: string;
  clientId: string;
  title: string;
  shootingType: ShootingType;
  shootingDate: string;
  shootingTime?: string;
  duration?: number;
  venueName: string;
  venueAddress?: string;
  latitude?: number;
  longitude?: number;
  budget?: number;
  description?: string;
  requirements?: string;
  customerName?: string;
  status: RecruitmentStatus;
  recruitmentPhase: RecruitmentPhase;
  privateDeadline?: string;
  maxBidders: number;
  urgencyLevel: UrgencyLevel;
  linkedShootingId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  client: {
    clientName: string;
    profileImage?: string;
    phone?: string;
    email?: string;
  };
  _count: {
    bids: number;
  };
  bids?: RecruitmentBid[];
}

export interface RecruitmentBid {
  id: string;
  recruitmentId: string;
  bidderId: string;
  message?: string;
  proposedBudget?: number;
  status: RecruitmentBidStatus;
  bidAt: string;
  bidder: {
    clientName: string;
    profileImage?: string;
    phone?: string;
    mobile?: string;
    email?: string;
  };
}

export interface CreateRecruitmentInput {
  title: string;
  shootingType: ShootingType;
  shootingDate: string;
  shootingTime?: string;
  duration?: number;
  venueName: string;
  venueAddress?: string;
  latitude?: number;
  longitude?: number;
  budget?: number;
  description?: string;
  requirements?: string;
  customerName?: string;
  maxBidders?: number;
  privateDeadlineHours?: number;
}

export interface UpdateRecruitmentInput {
  title?: string;
  shootingType?: ShootingType;
  shootingDate?: string;
  shootingTime?: string;
  duration?: number;
  venueName?: string;
  venueAddress?: string;
  latitude?: number;
  longitude?: number;
  budget?: number;
  description?: string;
  requirements?: string;
  customerName?: string;
}

export interface RecruitmentQueryParams {
  clientId?: string;
  status?: RecruitmentStatus;
  shootingType?: ShootingType;
  phase?: RecruitmentPhase;
  urgencyLevel?: UrgencyLevel;
  startDate?: string;
  endDate?: string;
  publicOnly?: string;
  page?: number;
  limit?: number;
  sort?: 'latest' | 'deadline' | 'budget_high' | 'budget_low';
}

export interface CreateBidInput {
  message?: string;
  proposedBudget?: number;
}

export interface PhotographerProfile {
  id: string;
  clientId: string;
  preferredRegion1?: string;
  preferredRegion2?: string;
  preferredRegion3?: string;
  introduction?: string;
  career?: string;
  careerYears?: number;
  portfolioImages: string[];
  specialties: string[];
  equipment?: string;
  isAvailableForPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLogEntry {
  id: string;
  recruitmentId: string;
  recipientId: string;
  regionTier: number;
  matchedRegion?: string;
  channel: string;
  status: string;
  sentAt: string;
  recipient?: {
    clientName: string;
    email?: string;
  };
}

export interface NotificationLogResponse {
  summary: {
    total: number;
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    sentCount: number;
    failedCount: number;
  };
  logs: NotificationLogEntry[];
}
