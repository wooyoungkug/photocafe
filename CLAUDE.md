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

---

## 📱 반응형 디자인 가이드

**모든 UI 컴포넌트는 반응형으로 디자인해야 합니다.**

### Breakpoints (Tailwind CSS)

| Breakpoint | 최소 너비 | 용도 |
| ---------- | --------- | ---- |
| `sm` | 640px | 모바일 가로 |
| `md` | 768px | 태블릿 |
| `lg` | 1024px | 데스크톱 |
| `xl` | 1280px | 대형 화면 |

### 반응형 패턴

#### 1. 레이아웃

```jsx
// 모바일: 1열, 태블릿: 2열, 데스크톱: 4열
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
```

#### 2. 패딩/마진

```jsx
// 모바일: 작은 여백, 데스크톱: 큰 여백
<div className="p-3 sm:p-4 lg:p-6">
```

#### 3. 텍스트 크기

```jsx
// 모바일: 작은 텍스트, 데스크톱: 큰 텍스트
<h1 className="text-xl sm:text-2xl lg:text-3xl">
```

#### 4. 숨기기/표시

```jsx
// 모바일에서 숨기기
<div className="hidden md:block">
// 데스크톱에서 숨기기
<div className="block md:hidden">
```

#### 5. Flex 방향

```jsx
// 모바일: 세로, 데스크톱: 가로
<div className="flex flex-col sm:flex-row">
```

### 주요 컴포넌트 반응형 규칙

| 컴포넌트 | 모바일 | 태블릿+ |
| -------- | ------ | ------- |
| Sidebar | 슬라이드 메뉴 (숨김) | 고정 사이드바 |
| Header | 검색 아이콘만 | 전체 검색바 |
| Table | 가로 스크롤 | 전체 표시 |
| Card | 작은 패딩 | 큰 패딩 |
| Dialog | 전체 너비 | 고정 너비 |
| PageHeader | 제목+액션 수직 | 제목+액션 수평 |
