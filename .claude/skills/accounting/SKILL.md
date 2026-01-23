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

- [ ] 계정과목 마스터 데이터 등록
- [ ] 전표 CRUD API
- [ ] 전표번호 자동 생성
- [ ] 차변/대변 균형 검증
- [ ] 분개장 조회
- [ ] 총계정원장 조회
- [ ] 거래처원장 조회
- [ ] 현금출납장 조회
- [ ] 미수금 관리
- [ ] 미수금 aging 분석
- [ ] 미지급금 관리
- [ ] 주문-매출 자동 분개
- [ ] 입금-수금 자동 분개
- [ ] 시산표 생성
- [ ] 손익계산서 생성
