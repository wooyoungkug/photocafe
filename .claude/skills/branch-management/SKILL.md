---
name: branch-management
description: 지사관리 시스템. 지사 포털 가입/로그인, 선불 충전·잔액 관리, 소속 거래처 관리, 본사 의뢰 주문, 세금계산서 발행, 본사 관리자 승인 작업 시 사용합니다.
---

# 지사관리 스킬 (Branch Portal)

지사는 지역 중간거점으로, 자신의 소속 스튜디오 거래처를 직접 관리하고 본사에 인쇄/앨범 제작을 의뢰합니다.
이 스킬은 지사 포털 전 영역(인증·충전·주문·세금계산서)과 본사 관리자 승인 화면을 다룹니다.

---

## 비즈니스 요구사항

| 항목 | 내용 |
|------|------|
| 지사 역할 | 지역 중간거점 — 자신의 스튜디오 거래처 직접 관리 |
| 의뢰 방식 | 지사 → 본사로 출력/앨범/반제품 직접 의뢰 |
| 정산 방식 | **선불 충전** — 미리 충전 후 의뢰 시마다 잔액 차감 |
| 세금계산서 | 지사 → 자신의 거래처(스튜디오)에게 발급 |
| 포털 UI | 거래처 마이페이지처럼 **완전 분리된 별도 화면** |
| 접수권한 | 지사가 소속 거래처 주문을 직접 접수/처리 |
| 다운로드 | 지사 소속 주문 파일만 다운로드 가능 |
| 접속 URL | `photocafe.co.kr/branch` (별도 서브도메인 없이) |
| 의뢰 단가 | 거래처 기존 단가 그대로 사용 (지사 전용 단가 없음) |

---

## 사용자 구조

```
기존 3종                    추가 1종
─────────────────           ──────────────────
Staff (직원)            →   관리자 대시보드
Client (거래처)         →   쇼핑몰 마이페이지
Employment (거래처직원)  →   거래처 소속 직원
                            BranchPortal (지사) → 지사 전용 포털 (신규)
```

> **⚠️ 주의**: `Branch` 테이블이 이미 존재하지만 "직원 소속 지사" 관리용으로 전혀 다른 개념.
> 지사 포털 계정은 반드시 신규 `BranchPortal` 모델을 사용.

---

## DB 스키마

### 신규 모델 6종

