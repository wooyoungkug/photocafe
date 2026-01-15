# 시놀로지 NAS 배포 가이드

PhotoCafe ERP 시스템을 시놀로지 NAS에 Docker로 배포하는 방법입니다.

## 사전 요구사항

1. **시놀로지 NAS** - Docker 지원 모델 (DS218+, DS220+, DS920+ 등)
2. **Container Manager** (구 Docker) 패키지 설치
3. **Git Server** 패키지 설치 (선택사항)
4. 최소 4GB RAM 권장

## 방법 1: Git + SSH를 이용한 배포 (권장)

### 1단계: 시놀로지에서 SSH 활성화

1. DSM 접속 → **제어판** → **터미널 및 SNMP**
2. **SSH 서비스 활성화** 체크
3. 포트 설정 (기본: 22)

### 2단계: 시놀로지에 프로젝트 클론

```bash
# 로컬 PC에서 시놀로지로 SSH 접속
ssh admin@your-nas-ip -p 22

# Docker 디렉토리로 이동
cd /volume1/docker

# 프로젝트 클론 (GitHub/GitLab 등에서)
git clone https://github.com/your-username/photocafe.git
cd photocafe

# 또는 로컬에서 직접 복사 (SCP 사용)
 scp -r ./photocafe admin@your-nas-ip:/volume1/docker/
```

### 3단계: 환경 변수 설정

```bash
# 환경 변수 파일 생성
cp .env.production.example .env.production

# 편집
vi .env.production
```

**.env.production 필수 수정 항목:**
```bash
# 보안을 위해 반드시 변경!
DB_PASSWORD=your_secure_password
JWT_SECRET=your_very_long_secure_jwt_secret_key_32chars

# 시놀로지 NAS IP 주소로 변경
FRONTEND_URL=http://192.168.1.100:3000
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001
```

### 4단계: Docker 이미지 빌드 및 실행

```bash
# 이미지 빌드 및 컨테이너 실행
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 상태 확인
docker-compose -f docker-compose.prod.yml ps
```

### 5단계: 데이터베이스 초기화

```bash
# API 컨테이너에 접속하여 Prisma 마이그레이션 실행
docker exec -it photocafe-api sh

# 컨테이너 내부에서
npx prisma db push
npx prisma db seed  # 초기 데이터 삽입 (선택)

exit
```

## 방법 2: Container Manager GUI 사용

### 1단계: 프로젝트 파일 업로드

1. **File Station** → `/docker/photocafe` 폴더 생성
2. 로컬 프로젝트 파일을 해당 폴더로 업로드

### 2단계: Container Manager에서 빌드

1. **Container Manager** → **프로젝트**
2. **생성** 클릭
3. 프로젝트 경로: `/docker/photocafe`
4. docker-compose 파일: `docker-compose.prod.yml` 선택
5. 환경 변수 설정

## 포트 설정

| 서비스 | 내부 포트 | 기본 외부 포트 |
|--------|-----------|---------------|
| Web    | 3000      | 3000          |
| API    | 3001      | 3001          |
| DB     | 5432      | 5432          |
| Nginx  | 80/443    | 80/443        |

## 업데이트 방법

### Git Pull로 업데이트

```bash
ssh admin@your-nas-ip
cd /volume1/docker/photocafe

# 최신 코드 가져오기
git pull origin main

# 컨테이너 재빌드 및 재시작
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 필요시 DB 마이그레이션
docker exec -it photocafe-api npx prisma db push
```

## 자동 배포 스크립트

```bash
#!/bin/bash
# deploy.sh

cd /volume1/docker/photocafe

echo "=== Pulling latest code ==="
git pull origin main

echo "=== Rebuilding containers ==="
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo "=== Running migrations ==="
docker exec photocafe-api npx prisma db push

echo "=== Deployment complete ==="
docker-compose -f docker-compose.prod.yml ps
```

## 백업

### 데이터베이스 백업

```bash
# 백업 생성
docker exec photocafe-db pg_dump -U postgres printing_erp > backup_$(date +%Y%m%d).sql

# 복원
cat backup_20240101.sql | docker exec -i photocafe-db psql -U postgres printing_erp
```

### 볼륨 백업

```bash
# Docker 볼륨 위치 확인
docker volume inspect photocafe_postgres_data
```

## 문제 해결

### 로그 확인

```bash
# 전체 로그
docker-compose -f docker-compose.prod.yml logs

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs api
docker-compose -f docker-compose.prod.yml logs web
docker-compose -f docker-compose.prod.yml logs postgres
```

### 컨테이너 재시작

```bash
# 전체 재시작
docker-compose -f docker-compose.prod.yml restart

# 특정 서비스만 재시작
docker-compose -f docker-compose.prod.yml restart api
```

### 초기화 (데이터 삭제 주의!)

```bash
# 컨테이너 및 볼륨 삭제
docker-compose -f docker-compose.prod.yml down -v

# 이미지까지 삭제
docker-compose -f docker-compose.prod.yml down -v --rmi all
```

## 외부 접속 설정

### 시놀로지 방화벽 설정

1. **제어판** → **보안** → **방화벽**
2. 규칙 생성: 포트 3000, 3001 허용

### 포트 포워딩 (공유기)

| 외부 포트 | 내부 IP        | 내부 포트 |
|-----------|----------------|-----------|
| 3000      | 시놀로지 IP    | 3000      |
| 3001      | 시놀로지 IP    | 3001      |

### DDNS 설정 (선택)

1. **제어판** → **외부 액세스** → **DDNS**
2. Synology DDNS 또는 타사 DDNS 설정

## 접속 정보

배포 완료 후:

- **웹 앱**: `http://your-nas-ip:3000`
- **API**: `http://your-nas-ip:3001`
- **API 문서**: `http://your-nas-ip:3001/api/docs`

기본 계정:
- Email: `wooceo@gmail.com`
- Password: `color060`
