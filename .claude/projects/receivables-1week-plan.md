# 미수금 관리 1주일 개발 계획

**목표**: 회계 모듈의 미수금(매출채권) 관리 기능 완성
**기간**: 5일 (Day 1~5)
**현재 상태**: 기본 스키마 및 일부 파일 작업 중

---

## 📅 Day 1: DB 스키마 완성 + 기본 CRUD API

### 목표
- Prisma 스키마 완성 (Receivable, SalesLedger 관련)
- 기본 CRUD API 구현
- 매출 발생 시 자동 미수금 생성 로직

### 작업 항목
1. **DB 스키마 완성**
   - ✅ Receivable 모델 (미수금)
   - ✅ ReceivablePayment 모델 (수금 이력)
   - ✅ SalesLedger 모델 (매출원장)
   - Client 모델에 미수금 관계 추가

2. **Backend API**
   - `POST /api/v1/accounting/receivables` - 미수금 생성
   - `GET /api/v1/accounting/receivables` - 미수금 목록 조회
   - `GET /api/v1/accounting/receivables/:id` - 미수금 상세
   - `PUT /api/v1/accounting/receivables/:id` - 미수금 수정

3. **자동 생성 로직**
   - 주문 완료 시 자동 미수금 생성 훅
   - 매출원장 자동 기록

### 💬 Day 1 프롬프트

```
# 미수금 관리 - Day 1: DB 스키마 및 기본 API 구현

## 요구사항

1. Prisma 스키마 완성
   - Receivable 모델: 미수금 기본 정보 (거래처, 원금, 잔액, 발생일, 수금예정일)
   - ReceivablePayment 모델: 수금 이력 (수금액, 수금일, 수금방법)
   - SalesLedger 모델: 매출원장 (주문별 매출 기록)
   - Client 모델에 receivables 관계 추가

2. NestJS API 구현 (apps/api/src/modules/accounting/)
   - receivables.controller.ts
   - receivables.service.ts
   - DTO: create-receivable.dto.ts, update-receivable.dto.ts

3. 기본 CRUD 엔드포인트
   - POST /api/v1/accounting/receivables (미수금 생성)
   - GET /api/v1/accounting/receivables (목록 조회, 필터: 거래처, 기간, 상태)
   - GET /api/v1/accounting/receivables/:id (상세)
   - PUT /api/v1/accounting/receivables/:id (수정)

4. 주문 완료 시 자동 미수금 생성
   - OrderService에서 주문 완료 시 ReceivableService 호출
   - 주문 금액만큼 미수금 자동 생성
   - 발생일 = 주문 완료일, 수금예정일 = 발생일 + 30일

## 제약사항
- 스키마 변경 시 기존 데이터 호환성 유지
- 에러 처리 필수 (거래처 없음, 중복 생성 방지)
- 모든 금액은 Decimal(12,2) 사용

## 완료 조건
- Prisma schema 완성 및 db push 성공
- API 엔드포인트 4개 동작 확인
- 주문 완료 시 미수금 자동 생성 테스트 성공
```

### 예상 산출물
- ✅ schema.prisma 업데이트
- ✅ receivables.controller.ts
- ✅ receivables.service.ts
- ✅ DTOs (create, update)
- ✅ 주문-미수금 연동 로직

---

## 📅 Day 2: 미수금 조회 + Aging 분석 API + Frontend 목록 + 영업담당자별 집계

### 목표
- 거래처별 미수금 현황 조회 API
- Aging 분석 API (30/60/90일 기준)
- Frontend 미수금 목록 페이지 구현
- **영업담당자별 집계 및 수금 실적 분석** (추가)

### 작업 항목
1. **Backend API (조회 기능 강화)**
   - `GET /api/v1/accounting/receivables/summary` - 거래처별 미수금 집계
   - `GET /api/v1/accounting/receivables/aging` - Aging 분석 (30/60/90일)
   - `GET /api/v1/accounting/receivables/stats` - 통계 (총 미수금, 평균 회수기간)
   - **`GET /api/v1/accounting/receivables/summary-by-staff`** - 영업담당자별 미수금 요약
   - **`GET /api/v1/accounting/receivables/collection-by-staff`** - 영업담당자별 수금 실적
   - **`GET /api/v1/accounting/receivables/by-staff/:staffId`** - 담당자별 상세 목록

