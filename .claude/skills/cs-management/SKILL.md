---
name: cs-management
description: CS(고객상담) 통합 관리 시스템. 상담 등록/조회, 고객 건강점수, 태그 관리, SLA 설정, 알림, 상담 가이드 작업 시 사용합니다.
---

# CS 통합 관리 스킬

인쇄업 ERP의 고객 상담(CS) 관리 시스템입니다. Zendesk, Salesforce, Intercom 등의 선진 사례를 벤치마킹하여 구현되었습니다.

## 시스템 개요

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CS 통합 관리 시스템 구조                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ 옴니채널    │    │ 상담 관리   │    │ 고객 360°  │    │ 지능형 분석  │  │
│  │ 통합        │───▶│ 티켓 시스템  │───▶│    뷰      │───▶│ 대시보드    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│        │                  │                  │                  │          │
│        ▼                  ▼                  ▼                  ▼          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ 전화/카카오 │    │ 스마트 태깅  │    │ 건강 점수   │    │ SLA 모니터링 │  │
│  │ 웹/이메일   │    │ (AI 자동)   │    │ 이탈 위험   │    │ 알림 시스템  │  │
│  │ 방문        │    │             │    │ 타임라인    │    │ 만족도 조사  │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 데이터베이스 스키마

### 핵심 모델

```prisma
// 상담 분류
model ConsultationCategory {
  id          String   @id @default(cuid())
  code        String   @unique  // claim_quality, claim_delivery, inquiry_price
  name        String             // 품질 클레임, 배송 클레임, 가격 문의
  colorCode   String?            // 분류별 색상 (#FF5722)
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
}

// 상담 내역
model Consultation {
  id              String   @id @default(cuid())
  consultNumber   String   @unique          // CS-20260120-0001

  // 고객/분류
  clientId        String
  categoryId      String

  // 상담 내용
  title           String
  content         String   @db.Text

  // 관련 주문 (선택)
  orderId         String?
  orderNumber     String?

  // 상담자
  counselorId     String
  counselorName   String
  consultedAt     DateTime @default(now())

  // 상태
  status          String   @default("open")    // open, in_progress, resolved, closed
  priority        String   @default("normal")  // low, normal, high, urgent

  // 처리 결과
  resolution      String?  @db.Text
  resolvedAt      DateTime?
  resolvedBy      String?

  // 후속 조치
  followUpDate    DateTime?
  followUpNote    String?  @db.Text

  // 카카오톡 예약전송
  kakaoScheduled  Boolean  @default(false)
  kakaoSendAt     DateTime?
  kakaoMessage    String?  @db.Text

  // 첨부/메모
  attachments     Json?
  internalMemo    String?  @db.Text
}

// 후속 조치 기록
model ConsultationFollowUp {
  id              String   @id @default(cuid())
  consultationId  String
  content         String   @db.Text
  actionType      String   // phone, visit, email, kakao, other
  staffId         String
  staffName       String
}
```

### 고도화 모델

