---
name: delivery
description: 배송 관리. 배송 준비, 출고, 택배 연동, 배송 추적 작업 시 사용합니다.
---

# 배송 관리 스킬

인쇄업 ERP의 배송 관리입니다.

## 배송 흐름

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           배송 처리 흐름                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│   │ 검수완료  │ → │ 포장대기  │ → │  포장    │ → │ 출고대기  │        │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘        │
│                                                       │              │
│                        ┌──────────────────────────────┘              │
│                        │                                             │
│                        ▼                                             │
│   ┌──────────────────────────────────────────────────────┐           │
│   │                   배송 방법 선택                      │           │
│   ├──────────────────────────────────────────────────────┤           │
│   │                                                      │           │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐         │           │
│   │   │   택배   │  │   퀵서비스 │  │  직접수령 │         │           │
│   │   └────┬─────┘  └────┬─────┘  └────┬─────┘         │           │
│   │        │             │             │               │           │
│   │        ▼             ▼             ▼               │           │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐         │           │
│   │   │ 송장발행  │  │ 배차요청  │  │ 수령대기  │         │           │
│   │   └────┬─────┘  └────┬─────┘  └────┬─────┘         │           │
│   │        │             │             │               │           │
│   └────────┼─────────────┼─────────────┼───────────────┘           │
│            │             │             │                           │
│            ▼             ▼             ▼                           │
│       ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│       │  배송중   │  │  배송중   │  │  수령완료 │                     │
│       └────┬─────┘  └────┬─────┘  └──────────┘                     │
│            │             │                                         │
│            ▼             ▼                                         │
│       ┌──────────────────────┐                                     │
│       │      배송완료        │                                      │
│       └──────────────────────┘                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 주문 시 배송정보 입력 (파일업로드)

파일업로드(앨범주문) 시 폴더(원판)별로 배송정보를 입력한다.

### 배송정보 구조

배송정보는 **발송지**와 **배송지**를 구분하여 입력한다.

| 구분 | 선택지 | 설명 |
|------|--------|------|
| **발송지** | 포토미(제작회사) | 회사 기초정보에서 자동 로드 |
| | 회원정보(스튜디오) | 로그인한 거래처(주문자) 정보 |
| **배송지** | 회원정보(스튜디오) | 로그인한 거래처(주문자) 주소 |
| | 앨범고객(신랑/신부) | 직접 입력 (수령인, 연락처, 주소) |

### 권수별 개별배송

- 원판이 N권(부수)인 경우, 권수만큼 배송정보를 추가 입력할 수 있다
- 예: 2부 주문 → 1부는 스튜디오, 1부는 신랑 집으로 각각 배송
- 추가 배송정보는 폴더카드 내에서 [+배송추가] 버튼으로 추가

### 배송 방법 (4가지)

| 방법 | 코드 | 설명 | 배송비 |
|------|------|------|--------|
| **택배** | parcel | CJ대한통운, 롯데택배 등 | 기초정보설정 > 배송비 기준 |
| **오토바이퀵** | motorcycle | 오토바이 퀵서비스 | 기초정보설정 > 배송비 기준 |
| **화물** | freight | 화물 배송 | 기초정보설정 > 배송비 기준 |
| **방문수령** | pickup | 고객 직접 방문 수령 | 무료 |

### 배송비 산출 기준

- 배송금액은 **기초정보설정(시스템설정) > 배송비** 에 등록된 금액을 기준으로 고객에게 청구
- 배송방법별 기본요금을 `DeliveryPricing` 테이블에서 조회
- 방문수령은 항상 무료
- 거래처별 배송비 정책(무료배송, 조건부무료, 착불 등) 적용 가능

### 프론트엔드 구현 파일

