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

**1up 면당 용지 원가 공식:**
```
1up 면당 용지 원가 = 국전지가격 / 500 / 4 / 2
                   = 국전지가격 / 4000

- /500: 1연 = 500장
- /4: 인디고 1장 = 국전지 4절
- /2: 양면 (앞뒤 2면)
```

**Up별 원가 공식:**
```
nup 원가 = 1up 원가 / n

예시 (1up 원가 = 121원):
- 1up: 121원 (121 / 1)
- 2up: 60.5원 → 61원 (121 / 2)
- 4up: 30.25원 → 30원 (121 / 4)
- 8up: 15.125원 → 15원 (121 / 8)
```

**원가 계산 공식:**

```typescript
// 인디고 원가 계산
// 1up 면당 용지 원가 = 국전지가격 / 500 / 4 / 2
function getIndigoPaperCostPerSide(reamPrice: number): number {
  return reamPrice / 500 / 4 / 2;  // = reamPrice / 4000
}

// Up별 총 원가 계산
function calculateIndigoCost(
  reamPrice: number,       // 국전지 1연 가격
  ink1ColorPrice: number,  // 1컬러 잉크 가격
  colorCount: 4 | 6,       // 4도/6도
  up: number,              // Up 수 (1, 2, 4, 8)
  isDoubleSided: boolean   // 양면 여부
): number {
  // 1up 면당 용지 원가
  const paperCostPerSide = reamPrice / 500 / 4 / 2;

  // 1up 클릭차지 (잉크비)
  const clickCharge = ink1ColorPrice * colorCount;

  // 1up 면당 총 원가
  const costPerSide1up = paperCostPerSide + clickCharge;

  // 단면: 1면, 양면: 2면
  const totalCost1up = isDoubleSided ? costPerSide1up * 2 : costPerSide1up;

  // ⭐ Up별 원가 = 1up 원가 / up
  return Math.round(totalCost1up / up);
}
```

**예시 계산:** (국전가격 242,000원, 1컬러 잉크 21원)

```
1up 면당 용지 원가 = 242,000 / 500 / 4 / 2 = 60.5원
4도 클릭차지 = 21 × 4 = 84원
1up 면당 총 원가 = 60.5 + 84 = 144.5원 → 단면 145원

Up별 단면 원가:
- 1up: 145원 (145 / 1)
- 2up: 73원 (145 / 2)
- 4up: 36원 (145 / 4)
- 8up: 18원 (145 / 8)
```

| 국전가격 | 1컬러잉크 | Up | 4도단면 원가 | 4도양면 원가 |
|---------|----------|-----|-------------|-------------|
| 242,000원 | 21원 | 1up | 145원 | 290원 |
| 242,000원 | 21원 | 2up | 73원 (145÷2) | 145원 (290÷2) |
| 242,000원 | 21원 | 4up | 36원 (145÷4) | 73원 (290÷4) |
| 242,000원 | 21원 | 8up | 18원 (145÷8) | 36원 (290÷8) |

#### ⭐ 인디고 잉크 원가 (클릭차지)

인디고 잉크 원가는 **기초설정**에서 설정한 1컬러 가격을 기준으로 계산합니다.

**설정 위치:** 설정 > 기초정보 > 인쇄비 > 인디고 1도(1color) 인쇄비

**클릭차지 공식:**
```
클릭차지 = 1컬러가격 × 컬러수

예시 (1컬러 = 21원):
- 4도: 21 × 4 = 84원
- 6도: 21 × 6 = 126원
```

**총 원가 = (용지 원가 + 클릭차지) / Up**

### 잉크젯출력 (단면 출력 방식)

잉크젯은 **단면 출력만 가능**한 방식이므로 단면 가격만 입력합니다. Up 개념이 없고 **용지선택 + 규격선택** 후 규격별 단가를 설정합니다.

#### ⭐ 잉크젯 원가 계산 (핵심)

