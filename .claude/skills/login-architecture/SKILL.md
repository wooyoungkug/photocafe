---
name: login-architecture
description: 4종 로그인(Staff/Client/Employee/Branch) 구조와 대리로그인(impersonation), 세션 동시 유지 규칙. 인증 흐름 변경·디버깅·세션 분리 작업 시 사용합니다.
---

# 로그인 아키텍처 — 4종 주체 + 대리로그인 + 동시 세션

Photocafe ERP의 모든 인증 작업의 단일 진실원(SSOT). 모듈/페이지/가드를 추가하거나 디버깅할 때 가장 먼저 이 문서를 읽고 동기화한다.

> 관련 skill: [`staff-auth`](../staff-auth/SKILL.md) (직원 OAuth 가입 흐름), [`branch-management`](../branch-management/SKILL.md) (지사 포털 설계).

## 1. 4종 주체 매트릭스

| 주체 | 토큰 `type` | `aud` | 쿠키 (access / refresh) | localStorage 키 | 로그인 진입점 | 대표 가드 | 상태 |
|------|------------|-------|------------------------|----------------|--------------|----------|------|
| Staff (직원/관리자) | `staff` | `staff` | `staff_access_token` / `staff_refresh_token` | `auth-storage-staff` | `POST /auth/staff/login` (staffId+pw), `/auth/staff/{naver,kakao,google}` | `JwtAuthGuard` + `StaffOnlyGuard` | ✅ |
| Client (회원사 owner / 개인 회원) | `client` | `client` | `access_token` / `refresh_token` | `auth-storage-client` | `POST /auth/client/login`, `/auth/{naver,kakao,google}` | `JwtAuthGuard` | ✅ |
| Employee (회원사 직원) | `employee` | `client` | `access_token` / `refresh_token` (Client와 공유) | `auth-storage-client` (Client와 공유) | 컨텍스트 선택 → `POST /auth/select-context` | `JwtAuthGuard` + `EmploymentGuard` | ✅ |
| Branch (지사) | `branch` | `branch` | `branch_access_token` / `branch_refresh_token` | `auth-storage-branch` | `POST /auth/branch/login` | `BranchAuthGuard` | ❌ **미구현** |

> **Employee와 Client는 같은 쿠키 jar를 공유**한다 (`aud='client'` 동일). 토큰의 `type` 필드로만 구분되며, 한 브라우저 탭에서 Client/Employee 중 하나만 동시 활성화할 수 있다. Staff는 별도 쿠키 jar로 완전 분리된다.

## 2. JWT Payload 구조

핵심 함수: [auth.service.ts](../../apps/api/src/modules/auth/auth.service.ts) `loginStaffWithPassword` / `loginClient` / `selectContext` / `impersonate*`.

### Staff
```ts
{ sub, staffId, name, role: 'admin', type: 'staff',
  branchId, departmentId, aud: 'staff',
  impersonatedBy?: string }   // 대리로그인 시
```

### Client (회원사 owner / 개인)
```ts
{ sub, email, role: 'client', type: 'client',
  clientId: <self.id>, aud: 'client',
  impersonatedBy?: string }
```

### Employee (회원사 직원)
```ts
{ sub: <member.id>,            // 본인 Client.id
  clientId: <company.id>,       // 소속 거래처 ID (테넌트)
  employmentId,
  email, type: 'employee',
  role: 'MANAGER' | 'STAFF' | 'EDITOR',
  isOwner: <member === company>,
  canViewAllOrders, canManageProducts, canViewSettlement,
  canManageSchedule, canManageRecruitment,
  enableSchedule, enableRecruitment, enableShooting, enableNote,
  aud: 'client',
  impersonatedBy?: string }
```

### Branch (미구현 — 설계만)
```ts
{ sub: <branchPortal.id>, email, role: 'branch', type: 'branch',
  branchPortalId, aud: 'branch' }
```

## 3. 동시 세션 메커니즘 — Staff + Client 두 탭

