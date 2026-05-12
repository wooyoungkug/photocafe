'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, API_URL } from '@/lib/api';

const KEY = ['business-upgrade', 'me'];

export type BusinessUpgradeStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface BusinessUpgradeStatusResponse {
  status: BusinessUpgradeStatus;
  submittedAt?: string;
  rejectReason?: string;
  businessNumber?: string;
  representative?: string;
  businessType?: string;
  businessCategory?: string;
  taxInvoiceEmail?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
}

export interface SubmitBusinessUpgradeBody {
  businessNumber: string;
  representative: string;
  businessType?: string;
  businessCategory?: string;
  taxInvoiceEmail?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  contactPerson?: string;
  contactPhone?: string;
  paymentContactName?: string;
  paymentContactPhone?: string;
  certUploadKey: string;
}

export function useBusinessUpgradeStatus(enabled = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<BusinessUpgradeStatusResponse>('/clients/me/business-upgrade'),
    enabled,
  });
}

/** 사업자등록증 파일 업로드 → uploadKey 반환 */
export function useUploadBusinessCert() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      // 대리로그인 탭은 Bearer 토큰 사용
      let impersonateAuth: Record<string, string> = {};
      if (typeof window !== 'undefined') {
        try {
          if (sessionStorage.getItem('impersonate-session')) {
            const raw = sessionStorage.getItem('impersonate-tokens');
            if (raw) {
              const tokens = JSON.parse(raw);
              if (tokens?.accessToken) impersonateAuth = { Authorization: `Bearer ${tokens.accessToken}` };
            }
          }
        } catch {}
      }
      const res = await fetch(`${API_URL}/upload/business-cert`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
        headers: { 'X-Auth-Context': 'client', ...impersonateAuth },
      });
      if (!res.ok) {
        let msg = '파일 업로드에 실패했습니다.';
        try {
          const data = await res.json();
          msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || msg;
        } catch {}
        throw new Error(msg);
      }
      return (await res.json()) as { uploadKey: string };
    },
  });
}

export function useSubmitBusinessUpgrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitBusinessUpgradeBody) =>
      api.post<BusinessUpgradeStatusResponse>('/clients/me/business-upgrade', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

/** 본인이 제출한 사업자등록증 presigned URL (미리보기/다운로드용) */
export function useMyBusinessCertUrl() {
  return useMutation({
    mutationFn: () => api.get<{ url: string }>('/clients/me/business-cert-url'),
  });
}
