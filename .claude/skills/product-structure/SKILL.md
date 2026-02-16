---
name: product-structure
description: 인쇄업 상품 구조 및 분류 체계. 출력, 앨범, 액자, 굿즈 상품 등록/관리 시 사용합니다.
---

# 상품 구조 스킬

포토북/앨범 인쇄업체의 상품 분류 체계입니다.

## 상품 대분류

| 코드 | 대분류 | 설명 |
|------|--------|------|
| 10 | 출력 | 낱장 인화, 포스터, 증명사진 |
| 20 | 앨범 | 고급화보, 압축앨범, 포토북 |
| 30 | 액자 | PUR액자, STAR케이블, 캔버스 |
| 40 | 굿즈상품 | 포토카드, 달력, 머그컵 등 |

## 출력 방식

| 코드 | 출력방식 | 설명 | 특징 |
|------|----------|------|------|
| HP_INDIGO | HP인디고 | 디지털 오프셋 인쇄 | 고품질, 소량 다품종 |
| INKJET | 잉크젯출력 | 대형 잉크젯 프린터 | 대형 출력, 빠른 속도 |

## 상세 분류 체계

### 1. 출력 (10000000)

```
출력
├── HP인디고 (10010000)
│   ├── 4Color
│   ├── 6Color
│   └── 고급용지
└── 잉크젯출력 (10020000)
    ├── 일반출력
    ├── 포스터
    └── 대형출력
```

**출력방식별 지원:**
| 상품 | HP인디고 | 잉크젯출력 |
|------|:--------:|:----------:|
| 일반출력 | ✓ | ✓ |
| 포스터 | ✓ | ✓ |
| 고급출력 | ✓ | - |
| 대형출력 | - | ✓ |

### 2. 앨범 (20000000)

```
앨범
├── 고급화보 (20010000)    ← HP인디고 전용
│   ├── 하드커버
│   ├── 소프트커버
│   └── 양장제본
├── 압축앨범 (20020000)    ← HP인디고 + 잉크젯 모두 가능
│   ├── 무선제본
│   ├── 스프링제본
│   └── 떡제본
└── 포토북 (20030000)      ← HP인디고 전용
    ├── 레이플랫
    ├── 일반제본
    └── 미니포토북
```

**⚠️ 앨범 출력방식 제한 (중요)**

| 앨범 종류 | HP인디고 | 잉크젯출력 | 비고 |
|----------|:--------:|:----------:|------|
| **고급화보** | ✓ | ✗ | HP인디고 전용 (고품질 필수) |
| **압축앨범** | ✓ | ✓ | 양쪽 모두 가능 |
| **포토북** | ✓ | ✗ | HP인디고 전용 (고품질 필수) |

---

## ⭐ 앨범 가격 구조 (견적 연동)

### 앨범 종류별 가격 공식

```
┌─────────────────────────────────────────────────────────────────┐
│                      앨범 가격 공식                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐                                               │
│  │  압축앨범    │  = 표지가격 + 출력가격 + 제본가격              │
│  └─────────────┘         │                   │                 │
│                          │                   └─ 속지두께별     │
│                          │                      (0.1/0.3/0.6/1mm)│
│                          └─ HP인디고 or 잉크젯                  │
│                                                                 │
│  ┌─────────────┐                                               │
│  │ 고급화보     │  = 표지가격 + 인디고출력가격                   │
│  └─────────────┘                                               │
│                                                                 │
│  ┌─────────────┐                                               │
│  │  포토북     │  = 표지가격 + 인디고출력가격                   │
│  └─────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 앨범 가격 요약표

| 앨범 종류 | 가격 공식 | 출력방식 |
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

### 3. 액자 (30000000)

```
액자
├── PUR액자 (30010000)
├── STAR케이블 (30020000)
├── 캔버스 (30030000)
└── 아크릴액자 (30040000)
```

### 4. 굿즈상품 (40000000)

```
굿즈상품
├── 포토카드 (40010000)
├── 달력 (40020000)
├── 머그컵 (40030000)
├── 키링 (40040000)
├── 에코백 (40050000)
├── 쿠션 (40060000)
├── 폰케이스 (40070000)
└── 기타굿즈 (40080000)
```

## 데이터베이스 스키마

### Enum 정의

```prisma
enum ProductType {
  OUTPUT    // 출력
  ALBUM     // 앨범
  FRAME     // 액자
  GOODS     // 굿즈
}

enum PrintMethod {
  HP_INDIGO   // HP인디고
  INKJET      // 잉크젯출력
}

enum AlbumType {
  PREMIUM_PHOTO   // 고급화보 (표지 + 인디고출력)
  COMPRESSED      // 압축앨범 (표지 + 출력 + 제본)
  PHOTOBOOK       // 포토북 (표지 + 인디고출력)
}