```prisma
// 고객 건강 점수
model CustomerHealthScore {
  id                String   @id @default(cuid())
  clientId          String   @unique

  claimScore        Int      @default(100)     // 클레임 빈도 (높을수록 좋음)
  satisfactionScore Int      @default(100)     // 만족도
  loyaltyScore      Int      @default(100)     // 재주문율
  communicationScore Int     @default(100)     // 응답률

  totalScore        Int      @default(100)     // 가중 평균
  grade             String   @default("A")     // A, B, C, D, F

  isAtRisk          Boolean  @default(false)   // 이탈 위험
  riskReason        String?
}

// 상담 태그 (스마트 태깅)
model ConsultationTag {
  id          String   @id @default(cuid())
  code        String   @unique              // print_quality, binding_defect
  name        String                        // 인쇄 화질, 제본 불량
  colorCode   String?
  category    String   @default("claim")    // claim, inquiry, sales
  isAutoTag   Boolean  @default(false)      // AI 자동 태깅 대상
  keywords    String[] @default([])         // 자동 태깅용 키워드
}

// 상담-태그 매핑
model ConsultationTagMapping {
  id              String   @id @default(cuid())
  consultationId  String
  tagId           String
  isAutoTagged    Boolean  @default(false)  // AI 자동 태깅 여부
  confidence      Decimal?                  // 태깅 신뢰도 (0.00-1.00)
}

// 알림 시스템
model ConsultationAlert {
  id              String   @id @default(cuid())
  clientId        String?
  consultationId  String?
  alertType       String   // repeat_claim, urgent, sla_breach, at_risk
  alertLevel      String   @default("warning")  // info, warning, critical
  title           String
  message         String   @db.Text
  triggerCondition Json?
  isRead          Boolean  @default(false)
  isResolved      Boolean  @default(false)
}

// SLA 설정
model ConsultationSLA {
  id                    String   @id @default(cuid())
  name                  String
  categoryId            String?
  priority              String?
  firstResponseTarget   Int      @default(60)    // 최초 응답 (분)
  resolutionTarget      Int      @default(1440)  // 해결 (분) - 24시간
  escalationTime        Int?                     // 에스컬레이션 (분)
  escalateTo            String?                  // 대상 직원 ID
  warningThreshold      Int      @default(80)    // 경고 임계값 (%)
  criticalThreshold     Int      @default(100)   // 위험 임계값 (%)
}

// 만족도 조사
model ConsultationSurvey {
  id                  String   @id @default(cuid())
  consultationId      String   @unique
  satisfactionScore   Int      // 1-5
  responseSpeedScore  Int?
  resolutionScore     Int?
  friendlinessScore   Int?
  feedback            String?  @db.Text
  wouldRecommend      Boolean?
  surveyMethod        String   @default("email")  // email, kakao, web, phone
}

// 상담 가이드 (Knowledge Base)
model ConsultationGuide {
  id              String   @id @default(cuid())
  categoryId      String?
  tagCodes        String[] @default([])
  title           String
  problem         String   @db.Text
  solution        String   @db.Text
  scripts         Json?    // 상담 스크립트 배열
  usageCount      Int      @default(0)
  helpfulCount    Int      @default(0)
}

// 채널 기록 (옴니채널)
model ConsultationChannel {
  id              String   @id @default(cuid())
  consultationId  String
  channel         String   // phone, kakao, web, email, visit
  direction       String   @default("inbound")  // inbound, outbound
  callDuration    Int?     // 통화 시간 (초)
  callRecordUrl   String?
  metadata        Json?
}
```

## API 엔드포인트

### 기본 상담 API
```
POST   /api/v1/consultations                 # 상담 등록
GET    /api/v1/consultations                 # 상담 목록 (필터링, 페이징)
GET    /api/v1/consultations/:id             # 상담 상세
PUT    /api/v1/consultations/:id             # 상담 수정
DELETE /api/v1/consultations/:id             # 상담 삭제
PATCH  /api/v1/consultations/:id/status      # 상태 변경
PATCH  /api/v1/consultations/:id/resolve     # 해결 처리
POST   /api/v1/consultations/:id/follow-ups  # 후속 조치 추가
```

