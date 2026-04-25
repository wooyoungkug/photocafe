# Printing114 - 인쇄업 ERP 시스템

포토북/앨범 인쇄업체를 위한 통합 ERP 시스템

## 서버 정보

| 환경 | 프론트엔드 | 백엔드 API | DB |
|------|------------|------------|-----|
| 로컬 | localhost:3002 | localhost:3001 | localhost:5432 |
| 운영 (Railway) | `<web>.up.railway.app` | `<api>.up.railway.app` | Railway Postgres 플러그인 |
| 운영 (Synology, **Legacy**) | 1.212.201.147:3000 | 1.212.201.147:3001 | 192.168.0.67:5433 |

> **배포 플랫폼 전환 중**: Synology NAS → Railway 마이그레이션 진행 중입니다.
> - 자동 배포는 **Railway**가 `main` 브랜치 push를 감지하여 처리합니다 (`railway.json`, `apps/{api,web}/railway.toml`).
> - Synology 자동 배포 워크플로우(`.github/workflows/deploy.yml`)는 비활성화(`.disabled`) 상태입니다.
> - 실제 Railway 도메인은 Railway 대시보드에서 확인하여 위 표를 업데이트하세요.

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

### Railway (현재)
- **API 서비스**: `apps/api/Dockerfile` 기반, 컨테이너 내부 `/app`
- **Web 서비스**: `apps/web/Dockerfile` 기반, 컨테이너 내부 `/app`
- **업로드 볼륨**: Railway Volume 마운트 → `UPLOAD_BASE_PATH=/app/uploads` (서비스별 Volume 설정 필요)
- **DB**: Railway Postgres 플러그인 (`DATABASE_URL`은 Railway가 자동 주입)
- **백업**: GitHub Actions `db-backup.yml`이 매일 18:00 UTC에 Backblaze B2로 업로드

### Synology NAS (Legacy)
- 백엔드: `/volume1/docker/printing114/`
- 프론트엔드: `/volume1/docker/printing114-web/apps/web/`
- compose 파일: `/volume1/docker/docker-compose.prod.yml`
- 업로드: `/volume1/docker/printing114/uploads`

## CI/CD

| 워크플로우 | 상태 | 트리거 | 용도 |
|-----------|------|--------|------|
| Railway 자동 배포 | 활성 | `main` push | API/Web 빌드·배포 (Railway 자체 통합) |
| `db-backup.yml` | 활성 | 매일 18:00 UTC | PostgreSQL → Backblaze B2 (daily/weekly/monthly) |
| `db-migrate.yml` | 활성 (수동) | `workflow_dispatch` | 로컬 DB 덤프 → 운영 DB (Synology SSH 의존, Railway 이전 시 재작성 필요) |
| `deploy.yml.disabled` | 비활성 | - | 구 Synology 자동 배포 |

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
- **라이브러리**: next-intl
- **지원 언어**: ko(기본), en, ja, zh
- **자동감지**: Accept-Language 헤더 기반 국가별 자동인식, 현지 언어로 표시
- **라우팅**: `app/[locale]/` 기반 locale 프리픽스 라우팅
- **번역 파일**: `apps/web/messages/{locale}.json`

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
- 카드결제 옵션 없음 (PG 미연동)

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
