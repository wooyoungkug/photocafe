/**
 * MediaPipe FaceLandmarker 기반 눈감음 감지
 * EAR (Eye Aspect Ratio) 계산으로 눈감김 판별
 */

import type { FaceLandmarker } from '@mediapipe/tasks-vision';

let faceLandmarkerInstance: FaceLandmarker | null = null;
let initPromise: Promise<FaceLandmarker> | null = null;

// 눈 랜드마크 인덱스 (468 랜드마크 기준)
const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];

/**
 * FaceLandmarker 초기화 (lazy, singleton)
 */
export async function initFaceLandmarker(): Promise<FaceLandmarker> {
  if (faceLandmarkerInstance) return faceLandmarkerInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
    );

    faceLandmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      numFaces: 5,
      outputFacialTransformationMatrixes: false,
      outputFaceBlendshapes: false,
    });

    return faceLandmarkerInstance;
  })();

  return initPromise;
}

/**
 * EAR (Eye Aspect Ratio) 계산
 * EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 */
function calculateEAR(
  landmarks: { x: number; y: number; z: number }[],
  indices: number[],
): number {
  const p1 = landmarks[indices[0]]; // 외측 코너
  const p2 = landmarks[indices[1]]; // 상단 외측
  const p3 = landmarks[indices[2]]; // 상단 내측
  const p4 = landmarks[indices[3]]; // 내측 코너
  const p5 = landmarks[indices[4]]; // 하단 내측
  const p6 = landmarks[indices[5]]; // 하단 외측

  const verticalA = Math.sqrt((p2.x - p6.x) ** 2 + (p2.y - p6.y) ** 2);
  const verticalB = Math.sqrt((p3.x - p5.x) ** 2 + (p3.y - p5.y) ** 2);
  const horizontal = Math.sqrt((p1.x - p4.x) ** 2 + (p1.y - p4.y) ** 2);

  if (horizontal === 0) return 0;
  return (verticalA + verticalB) / (2 * horizontal);
}

export interface EyeDetectionResult {
  facesDetected: number;
  eyesClosed: boolean;
  eyeAspectRatios: { left: number; right: number }[];
}

/**
 * 이미지에서 눈감음 감지
 */
export async function detectEyesClosed(
  imageElement: HTMLImageElement,
  threshold: number = 0.2,
): Promise<EyeDetectionResult> {
  const faceLandmarker = await initFaceLandmarker();
  const result = faceLandmarker.detect(imageElement);

  const eyeAspectRatios: { left: number; right: number }[] = [];
  let anyEyesClosed = false;

  for (const face of result.faceLandmarks) {
    const leftEAR = calculateEAR(face, LEFT_EYE_INDICES);
    const rightEAR = calculateEAR(face, RIGHT_EYE_INDICES);
    eyeAspectRatios.push({ left: leftEAR, right: rightEAR });

    if (leftEAR < threshold || rightEAR < threshold) {
      anyEyesClosed = true;
    }
  }

  return {
    facesDetected: result.faceLandmarks.length,
    eyesClosed: anyEyesClosed,
    eyeAspectRatios,
  };
}

/**
 * FaceLandmarker 리소스 해제
 */
export function disposeFaceLandmarker() {
  if (faceLandmarkerInstance) {
    faceLandmarkerInstance.close();
    faceLandmarkerInstance = null;
    initPromise = null;
  }
}
