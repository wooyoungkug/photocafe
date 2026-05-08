'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Edit,
  Trash2,
  Loader2,
  ArrowLeft,
  Paperclip,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  usePurchaseQuotation,
  useDeletePurchaseQuotation,
} from '@/hooks/use-purchase-quotation';
import { API_BASE_URL } from '@/lib/api';

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fileViewUrl(url: string): string {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url}`;
}

export default function PurchaseQuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, isError } = usePurchaseQuotation(id);
  const deleteMutation = useDeletePurchaseQuotation();

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: '매입처 견적이 삭제되었습니다.' });
      router.push('/cs/purchase-quotations');
    } catch {
      toast({ title: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[14px] text-black font-normal">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        불러오는 중...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-[14px] text-black font-normal">
        매입처 견적을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/cs/purchase-quotations')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            목록
          </Button>
          <h1 className="text-[24px] text-black font-normal flex items-center gap-2">
            <FileText className="h-7 w-7" />
            매입처 견적 상세
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/cs/purchase-quotations/${data.id}/edit`)
            }
          >
            <Edit className="h-4 w-4 mr-1" />
            수정
          </Button>
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="매입처명" value={data.vendorName} />
            <Field
              label="받은날짜"
              value={format(new Date(data.receivedAt), 'yyyy-MM-dd', {
                locale: ko,
              })}
            />
            <Field label="담당자" value={data.manager || '-'} />
            <Field label="관련부서" value={data.department || '-'} />
            <Field label="제목" value={data.title || '-'} fullWidth />
            <Field
              label="등록자"
              value={
                data.staff
                  ? `${data.staff.name}${data.staff.staffId ? ` (${data.staff.staffId})` : ''}`
                  : '-'
              }
            />
            <Field
              label="등록일"
              value={format(new Date(data.createdAt), 'yyyy-MM-dd HH:mm', {
                locale: ko,
              })}
            />
          </dl>
          {data.note && (
            <div className="mt-4">
              <dt className="text-[14px] text-black font-bold mb-1">메모</dt>
              <dd className="text-[14px] text-black font-normal whitespace-pre-wrap bg-gray-50 rounded-md p-3">
                {data.note}
              </dd>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            첨부파일 ({data.files?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data.files || data.files.length === 0 ? (
            <div className="text-[14px] text-black font-normal text-center py-6">
              첨부된 파일이 없습니다.
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {data.files.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 shrink-0 text-gray-500" />
                    <span className="text-[14px] text-black font-normal truncate">
                      {f.name}
                    </span>
                    {f.size !== undefined && (
                      <span className="text-[14px] text-gray-500 font-normal shrink-0">
                        ({formatBytes(f.size)})
                      </span>
                    )}
                  </div>
                  <a
                    href={fileViewUrl(f.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      열기
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">
              매입처 견적 삭제
            </DialogTitle>
            <DialogDescription className="text-[14px] text-black font-normal">
              <strong>{data.vendorName}</strong> 견적을 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
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

function Field({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <dt className="text-[14px] text-black font-bold">{label}</dt>
      <dd className="text-[14px] text-black font-normal mt-0.5">{value}</dd>
    </div>
  );
}