2. **Frontend (apps/web/app/(dashboard)/accounting/receivables/)**
   - page.tsx - 미수금 목록 페이지
   - components/ReceivablesTable.tsx - 미수금 테이블
   - components/AgingChart.tsx - Aging 차트
   - hooks/use-receivables.ts - TanStack Query 훅
   - **by-staff/page.tsx** - 영업담당자별 현황 페이지
   - **by-staff/[staffId]/page.tsx** - 담당자별 상세 페이지
   - **components/StaffSummaryTable.tsx** - 담당자별 요약 테이블
   - **components/CollectionByStaffChart.tsx** - 수금 실적 차트

3. **UI 컴포넌트**
   - 기간 필터 (DateRangePicker)
   - 거래처 필터 (Select)
   - 상태 필터 (전체/미수/완료)
   - 페이지네이션
   - **영업담당자 필터** (Select)
   - **수금률 Badge** (80% 이상 녹색, 미만 빨간색)

### 💬 Day 2 프롬프트

```
# 미수금 관리 - Day 2: 조회 API 및 Frontend 목록 구현

## 요구사항

1. Backend API 추가 (apps/api/src/modules/accounting/receivables/)

   A. 거래처별 미수금 요약 (GET /receivables/summary)
      - 거래처별 총 발생액, 수금액, 잔액 집계
      - 필터: 기간(startDate, endDate), 거래처ID(clientId)
      - 정렬: 잔액 많은 순

   B. Aging 분석 (GET /receivables/aging)
      - 기준일 기준으로 경과일 계산
      - 구간: 30일 이내, 31-60일, 61-90일, 90일 초과
      - 각 구간별 건수, 금액 집계

   C. 통계 (GET /receivables/stats)
      - 총 미수금액
      - 평균 회수기간
      - 가장 큰 미수 거래처 Top 5

2. Frontend 구현 (apps/web/app/(dashboard)/accounting/receivables/)

   A. page.tsx
      - 미수금 목록 페이지 레이아웃
      - 필터 영역 (기간, 거래처, 상태)
      - 통계 카드 (총 미수금, 거래처 수)

   B. components/ReceivablesTable.tsx
      - 테이블 컬럼: 거래처, 발생일, 원금, 수금액, 잔액, 수금예정일, 경과일, 상태
      - 행 클릭 시 상세 모달
      - 정렬, 페이지네이션

   C. components/AgingAnalysis.tsx
      - Aging 구간별 카드 표시
      - 차트 (바 차트 또는 도넛 차트)

   D. hooks/use-receivables.ts
      - useReceivables (목록)
      - useReceivablesSummary (요약)
      - useReceivablesAging (Aging)
      - useReceivablesStats (통계)

3. TanStack Query 설정
   - query key: ['receivables', filters]
   - 자동 refetch 설정
   - optimistic update 준비

## UI 요구사항
- shadcn/ui 컴포넌트 사용 (Table, Card, DateRangePicker, Select)
- 반응형 레이아웃 (모바일 지원)
- 로딩 상태, 에러 상태 처리
- 미수금 잔액 > 0 인 경우 강조 표시

## 완료 조건
- 3개 API 엔드포인트 동작 확인
- 미수금 목록 페이지에서 데이터 조회 성공
- Aging 분석 차트 렌더링 성공
- 필터 적용 시 실시간 반영
```

### 예상 산출물
- ✅ receivables.controller.ts (summary, aging, stats 추가)
- ✅ receivables.service.ts (집계 로직)
- ✅ page.tsx
- ✅ ReceivablesTable.tsx
- ✅ AgingAnalysis.tsx
- ✅ use-receivables.ts

---

## 📅 Day 3: 수금 처리 + 자동 분개

### 목표
- 수금 처리 기능 (입금 등록)
- 자동 분개 생성 (입금전표)
- 미수금 잔액 자동 차감

### 작업 항목
1. **Backend API**
   - `POST /api/v1/accounting/receivables/:id/payment` - 수금 처리
   - `GET /api/v1/accounting/receivables/:id/payments` - 수금 이력 조회
   - 자동 분개: 입금 시 차변(현금/예금), 대변(외상매출금)

