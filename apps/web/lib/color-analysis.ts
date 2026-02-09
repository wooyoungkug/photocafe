/**
 * 사진 색상 분석 및 그룹핑 유틸리티
 * 앨범 사진의 의상/컬러별 자동 그룹핑을 위한 순수 함수 모듈
 * Canvas API 기반, 외부 라이브러리 불필요
 */

// ============================================================
// Types
// ============================================================

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/** 개별 사진의 색상 분석 결과 */
export interface PhotoColorInfo {
  dominantColors: RGBColor[];     // 상위 3개 주요 색상
  colorBucket: number;            // 색상 그룹 인덱스 (0-based)
  colorBucketLabel: string;       // "A", "B", "C"...
  colorHex: string;               // 대표 색상 hex (#RRGGBB)
  colorNameKo: string;            // 한국어 색상명 ("남색", "베이지")
  brightness: number;             // 평균 밝기 (0-255)
}

/** 폴더 레벨 색상 그룹 */
export interface ColorGroup {
  groupIndex: number;
  groupLabel: string;             // "A", "B", "C"...
  representativeColor: RGBColor;
  representativeHex: string;
  colorNameKo: string;
  fileIds: string[];
  fileCount: number;
}

// ============================================================
// Color Utilities
// ============================================================

/** RGB → hex 변환 */
export function rgbToHex(color: RGBColor): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

