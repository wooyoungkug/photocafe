# Printing114 - 인쇄업 ERP 시스템

포토북/앨범 인쇄업체를 위한 통합 ERP 시스템

## AI 응답 가이드

> 본 프로젝트의 사용자는 코딩 지식이 깊지 않으므로, AI는 다음 원칙을 따릅니다.

- **선택지 제시 시 추천 표시 필수**: 선택지를 제시할 때마다 한 항목을 **[추천]** 으로 명시하고, 추천 이유를 1~2줄로 함께 제공한다.
- **위험 작업 사전 경고**: 데이터 손실/배포/푸시/결제 등 되돌리기 어려운 작업은 실행 전 영향과 복구 방법을 표로 요약한 뒤 사용자 승인을 받는다.
- **전문용어 풀어쓰기**: 약어/전문용어(예: CI/CD, OAuth, Volume 마운트 등)는 처음 등장 시 한 줄 설명을 덧붙인다.
- **다음 단계 항상 안내**: 작업 종료 시 "다음에 할 수 있는 일" 1~3가지를 추천 항목과 함께 제시한다.

예시:
> 다음 작업을 선택해 주세요.
> - **(1) Railway 환경변수 등록 [추천]** — 미설정 시 OAuth/이메일 작동 불가, 가장 우선순위 높음
> - (2) Synology DB 덤프 → Railway 복원 — 데이터 이관이 필요한 경우만
> - (3) 보류 — 다른 작업 후 진행

## 인프라 아키텍처 (Vercel + Railway + B2 + Cloudflare)

> **상세 설계서**: [`docs/INFRASTRUCTURE.md`](./docs/INFRASTRUCTURE.md) — 모든 인프라/배포/보안/백업 의사결정의 기준 문서. 이 절은 요약입니다.

### 서버 정보

| 환경 | 프론트엔드 | 백엔드 API | 이미지 스토리지 | DB |
|------|------------|------------|----------------|-----|
| 로컬 | `localhost:3002` | `localhost:3001` | 로컬 디스크 (`apps/api/uploads/`) | `localhost:5432` |
| 운영 | **Vercel** `https://photocafe.co.kr` (서울 `icn1`) | **Railway** `https://api.photocafe.co.kr` (오리건) | **Backblaze B2** `cdn.photocafe.co.kr` (`us-east-005`) | Railway Postgres |
| 운영 (Synology, **Legacy**) | `1.212.201.147:3000` ⚠️노출중 | `1.212.201.147:3001` ⚠️노출중 | `/volume1/docker/printing114/uploads` | `192.168.0.67:5433` (외부 5433 ⚠️노출중) |

### 4계층 분리 원칙

| 계층 | 서비스 | 위치 | 역할 |
|------|--------|------|------|
| CDN/보안 | Cloudflare Free | 전 세계 엣지 | DNS, 캐싱, WAF, DDoS 방어 |
| 프론트 | Vercel Pro | 서울 `icn1` | Next.js SSR/SSG (DNS only, **회색 구름**) |
| 백엔드 | Railway Pro | 미국 오리건 | NestJS + PostgreSQL (Proxied, 주황 구름) |
| 스토리지 | Backblaze B2 | 미국 버지니아 | 이미지 원본 보관 (Public/Private 2단계 버킷) |
| 백업 | Synology DS918+ | 한국 사무실 | DB 오프사이트 미러, Btrfs 스냅샷 90일 |

### 도메인-호스팅 매핑 (Cloudflare DNS)

| 서브도메인 | 호스팅 | Proxy | CNAME 대상 |
|-----------|--------|-------|-----------|
| `photocafe.co.kr` (apex) | Vercel | **DNS only (회색)** | `cname.vercel-dns.com` |
| `www` | Vercel | **DNS only (회색)** | `cname.vercel-dns.com` |
| `api` | Railway | Proxied (주황) | `<railway-app>.up.railway.app` |
| `cdn` | B2 | Proxied (주황) | `f005.backblazeb2.com` |

> **⚠️ Vercel 은 반드시 DNS only**: Vercel 자체 CDN 과 Cloudflare 프록시가 충돌하기 때문.

