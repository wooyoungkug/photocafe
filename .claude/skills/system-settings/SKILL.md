---
name: system-settings
description: 기초정보 및 시스템 설정 관리. 인쇄비, 택배비, 회사정보, 공정단계 등 시스템 전반의 기본 설정 관리 작업 시 사용합니다.
---

# 기초정보(시스템 설정) 스킬

인쇄업 ERP의 기초정보 및 시스템 설정 관리입니다.

## 설정 카테고리

| 카테고리 | 설명 | 키 접두사 |
|----------|------|----------|
| **printing** | 인쇄비 설정 | `printing_` |
| **shipping** | 택배비 설정 | `shipping_` |
| **company** | 회사정보 | `company_` |
| **process** | 공정단계 설정 | `process_` |
| **system** | 시스템 일반 설정 | `system_` |

## 1. 인쇄비 설정 (printing)

### 인디고 도당(1color) 인쇄비

인디고 출력비 원가계산에 사용되는 기본 인쇄비입니다.

```typescript
// 설정 키
const PRINTING_SETTINGS = {
  // 인디고 1도 인쇄비 (1color당 원가)
  INDIGO_1COLOR_COST: 'printing_indigo_1color_cost',

  // 인디고 추가 도수당 비용 (4도, 6도 계산용)
  INDIGO_ADDITIONAL_COLOR_COST: 'printing_indigo_additional_color_cost',

  // 인디고 기본 세팅비
  INDIGO_SETUP_FEE: 'printing_indigo_setup_fee',

  // 잉크젯 기본 단가 (sqm당)
  INKJET_BASE_COST_PER_SQM: 'printing_inkjet_base_cost_per_sqm',
};
```

### 인디고 원가 계산 공식

```typescript
// 인디고 1도 인쇄비 기반 원가 계산
function calculateIndigoPrintCost(
  oneColorCost: number,  // 1도당 인쇄비 (system_setting에서 조회)
  colorCount: number,    // 도수 (4 또는 6)
  up: number,            // Up 수 (1, 2, 4, 8)
  isDoubleSided: boolean // 양면 여부
): number {
  const baseCost = oneColorCost * colorCount;

  if (isDoubleSided) {
    // 양면: 기본비용 * 2 / up
    return (baseCost * 2) / up;
  } else {
    // 단면: 기본비용 / up
    return baseCost / up;
  }
}
```

## 2. 택배비 설정 (shipping)

### 택배비 설정 항목

| 설정 키 | 설명 | 기본값 |
|---------|------|--------|
| `shipping_standard_fee` | 일반 택배비 | 3,500원 |
| `shipping_island_fee` | 도서산간 택배비 | 6,000원 |
| `shipping_free_threshold` | 무료배송 기준금액 | 50,000원 |
| `shipping_jejudo_included` | 제주도 도서산간 포함 | true |

### 도서산간 지역 정의

```typescript
// 도서산간 지역 (택배사 추가요금 발생 지역)
const ISLAND_MOUNTAIN_AREAS = {
  // 제주도 전체
  jeju: ['제주특별자치도', '제주시', '서귀포시'],

  // 섬 지역
  islands: [
    '울릉군', '옹진군', '강화군', '영흥도', '덕적도',
    '백령도', '대청도', '소청도', '연평도',
    '거제도', '통영', '남해군', '진도군', '완도군',
    '신안군', '흑산도', '홍도', '거문도', '청산도',
  ],

  // 산간 지역 (택배사별 상이)
  mountainAreas: [
    // 각 택배사 정책에 따라 추가
  ],
};

// 도서산간 여부 확인
function isIslandMountainArea(address: string): boolean {
  const allAreas = [
    ...ISLAND_MOUNTAIN_AREAS.jeju,
    ...ISLAND_MOUNTAIN_AREAS.islands,
    ...ISLAND_MOUNTAIN_AREAS.mountainAreas,
  ];
  return allAreas.some(area => address.includes(area));
}
```

### 배송비 계산 로직

```typescript
interface ShippingCalculation {
  address: string;
  orderAmount: number;
}

async function calculateShippingFee(params: ShippingCalculation): Promise<number> {
  const { address, orderAmount } = params;

  // 설정값 조회
  const freeThreshold = await getNumericValue('shipping_free_threshold', 50000);
  const standardFee = await getNumericValue('shipping_standard_fee', 3500);
  const islandFee = await getNumericValue('shipping_island_fee', 6000);

  // 무료배송 조건 확인
  if (orderAmount >= freeThreshold) {
    return 0;
  }

  // 도서산간 여부 확인
  if (isIslandMountainArea(address)) {
    return islandFee;
  }

  return standardFee;
}
```

