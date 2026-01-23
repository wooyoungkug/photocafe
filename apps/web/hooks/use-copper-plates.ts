import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 타입 정의
export type FoilColor = 'gold' | 'silver' | 'hologram' | 'black' | 'rosegold' | 'custom';
export type FoilPosition = 'center' | 'top_center' | 'right_center' | 'right_bottom' | 'bottom_center' | 'left_bottom' | 'left_center' | 'top_left' | 'top_right';
export type PlateType = 'copper' | 'soft';
export type CopperPlateStatus = 'stored' | 'in_use' | 'returned' | 'disposed';

export const FOIL_COLOR_LABELS: Record<FoilColor, string> = {
  gold: '금박',
  silver: '은박',
  hologram: '홀로그램',
  black: '먹박',
  rosegold: '로즈골드',
  custom: '기타',
};

export const FOIL_POSITION_LABELS: Record<FoilPosition, string> = {
  center: '정중앙',
  top_center: '중상',
  right_center: '우중',
  right_bottom: '우하',
  bottom_center: '중하',
  left_bottom: '좌하',
  left_center: '좌중',
  top_left: '좌상',
  top_right: '우상',
};

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

export const FOIL_COLOR_COLORS: Record<FoilColor, string> = {
  gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  silver: 'bg-gray-100 text-gray-700 border-gray-300',
  hologram: 'bg-purple-100 text-purple-800 border-purple-300',
  black: 'bg-gray-800 text-white border-gray-900',
  rosegold: 'bg-pink-100 text-pink-800 border-pink-300',
  custom: 'bg-slate-100 text-slate-800 border-slate-300',
};

export interface CopperPlate {
  id: string;
  clientId: string;
  plateName: string;
  plateCode?: string;
  plateType: PlateType;
  foilColor: FoilColor;
  foilColorName?: string;
  foilPosition?: FoilPosition;
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
  foilColor: FoilColor;
  foilColorName?: string;
  foilPosition?: FoilPosition;
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
  foilColor?: FoilColor;
  foilColorName?: string;
  foilPosition?: FoilPosition;
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
