import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HolidayItem {
  date: string; // YYYY-MM-DD
  name: string;
  isHoliday: boolean; // 공휴일 여부 (기념일은 false)
}

interface ApiResponseItem {
  dateKind: string; // '01' = 국경일, '02' = 기념일, '03' = 24절기, '04' = 잡절
  dateName: string;
  isHoliday: string; // 'Y' | 'N'
  locdate: number; // 20260301
  seq: number;
}

@Injectable()
export class HolidayService {
  private readonly logger = new Logger(HolidayService.name);
  private readonly cache = new Map<string, { data: HolidayItem[]; fetchedAt: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

  constructor(private readonly configService: ConfigService) {}

  /**
   * 특정 연도의 공휴일 목록 반환
   * - 캐시가 있으면 캐시 반환
   * - 없으면 공공데이터 API 호출 후 캐시
   */
  async getHolidays(year: number): Promise<HolidayItem[]> {
    const cacheKey = `holidays-${year}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const holidays = await this.fetchFromApi(year);
      this.cache.set(cacheKey, { data: holidays, fetchedAt: Date.now() });
      return holidays;
    } catch (error) {
      this.logger.error(`공휴일 API 호출 실패 (${year}):`, error);
      // 캐시가 만료되었더라도 이전 데이터가 있으면 반환
      if (cached) return cached.data;
      return [];
    }
  }

  /**
   * 여러 연도의 공휴일을 한 번에 반환
   */
  async getHolidaysForRange(startYear: number, endYear: number): Promise<HolidayItem[]> {
    const results: HolidayItem[] = [];
    for (let year = startYear; year <= endYear; year++) {
      const holidays = await this.getHolidays(year);
      results.push(...holidays);
    }
    return results;
  }

  /**
   * 한국천문연구원 특일 정보 API 호출
   * - 1월~12월 모두 조회하여 합산
   */
  private async fetchFromApi(year: number): Promise<HolidayItem[]> {
    const apiKey = this.configService.get<string>('DATA_GO_KR_API_KEY');
    if (!apiKey) {
      this.logger.warn('DATA_GO_KR_API_KEY가 설정되지 않았습니다.');
      return [];
    }

    const holidays: HolidayItem[] = [];
    const baseUrl =
      'http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';

    // 월별로 조회 (API가 월 단위)
    for (let month = 1; month <= 12; month++) {
      try {
        const params = new URLSearchParams({
          serviceKey: apiKey,
          solYear: String(year),
          solMonth: String(month).padStart(2, '0'),
          _type: 'json',
          numOfRows: '30',
        });

        const url = `${baseUrl}?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
          this.logger.warn(`API 응답 오류: ${response.status} (${year}-${month})`);
          continue;
        }

        const json = await response.json();
        const items = this.extractItems(json);

        for (const item of items) {
          const dateStr = this.locdateToString(item.locdate);
          holidays.push({
            date: dateStr,
            name: item.dateName,
            isHoliday: item.isHoliday === 'Y',
          });
        }
      } catch (error) {
        this.logger.warn(`API 호출 실패 (${year}-${month}):`, error);
      }
    }

    this.logger.log(`${year}년 공휴일 ${holidays.length}개 로드 완료`);
    return holidays;
  }

  /**
   * API 응답에서 items 배열 추출
   * - 결과가 0건이면 빈 배열
   * - 1건이면 객체, 2건 이상이면 배열
   */
  private extractItems(json: any): ApiResponseItem[] {
    try {
      const body = json?.response?.body;
      if (!body || body.totalCount === 0) return [];

      const items = body.items?.item;
      if (!items) return [];
      return Array.isArray(items) ? items : [items];
    } catch {
      return [];
    }
  }

  /** 20260301 → '2026-03-01' */
  private locdateToString(locdate: number): string {
    const s = String(locdate);
    return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
  }
}