### B2 버킷 2단계 전략 (보안 핵심)

```
photocafe-public   → 로고, 워터마크 썸네일 (Public, CDN 캐시 OK)
photocafe-private  → 원본·완성본 (Private, 프리사인드 URL 5분만 유효)
```

### 백업 3-2-1 규칙

- **원본**: Railway PostgreSQL (상시)
- **복사본 1**: Backblaze B2 GPG 암호화 (30일, 매일 KST 03:30 GitHub Actions)
- **복사본 2**: Synology DS918+ 오프사이트 미러 (90일~3년, 매일 04:00 Cloud Sync 단방향)
- **목표**: RTO 30분 이내, RPO 24시간 이내

### 월간 비용

약 **13만~16만원** (Vercel $20 + Railway $20-35 + B2 9TB 75,700원 + Cloudflare Free)

---

> **현재 마이그레이션 상태 (2026-04-26 기준 — 외부 스캔 검증)**
> - ✅ **Railway API 배포 완료** (`api.photocafe.co.kr` → `photocafe-production.up.railway.app`)
> - ✅ **Vercel 프론트 분리 완료** (`photocafe.co.kr`, `www.*` → Vercel `icn1`)
> - ✅ **Cloudflare DNS/CDN 활성** (`cdn.photocafe.co.kr` → Cloudflare 프록시)
> - ✅ **B2 버킷 `allPrivate` 확인** (Lifecycle: daily 31d / weekly 12w / monthly 6mo)
> - ✅ **DB 백업 GPG AES-256 암호화** (GitHub Actions, 매일 KST 03:30)
> - ⏳ **B2 2단계 버킷** (`photocafe-public` 분리, 이미지 업로드 B2 이전)
> - ⏳ **Synology Cloud Sync 미러** (B2 → Synology 단방향 백업)
> - ✅ **레거시 NAS 포트 차단 완료** (5433/3000/3001 — 2026-05-02 ipTIME 포트포워딩 제거)
> - 단계별 절차는 `docs/INFRASTRUCTURE.md` §7. 배포 로드맵 참조.

### ✅ 보안 조치 완료 — 레거시 NAS 포트 차단 (2026-05-02)

**공인 IP `1.212.201.147`** 의 외부 노출 포트를 ipTIME 포트포워딩 제거로 차단 완료:

| 포트 | 서비스 | 조치 결과 |
| ---- | ------ | --------- |
| **5433** | **PostgreSQL** | ✅ 차단 완료 (`TcpTestSucceeded: False`) |
| 3000 | 옛 Next.js 프론트 | ✅ 차단 완료 |
| 3001 | 옛 NestJS API | ✅ 차단 완료 |
| 22 | SSH | 🟡 중간 — 키 인증 전용 + IP allowlist 권장 (미완료) |

잔여 권장 조치:

- SSH(22) 강화: DSM → 자동 차단 활성화, 공유기에서 회사 IP만 허용
- `docs/SECURITY_CHECKLIST.md` (Cloudflare/Vercel/Railway/B2/GitHub 전반 보안 체크리스트)

## 기술 스택

- **Backend**: NestJS 10, Prisma 5, PostgreSQL 16, JWT
- **Frontend**: Next.js 15, React 19, shadcn/ui, TanStack Query v5, Zustand

## 프로젝트 구조

```
apps/
├── api/                 # NestJS Backend (3001)
│   ├── src/modules/     # auth, company, product, pricing, order, statistics
│   └── prisma/          # schema.prisma
└── web/                 # Next.js Frontend (3002)
    ├── app/(dashboard)/ # 관리자 대시보드
    └── app/(shop)/      # 쇼핑몰
```

## 주요 명령어

```bash
npm run dev          # API + Frontend 동시 실행
npm run db:push      # 스키마 푸시
npm run db:studio    # Prisma Studio
```

## 기본 계정

### 관리자(직원) 로그인
**중요**: 관리자 로그인 시 이메일이 아닌 **직원 ID**를 입력해야 합니다.