잉크젯 원가는 **롤지 면적** 대비 **출력 규격 면적**으로 계산합니다.

**원가 계산 공식:**

```typescript
// 잉크젯 sq inch당 원가 계산
function calculateInkjetCostPerSqInch(
  rollPrice: number,      // 롤지 가격 (basePrice)
  rollWidthInch: number,  // 롤지 폭 (inch)
  rollLengthM: number     // 롤지 길이 (m)
): number {
  // 롤지 총 면적 (sq inch)
  // 공식: 가로폭(inch) × 용지길이(m) × 39.37 (1m = 39.37 inch)
  const totalSqInch = rollWidthInch * rollLengthM * 39.37;

  // sq inch당 원가
  return totalSqInch > 0 ? rollPrice / totalSqInch : 0;
}

// 잉크젯 규격별 원가 계산
function calculateInkjetCost(
  rollPrice: number,      // 롤지 가격
  rollWidthInch: number,  // 롤지 폭 (inch)
  rollLengthM: number,    // 롤지 길이 (m)
  specWidthInch: number,  // 출력 규격 폭 (inch)
  specHeightInch: number  // 출력 규격 높이 (inch)
): { paper: number; ink: number; total: number } {
  // sq inch당 원가
  const costPerSqInch = calculateInkjetCostPerSqInch(rollPrice, rollWidthInch, rollLengthM);

  // 규격 면적 (sq inch)
  const specAreaSqInch = specWidthInch * specHeightInch;

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

**예시 계산:** (싸틴240g 롤지 24" × 30m, 가격 38,000원)

```
롤지 면적 = 24 × 30 × 39.37 = 28,346.4 sq inch
sq inch당 원가 = 38,000 ÷ 28,346.4 = 1.34원

규격 8×10의 경우:
- 규격 면적 = 8 × 10 = 80 sq inch
- 용지 원가 = 80 × 1.34 = 107원
```

| 규격 | 면적 (sq inch) | 용지 원가 (1.34원/sq") |
|------|---------------|----------------------|
| 4×6 | 24 sq" | 32원 |
| 5×7 | 35 sq" | 47원 |
| 6×8 | 48 sq" | 64원 |
| 8×8 | 64 sq" | 86원 |
| 8×10 | 80 sq" | 107원 |
| 10×8 | 80 sq" | 107원 |
| 11×14 | 154 sq" | 206원 |
| 20×24 | 480 sq" | 643원 |

#### ⭐ 잉크젯 단가 설정 UI (기준규격 + sq" 가격)

잉크젯 단가는 **두 가지 방식**으로 입력할 수 있습니다:

1. **기준규격 + 기준가격 입력** → sq" 가격 자동 계산 → 다른 규격 면적 비례 계산
2. **sq" 가격 직접 입력** → 모든 규격 가격 자동 계산

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [출력전용] 용지별출력단가/1p가격 - 잉크젯출력                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ● 그룹1  규격 2/2개  프리미엄매트(240g), 새틴(240g)                        │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ 기준규격 [6x8 ▼]  [  600  ] 원                                   │  │
│   │                                                                 │  │
│   │ sq" 가격 [ 12.5  ] 원/sq"  (원가: 1.76원/sq" - 프리미엄매트240g)  │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │ ☑ │  규격  │  면적  │    단가     │  설명                    │    │
│   ├───┼────────┼────────┼─────────────┼─────────────────────────┤    │
│   │ ☑ │  6x8   │   48   │  [  600  ]  │ (기준) 면적×12.5원/sq"  │    │
│   │ ☑ │  8x8   │   64   │  [  800  ]  │ 면적×12.5원/sq" 자동계산 │    │
│   └───┴────────┴────────┴─────────────┴─────────────────────────┘    │
│                                                                         │
│   * 체크된 규격만 그룹에 포함됩니다. 기준규격 단가 입력 시 면적 비례로     │
│     자동 계산됩니다.                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**UI 동작:**

1. **기준규격 선택 + 기준가격 입력:**
   - 기준규격의 면적으로 sq" 가격 자동 계산
   - 다른 규격들은 `면적 × sq" 가격 × 가중치`로 자동 계산

