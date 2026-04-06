'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  FileText,
  ArrowLeft,
  Edit,
  Trash2,
  Send,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useQuotation, useDeleteQuotation } from '@/hooks/use-quotation';
import {
  QuotationStatus,
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUS_COLORS,
  QUOTATION_TYPE_LABELS,
  QuotationType,
} from '@/lib/types/quotation';
import { SendQuotationDialog } from '@/components/quotation/send-quotation-dialog';
import Link from 'next/link';

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const { data: quotation, isLoading } = useQuotation(id);
  const deleteMutation = useDeleteQuotation();

  const [sendOpen, setSendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: '견적이 삭제되었습니다.' });
      router.push('/cs/quotations');
    } catch {
      toast({ title: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  const formatAmount = (amount: number | string) => Number(amount).toLocaleString('ko-KR');

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-6 text-center">
        <p className="text-[14px] text-black font-normal">견적을 찾을 수 없습니다.</p>
        <Link href="/cs/quotations">
          <Button className="mt-4" variant="outline">목록으로</Button>
        </Link>
      </div>
    );
  }

  const customerName = quotation.client?.clientName || quotation.clientName || '-';
  const customerPhone = quotation.client?.phone || quotation.clientPhone || '-';
  const customerEmail = quotation.client?.email || quotation.clientEmail || '-';

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cs/quotations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-[24px] text-black font-normal flex items-center gap-2">
              <FileText className="h-7 w-7" />
              {quotation.quotationNumber}
            </h1>
            <p className="text-[14px] text-black font-normal mt-1">{quotation.title}</p>
          </div>
          <Badge className={QUOTATION_STATUS_COLORS[quotation.status as QuotationStatus] || 'bg-gray-100 text-gray-700'}>
            {QUOTATION_STATUS_LABELS[quotation.status as QuotationStatus] || quotation.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSendOpen(true)}
          >
            <Send className="mr-2 h-4 w-4" /> 발송
          </Button>
          <Link href={`/cs/quotations/${id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" /> 수정
            </Button>
          </Link>
          <Button variant="outline" className="text-red-500" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> 삭제
          </Button>
        </div>
      </div>

      {/* 기본 정보 + 고객 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[18px] text-black font-bold">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="견적번호" value={quotation.quotationNumber} />
            <InfoRow label="분류" value={QUOTATION_TYPE_LABELS[quotation.quotationType as QuotationType] || quotation.quotationType} />
            {quotation.subType && <InfoRow label="세부분류" value={quotation.subType} />}
            <InfoRow label="작성일" value={format(new Date(quotation.createdAt), 'yyyy-MM-dd HH:mm', { locale: ko })} />
            {quotation.validUntil && (
              <InfoRow label="유효기한" value={format(new Date(quotation.validUntil), 'yyyy-MM-dd', { locale: ko })} />
            )}
            {quotation.sentAt && (
              <InfoRow label="발송일" value={`${format(new Date(quotation.sentAt), 'yyyy-MM-dd HH:mm', { locale: ko })} (${quotation.sentMethod === 'kakao' ? '카카오톡' : quotation.sentMethod === 'sms' ? 'SMS' : '이메일'})`} />
            )}
            {quotation.staff && <InfoRow label="담당자" value={quotation.staff.name} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[18px] text-black font-bold">고객 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="고객명" value={customerName} />
            <InfoRow label="연락처" value={customerPhone} />
            <InfoRow label="이메일" value={customerEmail} />
            {quotation.client?.group && (
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-black font-normal w-20">그룹</span>
                <Badge className="bg-blue-100 text-blue-700">{quotation.client.group.groupName}</Badge>
              </div>
            )}
            {quotation.clientId ? (
              <Badge variant="outline">회원</Badge>
            ) : (
              <Badge variant="outline">비회원</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 견적 항목 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">견적 항목</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>품목명</TableHead>
                <TableHead className="w-[120px]">규격</TableHead>
                <TableHead className="w-[80px]">양면/단면</TableHead>
                <TableHead className="w-[80px] text-center">수량</TableHead>
                <TableHead className="w-[120px] text-right">단가</TableHead>
                <TableHead className="w-[120px] text-right">소계</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(quotation.items || []).map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-[14px] text-black font-normal">{idx + 1}</TableCell>
                  <TableCell className="text-[14px] text-black font-normal">{item.itemName}</TableCell>
                  <TableCell className="text-[14px] text-black font-normal">{item.specification || '-'}</TableCell>
                  <TableCell className="text-center">
                    {item.printSide && (
                      <Badge
                        variant="outline"
                        className={item.printSide === 'double' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}
                      >
                        {item.printSide === 'double' ? '양면' : '단면'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-[14px] text-black font-normal text-center">{item.quantity}</TableCell>
                  <TableCell className="text-[14px] text-black font-normal text-right">{formatAmount(item.unitPrice)}원</TableCell>
                  <TableCell className="text-[14px] text-black font-normal text-right">{formatAmount(item.totalPrice)}원</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 합계 */}
          <div className="border-t p-4 space-y-2">
            <div className="flex justify-between text-[14px] text-black font-normal">
              <span>공급가액</span>
              <span>{formatAmount(quotation.totalAmount)}원</span>
            </div>
            <div className="flex justify-between text-[14px] text-black font-normal">
              <span>부가세 (10%)</span>
              <span>{formatAmount(quotation.tax)}원</span>
            </div>
            <div className="flex justify-between text-[18px] text-black font-bold border-t pt-2">
              <span>총 견적금액</span>
              <span className="text-pink-600">{formatAmount(quotation.finalAmount)}원</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메모 */}
      {quotation.memo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[18px] text-black font-bold">메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[14px] text-black font-normal whitespace-pre-wrap">{quotation.memo}</p>
          </CardContent>
        </Card>
      )}

      {/* 발송 다이얼로그 */}
      <SendQuotationDialog
        quotation={quotation}
        open={sendOpen}
        onOpenChange={setSendOpen}
      />

      {/* 삭제 확인 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>견적 삭제</DialogTitle>
            <DialogDescription>
              &quot;{quotation.title}&quot; 견적을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[14px] text-black font-normal w-20 shrink-0">{label}</span>
      <span className="text-[14px] text-black font-normal">{value}</span>
    </div>
  );
}
