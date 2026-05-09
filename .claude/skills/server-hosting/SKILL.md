---
name: server-hosting
description: 서버 호스팅 인프라 구성. Vercel(프론트+ERP)+Railway(API/DB)+B2(이미지)+Cloudflare(CDN/보안)+Synology(백업) 4계층 구조, 도메인·환경변수·CI/CD·배포 작업 시 사용합니다. 백업/복구는 backup-recovery, 장애 대응은 incident-response 스킬 참조.
---

# 서버 호스팅 스킬

Photocafe ERP의 클라우드 인프라 구성 기준 (2026-05-09 갱신, 호스팅 설계서 v1.1 기반).

> **연관 스킬**:
> - **백업/복구 절차** → [`backup-recovery`](../backup-recovery/SKILL.md) (DB 덤프·B2 복원·복구 훈련)
> - **장애 대응 플레이북** → [`incident-response`](../incident-response/SKILL.md) (Railway/Vercel/B2 다운, KISA 24h 신고)

## 1. 4계층 아키텍처

| 계층 | 서비스 | 위치 | 역할 |
|------|--------|------|------|
| CDN/보안 | Cloudflare Free | 글로벌 엣지 | DNS, WAF, DDoS 방어, 캐싱 |
| 프론트엔드 | Vercel Pro | 서울 icn1 | 쇼핑몰 + ERP 관리자 UI (apps/web 통합) |
| 백엔드 | Railway Pro | 미국 오리건 | NestJS API + PostgreSQL |
| 스토리지 | Backblaze B2 | 미국 버지니아 | 이미지 원본 (Public/Private 2단계) |
| 백업 | Synology DS918+ | 한국 사무실 | DB/이미지 오프사이트 미러 |

**핵심 철학**: 각자 잘하는 일에 집중
- Vercel = 한국 엣지에서 쇼핑몰+ERP 빠르게 서빙
- Railway = API+DB만 단순 운영
- B2 = 대용량 이미지 저렴 보관 (S3 대비 1/4)
- Cloudflare = 무료 보안+캐싱+DDoS
- Synology = 기존 장비를 백업에 재활용

## 2. 도메인 매핑 (Cloudflare DNS)

| 서브도메인 | 호스팅 | Proxy | CNAME 대상 |
|-----------|--------|-------|-----------|
| photocafe.co.kr (apex) | Vercel (쇼핑몰 + ERP) | **DNS only (회색)** | cname.vercel-dns.com |
| www | Vercel | **DNS only (회색)** | cname.vercel-dns.com |
| api.photocafe.co.kr | Railway (API only) | Proxied (주황) | `<railway-app>.up.railway.app` |
| cdn.photocafe.co.kr | B2 | Proxied (주황) | f005.backblazeb2.com |

> ⚠️ **Vercel은 반드시 DNS only**: Vercel 자체 CDN과 Cloudflare 프록시 충돌. apex/www를 Proxied로 설정하면 502/리다이렉트 루프 발생.

## 3. 기술 스택

### Frontend (Vercel — apps/web)
- Next.js 15 (App Router)
- React 19
- shadcn/ui + Tailwind CSS
- TanStack Query v5 + Zustand
- next-intl 4.x (ko/en/ja/zh) — 쿠키 기반 자동감지
- 빌드: `pnpm build`, Root `apps/web`, 리전 icn1

### Backend (Railway — apps/api)
- NestJS 10
- Prisma 5
- PostgreSQL 16
- JWT 인증
- @nestjs/terminus 헬스체크 (`/health`)

### 공통
- 모노레포 구조: `apps/web` + `apps/api`
- 자동 배포: GitHub `main` push → Vercel/Railway 각자 자동 빌드

## 4. B2 버킷 구성 (실제 운영명)

| 버킷명 | 종류 | 용도 |
|--------|------|------|
| `photocafe` | **Public** | 로고, 배너, 아이콘, 워터마크 썸네일, 공개 작품 |
| `photocafe-originals` | **Private** | 고객 원본 사진, 완성된 앨범, 주문 파일 (프리사인드 URL 5분) |

- Region: `us-east-005`
- Endpoint: `s3.us-east-005.backblazeb2.com`
- Bucket ID(public): `88fd538fbf15b75f98d70216`
- Lifecycle: daily 31d / weekly 12w / monthly 6mo
- 계정: wooceo@gmail.com