### CS 고도화 API
```
# 대시보드
GET    /api/v1/cs/dashboard                  # 대시보드 통계

# 태그 관리
GET    /api/v1/cs/tags                       # 태그 목록
POST   /api/v1/cs/tags                       # 태그 생성
PUT    /api/v1/cs/tags/:id                   # 태그 수정
DELETE /api/v1/cs/tags/:id                   # 태그 삭제
POST   /api/v1/cs/consultations/:id/tags     # 상담에 태그 추가
POST   /api/v1/cs/consultations/:id/auto-tag # 자동 태깅

# 알림
GET    /api/v1/cs/alerts                     # 알림 목록
GET    /api/v1/cs/alerts/unread-count        # 읽지 않은 알림 수
PATCH  /api/v1/cs/alerts/:id/read            # 읽음 처리
PATCH  /api/v1/cs/alerts/:id/resolve         # 해결 처리

# SLA
GET    /api/v1/cs/sla                        # SLA 목록
POST   /api/v1/cs/sla                        # SLA 생성
PUT    /api/v1/cs/sla/:id                    # SLA 수정

# 고객 건강 점수
GET    /api/v1/cs/health-scores/:clientId    # 건강 점수 조회
POST   /api/v1/cs/health-scores/:clientId/calculate  # 점수 재계산
GET    /api/v1/cs/health-scores/at-risk      # 이탈 위험 고객

# 만족도 조사
POST   /api/v1/cs/surveys                    # 설문 등록
GET    /api/v1/cs/surveys/stats              # 설문 통계

# 상담 가이드
GET    /api/v1/cs/guides                     # 가이드 목록
POST   /api/v1/cs/guides                     # 가이드 생성
GET    /api/v1/cs/consultations/:id/recommended-guides  # 추천 가이드
POST   /api/v1/cs/guides/:id/use             # 사용 기록
POST   /api/v1/cs/guides/:id/helpful         # 도움됨 표시

# 고객 타임라인
GET    /api/v1/cs/clients/:clientId/timeline # 고객 360° 뷰

# 채널 통계
GET    /api/v1/cs/channels/stats             # 채널별 통계
```

## 상담 상태 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                        상담 상태 흐름                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│   │  접수    │ ─▶ │ 처리중   │ ─▶ │  해결    │ ─▶ │  종료    │ │
│   │ (open)   │    │(in_prog) │    │(resolved)│    │ (closed) │ │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                                 │
│   우선순위: [낮음] [보통] [높음] [긴급]                          │
│   urgent는 자동 알림 발생                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 고객 건강 점수 계산

```typescript
// 건강 점수 계산 로직
async function calculateHealthScore(clientId: string) {
  // 1. 클레임 점수 (최근 90일)
  const claimCount = await countClaims(clientId, 90);
  const claimScore = Math.max(0, 100 - claimCount * 15);

  // 2. 만족도 점수 (최근 설문 평균)
  const avgSatisfaction = await getAvgSatisfaction(clientId);
  const satisfactionScore = avgSatisfaction * 20; // 1-5점 → 0-100점

  // 3. 충성도 점수 (주문 횟수)
  const orderCount = await countOrders(clientId);
  const loyaltyScore = Math.min(100, orderCount * 5);

  // 4. 소통 점수 (응답률)
  const communicationScore = 80; // 기본값

  // 5. 총점 (가중 평균)
  const totalScore = Math.round(
    claimScore * 0.3 +
    satisfactionScore * 0.3 +
    loyaltyScore * 0.2 +
    communicationScore * 0.2
  );

  // 6. 등급 결정
  const grade = totalScore >= 90 ? 'A' :
                totalScore >= 75 ? 'B' :
                totalScore >= 60 ? 'C' :
                totalScore >= 40 ? 'D' : 'F';

  // 7. 위험 플래그
  const isAtRisk = totalScore < 50 || claimScore < 40;

  return { claimScore, satisfactionScore, loyaltyScore,
           communicationScore, totalScore, grade, isAtRisk };
}
```

## 자동 태깅 로직

```typescript
// 키워드 기반 자동 태깅
async function autoTagConsultation(consultationId: string) {
  const consultation = await getConsultation(consultationId);
  const autoTags = await getAutoTags();

  const content = (consultation.title + ' ' + consultation.content).toLowerCase();
  const matchedTags: { tagId: string; confidence: number }[] = [];

  for (const tag of autoTags) {
    const keywords = tag.keywords;
    let matchCount = 0;

    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min(matchCount / keywords.length, 1);
      matchedTags.push({ tagId: tag.id, confidence });
    }
  }

  await createTagMappings(consultationId, matchedTags);
}
```

