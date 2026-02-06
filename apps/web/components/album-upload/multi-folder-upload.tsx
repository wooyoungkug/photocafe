'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Folder,
  FileImage,
  Upload,
  Loader2,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMultiFolderUploadStore,
  type UploadedFolder,
  type UploadedFile,
  type PageLayoutType,
  type BindingDirection,
  type CoverType,
  type SplitCoverResult,
  getSpecLabel,
  detectCoverType,
  calculateAlbumSize,
  sortPagesByPosition,
  findClosestStandardSize,
  STANDARD_SIZES,
  calculateTotalUploadedPrice,
} from '@/stores/multi-folder-upload-store';

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
import { calculateNormalizedRatio, formatFileSize } from '@/lib/album-utils';

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
    addFolder,
    clearFolders,
    setUploading,
    setUploadProgress,
    setDefaultPageLayout,
    setDefaultBindingDirection,
    getSelectedFolders,
  } = useMultiFolderUploadStore();

  const [isDragging, setIsDragging] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

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
      if (pageLayout !== 'spread') return files;

      // 대표 규격 찾기 (가장 많은 비율의 내지 기준)
      const innerPages = files.filter(f => f.coverType === 'INNER_PAGE');
      if (innerPages.length === 0) return files;

      // 내지의 평균 가로 크기를 대표 규격으로 사용
      const avgWidthPx = innerPages.reduce((sum, f) => sum + f.widthPx, 0) / innerPages.length;
      const avgWidthInch = innerPages.reduce((sum, f) => sum + f.widthInch, 0) / innerPages.length;
      const avgHeightPx = innerPages.reduce((sum, f) => sum + f.heightPx, 0) / innerPages.length;

      const halfWidthPx = avgWidthPx / 2;
      const halfWidthInch = avgWidthInch / 2;

      // 각 파일을 처리
      const processedFiles: UploadedFile[] = [];

      for (const file of files) {
        // 표지가 반폭인지 확인
        const isHalfWidth =
          (file.coverType === 'FRONT_COVER' || file.coverType === 'BACK_COVER') &&
          Math.abs(file.widthPx - halfWidthPx) < 100 && // 반폭 가로 오차 100px 이내
          Math.abs(file.heightPx - avgHeightPx) < 100;  // 세로는 같아야 함

        if (isHalfWidth) {
          // 반폭 표지를 전폭으로 확장
          const extendedFile = await extendHalfWidthCover(
            file,
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
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = async () => {
          URL.revokeObjectURL(url);
          const dpi = 300; // 기본 DPI
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
            dpi: 300,
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
      pageLayout: PageLayoutType
    ) => {
      setProcessingMessage(`"${fullPath}" 폴더 분석 중...`);

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
        } else {
          processedFiles.push(result);
        }

        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      // 반폭 표지 확장 처리 (Canvas로 실제 이미지 생성)
      setProcessingMessage(`"${fullPath}" 표지 처리 중...`);
      const extendedFiles = await processHalfWidthCoversWithCanvas(processedFiles, pageLayout);

      // 페이지 정렬 (첫장 → 내지 → 막장)
      const sortedFiles = sortPagesByPosition(extendedFiles);

      // 첫 파일 기준 규격 결정
      const firstFile = sortedFiles[0];

      // 파일규격 (주문규격)
      const fileSpecWidth = firstFile.widthInch;
      const fileSpecHeight = firstFile.heightInch;

      // 앨범규격 계산
      const { albumWidth, albumHeight } = calculateAlbumSize(fileSpecWidth, fileSpecHeight, pageLayout);
      const albumRatio = calculateNormalizedRatio(albumWidth, albumHeight);

      // 가장 가까운 표준 앨범규격
      const closestStandard = findClosestStandardSize(albumWidth, albumHeight);

      const folder: UploadedFolder = {
        id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        folderName: entry.name,
        orderTitle: fullPath,
        folderPath: fullPath,
        depth,
        files: sortedFiles,
        totalFileSize: processedFiles.reduce((sum, f) => sum + f.fileSize, 0),
        pageCount: sortedFiles.length,
        pageLayout,
        fileSpecWidth,
        fileSpecHeight,
        fileSpecLabel: getSpecLabel(fileSpecWidth, fileSpecHeight),
        albumWidth,
        albumHeight,
        albumRatio,
        albumLabel: getSpecLabel(albumWidth, albumHeight),
        dpi: firstFile.dpi,
        specWidth: closestStandard.width,
        specHeight: closestStandard.height,
        specRatio: calculateNormalizedRatio(closestStandard.width, closestStandard.height),
        specLabel: closestStandard.label,
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
      };

      return folder;
    },
    [readDirectoryFiles, extractFileMetadata, setUploadProgress, processHalfWidthCoversWithCanvas]
  );

  // 드롭 핸들러
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setUploading(true);
      setUploadProgress(0);

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
        setProcessingMessage(`"${entry.name}" 구조 분석 중...`);
        const collected = await collectAllFolders(entry);
        allFolders.push(...collected);
      }

      for (let i = 0; i < allFolders.length; i++) {
        const { entry, fullPath, depth } = allFolders[i];
        setProcessingMessage(`폴더 처리 중... (${i + 1}/${allFolders.length}) - ${fullPath}`);
        const folder = await processFolder(entry, fullPath, depth, defaultPageLayout);
        if (folder) {
          addFolder(folder);
        }
      }

      setUploading(false);
      setProcessingMessage('');
    },
    [collectAllFolders, processFolder, addFolder, setUploading, setUploadProgress, defaultPageLayout]
  );

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      setUploadProgress(0);

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
      for (let i = 0; i < entries.length; i++) {
        const [folderPath, { files: folderFiles, depth, folderName }] = entries[i];
        setProcessingMessage(`"${folderPath}" 처리 중... (${i + 1}/${entries.length})`);

        folderFiles.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));

        const processedFiles: UploadedFile[] = [];
        const splitCoverResults: SplitCoverResult[] = [];

        for (let j = 0; j < folderFiles.length; j++) {
          const file = folderFiles[j];
          const result = await extractFileMetadata(file, j + 1, folderPath, defaultPageLayout);

          if ('split' in result && result.split) {
            processedFiles.push(result.frontCover);
            processedFiles.push(result.backCover);
            splitCoverResults.push({
              originalFileName: file.name,
              frontCover: result.frontCover,
              backCover: result.backCover,
            });
          } else {
            processedFiles.push(result);
          }

          setUploadProgress(Math.round(((j + 1) / folderFiles.length) * 100));
        }

        if (processedFiles.length === 0) continue;

        // 반폭 표지 확장 처리 (Canvas로 실제 이미지 생성)
        const extendedFiles = await processHalfWidthCoversWithCanvas(processedFiles, defaultPageLayout);

        const sortedFiles = sortPagesByPosition(extendedFiles);
        const firstFile = sortedFiles[0];

        const fileSpecWidth = firstFile.widthInch;
        const fileSpecHeight = firstFile.heightInch;
        const { albumWidth, albumHeight } = calculateAlbumSize(fileSpecWidth, fileSpecHeight, defaultPageLayout);
        const albumRatio = calculateNormalizedRatio(albumWidth, albumHeight);
        const closestStandard = findClosestStandardSize(albumWidth, albumHeight);

        const folder: UploadedFolder = {
          id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          folderName,
          orderTitle: folderPath,
          folderPath,
          depth,
          files: sortedFiles,
          totalFileSize: processedFiles.reduce((sum, f) => sum + f.fileSize, 0),
          pageCount: sortedFiles.length,
          pageLayout: defaultPageLayout,
          fileSpecWidth,
          fileSpecHeight,
          fileSpecLabel: getSpecLabel(fileSpecWidth, fileSpecHeight),
          albumWidth,
          albumHeight,
          albumRatio,
          albumLabel: getSpecLabel(albumWidth, albumHeight),
          dpi: firstFile.dpi,
          specWidth: closestStandard.width,
          specHeight: closestStandard.height,
          specRatio: calculateNormalizedRatio(closestStandard.width, closestStandard.height),
          specLabel: closestStandard.label,
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
        };

        addFolder(folder);
      }

      setUploading(false);
      setProcessingMessage('');
      e.target.value = '';
    },
    [addFolder, extractFileMetadata, setUploading, setUploadProgress, defaultPageLayout, processHalfWidthCoversWithCanvas]
  );

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

  // 편집스타일과 제본순서가 모두 선택되어야 업로드 가능
  const canUpload = defaultPageLayout !== null && defaultBindingDirection !== null;

  return (
    <div className="space-y-4">
      {/* 편집스타일 & 제본순서 선택 */}
      <div className={cn(
        "grid grid-cols-2 gap-4 p-4 rounded-lg border-2 transition-colors",
        canUpload ? "bg-gray-50 border-transparent" : "bg-amber-50 border-amber-300"
      )}>
        {/* 편집스타일 */}
        <div>
          <span className={cn(
            "text-sm font-medium mb-2 block",
            defaultPageLayout === null ? "text-amber-700" : "text-gray-700"
          )}>
            편집스타일 {defaultPageLayout === null && <span className="text-red-500">*</span>}
          </span>
          <div className="flex gap-3">
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
                낱장
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
                펼침면
              </span>
            </button>
          </div>
        </div>

        {/* 제본시작/끝 */}
        <div>
          <span className={cn(
            "text-sm font-medium mb-2 block",
            defaultBindingDirection === null ? "text-amber-700" : "text-gray-700"
          )}>
            제본시작 / 끝 {defaultBindingDirection === null && <span className="text-red-500">*</span>}
          </span>
          <div className="flex gap-2 flex-wrap">
            {([
              { value: 'LEFT_START_RIGHT_END', label: '좌 시작 → 우측 끝' },
              { value: 'LEFT_START_LEFT_END', label: '좌 시작 → 좌측 끝' },
              { value: 'RIGHT_START_LEFT_END', label: '우 시작 → 좌측 끝' },
              { value: 'RIGHT_START_RIGHT_END', label: '우 시작 → 우측 끝' },
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
          <span className="w-3 h-3 rounded-sm bg-blue-500" /> 시작(첫장)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-purple-500" /> 끝(막장)
        </span>
      </div>

      {/* 업로드 영역 */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          !canUpload
            ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
            : isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (canUpload) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          if (canUpload) {
            handleDrop(e);
          } else {
            e.preventDefault();
            setIsDragging(false);
          }
        }}
      >
        {!canUpload ? (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <AlertCircle className="w-12 h-12" />
            <p className="text-sm font-medium">먼저 편집스타일과 제본순서를 선택해주세요</p>
            <p className="text-xs">위의 옵션을 모두 선택해야 데이터를 업로드할 수 있습니다.</p>
          </div>
        ) : isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600">{processingMessage}</span>
            <Progress value={uploadProgress} className="w-48 h-2" />
            <span className="text-xs text-gray-500">{uploadProgress}%</span>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-4 mb-3">
              <Folder className="w-12 h-12 text-gray-400" />
              <FileImage className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-3">
              <strong>여러 개의 폴더</strong>를 드래그하여 업로드하거나
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
                  폴더 선택
                </span>
              </Button>
            </label>
            <p className="text-xs text-gray-400 mt-3">
              JPG, PNG, TIFF 지원 | 최대 하위 4단계 | 첫장/막장 자동 감지 | 첫막장 합본 자동 분리
            </p>
          </>
        )}
      </div>

      {/* 업로드된 폴더 목록 */}
      {folders.length > 0 && (
        <>
          <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3">
            <div className="flex items-center gap-4 text-sm">
              <span>전체 {stats.total}건</span>
              <span className="text-green-600">정상 {stats.exact}</span>
              <span className="text-amber-600">비율일치 {stats.ratioMatch}</span>
              <span className="text-red-600">불일치 {stats.mismatch}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">선택됨: {stats.selected}건</span>
              <Button variant="ghost" size="sm" onClick={clearFolders}>
                전체 삭제
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} />
            ))}
          </div>

          {/* 총 금액 표시 */}
          {stats.selected > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600">선택 주문 ({stats.selected}건, {totalPriceInfo.totalQuantity}부)</span>
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
                  {stats.selected}건 선택됨
                </span>
              ) : stats.selectable > 0 ? (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  주문할 폴더를 선택해주세요
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  선택 가능한 폴더가 없습니다
                </span>
              )}
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={stats.selected === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              선택 항목 장바구니 담기 ({stats.selected}건)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
