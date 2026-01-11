---
name: specification-management
description: 상품 규격 등록/관리 스킬. 제품의 규격(크기, 제본, 용지, 커버 등)을 DB에 등록하고 관리합니다.
---

# 규격 등록 & 관리 스킬

포토북/앨범 인쇄업체의 상품 규격 관리 체계입니다.

## 📋 규격 관리 개요

규격은 완제품(Product)의 **선택 가능한 옵션들**을 정의합니다.

```
완제품 (Product)
├── 규격 (ProductSpecification) - 기본 크기
│   └── 예: A4, 4x6", 210x297mm
├── 제본 (ProductBinding) - 제책 방식
│   └── 예: 무선제본, 스프링제본, 떡제본
├── 용지 (ProductPaper) - 지질
│   └── 예: 고급용지, 일반용지, 매트지
├── 커버 (ProductCover) - 표지 재질
│   └── 예: 하드커버, 소프트커버
├── 박 (ProductFoil) - 후가공 박 처리
│   └── 예: 금박, 은박, 무박
└── 후가공 (ProductFinishing) - 추가 가공
    └── 예: 코팅, 엠보싱, 무광
```

---

## 🔧 규격 등록 프로세스

### 1️⃣ 기본 규격 (Specification)

**정의**: 상품의 기본 크기/사이즈

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `name` | String | 규격명 | "A4", "4x6\"", "210x297mm" |
| `width` | Float | 가로 크기 | 210 |
| `height` | Float | 세로 크기 | 297 |
| `unit` | String | 단위 | "mm" / "inch" |

**DB 모델**:
```prisma
model ProductSpecification {
  id                String                @id @default(cuid())
  productId         String
  product           Product               @relation(fields: [productId], references: [id])
  name              String                // "A4", "4x6 inch"
  width             Float                 // 210
  height            Float                 // 297
  unit              String                // "mm" or "inch"
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  
  @@unique([productId, name])
}
```

**등록 예시**:
- A4: 210mm x 297mm
- 엽서: 100mm x 150mm
- 4x6": 4 x 6 inch

---

### 2️⃣ 제본 방식 (Binding)

**정의**: 책/앨범 제책 방식

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `name` | String | 제본명 | "무선제본", "스프링제본" |
| `code` | String | 제본 코드 | "WIRE", "SPRING" |

**DB 모델**:
```prisma
model ProductBinding {
  id                String                @id @default(cuid())
  productId         String
  product           Product               @relation(fields: [productId], references: [id])
  name              String                // "무선제본"
  code              String                // "WIRE_BINDING"
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  
  @@unique([productId, name])
}
```

**등록 예시**:
- 무선제본 (Wire Binding)
- 스프링제본 (Spring Binding)
- 떡제본 (Perfect Binding)
- 하드커버 제본 (Case Binding)

---

### 3️⃣ 용지 종류 (Paper)

**정의**: 속지의 종이 재질 및 무게

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `name` | String | 용지명 | "고급용지", "일반용지" |
| `weight` | Float | 무게 (g/m²) | 200 |
| `type` | String | 용지 종류 | "GLOSSY" / "MATTE" / "NORMAL" |

**DB 모델**:
```prisma
model ProductPaper {
  id                String                @id @default(cuid())
  productId         String
  product           Product               @relation(fields: [productId], references: [id])
  name              String                // "고급용지"
  weight            Float                 // 200
  type              String                // "GLOSSY" | "MATTE" | "NORMAL"
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  
  @@unique([productId, name, weight])
}
```

**등록 예시**:
- 고급용지 (Glossy) - 200g/m²
- 일반용지 (Normal) - 150g/m²
- 매트지 (Matte) - 200g/m²

---

### 4️⃣ 커버 유형 (Cover)

**정의**: 표지 재질/타입

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `name` | String | 커버명 | "하드커버", "소프트커버" |
| `material` | String | 재질 | "HARDCOVER" / "SOFTCOVER" |

**DB 모델**:
```prisma
model ProductCover {
  id                String                @id @default(cuid())
  productId         String
  product           Product               @relation(fields: [productId], references: [id])
  name              String                // "하드커버"
  material          String                // "HARDCOVER"
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  
  @@unique([productId, name])
}
```

**등록 예시**:
- 하드커버 (Hardcover)
- 소프트커버 (Softcover)
- 양장제본 (Casebound)

