# Photocafe Upload Proxy Worker

브라우저 ↔ R2 사이의 한국↔미국 RTT(왕복지연)를 제거하기 위한 Cloudflare Worker.

```
브라우저(서울, 770Mbps)
  ↓ HTTP/2 단일 연결
Cloudflare 서울 edge (RTT 1~5ms)
  ↓ R2 binding (Cloudflare 내부망)
R2 저장소
```

- 평균 속도 목표: **20~50 MB/s** (R2 직접 PUT 의 4~10배)
- 비용: Cloudflare Workers Free 플랜 (100,000 요청/일 무료) — 사실상 무료
- 코드 라인: ~180 line (Worker 본체 + HMAC 검증)

---

## 1. 사전 준비

| 항목 | 확인 방법 |
|------|----------|
| Cloudflare 계정 | photocafe.co.kr 이 이미 등록되어 있어야 함 |
| R2 버킷 | API 의 `R2_BUCKET` 와 동일 이름 — wrangler.toml 에 입력 |
| Node 18+ | `node -v` |
| wrangler CLI | `npm install` 시 자동 설치 (devDependency) |

---

## 2. 로컬 설치 & 인증

```powershell
cd C:\dev\Photocafe\workers\upload-proxy
npm install
npx wrangler login          # 브라우저로 Cloudflare 인증
```

---

## 3. 시크릿 생성 (HMAC 키)

```powershell
# 32바이트 랜덤 시크릿 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 예시 출력: 8f3a...e1b2

# Worker 시크릿에 등록
npx wrangler secret put UPLOAD_SECRET
# → 위에서 출력된 값을 그대로 붙여넣기
```

같은 값을 Railway 의 API 환경변수에도 등록:

| 키 | 값 |
|----|----|
| `UPLOAD_WORKER_ENABLED` | `true` |
| `UPLOAD_WORKER_URL` | `https://upload.photocafe.co.kr` |
| `UPLOAD_WORKER_SECRET` | (Worker 의 UPLOAD_SECRET 와 **동일한 값**) |

> **⚠️ 중요**: Worker 의 `UPLOAD_SECRET` 과 API 의 `UPLOAD_WORKER_SECRET` 이 다르면 모든 청크 업로드가 403 으로 실패한다.

---

## 4. wrangler.toml 수정

`bucket_name` 을 실제 R2 버킷 이름으로 변경:

```toml
[[r2_buckets]]
binding = "PHOTOCAFE_BUCKET"
bucket_name = "photocafe-r2-test"  # ← 실제 운영 R2 버킷명으로 교체
```

---

## 5. 배포

```powershell
npm run deploy
# → https://photocafe-upload-proxy.<account>.workers.dev 로 배포됨
```

배포 직후 health check:

```powershell
curl https://photocafe-upload-proxy.<account>.workers.dev/health
# → ok
```

---

## 6. 커스텀 도메인 연결

Cloudflare 대시보드에서 진행 (간단):

1. **Workers & Pages** → `photocafe-upload-proxy` 선택
2. **Settings** → **Triggers** → **Custom Domains** → **Add Custom Domain**
3. `upload.photocafe.co.kr` 입력 → **Add Custom Domain**
4. DNS 레코드는 Cloudflare 가 자동 생성 (CNAME, Proxied)

또는 `wrangler.toml` 에서 `routes` 항목 주석 해제 후 재배포.

---

## 7. 활성화 & 테스트

### API 환경변수 적용

Railway 대시보드 → `photocafe-api` 서비스 → Variables:

```
UPLOAD_WORKER_ENABLED=true
UPLOAD_WORKER_URL=https://upload.photocafe.co.kr
UPLOAD_WORKER_SECRET=<위에서 생성한 32바이트 hex>
```

저장 후 자동 재배포 (1~2분).

### 프론트엔드 토글 (사용자별)

브라우저 주소창에 한 번 입력 → localStorage 에 저장됨:

```
https://photocafe.co.kr/print/album-upload?_storage=r2w
```

기존 상태로 되돌리려면 `?_storage=r2` 또는 `?_storage=b2`.

