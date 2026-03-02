/**
 * 한국 공휴일 데이터
 *
 * - 고정 공휴일: 매년 같은 날짜
 * - 음력 공휴일: 연도별 양력 날짜 매핑 (설날, 부처님오신날, 추석)
 * - 대체공휴일: 공휴일이 주말과 겹칠 때 다음 평일 휴무
 */

export interface Holiday {
  date: string; // 'MM-DD' (고정) 또는 'YYYY-MM-DD' (음력 변환)
  name: string;
  type: 'fixed' | 'lunar' | 'substitute';
}

// ==================== 고정 공휴일 ====================

const FIXED_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: '신정' },
  { month: 3, day: 1, name: '삼일절' },
  { month: 5, day: 5, name: '어린이날' },
  { month: 6, day: 6, name: '현충일' },
  { month: 8, day: 15, name: '광복절' },
  { month: 10, day: 3, name: '개천절' },
  { month: 10, day: 9, name: '한글날' },
  { month: 12, day: 25, name: '성탄절' },
];

// ==================== 음력 기반 공휴일 (연도별 양력 날짜) ====================

const LUNAR_HOLIDAYS: Record<number, { date: string; name: string }[]> = {
  2024: [
    { date: '2024-02-09', name: '설날 연휴' },
    { date: '2024-02-10', name: '설날' },
    { date: '2024-02-11', name: '설날 연휴' },
    { date: '2024-02-12', name: '대체공휴일(설날)' },
    { date: '2024-05-15', name: '부처님오신날' },
    { date: '2024-09-16', name: '추석 연휴' },
    { date: '2024-09-17', name: '추석' },
    { date: '2024-09-18', name: '추석 연휴' },
  ],
  2025: [
    { date: '2025-01-28', name: '설날 연휴' },
    { date: '2025-01-29', name: '설날' },
    { date: '2025-01-30', name: '설날 연휴' },
    { date: '2025-05-05', name: '부처님오신날' }, // 어린이날과 겹침
    { date: '2025-05-06', name: '대체공휴일(어린이날)' },
    { date: '2025-10-05', name: '추석 연휴' },
    { date: '2025-10-06', name: '추석' },
    { date: '2025-10-07', name: '추석 연휴' },
    { date: '2025-10-08', name: '대체공휴일(추석)' },
  ],
  2026: [
    { date: '2026-02-16', name: '설날 연휴' },
    { date: '2026-02-17', name: '설날' },
    { date: '2026-02-18', name: '설날 연휴' },
    { date: '2026-05-24', name: '부처님오신날' },
    { date: '2026-09-24', name: '추석 연휴' },
    { date: '2026-09-25', name: '추석' },
    { date: '2026-09-26', name: '추석 연휴' },
  ],
  2027: [
    { date: '2027-02-06', name: '설날 연휴' },
    { date: '2027-02-07', name: '설날' },
    { date: '2027-02-08', name: '설날 연휴' },
    { date: '2027-02-09', name: '대체공휴일(설날)' },
    { date: '2027-05-13', name: '부처님오신날' },
    { date: '2027-09-14', name: '추석 연휴' },
    { date: '2027-09-15', name: '추석' },
    { date: '2027-09-16', name: '추석 연휴' },
  ],
  2028: [
    { date: '2028-01-26', name: '설날 연휴' },
    { date: '2028-01-27', name: '설날' },
    { date: '2028-01-28', name: '설날 연휴' },
    { date: '2028-05-02', name: '부처님오신날' },
    { date: '2028-10-02', name: '추석 연휴' },
    { date: '2028-10-03', name: '추석' },
    { date: '2028-10-04', name: '추석 연휴' },
  ],
};

// ==================== 선거일 · 임시공휴일 (비정기) ====================

const SPECIAL_HOLIDAYS: Record<number, { date: string; name: string }[]> = {
  2024: [
    { date: '2024-04-10', name: '제22대 국회의원선거' },
  ],
  2025: [
    { date: '2025-06-03', name: '대통령선거' },
  ],
  2026: [
    { date: '2026-06-03', name: '제9회 전국동시지방선거' },
  ],
  2027: [
    // 재·보궐선거 등 확정 시 추가
  ],
  2028: [
    { date: '2028-04-12', name: '제23대 국회의원선거' },
  ],
};

