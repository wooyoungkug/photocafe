---
name: backup-recovery
description: DB·이미지 백업과 복구 작업. PostgreSQL pg_dump, GitHub Actions db-backup, B2 GPG 암호화·복호화, Railway DB 복원, B2 lifecycle, Synology Cloud Sync 미러, RTO/RPO 점검·복구 훈련 시 사용합니다.
---

# 백업/복구 스킬

Photocafe ERP의 데이터 백업과 복구 절차 (3-2-1 규칙 기반).

> **상위 인프라 컨텍스트**: `server-hosting` 스킬 참조
> **장애 발생 시 통합 대응**: `incident-response` 스킬 참조

## 1. 3-2-1 백업 규칙 (Photocafe 적용)

| 복사본 | 저장 위치 | 보관 기간 | 매체 | 복구 시간 |
|--------|-----------|-----------|------|-----------|
| 원본 | Railway PostgreSQL (오리건) | 상시 | 클라우드 DB | 즉시 |
| 복사본 1 | Backblaze B2 (버지니아) | 30일 | 클라우드 객체스토리지 + GPG | ~15분 |
| 복사본 2 | Synology DS918+ (한국 사무실) | 90일~3년 | 물리 NAS Btrfs | ~30분 |

- **3개 복사본**, **2가지 매체**(클라우드 DB + 객체스토리지/물리), **1개 오프사이트**(한국)
- 목표: **RTO 30분 이내 / RPO 24시간 이내**

## 2. 자동 백업 워크플로우

### 2.1 DB 백업 (`.github/workflows/db-backup.yml`)

| 항목 | 값 |
|------|-----|
| 실행 주기 | 매일 KST 03:30 (`cron: '0 18 * * *'` UTC) |
| 수동 실행 | `workflow_dispatch` 가능 |
| 암호화 | GPG AES-256 대칭키 |
| 압축 | gzip |
| 저장 경로 | `b2:photocafe/backups/{daily|weekly|monthly}/YYYY/MM/` |
| 분류 규칙 | 매월 1일 → monthly / 일요일 → weekly / 그 외 → daily |
| 타임아웃 | 30분 |

**필수 GitHub Secrets**:
```
DATABASE_URL          # Railway Postgres 외부 접속 URL
BACKUP_PASSWORD       # 32자+ 랜덤 (24자 미만 시 경고)
B2_KEY_ID             # B2 Application Key ID
B2_APPLICATION_KEY    # B2 Application Key
B2_ENDPOINT           # s3.us-east-005.backblazeb2.com
B2_BUCKET_NAME        # photocafe (백업은 public 버킷의 backups/ 경로)
SLACK_WEBHOOK         # 실패 알림용 (선택)
```

### 2.2 B2 이미지 lifecycle (`b2-cleanup.yml`, `b2-bucket-settings.yml`)

| 카테고리 | 보관 |
|----------|------|
| daily | 31일 |
| weekly | 12주 |
| monthly | 6개월 |
| 이미지 원본(Private) | 주문 완료 후 6개월 (개인정보보호법 준수) |

### 2.3 Synology Cloud Sync 미러

| 설정 | 값 |
|------|-----|
| 동기화 원본 | `b2:photocafe/backups/` |
| 동기화 대상 | `/volume1/backups/db/` |
| 주기 | 매일 04:00 (DSM 스케줄러) |
| 방향 | **원격 → 로컬 단방향** (역방향 금지) |
| Btrfs 스냅샷 | 일 1회, 90일 보관 |
| 볼륨 암호화 | AES (DSM 자체) |

## 3. 복구 절차 (DB)

### 3.1 표준 복구 (B2 → 새 DB)

```bash
# 1. B2에서 백업 다운로드 (rclone 사전 설정 필요)
rclone copy b2:photocafe/backups/daily/2026/05/backup_20260509_0330.sql.gz.gpg ./

# 2. GPG 복호화
gpg --decrypt --batch --passphrase "$BACKUP_PASSWORD" \
    backup_20260509_0330.sql.gz.gpg > backup.sql.gz

# 3. 압축 해제
gunzip backup.sql.gz

# 4. 새 DB에 복원
psql $NEW_DATABASE_URL < backup.sql

# 5. 복원 검증 (행 수 비교)
psql $NEW_DATABASE_URL -c 'SELECT COUNT(*) FROM "User";'
psql $NEW_DATABASE_URL -c 'SELECT COUNT(*) FROM "Order";'
```

### 3.2 운영 DB 복구 (Railway 직접 복원 — 위험)

> ⚠️ **데이터 덮어쓰기**. 반드시 사용자 승인 받고, 사전에 현재 DB를 한 번 더 덤프받은 후 진행.

```bash
# 1. 현재 DB 안전 덤프 (사고 시 롤백용)
railway run --service api pg_dump $DATABASE_URL > pre_restore_$(date +%s).sql

# 2. Public 스키마 초기화 (DROP CASCADE)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. 복원
psql $DATABASE_URL < backup.sql

# 4. Prisma 스키마 재정렬 (선택)
railway run --service api npx prisma db push
```

### 3.3 Synology에서 복구 (B2 접근 불가 시)

```bash
# Synology DSM File Station에서 다운로드, 또는 SSH:
ssh admin@1.212.201.147
ls /volume1/backups/db/daily/2026/05/
scp /volume1/backups/db/daily/2026/05/backup_*.sql.gz.gpg user@local:/path/
# 이후 §3.1 복호화 절차와 동일
```

## 4. 복구 훈련 (월 1회 의무)

### 4.1 훈련 일정
- **매월 첫째 주 토요일** 오전
- 담당: 시스템 관리자(우영국)
- 소요 시간: 30분~1시간

