import { api } from '@/lib/api';
import { normalizeImageUrl } from '@/lib/utils';

export interface OrderFileAccessUrlResponse {
  fileId: string;
  url: string;
  source: 'b2-presigned' | 'local';
  expiresIn: number | null;
}

export interface OrderFileAccessInput {
  id: string;
  fileUrl?: string | null;
}

export async function resolveOrderFileAccessUrl(file: OrderFileAccessInput): Promise<string> {
  if (!file?.id) {
    throw new Error('파일 ID가 없습니다.');
  }

  try {
    const res = await api.get<OrderFileAccessUrlResponse>(`/orders/files/${file.id}/access-url`);
    const resolved = res?.url || file.fileUrl || '';
    const finalUrl = resolved.startsWith('http') ? resolved : (normalizeImageUrl(resolved) || resolved);
    if (!finalUrl) {
      throw new Error('파일 URL이 없습니다.');
    }
    return finalUrl;
  } catch {
    const fallback = normalizeImageUrl(file.fileUrl || '') || file.fileUrl || '';
    if (!fallback) {
      throw new Error('원본 파일 URL을 찾을 수 없습니다.');
    }
    return fallback;
  }
}
