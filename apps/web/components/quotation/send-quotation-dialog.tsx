'use client';

import { useState } from 'react';
import { Send, Loader2, MessageSquare, Mail, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PhoneInput } from '@/components/ui/phone-input';
import { useToast } from '@/hooks/use-toast';
import { useSendQuotation } from '@/hooks/use-quotation';
import { Quotation } from '@/lib/types/quotation';

interface SendQuotationDialogProps {
  quotation: Quotation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendQuotationDialog({ quotation, open, onOpenChange }: SendQuotationDialogProps) {
  const { toast } = useToast();
  const sendMutation = useSendQuotation();

  const defaultPhone = quotation.client?.mobile || quotation.client?.phone || quotation.clientPhone || '';
  const defaultEmail = quotation.client?.email || quotation.clientEmail || '';

  const [method, setMethod] = useState<'kakao' | 'sms' | 'email'>('kakao');
  const [recipientPhone, setRecipientPhone] = useState(defaultPhone);
  const [recipientEmail, setRecipientEmail] = useState(defaultEmail);
  const [message, setMessage] = useState('');

  const customerName = quotation.client?.clientName || quotation.clientName || '고객';

  const handleSend = async () => {
    if ((method === 'kakao' || method === 'sms') && !recipientPhone) {
      toast({ title: '수신 전화번호를 입력하세요.', variant: 'destructive' });
      return;
    }
    if (method === 'email' && !recipientEmail) {
      toast({ title: '수신 이메일을 입력하세요.', variant: 'destructive' });
      return;
    }

    try {
      await sendMutation.mutateAsync({
        id: quotation.id,
        dto: {
          method,
          recipientPhone: recipientPhone || undefined,
          recipientEmail: recipientEmail || undefined,
          message: message || undefined,
        },
      });
      toast({ title: '견적서가 발송되었습니다.' });
      onOpenChange(false);
    } catch {
      toast({ title: '발송에 실패했습니다.', variant: 'destructive' });
    }
  };

  const methodLabels = {
    kakao: '카카오톡',
    sms: 'SMS',
    email: '이메일',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[18px] text-black font-bold">견적서 발송</DialogTitle>
          <DialogDescription>
            {quotation.quotationNumber} - {quotation.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 견적 요약 */}
          <div className="p-3 bg-gray-50 rounded-lg space-y-1">
            <p className="text-[14px] text-black font-normal">
              <span className="font-medium">고객:</span> {customerName}
            </p>
            <p className="text-[14px] text-black font-normal">
              <span className="font-medium">총 금액:</span>{' '}
              <span className="text-pink-600 font-bold">
                {Number(quotation.finalAmount).toLocaleString('ko-KR')}원
              </span>
            </p>
          </div>

          {/* 발송 방법 */}
          <div>
            <Label className="text-[14px] text-black font-normal">발송 방법</Label>
            <RadioGroup
              value={method}
              onValueChange={(v) => setMethod(v as 'kakao' | 'sms' | 'email')}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kakao" id="kakao" />
                <Label htmlFor="kakao" className="text-[14px] text-black font-normal flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" /> 카카오톡
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms" className="text-[14px] text-black font-normal flex items-center gap-1">
                  <Phone className="h-4 w-4" /> SMS
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="text-[14px] text-black font-normal flex items-center gap-1">
                  <Mail className="h-4 w-4" /> 이메일
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 수신 정보 */}
          {(method === 'kakao' || method === 'sms') && (
            <div>
              <Label className="text-[14px] text-black font-normal">수신 전화번호</Label>
              <PhoneInput
                value={recipientPhone}
                onChange={setRecipientPhone}
                placeholder="010-0000-0000"
                className="mt-1"
              />
            </div>
          )}

          {method === 'email' && (
            <div>
              <Label className="text-[14px] text-black font-normal">수신 이메일</Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1"
              />
            </div>
          )}

          {/* 추가 메시지 */}
          <div>
            <Label className="text-[14px] text-black font-normal">추가 메시지 (선택)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="견적서와 함께 전달할 메시지..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending}
            className="bg-pink-500 hover:bg-pink-600"
          >
            {sendMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {methodLabels[method]}으로 발송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
