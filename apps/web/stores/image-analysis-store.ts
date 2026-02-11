import { create } from 'zustand';
import type {
  ImageFile,
  AnalysisResult,
  AnalysisStatus,
  AnalysisThresholds,
  AnalysisProgress,
  IssueType,
} from '@/lib/image-analysis/types';
import { DEFAULT_THRESHOLDS } from '@/lib/image-analysis/types';

interface ImageAnalysisState {
  images: ImageFile[];
  results: Map<string, AnalysisResult>;
  status: AnalysisStatus;
  progress: AnalysisProgress;
  thresholds: AnalysisThresholds;
  activeFilter: IssueType | 'all';
  loadProgress: { loaded: number; total: number };

  addImages: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  clearAll: () => void;
  setThresholds: (t: Partial<AnalysisThresholds>) => void;
  setFilter: (filter: IssueType | 'all') => void;
  setStatus: (status: AnalysisStatus) => void;
  setProgress: (progress: Partial<AnalysisProgress>) => void;
  addResult: (result: AnalysisResult) => void;
  recalculateIssues: () => void;
}

// Object URL 기반 썸네일 생성 (data URL 대비 메모리 절약)
function generateThumbnail(file: File): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const maxSize = 150;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxSize || h > maxSize) {
        const scale = maxSize / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      // Blob 기반 Object URL 사용 (data URL 대비 ~40% 메모리 절감)
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) {
            const thumbUrl = URL.createObjectURL(blob);
            resolve({ url: thumbUrl, width: img.naturalWidth, height: img.naturalHeight });
          } else {
            reject(new Error('toBlob failed'));
          }
        },
        'image/jpeg',
        0.6,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load: ${file.name}`));
    };
    img.src = objectUrl;
  });
}

export const useImageAnalysisStore = create<ImageAnalysisState>((set, get) => ({
  images: [],
  results: new Map(),
  status: 'idle',
  progress: { total: 0, completed: 0, current: '', phase: 'blur_lighting' },
  thresholds: { ...DEFAULT_THRESHOLDS },
  activeFilter: 'all',
  loadProgress: { loaded: 0, total: 0 },

  addImages: async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    set({ loadProgress: { loaded: 0, total: imageFiles.length } });

    // 배치 처리: 8개씩 동시 썸네일 생성
    const batchSize = 8;
    const allProcessed: ImageFile[] = [];

    for (let i = 0; i < imageFiles.length; i += batchSize) {
      const batch = imageFiles.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (file) => {
          const { url, width, height } = await generateThumbnail(file);
          return {
            id: crypto.randomUUID(),
            file,
            fileName: file.name,
            fileSize: file.size,
            thumbnailUrl: url,
            width,
            height,
          } satisfies ImageFile;
        }),
      );

      const succeeded = results
        .filter((r): r is PromiseFulfilledResult<ImageFile> => r.status === 'fulfilled')
        .map(r => r.value);

      allProcessed.push(...succeeded);

      // 배치마다 state 업데이트 (UI 반응성)
      set(state => ({
        images: [...state.images, ...succeeded],
        loadProgress: { loaded: allProcessed.length, total: imageFiles.length },
      }));

      // UI yield
      await new Promise(r => setTimeout(r, 0));
    }
  },

  removeImage: (id: string) => {
    set(state => {
      const img = state.images.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.thumbnailUrl);
      const newResults = new Map(state.results);
      newResults.delete(id);
      return {
        images: state.images.filter(i => i.id !== id),
        results: newResults,
      };
    });
  },

  clearAll: () => {
    const { images } = get();
    // Object URL 해제
    for (const img of images) {
      URL.revokeObjectURL(img.thumbnailUrl);
    }
    set({
      images: [],
      results: new Map(),
      status: 'idle',
      progress: { total: 0, completed: 0, current: '', phase: 'blur_lighting' },
      loadProgress: { loaded: 0, total: 0 },
    });
  },

  setThresholds: (t: Partial<AnalysisThresholds>) => {
    set(state => ({ thresholds: { ...state.thresholds, ...t } }));
  },

  setFilter: (filter: IssueType | 'all') => set({ activeFilter: filter }),
  setStatus: (status: AnalysisStatus) => set({ status }),

  setProgress: (progress: Partial<AnalysisProgress>) => {
    set(state => ({ progress: { ...state.progress, ...progress } }));
  },

  addResult: (result: AnalysisResult) => {
    set(state => {
      const newResults = new Map(state.results);
      newResults.set(result.imageId, result);
      return { results: newResults };
    });
  },

  recalculateIssues: () => {
    const { results, thresholds } = get();
    const newResults = new Map<string, AnalysisResult>();
    results.forEach((result, id) => {
      const issues: IssueType[] = [];
      const isBlurry = result.blurScore < thresholds.blurVarianceMin;
      if (isBlurry) issues.push('blurry');

      let lightingIssue = result.lightingIssue;
      if (result.meanBrightness < thresholds.brightnessDarkMax) {
        lightingIssue = 'too_dark';
        issues.push('poor_lighting');
      } else if (result.meanBrightness > thresholds.brightnessBrightMin) {
        lightingIssue = 'too_bright';
        issues.push('poor_lighting');
      } else if (result.brightnessStdDev < thresholds.brightnessStdDevMin) {
        lightingIssue = 'uneven';
        issues.push('poor_lighting');
      } else {
        lightingIssue = 'ok';
      }

      const eyesClosed = result.eyeAspectRatios.some(
        ear => ear.left < thresholds.earThreshold || ear.right < thresholds.earThreshold
      );
      if (eyesClosed) issues.push('eyes_closed');

      const negativeExpression = (result.negativeExpressionScores ?? []).some(
        score => score >= thresholds.negativeExpressionThreshold
      );
      if (negativeExpression) issues.push('negative_expression');

      const mouthOpen = (result.mouthOpenScores ?? []).some(
        score => score >= thresholds.mouthOpenThreshold
      );
      if (mouthOpen) issues.push('mouth_open');

      const gazeAway = (result.gazeDeviationScores ?? []).some(
        d => d.horizontal >= thresholds.gazeDeviationThreshold || d.vertical >= thresholds.gazeDeviationThreshold
      );
      if (gazeAway) issues.push('gaze_away');

      newResults.set(id, { ...result, issues, isBlurry, lightingIssue, eyesClosed, negativeExpression, mouthOpen, gazeAway });
    });
    set({ results: newResults });
  },
}));