| 계층 | 분리 수단 | 위치 |
|------|----------|------|
| 쿠키 | 이름 분리 (`staff_*` vs base) | [auth.controller.ts:65-97](../../apps/api/src/modules/auth/auth.controller.ts) `setAuthCookies()` |
| 클라이언트 토큰 추출 | URL 컨텍스트 + `X-Auth-Context` 헤더 | [api.ts:14-33, 168-183](../../apps/web/lib/api.ts) `isAdminContext()` |
| 서버 토큰 추출 | Referer + `X-Auth-Context` → staff/client 쿠키 선택 | [jwt.strategy.ts:22-65](../../apps/api/src/modules/auth/strategies/jwt.strategy.ts) |
| `aud` 교차 차단 | staff 쿠키에 client 토큰, 역도 401 | [jwt.strategy.ts:48-51](../../apps/api/src/modules/auth/strategies/jwt.strategy.ts) |
| Zustand 저장소 | `auth-storage-staff` vs `auth-storage-client` | [auth-store.ts:74-165](../../apps/web/stores/auth-store.ts) |
| 로그아웃 | 현재 컨텍스트 키만 제거 (반대편 보존) | [auth-store.ts:199-222](../../apps/web/stores/auth-store.ts) |

**관리자 컨텍스트 경로 단일 정의** (Single Source of Truth):

| 영역 | SSOT 파일 | export |
|------|----------|--------|
| 프런트엔드 | [`apps/web/lib/admin-paths.ts`](../../apps/web/lib/admin-paths.ts) | `STAFF_CONTEXT_PATHS`, `ADMIN_ONLY_PATHS`, `SHARED_AUTHED_PATHS`, `isStaffContext()`, `isStaffContextPath()` |
| 백엔드 | [`apps/api/src/common/admin-paths.ts`](../../apps/api/src/common/admin-paths.ts) | `STAFF_CONTEXT_PATHS`, `isStaffContextReferer()` |

세 가지 개념 분리:
- **STAFF_CONTEXT_PATHS** — staff 세션 컨텍스트 활성화 경로 (broad). 쿠키/스토리지/`X-Auth-Context` 헤더 선택에 사용.
- **ADMIN_ONLY_PATHS** — staff 로그인 없으면 `/admin-login` 으로 리다이렉트되는 경로 (narrow). middleware 가드에 사용.
- **SHARED_AUTHED_PATHS** — staff 또는 client 둘 중 하나만 있으면 통과 (예: `/schedule`).

소비처: `auth-store.ts`(setAuth/logout), `api.ts`(X-Auth-Context 헤더, 토큰 갱신), `middleware.ts`(라우트 가드), `jwt.strategy.ts`(Referer 폴백).

> ⚠️ 새 staff 경로 추가 시 **frontend `lib/admin-paths.ts` + backend `common/admin-paths.ts` 두 파일만** 동기화. (이전엔 4곳 중복이었으나 2026-05-09 단일화 완료.)

## 4. 대리로그인 (Impersonation) 3종

Staff가 회원사를 대신 로그인하여 대리 주문을 넣는 시나리오 등을 위해 존재. 원래 세션은 살려두고, 대리 토큰을 sessionStorage 기반 Bearer 헤더로 별도 부착한다.

| API | 호출자 | 대상 | 토큰 만료 | 비고 |
|-----|--------|------|----------|------|
| `POST /auth/impersonate-staff/:staffId` | Staff (`isSuperAdmin=true`) | 다른 Staff | 2h | type=staff |
| `POST /auth/impersonate/:clientId` | Staff (`isSuperAdmin=true`) | Client | 1h | type=client |
| `POST /auth/impersonate-employee/:employmentId` | Client owner (member===company) | 같은 거래처 Employee | 2h | type=employee |
| `POST /auth/end-impersonation` | 대리 세션 | — | — | 클라이언트 sessionStorage 정리만 신호 |

**중첩 대리로그인 차단**: 모든 impersonate 컨트롤러는 `if (req.user.impersonatedBy) → 403` 검사를 한다 ([auth.controller.ts:634, 648, 663](../../apps/api/src/modules/auth/auth.controller.ts)).

### 클라이언트(브라우저) 측 대리 세션 운반

[`use-auth.ts:140-200`](../../apps/web/hooks/use-auth.ts), [`api.ts:151-165`](../../apps/web/lib/api.ts):

