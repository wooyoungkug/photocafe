---
name: accounting
description: 회계관리 모듈 개발. 계정과목, 전표, 장부, 채권/채무 관리, 재무보고서 작업 시 사용합니다.
---

# PhotoCafe ERP 회계관리 모듈 개발

## 프로젝트 개요

```
프로젝트명: printing114 ERP - 회계관리 모듈
기술스택: Next.js (Frontend), NestJS (Backend), Prisma, PostgreSQL
벤치마킹 대상: 더존 ERP, SAP ERP
업종: 사진앨범 제작업 (압축앨범, 화보, 액자, 출력물)
```

---

## 1단계: 기본 회계관리 시스템

### 계정과목 체계

| 구분 | 계정과목 |
|------|----------|
| **자산** | 현금, 보통예금, 외상매출금, 미수금, 재고자산, 선급금 |
| **부채** | 외상매입금, 미지급금, 선수금, 예수금 |
| **수익** | 매출(앨범/액자/출력), 기타수익 |
| **비용** | 매입원가, 급여, 임차료, 소모품비, 감가상각비 |

### 전표 관리

| 전표 유형 | 필수 항목 |
|-----------|-----------|
| **입금전표** | 거래처, 계정과목, 금액, 적요, 일자 |
| **출금전표** | 거래처, 계정과목, 금액, 적요, 일자 |
| **대체전표** | 차변/대변 계정, 금액 |

### 기본 장부

| 장부 | 설명 |
|------|------|
| **분개장** | 모든 거래 기록 |
| **총계정원장** | 계정별 집계 |
| **거래처원장** | 거래처별 채권/채무 |
| **현금출납장** | 현금 입출금 내역 |

---

## 2단계: 매출/상품 연동 확장

### 상품 카테고리

| 구분 | 상품 |
|------|------|
| **앨범류** | 압축앨범, 포토북, 화보집 |
| **액자류** | 원목액자, 메탈액자, 아크릴액자 |
| **출력물** | 대형출력, 포스터, 사진인화 |

### 매출 연동

- 주문 완료 시 자동 매출전표 생성
- 상품별 매출 집계
- 거래처별 매출 현황

### 매입 연동

- 원자재 구매 시 매입전표 생성
- 외주 제작비 관리
- 거래처별 매입 현황

---

## 3단계: 채권/채무 관리 (핵심)

### 미수금 관리

- 거래처별 미수금 현황
- 미수금 aging 분석 (30일/60일/90일 이상)
- 수금 예정일 관리
- 미수금 합계 대시보드

### 미지급금 관리

- 거래처별 미지급금 현황
- 지급 예정일 관리
- 미지급금 합계 대시보드

### 자동 분개 규칙

| 이벤트 | 차변 | 대변 |
|--------|------|------|
| 매출 발생 | 외상매출금 | 매출 |
| 입금 시 | 현금/보통예금 | 외상매출금 |
| 매입 발생 | 매입 | 외상매입금 |
| 출금 시 | 외상매입금 | 현금/보통예금 |

### 보고서

- 일/월/년 매출 보고서
- 거래처별 채권채무 명세서
- 계정별 잔액 시산표
- 손익계산서 (간편)

---

## Prisma 스키마

