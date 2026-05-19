'use client';

/**
 * 핫폴더 에이전트 관리 (Phase 8c).
 *
 * - 등록된 에이전트 토큰 목록 (이름/머신/최근 heartbeat/상태)
 * - 신규 토큰 발급 모달 — 평문 토큰은 발급 직후 1회만 표시
 * - 토큰 비활성화 (해당 PC 의 폴링이 거부됨)
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { Copy, PowerOff, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useAgentTokens,
  useCreateAgentToken,
  useDeactivateAgentToken,
  type AgentToken,
} from '@/hooks/use-agent';

const HEARTBEAT_ONLINE_SECONDS = 90; // 마지막 heartbeat 가 90초 이내면 online

function isOnline(lastHeartbeatAt: string | null): boolean {
  if (!lastHeartbeatAt) return false;
  const t = new Date(lastHeartbeatAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < HEARTBEAT_ONLINE_SECONDS * 1000;
}

export default function AgentSettingsPage() {
  const t = useTranslations('printRoom.agentSettings');
  const tokensQuery = useAgentTokens();
  const createMutation = useCreateAgentToken();
  const deactivateMutation = useDeactivateAgentToken();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [newPlainToken, setNewPlainToken] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<AgentToken | null>(null);

  function handleCreate() {
    if (!name.trim()) {
      toast.error(t('toast.requireName'));
      return;
    }
    createMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: (data) => {
          setNewPlainToken(data.token);
          setName('');
          toast.success(t('toast.created'));
        },
        onError: (err) => toast.error(err.message || t('toast.createFailed')),
      },
    );
  }

  function handleDeactivate() {
    if (!confirmDeactivate) return;
    deactivateMutation.mutate(confirmDeactivate.id, {
      onSuccess: () => {
        toast.success(t('toast.deactivated'));
        setConfirmDeactivate(null);
      },
      onError: (err) => toast.error(err.message || t('toast.deactivateFailed')),
    });
  }

  function handleCopyToken() {
    if (!newPlainToken) return;
    navigator.clipboard.writeText(newPlainToken).then(
      () => toast.success(t('toast.copied')),
      () => toast.error(t('toast.copyFailed')),
    );
  }

  const tokens = tokensQuery.data ?? [];
  const onlineCount = tokens.filter((t) => isOnline(t.lastHeartbeatAt)).length;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 헤더 */}
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[24px] text-black font-normal">{t('title')}</h1>
          <p className="text-[14px] text-black font-normal opacity-70 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Button
          onClick={() => {
            setCreateOpen(true);
            setNewPlainToken(null);
          }}
          className="h-9 text-[14px] font-normal"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('action.create')}
        </Button>
      </div>

      {/* 요약 카드 */}
      <Card>
        <CardContent className="p-4 flex items-center gap-6">
          <div>
            <div className="text-[14px] text-black font-normal opacity-70">
              {t('summary.total')}
            </div>
            <div className="text-[24px] text-black font-normal">
              {tokens.length}
            </div>
          </div>
          <div>
            <div className="text-[14px] text-black font-normal opacity-70">
              {t('summary.online')}
            </div>
            <div className="text-[24px] text-emerald-700 font-normal">
              {onlineCount}
            </div>
          </div>
          <div>
            <div className="text-[14px] text-black font-normal opacity-70">
              {t('summary.active')}
            </div>
            <div className="text-[24px] text-black font-normal">
              {tokens.filter((t) => t.isActive).length}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => tokensQuery.refetch()}
            disabled={tokensQuery.isFetching}
            className="h-9 text-[14px] font-normal ml-auto"
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${tokensQuery.isFetching ? 'animate-spin' : ''}`}
            />
            {t('action.refresh')}
          </Button>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.name')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.prefix')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.machine')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.lastHeartbeat')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.online')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.active')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold">
                  {t('column.createdAt')}
                </TableHead>
                <TableHead className="text-[14px] text-black font-bold text-right">
                  {t('column.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokensQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-[14px] font-normal">
                    {t('loading')}
                  </TableCell>
                </TableRow>
              )}
              {!tokensQuery.isLoading && tokens.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-[14px] font-normal">
                    {t('empty')}
                  </TableCell>
                </TableRow>
              )}
              {tokens.map((tk) => {
                const online = isOnline(tk.lastHeartbeatAt);
                return (
                  <TableRow key={tk.id}>
                    <TableCell className="text-[14px] text-black font-normal">
                      {tk.name}
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal font-mono">
                      {tk.tokenPrefix}…
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {tk.machineName ?? '-'}
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {tk.lastHeartbeatAt
                        ? formatDistanceToNow(new Date(tk.lastHeartbeatAt), {
                            addSuffix: true,
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {online ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[14px] font-normal">
                          {t('badge.online')}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-200 text-gray-700 text-[14px] font-normal">
                          {t('badge.offline')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {tk.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[14px] font-normal">
                          {t('badge.active')}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-200 text-gray-700 text-[14px] font-normal">
                          {t('badge.inactive')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {format(new Date(tk.createdAt), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell className="text-right">
                      {tk.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[14px] font-normal text-red-700"
                          onClick={() => setConfirmDeactivate(tk)}
                        >
                          <PowerOff className="h-3.5 w-3.5 mr-1" />
                          {t('action.deactivate')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 신규 토큰 발급 모달 */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setName('');
            setNewPlainToken(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">
              {newPlainToken
                ? t('dialog.createdTitle')
                : t('dialog.createTitle')}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-black font-normal">
              {newPlainToken
                ? t('dialog.createdDesc')
                : t('dialog.createDesc')}
            </DialogDescription>
          </DialogHeader>

          {!newPlainToken && (
            <div className="space-y-2">
              <Label className="text-[14px] text-black font-normal">
                {t('field.name')}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('placeholder.name')}
                className="h-9 text-[14px] font-normal"
              />
            </div>
          )}

          {newPlainToken && (
            <div className="space-y-2">
              <Label className="text-[14px] text-black font-bold">
                {t('field.token')}
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 p-2 rounded text-[14px] font-mono break-all">
                  {newPlainToken}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToken}
                  className="h-9 text-[14px] font-normal"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {t('action.copy')}
                </Button>
              </div>
              <div className="text-[14px] text-red-600 font-bold">
                {t('hint.onceOnly')}
              </div>
            </div>
          )}

          <DialogFooter>
            {!newPlainToken ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  className="h-9 text-[14px] font-normal"
                >
                  {t('action.cancel')}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="h-9 text-[14px] font-normal"
                >
                  {t('action.issue')}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setCreateOpen(false)}
                className="h-9 text-[14px] font-normal"
              >
                {t('action.done')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비활성화 확인 */}
      <Dialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => !open && setConfirmDeactivate(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">
              {t('dialog.deactivateTitle')}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-black font-normal">
              {confirmDeactivate &&
                t('dialog.deactivateDesc', { name: confirmDeactivate.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeactivate(null)}
              className="h-9 text-[14px] font-normal"
            >
              {t('action.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
              className="h-9 text-[14px] font-normal"
            >
              {t('action.deactivate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
