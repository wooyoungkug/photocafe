'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Shield,
  ShieldX,
  Eye,
  Trash2,
  Plus,
  Search,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import {
  useSuspiciousIps,
  useCreateSuspiciousIp,
  useUpdateSuspiciousIp,
  useDeleteSuspiciousIp,
  type SuspiciousIp,
} from '@/hooks/use-suspicious-ip';
import { toast } from 'sonner';

const ACTION_LABELS: Record<string, string> = {
  block: '차단',
  monitor: '모니터링',
};

const COUNTRY_LABELS: Record<string, string> = {
  KR: '한국',
  US: '미국',
  JP: '일본',
  CN: '중국',
  DE: '독일',
  GB: '영국',
  AU: '호주',
  CA: '캐나다',
  FR: '프랑스',
  SG: '싱가포르',
  TW: '대만',
  HK: '홍콩',
  VN: '베트남',
  TH: '태국',
  IN: '인도',
  RU: '러시아',
  NL: '네덜란드',
};

function getCountryLabel(country: string | null): string {
  if (!country) return '—';
  return COUNTRY_LABELS[country] || country;
}

function ActionBadge({ action, isActive }: { action: string; isActive: boolean }) {
  if (!isActive) return <Badge variant="secondary" className="text-xs text-slate-400">비활성</Badge>;
  if (action === 'block') return <Badge variant="destructive" className="text-xs">차단 중</Badge>;
  return <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-100">모니터링</Badge>;
}

interface RegisterDialogProps {
  open: boolean;
  onClose: () => void;
}