// ==================== 유틸리티 함수 ====================

/** YYYY-MM-DD → Date 객체 */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date → YYYY-MM-DD */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 다음 날 */
function addDay(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 대체공휴일 계산 (2021년~ 모든 공휴일 적용)
 * 공휴일이 토/일과 겹치면 다음 평일(이미 공휴일인 날 제외)을 대체공휴일로 지정
 */
function calculateSubstituteHolidays(
  holidays: Map<string, string>
): Map<string, string> {
  const substitutes = new Map<string, string>();

  for (const [dateStr, name] of holidays) {
    // 이미 대체공휴일로 등록된 음력 데이터는 건너뛰기
    if (name.includes('대체공휴일')) continue;

    const date = parseDate(dateStr);
    const dow = date.getDay(); // 0=일, 6=토

    if (dow === 0 || dow === 6) {
      // 다음 평일 중 공휴일/대체공휴일이 아닌 날 찾기
      let candidate = addDay(date, 1);
      while (
        candidate.getDay() === 0 ||
        candidate.getDay() === 6 ||
        holidays.has(formatDate(candidate)) ||
        substitutes.has(formatDate(candidate))
      ) {
        candidate = addDay(candidate, 1);
      }
      substitutes.set(formatDate(candidate), `대체공휴일(${name})`);
    }
  }

  return substitutes;
}

/**
 * 특정 연도의 모든 공휴일을 Map으로 반환
 * key: 'YYYY-MM-DD', value: 공휴일 이름
 */
export function getHolidaysForYear(year: number): Map<string, string> {
  const holidays = new Map<string, string>();

  // 고정 공휴일
  for (const h of FIXED_HOLIDAYS) {
    const mm = String(h.month).padStart(2, '0');
    const dd = String(h.day).padStart(2, '0');
    const key = `${year}-${mm}-${dd}`;
    holidays.set(key, h.name);
  }

  // 음력 기반 공휴일
  const lunarForYear = LUNAR_HOLIDAYS[year];
  if (lunarForYear) {
    for (const h of lunarForYear) {
      const existing = holidays.get(h.date);
      if (existing) {
        holidays.set(h.date, `${existing} / ${h.name}`);
      } else {
        holidays.set(h.date, h.name);
      }
    }
  }

  // 선거일 · 임시공휴일
  const specialForYear = SPECIAL_HOLIDAYS[year];
  if (specialForYear) {
    for (const h of specialForYear) {
      const existing = holidays.get(h.date);
      if (existing) {
        holidays.set(h.date, `${existing} / ${h.name}`);
      } else {
        holidays.set(h.date, h.name);
      }
    }
  }

  // 대체공휴일 자동 계산 (2021년~ 모든 공휴일 적용)
  if (year >= 2021) {
    const substitutes = calculateSubstituteHolidays(holidays);
    for (const [dateStr, name] of substitutes) {
      // 음력 데이터에 이미 대체공휴일이 있으면 건너뛰기
      if (!holidays.has(dateStr)) {
        holidays.set(dateStr, name);
      }
    }
  }

  return holidays;
}

/**
 * 여러 연도를 포괄하는 공휴일 Map 반환
 * 캘린더가 월 경계를 넘을 수 있으므로 전후 연도 포함
 */
export function getHolidaysForRange(startYear: number, endYear: number): Map<string, string> {
  const holidays = new Map<string, string>();
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidaysForYear(year);
    yearHolidays.forEach((name, date) => holidays.set(date, name));
  }
  return holidays;
}

/**
 * 특정 날짜가 공휴일인지 확인
 */
export function isHoliday(dateStr: string, holidays: Map<string, string>): boolean {
  return holidays.has(dateStr);
}

/**
 * 특정 날짜의 공휴일 이름 반환
 */
export function getHolidayName(dateStr: string, holidays: Map<string, string>): string | undefined {
  return holidays.get(dateStr);
}
