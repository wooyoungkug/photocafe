# PhotoCafe 핫폴더 에이전트

PhotoCafe ERP (Railway) 의 PrintReadyFile 을 자동으로 다운로드해 로컬 핫폴더에 저장하는 데스크톱 에이전트.

## 동작 흐름

1. ERP 관리자가 `/settings/agent` 에서 토큰 발급
2. 에이전트 PC 에 토큰 + 핫폴더 경로 설정
3. 에이전트 실행 → 30초마다 ERP 폴링
4. 미다운 파일 발견 → B2 presigned URL 로 다운로드 → 핫폴더 저장
5. `/agent/mark-downloaded` 호출 → ERP 에 기록

## 경로 규칙

- 인디고면: `{indigoHotfolder}/{YYMMDD}/{orderNumber}/{fileName}`
- 잉크젯면: `{inkjetHotfolder}/{YYMMDD}/{orderNumber}/{fileName}`

## 설정 (config.json)

```json
{
  "apiBaseUrl": "https://api.photocafe.co.kr/api/v1",
  "token": "ag_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "indigoHotfolder": "C:\\hotfolder\\indigo",
  "inkjetHotfolder": "C:\\hotfolder\\inkjet",
  "pollIntervalSec": 30,
  "httpPort": 9199
}
```

설정 파일 위치: `process.cwd()/config.json` (실행 디렉터리 기준)

## 로컬 HTTP API (관리용)

기본 포트: `9199`

- `GET  http://localhost:9199/status` — 현재 상태 (마지막 폴링 시각, 다운 파일 수)
- `GET  http://localhost:9199/config` — 설정값 조회 (token 은 prefix 만)
- `POST http://localhost:9199/config` — 설정 변경 (JSON body)

## 빌드 / 실행

```bash
# 개발 (ts-node)
npm run dev

# 빌드
npm run build

# 실행 (빌드 후)
npm start

# Windows exe 단일 파일 빌드
npm run package:exe
# → release/agent.exe
```

## 첫 실행 가이드

1. `apps/agent/` 디렉터리에 `config.json` 생성 (위 예시 참고)
2. ERP `/settings/agent` 에서 토큰 발급 후 `token` 필드에 붙여넣기
3. `npm start` 실행
4. ERP 의 에이전트 페이지에서 30초 내 "온라인" 표시 확인