2. **분개 자동화**
   - Journal 모델 연동
   - 전표번호 자동 생성 (V-YYYY-NNNNNN)
   - 차대 균형 검증

3. **Frontend**
   - 수금 등록 모달 (PaymentModal.tsx)
   - 수금 이력 테이블 (PaymentHistory.tsx)

### 💬 Day 3 프롬프트

```
# 미수금 관리 - Day 3: 수금 처리 및 자동 분개 구현

## 요구사항

1. Backend - 수금 처리 API

   A. POST /api/v1/accounting/receivables/:id/payment
      - 요청 DTO: { amount, paymentDate, paymentMethod, description }
      - paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD'
      - 수금액 검증: amount <= receivable.balance
      - ReceivablePayment 생성
      - Receivable.paidAmount 증가, balance 감소
      - 자동 분개 생성 (입금전표)

   B. GET /api/v1/accounting/receivables/:id/payments
      - 특정 미수금의 수금 이력 조회
      - 정렬: 최신순

2. 자동 분개 로직 (JournalService)

   - 전표번호 생성: generateVoucherNo()
     - 형식: V-YYYY-NNNNNN (예: V-2024-000001)
     - 연도별 순번 자동 증가

   - 입금전표 생성: createReceiptJournal()
     - voucherType: 'RECEIPT'
     - 차변: 현금(CASH) 또는 보통예금(BANK_DEPOSIT)
     - 대변: 외상매출금(ACCOUNTS_RECEIVABLE)
     - 금액 일치 검증

   - Transaction 처리
     - 수금 등록 + 분개 생성을 하나의 트랜잭션으로

3. Frontend 컴포넌트

   A. components/PaymentModal.tsx
      - 수금 등록 폼
      - 필드: 수금액, 수금일, 수금방법, 비고
      - 잔액 표시 및 초과 입력 방지
      - 제출 시 mutation 호출

   B. components/PaymentHistory.tsx
      - 수금 이력 테이블
      - 컬럼: 수금일, 수금액, 수금방법, 비고
      - 총 수금액 표시

   C. hooks/use-payment-mutation.ts
      - useCreatePayment (수금 등록)
      - optimistic update
      - 성공 시 receivables 목록 refetch

4. 계정과목 설정
   - Account 모델에 기본 계정 시드 데이터 추가
   - 필수 계정: CASH, BANK_DEPOSIT, ACCOUNTS_RECEIVABLE, SALES

## 제약사항
- 수금액 > 잔액인 경우 에러 반환
- 분개 생성 실패 시 수금 rollback (트랜잭션)
- 수금일은 발생일보다 이전일 수 없음

## 완료 조건
- 수금 등록 API 동작 확인
- 수금 시 자동 분개 생성 확인 (journals 테이블)
- 미수금 잔액 자동 차감 확인
- Frontend 수금 모달에서 등록 성공
```

### 예상 산출물
- ✅ receivables.service.ts (payment 로직)
- ✅ journal.service.ts (자동 분개)
- ✅ PaymentModal.tsx
- ✅ PaymentHistory.tsx
- ✅ use-payment-mutation.ts
- ✅ Account 시드 데이터

---

## 📅 Day 4: 대시보드 + 통계 리포트

### 목표
- 미수금 대시보드 구현
- 거래처별 채권 명세서
- 수금 예정 캘린더

### 작업 항목
1. **Backend API**
   - `GET /api/v1/accounting/dashboard/receivables` - 대시보드 데이터
   - `GET /api/v1/accounting/reports/receivable-statement/:clientId` - 거래처별 명세서
   - `GET /api/v1/accounting/receivables/due-schedule` - 수금 예정 일정

2. **Frontend Dashboard**
   - KPI 카드 (총 미수금, 금주 수금액, 연체 건수)
   - 거래처별 미수금 Top 10 차트
   - 월별 수금 추이 그래프
   - 수금 예정 캘린더

3. **리포트 페이지**
   - 거래처별 채권 명세서 출력
   - PDF 다운로드 기능

### 💬 Day 4 프롬프트