```prisma
// 지사 계정 본체
model BranchPortal {
  id              String    @id @default(cuid())
  name            String                          // 지사명
  bizNo           String?   @unique               // 사업자등록번호
  email           String    @unique               // 로그인 이메일
  password        String                          // bcrypt 해시
  phone           String?
  address         String?
  status          String    @default("pending")   // pending | active | suspended
  balance         Decimal   @default(0) @db.Decimal(14, 2)  // 선불 잔액

  // 관계
  clients         BranchClient[]
  topups          BranchTopup[]
  balanceHistory  BranchBalanceHistory[]
  orders          BranchOrder[]
  taxInvoices     TaxInvoice[]

  // 본사 연결 (선택적)
  branchId        String?   @unique
  branch          Branch?   @relation(fields: [branchId], references: [id])

  approvedBy      String?
  approvedAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("branch_portals")
}

// 지사-거래처 연결 관계
model BranchClient {
  id              String        @id @default(cuid())
  branchPortalId  String
  branchPortal    BranchPortal  @relation(fields: [branchPortalId], references: [id])
  clientId        String
  client          Client        @relation(fields: [clientId], references: [id])
  createdAt       DateTime      @default(now())

  @@unique([branchPortalId, clientId])
  @@map("branch_clients")
}

// 선불 충전 신청/승인 이력
model BranchTopup {
  id              String        @id @default(cuid())
  branchPortalId  String
  branchPortal    BranchPortal  @relation(fields: [branchPortalId], references: [id])
  amount          Decimal       @db.Decimal(14, 2)  // 신청 금액
  status          String        @default("pending")  // pending | approved | rejected
  depositName     String?                            // 입금자명
  receiptUrl      String?                            // 입금증 이미지 URL
  memo            String?
  confirmedBy     String?                            // 승인한 Staff.id
  confirmedAt     DateTime?
  createdAt       DateTime      @default(now())

  @@map("branch_topups")
}

// 잔액 변동 로그 (충전/차감/환불)
model BranchBalanceHistory {
  id              String        @id @default(cuid())
  branchPortalId  String
  branchPortal    BranchPortal  @relation(fields: [branchPortalId], references: [id])
  type            String                            // topup | deduct | refund | adjustment
  amount          Decimal       @db.Decimal(14, 2) // 양수=입금, 음수=차감
  balanceBefore   Decimal       @db.Decimal(14, 2)
  balanceAfter    Decimal       @db.Decimal(14, 2)
  memo            String?
  relatedOrderId  String?                           // 차감 시 연결 주문
  createdAt       DateTime      @default(now())

  @@map("branch_balance_history")
}

// 지사→본사 의뢰 래퍼 (Order 1:1 연결)
model BranchOrder {
  id              String        @id @default(cuid())
  branchPortalId  String
  branchPortal    BranchPortal  @relation(fields: [branchPortalId], references: [id])
  orderId         String        @unique
  order           Order         @relation(fields: [orderId], references: [id])
  deductedAmount  Decimal       @db.Decimal(14, 2)  // 차감된 잔액
  createdAt       DateTime      @default(now())

  @@map("branch_orders")
}

// 세금계산서
model TaxInvoice {
  id              String          @id @default(cuid())
  invoiceNo       String          @unique              // TAX-2026-000001
  branchPortalId  String
  branchPortal    BranchPortal    @relation(fields: [branchPortalId], references: [id])
  clientId        String?                              // 발급 대상 거래처
  client          Client?         @relation(fields: [clientId], references: [id])
  issueDate       DateTime
  supplyAmount    Decimal         @db.Decimal(14, 2)   // 공급가액
  taxAmount       Decimal         @db.Decimal(14, 2)   // 세액
  totalAmount     Decimal         @db.Decimal(14, 2)   // 합계
  memo            String?
  items           TaxInvoiceItem[]
  status          String          @default("draft")    // draft | issued | cancelled
  createdAt       DateTime        @default(now())

  @@map("tax_invoices")
}

model TaxInvoiceItem {
  id            String      @id @default(cuid())
  taxInvoiceId  String
  taxInvoice    TaxInvoice  @relation(fields: [taxInvoiceId], references: [id], onDelete: Cascade)
  description   String      // 품목명
  quantity      Int
  unitPrice     Decimal     @db.Decimal(12, 2)
  amount        Decimal     @db.Decimal(14, 2)
  sortOrder     Int         @default(0)

  @@map("tax_invoice_items")
}
```

### 기존 모델 변경 (최소화)

```prisma
// Order 모델 — 필드 1개 추가
model Order {
  // ... 기존 필드 ...
  requestingBranchPortalId  String?   // 지사 의뢰 시 연결
  branchOrder               BranchOrder?
}

// Branch 모델 — 관계 추가 (컬럼 추가 없음)
model Branch {
  // ... 기존 필드 ...
  branchPortal  BranchPortal?
}

// Client 모델 — 관계 추가 (컬럼 추가 없음)
model Client {
  // ... 기존 필드 ...
  branchClients  BranchClient[]
  taxInvoices    TaxInvoice[]
}
```

---

## 인증 구조

```
JWT type 기존:  'client' | 'staff' | 'employee'
JWT type 추가:  'branch'  ← 신규
```

### 가입→승인 흐름

```
가입 신청 (이메일/PW)
  → status: 'pending'
  → 본사 SUPER_ADMIN 승인
  → status: 'active'
  → 로그인 가능
```

### 인증 API

```
POST /auth/branch/register    지사 가입 신청 { name, email, password, bizNo?, phone? }
POST /auth/branch/login       로그인 { email, password }
GET  /auth/branch/me          내 정보 (JWT 필요)
POST /auth/branch/logout      로그아웃
```

### Guard

```typescript
// BranchAuthGuard: JWT type === 'branch' + status === 'active' 검증
@UseGuards(BranchAuthGuard)
```

---

## API 엔드포인트

### 지사 포털 전용 (`/branch-portal`)

