---
name: order-management
description: 주문 관리 및 처리 흐름. 주문 접수, 상태 관리, 주문 항목, 파일 관리 작업 시 사용합니다.
---

# 주문 관리 스킬

인쇄업 ERP의 주문 관리 및 처리 흐름입니다.

## 주문 상태 흐름

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           주문 상태 흐름도                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│   │ 접수대기  │ → │ 접수완료  │ → │ 생산진행  │ → │ 배송준비  │        │
│   └──────────┘    └──────────┘    └────┬─────┘    └────┬─────┘        │
│        │               │               │               │              │
│        │               │               ▼               ▼              │
│        │               │         ┌──────────┐    ┌──────────┐        │
│        │               │         │ 후가공대기 │    │ 배송완료  │        │
│        │               │         └────┬─────┘    └──────────┘        │
│        │               │               │                              │
│        │               │               ▼                              │
│        │               │         ┌──────────┐                         │
│        │               │         │ 제본대기  │                         │
│        │               │         └────┬─────┘                         │
│        │               │               │                              │
│        │               │               ▼                              │
│        │               │         ┌──────────┐                         │
│        │               │         │ 검수대기  │                         │
│        │               │         └──────────┘                         │
│        │               │                                              │
│        ▼               ▼                                              │
│   ┌──────────┐    ┌──────────┐                                       │
│   │ 주문취소  │    │ 보류     │                                        │
│   └──────────┘    └──────────┘                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 주문 상태 정의

| 상태 | 코드 | 설명 | 다음 가능 상태 |
|------|------|------|----------------|
| 접수대기 | PENDING | 주문 접수 전 | 접수완료, 주문취소 |
| 접수완료 | RECEIVED | 주문 확인됨 | 생산진행, 보류, 주문취소 |
| 생산진행 | IN_PRODUCTION | 인쇄 작업 중 | 후가공대기, 배송준비 |
| 후가공대기 | POST_PROCESSING | 코팅/박 등 후가공 | 제본대기 |
| 제본대기 | BINDING | 제본 작업 대기 | 검수대기 |
| 검수대기 | QC_PENDING | 품질 검수 대기 | 배송준비 |
| 배송준비 | READY_TO_SHIP | 출고 준비 완료 | 배송완료 |
| 배송완료 | DELIVERED | 배송 완료 | - |
| 보류 | ON_HOLD | 일시 보류 | 접수완료 |
| 주문취소 | CANCELLED | 주문 취소됨 | - |

## 데이터베이스 스키마

### Enum 정의

```prisma
enum OrderStatus {
  PENDING           // 접수대기
  RECEIVED          // 접수완료
  IN_PRODUCTION     // 생산진행
  POST_PROCESSING   // 후가공대기
  BINDING           // 제본대기
  QC_PENDING        // 검수대기
  READY_TO_SHIP     // 배송준비
  DELIVERED         // 배송완료
  ON_HOLD           // 보류
  CANCELLED         // 주문취소
}

enum PaymentStatus {
  UNPAID            // 미결제
  PARTIAL           // 부분결제
  PAID              // 결제완료
  REFUNDED          // 환불
}

enum PaymentMethod {
  CASH              // 현금
  CARD              // 카드
  TRANSFER          // 계좌이체
  CREDIT            // 외상
}
```

### 주문 모델

