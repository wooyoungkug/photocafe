# 미수금 관리 1주일 개발 - 전체 프롬프트 통합본

**이 파일은 Day 1~5까지의 모든 프롬프트를 통합한 문서입니다.**
**각 Day별로 해당 섹션을 복사해서 Claude에게 요청하면 됩니다.**

---

# 📅 Day 1: DB 스키마 및 기본 CRUD API

## Claude에게 요청할 프롬프트

```
미수금 관리 기능의 Day 1 작업을 진행해주세요.

1. Prisma 스키마에 Receivable, ReceivablePayment, SalesLedger 모델 추가
2. Client 모델에 receivables, salesLedger 관계 추가
3. apps/api/src/modules/accounting 디렉토리 구조 생성
4. DTO 파일 3개 생성 (create, update, query)
5. ReceivablesService 구현 (CRUD 메서드)
6. ReceivablesController 구현 (5개 엔드포인트)
7. AccountingModule에 의존성 등록
8. OrderService에 주문 완료 시 미수금 자동 생성 로직 추가

모든 파일에 TypeScript 타입 안전성, Swagger 문서화, 에러 처리를 포함해주세요.
완료 후 Prisma db push 및 API 테스트를 실행해주세요.
```

## 상세 요구사항

### 1. Prisma 스키마 (apps/api/prisma/schema.prisma)

**Receivable 모델 추가:**
```prisma
model Receivable {
  id              String        @id @default(cuid())
  clientId        String
  client          Client        @relation(fields: [clientId], references: [id])
  orderId         String?
  originalAmount  Decimal       @db.Decimal(12, 2)
  paidAmount      Decimal       @default(0) @db.Decimal(12, 2)
  balance         Decimal       @db.Decimal(12, 2)
  issueDate       DateTime
  dueDate         DateTime?
  description     String?
  payments        ReceivablePayment[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([clientId])
  @@index([issueDate])
  @@index([dueDate])
  @@map("receivables")
}
```

**ReceivablePayment 모델 추가:**
```prisma
model ReceivablePayment {
  id              String        @id @default(cuid())
  receivableId    String
  receivable      Receivable    @relation(fields: [receivableId], references: [id], onDelete: Cascade)
  amount          Decimal       @db.Decimal(12, 2)
  paymentDate     DateTime
  paymentMethod   String?
  description     String?
  journalId       String?
  createdAt       DateTime      @default(now())

  @@index([receivableId])
  @@index([paymentDate])
  @@map("receivable_payments")
}
```

**SalesLedger 모델 추가:**
```prisma
model SalesLedger {
  id              String        @id @default(cuid())
  clientId        String
  client          Client        @relation(fields: [clientId], references: [id])
  orderId         String?
  amount          Decimal       @db.Decimal(12, 2)
  salesDate       DateTime
  description     String?
  createdAt       DateTime      @default(now())

  @@index([clientId])
  @@index([salesDate])
  @@map("sales_ledger")
}
```

**Client 모델에 관계 추가:**
```prisma
model Client {
  // ... 기존 필드들
  receivables     Receivable[]
  salesLedger     SalesLedger[]
}
```

### 2. 실행 명령어

```bash
cd /c/dev/printing114/apps/api
npx prisma db push
npx prisma generate
```

---

# 📅 Day 2-A: 조회 API 및 Frontend 목록

## Claude에게 요청할 프롬프트

```
미수금 관리 Day 2 작업을 진행해주세요.

Backend:
1. ReceivablesService에 summary, aging, stats 메서드 추가
2. 3개 DTO 생성 (QueryReceivablesSummaryDto, QueryReceivablesAgingDto)
3. ReceivablesController에 3개 엔드포인트 추가

Frontend:
1. use-receivables.ts 훅 파일 생성 (4개 훅)
2. app/(dashboard)/accounting/receivables/page.tsx 생성
3. components/ 디렉토리에 4개 컴포넌트 생성:
   - receivables-table.tsx
   - aging-analysis.tsx
   - receivables-filters.tsx
4. shadcn/ui 컴포넌트 사용 (Table, Card, Badge, DateRangePicker, Select)

모든 코드에 타입 안전성, 에러 처리, 로딩 상태 포함해주세요.
완료 후 페이지 접속 및 데이터 조회 테스트를 실행해주세요.
```

## 주요 API 엔드포인트

1. **GET /receivables/summary** - 거래처별 미수금 요약
2. **GET /receivables/aging** - Aging 분석 (30/60/90일)
3. **GET /receivables/stats** - 통계 (총 미수금, 평균 회수기간)

