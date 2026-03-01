/**
 * 촬영유형 공용 상수 (일정관리 + 구인방 양쪽에서 사용)
 * 백엔드 shooting.constants.ts / recruitment.constants.ts와 동일한 값
 */

export const SHOOTING_TYPE = {
  WEDDING_MAIN: 'wedding_main',
  WEDDING_REHEARSAL: 'wedding_rehearsal',
  BABY_DOL: 'baby_dol',
  BABY_GROWTH: 'baby_growth',
  PROFILE: 'profile',
  OTHER: 'other',
} as const;

export type ShootingType = (typeof SHOOTING_TYPE)[keyof typeof SHOOTING_TYPE];

export const SHOOTING_TYPE_LABELS: Record<ShootingType, string> = {
  wedding_main: '본식 촬영',
  wedding_rehearsal: '리허설 촬영',
  baby_dol: '돌 촬영',
  baby_growth: '성장 촬영',
  profile: '프로필 촬영',
  other: '기타',
};

export const SHOOTING_TYPE_COLORS: Record<ShootingType, string> = {
  wedding_main: '#E11D48',
  wedding_rehearsal: '#F97316',
  baby_dol: '#8B5CF6',
  baby_growth: '#06B6D4',
  profile: '#10B981',
  other: '#6B7280',
};
