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

#### 배송방법 역할 구분 (현재 정책)

| 배송방법 | 고객 주문 화면 선택 | 내부(관리자) 사용 | 비고 |
|----------|:-----------------:|:---------------:|------|
| `parcel` (택배) | ✓ 기본 선택 | ✓ | **거래처 배송정책(conditional/free/prepaid/cod) 적용 대상** |
| `motorcycle` (오토바이퀵) | ✓ | ✓ | 고객이 직접 선택 가능. **거래처 배송정책 미적용. 항상 `baseFee` 청구** |
| `damas` (다마스) | ✗ 관리자 전용 | ✓ | 고객 주문 UI 미노출. 관리자 배송비 설정 및 내부 처리에만 사용. **거래처 배송정책 미적용** |
| `freight` (화물) | ✓ | ✓ | 고객이 직접 선택 가능. **거래처 배송정책 미적용. 항상 `baseFee` 청구** |
| `pickup` (방문수령) | ✓ | ✓ | 항상 무료 |

> **damas 특이사항**: `use-delivery-pricing.ts`와 `delivery-settings-content.tsx`(관리자)에는 포함되어 있으나,
> 고객 주문 폼(`folder-shipping-section.tsx`)의 `DELIVERY_METHOD_OPTIONS`에는 미포함.
> `FolderDeliveryMethod` 타입: `'parcel' | 'motorcycle' | 'freight' | 'pickup'` (damas 없음)

### 배송비 산출 기준

- 배송금액은 **기초정보설정(시스템설정) > 배송비** 에 등록된 금액을 기준으로 고객에게 청구
- 배송방법별 기본요금을 `DeliveryPricing` 테이블에서 조회
- 방문수령은 항상 무료
- 거래처별 배송비 정책(무료배송, 조건부무료, 착불 등) 적용 가능

### 거래처별 배송비 정책 (shippingType)

`Client` 모델의 `shippingType` 필드로 거래처별 정책을 관리한다. 기본값: `conditional`, 기준금액 기본값: `90,000원`

| 타입 코드 | 이름 | 동작 |
|-----------|------|------|
| `conditional` | 조건부택배 | 기준금액(`freeShippingThreshold`) 이상이면 무료, 미만이면 기본 배송비 청구 |
| `free` | 무료택배 | 항상 무료 |
| `prepaid` | 직배송(선불) | 항상 기본 배송비 청구 |
| `cod` | 착불 | 주문 시 0원, 배송사가 수령인에게 직접 징수 |

> ⚠️ **배송비 정책(`conditional`/`free`)은 택배(`parcel`)에만 적용됩니다.**
> 오토바이퀵(`motorcycle`), 화물(`freight`) 등은 거래처 `shippingType`에 관계없이 항상 `DeliveryPricing.baseFee`를 청구합니다.

#### 배송비 계산 흐름

```
배송방법 == pickup(방문수령)?
  └─ YES → 0원

배송방법 != parcel(택배)?  ← motorcycle / freight 등
  └─ YES → DeliveryPricing[method].baseFee 그대로 청구 (거래처 정책 미적용)
       ├─ motorcycle → motorcycle.baseFee
       └─ freight   → freight.baseFee

(이하는 parcel 전용 로직)

receiverType == direct_customer(고객직배송)?
  └─ YES → DeliveryPricing['parcel'].baseFee 그대로 청구 (정책 미적용)

shippingType == 'free'?
  └─ YES → 0원

shippingType == 'conditional'?
  └─ 당일 누적 합산 + 현재 >= freeShippingThreshold?
       ├─ YES → 0원 (이전 주문 배송비 환급도 처리)
       └─ NO  → DeliveryPricing['parcel'].baseFee 청구

shippingType == 'prepaid'?
  └─ DeliveryPricing['parcel'].baseFee 항상 청구

shippingType == 'cod'?
  └─ 주문 시 0원 (배송사 수령인 징수)
```

#### 당일 합배송 (조건부택배 핵심 기능)

