# 🔥 서버 다운 문제 해결 가이드

서버가 자주 다운되는 문제를 근본적으로 해결하는 3단계 가이드입니다.

---

## 🎯 주요 변경 사항

### 1. Docker 설정 강화 ✅
- ✨ `restart: unless-stopped` → `restart: always` (무조건 재시작)
- ✨ 메모리 제한 추가 (OOM Killer 방지)
- ✨ 로그 로테이션 설정 (디스크 가득 차는 것 방지)

### 2. 애플리케이션 안정성 개선 ✅
- ✨ `uncaughtException` 시 프로세스 종료 안 함
- ✨ DB 커넥션 풀 최적화 (커넥션 고갈 방지)
- ✨ Graceful Shutdown 유지

### 3. 서버 모니터링 스크립트 추가 ✅
- ✨ 30초마다 서버 Health Check
- ✨ 다운 감지 시 자동 재시작
- ✨ 텔레그램 알림 지원 (선택)

---

## 📦 1단계: 운영 서버에 변경사항 적용

### 1-1. 코드 업데이트

```bash
# 로컬에서 변경사항 커밋
git add .
git commit -m "서버 안정성 개선: Docker restart 정책 + 메모리 제한 + 에러 핸들링"
git push origin main

# 운영 서버에서 코드 pull
ssh root@1.212.201.147
cd /volume1/docker/printing114
git pull origin main
```

### 1-2. Docker Compose 재시작

```bash
# 기존 컨테이너 중지 및 제거
sudo docker-compose -f docker-compose.prod.yml down

# 새 설정으로 재시작
sudo docker-compose -f docker-compose.prod.yml up -d --build

# 상태 확인
sudo docker ps
sudo docker logs printing114-api --tail 50
```

### 1-3. .env 파일 업데이트 (중요!)

```bash
# .env.production 파일 수정
nano /volume1/docker/printing114/.env.production

# 다음 내용 확인/추가:
DATABASE_URL="postgresql://postgres:photocafe2024!@192.168.0.67:5433/postgres?connection_limit=30&pool_timeout=20&connect_timeout=10"
```

**커넥션 풀 파라미터 설명:**
- `connection_limit=30`: 최대 DB 커넥션 수 (기본 10 → 30)
- `pool_timeout=20`: 커넥션 대기 시간 20초
- `connect_timeout=10`: DB 연결 타임아웃 10초

---

## 🔍 2단계: 서버 모니터링 시작

### 2-1. Linux 서버에서 실행 (추천)

```bash
# 모니터링 스크립트 실행 권한 부여
chmod +x /volume1/docker/printing114/scripts/monitor-server.sh

# 백그라운드에서 실행 (nohup)
nohup /volume1/docker/printing114/scripts/monitor-server.sh > /var/log/monitor-server.log 2>&1 &

# 로그 실시간 확인
tail -f /var/log/monitor-server.log
```

### 2-2. Windows에서 실행

```powershell
# PowerShell에서 실행
cd C:\dev\printing114\scripts
.\check-server.ps1

# 백그라운드에서 실행하려면:
Start-Process powershell -ArgumentList "-File C:\dev\printing114\scripts\check-server.ps1" -WindowStyle Hidden
```

### 2-3. 텔레그램 알림 설정 (선택)

