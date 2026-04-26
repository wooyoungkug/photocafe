# Photocafe 호스팅 인프라 설계서

> **버전**: v1.0
> **작성일**: 2026-04
> **구성**: Vercel + Railway + B2 + Cloudflare 밸런스 구성
> **출처**: 프린팅솔루션즈(Photocafe) 인프라 설계 문서 (`photocafe.co.kr`)

이 문서는 향후 모든 인프라/배포/보안 작업의 **북극성 기준 문서**입니다. CLAUDE.md 의 서버 정보 표는 이 문서의 요약이며, 상세 절차·근거·체크리스트는 본 문서를 따르세요.

---

## 0. 검토 결과 요약

| 핵심 결정 | 내용 |
|-----------|------|
| 최종 구성 | **Vercel + Railway + B2 + Cloudflare** (밸런스 구성) |
| 한국 고객 대상 | Vercel 서울 엣지(`icn1`)로 웹 성능 확보 |
| 파일럿 운영 | Railway로 백엔드/DB 단순 운영 (1~2개 업체 실운영) |
| 이미지 9TB 보관 | Backblaze B2 저비용 스토리지 (S3 대비 1/4) |
| 보안/캐싱/DDoS | Cloudflare Free 플랜 |
| **월 예상 비용** | **약 13만~16만원 (백업 포함)** |

| 주요 고려사항 |
|---------------|
| 개인정보보호법 준수 필수 (과태료 최대 3,000만원) |
| DB 백업 3-2-1 규칙 적용 (Railway + B2 + 시놀로지) |
| B2 버킷은 Private 으로 운영 + 프리사인드 URL 사용 |
| 관리자 계정 2FA 및 IP 제한 필수 |

---

## 1. 프로젝트 개요

### 1.1 사업 현황
프린팅솔루션즈(브랜드명: Photocafe)는 사진앨범 제작 전문 업체로, 압축앨범·화보·액자 등을 제작합니다. 자체 생산·마케팅·분석이 가능한 쇼핑몰을 기획·개발 중.

### 1.2 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | Next.js 15 (App Router) |
| 백엔드 | NestJS 10 (포트 3001) |
| 데이터베이스 | PostgreSQL + Prisma 5 |
| 국제화 | next-intl (ko / en / ja / zh) |
| UI | shadcn/ui + Tailwind CSS |
| 상태관리 | TanStack Query + Zustand |
| 구조 | 모노레포 (`apps/web` + `apps/api`) |
| 배포 | Git push 자동배포 |

### 1.3 서비스 규모

| 항목 | 수치 |
|------|------|
| 동시접속자 | 최대 50명 |
| 1일 제작량 | 앨범 500권 |
| 1권당 페이지 | 30페이지 |
| 페이지 크기 | 11×14 inch, 200DPI, JPG Q95 |
| 페이지당 용량 | 약 3.5MB |
| **1일 데이터 생성량** | **약 51GB** |
| **월간 누적** | **약 1.5TB** |
| **6개월 보관 누적** | **약 9TB** |
| 이미지 포맷 | JPG 단일 |

### 1.4 도메인 구조

| 도메인 | 용도 | 호스팅 |
|--------|------|--------|
| `photocafe.co.kr` | 메인 웹사이트 | **Vercel** |
| `www.photocafe.co.kr` | www 리다이렉트 | **Vercel** |
| `api.photocafe.co.kr` | 백엔드 API | **Railway** |
| `cdn.photocafe.co.kr` | 이미지 CDN | **B2 + Cloudflare** |

### 1.5 운영 전략

- 1~2개 파일럿 업체로 실 운영하며 개발 마무리
- 데이터 마이그레이션은 로컬 DB 일부만 이전
- 기존 이미지는 이전하지 않음 (신규 주문부터 B2 사용)
- 클라우드 이전 우선순위: **보안 > 안정성 > 비용**
- 기존 Synology 기반(`printing114.com`) 서비스는 단계적 제거

---

## 2. 전체 아키텍처

### 2.1 다이어그램

```
┌─────────────────────────────────────────────────────┐
│              사용자 (한국, 일본, 중국 등)            │
└─────────────────────────┬───────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────┐
│  Cloudflare (DNS + CDN + WAF + DDoS 방어)  [Free]   │
└──┬──────────────────┬──────────────────┬────────────┘
   │                  │                  │
   ▼                  ▼                  ▼
photocafe.co.kr   api.photocafe.co.kr   cdn.photocafe.co.kr
   │                  │                  │
   ▼                  ▼                  ▼
┌──────────┐    ┌──────────────┐   ┌──────────────┐
│  Vercel  │    │   Railway    │   │ Backblaze B2 │
│  (서울)  │    │  (오리건)    │   │  (US East)   │
│          │    │              │   │              │
│ Next.js  │───▶│ NestJS +     │◀──│  이미지 원본 │
│ (SSR/SSG)│    │ PostgreSQL   │   │  (Private)   │
└──────────┘    └──────┬───────┘   └──────┬───────┘
                       │                   │
                       ▼                   ▼
              ┌────────────────────────────────┐
              │  시놀로지 DS918+ (사무실, 한국) │
              │  • DB 백업 수신                │
              │  • B2 이미지 오프사이트 미러   │
              │  • Btrfs 스냅샷 보관           │
              └────────────────────────────────┘
```

