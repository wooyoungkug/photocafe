# Photocafe 클라우드 인프라 설계서 v2
**Railway 통합 배포 / JPG 전용 / 동시접속 100명 · 동시 전송 10건 기준**
**Railway Pro + Backblaze B2 + Cloudflare**
(주)프린팅솔루션즈 / 2026.04

---

## 0. 핵심 요약

이번 개정본은 **동시접속자 100명, 동시 업/다운로드 10건** 기준으로 리소스·비용을 재산정한 설계서입니다. 전반적인 아키텍처(Railway 통합 + B2 + Cloudflare)는 유지하되, Railway 서비스 리소스와 네트워크 설계를 상향했습니다.

| 구분 | 값 |
|---|---|
| 동시접속자 (열람·조회) | 최대 **100명** |
| 동시 파일 전송 (업로드+다운로드) | 최대 **10건** |
| 접수 포맷 | JPG 단일 (image/jpeg) |
| 처리량 | 1일 500권 × 30p = **15,000 JPG/일** |
| 페이지 규격 | 11" × 14" @ 200 DPI (6.16 MP) |
| 보관 기간 | **180일 (B2 Lifecycle 자동 삭제)** |
| 6개월 누적 (Q95) | **9.01 TB** |
| 월 운영 비용 (정상) | **약 ₩160,000** |
| 월 운영 비용 (파일럿) | **약 ₩63,000** |
| 호스팅 구성 | Railway Pro 워크스페이스 1개 / 3 Service |

**v1 → v2 주요 변경점**
- 동시접속 50 → **100명** (리소스 +40~50%)
- 동시 전송 개념 신규 도입 → **전송 동시성은 10건으로 제한** (프론트 큐 + API Throttler)
- Railway web/api Service 리소스 상향 (vCPU·RAM)
- PostgreSQL Volume 10 → **20 GB**로 확대
- 월 비용 ₩133,000 → **₩160,000** (약 +₩27,000)

---

## 1. 규모 산정 재계산

### 1-1. 부하 프로파일 (동접 100 / 동시전송 10)

| 트래픽 종류 | 동시성 | 설명 |
|---|---|---|
| 페이지 열람·API 호출 | 최대 100 | 대시보드, 주문 조회, 앨범 목록 등 일반 브라우징 |
| JPG 업로드 | 최대 10 | 브라우저 → B2 직업로드 (Presigned PUT) |
| JPG 다운로드/미리보기 | 포함 10 | Cloudflare 엣지 캐시 히트 다수, B2 직접히트 소수 |
| Presigned 발급 API | 10 req/s 수준 | Railway api가 처리하는 실제 부하 |

> **핵심**: 100명이 동시 접속해도 **파일 바이너리는 Railway를 통과하지 않는다.** 업/다운로드는 전부 B2↔브라우저 또는 Cloudflare↔브라우저 구간에서 처리되므로 Railway는 "가벼운 API 서버" 역할만 합니다.

### 1-2. JPG 품질별 용량 (v1과 동일, 일일 처리량 불변)

| 품질 | 1일 | 1개월 | 6개월 평형 | 월 B2 비용 |
|---|---|---|---|---|
| Q75 | 17.6 GB | 0.51 TB | 3.09 TB | ₩25,955 |
| Q85 | 26.4 GB | 0.77 TB | 4.63 TB | ₩38,932 |
| Q90 | 36.6 GB | 1.07 TB | 6.44 TB | ₩54,073 |
| **Q95 ⭐** | **51.3 GB** | **1.50 TB** | **9.01 TB** | **₩75,702** |
| Q100 | 73.2 GB | 2.15 TB | 12.87 TB | ₩108,146 |

### 1-3. 네트워크 피크 대역폭