```prisma
// 계정과목 유형
enum AccountType {
  ASSET           // 자산
  LIABILITY       // 부채
  EQUITY          // 자본
  REVENUE         // 수익
  EXPENSE         // 비용
}

// 전표 유형
enum VoucherType {
  RECEIPT         // 입금전표
  PAYMENT         // 출금전표
  TRANSFER        // 대체전표
}

// 거래 유형 (차변/대변)
enum TransactionType {
  DEBIT           // 차변
  CREDIT          // 대변
}

// 계정과목
model Account {
  id              String        @id @default(cuid())
  code            String        @unique  // 계정코드 (101, 201, 등)
  name            String                 // 계정명
  type            AccountType            // 자산/부채/자본/수익/비용
  parentId        String?                // 상위 계정 (계층 구조)
  parent          Account?      @relation("AccountHierarchy", fields: [parentId], references: [id])
  children        Account[]     @relation("AccountHierarchy")
  description     String?
  isActive        Boolean       @default(true)
  sortOrder       Int           @default(0)

  journalEntries  JournalEntry[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@map("accounts")
}

// 분개장 (전표 헤더)
model Journal {
  id              String        @id @default(cuid())
  voucherNo       String        @unique  // 전표번호 (V-2024-000001)
  voucherType     VoucherType            // 전표 유형
  journalDate     DateTime               // 전표 일자

  // 거래처 (선택)
  clientId        String?
  client          Client?       @relation(fields: [clientId], references: [id])

  description     String?                // 적요
  totalAmount     Decimal       @db.Decimal(12, 2)

  // 주문 연동 (선택)
  orderId         String?

  entries         JournalEntry[]

  createdBy       String
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([journalDate])
  @@index([clientId])
  @@map("journals")
}

// 분개 상세 (전표 라인)
model JournalEntry {
  id              String          @id @default(cuid())
  journalId       String
  journal         Journal         @relation(fields: [journalId], references: [id], onDelete: Cascade)

  accountId       String
  account         Account         @relation(fields: [accountId], references: [id])

  transactionType TransactionType // 차변/대변
  amount          Decimal         @db.Decimal(12, 2)
  description     String?         // 적요

  sortOrder       Int             @default(0)

  @@map("journal_entries")
}

// 미수금 (Receivable)
model Receivable {
  id              String        @id @default(cuid())

  clientId        String
  client          Client        @relation(fields: [clientId], references: [id])

  // 원천 (주문 또는 전표)
  orderId         String?
  journalId       String?

  originalAmount  Decimal       @db.Decimal(12, 2)  // 원금
  paidAmount      Decimal       @default(0) @db.Decimal(12, 2)  // 수금액
  balance         Decimal       @db.Decimal(12, 2)  // 잔액

  issueDate       DateTime                          // 발생일
  dueDate         DateTime?                         // 수금예정일

  description     String?

  payments        ReceivablePayment[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([clientId])
  @@index([dueDate])
  @@map("receivables")
}

// 미수금 수금 이력
model ReceivablePayment {
  id              String        @id @default(cuid())
  receivableId    String
  receivable      Receivable    @relation(fields: [receivableId], references: [id], onDelete: Cascade)

  amount          Decimal       @db.Decimal(12, 2)
  paymentDate     DateTime
  paymentMethod   String?       // 현금, 계좌이체, 카드
  description     String?
  journalId       String?       // 연결된 입금전표

  createdAt       DateTime      @default(now())

  @@map("receivable_payments")
}

// 미지급금 (Payable)
model Payable {
  id              String        @id @default(cuid())

  clientId        String        // 매입처
  client          Client        @relation(fields: [clientId], references: [id])

  journalId       String?

  originalAmount  Decimal       @db.Decimal(12, 2)
  paidAmount      Decimal       @default(0) @db.Decimal(12, 2)
  balance         Decimal       @db.Decimal(12, 2)

  issueDate       DateTime
  dueDate         DateTime?                         // 지급예정일

  description     String?

  payments        PayablePayment[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([clientId])
  @@index([dueDate])
  @@map("payables")
}

// 미지급금 지급 이력
model PayablePayment {
  id              String        @id @default(cuid())
  payableId       String
  payable         Payable       @relation(fields: [payableId], references: [id], onDelete: Cascade)

  amount          Decimal       @db.Decimal(12, 2)
  paymentDate     DateTime
  paymentMethod   String?
  description     String?
  journalId       String?       // 연결된 출금전표

  createdAt       DateTime      @default(now())

  @@map("payable_payments")
}
```

---

## API 엔드포인트

### 전표 관리

```
POST   /api/v1/journals              # 전표 등록
GET    /api/v1/journals              # 전표 조회 (기간/계정 필터)
GET    /api/v1/journals/:id          # 전표 상세
PUT    /api/v1/journals/:id          # 전표 수정
DELETE /api/v1/journals/:id          # 전표 삭제
```

