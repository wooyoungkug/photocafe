# 미수금 관리 1주일 개발 계획

**목표**: 회계 모듈의 미수금(매출채권) 관리 기능 완성
**기간**: 5일 (Day 1~5)
**난이도**: 중급
**예상 공수**: 40시간

---

## 📁 파일 구조

```
receivables-prompts/
├── README.md                           # 이 파일 (전체 가이드)
├── day1-schema-and-crud.md            # Day 1 프롬프트
├── day2-query-and-frontend.md         # Day 2 프롬프트
├── day3-payment-and-journal.md        # Day 3 프롬프트
├── day4-dashboard-and-reports.md      # Day 4 프롬프트
└── day5-testing-and-documentation.md  # Day 5 프롬프트
```

상위 디렉토리:
- [receivables-1week-plan.md](../receivables-1week-plan.md) - 전체 상세 계획서

---

## 🚀 빠른 시작 가이드

### 1️⃣ 준비 단계
```bash
# 작업 브랜치 생성
cd /c/dev/printing114
git checkout -b feature/receivables-management

# 현재 상태 확인
git status
```

### 2️⃣ 각 Day 진행 방법

1. **해당 일자의 프롬프트 파일 열기**
   - 예: `day1-schema-and-crud.md`

2. **마지막 섹션 "📝 Claude에게 요청할 내용" 복사**
   - 전체 프롬프트를 복사하거나
   - 요약된 요청 내용만 복사

3. **Claude에게 붙여넣기**
   - 새 대화 시작 또는 기존 대화 이어가기

4. **작업 완료 후 커밋**
   ```bash
   git add .
   git commit -m "feat: Day X - [기능명] 완료"
   ```

5. **다음 Day로 진행**

---

## 📅 일자별 작업 요약

### Day 1: DB 스키마 및 기본 CRUD API
**소요 시간**: 6-8시간
**난이도**: ⭐⭐

#### 작업 내용
- ✅ Prisma 스키마 작성 (Receivable, ReceivablePayment, SalesLedger)
- ✅ Backend CRUD API 5개
- ✅ 주문 완료 시 자동 미수금 생성

#### 완료 기준
- `npx prisma db push` 성공
- API 엔드포인트 5개 동작 확인
- Swagger 문서 확인

#### 프롬프트 파일
📄 [day1-schema-and-crud.md](./day1-schema-and-crud.md)

---

### Day 2: 조회 API 및 Frontend 목록
**소요 시간**: 9-11시간
**난이도**: ⭐⭐⭐

#### 작업 내용
- ✅ 거래처별 요약 API
- ✅ Aging 분석 API (30/60/90일)
- ✅ 통계 API
- ✅ Frontend 목록 페이지
- ✅ 4개 컴포넌트 (Table, AgingAnalysis, Filters, KPI)
- ✅ **영업담당자별 집계 기능** (추가)
  - 담당자별 미수금 요약 API
  - 담당자별 수금 실적 API
  - 담당자별 현황 페이지
  - 수금률 분석 및 차트

#### 완료 기준
- Backend API 6개 동작 (기본 3개 + 영업담당자 3개)
- Frontend 페이지 3개 렌더링 (기본 목록 + 담당자 현황 + 담당자 상세)
- 필터 적용 시 데이터 갱신
- 영업담당자별 수금률 표시

#### 프롬프트 파일
📄 [day2-query-and-frontend.md](./day2-query-and-frontend.md)
📄 [day2-sales-staff-features.md](./day2-sales-staff-features.md) ⭐ **영업담당자별 기능**

---

### Day 3: 수금 처리 및 자동 분개
**소요 시간**: 8-10시간
**난이도**: ⭐⭐⭐⭐

#### 작업 내용
- ✅ Account, Journal, JournalEntry 모델
- ✅ JournalService (전표번호 생성, 입금전표 생성)
- ✅ 수금 처리 API (트랜잭션)
- ✅ PaymentModal, PaymentHistory 컴포넌트

#### 완료 기준
- 수금 시 자동 분개 생성 확인 (journals 테이블)
- 미수금 잔액 자동 차감
- Frontend 수금 모달 동작