### 경로 구조
```
photocafe/ (Public)
├── site-assets/   # 로고, 배너, 아이콘
├── thumbnails/    # 저해상도 + 워터마크
└── shared/        # 공개 설정한 작품

photocafe-originals/ (Private)
├── users/{userId}/originals/   # 고객 원본
├── users/{userId}/finished/    # 완성된 앨범
└── orders/                     # 주문 관련 파일
```

## 5. Railway 운영

### 서비스 구성
| 서비스 | 용도 | 예상 비용 |
|--------|------|-----------|
| NestJS (apps/api) | API 서버 | $5~15/월 |
| PostgreSQL | Railway 내장 DB | $5~15/월 |
| (선택) Redis | 세션/큐 | $5~10/월 |

### 환경변수 (Railway Dashboard → Variables)
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
CORS_ORIGIN=https://photocafe.co.kr,https://www.photocafe.co.kr
B2_ACCESS_KEY=<키>
B2_SECRET_KEY=<시크릿>
B2_BUCKET=photocafe              # Public
B2_BUCKET_PRIVATE=photocafe-originals
B2_ENDPOINT=s3.us-east-005.backblazeb2.com
JWT_SECRET=<32자 랜덤>
ADMIN_2FA_ISSUER=Photocafe
```
> 시크릿은 코드/문서 기록 금지. Railway Variables에서만 관리.

### DB 마이그레이션 정책
- **현재 (초기 셋업/스키마 격변기)**: `npx prisma db push --accept-data-loss`
- **운영 안정화 후 전환 목표**: `npx prisma migrate deploy`
- **전환 시점**: 파일럿 운영 종료 + 실데이터 누적 시점부터 migration 파일 관리 시작

| 명령어 | 특징 | 위험도 |
|--------|------|--------|
| `db push` | 스키마 즉시 반영, 빠름 | 데이터 손실 가능 |
| `migrate deploy` | 마이그레이션 파일 순차 적용 | 안전 |

### 운영 명령어
```bash
railway status
railway logs --service api
railway redeploy --service api
railway run --service api npx prisma db push
```

### 잔존 정리 사항
- `apps/web/Dockerfile` Web 서비스 → Vercel 이전 완료로 **제거 예정**
- Railway Volume `UPLOAD_BASE_PATH` → B2 이전 완료로 **폐기 예정**

### CI/CD 운영 (Railway / Vercel / GitHub Actions)

| 트리거 | 대상 | 결과 |
|--------|------|------|
| GitHub `main` push | Railway (apps/api) | 자동 빌드·배포 |
| GitHub `main` push | Vercel (apps/web) | 자동 빌드·배포 (Preview URL 생성) |
| Cron `0 18 * * *` (UTC) | `db-backup.yml` | 매일 KST 03:30 DB 백업 |
| 수동 `workflow_dispatch` | `db-migrate.yml` | 로컬 DB → Railway 마이그레이션 |
| 수동 `workflow_dispatch` | `b2-bucket-settings.yml` | B2 lifecycle 일괄 적용 |
| 수동 `workflow_dispatch` | `b2-cleanup.yml` | B2 만료 객체 정리 |

#### 분리 배포 판단 (frontend-only vs full)
| 변경 종류 | 배포 방식 |
|-----------|-----------|
| UI/문구/스타일만 (API 응답·인증·DB 변경 없음) | **프론트만 배포** (Vercel) |
| API 경로/응답 구조/인증 로직 변경 | **통합 배포** (Vercel + Railway) |
| Prisma/DB 스키마 변경 | **통합 배포** + DB 마이그레이션 |
| 불확실한 경우 | **통합 배포** (안전) |

> 상세 체크리스트: [docs/DEPLOY_SPLIT_CHECKLIST.md](../../../docs/DEPLOY_SPLIT_CHECKLIST.md)
> 배포 실행은 **deployment-manager 에이전트** 활용

#### 롤백 절차
```bash
# Railway — 직전 정상 빌드로 재배포
railway redeploy --service api
# 또는 Railway 콘솔 → Deployments → 정상 빌드 → "Redeploy"

