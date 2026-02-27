'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ==================== 타입 정의 ====================

/** 리뷰 항목 점수 */
export interface ReviewRating {
  punctuality: number; // 시간 준수 (1~5)
  professionalism: number; // 전문성 (1~5)
  communication: number; // 소통 (1~5)
  quality: number; // 결과물 품질 (1~5)
  overall: number; // 종합 점수 (1~5)
}

/** 촬영 리뷰 */
export interface ShootingReview {
  id: string;
  shootingId: string;
  photographerId: string;
  photographerName?: string;
  reviewerId?: string;
  reviewerName?: string;
  rating: ReviewRating;
  comment?: string;
  isAnonymous: boolean;
  token?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** 토큰 기반 설문 정보 (외부 링크 접근용) */
export interface ReviewByToken {
  shooting: {
    id: string;
    title: string;
    type: string;
    scheduledDate: string;
    location?: string;
  };
  photographer: {
    id: string;
    name: string;
    profileImage?: string;
  };
  isSubmitted: boolean;
  expiresAt?: string;
}

/** 리뷰 제출 DTO */
export interface SubmitReviewDto {
  rating: ReviewRating;
  comment?: string;
  isAnonymous?: boolean;
}

/** 설문 이메일 발송 DTO */
export interface SendReviewEmailDto {
  recipientEmail?: string;
  customMessage?: string;
}

/** 설문 이메일 발송 결과 */
export interface SendReviewEmailResult {
  success: boolean;
  token: string;
  expiresAt: string;
  sentTo: string;
}

// ==================== Query Keys ====================

const SHOOTINGS_KEY = 'shootings';
const REVIEW_KEY = 'review';
const REVIEWS_KEY = 'reviews';

// ==================== Hooks ====================

/** 촬영 리뷰 조회 */
export function useShootingReview(shootingId: string) {
  return useQuery({
    queryKey: [SHOOTINGS_KEY, shootingId, REVIEW_KEY],
    queryFn: () => api.get<ShootingReview>(`/shootings/${shootingId}/review`),
    enabled: !!shootingId,
  });
}

/** 토큰으로 설문 정보 조회 (비로그인 외부 접근) */
export function useReviewByToken(token: string) {
  return useQuery({
    queryKey: [REVIEWS_KEY, token],
    queryFn: () => api.get<ReviewByToken>(`/reviews/${token}`),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
}

/** 설문 제출 (토큰 기반) */
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token, ...data }: { token: string } & SubmitReviewDto) =>
      api.post<ShootingReview>(`/reviews/${token}`, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: [REVIEWS_KEY, variables.token] });
      // 촬영 리뷰 캐시도 갱신
      if (result?.shootingId) {
        queryClient.invalidateQueries({
          queryKey: [SHOOTINGS_KEY, result.shootingId, REVIEW_KEY],
        });
      }
      // 작가 통계 캐시도 갱신
      if (result?.photographerId) {
        queryClient.invalidateQueries({
          queryKey: ['photographers', result.photographerId, 'stats'],
        });
      }
    },
  });
}

/** 설문 이메일 발송 */
export function useSendReviewEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shootingId,
      ...data
    }: { shootingId: string } & SendReviewEmailDto) =>
      api.post<SendReviewEmailResult>(
        `/shootings/${shootingId}/review/send`,
        data,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SHOOTINGS_KEY, variables.shootingId, REVIEW_KEY],
      });
    },
  });
}