| 파일 | 설명 |
|------|------|
| `components/album-upload/folder-card.tsx` | 폴더카드 - 배송정보 Collapsible 섹션 |
| `components/album-upload/folder-shipping-section.tsx` | 발송지/배송지/배송방법 입력 UI |
| `components/album-upload/multi-folder-upload.tsx` | 일괄 배송설정 패널 |
| `components/address-search.tsx` | 다음 주소검색 (인라인 embed 지원) |
| `hooks/use-shipping-data.ts` | 회사정보/거래처정보/배송비 로드 |
| `hooks/use-delivery-pricing.ts` | 배송비 단가 조회 |
| `stores/multi-folder-upload-store.ts` | FolderShippingInfo 상태관리 |

### 배송정보 데이터 구조 (FolderShippingInfo)

```typescript
interface FolderShippingInfo {
  // 발송지
  senderType: 'company' | 'orderer';       // 포토미(회사) / 주문자(스튜디오)
  senderName: string;
  senderPhone: string;
  senderPostalCode: string;
  senderAddress: string;
  senderAddressDetail: string;

  // 배송지
  receiverType: 'orderer' | 'direct_customer'; // 스튜디오 / 앨범고객(신랑/신부)
  recipientName: string;
  recipientPhone: string;
  recipientPostalCode: string;
  recipientAddress: string;
  recipientAddressDetail: string;

  // 배송방법
  deliveryMethod: 'parcel' | 'motorcycle' | 'freight' | 'pickup';
  deliveryFee: number;
  deliveryFeeType: string;
}
```

## 배송 방법 (출고/운영)

| 방법 | 설명 | 비용 부담 |
|------|------|-----------|
| **택배** | CJ대한통운, 롯데택배 등 | 착불/선불 |
| **퀵서비스** | 오토바이/다마스 | 착불/선불 |
| **직접수령** | 고객 방문 수령 | 무료 |
| **자체배송** | 자사 배송 차량 | 무료/유료 |

## 데이터베이스 스키마

### Enum 정의

```prisma
enum DeliveryStatus {
  PENDING           // 배송대기
  PACKAGING         // 포장중
  READY             // 출고대기
  SHIPPED           // 배송중
  DELIVERED         // 배송완료
  RETURNED          // 반송
  PICKUP_WAITING    // 수령대기
  PICKED_UP         // 수령완료
}

enum DeliveryMethod {
  PARCEL            // 택배
  QUICK             // 퀵서비스
  SELF_PICKUP       // 직접수령
  OWN_DELIVERY      // 자체배송
}

enum PaymentType {
  PREPAID           // 선불
  COD               // 착불 (Cash on Delivery)
  FREE              // 무료
}
```

### 배송 모델

```prisma
model Delivery {
  id              String          @id @default(cuid())

  // 주문 연결
  orderId         String
  order           Order           @relation(fields: [orderId], references: [id])

  // 배송 정보
  deliveryNo      String          @unique   // 배송번호
  method          DeliveryMethod            // 배송 방법
  status          DeliveryStatus  @default(PENDING)

  // 수령인 정보
  recipientName   String                    // 수령인
  recipientPhone  String                    // 연락처
  recipientPhone2 String?                   // 연락처2

  // 배송지
  zipCode         String?
  address         String                    // 기본 주소
  addressDetail   String?                   // 상세 주소

  // 택배 정보
  carrierId       String?                   // 택배사 ID
  carrier         Carrier?        @relation(fields: [carrierId], references: [id])
  trackingNo      String?                   // 송장번호
  trackingUrl     String?                   // 배송조회 URL

  // 비용
  shippingFee     Decimal         @default(0) @db.Decimal(10, 2)
  paymentType     PaymentType     @default(PREPAID)

  // 일정
  requestedDate   DateTime?                 // 희망 배송일
  shippedAt       DateTime?                 // 발송일시
  deliveredAt     DateTime?                 // 배송완료일시

  // 메모
  memo            String?                   // 배송 메모
  deliveryMemo    String?                   // 기사님께 메모

  // 이력
  history         DeliveryHistory[]

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  createdBy       String

  @@index([orderId])
  @@index([status])
  @@index([trackingNo])
  @@map("deliveries")
}
```

### 택배사 모델

