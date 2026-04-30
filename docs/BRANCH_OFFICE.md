# 지사(Branch Office) 시스템 상세 기획서

> 작성일: 2026-04-30
> 작성 브랜치: `claude/add-branch-office-system-3mtux`
> 상태: **초안 (구현 전 합의용)**

---

## 0. 한 줄 요약

본사(Photocafe)가 직접 운영해 온 ERP/쇼핑몰을 **반-독립 사업자인 “지사(Branch)”** 가
자기 회원·주문·세금계산서·다운로드를 직접 운영할 수 있도록 확장한다.
지사는 본사 시스템 안의 **테넌트(tenant)** 로 살되, 사업자번호·세금책임·결제정책·
서브도메인(`{지사}.photocafe.co.kr`)은 분리한다.

지사는 동시에 **본사의 B2B 고객**이기도 하다 — 출력만/앨범/반제품을 본사에
의뢰할 수 있고, 본사는 지사에게 청구한다.

---

## 1. 용어 정의

| 용어 | 영문 | 설명 |
|---|---|---|
| 본사 | Headquarters (HQ) | Photocafe 본체. `Branch.isHeadquarters=true` 1건. |
| 지사 | Branch Office | 사업자번호를 가진 반-독립 운영 주체. 다수. |
| 지사 직원 | Branch Staff | 해당 지사에 소속된 `Staff`. 다른 지사 데이터 접근 불가. |
| 지사 회원 | Branch Client | 지사 서브도메인으로 가입한 `Client`. 지사 소속. |
| 지사 주문 (B2C) | Branch Order | 지사 회원이 지사에 낸 주문. 지사가 매출. |
| 의뢰 주문 (B2B) | Internal Order | 지사가 본사에 출력/앨범/반제품을 의뢰. 본사가 매출, 지사가 매입. |
| 테넌트 | Tenant | 데이터 격리 단위. 본 시스템에서는 `branchId` 기준. |

---

## 2. 비즈니스 요구사항 (확정본)

### 2.1 지사가 직접 수행하는 업무
1. 자기 회원의 가입 승인·관리·등급 부여
2. 자기 회원이 발주한 주문의 **접수/접수완료/생산진행/배송준비** 단계 관리
3. **매출세금계산서 발행** (지사 사업자번호로, 지사회원에게 직접)
4. **거래명세서/견적서 작성** (지사 사업자정보 표기)
5. 자기 회원이 업로드한 **이미지 원본 다운로드**
6. 자기 회원과의 **결제 수금/미수금 관리**

### 2.2 결제 방식 (지사가 자기 회원에게 적용)
| 코드 | 명칭 | 설명 |
|---|---|---|
| `prepaid` | 선입금 | 주문 전 충전 → 차감 |
| `credit` | 신용거래 | 월말/익월 정산 (기존 `creditEnabled` 재활용) |
| `on_order` | 주문시입금 | 주문 생성 시 무통장입금 (기본값) |
| `card` | 카드결제 | 주문 생성 시 PG 카드결제 (지사 PG 계정으로 직접 수금) |

지사 단위로 **허용 결제방식 화이트리스트**(`Branch.allowedPaymentTypes`) 보유.

> **카드결제 추가 고려사항**
> - **PG 계약 주체**: 지사 사업자번호로 자체 PG(토스페이먼츠/나이스페이/KG이니시스 등) 계약 →
>   매출은 지사 통장으로 직접 입금 (세금계산서 발행자와 일치)
> - `Branch.pgProvider`, `Branch.pgMerchantId`, `Branch.pgApiKey`(암호화) 필드 추가 필요
> - 본사 PG 를 공용으로 쓰는 옵션도 가능하나 정산이 복잡 → **지사별 PG 계정 권장**
> - 카드결제 수수료(약 2.5~3%)는 지사가 부담 (단가 정책에 반영 권장)
> - 부분취소/환불 처리는 PG 별 SDK 차이 있음 — 1차 범위에서는 “전체 취소만” 으로 한정 권장

### 2.3 서브도메인 / 도메인
- `{branchCode}.photocafe.co.kr` (예: `seoul.photocafe.co.kr`)
- DNS: Cloudflare 와일드카드 `*.photocafe.co.kr` → Vercel
- 가입은 서브도메인에서만 → `Client.branchId` 자동 설정
- 추후 자체 도메인(`Branch.customDomain`)도 매핑 가능 (Vercel 도메인 추가)