### 원장 조회

```
GET    /api/v1/ledger/general/:accountId    # 계정별 원장
GET    /api/v1/ledger/client/:clientId      # 거래처별 원장
GET    /api/v1/ledger/cash                  # 현금출납장
```

### 채권/채무

```
GET    /api/v1/receivables                  # 미수금 현황
POST   /api/v1/receivables/:id/payment      # 수금 처리
GET    /api/v1/receivables/aging            # 미수금 aging 분석

GET    /api/v1/payables                     # 미지급금 현황
POST   /api/v1/payables/:id/payment         # 지급 처리
```

### 보고서

```
GET    /api/v1/reports/trial-balance        # 시산표
GET    /api/v1/reports/income-statement     # 손익계산서
GET    /api/v1/reports/sales-by-product     # 상품별 매출
GET    /api/v1/reports/sales-by-client      # 거래처별 매출
```

---

## 전표번호 생성 규칙

```typescript
// 전표번호 형식: V-YYYY-NNNNNN
// 예: V-2024-000001

async function generateVoucherNo(): Promise<string> {
  const year = new Date().getFullYear();
  const lastVoucher = await prisma.journal.findFirst({
    where: {
      voucherNo: { startsWith: `V-${year}-` }
    },
    orderBy: { voucherNo: 'desc' }
  });

  let sequence = 1;
  if (lastVoucher) {
    const lastSeq = parseInt(lastVoucher.voucherNo.split('-')[2]);
    sequence = lastSeq + 1;
  }

  return `V-${year}-${sequence.toString().padStart(6, '0')}`;
}
```

---

## 자동 분개 서비스

```typescript
// 매출 발생 시 자동 분개
async function createSalesJournal(order: Order): Promise<Journal> {
  const voucherNo = await generateVoucherNo();

  return prisma.journal.create({
    data: {
      voucherNo,
      voucherType: 'TRANSFER',
      journalDate: new Date(),
      clientId: order.clientId,
      orderId: order.id,
      description: `${order.orderNo} 매출`,
      totalAmount: order.total,
      entries: {
        create: [
          {
            accountId: ACCOUNT_IDS.ACCOUNTS_RECEIVABLE, // 외상매출금
            transactionType: 'DEBIT',
            amount: order.total,
            sortOrder: 1,
          },
          {
            accountId: ACCOUNT_IDS.SALES, // 매출
            transactionType: 'CREDIT',
            amount: order.total,
            sortOrder: 2,
          },
        ],
      },
      createdBy: 'SYSTEM',
    },
  });
}

// 입금 처리 시 자동 분개
async function createReceiptJournal(
  clientId: string,
  amount: Decimal,
  paymentMethod: string,
  description?: string
): Promise<Journal> {
  const voucherNo = await generateVoucherNo();
  const cashAccountId = paymentMethod === 'CASH'
    ? ACCOUNT_IDS.CASH
    : ACCOUNT_IDS.BANK_DEPOSIT;

  return prisma.journal.create({
    data: {
      voucherNo,
      voucherType: 'RECEIPT',
      journalDate: new Date(),
      clientId,
      description: description || '매출 수금',
      totalAmount: amount,
      entries: {
        create: [
          {
            accountId: cashAccountId, // 현금 또는 보통예금
            transactionType: 'DEBIT',
            amount,
            sortOrder: 1,
          },
          {
            accountId: ACCOUNT_IDS.ACCOUNTS_RECEIVABLE, // 외상매출금
            transactionType: 'CREDIT',
            amount,
            sortOrder: 2,
          },
        ],
      },
      createdBy: 'SYSTEM',
    },
  });
}
```

---

## 프론트엔드 구조

### 회계 메뉴 구조

```
회계관리
├── 전표관리
│   ├── 입금전표
│   ├── 출금전표
│   └── 대체전표
├── 장부조회
│   ├── 분개장
│   ├── 총계정원장
│   ├── 거래처원장
│   └── 현금출납장
├── 채권/채무
│   ├── 미수금 현황
│   └── 미지급금 현황
└── 보고서
    ├── 시산표
    ├── 손익계산서
    └── 매출현황
```

