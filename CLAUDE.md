# Printing114 - 인쇄업 ERP 시스템

포토북/앨범 인쇄업체를 위한 통합 ERP 시스템

## 서버 정보

| 환경 | 프론트엔드 | 백엔드 API | DB |
|------|------------|------------|-----|
| 로컬 | localhost:3002 | localhost:3001 | localhost:5432 |
| 운영 | 1.212.201.147:3000 | 1.212.201.147:3001 | 192.168.0.67:5433 |

## 기술 스택

- **Backend**: NestJS 10, Prisma 5, PostgreSQL 16, JWT
- **Frontend**: Next.js 15, React 19, shadcn/ui, TanStack Query v5, Zustand

## 프로젝트 구조

```
apps/
├── api/                 # NestJS Backend (3001)
│   ├── src/modules/     # auth, company, product, pricing, order, statistics
│   └── prisma/          # schema.prisma
└── web/                 # Next.js Frontend (3002)
    ├── app/(dashboard)/ # 관리자 대시보드
    └── app/(shop)/      # 쇼핑몰
```

## 주요 명령어

```bash
npm run dev          # API + Frontend 동시 실행
npm run db:push      # 스키마 푸시
npm run db:studio    # Prisma Studio
```

## 기본 계정

### 관리자(직원) 로그인
**중요**: 관리자 로그인 시 이메일이 아닌 **직원 ID**를 입력해야 합니다.

| 직원 ID | 이름 | 비밀번호 |
|---------|------|----------|
| admin | 우영국 | .env 참조 또는 관리자 문의 |
| song | 송만석 | 관리자 문의 |

## 환경변수 (apps/api/.env)

> **주의**: 실제 시크릿 값은 절대 문서에 기록하지 마세요. `apps/api/.env.example` 참조.

```env
DATABASE_URL=환경변수(.env) 참조
JWT_SECRET=환경변수(.env) 참조 (최소 32자 랜덤 문자열)
FRONTEND_URL="http://localhost:3002"
```

## API 문서

Swagger: http://localhost:3001/api/docs

## Docker (운영 서버)

```bash
sudo docker ps                                    # 상태 확인
sudo docker logs printing114-api --tail 30        # 로그
sudo docker restart printing114-api               # 재시작
sudo docker exec printing114-api npx prisma db push  # Prisma
```

## DB 관리

```bash
# 백업
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d printing_erp -f backup.sql

# 복원
psql -U postgres -d printing_erp -f backup.sql

# 초기화
npx prisma db push --force-reset && npm run db:seed
```

## 운영 서버 경로

- 백엔드: `/volume1/docker/printing114/`
- 프론트엔드: `/volume1/docker/printing114-web/apps/web/`

## 개발 요구사항

### 다국어 (i18n)
- **라이브러리**: next-intl
- **지원 언어**: ko(기본), en, ja, zh
- **자동감지**: Accept-Language 헤더 기반 국가별 자동인식, 현지 언어로 표시
- **라우팅**: `app/[locale]/` 기반 locale 프리픽스 라우팅
- **번역 파일**: `apps/web/messages/{locale}.json`

### 배송정보 (파일업로드 시)
- 파일업로드(앨범주문) 시 폴더(원판)별로 배송정보 입력
- **발송지**: 포토미(제작회사) 또는 회원정보(스튜디오) 선택
- **배송지**: 회원정보(스튜디오) 또는 앨범고객(신랑/신부 주소 직접입력) 선택
- **권수별 개별배송**: 부수가 N권이면 권수만큼 배송정보 추가 입력 가능
- **배송방법**: 택배(parcel), 오토바이퀵(motorcycle), 화물(freight), 방문수령(pickup)
- **배송비**: 기초정보설정 > 배송비 에 등록된 금액 기준으로 고객 청구
- **주소검색**: 다음 우편번호 API 인라인 embed 방식 (팝업 없이 카드 안에서 검색)

### 크로스플랫폼
- PC(Windows), macOS, Android에서 접속·운영·업로드 가능
- 모바일(Android): webkitdirectory 미지원 → 다중파일 선택 모드 제공
- 데스크톱: 기존 폴더 업로드 유지