### 2.4 본사 ↔ 지사 거래 (의뢰 주문)
지사가 본사에 다음 3종을 의뢰할 수 있다:
| 의뢰 종류 | `internalOrderType` | 본사 처리 |
|---|---|---|
| 출력만 의뢰 | `print_only` | 인쇄·후가공·발송 (앨범 제본 제외) |
| 앨범 의뢰 | `album` | 앨범 풀공정 (인쇄·제본·검수·발송) |
| 반제품 의뢰 | `half_product` | 반제품(속지/표지/케이스 등) 단위 공급 |

본사는 지사에게 **월 정산서**를 발행 (본사가 발행자, 지사가 수신자).

---

## 3. 권한·접근 제어 정책

### 3.1 역할 (Role) 체계 확장

| 기존/신규 | role | 데이터 범위 | 비고 |
|---|---|---|---|
| 기존 | `superadmin` (`isSuperAdmin=true`) | 전체 | 본사·지사 모두 |
| 기존 | `employee` | `branchId` 기준 자기 지사 | 본사 직원이면 본사 직속만 |
| **신규** | `branch_admin` | 자기 지사 전체 | 지사 내 직원/회원/주문/세금/정산 모두 |
| **신규** | `branch_staff` | 자기 지사 (제한) | 회원/주문 처리. 정산/직원관리 불가 |

`Staff.role` 컬럼에 위 4종이 들어간다.

### 3.2 데이터 격리 — Row-Level Tenancy (추천)

> 데이터베이스/스키마 분리는 운영 부담이 너무 커서 채택하지 않는다.

- 모든 “지사 귀속 가능” 테이블에 `branchId` 컬럼 추가
- NestJS `BranchScopeInterceptor` 가 JWT 의 `branchId`/`role` 을 읽어
  Prisma 쿼리 `where` 절에 자동 주입
- 슈퍼관리자는 인터셉터 우회 (`x-branch-override` 헤더 또는 무필터)

**`branchId` 추가 대상 테이블 (1차):**
`Client`, `Order`, `Quotation`, `SalesLedger`, `PurchaseLedger`,
`ReturnRequest`, `Consultation`, `Notification` (수신자 기준은 기존 유지)

**`branchId` 미추가 (전사 공유):**
`Product`, `HalfProduct`, `Category`, `Paper`, `SystemSetting`,
`PermissionTemplate`, `Specification`(상품 규격) — 본사가 단일 마스터로 관리

### 3.3 권한 매트릭스

| 행위 | superadmin | branch_admin | branch_staff | 본사 employee |
|---|:-:|:-:|:-:|:-:|
| 지사 생성/삭제 | ✅ | ❌ | ❌ | ❌ |
| 지사 직원 등록 | ✅ | ✅(자기 지사) | ❌ | ❌ |
| 자기 지사 회원 관리 | ✅ | ✅ | ✅ | — |
| 다른 지사 회원 조회 | ✅ | ❌ | ❌ | ❌ |
| 자기 지사 주문 처리 | ✅ | ✅ | ✅ | — |
| 자기 지사 다운로드 | ✅ | ✅ | ✅ | — |
| 다른 지사 다운로드 | ✅ | ❌ | ❌ | ❌ |
| 자기 지사 세금계산서 발행 | ✅ | ✅ | ❌ | — |
| 본사↔지사 정산 | ✅ | 조회만 | ❌ | ✅ |
| 상품/규격 마스터 관리 | ✅ | ❌ | ❌ | ❌ |

---

## 4. 데이터 모델 변경

### 4.1 `Branch` 모델 확장