## 3. 회사정보 설정 (company)

### 회사 기본정보 설정 항목

| 설정 키 | 설명 | 예시 |
|---------|------|------|
| `company_name` | 회사명 | (주)프린팅114 |
| `company_ceo` | 대표자명 | 홍길동 |
| `company_business_number` | 사업자등록번호 | 123-45-67890 |
| `company_business_type` | 업태 | 제조업, 서비스업 |
| `company_business_category` | 종목 | 인쇄, 사진 |
| `company_ecommerce_number` | 통신판매신고번호 | 제2024-서울강남-12345호 |

### 연락처 정보

| 설정 키 | 설명 | 예시 |
|---------|------|------|
| `company_phone` | 대표전화 | 02-1234-5678 |
| `company_fax` | 팩스번호 | 02-1234-5679 |
| `company_email` | 대표이메일 | info@printing114.com |
| `company_cs_phone` | 고객센터 전화 | 1588-1234 |
| `company_cs_hours` | 고객센터 운영시간 | 평일 09:00~18:00 |

### 주소 정보

| 설정 키 | 설명 | 예시 |
|---------|------|------|
| `company_postal_code` | 우편번호 | 06234 |
| `company_address` | 기본주소 | 서울시 강남구 테헤란로 123 |
| `company_address_detail` | 상세주소 | 4층 401호 |
| `company_address_en` | 영문주소 | 123 Teheran-ro, Gangnam-gu, Seoul |

### 서버/도메인 정보

| 설정 키 | 설명 | 예시 |
|---------|------|------|
| `company_domain` | 메인 도메인 | www.printing114.com |
| `company_admin_domain` | 관리자 도메인 | admin.printing114.com |
| `company_api_domain` | API 도메인 | api.printing114.com |
| `company_server_info` | 서버정보 | AWS ap-northeast-2 |
| `company_ssl_expiry` | SSL 만료일 | 2025-12-31 |

### 회사정보 타입 정의

```typescript
interface CompanyInfo {
  // 기본 정보
  name: string;
  ceo: string;
  businessNumber: string;
  businessType: string;
  businessCategory: string;
  ecommerceNumber: string;

  // 연락처
  phone: string;
  fax?: string;
  email: string;
  csPhone?: string;
  csHours?: string;

  // 주소
  postalCode: string;
  address: string;
  addressDetail?: string;
  addressEn?: string;

  // 서버/도메인
  domain: string;
  adminDomain?: string;
  apiDomain?: string;
  serverInfo?: string;
  sslExpiry?: string;
}
```

## 4. 공정단계 설정 (process)

### 공정단계 목록 및 사용 여부

주문 처리 흐름에서 사용할 공정단계를 선택합니다.

