/**
 * Laplacian 분산 기반 블러(초점불량) 감지
 * Canvas 2D API 사용, 외부 라이브러리 불필요
 */

/**
 * ImageData에서 Laplacian 분산을 계산하여 블러 점수를 반환
 * 높은 값 = 선명, 낮은 값 = 블러
 */
export function calculateBlurScore(imageData: ImageData): number {
  const { data, width, height } = imageData;

  // 1. 그레이스케일 변환
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  // 2. 3x3 Laplacian 커널 적용: [0,1,0], [1,-4,1], [0,1,0]
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const laplacian =
        -4 * gray[y * width + x] +
        gray[(y - 1) * width + x] +
        gray[(y + 1) * width + x] +
        gray[y * width + (x - 1)] +
        gray[y * width + (x + 1)];

      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  // 3. Laplacian 분산 = 선명도 측정치
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return variance;
}

/**
 * 이미지 파일을 분석 크기로 리사이즈한 후 ImageData 추출
 */
export function getResizedImageData(
  source: ImageBitmap | HTMLImageElement | HTMLCanvasElement,
  maxSize: number = 400,
): ImageData {
  let w = 'naturalWidth' in source ? source.naturalWidth : source.width;
  let h = 'naturalHeight' in source ? source.naturalHeight : source.height;

  if (w > maxSize || h > maxSize) {
    const scale = maxSize / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  // OffscreenCanvas 또는 일반 Canvas 사용
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(source, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}