| 직원 ID | 이름 | 비밀번호 |
|---------|------|----------|
| admin | 우영국 | .env 참조 또는 관리자 문의 |
| song | 송만석 | 관리자 문의 |

## 환경변수 (apps/api/.env)

> **주의**: 실제 시크릿 값은 절대 문서에 기록하지 마세요. `apps/api/.env.example` 참조.

```env
DATABASE_URL=환경변수(.env) 참조
JWT_SECRET=환경변수(.env) 참조 (최소 32자 랜덤 문자열)
FRONTEND_URL="http://localhost:3002"
```

## API 문서

Swagger: http://localhost:3001/api/docs

## 운영 환경 운영/관제

### Railway (현재)

```bash
# Railway CLI 설치 (최초 1회)
npm install -g @railway/cli
railway login
railway link            # 프로젝트 선택

# 상태 확인 / 로그 / 재시작
railway status
railway logs --service api
railway logs --service web
railway redeploy --service api

# Prisma 스키마 동기화 (운영 DB)
railway run --service api npx prisma db push
```

- **자동 배포**: GitHub `main` 브랜치 push → Railway가 자동 빌드/배포
- **빌드**: 루트 `railway.json`(API)와 `apps/{api,web}/railway.toml`이 각각 Dockerfile 빌드를 정의
- **환경변수**: Railway 대시보드 → 각 서비스 → Variables 탭에서 관리 (절대 코드/문서에 시크릿 기록 금지)

### Synology NAS (Legacy, 잔존 시)

```bash
sudo docker ps                                       # 상태 확인
sudo docker logs photocafe-api --tail 30             # 로그
sudo docker restart photocafe-api                    # 재시작
sudo docker exec photocafe-api npx prisma db push    # Prisma
```

> Synology 컨테이너 명은 마이그레이션을 거치며 `printing114-*` → `photocafe-*`로 변경되었습니다. 구 컨테이너가 남아있으면 충돌 방지를 위해 정리하세요.

#### 🚨 레거시 NAS 외부 포트 차단 절차 (즉시)

운영은 이미 Railway/Vercel 로 이전됐지만 NAS 의 옛 컨테이너가 여전히 외부에 응답 중입니다.

**1. PostgreSQL 5433 (최우선)** — DB 가 인터넷에 직접 노출되어 있어 무차별 대입 공격 위험

```bash
# Synology DSM Web UI:
#   제어판 → 보안 → 방화벽 → 인터페이스 선택 → 규칙 만들기
#     포트: 5433  /  소스 IP: 모두  /  동작: 거부  → 맨 위로 이동
#
# 또는 공유기/UTM 의 5433 포트포워딩 자체를 제거 (권장)
#   ※ 내부 네트워크에서는 192.168.0.67:5433 으로 계속 접근 가능해야 함
```

확인:
```bash
nc -zv 1.212.201.147 5433     # 차단 후 → "Connection refused" 또는 timeout 이어야 정상
```

**2. 옛 Next.js (3000) / NestJS (3001) 컨테이너 종료**

```bash
ssh admin@1.212.201.147
sudo docker ps                          # photocafe-web, photocafe-api 잔존 여부 확인
sudo docker stop photocafe-web photocafe-api
sudo docker rm   photocafe-web photocafe-api    # 완전히 안 쓸 거면 삭제
```

또는 컨테이너는 유지하되 외부 노출만 차단:
```bash
# 공유기 포트포워딩에서 3000, 3001 제거
```

**3. SSH (22) 강화**

```
DSM → 제어판 → 터미널 및 SNMP → SSH 활성화 (필요 시에만)
DSM → 제어판 → 보안 → 자동 차단 활성화 (10회 실패 시 30분 차단)
공유기에서 22 포트포워딩 → 회사 IP 만 허용 (allowlist)
```

**4. 차단 검증 (외부에서)**

```bash
# 모든 포트가 timeout 또는 refused 여야 정상
nc -zv 1.212.201.147 3000
nc -zv 1.212.201.147 3001
nc -zv 1.212.201.147 5433
```

## DB 관리

