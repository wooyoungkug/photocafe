/**
 * 앨범/화보/포토북 주문 유틸리티 함수
 */

import type { AlbumUploadedFile, PageLayout } from '@/stores/album-order-store';

// ===== 비율 계산 유틸리티 =====

/**
 * 가로/세로 비율 계산
 * @returns width/height 비율 (예: 12x9 → 1.333)
 */
export function calculateAspectRatio(width: number, height: number): number {
  if (height === 0) return 0;
  return width / height;
}

/**
 * 두 비율이 허용 오차 내에서 일치하는지 확인
 * @param ratio1 첫 번째 비율
 * @param ratio2 두 번째 비율
 * @param tolerance 허용 오차 (기본 5% = 0.05)
 */
export function isRatioMatch(ratio1: number, ratio2: number, tolerance: number = 0.05): boolean {
  if (ratio1 === 0 || ratio2 === 0) return false;
  const diff = Math.abs(ratio1 - ratio2) / Math.max(ratio1, ratio2);
  return diff <= tolerance;
}

/**
 * 기준 비율과 일치하는 규격 필터링
 * 예: 12x12 기준 → 8x8, 10x10, 11x11, 14x14 필터링
 */
export function filterSpecificationsByRatio<T extends { widthInch?: number; heightInch?: number }>(
  specs: T[],
  baseWidth: number,
  baseHeight: number,
  tolerance: number = 0.05
): T[] {
  const baseRatio = calculateAspectRatio(baseWidth, baseHeight);

  return specs.filter((spec) => {
    if (!spec.widthInch || !spec.heightInch) return false;
    const specRatio = calculateAspectRatio(spec.widthInch, spec.heightInch);
    return isRatioMatch(baseRatio, specRatio, tolerance);
  });
}

/**
 * 비율 매칭 결과 계산
 * 업로드된 이미지와 선택된 규격의 비율 차이 분석
 */
export function calculateRatioMatchResult(
  imageWidth: number,
  imageHeight: number,
  specWidth: number,
  specHeight: number
): {
  isMatch: boolean;
  imageRatio: number;
  specRatio: number;
  scaleFactor: number;
  needsWarning: boolean;
} {
  const imageRatio = calculateAspectRatio(imageWidth, imageHeight);
  const specRatio = calculateAspectRatio(specWidth, specHeight);
  const isMatch = isRatioMatch(imageRatio, specRatio);

  // 확대 비율 계산 (이미지를 규격에 맞추기 위한 스케일)
  const widthScale = specWidth / imageWidth;
  const heightScale = specHeight / imageHeight;
  const scaleFactor = Math.max(widthScale, heightScale);

  return {
    isMatch,
    imageRatio,
    specRatio,
    scaleFactor,
    needsWarning: !isMatch && scaleFactor > 1.05, // 5% 이상 확대 필요시 경고
  };
}

// ===== 파일명 처리 유틸리티 =====

/**
 * 순차 파일명 생성
 * 100p 미만: 01_파일명, 02_파일명
 * 100p 이상: 001_파일명, 002_파일명
 */
