'use client';

import { useState } from 'react';
import {
  Calculator,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useLeaveTypes,
  useLeaveBalances,
  useGenerateLeaveBalances,
  useAdjustLeaveBalance,
  type LeaveBalance,
} from '@/hooks/use-leave';
import { useDepartments } from '@/hooks/use-staff';

// ==================== 페이지 컴포넌트 ====================

export default function LeaveBalancesPage() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  // 상태
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<LeaveBalance | null>(null);
  const [adjustDays, setAdjustDays] = useState('');
  const [adjustMemo, setAdjustMemo] = useState('');

  // 데이터 조회
  const { data: leaveTypes } = useLeaveTypes();
  const { data: departments } = useDepartments();
  const { data: balances, isLoading } = useLeaveBalances({
    year: selectedYear,
  });

  // Mutations
  const generateMutation = useGenerateLeaveBalances();
  const adjustMutation = useAdjustLeaveBalance();

  // 부서 필터링
  const filteredBalances = balances?.filter((b) => {
    if (departmentFilter === 'all') return true;
    return b.staff?.department?.name === departments?.find((d: any) => d.id === departmentFilter)?.name;
  }) || [];

  // 직원별 그룹핑
  const staffBalanceMap: Record<string, {
    staffName: string;
    department: string;
    balances: Record<string, LeaveBalance>;
  }> = {};

  filteredBalances.forEach((balance) => {
    const staffId = balance.staffId;
    if (!staffBalanceMap[staffId]) {
      staffBalanceMap[staffId] = {
        staffName: balance.staff?.name || '-',
        department: balance.staff?.department?.name || '-',
        balances: {},
      };
    }
    staffBalanceMap[staffId].balances[balance.leaveTypeCode] = balance;
  });

  const staffEntries = Object.entries(staffBalanceMap);

  // 연도 옵션
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleGenerate = async () => {
    try {
      const result = await generateMutation.mutateAsync({ year: selectedYear });
      toast({
        title: '연차 생성 완료',
        description: `${result.generated}건의 잔여일수가 생성되었습니다.`,
      });
      setGenerateOpen(false);
    } catch (err: any) {
      toast({ title: '생성 실패', description: err.message, variant: 'destructive' });
    }
  };

  const handleAdjust = async () => {
    if (!adjustTarget || !adjustDays) return;
    try {
      await adjustMutation.mutateAsync({
        id: adjustTarget.id,
        adjustedDays: Number(adjustDays),
        memo: adjustMemo || undefined,
      });
      toast({ title: '조정 완료' });
      setAdjustTarget(null);
      setAdjustDays('');
      setAdjustMemo('');
    } catch (err: any) {
      toast({ title: '조정 실패', description: err.message, variant: 'destructive' });
    }
  };

  const activeLeaveTypes = leaveTypes?.filter((t) => t.isActive) || [];

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-6 w-6 text-gray-700" />
          <h1 className="text-[24px] text-black font-normal">잔여일수 관리</h1>
        </div>
        <Button onClick={() => setGenerateOpen(true)} className="text-[14px]">
          <RefreshCw className="h-4 w-4 mr-1.5" />
          연차 일괄 생성
        </Button>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[120px] text-[14px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[160px] text-[14px]">
                <SelectValue placeholder="부서 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 부서</SelectItem>
                {departments?.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[14px] sticky left-0 bg-white z-10">직원</TableHead>
                    <TableHead className="text-[14px]">부서</TableHead>
                    {activeLeaveTypes.map((lt) => (
                      <TableHead key={lt.code} className="text-[14px] text-center" colSpan={1}>
                        {lt.name}
                      </TableHead>
                    ))}
                    <TableHead className="text-[14px]">작업</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white z-10" />
                    <TableHead />
                    {activeLeaveTypes.map((lt) => (
                      <TableHead key={lt.code} className="text-[11px] text-center text-gray-400">
                        총/사용/잔여
                      </TableHead>
                    ))}
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffEntries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3 + activeLeaveTypes.length}
                        className="text-center py-8"
                      >
                        <p className="text-[14px] text-gray-400">
                          {selectedYear}년 잔여일수 데이터가 없습니다.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffEntries.map(([staffId, entry]) => (
                      <TableRow key={staffId}>
                        <TableCell className="text-[14px] text-black font-normal sticky left-0 bg-white z-10">
                          {entry.staffName}
                        </TableCell>
                        <TableCell className="text-[14px] text-black font-normal">
                          {entry.department}
                        </TableCell>
                        {activeLeaveTypes.map((lt) => {
                          const bal = entry.balances[lt.code];
                          if (!bal) {
                            return (
                              <TableCell key={lt.code} className="text-center text-[13px] text-gray-300">
                                -
                              </TableCell>
                            );
                          }
                          const total = bal.totalDays + bal.adjustedDays;
                          const remaining = total - bal.usedDays;
                          return (
                            <TableCell key={lt.code} className="text-center text-[13px] text-black font-normal">
                              <span>{total}</span>
                              <span className="text-gray-400"> / </span>
                              <span className="text-red-500">{bal.usedDays}</span>
                              <span className="text-gray-400"> / </span>
                              <span className="text-blue-600 font-bold">{remaining}</span>
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[12px]"
                            onClick={() => {
                              // 첫 번째 잔여일수 찾아서 조정 대상으로 지정
                              const firstBal = Object.values(entry.balances)[0];
                              if (firstBal) {
                                setAdjustTarget(firstBal);
                                setAdjustDays('');
                                setAdjustMemo('');
                              }
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            조정
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}

                  {/* 합계 행 */}
                  {staffEntries.length > 0 && (
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell className="text-[14px] text-black font-bold sticky left-0 bg-gray-50 z-10">
                        합계
                      </TableCell>
                      <TableCell />
                      {activeLeaveTypes.map((lt) => {
                        let sumTotal = 0;
                        let sumUsed = 0;
                        let sumRemaining = 0;
                        staffEntries.forEach(([, entry]) => {
                          const bal = entry.balances[lt.code];
                          if (bal) {
                            const t = bal.totalDays + bal.adjustedDays;
                            sumTotal += t;
                            sumUsed += bal.usedDays;
                            sumRemaining += t - bal.usedDays;
                          }
                        });
                        return (
                          <TableCell key={lt.code} className="text-center text-[13px] text-black font-bold">
                            {sumTotal} / {sumUsed} / {sumRemaining}
                          </TableCell>
                        );
                      })}
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 연차 일괄 생성 다이얼로그 */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">연차 일괄 생성</DialogTitle>
            <DialogDescription className="text-[14px]">
              선택한 연도의 전 직원 연차 잔여일수를 일괄 생성합니다.
              기존 데이터가 있는 직원은 건너뜁니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">대상 연도</Label>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)} className="text-[14px]">
              취소
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="text-[14px]"
            >
              {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 잔여일수 조정 다이얼로그 */}
      <Dialog
        open={!!adjustTarget}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustTarget(null);
            setAdjustDays('');
            setAdjustMemo('');
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">잔여일수 조정</DialogTitle>
            <DialogDescription className="text-[14px]">
              {adjustTarget?.staff?.name}님의 잔여일수를 조정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* 휴가 유형 선택 (대상 직원의 잔여일수 중 선택) */}
            {adjustTarget && (
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">대상 잔여일수</Label>
                <Select
                  value={adjustTarget.id}
                  onValueChange={(v) => {
                    const bal = filteredBalances.find((b) => b.id === v);
                    if (bal) setAdjustTarget(bal);
                  }}
                >
                  <SelectTrigger className="text-[14px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBalances
                      .filter((b) => b.staffId === adjustTarget.staffId)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {leaveTypes?.find((t) => t.code === b.leaveTypeCode)?.name || b.leaveTypeCode} (잔여: {b.totalDays + b.adjustedDays - b.usedDays}일)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">조정일수</Label>
              <Input
                type="number"
                value={adjustDays}
                onChange={(e) => setAdjustDays(e.target.value)}
                placeholder="양수: 추가, 음수: 차감"
                className="text-[14px]"
              />
              <p className="text-[12px] text-gray-400">
                양수를 입력하면 추가, 음수를 입력하면 차감됩니다.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] text-black font-normal">메모 (선택)</Label>
              <Textarea
                value={adjustMemo}
                onChange={(e) => setAdjustMemo(e.target.value)}
                placeholder="조정 사유"
                className="text-[14px]"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setAdjustTarget(null); setAdjustDays(''); setAdjustMemo(''); }}
              className="text-[14px]"
            >
              취소
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={adjustMutation.isPending || !adjustDays}
              className="text-[14px]"
            >
              {adjustMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              조정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
