# Railway 마이그레이션 가이드

PhotoCafe ERP 시스템을 **Synology NAS Docker** → **Railway**로 이전하기 위한 환경변수 및 배포 가이드입니다.

> 이 문서는 `.env.production.example`(Synology 기준)과 `docker-compose.prod.yml`을 분석하여 Railway 환경에 맞게 재구성한 결과입니다.

---

## 1. Railway 프로젝트 구조

| 서비스 | 빌드 컨텍스트 | Dockerfile | 빌드 정의 파일 |
|--------|--------------|------------|---------------|
| `api` (NestJS) | 저장소 루트 | `apps/api/Dockerfile` | `railway.json` (루트) |
| `web` (Next.js) | 저장소 루트 | `apps/web/Dockerfile` | `apps/web/railway.toml` |
| `postgres` | Railway Postgres 플러그인 | - | - |

> 루트 `railway.json`은 `api` 서비스 기본 설정으로 사용됩니다. `web` 서비스는 `apps/web/railway.toml`에서 별도 정의되어 있어 Railway 대시보드의 **Service Settings → Root Directory**를 `apps/web`으로 지정하면 자동 인식됩니다.

---

## 2. 권장 서비스 구성

```
┌──────────────────────────────────────────────┐
│ Railway Project: photocafe                   │
├──────────────────────────────────────────────┤
│ ┌─────────────┐   ┌─────────────┐           │
│ │   web       │──▶│   api       │           │
│ │ (Next.js)   │   │ (NestJS)    │           │
│ │ Public URL  │   │ Public URL  │           │
│ └─────────────┘   └──────┬──────┘           │
│                          │                   │
│                   ┌──────▼──────┐           │
│                   │  postgres   │           │
│                   │ (Plugin)    │           │
│                   └─────────────┘           │
│                                              │
│   Volume: api → /app/uploads                │
└──────────────────────────────────────────────┘
```

- **web → api 통신**: Railway Private Networking 활용 권장
  - `INTERNAL_API_URL=http://api.railway.internal:3001`
- **외부 → api 통신**: Public URL 발급 후 `NEXT_PUBLIC_API_URL`에 설정

---

## 3. 환경변수 매핑

### 3.1 API 서비스 (NestJS)

#### 핵심 (필수)

| Synology `.env.production` | Railway `api` Variables | 비고 |
|---|---|---|
| `DATABASE_URL=postgresql://...@postgres:5432/...` | `DATABASE_URL=${{Postgres.DATABASE_URL}}` | Railway Postgres 플러그인 자동 주입 변수 참조 |
| `JWT_SECRET` | `JWT_SECRET` | 32자 이상 랜덤 문자열 (재발급 권장) |
| `JWT_EXPIRES_IN=1h` | `JWT_EXPIRES_IN=1h` | 동일 |
| `JWT_REFRESH_EXPIRES_IN=7d` | `JWT_REFRESH_EXPIRES_IN=7d` | 동일 |
| `API_PORT=3001` | `PORT=3001` | Railway는 `PORT` 자동 주입, 코드에서 `process.env.PORT \|\| 3001` 처리 확인 |
| `FRONTEND_URL=http://localhost:3000` | `FRONTEND_URL=https://${{web.RAILWAY_PUBLIC_DOMAIN}}` | web 서비스 public URL 동적 참조 |
| `NODE_ENV` | `NODE_ENV=production` | |
| `TZ` | `TZ=Asia/Seoul` | |

#### CORS

| 키 | 값 |
|---|---|
| `CORS_ORIGINS` | `https://${{web.RAILWAY_PUBLIC_DOMAIN}}` (콤마 구분으로 추가 도메인) |

#### 파일 업로드 (Volume 필수)

| 키 | 값 | 비고 |
|---|---|---|
| `UPLOAD_BASE_PATH` | `/app/uploads` | Railway Volume 마운트 경로와 일치시킬 것 |
| `UPLOAD_MAX_FILE_SIZE` | `52428800` | 50MB |
| `THUMBNAIL_MAX_SIZE` | `500` | px |