```
# 미수금 관리 - Day 4: 대시보드 및 리포트 구현

## 요구사항

1. Backend API

   A. GET /api/v1/accounting/dashboard/receivables
      - 총 미수금액 (전체, 30일 이내, 연체)
      - 금주 수금액
      - 금월 수금액
      - 연체 건수 (수금예정일 초과)
      - 거래처별 미수금 Top 10
      - 월별 수금 추이 (최근 12개월)

   B. GET /api/v1/accounting/reports/receivable-statement/:clientId
      - 거래처별 채권 명세서
      - 기간 필터 (startDate, endDate)
      - 발생 내역, 수금 내역, 잔액
      - 기초잔액, 당월발생, 당월수금, 기말잔액

   C. GET /api/v1/accounting/receivables/due-schedule
      - 수금 예정 일정 (달력용)
      - 필터: 연월 (year, month)
      - 일자별 수금 예정액 집계

2. Frontend - Dashboard

   A. app/(dashboard)/accounting/dashboard/page.tsx
      - 대시보드 메인 페이지

   B. components/ReceivablesKPI.tsx
      - KPI 카드 그리드
      - 카드: 총 미수금, 금주 수금액, 연체 건수, 거래처 수
      - 전월 대비 증감 표시

   C. components/TopClientsChart.tsx
      - 거래처별 미수금 Top 10
      - 바 차트 (recharts 사용)

   D. components/MonthlyCollectionChart.tsx
      - 월별 수금 추이 (최근 12개월)
      - 라인 차트

   E. components/DueCalendar.tsx
      - 수금 예정 캘린더
      - 일자별 예정액 표시
      - 클릭 시 해당 일자 미수금 목록 모달

3. Frontend - 리포트

   A. app/(dashboard)/accounting/reports/receivable-statement/[clientId]/page.tsx
      - 거래처별 채권 명세서 페이지
      - 기간 선택 (월별)
      - 발생/수금 내역 테이블
      - 인쇄/PDF 다운로드 버튼

   B. components/StatementTable.tsx
      - 명세서 테이블
      - 컬럼: 일자, 적요, 발생액, 수금액, 잔액

## UI 요구사항
- 대시보드는 Grid 레이아웃 (3-4 columns)
- 차트 라이브러리: recharts
- 캘린더: react-big-calendar 또는 shadcn calendar
- 반응형 (모바일에서 1 column)

## 완료 조건
- 대시보드 페이지 렌더링 성공
- KPI 카드 실시간 데이터 표시
- 차트 2개 이상 정상 표시
- 거래처별 명세서 조회 성공
```

### 예상 산출물
- ✅ dashboard.controller.ts
- ✅ reports.controller.ts
- ✅ app/(dashboard)/accounting/dashboard/page.tsx
- ✅ ReceivablesKPI.tsx
- ✅ TopClientsChart.tsx
- ✅ MonthlyCollectionChart.tsx
- ✅ DueCalendar.tsx
- ✅ receivable-statement/[clientId]/page.tsx

---

## 📅 Day 5: 테스트 + 버그 수정 + 문서화

### 목표
- 전체 기능 통합 테스트
- 버그 수정 및 최적화
- API 문서 및 사용 가이드 작성

### 작업 항목
1. **Backend 테스트**
   - Unit Test (Service 레이어)
   - Integration Test (Controller)
   - E2E Test (주문→미수금→수금 전체 흐름)

2. **Frontend 테스트**
   - 사용자 시나리오 테스트
   - 엣지 케이스 처리
   - 성능 최적화

3. **문서화**
   - API 문서 (Swagger)
   - 사용자 가이드
   - 개발자 문서

### 💬 Day 5 프롬프트

