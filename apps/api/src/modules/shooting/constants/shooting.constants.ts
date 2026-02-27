export const SHOOTING_STATUS = {
  DRAFT: 'draft',
  RECRUITING: 'recruiting',
  BIDDING: 'bidding',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const SHOOTING_TYPE = {
  WEDDING_MAIN: 'wedding_main',
  WEDDING_REHEARSAL: 'wedding_rehearsal',
  BABY_DOL: 'baby_dol',
  BABY_GROWTH: 'baby_growth',
  PROFILE: 'profile',
  OTHER: 'other',
} as const;

export const SHOOTING_TYPE_COLORS = {
  wedding_main: '#E11D48',
  wedding_rehearsal: '#F97316',
  baby_dol: '#8B5CF6',
  baby_growth: '#06B6D4',
  profile: '#10B981',
  other: '#6B7280',
} as const;

export const BID_STATUS = {
  PENDING: 'pending',
  SELECTED: 'selected',
  REJECTED: 'rejected',
} as const;

export const LOCATION_TYPE = {
  ARRIVAL: 'arrival',
  DEPARTURE: 'departure',
  CHECKPOINT: 'checkpoint',
} as const;

export const PHOTOGRAPHER_GRADE = {
  NEW: 'NEW',
  BRONZE: 'BRONZE',
  SILVER: 'SILVER',
  GOLD: 'GOLD',
  PLATINUM: 'PLATINUM',
} as const;

// 신뢰도 지수 가중치
export const RELIABILITY_WEIGHTS = {
  CUSTOMER_SATISFACTION: 0.40,
  ON_TIME_RATE: 0.25,
  COMPLETION_RATE: 0.20,
  EXPERIENCE: 0.15,
} as const;

// 등급 기준
export const GRADE_THRESHOLDS = {
  PLATINUM: 90,
  GOLD: 75,
  SILVER: 60,
  BRONZE: 40,
  NEW_MIN_SHOOTINGS: 5,
} as const;

// 지오펜싱 설정
export const GEOFENCING = {
  ARRIVAL_RADIUS_METERS: 200,
  DEPARTURE_RADIUS_METERS: 500,
} as const;

// 상태 전이 규칙
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['recruiting', 'cancelled'],
  recruiting: ['bidding', 'confirmed', 'cancelled'],
  bidding: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
