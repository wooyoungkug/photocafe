/**
 * 이미지 품질분석 타입 정의
 */

export type IssueType = 'eyes_closed' | 'blurry' | 'poor_lighting';
export type LightingIssue = 'too_dark' | 'too_bright' | 'uneven' | 'ok';
export type AnalysisStatus = 'idle' | 'loading' | 'analyzing' | 'completed' | 'error';
export type AnalysisPhase = 'blur_lighting' | 'face_detection';

export interface ImageFile {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export interface AnalysisResult {
  imageId: string;
  fileName: string;
  thumbnailUrl: string;
  issues: IssueType[];
  // Blur
  blurScore: number;
  isBlurry: boolean;
  // Lighting
  meanBrightness: number;
  brightnessStdDev: number;
  lightingIssue: LightingIssue;
  // Eyes
  facesDetected: number;
  eyesClosed: boolean;
  eyeAspectRatios: { left: number; right: number }[];
}

export interface AnalysisThresholds {
  blurVarianceMin: number;       // 기본 100 (이하 = 블러)
  brightnessDarkMax: number;     // 기본 60 (이하 = 너무 어두움)
  brightnessBrightMin: number;   // 기본 200 (이상 = 너무 밝음)
  brightnessStdDevMin: number;   // 기본 15 (이하 = 불균일 조명)
  earThreshold: number;          // 기본 0.2 (이하 = 눈감음)
}

export interface AnalysisProgress {
  total: number;
  completed: number;
  current: string;
  phase: AnalysisPhase;
}

export const DEFAULT_THRESHOLDS: AnalysisThresholds = {
  blurVarianceMin: 100,
  brightnessDarkMax: 60,
  brightnessBrightMin: 200,
  brightnessStdDevMin: 15,
  earThreshold: 0.2,
};

// Web Worker 메시지 프로토콜
export interface WorkerInput {
  type: 'analyze';
  imageId: string;
  fileName: string;
  imageBitmap: ImageBitmap;
  thresholds: AnalysisThresholds;
}

export interface WorkerResultOutput {
  type: 'result';
  imageId: string;
  blurScore: number;
  isBlurry: boolean;
  meanBrightness: number;
  brightnessStdDev: number;
  lightingIssue: LightingIssue;
}

export interface WorkerErrorOutput {
  type: 'error';
  imageId: string;
  error: string;
}

export type WorkerOutput = WorkerResultOutput | WorkerErrorOutput;