```bash
# 백업
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d printing_erp -f backup.sql

# 복원
psql -U postgres -d printing_erp -f backup.sql

# 초기화
npx prisma db push --force-reset && npm run db:seed
```

## 운영 서버 경로

### 목표 구성 (Vercel + Railway + B2)

| 구성요소 | 위치 / 경로 | 비고 |
|---------|------------|------|
| Web (Next.js) | **Vercel** `apps/web` Root Directory | `icn1` 리전, Pro 플랜 |
| API (NestJS) | **Railway** `apps/api/Dockerfile`, 컨테이너 내부 `/app` | Pro 플랜 |
| DB | **Railway Postgres** 플러그인 | `DATABASE_URL` 자동 주입 |
| 이미지 (운영 신규분) | **Backblaze B2** `photocafe-private/users/{userId}/...` | 프리사인드 URL 5분 |
| 이미지 (썸네일/로고) | **Backblaze B2** `photocafe-public/...` | Cloudflare 캐시 |
| DB 백업 | GitHub Actions → B2 `photocafe/backups/YYYY/MM/` (GPG 암호화) | 매일 KST 03:30 |
| DB 백업 미러 | Synology `/volume1/backups/db/` (Cloud Sync 단방향) | 매일 04:00 |

### Railway 현재 잔존 구성
- **API 서비스**: `apps/api/Dockerfile`, 컨테이너 내부 `/app`
- **Web 서비스**: `apps/web/Dockerfile` (Vercel 이전 후 제거 예정)
- **업로드 볼륨**: Railway Volume → `UPLOAD_BASE_PATH=/app/uploads` (B2 이전 후 폐기 예정)

### Synology NAS (Legacy, 단계적 제거)
- 백엔드: `/volume1/docker/printing114/`
- 프론트엔드: `/volume1/docker/printing114-web/apps/web/`
- compose 파일: `/volume1/docker/docker-compose.prod.yml`
- 업로드: `/volume1/docker/printing114/uploads`
- 신규 역할: **DB 백업 미러 전용** (`/volume1/backups/db/`)

## CI/CD

| 워크플로우 | 상태 | 트리거 | 용도 |
|-----------|------|--------|------|
| Vercel 자동 배포 (예정) | 도입 예정 | `main` push (Vercel GitHub 통합) | `apps/web` 빌드·배포, Preview URL 자동 생성 |
| Railway 자동 배포 | 활성 | `main` push | `apps/api` 빌드·배포 (Railway 자체 통합) |
| `db-backup.yml` | 활성 | 매일 18:00 UTC (= KST 03:30) | PostgreSQL → Backblaze B2 (GPG 암호화, daily/weekly/monthly) |
| `db-migrate.yml` | 활성 (수동) | `workflow_dispatch` | 로컬 DB 덤프 → Railway Postgres 복원 |
| Synology Cloud Sync (예정) | 도입 예정 | 매일 04:00 (DSM 자체 스케줄) | B2 `backups/` → Synology `/volume1/backups/db/` 단방향 미러 |

### 배포 전략 (분리 배포 기준)

- 상세 체크리스트: `docs/DEPLOY_SPLIT_CHECKLIST.md`
- **프론트만 배포 가능**: UI/문구/스타일 수정, 기존 API/응답 스키마/인증 규칙/DB 변경 없음
- **통합 배포 필요**: API 경로/응답 구조 변경, 인증 로직 변경, Prisma/DB 스키마 변경
- 원칙: **호환성(Backward compatibility) 유지가 확실할 때만 분리 배포**
- 불확실하면 통합 배포를 기본 선택

## UI 타이포그래피 기준

> **모든 UI 텍스트에 적용되는 서체 그룹 규칙**

