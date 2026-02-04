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
