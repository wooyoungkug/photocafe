'use client';

/**
 * PrintOperatorSelector
 * 출력 담당자(직원) 콤보박스 — Command + Popover 조합으로 검색 가능한 선택기.
 * 백엔드: GET /staff (useStaffList) — 활성 직원 목록을 가져와 부서/직책으로 필터.
 * "출력 담당자" 후보 = 활성 직원 전체 (필요 시 부서명에 '생산' 또는 '인쇄' 포함된 직원 우선 표시).
 */

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, User2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useStaffList } from '@/hooks/use-staff';
import { cn } from '@/lib/utils';

interface PrintOperatorSelectorProps {
  value: string | null;
  onChange: (id: string | null) => void;
  orderId?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PrintOperatorSelector({
  value,
  onChange,
  allowClear = true,
  disabled = false,
  className,
}: PrintOperatorSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useStaffList({ isActive: true, limit: 100 });

  const staffList = data?.data ?? [];

  // 출력담당자 후보 — 부서명/직책에 '생산'/'인쇄'/'출력' 포함된 직원을 상위로 정렬
  const sorted = useMemo(() => {
    const isPrinter = (s: typeof staffList[number]) => {
      const dept = s.department?.name ?? '';
      const pos = s.position ?? '';
      return /생산|인쇄|출력|printer|production/i.test(dept + pos);
    };
    return [...staffList].sort((a, b) => {
      const aP = isPrinter(a) ? 0 : 1;
      const bP = isPrinter(b) ? 0 : 1;
      if (aP !== bP) return aP - bP;
      return a.name.localeCompare(b.name, 'ko');
    });
  }, [staffList]);

  const selected = staffList.find((s) => s.id === value) || null;

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between text-[14px] text-black font-normal',
            !selected && 'text-gray-500',
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <User2 className="h-4 w-4 shrink-0" />
            {selected ? (
              <>
                <span className="truncate">{selected.name}</span>
                {selected.department?.name && (
                  <span className="text-[12px] text-gray-500 truncate">
                    ({selected.department.name})
                  </span>
                )}
              </>
            ) : (
              <span>{isLoading ? '불러오는 중...' : '담당자 선택'}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="이름·부서 검색..." className="h-9" />
          <CommandList>
            <CommandEmpty>해당 직원이 없습니다.</CommandEmpty>

            {allowClear && (
              <>
                <CommandGroup>
                  <CommandItem
                    value="__none__"
                    onSelect={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    <span>담당자 없음</span>
                    {value === null && <Check className="ml-auto h-4 w-4" />}
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            <CommandGroup heading={`직원 (${sorted.length})`}>
              {sorted.map((staff) => {
                const label =
                  `${staff.name} ${staff.department?.name ?? ''} ${staff.position ?? ''} ${staff.staffId ?? ''}`.trim();
                return (
                  <CommandItem
                    key={staff.id}
                    value={label}
                    onSelect={() => {
                      onChange(staff.id);
                      setOpen(false);
                    }}
                  >
                    <User2 className="mr-2 h-4 w-4" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] text-black">
                        {staff.name}
                        {staff.position && (
                          <span className="text-[12px] text-gray-500 ml-1">
                            {staff.position}
                          </span>
                        )}
                      </span>
                      {staff.department?.name && (
                        <span className="text-[12px] text-gray-500 truncate">
                          {staff.department.name}
                        </span>
                      )}
                    </div>
                    {value === staff.id && <Check className="ml-auto h-4 w-4" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
