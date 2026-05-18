# 출력실 통합 관리 시스템 — 단계별 구축 계획

## Context (왜 만드는가)

현재 문제점:
- 잉크젯 출력 시 담당자가 B2에서 JPG를 수동으로 찾아서 다운로드 → 비효율
- 누가/언제 파일을 다운받아 출력했는지 기록이 없음
- 출력 상태 관리가 print-queue 텍스트 목록에만 있어 직관성 부족

목표:
- **아이디어 3 (Kanban 출력실 앱)** 를 베이스로
- **아이디어 1의 장점 (B2 자동 파일 준비)** + **아이디어 2의 장점 (다운로드 이력 추적)** 통합
- 결과: 출력담당자가 "출력실" 한 화면에서 모든 작업 처리 + 이력 자동 기록

---

## 전체 아키텍처

```
주문 확정
  │
  ├─ [자동] B2 print-ready 폴더 복사 ──── ← Idea 1 장점
  │         photocafe-originals/
  │           print-ready/{YYMMDD}/잉크젯/{orderNum}/*.jpg
  │           print-ready/{YYMMDD}/인디고/{orderNum}/*.jpg  (PDF 생성 전 원본)
  │
  └─ DB: PrintReadyFile 레코드 생성
           printRoomStatus = 'waiting'

출력실 화면 (/print-room) ──────────────── ← Idea 3 베이스 (Kanban)
  ┌──────────┬──────────┬──────────┬──────────┐
  │ 출력대기  │ 파일준비  │  출력중  │  완료    │
  └──────────┴──────────┴──────────┴──────────┘
  각 카드: 주문번호, 스튜디오, 규격, 매수, 방식

  [📥 파일 받기] 클릭 ─────────────────── ← Idea 2 장점 (다운로드 이력)
    → B2에서 ZIP 다운로드
    → PrintDownloadLog DB 기록 (담당자/시각/파일수)
    → 카드 → "출력중" 이동

  [✅ 출력완료] 클릭
    → printRoomStatus = 'done'
    → printRoomDoneAt, printRoomDoneBy 기록
    → 카드 → "완료" 이동
```

---

## DB 스키마 변경

### 1. OrderItem 확장 (기존 모델에 필드 추가)

```prisma
model OrderItem {
  // ... 기존 필드 유지 ...

  // === 출력실 관리 필드 추가 ===
  printRoomStatus     String?    // 'waiting' | 'ready' | 'downloading' | 'printing' | 'done'
  printRoomReadyAt    DateTime?  // B2 print-ready 파일 준비 완료 시각
  printRoomDoneAt     DateTime?  // 출력완료 시각
  printRoomDoneBy     String?    // 출력완료 처리한 Staff.id
  printReadyFiles     PrintReadyFile[]
  printDownloadLogs   PrintDownloadLog[]
}
```

### 2. PrintReadyFile (신규 테이블)

```prisma
// B2에 준비된 출력용 파일 레코드
model PrintReadyFile {
  id            String    @id @default(cuid())
  orderItemId   String
  orderItem     OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  b2Key         String    // "print-ready/260518/잉크젯/ORD-001/photo_01.jpg"
  fileName      String    // 원본 파일명
  fileSize      Int       // 바이트
  printMethod   String    // 'inkjet' | 'indigo'
  preparedAt    DateTime  @default(now())
  downloads     PrintDownloadLog[]

  @@index([orderItemId])
  @@index([printMethod])
  @@map("print_ready_files")
}
```

### 3. PrintDownloadLog (신규 테이블)

```prisma
// 출력 파일 다운로드 이력 (누가/언제/무엇을)
model PrintDownloadLog {
  id                String          @id @default(cuid())
  orderItemId       String
  orderItem         OrderItem       @relation(fields: [orderItemId], references: [id])
  printReadyFileId  String?
  printReadyFile    PrintReadyFile? @relation(fields: [printReadyFileId], references: [id])
  staffId           String
  staff             Staff           @relation(fields: [staffId], references: [id])
  downloadedAt      DateTime        @default(now())
  downloadType      String          // 'zip_download' | 'agent_hotfolder' | 'presigned_url'
  fileCount         Int             // 다운로드한 파일 수
  totalBytes        BigInt          // 다운로드 총 용량
  ipAddress         String?
  userAgent         String?

  @@index([orderItemId])
  @@index([staffId])
  @@index([downloadedAt])
  @@map("print_download_logs")
}
```

> `Staff` 모델에 `printDownloadLogs PrintDownloadLog[]` relation 추가 필요

---

## 단계별 구축 계획

---

