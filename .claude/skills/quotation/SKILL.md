---
name: quotation
description: 인쇄업 견적 구조 및 산출 체계. 옵셋인쇄, 디지털인쇄, 앨범, 디지털출력, 단일상품 견적 작업 시 사용합니다.
---

# 견적 스킬

인쇄업 견적 분류 및 산출 체계입니다.

## 견적 대분류 (5가지)

| 코드 | 분류 | 설명 |
|------|------|------|
| 10 | 인쇄 (옵셋인쇄) | 전통 옵셋 인쇄 방식 |
| 20 | 디지털인쇄 | 디지털 인쇄기 사용 |
| 30 | 앨범 | 포토앨범 전문 (포토미 특화) |
| 40 | 디지털출력 | 대형 출력, 포스터, 현수막 |
| 50 | 단일상품 | 명함, 스티커, 굿즈 등 |

## 견적 분류 체계

```
견적
├── 인쇄 (옵셋인쇄) ─────────────── 전통 인쇄
│   ├── 책자인쇄
│   ├── 리플렛/전단
│   ├── 포스터
│   └── 패키지
│
├── 디지털인쇄 ──────────────────── 디지털 인쇄기
│   ├── 책자디지털인쇄
│   │   ├── 소량 책자
│   │   ├── 카탈로그
│   │   └── 브로셔
│   └── 단품디지털인쇄
│       ├── 명함
│       ├── 엽서
│       └── 초대장
│
├── 앨범 ───────────────────────── 포토미 특화 (독립 구조)
│   ├── 고급화보
│   ├── 압축앨범
│   │   ├── 고급압축앨범 (기본 10p)
│   │   └── 졸업압축앨범 (2p 단위)
│   └── 포토북
│
├── 디지털출력 ─────────────────── 대형 출력
│   ├── 실사출력
│   ├── 현수막
│   ├── X배너
│   └── 캔버스
│
└── 단일상품 ───────────────────── 개별 상품
    ├── 포토카드
    ├── 달력
    ├── 머그컵
    └── 기타굿즈
```

---

## ⭐ 앨범 견적 구조 (핵심)

> **포토미 특화**: 앨범은 기술적으로 '책자디지털인쇄'에 속하나,
> 포토미는 앨범 전문 회사이므로 **독립된 견적 구조**로 운영합니다.

### 앨범 종류별 견적 공식

