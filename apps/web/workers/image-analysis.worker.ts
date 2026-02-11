/**
 * Web Worker: 블러 + 조도 분석
 * 메인 스레드 차단 없이 이미지 품질 분석 수행
 */

import { calculateBlurScore, getResizedImageData } from '@/lib/image-analysis/blur-detection';
import { analyzeLighting } from '@/lib/image-analysis/lighting-detection';
import type { WorkerInput, WorkerOutput } from '@/lib/image-analysis/types';

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { type, imageId, imageBitmap, thresholds } = e.data;

  if (type !== 'analyze') return;

  try {
    // 리사이즈 후 ImageData 추출
    const imageData = getResizedImageData(imageBitmap, 400);

    // 블러 감지
    const blurScore = calculateBlurScore(imageData);
    const isBlurry = blurScore < thresholds.blurVarianceMin;

    // 조도 감지
    const lighting = analyzeLighting(imageData, thresholds);

    const output: WorkerOutput = {
      type: 'result',
      imageId,
      blurScore,
      isBlurry,
      meanBrightness: lighting.meanBrightness,
      brightnessStdDev: lighting.stdDev,
      lightingIssue: lighting.issue,
    };

    self.postMessage(output);
  } catch (err) {
    const output: WorkerOutput = {
      type: 'error',
      imageId,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(output);
  } finally {
    // ImageBitmap 해제
    imageBitmap.close();
  }
};