- 동시 업로드 10건 × 평균 JPG 3 MB × 2초 전송 → **피크 ~120 Mbps** (고객 → B2 직결)
- Railway egress 영향: **0** (직업로드이므로 Railway 통과하지 않음)
- Railway egress 실사용: 페이지 HTML/JSON 위주 → **월 80~120 GB 추정**
- 다운로드 대역폭: 전량 Cloudflare 엣지 처리 → Bandwidth Alliance로 B2 egress **무료**

---

## 2. 전체 시스템 구성도

```
                            ┌───────────────────────────────────┐
                            │           사용자 (최대 100명)       │
                            │    (업체 스튜디오 + 본사 관리자)      │
                            └─────────────┬─────────────────────┘
                                          │ HTTPS
                                          ▼
                    ┌───────────────────────────────────────────┐
                    │            Cloudflare (무료 플랜)            │
                    │  - DNS / SSL / WAF / DDoS 방어               │
                    │  - cdn.photocafe.co.kr 엣지 캐시 (이미지)      │
                    │  - Bandwidth Alliance → B2 egress 무료       │
                    └───┬──────────────┬────────────────┬─────────┘
                        │              │                │
                  (열람·폼)         (API 호출)       (이미지 CDN)
                        │              │                │
                        ▼              ▼                ▼
           ┌──────────────────────────────────┐   ┌──────────────────┐
           │   Railway Pro 워크스페이스         │   │  Backblaze B2    │
           │   리전: asia-southeast1 (SG)      │   │  us-east-005     │
           │                                   │   │                   │
           │  ┌──────────────┐                │   │  photocafe 버킷   │
           │  │ Service: web │  Next.js 15    │   │  (Public)         │
           │  │ 0.6 vCPU     │  port 3000     │   │  - JPG 저장        │
           │  │ 1.2 GB RAM   │                │◄──┤  - 180일 Lifecycle │
           │  └──────┬───────┘                │   │  - Presigned PUT  │
           │         │ 내부 프라이빗 네트워크     │   │                   │
           │  ┌──────▼───────┐                │   │  photocafe-backup │
           │  │ Service: api │  NestJS 10     │◄──┤  (Private)        │
           │  │ 0.7 vCPU     │  port 3001     │   │  - DB 주간 덤프     │
           │  │ 1.0 GB RAM   │                │   └──────────────────┘
           │  └──────┬───────┘                │             ▲
           │         │                        │             │
           │  ┌──────▼───────┐                │             │ 직업로드
           │  │ Plugin: pg   │  PostgreSQL 16 │             │ (Presigned URL)
           │  │ 0.3 vCPU     │  20 GB Volume  │             │
           │  │ 1.0 GB RAM   │  일일 자동백업   │             │
           │  └──────────────┘                │   ┌──────────────────┐
           │                                   │   │   브라우저 파일 큐   │
           │  Spend Limit: $80 / 월           │   │   최대 동시 10건    │
           └──────────────────────────────────┘   │   (프론트엔드 제어)  │
                                                  └──────────────────┘

─────────────────────────────────────────────────────────────────────
  배포 파이프라인: GitHub main push → Railway 자동빌드 (Nixpacks) → 배포
─────────────────────────────────────────────────────────────────────
```

### 2-1. 데이터 흐름 요약

- **로그인/조회**: 브라우저 → Cloudflare → Railway web(SSR) → Railway api → Postgres
- **JPG 업로드**: 브라우저 → api(Presigned 발급) → **브라우저가 B2로 직접 PUT** → api(complete 통보)
- **JPG 조회**: 브라우저 → Cloudflare 엣지(99% 캐시 HIT) → (미스 시 B2)
- **정적 자산**: Next.js 빌드 결과물은 Railway + Cloudflare 엣지 조합

---

## 3. Railway 통합 배포 설계 (100명 대응)

### 3-1. 워크스페이스 구조

Railway Pro 워크스페이스 1개에 3개 Service + 1개 Plugin을 배치합니다.

| Service | 유형 | Root / Port | 도메인 |
|---|---|---|---|
| web | Next.js | `apps/web` :3000 | photocafe.co.kr + www |
| api | NestJS | `apps/api` :3001 | api.photocafe.co.kr |
| postgres | Plugin | PostgreSQL 16 | 내부 전용 |