```
# 프로필
GET   /branch-portal/profile                         지사 정보 조회
PATCH /branch-portal/profile                         지사 정보 수정

# 소속 거래처 관리
GET   /branch-portal/clients                         소속 거래처 목록
POST  /branch-portal/clients                         거래처 연결 추가 { clientId }
DELETE /branch-portal/clients/:clientId              거래처 연결 해제

# 의뢰 주문
GET   /branch-portal/orders                          의뢰 주문 목록 (기간/상태 필터)
POST  /branch-portal/orders                          신규 의뢰 주문 생성 (잔액 차감)
GET   /branch-portal/orders/:id                      주문 상세
GET   /branch-portal/orders/:id/download-originals   파일 ZIP 다운로드 (소속 주문만)

# 잔액
GET   /branch-portal/balance                         현재 잔액 + 이번달 사용액
GET   /branch-portal/balance/history                 잔액 변동 이력 (기간 필터)

# 충전 신청
GET   /branch-portal/topups                          충전 신청 목록
POST  /branch-portal/topups                          충전 신청 { amount, depositName, receiptUrl? }

# 세금계산서
GET   /branch-portal/tax-invoices                    발행 목록
POST  /branch-portal/tax-invoices                    신규 발행
GET   /branch-portal/tax-invoices/:id                상세
PATCH /branch-portal/tax-invoices/:id/cancel         취소
GET   /branch-portal/tax-invoices/:id/pdf            PDF 다운로드
```

### 본사 관리자용 (`/admin/branch-portals`)

```
GET   /admin/branch-portals                          지사 목록 (상태 필터)
GET   /admin/branch-portals/:id                      지사 상세 + 잔액 + 최근 주문
PATCH /admin/branch-portals/:id/approve              가입 승인
PATCH /admin/branch-portals/:id/suspend              정지
GET   /admin/branch-portals/:id/topups               충전 신청 목록
PATCH /admin/branch-portals/:id/topups/:topupId/confirm   충전 승인 (잔액 반영)
PATCH /admin/branch-portals/:id/topups/:topupId/reject    충전 거절
GET   /admin/branch-portals/:id/orders               지사 의뢰 주문 현황
GET   /admin/branch-portals/:id/balance-history      잔액 변동 이력
```

---

## 선불 충전 흐름

```
지사                                     본사 관리자
 │                                            │
 ├─ POST /branch-portal/topups                │
 │   { amount: 500000, depositName: "홍길동" } │
 │                                            │
 │   (입금 후 대기)          ←── 확인 ─────── │
 │                                            │
 │            PATCH .../topups/:id/confirm ───┤
 │                                            │
 │   ① BranchTopup.status = 'approved'        │
 │   ② BranchPortal.balance += amount          │
 │   ③ BranchBalanceHistory 기록               │
 │   (트랜잭션으로 원자적 처리)                 │
```

### 의뢰 주문 생성 시 잔액 차감

```typescript
// 잔액 부족이면 400 반환
if (branch.balance < orderAmount) {
  throw new BadRequestException('잔액이 부족합니다.');
}

// 트랜잭션으로 원자적 처리
await prisma.$transaction([
  // 1. 주문 생성
  prisma.order.create({ data: orderData }),
  // 2. BranchOrder 생성
  prisma.branchOrder.create({ data: { branchPortalId, orderId, deductedAmount } }),
  // 3. 잔액 차감
  prisma.branchPortal.update({
    where: { id: branchPortalId },
    data: { balance: { decrement: orderAmount } },
  }),
  // 4. 잔액 이력 기록
  prisma.branchBalanceHistory.create({
    data: { type: 'deduct', amount: -orderAmount, ... },
  }),
]);
```

---

## 프론트엔드 URL 구조

### 지사 전용 포털 (신규 라우트 그룹)

```
apps/web/app/(branch)/
├── layout.tsx                  지사 전용 레이아웃 (독립 헤더/사이드바, 관리자와 완전 분리)
├── login/page.tsx              이메일/PW 로그인
├── register/page.tsx           가입 신청 폼
├── pending/page.tsx            승인 대기 안내
├── dashboard/page.tsx          대시보드 (잔액, 최근 의뢰, 알림)
├── clients/
│   ├── page.tsx                소속 거래처 목록
│   └── add/page.tsx            거래처 연결 추가
├── orders/
│   ├── page.tsx                의뢰 주문 목록
│   ├── new/page.tsx            신규 의뢰 작성
│   └── [id]/page.tsx           주문 상세/파일 다운로드
├── balance/
│   ├── page.tsx                잔액 현황 + 충전 신청 이력
│   └── topup/page.tsx          충전 신청 폼
├── tax-invoices/
│   ├── page.tsx                세금계산서 목록
│   ├── new/page.tsx            신규 발행
│   └── [id]/page.tsx           상세 + PDF 다운로드
└── profile/page.tsx            지사 정보 관리
```

### 본사 관리자 화면 (기존 dashboard에 추가)

```
apps/web/app/(dashboard)/basic-info/branch-portals/
├── page.tsx                    지사 목록 + 가입 승인 대기
└── [id]/
    ├── page.tsx                지사 상세 + 잔액 현황
    └── topups/page.tsx         충전 신청 관리 + 승인/거절
```

