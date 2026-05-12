'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type BusinessUpgradeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface BusinessUpgradeRequest {
  id: string;
  clientName?: string;
  email?: string;
  businessNumber?: string;
  representative?: string;
  businessType?: string;
  businessCategory?: string;
  taxInvoiceEmail?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  submittedAt?: string;
  status?: BusinessUpgradeRequestStatus;
  rejectReason?: string;
  [key: string]: unknown;
}

const KEY = (status: string) => ['admin', 'business-upgrade-requests', status];

export function useBusinessUpgradeRequests(status: BusinessUpgradeRequestStatus = 'pending') {
  return useQuery({
    queryKey: KEY(status),
    queryFn: () =>
      api.get<BusinessUpgradeRequest[]>('/clients/business-upgrade-requests', { status }),
  });
}

export function useProcessBusinessUpgrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      rejectReason,
    }: {
      id: string;
      action: 'approve' | 'reject';
      rejectReason?: string;
    }) => api.patch(`/clients/${id}/business-upgrade`, { action, rejectReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'business-upgrade-requests'] });
    },
  });
}

export function useClientBusinessCertUrl() {
  return useMutation({
    mutationFn: (id: string) => api.get<{ url: string }>(`/clients/${id}/business-cert-url`),
  });
}
