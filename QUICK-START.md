# 🚀 빠른 시작 가이드

API 서버가 연결되지 않는 문제를 해결하는 가장 빠른 방법입니다.

## 방법 1: 자동 설치 스크립트 (추천)

### Windows 탐색기 사용
1. 이 파일이 있는 폴더(`Y:\web\printing-erp`)를 엽니다
2. **`quick-start.bat`** 파일을 더블클릭합니다
3. 설치가 완료될 때까지 기다립니다 (3-5분)
4. 서버가 자동으로 시작됩니다

### 명령 프롬프트 사용
```cmd
cd Y:\web\printing-erp
quick-start.bat
```

## 방법 2: 수동 실행 (단계별)

새 명령 프롬프트 또는 PowerShell을 열고:

```cmd
# 1. API 디렉토리로 이동
cd Y:\web\printing-erp\apps\api

# 2. 의존성 설치 (3-5분 소요 예상)
npm install

# 3. Prisma Client 생성
npx prisma generate

# 4. 데이터베이스 스키마 푸시
npx prisma db push

# 5. Seed 데이터 삽입
npm run db:seed

# 6. API 서버 실행
npm run start:dev
```

## ✅ 성공 확인

API 서버가 정상적으로 시작되면 터미널에 다음과 같이 표시됩니다:

```
🚀 API Server running on http://localhost:3001
📚 Swagger docs: http://localhost:3001/api/docs
```

그 후 브라우저에서:
- http://localhost:3001/api/docs 접속
- Swagger UI 확인

## 🔧 문제 해결

### PostgreSQL이 실행되지 않은 경우
```cmd
# PostgreSQL 시작
docker-compose up -d postgres

# 상태 확인
docker-compose ps
```

### 포트 3001이 이미 사용 중인 경우
```cmd
# 포트 사용 확인
netstat -ano | findstr :3001

# 프로세스 종료 (PID는 위 명령어 결과에서 확인)
taskkill /F /PID [PID번호]
```

## 📞 기본 계정 정보

설치가 완료되면 다음 계정으로 로그인할 수 있습니다:

**관리자**
- Email: `admin@printing-erp.com`
- Password: `admin1234`

**매니저**
- Email: `manager@printing-erp.com`
- Password: `admin1234`

## 🎯 다음 단계

API 서버가 정상 실행되면:
1. Swagger UI에서 `/api/v1/auth/login` 엔드포인트 테스트
2. 로그인 후 받은 토큰으로 다른 API 테스트
3. Prisma Studio로 데이터 확인: `npx prisma studio`
