---
name: pricing
description: 가격 정책 및 할인 규칙. 표준단가, 그룹단가, 거래처 개별단가, 할인율 적용 작업 시 사용합니다.
---

# 가격 관리 스킬

인쇄업 ERP의 가격 정책 및 할인 규칙입니다.

## 참고 시스템

- **포토미 관리시스템**: https://www.photome.co.kr/admin/new_setting/set_list.php
  - 세부그룹(생산제품) 세팅 화면
  - 출력전용, 박, 박위치 등 생산 옵션 관리

## 생산 옵션 대분류 (세부그룹)

인쇄업에서 가격 산정에 필요한 생산 옵션 분류:

| 코드 | 분류명 | 설명 | 적용단위 |
|------|--------|------|----------|
| 0101 | 출력전용 | 기본 출력 옵션 (포토북, 앨범 등) | 용지별 출력단가 |
| 1605 | 박 | 박(호일) 종류 (무광금박, 유광금박, 은박 등) | 규격별(수량) |
| 1609 | 박위치 | 박 적용 위치 (정중앙, 상단, 하단 등) | 규격별(수량) |

### 출력전용 (0101) 하위 항목
```
010106 - 포토북 (용지별 출력단가)
010103 - 초중고졸업 (용지별 출력단가)
010101 - 웨딩베이비 (용지별 출력단가)
010102 - 유치원졸업 (용지별 출력단가)
010104 - 인디고스냅고정단가 (후가공/규격별/페이지당)
010107 - 앨범수리용 (후가공/규격별/페이지당)
010110 - 인디고출력고정단가 (후가공/규격별/페이지당)
010111 - 잉크젯_앨범고정단가 (후가공/규격별/페이지당)
010112 - 잉크젯 출력(액자출력) (후가공/규격별/페이지당)
```

### 박 (1605) 하위 항목
```
160501 - 무광금박 (박Color)
160502 - 유광금박 (박Color)
160503 - 무광은박 (박Color)
160504 - 유광은박 (박Color)
160505 - 브라운 (박Color)
160506 - 블랙 (박Color)
160507 - 볼박 (박Color)
160508 - 화이트 (박Color)
```

### 박위치 (1609) 하위 항목
```
160901 - 정중앙 (박위치)
160902 - 상단중앙 (박위치)
160903 - 하단중앙 (박위치)
160904 - 좌측상단 (박위치)
160905 - 우측상단 (박위치)
```

## ⭐ 출력방식별 단가 구조 (인디고 vs 잉크젯)

인디고와 잉크젯은 출력 특성이 다르므로 단가 구조가 다릅니다.

### 인디고출력 (양면 출력 방식)

인디고는 **양면 출력이 가능**한 방식이므로 양면/단면 가격을 구분하고, **1up 단가 입력 시 2up~8up 자동 계산**합니다.
**규격 선택은 불필요**합니다.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [용지별출력단가/규격별/면] - 인디고출력                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 1. 인쇄방식: [인디고출력 ▼]                                              │
│                                                                         │
│ 2. 용지 선택:                                                           │
│    ☑ 스노우지 200g    ☑ 아트지 250g    ☐ 랑데부 300g                    │
│                                                                         │
│ 3. 단가 입력 (1up 입력 시 2up~8up 자동 계산):                            │
│    ┌──────────┬──────────┬──────────┬──────────┬────────────────────┐  │
│    │          │   단면    │   양면    │  자동계산  │                    │  │
│    ├──────────┼──────────┼──────────┼──────────┼────────────────────┤  │
│    │   1up    │   500원   │   800원   │    기준    │ ← 직접 입력        │  │
│    │   2up    │   450원   │   720원   │  1up×0.9  │ ← 수정 가능        │  │
│    │   3up    │   400원   │   640원   │  1up×0.8  │                    │  │
│    │   4up    │   350원   │   560원   │  1up×0.7  │                    │  │
│    │   5up    │   300원   │   480원   │  1up×0.6  │                    │  │
│    │   6up    │   275원   │   440원   │  1up×0.55 │                    │  │
│    │   7up    │   250원   │   400원   │  1up×0.5  │                    │  │
│    │   8up    │   225원   │   360원   │  1up×0.45 │                    │  │
│    └──────────┴──────────┴──────────┴──────────┴────────────────────┘  │
│                                                                         │
│ ※ 인디고는 규격 선택이 불필요합니다. Up 단가로 가격을 계산합니다.         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 인디고 Up 자동 계산 공식

