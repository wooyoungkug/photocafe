/**
 * MediaPipe FaceLandmarker 기반 얼굴 분석
 * - EAR (Eye Aspect Ratio) 계산으로 눈감김 판별
 * - Blendshapes로 찡그림/입벌림 감지
 * - 홍채 랜드마크로 시선 이탈 감지
 */

import type { FaceLandmarker, Classifications, NormalizedLandmark } from '@mediapipe/tasks-vision';

let faceLandmarkerInstance: FaceLandmarker | null = null;
let initPromise: Promise<FaceLandmarker> | null = null;

// 눈 랜드마크 인덱스 (468 랜드마크 기준)
const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];

// 홍채 및 눈 코너 랜드마크
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
const LEFT_EYE_INNER_CORNER = 133;
const LEFT_EYE_OUTER_CORNER = 33;
const RIGHT_EYE_INNER_CORNER = 362;
const RIGHT_EYE_OUTER_CORNER = 263;

// 찡그린 표정 관련 blendshape 이름
const NEGATIVE_EXPRESSION_BLENDSHAPES = [
  'browDownLeft',
  'browDownRight',
  'noseSneerLeft',
  'noseSneerRight',
  'mouthFrownLeft',
  'mouthFrownRight',
];

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
      outputFaceBlendshapes: true,
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

/**
 * Blendshape에서 특정 카테고리 점수 추출
 */
function getBlendshapeScore(blendshapes: Classifications, name: string): number {
  const category = blendshapes.categories.find(c => c.categoryName === name);
  return category?.score ?? 0;
}

/**
 * 홍채 중심의 눈 프레임 대비 편차 계산
 * 반환값: 0 = 정중앙, 0.5 = 눈 가장자리
 */
function calculateIrisDeviation(
  landmarks: NormalizedLandmark[],
  irisCenterIdx: number,
  innerCornerIdx: number,
  outerCornerIdx: number,
): { horizontal: number; vertical: number } {
  const iris = landmarks[irisCenterIdx];
  const inner = landmarks[innerCornerIdx];
  const outer = landmarks[outerCornerIdx];

  const eyeCenterX = (inner.x + outer.x) / 2;
  const eyeCenterY = (inner.y + outer.y) / 2;
  const eyeWidth = Math.sqrt((inner.x - outer.x) ** 2 + (inner.y - outer.y) ** 2);

  if (eyeWidth === 0) return { horizontal: 0, vertical: 0 };

  return {
    horizontal: Math.abs(iris.x - eyeCenterX) / eyeWidth,
    vertical: Math.abs(iris.y - eyeCenterY) / eyeWidth,
  };
}

// ── 감지 결과 타입 ──

export interface NegativeExpressionResult {
  hasNegativeExpression: boolean;
  compositeScore: number;
  perFaceScores: number[];
}

export interface MouthOpenResult {
  isMouthOpen: boolean;
  maxScore: number;
  perFaceScores: number[];
}

export interface GazeResult {
  isLookingAway: boolean;
  maxDeviation: number;
  perFaceDeviations: { horizontal: number; vertical: number }[];
}

export interface FaceAnalysisResult {
  facesDetected: number;
  eyesClosed: boolean;
  eyeAspectRatios: { left: number; right: number }[];
  negativeExpression: NegativeExpressionResult;
  mouthOpen: MouthOpenResult;
  gazeAway: GazeResult;
}

export interface FaceDetectionThresholds {
  earThreshold: number;
  negativeExpressionThreshold: number;
  mouthOpenThreshold: number;
  gazeDeviationThreshold: number;
}

// ── 개별 감지 함수 ──

function detectNegativeExpression(
  faceBlendshapes: Classifications[],
  threshold: number,
): NegativeExpressionResult {
  const perFaceScores: number[] = [];
  let hasNegativeExpression = false;

  for (const blendshapes of faceBlendshapes) {
    let sum = 0;
    for (const name of NEGATIVE_EXPRESSION_BLENDSHAPES) {
      sum += getBlendshapeScore(blendshapes, name);
    }
    const composite = sum / NEGATIVE_EXPRESSION_BLENDSHAPES.length;
    perFaceScores.push(composite);

    if (composite >= threshold) {
      hasNegativeExpression = true;
    }
  }

  return {
    hasNegativeExpression,
    compositeScore: perFaceScores.length > 0 ? Math.max(...perFaceScores) : 0,
    perFaceScores,
  };
}

