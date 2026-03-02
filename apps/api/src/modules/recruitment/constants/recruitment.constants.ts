export const RECRUITMENT_STATUS = {
  DRAFT: 'draft',
  PRIVATE_RECRUITING: 'private_recruiting',
  PUBLIC_RECRUITING: 'public_recruiting',
  FILLED: 'filled',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export const RECRUITMENT_PHASE = {
  PRIVATE: 'private',
  PUBLIC: 'public',
} as const;

export const RECRUITMENT_BID_STATUS = {
  PENDING: 'pending',
  SELECTED: 'selected',
  REJECTED: 'rejected',
} as const;

export const URGENCY_LEVEL = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  EMERGENCY: 'emergency',
} as const;

/** 촬영 유형 (기존 shooting constants와 동일) */
export const SHOOTING_TYPE = {
  WEDDING_MAIN: 'wedding_main',
  WEDDING_REHEARSAL: 'wedding_rehearsal',
  BABY_DOL: 'baby_dol',
  BABY_GROWTH: 'baby_growth',
  PROFILE: 'profile',
  OTHER: 'other',
} as const;

export const SHOOTING_TYPE_LABELS: Record<string, string> = {
  wedding_main: '본식 촬영',
  wedding_rehearsal: '리허설 촬영',
  baby_dol: '돌 촬영',
  baby_growth: '성장 촬영',
  profile: '프로필 촬영',
  other: '기타',
};

/** 상태 전이 규칙 */
export const RECRUITMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['private_recruiting', 'public_recruiting', 'cancelled'],
  private_recruiting: ['public_recruiting', 'filled', 'cancelled'],
  public_recruiting: ['filled', 'cancelled'],
  filled: ['cancelled'],
  expired: [],
  cancelled: [],
};

/** 긴급도 계산 기준 (일) */
export const URGENCY_THRESHOLDS = {
  EMERGENCY_DAYS: 1,
  URGENT_DAYS: 3,
} as const;

/** 카카오 알림톡 템플릿 코드 */
export const ALIMTALK_TEMPLATES = {
  PRIVATE_RECRUITING: 'RECRUIT_PRIVATE',
  PUBLIC_RECRUITING: 'RECRUIT_PUBLIC',
  BID_SELECTED: 'RECRUIT_SELECTED',
  BID_REJECTED: 'RECRUIT_REJECTED',
  DEADLINE_REMINDER: 'RECRUIT_REMINDER',
} as const;