```
┌─────────────────────────────────────────────────────────────────┐
│                      앨범 견적 공식                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐                                               │
│  │  압축앨범    │  = 표지가격 + 출력가격 + 제본가격              │
│  └─────────────┘                                               │
│        │                                                        │
│        ├── 표지가격: 표지 종류/재질별 단가                       │
│        ├── 출력가격: HP인디고 또는 잉크젯 출력 단가              │
│        └── 제본가격: 속지 두께별 단가                           │
│                     (0.1mm / 0.3mm / 0.6mm / 1mm)              │
│                                                                 │
│  ┌─────────────┐                                               │
│  │ 고급화보     │  = 표지가격 + 인디고출력가격                   │
│  └─────────────┘                                               │
│        │                                                        │
│        ├── 표지가격: 표지 종류/재질별 단가                       │
│        └── 인디고출력가격: HP인디고 전용 단가                    │
│                                                                 │
│  ┌─────────────┐                                               │
│  │  포토북     │  = 표지가격 + 인디고출력가격                   │
│  └─────────────┘                                               │
│        │                                                        │
│        ├── 표지가격: 표지 종류/재질별 단가                       │
│        └── 인디고출력가격: HP인디고 전용 단가                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 앨범 견적 요약표

| 앨범 종류 | 견적 공식 | 출력방식 |
|----------|----------|----------|
| **압축앨범** | 표지가격 + 출력가격 + 제본가격(속지두께) | HP인디고 / 잉크젯 |
| **고급화보** | 표지가격 + 인디고출력가격 | HP인디고 전용 |
| **포토북** | 표지가격 + 인디고출력가격 | HP인디고 전용 |

### 압축앨범 속지 두께 옵션

| 속지 두께 | 설명 | 용도 |
|----------|------|------|
| 0.1mm | 얇은 속지 | 경제형, 페이지 많은 앨범 |
| 0.3mm | 표준 속지 | 일반 앨범 |
| 0.6mm | 두꺼운 속지 | 고급 앨범 |
| 1mm | 보드 속지 | 프리미엄, 레이플랫 |

---

## ⭐ 압축앨범 세부 분류 (고급/졸업)

압축앨범은 **고급압축앨범**과 **졸업압축앨범**으로 구분됩니다.

### 압축앨범 종류 비교

| 구분 | 고급압축앨범 | 졸업압축앨범 |
|------|-------------|-------------|
| **기본 페이지** | 10p | 2p |
| **페이지 단위** | 추가 시 자유 | 2p 단위 추가 |
| **최소 견적** | 10p 미만도 10p 가격 적용 | 2p부터 견적 가능 |
| **용도** | 일반 포토앨범, 웨딩 | 졸업앨범, 유치원, 학교 |

### 고급압축앨범 견적 규칙

```
┌─────────────────────────────────────────────────────────────────┐
│                    고급압축앨범 견적 규칙                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  기본 페이지: 10p                                                │
│                                                                 │
│  ⚠️ 10p 미만 주문 시 → 10p 가격 적용                             │
│                                                                 │
│  예시:                                                          │
│  - 8p 주문 → 10p 가격으로 견적                                   │
│  - 10p 주문 → 10p 가격으로 견적                                  │
│  - 12p 주문 → 12p 가격으로 견적 (10p + 2p 추가)                  │
│  - 20p 주문 → 20p 가격으로 견적 (10p + 10p 추가)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 졸업압축앨범 견적 규칙

```
┌─────────────────────────────────────────────────────────────────┐
│                    졸업압축앨범 견적 규칙                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  시작 페이지: 2p                                                 │
│  추가 단위: 2p                                                   │
│                                                                 │
│  가능한 페이지: 2p, 4p, 6p, 8p, 10p, 12p, 14p, ...              │
│                                                                 │
│  예시:                                                          │
│  - 2p 주문 → 2p 가격으로 견적                                   │
│  - 4p 주문 → 4p 가격으로 견적 (2p x 2)                          │
│  - 6p 주문 → 6p 가격으로 견적 (2p x 3)                          │
│  - 10p 주문 → 10p 가격으로 견적 (2p x 5)                        │
│                                                                 │
│  ⚠️ 홀수 페이지 불가 (2p 단위만 가능)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 앨범 견적 상세 구조

### 1. 압축앨범 견적

```typescript
// 압축앨범 견적 = 표지가격 + 출력가격 + 제본가격

interface CompressedAlbumQuotation {
  // 표지
  coverPrice: {
    coverType: 'hard' | 'soft';      // 하드커버/소프트커버
    coverMaterial: string;            // 표지 재질
    price: number;
  };

  // 출력 (HP인디고 또는 잉크젯 선택 가능)
  printPrice: {
    printMethod: 'HP_INDIGO' | 'INKJET';
    pages: number;                    // 페이지 수
    pricePerPage: number;             // 페이지당 단가
    price: number;
  };

  // 제본 (속지 두께별)
  bindingPrice: {
    innerPageThickness: '0.1mm' | '0.3mm' | '0.6mm' | '1mm';
    bindingType: string;              // 무선, 스프링, 떡제본
    price: number;
  };

  // 총액
  totalPrice: number;  // coverPrice + printPrice + bindingPrice
}
```

### 2. 고급화보 / 포토북 견적

```typescript
// 고급화보/포토북 견적 = 표지가격 + 인디고출력가격