- 조건부택배(`conditional`) 거래처 전용
- 당일(00:00~23:59) 누적 주문 합산으로 기준금액 충족 여부 판단
- 기준금액 충족 시: 현재 주문 배송비 0원 + 이전 주문 배송비 자동 환급(`adjustmentAmount`)
- `receiverType: 'direct_customer'` 주문은 합산에서 **제외**
- 중복 환급 방지: `adjustmentAmount` 필드로 이미 환급된 금액 추적
- **기준금액 우선순위**: `Client.freeShippingThreshold` → `DeliveryPricing['parcel'].freeThreshold` → 90,000원(기본값)

**예시:**
> 기준금액 90,000원 거래처
> 1차 주문 60,000원 → 배송비 3,500원 청구
> 2차 주문 40,000원 → 합산 100,000원 ≥ 90,000원
> → 2차 주문 배송비 0원 + 1차 배송비 3,500원 자동 환급

#### 합배송 조정금액(adjustmentAmount) 메커니즘 상세

**adjustmentAmount 의미**: 양수 = 할인(환급). 주문 최종금액에서 차감.

```
finalAmount = totalAmount(상품+세금+배송비) - adjustmentAmount
```

**환급 처리 흐름** (프론트엔드 주도 방식):

1. 주문 페이지 진입 시 `GET /orders/same-day-shipping?clientId=...` 호출
2. 백엔드 `getSameDayShipping()` → 당일 이전 주문의 배송비 합계(`totalShippingCharged`) 반환
3. 프론트엔드 `combinedShipping` useMemo에서 조건 판단:
   - `combinedTotal(당일누적+현재카트) >= freeShippingThreshold` → `isTriggered = true`
   - `shouldRefundPrevious = isTriggered && totalShippingCharged > 0`
4. 주문 생성 DTO에 직접 포함 (`apps/web/app/(shop)/order/page.tsx:652`):
   ```js
   od.adjustmentAmount = combinedShipping.totalShippingCharged; // 이전 배송비 합계
   ```
5. 백엔드 `createOrder()` → `dto.adjustmentAmount ?? 0` 그대로 DB 저장

**⚠️ process_history에 `admin_adjustment` 이력이 생성되지 않음**
→ 주문 생성 시 DTO에 이미 포함된 값이므로 `order_created` 이력만 기록됨
→ 관리자가 수동 조정한 경우만 `admin_adjustment` 이력 생성됨

**실제 사례 (260221 주문, 아마레스튜디오):**

| 주문번호 | 배송비 | 조정금액 | 최종금액 |
|---------|--------|---------|---------|
| 260221-001~005 | 5,500 × 5건 | 0 | 각 정상 |
| **260221-006** | **0** | **27,500** | **-6,600** |

→ 27,500 = 5,500원 × 5건 (이전 5개 주문 배송비 합계)
→ 19,000 + 1,900(세금) - 27,500 = **-6,600원** (마이너스 = 선 환급)

**중복 환급 방지** (`getSameDayShipping()` 내):
```
netShippingCharged = max(0, totalShippingCharged - totalAdjustmentApplied)
```
이미 다른 주문에서 adjustmentAmount로 환급된 금액을 차감하여 중복 공제 방지.

**관련 함수**:
- `getSameDayShipping()` - API: `GET /orders/same-day-shipping`
- 실제 환급은 프론트 `order/page.tsx`에서 DTO에 담아 주문 생성 시 처리
- **Race condition 방어**: `create()` 트랜잭션 내부에서 당일 기적용 환급 누계를 재조회하여 초과 환급 차단

#### 배치 배송 (단일 주문 내 복수 아이템)

```
조건부택배 + 동일 주문 내 스튜디오 배송 아이템 2건 이상 + 합계 < 기준금액
→ 첫 번째 스튜디오(orderer) 배송 아이템 배송비만 1회 청구
→ direct_customer 아이템은 배치 대상 제외 (항상 별도 청구)
```

#### 배송비 적용 우선순위 (order/page.tsx effectiveShippingFee)

