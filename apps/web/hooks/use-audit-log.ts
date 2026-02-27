'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuditLog, AuditLogQuery } from '@/lib/types/staff';

const AUDIT_LOGS_KEY = 'audit-logs';

export function useAuditLogs(query?: AuditLogQuery) {
  return useQuery({
    queryKey: [AUDIT_LOGS_KEY, query],
    queryFn: () =>
      api.get<{
        data: AuditLog[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>('/audit-logs', query as Record<string, string | number | boolean | undefined>),
  });
}

export function useEntityAuditLogs(
  entityType: string,
  entityId: string,
  query?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: [AUDIT_LOGS_KEY, entityType, entityId, query],
    queryFn: () =>
      api.get<{
        data: AuditLog[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>(
        `/audit-logs/entity/${entityType}/${entityId}`,
        query as Record<string, string | number | boolean | undefined>,
      ),
    enabled: !!entityType && !!entityId,
  });
}