function RegisterDialog({ open, onClose }: RegisterDialogProps) {
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<'block' | 'monitor'>('monitor');
  const [memo, setMemo] = useState('');
  const createMutation = useCreateSuspiciousIp();

  async function handleSubmit() {
    if (!ip.trim()) {
      toast.error('IP 주소를 입력하세요.');
      return;
    }
    try {
      await createMutation.mutateAsync({ ip: ip.trim(), reason, action, memo });
      toast.success(`${ip} 를 등록했습니다.`);
      setIp(''); setReason(''); setAction('monitor'); setMemo('');
      onClose();
    } catch {
      toast.error('이미 등록된 IP이거나 오류가 발생했습니다.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" />
            의심 IP 등록
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">IP 주소 *</label>
            <Input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="예: 123.456.789.0"
              className="font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">조치</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAction('monitor')}
                className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                  action === 'monitor'
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Eye className="h-3.5 w-3.5 inline mr-1" />
                모니터링
              </button>
              <button
                onClick={() => setAction('block')}
                className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                  action === 'block'
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ShieldX className="h-3.5 w-3.5 inline mr-1" />
                접속 차단
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">등록 사유</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 무차별 로그인 시도"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">메모</label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="추가 메모 (선택)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? '등록 중...' : '등록'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MemoDialogProps {
  item: SuspiciousIp | null;
  onClose: () => void;
}

function MemoDialog({ item, onClose }: MemoDialogProps) {
  const [memo, setMemo] = useState(item?.memo || '');
  const [reason, setReason] = useState(item?.reason || '');
  const updateMutation = useUpdateSuspiciousIp();

  async function handleSave() {
    if (!item) return;
    try {
      await updateMutation.mutateAsync({ id: item.id, payload: { memo, reason } });
      toast.success('저장했습니다.');
      onClose();
    } catch {
      toast.error('저장에 실패했습니다.');
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{item?.ip} 상세</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">등록 사유</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">메모</label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SuspiciousIpsPage() {
  const [filterAction, setFilterAction] = useState<string>('');
  const [search, setSearch] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [memoItem, setMemoItem] = useState<SuspiciousIp | null>(null);

  const { data: items, isLoading, refetch } = useSuspiciousIps(filterAction || undefined, search || undefined);
  const updateMutation = useUpdateSuspiciousIp();
  const deleteMutation = useDeleteSuspiciousIp();

  async function handleToggleAction(item: SuspiciousIp) {
    const newAction = item.action === 'block' ? 'monitor' : 'block';
    try {
      await updateMutation.mutateAsync({ id: item.id, payload: { action: newAction } });
      toast.success(
        newAction === 'block'
          ? `${item.ip} 차단 처리했습니다.`
          : `${item.ip} 모니터링으로 변경했습니다.`
      );
    } catch {
      toast.error('변경에 실패했습니다.');
    }
  }

  async function handleToggleActive(item: SuspiciousIp) {
    try {
      await updateMutation.mutateAsync({ id: item.id, payload: { isActive: !item.isActive } });
      toast.success(item.isActive ? '비활성화했습니다.' : '활성화했습니다.');
    } catch {
      toast.error('변경에 실패했습니다.');
    }
  }

  async function handleDelete(item: SuspiciousIp) {
    if (!confirm(`${item.ip} 를 목록에서 삭제하시겠습니까?`)) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      toast.success(`${item.ip} 를 삭제했습니다.`);
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  }

  const blockedCount = (items ?? []).filter((i) => i.action === 'block' && i.isActive).length;
  const monitorCount = (items ?? []).filter((i) => i.action === 'monitor' && i.isActive).length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/analytics"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            접속 통계
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-500" />
              의심 IP 관리
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">차단 및 모니터링 IP 목록</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button size="sm" onClick={() => setRegisterOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            IP 등록
          </Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-slate-500">차단 중</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{blockedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-slate-500">모니터링 중</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{monitorCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-slate-500">전체 등록</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{(items ?? []).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="IP 검색..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {['', 'block', 'monitor'].map((f) => (
            <Button
              key={f}
              variant={filterAction === f ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => setFilterAction(f)}
            >
              {f === '' ? '전체' : ACTION_LABELS[f]}
            </Button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            총 {(items ?? []).length}개
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center text-slate-400">로딩 중...</div>
          ) : (items ?? []).length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Shield className="h-8 w-8 opacity-30" />
              <p className="text-sm">등록된 의심 IP가 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="text-left py-2 pr-3 font-medium">IP</th>
                    <th className="text-left py-2 pr-3 font-medium">위치</th>
                    <th className="text-right py-2 pr-3 font-medium">방문수</th>
                    <th className="text-left py-2 pr-3 font-medium">사유</th>
                    <th className="text-left py-2 pr-3 font-medium">메모</th>
                    <th className="text-left py-2 pr-3 font-medium">상태</th>
                    <th className="text-left py-2 pr-3 font-medium">등록일</th>
                    <th className="text-right py-2 font-medium">조치</th>
                  </tr>
                </thead>
                <tbody>
                  {(items ?? []).map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        item.action === 'block' && item.isActive ? 'bg-red-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 pr-3 font-mono text-xs font-medium text-slate-800">
                        {item.ip}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-slate-600">
                        {getCountryLabel(item.country)}
                        {item.city ? ` · ${item.city}` : ''}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-xs text-slate-700">
                        {item.visitCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-slate-600 max-w-[120px] truncate">
                        {item.reason || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-slate-500 max-w-[120px] truncate">
                        {item.memo || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <ActionBadge action={item.action} isActive={item.isActive} />
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {/* 차단 ↔ 모니터링 토글 */}
                          <Button
                            size="sm"
                            variant="outline"
                            className={`h-6 px-2 text-xs ${
                              item.action === 'block'
                                ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                                : 'text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                            onClick={() => handleToggleAction(item)}
                            disabled={updateMutation.isPending || !item.isActive}
                            title={item.action === 'block' ? '모니터링으로 변경' : '차단으로 변경'}
                          >
                            {item.action === 'block' ? (
                              <><Eye className="h-3 w-3 mr-0.5" />모니터링</>
                            ) : (
                              <><ShieldX className="h-3 w-3 mr-0.5" />차단</>
                            )}
                          </Button>
                          {/* 활성/비활성 토글 */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs text-slate-500 hover:bg-slate-100"
                            onClick={() => handleToggleActive(item)}
                            disabled={updateMutation.isPending}
                            title={item.isActive ? '비활성화' : '활성화'}
                          >
                            {item.isActive ? '해제' : '활성'}
                          </Button>
                          {/* 메모 편집 */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                            onClick={() => setMemoItem(item)}
                            title="메모 편집"
                          >
                            ✏️
                          </Button>
                          {/* 삭제 */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                            onClick={() => handleDelete(item)}
                            disabled={deleteMutation.isPending}
                            title="삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 안내 */}
      <Card className="border-0 shadow-sm bg-blue-50">
        <CardContent className="py-3 px-4">
          <p className="text-xs text-blue-700 font-medium mb-1">차단 동작 안내</p>
          <ul className="text-xs text-blue-600 space-y-0.5 list-disc pl-4">
            <li><strong>차단(block)</strong>: 해당 IP의 모든 API 요청에 403 반환. 캐시 갱신 주기 최대 5분.</li>
            <li><strong>모니터링(monitor)</strong>: 접속은 허용하되 의심 목록에서 별도 관찰.</li>
            <li><strong>해제</strong>: 비활성 상태로 전환. 기록은 유지되며 차단 효력만 중지.</li>
          </ul>
        </CardContent>
      </Card>

      <RegisterDialog open={registerOpen} onClose={() => setRegisterOpen(false)} />
      <MemoDialog item={memoItem} onClose={() => setMemoItem(null)} />
    </div>
  );
}