## 반복 클레임 알림

```typescript
// 30일 내 3회 이상 클레임 시 알림
async function checkRepeatClaims(clientId: string) {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const recentClaims = await countClaims(clientId, {
    since: thirtyDaysAgo,
    categoryPrefix: 'claim'
  });

  if (recentClaims >= 3) {
    await createAlert({
      clientId,
      alertType: 'repeat_claim',
      alertLevel: 'critical',
      title: '반복 클레임 발생',
      message: `${clientName} 고객이 최근 30일 내 ${recentClaims}건의 클레임을 접수했습니다.`,
      triggerCondition: { claimCount: recentClaims, period: '30days' }
    });
  }
}
```

## 프론트엔드 구조

### 페이지 구성
```
/cs                           # CS 대시보드
/cs/consultations             # 상담 목록
/cs/consultations/new         # 상담 등록
/cs/consultations/:id         # 상담 상세
/cs/clients/:id/timeline      # 고객 360° 뷰
/cs/tags                      # 태그 관리
/cs/guides                    # 상담 가이드
/cs/alerts                    # 알림 목록
/cs/settings                  # SLA 설정
```

### CS 대시보드 레이아웃
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CS 통합 관리                                    [날짜 선택] [새로고침]       │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐                    │
│ │ 총 상담    │ │ 처리 대기  │ │ 해결 완료  │ │ 주의 필요  │                   │
│ │   128     │ │    15     │ │   105     │ │    8      │                    │
│ │ 오늘 +5   │ │ 긴급 2건   │ │ 평균 30분  │ │ 이탈위험 3 │                   │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐            │
│ │ 처리 대기 상담               │ │ 알림                         │            │
│ │ ┌───────────────────────┐  │ │ ┌───────────────────────┐   │            │
│ │ │ [긴급] 인쇄 불량 클레임  │  │ │ │ ⚠️ 반복 클레임 - A사    │   │            │
│ │ │ 홍길동 · 품질 클레임     │  │ │ │ 30일 내 3회 클레임...   │   │            │
│ │ └───────────────────────┘  │ │ └───────────────────────┘   │            │
│ │ ┌───────────────────────┐  │ │ ┌───────────────────────┐   │            │
│ │ │ [높음] 배송 지연 문의    │  │ │ │ ⚠️ SLA 위반 임박       │   │            │
│ │ │ 김철수 · 배송 클레임     │  │ │ │ CS-20260121-0003      │   │            │
│ │ └───────────────────────┘  │ │ └───────────────────────┘   │            │
│ └─────────────────────────────┘ └─────────────────────────────┘            │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐            │
│ │ 분류별 현황                  │ │ 이탈 위험 고객                │            │
│ │ ● 품질 클레임     15건      │ │ [F] 홍길동    35점 잦은클레임│            │
│ │ ● 배송 클레임     10건      │ │ [D] 김철수    42점 점수저하  │            │
│ │ ● 가격 문의        8건      │ │ [D] 박영희    45점 잦은클레임│            │
│ │ ● 일반 문의        5건      │ │                              │            │
│ └─────────────────────────────┘ └─────────────────────────────┘            │
├─────────────────────────────────────────────────────────────────────────────┤
│ [상담 등록]  [상담 가이드]  [태그 관리]  [SLA 설정]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 고객 360° 뷰 레이아웃
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← 고객 360° 뷰                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────────────────────────────────────────┐ │
│ │ 고객 정보        │ │ 활동 타임라인                    [전체][상담][주문] │ │
│ │ ┌───┐          │ │                                                     │ │
│ │ │ 홍 │ 홍길동    │ │ ─●─ 12/28 10:30 상담                                │ │
│ │ └───┘ A사진관   │ │     │ [품질클레임] 인쇄 색상 오류 문의               │ │
│ │                 │ │     │ 상태: 처리중 │ 담당: 김상담                    │ │
│ │ 📞 010-1234-5678│ │     └─ [상세보기]                                    │ │
│ │ ✉️ hong@test.com│ │                                                     │ │
│ └─────────────────┘ │ ─●─ 12/25 14:00 주문                                │ │
│ ┌─────────────────┐ │     │ 주문 ORD-2024-001234                          │ │
│ │ 건강 점수        │ │     │ 금액: 150,000원 │ 상태: 배송완료               │ │
│ │ ┌───┐          │ │     └─ [상세보기]                                    │ │
│ │ │ C │ 62점     │ │                                                     │ │
│ │ └───┘          │ │ ─●─ 12/20 09:15 상담                                │ │
│ │ ⚠️ 이탈 위험     │ │     │ [배송클레임] 배송 지연 문의                    │ │
│ │ 잦은 클레임 발생  │ │     │ 상태: 해결 │ 담당: 박상담                     │ │
│ │                 │ │     └─ [상세보기]                                    │ │
│ │ 클레임  ████░░ 40│ │                                                     │ │
│ │ 만족도  ██████░ 70│ │ ─●─ 12/15 11:00 주문                               │ │
│ │ 충성도  ████████ 80│ │     │ 주문 ORD-2024-001200                         │ │
│ │ 소통    ██████░ 60│ │     │ 금액: 80,000원 │ 상태: 배송완료               │ │
│ └─────────────────┘ │     └─ [상세보기]                                    │ │
│ ┌─────────────────┐ │                                                     │ │
│ │ 활동 요약        │ │                                    [< 이전] [다음 >]│ │
│ │ 총 주문   15건   │ └─────────────────────────────────────────────────────┘ │
│ │ 총 상담    8건   │                                                       │
│ │ 클레임     5건   │                                                       │
│ │ 마지막주문 12/25 │                                                       │
│ └─────────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 파일 구조