/** 두 색상 간 유클리드 거리 */
export function colorDistance(c1: RGBColor, c2: RGBColor): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** RGB → 밝기(luminance) */
function getBrightness(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** RGB → HSL hue (0-360) */
function rgbToHue(r: number, g: number, b: number): number {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
}

/** RGB → HSL saturation (0-1) */
function rgbToSaturation(r: number, g: number, b: number): number {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

/** 한국어 색상명 반환 */
export function getColorNameKo(color: RGBColor): string {
  const { r, g, b } = color;
  const brightness = getBrightness(r, g, b);
  const saturation = rgbToSaturation(r, g, b);
  const hue = rgbToHue(r, g, b);

  // 무채색 판별
  if (saturation < 0.12) {
    if (brightness < 50) return '검정';
    if (brightness < 100) return '진회색';
    if (brightness < 170) return '회색';
    if (brightness < 220) return '밝은회색';
    return '흰색';
  }

  // 어두운 색
  if (brightness < 40) return '검정';

  // 유채색 - hue 기반
  if (hue < 15 || hue >= 345) return brightness < 100 ? '진빨강' : '빨강';
  if (hue < 35) return brightness < 120 ? '갈색' : '주황';
  if (hue < 55) return brightness > 180 ? '노랑' : '겨자';
  if (hue < 80) return '연두';
  if (hue < 160) return brightness < 100 ? '진초록' : '초록';
  if (hue < 195) return '청록';
  if (hue < 230) return brightness < 80 ? '남색' : '파랑';
  if (hue < 275) return brightness < 100 ? '진보라' : '보라';
  if (hue < 330) return brightness < 100 ? '자주' : '분홍';
  return '빨강';
}

// ============================================================
// Color Extraction (Canvas-based)
// ============================================================

/**
 * Canvas ImageData에서 중앙 영역의 주요 색상 추출
 * 사진 중앙 40% 영역 (인물 의상 영역) 기준
 * 배경색(매우 밝거나 어두운 색) 제외
 */
export function extractDominantColors(
  imageData: ImageData,
  topN: number = 3
): { colors: RGBColor[]; brightness: number } {
  const { data, width, height } = imageData;

  // 중앙 40% 영역만 샘플링 (의상/인물 영역)
  const x1 = Math.floor(width * 0.3);
  const x2 = Math.floor(width * 0.7);
  const y1 = Math.floor(height * 0.2);
  const y2 = Math.floor(height * 0.7);

  // 색상 빈도 맵 (5비트 양자화: 각 채널 8단계 → 512 버킷)
  const colorMap = new Map<number, { r: number; g: number; b: number; count: number }>();
  let totalBrightness = 0;
  let pixelCount = 0;

  for (let y = y1; y < y2; y += 2) { // 2픽셀 간격 샘플링 (성능)
    for (let x = x1; x < x2; x += 2) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const bright = getBrightness(r, g, b);
      totalBrightness += bright;
      pixelCount++;

      // 배경 제외: 매우 밝은 색(>225) 또는 매우 어두운 색(<25)
      if (bright > 225 || bright < 25) continue;

      // 5비트 양자화 (32단위 → 8레벨)
      const qr = Math.floor(r / 32);
      const qg = Math.floor(g / 32);
      const qb = Math.floor(b / 32);
      const key = (qr << 6) | (qg << 3) | qb;

      const existing = colorMap.get(key);
      if (existing) {
        // 누적 평균 계산
        existing.r = (existing.r * existing.count + r) / (existing.count + 1);
        existing.g = (existing.g * existing.count + g) / (existing.count + 1);
        existing.b = (existing.b * existing.count + b) / (existing.count + 1);
        existing.count++;
      } else {
        colorMap.set(key, { r, g, b, count: 1 });
      }
    }
  }

  // 빈도순 정렬 → 상위 N개
  const sorted = Array.from(colorMap.values())
    .sort((a, b) => b.count - a.count);

  // 유사 색상 병합 (거리 40 이내)
  const merged: typeof sorted = [];
  for (const color of sorted) {
    const similar = merged.find(m =>
      colorDistance(
        { r: m.r, g: m.g, b: m.b },
        { r: color.r, g: color.g, b: color.b }
      ) < 40
    );
    if (similar) {
      similar.count += color.count;
    } else {
      merged.push({ ...color });
    }
    if (merged.length >= topN * 2) break;
  }

  merged.sort((a, b) => b.count - a.count);

  const colors: RGBColor[] = merged.slice(0, topN).map(c => ({
    r: Math.round(c.r),
    g: Math.round(c.g),
    b: Math.round(c.b),
  }));

  // 최소 1개 색상 보장
  if (colors.length === 0) {
    colors.push({ r: 128, g: 128, b: 128 });
  }

  return {
    colors,
    brightness: pixelCount > 0 ? totalBrightness / pixelCount : 128,
  };
}

/**
 * 썸네일 Data URL에서 색상 분석 실행
 * 기존 썸네일 이미지를 Canvas에 그려서 ImageData 추출
 */
export function extractColorsFromThumbnail(
  thumbnailDataUrl: string
): Promise<{ colors: RGBColor[]; brightness: number }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ colors: [{ r: 128, g: 128, b: 128 }], brightness: 128 });
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ colors: [{ r: 128, g: 128, b: 128 }], brightness: 128 });
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(extractDominantColors(imageData));
    };
    img.onerror = () => {
      resolve({ colors: [{ r: 128, g: 128, b: 128 }], brightness: 128 });
    };
    img.src = thumbnailDataUrl;
  });
}

/**
 * HTMLImageElement에서 직접 색상 추출
 * 썸네일 생성 시 이미 로드된 이미지 재활용
 */
export function extractColorsFromImage(
  img: HTMLImageElement | HTMLCanvasElement
): { colors: RGBColor[]; brightness: number } {
  const width = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const height = img instanceof HTMLImageElement ? img.naturalHeight : img.height;

  // 성능: 200px 이하로 리사이즈하여 분석
  const maxAnalysisSize = 200;
  const scale = Math.min(maxAnalysisSize / width, maxAnalysisSize / height, 1);
  const sw = Math.round(width * scale);
  const sh = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { colors: [{ r: 128, g: 128, b: 128 }], brightness: 128 };
  }
  ctx.drawImage(img, 0, 0, sw, sh);
  const imageData = ctx.getImageData(0, 0, sw, sh);
  return extractDominantColors(imageData);
}

// ============================================================
// Photo Grouping
// ============================================================

interface PhotoForGrouping {
  id: string;
  dominantColors: RGBColor[];
}

/**
 * 사진들을 주요 색상 유사도 기반으로 그룹핑
 * Agglomerative clustering: 가장 가까운 그룹을 반복적으로 병합
 *
 * @param photos 분석된 사진 배열
 * @param maxDistance 병합 임계값 (기본 80, RGB 공간)
 * @returns 색상 그룹 배열
 */
