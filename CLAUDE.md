# Printing114 - 인쇄업 ERP 시스템

포토북/앨범 인쇄업체를 위한 통합 ERP 시스템입니다.

---

## 🏢 서버 정보

| 환경 | 프론트엔드 | 백엔드 API | DB |
|------|------------|------------|-----|
| **로컬** | http://localhost:3002 | http://localhost:3001 | localhost:5432 |
| **운영** | http://1.212.201.147:3000 | http://1.212.201.147:3001 | 192.168.0.67:5433 |

### 운영 서버 추가 정보
- pgAdmin: http://1.212.201.147:5050
- 내부 IP: 192.168.0.67

---

## 🔧 기술 스택

| Backend | Frontend |
|---------|----------|
| NestJS 10 | Next.js 15 (App Router) |
| Prisma 5 | React 19 |
| PostgreSQL 16 | shadcn/ui + Tailwind CSS |
| JWT 인증 | TanStack Query v5 |
| Swagger | Zustand |

---

## 📁 프로젝트 구조

```
printing114/
├── apps/
│   ├── api/                 # NestJS Backend (3001)
│   │   ├── src/modules/     # auth, company, product, pricing, order, statistics
│   │   └── prisma/          # schema.prisma
│   └── web/                 # Next.js Frontend (3002)
│       ├── app/(dashboard)/ # 관리자 대시보드
│       ├── app/(shop)/      # 쇼핑몰 (로그인, 주문)
│       ├── components/      # UI 컴포넌트
│       └── hooks/           # API 훅
└── CLAUDE.md
```

---

## 🚀 주요 명령어

```bash
# 개발 서버 실행
npm run dev              # API + Frontend 동시 실행

# DB 관리
npm run db:push          # 스키마 푸시
npm run db:studio        # Prisma Studio
```

---

## 👤 기본 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | wooceo@gmail.com | color060 |
| 매니저 | manager@printing-erp.com | color060 |

---

## 🔐 환경변수

### 로컬 (apps/api/.env)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/printing_erp"
JWT_SECRET="your-secret-key"
NAVER_CLIENT_ID="JfV4KU_hYzFQqgGAYhSw"
NAVER_CLIENT_SECRET="V6shKP2lPV"
NAVER_CALLBACK_URL="http://localhost:3001/api/v1/auth/naver/callback"
FRONTEND_URL="http://localhost:3002"
```

### 운영 서버
```env
DATABASE_URL="postgresql://postgres:photocafe2024!@192.168.0.67:5433/postgres"
NAVER_CALLBACK_URL="http://1.212.201.147:3000/api/auth/callback/naver"
```

---

## 📡 API 엔드포인트

| 카테고리 | 경로 |
|----------|------|
| 인증 | `/api/v1/auth/login`, `/register`, `/naver` |
| 거래처 | `/api/v1/clients`, `/client-groups` |
| 상품 | `/api/v1/products`, `/half-products` |
| 주문 | `/api/v1/orders` |
| 가격 | `/api/v1/pricing`, `/production-groups` |

Swagger 문서: http://localhost:3001/api/docs

---

## ✅ 완료된 작업

- [x] 프로젝트 구조 (monorepo)
- [x] 백엔드 모듈 (인증, 회사, 상품, 가격, 주문, 통계)
- [x] 프론트엔드 (관리자 대시보드, 쇼핑몰)
- [x] Docker 배포 설정
- [x] 네이버 소셜 로그인

---

## ⏳ 대기 작업

| # | 작업 | 설명 |
|---|------|------|
| 1 | nup 대표그룹만 표시 | 인디고/잉크젯앨범 가격설정 UI |
| 2 | per_sheet 타입 에러 | 가격 계산 오류 수정 |
| 3 | 사진 백업 삭제 | 스케줄러 자동 삭제 |
| 4 | 카카오/구글 로그인 | 추가 소셜 로그인 |

---

## 🔧 알려진 이슈

1. **이미지 업로드 경로** - localhost 설정으로 ERR_CONNECTION_REFUSED
2. **네이버 로그인 DB 저장** - 회원 저장 확인 필요

---

## 🐳 Docker 명령어 (운영 서버)

```bash
# 상태 확인
sudo docker ps

# 로그
sudo docker logs printing114-api --tail 30

# 재시작
sudo docker restart printing114-api

# Prisma
sudo docker exec printing114-api npx prisma db push
```

---

## 💾 데이터베이스 관리 (DB)

### 백업 (내보내기)
```bash
# 로컬 Postgres 사용 시
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d printing_erp -f backup.sql

# Docker 사용 시
docker exec -t printing_erp_postgres pg_dump -U postgres printing_erp > backup.sql
```

### 복원 (가져오기)
```bash
# 로컬 Postgres 사용 시
psql -U postgres -d printing_erp -f backup.sql

# Docker 사용 시
cat backup.sql | docker exec -i printing_erp_postgres psql -U postgres -d printing_erp
```

### 초기화 (Reset)
```bash
# 모든 데이터 삭제 후 Seed 데이터 다시 넣기
npx prisma db push --force-reset
npm run db:seed
```

---

## 📁 운영 서버 경로

| 구분 | 경로 |
|------|------|
| 백엔드 | `/volume1/docker/printing114/` |
| 프론트엔드 | `/volume1/docker/printing114-web/apps/web/` |