> **Volume 설정**: Railway 대시보드 → `api` 서비스 → **Volumes** → Mount Path `/app/uploads` 추가

#### OAuth (Naver / Kakao / Google)

콜백 URL을 **Railway 도메인**으로 변경하고 각 개발자 콘솔에 등록 필요:

| 키 | 값 (예시) |
|---|---|
| `NAVER_CLIENT_ID` | (네이버 개발자센터 발급) |
| `NAVER_CLIENT_SECRET` | (재발급 권장) |
| `NAVER_CALLBACK_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api/v1/auth/naver/callback` |
| `STAFF_NAVER_CALLBACK_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api/v1/auth/staff/naver/callback` |
| `KAKAO_CLIENT_ID` | |
| `KAKAO_CLIENT_SECRET` | |
| `KAKAO_CALLBACK_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api/v1/auth/kakao/callback` |
| `STAFF_KAKAO_CALLBACK_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api/v1/auth/staff/kakao/callback` |
| `KAKAO_REST_API_KEY` | |
| `GOOGLE_CLIENT_ID` | |
| `GOOGLE_CLIENT_SECRET` | |
| `GOOGLE_CALLBACK_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api/v1/auth/staff/google/callback` |
| `GOOGLE_CUSTOMER_CALLBACK_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api/v1/auth/google/callback` |

> **OAuth 콘솔 작업**: 각 OAuth 제공자(Naver/Kakao/Google) 개발자 콘솔에 Railway 도메인을 **승인된 리디렉션 URI**로 추가하지 않으면 로그인이 실패합니다.

#### 이메일/SMS

| 키 | 비고 |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_NAME` | 동일 값 |
| `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NO`, `SOLAPI_PF_ID` | 동일 값 |

#### 택배 연동

| 키 | 비고 |
|---|---|
| `SWEETTRACKER_API_KEY` | 동일 |
| `LOGEN_USER_ID`, `LOGEN_CUST_CD`, `LOGEN_API_KEY`, `LOGEN_API_ENV` | 동일 (운영 시 `LOGEN_API_ENV=prod`) |

#### 기타

| 키 | 비고 |
|---|---|
| `DATA_GO_KR_API_KEY` | 공공데이터포털 키 |
| `ADMIN_DEFAULT_PASSWORD` | 시드 관리자 초기 비밀번호 (시드 후 즉시 변경) |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | S3 사용 시 |
| `NODE_OPTIONS` | `--max-old-space-size=1536` (PDF 생성용 메모리 확보, Railway Plan에 맞게 조정) |

### 3.2 Web 서비스 (Next.js)

| 키 | 값 | 비고 |
|---|---|---|
| `NODE_ENV` | `production` | |
| `TZ` | `Asia/Seoul` | |
| `PORT` | `3000` | Railway 자동 주입 |
| `HOSTNAME` | `0.0.0.0` | Dockerfile에서 이미 설정됨 |
| `INTERNAL_API_URL` | `http://api.railway.internal:3001` | Private Network |
| `NEXT_PUBLIC_API_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}` | 클라이언트 빌드 시점에 인라인됨 → 변경 시 재빌드 필요 |

> `NEXT_PUBLIC_*` 변수는 빌드 시점에 정적으로 주입됩니다. 변경 후에는 `web` 서비스를 **Redeploy**해야 반영됩니다.

### 3.3 Postgres 플러그인

Railway가 자동 생성하므로 별도 설정 불필요. `api` 서비스에서 `${{Postgres.DATABASE_URL}}` 참조.

> **연결 풀 옵션 추가** (Synology에서 사용하던 옵션 보존 권장):
>
> ```
> DATABASE_URL=${{Postgres.DATABASE_URL}}?connection_limit=30&pool_timeout=20&connect_timeout=10
> ```
>
> Railway가 주입하는 URL에 쿼리스트링을 직접 결합할 수 없으므로, 별도 변수로 노출 후 코드에서 조립하거나 Railway 변수에서 직접 작성하세요.

---

## 4. 마이그레이션 절차

### 4.1 Railway 프로젝트 초기화

