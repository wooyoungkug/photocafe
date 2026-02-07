'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Folder,
  FileImage,
  Upload,
  Loader2,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import {
  useMultiFolderUploadStore,
  type UploadedFolder,
  type UploadedFile,
  type PageLayoutType,
  type BindingDirection,
  type CoverType,
  type SplitCoverResult,
  type StandardSize,
  getSpecLabel,
  detectCoverType,
  calculateAlbumSize,
  generateSequentialFileName, // Added import
  sortPagesByPosition,
  findClosestStandardSize,
  calculatePageCount,
  calculateTotalUploadedPrice,
  autoDetectPageLayout,
} from '@/stores/multi-folder-upload-store';
import { useIndigoSpecifications } from '@/hooks/use-specifications';
import { toast } from '@/hooks/use-toast';

// 편집스타일 아이콘 컴포넌트
function PageLayoutIcon({ type, isSelected }: { type: 'single' | 'spread'; isSelected: boolean }) {
  const baseClass = 'w-14 h-11 border-2 rounded transition-all flex items-center justify-center';
  const selectedClass = isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400';

  if (type === 'single') {
    return (
      <div className={cn(baseClass, selectedClass)}>
        <div className="w-6 h-8 border border-gray-400 bg-white" />
      </div>
    );
  }
  // spread
  return (
    <div className={cn(baseClass, selectedClass)}>
      <div className="flex">
        <div className="w-5 h-8 border border-gray-400 bg-white border-r-0" />
        <div className="w-5 h-8 border border-gray-400 bg-white" />
      </div>
    </div>
  );
}

// 제본 방향 아이콘 컴포넌트
function BindingDirectionIcon({ direction, isSelected }: { direction: BindingDirection; isSelected: boolean }) {
  const baseClass = 'w-[72px] h-10 border-2 rounded transition-all p-1';
  const selectedClass = isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400';

  // 페이지 색상: 첫페이지(시작), 마지막페이지(끝)
  const getPageColors = () => {
    switch (direction) {
      case 'LEFT_START_RIGHT_END':
        return { leftFirst: true, rightFirst: false, leftLast: false, rightLast: true };
      case 'LEFT_START_LEFT_END':
        return { leftFirst: true, rightFirst: false, leftLast: true, rightLast: false };
      case 'RIGHT_START_LEFT_END':
        return { leftFirst: false, rightFirst: true, leftLast: true, rightLast: false };
      case 'RIGHT_START_RIGHT_END':
        return { leftFirst: false, rightFirst: true, leftLast: false, rightLast: true };
    }
  };

  const colors = getPageColors();

  return (
    <div className={cn(baseClass, selectedClass)}>
      <div className="flex justify-center gap-0.5 h-full">
        {/* 왼쪽 페이지 그룹 */}
        <div className="flex gap-px">
          <div className={cn(
            'w-4 h-full rounded-sm border',
            colors.leftFirst ? 'bg-blue-500 border-blue-600' : colors.leftLast ? 'bg-purple-500 border-purple-600' : 'bg-gray-100 border-gray-300'
          )} />
          <div className="w-3 h-full rounded-sm bg-gray-100 border border-gray-300" />
        </div>
        {/* 중앙 구분선 */}
        <div className="w-px h-full bg-gray-400 mx-1" />
        {/* 오른쪽 페이지 그룹 */}
        <div className="flex gap-px">
          <div className="w-3 h-full rounded-sm bg-gray-100 border border-gray-300" />
          <div className={cn(
            'w-4 h-full rounded-sm border',
            colors.rightFirst ? 'bg-blue-500 border-blue-600' : colors.rightLast ? 'bg-purple-500 border-purple-600' : 'bg-gray-100 border-gray-300'
          )} />
        </div>
      </div>
    </div>
  );
}
import { FolderCard } from './folder-card';
import { calculateNormalizedRatio, formatFileSize, readImageDpi } from '@/lib/album-utils';
import { useShippingData } from '@/hooks/use-shipping-data';
import { FolderShippingSection } from './folder-shipping-section';
import type { FolderShippingInfo } from '@/stores/multi-folder-upload-store';

const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tif', '.tiff'];
const MAX_DEPTH = 4;

interface MultiFolderUploadProps {
  onAddToCart?: (folders: UploadedFolder[]) => void;
}