export function generateSequentialFilename(
  originalName: string,
  index: number,
  totalCount: number
): string {
  const padLength = totalCount >= 100 ? 3 : 2;
  const paddedIndex = String(index + 1).padStart(padLength, '0');

  // 확장자 분리
  const lastDotIndex = originalName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${paddedIndex}_${originalName}`;
  }

  const name = originalName.substring(0, lastDotIndex);
  const ext = originalName.substring(lastDotIndex);
  return `${paddedIndex}_${name}${ext}`;
}

/**
 * 파일명에서 첫장/막장/첫막장 키워드 감지
 */
export function detectCoverPageType(filename: string): 'first' | 'last' | 'firstlast' | 'normal' {
  const lowerName = filename.toLowerCase();
  const koreanName = filename;

  // 첫막장 (좌우 분리 대상)
  if (koreanName.includes('첫막장') || lowerName.includes('firstlast')) {
    return 'firstlast';
  }

  // 첫장
  if (koreanName.includes('첫장') || lowerName.includes('first') || lowerName.includes('front')) {
    return 'first';
  }

  // 막장
  if (koreanName.includes('막장') || lowerName.includes('last') || lowerName.includes('back')) {
    return 'last';
  }

  return 'normal';
}

// ===== 첫막장 처리 유틸리티 =====

/**
 * 첫막장 파일을 좌우로 분리하여 처리
 * 왼쪽 = 첫장, 오른쪽 = 막장
 */
export interface SplitCoverResult {
  firstHalf: {
    filename: string;
    widthPx: number;
    heightPx: number;
    widthInch: number;
    heightInch: number;
    cropX: number;
    cropWidth: number;
  };
  lastHalf: {
    filename: string;
    widthPx: number;
    heightPx: number;
    widthInch: number;
    heightInch: number;
    cropX: number;
    cropWidth: number;
  };
}

export function splitCoverPage(
  file: AlbumUploadedFile
): SplitCoverResult {
  const halfWidth = Math.floor(file.widthPx / 2);
  const halfWidthInch = file.widthInch / 2;

  // 파일명에서 확장자 분리
  const lastDotIndex = file.originalName.lastIndexOf('.');
  const baseName = lastDotIndex !== -1
    ? file.originalName.substring(0, lastDotIndex)
    : file.originalName;
  const ext = lastDotIndex !== -1
    ? file.originalName.substring(lastDotIndex)
    : '';

  return {
    firstHalf: {
      filename: `${baseName}_첫장${ext}`,
      widthPx: halfWidth,
      heightPx: file.heightPx,
      widthInch: halfWidthInch,
      heightInch: file.heightInch,
      cropX: 0,
      cropWidth: halfWidth,
    },
    lastHalf: {
      filename: `${baseName}_막장${ext}`,
      widthPx: halfWidth,
      heightPx: file.heightPx,
      widthInch: halfWidthInch,
      heightInch: file.heightInch,
      cropX: halfWidth,
      cropWidth: halfWidth,
    },
  };
}

// ===== 빈페이지 삽입 유틸리티 =====

export interface BlankPage {
  id: string;
  isBlank: true;
  filename: string;
  widthPx: number;
  heightPx: number;
  position: 'before-first' | 'after-last';
}

/**
 * 펼침면 레이아웃에서 빈페이지 삽입 위치 계산
 * - 첫장 왼쪽에 빈페이지 삽입
 * - 막장 오른쪽에 빈페이지 삽입
 */
export function calculateBlankPagePositions(
  files: AlbumUploadedFile[],
  pageLayout: PageLayout,
  representativeSpec?: { widthPx: number; heightPx: number }
): BlankPage[] {
  if (pageLayout !== 'spread') {
    return [];
  }

  const blankPages: BlankPage[] = [];
  const defaultWidth = representativeSpec?.widthPx || 3000;
  const defaultHeight = representativeSpec?.heightPx || 3000;

  // 첫장 찾기
  const hasFirstPage = files.some((f) => f.isFirst);
  if (hasFirstPage) {
    blankPages.push({
      id: `blank-before-first-${Date.now()}`,
      isBlank: true,
      filename: 'blank_page.png',
      widthPx: defaultWidth,
      heightPx: defaultHeight,
      position: 'before-first',
    });
  }

  // 막장 찾기
  const hasLastPage = files.some((f) => f.isLast);
  if (hasLastPage) {
    blankPages.push({
      id: `blank-after-last-${Date.now() + 1}`,
      isBlank: true,
      filename: 'blank_page.png',
      widthPx: defaultWidth,
      heightPx: defaultHeight,
      position: 'after-last',
    });
  }

  return blankPages;
}

// ===== 파일 정렬 유틸리티 =====

/**
 * 앨범 파일 정렬
 * 순서: 첫장 → 일반 파일 (sortOrder 순) → 막장
 */
export function sortAlbumFiles(files: AlbumUploadedFile[]): AlbumUploadedFile[] {
  return [...files].sort((a, b) => {
    // 첫장은 가장 앞
    if (a.isFirst && !b.isFirst) return -1;
    if (!a.isFirst && b.isFirst) return 1;

    // 막장은 가장 뒤
    if (a.isLast && !b.isLast) return 1;
    if (!a.isLast && b.isLast) return -1;

    // 일반 파일은 sortOrder 순
    return a.sortOrder - b.sortOrder;
  });
}

/**
 * 파일 목록 처리 (첫막장 분리 + 정렬 + 순차 파일명 부여)
 */
export function processAlbumFiles(
  files: AlbumUploadedFile[],
  pageLayout: PageLayout
): AlbumUploadedFile[] {
  // 1. 첫막장 파일 분리 처리
  const processedFiles: AlbumUploadedFile[] = [];

  files.forEach((file) => {
    const coverType = detectCoverPageType(file.originalName);

    if (coverType === 'firstlast' && file.isCoverPage) {
      // 첫막장 파일을 분리하는 로직은 별도 처리 필요 (Canvas API 사용)
      // 여기서는 메타데이터만 처리
      processedFiles.push({
        ...file,
        isFirst: false,
        isLast: false,
        isCoverPage: true,
      });
    } else if (coverType === 'first') {
      processedFiles.push({ ...file, isFirst: true, isLast: false });
    } else if (coverType === 'last') {
      processedFiles.push({ ...file, isFirst: false, isLast: true });
    } else {
      processedFiles.push(file);
    }
  });

  // 2. 정렬
  const sortedFiles = sortAlbumFiles(processedFiles);

  // 3. 순차 파일명 부여
  return sortedFiles.map((file, index) => ({
    ...file,
    sortOrder: index,
    newName: generateSequentialFilename(file.originalName, index, sortedFiles.length),
  }));
}

// ===== DPI/인치 계산 유틸리티 =====

/**
 * 픽셀 크기를 인치로 변환
 */
export function pixelsToInches(pixels: number, dpi: number): number {
  return pixels / dpi;
}

/**
 * 인치 크기를 픽셀로 변환
 */
export function inchesToPixels(inches: number, dpi: number): number {
  return inches * dpi;
}

/**
 * 이미지 DPI 계산 (파일에 메타데이터가 없는 경우 추정)
 * 일반적으로 인쇄용은 300dpi 기준
 */
export function estimateDpi(
  widthPx: number,
  heightPx: number,
  expectedWidthInch?: number,
  expectedHeightInch?: number
): number {
  if (expectedWidthInch && expectedWidthInch > 0) {
    return Math.round(widthPx / expectedWidthInch);
  }
  if (expectedHeightInch && expectedHeightInch > 0) {
    return Math.round(heightPx / expectedHeightInch);
  }
  // 기본 300dpi 가정
  return 300;
}

// ===== 폴더 분석 유틸리티 =====

/**
 * 폴더 내 파일들의 대표 규격 분석
 * 가장 많은 비율을 가진 규격을 대표로 선정
 */
export function analyzeRepresentativeSpec(
  files: AlbumUploadedFile[]
): {
  widthInch: number;
  heightInch: number;
  widthPx: number;
  heightPx: number;
} | undefined {
  if (files.length === 0) return undefined;

  // 비율별 파일 수 집계
  const ratioGroups: Map<string, { count: number; files: AlbumUploadedFile[] }> = new Map();

  files.forEach((file) => {
    const ratio = calculateAspectRatio(file.widthInch, file.heightInch);
    const ratioKey = ratio.toFixed(2);

    const existing = ratioGroups.get(ratioKey);
    if (existing) {
      existing.count++;
      existing.files.push(file);
    } else {
      ratioGroups.set(ratioKey, { count: 1, files: [file] });
    }
  });

  // 가장 많은 파일을 가진 비율 그룹 선택
  let maxGroup: { count: number; files: AlbumUploadedFile[] } | undefined;
  ratioGroups.forEach((group) => {
    if (!maxGroup || group.count > maxGroup.count) {
      maxGroup = group;
    }
  });

  if (!maxGroup || maxGroup.files.length === 0) return undefined;

  // 해당 그룹에서 가장 큰 규격 선택 (가장 높은 해상도)
  const representative = maxGroup.files.reduce((prev, curr) => {
    return curr.widthPx * curr.heightPx > prev.widthPx * prev.heightPx ? curr : prev;
  });

  return {
    widthInch: representative.widthInch,
    heightInch: representative.heightInch,
    widthPx: representative.widthPx,
    heightPx: representative.heightPx,
  };
}

/**
 * 비율 불일치 파일 감지
 */
export function findRatioMismatchFiles(
  files: AlbumUploadedFile[],
  representativeSpec: { widthInch: number; heightInch: number },
  tolerance: number = 0.05
): AlbumUploadedFile[] {
  const baseRatio = calculateAspectRatio(
    representativeSpec.widthInch,
    representativeSpec.heightInch
  );

  return files.filter((file) => {
    const fileRatio = calculateAspectRatio(file.widthInch, file.heightInch);
    return !isRatioMatch(baseRatio, fileRatio, tolerance);
  });
}

// ===== 용량 포맷 유틸리티 =====

/**
 * 바이트를 읽기 쉬운 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * 인치를 mm로 변환
 */
export function inchesToMm(inches: number): number {
  return inches * 25.4;
}

/**
 * mm를 인치로 변환
 */
export function mmToInches(mm: number): number {
  return mm / 25.4;
}