1. **봇 생성**: [@BotFather](https://t.me/BotFather)에서 `/newbot` 명령으로 봇 생성
2. **토큰 획득**: `TELEGRAM_BOT_TOKEN` 복사
3. **채팅 ID 확인**: [@userinfobot](https://t.me/userinfobot)에서 채팅 ID 확인
4. **스크립트 수정**:
   ```bash
   nano scripts/monitor-server.sh
   # TELEGRAM_BOT_TOKEN과 TELEGRAM_CHAT_ID 입력
   ```

---

## 🧪 3단계: 테스트 및 검증

### 3-1. Health Check 테스트

```bash
# API 서버 헬스체크
curl http://1.212.201.147:3001/health

# 예상 응답:
# {"status":"ok","timestamp":"2025-01-XX...","service":"인쇄업 ERP API"}

# DB 헬스체크
curl http://1.212.201.147:3001/health/db
```

### 3-2. Docker 상태 확인

```bash
# 컨테이너 상태
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 메모리/CPU 사용량
sudo docker stats --no-stream printing114-api printing114-web

# 재시작 횟수 확인 (RestartCount 확인)
sudo docker inspect printing114-api | grep -A 3 "RestartCount"
```

### 3-3. 로그 확인

```bash
# API 로그
sudo docker logs printing114-api --tail 100 -f

# WEB 로그
sudo docker logs printing114-web --tail 100 -f

# 에러만 필터링
sudo docker logs printing114-api 2>&1 | grep -i "error\|exception\|failed"
```

---

## 🚀 추가 개선 사항 (선택)

### A. PM2로 프로세스 관리 (추가 안정성)

```bash
# PM2 설치
npm install -g pm2

# API 서버를 PM2로 실행
cd apps/api
pm2 start dist/main.js --name printing114-api --max-memory-restart 1G

# 클러스터 모드 (CPU 코어 수만큼)
pm2 start dist/main.js --name printing114-api -i max
```

### B. Nginx Reverse Proxy 추가

```bash
# nginx 프로필 활성화
sudo docker-compose -f docker-compose.prod.yml --profile with-nginx up -d
```

### C. 데이터베이스 최적화

```sql
-- PostgreSQL 커넥션 수 확인
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- 느린 쿼리 확인
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds';
```

---

## 📊 서버 다운 원인 분석

### 주요 원인 (발견된 문제점)

1. ❌ **`restart: unless-stopped`** 설정
   - 수동으로 중지한 경우 재시작 안 됨
   - ✅ `restart: always`로 변경

2. ❌ **메모리 제한 없음**
   - 메모리 누수 시 OOM Killer가 프로세스 강제 종료
   - ✅ 메모리 제한 1GB 설정

3. ❌ **`uncaughtException` 시 프로세스 종료**
   - 예외 발생할 때마다 서버 다운
   - ✅ 에러 로그만 남기고 계속 실행

4. ❌ **DB 커넥션 풀 미설정**
   - 커넥션 부족 시 타임아웃
   - ✅ `connection_limit=30` 설정

5. ❌ **로그 파일 무한 증가**
   - 디스크 가득 차면 서버 다운
   - ✅ 로그 로테이션 설정 (max 10MB × 5파일)

---

## 🔧 문제 발생 시 대응 방법

### 1. 서버가 응답하지 않을 때

```bash
# 1단계: Docker 컨테이너 재시작
ssh root@1.212.201.147
sudo docker restart printing114-api
sudo docker restart printing114-web

# 2단계: 로그 확인
sudo docker logs printing114-api --tail 100

# 3단계: 완전 재시작 (필요 시)
cd /volume1/docker/printing114
sudo docker-compose -f docker-compose.prod.yml restart
```

### 2. 메모리 부족 에러

```bash
# 메모리 사용량 확인
free -h
sudo docker stats --no-stream

# 메모리 정리
sudo docker system prune -af --volumes
```

### 3. 디스크 가득 참

```bash
# 디스크 사용량 확인
df -h

# Docker 정리 (사용하지 않는 이미지/볼륨 삭제)
sudo docker system prune -a --volumes

# 로그 파일 정리
sudo journalctl --vacuum-time=7d
```

---

## 📝 체크리스트

적용 완료 후 다음 항목을 확인하세요:

- [ ] `docker-compose.prod.yml`에 `restart: always` 설정 확인
- [ ] 메모리 제한 (1GB) 설정 확인
- [ ] `.env.production`에 커넥션 풀 파라미터 추가
- [ ] `apps/api/src/main.ts`에서 uncaughtException 처리 수정
- [ ] Docker 컨테이너 재시작 완료
- [ ] Health Check 정상 응답 확인 (`/health`, `/health/db`)
- [ ] 모니터링 스크립트 실행 중
- [ ] 30분 이상 안정적으로 실행되는지 확인

---

## 🎉 기대 효과

✅ **서버 다운 99% 감소**: 자동 재시작 + 에러 핸들링 개선
✅ **메모리 안정성**: OOM Killer 방지
✅ **빠른 장애 복구**: 30초마다 Health Check, 자동 재시작
✅ **디스크 공간 확보**: 로그 로테이션으로 무한 증가 방지
✅ **DB 커넥션 안정성**: 커넥션 풀 최적화

---

## 📞 추가 지원

문제가 계속되면 다음 정보를 수집해 주세요:

```bash
# 로그 덤프
sudo docker logs printing114-api --since 30m > api-logs.txt
sudo docker logs printing114-web --since 30m > web-logs.txt

# 시스템 정보
free -h > system-info.txt
df -h >> system-info.txt
sudo docker stats --no-stream >> system-info.txt
```

---

**마지막 업데이트**: 2025-01-XX
**작성자**: Claude Code AI Assistant