// 속지 두께 (압축앨범용)
enum InnerPageThickness {
  THIN_01         // 0.1mm
  STANDARD_03     // 0.3mm
  THICK_06        // 0.6mm
  BOARD_10        // 1mm
}
```

### 카테고리 (계층형)

```prisma
model Category {
  id          String     @id @default(cuid())
  code        String     @unique  // 10010000
  name        String               // HP인디고
  depth       Int                  // 1: 대분류, 2: 중분류, 3: 소분류
  parentId    String?
  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  sortOrder   Int        @default(0)
  isActive    Boolean    @default(true)
  products    Product[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@map("categories")
}
```

### 완제품

```prisma
model Product {
  id              String       @id @default(cuid())
  code            String       @unique    // 상품코드
  name            String                  // 상품명
  categoryId      String
  category        Category     @relation(fields: [categoryId], references: [id])

  // 상품 유형
  productType     ProductType             // OUTPUT, ALBUM, FRAME, GOODS

  // 앨범 전용 필드
  albumType       AlbumType?              // 고급화보, 압축앨범, 포토북

  // 출력 방식 (복수 선택 가능)
  printMethods    PrintMethod[]           // [HP_INDIGO], [HP_INDIGO, INKJET]

  // 기본 정보
  description     String?
  thumbnail       String?
  images          String[]

  // 노출 설정
  isMainDisplay   Boolean      @default(false)
  isActive        Boolean      @default(true)
  sortOrder       Int          @default(0)

  // 규격 옵션
  specs           ProductSpec[]

  // 제본 방법 (앨범용)
  bindingTypes    ProductBindingType[]

  // 용지 옵션
  paperTypes      ProductPaperType[]

  // 가격
  basePrice       Decimal      @db.Decimal(10, 2)

  // 반제품 연결
  halfProducts    ProductHalfProduct[]

  // 제조사
  manufacturer    String?

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@map("products")
}
```

## 출력방식 검증 로직

```typescript
// 앨범 종류별 허용 출력방식
const ALBUM_PRINT_METHOD_RULES: Record<AlbumType, PrintMethod[]> = {
  PREMIUM_PHOTO: [PrintMethod.HP_INDIGO],           // 고급화보: HP인디고만
  COMPRESSED: [PrintMethod.HP_INDIGO, PrintMethod.INKJET],  // 압축앨범: 둘 다 가능
  PHOTOBOOK: [PrintMethod.HP_INDIGO],               // 포토북: HP인디고만
};

// 출력방식 유효성 검증
function validatePrintMethod(
  albumType: AlbumType,
  printMethod: PrintMethod
): boolean {
  const allowedMethods = ALBUM_PRINT_METHOD_RULES[albumType];
  return allowedMethods.includes(printMethod);
}

// 사용 예시
function createAlbumOrder(albumType: AlbumType, printMethod: PrintMethod) {
  if (!validatePrintMethod(albumType, printMethod)) {
    throw new BadRequestException(
      `${albumType}은(는) ${printMethod} 출력을 지원하지 않습니다.`
    );
  }
  // 주문 생성 로직...
}
```

## 상품 등록 DTO

```typescript
export class CreateProductDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  categoryId: string;

  @IsEnum(ProductType)
  productType: ProductType;

  // 앨범일 경우 필수
  @IsOptional()
  @IsEnum(AlbumType)
  albumType?: AlbumType;

  // 출력 방식 (앨범 종류에 따라 자동 제한)
  @IsArray()
  @IsEnum(PrintMethod, { each: true })
  printMethods: PrintMethod[];

  @IsNumber()
  basePrice: number;

  // ... 기타 필드
}

