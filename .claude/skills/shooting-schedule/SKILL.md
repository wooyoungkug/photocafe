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
