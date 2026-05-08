'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/hooks/use-toast';
import {
  usePurchaseQuotations,
  useDeletePurchaseQuotation,
} from '@/hooks/use-purchase-quotation';

export default function PurchaseQuotationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    vendorName: string;
  } | null>(null);

  const { data, isLoading } = usePurchaseQuotations({
    page,
    limit: 20,
    search: search || undefined,
  });

  const deleteMutation = useDeletePurchaseQuotation();

  const items = data?.data ?? [];
  const pagination = data?.pagination;

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      toast({ title: '매입처 견적이 삭제되었습니다.' });
      setDeleteConfirm(null);
    } catch {
      toast({ title: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] text-black font-normal flex items-center gap-2">
            <FileText className="h-7 w-7" />
            매입처 견적관리
          </h1>
          <p className="text-[14px] text-black font-normal mt-1">
            거래처에서 받은 견적서를 등록하고 보관합니다
          </p>
        </div>
        <Link href="/cs/purchase-quotations/new">
          <Button className="bg-pink-500 hover:bg-pink-600">
            <Plus className="mr-2 h-4 w-4" />
            등록
          </Button>
        </Link>
      </div>

      {/* 검색 */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="매입처명, 담당자, 부서, 제목 검색..."
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 목록 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-[14px] text-black font-normal">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              불러오는 중...
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-[14px] text-black font-normal">
              등록된 매입처 견적이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[14px] font-bold text-black">
                    매입처명
                  </TableHead>
                  <TableHead className="text-[14px] font-bold text-black">
                    받은날짜
                  </TableHead>
                  <TableHead className="text-[14px] font-bold text-black">
                    담당자
                  </TableHead>
                  <TableHead className="text-[14px] font-bold text-black">
                    관련부서
                  </TableHead>
                  <TableHead className="text-[14px] font-bold text-black">
                    제목
                  </TableHead>
                  <TableHead className="text-[14px] font-bold text-black text-center">
                    파일
                  </TableHead>
                  <TableHead className="text-[14px] font-bold text-black">
                    등록일
                  </TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      router.push(`/cs/purchase-quotations/${item.id}`)
                    }
                  >
                    <TableCell className="text-[14px] text-black font-normal">
                      {item.vendorName}
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {format(new Date(item.receivedAt), 'yyyy-MM-dd', {
                        locale: ko,
                      })}
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {item.manager || '-'}
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {item.department || '-'}
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal max-w-[280px] truncate">
                      {item.title || '-'}
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal text-center">
                      {item.files?.length ? (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3.5 w-3.5" />
                          {item.files.length}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-[14px] text-black font-normal">
                      {format(new Date(item.createdAt), 'yyyy-MM-dd', {
                        locale: ko,
                      })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDeleteConfirm({
                            id: item.id,
                            vendorName: item.vendorName,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            이전
          </Button>
          <span className="text-[14px] text-black font-normal px-4">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">
              매입처 견적 삭제
            </DialogTitle>
            <DialogDescription className="text-[14px] text-black font-normal">
              <strong>{deleteConfirm?.vendorName}</strong> 견적을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