```typescript
// 1up 단가 기준 Up별 할인율
const INDIGO_UP_DISCOUNT_RATES = {
  1: 1.0,    // 100% (기준)
  2: 0.9,    // 90%
  3: 0.8,    // 80%
  4: 0.7,    // 70%
  5: 0.6,    // 60%
  6: 0.55,   // 55%
  7: 0.5,    // 50%
  8: 0.45,   // 45%
};

// 자동 계산 함수
function calculateIndigoUpPrices(oneUpPrice: number): Record<number, number> {
  const prices: Record<number, number> = {};
  for (let up = 1; up <= 8; up++) {
    prices[up] = Math.round(oneUpPrice * INDIGO_UP_DISCOUNT_RATES[up]);
  }
  return prices;
}
```

#### ⭐ 인디고 원가 계산 (핵심)

인디고 용지의 원가는 국전지 가격을 기준으로 계산합니다.

**인디고 규격 정보:**
- 인디고 출력 규격: 315 x 467 mm
- 국전지 기준 4절 크기
- 국전지 1연(500매) × 4절 = **2,000장**

**원가 계산 공식:**

```typescript
// 인디고 원가 계산 상수
const INDIGO_SHEETS_PER_REAM = 2000;  // 국전지 4절 기준 장수

// 원가 계산 함수
function calculateIndigoCost(
  reamPrice: number,    // 국전지 1연 가격 (basePrice)
  up: number,           // Up 수 (1, 2, 4, 8)
  isDoubleSided: boolean // 양면 여부
): number {
  // 장당 원가 = 국전가격 / 2000
  const perSheetCost = reamPrice / INDIGO_SHEETS_PER_REAM;

  if (isDoubleSided) {
    // 양면: 장당원가 / 2 / up (한 장에 양면 인쇄하므로 2로 나눔)
    return perSheetCost / 2 / up;
  } else {
    // 단면: 장당원가 / up
    return perSheetCost / up;
  }
}
```

**예시 계산:**

| 국전가격 | Up | 단면 원가 | 양면 원가 |
|---------|-----|----------|----------|
| 230,000원 | 1up | 115원 (230000÷2000÷1) | 57.5원 (230000÷2000÷2÷1) |
| 230,000원 | 2up | 57.5원 (230000÷2000÷2) | 28.75원 (230000÷2000÷2÷2) |
| 230,000원 | 4up | 28.75원 (230000÷2000÷4) | 14.38원 (230000÷2000÷2÷4) |
| 230,000원 | 8up | 14.38원 (230000÷2000÷8) | 7.19원 (230000÷2000÷2÷8) |

#### ⭐ 인디고 잉크 원가 계산 (핵심)

인디고 잉크 원가는 **기초설정**에서 설정한 1컬러 가격을 기준으로 계산합니다.

**설정 위치:** 설정 > 기초정보 > 인쇄비 > 인디고 1도(1color) 인쇄비

**원가 계산 공식:**

```typescript
// 인디고 잉크 원가 계산
// 공식: 1컬러가격 × 컬러수(4도/6도) / up
// 양면도 잉크비는 동일 (용지만 절반, 잉크는 1면 기준)
function calculateIndigoInkCost(
  ink1ColorPrice: number,  // 기초설정의 1컬러 가격
  colorCount: 4 | 6,       // 4도칼라 또는 6도칼라
  up: number,              // Up 수 (1, 2, 4, 8)
  isDoubleSided: boolean   // 양면 여부 (잉크비 계산에는 영향 없음)
): number {
  // 단면/양면 모두: 잉크 원가 / up (양면은 용지가 절반이지만 잉크비는 동일)
  const baseCost = ink1ColorPrice * colorCount;
  return Math.round(baseCost / up);
}

// 인디고 총 원가 (용지 + 잉크)
function calculateIndigoTotalCost(
  reamPrice: number,       // 용지 연당 가격
  up: number,              // Up 수
  isDoubleSided: boolean,  // 양면 여부
  ink1ColorPrice: number,  // 1컬러 잉크 가격
  colorCount: 4 | 6        // 4도/6도
): number {
  const paperCost = calculateIndigoCost(reamPrice, up, isDoubleSided);
  const inkCost = calculateIndigoInkCost(ink1ColorPrice, colorCount, up, isDoubleSided);
  return paperCost + inkCost;
}
```