```bash
# 1. Railway CLI 설치 및 로그인
npm install -g @railway/cli
railway login

# 2. 새 프로젝트 생성 (혹은 기존 프로젝트 link)
railway init                # 새 프로젝트
# 또는
railway link                # 기존 프로젝트

# 3. 서비스 생성: api / web / postgres
#    Railway 대시보드에서 GUI로 추가하는 것을 권장
#    - api: GitHub repo 연결 → Root Directory: . (루트), Dockerfile 자동 인식
#    - web: GitHub repo 연결 → Root Directory: apps/web
#    - postgres: + New → Database → PostgreSQL
```

### 4.2 환경변수 일괄 설정

```bash
# .env.production을 그대로 사용하지 말고, 위 매핑표를 참고하여 신규 작성

# CLI로 일괄 등록 (예시)
railway variables set --service api JWT_SECRET=$(openssl rand -hex 32)
railway variables set --service api NODE_ENV=production
railway variables set --service api TZ=Asia/Seoul
# ... (반복)
```

> 또는 `.env` 파일을 작성하여 `railway variables set --service api $(cat .env.railway.api | xargs)` 형태로 일괄 등록 (`.env.railway.api`는 절대 커밋 금지).

### 4.3 DB 마이그레이션

```bash
# 1. 운영 Synology DB 덤프 (또는 B2 백업 최신본 사용)
docker exec photocafe-db pg_dump -U postgres -d printing_erp \
  --no-owner --no-privileges --format=plain \
  > photocafe_$(date +%Y%m%d).sql

# 2. Railway Postgres에 복원
railway run --service postgres psql < photocafe_$(date +%Y%m%d).sql

# 또는 Railway Postgres URL 직접 사용
psql "$(railway variables get --service postgres DATABASE_URL)" < photocafe_$(date +%Y%m%d).sql

# 3. Prisma 스키마 동기화 (필요 시)
railway run --service api npx prisma db push
```

### 4.4 도메인 연결

```
Railway Dashboard → 각 서비스 → Settings → Networking
  - Public Networking: Generate Domain (또는 Custom Domain)
  - Private Networking: 자동 활성화 (api.railway.internal)
```

도메인 발급 후:
1. `web` 서비스의 `NEXT_PUBLIC_API_URL`을 `api` Public URL로 업데이트 후 **Redeploy**
2. OAuth 콜백 URL을 각 콘솔에 등록
3. `apps/api/.env.example`의 `FRONTEND_URL`이 web Public URL과 일치하는지 확인

### 4.5 첫 배포 검증

```bash
# 헬스체크
curl https://<api-domain>/health
# → 200 OK + {"status":"ok",...} 기대

# Swagger
open https://<api-domain>/api/docs

# Web 접속
open https://<web-domain>

# 로그 모니터링
railway logs --service api --follow
railway logs --service web --follow
```

### 4.6 컷오버 (DNS / 사용자 통보)

1. **사전**: Synology DB 최종 백업 → B2 보관
2. **사용자 공지**: 점검 시간 안내 (OAuth 재로그인 필요 가능성 안내)
3. **DNS 전환** (커스텀 도메인 사용 시): Synology IP → Railway CNAME
4. **모니터링**: 24~48시간 양쪽 환경 병행 운영, Railway 안정 확인 후 Synology 컨테이너 중지

---

## 5. 마이그레이션 후 정리 작업

### 5.1 코드/문서 정리

- [ ] `DEPLOY_SYNOLOGY.md` → `docs/legacy/` 이동 또는 보관용 표시
- [ ] `.env.production.example` → Synology 의존 부분(`postgres:5432` 호스트명, `WEB_PORT` 등) 제거 또는 Railway 버전 추가
- [ ] `docker-compose.prod.yml` → 로컬 통합 테스트용으로만 유지
- [ ] `.github/workflows/deploy.yml.disabled` → 삭제
- [ ] `.github/workflows/db-migrate.yml` → Railway용으로 재작성 (`railway run` 기반) 또는 삭제
- [ ] `CLAUDE.md` 운영 서버 IP/포트 정보 → 실제 Railway 도메인으로 업데이트

