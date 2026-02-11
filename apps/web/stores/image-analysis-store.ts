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

function generateThumbnail(file: File): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const maxSize = 200;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxSize || h > maxSize) {
        const scale = maxSize / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(objectUrl);
      resolve({ url: thumbnailUrl, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}`));
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

  addImages: async (files: File[]) => {
    const imageFiles: ImageFile[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const { url, width, height } = await generateThumbnail(file);
        imageFiles.push({
          id: crypto.randomUUID(),
          file,
          fileName: file.name,
          fileSize: file.size,
          thumbnailUrl: url,
          width,
          height,
        });
      } catch {
        // Skip files that can't be loaded as images
      }
    }
    set(state => ({ images: [...state.images, ...imageFiles] }));
  },

  removeImage: (id: string) => {
    set(state => {
      const newResults = new Map(state.results);
      newResults.delete(id);
      return {
        images: state.images.filter(img => img.id !== id),
        results: newResults,
      };
    });
  },

  clearAll: () => {
    set({
      images: [],
      results: new Map(),
      status: 'idle',
      progress: { total: 0, completed: 0, current: '', phase: 'blur_lighting' },
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

      newResults.set(id, { ...result, issues, isBlurry, lightingIssue, eyesClosed });
    });
    set({ results: newResults });
  },
}));