```
sessionStorage:
  impersonate-session = 'true'           // 활성 마커
  impersonate-tokens  = JSON{accessToken, refreshToken}
  CLIENT_KEY (auth-storage-client)       // 대리 대상 사용자 정보
localStorage:
  auth-storage-staff                     // 원래 staff 세션 — 그대로 유지
```

API 요청 시 `impersonate-session=true`이면 `Authorization: Bearer <impersonate-tokens.accessToken>`을 자동 부착한다. 이로써 **기존 staff 쿠키와 별개로 대리 토큰이 우선** 적용된다.

대리 종료 시 `clearImpersonateKeys()` ([auth-store.ts:62-70](../../apps/web/stores/auth-store.ts))가 sessionStorage·localStorage의 `impersonate-*` 키와 sessionStorage CLIENT_KEY를 제거하고, localStorage `auth-storage-staff`는 그대로 보존되어 staff로 자동 복귀한다.

## 5. 일정/촬영/메모장 테넌트 격리

[`Schedule`](../../apps/api/prisma/schema.prisma), `Note`, `Todo` 모델은 **단일 테이블 + `clientId` 테넌트 필터** 구조이다.

| 사용자 타입 | `creatorId` | `clientId` | 조회 필터 |
|------------|-------------|-----------|----------|
| Staff | Staff.id | `null` | `WHERE clientId IS NULL` |
| Client (개인/owner) | Client.id | `<self.id>` | `WHERE clientId = self.id` |
| Employee | Client.id (member) | `<company.id>` | `WHERE clientId = company.id` (같은 회사 직원끼리 공유) |

기준 구현: [`schedule.service.ts:19-56`](../../apps/api/src/modules/schedule/services/schedule.service.ts).

## 6. Branch 로그인 — 미구현 (설계만)

현재 `Branch` 테이블은 "직원이 소속된 지점" 용도이며, 지사 포털용 `BranchPortal` 모델은 별도로 신설 예정이다. 상세 설계는 [`branch-management/SKILL.md`](../branch-management/SKILL.md) 참고.

| 항목 | 설계 |
|------|------|
| 모델 | `BranchPortal`, `BranchClient`, `BranchTopup`, `BranchBalanceHistory`, `BranchOrder`, `TaxInvoice` (신규) |
| 토큰 | `type='branch'`, `aud='branch'` |
| 쿠키 | `branch_access_token` / `branch_refresh_token` |
| Zustand | `auth-storage-branch` |
| 가드 | `BranchAuthGuard` |
| 페이지 | `apps/web/app/(branch)/{login,register,pending,dashboard,...}` |
| Phase 1 | `POST /auth/branch/{register,login,logout}`, `GET /auth/branch/me`, 본사 승인 API |

구현 시 본 문서의 §1 매트릭스, §3 동시 세션 메커니즘에 Branch 행/열을 채워 넣는다.

## 7. 알려진 결함과 대응

| ID | 결함 | 위치 | 상태 |
|----|------|------|------|
| L1 | `refreshToken()` 재발급 시 `impersonatedBy` 누락 → 중첩 대리 우회 | [auth.service.ts:77-169](../../apps/api/src/modules/auth/auth.service.ts) | ✅ **수정 완료** (2026-05-09). 회귀 테스트는 §8 시나리오 #11 |
| L2 | ADMIN 경로 목록 4곳 중복 정의 → 2곳 SSOT 로 통합 | [`apps/web/lib/admin-paths.ts`](../../apps/web/lib/admin-paths.ts), [`apps/api/src/common/admin-paths.ts`](../../apps/api/src/common/admin-paths.ts) | ✅ **수정 완료** (2026-05-09) |
| L3 | 토큰 만료 비대칭 (staff 8h / client 30d / impersonate 1~2h) | auth.service.ts | ⏳ 정책 결정 필요 |
| L4 | `SecurityLog` 테이블 정의되어 있으나 대리로그인 감사 기록 없음 | schema.prisma:127-157 | ⏳ |
| L5 | Branch 로그인 전체 미구현 | — | ⏳ branch-management Phase 1 |

## 8. e2e 회귀 테스트

위치: [`apps/api/test/auth.e2e-spec.ts`](../../apps/api/test/auth.e2e-spec.ts)

박제된 13개 시나리오 (모두 통과해야 PR 머지 가능):