```
# 미수금 관리 - Day 5: 테스트, 버그 수정, 문서화

## 요구사항

1. Backend 테스트

   A. Unit Tests (*.spec.ts)
      - receivables.service.spec.ts
        - 미수금 생성 테스트
        - 수금 처리 테스트
        - Aging 계산 테스트

      - journal.service.spec.ts
        - 전표번호 생성 테스트
        - 입금전표 생성 테스트
        - 차대 균형 검증 테스트

   B. Integration Tests
      - receivables.controller.spec.ts
        - API 엔드포인트 전체 테스트
        - 인증/권한 테스트

   C. E2E Test
      - 시나리오: 주문 생성 → 미수금 자동 생성 → 수금 처리 → 잔액 확인
      - 시나리오: 부분 수금 → 잔액 확인 → 추가 수금 → 완납

2. Frontend 테스트

   A. 사용자 시나리오
      - [ ] 미수금 목록 조회 (필터 적용)
      - [ ] Aging 분석 차트 확인
      - [ ] 수금 등록 (전액/부분)
      - [ ] 수금 이력 확인
      - [ ] 대시보드 KPI 확인
      - [ ] 거래처별 명세서 조회

   B. 엣지 케이스
      - 수금액 > 잔액 입력 시 에러 메시지
      - 잔액 0원인 미수금 필터링
      - 거래처 삭제 시 미수금 처리
      - 동시 수금 요청 (Race condition)

   C. 성능 최적화
      - 대용량 데이터 페이지네이션 (1000+ 건)
      - Query 최적화 (N+1 문제 해결)
      - 캐싱 전략 (TanStack Query)

3. 버그 수정 체크리스트
   - [ ] 금액 계산 오류 (소수점 처리)
   - [ ] 날짜 필터 범위 오류
   - [ ] 권한 체크 누락
   - [ ] 트랜잭션 롤백 미처리
   - [ ] UI 깨짐 (모바일)

4. 문서화

   A. API 문서 (Swagger)
      - 모든 엔드포인트 @ApiOperation 추가
      - DTO에 @ApiProperty 추가
      - 예시 요청/응답 추가

   B. README.md
      - 미수금 관리 기능 개요
      - 주요 API 사용 예시
      - 데이터베이스 스키마 다이어그램

   C. 사용자 가이드 (선택)
      - 미수금 등록 방법
      - 수금 처리 방법
      - Aging 분석 해석 방법

## 테스트 커버리지 목표
- Service: 80% 이상
- Controller: 70% 이상

## 완료 조건
- 모든 테스트 통과 (npm test)
- 주요 버그 0건
- Swagger 문서 완성
- README 작성 완료
```

### 예상 산출물
- ✅ *.spec.ts (테스트 파일)
- ✅ 버그 수정 커밋
- ✅ Swagger 문서
- ✅ README.md

---

## 📊 주차별 마일스톤

| Day | 핵심 기능 | 완료 기준 |
|-----|----------|-----------|
| **Day 1** | DB + CRUD API | 미수금 생성/조회 API 동작 |
| **Day 2** | 조회 + Aging | Frontend 목록 페이지 렌더링 |
| **Day 3** | 수금 처리 + 분개 | 수금 시 자동 분개 생성 확인 |
| **Day 4** | 대시보드 + 리포트 | 대시보드 KPI 표시 |
| **Day 5** | 테스트 + 문서화 | 모든 테스트 통과 |

---

## 🚀 빠른 시작 가이드

### Day 1 시작하기
```bash
# 1. 브랜치 생성
git checkout -b feature/receivables-management

# 2. 스키마 작업
cd apps/api
code prisma/schema.prisma

# 3. Claude에게 Day 1 프롬프트 입력
# (위의 Day 1 프롬프트 복사하여 붙여넣기)
```

### 각 Day 종료 시
```bash
# 1. 변경사항 커밋
git add .
git commit -m "feat: Day X - [기능명] 완료"

# 2. 다음 날 작업 준비
# Claude에게 다음 Day 프롬프트 입력
```

---

## ⚠️ 주의사항

1. **스키마 변경 시**: 기존 데이터 백업 필수
2. **트랜잭션**: 수금 처리는 반드시 트랜잭션 내에서 실행
3. **권한**: 회계 데이터는 관리자만 접근 가능하도록 설정
4. **금액 타입**: 모두 Decimal(12,2) 사용 (floating point 오류 방지)
5. **테스트 데이터**: 실제 고객 데이터 절대 사용 금지

---

## 📚 참고 자료

- [Prisma Decimal 타입](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#decimal)
- [NestJS Transaction](https://docs.nestjs.com/recipes/prisma#transactions)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [shadcn/ui Table](https://ui.shadcn.com/docs/components/table)
- [recharts Documentation](https://recharts.org/en-US/)

---

## 🎯 성공 지표

- ✅ 주문 완료 시 미수금 자동 생성 100%
- ✅ 수금 처리 시 자동 분개 생성 100%
- ✅ Aging 분석 정확도 100%
- ✅ 대시보드 로딩 시간 < 2초
- ✅ 사용자 만족도 (직관적인 UI)
