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
