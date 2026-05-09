---
name: incident-response
description: 운영 장애 대응 및 보안 사고 처리. Railway/Vercel/B2/Cloudflare/DB 다운, 503/먹통/롤백, Sentry/UptimeRobot 알림 분석, SecurityLog 감시, 개인정보 유출 KISA 24시간 신고 절차, 사후분석(Postmortem) 작업 시 사용합니다.
---

# 장애 대응 스킬

Photocafe ERP의 운영 장애·보안 사고 대응 플레이북.

> **상위 인프라 컨텍스트**: `server-hosting` 스킬 참조
> **DB 백업·복구 절차**: `backup-recovery` 스킬 참조

## 0. 첫 30초 — 트리아주 (장애 발생 시 즉시)

```
1. 사용자 영향 범위 확인 — 전체 다운? 일부 기능?
2. Cloudflare/Railway/Vercel/B2 상태페이지 4개 확인
3. UptimeRobot/Sentry 대시보드 확인
4. 우선순위 결정 (Critical/High/Medium 매트릭스)
5. Slack #incident 채널에 최초 보고 (시각·증상·범위)
```

## 1. 우선순위 매트릭스

| 등급 | 정의 | 대응 시간 | 예시 |
|------|------|-----------|------|
| 🔴 **Critical (P0)** | 서비스 전체 사용 불가, 데이터 손실, 개인정보 유출 의심 | **즉시** (15분 내 1차 대응) | DB 다운, 전사 로그인 불가, KISA 신고 사안 |
| 🟠 **High (P1)** | 주요 기능 1개 다운, 결제·주문 영향 | **1시간 내** | B2 업로드 불가, Cloudflare 캐시 오작동 |
| 🟡 **Medium (P2)** | 일부 사용자/일부 기능 영향 | **당일 처리** | 특정 페이지 5xx, 알림 지연 |
| 🟢 **Low (P3)** | UX 저하만 있음 | 다음 주 | 폰트 깨짐, 로그 부정확 |

## 2. 계층별 플레이북

### 2.1 🔴 Railway PostgreSQL 다운 (P0)

**증상**: API 5xx 폭증, Sentry "PrismaClientInitializationError"

```bash
# Step 1. 상태 확인
railway status
curl https://railwaystatus.com/api/v2/status.json

# Step 2. Railway 콘솔 → Database → Logs 확인
railway logs --service postgres

# Step 3. Railway 측 장애로 판단되면:
#   - Railway support ticket 제출 (https://railway.app/help)
#   - 운영팀에 "DB 장애로 일시 점검" 공지 (Slack/이메일)
#   - 30분 이상 지속 시 → backup-recovery 스킬로 새 DB 임시 복원 검토
```

**복구 후 점검**:
- `prisma migrate status` 로 스키마 일관성 확인
- 직전 1시간 트랜잭션 손실 여부 (애플리케이션 로그 vs DB 행 수)

### 2.2 🔴 Railway API 다운 (P0)

**증상**: `api.photocafe.co.kr` 503, 헬스체크 실패

```bash
# Step 1. 로그
railway logs --service api --tail 100

# Step 2. 흔한 원인
#   - 환경변수 누락/오타 (Variables 탭)
#   - Prisma 클라이언트 generate 실패 → 빌드 단계 확인
#   - JWT_SECRET 변경 → 모든 토큰 무효화
#   - 메모리 OOM (Railway Plan 한도 초과)

# Step 3. 빠른 복구 — 직전 정상 커밋으로 롤백
git log --oneline -10
railway redeploy --service api    # 직전 빌드 재시도
# 또는 Railway 콘솔 → Deployments → 정상이었던 빌드 → "Redeploy"
```

### 2.3 🟠 Vercel 프론트 다운 (P1)

**증상**: `photocafe.co.kr` 빈 페이지/500

```bash
# Step 1. Vercel 콘솔 → Deployments → 최신 빌드 로그 확인
vercel logs --since=1h     # CLI 사용 시

# Step 2. 흔한 원인
#   - 빌드 실패 (TypeScript 에러, 환경변수 누락)
#   - NEXT_PUBLIC_API_URL 오타
#   - JWT_SECRET 누락 → 미들웨어 무한 루프 (admin-login 리다이렉트)

# Step 3. 즉시 대응 — 직전 빌드로 promote
# Vercel 콘솔 → Deployments → 정상 빌드 → "Promote to Production"
```

### 2.4 🟠 B2 Private 접근 불가 (P1)

**증상**: 이미지 업로드/다운로드 실패, 프리사인드 URL 403

```bash
# Step 1. B2 상태 확인
# https://status.backblaze.com

# Step 2. Application Key 검증
# Railway Variables: B2_ACCESS_KEY, B2_SECRET_KEY, B2_BUCKET, B2_BUCKET_PRIVATE

# Step 3. 키 만료/회수 확인
# B2 콘솔 → App Keys → 해당 키 status

# Step 4. Lifecycle Rule 오작동 의심 시
# B2 콘솔 → Buckets → photocafe-originals → Lifecycle Settings 확인

# Step 5. 임시 우회 (단기)
#   - 새 Application Key 발급 → Railway Variables 갱신 → API 재배포
#   - 그래도 안 되면 Synology 미러본으로 임시 서비스 (읽기 전용)
```