---

### 5️⃣ 박 처리 (Foil)

**정의**: 표지 박 후가공 (금박, 은박 등)

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `name` | String | 박명 | "금박", "은박" |
| `type` | String | 박 종류 | "GOLD" / "SILVER" / "NONE" |
| `color` | String | 색상 | "GOLD", "SILVER" |

**DB 모델**:
```prisma
model ProductFoil {
  id                String                @id @default(cuid())
  productId         String
  product           Product               @relation(fields: [productId], references: [id])
  name              String                // "금박"
  type              String                // "GOLD" | "SILVER" | "NONE"
  color             String                // "GOLD"
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  
  @@unique([productId, name])
}
```

**등록 예시**:
- 금박 (Gold Foil)
- 은박 (Silver Foil)
- 무박 (No Foil)

---

### 6️⃣ 후가공 (Finishing)

**정의**: 추가 마무리 가공

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `name` | String | 후가공명 | "코팅", "엠보싱" |
| `type` | String | 종류 | "COATING" / "EMBOSSING" / "NONE" |

**DB 모델**:
```prisma
model ProductFinishing {
  id                String                @id @default(cuid())
  productId         String
  product           Product               @relation(fields: [productId], references: [id])
  name              String                // "코팅"
  type              String                // "COATING" | "EMBOSSING" | "NONE"
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  
  @@unique([productId, name])
}
```

**등록 예시**:
- 매트 코팅 (Matt Coating)
- 광택 코팅 (Glossy Coating)
- 엠보싱 (Embossing)
- 무광 (Matte)

---

## 📊 규격 관리 화면 구조

### 상단 필터
```
[규격명 검색] [기본 규격(inch/mm)] [규격등록]
```

### 테이블 컬럼
| # | 번호 | 순서 | 규격명 | 가로×세로(mm) | 가로×세로(inch) | 절수 | 인쇄전용 | 드림마보 | 온열전용 | 액자전용 | 편집 |
|---|------|------|--------|---------------|-----------------|------|---------|---------|---------|---------|------|
| 1 | 209 | 0 | 7x4.7 | 177.8 x 0 | 0 x 0 | 310 | ☑️ | ☑️ | ☐ | ☐ | 수정 |

### 주요 기능
1. **규격 추가**: 새로운 규격 입력
2. **규격 수정**: 기존 규격 정보 변경
3. **규격 정렬**: 순서 변경 (드래그 & 드롭)
4. **규격 삭제**: 사용하지 않는 규격 제거

---

## 🔗 API 엔드포인트

### 규격 조회
```
GET /api/v1/products/{productId}/specifications
GET /api/v1/products/{productId}/specifications/{specId}
```

### 규격 등록
```
POST /api/v1/products/{productId}/specifications
Body: {
  name: "A4",
  width: 210,
  height: 297,
  unit: "mm"
}
```

### 규격 수정
```
PUT /api/v1/products/{productId}/specifications/{specId}
Body: { name, width, height, unit }
```

### 규격 삭제
```
DELETE /api/v1/products/{productId}/specifications/{specId}
```

---

## 💡 등록 팁

### 규격명 명명 규칙
- **국내 규격**: "A4", "B5", "엽서"
- **해외 규격**: "4x6\"", "8x10\""
- **커스텀**: "210x297mm", "100x150mm"

### 주의사항
1. **중복 방지**: 같은 크기의 규격 중복 등록 금지
2. **단위 통일**: 같은 상품 내 규격은 단위 통일 권장
3. **옵션 조합**: 규격+제본+용지+커버 조합으로 가격 결정

### 예시: 포토북 규격 등록
```
규격 1: A4 (210 x 297mm)
규격 2: 4x6 inch (101.6 x 152.4mm)

제본: 무선제본, 스프링제본, 하드커버제본
용지: 고급용지, 일반용지
커버: 하드커버, 소프트커버
박: 금박, 은박, 무박
후가공: 매트코팅, 광택코팅
```

---

## 📝 Frontend 연동 (Hooks)

### 규격 조회
```typescript
const { data: specifications } = useProductSpecifications(productId);
```

### 규격 등록
```typescript
const { mutate: addSpec } = useAddProductSpecification();
addSpec({ productId, ...specData });
```