### Phase 1 — DB + B2 자동 파일 준비 (1.5일)

**목표**: 주문 확정 시 B2 `print-ready/` 폴더에 자동으로 파일 복사

#### 1-1. Prisma 스키마 변경
- 파일: `apps/api/prisma/schema.prisma`
- OrderItem에 printRoom 필드 5개 추가
- PrintReadyFile 모델 신규 추가
- PrintDownloadLog 모델 신규 추가
- Staff에 relation 추가
- `npx prisma db push` 실행

#### 1-2. B2 파일 준비 서비스 신규 생성
- 파일: `apps/api/src/modules/print-pdf/services/print-ready.service.ts`

```typescript
@Injectable()
export class PrintReadyService {
  // 주문 확정 시 호출: B2에 print-ready 폴더로 복사
  async preparePrintReadyFiles(orderItemId: string): Promise<void> {
    // 1. OrderItem + OrderFile 조회 (inspectionStatus = 'approved')
    // 2. printMethod 확인 (inkjet / indigo)
    // 3. B2 CopyObject: originals/ → print-ready/{YYMMDD}/{method}/{orderNum}/
    //    B2StorageService.copyPrivateObject(srcKey, destKey) 사용
    // 4. PrintReadyFile DB 레코드 생성
    // 5. OrderItem.printRoomStatus = 'ready', printRoomReadyAt = now() 업데이트
  }

  // 다운로드용 ZIP 생성 (B2 파일들을 스트리밍 ZIP)
  async downloadAsZip(orderItemId: string, staffId: string, res: Response): Promise<void> {
    // 1. PrintReadyFile 목록 조회 (orderItemId 기준)
    // 2. 각 파일 B2 presigned URL (TTL 600초) 생성
    // 3. axios로 B2에서 스트리밍 받아 archiver로 ZIP 생성
    // 4. Response에 ZIP 스트리밍
    // 5. PrintDownloadLog 기록 (staffId, orderItemId, fileCount, downloadType='zip_download')
    // 6. OrderItem.printRoomStatus = 'printing' 업데이트
  }
}
```

#### 1-3. 주문 확정 훅 연결
- 파일: `apps/api/src/modules/order/services/order.service.ts`
- 위치: 주문 확정(status → 'confirmed' 또는 검수 완료) 처리 직후
- `this.printReadyService.preparePrintReadyFiles(orderItemId)` 비동기 호출

#### 1-4. B2StorageService에 copyPrivateObject 메서드 추가
- 파일: `apps/api/src/modules/upload/services/b2-storage.service.ts`
- AWS SDK v3 `CopyObjectCommand` 활용 (버킷 내 서버사이드 복사 — 데이터 이동 없음, 무료)

---

### Phase 2 — 출력실 API 모듈 (1일)

**목표**: Kanban 상태 관리 + 다운로드 + 이력 조회 API

#### 2-1. 신규 컨트롤러/서비스

파일 구조:
```
apps/api/src/modules/print-room/
  ├── print-room.module.ts
  ├── print-room.controller.ts
  └── print-room.service.ts
```

#### 2-2. API 엔드포인트

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/print-room/queue` | Kanban 전체 목록 (status별 그룹) |
| PATCH | `/print-room/items/{id}/status` | 카드 상태 변경 (printing→done 등) |
| POST | `/print-room/items/{id}/download` | JPG ZIP 다운로드 + 로그 기록 |
| GET | `/print-room/download-logs` | 다운로드 이력 조회 (날짜/담당자 필터) |
| GET | `/print-room/items/{id}/download-logs` | 특정 주문 이력 조회 |

#### 2-3. getQueue() 응답 구조

```typescript
interface PrintRoomQueueItem {
  orderItemId: string;
  orderNumber: string;
  studioName: string;
  productionNumber: string;
  size: string;           // 예: "8x10"
  pages: number;
  quantity: number;
  printMethod: string;    // 'inkjet' | 'indigo'
  printRoomStatus: string;
  printRoomReadyAt: string | null;
  printRoomDoneAt: string | null;
  printRoomDoneBy: string | null;  // Staff 이름
  fileCount: number;
  totalBytes: number;
  lastDownloadedAt: string | null;  // 마지막 다운로드 시각
  lastDownloadedBy: string | null;  // 마지막 다운로드 담당자
  downloadCount: number;            // 총 다운로드 횟수
}
```

---

### Phase 3 — 출력실 Kanban UI (2.5일)

**목표**: `/print-room` 전용 페이지 (대형 모니터 최적화)

#### 3-1. 파일 구조

```
apps/web/app/(dashboard)/print-room/
  ├── page.tsx                  # 메인 Kanban 페이지
  ├── components/
  │   ├── PrintRoomKanban.tsx   # Kanban 보드 컨테이너
  │   ├── PrintRoomCard.tsx     # 개별 주문 카드
  │   ├── DownloadHistoryPanel.tsx  # 우측 이력 패널
  │   └── PrintRoomFilters.tsx  # 날짜/방식 필터
  └── hooks/
      └── use-print-room.ts     # TanStack Query 훅