### 2.2 각 계층의 역할

| 계층 | 서비스 | 역할 | 위치 |
|------|--------|------|------|
| CDN/보안 | Cloudflare | DNS, 캐싱, WAF, DDoS 방어 | 전 세계 엣지 |
| 프론트엔드 | Vercel | 웹 페이지 서빙 (Next.js) | 서울 (`icn1`) |
| 백엔드 | Railway | API, DB, 비즈니스 로직 | 미국 오리건 |
| 스토리지 | Backblaze B2 | 이미지 원본 보관 | 미국 버지니아 |
| 백업 | 시놀로지 | DB/이미지 오프사이트 백업 | 한국 사무실 |

### 2.3 핵심 철학 — 각자 잘하는 일에 집중

- **Vercel**: 한국 엣지에서 빠르게 웹페이지 서빙
- **Railway**: 복잡한 비즈니스 로직과 DB를 단순하게 운영
- **B2**: 대용량 이미지를 저렴하게 보관 (S3 대비 1/4)
- **Cloudflare**: 무료로 보안+캐싱+DDoS 방어
- **시놀로지**: 이미 있는 장비를 오프사이트 백업에 활용

---

## 3. 구성요소 상세 (초급자 비유)

### 3.1 Backblaze B2 — 대형 사진 창고

사진 한 장 3.5MB × 하루 15,000장 = 51GB/일 → 6개월 9TB. 이를 Railway에 함께 두면 사무실이 꽉 차서 처리 속도 저하 → **이미지 전용 창고를 따로** 둠.

**장점**
- 저렴: 1TB 월 약 8,000원 (S3의 1/4)
- 무제한 확장: 100TB 이상 즉시 가능
- 내구성: 자동 복제 (99.999999999%)
- S3 호환: AWS SDK 그대로 사용

**설정 정보**

| 항목 | 값 |
|------|-----|
| 계정 | `wooceo@gmail.com` |
| 버킷명 | `photocafe` |
| Region | `us-east-005` |
| Bucket ID | `88fd538fbf15b75f98d70216` |
| Endpoint | `s3.us-east-005.backblazeb2.com` |
| 예상 월 비용 (9TB) | 약 75,700원 |

### 3.2 Cloudflare — 동네 편의점 + 경비원

B2 창고는 미국 동부에 있어 한국에서 거리가 멀다. Cloudflare 가 전 세계 300개 도시 엣지에 자주 쓰는 파일을 캐싱 → 한국에서 응답속도 30배 향상.

**4가지 역할**

| 역할 | 기능 | 효과 |
|------|------|------|
| CDN (편의점) | 전 세계 엣지에 파일 캐시 | 응답속도 30배 ↑ |
| DNS (안내원) | 도메인 주소록 관리 | 접속 경로 안내 |
| WAF (경비원) | SQL 인젝션, XSS 등 차단 | 해킹 원천 차단 |
| Rate Limiting (교통정리) | 과도한 요청 차단 | DDoS·봇 방어 |

**설정 정보**

| 항목 | 값 |
|------|-----|
| Account ID | `e5448bb4adea5a19028805e5b8fc1456` |
| Zone ID | `159cdb2cf9817d6b29e9869be434e75a` |
| 네임서버 1 | `bonnie.ns.cloudflare.com` |
| 네임서버 2 | `boyd.ns.cloudflare.com` |
| 플랜 | Free (WAF, DDoS 방어 포함) |

### 3.3 Vercel — 한국 매장 (쇼윈도)

Railway 는 미국 오리건에만 있어 한국 사용자는 매 요청마다 태평양 왕복 → 페이지 하나 여는 데 10초+. Vercel 서울 엣지(`icn1`)가 Next.js 페이지를 서빙하여 6배 빠름.

**Vercel 담당**
- 메인 페이지, 상품 목록, 카테고리
- 앨범 편집기 UI
- 로그인/회원가입 화면
- 장바구니/결제 화면
- 정적 페이지 (회사 소개, 이용약관 등)

> **왜 Railway 하나로 다 안 하나요?**
> Railway 올인원: 페이지 로딩 0.3초 × 요청 수십 개 → 체감 10초
> Vercel 추가: 페이지 로딩 0.05초 × 요청 수십 개 → 체감 1초
> 월 3만원 추가로 6배 빠른 성능을 얻는 구조.

### 3.4 Railway — 본사 사무실

실제 비즈니스 로직과 DB 운영. 모노레포의 `apps/api` 디렉토리가 배포됨.

