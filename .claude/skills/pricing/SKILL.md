---
name: pricing
description: 가격 정책 및 할인 규칙. 표준단가, 그룹단가, 거래처 개별단가, 할인율 적용 작업 시 사용합니다.
---

# 가격 관리 스킬

인쇄업 ERP의 가격 정책 및 할인 규칙입니다.

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

## 체크리스트

가격 관리 기능 구현 시 확인사항:

- [ ] 가격 우선순위 로직 구현
  - [ ] 거래처 개별단가 > 그룹단가 > 그룹할인율 > 표준단가
- [ ] 규격별 가격 관리
- [ ] 페이지 구간별 가격 관리 (앨범)
- [ ] 그룹 할인율 설정
- [ ] 거래처 개별단가 설정
- [ ] 가격 계산 API
- [ ] 가격표 일괄 등록/수정 (엑셀)
- [ ] 가격 이력 관리
- [ ] 수량 할인 적용 (옵션)
