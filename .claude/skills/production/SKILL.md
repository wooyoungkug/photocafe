---
name: production
description: 생산 공정 및 상태 관리. 인쇄, 후가공, 제본, 검수 공정 관리 작업 시 사용합니다.
---

# 생산 관리 스킬

인쇄업 ERP의 생산 공정 및 상태 관리입니다.

## ⭐ 상품별 생산 흐름 (핵심)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        상품별 생산 공정 흐름                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  【출력】 가장 단순한 흐름                                               │
│  ┌──────────┐         ┌──────────┐                                     │
│  │   출력    │ ─────→ │   배송    │                                     │
│  └──────────┘         └──────────┘                                     │
│                                                                         │
│  【앨범】 제본 공정 포함                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                         │
│  │   출력    │ → │   제본    │ → │   배송    │                         │
│  └──────────┘    └──────────┘    └──────────┘                         │
│                                                                         │
│  【액자】 제작 공정 포함                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                         │
│  │   출력    │ → │  제작중   │ → │   배송    │                         │
│  └──────────┘    └──────────┘    └──────────┘                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 상품별 공정 요약

| 상품 유형 | 공정 흐름 | 예상 소요시간 |
|----------|----------|---------------|
| **출력** | 출력 → 배송 | 1~2일 |
| **앨범** | 출력 → 제본 → 배송 | 3~5일 |
| **액자** | 출력 → 제작중 → 배송 | 3~7일 |
| **굿즈** | 출력 → 제작중 → 배송 | 2~5일 |

### 상품별 공정 상세

```typescript
// 상품 유형별 공정 정의
const PRODUCT_PROCESS_FLOW: Record<ProductType, ProcessType[]> = {
  OUTPUT: ['PRINTING', 'SHIPPING'],                        // 출력
  ALBUM: ['PRINTING', 'BINDING', 'SHIPPING'],              // 앨범
  FRAME: ['PRINTING', 'MANUFACTURING', 'SHIPPING'],        // 액자
  GOODS: ['PRINTING', 'MANUFACTURING', 'SHIPPING'],        // 굿즈
};
```

---

## 전체 생산 공정 흐름 (상세)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           생산 공정 흐름도 (상세)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│   │  파일접수  │ → │  출력/인쇄 │ → │   후가공  │ → │   제본    │        │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘        │
│        │               │               │               │              │
│        │               │               │               │              │
│        ▼               ▼               ▼               ▼              │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│   │ 파일검수  │    │ 인쇄검수  │    │후가공검수 │    │ 제본검수  │        │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘        │
│                                                       │              │
│                                                       ▼              │
│                                                 ┌──────────┐         │
│                                                 │ 최종검수  │         │
│                                                 └────┬─────┘         │
│                                                      │               │
│                                                      ▼               │
│                                                 ┌──────────┐         │
│                                                 │  포장    │         │
│                                                 └────┬─────┘         │
│                                                      │               │
│                                                      ▼               │
│                                                 ┌──────────┐         │
│                                                 │  출고    │         │
│                                                 └──────────┘         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 공정별 상세

### 1. 출력/인쇄 공정

| 출력 방식 | 장비 | 특징 | 적용 상품 |
|----------|------|------|-----------|
| HP인디고 | HP Indigo 12000 | 고품질, 소량 | 앨범, 포토북, 고급인쇄물 |
| 잉크젯 | Epson SC-P20000 | 대형, 빠름 | 포스터, 배너, 압축앨범 |
| 옵셋 | 하이델베르그 | 대량, 경제적 | 책자, 리플렛 |

### 2. 후가공 공정

| 후가공 | 설명 | 장비 |
|--------|------|------|
| 코팅 | 유광/무광/소프트터치 | 라미네이터 |
| 박 | 금박/은박/홀로그램 | 박압기 |
| 형압 | 엠보싱/디보싱 | 형압기 |
| 도무송 | 재단/타공 | 도무송기 |
| UV코팅 | 부분UV/전면UV | UV코터 |

### 3. 제본 공정

| 제본 방식 | 설명 | 적용 상품 |
|----------|------|-----------|
| 무선제본 | 접착제 제본 | 책자, 압축앨범 |
| 중철제본 | 스테이플러 | 리플렛, 소책자 |
| 양장제본 | 하드커버 | 고급화보, 포토북 |
| 스프링제본 | 와이어/플라스틱 | 노트, 달력 |
| 떡제본 | 열접착 | 압축앨범 |
| 레이플랫 | 평평하게 펴짐 | 프리미엄 앨범 |

## 데이터베이스 스키마

### Enum 정의