function detectMouthOpen(
  faceBlendshapes: Classifications[],
  threshold: number,
): MouthOpenResult {
  const perFaceScores: number[] = [];
  let isMouthOpen = false;

  for (const blendshapes of faceBlendshapes) {
    const jawOpenScore = getBlendshapeScore(blendshapes, 'jawOpen');
    perFaceScores.push(jawOpenScore);

    if (jawOpenScore >= threshold) {
      isMouthOpen = true;
    }
  }

  return {
    isMouthOpen,
    maxScore: perFaceScores.length > 0 ? Math.max(...perFaceScores) : 0,
    perFaceScores,
  };
}

function detectGazeDirection(
  faceLandmarks: NormalizedLandmark[][],
  threshold: number,
): GazeResult {
  const perFaceDeviations: { horizontal: number; vertical: number }[] = [];
  let isLookingAway = false;

  for (const landmarks of faceLandmarks) {
    // 478 미만이면 홍채 랜드마크 없음
    if (landmarks.length < 478) {
      perFaceDeviations.push({ horizontal: 0, vertical: 0 });
      continue;
    }

    const leftDev = calculateIrisDeviation(
      landmarks, LEFT_IRIS_CENTER, LEFT_EYE_INNER_CORNER, LEFT_EYE_OUTER_CORNER,
    );
    const rightDev = calculateIrisDeviation(
      landmarks, RIGHT_IRIS_CENTER, RIGHT_EYE_INNER_CORNER, RIGHT_EYE_OUTER_CORNER,
    );

    const horizontal = (Math.abs(leftDev.horizontal) + Math.abs(rightDev.horizontal)) / 2;
    const vertical = (Math.abs(leftDev.vertical) + Math.abs(rightDev.vertical)) / 2;

    perFaceDeviations.push({ horizontal, vertical });

    if (horizontal >= threshold || vertical >= threshold) {
      isLookingAway = true;
    }
  }

  return {
    isLookingAway,
    maxDeviation: perFaceDeviations.length > 0
      ? Math.max(...perFaceDeviations.map(d => Math.max(d.horizontal, d.vertical)))
      : 0,
    perFaceDeviations,
  };
}

// ── 메인 감지 함수 ──

/**
 * 이미지에서 얼굴 문제 종합 감지
 * - 눈감음 (EAR)
 * - 찡그린 표정 (blendshapes)
 * - 입벌림 (jawOpen blendshape)
 * - 시선 이탈 (홍채 위치)
 */
export async function detectFaceIssues(
  imageElement: HTMLImageElement,
  thresholds: FaceDetectionThresholds,
): Promise<FaceAnalysisResult> {
  const faceLandmarker = await initFaceLandmarker();
  const result = faceLandmarker.detect(imageElement);

  // EAR 계산 (기존 눈감음 감지)
  const eyeAspectRatios: { left: number; right: number }[] = [];
  let anyEyesClosed = false;

  for (const face of result.faceLandmarks) {
    const leftEAR = calculateEAR(face, LEFT_EYE_INDICES);
    const rightEAR = calculateEAR(face, RIGHT_EYE_INDICES);
    eyeAspectRatios.push({ left: leftEAR, right: rightEAR });

    if (leftEAR < thresholds.earThreshold || rightEAR < thresholds.earThreshold) {
      anyEyesClosed = true;
    }
  }

  // 찡그린 표정 감지
  const negativeExpression = detectNegativeExpression(
    result.faceBlendshapes ?? [],
    thresholds.negativeExpressionThreshold,
  );

  // 입벌림 감지
  const mouthOpen = detectMouthOpen(
    result.faceBlendshapes ?? [],
    thresholds.mouthOpenThreshold,
  );

  // 시선 이탈 감지
  const gazeAway = detectGazeDirection(
    result.faceLandmarks,
    thresholds.gazeDeviationThreshold,
  );

  return {
    facesDetected: result.faceLandmarks.length,
    eyesClosed: anyEyesClosed,
    eyeAspectRatios,
    negativeExpression,
    mouthOpen,
    gazeAway,
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