```prisma
model Carrier {
  id              String      @id @default(cuid())
  name            String                    // 택배사명
  code            String      @unique       // 택배사 코드

  // API 연동 정보
  apiUrl          String?                   // API URL
  trackingUrlTemplate String?               // 조회 URL 템플릿

  // 요금
  basePrice       Decimal     @db.Decimal(10, 2)  // 기본 요금
  additionalPrice Decimal     @db.Decimal(10, 2)  // 추가 요금 (kg당)

  // 정산
  accountNo       String?                   // 계약 계정번호

  isActive        Boolean     @default(true)
  deliveries      Delivery[]

  @@map("carriers")
}
```

### 배송 이력 모델

```prisma
model DeliveryHistory {
  id              String          @id @default(cuid())
  deliveryId      String
  delivery        Delivery        @relation(fields: [deliveryId], references: [id], onDelete: Cascade)

  fromStatus      DeliveryStatus?
  toStatus        DeliveryStatus
  location        String?                   // 위치 정보
  description     String?                   // 상세 내용
  changedBy       String
  changedAt       DateTime        @default(now())

  @@map("delivery_history")
}
```

## 택배사 연동

### 지원 택배사

| 택배사 | 코드 | API 연동 | 송장 출력 |
|--------|------|:--------:|:--------:|
| CJ대한통운 | CJ | ✓ | ✓ |
| 롯데택배 | LOTTE | ✓ | ✓ |
| 한진택배 | HANJIN | ✓ | ✓ |
| 로젠택배 | LOGEN | ✓ | ✓ |
| 우체국택배 | EPOST | ✓ | ✓ |

### 송장번호 발급

```typescript
interface TrackingRequest {
  carrierId: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  productName: string;
  quantity: number;
  weight?: number;
}

async function requestTrackingNumber(params: TrackingRequest): Promise<string> {
  const carrier = await prisma.carrier.findUnique({
    where: { id: params.carrierId },
  });

  // 택배사 API 호출
  const response = await callCarrierAPI(carrier, params);

  return response.trackingNo;
}
```

### 배송 추적

```typescript
interface TrackingInfo {
  trackingNo: string;
  carrier: string;
  status: string;
  currentLocation: string;
  history: {
    time: DateTime;
    location: string;
    status: string;
    description: string;
  }[];
}

async function getTrackingInfo(deliveryId: string): Promise<TrackingInfo> {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { carrier: true },
  });

  if (!delivery.trackingNo) {
    throw new BadRequestException('송장번호가 없습니다.');
  }

  // 택배사 API 호출하여 배송 조회
  const trackingInfo = await callTrackingAPI(
    delivery.carrier,
    delivery.trackingNo
  );

  return trackingInfo;
}
```

## 송장 출력

```typescript
// 송장 출력 데이터
interface ShippingLabel {
  // 발송인
  senderName: string;
  senderPhone: string;
  senderZipCode: string;
  senderAddress: string;

  // 수령인
  recipientName: string;
  recipientPhone: string;
  recipientZipCode: string;
  recipientAddress: string;

  // 상품 정보
  productName: string;
  quantity: number;

  // 송장번호
  trackingNo: string;
  barcode: string;

  // 메모
  memo?: string;
}

async function printShippingLabel(deliveryId: string): Promise<Buffer> {
  const delivery = await getDeliveryWithDetails(deliveryId);

  const labelData: ShippingLabel = {
    senderName: 'PHOTOME 포토미',
    senderPhone: '02-1234-5678',
    senderZipCode: '12345',
    senderAddress: '서울시 강남구 테헤란로 123',
    recipientName: delivery.recipientName,
    recipientPhone: delivery.recipientPhone,
    recipientZipCode: delivery.zipCode,
    recipientAddress: `${delivery.address} ${delivery.addressDetail}`,
    productName: delivery.order.items[0].productName,
    quantity: delivery.order.items.length,
    trackingNo: delivery.trackingNo,
    barcode: generateBarcode(delivery.trackingNo),
    memo: delivery.deliveryMemo,
  };

  return generateLabelPDF(labelData);
}
```

## API 엔드포인트