```prisma
enum ProductionStatus {
  QUEUED            // 대기
  IN_PROGRESS       // 진행중
  COMPLETED         // 완료
  ON_HOLD           // 보류
  REJECTED          // 반려 (재작업 필요)
}

enum ProcessType {
  FILE_RECEPTION    // 파일접수
  PRINTING          // 출력/인쇄
  POST_PROCESSING   // 후가공
  BINDING           // 제본 (앨범용)
  MANUFACTURING     // 제작중 (액자, 굿즈용)
  QC                // 검수
  PACKAGING         // 포장
  SHIPPING          // 출고/배송
}
```

### 생산 작업 모델

```prisma
model ProductionJob {
  id              String            @id @default(cuid())

  // 주문 연결
  orderId         String
  order           Order             @relation(fields: [orderId], references: [id])
  orderItemId     String?
  orderItem       OrderItem?        @relation(fields: [orderItemId], references: [id])

  // 작업 정보
  jobNo           String            @unique   // 작업번호
  processType     ProcessType                 // 공정 유형
  status          ProductionStatus  @default(QUEUED)

  // 일정
  scheduledDate   DateTime?                   // 예정일
  startedAt       DateTime?                   // 시작 시간
  completedAt     DateTime?                   // 완료 시간
  dueDate         DateTime?                   // 납기일

  // 작업 상세
  machine         String?                     // 사용 장비
  operator        String?                     // 작업자
  quantity        Int                         // 작업 수량
  completedQty    Int               @default(0)  // 완료 수량
  defectQty       Int               @default(0)  // 불량 수량

  // 옵션 (JSON)
  specifications  Json?                       // 작업 사양

  // 메모
  notes           String?
  issueNotes      String?                     // 문제 발생 시 메모

  // 이력
  history         ProductionHistory[]

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([orderId])
  @@index([status])
  @@index([processType])
  @@index([scheduledDate])
  @@map("production_jobs")
}
```

### 생산 이력 모델

```prisma
model ProductionHistory {
  id              String            @id @default(cuid())
  jobId           String
  job             ProductionJob     @relation(fields: [jobId], references: [id], onDelete: Cascade)

  fromStatus      ProductionStatus?
  toStatus        ProductionStatus
  changedBy       String
  changedAt       DateTime          @default(now())
  notes           String?

  @@map("production_history")
}
```

### 장비 모델

```prisma
model Machine {
  id              String    @id @default(cuid())
  name            String                    // 장비명
  code            String    @unique         // 장비코드
  machineType     String                    // 유형 (printer, laminator, binder...)

  // 상태
  status          MachineStatus @default(AVAILABLE)

  // 정보
  manufacturer    String?                   // 제조사
  model           String?                   // 모델명
  location        String?                   // 위치

  // 작업 가능 여부
  capabilities    String[]                  // ['indigo', 'inkjet', 'coating', ...]

  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("machines")
}

enum MachineStatus {
  AVAILABLE       // 사용가능
  IN_USE          // 사용중
  MAINTENANCE     // 점검중
  OUT_OF_ORDER    // 고장
}
```

## 작업 일정 관리

### 작업 스케줄링

```typescript
interface ScheduleParams {
  orderItemId: string;
  processes: ProcessType[];
  dueDate: DateTime;
}

async function createProductionSchedule(params: ScheduleParams) {
  const { orderItemId, processes, dueDate } = params;

  // 공정별 예상 소요시간 (시간)
  const PROCESS_DURATION: Record<ProcessType, number> = {
    FILE_RECEPTION: 1,
    PRINTING: 4,
    POST_PROCESSING: 2,
    BINDING: 3,
    QC: 1,
    PACKAGING: 1,
    SHIPPING: 0,
  };

  // 납기일에서 역산하여 일정 계산
  let currentDate = dueDate;
  const jobs = [];

  for (const process of processes.reverse()) {
    const duration = PROCESS_DURATION[process];
    const scheduledDate = subHours(currentDate, duration);

    jobs.push({
      orderItemId,
      processType: process,
      scheduledDate,
      dueDate: currentDate,
    });

    currentDate = scheduledDate;
  }

  // DB에 작업 생성
  return prisma.productionJob.createMany({
    data: jobs.reverse(),
  });
}
```

### 작업 배정

```typescript
interface AssignJobParams {
  jobId: string;
  machineId: string;
  operatorId: string;
  scheduledDate: DateTime;
}

async function assignJob(params: AssignJobParams) {
  const { jobId, machineId, operatorId, scheduledDate } = params;

  // 장비 가용성 확인
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
  });

  if (machine.status !== 'AVAILABLE') {
    throw new BadRequestException('장비를 사용할 수 없습니다.');
  }

  // 작업 배정
  return prisma.productionJob.update({
    where: { id: jobId },
    data: {
      machine: machineId,
      operator: operatorId,
      scheduledDate,
      status: 'QUEUED',
    },
  });
}
```