interface PremiumAlbumQuotation {
  albumType: 'PREMIUM_PHOTO' | 'PHOTOBOOK';

  // 표지
  coverPrice: {
    coverType: 'hard' | 'soft' | 'leather';
    coverMaterial: string;
    price: number;
  };

  // 인디고출력 (HP인디고 전용)
  indigoPrice: {
    printMethod: 'HP_INDIGO';         // 고정값
    pages: number;
    pricePerPage: number;
    price: number;
  };

  // 총액
  totalPrice: number;  // coverPrice + indigoPrice
}
```

---

## 견적 계산 로직

```typescript
// 앨범 종류별 허용 출력방식
const ALBUM_PRINT_RULES = {
  COMPRESSED: ['HP_INDIGO', 'INKJET'],  // 압축앨범: 둘 다 가능
  PREMIUM_PHOTO: ['HP_INDIGO'],          // 고급화보: HP인디고만
  PHOTOBOOK: ['HP_INDIGO'],              // 포토북: HP인디고만
};

// 속지 두께 옵션 (압축앨범 전용)
const INNER_PAGE_THICKNESS = ['0.1mm', '0.3mm', '0.6mm', '1mm'];

// 압축앨범 견적 계산
function calculateCompressedAlbumPrice(params: {
  coverType: string;
  coverMaterial: string;
  printMethod: 'HP_INDIGO' | 'INKJET';
  pages: number;
  innerPageThickness: '0.1mm' | '0.3mm' | '0.6mm' | '1mm';
  bindingType: string;
  quantity: number;
}): number {
  // 1. 표지가격
  const coverPrice = getCoverPrice(params.coverType, params.coverMaterial);

  // 2. 출력가격
  const printPrice = getPrintPrice(params.printMethod, params.pages);

  // 3. 제본가격 (속지 두께별)
  const bindingPrice = getBindingPrice(
    params.bindingType,
    params.innerPageThickness,
    params.pages
  );

  // 4. 단가 합계
  const unitPrice = coverPrice + printPrice + bindingPrice;

  // 5. 수량 적용
  return unitPrice * params.quantity;
}

// 고급화보/포토북 견적 계산
function calculatePremiumAlbumPrice(params: {
  albumType: 'PREMIUM_PHOTO' | 'PHOTOBOOK';
  coverType: string;
  coverMaterial: string;
  pages: number;
  quantity: number;
}): number {
  // 1. 표지가격
  const coverPrice = getCoverPrice(params.coverType, params.coverMaterial);

  // 2. 인디고출력가격 (HP인디고 전용)
  const indigoPrice = getIndigoPrice(params.albumType, params.pages);

  // 3. 단가 합계
  const unitPrice = coverPrice + indigoPrice;

  // 4. 수량 적용
  return unitPrice * params.quantity;
}
```

---

## 데이터베이스 스키마

### Enum 정의

```prisma
// 견적 대분류
enum QuotationType {
  OFFSET_PRINT      // 인쇄 (옵셋인쇄)
  DIGITAL_PRINT     // 디지털인쇄
  ALBUM             // 앨범 (포토미 특화)
  DIGITAL_OUTPUT    // 디지털출력
  SINGLE_PRODUCT    // 단일상품
}

// 디지털인쇄 세부분류
enum DigitalPrintType {
  BOOKLET           // 책자디지털인쇄
  SINGLE_ITEM       // 단품디지털인쇄
}

// 앨범 종류
enum AlbumType {
  PREMIUM_PHOTO     // 고급화보 (표지 + 인디고출력)
  COMPRESSED        // 압축앨범 (표지 + 출력 + 제본)
  PHOTOBOOK         // 포토북 (표지 + 인디고출력)
}

// 압축앨범 세부 종류
enum CompressedAlbumType {
  PREMIUM           // 고급압축앨범 (기본 10p, 10p 미만도 10p 가격)
  GRADUATION        // 졸업압축앨범 (2p 단위, 2p부터 시작)
}