2. **sq" 가격 직접 입력:**
   - sq" 가격 입력 필드에서 직접 입력
   - 모든 규격의 단가가 `면적 × sq" 가격 × 가중치`로 자동 계산

3. **용지 원가/sq" 표시 (주황색):**
   - 선택된 잉크젯 롤용지의 원가를 계산하여 표시
   - 공식: `용지원가(basePrice) / (가로폭(inch) × 용지길이(m) × 39.37)`
   - 판매가와 원가를 비교하여 마진 확인 가능

**관련 코드:**

```typescript
// sq" 가격 입력 시 모든 규격 가격 재계산
const handleSqInchPriceChange = (pricePerSqInch: number) => {
  setSettingForm((prev) => ({
    ...prev,
    priceGroups: prev.priceGroups.map(g => {
      if (g.id !== group.id) return g;
      const newSpecPrices = (g.specPrices || []).map((sp) => {
        const targetSpec = specifications?.find((s) => s.id === sp.specificationId);
        if (!targetSpec) return sp;
        const targetArea = Number(targetSpec.widthInch) * Number(targetSpec.heightInch);
        const calculatedPrice = targetArea * pricePerSqInch * (sp.weight || 1.0);
        return { ...sp, singleSidedPrice: Math.max(0, Math.round(calculatedPrice)) };
      });
      return { ...g, inkjetBasePrice: pricePerSqInch, specPrices: newSpecPrices };
    }),
  }));
};

// 용지 원가/sq" 계산 (롤지 문자열 필드에서 숫자 추출)
const calculatePaperCostPerSqInch = (paper: Paper) => {
  // rollWidthInch/rollLengthM 숫자 필드 또는 rollWidth/rollLength 문자열 필드에서 추출
  const widthInch = paper.rollWidthInch
    ? Number(paper.rollWidthInch)
    : (paper.rollWidth ? parseFloat(paper.rollWidth.replace(/[^0-9.]/g, '')) : 0);
  const lengthM = paper.rollLengthM
    ? Number(paper.rollLengthM)
    : (paper.rollLength ? parseFloat(paper.rollLength.replace(/[^0-9.]/g, '')) : 0);

  if (widthInch <= 0 || lengthM <= 0 || !paper.basePrice) {
    return null;
  }
  const totalSqInch = widthInch * lengthM * 39.37;
  return totalSqInch > 0 ? Number(paper.basePrice) / totalSqInch : 0;
};

// 예시: 싸틴(240g) 롤지
// - rollWidth: "24인치" → 24
// - rollLength: "30m" → 30
// - basePrice: 38000원
// - 롤 총 면적: 24 × 30 × 39.37 = 28,346.4 sq"
// - sq"당 원가: 38000 / 28346.4 = 1.34원/sq"
// - 8x10" 규격 원가: 80 × 1.34 = 107원
```

**데이터 구조:**

