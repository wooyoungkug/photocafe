---
name: staff-auth
description: 직원 소셜 로그인 및 권한 관리. OAuth 기반 직원 등록, 승인 워크플로우, 역할 관리 작업 시 사용합니다.
---

# 직원 등록 및 권한 관리 시스템

소셜 로그인(네이버/카카오/구글) 기반 직원 자가 등록 + SUPER_ADMIN 승인 워크플로우

## 가입 프로세스

```
소셜 로그인 → Staff 생성(status=pending) → 회사 이메일 등록
→ SUPER_ADMIN 승인 → status=active, role 부여 → 대시보드 접근
```

1. 소셜 로그인 성공 → Staff 레코드 생성 (status: PENDING, isActive: false)
2. 프론트에서 회사 대표 이메일 입력 → POST /auth/staff/register
3. SUPER_ADMIN이 승인 → status: ACTIVE, isActive: true, role 부여
4. 거절 시 → status: REJECTED

## DB 스키마

### Staff 모델 (확장 필드)

| 필드 | 타입 | 설명 |
|------|------|------|
| oauthProvider | String? | 'naver' / 'kakao' / 'google' |
| oauthId | String? | 소셜 고유 ID |
| companyEmail | String? | 가입 시 입력한 회사 대표 이메일 |
| profileImage | String? | 소셜 프로필 이미지 URL |
| status | String | 'pending' / 'active' / 'rejected' / 'suspended' (default: 'active') |
| role | String | 'super_admin' / 'admin' / 'employee' (default: 'employee') |
| approvedBy | String? | 승인한 관리자 Staff.id |
| approvedAt | DateTime? | 승인 일시 |

- staffId, password는 nullable (OAuth 사용자는 없을 수 있음)
- @@unique([oauthProvider, oauthId]) 복합 유니크

### Company 모델

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String | cuid |
| name | String | 회사명 |
| domain | String @unique | 이메일 도메인 (예: photomi.co.kr) |
| logoUrl | String? | 로고 URL |
| isActive | Boolean | 활성 여부 |

## 역할/상태 enum

### Status
- `pending` — 가입 승인 대기
- `active` — 활성 (정상 이용)
- `rejected` — 가입 거절
- `suspended` — 정지

### Role
- `super_admin` — 최고관리자 (직원 승인/거절/정지, 전체 접근)
- `admin` — 관리자 (전체 주문 조회, 대시보드 접근)
- `employee` — 일반 직원 (본인 주문만 조회)

### 역할별 데이터 접근

| 역할 | 주문 조회 | 직원 관리 | 설정 |
|------|----------|----------|------|
| EMPLOYEE | 본인 userId 주문만 | X | X |
| ADMIN | 전체 주문 | 조회만 | 일부 |
| SUPER_ADMIN | 전체 주문 | 승인/거절/정지/역할변경 | 전체 |

## API 엔드포인트

### 직원 소셜 로그인
```
GET  /auth/staff/naver            → 네이버 OAuth 시작
GET  /auth/staff/naver/callback   → 네이버 콜백
GET  /auth/staff/kakao            → 카카오 OAuth 시작
GET  /auth/staff/kakao/callback   → 카카오 콜백
GET  /auth/staff/google           → 구글 OAuth 시작
GET  /auth/staff/google/callback  → 구글 콜백
POST /auth/staff/register         → 회사 이메일 등록 { companyEmail }
POST /auth/exchange-code          → OAuth 코드 → 토큰 교환 (기존 재사용)
```

### 직원 관리 (SUPER_ADMIN)
```
GET   /staff/pending         → 승인 대기 목록
PATCH /staff/:id/approve     → 승인 { role: 'admin' | 'employee' }
PATCH /staff/:id/reject      → 거절
PATCH /staff/:id/suspend     → 정지
PATCH /staff/:id/role        → 역할 변경 { role }
```

### Guards
- **JwtAuthGuard** — JWT 토큰 검증 (글로벌)
- **StaffOnlyGuard** — type === 'staff' 체크
- validateStaff()에서 status === 'active' 체크 추가

## 프론트엔드 페이지

| 경로 | 설명 |
|------|------|
| `/login` | 통합 로그인 (탭: 소셜 로그인 / ID 로그인) |
| `/auth/staff/callback` | Staff OAuth 코드 교환 |
| `/auth/staff/register` | 회사 이메일 등록 |
| `/auth/staff/pending` | 승인 대기 안내 |
| `/company/employees` | 직원 목록 (상태 필터/배지 추가) |
| `/company/employees/pending` | 승인 대기 목록 (sidebar 메뉴) |

## UI/UX 요구사항

### 로그인 페이지 (/login)
- PhotoCafe 로고 상단
- **탭1 "소셜 로그인"**: 네이버(#03C75A), 카카오(#FEE500), 구글(흰색) 버튼
- **탭2 "ID 로그인"**: 기존 staffId+password 폼
- 하단: "처음 방문이신가요? 소셜 로그인으로 간편 가입"

### 회사 이메일 등록 (/auth/staff/register)
- 타이틀: "소속 회사 확인"
- 안내: "대표자 이메일을 입력하면 승인 후 팀에 합류할 수 있어요"
- 이메일 입력 (Zod 검증) → /auth/staff/pending으로 이동

### 승인 대기 (/auth/staff/pending)
- 시계 아이콘 + "승인을 기다리고 있어요"
- 로그아웃 버튼

### 승인 관리 (/company/employees/pending)
- 테이블: 이름 / 소셜계정 / 이메일 / 가입일 / 액션
- 승인 → 역할 선택 드롭다운 (ADMIN/EMPLOYEE) + confirm 모달
- 거절 → confirm 모달
- 상태 배지: pending=노랑, active=초록, rejected=빨강, suspended=회색

## 주요 파일

### Backend
- `apps/api/prisma/schema.prisma` — Staff 확장, Company 추가
- `apps/api/src/modules/auth/auth.service.ts` — OAuth 직원 검증/승인
- `apps/api/src/modules/auth/auth.controller.ts` — 직원 OAuth 엔드포인트
- `apps/api/src/modules/auth/strategies/staff-naver.strategy.ts`
- `apps/api/src/modules/auth/strategies/staff-kakao.strategy.ts`
- `apps/api/src/modules/auth/strategies/google.strategy.ts`

### Frontend
- `apps/web/app/(admin)/admin-login/page.tsx` → /login 통합
- `apps/web/app/auth/staff/callback/page.tsx`
- `apps/web/app/auth/staff/register/page.tsx`
- `apps/web/app/auth/staff/pending/page.tsx`
- `apps/web/hooks/use-staff-approval.ts`
- `apps/web/stores/auth-store.ts`

## 환경변수

```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:3001/api/v1/auth/staff/google/callback"
STAFF_NAVER_CALLBACK_URL="http://localhost:3001/api/v1/auth/staff/naver/callback"
STAFF_KAKAO_CALLBACK_URL="http://localhost:3001/api/v1/auth/staff/kakao/callback"
```