```prisma
model Order {
  id              String        @id @default(cuid())
  orderNo         String        @unique    // 주문번호 (ORD-2024-001234)

  // 거래처
  clientId        String
  client          Client        @relation(fields: [clientId], references: [id])

  // 상태
  status          OrderStatus   @default(PENDING)
  paymentStatus   PaymentStatus @default(UNPAID)

  // 주문 정보
  orderDate       DateTime      @default(now())
  dueDate         DateTime?                // 납기일
  deliveryDate    DateTime?                // 배송일

  // 주문 항목
  items           OrderItem[]

  // 금액
  subtotal        Decimal       @db.Decimal(12, 2)  // 공급가액
  discount        Decimal       @default(0) @db.Decimal(10, 2)  // 할인
  tax             Decimal       @db.Decimal(10, 2)  // 부가세
  total           Decimal       @db.Decimal(12, 2)  // 총액

  // 결제
  paymentMethod   PaymentMethod?
  paidAmount      Decimal       @default(0) @db.Decimal(12, 2)

  // 배송
  shippingAddress String?
  shippingMemo    String?

  // 파일
  files           OrderFile[]

  // 메모
  customerMemo    String?       // 고객 메모
  internalMemo    String?       // 내부 메모

  // 담당자
  assignedTo      String?
  createdBy       String

  // 상태 이력
  statusHistory   OrderStatusHistory[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([clientId])
  @@index([status])
  @@index([orderDate])
  @@map("orders")
}
```

### 주문 항목 모델

```prisma
model OrderItem {
  id              String      @id @default(cuid())
  orderId         String
  order           Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)

  // 상품 정보
  productId       String?
  product         Product?    @relation(fields: [productId], references: [id])
  productName     String                  // 상품명 (스냅샷)
  productCode     String?                 // 상품코드

  // 옵션
  spec            String                  // 규격
  pages           Int?                    // 페이지수
  bindingType     String?                 // 제본방식
  paperType       String?                 // 용지
  coverType       String?                 // 표지
  coating         String?                 // 코팅
  options         Json?                   // 기타 옵션 (JSON)

  // 수량/가격
  quantity        Int
  unitPrice       Decimal     @db.Decimal(10, 2)
  amount          Decimal     @db.Decimal(12, 2)

  // 상태
  itemStatus      OrderStatus @default(PENDING)

  // 파일
  files           OrderFile[]

  sortOrder       Int         @default(0)

  @@map("order_items")
}
```

### 주문 파일 모델

```prisma
model OrderFile {
  id              String      @id @default(cuid())
  orderId         String
  order           Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderItemId     String?
  orderItem       OrderItem?  @relation(fields: [orderItemId], references: [id])

  // 파일 정보
  fileName        String
  originalName    String
  fileSize        Int
  mimeType        String
  filePath        String                  // S3 경로 또는 로컬 경로

  // 구분
  fileType        FileType    @default(PRINT_FILE)

  uploadedAt      DateTime    @default(now())
  uploadedBy      String

  @@map("order_files")
}

enum FileType {
  PRINT_FILE      // 인쇄 파일
  PROOF           // 교정쇄
  REFERENCE       // 참고 파일
  DELIVERY_SLIP   // 배송장
}
```

### 상태 이력 모델

```prisma
model OrderStatusHistory {
  id              String      @id @default(cuid())
  orderId         String
  order           Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)

  fromStatus      OrderStatus?
  toStatus        OrderStatus
  changedBy       String
  changedAt       DateTime    @default(now())
  reason          String?                 // 변경 사유

  @@map("order_status_history")
}
```

## API 엔드포인트

```
# 주문
POST   /api/v1/orders                    # 주문 생성
GET    /api/v1/orders                    # 주문 목록 (필터링, 페이징)
GET    /api/v1/orders/:id                # 주문 상세
PUT    /api/v1/orders/:id                # 주문 수정
DELETE /api/v1/orders/:id                # 주문 삭제

# 상태 관리
PATCH  /api/v1/orders/:id/status         # 상태 변경
GET    /api/v1/orders/:id/history        # 상태 이력

# 주문 항목
POST   /api/v1/orders/:id/items          # 항목 추가
PUT    /api/v1/orders/:id/items/:itemId  # 항목 수정
DELETE /api/v1/orders/:id/items/:itemId  # 항목 삭제

# 파일
POST   /api/v1/orders/:id/files          # 파일 업로드
GET    /api/v1/orders/:id/files          # 파일 목록
DELETE /api/v1/orders/:id/files/:fileId  # 파일 삭제

# 결제
PATCH  /api/v1/orders/:id/payment        # 결제 처리

# 검색/필터
GET    /api/v1/orders/search             # 주문 검색
GET    /api/v1/orders/by-status/:status  # 상태별 조회
GET    /api/v1/orders/by-client/:clientId  # 거래처별 조회
```

