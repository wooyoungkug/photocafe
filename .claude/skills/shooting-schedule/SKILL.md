---
name: shooting-schedule
description: 촬영일정관리 스킬. 스튜디오 지능형 매칭 및 인트라넷 일정관리 시스템. 촬영 공고, 작가 응찰/매칭, GPS 지오펜싱, 고객 설문, 신뢰도 스코어링 작업 시 사용합니다.
---

# 스튜디오 지능형 매칭 및 인트라넷 일정관리 시스템

네이버 캘린더의 직관적인 UI + 카카오대리의 효율적인 매칭 로직을 결합한 촬영 일정관리 시스템

## 시스템 핵심 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                    촬영 일정 관리 시스템                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │ 인트라넷 캘린더│   │ 스마트 매칭   │   │ 현장 모니터링 │       │
│  │ (레이어 구조) │   │ (응찰 시스템) │   │ (GPS 체크)   │       │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘       │
│         │                  │                  │               │
│         ▼                  ▼                  ▼               │
│  ┌──────────────────────────────────────────────────┐         │
│  │              이메일/알림톡 알림 서비스              │         │
│  └──────────────────────────────────────────────────┘         │
│         │                  │                  │               │
│         ▼                  ▼                  ▼               │
│  ┌──────────────────────────────────────────────────┐         │
│  │           평가 / 통계 / 신뢰도 스코어링            │         │
│  └──────────────────────────────────────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 촬영 매칭 워크플로우

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  일정생성  │ →  │  공고발행  │ →  │  작가응찰  │ →  │  1인확정  │
│  (draft)  │    │(recruiting)│    │ (bidding) │    │(confirmed)│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │                                 │
                     ▼                                 ▼
              ┌──────────┐                      ┌──────────┐
              │ 이메일 발송│                      │확정/거절톡│
              │ (작가그룹)│                      │  자동발송  │
              └──────────┘                      └──────────┘
                                                       │
                    ┌──────────────────────────────────┘
                    ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐
              │ GPS체크인 │ →  │  촬영진행  │ →  │  촬영완료  │
              │(in_progress)│   │           │    │(completed)│
              └──────────┘    └──────────┘    └──────────┘
                                                    │
                                                    ▼
                                              ┌──────────┐
                                              │ 고객설문  │
                                              │ 링크발송  │
                                              └──────────┘