```typescript
// 공정단계 정의
const PROCESS_STAGES = {
  // 접수 단계
  RECEPTION_WAITING: { code: 'reception_waiting', name: '접수대기', category: 'reception', order: 1 },
  PAYMENT_WAITING: { code: 'payment_waiting', name: '입금대기', category: 'reception', order: 2 },
  RECEPTION_HOLD: { code: 'reception_hold', name: '접수보류', category: 'reception', order: 3 },
  RECEPTION_COMPLETE: { code: 'reception_complete', name: '접수완료', category: 'reception', order: 4 },

  // 출력 단계
  PRINT_WAITING: { code: 'print_waiting', name: '출력대기', category: 'print', order: 10 },
  PRINT_RECEIVED: { code: 'print_received', name: '출력접수완료', category: 'print', order: 11 },
  PRINTING: { code: 'printing', name: '출력중', category: 'print', order: 12 },
  PRINT_COMPLETE: { code: 'print_complete', name: '출력완료', category: 'print', order: 13 },

  // 제본 단계
  BINDING_WAITING: { code: 'binding_waiting', name: '제본대기', category: 'binding', order: 20 },
  BINDING: { code: 'binding', name: '제본중', category: 'binding', order: 21 },
  BINDING_COMPLETE: { code: 'binding_complete', name: '제본완료', category: 'binding', order: 22 },

  // 액자 단계
  FRAME_WAITING: { code: 'frame_waiting', name: '액자대기', category: 'frame', order: 30 },
  FRAMING: { code: 'framing', name: '액자제작중', category: 'frame', order: 31 },
  FRAME_COMPLETE: { code: 'frame_complete', name: '액자제작완료', category: 'frame', order: 32 },

  // 후가공 단계
  FINISHING_WAITING: { code: 'finishing_waiting', name: '후가공대기', category: 'finishing', order: 40 },
  FINISHING: { code: 'finishing', name: '후가공중', category: 'finishing', order: 41 },
  FINISHING_COMPLETE: { code: 'finishing_complete', name: '후가공완료', category: 'finishing', order: 42 },

  // 검수 단계
  QC_WAITING: { code: 'qc_waiting', name: '검수대기', category: 'qc', order: 50 },
  QC_COMPLETE: { code: 'qc_complete', name: '검수완료', category: 'qc', order: 51 },

  // 배송 단계
  SHIPPING_WAITING: { code: 'shipping_waiting', name: '배송대기', category: 'shipping', order: 60 },
  VISIT_WAITING: { code: 'visit_waiting', name: '방문대기', category: 'shipping', order: 61 },
  QUICK_WAITING: { code: 'quick_waiting', name: '퀵출고대기', category: 'shipping', order: 62 },
  FREIGHT_WAITING: { code: 'freight_waiting', name: '화물출고대기', category: 'shipping', order: 63 },
  SHIPPING: { code: 'shipping', name: '배송중', category: 'shipping', order: 64 },
  DELIVERED: { code: 'delivered', name: '배송완료', category: 'shipping', order: 65 },

  // 완료/취소
  TRANSACTION_COMPLETE: { code: 'transaction_complete', name: '거래완료', category: 'complete', order: 90 },
  ORDER_CANCELLED: { code: 'order_cancelled', name: '주문취소', category: 'complete', order: 91 },
  REFUND_REQUESTED: { code: 'refund_requested', name: '환불요청', category: 'complete', order: 92 },
  REFUND_COMPLETE: { code: 'refund_complete', name: '환불완료', category: 'complete', order: 93 },
} as const;

// 공정단계 카테고리
const PROCESS_CATEGORIES = {
  reception: '접수',
  print: '출력',
  binding: '제본',
  frame: '액자',
  finishing: '후가공',
  qc: '검수',
  shipping: '배송',
  complete: '완료/취소',
};
```

### 공정단계 설정 저장 형식

```typescript
// 시스템 설정 저장 형식
// key: process_enabled_stages
// value: JSON 문자열
interface ProcessStagesConfig {
  enabledStages: string[];  // 활성화된 공정단계 코드 배열
  customStages?: {          // 사용자 정의 공정단계 (선택)
    code: string;
    name: string;
    category: string;
    order: number;
  }[];
}

// 예시
const processConfig: ProcessStagesConfig = {
  enabledStages: [
    'reception_waiting',
    'payment_waiting',
    'reception_complete',
    'print_waiting',
    'printing',
    'print_complete',
    'binding_waiting',
    'binding',
    'binding_complete',
    'shipping_waiting',
    'shipping',
    'delivered',
    'order_complete',
  ],
  customStages: [
    { code: 'lamination_waiting', name: '코팅대기', category: 'finishing', order: 43 },
    { code: 'lamination', name: '코팅중', category: 'finishing', order: 44 },
  ],
};
```

## 데이터베이스 스키마

### SystemSetting 모델

```prisma
model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique  // 설정 키 (예: shipping_standard_fee)
  value     String            // 설정 값
  category  String            // 카테고리 (printing, shipping, company, process, system)
  label     String?           // 표시 라벨
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([category])
  @@map("system_settings")
}
```

## API 엔드포인트

```
# 설정 조회
GET    /api/v1/system-settings                    # 전체 설정 목록
GET    /api/v1/system-settings?category=shipping  # 카테고리별 조회
GET    /api/v1/system-settings/:key               # 특정 설정 조회

# 설정 수정
PUT    /api/v1/system-settings/:key               # 설정 수정/생성 (upsert)
POST   /api/v1/system-settings/bulk               # 일괄 저장
```

## 프론트엔드 UI 구조