#### 프롬프트 파일
📄 [day3-payment-and-journal.md](./day3-payment-and-journal.md)

---

### Day 4: 대시보드 및 리포트
**소요 시간**: 7-9시간
**난이도**: ⭐⭐⭐

#### 작업 내용
- ✅ 대시보드 API (KPI, Top 거래처, 월별 추이)
- ✅ 거래처별 채권 명세서 API
- ✅ 수금 예정 일정 API
- ✅ Frontend 대시보드 페이지
- ✅ recharts 차트 2개

#### 완료 기준
- 대시보드 KPI 카드 4개 표시
- 차트 2개 렌더링
- 명세서 조회 성공

#### 프롬프트 파일
📄 [day4-dashboard-and-reports.md](./day4-dashboard-and-reports.md)

---

### Day 5: 테스트 및 문서화
**소요 시간**: 6-8시간
**난이도**: ⭐⭐⭐

#### 작업 내용
- ✅ Unit Tests (Service 레이어)
- ✅ E2E Tests (주요 시나리오)
- ✅ Swagger 문서화
- ✅ README 작성
- ✅ 버그 수정

#### 완료 기준
- `npm test` 통과 (80% 커버리지)
- `npm run test:e2e` 통과
- Swagger 문서 완성

#### 프롬프트 파일
📄 [day5-testing-and-documentation.md](./day5-testing-and-documentation.md)

---

## 📊 기술 스택

### Backend
- **Framework**: NestJS 10
- **ORM**: Prisma 5
- **Database**: PostgreSQL 16
- **Validation**: class-validator
- **Documentation**: Swagger (OpenAPI)
- **Testing**: Jest

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Components**: shadcn/ui
- **Data Fetching**: TanStack Query v5
- **State Management**: Zustand
- **Forms**: react-hook-form + zod
- **Charts**: recharts

---

## 🎯 핵심 기능

| 기능 | 설명 | Day |
|------|------|-----|
| **미수금 자동 생성** | 주문 완료 시 자동으로 미수금 생성 | Day 1 |
| **거래처별 현황** | 거래처별 미수금 집계 및 조회 | Day 2 |
| **Aging 분석** | 30/60/90일 기준 경과일 분석 | Day 2 |
| **영업담당자별 집계** ⭐ | 담당자별 미수금/수금 실적 분석 | Day 2 |
| **수금률 분석** ⭐ | 영업담당자별 수금률 계산 및 평가 | Day 2 |
| **수금 처리** | 입금 등록 및 미수금 차감 | Day 3 |
| **자동 분개** | 수금 시 입금전표 자동 생성 | Day 3 |
| **대시보드** | KPI 카드, 차트, 통계 | Day 4 |
| **채권 명세서** | 거래처별 발생/수금 내역 | Day 4 |

---

## 📋 체크리스트

### Day 1 완료 조건
- [ ] Prisma schema 완성 (3개 모델)
- [ ] `npx prisma db push` 성공
- [ ] Backend API 5개 동작 확인
- [ ] 주문 완료 시 미수금 자동 생성 테스트

### Day 2 완료 조건
- [ ] Backend API 3개 동작 (summary, aging, stats)
- [ ] Frontend 목록 페이지 렌더링
- [ ] Aging 분석 차트 표시
- [ ] 필터 기능 동작

### Day 3 완료 조건
- [ ] Account 시드 데이터 생성
- [ ] 수금 처리 API 동작
- [ ] 자동 분개 생성 확인 (journals 테이블)
- [ ] Frontend 수금 모달 동작

### Day 4 완료 조건
- [ ] 대시보드 페이지 렌더링
- [ ] KPI 카드 4개 표시
- [ ] 차트 2개 렌더링
- [ ] 명세서 조회 성공

### Day 5 완료 조건
- [ ] Unit Tests 통과 (80% 커버리지)
- [ ] E2E Tests 통과
- [ ] Swagger 문서 완성
- [ ] README 작성 완료

---

## 🔧 자주 사용하는 명령어