**예시 계산:** (1컬러 가격 = 10원 가정)

| Up | 4도 잉크원가 | 6도 잉크원가 | 비고 |
|-----|-------------|-------------|------|
| 1up | 40원 (10×4÷1) | 60원 (10×6÷1) | 단면/양면 동일 |
| 2up | 20원 (10×4÷2) | 30원 (10×6÷2) | 단면/양면 동일 |
| 4up | 10원 (10×4÷4) | 15원 (10×6÷4) | 단면/양면 동일 |
| 8up | 5원 (10×4÷8) | 8원 (10×6÷8) | 단면/양면 동일 |

**양면 인쇄 시:**
- 용지비: 절반 (한 장에 양면 인쇄하므로)
- 잉크비: 동일 (1면 기준)

**총 원가 = 용지 원가 + 잉크 원가**

### 잉크젯출력 (단면 출력 방식)

잉크젯은 **단면 출력만 가능**한 방식이므로 단면 가격만 입력합니다. Up 개념이 없고 **용지선택 + 규격선택** 후 규격별 단가를 설정합니다.

#### ⭐ 잉크젯 원가 계산 (핵심)

잉크젯 원가는 **롤지 면적** 대비 **출력 규격 면적**으로 계산합니다.

**원가 계산 공식:**

```typescript
// 잉크젯 원가 계산
function calculateInkjetCost(
  rollPrice: number,      // 롤지 가격
  rollWidthInch: number,  // 롤지 폭 (inch)
  rollLengthM: number,    // 롤지 길이 (m)
  specWidthInch: number,  // 출력 규격 폭 (inch)
  specHeightInch: number  // 출력 규격 높이 (inch)
): { paper: number; ink: number; total: number } {
  // 롤지 총 면적 (sq inch)
  // 1m = 39.37 inch
  const rollAreaSqInch = rollWidthInch * (rollLengthM * 39.37);

  // 규격 면적 (sq inch)
  const specAreaSqInch = specWidthInch * specHeightInch;

  // sq inch당 용지 원가
  const costPerSqInch = rollPrice / rollAreaSqInch;

  // 용지 원가 = 규격 면적 × sq inch당 원가
  const paperCost = specAreaSqInch * costPerSqInch;

  // 잉크 원가 = 용지 원가 × 1.5 (고정 비율)
  const inkCost = paperCost * 1.5;

  // 총 원가 = 용지 + 잉크
  return {
    paper: Math.round(paperCost),
    ink: Math.round(inkCost),
    total: Math.round(paperCost + inkCost)
  };
}
```