---

# 📅 Day 2-B: 영업담당자별 집계 기능

## Claude에게 요청할 프롬프트

```
미수금 관리 Day 2에 영업담당자별 집계 기능을 추가해주세요.

1. Prisma Schema 수정:
   - Client 모델에 salesStaffId 필드 추가
   - Staff와 관계 설정
   - npx prisma db push 실행

2. Backend API 3개 추가:
   - GET /receivables/summary-by-staff (영업담당자별 요약)
   - GET /receivables/collection-by-staff (영업담당자별 수금 실적)
   - GET /receivables/by-staff/:staffId (담당자별 상세 목록)

3. Frontend:
   - use-receivables-by-staff.ts 훅 파일 생성
   - app/(dashboard)/accounting/receivables/by-staff/page.tsx 생성
   - components/staff-summary-table.tsx 생성
   - components/collection-by-staff-chart.tsx 생성
   - app/(dashboard)/accounting/receivables/by-staff/[staffId]/page.tsx 생성

4. 기능:
   - 영업담당자별 미수금 집계 (발생액, 수금액, 잔액)
   - 담당 고객 수, 미수 건수 표시
   - 수금률 계산 및 표시 (80% 이상 녹색, 미만 빨간색)
   - 수금 방법별 집계 (현금/계좌이체/카드)
   - recharts 스택 바 차트로 시각화

모든 코드에 타입 안전성, 반응형 레이아웃, 에러 처리 포함해주세요.
완료 후 영업담당자별 현황 페이지 접속 및 데이터 확인 테스트를 실행해주세요.
```

## Prisma 스키마 수정

```prisma
model Client {
  // ... 기존 필드들

  // 영업담당자 추가
  salesStaffId        String?
  salesStaff          Staff?        @relation("SalesStaff", fields: [salesStaffId], references: [id])

  @@index([salesStaffId])
}

model Staff {
  // ... 기존 필드들

  // 담당 고객 추가
  managedClients      Client[]      @relation("SalesStaff")
}
```

---

# 📅 Day 3: 수금 처리 및 자동 분개

## Claude에게 요청할 프롬프트

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

## Prisma 스키마 추가

**Account 모델:**
```prisma
enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}

model Account {
  id          String      @id @default(cuid())
  code        String      @unique
  name        String
  type        AccountType
  description String?
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@map("accounts")
}
```

**Journal 모델:**
```prisma
enum VoucherType {
  RECEIPT
  PAYMENT
  TRANSFER
}

enum TransactionType {
  DEBIT
  CREDIT
}

model Journal {
  id          String        @id @default(cuid())
  voucherNo   String        @unique
  voucherType VoucherType
  journalDate DateTime
  clientId    String?
  client      Client?       @relation(fields: [clientId], references: [id])
  description String?
  totalAmount Decimal       @db.Decimal(12, 2)
  entries     JournalEntry[]
  createdBy   String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([journalDate])
  @@index([clientId])
  @@map("journals")
}

model JournalEntry {
  id              String          @id @default(cuid())
  journalId       String
  journal         Journal         @relation(fields: [journalId], references: [id], onDelete: Cascade)
  accountCode     String
  transactionType TransactionType
  amount          Decimal         @db.Decimal(12, 2)
  description     String?
  sortOrder       Int             @default(0)

  @@map("journal_entries")
}
```

**시드 데이터:**
```typescript
const accounts = [
  { code: '101', name: '현금', type: 'ASSET' },
  { code: '102', name: '보통예금', type: 'ASSET' },
  { code: '110', name: '외상매출금', type: 'ASSET' },
  { code: '400', name: '매출', type: 'REVENUE' },
];
```

---

# 📅 Day 4: 대시보드 및 리포트

## Claude에게 요청할 프롬프트

```
미수금 관리 Day 4 작업을 진행해주세요.

Backend:
1. DashboardController, DashboardService 생성
2. ReportsController, ReportsService 생성
3. DTO 생성 (QueryStatementDto, QueryDueScheduleDto)
4. 3개 API 엔드포인트 구현

Frontend:
1. app/(dashboard)/accounting/dashboard/page.tsx 생성
2. 대시보드 컴포넌트 4개 생성:
   - ReceivablesKPI.tsx
   - TopClientsChart.tsx
   - MonthlyCollectionChart.tsx
3. 명세서 페이지: reports/receivable-statement/[clientId]/page.tsx
4. recharts 라이브러리 설치 및 차트 구현

모든 코드에 타입 안전성, 반응형 레이아웃 포함해주세요.
완료 후 대시보드 및 리포트 페이지 동작 테스트를 실행해주세요.
```