### Backend
```bash
# Prisma 스키마 적용
cd /c/dev/printing114/apps/api
npx prisma db push

# Prisma Client 재생성
npx prisma generate

# Prisma Studio (DB GUI)
npx prisma studio

# 시드 데이터 실행
npm run db:seed

# 테스트
npm test                    # Unit Tests
npm run test:e2e           # E2E Tests
npm run test:cov           # Coverage

# API 서버 실행
cd /c/dev/printing114
npm run dev
```

### Frontend
```bash
# 개발 서버
cd /c/dev/printing114
npm run dev

# TypeScript 체크
cd apps/web
npx tsc --noEmit

# 빌드
npm run build
```

### Git
```bash
# 상태 확인
git status

# 커밋
git add .
git commit -m "feat: Day X - [기능명] 완료"

# 푸시
git push origin feature/receivables-management
```

---

## ⚠️ 주의사항

### 1. Prisma 관련
- **API 서버가 실행 중이면** `prisma generate` 실패 (DLL 잠김)
  - 해결: API 서버 재시작
- **스키마 변경 전** 반드시 DB 백업
- **금액 타입** 반드시 `Decimal(12, 2)` 사용 (Float 금지)

### 2. 트랜잭션
- 수금 처리는 **반드시 트랜잭션** 내에서 실행
- 실패 시 전체 롤백 확인

### 3. 보안
- 회계 데이터는 **관리자만** 접근 가능
- 모든 API에 `@UseGuards(JwtAuthGuard)` 적용

### 4. 성능
- N+1 쿼리 방지 (`include` 최적화)
- 대용량 데이터는 페이지네이션 필수
- 차트 데이터는 캐싱 활용

### 5. 테스트
- 실제 고객 데이터 **절대 사용 금지**
- 테스트 데이터는 `test-` 접두사 사용

---

## 🆘 트러블슈팅

### 문제: Prisma generate 실패 (EPERM)
```bash
# 원인: API 서버가 실행 중이어서 DLL 파일 잠김
# 해결: API 서버 재시작
Ctrl+C (API 서버 종료)
npm run dev (재시작)
```

### 문제: 차대 균형 불일치
```bash
# 원인: 분개 생성 시 차변/대변 금액 불일치
# 해결: validateBalance 메서드 확인
```

### 문제: 수금액 초과 에러
```bash
# 원인: 수금액 > 잔액
# 해결: Frontend 검증 추가, Backend도 검증
```

### 문제: 모바일에서 테이블 깨짐
```bash
# 원인: 테이블 너비 고정
# 해결: overflow-x-auto 클래스 추가
```

---

## 📚 참고 자료

### 공식 문서
- [Prisma Decimal Type](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#decimal)
- [NestJS Transactions](https://docs.nestjs.com/recipes/prisma#transactions)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [shadcn/ui Table](https://ui.shadcn.com/docs/components/table)
- [recharts Documentation](https://recharts.org/en-US/)

### 프로젝트 문서
- [CLAUDE.md](../../../CLAUDE.md) - 프로젝트 전체 가이드
- [MEMORY.md](../../memory/MEMORY.md) - 프로젝트 패턴 및 학습 내용

---

## 🎯 성공 지표

### 정량적 지표
- ✅ API 엔드포인트 15개 이상
- ✅ Frontend 페이지 3개 이상
- ✅ 컴포넌트 10개 이상
- ✅ 테스트 커버리지 80% 이상
- ✅ Swagger 문서화 100%

### 정성적 지표
- ✅ 주문 완료 시 미수금 자동 생성 100%
- ✅ 수금 처리 시 자동 분개 생성 100%
- ✅ Aging 분석 정확도 100%
- ✅ 대시보드 로딩 시간 < 2초
- ✅ 직관적이고 사용하기 쉬운 UI

---

## 📞 문의 및 지원

- **이슈**: GitHub Issues
- **질문**: Claude Code 대화
- **긴급**: 개발팀 Slack

---

**Last Updated**: 2026-02-13
**Version**: 1.0.0
**Author**: Claude Code Assistant