### 4.2 훈련 체크리스트

```markdown
## 백업 복구 훈련 (YYYY-MM-DD)

### 사전 준비
- [ ] Railway 테스트 프로젝트 생성 또는 로컬 PostgreSQL 준비
- [ ] 가장 최근 daily 백업 파일 확인 (B2 콘솔)

### 복구 실행
- [ ] B2 → backup 파일 다운로드 성공
- [ ] GPG 복호화 성공 (BACKUP_PASSWORD 정상)
- [ ] gunzip 압축 해제 성공
- [ ] psql 복원 성공 (에러 없음)
- [ ] 행 수 검증 (User, Order, Photo 테이블 모두 0이 아님)
- [ ] 임의 사용자 로그인 시도 가능 여부 확인

### 시간 측정
- 다운로드 시작: __:__
- 복원 완료: __:__
- 총 소요: __ 분 (목표 30분 이내)

### 발견 이슈 / 개선점
- 

### 다음 훈련 예정일
- 다음달 첫째 주 토요일
```

### 4.3 RTO/RPO 미달 시 조치
- RTO 초과 → B2 다운로드 속도 확인, rclone 병렬 옵션(`--transfers=8`) 검토
- RPO 초과 → 백업 주기 단축 (1일 → 12시간) 또는 PITR(Point-in-Time Recovery) 검토

## 5. 백업 모니터링

### 5.1 GitHub Actions 결과 확인
```bash
gh run list --workflow=db-backup.yml --limit 7
gh run view <run-id> --log
```

### 5.2 슬랙 알림 (실패 시)
워크플로우 마지막 step에 `if: failure()` 로 SLACK_WEBHOOK 호출. 알림이 7일 연속 안 오면 워크플로우가 죽었을 수 있으니 수동 점검.

### 5.3 정기 점검 (월 1회)
- B2 콘솔에서 최근 30일 daily 백업 파일 30개가 있는지 시각 확인
- Synology File Station에서 미러 동기화 정상 여부
- 가장 오래된 monthly 백업의 GPG 복호화 가능 여부 (1년 전 백업이라도 키가 살아있어야 함)

## 6. 시크릿 회전 정책

| 시크릿 | 회전 주기 | 회전 시 영향 |
|--------|-----------|--------------|
| BACKUP_PASSWORD | **회전 금지** (회전 시 과거 백업 복호화 불가) | — |
| B2 Application Key | 90일 권장 | 백업/복구 키 따로 관리 |
| DATABASE_URL | Railway 자체 관리 | secret 자동 갱신 |

> ⚠️ **BACKUP_PASSWORD 분실 시 모든 과거 백업 영구 손실**.
> 1Password 등 별도 vault에 이중 보관 필수.

## 7. 자주 쓰는 명령어

### B2 (rclone)
```bash
rclone ls b2:photocafe/backups/                    # 전체 목록
rclone ls b2:photocafe/backups/daily/2026/05/      # 5월 일일 백업
rclone size b2:photocafe/backups/                  # 총 용량
rclone copy b2:... ./local --progress              # 다운로드 진행률
```

### PostgreSQL
```bash
# 수동 백업 (전체)
pg_dump $DATABASE_URL | gzip | gpg --symmetric \
  --cipher-algo AES256 --batch --passphrase "$PW" > backup.sql.gz.gpg

# 특정 테이블만
pg_dump $DATABASE_URL -t '"User"' -t '"Order"' > partial.sql

# 행 수 빠른 검증
psql $DATABASE_URL -c "
  SELECT schemaname, relname, n_live_tup
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC
  LIMIT 20;"
```

### Railway
```bash
railway run --service api pg_dump $DATABASE_URL > local.sql
railway logs --service api | grep -i backup
```

## 8. 자주 묻는 시나리오

| 상황 | 권장 조치 |
|------|-----------|
| 개발자가 `WHERE` 빠뜨린 DELETE 실행 | §3.2 직접 복원 (24시간 이내라면 daily 백업으로 회복 가능) |
| Railway 전체 장애 | Synology 미러본으로 새 클라우드(Render/Fly.io)에 임시 복원 |
| GPG 복호화 실패 | BACKUP_PASSWORD 재확인, 1Password vault 확인 |
| 백업 파일 손상 | 직전 일자 백업으로 시도, 그래도 실패 시 weekly/monthly 단계적 시도 |
| B2 계정 차단 | Synology 미러본 (90일 보관) 직접 사용 |
| 랜섬웨어 의심 | 즉시 Synology 미러 중단(역방향 감염 방지) → 오래된 Btrfs 스냅샷에서 복구 |

## 9. 관련 파일·문서

| 항목 | 경로 |
|------|------|
| 백업 워크플로우 | [.github/workflows/db-backup.yml](.github/workflows/db-backup.yml) |
| DB 마이그레이션 워크플로우 | [.github/workflows/db-migrate.yml](.github/workflows/db-migrate.yml) |
| B2 lifecycle 설정 | [.github/workflows/b2-bucket-settings.yml](.github/workflows/b2-bucket-settings.yml) |
| B2 정리 워크플로우 | [.github/workflows/b2-cleanup.yml](.github/workflows/b2-cleanup.yml) |
| 인프라 설계서 (백업 절) | [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) §5 |

## 10. 다음 단계 추천

- **(1) 매월 첫째 주 토요일 복구 훈련 캘린더 등록 [추천]** — 실효성의 핵심
- (2) BACKUP_PASSWORD를 1Password 회사 vault에 이중 등록
- (3) Synology Cloud Sync 미러가 실제로 동작 중인지 확인 (DSM Cloud Sync 로그)