### 미수금 현황 UI

```
┌─────────────────────────────────────────────────────────────────┐
│ 미수금 현황                                      총 미수금: ￦5,230,000 │
├─────────────────────────────────────────────────────────────────┤
│ 기간: [2024-01-01] ~ [2024-12-31]  거래처: [전체 ▼]  [조회]     │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────┬────────────┬────────────┬────────────┬─────────────┐ │
│ │ 거래처  │ 발생금액    │ 수금액      │ 잔액       │ 수금예정일   │ │
│ ├────────┼────────────┼────────────┼────────────┼─────────────┤ │
│ │ A사진관 │ 1,000,000  │   500,000  │   500,000  │ 2024-01-15  │ │
│ │ B스튜디오│ 2,500,000  │ 1,000,000  │ 1,500,000  │ 2024-01-20  │ │
│ │ C포토   │ 3,230,000  │         0  │ 3,230,000  │ 2024-01-31  │ │
│ └────────┴────────────┴────────────┴────────────┴─────────────┘ │
│                                                                 │
│ Aging 분석:                                                      │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────┐       │
│ │ 30일 이내 │ 31-60일  │ 61-90일  │ 90일 초과 │ 합계      │       │
│ │ 2,000,000│ 1,500,000│ 1,230,000│   500,000│ 5,230,000│       │
│ └──────────┴──────────┴──────────┴──────────┴──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 체크리스트

회계관리 모듈 구현 시 확인사항:

### 기본 인프라 (완료)
- [x] 계정과목 마스터 데이터 등록 (52개 표준계정)
- [x] 전표 CRUD API
- [x] 전표번호 자동 생성 (JE-YYYYMM-NNNN)
- [x] 차변/대변 균형 검증
- [x] 분개장 조회
- [x] 거래처원장 조회
- [x] 미수금 관리
- [x] 미수금 aging 분석
- [x] 미지급금 관리
- [x] 주문-매출 자동 분개 (주문 생성 시)

### 구현 완료 (Phase 1-3) - 2026-02-15
- [x] 부가세대급금(115) 계정 사용 - Phase 1.1 ✅
- [x] 입금-수금 자동 분개 (결제수단별 분기: 현금/카드/계좌이체) - Phase 1.2 ✅
- [x] 카드 수수료 자동 분개 (3%) - Phase 1.3 ✅
- [x] 매입-외상매입금 자동 분개 (부가세대급금 115 적용) - Phase 2.1 ✅
- [x] 지급-출금 자동 분개 (결제수단별 분기: 현금/계좌이체) - Phase 2.2 ✅
- [x] 신규 전표입력 UI (/accounting/journals/new) - Phase 3.1 ✅
- [x] 홈페이지 외 매출등록 UI (/accounting/sales/new) - Phase 3.2 ✅
- [x] 매입계산서 등록 UI (/accounting/purchases/new) - Phase 3.3 ✅
- [x] SalesLedgerService.createDirect() 메서드 추가 - Phase 3.2 ✅

### 향후 구현 (Long-term)
- [ ] 총계정원장 조회
- [ ] 현금출납장 조회
- [ ] 시산표 생성
- [ ] 손익계산서 생성
- [ ] 카드 수수료율 설정 관리
- [ ] 전자세금계산서 자동 수집 (홈택스 API)
- [ ] AI 기반 거래 자동 분류

---

## 자동 분개 규칙 (결제수단별)

### 매출 관련

| 이벤트 | 차변 | 대변 | 비고 |
|--------|------|------|------|
| 매출 발생 | 외상매출금(110) | 매출(402) + 부가세예수금(204) | 대체전표 |
| 현금 수금 | 현금(101) | 외상매출금(110) | 입금전표 |
| 계좌이체 수금 | 보통예금(102) | 외상매출금(110) | 입금전표 |
| 카드 수금 | 보통예금(102) + 지급수수료(618) | 외상매출금(110) | 입금전표, 수수료 3% |
| 수표 수금 | 보통예금(102) | 외상매출금(110) | 입금전표 |

### 매입 관련

| 이벤트 | 차변 | 대변 | 비고 |
|--------|------|------|------|
| 매입 발생 | 원재료/상품(120/123) + 부가세대급금(115) | 외상매입금(201) | 대체전표 |
| 현금 지급 | 외상매입금(201) | 현금(101) | 출금전표 |
| 계좌이체 지급 | 외상매입금(201) | 보통예금(102) | 출금전표 |

### 매입 유형별 계정과목 매핑

| 매입유형 | 계정코드 | 계정명 |
|---------|---------|--------|
| RAW_MATERIAL | 120 | 원재료 |
| MERCHANDISE | 123 | 상품 |
| SUPPLIES | 617 | 소모품비 |
| OUTSOURCING | 616 | 디자인외주비 |
| EQUIPMENT | 131 | 기계장치 |
| SERVICE | 618 | 지급수수료 |
| OTHER | 501 | 상품매출원가 |

---

## 핵심 파일 경로

### Backend
- 자동분개 엔진: `apps/api/src/modules/accounting/services/journal-engine.service.ts`
- 매출원장: `apps/api/src/modules/accounting/services/sales-ledger.service.ts`
- 매입원장: `apps/api/src/modules/accounting/services/purchase-ledger.service.ts`
- 거래처원장: `apps/api/src/modules/accounting/services/client-ledger.service.ts`
- 계정과목/전표: `apps/api/src/modules/accounting/services/accounting.service.ts`

### Frontend
- 전표 조회/입력: `apps/web/app/(dashboard)/accounting/journals/`
- 매출원장/등록: `apps/web/app/(dashboard)/accounting/sales/`
- 매입원장/등록: `apps/web/app/(dashboard)/accounting/purchases/`
- 거래처원장: `apps/web/app/(dashboard)/accounting/client-ledger/`
- 회계 Hook: `apps/web/hooks/use-accounting.ts`
- 매출 Hook: `apps/web/hooks/use-sales-ledger.ts`
- 매입 Hook: `apps/web/hooks/use-purchase-ledger.ts`

---

## 2026-02-15 회계 자동화 구현 계획

### Phase 1: 결제수단별 분개 고도화 (1-2일)

#### 1.1 부가세 계정 정비

**목표**: 선급세금(111) 계정 추가, 매입 부가세 계정 변경

**작업**:
1. `apps/api/src/modules/accounting/services/accounting.service.ts`
   - `seedStandardAccounts()` 메서드에 선급세금(111) 계정 추가
   ```typescript
   { code: '111', name: '선급세금', type: 'ASSET', sortOrder: 7.5 }
   ```

2. `apps/api/src/modules/accounting/services/journal-engine.service.ts`
   - `createPurchaseJournal()` 메서드 수정 (302번 라인 근처)
   - 부가세 계정: 113(선급비용) → 111(선급세금)

#### 1.2 결제수단별 분개 로직 확장

**목표**: 현금/카드/계좌이체를 정확히 구분하여 회계 표준에 맞는 자동 분개 구현

**파일**: `apps/api/src/modules/accounting/services/journal-engine.service.ts`

**작업**: `createReceiptJournal()` 메서드 확장 (200번 라인 근처)

**변경 사항**:
1. **파라미터 확장**:
   ```typescript
   interface CreateReceiptJournalParams {
     // 기존 필드들...
     paymentMethod: string;
     bankName?: string;
     cardFeeRate?: number; // 카드 수수료율 (선택, 기본값 3%)
   }
   ```

2. **결제수단별 계정 매핑**:
   ```typescript
   // 결제수단에 따른 계정 선택
   let cashAccountCode: string;
   if (paymentMethod === 'cash') {
     cashAccountCode = '101'; // 현금
   } else if (paymentMethod === 'bank_transfer' || paymentMethod === 'transfer') {
     cashAccountCode = '102'; // 보통예금
   } else if (paymentMethod === 'card') {
     cashAccountCode = '102'; // 보통예금 (카드는 계좌 입금)
   } else {
     cashAccountCode = '102'; // 기본값: 보통예금
   }
   ```

3. **카드 수수료 자동 분개**:
   ```typescript
   // 카드 결제 시 수수료 처리
   if (paymentMethod === 'card') {
     const feeRate = cardFeeRate || 0.03; // 기본 3%
     const cardFee = Math.round(amount * feeRate);
     const netAmount = amount - cardFee;

     const feeAccount = await this.findAccountByCode('618'); // 지급수수료

     entries.push(
       {
         accountId: bankAccount.id,
         transactionType: 'DEBIT',
         amount: netAmount,
         description: `입금 - ${clientName} (카드결제)`,
         sortOrder: 0,
       },
       {
         accountId: feeAccount.id,
         transactionType: 'DEBIT',
         amount: cardFee,
         description: `카드수수료 - ${clientName}`,
         sortOrder: 1,
       },
       {
         accountId: accountReceivable.id,
         transactionType: 'CREDIT',
         amount: amount,
         description: `외상매출금 회수 - ${clientName}`,
         sortOrder: 2,
       }
     );
   } else {
     // 기존 로직 (현금/계좌이체)
     entries.push(...);
   }
   ```

**검증**:
- 현금 입금: 차변 현금(101) = 대변 외상매출금(110)
- 계좌이체: 차변 보통예금(102) = 대변 외상매출금(110)
- 카드: 차변 보통예금(97,000) + 수수료(3,000) = 대변 외상매출금(100,000)

### Phase 2: 매입 프로세스 완성 (1-2일)

#### 2.1 매입 자동분개 검증

**파일**: `apps/api/src/modules/accounting/services/purchase-ledger.service.ts`

**현재 상태**: 151-164번 라인에서 이미 `journalEngine.createPurchaseJournal()` 호출 중

**작업**:
- 부가세 계정이 111번으로 변경되었는지 확인
- try-catch 블록 로깅 강화하여 실패 시 원인 파악 가능하도록
- 자동분개 생성 실패 시 관리자 알림 로직 추가 고려

**검증 시나리오**:
```typescript
// 매입 등록 테스트
const purchase = await purchaseLedgerService.create({
  supplierId: 'xxx',
  purchaseType: 'RAW_MATERIAL',
  accountCode: '120', // 원재료
  supplyAmount: 100000,
  vatAmount: 10000,
  totalAmount: 110000,
  items: [...],
}, 'admin');