```prisma
model Branch {
  id                   String   @id @default(cuid())
  branchCode           String   @unique           // 서브도메인이 됨 (예: "seoul")
  branchName           String
  isHeadquarters       Boolean  @default(false)

  // 사업자 정보 (세금계산서 발행 주체)
  businessNumber       String?                    // 사업자등록번호
  representative       String?                    // 대표자명
  businessType         String?                    // 업태
  businessCategory     String?                    // 종목
  taxInvoiceIssuer     Boolean  @default(true)    // 지사 직접 발행 여부

  // 연락처/주소
  address              String?
  addressDetail        String?
  postalCode           String?
  phone                String?
  fax                  String?
  email                String?

  // 도메인 / 브랜딩
  subdomain            String   @unique           // 보통 branchCode 와 동일
  customDomain         String?  @unique           // 자체도메인 매핑 시
  logoUrl              String?
  themeColor           String?  @default("#000000")
  footerText           String?                    // 푸터 사업자정보 추가 문구

  // 결제 정책
  allowedPaymentTypes  String[] @default(["on_order"])  // prepaid|credit|on_order|card
  bankName             String?
  bankAccount          String?
  bankHolder           String?

  // 카드결제 (PG)
  pgProvider           String?                          // toss|nice|inicis|null
  pgMerchantId         String?                          // PG 가맹점 ID
  pgApiKeyEncrypted    String?                          // KMS/Secret 으로 암호화 저장
  pgEnabled            Boolean  @default(false)

  // 본사↔지사 정산
  commissionRate       Decimal  @default(0) @db.Decimal(5, 2)  // 본사 수수료 %
  settlementCycle      String   @default("monthly")            // monthly|biweekly
  settlementDay        Int      @default(31)                   // 마감일

  // 운영
  isActive             Boolean  @default(true)
  approvedAt           DateTime?
  contractStartDate    DateTime?
  contractEndDate      DateTime?
  adminMemo            String?

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  staff                Staff[]
  clients              Client[]                   // 신규
  clientGroups         ClientGroup[]
  orders               Order[]                    // 신규
  internalOrders       Order[]   @relation("InternalRequester")  // 본사로의 의뢰
  branchInvoices       BranchInvoice[]            // 신규: 본사→지사 청구

  @@map("branches")
}
```

### 4.2 `Client` 변경
```prisma
model Client {
  // ...기존 필드
  branchId  String?              // 지사 귀속 (null = 본사 직속)
  branch    Branch?  @relation(fields: [branchId], references: [id])

  @@index([branchId])
}
```
- 가입 시 서브도메인 host 로 자동 결정
- 변경은 슈퍼관리자만 가능

### 4.3 `Order` 변경
```prisma
model Order {
  // ...기존 필드
  branchId            String?              // 접수 지사 (B2C 주문)
  orderType           String   @default("b2c")  // b2c | internal
  internalOrderType   String?              // print_only | album | half_product
  requesterBranchId   String?              // internal 일 때, 의뢰한 지사
  branch              Branch?  @relation(fields: [branchId], references: [id])
  requesterBranch     Branch?  @relation("InternalRequester", fields: [requesterBranchId], references: [id])

  @@index([branchId])
  @@index([orderType])
}
```
- B2C: `branchId=지사`, `orderType=b2c`, `clientId=지사회원`
- 의뢰: `branchId=본사`, `orderType=internal`, `requesterBranchId=지사`,
  `clientId=지사를 표현하는 가상 Client` 또는 별도 처리

### 4.4 `Staff` 변경 (필드명 호환)
- `branchId` 이미 존재 → 그대로 사용
- `role` 에 `branch_admin`, `branch_staff` 추가
- 신규: `canManageBranchSettings`, `canIssueTaxInvoice`, `canViewBranchSettlement`

### 4.5 신규 모델 — 본사↔지사 정산
```prisma
model BranchInvoice {
  id              String   @id @default(cuid())
  invoiceNumber   String   @unique
  branchId        String                        // 청구받는 지사
  periodStart     DateTime
  periodEnd       DateTime
  subtotal        Decimal  @db.Decimal(12, 2)
  vat             Decimal  @db.Decimal(12, 2)
  total           Decimal  @db.Decimal(12, 2)
  status          String   @default("draft")    // draft|issued|paid|overdue
  issuedAt        DateTime?
  paidAt          DateTime?
  dueDate         DateTime?
  pdfUrl          String?
  branch          Branch   @relation(fields: [branchId], references: [id])
  items           BranchInvoiceItem[]

  @@index([branchId])
  @@index([status])
  @@map("branch_invoices")
}

model BranchInvoiceItem {
  id              String   @id @default(cuid())
  invoiceId       String
  orderId         String?                       // 연결된 internal Order
  description     String
  quantity        Int
  unitPrice       Decimal  @db.Decimal(10, 2)
  amount          Decimal  @db.Decimal(12, 2)
  invoice         BranchInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
  @@map("branch_invoice_items")
}
```

### 4.6 마이그레이션 영향 테이블 요약

| 테이블 | 변경 |
|---|---|
| `branches` | 컬럼 다수 추가 (BR-1) |
| `clients` | `branchId` 추가 (BR-2) |
| `orders` | `branchId`, `orderType`, `internalOrderType`, `requesterBranchId` 추가 (BR-3) |
| `staff` | `role` enum 확장 + 권한 boolean 3종 (BR-4) |
| `branch_invoices` | 신규 (BR-5) |
| `branch_invoice_items` | 신규 (BR-5) |

---

## 5. 인프라·라우팅