**Railway 담당**
- 로그인 인증 (비밀번호 검증)
- 주문 처리 및 상태 관리
- 결제 처리 (PG 사 연동)
- 이미지 업로드 프리사인드 URL 발급
- 주문서 PDF 생성
- 관리자 기능
- PostgreSQL DB 운영

### 3.5 시놀로지 DS918+ — 한국 사무실 금고

Railway DB 와 B2 이미지를 오프사이트 백업하는 물리 저장소. 클라우드 전체가 장애·해킹되어도 한국 사무실에 사본 존재.

| 항목 | 값 |
|------|-----|
| 모델 | DS918+ (4bay, Celeron J3455) |
| 메모리 | 4GB (8GB 확장 가능) |
| 네트워크 | 2 × 1GbE |
| 파일시스템 | Btrfs (스냅샷 지원) |
| 암호화 | AES-NI 하드웨어 가속 |
| 권장 디스크 | 8TB × 4 RAID5 = 24TB |
| 주요 앱 | Cloud Sync, Hyper Backup, Snapshot Replication |

---

## 4. 플랫폼별 상세 설정

### 4.1 Vercel

**플랜**: Pro $20/월 (상업 이용 시 Hobby 플랜 금지 조항)

**빌드 설정**

| 항목 | 값 |
|------|-----|
| 연결 방식 | GitHub 저장소 직접 연결 |
| Root Directory | `apps/web` |
| Framework Preset | Next.js (자동 감지) |
| Build Command | `pnpm build` |
| Install Command | `pnpm install` |
| Node Version | 20.x 또는 22.x |
| 리전 | `icn1` (서울 우선 지정) |

**환경변수**

```bash
NEXT_PUBLIC_API_URL=https://api.photocafe.co.kr
NEXT_PUBLIC_CDN_URL=https://cdn.photocafe.co.kr
NEXT_PUBLIC_SITE_URL=https://photocafe.co.kr
NEXT_PUBLIC_DEFAULT_LOCALE=ko
```

**성능 최적화 팁**
- `next/image` 의 `remotePatterns` 에 `cdn.photocafe.co.kr` 등록
- ISR + `revalidateTag` 로 상품 페이지 정적 생성
- `next-intl` 미들웨어 `matcher` 로 정적 파일 제외
- Vercel Analytics 로 Core Web Vitals 모니터링

### 4.2 Railway

**서비스 구성 및 비용**

| 서비스 | 용도 | 예상 비용 |
|--------|------|-----------|
| NestJS 서비스 | `apps/api` 배포 | $5~15/월 |
| PostgreSQL | Railway 내장 DB | $5~15/월 |
| (선택) Redis | 세션/큐 관리 | $5~10/월 |
| **합계** | Pro 기본 + 사용량 | **$20~35/월** |

**환경변수**

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
CORS_ORIGIN=https://photocafe.co.kr,https://www.photocafe.co.kr
B2_ACCESS_KEY=<키>
B2_SECRET_KEY=<시크릿>
B2_BUCKET=photocafe
B2_ENDPOINT=s3.us-east-005.backblazeb2.com
JWT_SECRET=<32자 랜덤>
ADMIN_2FA_ISSUER=Photocafe
```

**시작 명령어** (DB 마이그레이션 자동 적용)

```bash
pnpm prisma migrate deploy && pnpm start:prod
```

**헬스체크**: `@nestjs/terminus` 로 `/health` 구현 → Railway Health Check 등록, 실패 3회 시 자동 재시작.

```
GET /health → { status: 'ok', db: 'ok', b2: 'ok' }
```

### 4.3 Backblaze B2

**버킷 구조 (2단계 전략, 보안 핵심)**

```
photocafe-public/    (Public, CDN 캐시 OK)
   ├─ site-assets/     → 로고, 배너, 아이콘
   ├─ thumbnails/      → 저해상도 + 워터마크
   └─ shared/          → 공개 설정한 작품

photocafe-private/   (Private, 프리사인드 URL만)
   ├─ users/
   │  └─ {userId}/
   │     ├─ originals/  → 고객 원본 사진
   │     └─ finished/   → 완성된 앨범
   └─ orders/           → 주문 관련 파일