### 3-2. 리소스 산정 (동접 100 / 동시전송 10 기준)

| Service | vCPU (평균/피크) | RAM | Storage | 월 리소스 비용 |
|---|---|---|---|---|
| web (Next.js) | 0.6 / 1.2 vCPU | 1.2 GB | 빌드 산출물 | $22 |
| api (NestJS) | 0.7 / 1.5 vCPU | 1.0 GB | 없음 | $19 |
| postgres | 0.3 / 0.6 vCPU | 1.0 GB | 20 GB volume | $14 |
| Egress (외부 전송) | - | - | 약 100 GB/월 | $5 |
| **합계** | | | | **$60** |

**실제 청구**: Pro 기본 $20 포함 크레딧 → 초과분 $40 → **$60 = 약 ₩84,000/월**

> v1 대비 리소스 +45%, 비용 +$19. 동시전송을 10건으로 제한했기 때문에 예상보다 소폭 상승 선에서 통제됩니다.

### 3-3. 왜 이 정도 사양이면 충분한가

- **Next.js SSR**: 대부분의 페이지는 Cloudflare 엣지 캐시 + `revalidate` 전략 → 실제 SSR 호출은 동접의 10~20% 수준
- **NestJS API**: 업로드 바이너리를 처리하지 않음(Presigned) → CPU는 JWT 검증·Prisma 쿼리가 대부분
- **Postgres**: 동접 100명 × 연결풀 20개면 Prisma Connection Pool 설정으로 여유
- **Replicas 확장 여지**: 필요 시 web 2개, api 2개로 수평 확장 가능 (클릭 1회)

### 3-4. 동시 전송 10건 제한 구현

**프론트엔드 업로드 큐 (권장 · 구현 간단)**
```ts
// apps/web/lib/upload-queue.ts
const MAX_CONCURRENT = 10;
const queue = new PQueue({ concurrency: MAX_CONCURRENT });

export function enqueueUpload(file: File, presignedUrl: string) {
  return queue.add(() => fetch(presignedUrl, { method: 'PUT', body: file }));
}
```
- 사용자 1명이 30장을 한꺼번에 드래그해도 브라우저 내에서 10개씩 배치 업로드
- 전체 서비스 차원의 글로벌 제한은 **B2 측 throttle**이 자동 담당 (B2 자체 rate limit)

**API 레벨 보조 제한 (필요 시)**
- NestJS `@nestjs/throttler`로 Presigned 발급을 IP당 **20 req/10초**로 제한
- 악성 스크립트 차단 용도이며 정상 사용자는 영향 없음

### 3-5. 배포 파이프라인

GitHub `main` push → Railway Nixpacks 자동 빌드 → 무중단 배포 → 실패 시 자동 롤백.
PR 생성 시 Preview Environment 자동 생성(옵션).

### 3-6. 도메인 연결

| 도메인 | 대상 | Cloudflare 설정 |
|---|---|---|
| photocafe.co.kr | Railway web | CNAME (Proxied OFF) |
| www.photocafe.co.kr | Railway web | CNAME (Proxied OFF) |
| api.photocafe.co.kr | Railway api | CNAME (Proxied OFF) |
| cdn.photocafe.co.kr | B2 → f005.backblazeb2.com | CNAME (**Proxied ON**) |

---

## 4. 스토리지 · CDN 전략 (변동 없음)

### 4-1. 버킷 구성

| 버킷명 | 종류 | 용도 | Lifecycle |
|---|---|---|---|
| photocafe | Public | 앨범 JPG + CDN 배포 | 180일 Hide → 1일 후 Delete |
| photocafe-backup | Private | DB 덤프 백업 | 1년 Object Lock (선택) |

### 4-2. 업로드 플로우 (Presigned URL + 동시 10건 제한)