### 기초정보 페이지 레이아웃

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 기초정보 설정                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ [회사정보] [인쇄비] [택배비] [공정단계] [시스템]  ← 탭 메뉴               │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 회사 기본정보                                                        │ │
│ │                                                                     │ │
│ │ 회사명        [                              ]                      │ │
│ │ 대표자        [                              ]                      │ │
│ │ 사업자번호    [            -            -            ]              │ │
│ │ 업태          [                              ]                      │ │
│ │ 종목          [                              ]                      │ │
│ │ 통신판매번호  [                              ]                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 연락처 정보                                                          │ │
│ │                                                                     │ │
│ │ 대표전화      [                              ]                      │ │
│ │ 이메일        [                              ]                      │ │
│ │ 도메인        [                              ]                      │ │
│ │ 서버정보      [                              ]                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│                                              [초기화] [저장]             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 인쇄비 설정 탭

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 인쇄비 설정                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 인디고 인쇄비                                                        │ │
│ │                                                                     │ │
│ │ 인디고 1도(1color) 인쇄비   [          ] 원                         │ │
│ │                                                                     │ │
│ │ ※ 인디고 출력비 원가계산에 사용됩니다.                                │ │
│ │ ※ 4도(CMYK) 원가 = 1도 인쇄비 × 4                                   │ │
│ │ ※ 6도(CMYKOG) 원가 = 1도 인쇄비 × 6                                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│                                              [초기화] [저장]             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 택배비 설정 탭

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 택배비 설정                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 기본 택배비                                                          │ │
│ │                                                                     │ │
│ │ 일반 택배비            [         ] 원                               │ │
│ │ 도서산간 택배비        [         ] 원                               │ │
│ │ 무료배송 기준금액      [         ] 원                               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 도서산간 지역 설정                                                    │ │
│ │                                                                     │ │
│ │ ☑ 제주도 전체 포함                                                   │ │
│ │ ☑ 섬 지역 포함 (울릉도, 백령도, 거제도 등)                           │ │
│ │ ☑ 산간 지역 포함 (택배사 추가요금 지역)                              │ │
│ │                                                                     │ │
│ │ ※ 도서산간: 제주도 포함 섬/산간지역 (택배사 추가요금 발생 지역)       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│                                              [초기화] [저장]             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 공정단계 설정 탭

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 공정단계 설정                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ※ 사용할 공정단계를 선택하세요. 선택한 단계만 주문 처리에 표시됩니다.     │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 접수 단계                                                            │ │
│ │ ☑ 접수대기    ☑ 입금대기    ☑ 접수보류    ☑ 접수완료                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 출력 단계                                                            │ │
│ │ ☑ 출력대기    ☑ 출력접수완료    ☑ 출력중    ☑ 출력완료              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 제본 단계                                                            │ │
│ │ ☑ 제본대기    ☑ 제본중    ☑ 제본완료                                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 액자 단계                                                            │ │
│ │ ☑ 액자대기    ☑ 액자제작중    ☑ 액자제작완료                        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 후가공/검수 단계                                                      │ │
│ │ ☐ 후가공대기    ☐ 후가공중    ☐ 후가공완료                          │ │
│ │ ☐ 검수대기      ☐ 검수완료                                          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 배송 단계                                                            │ │
│ │ ☑ 배송대기    ☑ 방문대기    ☑ 퀵출고대기    ☑ 화물출고대기          │ │
│ │ ☑ 배송중      ☑ 배송완료                                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│                                              [초기화] [저장]             │
└─────────────────────────────────────────────────────────────────────────┘
```

## 관련 파일

| 파일 | 역할 |
|------|------|
| `apps/api/src/modules/system-settings/system-settings.service.ts` | 설정 서비스 |
| `apps/api/src/modules/system-settings/system-settings.controller.ts` | 설정 API |
| `apps/api/prisma/schema.prisma` | SystemSetting 모델 |
| `apps/web/app/(dashboard)/settings/page.tsx` | 기초정보 페이지 (생성 필요) |
| `apps/web/hooks/use-system-settings.ts` | 설정 훅 (생성 필요) |

## 체크리스트

기초정보 설정 기능 구현 시 확인사항:

### 인쇄비 설정
- [ ] 인디고 1도 인쇄비 입력/저장
- [ ] 인쇄비 원가계산 연동

### 택배비 설정
- [ ] 일반 택배비 입력/저장
- [ ] 도서산간 택배비 입력/저장
- [ ] 무료배송 기준금액 입력/저장
- [ ] 도서산간 지역 설정 (제주도 포함 여부 등)

### 회사정보
- [ ] 회사 기본정보 입력/저장
- [ ] 연락처 정보 입력/저장
- [ ] 주소 정보 입력/저장
- [ ] 서버/도메인 정보 입력/저장

### 공정단계
- [ ] 공정단계 사용 여부 체크박스
- [ ] 공정단계 활성화/비활성화 저장
- [ ] 주문 처리 화면 연동

### 시스템
- [ ] 설정 페이지 탭 UI 구현
- [ ] 설정 일괄 저장 기능
- [ ] 설정 초기화 기능
