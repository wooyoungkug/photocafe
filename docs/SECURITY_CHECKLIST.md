# Photocafe 보안 점검 체크리스트 (2026-04-26)

> **사용 방법**: 각 항목을 위에서부터 순서대로 확인하세요. 이미 적용된 항목은 [x] 로 체크합니다.  
> **자동 점검**: 외부 헤더/포트 스캔은 이 저장소에서 이미 완료. 본 문서는 **각 SaaS 콘솔에서만 확인 가능한 항목** 위주.

---

## 0. 즉시 조치 (P0 — 오늘 안)

### 🚨 0-1. 레거시 NAS PostgreSQL 5433 차단
- [ ] Synology DSM 방화벽에서 5433 포트 거부 규칙 추가 (모든 외부 IP)
- [ ] 또는 공유기 포트포워딩에서 5433 제거
- [ ] 외부에서 `nc -zv 1.212.201.147 5433` 결과가 `refused`/`timeout` 인지 확인

### 🟠 0-2. 레거시 NAS 3000/3001 차단
- [ ] 옛 Next.js/NestJS 컨테이너 종료 (`sudo docker stop photocafe-web photocafe-api`)
- [ ] 공유기 포트포워딩에서 3000/3001 제거
- [ ] 외부 확인: `curl -I http://1.212.201.147:3000/` 가 더 이상 200 OK 안 줘야 함

### 🟡 0-3. SSH (22) 강화
- [ ] Synology 자동 차단 활성화 (10회 실패 시 30분)
- [ ] SSH 키 인증 전용 (비밀번호 로그인 비활성)
- [ ] 공유기 포트포워딩 22 → 회사 IP allowlist (가능하면)

---

## 1. Cloudflare (`photocafe.co.kr` Zone)

### 1-1. SSL/TLS
- [ ] **SSL/TLS → Overview**: `Full (strict)` 모드인지 (자체 서명 인증서 차단)
- [ ] **Edge Certificates → Always Use HTTPS**: ON
- [ ] **Edge Certificates → Minimum TLS Version**: `TLS 1.2` 이상
- [ ] **Edge Certificates → Opportunistic Encryption**: ON
- [ ] **Edge Certificates → TLS 1.3**: ON
- [ ] **Edge Certificates → Automatic HTTPS Rewrites**: ON
- [ ] **Edge Certificates → HTTP Strict Transport Security (HSTS)**: Enable + `Max-Age 12 months` + Include subdomains + Preload

### 1-2. DNS 레코드 검증
- [ ] `photocafe.co.kr` (apex) → Vercel CNAME, **DNS only (회색 구름)**
- [ ] `www` → Vercel CNAME, **DNS only (회색 구름)**
- [ ] `api` → Railway, Proxied (주황 구름) ※ 또는 DNS only — 주황 시 Railway WAF 와 이중 보호
- [ ] `cdn` → B2 또는 Vercel, Proxied (주황 구름)
- [ ] 사용 안 하는 레코드 (예: `mail`, `ftp`, `staging`) 제거

### 1-3. WAF & Bot
- [ ] **Security → WAF → Managed Rules**: `Cloudflare Managed Ruleset` ON (Free 도 Free Managed Ruleset 사용 가능)
- [ ] **Security → Bots → Bot Fight Mode**: ON (Free 플랜 기본 봇 차단)
- [ ] **Security → DDoS**: 기본 활성 (Free 도 자동)
- [ ] **Security → Settings → Security Level**: `Medium` 이상
- [ ] **Security → Settings → Challenge Passage**: 30분 이상

### 1-4. Rate Limiting (선택, Pro 부터 무료 1개 룰 가능)
- [ ] `/api/v1/auth/*` 경로에 분당 10회 제한
- [ ] 동일 IP 가 동일 경로 1초에 10회 이상 → JS Challenge

### 1-5. Page Rules / Cache Rules
- [ ] HTML 페이지: `Cache-Control` 짧게 (max-age=0 or no-cache)
- [ ] 정적 자산 (`_next/static/*`, 이미지): `Cache-Control: public, max-age=31536000, immutable`
- [ ] API 경로 (`/api/*`): `Bypass Cache` (Cloudflare 가 캐시 안 함)

### 1-6. Network / Speed
- [ ] **Network → IPv6 Compatibility**: ON
- [ ] **Network → HTTP/2**: ON
- [ ] **Network → HTTP/3 (QUIC)**: ON
- [ ] **Network → 0-RTT Connection Resumption**: ON
- [ ] **Speed → Optimization → Brotli**: ON
- [ ] **Speed → Optimization → Early Hints**: ON

### 1-7. Privacy / Logging
- [ ] **Analytics → Web Analytics**: 활성 (privacy-first GA 대안)
- [ ] **Logs**: Free 플랜은 90일 보관 안 됨 (필요 시 외부 SIEM 연동 검토)