```typescript
// 잉크젯 단가 그룹
interface InkjetPriceGroup {
  id: string;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple';
  inkjetBaseSpecId?: string;     // 기준규격 ID
  inkjetBasePrice?: number;      // sq" 당 가격
  specPrices: {
    specificationId: string;     // 규격 ID
    singleSidedPrice: number;    // 단면 단가
    weight: number;              // 가중치 (기본값: 1.0)
  }[];
}
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

## ⭐ 금액단위조정 (Price Rounding)

자동 계산된 단가를 보기 좋게 반올림하는 기능입니다.
**1구간만 설정하면 나머지 구간은 상품 유형에 따라 자동 생성됩니다.**
**사용자가 구간/단위를 직접 수정할 수도 있습니다.**

### 상품별 기본 설정

| 상품 유형 | 가격대 | 자동 생성 구간 |
|----------|--------|---------------|
| **인디고출력** | ~1,500원 | 3구간 |
| **잉크젯출력** | ~10,000원 | 3구간 |
| **앨범** | ~50,000원 | 4구간 |
| **액자** | ~100,000원 | 5구간 |

### 상품별 자동 생성 구간 상세

#### 인디고출력 (최대 1,500원) - 3구간
```
1구간:    500원 미만 →  10원 단위
2구간:  1,000원 미만 →  50원 단위
3구간:  1,500원 이하 → 100원 단위
```

#### 잉크젯출력 (최대 10,000원) - 3구간
```
1구간:   1,000원 미만 →   10원 단위
2구간:   5,000원 미만 →   50원 단위
3구간:  10,000원 이하 →  100원 단위
```

#### 앨범 (최대 50,000원) - 4구간
```
1구간:   1,000원 미만 →   10원 단위
2구간:   5,000원 미만 →   50원 단위
3구간:  10,000원 미만 →  100원 단위
4구간:  50,000원 이하 →  500원 단위
```

#### 액자 (최대 100,000원) - 5구간
```
1구간:   1,000원 미만 →   10원 단위
2구간:   5,000원 미만 →   50원 단위
3구간:  10,000원 미만 →  100원 단위
4구간:  50,000원 미만 →  500원 단위
5구간: 100,000원 이하 → 1000원 단위
```

### 구현 코드

```typescript
// 단위 옵션
const ROUNDING_UNIT_OPTIONS = [10, 50, 100, 500, 1000];

// 구간 타입
interface PriceRoundingTier {
  maxPrice: number;  // 이 금액 미만 (마지막은 Infinity)
  unit: number;      // 반올림 단위
}

// 상품 유형별 기본 구간 설정
type ProductPriceType = 'indigo' | 'inkjet' | 'album' | 'frame';

const DEFAULT_ROUNDING_TIERS: Record<ProductPriceType, PriceRoundingTier[]> = {
  indigo: [
    { maxPrice: 500, unit: 10 },
    { maxPrice: 1000, unit: 50 },
    { maxPrice: Infinity, unit: 100 },
  ],
  inkjet: [
    { maxPrice: 1000, unit: 10 },
    { maxPrice: 5000, unit: 50 },
    { maxPrice: Infinity, unit: 100 },
  ],
  album: [
    { maxPrice: 1000, unit: 10 },
    { maxPrice: 5000, unit: 50 },
    { maxPrice: 10000, unit: 100 },
    { maxPrice: Infinity, unit: 500 },
  ],
  frame: [
    { maxPrice: 1000, unit: 10 },
    { maxPrice: 5000, unit: 50 },
    { maxPrice: 10000, unit: 100 },
    { maxPrice: 50000, unit: 500 },
    { maxPrice: Infinity, unit: 1000 },
  ],
};

// 구간별 단위조정 함수
const roundPriceByTier = (price: number, tiers: PriceRoundingTier[]): number => {
  if (price <= 0) return price;
  const tier = tiers.find(t => price < t.maxPrice);
  if (!tier) return price;
  return Math.round(price / tier.unit) * tier.unit;
};

// 사용 예시
const tiers = DEFAULT_ROUNDING_TIERS.inkjet;
roundPriceByTier(127, tiers);    // → 130 (10원 단위)
roundPriceByTier(2527, tiers);   // → 2550 (50원 단위)
roundPriceByTier(8270, tiers);   // → 8300 (100원 단위)
```

### UI 구성

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔧 단위조정 [잉크젯 ▼]                              [자동적용]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1구간: [  1,000 ]원 미만 → [  10원 ▼]  [🗑]                    │
│  2구간: [  5,000 ]원 미만 → [  50원 ▼]  [🗑]                    │
│  3구간:      그 이상     → [ 100원 ▼]                           │
│                                                                 │
│  [+ 구간 추가]                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

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