### 5.2 백업 워크플로우 점검

`db-backup.yml`의 `DATABASE_URL` Secret을 Railway Postgres URL로 갱신:

```
GitHub Repo Settings → Secrets and variables → Actions
  DATABASE_URL = postgresql://postgres:****@<host>.proxy.rlwy.net:****/railway
```

> Railway Postgres는 외부 접속용 **Proxy URL**과 내부 접속용 **Private URL**이 다릅니다. GitHub Actions처럼 Railway 외부에서 접속할 때는 반드시 **Proxy URL** 사용.

### 5.3 모니터링/알림

- [ ] Railway 대시보드 알림 설정 (배포 실패, 헬스체크 실패)
- [ ] Sentry / Datadog 등 APM 연동 (선택)
- [ ] 디스크 사용량 알림 (Volume `/app/uploads` 확장 정책 검토)

---

## 6. 체크리스트 (Quick Reference)

```
[ ] Railway 프로젝트 생성 및 GitHub 연결
[ ] api / web / postgres 서비스 3개 생성
[ ] api Volume 마운트 (/app/uploads)
[ ] 환경변수 등록 (위 매핑표 기준, 시크릿 32자 재발급)
[ ] DB 덤프 → Railway Postgres 복원
[ ] Prisma db push로 스키마 동기화
[ ] api / web 도메인 발급
[ ] OAuth 콘솔 5개 (Naver/Kakao/Google×2/추가) 콜백 URL 등록
[ ] NEXT_PUBLIC_API_URL 설정 후 web Redeploy
[ ] /health 200 확인, /api/docs 접속 확인
[ ] 핵심 시나리오 스모크 테스트 (로그인, 주문 생성, 파일 업로드, 결제)
[ ] B2 백업용 DATABASE_URL Secret 갱신
[ ] CLAUDE.md / 문서 도메인 업데이트
[ ] Synology 컨테이너 정지 (1주일 모니터링 후)
```

---

## 7. 트러블슈팅

| 증상 | 원인 | 조치 |
|------|------|------|
| `web` 빌드 시 `NEXT_PUBLIC_API_URL` 비어있음 | 빌드 시점에 변수 미주입 | `apps/web/Dockerfile`이 `ARG`로 받음 → Railway Build Args에 등록하거나 환경변수로 등록 후 Redeploy |
| api 시작 시 `Can't reach database` | `DATABASE_URL` 미주입 | `${{Postgres.DATABASE_URL}}` 참조 문법 확인 |
| OAuth 로그인 redirect_uri_mismatch | 콜백 URL 미등록 | 각 OAuth 콘솔에 Railway 도메인 등록 |
| 파일 업로드 후 컨테이너 재시작 시 파일 사라짐 | Volume 미설정 | api 서비스 Volume에 `/app/uploads` 마운트 |
| 메모리 OOM (PDF 생성 시) | Railway 기본 RAM 부족 | 플랜 업그레이드 또는 `NODE_OPTIONS=--max-old-space-size=N` 조정 |
| Prisma `the URL must start with prefix postgres://` | DATABASE_URL 형식 오류 | Railway는 `postgresql://`로 주입 (정상). 사설 라이브러리에서 `postgres://`를 강제하면 코드 수정 |

---

## 8. 참고 파일

| 파일 | 역할 |
|------|------|
| `railway.json` | API 서비스 빌드/배포 설정 (루트) |
| `apps/api/railway.toml` | API 서비스 설정 (서비스 루트 지정 시) |
| `apps/web/railway.toml` | Web 서비스 설정 |
| `apps/api/Dockerfile` | API 빌드 정의 |
| `apps/web/Dockerfile` | Web 빌드 정의 (multi-stage, Next.js standalone) |
| `apps/api/.env.example` | 환경변수 전체 목록 |
| `.env.production.example` | Synology 기준 env (Railway 매핑 시 참고) |
| `.github/workflows/db-backup.yml` | B2 백업 (DATABASE_URL Secret 갱신 필요) |