```
1순위: combinedShipping.isTriggered (당일합배송 기준금액 충족)
  → effectiveShippingFee = 0원

2순위: batchSingleShipping (복수 아이템 배치배송)
  → effectiveShippingFee = 첫 번째 스튜디오 아이템 배송비만

3순위: 기본
  → effectiveShippingFee = totalShippingFee (아이템별 합산)
```

> 당일합배송이 배치배송보다 **항상 우선** 적용된다.
> 당일합배송이 발동하면 배치배송 여부와 무관하게 최종 배송비는 0원.

#### 관련 구현 파일

| 파일 | 역할 |
|------|------|
| `apps/api/src/modules/order/services/order.service.ts` | `getSameDayShipping()`, `create()` 내 Race condition 방어 로직 |
| `apps/web/components/album-upload/folder-shipping-section.tsx` | `calculateDeliveryFee()` 함수 - 타입별 배송비 계산 |
| `apps/web/app/(shop)/order/page.tsx` | `combinedShipping`, `batchSingleShipping` useMemo |
| `apps/web/app/(dashboard)/company/members/page.tsx` | 관리자 배송조건 설정 UI |
| `apps/api/prisma/schema.prisma` | `Client.shippingType`, `Client.freeShippingThreshold` |

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

### 실제 사용 코드값 (Enum 없이 String으로 관리)

> ⚠️ Prisma schema에 `DeliveryMethod`, `DeliveryStatus`, `PaymentType` **Enum 타입은 정의되어 있지 않습니다**.
> 해당 필드들은 모두 `String` 타입으로 아래 문자열 값을 직접 사용합니다.
>
> ✅ **`DeliveryPricing` 모델 자체는 schema.prisma에 완전히 구현되어 있습니다** (baseFee, distanceRanges, sizeRanges, islandFee, freeThreshold 등 포함).

```typescript
// 배송방법 코드 (DeliveryPricing.deliveryMethod, OrderItemShipping.deliveryMethod)
type DeliveryMethodCode = 'parcel' | 'motorcycle' | 'damas' | 'freight' | 'pickup';

// 배송 상태 관련 코드 (String 필드에서 사용되는 값)
const DELIVERY_STATUS_VALUES = {
  PENDING:        'pending',         // 배송대기
  PACKAGING:      'packaging',       // 포장중
  READY:          'ready',           // 출고대기
  SHIPPED:        'shipped',         // 배송중
  DELIVERED:      'delivered',       // 배송완료
  RETURNED:       'returned',        // 반송
  PICKUP_WAITING: 'pickup_waiting',  // 수령대기
  PICKED_UP:      'picked_up',       // 수령완료
};
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

  // ⚠️ 아래 발송인 정보는 placeholder — 실제 구현 시 SystemSettings 또는 회사 기초정보에서 동적으로 로드해야 함
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

## 배송비 계산 (실제 구현)

실제 배송비 계산은 `apps/web/components/album-upload/folder-shipping-section.tsx`의
`calculateDeliveryFee()` 함수에서 처리됩니다.

```typescript
// 파라미터
// - method: 'parcel' | 'motorcycle' | 'freight' | 'pickup'
// - recvType: 'orderer'(스튜디오) | 'direct_customer'(신랑/신부 등)
// - studioTotal: 현재 카트(폴더)의 스튜디오 배송 아이템 합계 (당일 누적 아님)
// - clientInfo.shippingType: 거래처 배송 정책
// - pricingMap: DeliveryPricing 테이블 데이터

