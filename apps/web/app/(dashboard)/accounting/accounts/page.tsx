'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  BookOpen,
  Loader2,
  AlertCircle,
  DatabaseZap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

// ===== 타입 정의 =====
interface Account {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  type: AccountType;
  level: number;
  parentId?: string | null;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  parent?: Account | null;
  children?: Account[];
}

type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

interface CreateAccountDto {
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  description?: string;
  sortOrder?: number;
}

interface SeedResult {
  created: number;
  updated: number;
  total: number;
}

// ===== 상수 =====
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'ASSET', label: '자산' },
  { value: 'LIABILITY', label: '부채' },
  { value: 'EQUITY', label: '자본' },
  { value: 'REVENUE', label: '수익' },
  { value: 'EXPENSE', label: '비용' },
];

const TYPE_BADGE_CONFIG: Record<AccountType, { label: string; className: string }> = {
  ASSET: { label: '자산', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  LIABILITY: { label: '부채', className: 'bg-red-100 text-red-700 border-red-200' },
  EQUITY: { label: '자본', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  REVENUE: { label: '수익', className: 'bg-green-100 text-green-700 border-green-200' },
  EXPENSE: { label: '비용', className: 'bg-orange-100 text-orange-700 border-orange-200' },
};

// ===== API 함수 =====
async function fetchAccounts(): Promise<Account[]> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      : null;

  const res = await fetch(`${API_URL}/accounting/accounts`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    throw new Error('계정과목 목록을 불러오지 못했습니다.');
  }

  return res.json();
}

async function createAccount(data: CreateAccountDto): Promise<Account> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      : null;

  const res = await fetch(`${API_URL}/accounting/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: '계정과목 등록에 실패했습니다.' }));
    throw new Error(error.message || '계정과목 등록에 실패했습니다.');
  }

  return res.json();
}

async function deleteAccount(id: string): Promise<void> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      : null;

  const res = await fetch(`${API_URL}/accounting/accounts/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: '계정과목 비활성화에 실패했습니다.' }));
    throw new Error(error.message || '계정과목 비활성화에 실패했습니다.');
  }
}