### 규격 삭제
```typescript
const { mutate: deleteSpec } = useDeleteProductSpecification();
deleteSpec({ productId, specId });
```

---

## 🎯 규격 관리 체크리스트

- [ ] 상품별 기본 규격 등록 완료
- [ ] 제본 방식 옵션 정의
- [ ] 용지 종류 등록
- [ ] 커버 유형 등록
- [ ] 박 처리 옵션 정의
- [ ] 후가공 옵션 정의
- [ ] 규격별 가격 설정
- [ ] 규격-옵션 조합 검증

---

## 📐 Nup 자동 설정 기능 (앨범 전용)

### 개요
앨범 주문 시 규격별 Nup(인쇄 배치 수)를 자동으로 설정합니다.
Nup은 **면적(sq inch = 가로 × 세로)**을 기준으로 구간을 나누어 자동 결정됩니다.

### Nup 종류
| Nup | 설명 | 용도 |
|-----|------|------|
| `1++up` | 초대형 | 가장 큰 앨범 (예: 24x36") |
| `1+up` | 대형 | 큰 앨범 (예: 12x18") |
| `1up` | 표준 | 일반 앨범 (예: 8x10") |
| `2up` | 소형 | 작은 앨범 (예: 5x7") |
| `4up` | 초소형 | 가장 작은 앨범 (예: 4x6") |

### Nup 결정 기준 (sq inch 면적 기준)
```typescript
// 시스템 설정에서 관리 (조정 가능)
const NUP_RANGES = {
  '1++up': { minSqInch: 200, maxSqInch: Infinity },  // 200+ sq inch
  '1+up':  { minSqInch: 100, maxSqInch: 200 },       // 100-200 sq inch
  '1up':   { minSqInch: 50,  maxSqInch: 100 },       // 50-100 sq inch
  '2up':   { minSqInch: 25,  maxSqInch: 50 },        // 25-50 sq inch
  '4up':   { minSqInch: 0,   maxSqInch: 25 },        // 0-25 sq inch
};
```

### 자동 등록 로직
```typescript
function calculateNup(widthInch: number, heightInch: number): string {
  const sqInch = widthInch * heightInch;

  if (sqInch >= 200) return '1++up';
  if (sqInch >= 100) return '1+up';
  if (sqInch >= 50) return '1up';
  if (sqInch >= 25) return '2up';
  return '4up';
}
```

### 활성화 조건
- **"앨범" 체크박스가 선택**된 경우에만 Nup이 자동 계산되어 저장됨
- 앨범이 아닌 경우 Nup은 null

### DB 필드
```prisma
model Specification {
  // ... 기존 필드들 ...

  // Nup 설정 (앨범 전용)
  nup         String?   // "1++up" | "1+up" | "1up" | "2up" | "4up" (null if not album)
  nupSqInch   Decimal?  @db.Decimal(10, 2)  // 계산된 면적 (sq inch)
}
```

### 프론트엔드 구현
```typescript
// 규격 등록/수정 시 앨범 체크 onChange
const handleAlbumCheck = (checked: boolean) => {
  setForm(prev => {
    const newForm = { ...prev, forAlbum: checked };

    if (checked && prev.widthInch > 0 && prev.heightInch > 0) {
      // 앨범이 체크되면 Nup 자동 계산
      const sqInch = prev.widthInch * prev.heightInch;
      newForm.nup = calculateNup(prev.widthInch, prev.heightInch);
      newForm.nupSqInch = sqInch;
    } else {
      // 앨범 체크 해제시 Nup 제거
      newForm.nup = null;
      newForm.nupSqInch = null;
    }

    return newForm;
  });
};
```

### 주문 시 활용
앨범 주문 화면에서 규격의 Nup 정보를 표시하여 고객에게 안내:
```
선택한 규격: 8x10" (1up)
※ 1up: 표준 크기 앨범입니다.
```

### 시스템 설정 키
| 키 | 설명 | 기본값 |
|-----|------|--------|
| `nup_1ppup_min_sqinch` | 1++up 최소 면적 | 200 |
| `nup_1pup_min_sqinch` | 1+up 최소 면적 | 100 |
| `nup_1up_min_sqinch` | 1up 최소 면적 | 50 |
| `nup_2up_min_sqinch` | 2up 최소 면적 | 25 |
| `nup_4up_min_sqinch` | 4up 최소 면적 | 0 |