function calculateDeliveryFee(method, recvType) {
  // 1. 방문수령: 항상 무료
  if (method === 'pickup') return { fee: 0, feeType: 'free' };

  // 2. 스튜디오(주문자) 배송
  if (recvType === 'orderer') {
    // ⚠️ 택배(parcel)가 아닌 경우: 거래처 배송정책 미적용, baseFee 그대로 청구
    // 오토바이퀵(motorcycle), 화물(freight) 등은 conditional/free 정책 대상 아님
    if (method !== 'parcel') {
      return { fee: pricingMap[method]?.baseFee ?? 0, feeType: 'standard' };
    }

    // 이하 택배(parcel) 전용 정책 로직
    // 기준금액 우선순위: Client → DeliveryPricing['parcel'].freeThreshold → 90,000원
    const freeThreshold = clientInfo?.freeShippingThreshold
      ?? (pricingMap['parcel']?.freeThreshold != null ? Number(pricingMap['parcel'].freeThreshold) : 90000);

    if (shippingType === 'free')
      return { fee: 0, feeType: 'free' };

    if (shippingType === 'conditional') {
      // studioTotal이 기준금액 이상이면 무료
      if (studioTotal >= freeThreshold) return { fee: 0, feeType: 'free' };
      return { fee: pricingMap['parcel'].baseFee, feeType: 'conditional' };
    }

    if (shippingType === 'prepaid')
      return { fee: pricingMap['parcel'].baseFee, feeType: 'standard' };

    // cod (착불): 주문 시 0원, 배송사가 수령인에게 직접 징수
    return { fee: 0, feeType: 'free' };
  }

  // 3. 고객직배송 (신랑/신부 등): 거래처 정책 미적용, 배송방법별 baseFee 그대로
  return { fee: pricingMap[method]?.baseFee ?? 3500, feeType: 'standard' };
}
```

> **studioTotal 주의**: `calculateDeliveryFee()`의 `studioTotal`은 **현재 카트(폴더) 합계**입니다.
> 당일 합배송(이전 주문 누적 + 현재 카트)은 별도로 `order/page.tsx`의 `combinedShipping` useMemo에서 처리합니다.

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

## 배송비 설정 페이지 (기초정보설정 > 배송비)

**파일**:
- 페이지: `apps/web/app/(dashboard)/settings/delivery/page.tsx`
- 핵심 컴포넌트: `apps/web/components/settings/delivery-settings-content.tsx` (실제 폼 로직)

### 배송방법별 설정 항목

| 방법 | 설정 항목 |
|------|-----------|
| 오토바이(퀵) | 거리별 단가(구간), 초과 km당 추가요금, 최대 기본거리, 야간/주말 할증률, 야간 시간 |
| 다마스 | 거리별 단가(구간), 초과 km당 추가요금, 최대 기본거리, 야간/주말 할증률 |
| 택배 | 기본요금, 도서산간 추가요금, 무료배송 기준금액 |
| 화물 | 기본요금, 크기별 단가(소형/중형/대형/특대형), 야간/주말 할증률 |
| 방문수령 | 기본요금(항상 0원) |

### 배송비 설정 API 엔드포인트

```
GET  /delivery-pricing              # 전체 배송비 설정 조회
GET  /delivery-pricing/{method}     # 특정 방법 설정 조회
PUT  /delivery-pricing/{method}     # 배송비 설정 저장
POST /delivery-pricing/initialize   # 기본값 초기화
POST /delivery-pricing/calculate    # 배송비 계산 (시뮬레이션)
POST /delivery-pricing/calculate-by-address  # 주소 기반 배송비 계산
```

### CSV 다운로드 기능 (구현 완료)

배송비 설정 페이지 헤더에 "CSV 다운로드" 버튼이 있다. 클릭 시 현재 `formData` 기준으로 5개 섹션의 CSV 파일 생성.

**CSV 섹션 구성:**
1. `[배송방법 기본 요약]` — 방법별 기본요금·활성화
2. `[거리별 단가 - 오토바이(퀵)]` / `[거리별 단가 - 다마스]` — 구간별 요금
3. `[할증 설정]` — 야간/주말 할증률
4. `[택배 설정]` — 도서산간 추가요금, 무료배송 기준금액
5. `[화물 크기별 단가]` — 크기별 추가요금

**파일명**: `배송비정책_YYYYMMDD.csv` (BOM 포함, 엑셀 한글 정상 표시)

**CSV 다운로드 공통 패턴** (프로젝트 전반에 동일하게 적용):
```typescript
const csvContent = '\uFEFF' + rows.join('\n'); // BOM 포함
const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = `파일명_${format(new Date(), 'yyyyMMdd')}.csv`;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
```

## 주문 취소/부분취소 시 배송비 재계산

### 정책

주문 취소 또는 항목 삭제로 당일 누적 상품금액이 변경되면, 조건부 무료배송 기준을 **재검사**하여 배송비/환급을 자동 조정한다.

### 트리거 조건

| 동작 | 트리거 | 영향 |
|------|--------|------|
| **주문 전체 취소** (`cancel()`) | 해당 주문 status → cancelled | 당일 누적금액 감소 (해당 주문 제외) |
| **주문 항목 삭제** (`deleteItem()`) | 해당 주문 productPrice 감소 | 당일 누적금액 감소 (금액 변경) |
| **주문 삭제** (`delete()`) | 해당 주문 DB에서 제거 | 당일 누적금액 감소 |

### 재계산 로직 (`recalculateSameDayShipping`)

```
1. 거래처 조회 → shippingType !== 'conditional' → SKIP

