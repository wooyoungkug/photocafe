# 인쇄업 ERP 시스템 v2.0

포토북/앨범 인쇄업체를 위한 통합 ERP 시스템입니다.

## 📋 목차

- [기술 스택](#기술-스택)
- [시작하기](#시작하기)
- [프로젝트 구조](#프로젝트-구조)
- [주요 기능](#주요-기능)
- [API 문서](#api-문서)

## 🛠 기술 스택

### Backend
- **NestJS 10** - 웹 프레임워크
- **Prisma 5** - ORM
- **PostgreSQL 16** - 데이터베이스
- **JWT** - 인증 (Access + Refresh Token)
- **Swagger** - API 문서화

### Frontend
- **Next.js 15** - React 프레임워크 (App Router)
- **React 19** - UI 라이브러리
- **shadcn/ui** - UI 컴포넌트
- **Tailwind CSS** - 스타일링
- **TanStack Query v5** - 서버 상태 관리
- **TanStack Table v8** - 테이블
- **Zustand** - 클라이언트 상태 관리
- **React Hook Form + Zod** - 폼 관리/검증

## 🚀 시작하기

### 1. 사전 요구사항

- Node.js >= 20.0.0
- Docker Desktop (PostgreSQL 실행용)
- npm 또는 yarn

### 2. 저장소 클론 및 의존성 설치

```bash
# 저장소 클론
git clone <repository-url>
cd printing-erp

# 의존성 설치
npm install
```

### 3. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 설정합니다:

```env
# apps/api/.env

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/printing_erp"

# JWT
JWT_SECRET="printing-erp-super-secret-key-2024"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# App
API_PORT=3001
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
```

### 4. 데이터베이스 실행

#### Docker Compose 사용 (권장)

```bash
# PostgreSQL 컨테이너 실행
docker-compose up -d postgres

# PostgreSQL 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs postgres
```

#### pgAdmin (DB 관리 도구) 실행 (선택사항)

```bash
# pgAdmin 실행
docker-compose up -d pgadmin

# 접속 정보
# URL: http://localhost:5050
# Email: admin@printing-erp.com
# Password: admin
```

### 5. Prisma 설정 및 마이그레이션

```bash
# Prisma Client 생성
npm run db:generate

# 데이터베이스 스키마 푸시
npm run db:push

# Seed 데이터 삽입
npm run db:seed
```

### 6. 개발 서버 실행

```bash
# API 서버 실행 (포트: 3001)
npm run dev:api

# Frontend 서버 실행 (포트: 3000)
npm run dev:web

# 또는 둘 다 실행
npm run dev
```

### 7. 접속

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Swagger 문서**: http://localhost:3001/api/docs
- **Prisma Studio**: `npm run db:studio` 실행 후 http://localhost:5555

## 📁 프로젝트 구조

```
printing-erp/
├── apps/
│   ├── api/                    # NestJS Backend (포트: 3001)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # 인증
│   │   │   │   ├── company/    # 회사정보 (거래처, 그룹)
│   │   │   │   ├── product/    # 완제품
│   │   │   │   ├── half-product/ # 반제품
│   │   │   │   ├── pricing/    # 가격관리
│   │   │   │   ├── order/      # 주문관리
│   │   │   │   └── statistics/ # 통계
│   │   │   ├── common/
│   │   │   │   └── prisma/     # Prisma 서비스
│   │   │   └── main.ts
│   │   └── prisma/
│   │       ├── schema.prisma   # DB 스키마
│   │       └── seed.ts         # Seed 데이터
│   │
│   └── web/                    # Next.js Frontend (포트: 3000)
│       ├── app/
│       │   ├── (auth)/         # 로그인/회원가입
│       │   └── (dashboard)/    # 대시보드 레이아웃
│       ├── components/
│       │   ├── ui/             # shadcn/ui
│       │   ├── layout/         # 사이드바, 헤더
│       │   ├── forms/          # 폼 컴포넌트
│       │   └── tables/         # 테이블 컴포넌트
│       ├── hooks/              # 커스텀 훅
│       ├── stores/             # Zustand 스토어
│       └── lib/                # 유틸리티
│
├── packages/
│   └── shared/                 # 공유 타입/유틸
│
├── docker-compose.yml          # Docker 설정
└── README.md
```

## 🎯 주요 기능

### 1. 인증 & 권한 관리
- JWT 기반 인증 (Access + Refresh Token)
- 역할 기반 접근 제어 (ADMIN, MANAGER, STAFF)
- 지점별 권한 관리

### 2. 회사정보 관리
- **지점(Branch)**: 본사 및 지점 관리
- **거래처 그룹(ClientGroup)**: 그룹별 할인율 설정
- **거래처(Client)**: 거래처 정보 관리

### 3. 상품 관리
- **완제품(Product)**: 규격, 제본, 용지, 커버, 박, 후가공 옵션
- **반제품(HalfProduct)**: 규격, 수량 가중치, 옵션
- **My상품(MyProduct)**: 거래처별 즐겨찾기

### 4. 가격 관리
- 완제품/반제품 가격 자동 계산
- 가격 우선순위: 거래처 개별단가 > 그룹단가 > 그룹 할인율 > 표준단가
- 옵션별 추가 금액 계산

### 5. 주문 관리
- 주문 CRUD
- 주문 상태 관리
  ```
  접수대기 → 접수완료 → 생산진행 → 배송준비 → 배송완료
                  ↓
           (후가공대기 → 제본대기 → 검수대기)
  ```
- 주문 파일 업로드/관리
- 배송 정보 관리

### 6. 통계 & 대시보드
- 일별/월별 매출 통계
- 거래처별 통계
- 제본방법별 통계
- 상품별 통계

## 📚 API 문서

### Swagger UI
개발 서버 실행 후 http://localhost:3001/api/docs 에서 확인할 수 있습니다.

### 주요 엔드포인트

```
# 인증
POST   /api/v1/auth/login          # 로그인
POST   /api/v1/auth/register       # 회원가입
POST   /api/v1/auth/refresh        # 토큰 갱신
GET    /api/v1/auth/me             # 내 정보

# 거래처
GET    /api/v1/clients             # 거래처 목록
POST   /api/v1/clients             # 거래처 생성
GET    /api/v1/clients/:id         # 거래처 상세
PUT    /api/v1/clients/:id         # 거래처 수정
DELETE /api/v1/clients/:id         # 거래처 삭제

# 거래처 그룹
GET    /api/v1/client-groups       # 그룹 목록
POST   /api/v1/client-groups       # 그룹 생성
GET    /api/v1/client-groups/:id   # 그룹 상세
PUT    /api/v1/client-groups/:id   # 그룹 수정
DELETE /api/v1/client-groups/:id   # 그룹 삭제

# 완제품
GET    /api/v1/products            # 상품 목록
POST   /api/v1/products            # 상품 생성
GET    /api/v1/products/:id        # 상품 상세
PUT    /api/v1/products/:id        # 상품 수정
DELETE /api/v1/products/:id        # 상품 삭제

# 반제품
GET    /api/v1/half-products       # 반제품 목록
POST   /api/v1/half-products       # 반제품 생성
GET    /api/v1/half-products/:id   # 반제품 상세
PUT    /api/v1/half-products/:id   # 반제품 수정
DELETE /api/v1/half-products/:id   # 반제품 삭제

# 주문
GET    /api/v1/orders              # 주문 목록
POST   /api/v1/orders              # 주문 생성
GET    /api/v1/orders/:id          # 주문 상세
PUT    /api/v1/orders/:id          # 주문 수정
DELETE /api/v1/orders/:id          # 주문 삭제

# 가격 계산
POST   /api/v1/pricing/calculate-product       # 완제품 가격 계산
POST   /api/v1/pricing/calculate-half-product  # 반제품 가격 계산

# 통계
GET    /api/v1/statistics/dashboard            # 대시보드 통계
GET    /api/v1/statistics/sales-by-date        # 일별/월별 매출
GET    /api/v1/statistics/sales-by-client      # 거래처별 매출
GET    /api/v1/statistics/sales-by-binding     # 제본별 통계
```

## 🗄 데이터베이스

### 주요 테이블

| 테이블 | 설명 |
|--------|------|
| users | 사용자 |
| branches | 지점 |
| client_groups | 거래처 그룹 |
| clients | 거래처 |
| categories | 카테고리 (계층형) |
| products | 완제품 |
| product_* | 완제품 옵션 (규격, 제본, 용지, 커버, 박, 후가공) |
| half_products | 반제품 |
| half_product_* | 반제품 옵션 |
| my_products | My상품 |
| orders | 주문 |
| order_items | 주문 항목 |
| order_files | 주문 파일 |
| reception_schedules | 접수 마감 일정 |

### Prisma Studio

데이터베이스를 GUI로 관리하려면:

```bash
npm run db:studio
```

http://localhost:5555 에서 확인할 수 있습니다.

## 🛠 유용한 명령어

```bash
# 개발
npm run dev                 # 전체 개발 서버 실행
npm run dev:api             # API만 실행
npm run dev:web             # Frontend만 실행

# 빌드
npm run build               # 전체 빌드
npm run build:api           # API 빌드
npm run build:web           # Frontend 빌드

# 데이터베이스
npm run db:generate         # Prisma Client 생성
npm run db:push             # 스키마 푸시 (개발용)
npm run db:migrate          # 마이그레이션 생성 및 적용
npm run db:studio           # Prisma Studio 실행
npm run db:seed             # Seed 데이터 삽입

# Docker
docker-compose up -d        # 모든 서비스 시작
docker-compose up -d postgres  # PostgreSQL만 시작
docker-compose down         # 모든 서비스 중지
docker-compose logs -f      # 로그 확인
docker-compose ps           # 실행 중인 컨테이너 확인
```

## 🔐 기본 계정 정보 (Seed 데이터)

```
# 관리자
Email: admin@printing-erp.com
Password: admin1234

# 매니저
Email: manager@printing-erp.com
Password: admin1234
```

## 📝 라이선스

MIT License

## 👥 기여

이슈나 PR은 언제든 환영합니다!