```

#### 3-2. Kanban 보드 UI 구성

```
┌─────────────────────────────────────────────────────┐
│  출력실  [날짜: 2026-05-18 ▼]  [잉크젯 | 인디고 | 전체]│
├──────────┬──────────┬──────────┬──────────┬──────────┤
│ 출력대기  │파일준비완료│  출력중  │  완료    │  이력    │
│  (3건)   │  (2건)   │  (1건)   │  (5건)   │          │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │          │
│ │스튜디│ │ │스튜디│ │ │스튜디│ │ │스튜디│ │ 홍길동   │
│ │오A   │ │ │오C   │ │ │오D   │ │ │오E   │ │ 14:23   │
│ │ORD-01│ │ │ORD-03│ │ │ORD-04│ │ │ORD-05│ │ ORD-005 │
│ │8×10  │ │ │5×7   │ │ │8×10  │ │ │5×7   │ │ JPG×12  │
│ │20p×2 │ │ │50p×1 │ │ │30p×3 │ │ │20p×1 │ │         │
│ │잉크젯│ │ │잉크젯│ │ │잉크젯│ │ │잉크젯│ │ 김담당  │
│ │      │ │ │      │ │ │      │ │ │      │ │ 14:15   │
│ │      │ │ │[📥   │ │ │[✅   │ │ │완료  │ │ ORD-004 │
│ │준비중│ │ │다운로│ │ │출력완│ │ │13:45 │ │ JPG×8   │
│ │      │ │ │드]   │ │ │료]   │ │ │홍길동│ │         │
│ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │         │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

#### 3-3. PrintRoomCard 핵심 컴포넌트

```tsx
// 상태별 버튼 렌더링
function PrintRoomCard({ item }: { item: PrintRoomQueueItem }) {
  const { downloadZip, updateStatus } = usePrintRoomActions();

  return (
    <Card className="...">
      {/* 주문 정보 */}
      <div className="text-[14px] font-bold">{item.studioName}</div>
      <div className="text-[14px]">{item.orderNumber}</div>
      <Badge>{item.printMethod === 'inkjet' ? '잉크젯' : '인디고'}</Badge>
      <div>{item.size} / {item.pages}p × {item.quantity}권</div>

      {/* 마지막 다운로드 정보 (Idea 2 장점) */}
      {item.lastDownloadedAt && (
        <div className="text-[12px] text-green-600">
          ✅ {item.lastDownloadedBy} {formatTime(item.lastDownloadedAt)}
          {item.downloadCount > 1 && ` (총 ${item.downloadCount}회)`}
        </div>
      )}

      {/* 상태별 액션 버튼 */}
      {item.printRoomStatus === 'ready' && (
        <Button onClick={() => downloadZip(item.orderItemId)}>
          📥 파일 받기
        </Button>
      )}
      {item.printRoomStatus === 'printing' && (
        <Button onClick={() => updateStatus(item.orderItemId, 'done')}>
          ✅ 출력완료
        </Button>
      )}
    </Card>
  );
}
```

#### 3-4. 다운로드 이력 패널 (DownloadHistoryPanel)

```
이력 패널 표시 내용:
- 담당자 이름
- 시각 (HH:mm)
- 주문번호
- 다운로드한 파일 수
- 용량 (MB)

조회 필터:
- 날짜 선택
- 담당자 필터
- 인쇄 방식 필터
```

#### 3-5. 네비게이션 메뉴 등록
- 파일: `apps/web/app/(dashboard)/layout.tsx` 또는 네비게이션 설정 파일
- "출력실" 메뉴 항목 추가 (`/print-room`)

---

### Phase 4 — 에이전트 핫폴더 자동화 (1일, 선택적)

**목표**: 출력 PC의 에이전트가 B2 print-ready 폴더를 자동 감시하여 파일 자동 다운로드

> 이 단계는 에이전트(localhost:9199)가 있는 환경에서만 동작. 없어도 Phase 1~3이 완전히 작동함.

#### 4-1. 에이전트 API 신규 엔드포인트 (에이전트 앱)
- `POST /poll-print-ready` — ERP API 서버에서 새 print-ready 파일 목록 요청
- `GET /poll-status` — 현재 자동 다운로드 상태 반환