```
apps/
├── api/src/modules/consultation/
│   ├── controllers/
│   │   ├── consultation.controller.ts
│   │   ├── consultation-category.controller.ts
│   │   └── cs-advanced.controller.ts
│   ├── services/
│   │   ├── consultation.service.ts
│   │   ├── consultation-category.service.ts
│   │   └── cs-advanced.service.ts
│   ├── dto/
│   │   ├── consultation.dto.ts
│   │   ├── consultation-category.dto.ts
│   │   ├── cs-advanced.dto.ts
│   │   └── index.ts
│   └── consultation.module.ts
│
└── web/
    ├── app/(dashboard)/cs/
    │   ├── page.tsx                    # CS 대시보드
    │   ├── consultations/
    │   │   ├── page.tsx                # 상담 목록
    │   │   ├── new/page.tsx            # 상담 등록
    │   │   └── [id]/page.tsx           # 상담 상세
    │   └── clients/[clientId]/timeline/
    │       └── page.tsx                # 고객 360° 뷰
    ├── hooks/
    │   └── use-cs.ts                   # CS API 훅
    └── lib/types/
        └── cs.ts                       # CS 타입 정의
```

## 체크리스트

CS 관리 기능 구현 시 확인사항:

- [x] 상담 CRUD API
- [x] 상담 분류 관리
- [x] 후속 조치 기록
- [x] 스마트 태깅 (키워드 기반)
- [x] 고객 건강 점수
- [x] 이탈 위험 고객 분류
- [x] 알림 시스템
- [x] SLA 설정
- [x] 만족도 조사
- [x] 상담 가이드 (Knowledge Base)
- [x] 옴니채널 기록
- [x] 고객 360° 타임라인
- [x] CS 대시보드
- [ ] AI 감성 분석 (향후)
- [ ] 카카오톡 자동 발송 연동 (향후)
- [ ] 통계 리포트 자동화 (향후)