---

## 2. Vercel (`apps/web`)

### 2-1. 프로젝트 설정
- [ ] **Settings → General → Production Branch**: `main`
- [ ] **Settings → Environment Variables**: 시크릿 모두 `Production` 으로 분리, `Preview` 에는 더미값
- [ ] **Settings → Domains**: `photocafe.co.kr`, `www.photocafe.co.kr` SSL Active
- [ ] **Settings → Deployment Protection → Vercel Authentication**: Preview 환경만 ON (Prod 는 OFF)

### 2-2. 보안 헤더 검증
- [x] `next.config.ts` 에 보안 헤더 추가 완료 (커밋 0bee9293)
- [ ] 다음 배포 후 `curl -I https://photocafe.co.kr/` 로 헤더 적용 확인:
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: ...` (camera/geolocation 등 차단)
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [ ] HSTS Preload 등록 (https://hstspreload.org) — 부분 도메인 단위로 신중히

### 2-3. CSP (다음 단계, 별도 작업)
- [ ] CSP-Report-Only 헤더로 1주일 모니터링
- [ ] 보고서 분석 후 enforce 모드 전환

---

## 3. Railway (`apps/api`)

### 3-1. 환경 변수
- [ ] **Variables**: 모든 시크릿이 `RAILWAY_*` Secret 으로 등록 (코드/문서 평문 X)
- [ ] **Variables**: `NODE_ENV=production` (Swagger 자동 비활성)
- [ ] **Variables**: `CORS_ORIGINS=https://photocafe.co.kr,https://www.photocafe.co.kr` (콤마 구분)
- [ ] **Variables**: `JWT_SECRET` 32자 이상 랜덤
- [ ] **Variables**: `BACKUP_PASSWORD` 운영 DB 백업/복원에서 사용 (이미 GitHub Secret 에 등록됨, Railway 에는 불필요)

### 3-2. 네트워크 / 도메인
- [ ] **Settings → Domains**: `api.photocafe.co.kr` 연결, SSL 활성
- [ ] **Settings → Networking**: 외부 노출은 HTTPS 만 (Railway 가 자동)
- [ ] PostgreSQL: **Public Networking 비활성** 권장 (외부에서 직접 접근 불가). DB 마이그레이션 시에만 임시 활성

### 3-3. Health Check
- [ ] **Settings → Healthcheck Path**: `/health` 또는 `/health/db`
- [ ] **Settings → Restart Policy**: On Failure / Always

### 3-4. 백업
- [x] DB 백업 GPG 암호화 활성 (GitHub Actions, daily 03:30 KST)
- [ ] 복원 워크플로우 동작 테스트 (1회) — db-migrate.yml 으로 staging 환경에 시험 복원

---

## 4. Backblaze B2 (`photocafe`)

- [x] Bucket type: `allPrivate` (확인 완료)
- [x] Lifecycle rules: daily 31d / weekly 12w / monthly 6mo
- [x] 평문 .sql.gz 백업 모두 삭제 완료
- [ ] **Application Key**: 백업 전용 키와 이미지 전용 키 분리 (현재 1개 통합 키)
- [ ] **B2 Account → 2FA**: 활성
- [ ] (Public 버킷 도입 시) 별도 `photocafe-public` 버킷 생성 + 이미지 업로드 코드 마이그레이션

---

## 5. GitHub

- [ ] **Settings → Secrets and variables → Actions**: 시크릿 목록 확인
  - 필수: `DATABASE_URL`, `BACKUP_PASSWORD`, `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_ENDPOINT`, `B2_BUCKET_NAME`, `RAILWAY_DATABASE_URL`
- [ ] **Settings → Branches → Branch protection rules** for `main`:
  - Require pull request reviews (1명 이상)
  - Require status checks to pass
  - Require conversation resolution
  - Do not allow bypassing the above
- [ ] **Settings → Code security and analysis**:
  - Dependabot alerts: ON
  - Dependabot security updates: ON
  - Secret scanning: ON
  - Push protection: ON
- [ ] **Account → 2FA**: 활성 (필수)

---

## 6. 외부 검증 도구 (참고용)

| 도구 | URL | 점수 목표 |
|------|-----|----------|
| Mozilla Observatory | https://observatory.mozilla.org/analyze/photocafe.co.kr | A 등급 |
| SSL Labs | https://www.ssllabs.com/ssltest/analyze.html?d=photocafe.co.kr | A+ |
| Security Headers | https://securityheaders.com/?q=photocafe.co.kr | A+ |
| HSTS Preload | https://hstspreload.org/?domain=photocafe.co.kr | preload-eligible |

---

## 변경 이력
- 2026-04-26: 최초 작성. 외부 스캔 결과 기반 작성.