```

## DB 스키마

### ShootingSchedule (촬영 일정)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| scheduleId | String? @unique | 기존 Schedule 연동 |
| clientName | String | 고객명 (신랑/신부) |
| shootingType | String | wedding_main, wedding_rehearsal, baby_dol, baby_growth, profile, etc |
| venueName | String | 장소명 |
| venueAddress | String | 주소 |
| latitude | Float? | 위도 |
| longitude | Float? | 경도 |
| shootingDate | DateTime | 촬영일시 |
| duration | Int? | 예상 소요(분) |
| status | String | draft → recruiting → bidding → confirmed → in_progress → completed → cancelled |
| assignedStaffId | String? | 확정 작가 |
| maxBidders | Int (default: 3) | 최대 응찰자 수 |
| customerPhone | String? | 고객 연락처 |
| customerEmail | String? | 고객 이메일 |
| notes | String? | 메모 |
| createdBy | String | 생성자 |

### ShootingBid (응찰)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| shootingId | String | FK → ShootingSchedule |
| staffId | String | FK → Staff (작가) |
| bidAt | DateTime | 응찰 시각 |
| status | String | pending → selected / rejected |
| message | String? | 응찰 메시지 |

### LocationLog (GPS 위치 로그)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| shootingId | String | FK → ShootingSchedule |
| staffId | String | FK → Staff |
| type | String | arrival, departure, checkpoint |
| latitude | Float | 위도 |
| longitude | Float | 경도 |
| distance | Float? | 촬영지까지 거리(m) |
| isAutomatic | Boolean (true) | GPS 자동 vs 수동 |
| recordedAt | DateTime | 기록 시각 |

### ShootingReview (고객 리뷰)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| shootingId | String @unique | FK → ShootingSchedule |
| staffId | String | 평가 대상 작가 |
| trustScore | Int | 신뢰도 1-5 |
| kindnessScore | Int | 친절도 1-5 |
| skillScore | Int? | 기술력 1-5 |
| overallScore | Float | 종합 (자동계산) |
| comment | String? | 코멘트 |
| reviewerName | String? | 리뷰어 이름 |
| reviewerType | String? | bride, groom, parent |
| reviewToken | String @unique | 설문 링크용 토큰 |
| isCompleted | Boolean (false) | 완료 여부 |

### PhotographerStats (작가 신뢰도 집계)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| staffId | String @unique | FK → Staff |
| totalShootings | Int (0) | 총 촬영 수 |
| completedCount | Int (0) | 완료 수 |
| avgTrustScore | Float (0) | 평균 신뢰도 |
| avgKindnessScore | Float (0) | 평균 친절도 |
| avgOverallScore | Float (0) | 평균 종합 |
| onTimeRate | Float (0) | 정시 도착률 (0~1) |
| lateCount | Int (0) | 지각 횟수 |
| reliabilityIndex | Float (0) | 종합 신뢰도 지수 |
| grade | String ("NEW") | NEW, BRONZE, SILVER, GOLD, PLATINUM |

## API 엔드포인트

### 촬영 일정 CRUD
- `POST /api/v1/shootings` - 촬영 일정 생성
- `GET /api/v1/shootings` - 목록 조회 (필터: 날짜, 유형, 상태)
- `GET /api/v1/shootings/:id` - 상세 조회
- `PATCH /api/v1/shootings/:id` - 수정
- `DELETE /api/v1/shootings/:id` - 삭제
- `PATCH /api/v1/shootings/:id/status` - 상태 변경

### 응찰 (매칭)
- `POST /api/v1/shootings/:id/publish` - 공고 발행 (이메일 발송)
- `POST /api/v1/shootings/:id/bids` - 응찰 (작가)
- `GET /api/v1/shootings/:id/bids` - 응찰자 목록
- `POST /api/v1/shootings/:id/bids/:bidId/select` - 작가 확정
- `POST /api/v1/shootings/:id/bids/:bidId/reject` - 작가 거절

### GPS/위치
- `POST /api/v1/shootings/:id/location` - 위치 체크인/체크아웃
- `GET /api/v1/shootings/:id/location` - 위치 로그 조회

### 리뷰/설문
- `GET /api/v1/reviews/:token` - 설문 페이지 (공개, 토큰 기반)
- `POST /api/v1/reviews/:token` - 설문 제출
- `GET /api/v1/shootings/:id/review` - 리뷰 조회

### 작가 관리
- `GET /api/v1/photographers` - 작가 목록 (신뢰도 포함)
- `GET /api/v1/photographers/:id/stats` - 작가 통계
- `POST /api/v1/photographers/:id/recalculate` - 신뢰도 재계산

## 촬영 유형 (컬러 코딩)

| 유형 | 코드 | 색상 | 설명 |
|------|------|------|------|
| 본식 촬영 | wedding_main | #E11D48 (rose) | 결혼식 당일 촬영 |
| 리허설 촬영 | wedding_rehearsal | #F97316 (orange) | 사전 촬영 |
| 돌 촬영 | baby_dol | #8B5CF6 (violet) | 첫 돌 촬영 |
| 성장앨범 | baby_growth | #06B6D4 (cyan) | 베이비 성장앨범 |
| 프로필 | profile | #10B981 (emerald) | 개인/가족 프로필 |
| 기타 | other | #6B7280 (gray) | 기타 촬영 |

## 촬영 상태

| 상태 | 코드 | 설명 |
|------|------|------|
| 초안 | draft | 일정만 생성 (미공개) |
| 모집중 | recruiting | 작가에게 공고 발송 |
| 응찰중 | bidding | 최대 응찰 인원 도달 |
| 확정 | confirmed | 작가 1인 확정 |
| 진행중 | in_progress | 촬영 현장 (GPS 체크인) |
| 완료 | completed | 촬영 종료 |
| 취소 | cancelled | 일정 취소 |

## 신뢰도 지수 (Reliability Index) 공식

```
RI = (0.40 × 고객만족도) + (0.25 × 정시도착률) + (0.20 × 완수율) + (0.15 × 경력가중치)