2. 당일(KST 00:00~23:59) 비취소 주문 조회 (status !== 'cancelled')
   → 고객직배송(direct_customer) 주문은 합배송 제외

3. 당일 누적 상품금액 계산 (스튜디오 배송만)

4. 누적 >= 기준금액?
   └─ YES → 조건부 무료배송 유지 (adjustmentAmount 그대로)
   └─ NO  → 모든 당일 주문의 adjustmentAmount를 0으로 리셋
            → finalAmount 재계산 (totalAmount - 0)
            → 매출원장(SalesLedger)도 연동 업데이트
            → processHistory에 'shipping_recalc' 이력 기록
```

### adjustmentAmount 리셋 시 처리

```typescript
// 기준금액 미달 시: 당일 주문 중 adjustmentAmount > 0인 주문들 리셋
for (const order of todayOrders) {
  if (Number(order.adjustmentAmount) > 0) {
    const newFinal = Number(order.totalAmount); // adjustmentAmount = 0이므로
    await tx.order.update({
      where: { id: order.id },
      data: {
        adjustmentAmount: 0,
        finalAmount: newFinal,
      },
    });
    // 매출원장도 연동
    // processHistory에 'shipping_recalc' 이력 추가
  }
}
```

### 관련 구현 파일

| 파일 | 변경 내용 |
|------|-----------|
| `apps/api/src/modules/order/services/order.service.ts` | `recalculateSameDayShipping()` private 메서드 추가 |
| 위 파일 `cancel()` | 취소 후 `recalculateSameDayShipping()` 호출 |
| 위 파일 `deleteItem()` | 항목 삭제 후 `recalculateSameDayShipping()` 호출 |
| 위 파일 `delete()` | 주문 삭제 후 `recalculateSameDayShipping()` 호출 |

### 엣지 케이스

1. **취소한 주문 자체에 adjustmentAmount가 있었던 경우**: 취소 시 해당 주문은 합산에서 제외되므로 영향 없음
2. **당일 주문이 1건뿐인 경우**: 취소하면 남은 주문 없으므로 재계산 불필요
3. **고객직배송만 남은 경우**: 합배송 대상이 아니므로 SKIP
4. **여러 주문에 adjustmentAmount가 분산된 경우**: 모두 0으로 리셋 (전체 재검사)

## 체크리스트

배송 관리 기능 구현 시 확인사항:

- [x] 거래처별 배송비 정책 (conditional/free/prepaid/cod)
- [x] 당일 합배송 자동 환급
- [x] 주문 취소/부분취소 시 배송비 자동 재계산
- [x] 배치 배송 (복수 아이템 1회 청구)
- [x] 배송비 설정 CSV 다운로드
- [ ] 배송 CRUD
- [ ] 배송 방법 선택 (택배/퀵/직접수령)
- [ ] 택배사 연동
  - [ ] 송장번호 발급 API
  - [ ] 배송 조회 API
- [ ] 송장 출력 (PDF)
- [ ] 대량 발송 처리
- [ ] 주소 검색 (다음 주소 API)
- [ ] 배송 상태 자동 업데이트
- [ ] 배송 알림 (SMS/카카오)
- [ ] 도서산간 지역 처리
