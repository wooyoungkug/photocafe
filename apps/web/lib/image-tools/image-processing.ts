/**
 * 이미지 처리 알고리즘
 * - Unsharp Mask (선명도 강화)
 * - Gaussian Blur (가우시안 블러)
 */

export function createGaussianKernel(size: number, sigma: number): Float32Array {
  const kernel = new Float32Array(size);
  const half = Math.floor(size / 2);
  const s2 = 2 * sigma * sigma;
  for (let i = 0; i < size; i++) {
    const x = i - half;
    kernel[i] = Math.exp(-(x * x) / s2);
  }
  return kernel;
}

export function gaussianBlur(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number,
): Uint8ClampedArray {
  const size = Math.ceil(radius * 3) * 2 + 1;
  const kernel = createGaussianKernel(size, radius);
  const result = new Uint8ClampedArray(data.length);
  const temp = new Uint8ClampedArray(data.length);
  const half = Math.floor(size / 2);

  // 가로 패스
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, wSum = 0;
      for (let k = -half; k <= half; k++) {
        const px = Math.min(w - 1, Math.max(0, x + k));
        const idx = (y * w + px) * 4;
        const weight = kernel[k + half];
        r += data[idx] * weight;
        g += data[idx + 1] * weight;
        b += data[idx + 2] * weight;
        wSum += weight;
      }
      const idx = (y * w + x) * 4;
      temp[idx] = r / wSum;
      temp[idx + 1] = g / wSum;
      temp[idx + 2] = b / wSum;
      temp[idx + 3] = data[idx + 3];
    }
  }

  // 세로 패스
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let r = 0, g = 0, b = 0, wSum = 0;
      for (let k = -half; k <= half; k++) {
        const py = Math.min(h - 1, Math.max(0, y + k));
        const idx = (py * w + x) * 4;
        const weight = kernel[k + half];
        r += temp[idx] * weight;
        g += temp[idx + 1] * weight;
        b += temp[idx + 2] * weight;
        wSum += weight;
      }
      const idx = (y * w + x) * 4;
      result[idx] = r / wSum;
      result[idx + 1] = g / wSum;
      result[idx + 2] = b / wSum;
      result[idx + 3] = temp[idx + 3];
    }
  }
  return result;
}

export function applyUnsharpMask(
  imageData: ImageData,
  radius: number,
  amount: number,
): ImageData {
  if (amount <= 0) return imageData;
  const w = imageData.width, h = imageData.height;
  const src = imageData.data;
  const blurred = gaussianBlur(src, w, h, radius);
  const factor = amount / 100;
  for (let i = 0; i < src.length; i += 4) {
    src[i] = Math.min(255, Math.max(0, src[i] + (src[i] - blurred[i]) * factor));
    src[i + 1] = Math.min(255, Math.max(0, src[i + 1] + (src[i + 1] - blurred[i + 1]) * factor));
    src[i + 2] = Math.min(255, Math.max(0, src[i + 2] + (src[i + 2] - blurred[i + 2]) * factor));
  }
  return imageData;
}

/** 업스케일 + 선명도 적용 */
export function processRestore(
  img: HTMLImageElement,
  scale: number,
  amount: number,
  radius: number,
): HTMLCanvasElement {
  const newW = Math.round(img.width * scale);
  const newH = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, newW, newH);

  if (amount > 0) {
    const imageData = ctx.getImageData(0, 0, newW, newH);
    applyUnsharpMask(imageData, radius, amount);
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas;
}