1. Staff ID/PW 로그인 → `/auth/me`
2. Client ID/PW 로그인 (개인, 고용 0건) → `/auth/me`
3. Client ID/PW 로그인 (고용 다수) → 컨텍스트 선택 → Employee `/auth/me`
4. 잘못된 staffId/PW → 401
5. `aud` 교차 사용 차단 (client 쿠키에 staff 토큰)
6. Staff(SUPER_ADMIN) → impersonate Client (`impersonatedBy=adminId`)
7. Staff(non-super) → impersonate Client → 403
8. Owner Client → impersonate-employee
9. SUPER_ADMIN → impersonate-staff
10. 중첩 대리로그인 차단
11. **🔥 대리 후 `/auth/refresh` → `impersonatedBy` 보존 (L1 회귀)**
12. 동시 세션: staff + client 양 쿠키 jar 모두 유효
13. end-impersonation → 원래 staff 토큰으로 복귀

실행: `cd apps/api && npm run test:e2e`

## 9. 자주 하는 실수 체크리스트

- [ ] 새 관리자 경로 추가 시 [`lib/admin-paths.ts`](../../apps/web/lib/admin-paths.ts) `STAFF_CONTEXT_PATHS` 와 [`common/admin-paths.ts`](../../apps/api/src/common/admin-paths.ts) `STAFF_CONTEXT_PATHS` — **두 곳 모두** 동기화했는가? 보호 가드도 필요하면 `ADMIN_ONLY_PATHS` 도 갱신.
- [ ] 대리로그인 토큰을 만들 때 `impersonatedBy` 클레임을 포함했는가? (refreshToken에서도 보존)
- [ ] 새로운 user type을 추가했다면 `refreshToken()` 분기에 추가했는가?
- [ ] `Schedule`/`Note`/`Todo` 신규 컬럼은 `clientId` 필터를 통과해야 테넌트 격리가 유지되는가?
- [ ] Staff/Client 동시 세션 시나리오를 새 페이지에서 손상시키지 않는가? (다른 컨텍스트 쿠키를 임의로 삭제하지 말 것)
- [ ] Throttle 우회로 e2e 테스트가 깨지면 `@SkipThrottle` 또는 테스트 환경 무력화를 사용하라.

## 10. 핵심 파일 인덱스

| 영역 | 파일 |
|------|------|
| **관리자 경로 SSOT (web)** | [admin-paths.ts](../../apps/web/lib/admin-paths.ts) |
| **관리자 경로 SSOT (api)** | [admin-paths.ts](../../apps/api/src/common/admin-paths.ts) |
| API 인증 서비스 | [auth.service.ts](../../apps/api/src/modules/auth/auth.service.ts) |
| API 컨트롤러 | [auth.controller.ts](../../apps/api/src/modules/auth/auth.controller.ts) |
| JWT 전략 | [jwt.strategy.ts](../../apps/api/src/modules/auth/strategies/jwt.strategy.ts) |
| 가드 | [staff-only.guard.ts](../../apps/api/src/common/guards/staff-only.guard.ts), [jwt-auth.guard.ts](../../apps/api/src/modules/auth/guards/jwt-auth.guard.ts) |
| 프론트 store | [auth-store.ts](../../apps/web/stores/auth-store.ts) |
| 프론트 API client | [api.ts](../../apps/web/lib/api.ts) |
| 프론트 미들웨어 | [middleware.ts](../../apps/web/middleware.ts) |
| 프론트 hooks | [use-auth.ts](../../apps/web/hooks/use-auth.ts) |
| 로그인 페이지 (관리자) | [admin-login/page.tsx](../../apps/web/app/(admin)/admin-login/page.tsx) |
| 로그인 페이지 (회원/직원) | [(shop)/login/page.tsx](../../apps/web/app/(shop)/login/page.tsx) |
| 일정 서비스 (테넌트 격리 기준) | [schedule.service.ts](../../apps/api/src/modules/schedule/services/schedule.service.ts) |
| Prisma 스키마 | [schema.prisma](../../apps/api/prisma/schema.prisma) |
| e2e 테스트 | [auth.e2e-spec.ts](../../apps/api/test/auth.e2e-spec.ts) |