```
# 배송
GET    /api/v1/deliveries                      # 배송 목록
GET    /api/v1/deliveries/:id                  # 배송 상세
POST   /api/v1/deliveries                      # 배송 생성
PUT    /api/v1/deliveries/:id                  # 배송 수정
PATCH  /api/v1/deliveries/:id/status           # 상태 변경

# 송장
POST   /api/v1/deliveries/:id/tracking         # 송장번호 발급
GET    /api/v1/deliveries/:id/tracking         # 배송 조회
POST   /api/v1/deliveries/:id/label            # 송장 출력

# 택배사
GET    /api/v1/carriers                        # 택배사 목록
GET    /api/v1/carriers/:id                    # 택배사 상세

# 대량 처리
POST   /api/v1/deliveries/bulk-ship            # 대량 발송
POST   /api/v1/deliveries/bulk-label           # 대량 송장 출력

# 주소
GET    /api/v1/address/search                  # 주소 검색 (다음 API)
```

## 배송비 계산

```typescript
interface ShippingFeeParams {
  method: DeliveryMethod;
  carrierId?: string;
  weight?: number;        // kg
  boxCount?: number;      // 박스 수
  zipCode: string;
  isIsland?: boolean;     // 도서산간
}

async function calculateShippingFee(params: ShippingFeeParams): Promise<number> {
  const { method, carrierId, weight, boxCount, zipCode, isIsland } = params;

  // 직접수령은 무료
  if (method === 'SELF_PICKUP') {
    return 0;
  }

  // 퀵서비스
  if (method === 'QUICK') {
    return calculateQuickServiceFee(zipCode);
  }

  // 택배
  const carrier = await prisma.carrier.findUnique({
    where: { id: carrierId },
  });

  let fee = carrier.basePrice;

  // 무게 추가 요금
  if (weight && weight > 2) {
    fee += (weight - 2) * carrier.additionalPrice;
  }

  // 박스 추가
  if (boxCount && boxCount > 1) {
    fee += (boxCount - 1) * carrier.basePrice;
  }

  // 도서산간 추가
  if (isIsland) {
    fee += 3000;
  }

  return fee;
}
```

## 프론트엔드 - 배송 관리 UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 배송관리                                              [대량발송] [엑셀]   │
├─────────────────────────────────────────────────────────────────────────┤
│ [전체] [배송대기:15] [배송중:8] [배송완료:42]                             │
├─────────────────────────────────────────────────────────────────────────┤
│ 검색: [_______________]  택배사: [전체 ▼]  기간: [___] ~ [___]          │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌────┬──────────┬────────┬──────────┬────────┬────────┬────────┬────┐ │
│ │ □  │ 주문번호  │ 수령인  │ 연락처    │ 택배사  │ 송장번호 │  상태   │ 출력│ │
│ ├────┼──────────┼────────┼──────────┼────────┼────────┼────────┼────┤ │
│ │ □  │ORD-001   │ 김고객  │010-1234- │ CJ대한 │12345678│ 배송중  │ 📄 │ │
│ │ □  │ORD-002   │ 이고객  │010-2345- │   -    │   -    │ 대기    │  -  │ │
│ │ □  │ORD-003   │ 박고객  │010-3456- │ 롯데   │87654321│ 배송완료 │ 📄 │ │
│ └────┴──────────┴────────┴──────────┴────────┴────────┴────────┴────┘ │
│                                                                         │
│ 선택: 2건  [송장발급] [송장출력] [배송완료처리]                            │
└─────────────────────────────────────────────────────────────────────────┘
```

## 체크리스트

배송 관리 기능 구현 시 확인사항:

- [ ] 배송 CRUD
- [ ] 배송 방법 선택 (택배/퀵/직접수령)
- [ ] 택배사 연동
  - [ ] 송장번호 발급 API
  - [ ] 배송 조회 API
- [ ] 송장 출력 (PDF)
- [ ] 대량 발송 처리
- [ ] 배송비 계산
- [ ] 주소 검색 (다음 주소 API)
- [ ] 배송 상태 자동 업데이트
- [ ] 배송 알림 (SMS/카카오)
- [ ] 도서산간 지역 처리