// 출력 방식
enum PrintMethod {
  HP_INDIGO         // HP인디고
  INKJET            // 잉크젯
  OFFSET            // 옵셋
}

// 속지 두께 (압축앨범용)
enum InnerPageThickness {
  THIN_01           // 0.1mm
  STANDARD_03       // 0.3mm
  THICK_06          // 0.6mm
  BOARD_10          // 1mm
}
```

### 앨범 견적 항목 모델

```prisma
model AlbumQuotationItem {
  id                  String      @id @default(cuid())
  quotationId         String
  quotation           Quotation   @relation(fields: [quotationId], references: [id])

  // 앨범 종류
  albumType           AlbumType
  compressedType      CompressedAlbumType?  // 압축앨범 세부 종류 (고급/졸업)

  // 표지 정보
  coverType           String                // hard, soft, leather
  coverMaterial       String                // 표지 재질
  coverPrice          Decimal   @db.Decimal(10, 2)

  // 출력 정보
  printMethod         PrintMethod
  pages               Int
  printPrice          Decimal   @db.Decimal(10, 2)

  // 제본 정보 (압축앨범만 해당)
  innerPageThickness  InnerPageThickness?   // 속지 두께
  bindingType         String?               // 제본 방식
  bindingPrice        Decimal?  @db.Decimal(10, 2)

  // 규격 & 수량
  spec                String                // 8x10, A4 등
  quantity            Int

  // 금액
  unitPrice           Decimal   @db.Decimal(10, 2)
  totalPrice          Decimal   @db.Decimal(12, 2)

  @@map("album_quotation_items")
}
```

---

## 상세 분류 (기타)

### 1. 인쇄 - 옵셋인쇄 (10000000)

전통적인 옵셋 인쇄 방식. 대량 인쇄에 적합.

**견적 요소:**
- 판형 (국전지, 4x6, 46전지 등)
- 도수 (1도, 2도, 4도, 별색)
- 용지 (아트지, 스노우지, 모조지 등)
- 수량 (최소 500부 이상 경제적)
- 후가공 (코팅, 박, 형압, 도무송 등)

---

### 2. 디지털인쇄 (20000000)

디지털 인쇄기(HP Indigo 등) 사용. 소량 다품종에 적합.

**책자디지털인쇄 견적 요소:**
- 규격, 페이지수, 내지용지, 표지용지, 제본방식, 수량

**단품디지털인쇄 견적 요소:**
- 규격, 용지, 도수, 수량, 후가공

---

### 3. 디지털출력 (40000000)

대형 잉크젯 프린터 사용. 대형 출력물에 적합.

**견적 요소:**
- 출력 사이즈, 소재, 해상도, 후가공, 설치 여부

---

### 4. 단일상품 (50000000)

개별 주문 상품. 굿즈 및 판촉물.

**견적 요소:**
- 상품 종류, 규격, 인쇄 방식, 수량, 옵션

---

## 체크리스트

견적 기능 구현 시 확인사항:

- [ ] 앨범 종류별 견적 공식 적용
  - [ ] 압축앨범: 표지가격 + 출력가격 + 제본가격(속지두께)
    - [ ] 고급압축앨범: 기본 10p, 10p 미만도 10p 가격
    - [ ] 졸업압축앨범: 2p 단위, 2p부터 시작
  - [ ] 고급화보: 표지가격 + 인디고출력가격
  - [ ] 포토북: 표지가격 + 인디고출력가격
- [ ] 압축앨범 세부 종류 선택 UI (고급/졸업)
- [ ] 속지 두께 선택 UI (0.1mm, 0.3mm, 0.6mm, 1mm)
- [ ] 앨범 출력방식 제한 로직
- [ ] 견적 대분류 선택 UI
- [ ] 디지털인쇄 세부분류 (책자/단품)
- [ ] 견적서 PDF 생성
- [ ] 견적 → 주문 전환 기능