### 검증 포인트

| 항목 | 확인 |
|------|------|
| Worker 로그 | `npx wrangler tail` 실시간 모니터링 |
| 브라우저 DevTools | Network 탭에서 청크 PUT 의 호스트가 `upload.photocafe.co.kr` |
| 응답 헤더 | `ETag: "..."` 헤더 존재 |
| 업로드 속도 | 30MB 파일 기준 1~2초 (R2 직접 PUT 대비 4~10배 빠름) |

---

## 8. 트러블슈팅

| 증상 | 원인 / 조치 |
|------|------------|
| 모든 청크 403 Invalid signature | `UPLOAD_SECRET` 과 `UPLOAD_WORKER_SECRET` 값 불일치 |
| 403 Expired | 청크 업로드가 30분 이상 걸림 (네트워크 매우 느림) — `expiresInSeconds` 조정 |
| CORS 에러 | `wrangler.toml` 의 `ALLOWED_ORIGINS` 에 호출 origin 누락 |
| 500 uploadPart failed | R2 버킷명 오타 또는 R2 binding 미연결 — wrangler.toml 확인 |
| Worker 호출 안 됨 | `?_storage=r2w` 미설정 또는 API `UPLOAD_WORKER_ENABLED=false` |

### Worker 로그 실시간 확인

```powershell
npx wrangler tail
```

### 비활성화 (롤백)

API 환경변수 `UPLOAD_WORKER_ENABLED=false` 로 변경 → 즉시 R2/B2 직접 PUT 으로 폴백.
프론트 사용자도 `?_storage=r2` 호출 시 Worker 우회 가능.

---

## 9. 아키텍처

```
프론트 (file-upload.ts)
  → getStorageOverride() 가 'r2w' 면 백엔드에 storage='r2-worker' 로 multipart-create 요청

API (upload.controller.ts)
  → R2 에 multipart 생성 (S3 API)
  → 각 청크 URL 을 worker-upload-proxy.service.ts 의 signPartUrl() 로 생성
     - payload: `${key}|${uploadId}|${partNumber}|${exp}` HMAC-SHA256
  → partUrls 응답

프론트
  → 각 청크를 worker URL 에 PUT (병렬 6개)

Worker (src/index.ts)
  → query string 의 HMAC 서명 검증
  → env.PHOTOCAFE_BUCKET.resumeMultipartUpload(key, uploadId).uploadPart(N, body)
  → ETag 응답

프론트
  → 모든 ETag 수집 후 API 의 multipart-complete 호출

API
  → R2 S3 API 로 complete (Worker 미경유)
```

---

## 10. 비용 정리

- **Workers Free**: 100,000 req/day, 10ms CPU/req → 우리 사용량(수만 req/월) 대비 충분
- **R2 Class A 작업 (uploadPart)**: 1M ops/월 무료, 이후 $4.5/1M
- **에그레스**: R2 는 에그레스 무료 (B2 와 동일)

월 예상 추가 비용: **0 원** (무료 플랜 범위 내)

---

## 11. 보안 노트

- HMAC 시크릿은 GitHub repo 에 절대 포함되지 않음 (`wrangler secret put` 으로 관리)
- 청크 URL 은 30분 만료 (`exp` 클레임 검증)
- Worker 는 R2 버킷 1개에만 접근 권한 (다른 버킷/서비스 침입 불가)
- payload 에 partNumber 가 포함되므로, 한 URL 을 다른 청크에 재사용 불가

---

## 12. 다음에 할 수 있는 일

- **(1) 운영 트래픽 일부에만 점진 전환 [추천]**
  : 사용자가 `?_storage=r2w` 로 진입했을 때만 Worker 경로 사용 — 안정성 확인 후 기본값 변경
- (2) 기본값 전환: `apps/web/lib/file-upload.ts` 의 `getStorageOverride()` 기본 반환을 `'r2w'` 로 변경
- (3) 모니터링 강화: Cloudflare 대시보드의 Workers Analytics 에서 5xx 비율 / p95 latency 추적
