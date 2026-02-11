/**
 * 앨범/화보/포토북 주문 유틸리티 함수
 */

import type { AlbumUploadedFile } from '@/stores/album-order-store';

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

  // 첫막장 (좌우 분리 대상) - 공백 포함 변형도 체크
  if (koreanName.includes('첫막장') || /첫장\s*막장/.test(koreanName) || lowerName.includes('firstlast')) {
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


// ===== DPI/인치 계산 유틸리티 =====

/**
 * 픽셀 크기를 인치로 변환
 */
export function pixelsToInches(pixels: number, dpi: number): number {
  return pixels / dpi;
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

/**
 * JPEG/PNG 파일에서 실제 DPI 메타데이터를 읽어옴
 * - JPEG: JFIF APP0 또는 EXIF APP1의 XResolution 태그
 * - PNG: pHYs 청크
 * - 읽기 실패 시 300dpi 폴백
 */
export async function readImageDpi(file: File): Promise<number> {
  const DEFAULT_DPI = 300;
  try {
    const buffer = await file.slice(0, 65536).arrayBuffer(); // 첫 64KB만 읽기
    const view = new DataView(buffer);

    // JPEG 감지 (FF D8)
    if (view.getUint8(0) === 0xFF && view.getUint8(1) === 0xD8) {
      return readJpegDpi(view) || DEFAULT_DPI;
    }

    // PNG 감지 (89 50 4E 47)
    if (view.getUint8(0) === 0x89 && view.getUint8(1) === 0x50 &&
        view.getUint8(2) === 0x4E && view.getUint8(3) === 0x47) {
      return readPngDpi(view) || DEFAULT_DPI;
    }

    return DEFAULT_DPI;
  } catch {
    return DEFAULT_DPI;
  }
}

function readJpegDpi(view: DataView): number | null {
  let offset = 2; // SOI 이후
  const len = view.byteLength;

  while (offset < len - 4) {
    if (view.getUint8(offset) !== 0xFF) break;
    const marker = view.getUint8(offset + 1);
    const segLen = view.getUint16(offset + 2);

    // JFIF APP0 (FF E0)
    // 구조: [FF E0][len 2B][JFIF\0 5B][ver_major 1B][ver_minor 1B][units 1B][xDensity 2B][yDensity 2B]
    if (marker === 0xE0 && segLen >= 14) {
      const units = view.getUint8(offset + 11);
      const xDensity = view.getUint16(offset + 12);
      if (units === 1 && xDensity > 0) return xDensity; // DPI
      if (units === 2 && xDensity > 0) return Math.round(xDensity * 2.54); // DPCM → DPI
    }

    // EXIF APP1 (FF E1)
    if (marker === 0xE1) {
      const dpi = readExifDpi(view, offset + 4, segLen - 2);
      if (dpi) return dpi;
    }

    offset += 2 + segLen;
  }
  return null;
}

function readExifDpi(view: DataView, exifStart: number, exifLen: number): number | null {
  const len = view.byteLength;
  if (exifStart + 6 > len) return null;

  // "Exif\0\0" 확인
  if (view.getUint8(exifStart) !== 0x45 || view.getUint8(exifStart + 1) !== 0x78) return null;

  const tiffStart = exifStart + 6;
  if (tiffStart + 8 > len) return null;

  // 바이트 오더: "II" (리틀엔디안) 또는 "MM" (빅엔디안)
  const bo = view.getUint16(tiffStart);
  const le = bo === 0x4949;

  const getU16 = (off: number) => view.getUint16(off, le);
  const getU32 = (off: number) => view.getUint32(off, le);

  // IFD0 오프셋
  const ifdOffset = getU32(tiffStart + 4);
  const ifd0 = tiffStart + ifdOffset;
  if (ifd0 + 2 > len) return null;

  const entries = getU16(ifd0);

  for (let i = 0; i < entries; i++) {
    const entryOff = ifd0 + 2 + i * 12;
    if (entryOff + 12 > len) break;

    const tag = getU16(entryOff);
    // XResolution = 0x011A
    if (tag === 0x011A) {
      const valOffset = getU32(entryOff + 8);
      const rationalOff = tiffStart + valOffset;
      if (rationalOff + 8 > len) break;
      const num = getU32(rationalOff);
      const den = getU32(rationalOff + 4);
      if (den > 0) return Math.round(num / den);
    }
  }
  return null;
}

function readPngDpi(view: DataView): number | null {
  let offset = 8; // PNG 시그니처 이후
  const len = view.byteLength;

  while (offset + 12 < len) {
    const chunkLen = view.getUint32(offset);
    const type = String.fromCharCode(
      view.getUint8(offset + 4), view.getUint8(offset + 5),
      view.getUint8(offset + 6), view.getUint8(offset + 7)
    );

    if (type === 'pHYs' && chunkLen === 9) {
      const xPPU = view.getUint32(offset + 8);
      const unit = view.getUint8(offset + 16); // 1 = meter
      if (unit === 1 && xPPU > 0) return Math.round(xPPU / 39.3701); // PPM → DPI
    }

    if (type === 'IDAT') break; // 데이터 청크에 도달하면 중단
    offset += 12 + chunkLen;
  }
  return null;
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

// ===== 화보 주문 전용 유틸리티 =====

/**
 * 정규화된 비율 계산 (긴변/짧은변, 항상 >= 1)
 * 예: 12x12 → 1.0, 15x10 → 1.5, 10x15 → 1.5
 */
export function calculateNormalizedRatio(width: number, height: number): number {
  if (width === 0 || height === 0) return 0;
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  return Number((long / short).toFixed(4));
}

/**
 * 두 규격의 정규화된 비율이 일치하는지 확인
 * @param tolerance 허용 오차 (기본 1% = 0.01, 인쇄물 특성상 1% 이내 허용)
 */
export function isSameNormalizedRatio(
  w1: number, h1: number,
  w2: number, h2: number,
  tolerance: number = 0.01
): boolean {
  const ratio1 = calculateNormalizedRatio(w1, h1);
  const ratio2 = calculateNormalizedRatio(w2, h2);
  return Math.abs(ratio1 - ratio2) <= tolerance;
}

/**
 * 최대공약수 계산 (비율 라벨용)
 */
function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * 비율을 읽기 쉬운 라벨로 변환
 * 예: 12x12 → "1:1", 15x10 → "3:2", 12x9 → "4:3"
 */
export function getRatioLabel(width: number, height: number): string {
  if (width === 0 || height === 0) return '0:0';

  const g = gcd(Math.round(width), Math.round(height));
  const w = Math.round(width) / g;
  const h = Math.round(height) / g;

  // 큰 값을 앞에 배치 (예: 3:2, 4:3, 5:4)
  return w >= h ? `${w}:${h}` : `${h}:${w}`;
}

/**
 * 파일 검증 상태 타입
 */
export type SizeMatchStatus = 'EXACT' | 'RATIO_MATCH' | 'RATIO_MISMATCH' | 'PENDING';

/**
 * 파일 검증 결과 인터페이스
 */
export interface FileValidationResult {
  fileId: string;
  fileName: string;
  widthInch: number;
  heightInch: number;
  dpi: number;
  ratio: number;
  status: SizeMatchStatus;
  message: string;
}

/**
 * 폴더 검증 결과 인터페이스
 */
export interface FolderValidationResult {
  overallStatus: 'PASS' | 'APPROVED' | 'REJECTED' | 'PENDING';
  files: FileValidationResult[];
  summary: {
    totalFiles: number;
    exactMatch: number;
    ratioMatch: number;
    ratioMismatch: number;
  };
}

/**
 * 단일 파일의 규격 검증 (3단계)
 * - EXACT: 규격 완전 일치
 * - RATIO_MATCH: 비율은 같지만 크기 다름 (리사이즈 가능)
 * - RATIO_MISMATCH: 비율 불일치 (주문 불가)
 */
export function validateFileSize(
  fileWidthInch: number,
  fileHeightInch: number,
  targetWidthInch: number,
  targetHeightInch: number,
  tolerance: number = 0.01
): { status: SizeMatchStatus; message: string } {
  // 규격 완전 일치 체크 (5% 허용)
  const widthMatch = Math.abs(fileWidthInch - targetWidthInch) / targetWidthInch <= 0.05;
  const heightMatch = Math.abs(fileHeightInch - targetHeightInch) / targetHeightInch <= 0.05;

  if (widthMatch && heightMatch) {
    return { status: 'EXACT', message: '규격 일치' };
  }

  // 비율 일치 체크
  if (isSameNormalizedRatio(fileWidthInch, fileHeightInch, targetWidthInch, targetHeightInch, tolerance)) {
    return {
      status: 'RATIO_MATCH',
      message: `비율 일치 (${fileWidthInch.toFixed(1)}x${fileHeightInch.toFixed(1)}" → ${targetWidthInch}x${targetHeightInch}")`
    };
  }

  // 비율 불일치
  const fileRatio = calculateNormalizedRatio(fileWidthInch, fileHeightInch);
  const targetRatio = calculateNormalizedRatio(targetWidthInch, targetHeightInch);
  return {
    status: 'RATIO_MISMATCH',
    message: `비율 불일치 (${fileRatio.toFixed(2)} ≠ ${targetRatio.toFixed(2)})`
  };
}

/**
 * 폴더 전체 파일 검증
 */
export function validateFolderFiles(
  files: Array<{ id: string; fileName: string; widthInch: number; heightInch: number; dpi: number }>,
  targetWidthInch: number,
  targetHeightInch: number,
  tolerance: number = 0.01
): FolderValidationResult {
  const results: FileValidationResult[] = [];
  let exactMatch = 0;
  let ratioMatch = 0;
  let ratioMismatch = 0;

  files.forEach((file) => {
    const { status, message } = validateFileSize(
      file.widthInch, file.heightInch,
      targetWidthInch, targetHeightInch,
      tolerance
    );

    const ratio = calculateNormalizedRatio(file.widthInch, file.heightInch);

    results.push({
      fileId: file.id,
      fileName: file.fileName,
      widthInch: file.widthInch,
      heightInch: file.heightInch,
      dpi: file.dpi,
      ratio,
      status,
      message,
    });

    if (status === 'EXACT') exactMatch++;
    else if (status === 'RATIO_MATCH') ratioMatch++;
    else if (status === 'RATIO_MISMATCH') ratioMismatch++;
  });

  // 전체 상태 결정
  let overallStatus: 'PASS' | 'APPROVED' | 'REJECTED' | 'PENDING';
  if (ratioMismatch > 0) {
    overallStatus = 'REJECTED';
  } else if (ratioMatch > 0) {
    overallStatus = 'PENDING'; // 승인 필요
  } else {
    overallStatus = 'PASS';
  }

  return {
    overallStatus,
    files: results,
    summary: {
      totalFiles: files.length,
      exactMatch,
      ratioMatch,
      ratioMismatch,
    },
  };
}

/**
 * 같은 비율의 표준 규격 필터링
 */
export interface StandardSize {
  id: string;
  name: string;
  widthInch: number;
  heightInch: number;
  ratio: number;
  ratioLabel: string;
}

export function filterSameRatioSizes(
  currentWidthInch: number,
  currentHeightInch: number,
  allSizes: StandardSize[],
  tolerance: number = 0.01
): StandardSize[] {
  return allSizes.filter((size) =>
    isSameNormalizedRatio(
      currentWidthInch, currentHeightInch,
      size.widthInch, size.heightInch,
      tolerance
    ) &&
    // 현재 규격은 제외
    !(Math.abs(size.widthInch - currentWidthInch) < 0.1 &&
      Math.abs(size.heightInch - currentHeightInch) < 0.1)
  );
}

/**
 * 편집 스타일에 따른 페이지 수 계산
 * - SINGLE (낱장): 파일 수 = 페이지 수
 * - SPREAD (펼침면): 파일 수 × 2 = 페이지 수
 */
export function calculatePageCount(
  fileCount: number,
  editStyle: 'SINGLE' | 'SPREAD'
): number {
  return editStyle === 'SPREAD' ? fileCount * 2 : fileCount;
}

/**
 * 화보 주문 정보 포맷팅
 * 형식: 폴더명 / 규격_인치x인치(dpi) / 페이지수 / 부수 / 용량
 */
export function formatPhotobookOrderInfo(
  folderName: string,
  widthInch: number,
  heightInch: number,
  dpi: number,
  pageCount: number,
  quantity: number,
  totalSize: number
): string {
  return `${folderName} / ${widthInch}x${heightInch}inch(${dpi}dpi) / ${pageCount}p / ${quantity}부 / ${formatFileSize(totalSize)}`;
}