### 2.5 🟠 Cloudflare 장애 (P1)

**증상**: 모든 도메인 502, DNS 응답 없음

```
Step 1. https://www.cloudflarestatus.com 확인
Step 2. 글로벌 장애 시 — DNS 설정을 임시로 우회

  방법 A: Cloudflare DNS 콘솔에서 Proxy(주황) → DNS only(회색) 일시 전환
    영향: WAF/캐시 우회, 직접 노출 (단기 OK)

  방법 B: 네임서버를 임시로 도메인 등록기관 기본값으로 변경
    주의: 전파에 1~24시간 소요 — 최후 수단

Step 3. Cloudflare 복구 후 다시 Proxied로 환원
```

### 2.6 🔴 개인정보 유출 의심 (P0) — 별도 절차 §4 참조

## 3. 모니터링·알림 임계값

### 3.1 Sentry (`@sentry/nestjs` 10.40 설치됨)

| 항목 | 임계값 | 알림 채널 |
|------|--------|-----------|
| 신규 이슈 발생 | 즉시 | Slack #alerts |
| 5xx 에러율 | 1%↑ / 5분 | Slack #incident |
| 트랜잭션 p95 | 3초↑ / 10분 | Slack #alerts |
| 데이터베이스 쿼리 시간 | p95 1초↑ | Slack #alerts |
| 사용자 영향 이슈 | 100명↑ 영향 | Slack #incident + 이메일 |

**Sentry 설정 위치**: `apps/api/src/main.ts` (Sentry 초기화), Sentry 대시보드 Alert Rules

### 3.2 UptimeRobot (외부 헬스체크)

| 모니터 | URL | 주기 | 알림 |
|--------|-----|------|------|
| API health | `https://api.photocafe.co.kr/health` | 5분 | 2회 연속 실패 시 즉시 |
| Web | `https://photocafe.co.kr/` | 5분 | 2회 연속 실패 시 즉시 |
| HTTPS 인증서 | (자동) | 일 1회 | 만료 30일 전 알림 |

### 3.3 SecurityLog (DB 자체 — 미구현 시 우선 구축)

| 이벤트 | 임계값 | 자동 조치 |
|--------|--------|-----------|
| 로그인 실패 | 동일 IP 10회/5분 | 1시간 차단 + Slack 알림 |
| 관리자 외부 IP 접근 | 1회 | 즉시 차단 + Slack 알림 |
| B2 Private 다운로드 | 100건/시간/사용자 | 의심사용자 표시 + Slack 알림 |
| 대량 데이터 export | 500건↑ | 사용자 토큰 무효화 + 알림 |
| API 5xx 폭증 | 100건/분 | 자동 차단 (Cloudflare Rate Limiting) |

**스키마**: `prisma/schema.prisma` 에 `SecurityLog` 모델 (INFRASTRUCTURE.md §6.9 참조)

### 3.4 Slack 채널 구분 (권장)

| 채널 | 용도 |
|------|------|
| `#alerts` | 일반 경고 (5xx, 성능 저하) — 검토 후 무시 가능 |
| `#incident` | 즉시 대응 필요 (P0/P1) — 호출 알림 ON |
| `#security` | 보안 이벤트 (관리자 IP, 대량 다운로드) |
| `#deploy` | 배포 결과 (성공/실패) |

## 4. 🚨 개인정보 유출 — KISA 24시간 신고

> **법적 의무**: 개인정보 유출 인지 시 **24시간 이내** KISA(118)에 신고. 미준수 시 과태료 최대 3,000만원, 과징금 매출액 3% 이하.

### 4.1 첫 1시간 — 봉쇄 (Containment)

```markdown
## 유출 의심 인지 시각: ____년 __월 __일 __:__ (KST)

### 즉시 (15분 내)
- [ ] 의심 IP/계정 차단 (Cloudflare WAF / Railway 환경변수 / DB)
- [ ] 관리자 토큰 전부 무효화 (JWT_SECRET 회전 → 강제 로그아웃)
- [ ] 영향 받은 데이터 범위 1차 추정

### 30분 내
- [ ] 대표(우영국) 휴대폰 직통 통보 (평일·주말 무관)
- [ ] Slack #security 에 봉쇄 진행 상황 공유
- [ ] 외부 보안업체/법무 자문 필요 여부 판단
```

### 4.2 24시간 카운트다운 — KISA 신고

**신고 사이트**: https://privacy.go.kr (개인정보보호 종합포털)
**전화**: 국번없이 **118** (24시간)

**필수 신고 항목**:
1. 유출 인지 시각 (위 §4.1 기록)
2. 유출 정황 (해킹/실수/내부유출 등)
3. 유출된 항목 (이름·이메일·전화·주소·이미지 등)
4. 영향 회원 수
5. 봉쇄 조치 내역
6. 대표자 연락처

