'use client';

import { CalendarIcon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export type PrintMethodFilter = 'all' | 'indigo' | 'inkjet';

interface PrintRoomFiltersProps {
  date: Date | undefined;
  onDateChange: (d: Date | undefined) => void;
  printMethod: PrintMethodFilter;
  onPrintMethodChange: (v: PrintMethodFilter) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (v: boolean) => void;
  onRefresh: () => void;
  isFetching?: boolean;
}

export function PrintRoomFilters({
  date,
  onDateChange,
  printMethod,
  onPrintMethodChange,
  autoRefresh,
  onAutoRefreshChange,
  onRefresh,
  isFetching,
}: PrintRoomFiltersProps) {
  const t = useTranslations('printRoom');

  return (
    <div className="flex flex-wrap items-center gap-3 pb-3">
      {/* 날짜 */}
      <div className="flex items-center gap-2">
        <span className="text-[14px] text-black font-normal">
          {t('filter.date')}
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 text-[14px] text-black font-normal"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {date ? format(date, 'yyyy-MM-dd') : t('filter.all')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => onDateChange(d)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-[14px] font-normal"
          onClick={() => onDateChange(undefined)}
        >
          {t('filter.all')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-[14px] font-normal"
          onClick={() => onDateChange(new Date())}
        >
          {t('filter.today')}
        </Button>
      </div>

      {/* 출력방식 */}
      <div className="flex items-center gap-2">
        <span className="text-[14px] text-black font-normal">
          {t('filter.printMethod')}
        </span>
        <Select
          value={printMethod}
          onValueChange={(v) => onPrintMethodChange(v as PrintMethodFilter)}
        >
          <SelectTrigger className="w-[140px] h-9 text-[14px] text-black font-normal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[14px] font-normal">
              {t('filter.all')}
            </SelectItem>
            <SelectItem value="indigo" className="text-[14px] font-normal">
              {t('printMethod.indigo')}
            </SelectItem>
            <SelectItem value="inkjet" className="text-[14px] font-normal">
              {t('printMethod.inkjet')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 실시간 갱신 */}
      <div className="flex items-center gap-2">
        <Switch
          id="auto-refresh"
          checked={autoRefresh}
          onCheckedChange={onAutoRefreshChange}
        />
        <Label
          htmlFor="auto-refresh"
          className="text-[14px] text-black font-normal cursor-pointer"
        >
          {t('filter.autoRefresh')}
        </Label>
      </div>

      {/* 수동 새로고침 */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-[14px] font-normal ml-auto"
        onClick={onRefresh}
        disabled={isFetching}
      >
        <RefreshCw
          className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`}
        />
        {t('filter.refresh')}
      </Button>
    </div>
  );
}