```

**Application Key 발급 원칙**
- 용도별 별도 키 (Railway API용, 백업용, 관리자용 분리)
- 각 키에 필요한 버킷/권한만 최소 부여
- **90일마다 키 로테이션** (권장)

### 4.4 Cloudflare

**DNS 레코드**

| 서브도메인 | 타입 | 값 | Proxy |
|-----------|------|-----|-------|
| `@` | CNAME | `cname.vercel-dns.com` | **DNS only (회색)** |
| `www` | CNAME | `cname.vercel-dns.com` | **DNS only (회색)** |
| `api` | CNAME | `xxx.up.railway.app` | Proxied (주황) |
| `cdn` | CNAME | `f005.backblazeb2.com` | Proxied (주황) |

> **⚠️ Vercel 은 DNS only 로!**
> Vercel 은 자체 CDN 보유 → Cloudflare 프록시와 충돌.
> `photocafe.co.kr`, `www` 는 반드시 회색 구름.

**Cache Rules**

| URL 패턴 | Edge TTL | Browser TTL |
|----------|----------|-------------|
| `api.photocafe.co.kr/products*` | 5분 | 1분 |
| `api.photocafe.co.kr/categories*` | 30분 | 10분 |
| `cdn.photocafe.co.kr/*` | 1개월 | 1주 |
| `api.photocafe.co.kr/auth/*` | Bypass | Bypass |
| `api.photocafe.co.kr/admin/*` | Bypass | Bypass |

**보안 설정**
- SSL/TLS: **Full (strict)**
- Always Use HTTPS: ON
- HSTS: Enabled, max-age 1년
- Minimum TLS Version: 1.2
- Bot Fight Mode: ON
- WAF Managed Rules: 기본셋 ON
- Rate Limiting:
  - `/auth/login`: 분당 5회
  - `/api/*`: 분당 100회

---

## 5. DB 백업 전략 (3-2-1)

### 5.1 왜 백업이 중요한가

DB 에는 회원, 주문, 결제, 사진 위치(B2 경로) 등 핵심 데이터. **DB 손실 시 B2 9TB 이미지가 있어도 누구 것인지 알 수 없어 무용지물.**

**DB 손실 실제 시나리오**
1. 개발자 실수 (`WHERE` 조건 누락한 `DELETE`) — **가장 흔함**
2. Railway 서비스 장애 (2024년 실제 몇 시간 다운)
3. 해킹 (랜섬웨어로 데이터 암호화)
4. Prisma 마이그레이션 실수
5. 결제 실패로 계정 정지 → 데이터 삭제

### 5.2 3-2-1 백업 규칙

- **3개의 복사본** (원본 포함)
- **2가지 다른 저장 매체**
- **1개는 반드시 오프사이트** (다른 건물)

### 5.3 포토카페 적용

| 복사본 | 저장 위치 | 보관 기간 | 비고 |
|--------|----------|-----------|------|
| 원본 | Railway DB (미국) | 상시 | 운영 중 |
| 복사본 1 | Backblaze B2 (미국) | 30일 | **GPG 암호화** 저장 |
| 복사본 2 | 시놀로지 DS918+ (한국) | 90일~3년 | **오프사이트, 물리적** |

### 5.4 백업 계층

| 단계 | 주기 | 저장 위치 | 보관 | 복구 시간 |
|------|------|-----------|------|-----------|
| 1단계: Railway 자동 | 일 1회 | Railway | 7일 | 5분 |
| 2단계: B2 오프사이트 | 일 1회 | B2 (암호화) | 30일 | 15분 |
| 3단계: 시놀로지 로컬 | 일 1회 | 시놀로지 | 90일 | 30분 |
| 4단계: 월말 아카이브 | 월 1회 | 시놀로지 + B2 | 3년 | 1시간 |

### 5.5 GitHub Actions 구현 (추천, 무료)

**`.github/workflows/db-backup.yml`** (매일 KST 03:30)

```yaml
name: DB Daily Backup

on:
  schedule:
    - cron: '30 18 * * *'   # UTC 18:30 = KST 03:30
  workflow_dispatch:        # 수동 실행 가능

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: PostgreSQL 클라이언트 설치
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client-16

      - name: DB 덤프 생성 및 암호화
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          BACKUP_PASSWORD: ${{ secrets.BACKUP_PASSWORD }}
        run: |
          DATE=$(date +%Y%m%d_%H%M)
          pg_dump $DATABASE_URL | gzip > backup_$DATE.sql.gz
          gpg --symmetric --cipher-algo AES256 \
              --batch --passphrase "$BACKUP_PASSWORD" \
              backup_$DATE.sql.gz

      - name: B2 업로드
        env:
          B2_ACCESS_KEY: ${{ secrets.B2_ACCESS_KEY }}
          B2_SECRET_KEY: ${{ secrets.B2_SECRET_KEY }}
        run: |
          rclone copy backup_*.sql.gz.gpg \
            b2:photocafe/backups/$(date +%Y/%m)/

      - name: 실패 시 슬랙 알림
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"⚠️ DB 백업 실패!"}'
```

### 5.6 시놀로지 자동 미러

시놀로지 **Cloud Sync** 앱으로 B2 `backups/` 폴더 자동 다운로드.

| 설정 항목 | 값 |
|-----------|-----|
| 동기화 원본 | `b2:photocafe/backups/` |
| 동기화 대상 | `/volume1/backups/db/` |
| 동기화 주기 | 매일 04:00 |
| 동기화 방향 | **원격 → 로컬 (단방향)** |
| Btrfs 스냅샷 | 일 1회 자동 |
| 스냅샷 보관 | 90일 |
| 암호화 | Btrfs 볼륨 레벨 암호화 |

### 5.7 복구 절차

```bash
# 1. B2에서 백업 파일 다운로드
rclone copy b2:photocafe/backups/2026/04/backup_20260420_0330.sql.gz.gpg ./

# 2. GPG 복호화
gpg --decrypt --batch --passphrase "$BACKUP_PASSWORD" \
    backup_20260420_0330.sql.gz.gpg > backup.sql.gz

# 3. 압축 해제
gunzip backup.sql.gz

# 4. 새 DB에 복원
psql $NEW_DATABASE_URL < backup.sql

# 5. 복원 검증
psql $NEW_DATABASE_URL -c 'SELECT COUNT(*) FROM users;'
```

> **⚠️ 반드시 복구 연습하세요!**
> - 월 1회 (매월 첫째 주 토요일) 테스트 Railway 프로젝트에 복구
> - **목표 복구 시간(RTO)**: 30분 이내
> - **목표 복구 시점(RPO)**: 최대 24시간 손실 허용

---

## 6. 보안 대책

> **보안은 "한 군데만 뚫려도 전체가 뚫리는" 영역.** 사진앨범 사업은 결혼사진·가족사진 등 민감 이미지를 다루므로 특히 주의.

### 6.1 위험도 분류

| 위험도 | 의미 | 대응 시기 |
|--------|------|-----------|
| 🔴 High | 지금 당장 고쳐야 함 (실제 피해 가능) | Week 1 |
| 🟡 Medium | 배포 전에 해결 | Week 2~3 |
| 🟢 Low | 여유 있을 때 개선 | Week 4 이후 |

### 6.2 [🔴 High] B2 버킷 Private 전환

**문제점**
- 현재 B2 버킷이 Public 이면 URL 만 알면 누구나 접근
- URL 추측 공격, 구글 크롤링 노출 가능
- **개인정보보호법 위반 소지**

**해결책: 2단계 버킷 + 프리사인드 URL**
- `photocafe-public`: 로고, 썸네일(워터마크) — Public, 캐시 OK
- `photocafe-private`: 원본, 완성본 — **Private, 프리사인드 URL 만**

**프리사인드 URL 구현 (NestJS)**

```typescript
@Get('my-photos')
@UseGuards(JwtAuthGuard)
async getMyPhotos(@User() user) {
  const photos = await this.prisma.photo.findMany({
    where: { userId: user.id }   // 본인 것만
  });
  return photos.map(photo => ({
    ...photo,
    url: this.s3.getSignedUrl('getObject', {
      Bucket: 'photocafe-private',
      Key: photo.key,
      Expires: 300   // 5분
    })
  }));
}
```

### 6.3 [🔴 High] 개인정보 암호화

**법적 의무 암호화 항목**

| 항목 | 암호화 방식 | 비고 |
|------|------------|------|
| 비밀번호 | bcrypt (단방향 해시) | 복호화 불가 |
| 주민등록번호 | **수집 금지** | 처음부터 X |
| 신용카드번호 | **저장 금지** | PG 사 위임 |
| 전화번호 | AES-256 (양방향) | 필요 시 복호화 |
| 주소 | AES-256 (양방향) | 배송 시 복호화 |
| 이메일 | AES-256 (양방향) | 마스킹 표시 |

**Prisma 암호화 미들웨어 예시**

```typescript
import { createCipheriv, createDecipheriv } from 'crypto';

prisma.$use(async (params, next) => {
  if (params.model === 'User') {
    if (params.action === 'create' || params.action === 'update') {
      if (params.args.data.phone) {
        params.args.data.phone = encrypt(params.args.data.phone);
      }
      if (params.args.data.address) {
        params.args.data.address = encrypt(params.args.data.address);
      }
    }
  }
  return next(params);
});
```

### 6.4 [🔴 High] 개인정보보호법 대응

> **법적 처벌 수위 (반드시 준수)**
> - 과태료: 최대 **3,000만원**
> - 과징금: 매출액 3% 이하
> - 민사 책임: 피해자 1인당 최대 300만원
> - 형사 처벌: 5년 이하 징역
> - 사진 10,000명 유출 시 최대 피해액 **300억원**

**필수 조치 (법적 의무)**
- 개인정보 처리방침 공개 (홈페이지 하단 링크)
- 수집 시 동의 받기 (체크박스 분리)
- 암호화 (법정 항목 AES-256 이상)
- **접속 기록 1년 이상 보관**
- 보유 기간 초과 시 자동 파기
- **유출 시 24시간 내 KISA 신고 (118)**

**국외 이전 동의 (중요!)**

Railway 와 B2 가 미국에 있으므로 회원가입 시 **명시적 동의 필수**:

```
☐ 개인정보 수집/이용 동의 (필수)
☐ 개인정보 국외 이전 동의 (필수)
    이전 국가: 미국
    이전 항목: 모든 개인정보
    이전 업체: Railway Corp., Backblaze Inc.
    이전 목적: 서비스 제공 및 이미지 저장
    보유 기간: 주문 완료 후 6개월
☐ 마케팅 수신 동의 (선택)
```

### 6.5 [🟡 Medium] 관리자 계정 보호

> 관리자 계정은 해커 1순위 타겟. 뚫리면 전체 고객 정보 유출.

**필수 보안 3종 세트**

| 방어책 | 구현 | 효과 |
|--------|------|------|
| 2단계 인증 (2FA) | Google Authenticator TOTP | 비밀번호 유출돼도 안전 |
| IP 제한 | Cloudflare WAF로 `/admin/*` | 인가된 네트워크만 접근 |
| 비밀번호 정책 | 최소 16자 + 3개월 교체 | brute force 방어 |

**Cloudflare IP 제한 설정**

```
WAF → Custom Rules → Create Rule
Name: Admin IP Whitelist

When: (http.host eq "api.photocafe.co.kr" and
       http.request.uri.path contains "/admin")
  and (ip.src ne 211.234.56.78    # 사무실 고정IP
   and ip.src ne 121.x.x.x        # 사장님 집
   and ip.src ne 59.x.x.x)        # 개발자

Then: Block
```

### 6.6 [🟡 Medium] 시크릿 관리

> **가장 흔한 사고: GitHub 에 실수로 API 키 커밋**
> 봇이 30초 만에 스캔 → 키 탈취 → B2 계정 해킹 → 암호화폐 채굴 → 수천만원 피해. 월 수십 건씩 실제 보고됨.

**원칙**
- 개발용: `.env.local` (절대 커밋 금지, `.gitignore` 등록)
- 배포용: Vercel/Railway/GitHub Actions Secrets (암호화 저장)
- 예시 파일: `.env.example` 만 커밋 (값은 `XXX` 마스킹)

**유출 방지 도구**

```bash
# git-secrets 설치 (커밋 전 자동 검사)
brew install git-secrets
git secrets --install
git secrets --register-aws

# GitHub Secret Scanning 활성화
# Settings → Security → Secret scanning → Enable

# 정기 점검 (월 1회)
trufflehog git file:///path/to/repo
```

### 6.7 [🟡 Medium] 결제 보안

> **카드 정보는 절대 우리 서버에 저장하지 않습니다**
> - 카드번호 DB 저장 시 PCI-DSS 위반
> - 카드 이미지 수집/저장 금지
> - CVV 수집 금지
> - 모든 결제는 PG 사에 위임, 승인번호만 저장

**추천 PG 사**

| PG사 | 수수료 | 특징 |
|------|--------|------|
| **토스페이먼츠** | 3.0% | 개발자 친화, 문서 우수 ⭐ |
| 아임포트 | 3.3% | 여러 PG 통합 |
| 카카오페이 | 3.5% | 간편결제 강점 |
| 네이버페이 | 3.3% | 검색 노출 유리 |

**결제 플로우**

```
손님: 결제하기 클릭
    ↓
우리 서버: PG사 결제창 호출 (orderId, amount 전달)
    ↓
PG사 결제창: 카드번호 직접 입력 (우리 서버 안 거침)
    ↓
PG사: 결제 처리 + Webhook으로 결과 알림
    ↓
우리 DB: order_id, payment_id(승인번호), amount만 저장
```

### 6.8 [🟡 Medium] 일반 웹 보안 (OWASP Top 10)

| 공격 유형 | 방어책 |
|----------|--------|
| SQL Injection | Prisma 사용 (자동 이스케이프) |
| XSS | Next.js 기본 이스케이프 + `dangerouslySetInnerHTML` 금지 |
| CSRF | `SameSite=strict` 쿠키 또는 `csurf` 미들웨어 |
| Rate Limiting | Cloudflare WAF 규칙 |
| HTTPS 강제 | Cloudflare Always Use HTTPS + HSTS |
| 보안 헤더 | NestJS `helmet` 미들웨어 |

### 6.9 [🟢 Low] 모니터링 및 로깅

**3단계 로그 전략**

| 계층 | 도구 | 비용 | 용도 |
|------|------|------|------|
| 애플리케이션 | Sentry | 무료 (5K events/월) | 에러 추적 |
| 인프라 | Vercel/Railway/CF Analytics | 무료 | 성능 모니터링 |
| 보안 | DB `SecurityLog` 테이블 | 자체 구현 | 법적 의무 + 공격 추적 |
| 가동시간 | UptimeRobot | 무료 | 5분마다 헬스체크 |

**SecurityLog 테이블 스키마**

```prisma
model SecurityLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String   // 'login', 'failed_login', 'admin_access'
  ip        String
  userAgent String
  success   Boolean
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
  @@index([action, createdAt])
}
```

**즉시 알림 항목 (슬랙)**
- 관리자 로그인 실패 5회 이상
- 비인가 IP 에서 `/admin` 접근 시도
- 대량 데이터 다운로드 감지
- 백업 실패
- DB 연결 실패
- 응답 시간 5초 이상 지속

---

## 7. 배포 로드맵

### 7.1 Week 1: 치명적 보안 (🔴)

| 일차 | 작업 | 예상 시간 |
|------|------|-----------|
| 1일 | Vercel 계정 연결, `apps/web` Preview 배포 | 2시간 |
| 2일 | Railway에 `apps/api` + PostgreSQL 배포 | 3시간 |
| 3일 | Cloudflare DNS 전환, 서브도메인 4개 연결 | 2시간 |
| 4일 | B2 Private 전환 + 2단계 버킷 구조 | 3시간 |
| 5일 | 프리사인드 URL 업로드 구현 | 4시간 |
| 6일 | DB 암호화 필드 적용 (Prisma 미들웨어) | 3시간 |
| 7일 | GitHub Actions DB 백업 워크플로우 설정 | 2시간 |

### 7.2 Week 2: 법적 필수사항 (🔴)
- 개인정보 처리방침 작성 및 게시
- 이용약관 작성
- 국외 이전 동의 UI 구현
- `SecurityLog` 테이블 생성
- 자동 파기 크론잡 (6개월 후 삭제)
- 법무 검토 (선택, 50~100만원)

### 7.3 Week 3: 인증/인가 (🟡)
- 관리자 2FA 구현 (`speakeasy` + QR 코드)
- Cloudflare WAF 로 관리자 IP 제한
- Rate Limiting 규칙 적용
- JWT 토큰 만료 + Refresh 토큰
- 비밀번호 정책 강제 (16자+ 요구)
- 결제 연동 (토스페이먼츠)

### 7.4 Week 4: 모니터링 및 파일럿 (🟢)
- Sentry 연동 (Next.js + NestJS)
- UptimeRobot 5분 체크 설정
- 슬랙/이메일 알림 채널 구성
- 파일럿 업체 1곳 계정 발급
- 실주문 1건 E2E 테스트
- 복구 훈련 1회 실시

### 7.5 최종 보안 체크리스트

**🔴 지금 당장**
- [ ] B2 버킷 Private 전환 완료
- [ ] Public 버킷 따로 생성 (썸네일용)
- [ ] DB 백업 GPG 암호화 적용
- [ ] 개인정보 처리방침 작성
- [ ] 국외 이전 동의 문구 추가
- [ ] 개인정보 필드 암호화
- [ ] 비밀번호 bcrypt 해시
- [ ] `.env` 파일 `.gitignore` 등록
- [ ] GitHub Secret Scanning 활성화

**🟡 배포 전까지**
- [ ] 관리자 2FA 구현
- [ ] 관리자 IP 제한 (Cloudflare)
- [ ] 결제는 PG 사 위임 (카드정보 저장 X)
- [ ] Rate Limiting 설정
- [ ] HTTPS 강제 + HSTS
- [ ] 보안 헤더 (`helmet`)
- [ ] CSRF 방어
- [ ] 입력값 검증 (`class-validator`)
- [ ] Cloudflare WAF 기본 규칙 적용
- [ ] 프리사인드 URL 만료 시간 5분

**🟢 여유 있을 때**
- [ ] Sentry 에러 추적
- [ ] UptimeRobot 모니터링
- [ ] 보안 이벤트 로그 테이블
- [ ] 알림 설정 (슬랙)
- [ ] 월 1회 보안 점검
- [ ] 분기 1회 모의 해킹
- [ ] 연 1회 침투 테스트 (예산 있으면)

---

## 8. 비용 및 운영 가이드

### 8.1 월간 비용 상세

| 항목 | 플랜 | 월 비용 (KRW) | 비고 |
|------|------|--------------|------|
| Vercel | Pro | 29,000원 | $20 |
| Railway | Pro + 사용량 | 29,000~51,000원 | $20~35 |
| Backblaze B2 | 사용량 (9TB) | 75,700원 | 장기 운영 기준 |
| Cloudflare | Free | 0원 | WAF, DDoS 포함 |
| UptimeRobot | Free | 0원 | 50개 모니터 |
| Sentry | Developer | 0원 | 5K events/월 |
| GitHub Actions | Free | 0원 | 2,000분/월 |
| 도메인 (`.co.kr`) | 연 갱신 | 1,500원 | 연 18,000원 |
| 1Password (선택) | 팀 플랜 | 8,000원 | 시크릿 관리 |
| **합계 (최소)** | - | **135,200원** | - |
| **합계 (권장)** | - | **165,200원** | 여유치 포함 |

### 8.2 초기 구축 비용 (1회성)

| 항목 | 비용 |
|------|------|
| 시놀로지 DS918+ | 이미 보유 |
| HDD 8TB × 4 (RAID5) | 약 120만원 (필요 시) |
| 법무 검토 (선택) | 50~100만원 |
| SSL 인증서 | 무료 (Cloudflare) |
| 도메인 구입 | 이미 보유 |

### 8.3 비용 최적화 팁
- B2 Lifecycle Rule 로 6개월 지난 파일 자동 삭제 (개인정보보호법 준수 + 비용 ↓)
- Cloudflare 캐시 적극 활용 (Cloudflare → B2 트래픽 무료)
- Vercel ISR 로 정적 생성 늘려서 Function 실행 시간 최소화
- Railway 는 사용량 기반 → 불필요한 서비스 제거
- 이미지 업로드는 브라우저 → B2 직접 (Railway 트래픽 절감)

### 8.4 운영 루틴

**매일**
- 새벽 3:30 자동 DB 백업 실행 (GitHub Actions)
- 새벽 4:00 시놀로지 자동 미러
- UptimeRobot 헬스체크 (5분 주기)

**매주 (월요일)**
- Cloudflare Analytics 확인 (이상 트래픽)
- Sentry 에러 검토 및 처리
- 백업 로그 확인
- 디스크 사용량 확인 (B2, 시놀로지)

**매월 (첫째 주 토요일)**
- **복구 훈련 실시 (테스트 DB 복원)**
- 관리자 비밀번호 변경 여부 확인
- API 키 로테이션 검토 (90일 주기)
- 보안 이벤트 로그 리뷰
- 비용 리포트 작성

**매분기**
- 모의 해킹 테스트 (OWASP ZAP 등)
- 의존성 업데이트 (`npm audit`, Dependabot)
- 서비스 플랜 재검토

**매년**
- 개인정보 처리방침 재검토
- 법무 자문 (변경된 법규 반영)
- 전체 시스템 재해복구 훈련 (DR Drill)
- 도메인 갱신

---

## 부록 A. 빠른 참조

### A.1 주요 명령어

**DB 백업 수동 실행**

```bash
pg_dump $DATABASE_URL | gzip | gpg --symmetric \
  --cipher-algo AES256 --passphrase "$PW" > backup.sql.gz.gpg
```

**DB 복구**

```bash
gpg --decrypt --passphrase "$PW" backup.sql.gz.gpg | \
  gunzip | psql $NEW_DATABASE_URL
```

**Prisma 마이그레이션**

```bash
pnpm prisma migrate dev --name <name>    # 개발
pnpm prisma migrate deploy               # 프로덕션
pnpm prisma studio                       # GUI
```

**B2 접근 (rclone)**

```bash
rclone ls b2:photocafe/                  # 파일 목록
rclone copy local.jpg b2:photocafe/      # 업로드
rclone sync b2:photocafe/ /backup/       # 동기화
```

### A.2 긴급 연락처

| 상황 | 연락처 | 비고 |
|------|--------|------|
| 개인정보 유출 | KISA 개인정보침해 **118** | **24시간 이내 신고** |
| Vercel 장애 | `support@vercel.com` | Pro 우선 지원 |
| Railway 장애 | `team@railway.app` | Discord 커뮤니티 |
| Cloudflare 장애 | https://www.cloudflarestatus.com | 상태 페이지 |
| B2 장애 | https://status.backblaze.com | 상태 페이지 |

### A.3 핵심 URL

| 서비스 | 관리 콘솔 |
|--------|-----------|
| Vercel | https://vercel.com/dashboard |
| Railway | https://railway.app/dashboard |
| Backblaze B2 | https://secure.backblaze.com |
| Cloudflare | https://dash.cloudflare.com |
| GitHub | https://github.com |
| Sentry | https://sentry.io |
| UptimeRobot | https://uptimerobot.com |

---

## 부록 B. 용어집

| 용어 | 설명 |
|------|------|
| CDN | Content Delivery Network. 전 세계 엣지에 콘텐츠 캐싱 → 응답 속도 ↑ |
| WAF | Web Application Firewall. 웹 공격(SQLi, XSS 등) 차단 |
| DDoS | Distributed Denial of Service. 대량 트래픽으로 서비스 마비시키는 공격 |
| 프리사인드 URL | 임시로 발급되는 인증된 URL. 일정 시간 후 만료 |
| ISR | Incremental Static Regeneration. Next.js 정적 페이지 점진적 재생성 |
| SSR | Server-Side Rendering. 서버에서 HTML 생성·전송 |
| SSG | Static Site Generation. 빌드 시점에 HTML 생성 |
| 2FA | Two-Factor Authentication. 비밀번호 외 추가 인증 (OTP 등) |
| TOTP | Time-based One-Time Password. 시간 기반 일회용 비밀번호 (구글 OTP) |
| RTO | Recovery Time Objective. 장애 발생 후 복구까지 허용 시간 |
| RPO | Recovery Point Objective. 손실 허용 데이터의 시점 (예: 24시간) |
| PCI-DSS | 결제 카드 산업 데이터 보안 표준. 카드 정보 취급 시 준수 |
| KISA | 한국인터넷진흥원. 개인정보 침해 신고 기관 (**118**) |

---

## 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| v1.0 | 2026-04-24 | 초기 문서 작성 (밸런스 구성 기준) |
| v1.0-repo | 2026-04-26 | 저장소에 정식 등록 (`docs/INFRASTRUCTURE.md`) |