export function groupPhotosByColor(
  photos: PhotoForGrouping[],
  maxDistance: number = 80
): ColorGroup[] {
  if (photos.length === 0) return [];

  // 각 사진을 개별 클러스터로 초기화
  let clusters: Array<{
    ids: string[];
    center: RGBColor;
  }> = photos.map(p => ({
    ids: [p.id],
    center: p.dominantColors[0] || { r: 128, g: 128, b: 128 },
  }));

  // Agglomerative: 가장 가까운 두 클러스터를 반복 병합
  while (clusters.length > 1) {
    let minDist = Infinity;
    let mergeA = 0;
    let mergeB = 1;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = colorDistance(clusters[i].center, clusters[j].center);
        if (d < minDist) {
          minDist = d;
          mergeA = i;
          mergeB = j;
        }
      }
    }

    if (minDist > maxDistance) break;

    // 두 클러스터 병합
    const a = clusters[mergeA];
    const b = clusters[mergeB];
    const totalCount = a.ids.length + b.ids.length;
    const merged = {
      ids: [...a.ids, ...b.ids],
      center: {
        r: (a.center.r * a.ids.length + b.center.r * b.ids.length) / totalCount,
        g: (a.center.g * a.ids.length + b.center.g * b.ids.length) / totalCount,
        b: (a.center.b * a.ids.length + b.center.b * b.ids.length) / totalCount,
      },
    };

    clusters = clusters.filter((_, idx) => idx !== mergeA && idx !== mergeB);
    clusters.push(merged);
  }

  // 크기 순 정렬 (가장 많은 사진 그룹이 A)
  clusters.sort((a, b) => b.ids.length - a.ids.length);

  // ColorGroup 객체 생성
  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return clusters.map((cluster, idx) => {
    const color: RGBColor = {
      r: Math.round(cluster.center.r),
      g: Math.round(cluster.center.g),
      b: Math.round(cluster.center.b),
    };
    return {
      groupIndex: idx,
      groupLabel: labels[idx] || `${idx + 1}`,
      representativeColor: color,
      representativeHex: rgbToHex(color),
      colorNameKo: getColorNameKo(color),
      fileIds: cluster.ids,
      fileCount: cluster.ids.length,
    };
  });
}

/**
 * PhotoColorInfo 생성 (개별 파일용)
 * extractDominantColors 결과를 PhotoColorInfo로 변환
 */
export function buildPhotoColorInfo(
  colors: RGBColor[],
  brightness: number,
  groupIndex: number = 0,
  groupLabel: string = 'A'
): PhotoColorInfo {
  const primary = colors[0] || { r: 128, g: 128, b: 128 };
  return {
    dominantColors: colors,
    colorBucket: groupIndex,
    colorBucketLabel: groupLabel,
    colorHex: rgbToHex(primary),
    colorNameKo: getColorNameKo(primary),
    brightness,
  };
}

/**
 * 폴더 내 파일들의 색상 그룹을 계산하고 각 파일의 colorInfo를 업데이트
 * @returns { groups, fileColorMap } - 그룹 목록과 파일ID→colorInfo 매핑
 */
export function analyzeAndGroupPhotos(
  files: Array<{ id: string; colorInfo?: PhotoColorInfo }>
): {
  groups: ColorGroup[];
  fileColorMap: Map<string, { colorBucket: number; colorBucketLabel: string }>;
} {
  const photosForGrouping: PhotoForGrouping[] = files
    .filter(f => f.colorInfo && f.colorInfo.dominantColors.length > 0)
    .map(f => ({
      id: f.id,
      dominantColors: f.colorInfo!.dominantColors,
    }));

  const groups = groupPhotosByColor(photosForGrouping);

  // 파일 → 그룹 매핑 생성
  const fileColorMap = new Map<string, { colorBucket: number; colorBucketLabel: string }>();
  for (const group of groups) {
    for (const fileId of group.fileIds) {
      fileColorMap.set(fileId, {
        colorBucket: group.groupIndex,
        colorBucketLabel: group.groupLabel,
      });
    }
  }

  return { groups, fileColorMap };
}