각 항목 0~100 정규화:
- 고객만족도: avgOverallScore / 5.0 × 100
- 정시도착률: onTimeRate × 100
- 완수율: completedCount / totalShootings × 100
- 경력가중치: min(totalShootings / 50 × 100, 100)

등급:
- PLATINUM: RI >= 90
- GOLD:     RI >= 75
- SILVER:   RI >= 60
- BRONZE:   RI >= 40
- NEW:      촬영 5건 미만
```

## 알림 템플릿

### 공고 알림 (이메일)
```
제목: [포토미] 촬영 공고 - {shootingType} {shootingDate}
본문:
안녕하세요, {photographerName}님.
새로운 촬영 공고가 등록되었습니다.

■ 촬영 유형: {shootingType}
■ 촬영 일시: {shootingDate}
■ 촬영 장소: {venueName} ({venueAddress})
■ 예상 소요: {duration}분

[응찰하기] → {bidUrl}

현재 {currentBids}/{maxBidders}명 응찰 중
```

### 확정 알림
```
제목: [포토미] 촬영 확정 안내
본문:
{photographerName}님이 아래 촬영에 확정되었습니다.

■ 고객명: {clientName}
■ 일시: {shootingDate}
■ 장소: {venueName}
■ 주소: {venueAddress}

촬영 당일 현장 도착 시 앱에서 체크인해 주세요.
[체크인 페이지] → {checkinUrl}
```

## 프론트엔드 페이지

| 경로 | 용도 | 접근 권한 |
|------|------|-----------|
| /shooting | 촬영 일정 캘린더 (메인) | 관리자 |
| /shooting/[id] | 촬영 상세 (응찰/GPS/리뷰) | 관리자 |
| /shooting/new | 촬영 일정 등록 | 관리자 |
| /shooting/photographers | 작가 관리/랭킹 | 관리자 |
| /review/[token] | 고객 설문 (공개) | 비로그인 |

## GPS 지오펜싱

- Geolocation API: `navigator.geolocation.watchPosition()`
- Haversine 공식으로 거리 계산
- 도착 반경: 200m 이내 → 자동 "도착" 기록
- 이탈 반경: 500m 초과 → 자동 "이탈" 기록
- 업데이트 간격: 30초 (배터리 고려)

## 동시성 처리 (응찰)

PostgreSQL advisory lock으로 동시 응찰 방지:
```typescript
async placeBid(shootingId, staffId) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${shootingId}))`;
    const currentBids = await tx.shootingBid.count({ where: { shootingId, status: 'pending' } });
    if (currentBids >= shooting.maxBidders) throw new BadRequestException('모집 마감');
    return tx.shootingBid.create({ data: { shootingId, staffId } });
  });
}
```

## 체크리스트

- [ ] Prisma 스키마 5개 모델 추가
- [ ] Staff 모델 photographer 필드 확장
- [ ] 촬영 CRUD API + Swagger
- [ ] 응찰 시스템 (트랜잭션 + advisory lock)
- [ ] 이메일 알림 (공고/확정/거절/설문)
- [ ] GPS 지오펜싱 (Geolocation + Haversine)
- [ ] 고객 설문 공개 페이지
- [ ] 신뢰도 스코어링 자동 계산
- [ ] 촬영 캘린더 프론트엔드 (컬러 코딩)
- [ ] 사이드바 메뉴 추가

---

## 구인구직 시스템 (기획 2026-03-01)

### 포토그래퍼 등록 사이트 (공개)

포토그래퍼가 직접 회원가입하여 프로필을 등록하는 공개 사이트.
스튜디오(거래처)에서 아르바이트 채용 시 객관적 평가 기준을 열람할 수 있도록 오픈.

#### 포토그래퍼 프로필 정보

| 항목 | 설명 |
|------|------|
| 기본정보 | 이름, 연락처, 이메일, 프로필사진 |
| 사진 경력 | 총 경력 년수, 주요 이력 (텍스트), 자격증 |
| 포트폴리오 | 대표 작품 이미지 업로드 (최대 20장) |
| 촬영 가능 지역 | 다중 선택 (서울, 경기, 부산 등 시/도 단위) |
| 촬영 유형 전문성 | 본식, 리허설, 돌촬영, 프로필 등 다중 선택 |
| 장비 정보 | 카메라 바디, 렌즈 목록 (선택) |
| 희망 보수 | 촬영 유형별 희망 단가 (원) |

