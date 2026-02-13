# Day 3 프롬프트: 수금 처리 및 자동 분개 구현

---

## 🎯 목표
수금 처리 기능 및 입금전표 자동 분개 시스템 구현

---

## 📋 Backend 요구사항

### 1. Account 모델 및 시드 데이터

**Prisma 스키마에 Account 모델 추가** (apps/api/prisma/schema.prisma):

```prisma
enum AccountType {
  ASSET           // 자산
  LIABILITY       // 부채
  EQUITY          // 자본
  REVENUE         // 수익
  EXPENSE         // 비용
}

model Account {
  id              String        @id @default(cuid())
  code            String        @unique  // 계정코드 (101, 201 등)
  name            String                 // 계정명
  type            AccountType            // 계정 유형
  description     String?
  isActive        Boolean       @default(true)

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@map("accounts")
}
```

**시드 데이터** (apps/api/prisma/seed.ts에 추가):

```typescript
const accounts = [
  { code: '101', name: '현금', type: 'ASSET' },
  { code: '102', name: '보통예금', type: 'ASSET' },
  { code: '110', name: '외상매출금', type: 'ASSET' },
  { code: '400', name: '매출', type: 'REVENUE' },
];

await prisma.account.createMany({
  data: accounts,
  skipDuplicates: true,
});
```

### 2. Journal 모델 (분개장)

**Prisma 스키마에 추가**:

```prisma
enum VoucherType {
  RECEIPT         // 입금전표
  PAYMENT         // 출금전표
  TRANSFER        // 대체전표
}

enum TransactionType {
  DEBIT           // 차변
  CREDIT          // 대변
}

model Journal {
  id              String        @id @default(cuid())
  voucherNo       String        @unique  // 전표번호 (V-2024-000001)
  voucherType     VoucherType            // 전표 유형

  journalDate     DateTime               // 전표 일자

  clientId        String?
  client          Client?       @relation(fields: [clientId], references: [id])

  description     String?                // 적요
  totalAmount     Decimal       @db.Decimal(12, 2)

  entries         JournalEntry[]

  createdBy       String
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([journalDate])
  @@index([clientId])
  @@map("journals")
}

model JournalEntry {
  id              String          @id @default(cuid())
  journalId       String
  journal         Journal         @relation(fields: [journalId], references: [id], onDelete: Cascade)

  accountCode     String          // 계정코드
  transactionType TransactionType // 차변/대변
  amount          Decimal         @db.Decimal(12, 2)
  description     String?

  sortOrder       Int             @default(0)

  @@map("journal_entries")
}
```

**ReceivablePayment 모델에 journalId 추가**:

```prisma
model ReceivablePayment {
  // ... 기존 필드들

  journalId       String?       // 연결된 입금전표
}
```

### 3. Journal Service 구현

**apps/api/src/modules/accounting/services/journal.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { VoucherType, TransactionType, Prisma } from '@prisma/client';

