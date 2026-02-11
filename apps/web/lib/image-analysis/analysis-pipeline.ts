/**
 * 2단계 이미지 품질 분석 파이프라인
 * Phase 1: Web Worker (블러 + 조도) → Phase 2: Main Thread (눈감음 감지)
 */

import type {
  ImageFile,
  AnalysisResult,
  AnalysisThresholds,
  IssueType,
  WorkerInput,
  WorkerOutput,
} from './types';
import { detectEyesClosed, initFaceLandmarker, disposeFaceLandmarker } from './eye-detection';

type ProgressCallback = (phase: 'blur_lighting' | 'face_detection', completed: number, total: number, current: string) => void;
type ResultCallback = (result: AnalysisResult) => void;

interface PipelineOptions {
  images: ImageFile[];
  thresholds: AnalysisThresholds;
  onProgress: ProgressCallback;
  onResult: ResultCallback;
  signal: AbortSignal;
}

// Phase 1 중간 결과 저장
interface Phase1Result {
  imageId: string;
  blurScore: number;
  isBlurry: boolean;
  meanBrightness: number;
  brightnessStdDev: number;
  lightingIssue: string;
}

/**
 * Phase 1: Web Worker에서 블러 + 조도 분석
 */
async function runPhase1(
  images: ImageFile[],
  thresholds: AnalysisThresholds,
  onProgress: (completed: number, current: string) => void,
  signal: AbortSignal,
): Promise<Map<string, Phase1Result>> {
  const results = new Map<string, Phase1Result>();

  // Worker 생성 가능 여부 체크
  let useWorker = true;
  let worker: Worker | null = null;

  try {
    worker = new Worker(new URL('../../workers/image-analysis.worker.ts', import.meta.url));
  } catch {
    useWorker = false;
  }

  if (useWorker && worker) {
    // Worker 기반 처리
    const workerRef = worker;
    let completed = 0;

    const processWithWorker = (image: ImageFile): Promise<void> => {
      return new Promise(async (resolve, reject) => {
        if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }

        try {
          const objectUrl = URL.createObjectURL(image.file);
          const response = await fetch(objectUrl);
          const blob = await response.blob();
          URL.revokeObjectURL(objectUrl);
          const imageBitmap = await createImageBitmap(blob);

          const handler = (e: MessageEvent<WorkerOutput>) => {
            if (e.data.imageId !== image.id) return;
            workerRef.removeEventListener('message', handler);

            if (e.data.type === 'result') {
              results.set(image.id, {
                imageId: image.id,
                blurScore: e.data.blurScore,
                isBlurry: e.data.isBlurry,
                meanBrightness: e.data.meanBrightness,
                brightnessStdDev: e.data.brightnessStdDev,
                lightingIssue: e.data.lightingIssue,
              });
            }
            completed++;
            onProgress(completed, image.fileName);
            resolve();
          };

          workerRef.addEventListener('message', handler);

          const msg: WorkerInput = {
            type: 'analyze',
            imageId: image.id,
            fileName: image.fileName,
            imageBitmap,
            thresholds,
          };

          workerRef.postMessage(msg, [imageBitmap]);
        } catch (err) {
          completed++;
          onProgress(completed, image.fileName);
          resolve(); // 개별 이미지 실패 시 건너뜀
        }
      });
    };

    // 4개씩 동시 처리
    const concurrency = 4;
    for (let i = 0; i < images.length; i += concurrency) {
      if (signal.aborted) break;
      const batch = images.slice(i, i + concurrency);
      await Promise.all(batch.map(img => processWithWorker(img)));
    }

    workerRef.terminate();
  } else {
    // Worker 미지원 시 메인 스레드 fallback
    const { getResizedImageData } = await import('./blur-detection');
    const { analyzeLighting } = await import('./lighting-detection');
    const { calculateBlurScore } = await import('./blur-detection');

    let completed = 0;
    for (const image of images) {
      if (signal.aborted) break;

      try {
        const objectUrl = URL.createObjectURL(image.file);
        const img = new window.Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = objectUrl;
        });

        const imageData = getResizedImageData(img, 400);
        const blurScore = calculateBlurScore(imageData);
        const lighting = analyzeLighting(imageData, thresholds);
        URL.revokeObjectURL(objectUrl);

        results.set(image.id, {
          imageId: image.id,
          blurScore,
          isBlurry: blurScore < thresholds.blurVarianceMin,
          meanBrightness: lighting.meanBrightness,
          brightnessStdDev: lighting.stdDev,
          lightingIssue: lighting.issue,
        });
      } catch {
        // 개별 이미지 실패 시 건너뜀
      }

      completed++;
      onProgress(completed, image.fileName);

      // UI 반응성을 위해 yield
      if (completed % 5 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }
  }

  return results;
}