// 검증 데코레이터
export function ValidateAlbumPrintMethod() {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'validateAlbumPrintMethod',
      target: object.constructor,
      propertyName: propertyName,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const dto = args.object as CreateProductDto;
          if (dto.productType !== ProductType.ALBUM) return true;

          const allowedMethods = ALBUM_PRINT_METHOD_RULES[dto.albumType];
          return dto.printMethods.every(m => allowedMethods.includes(m));
        },
        defaultMessage() {
          return '선택한 앨범 종류에서 지원하지 않는 출력방식입니다.';
        }
      }
    });
  };
}
```

## 프론트엔드 - 출력방식 선택 UI

```typescript
// 앨범 종류 선택 시 출력방식 옵션 필터링
const printMethodOptions = useMemo(() => {
  if (productType !== 'ALBUM' || !albumType) {
    return [
      { value: 'HP_INDIGO', label: 'HP인디고' },
      { value: 'INKJET', label: '잉크젯출력' },
    ];
  }

  const rules: Record<AlbumType, PrintMethod[]> = {
    PREMIUM_PHOTO: ['HP_INDIGO'],
    COMPRESSED: ['HP_INDIGO', 'INKJET'],
    PHOTOBOOK: ['HP_INDIGO'],
  };

  const allowed = rules[albumType];
  return [
    { value: 'HP_INDIGO', label: 'HP인디고', disabled: !allowed.includes('HP_INDIGO') },
    { value: 'INKJET', label: '잉크젯출력', disabled: !allowed.includes('INKJET') },
  ];
}, [productType, albumType]);
```

## 상품 유형별 필수 옵션

| 유형 | 필수 옵션 |
|------|-----------|
| 출력 | 출력방식, 규격, 용지, 코팅 |
| 앨범 | 앨범종류, 출력방식, 규격, 페이지수, 제본방식, 표지, 내지용지 |
| 액자 | 규격, 프레임종류, 유리/아크릴 |
| 굿즈 | 규격, 재질, 수량 |

## 출력방식별 용지 자동 분류 패턴

### 핵심 원리
- `ProductPaper.printMethod` 필드로 각 용지의 출력방식을 구분 (`'indigo'` | `'inkjet'` | `'offset'`)
- `Paper.printMethods` (마스터 용지) 배열로 지원 출력방식 관리 (`['indigo']`, `['inkjet']`, `['indigo','inkjet']`)
- 출력방식 선택 → 해당 용지만 자동 필터링하여 표시

### 쇼핑몰 상품상세 UI 패턴 (product/[id]/page.tsx)

```typescript
// 1. SelectedOptions에 printMethod 포함
interface SelectedOptions {
  printMethod?: 'indigo' | 'inkjet';
  paper?: ProductPaper;
  // ...
}

// 2. 기본값 설정: 인디고 용지가 있으면 인디고, 없으면 잉크젯
const hasIndigo = activePapers.some(p => p.printMethod === 'indigo');
const defaultPrintMethod = hasIndigo ? 'indigo' : 'inkjet';

// 3. 선택된 출력방식에 맞는 용지만 필터링
const filteredPapers = hasPrintMethodInfo
  ? activePapers.filter(p => p.printMethod === currentPrintMethod)
  : activePapers;

// 4. 출력방식 전환 시 해당 방식의 기본 용지 자동 선택
onClick={() => {
  const inkjetPapers = activePapers.filter(p => p.printMethod === 'inkjet');
  const defaultPaper = inkjetPapers.find(p => p.isDefault) || inkjetPapers[0];
  setSelectedOptions(prev => ({ ...prev, printMethod: 'inkjet', paper: defaultPaper }));
}}
```

### 관리자 상품편집 UI 패턴 (products/[id]/edit/page.tsx)

```typescript
// 출력방식별 1차 그룹화 → 용지종류별 2차 그룹화
const printMethodGroups = {};
papers.forEach(p => {
  const method = p.printMethod || 'etc';
  if (!printMethodGroups[method]) printMethodGroups[method] = [];
  printMethodGroups[method].push(p);
});

// 출력방식 표시 순서 및 라벨
const methodOrder = ['indigo', 'inkjet', 'offset', 'etc'];
const methodLabels = {
  indigo: '인디고출력용지',
  inkjet: '잉크젯출력용지',
  offset: '오프셋용지',
  etc: '기타',
};
```

### 관련 파일
- 타입: `apps/web/lib/types/product.ts` → `ProductPaper.printMethod`
- 쇼핑몰: `apps/web/app/(shop)/product/[id]/page.tsx` → 출력방식 탭 + 용지 필터링
- 관리자: `apps/web/app/(dashboard)/products/[id]/edit/page.tsx` → 출력방식별 그룹화 테이블
- API Hook: `apps/web/hooks/use-paper.ts` → `usePapersByPrintMethod(method)`
- 백엔드: `GET /papers/print-method/:method` → 출력방식별 용지 조회
- DB: `ProductPaper.printMethod` (String?), `Paper.printMethods` (String[])

## 체크리스트

상품 관리 기능 구현 시 확인사항:

- [x] 출력방식 선택 UI (HP인디고/잉크젯)
- [x] 출력방식별 용지 자동 필터링 (쇼핑몰)
- [x] 출력방식별 용지 그룹화 표시 (관리자)
- [ ] 앨범 종류별 출력방식 제한 로직
- [ ] 카테고리 트리 컴포넌트 구현
- [ ] 상품 목록 필터링 (유형, 출력방식, 카테고리)
- [ ] 상품 검색 (코드, 이름, 제조사)
- [ ] 썸네일 이미지 업로드
- [ ] 규격 옵션 동적 추가/삭제
- [ ] 반제품 연결 기능
- [ ] 메인 노출 토글