---

## 주요 파일 경로

### Backend

```
apps/api/src/modules/branch-portal/
├── branch-portal.module.ts
├── controllers/
│   ├── branch-portal.controller.ts     지사 전용 API
│   └── admin-branch-portal.controller.ts  본사 관리자 API
├── services/
│   ├── branch-portal.service.ts
│   ├── branch-topup.service.ts
│   └── branch-tax-invoice.service.ts
└── dto/
    ├── branch-portal.dto.ts
    ├── branch-topup.dto.ts
    └── tax-invoice.dto.ts

apps/api/src/modules/auth/
├── strategies/branch-local.strategy.ts  이메일/PW 인증
└── guards/branch-auth.guard.ts
```

### Frontend

```
apps/web/app/(branch)/              지사 포털 전체
apps/web/hooks/use-branch.ts        지사 API 훅
apps/web/hooks/use-branch-orders.ts 의뢰 주문 훅
apps/web/hooks/use-branch-topup.ts  충전 신청 훅
apps/web/stores/branch-auth.store.ts 지사 인증 상태
```

---

## 세금계산서 번호 규칙

```
형식: TAX-YYYY-NNNNNN
예시: TAX-2026-000001
```

---

## 구현 단계 (Phase)

| Phase | 내용 | 선결조건 |
|-------|------|----------|
| 1 | DB 마이그레이션 + 지사 가입/로그인/승인 | — |
| 2 | 소속 거래처 관리 + 본사 승인 화면 | Phase 1 |
| 3 | 선불 충전 + 잔액 차감 + 의뢰 주문 | Phase 2 |
| 4 | 파일 다운로드 (지사 소속 주문만 허용) | Phase 3 |
| 5 | 세금계산서 발행 + PDF 생성 | Phase 3 |

---

## 미결 사항 (구현 전 결정 필요)

| 항목 | 현재 결정 | 비고 |
|------|----------|------|
| 접속 URL | `photocafe.co.kr/branch` | 서브도메인 없이 경로로 분리 |
| 의뢰 단가 | 거래처 기존 단가 그대로 | 지사 전용 단가 별도 없음 |
| 세금계산서 전송 | PDF 다운로드만 | 이메일 자동발송 미지원 |
| 지사 수 규모 | 미결정 | 소수(5개 이하) vs 향후 확장 |

---

## 체크리스트

### Phase 1 — 인증
- [ ] DB 마이그레이션 (BranchPortal, BranchClient, BranchTopup, BranchBalanceHistory, BranchOrder, TaxInvoice)
- [ ] Order 모델 `requestingBranchPortalId` 필드 추가
- [ ] `POST /auth/branch/register` — 가입 신청
- [ ] `POST /auth/branch/login` — 이메일/PW 로그인
- [ ] `GET /auth/branch/me` — 내 정보
- [ ] BranchAuthGuard 구현 (JWT type='branch' + status='active')
- [ ] 가입 신청 폼 (`/branch/register`)
- [ ] 승인 대기 화면 (`/branch/pending`)
- [ ] 로그인 페이지 (`/branch/login`)
- [ ] 본사 관리자 승인/정지 API + UI

### Phase 2 — 거래처
- [ ] `GET/POST/DELETE /branch-portal/clients`
- [ ] 소속 거래처 목록 화면
- [ ] 거래처 연결/해제 기능

### Phase 3 — 충전 · 주문
- [ ] 충전 신청 API (`POST /branch-portal/topups`)
- [ ] 충전 승인 API (`PATCH /admin/.../topups/:id/confirm`) — 트랜잭션
- [ ] 잔액 조회/이력 API
- [ ] 의뢰 주문 생성 API — 잔액 차감 트랜잭션
- [ ] 잔액 부족 시 400 에러 처리
- [ ] 잔액 현황 + 충전 신청 UI
- [ ] 의뢰 주문 목록/작성 UI

### Phase 4 — 파일 다운로드
- [ ] `GET /branch-portal/orders/:id/download-originals`
- [ ] 소속 주문 여부 검증 (BranchOrder 조회)
- [ ] ZIP 생성 + 스트리밍 응답

### Phase 5 — 세금계산서
- [ ] TaxInvoice CRUD API
- [ ] 세금계산서 번호 자동 생성 (TAX-YYYY-NNNNNN)
- [ ] PDF 생성 (`GET /branch-portal/tax-invoices/:id/pdf`)
- [ ] 세금계산서 목록/발행/상세 UI