| 그룹 | 크기 | 굵기 | 색상 | 배경 | Tailwind 클래스 |
|------|------|------|------|------|----------------|
| 본문 | 14px | 보통체 (400) | 검정 (#000) | 투명 | `text-[14px] text-black font-normal` |
| 제목 | 18px | 볼드체 (700) | 검정 (#000) | 투명 | `text-[18px] text-black font-bold` |
| 큰제목 | 24px | 보통체 (400) | 검정 (#000) | 투명 | `text-[24px] text-black font-normal` |

```tsx
// 본문 (기본 텍스트)
className="text-[14px] text-black font-normal"

// 제목
className="text-[18px] text-black font-bold"

// 큰제목
className="text-[24px] text-black font-normal"
```

- 강조가 필요한 경우에만 예외 적용 (상태배지, 오류, 링크 등)
- `text-muted-foreground`, `text-sm`, `text-xs` 대신 위 기준 사용
- 배경색은 기본 투명 (`bg-transparent`), 필요 시에만 지정

## 개발 요구사항

### 다국어 (i18n)
- **라이브러리**: next-intl 4.x
- **지원 언어**: ko(기본), en, ja, zh
- **자동감지**: 첫 방문 시 `Accept-Language` 헤더로 언어를 감지하여 `locale` 쿠키(1년 유효)에 저장.
- **라우팅 방식**: **쿠키 기반 자동감지** (URL `/[locale]/` 프리픽스 사용 안 함).
  - `apps/web/middleware.ts` 가 쿠키 검사 후 없으면 헤더로 자동 설정.
  - 서버 사이드는 `apps/web/i18n/request.ts` 에서 쿠키 값으로 `messages/{locale}.json` 로드.
  - `apps/web/i18n/routing.ts` 에 `locales`, `defaultLocale`, `detectLocaleFromHeader()` 정의.
- **번역 파일**: `apps/web/messages/{ko,en,ja,zh}.json`
- **사용자 수동 변경**: 언어 스위처 컴포넌트가 `locale` 쿠키를 덮어쓰면 즉시 반영.

### 배송정보 (파일업로드 시)
- 파일업로드(앨범주문) 시 폴더(원판)별로 배송정보 입력
- **발송지**: 포토미(제작회사) 또는 회원정보(스튜디오) 선택
- **배송지**: 회원정보(스튜디오) 또는 앨범고객(신랑/신부 주소 직접입력) 선택
- **권수별 개별배송**: 부수가 N권이면 권수만큼 배송정보 추가 입력 가능
- **배송방법**: 택배(parcel), 오토바이퀵(motorcycle), 화물(freight), 방문수령(pickup)
- **배송비**: 기초정보설정 > 배송비 에 등록된 금액 기준으로 고객 청구
- **주소검색**: 다음 우편번호 API 인라인 embed 방식 (팝업 없이 카드 안에서 검색)

### 배송비 정책 (주문 후 배송정보 수정 시)

고객이 주문 후 배송정보를 수정할 때 배송비 차액을 아래 정책으로 처리한다.

**수정 가능 단계**: 접수대기 · 접수완료 · 생산진행 · 배송준비 (`shipped`/`cancelled` 불가)

**추가요금 발생** (스튜디오배송 → 고객직배송 변경 등):
- `creditEnabled=true` 거래처: **여신거래** (다음 결제일에 자동 청구)
- 일반 거래처: **무통장입금** (회사정보 > 계좌번호 안내, 관리자 수동 확인)
- **카드결제** (예정): PG 연동 후 활성화. 연동 전까지는 단말기 수기결제 후 관리자 수동 확인 모드로 운영

**환불 발생** (고객직배송 → 스튜디오배송 변경 등):
- **포인트(크레딧) 적립** → `Client.pendingAdjustmentAmount` 양수 누적
- 다음 주문 생성 시 자동 차감 (별도 Point 모델 없음)

**관련 파일**:
- API: `PATCH /orders/:id/shipping-with-fee`
- 서비스: `apps/api/src/modules/order/services/order.service.ts` → `updateShippingWithFee()`
- 다이얼로그: `apps/web/components/order/shipping-edit-with-fee-dialog.tsx`
- 노출 위치: `/mypage/orders/{id}` 배송 정보 카드

### 크로스플랫폼
- PC(Windows), macOS, Android에서 접속·운영·업로드 가능
- 모바일(Android): webkitdirectory 미지원 → 다중파일 선택 모드 제공
- 데스크톱: 기존 폴더 업로드 유지