## 주문번호 생성 규칙

```typescript
// 주문번호 형식: ORD-YYYY-NNNNNN
// 예: ORD-2024-000001

function generateOrderNo(): string {
  const year = new Date().getFullYear();
  const sequence = getNextSequence(year); // DB에서 시퀀스 조회
  return `ORD-${year}-${sequence.toString().padStart(6, '0')}`;
}
```

## 상태 변경 로직

```typescript
// 상태 전이 규칙
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['IN_PRODUCTION', 'ON_HOLD', 'CANCELLED'],
  IN_PRODUCTION: ['POST_PROCESSING', 'READY_TO_SHIP'],
  POST_PROCESSING: ['BINDING'],
  BINDING: ['QC_PENDING'],
  QC_PENDING: ['READY_TO_SHIP'],
  READY_TO_SHIP: ['DELIVERED'],
  DELIVERED: [],
  ON_HOLD: ['RECEIVED'],
  CANCELLED: [],
};

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

async function changeOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userId: string,
  reason?: string
): Promise<Order> {
  const order = await findOrder(orderId);

  if (!canTransition(order.status, newStatus)) {
    throw new BadRequestException(
      `${order.status}에서 ${newStatus}로 변경할 수 없습니다.`
    );
  }

  // 상태 변경 + 이력 기록
  return prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        changedBy: userId,
        reason,
      },
    }),
  ]);
}
```

## 접수 마감 일정

```prisma
model ReceptionSchedule {
  id              String      @id @default(cuid())

  // 요일별 마감 시간
  dayOfWeek       Int                     // 0: 일, 1: 월, ..., 6: 토
  cutoffTime      String                  // "18:00"
  isWorkday       Boolean     @default(true)

  // 특정 날짜 예외
  exceptionDate   DateTime?               // 공휴일 등
  exceptionReason String?

  @@map("reception_schedules")
}
```

## 프론트엔드 구조

### 주문 목록 페이지

```
┌─────────────────────────────────────────────────────────────────┐
│ 주문관리                                         [+ 신규주문]    │
├─────────────────────────────────────────────────────────────────┤
│ [전체] [접수대기:12] [접수완료:8] [생산진행:5] [배송준비:3]      │
├─────────────────────────────────────────────────────────────────┤
│ 검색: [_______________] 기간: [시작일] ~ [종료일] [검색]        │
├─────────────────────────────────────────────────────────────────┤
│ ┌────┬──────────┬────────┬────────┬────────┬────────┬────────┐ │
│ │ □  │ 주문번호  │ 거래처  │ 상품    │ 금액    │ 상태    │ 주문일 │ │
│ ├────┼──────────┼────────┼────────┼────────┼────────┼────────┤ │
│ │ □  │ORD-2024- │ A사진관 │ 압축앨범 │ 50,000 │ 접수대기 │ 12/28  │ │
│ │ □  │ORD-2024- │ B스튜디오│ 포토북  │120,000 │ 생산진행 │ 12/27  │ │
│ └────┴──────────┴────────┴────────┴────────┴────────┴────────┘ │
│                                                                 │
│ [<] [1] [2] [3] ... [10] [>]        선택: 2건 [상태변경] [삭제] │
└─────────────────────────────────────────────────────────────────┘
```

## 체크리스트

주문 관리 기능 구현 시 확인사항:

- [ ] 주문 CRUD API
- [ ] 주문번호 자동 생성
- [ ] 상태 전이 규칙 적용
- [ ] 상태 변경 이력 기록
- [ ] 주문 항목 관리
- [ ] 파일 업로드 (S3)
- [ ] 결제 상태 관리
- [ ] 주문 목록 필터링/검색
- [ ] 상태별 주문 카운트 표시
- [ ] 접수 마감 일정 관리