### 5.1 DNS / 도메인
1. Cloudflare → `*.photocafe.co.kr` CNAME `cname.vercel-dns.com` (DNS only / 회색)
2. Vercel 프로젝트 → **Domains 탭**에 `*.photocafe.co.kr` 와일드카드 추가
3. SSL: Vercel 자동(Let’s Encrypt 와일드카드)
4. 자체 도메인은 지사 신청 시 개별 추가 (수동)

### 5.2 Next.js middleware (지사 식별)
`apps/web/middleware.ts` 확장:
```ts
const host = req.headers.get('host') ?? '';
const sub = host.split('.')[0];
if (sub && sub !== 'photocafe' && sub !== 'www' && sub !== 'api') {
  // 지사 서브도메인
  res.headers.set('x-branch-code', sub);
}
```
- React Server Component / Layout 에서 `headers()` 로 읽어 `BranchProvider` 컨텍스트에 주입
- 로고/색상/푸터 SSR 렌더링

### 5.3 API 측
- 로그인 시 JWT 에 `branchId`, `role` 포함
- `BranchScopeInterceptor` 가 controller 진입 직전 `req.branchId` 세팅
- 다운로드 엔드포인트는 `Order.branchId === req.branchId` 체크 후 B2 프리사인드 URL 발급

### 5.4 가입 플로우
```
seoul.photocafe.co.kr/signup
  → middleware: x-branch-code=seoul
  → /signup 페이지가 hidden field 로 branchCode 전송
  → POST /auth/signup { branchCode, ... }
  → API: Branch 검증 → Client.branchId 설정 → 가입
```

---

## 6. 화면(UI) 신규/변경 목록

### 6.1 본사 슈퍼관리자
- `/dashboard/branches` — 지사 목록/신규/상세
- `/dashboard/branches/[id]` — 지사 정보, 직원, 회원수, 매출, 정산현황
- `/dashboard/branches/[id]/invoices` — 본사→지사 청구서 발행/조회
- `/dashboard/internal-orders` — 지사로부터의 의뢰주문 통합 조회

### 6.2 지사 관리자(`branch_admin`)
- `/dashboard` — 지사 한정 KPI (자기 지사 매출/주문/회원만)
- `/dashboard/clients` — 자기 지사 회원
- `/dashboard/orders` — 자기 지사 주문 (B2C)
- `/dashboard/internal-orders/new` — 본사로 의뢰주문 생성
- `/dashboard/tax-invoices` — 자기 지사 세금계산서 발행/조회
- `/dashboard/settlements` — 본사로부터 받은 청구서 조회/결제

### 6.3 지사 회원(쇼핑몰 — 서브도메인)
- 기존 `(shop)` 그룹 페이지 그대로, 단 푸터/로고/약관에 지사 사업자정보 노출
- 결제수단 선택지는 `Branch.allowedPaymentTypes` 로 필터

---

## 7. 세금계산서 / 거래명세서

### 7.1 발행 주체 결정 규칙
| 주문 종류 | 발행자 | 수신자 |
|---|---|---|
| B2C (지사→회원) | 지사 (지사 사업자번호) | 지사 회원 |
| Internal (본사가 지사에게 청구) | 본사 | 지사 |

### 7.2 PDF 템플릿
- `apps/api/src/modules/print-pdf` 의 거래명세서/세금계산서 템플릿에
  발행자 사업자정보를 **`branch` 데이터에서 동적으로 가져오도록** 변경
- 현재 하드코딩된 본사 정보를 `Branch` 조회로 치환

### 7.3 외부 전자세금계산서 연계 (확장)
- 1차 범위 외, 2차 검토
- 지사별 공인인증서 보관 → KMS/Secret Manager 권장
- 사용자 부담이 크면 “PDF 출력만, 발행은 지사가 자기 홈택스에서” 로 시작

---

## 8. 본사↔지사 정산 흐름 (월 단위)

```mermaid
sequenceDiagram
  participant 지사
  participant 본사API
  participant 본사회계
  participant 지사회계

  Note over 지사,본사API: 1개월 동안
  지사->>본사API: 의뢰주문 N건 생성 (orderType=internal)
  본사API->>본사API: 주문 처리/배송 완료
  Note over 본사회계: 월말 마감
  본사회계->>본사API: BranchInvoice 자동 생성 (지사별)
  본사회계->>지사: 청구서 발행 (PDF + 알림)
  지사->>본사회계: 결제 (계좌이체)
  본사회계->>본사API: BranchInvoice.status=paid
  Note over 지사회계: 별도로
  지사회계->>지사회계: 자기 회원에게 받은 매출 = 지사 매출
  지사회계->>지사회계: 본사 청구액 = 지사 매입원가
```