export function MultiFolderUpload({ onAddToCart }: MultiFolderUploadProps) {
  const {
    folders,
    isUploading,
    uploadProgress,
    defaultPageLayout,
    defaultBindingDirection,
    indigoSpecs,
    addFolder,
    clearFolders,
    setUploading,
    setUploadProgress,
    setDefaultPageLayout,
    setDefaultBindingDirection,
    setIndigoSpecs,
    getSelectedFolders,
    applyShippingToAll,
  } = useMultiFolderUploadStore();

  const tc = useTranslations('common');
  const tu = useTranslations('upload');
  const tf = useTranslations('folder');

  // 배송 데이터 로드
  const { companyInfo, clientInfo, pricingMap } = useShippingData();

  // DB에서 인디고출력 규격 가져오기
  const { data: indigoSpecsRaw } = useIndigoSpecifications();

  // 인디고 규격을 StandardSize 형태로 변환하여 스토어에 저장
  useEffect(() => {
    if (indigoSpecsRaw && indigoSpecsRaw.length > 0) {
      const converted: StandardSize[] = indigoSpecsRaw.map(spec => ({
        width: Number(spec.widthInch),
        height: Number(spec.heightInch),
        label: `${spec.widthInch}×${spec.heightInch}인치`,
        ratio: Number(spec.widthInch) / Number(spec.heightInch),
      }));
      setIndigoSpecs(converted);
    }
  }, [indigoSpecsRaw, setIndigoSpecs]);

  const [isDragging, setIsDragging] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [showBatchShipping, setShowBatchShipping] = useState(false);
  const [batchShippingInfo, setBatchShippingInfo] = useState<FolderShippingInfo | null>(null);

  // 모바일 감지 (Android/iOS에서 webkitdirectory 미지원)
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFolderNameDialog, setShowMobileFolderNameDialog] = useState(false);
  const [mobileFolderName, setMobileFolderName] = useState('');
  const [pendingMobileFiles, setPendingMobileFiles] = useState<File[]>([]);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  // 빈페이지 감지 (먹색/백색 판별)
  // region: 'full'=전체, 'left'=왼쪽반, 'right'=오른쪽반
  // 펼침면에서 첫장은 왼쪽반만 검사, 막장은 오른쪽반만 검사
  // "." 한 글자라도 있으면 페이지로 인식
  const detectBlankPage = useCallback(
    async (source: HTMLImageElement | File | string, region: 'full' | 'left' | 'right' = 'full'): Promise<boolean> => {
      return new Promise((resolve) => {
        const analyze = (img: HTMLImageElement) => {
          const SAMPLE_SIZE = 200;
          const canvas = document.createElement('canvas');
          canvas.width = SAMPLE_SIZE;
          canvas.height = SAMPLE_SIZE;
          const ctx = canvas.getContext('2d')!;

          // 영역에 따라 소스 이미지의 해당 부분만 캔버스에 그림
          const srcW = img.naturalWidth;
          const srcH = img.naturalHeight;

          if (region === 'left') {
            // 왼쪽 반만 추출하여 캔버스에 그림
            ctx.drawImage(img, 0, 0, srcW / 2, srcH, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
          } else if (region === 'right') {
            // 오른쪽 반만 추출하여 캔버스에 그림
            ctx.drawImage(img, srcW / 2, 0, srcW / 2, srcH, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
          } else {
            // 전체 이미지
            ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
          }

          const imageData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
          const data = imageData.data; // RGBA

          // 밝기(brightness) 기반 판단 - JPEG 압축 아티팩트에 강건
          const DARK_BRIGHTNESS = 40;    // 밝기 이 값 이하면 검정
          const LIGHT_BRIGHTNESS = 215;  // 밝기 이 값 이상이면 흰색
          const BLANK_RATIO = 0.93;      // 93% 이상이 단색이면 빈페이지

          const totalPixels = SAMPLE_SIZE * SAMPLE_SIZE;
          let darkCount = 0;
          let lightCount = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // 밝기 = (R + G + B) / 3
            const brightness = (r + g + b) / 3;

            if (brightness <= DARK_BRIGHTNESS) {
              darkCount++;
            } else if (brightness >= LIGHT_BRIGHTNESS) {
              lightCount++;
            }
          }

          const darkRatio = darkCount / totalPixels;
          const lightRatio = lightCount / totalPixels;
          resolve(darkRatio >= BLANK_RATIO || lightRatio >= BLANK_RATIO);
        };

        if (source instanceof HTMLImageElement) {
          analyze(source);
        } else if (typeof source === 'string') {
          // Data URL 또는 URL 문자열
          const img = new Image();
          img.onload = () => analyze(img);
          img.onerror = () => resolve(false);
          img.src = source;
        } else {
          // File인 경우 Image로 로드
          const img = new Image();
          const url = URL.createObjectURL(source);
          img.onload = () => {
            URL.revokeObjectURL(url);
            analyze(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(false); // 에러 시 콘텐츠가 있다고 간주
          };
          img.src = url;
        }
      });
    },
    []
  );

  // 첫장/막장 빈페이지 감지에 따른 제본방향 자동 결정
  const autoDetectBindingDirection = useCallback(
    (firstBlank: boolean, lastBlank: boolean): BindingDirection => {
      if (firstBlank && lastBlank) {
        // 첫장 빈 + 막장 빈 → 우시작→좌끝
        return 'RIGHT_START_LEFT_END';
      } else if (firstBlank) {
        // 첫장 빈 → 우시작→우끝
        return 'RIGHT_START_RIGHT_END';
      } else if (lastBlank) {
        // 막장 빈 → 좌시작→좌끝
        return 'LEFT_START_LEFT_END';
      }
      // 둘 다 비어있지 않음 → 기본값 좌시작→우끝
      return 'LEFT_START_RIGHT_END';
    },
    []
  );

  // 썸네일 생성 유틸 (최대 500px, JPEG 80% → ~100KB)
  const generateThumbnail = useCallback((source: HTMLImageElement | HTMLCanvasElement, srcWidth: number, srcHeight: number): string => {
    const MAX_THUMB = 500;
    const scale = Math.min(MAX_THUMB / srcWidth, MAX_THUMB / srcHeight, 1);
    const tw = Math.round(srcWidth * scale);
    const th = Math.round(srcHeight * scale);
    const c = document.createElement('canvas');
    c.width = tw;
    c.height = th;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(source, 0, 0, tw, th);
    return c.toDataURL('image/jpeg', 0.8);
  }, []);

  // 파일 치수 프로브 (자동감지용 - 내지 파일의 가로/세로 인치 측정)
  const probeFileDimensions = useCallback(
    async (files: File[]): Promise<{ widthInch: number; heightInch: number } | null> => {
      if (files.length === 0) return null;

      // 표지가 아닌 내지 파일 우선 (표지는 반폭/합본 가능성)
      const innerFiles = files.filter(f => detectCoverType(f.name) === 'INNER_PAGE');
      const candidates = innerFiles.length > 0 ? innerFiles : files;

      for (let i = 0; i < Math.min(3, candidates.length); i++) {
        try {
          const dpi = await readImageDpi(candidates[i]);
          const dims = await new Promise<{ widthInch: number; heightInch: number } | null>((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(candidates[i]);
            img.onload = () => {
              URL.revokeObjectURL(url);
              resolve({
                widthInch: Math.round((img.naturalWidth / dpi) * 10) / 10,
                heightInch: Math.round((img.naturalHeight / dpi) * 10) / 10,
              });
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              resolve(null);
            };
            img.src = url;
          });
          if (dims) return dims;
        } catch {
          continue;
        }
      }
      return null;
    },
    []
  );

  // 첫막장 합본 분리 함수 (Canvas 기반)
  const splitCombinedCover = useCallback(
    async (
      file: File,
      widthPx: number,
      heightPx: number,
      dpi: number,
      folderPath: string
    ): Promise<{ frontCover: UploadedFile; backCover: UploadedFile }> => {
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);

          const halfWidth = Math.floor(widthPx / 2);

          // 왼쪽 반 추출
          const leftCanvas = document.createElement('canvas');
          leftCanvas.width = halfWidth;
          leftCanvas.height = heightPx;
          const leftCtx = leftCanvas.getContext('2d')!;
          leftCtx.drawImage(img, 0, 0, halfWidth, heightPx, 0, 0, halfWidth, heightPx);

          // 오른쪽 반 추출
          const rightCanvas = document.createElement('canvas');
          rightCanvas.width = widthPx - halfWidth;
          rightCanvas.height = heightPx;
          const rightCtx = rightCanvas.getContext('2d')!;
          rightCtx.drawImage(img, halfWidth, 0, widthPx - halfWidth, heightPx, 0, 0, widthPx - halfWidth, heightPx);

          // 빈 페이지 생성
          const blankCanvas = document.createElement('canvas');
          blankCanvas.width = halfWidth;
          blankCanvas.height = heightPx;
          const blankCtx = blankCanvas.getContext('2d')!;
          blankCtx.fillStyle = '#FFFFFF';
          blankCtx.fillRect(0, 0, halfWidth, heightPx);

          // 첫장 생성: [빈 페이지 | 왼쪽 반]
          const frontCanvas = document.createElement('canvas');
          frontCanvas.width = widthPx;
          frontCanvas.height = heightPx;
          const frontCtx = frontCanvas.getContext('2d')!;
          frontCtx.drawImage(blankCanvas, 0, 0);
          frontCtx.drawImage(leftCanvas, halfWidth, 0);

          // 막장 생성: [오른쪽 반 | 빈 페이지]
          const backCanvas = document.createElement('canvas');
          backCanvas.width = widthPx;
          backCanvas.height = heightPx;
          const backCtx = backCanvas.getContext('2d')!;
          backCtx.drawImage(rightCanvas, 0, 0);
          backCtx.drawImage(blankCanvas, widthPx - halfWidth, 0);

          const widthInch = Math.round((widthPx / dpi) * 10) / 10;
          const heightInch = Math.round((heightPx / dpi) * 10) / 10;
          const ratio = calculateNormalizedRatio(widthInch, heightInch);

          const baseId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          const frontCover: UploadedFile = {
            id: `${baseId}-front`,
            fileName: `${file.name.replace(/\.[^.]+$/, '')}_첫장.jpg`,
            filePath: folderPath,
            fileSize: file.size / 2,
            pageNumber: 1, // 맨 앞
            widthPx,
            heightPx,
            dpi,
            widthInch,
            heightInch,
            ratio,
            coverType: 'FRONT_COVER',
            isSplit: true,
            splitFrom: file.name,
            splitSide: 'left',
            canvasDataUrl: frontCanvas.toDataURL('image/jpeg', 0.95),
            thumbnailUrl: generateThumbnail(frontCanvas, widthPx, heightPx),
            status: 'PENDING',
          };

          const backCover: UploadedFile = {
            id: `${baseId}-back`,
            fileName: `${file.name.replace(/\.[^.]+$/, '')}_막장.jpg`,
            filePath: folderPath,
            fileSize: file.size / 2,
            pageNumber: 999, // 맨 뒤 (나중에 재정렬)
            widthPx,
            heightPx,
            dpi,
            widthInch,
            heightInch,
            ratio,
            coverType: 'BACK_COVER',
            isSplit: true,
            splitFrom: file.name,
            splitSide: 'right',
            canvasDataUrl: backCanvas.toDataURL('image/jpeg', 0.95),
            thumbnailUrl: generateThumbnail(backCanvas, widthPx, heightPx),
            status: 'PENDING',
          };

          resolve({ frontCover, backCover });
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          // 에러 시 기본 파일 반환
          const widthInch = Math.round((widthPx / dpi) * 10) / 10;
          const heightInch = Math.round((heightPx / dpi) * 10) / 10;
          const baseId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          resolve({
            frontCover: {
              id: `${baseId}-front`,
              file,
              fileName: file.name,
              filePath: folderPath,
              fileSize: file.size,
              pageNumber: 1,
              widthPx,
              heightPx,
              dpi,
              widthInch,
              heightInch,
              ratio: calculateNormalizedRatio(widthInch, heightInch),
              coverType: 'FRONT_COVER',
              status: 'PENDING',
            },
            backCover: {
              id: `${baseId}-back`,
              file,
              fileName: file.name,
              filePath: folderPath,
              fileSize: file.size,
              pageNumber: 999,
              widthPx,
              heightPx,
              dpi,
              widthInch,
              heightInch,
              ratio: calculateNormalizedRatio(widthInch, heightInch),
              coverType: 'BACK_COVER',
              status: 'PENDING',
            },
          });
        };

        img.src = url;
      });
    },
    []
  );

  // 반폭 표지 확장 함수 (Canvas 기반)
  // - 첫장: [빈영역 | 원본이미지] 로 확장
  // - 막장: [원본이미지 | 빈영역] 로 확장
  const extendHalfWidthCover = useCallback(
    async (
      uploadedFile: UploadedFile,
      targetWidthPx: number,  // 확장할 목표 가로 픽셀
      targetWidthInch: number // 확장할 목표 가로 인치
    ): Promise<UploadedFile> => {
      // File 객체가 없으면 메타데이터만 변경
      if (!uploadedFile.file) {
        return {
          ...uploadedFile,
          widthPx: targetWidthPx,
          widthInch: targetWidthInch,
          isExtended: true,
          extendPosition: uploadedFile.coverType === 'FRONT_COVER' ? 'left' : 'right',
          originalWidthPx: uploadedFile.widthPx,
          originalWidthInch: uploadedFile.widthInch,
          status: 'EXACT',
        };
      }

      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(uploadedFile.file!);

        img.onload = () => {
          URL.revokeObjectURL(url);

          const originalWidthPx = uploadedFile.widthPx;
          const heightPx = uploadedFile.heightPx;
          const blankWidthPx = targetWidthPx - originalWidthPx;

          // 빈 페이지 생성 (흰색)
          const blankCanvas = document.createElement('canvas');
          blankCanvas.width = blankWidthPx;
          blankCanvas.height = heightPx;
          const blankCtx = blankCanvas.getContext('2d')!;
          blankCtx.fillStyle = '#FFFFFF';
          blankCtx.fillRect(0, 0, blankWidthPx, heightPx);

          // 확장된 이미지 생성
          const extendedCanvas = document.createElement('canvas');
          extendedCanvas.width = targetWidthPx;
          extendedCanvas.height = heightPx;
          const extendedCtx = extendedCanvas.getContext('2d')!;

          if (uploadedFile.coverType === 'FRONT_COVER') {
            // 첫장: [빈영역 | 원본이미지]
            extendedCtx.drawImage(blankCanvas, 0, 0);
            extendedCtx.drawImage(img, blankWidthPx, 0);
          } else {
            // 막장: [원본이미지 | 빈영역]
            extendedCtx.drawImage(img, 0, 0);
            extendedCtx.drawImage(blankCanvas, originalWidthPx, 0);
          }

          const ratio = calculateNormalizedRatio(targetWidthInch, uploadedFile.heightInch);

          resolve({
            ...uploadedFile,
            widthPx: targetWidthPx,
            widthInch: targetWidthInch,
            ratio,
            isExtended: true,
            extendPosition: uploadedFile.coverType === 'FRONT_COVER' ? 'left' : 'right',
            originalWidthPx: uploadedFile.widthPx,
            originalWidthInch: uploadedFile.widthInch,
            canvasDataUrl: extendedCanvas.toDataURL('image/jpeg', 0.95),
            thumbnailUrl: generateThumbnail(extendedCanvas, targetWidthPx, uploadedFile.heightPx),
            status: 'EXACT',
            message: uploadedFile.coverType === 'FRONT_COVER'
              ? '첫장 확장 (왼쪽 빈영역 추가)'
              : '막장 확장 (오른쪽 빈영역 추가)',
          });
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          // 에러 시 메타데이터만 변경
          resolve({
            ...uploadedFile,
            widthPx: targetWidthPx,
            widthInch: targetWidthInch,
            isExtended: true,
            extendPosition: uploadedFile.coverType === 'FRONT_COVER' ? 'left' : 'right',
            originalWidthPx: uploadedFile.widthPx,
            originalWidthInch: uploadedFile.widthInch,
            status: 'EXACT',
          });
        };

        img.src = url;
      });
    },
    []
  );

  // 반폭 표지 확장 처리 (폴더 내 모든 파일 처리)
  const processHalfWidthCoversWithCanvas = useCallback(
    async (
      files: UploadedFile[],
      pageLayout: PageLayoutType
    ): Promise<UploadedFile[]> => {
      // pageLayout check removed to allow auto-detection correction
      if (files.length === 0) return files;

      // 1. 대표 규격(Dominant Width) 계산 - 가장 많이 등장하는 너비 사용
      // (단순 평균보다 이상치 영향을 덜 받음)
      const widthCounts = new Map<number, { count: number; sumPx: number; sumInch: number; sumHeightPx: number; files: UploadedFile[] }>();

      files.forEach(f => {
        // 100px 단위로 근사하여 그룹화 (미세한 픽셀 차이 무시)
        const approxWidth = Math.round(f.widthPx / 100) * 100;

        if (!widthCounts.has(approxWidth)) {
          widthCounts.set(approxWidth, { count: 0, sumPx: 0, sumInch: 0, sumHeightPx: 0, files: [] });
        }
        const group = widthCounts.get(approxWidth)!;
        group.count++;
        group.sumPx += f.widthPx;
        group.sumInch += f.widthInch;
        group.sumHeightPx += f.heightPx;
        group.files.push(f);
      });

      // 가장 빈도가 높은 그룹 찾기
      let dominantGroup = Array.from(widthCounts.values()).sort((a, b) => b.count - a.count)[0];

      // 만약 내지(INNER_PAGE)가 있는 그룹이 있다면 우선순위 부여
      const innerPageGroup = Array.from(widthCounts.values())
        .filter(g => g.files.some(f => f.coverType === 'INNER_PAGE'))
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return b.sumPx - a.sumPx; // 개수가 같으면 더 넓은 쪽(펼침면) 우선
        })[0];

      if (innerPageGroup) {
        dominantGroup = innerPageGroup;
      } else {
        // 내지가 없으면 전체 중에서 선택
        dominantGroup = Array.from(widthCounts.values()).sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return b.sumPx - a.sumPx; // 개수가 같으면 더 넓은 쪽(펼침면) 우선
        })[0];
      }

      if (!dominantGroup) return files;

      // 대표 규격 평균 계산
      const avgWidthPx = dominantGroup.sumPx / dominantGroup.count;
      const avgWidthInch = dominantGroup.sumInch / dominantGroup.count;
      const avgHeightPx = dominantGroup.sumHeightPx / dominantGroup.count;

      const halfWidthPx = avgWidthPx / 2;

      // 2. 각 파일 처리
      const processedFiles: UploadedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        const isFirst = i === 0; // 숫자가 제일 작은 파일 (파일명 정렬된 상태임)
        const isLast = i === files.length - 1; // 숫자가 제일 큰 파일

        // 반폭인지 확인 (가로가 절반에 가깝고, 세로는 비슷해야 함)
        const isHalfWidth =
          Math.abs(file.widthPx - halfWidthPx) < 100 && // 오차 100px 이내
          Math.abs(file.heightPx - avgHeightPx) < 100;

        let shouldExtend = false;
        let targetCoverType: CoverType | null = null;

        if (isHalfWidth) {
          // 명시적으로 커버타입이 지정된 경우 우선 (위치보다 우선)
          if (file.coverType === 'FRONT_COVER') {
            shouldExtend = true;
            targetCoverType = 'FRONT_COVER';
          } else if (file.coverType === 'BACK_COVER') {
            shouldExtend = true;
            targetCoverType = 'BACK_COVER';
          } else if (isFirst) {
            // 첫장이고 반폭이면 → 첫장(FRONT_COVER)으로 인식하고 왼쪽 빈페이지 추가
            shouldExtend = true;
            targetCoverType = 'FRONT_COVER';
            // 첫장이 반폭이면 우측 페이지 1페이지가 됨 -> 우철 (Right Start)
          } else if (isLast) {
            // 막장이고 반폭이면 → 막장(BACK_COVER)으로 인식하고 오른쪽 빈페이지 추가
            shouldExtend = true;
            targetCoverType = 'BACK_COVER';
          }
        }

        if (shouldExtend && targetCoverType) {
          // 커버 타입 강제 지정 (확장 함수가 coverType을 보고 방향을 결정함)
          const fileToExtend = { ...file, coverType: targetCoverType! }; // Type assertion since checks pass

          const extendedFile = await extendHalfWidthCover(
            fileToExtend,
            Math.round(avgWidthPx),
            Math.round(avgWidthInch * 10) / 10
          );
          processedFiles.push(extendedFile);
        } else {
          processedFiles.push(file);
        }
      }

      return processedFiles;
    },
    [extendHalfWidthCover]
  );

  // 파일 메타데이터 추출 (표지 타입 감지 포함)
  const extractFileMetadata = useCallback(
    async (
      file: File,
      pageNumber: number,
      folderPath: string,
      pageLayout: PageLayoutType
    ): Promise<UploadedFile | { split: true; frontCover: UploadedFile; backCover: UploadedFile }> => {
      const dpi = await readImageDpi(file);
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = async () => {
          URL.revokeObjectURL(url);
          const widthInch = Math.round((img.naturalWidth / dpi) * 10) / 10;
          const heightInch = Math.round((img.naturalHeight / dpi) * 10) / 10;
          const ratio = calculateNormalizedRatio(widthInch, heightInch);

          // 표지 타입 감지
          const coverType = detectCoverType(file.name);

          // 첫막장 합본인 경우 분리
          if (coverType === 'COMBINED_COVER' && pageLayout === 'spread') {
            const splitResult = await splitCombinedCover(
              file,
              img.naturalWidth,
              img.naturalHeight,
              dpi,
              folderPath
            );
            resolve({ split: true, ...splitResult });
            return;
          }

          // 썸네일 생성
          const thumbnailUrl = generateThumbnail(img, img.naturalWidth, img.naturalHeight);

          resolve({
            id: `${Date.now()}-${pageNumber}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            fileName: file.name,
            filePath: folderPath,
            fileSize: file.size,
            pageNumber,
            widthPx: img.naturalWidth,
            heightPx: img.naturalHeight,
            dpi,
            widthInch,
            heightInch,
            ratio,
            coverType,
            thumbnailUrl,
            status: 'PENDING',
          });
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({
            id: `${Date.now()}-${pageNumber}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            fileName: file.name,
            filePath: folderPath,
            fileSize: file.size,
            pageNumber,
            widthPx: 0,
            heightPx: 0,
            dpi,
            widthInch: 0,
            heightInch: 0,
            ratio: 0,
            coverType: 'INNER_PAGE',
            status: 'PENDING',
          });
        };

        img.src = url;
      });
    },
    [splitCombinedCover]
  );

  // 디렉토리의 직접 파일만 읽기
  const readDirectoryFiles = useCallback(
    async (entry: FileSystemDirectoryEntry): Promise<{ files: File[]; subfolderEntries: FileSystemDirectoryEntry[] }> => {
      const result: { files: File[]; subfolderEntries: FileSystemDirectoryEntry[] } = { files: [], subfolderEntries: [] };

      return new Promise((resolve) => {
        const reader = entry.createReader();

        const readBatch = () => {
          reader.readEntries(async (entries) => {
            if (entries.length === 0) {
              resolve(result);
              return;
            }

            for (const e of entries) {
              if (e.isFile) {
                const fileEntry = e as FileSystemFileEntry;
                const ext = '.' + e.name.split('.').pop()?.toLowerCase();
                if (ACCEPTED_EXTENSIONS.includes(ext)) {
                  const file = await new Promise<File>((res) => {
                    fileEntry.file((f) => res(f));
                  });
                  result.files.push(file);
                }
              } else if (e.isDirectory) {
                result.subfolderEntries.push(e as FileSystemDirectoryEntry);
              }
            }

            readBatch();
          });
        };

        readBatch();
      });
    },
    []
  );

  // 폴더 재귀 수집
  const collectAllFolders = useCallback(
    async (
      entry: FileSystemDirectoryEntry,
      parentPath: string = '',
      currentDepth: number = 0
    ): Promise<{ entry: FileSystemDirectoryEntry; fullPath: string; depth: number }[]> => {
      const results: { entry: FileSystemDirectoryEntry; fullPath: string; depth: number }[] = [];

      if (currentDepth > MAX_DEPTH) {
        console.warn(`최대 깊이(${MAX_DEPTH}) 초과: ${parentPath}/${entry.name}`);
        return results;
      }

      const fullPath = parentPath ? `${parentPath} - ${entry.name}` : entry.name;
      results.push({ entry, fullPath, depth: currentDepth });

      const { subfolderEntries } = await readDirectoryFiles(entry);
      for (const subEntry of subfolderEntries) {
        const subResults = await collectAllFolders(subEntry, fullPath, currentDepth + 1);
        results.push(...subResults);
      }

      return results;
    },
    [readDirectoryFiles]
  );

  // 폴더 처리
  const processFolder = useCallback(
    async (
      entry: FileSystemDirectoryEntry,
      fullPath: string,
      depth: number,
      pageLayout: PageLayoutType,
      bindingDirection: BindingDirection | null
    ) => {
      setProcessingMessage(tu('analyzingFolder', { name: fullPath }));

      const { files } = await readDirectoryFiles(entry);

      if (files.length === 0) {
        console.warn(`폴더 "${fullPath}"에 이미지 파일이 없습니다.`);
        return null;
      }

      // 파일명 정렬
      files.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));

      // 파일 메타데이터 추출 및 첫막장 분리
      const processedFiles: UploadedFile[] = [];
      const splitCoverResults: SplitCoverResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await extractFileMetadata(file, i + 1, fullPath, pageLayout);

        if ('split' in result && result.split) {
          // 첫막장 분리된 경우
          processedFiles.push(result.frontCover);
          processedFiles.push(result.backCover);
          splitCoverResults.push({
            originalFileName: file.name,
            frontCover: result.frontCover,
            backCover: result.backCover,
          });
        } else if (!('split' in result)) {
          processedFiles.push(result);
        }

        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      // 반폭 표지 확장 처리 (Canvas로 실제 이미지 생성)
      setProcessingMessage(tu('processingCover', { name: fullPath }));
      const extendedFiles = await processHalfWidthCoversWithCanvas(processedFiles, pageLayout);

      // 확장된 파일이 있다면(첫장/막장 확장 등), 편집스타일을 'spread'로 강제 변경
      // (자동감지가 'single'로 잘못된 경우 보정)
      if (extendedFiles.some(f => f.isExtended)) {
        pageLayout = 'spread';
      }

      // 페이지 정렬 (첫장 → 내지 → 막장)
      const sortedFilesBase = sortPagesByPosition(extendedFiles);

      // 파일명 순차적 재정의 (001_파일명 등)
      const sortedFiles = sortedFilesBase.map((file, idx) => ({
        ...file,
        newFileName: generateSequentialFileName(idx, file.fileName, sortedFilesBase.length),
        pageNumber: idx + 1,
      }));

      // 첫장/막장 빈페이지 자동감지 (먹색/백색)
      setProcessingMessage(tu('detectingBlankPage', { name: fullPath }));
      let firstPageBlank = false;
      let lastPageBlank = false;
      let autoBindingDetected = false;
      let effectiveBindingDirection: BindingDirection = bindingDirection ?? 'LEFT_START_RIGHT_END';

      // 첫장이 반폭 확장된 경우 (Front Cover) -> 우철 (Right Start) 자동 적용
      if (sortedFiles.length > 0 &&
        sortedFiles[0].coverType === 'FRONT_COVER' &&
        sortedFiles[0].isExtended &&
        bindingDirection === null) {
        effectiveBindingDirection = 'RIGHT_START_LEFT_END';
        autoBindingDetected = true;
      }

      if (sortedFiles.length > 0) {
        // 펼침면: 첫장은 왼쪽반만, 막장은 오른쪽반만 검사
        // 낱장: 전체 이미지 검사
        const firstRegion = pageLayout === 'spread' ? 'left' as const : 'full' as const;
        const lastRegion = pageLayout === 'spread' ? 'right' as const : 'full' as const;

        const firstFile = sortedFiles[0];
        const firstSource = firstFile.file || firstFile.canvasDataUrl;
        if (firstSource) {
          firstPageBlank = await detectBlankPage(firstSource, firstRegion);
          if (firstPageBlank) {
            sortedFiles[0] = { ...sortedFiles[0], isBlankPage: true };
          }
        }

        if (sortedFiles.length > 1) {
          const lastFile = sortedFiles[sortedFiles.length - 1];
          const lastSource = lastFile.file || lastFile.canvasDataUrl;
          if (lastSource) {
            lastPageBlank = await detectBlankPage(lastSource, lastRegion);
            if (lastPageBlank) {
              sortedFiles[sortedFiles.length - 1] = { ...sortedFiles[sortedFiles.length - 1], isBlankPage: true };
            }
          }
        }

        // 빈페이지 기반 제본방향 자동 결정 (명시적 설정이 없는 경우만)
        if ((firstPageBlank || lastPageBlank) && bindingDirection === null) {
          effectiveBindingDirection = autoDetectBindingDirection(firstPageBlank, lastPageBlank);
          autoBindingDetected = true;
        }
      }

      // 첫 파일 기준 규격 결정
      const firstFile = sortedFiles[0];

      // 파일규격 (주문규격)
      const fileSpecWidth = firstFile.widthInch;
      const fileSpecHeight = firstFile.heightInch;

      // 앨범규격 계산
      const { albumWidth: rawAlbumWidth, albumHeight: rawAlbumHeight } = calculateAlbumSize(fileSpecWidth, fileSpecHeight, pageLayout);
      const closestStandard = findClosestStandardSize(indigoSpecs, rawAlbumWidth, rawAlbumHeight);

      // 앨범 크기를 가장 가까운 표준 규격으로 스냅
      const albumWidth = closestStandard && Math.abs(rawAlbumWidth - closestStandard.width) < 0.5 && Math.abs(rawAlbumHeight - closestStandard.height) < 0.5
        ? closestStandard.width : rawAlbumWidth;
      const albumHeight = closestStandard && Math.abs(rawAlbumWidth - closestStandard.width) < 0.5 && Math.abs(rawAlbumHeight - closestStandard.height) < 0.5
        ? closestStandard.height : rawAlbumHeight;
      const albumRatio = calculateNormalizedRatio(albumWidth, albumHeight);

      // 페이지 수 계산 (파일수 + 편집스타일 + 제본방향 기반)
      const fileCount = sortedFiles.length;
      const pageCount = calculatePageCount(fileCount, pageLayout, effectiveBindingDirection);

      const folder: UploadedFolder = {
        id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        folderName: entry.name,
        orderTitle: fullPath,
        folderPath: fullPath,
        depth,
        files: sortedFiles,
        totalFileSize: processedFiles.reduce((sum, f) => sum + f.fileSize, 0),
        pageCount,
        pageLayout,
        bindingDirection: effectiveBindingDirection,
        fileSpecWidth,
        fileSpecHeight,
        fileSpecLabel: `${fileSpecWidth}×${fileSpecHeight}인치`,
        albumWidth,
        albumHeight,
        albumRatio,
        albumLabel: closestStandard ? closestStandard.label : `${albumWidth}×${albumHeight}인치`,
        dpi: firstFile.dpi,
        specWidth: closestStandard?.width ?? albumWidth,
        specHeight: closestStandard?.height ?? albumHeight,
        specRatio: closestStandard ? calculateNormalizedRatio(closestStandard.width, closestStandard.height) : albumRatio,
        specLabel: closestStandard?.label ?? `${albumWidth}×${albumHeight}인치`,
        validationStatus: 'PENDING',
        isApproved: false,
        isSelected: false,
        exactMatchCount: 0,
        ratioMatchCount: 0,
        ratioMismatchCount: 0,
        mismatchFiles: [],
        splitCoverResults,
        hasCombinedCover: splitCoverResults.length > 0,
        quantity: 1,
        availableSizes: [],
        additionalOrders: [],
        firstPageBlank,
        lastPageBlank,
        autoBindingDetected,
        uploadedAt: Date.now(),
      };

      return folder;
    },
    [readDirectoryFiles, extractFileMetadata, setUploadProgress, processHalfWidthCoversWithCanvas, indigoSpecs, detectBlankPage, autoDetectBindingDirection]
  );

  // 드롭 핸들러
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setUploading(true);
      setUploadProgress(0);

      // 업로드 전 폴더 개수 저장
      const initialFolderCount = useMultiFolderUploadStore.getState().folders.length;

      const items = e.dataTransfer.items;
      const folderEntries: FileSystemDirectoryEntry[] = [];

      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry?.isDirectory) {
          folderEntries.push(entry as FileSystemDirectoryEntry);
        }
      }

      const allFolders: { entry: FileSystemDirectoryEntry; fullPath: string; depth: number }[] = [];
      for (const entry of folderEntries) {
        setProcessingMessage(tu('analyzingStructure', { name: entry.name }));
        const collected = await collectAllFolders(entry);
        allFolders.push(...collected);
      }

      const duplicateMessages: string[] = [];
      for (let i = 0; i < allFolders.length; i++) {
        const { entry, fullPath, depth } = allFolders[i];
        setProcessingMessage(tu('processingProgress', { current: i + 1, total: allFolders.length, name: fullPath }));

        // 편집스타일 자동감지 (기본값 미선택 시)
        let pageLayout: PageLayoutType;
        let isAutoDetected = false;
        if (defaultPageLayout !== null) {
          pageLayout = defaultPageLayout;
        } else {
          const { files: probeFiles } = await readDirectoryFiles(entry);
          probeFiles.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
          const dims = await probeFileDimensions(probeFiles);
          if (dims && indigoSpecs.length > 0) {
            pageLayout = autoDetectPageLayout(dims.widthInch, dims.heightInch, indigoSpecs);
          } else {
            pageLayout = 'spread';
          }
          isAutoDetected = true;
        }
        const bindingDirection = defaultBindingDirection; // null이면 빈페이지 기반 자동감지

        const folder = await processFolder(entry, fullPath, depth, pageLayout, bindingDirection);
        if (folder) {
          if (isAutoDetected) folder.isAutoDetected = true;
          const result = addFolder(folder);
          if (!result.added) {
            duplicateMessages.push(result.reason || tu('duplicateName', { name: folder.folderName }));
          } else if (result.reason) {
            duplicateMessages.push(result.reason);
          }
        }
      }

      if (duplicateMessages.length > 0) {
        toast({
          title: tu('duplicateFolderDetected'),
          description: duplicateMessages.join('\n'),
          variant: 'destructive',
        });
      }

      setUploading(false);
      setProcessingMessage('');

      // 새 폴더로 스크롤
      scrollToNewFolder(initialFolderCount);
    },
    [collectAllFolders, processFolder, addFolder, setUploading, setUploadProgress, defaultPageLayout, defaultBindingDirection, readDirectoryFiles, probeFileDimensions, indigoSpecs]
  );

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      setUploadProgress(0);

      // 업로드 전 폴더 개수 저장
      const initialFolderCount = useMultiFolderUploadStore.getState().folders.length;

      const folderMap = new Map<string, { files: File[]; depth: number; folderName: string }>();

      for (const file of Array.from(files)) {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(ext)) continue;

        const relativePath = (file as any).webkitRelativePath || file.name;
        const pathParts = relativePath.split('/');
        const folderParts = pathParts.slice(0, -1);

        if (folderParts.length === 0) continue;

        const folderPath = folderParts.join(' - ');
        const folderName = folderParts[folderParts.length - 1];
        const depth = folderParts.length - 1;

        if (!folderMap.has(folderPath)) {
          folderMap.set(folderPath, { files: [], depth, folderName });
        }
        folderMap.get(folderPath)!.files.push(file);
      }

      const entries = Array.from(folderMap.entries());
      const duplicateMessages: string[] = [];
      for (let i = 0; i < entries.length; i++) {
        const [folderPath, { files: folderFiles, depth, folderName }] = entries[i];
        setProcessingMessage(tu('processingProgress', { current: i + 1, total: entries.length, name: folderPath }));

        folderFiles.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));

        // 편집스타일 자동감지 (기본값 미선택 시)
        let pageLayout: PageLayoutType;
        let isAutoDetected = false;
        if (defaultPageLayout !== null) {
          pageLayout = defaultPageLayout;
        } else {
          const dims = await probeFileDimensions(folderFiles);
          if (dims && indigoSpecs.length > 0) {
            pageLayout = autoDetectPageLayout(dims.widthInch, dims.heightInch, indigoSpecs);
          } else {
            pageLayout = 'spread';
          }
          isAutoDetected = true;
        }
        const bindingDirection = defaultBindingDirection; // null이면 빈페이지 기반 자동감지

        const processedFiles: UploadedFile[] = [];
        const splitCoverResults: SplitCoverResult[] = [];

        for (let j = 0; j < folderFiles.length; j++) {
          const file = folderFiles[j];
          const result = await extractFileMetadata(file, j + 1, folderPath, pageLayout);

          if ('split' in result && result.split) {
            processedFiles.push(result.frontCover);
            processedFiles.push(result.backCover);
            splitCoverResults.push({
              originalFileName: file.name,
              frontCover: result.frontCover,
              backCover: result.backCover,
            });
          } else if (!('split' in result)) {
            processedFiles.push(result);
          }

          setUploadProgress(Math.round(((j + 1) / folderFiles.length) * 100));
        }

        if (processedFiles.length === 0) continue;

        // 반폭 표지 확장 처리 (Canvas로 실제 이미지 생성)
        const extendedFiles = await processHalfWidthCoversWithCanvas(processedFiles, pageLayout);

        // 확장된 파일이 있다면 편집스타일을 'spread'로 강제 변경
        if (extendedFiles.some(f => f.isExtended)) {
          pageLayout = 'spread';
        }

        const sortedFilesBase = sortPagesByPosition(extendedFiles);

        // 파일명 순차적 재정의 (001_파일명 등)
        const sortedFiles = sortedFilesBase.map((file, idx) => ({
          ...file,
          newFileName: generateSequentialFileName(idx, file.fileName, sortedFilesBase.length),
          pageNumber: idx + 1,
        }));

        // 첫장/막장 빈페이지 자동감지 (먹색/백색)
        setProcessingMessage(tu('detectingBlankPage', { name: folderPath }));
        let firstPageBlank = false;
        let lastPageBlank = false;
        let autoBindingDetected = false;
        let effectiveBindingDirection: BindingDirection = bindingDirection ?? 'LEFT_START_RIGHT_END';

        // 첫장이 반폭 확장된 경우 (Front Cover) -> 우철 (Right Start) 자동 적용
        if (sortedFiles.length > 0 &&
          sortedFiles[0].coverType === 'FRONT_COVER' &&
          sortedFiles[0].isExtended &&
          bindingDirection === null) {
          effectiveBindingDirection = 'RIGHT_START_LEFT_END';
          autoBindingDetected = true;
        }

        if (sortedFiles.length > 0) {
          // 펼침면: 첫장은 왼쪽반만, 막장은 오른쪽반만 검사
          // 낱장: 전체 이미지 검사
          const firstRegion = pageLayout === 'spread' ? 'left' as const : 'full' as const;
          const lastRegion = pageLayout === 'spread' ? 'right' as const : 'full' as const;

          const firstFileForBlank = sortedFiles[0];
          const firstSource = firstFileForBlank.file || firstFileForBlank.canvasDataUrl;
          if (firstSource) {
            firstPageBlank = await detectBlankPage(firstSource, firstRegion);
            if (firstPageBlank) {
              sortedFiles[0] = { ...sortedFiles[0], isBlankPage: true };
            }
          }

          if (sortedFiles.length > 1) {
            const lastFile = sortedFiles[sortedFiles.length - 1];
            const lastSource = lastFile.file || lastFile.canvasDataUrl;
            if (lastSource) {
              lastPageBlank = await detectBlankPage(lastSource, lastRegion);
              if (lastPageBlank) {
                sortedFiles[sortedFiles.length - 1] = { ...sortedFiles[sortedFiles.length - 1], isBlankPage: true };
              }
            }
          }

          if ((firstPageBlank || lastPageBlank) && bindingDirection === null) {
            effectiveBindingDirection = autoDetectBindingDirection(firstPageBlank, lastPageBlank);
            autoBindingDetected = true;
          }
        }

        const firstFile = sortedFiles[0];

        const fileSpecWidth = firstFile.widthInch;
        const fileSpecHeight = firstFile.heightInch;
        const { albumWidth: rawAlbumWidth, albumHeight: rawAlbumHeight } = calculateAlbumSize(fileSpecWidth, fileSpecHeight, pageLayout);
        const closestStandard = findClosestStandardSize(indigoSpecs, rawAlbumWidth, rawAlbumHeight);

        // 앨범 크기를 가장 가까운 표준 규격으로 스냅
        const albumWidth = closestStandard && Math.abs(rawAlbumWidth - closestStandard.width) < 0.5 && Math.abs(rawAlbumHeight - closestStandard.height) < 0.5
          ? closestStandard.width : rawAlbumWidth;
        const albumHeight = closestStandard && Math.abs(rawAlbumWidth - closestStandard.width) < 0.5 && Math.abs(rawAlbumHeight - closestStandard.height) < 0.5
          ? closestStandard.height : rawAlbumHeight;
        const albumRatio = calculateNormalizedRatio(albumWidth, albumHeight);

        // 페이지 수 계산 (파일수 + 편집스타일 + 제본방향 기반)
        const fileCount = sortedFiles.length;
        const pageCount = calculatePageCount(fileCount, pageLayout, effectiveBindingDirection);

        const folder: UploadedFolder = {
          id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          folderName,
          orderTitle: folderPath,
          folderPath,
          depth,
          files: sortedFiles,
          totalFileSize: processedFiles.reduce((sum, f) => sum + f.fileSize, 0),
          pageCount,
          pageLayout,
          bindingDirection: effectiveBindingDirection,
          fileSpecWidth,
          fileSpecHeight,
          fileSpecLabel: `${fileSpecWidth}×${fileSpecHeight}인치`,
          albumWidth,
          albumHeight,
          albumRatio,
          albumLabel: closestStandard ? closestStandard.label : `${albumWidth}×${albumHeight}인치`,
          dpi: firstFile.dpi,
          specWidth: closestStandard?.width ?? albumWidth,
          specHeight: closestStandard?.height ?? albumHeight,
          specRatio: closestStandard ? calculateNormalizedRatio(closestStandard.width, closestStandard.height) : albumRatio,
          specLabel: closestStandard?.label ?? `${albumWidth}×${albumHeight}인치`,
          validationStatus: 'PENDING',
          isApproved: false,
          isSelected: false,
          exactMatchCount: 0,
          ratioMatchCount: 0,
          ratioMismatchCount: 0,
          mismatchFiles: [],
          splitCoverResults,
          hasCombinedCover: splitCoverResults.length > 0,
          quantity: 1,
          availableSizes: [],
          additionalOrders: [],
          isAutoDetected,
          firstPageBlank,
          lastPageBlank,
          autoBindingDetected,
          uploadedAt: Date.now(),
        };

        const result = addFolder(folder);
        if (!result.added) {
          duplicateMessages.push(result.reason || tu('duplicateName', { name: folder.folderName }));
        } else if (result.reason) {
          duplicateMessages.push(result.reason);
        }
      }

      if (duplicateMessages.length > 0) {
        toast({
          title: tu('duplicateFolderDetected'),
          description: duplicateMessages.join('\n'),
          variant: 'destructive',
        });
      }

      setUploading(false);
      setProcessingMessage('');
      e.target.value = '';

      // 새 폴더로 스크롤
      scrollToNewFolder(initialFolderCount);
    },
    [addFolder, extractFileMetadata, setUploading, setUploadProgress, defaultPageLayout, defaultBindingDirection, processHalfWidthCoversWithCanvas, indigoSpecs, probeFileDimensions, detectBlankPage, autoDetectBindingDirection]
  );

  // 모바일 파일 선택 핸들러 (webkitdirectory 없이 다중 파일 선택)
  const handleMobileFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const imageFiles = Array.from(files).filter(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return ACCEPTED_EXTENSIONS.includes(ext);
      });

      if (imageFiles.length === 0) {
        toast({ title: tu('noImageFiles'), description: tu('noImageFilesDescription'), variant: 'destructive' });
        return;
      }

      // 파일을 임시 저장하고 폴더명 입력 다이얼로그 표시
      setPendingMobileFiles(imageFiles);
      const now = new Date();
      setMobileFolderName(`${tu('defaultFolderPrefix')}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`);
      setShowMobileFolderNameDialog(true);
      e.target.value = '';
    },
    []
  );

  // 모바일 파일 처리 (폴더명 확정 후 실행)
  const processMobileFiles = useCallback(
    async (files: File[], folderName: string) => {
      setUploading(true);
      setUploadProgress(0);
      setShowMobileFolderNameDialog(false);

      // 업로드 전 폴더 개수 저장
      const initialFolderCount = useMultiFolderUploadStore.getState().folders.length;

      const folderPath = folderName;
      files.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));

      // 편집스타일 자동감지
      let pageLayout: PageLayoutType;
      let isAutoDetected = false;
      if (defaultPageLayout !== null) {
        pageLayout = defaultPageLayout;
      } else {
        const dims = await probeFileDimensions(files);
        if (dims && indigoSpecs.length > 0) {
          pageLayout = autoDetectPageLayout(dims.widthInch, dims.heightInch, indigoSpecs);
        } else {
          pageLayout = 'spread';
        }
        isAutoDetected = true;
      }
      const bindingDirection = defaultBindingDirection;

      setProcessingMessage(tu('processingFolder', { name: folderName, current: '', total: '' }));

      const processedFiles: UploadedFile[] = [];
      const splitCoverResults: SplitCoverResult[] = [];

      for (let j = 0; j < files.length; j++) {
        const file = files[j];
        const result = await extractFileMetadata(file, j + 1, folderPath, pageLayout);

        if ('split' in result && result.split) {
          processedFiles.push(result.frontCover);
          processedFiles.push(result.backCover);
          splitCoverResults.push({
            originalFileName: file.name,
            frontCover: result.frontCover,
            backCover: result.backCover,
          });
        } else if (!('split' in result)) {
          processedFiles.push(result);
        }

        setUploadProgress(Math.round(((j + 1) / files.length) * 100));
      }

      if (processedFiles.length === 0) {
        setUploading(false);
        setProcessingMessage('');
        return;
      }

      const extendedFiles = await processHalfWidthCoversWithCanvas(processedFiles, pageLayout);

      // 확장된 파일이 있다면 편집스타일을 'spread'로 강제 변경
      if (extendedFiles.some(f => f.isExtended)) {
        pageLayout = 'spread';
      }

      const sortedFilesBase = sortPagesByPosition(extendedFiles);

      // 파일명 순차적 재정의 (001_파일명 등)
      const sortedFiles = sortedFilesBase.map((file, idx) => ({
        ...file,
        newFileName: generateSequentialFileName(idx, file.fileName, sortedFilesBase.length),
        pageNumber: idx + 1,
      }));

      // 빈페이지 자동감지
      setProcessingMessage(tu('detectingBlankPage', { name: folderName }));
      let firstPageBlank = false;
      let lastPageBlank = false;
      let autoBindingDetected = false;
      let effectiveBindingDirection: BindingDirection = bindingDirection ?? 'LEFT_START_RIGHT_END';

      // 첫장이 반폭 확장된 경우 (Front Cover) -> 우철 (Right Start) 자동 적용
      if (sortedFiles.length > 0 &&
        sortedFiles[0].coverType === 'FRONT_COVER' &&
        sortedFiles[0].isExtended &&
        bindingDirection === null) {
        effectiveBindingDirection = 'RIGHT_START_LEFT_END';
        autoBindingDetected = true;
      }

      if (sortedFiles.length > 0) {
        const firstRegion = pageLayout === 'spread' ? 'left' as const : 'full' as const;
        const lastRegion = pageLayout === 'spread' ? 'right' as const : 'full' as const;

        const firstFileForBlank = sortedFiles[0];
        const firstSource = firstFileForBlank.file || firstFileForBlank.canvasDataUrl;
        if (firstSource) {
          firstPageBlank = await detectBlankPage(firstSource, firstRegion);
          if (firstPageBlank) {
            sortedFiles[0] = { ...sortedFiles[0], isBlankPage: true };
          }
        }

        if (sortedFiles.length > 1) {
          const lastFile = sortedFiles[sortedFiles.length - 1];
          const lastSource = lastFile.file || lastFile.canvasDataUrl;
          if (lastSource) {
            lastPageBlank = await detectBlankPage(lastSource, lastRegion);
            if (lastPageBlank) {
              sortedFiles[sortedFiles.length - 1] = { ...sortedFiles[sortedFiles.length - 1], isBlankPage: true };
            }
          }
        }

        if ((firstPageBlank || lastPageBlank) && bindingDirection === null) {
          effectiveBindingDirection = autoDetectBindingDirection(firstPageBlank, lastPageBlank);
          autoBindingDetected = true;
        }
      }

      const firstFile = sortedFiles[0];
      const fileSpecWidth = firstFile.widthInch;
      const fileSpecHeight = firstFile.heightInch;
      const { albumWidth: rawAlbumWidth, albumHeight: rawAlbumHeight } = calculateAlbumSize(fileSpecWidth, fileSpecHeight, pageLayout);
      const closestStandard = findClosestStandardSize(indigoSpecs, rawAlbumWidth, rawAlbumHeight);

      const albumWidth = closestStandard && Math.abs(rawAlbumWidth - closestStandard.width) < 0.5 && Math.abs(rawAlbumHeight - closestStandard.height) < 0.5
        ? closestStandard.width : rawAlbumWidth;
      const albumHeight = closestStandard && Math.abs(rawAlbumWidth - closestStandard.width) < 0.5 && Math.abs(rawAlbumHeight - closestStandard.height) < 0.5
        ? closestStandard.height : rawAlbumHeight;
      const albumRatio = calculateNormalizedRatio(albumWidth, albumHeight);

      const fileCount = sortedFiles.length;
      const pageCount = calculatePageCount(fileCount, pageLayout, effectiveBindingDirection);

      const folder: UploadedFolder = {
        id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        folderName,
        orderTitle: folderPath,
        folderPath,
        depth: 0,
        files: sortedFiles,
        totalFileSize: processedFiles.reduce((sum, f) => sum + f.fileSize, 0),
        pageCount,
        pageLayout,
        bindingDirection: effectiveBindingDirection,
        fileSpecWidth,
        fileSpecHeight,
        fileSpecLabel: `${fileSpecWidth}×${fileSpecHeight}인치`,
        albumWidth,
        albumHeight,
        albumRatio,
        albumLabel: closestStandard ? closestStandard.label : `${albumWidth}×${albumHeight}인치`,
        dpi: firstFile.dpi,
        specWidth: closestStandard?.width ?? albumWidth,
        specHeight: closestStandard?.height ?? albumHeight,
        specRatio: closestStandard ? calculateNormalizedRatio(closestStandard.width, closestStandard.height) : albumRatio,
        specLabel: closestStandard?.label ?? `${albumWidth}×${albumHeight}인치`,
        validationStatus: 'PENDING',
        isApproved: false,
        isSelected: false,
        exactMatchCount: 0,
        ratioMatchCount: 0,
        ratioMismatchCount: 0,
        mismatchFiles: [],
        splitCoverResults,
        hasCombinedCover: splitCoverResults.length > 0,
        quantity: 1,
        availableSizes: [],
        additionalOrders: [],
        isAutoDetected,
        firstPageBlank,
        lastPageBlank,
        autoBindingDetected,
        uploadedAt: Date.now(),
      };

      const result = addFolder(folder);
      if (!result.added) {
        toast({ title: tu('duplicateFolderDetected'), description: result.reason || tu('duplicateName', { name: folder.folderName }), variant: 'destructive' });
      }

      setUploading(false);
      setProcessingMessage('');
      setPendingMobileFiles([]);

      // 새 폴더로 스크롤
      scrollToNewFolder(initialFolderCount);
    },
    [addFolder, extractFileMetadata, setUploading, setUploadProgress, defaultPageLayout, defaultBindingDirection, processHalfWidthCoversWithCanvas, indigoSpecs, probeFileDimensions, detectBlankPage, autoDetectBindingDirection]
  );

  // 새 폴더로 스크롤 이동 헬퍼
  const scrollToNewFolder = (startIndex: number) => {
    // DOM 렌더링 대기
    setTimeout(() => {
      const currentFolders = useMultiFolderUploadStore.getState().folders;
      if (startIndex < currentFolders.length) {
        const targetFolder = currentFolders[startIndex];
        const element = document.getElementById(`folder-card-${targetFolder.id}`);
        if (element) {
          const headerOffset = 280; // 헤더 + 여백 더 넉넉하게 (제목이 잘리지 않도록)
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }
    }, 100);
  };

  const handleAddToCart = () => {
    const selected = getSelectedFolders();
    if (selected.length === 0) return;
    onAddToCart?.(selected);
  };

  const stats = {
    total: folders.length,
    exact: folders.filter(f => f.validationStatus === 'EXACT_MATCH').length,
    ratioMatch: folders.filter(f => f.validationStatus === 'RATIO_MATCH').length,
    mismatch: folders.filter(f => f.validationStatus === 'RATIO_MISMATCH').length,
    selectable: folders.filter(f =>
      f.validationStatus === 'EXACT_MATCH' ||
      (f.validationStatus === 'RATIO_MATCH' && f.isApproved)
    ).length,
    selected: folders.filter(f => f.isSelected).length,
  };

  // 선택된 폴더들의 총 견적
  const selectedFolders = folders.filter(f => f.isSelected);
  const totalPriceInfo = useMemo(
    () => calculateTotalUploadedPrice(selectedFolders),
    [selectedFolders]
  );

  // 항상 업로드 가능 (미선택 시 자동감지)
  const canUpload = true;

  return (
    <div className="space-y-4">
      {/* 편집스타일 & 제본순서 선택 */}
      <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border-2 bg-gray-50 border-transparent transition-colors">
        {/* 편집스타일 */}
        <div>
          <span className="text-sm font-medium mb-2 block text-gray-700">
            {tu('editStyleLabel')}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDefaultPageLayout(null)}
              className="flex flex-col items-center gap-1"
            >
              <div className={cn(
                'w-14 h-11 border-2 rounded transition-all flex items-center justify-center text-[10px] font-bold',
                defaultPageLayout === null
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-gray-300 bg-white text-gray-400 hover:border-gray-400'
              )}>
                AUTO
              </div>
              <span className={cn(
                'text-xs',
                defaultPageLayout === null ? 'text-blue-600 font-medium' : 'text-gray-500'
              )}>
                {tu('autoDetect')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDefaultPageLayout('single')}
              className="flex flex-col items-center gap-1"
            >
              <PageLayoutIcon type="single" isSelected={defaultPageLayout === 'single'} />
              <span className={cn(
                'text-xs',
                defaultPageLayout === 'single' ? 'text-blue-600 font-medium' : 'text-gray-500'
              )}>
                {tf('single')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDefaultPageLayout('spread')}
              className="flex flex-col items-center gap-1"
            >
              <PageLayoutIcon type="spread" isSelected={defaultPageLayout === 'spread'} />
              <span className={cn(
                'text-xs',
                defaultPageLayout === 'spread' ? 'text-blue-600 font-medium' : 'text-gray-500'
              )}>
                {tf('spread')}
              </span>
            </button>
          </div>
        </div>

        {/* 제본시작/끝 */}
        <div>
          <span className="text-sm font-medium mb-2 block text-gray-700">
            {tu('bindingStartEnd')}
          </span>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setDefaultBindingDirection(null)}
              className="flex flex-col items-center gap-1"
            >
              <div className={cn(
                'w-[72px] h-10 border-2 rounded transition-all flex items-center justify-center text-[10px] font-bold',
                defaultBindingDirection === null
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-gray-300 bg-white text-gray-400 hover:border-gray-400'
              )}>
                AUTO
              </div>
              <span className={cn(
                'text-[10px] leading-tight text-center',
                defaultBindingDirection === null ? 'text-blue-600 font-medium' : 'text-gray-500'
              )}>
                {tu('autoLeftRight')}
              </span>
            </button>
            {([
              { value: 'LEFT_START_RIGHT_END', label: tu('leftStartRightEnd') },
              { value: 'LEFT_START_LEFT_END', label: tu('leftStartLeftEnd') },
              { value: 'RIGHT_START_LEFT_END', label: tu('rightStartLeftEnd') },
              { value: 'RIGHT_START_RIGHT_END', label: tu('rightStartRightEnd') },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDefaultBindingDirection(option.value)}
                className="flex flex-col items-center gap-1"
              >
                <BindingDirectionIcon
                  direction={option.value}
                  isSelected={defaultBindingDirection === option.value}
                />
                <span className={cn(
                  'text-[10px] leading-tight text-center',
                  defaultBindingDirection === option.value ? 'text-blue-600 font-medium' : 'text-gray-500'
                )}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-blue-500" /> {tu('legendStart')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-purple-500" /> {tu('legendEnd')}
        </span>
      </div>

      {/* 모바일 폴더명 입력 다이얼로그 */}
      {showMobileFolderNameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowMobileFolderNameDialog(false)}>
          <div className="bg-white rounded-lg p-6 mx-4 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">{tu('folderNameInput')}</h3>
            <p className="text-sm text-gray-500 mb-4">{tu('folderNameDescription', { count: pendingMobileFiles.length })}</p>
            <Input
              value={mobileFolderName}
              onChange={(e) => setMobileFolderName(e.target.value)}
              placeholder={tu('folderName')}
              className="mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setShowMobileFolderNameDialog(false);
                setPendingMobileFiles([]);
              }}>
                {tc('cancel')}
              </Button>
              <Button onClick={() => {
                if (mobileFolderName.trim()) {
                  processMobileFiles(pendingMobileFiles, mobileFolderName.trim());
                }
              }}>
                {tc('confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 업로드 영역 */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        )}
        {...(!isMobile ? {
          onDragOver: (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); },
          onDragLeave: (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); },
          onDrop: handleDrop,
        } : {})}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600">{processingMessage}</span>
            <Progress value={uploadProgress} className="w-48 h-2" />
            <span className="text-xs text-gray-500">{uploadProgress}%</span>
          </div>
        ) : isMobile ? (
          /* 모바일: 다중 파일 선택 (webkitdirectory 미지원) */
          <>
            <div className="flex justify-center gap-4 mb-3">
              <FileImage className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-3">
              {tu('dragDropMobile')}
            </p>
            <label className="inline-block">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/tiff"
                onChange={handleMobileFileSelect}
                className="sr-only"
              />
              <Button variant="outline" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {tu('selectFiles')}
                </span>
              </Button>
            </label>
            <p className="text-xs text-gray-400 mt-3">
              {tu('supportedFormatsMobile')}
            </p>
          </>
        ) : (
          /* 데스크톱: 폴더 드래그 & 드롭 + 폴더 선택 */
          <>
            <div className="flex justify-center gap-4 mb-3">
              <Folder className="w-12 h-12 text-gray-400" />
              <FileImage className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-3">
              {tu.rich('dragDrop', { bold: (chunks) => <strong>{chunks}</strong> })}
            </p>
            <label className="inline-block">
              <input
                type="file"
                multiple
                // @ts-ignore
                webkitdirectory=""
                directory=""
                onChange={handleFileSelect}
                className="sr-only"
              />
              <Button variant="outline" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {tu('selectFolder')}
                </span>
              </Button>
            </label>
            <p className="text-xs text-gray-400 mt-3">
              {tu('supportedFormatsDetail')}
            </p>
          </>
        )}
      </div>

      {/* 업로드된 폴더 목록 */}
      {folders.length > 0 && (
        <>
          <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3">
            <div className="flex items-center gap-4 text-sm">
              <span>{tu('statsTotal', { count: stats.total })}</span>
              <span className="text-green-600">{tu('statsNormal', { count: stats.exact })}</span>
              <span className="text-amber-600">{tu('statsRatioMatch', { count: stats.ratioMatch })}</span>
              <span className="text-red-600">{tu('statsMismatch', { count: stats.mismatch })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{tu('selectedCount', { count: stats.selected })}</span>
              {companyInfo && clientInfo && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBatchShipping(!showBatchShipping)}
                  className="gap-1"
                >
                  <Truck className="h-3.5 w-3.5" />
                  {tu('batchShipping')}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={clearFolders}>
                {tc('deleteAll')}
              </Button>
            </div>
          </div>

          {/* 일괄 배송 설정 패널 */}
          {showBatchShipping && companyInfo && clientInfo && (
            <div className="border rounded-lg p-4 bg-blue-50/30 border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <Truck className="h-4 w-4" />
                  {tu('batchShippingTitle')}
                </h4>
                <Button
                  size="sm"
                  onClick={() => {
                    if (batchShippingInfo) {
                      applyShippingToAll(batchShippingInfo);
                      setShowBatchShipping(false);
                    }
                  }}
                  disabled={!batchShippingInfo}
                >
                  {tu('applyToAll')}
                </Button>
              </div>
              <FolderShippingSection
                shippingInfo={batchShippingInfo ?? undefined}
                companyInfo={companyInfo}
                clientInfo={clientInfo}
                pricingMap={pricingMap}
                onChange={(shipping) => setBatchShippingInfo(shipping)}
              />
            </div>
          )}

          <div className="space-y-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                id={`folder-card-${folder.id}`}
                className="scroll-mt-24" // 헤더 높이 고려하여 여백 추가
              >
                <FolderCard
                  folder={folder}
                  companyInfo={companyInfo}
                  clientInfo={clientInfo}
                  pricingMap={pricingMap}
                />
              </div>
            ))}
          </div>

          {/* 총 금액 표시 */}
          {stats.selected > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600">{tu('selectedOrder', { count: stats.selected, qty: totalPriceInfo.totalQuantity })}</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {totalPriceInfo.totalPrice.toLocaleString()}원
                  </div>
                  <div className="text-xs text-gray-500">
                    공급가 {totalPriceInfo.subtotal.toLocaleString()}원 + VAT {totalPriceInfo.tax.toLocaleString()}원
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {stats.selected > 0 ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  {tu('selectedCountDone', { count: stats.selected })}
                </span>
              ) : stats.selectable > 0 ? (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  {tu('selectFoldersToOrder')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {tu('noSelectableFolders')}
                </span>
              )}
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={stats.selected === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {tu('addToCartSelected', { count: stats.selected })}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