## 주요 API

1. **GET /dashboard/receivables** - 대시보드 데이터
2. **GET /reports/receivable-statement/:clientId** - 거래처별 명세서
3. **GET /receivables/due-schedule** - 수금 예정 일정

---

# 📅 Day 5: 테스트 및 문서화

## Claude에게 요청할 프롬프트

```
미수금 관리 Day 5 작업을 진행해주세요.

Backend:
1. receivables.service.spec.ts 테스트 파일 생성
2. journal.service.spec.ts 테스트 파일 생성
3. receivables.e2e-spec.ts E2E 테스트 생성
4. 모든 Controller에 Swagger 문서 추가 (@ApiTags, @ApiOperation)
5. 모든 DTO에 @ApiProperty 추가
6. README.md 작성

Frontend:
1. 사용자 시나리오 테스트 (체크리스트 기반)
2. 버그 수정 (모바일 반응형, 차트 최적화 등)
3. 에러 처리 강화

테스트 실행:
1. npm test (Unit Tests)
2. npm run test:e2e (E2E Tests)
3. npm run test:cov (커버리지)

모든 테스트가 통과하고, Swagger 문서가 완성되면 완료입니다.
최종적으로 사용자 시나리오 테스트를 통해 전체 기능을 검증해주세요.
```

## 테스트 체크리스트

### Backend 테스트
- [ ] receivables.service.spec.ts (Unit Tests)
- [ ] journal.service.spec.ts (Unit Tests)
- [ ] receivables.e2e-spec.ts (E2E Tests)
- [ ] 테스트 커버리지 80% 이상

### Frontend 테스트
- [ ] 미수금 목록 페이지 렌더링
- [ ] Aging 분석 차트 표시
- [ ] 수금 모달 동작
- [ ] 영업담당자별 현황 표시
- [ ] 대시보드 KPI 표시

### 문서화
- [ ] Swagger 문서 완성
- [ ] README.md 작성
- [ ] API 사용 예시 추가

---

# 🎯 전체 완료 조건

## ✅ Backend (15개 API)
- [x] POST /receivables - 미수금 생성
- [x] GET /receivables - 목록 조회
- [x] GET /receivables/:id - 상세 조회
- [x] PUT /receivables/:id - 수정
- [x] DELETE /receivables/:id - 삭제
- [x] GET /receivables/summary - 거래처별 요약
- [x] GET /receivables/aging - Aging 분석
- [x] GET /receivables/stats - 통계
- [x] GET /receivables/summary-by-staff - 영업담당자별 요약
- [x] GET /receivables/collection-by-staff - 영업담당자별 수금 실적
- [x] GET /receivables/by-staff/:staffId - 담당자별 상세
- [x] POST /receivables/:id/payment - 수금 처리
- [x] GET /receivables/:id/payments - 수금 이력
- [x] GET /dashboard/receivables - 대시보드
- [x] GET /reports/receivable-statement/:clientId - 명세서

## ✅ Frontend (5개 페이지)
- [x] /accounting/receivables - 미수금 목록
- [x] /accounting/receivables/by-staff - 영업담당자별 현황
- [x] /accounting/receivables/by-staff/:staffId - 담당자별 상세
- [x] /accounting/dashboard - 대시보드
- [x] /accounting/reports/receivable-statement/:clientId - 명세서

## ✅ 테스트
- [x] Unit Tests (80% 커버리지)
- [x] E2E Tests (주요 시나리오)
- [x] 사용자 시나리오 테스트

## ✅ 문서화
- [x] Swagger 문서
- [x] README.md
- [x] 코드 주석

---

# 📝 사용 방법

## 1단계: Day별로 순차 진행
각 Day의 프롬프트를 복사해서 Claude에게 순서대로 요청합니다.

## 2단계: 테스트 및 확인
각 Day 작업 완료 후 반드시 동작을 확인합니다.

## 3단계: 커밋
```bash
git add .
git commit -m "feat: Day X - [기능명] 완료"
```

## 4단계: 다음 Day 진행
이전 Day가 완료되면 다음 Day로 진행합니다.

---

**Last Updated**: 2026-02-13
**총 예상 시간**: 38-48시간 (5일)
**난이도**: 중급~고급