# Vercel — 정상 빌드를 Production으로 promote
# Vercel 콘솔 → Deployments → 정상 빌드 → "Promote to Production"
```

> ⚠️ DB 스키마 변경 동반 배포의 롤백은 단순 재배포로 안 됨 — `backup-recovery` 스킬의 §3.2 직접 복원 절차 참조.

## 6. Vercel 운영

### 환경변수
```
NEXT_PUBLIC_API_URL=https://api.photocafe.co.kr
NEXT_PUBLIC_CDN_URL=https://cdn.photocafe.co.kr
NEXT_PUBLIC_SITE_URL=https://photocafe.co.kr
NEXT_PUBLIC_DEFAULT_LOCALE=ko
JWT_SECRET=<API와 동일값>          # 미들웨어가 사용 — 누락 시 무한 루프
```

### 빌드 설정
- Root Directory: `apps/web`
- Framework: Next.js (자동 감지)
- Build Command: `pnpm build`
- Node: 20.x 또는 22.x
- 리전: `icn1` (서울)

## 7. 백업 3-2-1 규칙 (요약)

| 위치 | 방식 | 보관기간 |
|------|------|----------|
| 원본 | Railway PostgreSQL | 상시 |
| 복사본 1 | B2 GPG AES-256 암호화 (GitHub Actions, KST 03:30) | 30일 |
| 복사본 2 | Synology Cloud Sync 단방향 미러 (DSM 04:00) | 90일~3년 |

- 목표: **RTO 30분 / RPO 24시간**
- 워크플로우: `db-backup.yml` (활성), `db-migrate.yml` (수동)

> 📦 **상세 절차·복구 명령어·복구 훈련 체크리스트** → [`backup-recovery`](../backup-recovery/SKILL.md) 스킬 사용

## 8. 서비스 규모 (설계 기준)

| 항목 | 수치 |
|------|------|
| 동시접속 | 최대 50명 |
| 1일 제작량 | 앨범 500권 × 30p |
| 페이지 사양 | 11×14 inch, 200DPI, JPG Q95 |
| 페이지당 용량 | 약 3.5MB |
| 1일 데이터 | 약 51GB |
| 6개월 누적 | 약 9TB |

## 9. 월 비용

| 항목 | 플랜 | 월 비용 |
|------|------|---------|
| Vercel | Pro | 29,000원 |
| Railway | Pro + 사용량 | 29,000~51,000원 |
| Backblaze B2 (9TB) | 사용량 | 75,700원 |
| Cloudflare / Sentry / UptimeRobot | Free | 0원 |
| **합계** | | **약 13만~16만원** |

## 10. 보안 원칙 (요약)

- B2 모든 버킷 `allPrivate`, Public 버킷도 워터마크 적용본만 노출
- DB 백업 GPG 대칭키 암호화 필수
- 시크릿은 Railway/Vercel 환경변수로만 관리 (코드/문서/Git 기록 절대 금지)
- 관리자 2FA + IP allowlist + Rate Limiting
- 레거시 NAS(1.212.201.147) 5433/3000/3001 차단 완료 (2026-05-02)
- 개인정보보호법 의무: 처리방침 게시, 국외이전 동의 UI, SecurityLog

### 모니터링 도구 (스택)
- **Sentry** (`@sentry/nestjs` 10.40 설치) — 애플리케이션 에러 추적
- **UptimeRobot** (Free) — 5분 헬스체크
- **Vercel/Railway/Cloudflare Analytics** — 인프라 모니터링
- **DB SecurityLog 테이블** — 보안 이벤트 자체 기록

> 🚨 **장애·유출 대응 절차·KISA 24시간 신고·알림 임계값** → [`incident-response`](../incident-response/SKILL.md) 스킬 사용

## 11. 로컬 개발 환경 (참고)

| 환경 | 프론트 | API | 이미지 | DB |
|------|--------|-----|--------|-----|
| 로컬 | localhost:3002 | localhost:3001 | `apps/api/uploads/` | localhost:5432 |

```bash
npm run dev          # API + Frontend 동시 실행
npm run db:push      # 스키마 푸시
npm run db:studio    # Prisma Studio
```

## 12. 관련 문서

- `docs/INFRASTRUCTURE.md` — 상세 설계서 (모든 인프라 결정의 기준)
- `docs/DEPLOY_SPLIT_CHECKLIST.md` — 분리 배포 체크리스트
- `docs/SECURITY_CHECKLIST.md` — 보안 체크리스트

## 13. 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| v1.0 | 2026-04-24 | 초기 (밸런스 구성) |
| v1.1 | 2026-05-03 | Railway 역할 정의, DB 마이그레이션 명령어 현실화 |
| 스킬화 | 2026-05-09 | 실운영 상태 반영(ERP는 Vercel 통합, B2 실버킷명, db push→migrate deploy 전환 정책) |
| 보강 | 2026-05-09 | CI/CD 운영 섹션 추가, backup-recovery·incident-response 스킬로 분리 위임 |