#### 평가 기준 (숨고 스타일)

| 지표 | 산출 방식 | 노출 |
|------|----------|------|
| 고객 별점 | ShootingReview 평균 (1~5점) | ★4.8 형태 |
| 채택 횟수 | ShootingBid.status='selected' 총 건수 | "32회 채택" |
| 응찰 대비 채택률 | selected / total bids × 100 | "채택률 68%" |
| 총 촬영 완료 건수 | ShootingSchedule.status='completed' | "촬영 45건" |
| 정시 도착률 | LocationLog 기반 onTimeRate | "정시율 96%" |
| 신뢰도 지수 | RI 공식 (기존 PhotographerStats) | GOLD 등급 배지 |
| 활동 기간 | 가입일 기준 | "활동 2년" |
| 리뷰 요약 | 최근 리뷰 3건 발췌 | 텍스트 노출 |

#### 스튜디오 소속 개념

```
┌──────────────────────────────────────────────────────────┐
│ 포토그래퍼 ←→ 스튜디오(Client) 소속 관계                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. 포토그래퍼는 1개 이상의 스튜디오에 소속 등록 가능          │
│     (다대다 관계: PhotographerAffiliation 중간테이블)       │
│                                                          │
│  2. 소속 스튜디오 촬영 → 우선 배정 (내구인 대상 자동 포함)    │
│                                                          │
│  3. 비소속 촬영 → 공개구인방에서 직접 응찰                   │
│                                                          │
│  4. 소속 상태: active / inactive / pending(승인대기)        │
│                                                          │
│  5. 스튜디오 관리자가 소속 요청 승인/거절                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### 소속 DB 모델 (신규)

```prisma
model PhotographerProfile {
  id              String   @id @default(cuid())
  staffId         String?  @unique            // 기존 Staff 연동 (선택)
  name            String
  email           String   @unique
  phone           String?
  profileImage    String?
  careerYears     Int      @default(0)        // 경력 년수
  careerHistory   String?                     // 주요 이력 (텍스트)
  certifications  String[]  @default([])      // 자격증
  portfolioImages String[]  @default([])      // 포트폴리오 이미지 URL
  availableAreas  String[]  @default([])      // 촬영 가능 지역
  specialties     String[]  @default([])      // 전문 촬영 유형
  equipment       String?                     // 장비 정보
  introduction    String?                     // 자기소개
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  affiliations    PhotographerAffiliation[]
  stats           PhotographerStats?          // 기존 통계 연동
}

model PhotographerAffiliation {
  id              String   @id @default(cuid())
  photographerId  String                      // FK → PhotographerProfile
  clientId        String                      // FK → Client (스튜디오)
  status          String   @default("pending") // pending | active | inactive
  isPrimary       Boolean  @default(false)     // 주 소속 여부
  joinedAt        DateTime @default(now())
  approvedAt      DateTime?

  photographer    PhotographerProfile @relation(fields: [photographerId], references: [id])
  client          Client              @relation(fields: [clientId], references: [id])

  @@unique([photographerId, clientId])
  @@index([clientId, status])
}
```

### 구인 모드 (촬영 일정 등록 시)

#### 3가지 모드

| 모드 | 코드 | 대상 | 설명 |
|------|------|------|------|
| 내구인 | `private` | 소속 작가 + 지정 작가 | 등록된 포토그래퍼에게만 비공개 공고 |
| 공개구인 | `public` | 전체 | 모든 포토그래퍼에게 공개 |
| 조건부 | `conditional` | 내구인 우선 → 자동 공개 | 기한 내 미확정 시 공개 전환 |

#### ShootingSchedule 확장 필드

```prisma
// 기존 ShootingSchedule에 추가
recruitmentMode    String    @default("public")     // "private" | "public" | "conditional"
recruitmentPhase   String    @default("private")    // 현재 단계: "private" | "public"
privateDeadline    DateTime?                         // 내구인 마감 시각
autoEscalate       Boolean   @default(false)         // 조건부: 자동 공개 전환 여부
invitedStaffIds    String[]  @default([])            // 내구인 초대 작가 ID 목록
budget             Int?                               // 보수(원)
urgencyLevel       String    @default("normal")      // normal | urgent | emergency
```

#### 상태 흐름

```
draft
  ├─→ private_recruiting (내구인/조건부 발행)
  │    ├─→ public_recruiting (자동 전환 or 수동 전환)
  │    │    ├─→ bidding → confirmed → in_progress → completed
  │    │    └─→ cancelled
  │    ├─→ bidding → confirmed → in_progress → completed
  │    └─→ cancelled
  ├─→ public_recruiting (공개구인 발행)
  │    ├─→ bidding → confirmed → in_progress → completed
  │    └─→ cancelled
  └─→ cancelled