---

## 9. 단계별 로드맵 (Phase)

### Phase 0 — 합의 (현재)
- 본 기획서 리뷰 → 변경 요청 반영 → 확정

### Phase 1 — 핵심 기반 (2~3주)
1. `Branch` 모델 확장 (BR-1)
2. `Client.branchId` 추가 + 마이그레이션 스크립트로 기존 회원을 본사 Branch 에 매핑 (BR-2)
3. JWT 에 `branchId`/`role` 포함, `BranchScopeInterceptor` 구현
4. Cloudflare 와일드카드 + Vercel 와일드카드 + middleware 라우팅
5. 지사 가입 플로우 (서브도메인 → 자동 귀속)
6. 본사 슈퍼관리자 “지사 CRUD” 화면

### Phase 2 — 주문/다운로드 (2주)
1. `Order.branchId` 추가 (BR-3)
2. 지사 주문 처리 화면 (`branch_admin` 시점)
3. 다운로드 권한 게이트 (B2 프리사인드 URL)
4. 거래명세서 PDF 발행자 동적 치환

### Phase 3 — 세금계산서/결제 (2주)
1. `Staff.role` 확장 (BR-4) + 권한 가드
2. 지사 세금계산서 발행 화면 (PDF 출력 우선, 외부 연동 보류)
3. 결제수단 화이트리스트 (`allowedPaymentTypes`)

### Phase 4 — 의뢰주문/정산 (3주)
1. `orderType=internal` 흐름 (지사→본사 발주) (BR-3)
2. `BranchInvoice` 모델 + 월 정산 자동 생성 (BR-5)
3. 본사 측 “의뢰주문” / 지사 측 “정산서” 화면

### Phase 5 — 브랜딩/확장 (1주)
1. 지사별 로고/색/푸터 SSR
2. 자체 도메인 매핑
3. 파일럿 지사 1곳 운영 → 피드백 → 일반 출시

---

## 10. 위험·되돌리기 어려운 작업

| 항목 | 영향 | 완화 |
|---|---|---|
| 모든 주요 테이블에 `branchId` 추가 | 기존 쿼리 전수 점검 필요 | nullable 로 추가 후 단계적 채움 / 본사 직속 = `null` 허용 정책 |
| 슈퍼관리자 외 사용자에게 강제 필터 | 누락 시 데이터 유출 | 인터셉터 단위테스트 + 통합테스트 + 로그 |
| 와일드카드 SSL/DNS | 잘못 설정 시 모든 서브도메인 다운 | 스테이징 도메인 먼저 검증 |
| 세금계산서 발행 주체 변경 | 회계·법적 책임 | 외부 전자세금계산서 연동은 1차 범위 제외 |
| 의뢰주문 = 본사 매출 + 지사 매입 이중기장 | 회계 일관성 | 회계팀 사전 합의 필수, 1건 시범 발행 후 확장 |

---

## 11. 미결 / 추가 확인 필요 항목

1. **세금계산서 외부 연동** — 홈택스 직접 발행 vs 외부 ASP(예: 바로빌, 더존) — 비용·계약
2. **회원 이전** — 본사 직속 회원이 지사로 옮길 때 정책 (이력/주문 이관 여부)
3. **상품 가격** — 지사가 자기 회원에게 별도 단가 운영 가능? (현재 `ClientGroup` 으로 부분 가능)
4. **반품/환불** — 지사 회원의 반품을 누가 책임지는가 (지사 자체 처리 vs 본사 위임)
5. **지사간 협업** — 다른 지사의 작업물을 보거나 추천하는 기능 필요 여부
6. **로그/감사** — `AuditLog` 에 `branchId` 추가하여 지사별 감사 가능하게
7. **PG(카드결제) 정책** — 지사별 PG 계약 vs 본사 공용 PG 분배 — 정산 복잡도/수수료 부담 주체
8. **카드 부분취소/할부 환불** — PG 별 지원 차이 → 1차 범위 포함 여부

---

## 12. 다음 액션

> 다음 단계를 선택해 주세요.
> - **(1) Phase 1 구현 시작 [추천]** — 핵심 기반(Branch 확장 + 회원귀속 + 라우팅)부터.
>    되돌릴 수 있는 nullable 컬럼 추가가 대부분이라 위험 낮음.
> - (2) 미결 항목 1~6 먼저 회의로 결정 — 회계/세금/외부연동 정책이 모델에 영향을 줌.
> - (3) 기획서 일부 수정 — 본 문서에서 바꾸고 싶은 항목 지적.