// 분개 확인
// 차변: 원재료(120) 100,000 + 선급세금(111) 10,000
// 대변: 외상매입금(201) 110,000
```

#### 2.2 지급 처리 자동분개 검증

**파일**: `apps/api/src/modules/accounting/services/purchase-ledger.service.ts`

**현재 상태**: 302-320번 라인에서 이미 `journalEngine.createPaymentJournal()` 호출 중

**작업**:
- 지급 처리 시 결제수단별 계정 분기 추가
- 현금 지급: 현금(101)
- 계좌이체: 보통예금(102)
- 수표: 받을어음(108) 고려

**개선 사항**:
```typescript
// createPaymentJournal() 확장
// paymentMethod에 따라 대변 계정 변경
let cashAccountCode: string;
if (paymentMethod === 'cash') {
  cashAccountCode = '101'; // 현금
} else {
  cashAccountCode = '102'; // 보통예금
}
```

### Phase 3: UI 개발 (3-4일)

#### 3.1 신규 전표입력 페이지

**파일**: `apps/web/app/(dashboard)/accounting/journals/new/page.tsx` (신규)

**기능**:
- 전표 유형 선택 (입금/출금/대체)
- 거래일자, 거래처 선택
- 차변/대변 계정과목 및 금액 입력 (복수 라인)
- 차대 균형 실시간 검증
- 전표 저장 → `AccountingService.createJournal()` 호출

**UI 컴포넌트**:
- 계정과목 Autocomplete (Account 테이블에서 검색)
- 금액 입력 필드 (숫자 포맷팅)
- 차대 균형 표시 (실시간)
- 라인 추가/삭제 버튼

#### 3.2 홈페이지 외 매출등록 페이지

**파일**: `apps/web/app/(dashboard)/accounting/sales/new/page.tsx` (신규)

**기능**:
- 거래처 선택
- 매출 유형 선택 (ALBUM/PRINT/OUTPUT/SERVICE)
- 품목별 수량/단가 입력
- 공급가액/부가세 자동 계산
- 결제방식 선택 (선불/외상/카드/계좌이체)
- 저장 → `SalesLedgerService.createDirect()` 호출 (신규 메서드 필요)

**Backend 신규 메서드**:

**파일**: `apps/api/src/modules/accounting/services/sales-ledger.service.ts`

```typescript
// Order 없이 직접 매출원장 생성
async createDirect(dto: {
  clientId: string;
  salesType: 'ALBUM' | 'PRINT' | 'OUTPUT' | 'SERVICE';
  items: Array<{
    itemName: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentMethod: string;
  description?: string;
}, createdBy: string) {
  // createFromOrder() 로직과 유사하나 orderId 없음
  // 매출원장 생성 → 자동 전표 생성
}
```

#### 3.3 매입계산서 등록 페이지

**파일**: `apps/web/app/(dashboard)/accounting/purchases/new/page.tsx` (신규)

**기능**:
- 매입처(거래처) 선택
- 매입 유형 선택 (원재료/상품/비용/자산)
- 품목별 수량/단가 입력
- 공급가액/부가세 자동 계산
- 계정과목 자동 선택 (매입 유형 기반)
- 결제방식 선택 (선불/외상)
- 저장 → `PurchaseLedgerService.create()` 호출

#### 3.4 기존 UI 개선

**파일**: `apps/web/app/(dashboard)/accounting/journals/page.tsx`
- "신규 전표 입력" 버튼 추가

**파일**: `apps/web/app/(dashboard)/accounting/sales/page.tsx`
- "직접 매출 등록" 버튼 추가

**파일**: `apps/web/app/(dashboard)/accounting/purchases/page.tsx`
- "매입계산서 등록" 버튼 추가

### 검증 방법

#### Phase 1 검증
```typescript
// 1. 부가세 계정 확인
const account111 = await prisma.account.findUnique({ where: { code: '111' } });
expect(account111.name).toBe('선급세금');

// 2. 카드 수금 테스트
const receipt = await salesLedgerService.addReceipt(salesLedgerId, {
  amount: 110000,
  paymentMethod: 'card',
  receiptDate: new Date(),
}, 'admin');

// 3. 분개 확인
const journal = await prisma.journal.findFirst({
  where: { sourceType: 'RECEIPT', sourceId: salesLedgerId },
  include: { entries: { include: { account: true } } },
});

// 차변: 보통예금 106,700원
expect(journal.entries.find(e => e.account.code === '102' && e.transactionType === 'DEBIT').amount).toBe(106700);
// 차변: 지급수수료 3,300원
expect(journal.entries.find(e => e.account.code === '618' && e.transactionType === 'DEBIT').amount).toBe(3300);
// 대변: 외상매출금 110,000원
expect(journal.entries.find(e => e.account.code === '110' && e.transactionType === 'CREDIT').amount).toBe(110000);
```

#### Phase 2 검증
```typescript
// 매입 등록 → 자동 전표 확인
const purchase = await purchaseLedgerService.create({
  supplierId: 'xxx',
  purchaseType: 'RAW_MATERIAL',
  accountCode: '120',
  supplyAmount: 100000,
  vatAmount: 10000,
  totalAmount: 110000,
  items: [{
    itemName: '용지',
    quantity: 100,
    unitPrice: 1000,
    supplyAmount: 100000,
    vatAmount: 10000,
    totalAmount: 110000,
  }],
}, 'admin');

// 분개 확인
const journal = await prisma.journal.findFirst({
  where: { sourceType: 'PURCHASE', sourceId: purchase.id },
  include: { entries: { include: { account: true } } },
});

// 차변: 원재료 100,000원
expect(journal.entries.find(e => e.account.code === '120' && e.transactionType === 'DEBIT').amount).toBe(100000);
// 차변: 선급세금 10,000원
expect(journal.entries.find(e => e.account.code === '111' && e.transactionType === 'DEBIT').amount).toBe(10000);
// 대변: 외상매입금 110,000원
expect(journal.entries.find(e => e.account.code === '201' && e.transactionType === 'CREDIT').amount).toBe(110000);
```

### 우선순위 및 일정

| Phase | 작업 내용 | 우선순위 | 소요 시간 | 의존성 |
|-------|----------|---------|----------|--------|
| Phase 1 | 결제수단별 분개 고도화 | 높음 | 1-2일 | 없음 |
| Phase 2 | 매입 프로세스 완성 | 높음 | 1-2일 | Phase 1 |
| Phase 3 | UI 개발 (전표/매출/매입 입력) | 높음 | 3-4일 | Phase 1, 2 |

### 회계 표준 준수

**결제수단별 계정 매핑 (확장)**:

| 거래 유형 | 차변 계정 | 대변 계정 | 비고 |
|----------|----------|----------|------|
| 매출 발생 (외상) | 외상매출금(110) | 매출(402) + 부가세예수금(204) | 대체전표 |
| 현금 수금 | 현금(101) | 외상매출금(110) | 입금전표 |
| 계좌이체 수금 | 보통예금(102) | 외상매출금(110) | 입금전표 |
| 카드 수금 | 보통예금(102) + 지급수수료(618) | 외상매출금(110) | 입금전표, 수수료 3% |
| 매입 발생 (외상) | 원재료/상품(120/123) + 선급세금(111) | 외상매입금(201) | 대체전표 |
| 계좌이체 지급 | 외상매입금(201) | 보통예금(102) | 출금전표 |
| 현금 지급 | 외상매입금(201) | 현금(101) | 출금전표 |

### Critical Files for Implementation

**Backend 수정 파일**:
1. `apps/api/src/modules/accounting/services/accounting.service.ts` - 선급세금 계정 추가
2. `apps/api/src/modules/accounting/services/journal-engine.service.ts` - 결제수단별 분개 확장
3. `apps/api/src/modules/accounting/services/sales-ledger.service.ts` - createDirect() 메서드 추가
4. `apps/api/src/modules/accounting/services/purchase-ledger.service.ts` - 검증 및 개선

**Frontend 신규 파일**:
5. `apps/web/app/(dashboard)/accounting/journals/new/page.tsx` - 신규 전표입력
6. `apps/web/app/(dashboard)/accounting/sales/new/page.tsx` - 홈페이지 외 매출등록
7. `apps/web/app/(dashboard)/accounting/purchases/new/page.tsx` - 매입계산서 등록

**Frontend 개선 파일**:
8. `apps/web/app/(dashboard)/accounting/journals/page.tsx` - 신규 버튼 추가
9. `apps/web/app/(dashboard)/accounting/sales/page.tsx` - 직접 등록 버튼 추가
10. `apps/web/app/(dashboard)/accounting/purchases/page.tsx` - 매입계산서 등록 버튼 추가

### 고려사항

1. **기존 데이터 호환성**
   - 기존 SalesLedger/PurchaseLedger에 전표가 없을 수 있음
   - 필요 시 백필 스크립트 실행: 기존 원장 → 전표 일괄 생성

2. **카드 수수료율 설정**
   - 하드코딩 3% → SystemSetting 테이블에 저장하여 관리자가 변경 가능하도록 개선 가능

3. **오류 처리**
   - 전표 생성 실패 시 원장 생성은 계속 진행 (현재 정책 유지)
   - 실패 로그를 별도 테이블에 저장하여 수동 처리 가능하도록 고려

4. **권한 관리**
   - 전표 수정/삭제는 관리자만 가능하도록 제한
   - 마감된 회계기간 전표는 수정 불가 (향후 구현)
