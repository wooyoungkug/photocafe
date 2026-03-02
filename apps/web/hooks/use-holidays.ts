import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getHolidaysForYear } from '@/lib/constants/holidays';

interface HolidayItem {
  date: string;
  name: string;
  isHoliday: boolean;
}

interface HolidayResponse {
  data: HolidayItem[];
}

/**
 * 공휴일 데이터 훅
 * - 공공데이터 API에서 가져오고, 실패 시 정적 데이터 폴백
 * - 24시간 캐시 (staleTime)
 */
export function useHolidays(year: number): Map<string, string> {
  const { data } = useQuery<HolidayResponse>({
    queryKey: ['holidays', year],
    queryFn: () => api.get<HolidayResponse>(`/holidays?year=${year}`),
    staleTime: 24 * 60 * 60 * 1000, // 24시간
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7일
    retry: 1,
  });

  // API 데이터가 있으면 사용
  if (data?.data && data.data.length > 0) {
    const map = new Map<string, string>();
    for (const item of data.data) {
      if (item.isHoliday) {
        const existing = map.get(item.date);
        if (existing) {
          map.set(item.date, `${existing} / ${item.name}`);
        } else {
          map.set(item.date, item.name);
        }
      }
    }
    return map;
  }

  // 폴백: 정적 데이터
  return getHolidaysForYear(year);
}

/**
 * 여러 연도의 공휴일 (캘린더 전후 연도 포함)
 */
export function useHolidaysRange(centerYear: number): Map<string, string> {
  const prev = useHolidays(centerYear - 1);
  const curr = useHolidays(centerYear);
  const next = useHolidays(centerYear + 1);

  const merged = new Map<string, string>();
  prev.forEach((v, k) => merged.set(k, v));
  curr.forEach((v, k) => merged.set(k, v));
  next.forEach((v, k) => merged.set(k, v));

  return merged;
}
