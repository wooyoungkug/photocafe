# 서버 모니터링 및 복구 가이드

## 📊 Health Check 엔드포인트

### 1. 기본 Health Check
```bash
# 서버 상태 확인 (간단)
curl http://localhost:3001/health

# 응답 예시
{
  "status": "ok",
  "timestamp": "2026-02-08T10:00:00.000Z",
  "service": "인쇄업 ERP API",
  "version": "1.0.0"
}
```

### 2. 상세 Health Check (DB, 메모리, 디스크)
```bash
# 전체 상태 확인 (DB + 메모리 + 디스크)
curl http://localhost:3001/api/v1/health

# 응답 예시
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" },
    "disk": { "status": "up" }
  }
}
```

### 3. Ready Check (DB만)
```bash
# DB 연결 확인
curl http://localhost:3001/api/v1/health/ready
```

### 4. Live Check (간단)
```bash
# 서버 살아있는지만 확인
curl http://localhost:3001/api/v1/health/live

# 응답 예시
{
  "status": "ok",
  "timestamp": "2026-02-08T10:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "heapUsed": 150,
    "heapTotal": 200,
    "rss": 350
  }
}
```

---

## 🚨 서버 다운 원인별 대처법

### 1️⃣ **메모리 부족 (OOM - Out of Memory)**

#### 증상
- 서버가 갑자기 종료됨
- Docker 로그에 "Killed" 메시지

#### 확인
```bash
# 메모리 사용량 확인
free -h

# Docker 컨테이너 메모리 확인
sudo docker stats printing114-api

# Health Check로 메모리 확인
curl http://localhost:3001/api/v1/health/live
```

#### 대책
```bash
# docker-compose.yml에 메모리 제한 추가
services:
  api:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

#### 근본 해결
- 메모리 누수 찾기: 코드에서 불필요한 객체 보관
- 이미지 업로드 시 스트림 처리
- DB 쿼리 최적화 (select 필드 제한)
- 페이지네이션 적용

---

### 2️⃣ **DB 연결 끊김**

#### 증상
- "Connection terminated unexpectedly"
- "Too many connections"

#### 확인
```bash
# DB Health Check
curl http://localhost:3001/health/db

# PostgreSQL 연결 수 확인
psql -U postgres -d printing_erp -c "SELECT count(*) FROM pg_stat_activity;"
```

#### 대책 (prisma/schema.prisma)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool 설정
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

// .env 설정
DATABASE_URL="postgresql://postgres:password@host:5432/db?connection_limit=10&pool_timeout=30"
```

#### 근본 해결
- Connection Pool 크기 조정
- 사용하지 않는 connection 자동 정리
- DB 서버 max_connections 증가

---

### 3️⃣ **Uncaught Exception / Unhandled Rejection**

#### 증상
- 서버가 예기치 않게 종료
- 로그에 "Uncaught Exception" 메시지

#### 이미 구현된 보호 장치
- ✅ 전역 에러 핸들러 (`AllExceptionsFilter`)
- ✅ `uncaughtException` 핸들러 → Graceful Shutdown
- ✅ `unhandledRejection` 핸들러 → 로그만 남기고 계속 실행

#### 확인
```bash
# 서버 로그 확인
sudo docker logs printing114-api --tail 100

# 에러 패턴 검색
sudo docker logs printing114-api | grep "Uncaught\|Unhandled"
```

---

### 4️⃣ **디스크 용량 부족**

#### 증상
- "ENOSPC: no space left on device"
- 로그 파일이 저장 안됨

#### 확인
```bash
# 디스크 사용량 확인
df -h

# Docker 용량 확인
sudo docker system df
```

#### 대책
```bash
# Docker 정리
sudo docker system prune -a --volumes

# 로그 파일 로테이션 설정
# docker-compose.yml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

### 5️⃣ **환경변수 누락**

#### 증상
- 로그인 실패
- "JWT_SECRET is not defined"

#### 확인
```bash
# 컨테이너 환경변수 확인
sudo docker exec printing114-api env | grep JWT_SECRET
sudo docker exec printing114-api env | grep DATABASE_URL
```

#### 대책
```bash
# .env 파일 확인
cd /volume1/docker/printing114/
cat .env

