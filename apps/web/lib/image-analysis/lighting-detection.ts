/**
 * 히스토그램 기반 조도(밝기) 분석
 * Canvas 2D API 사용, 외부 라이브러리 불필요
 */

import type { LightingIssue, AnalysisThresholds } from './types';

export interface LightingResult {
  meanBrightness: number;
  stdDev: number;
  issue: LightingIssue;
}

/**
 * ImageData에서 밝기 히스토그램 분석
 */
export function analyzeLighting(
  imageData: ImageData,
  thresholds: Pick<AnalysisThresholds, 'brightnessDarkMax' | 'brightnessBrightMin' | 'brightnessStdDevMin'>,
): LightingResult {
  const { data, width, height } = imageData;
  const pixelCount = width * height;

  // 밝기 히스토그램 (256 bins)
  const histogram = new Uint32Array(256);
  let sum = 0;

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const brightness = Math.round(
      0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2],
    );
    histogram[brightness]++;
    sum += brightness;
  }

  const mean = sum / pixelCount;

  // 표준편차
  let varianceSum = 0;
  for (let i = 0; i < 256; i++) {
    varianceSum += histogram[i] * (i - mean) * (i - mean);
  }
  const stdDev = Math.sqrt(varianceSum / pixelCount);

  // 분류
  let issue: LightingIssue = 'ok';
  if (mean < thresholds.brightnessDarkMax) {
    issue = 'too_dark';
  } else if (mean > thresholds.brightnessBrightMin) {
    issue = 'too_bright';
  } else if (stdDev < thresholds.brightnessStdDevMin) {
    issue = 'uneven';
  }

  return { meanBrightness: mean, stdDev, issue };
}
