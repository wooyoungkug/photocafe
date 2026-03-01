'use client';

import { create } from 'zustand';
import type { ShootingType, ShootingStatus } from '@/hooks/use-shooting';

// ==================== 타입 정의 ====================

export type CalendarViewMode = 'month' | 'week' | 'day' | 'list' | 'twoWeek';

interface ShootingFilters {
  types: ShootingType[];
  statuses: ShootingStatus[];
  search: string;
}

interface ShootingStoreState {
  // 캘린더 뷰
  viewMode: CalendarViewMode;
  setViewMode: (mode: CalendarViewMode) => void;

  // 선택된 날짜
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;

  // 현재 표시 월
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;

  // 필터 (구조화된 필터)
  filters: ShootingFilters;
  setFilters: (filters: Partial<ShootingFilters>) => void;
  resetFilters: () => void;

  // 단일 필터 (간편 필터)
  filterType: string | null;
  setFilterType: (type: string | null) => void;
  filterStatus: string | null;
  setFilterStatus: (status: string | null) => void;

  // 선택된 촬영
  selectedShootingId: string | null;
  setSelectedShootingId: (id: string | null) => void;

  // 미니 캘린더 열림 상태
  miniCalendarOpen: boolean;
  setMiniCalendarOpen: (open: boolean) => void;
}

// ==================== 초기값 ====================

const defaultFilters: ShootingFilters = {
  types: [],
  statuses: [],
  search: '',
};

// ==================== 스토어 ====================

export const useShootingStore = create<ShootingStoreState>()((set) => ({
  // 캘린더 뷰
  viewMode: 'month',
  setViewMode: (mode) => set({ viewMode: mode }),

  // 선택된 날짜
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),

  // 현재 표시 월
  currentMonth: new Date(),
  setCurrentMonth: (date) => set({ currentMonth: date }),

  // 구조화된 필터
  filters: { ...defaultFilters },
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () =>
    set({
      filters: { ...defaultFilters },
      filterType: null,
      filterStatus: null,
    }),

  // 단일 필터
  filterType: null,
  setFilterType: (type) => set({ filterType: type }),
  filterStatus: null,
  setFilterStatus: (status) => set({ filterStatus: status }),

  // 선택된 촬영
  selectedShootingId: null,
  setSelectedShootingId: (id) => set({ selectedShootingId: id }),

  // 미니 캘린더
  miniCalendarOpen: true,
  setMiniCalendarOpen: (open) => set({ miniCalendarOpen: open }),
}));
