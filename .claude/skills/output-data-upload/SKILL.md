# 출력데이터 업로드 기능 스킬

## 개요
인쇄물 출력을 위한 이미지/PDF 파일 업로드 기능

## 요구사항

### 1. 업로드 방식
- 드래그앤드롭 방식 지원
- 하위 디렉토리 4단계까지 지원 (폴더째로 드래그 가능)
- 클릭하여 파일 선택도 가능

### 2. 파일 분석 및 표시
- **규격**: 인치 단위로 표시 (예: 5x7, 8x10)
- **해상도**: dpi/inch 단위로 표시 (예: 300dpi)
- **썸네일**: 업로드된 파일의 미리보기 표시
- **파일명**: 원본 파일명 표시

### 3. 페이지 유형 구분
- **단면**: 일반 단면 페이지
- **펼침면**: 양면 펼침 페이지 (spread)
- 업로드 시 선택 가능

### 4. 파일 정렬 규칙
- 파일명에 "첫장" 또는 "첫막장"의 "첫" 포함 시 → 맨 앞으로 정렬
- 파일명에 "막장" 또는 "첫막장"의 "막" 포함 시 → 맨 뒤로 정렬
- 나머지는 파일명 순 정렬

### 5. 유효성 검사 및 경고
- **규격 불일치**: 첫 번째 파일과 규격이 다른 파일은 빨간 테두리 표시
- **해상도 불일치**: 첫 번째 파일과 해상도가 다른 파일은 빨간 테두리 표시
- 불일치 파일에 경고 메시지 표시 (예: "규격이 다릅니다: 8x10 (기준: 5x7)")

### 6. 지원 파일 형식
- 이미지: JPG, JPEG, PNG, TIFF, TIF, PSD
- 문서: PDF

### 7. 호환성
- Windows PC 호환
- macOS 호환
- 크로스 플랫폼 파일명 인코딩 처리 (UTF-8)

## 기술 구현 사항

### 프론트엔드
- 컴포넌트 위치: `apps/web/components/upload/output-data-uploader.tsx`
- react-dropzone 또는 커스텀 드래그앤드롭 구현
- 이미지 메타데이터 추출 (EXIF, 이미지 크기)
- PDF.js로 PDF 페이지 썸네일 생성

### 백엔드 API
- 업로드 엔드포인트: `POST /api/v1/upload/output-data`
- 파일 분석 엔드포인트: `POST /api/v1/upload/analyze-image`
- Sharp 라이브러리로 이미지 메타데이터 추출
- pdf-lib 또는 pdf-parse로 PDF 분석

### 데이터 구조
```typescript
interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl: string;

  // 규격 정보
  widthPx: number;
  heightPx: number;
  widthInch: number;
  heightInch: number;
  dpi: number;

  // 페이지 유형
  pageType: 'single' | 'spread';

  // 정렬 정보
  sortOrder: number;
  isFirst: boolean;  // 첫장 여부
  isLast: boolean;   // 막장 여부

  // 유효성
  hasWarning: boolean;
  warningMessage?: string;
}
```

## UI/UX 가이드
1. 드롭존은 점선 테두리로 표시
2. 파일 드래그 시 드롭존 하이라이트
3. 업로드 진행률 표시
4. 썸네일은 정사각형 또는 원본 비율 유지
5. 경고 파일은 빨간 테두리 + 아이콘
6. 파일 순서 드래그로 변경 가능

---

## 스프레드(펼침면) 감지 및 시작방향 자동 결정 엔진

> ⚠️ 이 규칙은 중요하므로 반드시 준수할 것

### 스프레드 판정 기준

클라이언트는 **앨범 방향(AlbumOrientation)** 을 먼저 판단한 뒤 방향별 임계값을 적용한다.

| 앨범 방향 | 단면 예시 | 스프레드 예시 | 임계 ratio |
|---------|---------|------------|-----------|
| portrait (세로형) | 11×15 → 0.73 | 22×15 → 1.47 | **≥ 1.1** |
| square (정방형) | 20×20 → 1.0 | 40×20 → 2.0 | **≥ 1.7** |
| landscape (가로형) | 14×11 → 1.27 | 28×11 → 2.54 | **≥ 2.0** |

- 앨범 방향은 폴더 내 전체 파일의 **다수결**(`detectAlbumOrientation`)로 결정
- 단일 임계값 1.3은 폴백용(`SPREAD_RATIO`)으로만 사용
- 서버(`pdf-generator.service.ts`)는 `SPREAD_RATIO = 1.3` 유지 (PDF 생성 시 이미지 분할용)

### 시작방향 자동 결정 규칙 (낱장 폴더 업로드 시)

| 첫 번째 파일 상태 | 시작방향 | 빈 페이지 삽입 |
|----------------|---------|------------|
| 스프레드 + **좌측 절반이 흰색(빈 페이지)** | `rtl-lend` (우시작 → 좌끝) | 없음 |
| 스프레드 + **좌측 절반에 내용 있음** | `ltr-rend` (좌시작 → 우끝) | 없음 |
| **낱장(단면)** 파일 | `rtl-lend` (우시작 → 좌끝) | 좌측에 빈 페이지 자동 삽입 (`hasInsertedBlankStart=true`) |

### 핵심 동작 원리
- 우시작(`rtl-lend`): 왼쪽이 빈 페이지, 오른쪽이 1페이지
- 낱장으로 주문 시 → 시스템이 왼쪽에 빈 페이지를 자동 삽입하여 펼침면 주문으로 변환
- 표지(첫장/막장) 개념은 이 로직에서 사용하지 않음

### 구현 위치
- 감지 함수: `apps/web/lib/album-utils.ts` → `detectImageOrientation()`, `detectAlbumOrientation()`, `detectSpreadSmart()`, `detectFolderStartDirection()`, `isLeftHalfBlank()`, `detectSpread()`(폴백)
- 스토어 필드: `AlbumFolderData.detectedStartDirection`, `AlbumFolderData.hasInsertedBlankStart`
- 파일 필드: `AlbumUploadedFile.isSpread`
- UI: `apps/web/components/album-order/steps/step-data-upload.tsx` — 폴더 카드에 자동 감지 결과 배지 표시

### 좌측 빈 페이지 판정 방법 (Canvas API)
- 좌측 절반을 200px 너비로 다운스케일하여 평균 밝기 계산
- 평균 밝기 > 250 → 흰색(빈 페이지)으로 판정
- 서버의 `BLANK_MEAN_THRESHOLD=250` 과 동일 기준
