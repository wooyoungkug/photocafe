import { z } from 'zod';

export const paymentFormSchema = z.object({
  paymentDate: z.string().min(1, '입금일자를 선택하세요'),
  amount: z.coerce
    .number()
    .positive('입금액은 0보다 커야 합니다'),
  paymentMethod: z.enum(['bank_transfer', 'cash', 'card', 'check']),
  bankName: z.string().optional(),
  depositorName: z.string().optional(),
  note: z.string().max(200, '메모는 200자 이내로 입력하세요').optional(),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: '계좌이체',
  cash: '현금',
  card: '카드',
  check: '수표',
};

export const BANK_OPTIONS = [
  { value: 'IBK기업은행', label: 'IBK기업은행' },
  { value: 'KB국민은행', label: 'KB국민은행' },
  { value: '신한은행', label: '신한은행' },
  { value: '우리은행', label: '우리은행' },
  { value: '하나은행', label: '하나은행' },
  { value: 'NH농협은행', label: 'NH농협은행' },
  { value: 'SC제일은행', label: 'SC제일은행' },
  { value: '대구은행', label: '대구은행' },
  { value: '부산은행', label: '부산은행' },
  { value: '경남은행', label: '경남은행' },
  { value: '광주은행', label: '광주은행' },
  { value: '수협은행', label: '수협은행' },
  { value: '카카오뱅크', label: '카카오뱅크' },
  { value: '토스뱅크', label: '토스뱅크' },
  { value: '케이뱅크', label: '케이뱅크' },
  { value: '기타', label: '기타' },
] as const;
