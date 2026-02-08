import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 타입 정의
export type PlateType = 'copper' | 'soft';
export type CopperPlateStatus = 'stored' | 'in_use' | 'returned' | 'disposed';

export const PLATE_TYPE_LABELS: Record<PlateType, string> = {
  copper: '동판',
  soft: '연판',
};

export const COPPER_PLATE_STATUS_LABELS: Record<CopperPlateStatus, string> = {
  stored: '보관중',
  in_use: '사용중',
  returned: '반환',
  disposed: '폐기',
};

export const COPPER_PLATE_STATUS_COLORS: Record<CopperPlateStatus, string> = {
  stored: 'bg-green-100 text-green-800 border-green-200',
  in_use: 'bg-blue-100 text-blue-800 border-blue-200',
  returned: 'bg-gray-100 text-gray-800 border-gray-200',
  disposed: 'bg-red-100 text-red-800 border-red-200',
};

// 박 컬러 타입 (기본값)
export type FoilColor = 'gold' | 'silver' | 'rose_gold' | 'black' | 'white' | 'red' | 'blue' | 'green' | 'custom';

export const FOIL_COLOR_LABELS: Record<string, string> = {
  gold: '금박',
  silver: '은박',
  rose_gold: '로즈골드',
  black: '먹박',
  white: '백박',
  red: '적박',
  blue: '청박',
  green: '녹박',
  custom: '커스텀',
};

export const FOIL_COLOR_COLORS: Record<string, string> = {
  gold: 'bg-yellow-100 text-yellow-800',
  silver: 'bg-gray-100 text-gray-800',
  rose_gold: 'bg-pink-100 text-pink-800',
  black: 'bg-gray-800 text-white',
  white: 'bg-white text-gray-800 border border-gray-300',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  custom: 'bg-purple-100 text-purple-800',
};

// 박 위치 타입
export type FoilPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';

export const FOIL_POSITION_LABELS: Record<string, string> = {
  center: '중앙',
  top: '상단',
  bottom: '하단',
  left: '좌측',
  right: '우측',
  top_left: '좌상단',
  top_right: '우상단',
  bottom_left: '좌하단',
  bottom_right: '우하단',
};

// 박 컬러 (동적 관리)
export interface FoilColorItem {
  id: string;
  code: string;
  name: string;
  colorHex?: string;
  sortOrder: number;
  isActive: boolean;
}

// 동판 위치 (동적 관리)
export interface PlatePositionItem {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CopperPlate {
  id: string;
  clientId: string;
  plateName: string;
  plateCode?: string;
  plateType: PlateType;
  foilColor: string;        // 동적 관리 (code)
  foilColorName?: string;
  foilPosition?: string;    // 동적 관리 (code)
  widthMm?: number;
  heightMm?: number;
  storageLocation?: string;
  imageUrl?: string;
  aiFileUrl?: string;
  designFileUrl?: string;
  appliedAlbumName?: string;
  albumPhotoUrl?: string;
  registeredAt: string;
  firstUsedAt?: string;
  lastUsedAt?: string;
  returnedAt?: string;
  status: CopperPlateStatus;
  registeredById?: string;
  registeredBy?: string;
  notes?: string;
  usageCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    clientCode: string;
    clientName: string;
  };
  histories?: CopperPlateHistory[];
}

export interface CopperPlateHistory {
  id: string;
  copperPlateId: string;
  actionType: string;
  previousStatus?: string;
  newStatus?: string;
  previousLocation?: string;
  newLocation?: string;
  orderId?: string;
  orderNumber?: string;
  description?: string;
  actionById?: string;
  actionBy?: string;
  createdAt: string;
}

export interface CreateCopperPlateDto {
  clientId: string;
  plateName: string;
  plateCode?: string;
  plateType?: PlateType;
  foilColor: string;        // 동적 관리 (code)
  foilColorName?: string;
  foilPosition?: string;    // 동적 관리 (code)
  widthMm?: number;
  heightMm?: number;
  storageLocation?: string;
  imageUrl?: string;
  aiFileUrl?: string;
  designFileUrl?: string;
  appliedAlbumName?: string;
  albumPhotoUrl?: string;
  notes?: string;
  registeredById?: string;
  registeredBy?: string;
  registeredAt?: string;
}

export interface UpdateCopperPlateDto {
  plateName?: string;
  plateCode?: string;
  plateType?: PlateType;
  foilColor?: string;        // 동적 관리 (code)
  foilColorName?: string;
  foilPosition?: string;     // 동적 관리 (code)
  widthMm?: number;
  heightMm?: number;
  storageLocation?: string;
  imageUrl?: string;
  aiFileUrl?: string;
  designFileUrl?: string;
  appliedAlbumName?: string;
  albumPhotoUrl?: string;
  notes?: string;
  status?: CopperPlateStatus;
  registeredAt?: string;
  firstUsedAt?: string;
  returnedAt?: string;
}