```
1. 브라우저 큐에 30장 투입 (MAX_CONCURRENT=10)
2. 배치 단위로 POST /api/uploads/presigned
     { fileName, mimeType: 'image/jpeg', albumId }
3. NestJS api: MIME/크기 검증 → Presigned PUT URL 반환
4. 브라우저: PUT <uploadUrl> (파일 본문) → B2 직접 저장
5. 브라우저: POST /api/uploads/complete { key, albumId, pageNo }
6. NestJS: DB 기록 → { cdnUrl: 'https://cdn.photocafe.co.kr/...' }
```

### 4-3. 검증 정책

- 클라이언트: `accept="image/jpeg"` + `.jpg/.jpeg` 확장자 체크
- 서버: `Content-Type === 'image/jpeg'` 인 경우만 Presigned 발급
- 최대 파일 크기: **페이지당 10 MB**
- Key 포맷: `albums/YYYY/MM/<albumId>/<pageNo>-<uuid8>.jpg`
- 비JPG 업로드 시 **400 Bad Request**

---

## 5. 비용 분석

### 5-1. 월 총 운영 비용

| 항목 | 파일럿 | Q95 정상 (동접 100) | Q100 최악 |
|---|---|---|---|
| Railway Pro (web+api+pg, 100명 대응) | ₩84,000 | ₩84,000 | ₩84,000 |
| Backblaze B2 (저장 + egress) | ₩1,200 | ₩75,702 | ₩108,146 |
| Cloudflare | 무료 | 무료 | 무료 |
| 가비아 도메인 | ₩1,000 | ₩1,000 | ₩1,000 |
| **합계** | **₩86,200** | **₩160,702** | **₩193,146** |

> **파일럿 단계**(2업체 · 일 40권): Railway 사용량이 $30 수준에 머물러 실제 청구는 ₩45,000 내외, 총 약 **₩63,000/월**.

### 5-2. v1(동접 50) 대비 증분

| 구분 | v1 (50명) | v2 (100명) | 증분 |
|---|---|---|---|
| Railway | ₩56,726 | ₩84,000 | +₩27,274 |
| B2 (Q95) | ₩75,702 | ₩75,702 | 동일 |
| 기타 | ₩1,000 | ₩1,000 | 동일 |
| **합계** | **₩133,428** | **₩160,702** | **+₩27,274 (+20%)** |

동접을 2배로 늘렸지만 비용은 20%만 증가합니다. 파일 바이너리가 Railway를 통과하지 않는 설계의 덕분입니다.

### 5-3. Spend Limit 설정 권장값

- Railway: **$80/월** (기존 $50 → 상향)
- B2: Caps 탭에서 **월 egress 3 TB, storage 10 TB** 알람

---

## 6. 실행 매뉴얼 (차이점만)

v1 매뉴얼 대비 리소스·제한치만 상향하면 됩니다.

### STEP 1. Railway 리소스 상향
- `web` Service → Settings → Resources
  - vCPU 한도 **1.5**, RAM 한도 **1.5 GB**
- `api` Service → Settings → Resources
  - vCPU 한도 **2.0**, RAM 한도 **1.5 GB**
- `postgres` Plugin → Volume **20 GB**, RAM **1 GB**

### STEP 2. Spend Limit 조정
- Settings → Billing → Spend Limit **$80**

### STEP 3. 프론트엔드 업로드 큐 도입
- `apps/web/lib/upload-queue.ts` 신규 작성 (`p-queue` 사용)
- `MultiFolderUpload` / `FolderCard`에서 직접 fetch 대신 `enqueueUpload()` 호출
- 환경변수: `NEXT_PUBLIC_UPLOAD_CONCURRENCY=10`

### STEP 4. API Throttler 추가
```ts
// apps/api/src/modules/upload/upload.controller.ts
@Throttle({ default: { limit: 20, ttl: 10_000 } })
@Post('presigned')
async createPresigned(...) { ... }
```

