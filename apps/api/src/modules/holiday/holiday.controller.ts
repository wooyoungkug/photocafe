import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { HolidayService, HolidayItem } from './holiday.service';

@Controller('holidays')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  /**
   * GET /api/v1/holidays?year=2026
   * 인증 불필요 (공개 API)
   */
  @Public()
  @Get()
  async getHolidays(@Query('year') yearStr?: string): Promise<{ data: HolidayItem[] }> {
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

    if (isNaN(year) || year < 2000 || year > 2100) {
      return { data: [] };
    }

    // 현재 연도 기준 전후 1년 포함하여 반환
    const holidays = await this.holidayService.getHolidaysForRange(year, year);
    return { data: holidays };
  }
}