## 공정 상태 변경

```typescript
const PROCESS_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  QUEUED: ['IN_PROGRESS', 'ON_HOLD'],
  IN_PROGRESS: ['COMPLETED', 'ON_HOLD', 'REJECTED'],
  COMPLETED: [],
  ON_HOLD: ['QUEUED', 'IN_PROGRESS'],
  REJECTED: ['QUEUED'],  // 재작업
};

async function updateJobStatus(
  jobId: string,
  newStatus: ProductionStatus,
  userId: string,
  notes?: string
) {
  const job = await prisma.productionJob.findUnique({
    where: { id: jobId },
  });

  if (!PROCESS_TRANSITIONS[job.status]?.includes(newStatus)) {
    throw new BadRequestException('상태 변경 불가');
  }

  const now = new Date();

  return prisma.$transaction([
    prisma.productionJob.update({
      where: { id: jobId },
      data: {
        status: newStatus,
        startedAt: newStatus === 'IN_PROGRESS' ? now : undefined,
        completedAt: newStatus === 'COMPLETED' ? now : undefined,
      },
    }),
    prisma.productionHistory.create({
      data: {
        jobId,
        fromStatus: job.status,
        toStatus: newStatus,
        changedBy: userId,
        notes,
      },
    }),
  ]);
}
```

## API 엔드포인트

```
# 생산 작업
GET    /api/v1/production/jobs                   # 작업 목록
GET    /api/v1/production/jobs/:id               # 작업 상세
POST   /api/v1/production/jobs                   # 작업 생성
PUT    /api/v1/production/jobs/:id               # 작업 수정
PATCH  /api/v1/production/jobs/:id/status        # 상태 변경
PATCH  /api/v1/production/jobs/:id/assign        # 작업 배정

# 스케줄
GET    /api/v1/production/schedule               # 일정 조회 (캘린더)
POST   /api/v1/production/schedule               # 일정 생성
PUT    /api/v1/production/schedule/:id           # 일정 수정

# 장비
GET    /api/v1/production/machines               # 장비 목록
GET    /api/v1/production/machines/:id           # 장비 상세
PATCH  /api/v1/production/machines/:id/status    # 장비 상태 변경

# 대시보드
GET    /api/v1/production/dashboard              # 생산 현황
GET    /api/v1/production/statistics             # 생산 통계
```

## 프론트엔드 - 생산 현황 대시보드

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 생산관리                                              2024-12-28 (토)   │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │   대기      │ │   진행중    │ │   완료      │ │   보류      │        │
│ │     15      │ │      8      │ │     42      │ │      2      │        │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
├─────────────────────────────────────────────────────────────────────────┤
│ 공정별 현황                                                             │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ 출력/인쇄  ████████░░░░░░░░░░░░  8/20                            │   │
│ │ 후가공     ██████░░░░░░░░░░░░░░  6/20                            │   │
│ │ 제본       ████░░░░░░░░░░░░░░░░  4/20                            │   │
│ │ 검수       ██░░░░░░░░░░░░░░░░░░  2/20                            │   │
│ └──────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│ 오늘 작업 목록                                                          │
│ ┌────────┬────────┬────────┬────────┬────────┬────────┬────────┐      │
│ │ 작업번호 │ 주문번호 │  공정   │  장비   │ 작업자  │  상태   │ 예정시간 │      │
│ ├────────┼────────┼────────┼────────┼────────┼────────┼────────┤      │
│ │ J-001  │ORD-001 │ 출력   │Indigo1 │ 김인쇄  │ 진행중  │ 10:00  │      │
│ │ J-002  │ORD-002 │ 후가공  │ 코팅기 │ 박가공  │ 대기   │ 14:00  │      │
│ │ J-003  │ORD-003 │ 제본   │ 무선기 │ 이제본  │ 대기   │ 16:00  │      │
│ └────────┴────────┴────────┴────────┴────────┴────────┴────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

## 체크리스트

생산 관리 기능 구현 시 확인사항:

- [ ] 생산 작업 CRUD
- [ ] 공정별 상태 관리
- [ ] 작업 스케줄링
- [ ] 작업 배정 (장비, 작업자)
- [ ] 장비 관리
- [ ] 생산 현황 대시보드
- [ ] 공정별 진행 현황 표시
- [ ] 작업 이력 관리
- [ ] 불량/재작업 처리
- [ ] 생산 통계 (일별, 공정별, 작업자별)