### STEP 5. Postgres Connection Pool 확인
- `DATABASE_URL`에 `?connection_limit=20&pool_timeout=20` 추가
- Prisma가 동접 100명 대응 가능한 풀 유지

나머지 STEP(도메인, B2 Lifecycle, Cloudflare Transform Rule, 시놀로지 정리)은 v1과 동일합니다.

---

## 7. 운영 체크리스트

| | 확인 항목 | 위치 |
|---|---|---|
| ☐ | 동접 100명 부하 테스트 (k6 또는 Artillery) | 로컬 스크립트 |
| ☐ | 업로드 큐 10건 제한 동작 확인 | 프론트 DevTools Network |
| ☐ | Presigned 발급 API throttler 동작 | 21회 연속 호출 → 429 |
| ☐ | `api.photocafe.co.kr/health` 200 OK | 브라우저/curl |
| ☐ | JPG 30장 한꺼번에 드래그 → 10개씩 처리 | 실제 앨범 |
| ☐ | PNG/GIF 업로드 거부 (400) | MIME 검증 |
| ☐ | cdn `cf-cache-status: HIT` 90%↑ | Cloudflare Analytics |
| ☐ | B2 Lifecycle 180일 설정 | B2 Console |
| ☐ | Railway Spend Limit $80 | Railway Settings |
| ☐ | Postgres 일일 자동백업 + 주간 B2 덤프 | Postgres Plugin |
| ☐ | Railway 리소스 모니터링 대시보드 북마크 | Railway Usage |

---

## 8. 확장 시나리오

| 시점 | 증상 | 대응 |
|---|---|---|
| 동접 150명 | web CPU 70% 상시 | Replicas 2개로 수평 확장 (클릭 1회, +$15/월) |
| 동접 200명 | api CPU 80%, DB 쿼리 느려짐 | api Replicas 2개 + Postgres Dedicated Plan |
| 동시 전송 30건 필요 | 업로드 대기 길어짐 | 프론트 큐 상향 (B2는 여유), API throttler 조정 |
| 월 저장량 15 TB 초과 | B2 비용 부담 | Q95 → Q90 전환 (용량 -30%, 품질 차이 미미) |
| 글로벌 서비스 | 해외 레이턴시 | Vercel로 web만 분리 (한국 사용자 영향 없음) |

---

## 9. FAQ (변경분)

**Q. 동접 100명이면 Railway 한 곳에 다 올려도 정말 괜찮나요?**
네. 파일 바이너리가 Railway를 통과하지 않는 설계(Presigned URL + Cloudflare CDN)라서 Railway는 실질적으로 "HTML + JSON만 내려주는 서버" 역할입니다. 100명이 동시에 페이지를 보고 있어도 실제 SSR 동시 실행은 10~20 수준에 머뭅니다.

**Q. 왜 동시 전송을 10건으로 제한하나요?**
- B2 업로드 대역폭을 안정적으로 사용하기 위함 (업체별 회선 100Mbps 공정 사용)
- 사용자 체감 속도 유지 (브라우저당 10개 병렬이 성능 sweet spot)
- 대량 드래그(수백 장) 시 메모리 폭주 방지

**Q. 100명 동시접속에 Postgres가 버틸까요?**
Prisma Connection Pool을 20으로 잡으면 동접 100명이 같은 순간 DB를 때리는 비율은 5~10% → 실 연결 5~10개. 충분합니다. 부족하면 `pool_size=30`까지 상향 가능.

**Q. 파일럿 2개 업체로 시작하면 이 스펙이 과한가요?**
파일럿 동안은 리소스 사용량이 자연스럽게 낮아 **실제 청구 ₩45,000 수준**으로 떨어집니다. Spend Limit으로 상한만 걸어두면 됩니다. 업체 추가 시 별도 재배포 없이 바로 수용 가능합니다.

---

작성: Claude / 2026.04.23 · 환율 $1 = ₩1,400 · 기준: 동접 100 / 동시 전송 10 / JPG Q95