/**
 * Phase 2: 메인 스레드에서 MediaPipe 눈감음 감지
 */
async function runPhase2(
  images: ImageFile[],
  phase1Results: Map<string, Phase1Result>,
  thresholds: AnalysisThresholds,
  onProgress: (completed: number, current: string) => void,
  onResult: ResultCallback,
  signal: AbortSignal,
): Promise<void> {
  // MediaPipe 모델 미리 로드
  await initFaceLandmarker();

  let completed = 0;

  for (const image of images) {
    if (signal.aborted) break;

    const p1 = phase1Results.get(image.id);

    try {
      // 이미지 로드
      const objectUrl = URL.createObjectURL(image.file);
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = objectUrl;
      });

      // 눈감음 감지
      const eyeResult = await detectEyesClosed(img, thresholds.earThreshold);
      URL.revokeObjectURL(objectUrl);

      // 최종 결과 조합
      const issues: IssueType[] = [];
      if (p1?.isBlurry) issues.push('blurry');
      if (p1?.lightingIssue !== 'ok') issues.push('poor_lighting');
      if (eyeResult.eyesClosed) issues.push('eyes_closed');

      const result: AnalysisResult = {
        imageId: image.id,
        fileName: image.fileName,
        thumbnailUrl: image.thumbnailUrl,
        issues,
        blurScore: p1?.blurScore ?? 0,
        isBlurry: p1?.isBlurry ?? false,
        meanBrightness: p1?.meanBrightness ?? 128,
        brightnessStdDev: p1?.brightnessStdDev ?? 50,
        lightingIssue: (p1?.lightingIssue as AnalysisResult['lightingIssue']) ?? 'ok',
        facesDetected: eyeResult.facesDetected,
        eyesClosed: eyeResult.eyesClosed,
        eyeAspectRatios: eyeResult.eyeAspectRatios,
      };

      onResult(result);
    } catch {
      // 실패 시 Phase1 결과만으로 결과 생성
      const issues: IssueType[] = [];
      if (p1?.isBlurry) issues.push('blurry');
      if (p1?.lightingIssue !== 'ok') issues.push('poor_lighting');

      onResult({
        imageId: image.id,
        fileName: image.fileName,
        thumbnailUrl: image.thumbnailUrl,
        issues,
        blurScore: p1?.blurScore ?? 0,
        isBlurry: p1?.isBlurry ?? false,
        meanBrightness: p1?.meanBrightness ?? 128,
        brightnessStdDev: p1?.brightnessStdDev ?? 50,
        lightingIssue: (p1?.lightingIssue as AnalysisResult['lightingIssue']) ?? 'ok',
        facesDetected: 0,
        eyesClosed: false,
        eyeAspectRatios: [],
      });
    }

    completed++;
    onProgress(completed, image.fileName);

    // 5장마다 UI yield
    if (completed % 5 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }
}

/**
 * 전체 분석 파이프라인 실행
 */
export async function runAnalysisPipeline(options: PipelineOptions): Promise<void> {
  const { images, thresholds, onProgress, onResult, signal } = options;
  const total = images.length;

  // Phase 1: 블러 + 조도
  onProgress('blur_lighting', 0, total, '');
  const phase1Results = await runPhase1(
    images,
    thresholds,
    (completed, current) => onProgress('blur_lighting', completed, total, current),
    signal,
  );

  if (signal.aborted) return;

  // Phase 2: 눈감음 감지
  onProgress('face_detection', 0, total, '');
  await runPhase2(
    images,
    phase1Results,
    thresholds,
    (completed, current) => onProgress('face_detection', completed, total, current),
    onResult,
    signal,
  );

  // 리소스 정리
  disposeFaceLandmarker();
}