**영향 회원 추출 SQL 예시**:
```sql
-- 의심 IP에서 조회된 회원 추출
SELECT DISTINCT u.id, u.email, u.name
FROM "User" u
JOIN "SecurityLog" s ON s."userId" = u.id
WHERE s.ip = '<의심 IP>'
  AND s."createdAt" >= '<유출 추정 시각>'
ORDER BY s."createdAt";
```

### 4.3 통지문 템플릿 (영향 회원에게 즉시 발송)

> **건명**: [중요] Photocafe 개인정보 유출 안내 ({YYYY-MM-DD})
>
> 안녕하세요, 프린팅솔루션즈(Photocafe)입니다.
>
> {YYYY-MM-DD HH:MM} 경 회원님의 개인정보가 외부에 유출되었음을 확인하였습니다.
>
> **유출 항목**: {예: 이름, 이메일, 전화번호, 주문 사진}
> **유출 경로**: {예: 외부 침입 / 내부 실수}
> **조치 사항**:
> - 의심 접근을 즉시 차단했습니다.
> - 관리자 인증 정보를 전면 교체했습니다.
> - {YYYY-MM-DD} KISA(개인정보보호위원회)에 신고했습니다.
>
> **회원님께 권고드리는 조치**:
> - Photocafe 비밀번호 변경
> - 동일 비밀번호를 다른 사이트에서 쓰셨다면 그곳도 변경
> - 의심 이메일/문자 주의
>
> 깊이 사과드립니다. 추가 문의는 wooceo@gmail.com 으로 부탁드립니다.

### 4.4 사후 보고 (5일 이내)
- 유출 원인 분석서
- 재발 방지 대책
- 피해 보상 계획 (필요 시)
- → 개인정보보호위원회에 추가 제출

## 5. 사후 분석(Postmortem) 템플릿

> 🟢 비난 없는 문화(blameless): 누구의 실수인지보다 시스템의 어떤 결함이 사고를 허용했는지 본다.

```markdown
# 장애 사후 분석 — {장애명}

## 메타
- 장애 인지 시각:
- 장애 종료 시각:
- 총 영향 시간:
- 영향 사용자 수:
- 등급: P0 / P1 / P2

## 타임라인 (시간순)
- HH:MM — 첫 증상 발견
- HH:MM — 알림 수신
- HH:MM — 1차 대응 시작
- HH:MM — 원인 파악
- HH:MM — 복구 완료
- HH:MM — 정상 확인

## 영향 (Impact)
- 사용자: 
- 비즈니스: 
- 데이터:

## 원인 분석 (Root Cause)
### 직접 원인
### 근본 원인 (5 Whys)
1. 왜 X가 발생했는가? →
2. 왜 그런가? →
3. ...

## 대응이 잘된 점
## 부족했던 점
## 재발 방지 액션 아이템
- [ ] {담당} {기한} {조치}
- [ ] ...

## 학습 사항 (다른 팀과 공유할 내용)
```

## 6. 운영 루틴

### 매주 월요일
- Sentry 신규 이슈 검토 (resolve / ignore / 티켓화)
- UptimeRobot 5분 다운 횟수 확인
- SecurityLog 의심 패턴 확인
- 백업 실행 결과 확인 (`backup-recovery` 스킬 §5.2)

### 매월
- 복구 훈련 (`backup-recovery` 스킬 §4)
- Postmortem 누적본 검토 → 반복되는 패턴이 있다면 인프라 개선

### 매분기
- 모의 침해 시나리오 훈련 (KISA 신고 시뮬레이션 포함)
- 의존성 보안 점검 (`npm audit`)

## 7. 긴급 연락처

| 상황 | 연락처 | 비고 |
|------|--------|------|
| 개인정보 유출 | **KISA 118** (24시간) | 24시간 이내 신고 |
| Vercel 장애 | support@vercel.com | Pro 우선 지원 |
| Railway 장애 | team@railway.app | Discord 커뮤니티 |
| Cloudflare 상태 | https://cloudflarestatus.com | — |
| B2 상태 | https://status.backblaze.com | — |
| 대표(우영국) | wooceo@gmail.com / (휴대폰) | 평일·주말 무관 즉시 통보 |

## 8. 관련 파일·문서

| 항목 | 경로 |
|------|------|
| 인프라 설계서 §6 보안 | [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) |
| 보안 점검 체크리스트 | [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md) |
| Sentry 초기화 | [apps/api/src/main.ts](apps/api/src/main.ts) |
| 백업/복구 절차 | `backup-recovery` 스킬 |
| 인프라 구성 | `server-hosting` 스킬 |

## 9. 다음 단계 추천

- **(1) Slack #incident 채널 생성 + UptimeRobot/Sentry 웹훅 연동 [추천]** — 알림이 도달하지 않으면 모든 절차가 무력
- (2) SecurityLog 모델 실제 구현 점검 (스키마는 INFRASTRUCTURE.md에 정의, 실구현 미상)
- (3) KISA 신고 시뮬레이션 1회 (분기 훈련에 포함)
