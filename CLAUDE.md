# 인쇄업 ERP 시스템 v2.0

## 프로젝트 개요

포토북/앨범 인쇄업체를 위한 통합 ERP 시스템입니다.
거래처 관리, 상품(완제품/반제품) 관리, 가격 정책, 주문 처리, 생산 공정, 배송까지 전 과정을 관리합니다.

## 기술 스택

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

## 프로젝트 구조

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
│   │       └── schema.prisma   # DB 스키마
│   │
│   └── web/                    # Next.js Frontend (포트: 3000)
│       ├── app/
│       │   ├── (auth)/         # 로그인/회원가입
│       │   ├── (dashboard)/    # 대시보드 레이아웃
│       │   │   ├── company/    # 회사정보
│       │   │   ├── products/   # 상품관리
│       │   │   ├── pricing/    # 가격관리
│       │   │   ├── orders/     # 주문관리
│       │   │   └── statistics/ # 통계
│       │   └── layout.tsx
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
└── CLAUDE.md
```

## 주요 명령어

```bash
# 의존성 설치 (루트에서)
npm install

# 개발 서버 실행
npm run dev:api          # API (3001)
npm run dev:web          # Frontend (3000)

# DB 관리
npm run db:push          # 스키마 푸시
npm run db:migrate       # 마이그레이션
npm run db:studio        # Prisma Studio
```

## 핵심 모듈

### 1. 회사정보 (Company)
- 지점(Branch) 관리
- 거래처 그룹(ClientGroup) - 할인율 설정
- 거래처(Client) 관리

### 2. 상품관리 (Product)
- 완제품(Product) - 규격, 제본, 용지, 커버, 박, 후가공 옵션
- 반제품(HalfProduct) - 규격, 수량 가중치, 옵션
- My상품(MyProduct) - 거래처별 즐겨찾기

### 3. 가격관리 (Pricing)
우선순위: 거래처 개별단가 > 그룹단가 > 그룹 할인율 > 표준단가

### 4. 주문관리 (Order)
상태 흐름:
```
접수대기 → 접수완료 → 생산진행 → 배송준비 → 배송완료
                ↓
         (후가공대기 → 제본대기 → 검수대기)
```

### 5. 통계 (Statistics)
- 매출통계, 거래처별, 제본방법별 통계

## API 엔드포인트

```
# 인증
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me

# 거래처
GET/POST       /api/v1/clients
GET/PUT/DELETE /api/v1/clients/:id
PATCH          /api/v1/clients/:id/group

# 거래처 그룹
GET/POST       /api/v1/client-groups
GET/PUT/DELETE /api/v1/client-groups/:id
GET            /api/v1/client-groups/:id/clients
```

## 데이터베이스 테이블

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

## 환경 변수

### API (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/printing_erp
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
API_PORT=3001
FRONTEND_URL=http://localhost:3000
```

## 백엔드 & 데이터베이스 설정 가이드

### 1. Docker로 PostgreSQL 실행

```bash
# PostgreSQL 시작
docker-compose up -d postgres

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs postgres
```

### 2. 의존성 설치 및 Prisma 설정

```bash
# API 디렉토리로 이동
cd apps/api

# 의존성 설치
npm install

# Prisma Client 생성
npx prisma generate

# 데이터베이스 스키마 푸시
npx prisma db push

# Seed 데이터 삽입
npm run db:seed
```

### 3. API 서버 실행

```bash
# 개발 모드로 실행 (apps/api 디렉토리에서)
npm run start:dev

# 또는 루트 디렉토리에서
cd ../..
npm run dev:api
```

### 4. 확인

- **API 서버**: http://localhost:3001
- **Swagger 문서**: http://localhost:3001/api/docs
- **Prisma Studio**: `npx prisma studio` 실행 후 http://localhost:5555
- **PostgreSQL**: localhost:5432 (ID: postgres, PW: postgres)

### 5. 기본 계정 (Seed 데이터)

```
관리자:
- Email: wooceo@gmail.com
- Password: color060

매니저:
- Email: manager@printing-erp.com
- Password: color060
```

## 개발 환경 설정 (WSL2 권장)

Docker 대신 WSL2를 사용하여 빠른 개발 환경을 구성합니다.

### WSL2 설치 및 설정

```bash
# PowerShell (관리자 권한)에서 Ubuntu 설치
wsl --install -d Ubuntu

# Ubuntu 터미널 실행
wsl

# 프로젝트 디렉토리로 이동 (Z: 드라이브가 읽기 전용인 경우)
# 옵션 1: Windows 경로 직접 접근
cd /mnt/z/docker/printing114-web

# 옵션 2: 로컬에 복사 후 작업 (권장 - 더 빠름)
cp -r /mnt/z/docker/printing114-web ~/printing114-web
cd ~/printing114-web
```

### Node.js 설치 (Ubuntu에서)

```bash
# nvm 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Node.js LTS 설치
nvm install --lts
nvm use --lts
```

### 개발 서버 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 장점
- Docker보다 부팅 시간 빠름 (1-2초)
- Hot reload 성능 우수
- Linux 환경과 동일한 개발 경험

## 완료된 작업

- [x] 프로젝트 구조 생성 (monorepo)
- [x] NestJS 백엔드 초기화
- [x] Next.js 15 프론트엔드 초기화
- [x] Prisma 스키마 설계
- [x] 인증 모듈 (Auth)
- [x] 회사정보 모듈 (거래처, 그룹)
- [x] 상품 모듈 (완제품)
- [x] 반제품 모듈
- [x] 가격 계산 모듈
- [x] 주문 모듈
- [x] 통계 모듈
- [x] Docker Compose 설정
- [x] Seed 데이터 작성
- [x] PostgreSQL 실행

## 진행 중

- [ ] 의존성 설치 (npm install)
- [ ] Prisma Client 생성
- [ ] 데이터베이스 마이그레이션
- [ ] API 서버 실행 테스트

## 진행 예정

- [ ] 프론트엔드 개발
- [ ] API 테스트 코드 작성
- [ ] 에러 핸들링 강화
- [ ] 파일 업로드 기능 (S3)
- [ ] 배포 설정 (Docker)

## 참고사항

- API Swagger 문서: http://localhost:3001/api/docs
- 프론트엔드: http://localhost:3000
- Prisma Studio: `npm run db:studio`