async function seedAccounts(): Promise<SeedResult> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      : null;

  const res = await fetch(`${API_URL}/accounting/accounts/seed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: '표준 계정과목 등록에 실패했습니다.' }));
    throw new Error(error.message || '표준 계정과목 등록에 실패했습니다.');
  }

  return res.json();
}

// ===== 초기 폼 상태 =====
const INITIAL_FORM: CreateAccountDto = {
  code: '',
  name: '',
  type: 'ASSET',
  parentId: undefined,
  description: '',
  sortOrder: 0,
};

// ===== 페이지 컴포넌트 =====
export default function AccountsPage() {
  const queryClient = useQueryClient();

  // 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateAccountDto>({ ...INITIAL_FORM });

  // 데이터 조회
  const {
    data: accounts = [],
    isLoading,
    isError,
    error,
  } = useQuery<Account[]>({
    queryKey: ['accounting-accounts'],
    queryFn: fetchAccounts,
  });

  // 계정과목 생성
  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] });
      toast({ title: '계정과목이 등록되었습니다.' });
      setIsAddDialogOpen(false);
      setForm({ ...INITIAL_FORM });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // 계정과목 비활성화 (소프트 삭제)
  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] });
      toast({ title: '계정과목이 비활성화되었습니다.' });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // 표준 계정과목 시드
  const seedMutation = useMutation({
    mutationFn: seedAccounts,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] });
      toast({
        title: '표준 계정과목이 등록되었습니다.',
        description: `신규 ${result.created}건, 업데이트 ${result.updated}건 (총 ${result.total}건)`,
      });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: 'destructive' });
    },
  });

  // 필터링된 계정과목 목록
  const filteredAccounts = useMemo(() => {
    let list = accounts;

    // 탭 필터
    if (activeTab !== 'all') {
      list = list.filter((account) => account.type === activeTab);
    }

    // 검색어 필터
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter(
        (account) =>
          account.code.toLowerCase().includes(term) ||
          account.name.toLowerCase().includes(term)
      );
    }

    // 정렬: sortOrder -> code
    return [...list].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.code.localeCompare(b.code);
    });
  }, [accounts, activeTab, searchTerm]);

  // 유형별 개수 집계
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: accounts.length };
    ACCOUNT_TYPES.forEach(({ value }) => {
      counts[value] = accounts.filter((a) => a.type === value).length;
    });
    return counts;
  }, [accounts]);

  // 등록 폼 제출
  const handleSubmit = () => {
    if (!form.code.trim()) {
      toast({ title: '계정 코드를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: '계정과목명을 입력해주세요.', variant: 'destructive' });
      return;
    }

    createMutation.mutate({
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      parentId: form.parentId || undefined,
      description: form.description?.trim() || undefined,
      sortOrder: form.sortOrder || undefined,
    });
  };

  // Dialog 열기
  const openAddDialog = () => {
    setForm({ ...INITIAL_FORM });
    setIsAddDialogOpen(true);
  };

  // 유형 Badge 렌더링
  const renderTypeBadge = (type: AccountType) => {
    const config = TYPE_BADGE_CONFIG[type];
    return (
      <Badge className={`${config.className} text-xs`}>
        {config.label}
      </Badge>
    );
  };

  // 상태 Badge 렌더링
  const renderStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">활성</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs">비활성</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">계정과목 관리</h1>
          <p className="text-muted-foreground">
            계정과목을 조회하고 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <DatabaseZap className="h-4 w-4 mr-2" />
            )}
            표준 계정과목 등록
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            계정과목 추가
          </Button>
        </div>
      </div>

      {/* 탭 + 검색 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">
              전체 ({typeCounts.all})
            </TabsTrigger>
            {ACCOUNT_TYPES.map(({ value, label }) => (
              <TabsTrigger key={value} value={value}>
                {label} ({typeCounts[value] || 0})
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="코드 또는 계정과목명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* 테이블 - 모든 탭에서 동일한 구조 사용 */}
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                계정과목 목록
                <span className="text-muted-foreground font-normal text-sm">
                  ({filteredAccounts.length}건)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[120px]">코드</TableHead>
                    <TableHead>계정과목명</TableHead>
                    <TableHead className="w-[100px] text-center">유형</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead className="w-[80px] text-center">상태</TableHead>
                    <TableHead className="w-[100px] text-center">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground">계정과목을 불러오는 중...</p>
                      </TableCell>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <AlertCircle className="h-8 w-8 mx-auto mb-3 text-red-400" />
                        <p className="text-red-600 font-medium">데이터를 불러오지 못했습니다.</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(error as Error)?.message || '서버 연결을 확인해주세요.'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        {searchTerm || activeTab !== 'all'
                          ? '검색 조건에 맞는 계정과목이 없습니다.'
                          : '등록된 계정과목이 없습니다. "표준 계정과목 등록" 버튼을 눌러 시작하세요.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts.map((account) => (
                      <TableRow key={account.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono font-bold text-sm">
                          {account.code}
                        </TableCell>
                        <TableCell>
                          <span
                            className="font-medium"
                            style={{ paddingLeft: `${(account.level - 1) * 16}px` }}
                          >
                            {account.level > 1 && (
                              <span className="text-muted-foreground mr-1">└</span>
                            )}
                            {account.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {renderTypeBadge(account.type)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {account.description || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {renderStatusBadge(account.isActive)}
                        </TableCell>
                        <TableCell className="text-center">
                          {account.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => deleteMutation.mutate(account.id)}
                              disabled={deleteMutation.isPending}
                            >
                              비활성화
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 계정과목 추가 Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>계정과목 추가</DialogTitle>
            <DialogDescription>
              새로운 계정과목을 등록합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* 계정 코드 */}
            <div className="space-y-2">
              <Label>계정 코드 *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="예: 101, 201, 301"
                className="font-mono"
              />
            </div>

            {/* 계정과목명 */}
            <div className="space-y-2">
              <Label>계정과목명 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: 현금, 매출채권, 매입채무"
              />
            </div>

            {/* 유형 */}
            <div className="space-y-2">
              <Label>유형 *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as AccountType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 상위 계정 */}
            <div className="space-y-2">
              <Label>상위 계정</Label>
              <Select
                value={form.parentId || '_none'}
                onValueChange={(v) =>
                  setForm({ ...form, parentId: v === '_none' ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="없음 (최상위)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">없음 (최상위)</SelectItem>
                  {accounts
                    .filter((a) => a.isActive && a.type === form.type)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label>설명</Label>
              <Input
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="계정과목 설명을 입력하세요"
              />
            </div>

            {/* 정렬순서 */}
            <div className="space-y-2">
              <Label>정렬순서</Label>
              <Input
                type="number"
                value={form.sortOrder || 0}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) })
                }
                placeholder="0"
                min={0}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  등록 중...
                </>
              ) : (
                '등록'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