// 회원별 동판 목록 조회
export function useCopperPlatesByClient(clientId: string | undefined) {
  return useQuery<CopperPlate[]>({
    queryKey: ['copper-plates', 'client', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const result = await api.get<CopperPlate[]>(`/copper-plates/client/${clientId}`);
      return result;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 동판 상세 조회
export function useCopperPlate(id: string | undefined) {
  return useQuery<CopperPlate>({
    queryKey: ['copper-plates', id],
    queryFn: () => api.get<CopperPlate>(`/copper-plates/${id}`),
    enabled: !!id,
  });
}

// 동판 이력 조회
export function useCopperPlateHistories(id: string | undefined, limit?: number) {
  return useQuery<CopperPlateHistory[]>({
    queryKey: ['copper-plates', id, 'histories', limit],
    queryFn: async () => {
      if (!id) return [];
      return api.get<CopperPlateHistory[]>(`/copper-plates/${id}/histories`, limit ? { limit } : undefined);
    },
    enabled: !!id,
  });
}

// 동판 등록
export function useCreateCopperPlate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCopperPlateDto) => api.post<CopperPlate>('/copper-plates', dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['copper-plates'] });
    },
  });
}

// 동판 수정
export function useUpdateCopperPlate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCopperPlateDto }) =>
      api.put<CopperPlate>(`/copper-plates/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates'] });
    },
  });
}

// 동판 삭제
export function useDeleteCopperPlate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/copper-plates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates'] });
    },
  });
}

// 사용 기록 추가
export function useRecordCopperPlateUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: {
        orderId?: string;
        orderNumber?: string;
        description?: string;
        actionById?: string;
        actionBy?: string;
      };
    }) => api.post<CopperPlateHistory>(`/copper-plates/${id}/usage`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates'] });
    },
  });
}

// 위치 변경
export function useChangeCopperPlateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: {
        newLocation: string;
        actionById?: string;
        actionBy?: string;
      };
    }) => api.post<CopperPlateHistory>(`/copper-plates/${id}/location`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates'] });
    },
  });
}

// 상태 변경
export function useChangeCopperPlateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: {
        newStatus: CopperPlateStatus;
        description?: string;
        actionById?: string;
        actionBy?: string;
      };
    }) => api.post<CopperPlateHistory>(`/copper-plates/${id}/status`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates'] });
    },
  });
}

// 순서 변경
export function useReorderCopperPlate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      direction,
    }: {
      id: string;
      direction: 'up' | 'down';
    }) => api.post<CopperPlate>(`/copper-plates/${id}/reorder`, { direction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates'] });
    },
  });
}

// 라벨 조회 (동적 데이터)
export interface CopperPlateLabels {
  foilColors: FoilColorItem[];
  platePositions: PlatePositionItem[];
  statuses: Record<string, string>;
}

export function useCopperPlateLabels() {
  return useQuery<CopperPlateLabels>({
    queryKey: ['copper-plates', 'labels'],
    queryFn: () => api.get<CopperPlateLabels>('/copper-plates/labels'),
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// ==================== 박 컬러 관리 ====================

export function useFoilColors() {
  return useQuery<FoilColorItem[]>({
    queryKey: ['copper-plates', 'foil-colors'],
    queryFn: () => api.get<FoilColorItem[]>('/copper-plates/foil-colors'),
  });
}

export function useCreateFoilColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; name: string; colorHex?: string; sortOrder?: number }) =>
      api.post<FoilColorItem>('/copper-plates/foil-colors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'foil-colors'] });
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'labels'] });
    },
  });
}

export function useUpdateFoilColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { code?: string; name?: string; colorHex?: string; sortOrder?: number; isActive?: boolean } }) =>
      api.put<FoilColorItem>(`/copper-plates/foil-colors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'foil-colors'] });
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'labels'] });
    },
  });
}

export function useDeleteFoilColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/copper-plates/foil-colors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'foil-colors'] });
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'labels'] });
    },
  });
}

// ==================== 동판 위치 관리 ====================

export function usePlatePositions() {
  return useQuery<PlatePositionItem[]>({
    queryKey: ['copper-plates', 'plate-positions'],
    queryFn: () => api.get<PlatePositionItem[]>('/copper-plates/plate-positions'),
  });
}

export function useCreatePlatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; name: string; sortOrder?: number }) =>
      api.post<PlatePositionItem>('/copper-plates/plate-positions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'plate-positions'] });
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'labels'] });
    },
  });
}

export function useUpdatePlatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { code?: string; name?: string; sortOrder?: number; isActive?: boolean } }) =>
      api.put<PlatePositionItem>(`/copper-plates/plate-positions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'plate-positions'] });
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'labels'] });
    },
  });
}

export function useDeletePlatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/copper-plates/plate-positions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'plate-positions'] });
      queryClient.invalidateQueries({ queryKey: ['copper-plates', 'labels'] });
    },
  });
}

// 전체 동판 검색 (관리자용)
export interface SearchCopperPlatesParams {
  [key: string]: string | number | boolean | undefined;
  search?: string;
  status?: string;
  foilColor?: string;
  page?: number;
  limit?: number;
}

export interface SearchCopperPlatesResult {
  data: CopperPlate[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useSearchCopperPlates(params: SearchCopperPlatesParams = {}) {
  return useQuery<SearchCopperPlatesResult>({
    queryKey: ['copper-plates', 'search', params],
    queryFn: () => api.get<SearchCopperPlatesResult>('/copper-plates', params),
  });
}