**예시 계산:** (롤지 24" × 30m, 가격 50,000원)

```
롤지 면적 = 24 × (30 × 39.37) = 28,346.4 sq inch
sq inch당 원가 = 50,000 ÷ 28,346.4 = 1.76원

규격 14×11의 경우:
- 규격 면적 = 14 × 11 = 154 sq inch
- 용지 원가 = 154 × 1.76 = 271원
- 잉크 원가 = 271 × 1.5 = 407원
- 총 원가 = 271 + 407 = 678원
```

| 규격 | 면적 (sq inch) | 용지 원가 | 잉크 원가 (×1.5) | 총 원가 |
|------|---------------|----------|-----------------|--------|
| 8×10 | 80 sq" | 141원 | 212원 | 353원 |
| 11×14 | 154 sq" | 271원 | 407원 | 678원 |
| 20×24 | 480 sq" | 845원 | 1,268원 | 2,113원 |
| 30×40 | 1,200 sq" | 2,112원 | 3,168원 | 5,280원 |

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [용지별출력단가/규격별/면] - 잉크젯출력                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 1. 인쇄방식: [잉크젯출력 ▼]                                              │
│                                                                         │
│ 2. 용지 선택:                                                           │
│    ☑ 프리미엄광택    ☑ 프리미엄무광    ☐ 캔버스                          │
│                                                                         │
│ 3. 규격 선택 (잉크젯/앨범/액자전용):                                      │
│    ☑ 8x10    ☑ 10x10    ☑ 11x14    ☑ A4                                │
│                                                                         │
│ 4. 단가 입력 (단면만):                                                   │
│    ┌──────────────┬──────────────┐                                      │
│    │    규격       │   단면 단가   │                                      │
│    ├──────────────┼──────────────┤                                      │
│    │    8x10      │   1,500원    │                                      │
│    │   10x10      │   2,000원    │                                      │
│    │   11x14      │   2,500원    │                                      │
│    │     A4       │   1,800원    │                                      │
│    └──────────────┴──────────────┘                                      │
│                                                                         │
│ ※ 잉크젯은 단면 출력 방식이므로 양면 가격이 없습니다.                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 출력방식별 단가 구조 비교

| 구분 | 인디고출력 | 잉크젯출력 |
|------|-----------|-----------|
| **출력면** | 양면/단면 | 단면만 |
| **용지선택** | 필요 | 필요 |
| **규격선택** | 불필요 | 필요 |
| **Up 개념** | 1up~8up | 없음 |
| **자동계산** | 1up 입력 시 2up~8up 자동 | 없음 |
| **가격 수정** | Up별 개별 수정 가능 | 규격별 직접 입력 |

### 데이터 구조

```typescript
// 인디고 출력 단가
interface IndigoPricing {
  paperId: string;           // 용지 ID
  specificationId: string;   // 규격 ID
  upPrices: {
    up: number;              // 1~8
    singleSidedPrice: number; // 단면 단가
    doubleSidedPrice: number; // 양면 단가
  }[];
}

// 잉크젯 출력 단가
interface InkjetPricing {
  specificationId: string;   // 규격 ID
  singleSidedPrice: number;  // 단면 단가 (양면 없음)
}
```

## ⭐ 가격 우선순위 (핵심)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         가격 적용 우선순위                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   1순위    거래처 개별단가 (Client Price)                               │
│              │                                                          │
│              │ 없으면 ↓                                                  │
│              ▼                                                          │
│   2순위    그룹단가 (Group Price)                                       │
│              │                                                          │
│              │ 없으면 ↓                                                  │
│              ▼                                                          │
│   3순위    그룹 할인율 적용 (Group Discount)                            │
│              │   표준단가 × (1 - 그룹할인율)                             │
│              │                                                          │
│              │ 없으면 ↓                                                  │
│              ▼                                                          │
│   4순위    표준단가 (Standard Price)                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 가격 유형

| 유형 | 설명 | 적용 대상 |
|------|------|-----------|
| **표준단가** | 기본 판매 가격 | 모든 거래처 |
| **그룹단가** | 거래처 그룹별 특별 가격 | 특정 그룹 |
| **그룹할인율** | 표준단가에서 할인 | 특정 그룹 |
| **거래처 개별단가** | 거래처별 특별 가격 | 특정 거래처 |

## 데이터베이스 스키마

### 표준단가 (제품 기본가)

```prisma
model Product {
  id              String    @id @default(cuid())
  // ... 기타 필드

  // 기본 가격
  basePrice       Decimal   @db.Decimal(10, 2)

  // 규격별 가격
  specPrices      ProductSpecPrice[]

  // 그룹별 가격
  groupPrices     ProductGroupPrice[]

  // 거래처별 가격
  clientPrices    ProductClientPrice[]

  @@map("products")
}
```

### 규격별 가격

```prisma
model ProductSpecPrice {
  id              String    @id @default(cuid())
  productId       String
  product         Product   @relation(fields: [productId], references: [id], onDelete: Cascade)

  // 규격
  specId          String
  spec            ProductSpec @relation(fields: [specId], references: [id])

  // 페이지 구간별 가격 (앨범용)
  minPages        Int?
  maxPages        Int?

  // 가격
  price           Decimal   @db.Decimal(10, 2)

  @@unique([productId, specId, minPages, maxPages])
  @@map("product_spec_prices")
}
```

### 그룹 할인율

```prisma
model ClientGroup {
  id              String    @id @default(cuid())
  name            String                  // 그룹명
  code            String    @unique       // 그룹코드

  // 기본 할인율 (%)
  discountRate    Decimal   @default(0) @db.Decimal(5, 2)

  // 그룹별 가격
  productPrices   ProductGroupPrice[]

  // 소속 거래처
  clients         Client[]

  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("client_groups")
}
```

### 그룹단가

```prisma
model ProductGroupPrice {
  id              String      @id @default(cuid())
  productId       String
  product         Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  groupId         String
  group           ClientGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  // 규격 (선택)
  specId          String?

  // 페이지 구간 (앨범용)
  minPages        Int?
  maxPages        Int?

  // 그룹 특별 가격
  price           Decimal     @db.Decimal(10, 2)

  @@unique([productId, groupId, specId, minPages, maxPages])
  @@map("product_group_prices")
}
```

### 거래처 개별단가

```prisma
model ProductClientPrice {
  id              String    @id @default(cuid())
  productId       String
  product         Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  clientId        String
  client          Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)

  // 규격 (선택)
  specId          String?

  // 페이지 구간 (앨범용)
  minPages        Int?
  maxPages        Int?

  // 거래처 특별 가격
  price           Decimal   @db.Decimal(10, 2)

  // 유효기간 (선택)
  validFrom       DateTime?
  validTo         DateTime?

  @@unique([productId, clientId, specId, minPages, maxPages])
  @@map("product_client_prices")
}
```

## 가격 계산 로직

```typescript
interface PriceCalculationParams {
  productId: string;
  clientId: string;
  specId?: string;
  pages?: number;
  quantity: number;
}

interface PriceResult {
  unitPrice: number;
  priceType: 'CLIENT' | 'GROUP' | 'GROUP_DISCOUNT' | 'STANDARD';
  discountRate?: number;
  amount: number;
}

async function calculatePrice(params: PriceCalculationParams): Promise<PriceResult> {
  const { productId, clientId, specId, pages, quantity } = params;

  // 1. 거래처 정보 조회
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { group: true },
  });

  // 2. 제품 정보 조회
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  // 1순위: 거래처 개별단가
  const clientPrice = await findClientPrice(productId, clientId, specId, pages);
  if (clientPrice) {
    return {
      unitPrice: clientPrice,
      priceType: 'CLIENT',
      amount: clientPrice * quantity,
    };
  }

  // 2순위: 그룹단가
  if (client.groupId) {
    const groupPrice = await findGroupPrice(productId, client.groupId, specId, pages);
    if (groupPrice) {
      return {
        unitPrice: groupPrice,
        priceType: 'GROUP',
        amount: groupPrice * quantity,
      };
    }

    // 3순위: 그룹 할인율 적용
    if (client.group?.discountRate > 0) {
      const standardPrice = await findStandardPrice(productId, specId, pages);
      const discountedPrice = standardPrice * (1 - client.group.discountRate / 100);
      return {
        unitPrice: discountedPrice,
        priceType: 'GROUP_DISCOUNT',
        discountRate: client.group.discountRate,
        amount: discountedPrice * quantity,
      };
    }
  }

  // 4순위: 표준단가
  const standardPrice = await findStandardPrice(productId, specId, pages);
  return {
    unitPrice: standardPrice,
    priceType: 'STANDARD',
    amount: standardPrice * quantity,
  };
}

// 페이지 구간에 맞는 가격 찾기
async function findPriceByPageRange(
  prices: Array<{ minPages?: number; maxPages?: number; price: number }>,
  pages?: number
): Promise<number | null> {
  if (!pages) return prices[0]?.price ?? null;

  const matched = prices.find(p =>
    (!p.minPages || pages >= p.minPages) &&
    (!p.maxPages || pages <= p.maxPages)
  );

  return matched?.price ?? null;
}
```

## 수량 할인 (옵션)

```typescript
// 수량 구간별 할인율
interface QuantityDiscount {
  minQty: number;
  maxQty: number | null;
  discountRate: number;  // %
}

const QUANTITY_DISCOUNTS: QuantityDiscount[] = [
  { minQty: 1, maxQty: 9, discountRate: 0 },
  { minQty: 10, maxQty: 49, discountRate: 5 },
  { minQty: 50, maxQty: 99, discountRate: 10 },
  { minQty: 100, maxQty: null, discountRate: 15 },
];

function getQuantityDiscount(quantity: number): number {
  const tier = QUANTITY_DISCOUNTS.find(
    d => quantity >= d.minQty && (d.maxQty === null || quantity <= d.maxQty)
  );
  return tier?.discountRate ?? 0;
}
```

## API 엔드포인트

```
# 표준단가
GET    /api/v1/pricing/products/:productId              # 제품 가격 조회
PUT    /api/v1/pricing/products/:productId              # 제품 가격 수정

# 규격별 가격
GET    /api/v1/pricing/products/:productId/specs        # 규격별 가격 목록
POST   /api/v1/pricing/products/:productId/specs        # 규격별 가격 등록
PUT    /api/v1/pricing/spec-prices/:id                  # 규격별 가격 수정
DELETE /api/v1/pricing/spec-prices/:id                  # 규격별 가격 삭제

# 그룹단가
GET    /api/v1/pricing/groups/:groupId                  # 그룹 가격 목록
POST   /api/v1/pricing/groups/:groupId/products         # 그룹 가격 등록
PUT    /api/v1/pricing/group-prices/:id                 # 그룹 가격 수정
DELETE /api/v1/pricing/group-prices/:id                 # 그룹 가격 삭제

# 거래처 개별단가
GET    /api/v1/pricing/clients/:clientId                # 거래처 가격 목록
POST   /api/v1/pricing/clients/:clientId/products       # 거래처 가격 등록
PUT    /api/v1/pricing/client-prices/:id                # 거래처 가격 수정
DELETE /api/v1/pricing/client-prices/:id                # 거래처 가격 삭제

# 가격 계산
POST   /api/v1/pricing/calculate                        # 가격 계산 (견적용)
POST   /api/v1/pricing/bulk-calculate                   # 대량 가격 계산
```

## 가격표 구조 (앨범 예시)

```typescript
// 압축앨범 가격표 예시
interface AlbumPriceTable {
  productId: string;
  productName: string;

  // 규격별
  specs: {
    specId: string;
    specName: string;  // "8x10"

    // 페이지 구간별
    pagePrices: {
      minPages: number;
      maxPages: number;
      standardPrice: number;
      groupPrices: Record<string, number>;  // { groupId: price }
    }[];
  }[];
}

// 예시 데이터
const albumPriceTable: AlbumPriceTable = {
  productId: "prod_001",
  productName: "고급압축앨범",
  specs: [
    {
      specId: "spec_8x10",
      specName: "8x10",
      pagePrices: [
        { minPages: 10, maxPages: 20, standardPrice: 50000, groupPrices: { "VIP": 45000 } },
        { minPages: 21, maxPages: 40, standardPrice: 70000, groupPrices: { "VIP": 63000 } },
        { minPages: 41, maxPages: 60, standardPrice: 90000, groupPrices: { "VIP": 81000 } },
      ]
    },
    {
      specId: "spec_10x10",
      specName: "10x10",
      pagePrices: [
        { minPages: 10, maxPages: 20, standardPrice: 60000, groupPrices: { "VIP": 54000 } },
        // ...
      ]
    }
  ]
};
```

## 프론트엔드 - 가격표 관리 UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 가격관리 > 고급압축앨범                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ [표준단가] [그룹단가] [거래처단가]                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 규격: [8x10 ▼]                                                          │
│                                                                         │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐          │
│ │   페이지      │   표준단가    │   VIP그룹    │   일반그룹    │          │
│ ├──────────────┼──────────────┼──────────────┼──────────────┤          │
│ │  10p ~ 20p   │   50,000     │   45,000     │   47,500     │          │
│ │  21p ~ 40p   │   70,000     │   63,000     │   66,500     │          │
│ │  41p ~ 60p   │   90,000     │   81,000     │   85,500     │          │
│ └──────────────┴──────────────┴──────────────┴──────────────┘          │
│                                                                         │
│ [+ 구간 추가]                                        [저장] [취소]       │
└─────────────────────────────────────────────────────────────────────────┘
```

## ⭐ UI 구성 (프론트엔드)

### 메뉴 구조

```
가격관리
├── 표준단가     (/pricing/production)  ← 제품 분류별 표준단가 설정
└── 그룹단가     (/pricing/group)       ← 거래처 그룹별 특별단가 설정
```

### 1. 표준단가 관리 (/pricing/production)

제품별 표준단가, 가격 계산 방식, 규격, 작업시간을 설정합니다.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 표준단가 설정                                        [+ 대분류 추가]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────────────────────────────┐    │
│  │ 제품 분류         │  │ 선택된 분류: 출력전용                       │    │
│  │                  │  │                                          │    │
│  │  ▶ 출력전용       │  │ ┌────────────────────────────────────┐  │    │
│  │    └ 포토북       │  │ │ 설정명: 인디고출력                    │  │    │
│  │    └ 웨딩앨범     │  │ │ 적용단위: 용지별출력단가/규격별/면     │  │    │
│  │  ▶ 제본          │  │ │ 작업일: 1일                          │  │    │
│  │  ▶ 후가공        │  │ │ 규격: 8x10, 10x10, ...              │  │    │
│  │                  │  │ └────────────────────────────────────┘  │    │
│  │                  │  │                                          │    │
│  │                  │  │ [+ 단가 설정 추가]                        │    │
│  └──────────────────┘  └──────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 관련 파일
| 파일 | 역할 |
|------|------|
| `apps/web/app/(dashboard)/pricing/production/page.tsx` | 표준단가 설정 UI |
| `apps/web/hooks/use-production.ts` | 프론트엔드 훅 |
| `apps/api/src/modules/production/services/production-group.service.ts` | 백엔드 서비스 |

### 2. 그룹단가 관리 (/pricing/group)

거래처 그룹별 특별 가격을 설정합니다. **그룹 추가 기능 포함**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 그룹단가 관리                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 가격 적용 우선순위                                                    │ │
│ │ 거래처 개별단가 → 그룹단가 → 그룹 할인율 → 표준단가                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 거래처 그룹 선택                              [+ 그룹 추가] ← NEW    │ │
│ │                                                                     │ │
│ │ 그룹: [VIP ▼]                                                       │ │
│ │ 그룹코드: VIP | 기본 할인율: 10% | 소속 거래처: 15개                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 그룹 특별단가 관리                           [+ 가격 추가]            │ │
│ │                                                                     │ │
│ │ [완제품] [반제품]                                                    │ │
│ │                                                                     │ │
│ │ ┌────────┬────────────┬──────────┬──────────┬────────┬──────┐      │ │
│ │ │ 상품코드 │   상품명    │  표준단가  │  그룹단가  │  할인율  │ 작업 │      │ │
│ │ ├────────┼────────────┼──────────┼──────────┼────────┼──────┤      │ │
│ │ │ P-001  │ 고급포토북  │ ₩50,000  │ ₩45,000  │  10%   │  🗑  │      │ │
│ │ │ P-002  │ 압축앨범    │ ₩30,000  │ ₩27,000  │  10%   │  🗑  │      │ │
│ │ └────────┴────────────┴──────────┴──────────┴────────┴──────┘      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 그룹 추가 기능

그룹단가 페이지에서 직접 새로운 거래처 그룹을 생성할 수 있습니다.

```typescript
// 그룹 추가 다이얼로그 필드
interface CreateClientGroupDto {
  groupName: string;       // 그룹명 (필수)
  groupCode: string;       // 그룹코드 (필수, 영문 대문자)
  generalDiscount: number; // 기본 할인율 (%)
  isActive: boolean;       // 활성화 상태
}
```

#### 관련 파일
| 파일 | 역할 |
|------|------|
| `apps/web/app/(dashboard)/pricing/group/page.tsx` | 그룹단가 관리 UI |
| `apps/web/hooks/use-clients.ts` | 거래처/그룹 훅 (`useCreateClientGroup`) |
| `apps/web/hooks/use-pricing.ts` | 가격 관련 훅 |

## 체크리스트

가격 관리 기능 구현 시 확인사항:

- [x] 가격 우선순위 로직 구현
  - [x] 거래처 개별단가 > 그룹단가 > 그룹할인율 > 표준단가
- [x] 규격별 가격 관리
- [x] 그룹단가 설정 (완제품/반제품)
- [x] 그룹 추가 기능 (그룹단가 페이지에서 직접 생성)
- [x] 표준단가 설정 UI (생산옵션 → 표준단가로 변경)
- [ ] 페이지 구간별 가격 관리 (앨범)
- [ ] 그룹 할인율 설정
- [ ] 거래처 개별단가 설정
- [ ] 가격 계산 API
- [ ] 가격표 일괄 등록/수정 (엑셀)
- [ ] 가격 이력 관리
- [ ] 수량 할인 적용 (옵션)