const ACCOUNT_CODES = {
  CASH: '101',              // 현금
  BANK_DEPOSIT: '102',      // 보통예금
  ACCOUNTS_RECEIVABLE: '110', // 외상매출금
  SALES: '400',             // 매출
};

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService) {}

  /**
   * 전표번호 자동 생성
   * 형식: V-YYYY-NNNNNN (예: V-2024-000001)
   */
  async generateVoucherNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `V-${year}-`;

    const lastJournal = await this.prisma.journal.findFirst({
      where: {
        voucherNo: { startsWith: prefix }
      },
      orderBy: { voucherNo: 'desc' }
    });

    let sequence = 1;
    if (lastJournal) {
      const lastSeq = parseInt(lastJournal.voucherNo.split('-')[2]);
      sequence = lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }

  /**
   * 입금전표 생성 (수금 처리)
   */
  async createReceiptJournal(params: {
    clientId: string;
    amount: Prisma.Decimal;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD';
    paymentDate: Date;
    description?: string;
    createdBy: string;
  }) {
    const voucherNo = await this.generateVoucherNo();

    // 현금 또는 보통예금 계정
    const cashAccountCode =
      params.paymentMethod === 'CASH'
        ? ACCOUNT_CODES.CASH
        : ACCOUNT_CODES.BANK_DEPOSIT;

    const journal = await this.prisma.journal.create({
      data: {
        voucherNo,
        voucherType: VoucherType.RECEIPT,
        journalDate: params.paymentDate,
        clientId: params.clientId,
        description: params.description || '매출 수금',
        totalAmount: params.amount,
        createdBy: params.createdBy,
        entries: {
          create: [
            {
              // 차변: 현금 또는 보통예금
              accountCode: cashAccountCode,
              transactionType: TransactionType.DEBIT,
              amount: params.amount,
              sortOrder: 1,
            },
            {
              // 대변: 외상매출금
              accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
              transactionType: TransactionType.CREDIT,
              amount: params.amount,
              sortOrder: 2,
            },
          ],
        },
      },
      include: {
        entries: true,
      },
    });

    return journal;
  }

  /**
   * 차대 균형 검증
   */
  validateBalance(entries: { transactionType: TransactionType; amount: Prisma.Decimal }[]): boolean {
    const debitTotal = entries
      .filter(e => e.transactionType === TransactionType.DEBIT)
      .reduce((sum, e) => sum.add(e.amount), new Prisma.Decimal(0));

    const creditTotal = entries
      .filter(e => e.transactionType === TransactionType.CREDIT)
      .reduce((sum, e) => sum.add(e.amount), new Prisma.Decimal(0));

    return debitTotal.equals(creditTotal);
  }
}
```

### 4. 수금 처리 API

**DTO**: create-payment.dto.ts

```typescript
import { IsNumber, IsDateString, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: '수금액' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: '수금일' })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ description: '수금방법', enum: ['CASH', 'BANK_TRANSFER', 'CARD'] })
  @IsEnum(['CASH', 'BANK_TRANSFER', 'CARD'])
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD';

  @ApiProperty({ description: '비고 (선택)', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
```

**ReceivablesService에 메서드 추가**:

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JournalService } from './journal.service';

@Injectable()
export class ReceivablesService {
  constructor(
    private prisma: PrismaService,
    private journalService: JournalService,
  ) {}

  /**
   * 수금 처리
   */
  async createPayment(receivableId: string, dto: CreatePaymentDto, userId: string) {
    const receivable = await this.prisma.receivable.findUnique({
      where: { id: receivableId },
      include: { client: true },
    });

    if (!receivable) {
      throw new NotFoundException('미수금을 찾을 수 없습니다.');
    }

    // 수금액 검증
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.greaterThan(receivable.balance)) {
      throw new BadRequestException('수금액이 잔액을 초과할 수 없습니다.');
    }

    // 수금일 검증
    const paymentDate = new Date(dto.paymentDate);
    if (paymentDate < receivable.issueDate) {
      throw new BadRequestException('수금일은 발생일보다 이전일 수 없습니다.');
    }

    // 트랜잭션 처리
    return await this.prisma.$transaction(async (tx) => {
      // 1. 수금 이력 생성
      const payment = await tx.receivablePayment.create({
        data: {
          receivableId,
          amount: dto.amount,
          paymentDate,
          paymentMethod: dto.paymentMethod,
          description: dto.description,
        },
      });

      // 2. 미수금 업데이트
      const updatedReceivable = await tx.receivable.update({
        where: { id: receivableId },
        data: {
          paidAmount: { increment: dto.amount },
          balance: { decrement: dto.amount },
        },
      });

      // 3. 입금전표 자동 생성
      const journal = await this.journalService.createReceiptJournal({
        clientId: receivable.clientId,
        amount,
        paymentMethod: dto.paymentMethod,
        paymentDate,
        description: dto.description || `${receivable.client.name} 수금`,
        createdBy: userId,
      });

      // 4. 수금 이력에 전표 연결
      await tx.receivablePayment.update({
        where: { id: payment.id },
        data: { journalId: journal.id },
      });

      return {
        payment,
        receivable: updatedReceivable,
        journal,
      };
    });
  }

  /**
   * 수금 이력 조회
   */
  async getPayments(receivableId: string) {
    return await this.prisma.receivablePayment.findMany({
      where: { receivableId },
      orderBy: { paymentDate: 'desc' },
    });
  }
}
```

**Controller에 엔드포인트 추가**:

```typescript
@Controller('accounting/receivables')
export class ReceivablesController {
  // ... 기존 메서드들

  @Post(':id/payment')
  createPayment(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
    @Req() req: any,
  ) {
    return this.receivablesService.createPayment(id, dto, req.user.id);
  }

  @Get(':id/payments')
  getPayments(@Param('id') id: string) {
    return this.receivablesService.getPayments(id);
  }
}
```

---

## 📋 Frontend 요구사항

### 1. Mutation Hook

**apps/web/hooks/use-payment-mutation.ts**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CreatePaymentParams {
  receivableId: string;
  data: {
    amount: number;
    paymentDate: string;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD';
    description?: string;
  };
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receivableId, data }: CreatePaymentParams) =>
      api.post(`/accounting/receivables/${receivableId}/payment`, data),

    onMutate: async ({ receivableId, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['receivables'] });

      const previousData = queryClient.getQueryData(['receivables']);

      queryClient.setQueryData(['receivables'], (old: any) => {
        // 낙관적 업데이트 로직
        return old;
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      // Rollback
      queryClient.setQueryData(['receivables'], context?.previousData);
      toast.error('수금 처리 실패');
    },

    onSuccess: () => {
      toast.success('수금 처리가 완료되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['receivables', 'stats'] });
    },
  });
}
```

### 2. 수금 모달 컴포넌트

**components/payment-modal.tsx**

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreatePayment } from '@/hooks/use-payment-mutation';
import { formatCurrency } from '@/lib/utils';

const paymentSchema = z.object({
  amount: z.number().min(1, '수금액을 입력하세요'),
  paymentDate: z.string(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CARD']),
  description: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  receivable: {
    id: string;
    clientName: string;
    balance: number;
  };
}

export function PaymentModal({ open, onClose, receivable }: PaymentModalProps) {
  const { mutate: createPayment, isPending } = useCreatePayment();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'BANK_TRANSFER',
    },
  });

  const amount = watch('amount');

  const onSubmit = (data: PaymentFormData) => {
    if (data.amount > receivable.balance) {
      alert('수금액이 잔액을 초과할 수 없습니다.');
      return;
    }

    createPayment(
      {
        receivableId: receivable.id,
        data: {
          ...data,
          paymentDate: new Date(data.paymentDate).toISOString(),
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>수금 처리</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 거래처 및 잔액 정보 */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex justify-between">
              <span className="text-sm">거래처</span>
              <span className="font-medium">{receivable.clientName}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-sm">미수 잔액</span>
              <span className="font-bold text-lg">
                {formatCurrency(receivable.balance)}
              </span>
            </div>
          </div>

          {/* 수금액 */}
          <div>
            <Label>수금액</Label>
            <Input
              type="number"
              {...register('amount', { valueAsNumber: true })}
              placeholder="0"
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
            )}
            {amount > receivable.balance && (
              <p className="text-sm text-red-500 mt-1">
                수금액이 잔액을 초과할 수 없습니다.
              </p>
            )}
          </div>

          {/* 수금일 */}
          <div>
            <Label>수금일</Label>
            <Input type="date" {...register('paymentDate')} />
          </div>

          {/* 수금방법 */}
          <div>
            <Label>수금방법</Label>
            <Select
              onValueChange={(value) => setValue('paymentMethod', value as any)}
              defaultValue="BANK_TRANSFER"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">현금</SelectItem>
                <SelectItem value="BANK_TRANSFER">계좌이체</SelectItem>
                <SelectItem value="CARD">카드</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 비고 */}
          <div>
            <Label>비고 (선택)</Label>
            <Input {...register('description')} placeholder="입금 메모" />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isPending || amount > receivable.balance}
              className="flex-1"
            >
              {isPending ? '처리 중...' : '수금 처리'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. 수금 이력 컴포넌트

**components/payment-history.tsx**

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentHistoryProps {
  receivableId: string;
}

const paymentMethodLabels = {
  CASH: '현금',
  BANK_TRANSFER: '계좌이체',
  CARD: '카드',
};

export function PaymentHistory({ receivableId }: PaymentHistoryProps) {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['receivables', receivableId, 'payments'],
    queryFn: () => api.get(`/accounting/receivables/${receivableId}/payments`),
  });

  if (isLoading) return <div>로딩 중...</div>;

  const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">수금 이력</h3>
        <div className="text-sm">
          총 수금액: <span className="font-bold">{formatCurrency(totalPaid)}</span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>수금일</TableHead>
            <TableHead>수금액</TableHead>
            <TableHead>수금방법</TableHead>
            <TableHead>비고</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments?.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{formatDate(payment.paymentDate)}</TableCell>
              <TableCell className="font-medium">
                {formatCurrency(payment.amount)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {paymentMethodLabels[payment.paymentMethod]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {payment.description || '-'}
              </TableCell>
            </TableRow>
          ))}
          {payments?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                수금 이력이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## ✅ 완료 조건

1. **DB 스키마 적용**
   - Account, Journal, JournalEntry 모델 추가
   - 시드 데이터 실행 (기본 계정과목)

2. **Backend API 동작 확인**
   - POST /receivables/:id/payment (수금 처리)
   - GET /receivables/:id/payments (수금 이력)
   - 수금 시 자동 분개 생성 확인 (journals 테이블)

3. **Frontend 동작 확인**
   - 수금 모달 오픈
   - 수금액 입력 및 검증
   - 수금 처리 성공
   - 수금 이력 표시

4. **트랜잭션 검증**
   - 수금 + 미수금 업데이트 + 분개 생성이 하나의 트랜잭션
   - 실패 시 전체 롤백

---

## 📝 Claude에게 요청할 내용

```
미수금 관리 Day 3 작업을 진행해주세요.

Backend:
1. Prisma schema에 Account, Journal, JournalEntry 모델 추가
2. seed.ts에 기본 계정과목 데이터 추가
3. JournalService 생성 (전표번호 생성, 입금전표 생성)
4. ReceivablesService에 createPayment, getPayments 메서드 추가
5. CreatePaymentDto 생성
6. ReceivablesController에 2개 엔드포인트 추가

Frontend:
1. use-payment-mutation.ts 생성 (useCreatePayment)
2. PaymentModal.tsx 생성 (수금 모달)
3. PaymentHistory.tsx 생성 (수금 이력)
4. receivables/page.tsx에 모달 연결

모든 코드에 트랜잭션 처리, 에러 핸들링, 타입 안전성 포함해주세요.
완료 후 수금 처리 및 자동 분개 생성을 테스트해주세요.
```