#### 4-2. ERP API 신규 엔드포인트
- `GET /print-room/agent/pending-files` — 에이전트가 아직 받지 않은 print-ready 파일 목록 (agent 전용 인증)
- `POST /print-room/agent/mark-downloaded` — 에이전트가 다운로드 완료 보고 → PrintDownloadLog 기록

#### 4-3. 에이전트 폴링 로직
```
에이전트 30초마다 실행:
  1. GET /print-room/agent/pending-files 호출
  2. 새 파일 있으면:
     a. B2 presigned URL로 파일 다운로드
     b. 로컬 저장경로(설정된 agentSavePath + /잉크젯/ 또는 /인디고/) 에 저장
     c. POST /print-room/agent/mark-downloaded 호출
  3. 없으면 대기
```

#### 4-4. 생산 설정 페이지 업데이트
- 파일: `apps/web/app/(dashboard)/settings/production/page.tsx`
- "핫폴더 자동화" 토글 스위치 추가 (on/off)
- 에이전트가 켜진 경우에만 토글 활성화

---

## 구현 순서 및 일정

| Phase | 작업 | 예상 기간 | 우선순위 |
|-------|------|----------|---------|
| Phase 1 | DB 스키마 + B2 자동 파일 준비 | 1.5일 | 필수 |
| Phase 2 | 출력실 API 모듈 | 1일 | 필수 |
| Phase 3 | Kanban UI (`/print-room`) | 2.5일 | 필수 |
| Phase 4 | 에이전트 핫폴더 자동화 | 1일 | 선택 |
| **합계** | | **6일 (에이전트 포함 7일)** | |

---

## 수정 대상 파일 목록

### 신규 생성
| 파일 | 내용 |
|------|------|
| `apps/api/src/modules/print-room/print-room.module.ts` | 모듈 등록 |
| `apps/api/src/modules/print-room/print-room.controller.ts` | REST API |
| `apps/api/src/modules/print-room/print-room.service.ts` | 비즈니스 로직 |
| `apps/api/src/modules/print-pdf/services/print-ready.service.ts` | B2 파일 준비 |
| `apps/web/app/(dashboard)/print-room/page.tsx` | Kanban 메인 |
| `apps/web/app/(dashboard)/print-room/components/PrintRoomKanban.tsx` | Kanban 보드 |
| `apps/web/app/(dashboard)/print-room/components/PrintRoomCard.tsx` | 개별 카드 |
| `apps/web/app/(dashboard)/print-room/components/DownloadHistoryPanel.tsx` | 이력 패널 |
| `apps/web/app/(dashboard)/print-room/hooks/use-print-room.ts` | TanStack Query 훅 |

### 수정 (기존 파일)
| 파일 | 변경 내용 |
|------|---------|
| `apps/api/prisma/schema.prisma` | OrderItem 필드 추가, 신규 테이블 2개 |
| `apps/api/src/modules/upload/services/b2-storage.service.ts` | copyPrivateObject() 추가 |
| `apps/api/src/modules/order/services/order.service.ts` | 주문확정 훅에 preparePrintReadyFiles() 연결 |
| `apps/api/src/app.module.ts` | PrintRoomModule 등록 |
| `apps/web` 네비게이션 파일 | "출력실" 메뉴 추가 |

---

## 검증 방법

1. **Phase 1 검증**: 테스트 주문 생성 → B2 콘솔에서 `print-ready/` 폴더 파일 확인 → DB `print_ready_files` 레코드 확인
2. **Phase 2 검증**: Swagger(`/api/docs`) → `GET /print-room/queue` 응답 확인
3. **Phase 3 검증**: `/print-room` 접속 → Kanban 4컬럼 표시 → 카드 [📥 파일 받기] 클릭 → ZIP 다운로드 확인 → DB `print_download_logs` 레코드 확인
4. **다운로드 이력**: 이력 패널에서 방금 다운로드한 기록(담당자/시각) 표시 확인
5. **Phase 4 검증**: 에이전트 실행 → B2 print-ready에 파일 추가 → 30초 내 로컬 저장경로에 파일 자동 생성 확인

---

## 기존 기능과의 관계

- 기존 `print-queue` 페이지: **그대로 유지** (인디고 PDF 변환 전용으로 계속 사용)
- 새 `print-room` 페이지: 잉크젯 JPG 출력 + 전체 출력 상태 Kanban 관리 전용
- B2 `print-ready/` 폴더: 출력 완료 후 30일 경과 시 lifecycle 규칙으로 자동 삭제 (B2 설정)