```

#### 조건부 자동 전환 (Cron)

- **주기**: 10분마다 (`*/10 * * * *`)
- **조건**: `status=private_recruiting AND autoEscalate=true AND privateDeadline <= now`
- **동작**: `status → public_recruiting`, `recruitmentPhase → public`, 전체 작가 알림 발송
- **구현**: `ShootingSchedulerService` (기존 `RecruitmentSchedulerService` 패턴 재활용)

#### 내구인 작가 선택 화면

```
┌─ 포토그래퍼 선택 ─────────────────────────────────────────┐
│ 검색: [___________]  등급: [전체 ▼]  지역: [전체 ▼]       │
│                                                           │
│ ☑ 김작가  GOLD   ★4.8  채택32회  정시96%  📅가용  [소속]  │
│ ☑ 이작가  SILVER ★4.5  채택18회  정시92%  📅가용  [소속]  │
│ ☐ 박작가  GOLD   ★4.7  채택28회  정시94%  ⚠충돌          │
│ ☐ 최작가  BRONZE ★3.9  채택 8회  정시88%  📅가용          │
│                                                           │
│ ※ [소속] 표시 = 해당 스튜디오 소속 작가 (우선 표시)        │
└───────────────────────────────────────────────────────────┘
```

#### 프론트엔드 페이지 (신규)

| 경로 | 용도 | 접근 |
|------|------|------|
| `/photographer/register` | 포토그래퍼 회원가입 | 공개 |
| `/photographer/profile` | 내 프로필 관리 | 포토그래퍼 로그인 |
| `/photographer/dashboard` | 내 응찰/촬영/리뷰 현황 | 포토그래퍼 로그인 |
| `/photographer/jobs` | 공개구인방 목록 | 포토그래퍼 로그인 |
| `/shooting/photographers` | 작가 목록 (관리자용, 기존) | 관리자 |

#### API 엔드포인트 (신규)

| 엔드포인트 | 설명 |
|------------|------|
| `POST /photographers/register` | 포토그래퍼 회원가입 |
| `GET /photographers/profile` | 내 프로필 조회 |
| `PATCH /photographers/profile` | 프로필 수정 |
| `POST /photographers/affiliations` | 스튜디오 소속 신청 |
| `PATCH /photographers/affiliations/:id` | 소속 승인/거절 (스튜디오) |
| `GET /photographers/available` | 특정 날짜 가용 작가 목록 |
| `POST /shootings/:id/escalate` | 수동 내구인→공개 전환 |
| `GET /shootings/:id/invited` | 내구인 초대 작가 목록 |
| `PATCH /shootings/:id/invited` | 초대 작가 추가/제거 |

### 구현 순서 (Phase)

```
Phase 1 - 포토그래퍼 등록 사이트
├─ PhotographerProfile, PhotographerAffiliation 모델
├─ 회원가입/로그인 (소셜 로그인 연동)
├─ 프로필 CRUD API
├─ 프론트엔드: 등록/프로필/대시보드 페이지

Phase 2 - 구인 모드 통합
├─ ShootingSchedule 스키마 확장 (구인모드 필드)
├─ 상태 전이 규칙 업데이트 (private/public_recruiting)
├─ publish 분기 로직 (내구인/공개/조건부)
├─ ShootingSchedulerService (자동 전환 Cron)

Phase 3 - 프론트엔드 UI
├─ ShootingForm 구인모드 선택 UI
├─ PhotographerSelector 컴포넌트
├─ 공개구인방 페이지
├─ 상세 페이지 구인 단계 표시

Phase 4 - 알림 & 고도화
├─ 내구인/공개 전용 이메일 템플릿
├─ 카카오 알림톡 연동
├─ 마감 임박 알림
├─ 긴급도 자동 계산
```
