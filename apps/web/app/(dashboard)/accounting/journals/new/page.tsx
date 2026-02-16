'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useCreateJournal, useAccounts } from '@/hooks/use-accounting';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

// ===== 타입 =====
interface EntryRow {
  id: string; // 클라이언트 임시 ID
  accountId: string;
  debitAmount: string; // 문자열로 관리 (입력 편의)
  creditAmount: string;
  description: string;
}

interface Client {
  id: string;
  clientName: string;
}

// ===== 전표유형 설정 =====
const VOUCHER_TYPES = [
  { value: 'RECEIPT', label: '입금전표', color: 'bg-green-100 text-green-700' },
  { value: 'PAYMENT', label: '출금전표', color: 'bg-red-100 text-red-700' },
  { value: 'TRANSFER', label: '대체전표', color: 'bg-blue-100 text-blue-700' },
] as const;

// ===== 빈 분개행 생성 =====
let entryCounter = 0;
function createEmptyEntry(): EntryRow {
  entryCounter += 1;
  return {
    id: `entry-${Date.now()}-${entryCounter}`,
    accountId: '',
    debitAmount: '',
    creditAmount: '',
    description: '',
  };
}

// ===== 금액 파싱 헬퍼 =====
function parseAmount(value: string): number {
  const num = Number(value.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

// ===== 페이지 컴포넌트 =====
export default function NewJournalPage() {
  const router = useRouter();
  const createJournal = useCreateJournal();
  const { data: accounts = [] } = useAccounts();

  // ===== 기본정보 상태 =====
  const [voucherType, setVoucherType] = useState<string>('RECEIPT');
  const [journalDate, setJournalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [clientId, setClientId] = useState<string>('');
  const [description, setDescription] = useState('');

  // ===== 거래처 목록 =====
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    api
      .get<{ data: Client[] }>('/clients', { limit: 100 })
      .then((res) => setClients(res.data || []))
      .catch(() => {});
  }, []);

  // ===== 분개 항목 상태 =====
  const [entries, setEntries] = useState<EntryRow[]>([
    createEmptyEntry(),
    createEmptyEntry(),
  ]);

  // ===== 활성 계정과목 (isActive 필터링) =====
  const activeAccounts = useMemo(
    () =>
      (Array.isArray(accounts) ? accounts : []).filter(
        (acc) => acc.isActive
      ),
    [accounts]
  );

  // ===== 차대 합계 계산 =====
  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const entry of entries) {
      debit += parseAmount(entry.debitAmount);
      credit += parseAmount(entry.creditAmount);
    }
    return { debit, credit, diff: debit - credit };
  }, [entries]);

  const isBalanced = totals.debit > 0 && totals.debit === totals.credit;

  // ===== 분개 항목 핸들러 =====
  const updateEntry = useCallback(
    (id: string, field: keyof EntryRow, value: string) => {
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== id) return entry;

          // 차변과 대변 중 하나만 입력 가능
          if (field === 'debitAmount' && value !== '') {
            return { ...entry, debitAmount: value, creditAmount: '' };
          }
          if (field === 'creditAmount' && value !== '') {
            return { ...entry, creditAmount: value, debitAmount: '' };
          }

          return { ...entry, [field]: value };
        })
      );
    },
    []
  );

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, createEmptyEntry()]);
  }, []);

  const removeEntry = useCallback(
    (id: string) => {
      if (entries.length <= 2) {
        toast({
          title: '분개 항목은 최소 2행이 필요합니다.',
          variant: 'destructive',
        });
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [entries.length]
  );

  // ===== 유효성 검증 =====
  const canSave = useMemo(() => {
    if (!voucherType || !journalDate) return false;
    if (!isBalanced) return false;

    // 최소 1개의 유효한 분개 항목이 있어야 함
    const validEntries = entries.filter(
      (e) =>
        e.accountId &&
        (parseAmount(e.debitAmount) > 0 || parseAmount(e.creditAmount) > 0)
    );
    if (validEntries.length < 2) return false;

    return true;
  }, [voucherType, journalDate, isBalanced, entries]);

  // ===== 저장 =====
  const handleSave = async () => {
    if (!canSave) return;

    // entries를 API 형식으로 변환
    const apiEntries = entries
      .filter(
        (e) =>
          e.accountId &&
          (parseAmount(e.debitAmount) > 0 || parseAmount(e.creditAmount) > 0)
      )
      .map((e) => {
        const debit = parseAmount(e.debitAmount);
        const credit = parseAmount(e.creditAmount);
        return {
          accountId: e.accountId,
          transactionType: debit > 0 ? 'DEBIT' : 'CREDIT',
          amount: debit > 0 ? debit : credit,
          description: e.description || undefined,
        };
      });

    const selectedClient = clients.find((c) => c.id === clientId);

    try {
      await createJournal.mutateAsync({
        voucherType,
        journalDate,
        clientId: clientId || undefined,
        clientName: selectedClient?.clientName || undefined,
        description: description || undefined,
        totalAmount: totals.debit,
        entries: apiEntries,
      });

      toast({ title: '전표가 등록되었습니다.' });
      router.push('/accounting/journals');
    } catch (error) {
      toast({
        title: '전표 등록에 실패했습니다.',
        description: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // ===== 금액 포맷 =====
  const formatAmount = (amount: number) => amount.toLocaleString('ko-KR');

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/accounting/journals')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">신규 전표 입력</h1>
          <p className="text-muted-foreground">
            전표를 작성하고 분개 항목을 입력합니다.
          </p>
        </div>
      </div>

      {/* 기본정보 Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 전표유형 */}
            <div className="space-y-2">
              <Label>전표유형 *</Label>
              <Select value={voucherType} onValueChange={setVoucherType}>
                <SelectTrigger>
                  <SelectValue placeholder="전표유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {VOUCHER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={`${type.color} text-xs`}>
                          {type.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 전표일자 */}
            <div className="space-y-2">
              <Label>전표일자 *</Label>
              <Input
                type="date"
                value={journalDate}
                onChange={(e) => setJournalDate(e.target.value)}
              />
            </div>

            {/* 거래처 */}
            <div className="space-y-2">
              <Label>거래처</Label>
              <Select value={clientId || '_none'} onValueChange={(v) => setClientId(v === '_none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="거래처 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">선택 안함</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 적요 */}
            <div className="space-y-2">
              <Label>적요</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="전표 적요를 입력하세요"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 분개 항목 Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">분개 항목</CardTitle>
            <Button variant="outline" size="sm" onClick={addEntry}>
              <Plus className="h-4 w-4 mr-1" />
              행 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[50px] text-center">#</TableHead>
                <TableHead className="min-w-[200px]">계정과목 *</TableHead>
                <TableHead className="w-[180px] text-right">차변 금액</TableHead>
                <TableHead className="w-[180px] text-right">대변 금액</TableHead>
                <TableHead className="min-w-[200px]">적요</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={entry.id} className="hover:bg-slate-50/50">
                  {/* 행 번호 */}
                  <TableCell className="text-center text-muted-foreground font-mono text-sm">
                    {index + 1}
                  </TableCell>

                  {/* 계정과목 선택 */}
                  <TableCell>
                    <Select
                      value={entry.accountId || '_none'}
                      onValueChange={(v) =>
                        updateEntry(entry.id, 'accountId', v === '_none' ? '' : v)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="계정과목 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none" disabled>
                          계정과목 선택
                        </SelectItem>
                        {activeAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.code} {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* 차변 금액 */}
                  <TableCell>
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="text-right tabular-nums"
                      placeholder="0"
                      value={entry.debitAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        updateEntry(entry.id, 'debitAmount', raw);
                      }}
                      onBlur={() => {
                        // 블러 시 콤마 포맷 적용
                        const num = parseAmount(entry.debitAmount);
                        if (num > 0) {
                          updateEntry(entry.id, 'debitAmount', formatAmount(num));
                        }
                      }}
                      onFocus={() => {
                        // 포커스 시 콤마 제거
                        const num = parseAmount(entry.debitAmount);
                        if (num > 0) {
                          updateEntry(entry.id, 'debitAmount', String(num));
                        }
                      }}
                      disabled={parseAmount(entry.creditAmount) > 0}
                    />
                  </TableCell>

                  {/* 대변 금액 */}
                  <TableCell>
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="text-right tabular-nums"
                      placeholder="0"
                      value={entry.creditAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        updateEntry(entry.id, 'creditAmount', raw);
                      }}
                      onBlur={() => {
                        const num = parseAmount(entry.creditAmount);
                        if (num > 0) {
                          updateEntry(entry.id, 'creditAmount', formatAmount(num));
                        }
                      }}
                      onFocus={() => {
                        const num = parseAmount(entry.creditAmount);
                        if (num > 0) {
                          updateEntry(entry.id, 'creditAmount', String(num));
                        }
                      }}
                      disabled={parseAmount(entry.debitAmount) > 0}
                    />
                  </TableCell>

                  {/* 적요 */}
                  <TableCell>
                    <Input
                      value={entry.description}
                      onChange={(e) =>
                        updateEntry(entry.id, 'description', e.target.value)
                      }
                      placeholder="적요 입력"
                    />
                  </TableCell>

                  {/* 삭제 */}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => removeEntry(entry.id)}
                      disabled={entries.length <= 2}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {/* 합계 행 */}
              <TableRow className="bg-slate-100 font-semibold hover:bg-slate-100">
                <TableCell colSpan={2} className="text-right">
                  합계
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="text-blue-700">
                    {formatAmount(totals.debit)}원
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="text-orange-700">
                    {formatAmount(totals.credit)}원
                  </span>
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 차대 균형 + 저장 버튼 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* 차대 균형 상태 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground mr-2">차변 합계:</span>
                  <span className="font-semibold text-blue-700 tabular-nums">
                    {formatAmount(totals.debit)}원
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground mr-2">대변 합계:</span>
                  <span className="font-semibold text-orange-700 tabular-nums">
                    {formatAmount(totals.credit)}원
                  </span>
                </div>
                <Separator orientation="vertical" className="h-5" />
                <div>
                  <span className="text-muted-foreground mr-2">차액:</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      totals.diff === 0 && totals.debit > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatAmount(Math.abs(totals.diff))}원
                  </span>
                </div>
              </div>

              {isBalanced ? (
                <Badge className="bg-green-100 text-green-700 text-xs">
                  차대 균형
                </Badge>
              ) : totals.debit > 0 || totals.credit > 0 ? (
                <Badge className="bg-red-100 text-red-700 text-xs">
                  차대 불일치
                </Badge>
              ) : null}
            </div>

            {/* 저장 버튼 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/accounting/journals')}
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSave || createJournal.isPending}
              >
                {createJournal.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    전표 저장
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 저장 불가 사유 안내 */}
          {!canSave && (totals.debit > 0 || totals.credit > 0) && (
            <div className="mt-3 text-xs text-muted-foreground">
              {!isBalanced && (
                <p className="text-red-500">
                  * 차변 합계와 대변 합계가 일치해야 저장할 수 있습니다.
                </p>
              )}
              {entries.filter(
                (e) =>
                  e.accountId &&
                  (parseAmount(e.debitAmount) > 0 || parseAmount(e.creditAmount) > 0)
              ).length < 2 && (
                <p className="text-red-500">
                  * 최소 2개 이상의 유효한 분개 항목이 필요합니다.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
