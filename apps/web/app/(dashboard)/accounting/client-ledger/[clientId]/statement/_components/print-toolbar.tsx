'use client';

import { useState } from 'react';
import { ArrowLeft, Printer, Share2, Mail, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSendStatementEmail } from '@/hooks/use-client-ledger';
import { shareStatementViaKakao } from '@/lib/kakao-share';
import { toast } from '@/hooks/use-toast';

interface PrintToolbarProps {
  onBack: () => void;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  statementType?: string;
  startDate?: string;
  endDate?: string;
  closingBalance?: number;
}

const STATEMENT_TYPE_LABELS: Record<string, string> = {
  detail: '세부거래내역서',
  daily: '일별거래내역서',
  monthly: '월별거래내역서',
  period: '기간별거래내역서',
};

export function PrintToolbar({
  onBack,
  clientId,
  clientName,
  clientEmail,
  statementType,
  startDate,
  endDate,
  closingBalance,
}: PrintToolbarProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState(clientEmail || '');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const sendEmailMutation = useSendStatementEmail();

  const handleSendEmail = async () => {
    if (!emailTo || !clientId) {
      toast({ title: '수신 이메일 주소를 입력하세요.', variant: 'destructive' });
      return;
    }

    sendEmailMutation.mutate(
      {
        clientId,
        to: emailTo,
        subject: emailSubject || undefined,
        message: emailMessage || undefined,
        statementType: statementType || 'detail',
        startDate,
        endDate,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({ title: '이메일이 발송되었습니다.' });
            setEmailDialogOpen(false);
          } else {
            toast({
              title: '이메일 발송 실패',
              description: result.error || '알 수 없는 오류가 발생했습니다.',
              variant: 'destructive',
            });
          }
        },
        onError: (error: any) => {
          toast({
            title: '이메일 발송 실패',
            description: error.message || '서버 오류가 발생했습니다.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const handleShareKakao = async () => {
    try {
      const currentUrl = window.location.href;
      await shareStatementViaKakao({
        clientName: clientName || '거래처',
        statementType: statementType || 'detail',
        startDate: startDate || '',
        endDate: endDate || '',
        closingBalance: closingBalance || 0,
        statementUrl: currentUrl,
      });
    } catch (error: any) {
      toast({
        title: '카카오톡 공유 실패',
        description: error.message || '카카오톡 공유를 사용할 수 없습니다.',
        variant: 'destructive',
      });
    }
  };

  const showShareOptions = !!clientId;

  return (
    <>
      <div className="no-print bg-white border-b sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          {showShareOptions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  공유
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setEmailTo(clientEmail || '');
                  setEmailSubject('');
                  setEmailMessage('');
                  setEmailDialogOpen(true);
                }}>
                  <Mail className="h-4 w-4 mr-2" />
                  이메일 발송
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareKakao}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  카카오톡 공유
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            인쇄하기
          </Button>
        </div>
      </div>

      {/* 이메일 발송 다이얼로그 */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>거래내역서 이메일 발송</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>수신자 이메일 *</Label>
              <Input
                type="email"
                placeholder="example@email.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>제목 (미입력 시 자동 생성)</Label>
              <Input
                placeholder={`${clientName || '거래처'} 거래내역서`}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>추가 메시지</Label>
              <Textarea
                placeholder="거래내역서와 함께 전달할 메시지를 입력하세요."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <p>{clientName} / {startDate} ~ {endDate}</p>
              <p>유형: {STATEMENT_TYPE_LABELS[statementType || 'detail']}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSendEmail} disabled={sendEmailMutation.isPending}>
              {sendEmailMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              발송하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