# 필수 환경변수
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
FRONTEND_URL="http://1.212.201.147:3000"
```

---

## 🔄 자동 복구 (Auto Restart)

### Docker Compose 설정
```yaml
services:
  api:
    restart: unless-stopped  # ✅ 이미 설정됨
```

### 재시작 전략
- `no`: 재시작 안함
- `always`: 항상 재시작
- `on-failure`: 에러 발생 시만 재시작
- `unless-stopped`: 수동 중지가 아니면 재시작 (✅ 권장)

---

## 📈 모니터링 설정 (권장)

### 1. Uptime Kuma (무료, 자체 호스팅)
```bash
docker run -d --restart=always \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma \
  louislam/uptime-kuma:1

# Health Check URL 등록
http://1.212.201.147:3001/health
```

### 2. Cron Job으로 간단 모니터링
```bash
# crontab -e
*/5 * * * * curl -f http://1.212.201.147:3001/health || systemctl restart printing114-api
```

### 3. PM2 (Node.js 프로세스 매니저)
```bash
npm install -g pm2

# API 실행
pm2 start dist/main.js --name printing114-api

# 자동 재시작 설정
pm2 startup
pm2 save

# 모니터링
pm2 monit
```

---

## 🛠️ 복구 명령어 요약

```bash
# 1. 서버 상태 확인
sudo docker ps -a
curl http://1.212.201.147:3001/health

# 2. 로그 확인
sudo docker logs printing114-api --tail 100

# 3. 컨테이너 재시작
sudo docker restart printing114-api

# 4. 재빌드 & 재시작
cd /volume1/docker/printing114/
sudo docker-compose down
sudo docker-compose build api
sudo docker-compose up -d

# 5. DB 마이그레이션
sudo docker exec printing114-api npx prisma db push

# 6. 환경변수 확인
sudo docker exec printing114-api env | grep -E "DATABASE_URL|JWT_SECRET|FRONTEND_URL"
```

---

## 📝 로그 확인 방법

```bash
# 실시간 로그
sudo docker logs -f printing114-api

# 최근 100줄
sudo docker logs printing114-api --tail 100

# 특정 시간대
sudo docker logs printing114-api --since "2026-02-08T00:00:00" --until "2026-02-08T23:59:59"

# 에러만 필터링
sudo docker logs printing114-api 2>&1 | grep -i error
```

---

## 🎯 예방적 조치 체크리스트

- [x] Health Check 엔드포인트 구현
- [x] 전역 에러 핸들러 설정
- [x] Graceful Shutdown 구현
- [x] Docker Health Check 설정
- [x] Auto Restart 설정 (`restart: unless-stopped`)
- [ ] 로그 로테이션 설정
- [ ] 메모리 제한 설정
- [ ] DB Connection Pool 최적화
- [ ] 외부 모니터링 도구 설치 (Uptime Kuma 등)
- [ ] 알림 설정 (Slack, 이메일, 카카오톡)

---

## 📞 긴급 상황 대응 순서

1. **즉시 재시작**
   ```bash
   sudo docker restart printing114-api
   ```

2. **로그 확인 & 원인 파악**
   ```bash
   sudo docker logs printing114-api --tail 100
   ```

3. **Health Check 확인**
   ```bash
   curl http://1.212.201.147:3001/health
   curl http://1.212.201.147:3001/api/v1/health
   ```

4. **환경변수 & DB 확인**
   ```bash
   sudo docker exec printing114-api env | grep DATABASE_URL
   curl http://1.212.201.147:3001/health/db
   ```

5. **재배포 (최후 수단)**
   ```bash
   cd /volume1/docker/printing114/
   sudo docker-compose down
   sudo docker-compose up -d --build
   ```
