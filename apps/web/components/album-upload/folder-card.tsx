'use client';

import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronDown,
  ChevronUp,
  Folder,
  Trash2,
  Plus,
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Edit2,
  Check,
  BookOpen,
  FileText,
  Scissors,
  ZoomIn,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Image as ImageIcon,
  Clock,
  Palette,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ColorGroupBadge } from './color-group-badge';
import { FabricPickerDialog } from './fabric-picker-dialog';
import { useCopperPlateLabels, useCopperPlatesByClient } from '@/hooks/use-copper-plates';
import { usePublicCopperPlates } from '@/hooks/use-public-copper-plates';
import { useAuthStore } from '@/stores/auth-store';

import {
  type UploadedFolder,
  type FolderValidationStatus,
  type BindingDirection,
  useMultiFolderUploadStore,
  calculateUploadedFolderPrice,
  calculateAdditionalOrderPrice,
} from '@/stores/multi-folder-upload-store';

interface FolderCardProps {
  folder: UploadedFolder;
  thumbnailCollapsed?: boolean; // 외부에서 일괄 제어
}

// 상태별 스타일 및 메시지
const STATUS_CONFIG: Record<FolderValidationStatus, {
  borderColor: string;
  bgColor: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  badgeColor: string;
  icon: React.ReactNode;
  label: string;
}> = {
  PENDING: {
    borderColor: 'border-gray-300',
    bgColor: 'bg-white',
    badgeVariant: 'outline',
    badgeColor: 'text-gray-500',
    icon: null,
    label: '분석 중...',
  },
  EXACT_MATCH: {
    borderColor: 'border-green-500',
    bgColor: 'bg-green-50/50',
    badgeVariant: 'default',
    badgeColor: 'bg-transparent text-gray-900 border-0 shadow-none',
    icon: <CheckCircle className="w-4 h-4 text-green-500" />,
    label: '정상',
  },
  RATIO_MATCH: {
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-50/50',
    badgeVariant: 'secondary',
    badgeColor: 'bg-amber-500 text-white',
    icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    label: '비율일치',
  },
  RATIO_MISMATCH: {
    borderColor: 'border-red-500',
    bgColor: 'bg-red-50/50',
    badgeVariant: 'destructive',
    badgeColor: 'bg-red-500',
    icon: <XCircle className="w-4 h-4 text-red-500" />,
    label: '비율불일치',
  },
};

// 표지 타입별 배지 색상
const COVER_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  FRONT_COVER: { label: '첫장', className: 'bg-blue-500 text-white' },
  BACK_COVER: { label: '막장', className: 'bg-purple-500 text-white' },
  INNER_PAGE: { label: '내지', className: 'bg-gray-200 text-gray-700' },
  COMBINED_COVER: { label: '첫막장', className: 'bg-pink-500 text-white' },
};

// 펼침면에서 각 파일의 좌/우 실제 페이지 번호 계산
function getSpreadPageNumbers(
  fileIndex: number,
  totalFiles: number,
  direction: BindingDirection | null
): { left: number | null; right: number | null } {
  const dir = direction || 'LEFT_START_RIGHT_END';

  switch (dir) {
    case 'LEFT_START_RIGHT_END':
      // 좌시작→우끝: 모든 페이지 채워짐
      return { left: fileIndex * 2 + 1, right: fileIndex * 2 + 2 };

    case 'LEFT_START_LEFT_END':
      // 좌시작→좌끝: 마지막 이미지 오른쪽이 빈페이지
      if (fileIndex === totalFiles - 1) {
        return { left: fileIndex * 2 + 1, right: null };
      }
      return { left: fileIndex * 2 + 1, right: fileIndex * 2 + 2 };

    case 'RIGHT_START_LEFT_END':
      // 우시작→좌끝: 첫 이미지 왼쪽 빈, 마지막 이미지 오른쪽 빈
      if (fileIndex === 0) {
        return { left: null, right: 1 };
      }
      if (fileIndex === totalFiles - 1 && totalFiles > 1) {
        return { left: fileIndex * 2, right: null };
      }
      return { left: fileIndex * 2, right: fileIndex * 2 + 1 };

    case 'RIGHT_START_RIGHT_END':
      // 우시작→우끝: 첫 이미지 왼쪽이 빈페이지
      if (fileIndex === 0) {
        return { left: null, right: 1 };
      }
      return { left: fileIndex * 2, right: fileIndex * 2 + 1 };
  }
}

const ZOOM_SCALES = [1, 1.5, 2, 3];

export function FolderCard({ folder, thumbnailCollapsed }: FolderCardProps) {
  const t = useTranslations('folder');
  const tc = useTranslations('common');


  // Status labels (translated)
  const statusLabels: Record<FolderValidationStatus, string> = {
    PENDING: tc('analyzing'),
    EXACT_MATCH: tc('normal'),
    RATIO_MATCH: t('ratioMatch'),
    RATIO_MISMATCH: t('ratioMismatch'),
  };

  // Cover type labels (translated)
  const coverLabels: Record<string, string> = {
    FRONT_COVER: t('frontCover'),
    BACK_COVER: t('backCover'),
    INNER_PAGE: t('innerPage'),
    COMBINED_COVER: t('combinedCover'),
  };

  // 동판정보 드롭다운 데이터
  const { data: copperPlateLabels } = useCopperPlateLabels();
  const { data: allPublicCopperPlates } = usePublicCopperPlates({ status: 'active' });
  const { user, isAuthenticated } = useAuthStore();
  const { data: ownedCopperPlates } = useCopperPlatesByClient(isAuthenticated ? user?.clientId : undefined);

  const availablePlateNames = useMemo(() => {
    const names = new Set<string>();
    allPublicCopperPlates?.data?.forEach(p => names.add(p.plateName));
    ownedCopperPlates?.forEach(p => names.add(p.plateName));
    return Array.from(names);
  }, [allPublicCopperPlates, ownedCopperPlates]);

  const cardRef = useRef<HTMLDivElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(folder.orderTitle);
  const [isThumbnailOpen, setIsThumbnailOpen] = useState(true);
  const [fabricPickerOrderId, setFabricPickerOrderId] = useState<string | null>(null);
  const [fabricPickerFolderId, setFabricPickerFolderId] = useState<string | null>(null);

  // 외부 일괄 접기/펼치기 반영
  useEffect(() => {
    if (thumbnailCollapsed !== undefined) {
      setIsThumbnailOpen(!thumbnailCollapsed);
    }
  }, [thumbnailCollapsed]);
  const [previewImage, setPreviewImage] = useState<{ url: string; fileName: string; index: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0); // Index of ZOOM_SCALES
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 }); // 드래그 시작 시 화면 좌표 (Threshold 체크용)
  const hasDraggedRef = useRef(false); // 드래그 여부 체크용 (ref로 관리하여 React 배칭 이슈 방지)
  const [focusPoint, setFocusPoint] = useState({ x: 0.5, y: 0.5 }); // 이미지 내 포커스 좌표 (0~1)
  const isZoomed = zoomLevel > 0;
  const [fullSizeUrls, setFullSizeUrls] = useState<Map<string, string>>(new Map());
  const imageRef = useRef<HTMLImageElement>(null);

  // 풀사이즈 URL 생성 (미리보기 모달 열 때만 lazy 로드)
  const getFullSizeUrl = useCallback((file: typeof folder.files[0]): string | undefined => {
    if (file.canvasDataUrl) return file.canvasDataUrl;
    return fullSizeUrls.get(file.id);
  }, [fullSizeUrls]);

  // Cleanup 풀사이즈 URL
  useEffect(() => {
    return () => {
      fullSizeUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // 이미지 네비게이션
  const resetZoom = () => {
    setZoomLevel(0);
    setZoomPos({ x: 0, y: 0 });
    setFocusPoint({ x: 0.5, y: 0.5 });
  };

  // 풀사이즈 URL을 가져오거나 생성
  const getOrCreateFullSizeUrl = useCallback((file: typeof folder.files[0]): string | null => {
    if (file.canvasDataUrl) return file.canvasDataUrl;
    const existing = fullSizeUrls.get(file.id);
    if (existing) return existing;
    if (file.file) {
      const url = URL.createObjectURL(file.file);
      setFullSizeUrls(prev => new Map(prev).set(file.id, url));
      return url;
    }
    return null;
  }, [fullSizeUrls]);

  const handlePrevImage = () => {
    if (!previewImage) return;
    resetZoom();
    const newIndex = previewImage.index > 0 ? previewImage.index - 1 : folder.files.length - 1;
    const file = folder.files[newIndex];
    const url = getOrCreateFullSizeUrl(file);
    if (url) {
      setPreviewImage({ url, fileName: file.fileName, index: newIndex });
    }
  };

  const handleNextImage = () => {
    if (!previewImage) return;
    resetZoom();
    const newIndex = previewImage.index < folder.files.length - 1 ? previewImage.index + 1 : 0;
    const file = folder.files[newIndex];
    const url = getOrCreateFullSizeUrl(file);
    if (url) {
      setPreviewImage({ url, fileName: file.fileName, index: newIndex });
    }
  };

  // 줌 이미지 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!previewImage) return;
    // 우클릭은 드래그 시작 안함 (줌아웃용)
    if (e.button === 2) return;

    if (isZoomed) {
      e.preventDefault();
      setIsDragging(true);
      hasDraggedRef.current = false;
      setDragStart({ x: e.clientX - zoomPos.x, y: e.clientY - zoomPos.y });
      setDragStartPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isZoomed) return;

    // 드래그 거리 체크 (5px 이상 움직여야 드래그로 인정)
    const distance = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
    if (distance > 5) {
      hasDraggedRef.current = true;
    }

    setZoomPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 커서 중심 줌 기능 (focusPoint + zoomLevel만 설정, 실제 위치는 useLayoutEffect에서 계산)
  const handleZoom = (clientX: number, clientY: number, direction: 'in' | 'out') => {
    if (!imageRef.current) return;

    let newLevel = zoomLevel + (direction === 'in' ? 1 : -1);

    // 범위 체크
    if (newLevel < 0) newLevel = 0;
    if (newLevel >= ZOOM_SCALES.length) newLevel = ZOOM_SCALES.length - 1;

    if (newLevel === zoomLevel) return;

    if (newLevel === 0) {
      setZoomLevel(0);
      setZoomPos({ x: 0, y: 0 });
      setFocusPoint({ x: 0.5, y: 0.5 });
      return;
    }

    const rect = imageRef.current.getBoundingClientRect();

    // 클릭 위치의 이미지 내 상대 좌표 (0~1) 계산
    const percentX = (clientX - rect.left) / rect.width;
    const percentY = (clientY - rect.top) / rect.height;

    // focusPoint + zoomLevel 설정 → useLayoutEffect가 zoomPos 계산
    setFocusPoint({ x: percentX, y: percentY });
    setZoomLevel(newLevel);
  };

  // 줌 버튼 클릭 핸들러 (focusPoint + zoomLevel만 설정, 실제 위치는 useLayoutEffect에서 계산)
  const handleZoomButtonClick = (level: number) => {
    if (level === 0) {
      setZoomLevel(0);
      setZoomPos({ x: 0, y: 0 });
      setFocusPoint({ x: 0.5, y: 0.5 });
      return;
    }

    // 이미 줌 상태: 현재 뷰포트 중심을 focusPoint로 역산
    if (zoomLevel > 0 && imageRef.current) {
      const container = imageRef.current.parentElement;
      const containerWidth = container?.clientWidth || 0;
      const ratio = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
      const curWidth = containerWidth * ZOOM_SCALES[zoomLevel];
      const curHeight = curWidth / ratio;
      setFocusPoint({
        x: 0.5 - zoomPos.x / curWidth,
        y: 0.5 - zoomPos.y / curHeight,
      });
    }
    // else: 원본에서 줌 → 기존 focusPoint 사용 (기본값 0.5, 0.5)

    setZoomLevel(level);
  };

  // 다이얼로그 리사이즈 후 실제 컨테이너 크기 기반으로 zoomPos 계산
  useLayoutEffect(() => {
    if (zoomLevel === 0 || !imageRef.current) return;

    const container = imageRef.current.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const ratio = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
    if (!ratio || !containerWidth) return;

    const curWidth = containerWidth * ZOOM_SCALES[zoomLevel];
    const curHeight = curWidth / ratio;

    setZoomPos({
      x: -(curWidth * (focusPoint.x - 0.5)),
      y: -(curHeight * (focusPoint.y - 0.5)),
    });
  }, [zoomLevel, focusPoint.x, focusPoint.y]);

  // 드래그 앤 드롭 상태
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const {
    setFolderTitle,
    setFolderQuantity,
    setFolderSelected,
    approveFolder,
    removeFolder,
    addAdditionalOrder,
    removeAdditionalOrder,
    updateAdditionalOrderQuantity,
    updateAdditionalOrderSpec,
    updateAdditionalOrderFabric,
    updateAdditionalOrderPrint,
    updateAdditionalOrderFoil,
    changeFolderSpec,
    setFolderPageLayout,
    setFolderBindingDirection,
    reorderFolderFiles,
    updateFolder,
    setFolderFabric,
    availablePapers,
  } = useMultiFolderUploadStore();

  // 현재 폴더의 출력방법/도수에 맞는 용지 필터링
  const filteredPapersForFolder = useMemo(() => {
    if (!folder.printMethod || availablePapers.length === 0) return [];
    return availablePapers.filter(p => {
      if (p.printMethod !== folder.printMethod) return false;
      if (p.printMethod === 'indigo') {
        return folder.colorMode === '6c' ? p.isActive6 !== false : p.isActive4 !== false;
      }
      return p.isActive !== false;
    });
  }, [availablePapers, folder.printMethod, folder.colorMode]);

  const config = STATUS_CONFIG[folder.validationStatus];
  const actualStatus = folder.isApproved && folder.validationStatus === 'RATIO_MATCH'
    ? STATUS_CONFIG.EXACT_MATCH
    : config;

  const hasValidStatus =
    folder.validationStatus === 'EXACT_MATCH' ||
    (folder.validationStatus === 'RATIO_MATCH' && folder.isApproved);

  const canSelect = hasValidStatus && folder.specFoundInDB !== false;

  // 가격 계산
  const folderPrice = useMemo(() => calculateUploadedFolderPrice(folder), [folder]);

  const handleSaveTitle = () => {
    setFolderTitle(folder.id, editTitle);
    setIsEditingTitle(false);
  };


  return (
    <div
      ref={cardRef}
      className={cn(
        'rounded-lg border-2 p-4 transition-all',
        actualStatus.borderColor,
        actualStatus.bgColor
      )}
    >
      {/* CMYK 파일 경고 */}
      {(() => {
        const cmykFiles = folder.files.filter(f => f.colorSpace === 'CMYK');
        if (cmykFiles.length === 0) return null;
        return (
          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-red-700 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              CMYK 컬러 모드 파일 감지 ({cmykFiles.length}개)
            </div>
            <div className="mt-1 text-xs text-red-600">
              <p>인쇄용으로는 RGB 컬러 모드를 권장합니다. CMYK 파일은 색상이 다르게 출력될 수 있습니다.</p>
              <p className="mt-1">CMYK 파일: {cmykFiles.map(f => f.fileName).join(', ')}</p>
            </div>
          </div>
        );
      })()}

      {/* 비율 불일치 경고 */}
      {folder.validationStatus === 'RATIO_MISMATCH' && (
        <div className="mt-3 p-3 bg-red-100 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-2">
            <XCircle className="h-4 w-4" />
            {t('rejectMismatchFiles', { count: folder.ratioMismatchCount })}
          </div>
          <div className="bg-white rounded border border-red-200 text-xs max-h-32 overflow-y-auto">
            {folder.mismatchFiles.slice(0, 10).map((file) => (
              <div key={file.id} className="px-2 py-1 border-b last:border-b-0 flex justify-between">
                <span className="truncate">{file.newFileName || file.fileName}</span>
                <span className="text-gray-500 ml-2">
                  {file.widthPx}×{file.heightPx} ({file.widthInch}×{file.heightInch}{tc('inch')}) {file.dpi}dpi
                </span>
              </div>
            ))}
            {folder.mismatchFiles.length > 10 && (
              <div className="px-2 py-1 text-gray-500 text-center">
                {t('andMoreItems', { count: folder.mismatchFiles.length - 10 })}
              </div>
            )}
          </div>
          <p className="text-xs text-red-600 mt-2">
            {t('rejectGuide')}
          </p>
        </div>
      )}

      {/* 비율 일치 승인 요청 */}
      {folder.validationStatus === 'RATIO_MATCH' && !folder.isApproved && (
        <div className="mt-3 p-3 bg-amber-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                {t('ratioMatchButDifferent')}
              </div>
              <p className="text-xs text-amber-600 mt-1">
                {t('ratioMatchAutoAdjust', { current: folder.albumLabel, standard: folder.specLabel })}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => approveFolder(folder.id)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {t('confirmAndApprove')}
            </Button>
          </div>
        </div>
      )}

      {/* 썸네일 미리보기 (접기/펼치기) */}
      <Collapsible open={isThumbnailOpen} onOpenChange={setIsThumbnailOpen} className="mt-3">
        <div className="flex items-center gap-1">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs flex items-center">
              <span className="flex items-center gap-1 flex-1">
                <ImageIcon className="h-3 w-3" />
                {t('thumbnailPreviewCount', { count: folder.files.length })}
                <Badge className={cn('flex items-center gap-1 text-[10px]', actualStatus.badgeColor)}>
                  {actualStatus.icon}
                  <span>
                    {folder.isApproved && folder.validationStatus === 'RATIO_MATCH' ? t('normalOrder') : statusLabels[folder.validationStatus]}
                  </span>
                </Badge>
              </span>
              {isThumbnailOpen ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          {(() => {
            // 썸네일 1개 렌더링 함수
            const renderThumbnail = (file: typeof folder.files[0], index: number) => {
              const thumbUrl = file.thumbnailUrl;
              const aspectRatio = file.widthPx > 0 && file.heightPx > 0
                ? (file.heightPx / file.widthPx) * 100
                : 133;
              return (
                <div key={file.id}
                    className={cn(
                      'flex flex-col transition-all',
                      dragIndex === index && 'opacity-40 scale-95',
                      dropIndex === index && dragIndex !== null && dragIndex !== index && 'ring-2 ring-blue-400 rounded-md'
                    )}
                    draggable
                    onDragStart={(e) => {
                      setDragIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                      const target = e.currentTarget;
                      if (target) {
                        e.dataTransfer.setDragImage(target, target.offsetWidth / 2, 20);
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragIndex !== null && dragIndex !== index) {
                        setDropIndex(index);
                      }
                    }}
                    onDragLeave={() => setDropIndex(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIndex !== null && dragIndex !== index) {
                        reorderFolderFiles(folder.id, dragIndex, index);
                      }
                      setDragIndex(null);
                      setDropIndex(null);
                    }}
                    onDragEnd={() => { setDragIndex(null); setDropIndex(null); }}
                  >
                    <div
                      className={cn(
                        'relative rounded-t-md overflow-hidden border-2 cursor-grab group',
                        'hover:border-blue-400 hover:shadow-md transition-all',
                        file.status === 'RATIO_MISMATCH' ? 'border-red-500 border-[3px]' :
                          file.coverType === 'FRONT_COVER' ? 'border-blue-400' :
                            file.coverType === 'BACK_COVER' ? 'border-purple-400' :
                              file.coverType === 'COMBINED_COVER' ? 'border-pink-400' :
                                'border-gray-200'
                      )}
                      style={{ paddingTop: `${aspectRatio}%` }}
                      onClick={() => {
                        const fullUrl = getFullSizeUrl(file);
                        if (fullUrl) {
                          setPreviewImage({ url: fullUrl, fileName: file.fileName, index });
                        } else if (file.file) {
                          const url = URL.createObjectURL(file.file);
                          setFullSizeUrls(prev => new Map(prev).set(file.id, url));
                          setPreviewImage({ url, fileName: file.fileName, index });
                        }
                      }}
                    >
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={file.fileName} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
                          <span className="text-6xl font-black text-gray-300">X</span>
                        </div>
                      )}
                      {folder.pageLayout === 'spread' ? (() => {
                        const pages = getSpreadPageNumbers(index, folder.files.length, folder.bindingDirection);
                        return (
                          <>
                            <div className={cn('absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium', pages.left !== null ? 'bg-red-600' : 'bg-yellow-500')}>
                              {pages.left !== null ? pages.left : t('blank')}
                            </div>
                            <div className={cn('absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium', pages.right !== null ? 'bg-red-600' : 'bg-yellow-500')}>
                              {pages.right !== null ? pages.right : t('blank')}
                            </div>
                          </>
                        );
                      })() : (
                        <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center bg-red-600 text-white text-[10px] font-medium">
                          {file.pageNumber}
                        </div>
                      )}
                      {folder.colorGroupingEnabled && file.colorInfo && (
                        <div className="absolute bottom-1 right-1">
                          <ColorGroupBadge colorInfo={file.colorInfo} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className={cn(
                      'text-[9px] leading-tight p-1 border border-t-0 rounded-b-md',
                      file.status === 'RATIO_MISMATCH' ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'
                    )}>
                      <div className="truncate font-medium" title={file.newFileName || file.fileName}>{file.newFileName || file.fileName}</div>
                      {folder.pageLayout === 'single' ? (
                        <>
                          <div className="text-gray-500 truncate">{file.widthInch}×{file.heightInch}"</div>
                          <div className="text-gray-500 flex items-center gap-0.5 min-w-0">
                            <span className="shrink-0">{file.dpi}dpi</span>
                            {file.colorSpace && (
                              <span className={cn(
                                'inline-block px-1 py-0 rounded text-[8px] font-medium',
                                file.colorSpace === 'CMYK' ? 'bg-red-100 text-red-700 border border-red-300' :
                                  file.colorSpace === 'sRGB' || file.colorSpace === 'RGB' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-600'
                              )}>
                                {file.colorSpace}
                              </span>
                            )}
                            <span className={cn(
                              'inline-block px-1 py-0 rounded text-[8px] font-medium ml-auto',
                              file.status === 'EXACT' ? 'bg-green-100 text-green-700' :
                                file.status === 'RATIO_MATCH' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                            )}>
                              {file.status === 'EXACT' ? t('exact') : file.status === 'RATIO_MATCH' ? t('ratioMatch') : t('mismatch')}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-500 flex items-center gap-0.5 min-w-0">
                          <span className="truncate shrink">{file.widthInch}×{file.heightInch}" | {file.dpi}dpi</span>
                          {file.colorSpace && (
                            <span className={cn(
                              'inline-block px-1 py-0 rounded text-[8px] font-medium',
                              file.colorSpace === 'CMYK' ? 'bg-red-100 text-red-700 border border-red-300' :
                                file.colorSpace === 'sRGB' || file.colorSpace === 'RGB' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-600'
                            )}>
                              {file.colorSpace}
                            </span>
                          )}
                          <span className={cn(
                            'inline-block px-1 py-0 rounded text-[8px] font-medium ml-auto',
                            file.status === 'EXACT' ? 'bg-green-100 text-green-700' :
                              file.status === 'RATIO_MATCH' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                          )}>
                            {file.status === 'EXACT' ? t('exact') : file.status === 'RATIO_MATCH' ? t('ratioMatch') : t('mismatch')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
              );
            };

            // 낱장: 2p씩 묶어서 외각박스 + 가상 빈페이지 표시
            if (folder.pageLayout === 'single') {
              const dir = folder.bindingDirection || 'LEFT_START_RIGHT_END';
              const startsRight = dir.startsWith('RIGHT');
              const totalFiles = folder.files.length;
              const isOdd = totalFiles % 2 === 1;
              // Rule 4: 홀수+우시작→우끝, 홀수+좌시작→좌끝
              // Rule 5: 짝수+우시작→좌끝, 짝수+좌시작→우끝

              // 기본 종횡비 (첫 파일 기준)
              const defaultAspect = folder.files[0]
                ? (folder.files[0].heightPx / folder.files[0].widthPx) * 100
                : 133;

              // 빈페이지 슬롯 렌더링
              const renderBlankSlot = () => (
                <div className="flex flex-col">
                  <div
                    className="relative rounded-md border-2 border-dashed border-blue-400 bg-blue-50/20"
                    style={{ paddingTop: `${defaultAspect}%` }}
                  />
                </div>
              );

              // 스프레드(2p) 구성
              type SpreadSlot = { type: 'page'; fileIndex: number } | { type: 'blank' };
              const spreads: Array<{ left: SpreadSlot; right: SpreadSlot }> = [];
              let i = 0;

              if (startsRight && totalFiles > 0) {
                // Rule 1: 우시작 → 첫 페이지 왼쪽에 빈페이지
                spreads.push({
                  left: { type: 'blank' },
                  right: { type: 'page', fileIndex: 0 },
                });
                i = 1;
              }

              while (i < totalFiles) {
                if (i + 1 < totalFiles) {
                  spreads.push({
                    left: { type: 'page', fileIndex: i },
                    right: { type: 'page', fileIndex: i + 1 },
                  });
                  i += 2;
                } else {
                  // Rule 2: 왼쪽 끝 → 오른쪽에 빈페이지
                  spreads.push({
                    left: { type: 'page', fileIndex: i },
                    right: { type: 'blank' },
                  });
                  i++;
                }
              }

              return (
                <div className="grid grid-cols-6 gap-3 p-2 bg-gray-50 rounded-lg border">
                  {spreads.map((spread, spreadIdx) => {
                    const leftFile = spread.left.type === 'page' ? folder.files[spread.left.fileIndex] : null;
                    const rightFile = spread.right.type === 'page' ? folder.files[spread.right.fileIndex] : null;
                    const hasBoth = !!leftFile && !!rightFile;
                    const label = hasBoth
                      ? `S${spreadIdx + 1} (p${leftFile!.pageNumber}-${rightFile!.pageNumber})`
                      : leftFile
                        ? `p${leftFile.pageNumber}`
                        : rightFile
                          ? `p${rightFile.pageNumber}`
                          : '';

                    return (
                      <div
                        key={spreadIdx}
                        className={cn(
                          'border-2 border-dashed rounded-lg p-1',
                          !hasBoth ? 'border-yellow-400 bg-yellow-50/30' : 'border-orange-300 bg-orange-50/20'
                        )}
                      >
                        <div className="text-[8px] text-center text-orange-500 mb-0.5 font-medium">
                          {label}
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {spread.left.type === 'page'
                            ? renderThumbnail(folder.files[spread.left.fileIndex], spread.left.fileIndex)
                            : renderBlankSlot()}
                          {spread.right.type === 'page'
                            ? renderThumbnail(folder.files[spread.right.fileIndex], spread.right.fileIndex)
                            : renderBlankSlot()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            // 펼침면: 6열
            return (
              <div className="grid gap-2 p-2 bg-gray-50 rounded-lg border grid-cols-6">
                {folder.files.map((file, index) => renderThumbnail(file, index))}
              </div>
            );
          })()}
        </CollapsibleContent>
      </Collapsible>

      {/* 헤더 (체크박스 + 제목 + 가격) */}
      <div className="flex items-start gap-3 mt-3">
        {/* 체크박스 */}
        <div className="pt-1" title={!canSelect && folder.specFoundInDB === false ? 'DB에 등록된 규격이 없어 주문할 수 없습니다' : undefined}>
          <Checkbox
            checked={folder.isSelected}
            disabled={!canSelect}
            onCheckedChange={(checked) => setFolderSelected(folder.id, !!checked)}
            className={cn(
              'h-5 w-5',
              canSelect ? 'data-[state=checked]:bg-green-600' : 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>

        {/* 폴더 아이콘 */}
        <Folder className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />

        {/* 제목 및 정보 */}
        <div className="flex-1 min-w-0">
          {/* 제목 행 */}
          <div className="flex items-center gap-2 mb-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveTitle}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditingTitle(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <span className="font-normal text-black text-[12pt] truncate">{folder.orderTitle}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    setEditTitle(folder.orderTitle);
                    setIsEditingTitle(true);
                  }}
                >
                  <Edit2 className="h-3 w-3 text-gray-400" />
                </Button>
              </>
            )}


          </div>
          {/* 편집 · 제본 (한 줄) */}
          <div className="flex items-center gap-2 text-xs text-gray-600 mt-1 mb-1 flex-wrap">
            <span className="text-xs text-black">편집</span>
            <div className="flex border rounded overflow-hidden">
              <button
                type="button"
                onClick={() => setFolderPageLayout(folder.id, 'single')}
                className={cn(
                  'px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 transition-colors',
                  folder.pageLayout === 'single'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                )}
              >
                <FileText className="w-2.5 h-2.5" />{t('single')}
              </button>
              <button
                type="button"
                onClick={() => setFolderPageLayout(folder.id, 'spread')}
                className={cn(
                  'px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 transition-colors',
                  folder.pageLayout === 'spread'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                )}
              >
                <BookOpen className="w-2.5 h-2.5" />{t('spread')}
              </button>
            </div>
            {folder.pageLayout === 'spread' && (
              <>
                <span className="text-xs text-black ml-5">제본방향</span>
                <select
                  value={folder.bindingDirection || 'LEFT_START_RIGHT_END'}
                  onChange={(e) => setFolderBindingDirection(folder.id, e.target.value as BindingDirection)}
                  className="text-[12px] border rounded px-1.5 py-0.5 bg-white text-black"
                  aria-label="제본순서"
                >
                  <option value="LEFT_START_LEFT_END">좌시작좌끝</option>
                  <option value="LEFT_START_RIGHT_END">좌시작우끝</option>
                  <option value="RIGHT_START_LEFT_END">우시작좌끝</option>
                  <option value="RIGHT_START_RIGHT_END">우시작우끝</option>
                </select>
                {folder.autoBindingDetected && (
                  <span className="text-[9px] text-green-600 bg-green-50 px-1 rounded" title={`${t('firstPage')} ${folder.firstPageBlank ? t('blankPageLabel') : t('normalPageLabel')} / ${t('lastPage')} ${folder.lastPageBlank ? t('blankPageLabel') : t('normalPageLabel')}`}>
                    {t('autoDetected')}
                  </span>
                )}
              </>
            )}
            {folder.pageLayout === 'single' && (
              <>
                <span className="text-xs text-black ml-5">제본방향</span>
                <select
                  value={folder.bindingDirection || 'LEFT_START_RIGHT_END'}
                  onChange={(e) => setFolderBindingDirection(folder.id, e.target.value as BindingDirection)}
                  className="text-[12px] border rounded px-1.5 py-0.5 bg-white text-black"
                  aria-label="제본순서"
                >
                  <option value="LEFT_START_LEFT_END">좌시작좌끝</option>
                  <option value="LEFT_START_RIGHT_END">좌시작우끝</option>
                  <option value="RIGHT_START_LEFT_END">우시작좌끝</option>
                  <option value="RIGHT_START_RIGHT_END">우시작우끝</option>
                </select>
                {folder.autoBindingDetected && (
                  <span className="text-[9px] text-green-600 bg-green-50 px-1 rounded">
                    {t('autoDetected')}
                  </span>
                )}
              </>
            )}
            {/* 업로드 시각 + 상태 배지 */}
            {folder.uploadedAt && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <Clock className="h-3 w-3" />
                {new Date(folder.uploadedAt).toLocaleString(undefined, {
                  month: '2-digit', day: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </div>
          {/* 출력방법 · 용지 */}
          {folder.printMethod && (
            <div className="flex items-center gap-1 flex-wrap text-[10px] text-gray-500 mt-1 mb-1">
              <span className="text-xs text-black">출력</span>
              <select
                value={`${folder.printMethod}_${folder.colorMode || '4c'}`}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'inkjet') {
                    const inkjetPapers = availablePapers.filter(p => p.printMethod === 'inkjet' && p.isActive !== false);
                    const defaultPaper = inkjetPapers.find(p => p.isDefault) || inkjetPapers[0];
                    updateFolder(folder.id, {
                      printMethod: 'inkjet', colorMode: '4c',
                      selectedPaperId: defaultPaper?.id || null,
                      selectedPaperName: defaultPaper?.name || null,
                    });
                  } else {
                    const [, cm] = val.split('_') as [string, '4c' | '6c'];
                    const indigoPapers = availablePapers.filter(p =>
                      p.printMethod === 'indigo' && (cm === '6c' ? p.isActive6 !== false : p.isActive4 !== false)
                    );
                    const defaultPaper = indigoPapers.find(p => p.isDefault) || indigoPapers[0];
                    updateFolder(folder.id, {
                      printMethod: 'indigo', colorMode: cm,
                      selectedPaperId: defaultPaper?.id || null,
                      selectedPaperName: defaultPaper?.name || null,
                    });
                  }
                }}
                className="text-[12px] border rounded px-1.5 py-0.5 bg-orange-50 text-black"
              >
                {availablePapers.some(p => p.printMethod === 'indigo' && p.isActive4 !== false) && (
                  <option value="indigo_4c">인디고 4도</option>
                )}
                {availablePapers.some(p => p.printMethod === 'indigo' && p.isActive6 !== false) && (
                  <option value="indigo_6c">인디고 6도</option>
                )}
                {availablePapers.some(p => p.printMethod === 'inkjet' && p.isActive !== false) && (
                  <option value="inkjet">잉크젯</option>
                )}
              </select>
              <span className="text-xs text-black ml-3">용지</span>
              <select
                value={folder.selectedPaperId ?? ''}
                onChange={(e) => {
                  const paper = availablePapers.find(p => p.id === e.target.value);
                  if (paper) {
                    updateFolder(folder.id, {
                      selectedPaperId: paper.id,
                      selectedPaperName: paper.name,
                    });
                  }
                }}
                className="text-[12px] border rounded px-1.5 py-0.5 bg-emerald-50 text-black"
              >
                {filteredPapersForFolder.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* 패브릭/포일 편집 */}
          {(folder.selectedFabricName || folder.foilName || folder.foilColor || folder.foilPosition) && (
            <div className="flex items-center gap-1 flex-wrap text-[10px] text-gray-500 mt-1 mb-1">
              {/* 원단: 클릭 → FabricPickerDialog */}
              {folder.selectedFabricName && (
                <>
                  <span className="text-xs text-black">원단</span>
                  <button
                    type="button"
                    onClick={() => setFabricPickerFolderId(folder.id)}
                    className="bg-pink-50 text-black text-[12px] px-1.5 py-0.5 rounded border border-pink-200 flex items-center gap-1 hover:bg-pink-100 transition-colors"
                  >
                    <Palette className="w-2.5 h-2.5" />
                    {folder.selectedFabricName}
                  </button>
                </>
              )}
              {/* 동판: DB 데이터 기반 드롭다운 */}
              {(folder.foilName || folder.foilColor || folder.foilPosition) && (
                <>
                  <span className="text-xs text-black ml-5">동판정보</span>
                  <span className="text-[10px] text-gray-400">색상</span>
                  <select
                    value={folder.foilColor ?? ''}
                    onChange={(e) => updateFolder(folder.id, { foilColor: e.target.value || null })}
                    className="text-[12px] border rounded px-1.5 py-0.5 w-24 bg-yellow-50 text-black"
                  >
                    <option value="">색상 선택</option>
                    {copperPlateLabels?.foilColors?.filter(c => c.isActive).map(color => (
                      <option key={color.id} value={color.name}>{color.name}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-400">동판</span>
                  <select
                    value={folder.foilName ?? ''}
                    onChange={(e) => updateFolder(folder.id, { foilName: e.target.value || null })}
                    className="text-[12px] border rounded px-1.5 py-0.5 bg-violet-50 text-black"
                  >
                    <option value="">동판 선택</option>
                    {availablePlateNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-400">위치</span>
                  <select
                    value={folder.foilPosition ?? ''}
                    onChange={(e) => updateFolder(folder.id, { foilPosition: e.target.value || null })}
                    className="text-[12px] border rounded px-1.5 py-0.5 w-20 bg-blue-50 text-black"
                  >
                    <option value="">위치 선택</option>
                    {copperPlateLabels?.platePositions?.filter(p => p.isActive).map(pos => (
                      <option key={pos.id} value={pos.name}>{pos.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}
          {/* 규격 · 페이지 · 부수 */}
          {hasValidStatus && (
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="text-xs text-black">{t('specLabelShort')}</span>
              {(() => {
                const currentKey = `${folder.albumWidth}x${folder.albumHeight}`;
                const otherSizes = folder.availableSizes.filter(
                  s => `${s.width}x${s.height}` !== currentKey
                );
                if (otherSizes.length === 0) return null;
                return (
                  <select
                    value={currentKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === currentKey) return;
                      const [w, h] = val.split('x').map(Number);
                      const selectedSize = folder.availableSizes.find(s => s.width === w && s.height === h);
                      if (selectedSize) changeFolderSpec(folder.id, selectedSize);
                    }}
                    className="text-xs border rounded px-1.5 py-0.5 bg-white text-black"
                    aria-label="제작가능규격 선택"
                  >
                    <option value={currentKey}>
                      {folder.albumLabel}{!folder.specFoundInDB ? ' ⚠ DB미등록' : ''}
                    </option>
                    {otherSizes.map((size) => (
                      <option key={size.label} value={`${size.width}x${size.height}`}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                );
              })()}
              <span className="text-gray-300">|</span>
              <span className="text-xs text-black">{t('pageLabelShort')}</span>
              <span className="text-xs text-black">{folder.pageCount}p</span>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-black">{t('copiesLabel')}</span>
              <input
                type="number"
                min={1}
                max={999}
                value={folder.quantity}
                aria-label={t('copiesLabel')}
                onChange={(e) => setFolderQuantity(folder.id, Math.max(1, parseInt(e.target.value) || 1))}
                disabled={!canSelect}
                className="w-16 h-8 text-xs text-black text-center border rounded px-2 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          )}
        </div>

        {/* 가격 표시 */}
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold text-primary">
            {t('priceWon', { price: Math.round(folderPrice.totalPrice).toLocaleString() })}
          </div>
          <div className="text-[10px] text-gray-400">
            {t('priceFormulaUnit', {
              perPage: Math.round(folderPrice.pricePerPage).toLocaleString(),
              pages: folderPrice.pageCount,
              printPrice: Math.round(folderPrice.printPrice).toLocaleString(),
              cover: Math.round(folderPrice.coverPrice).toLocaleString(),
              binding: Math.round(folderPrice.bindingPrice).toLocaleString(),
              unitPrice: Math.round(folderPrice.unitPrice).toLocaleString(),
            })}
          </div>
          <div className="text-[10px] text-gray-400">
            {t('priceFormulaTotal', {
              unitPrice: folderPrice.unitPrice.toLocaleString(),
              qty: folder.quantity,
              subtotal: folderPrice.subtotal.toLocaleString(),
              tax: folderPrice.tax.toLocaleString(),
              total: folderPrice.totalPrice.toLocaleString(),
            })}
          </div>
        </div>

        {/* 삭제 버튼 */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-gray-400 hover:text-red-500"
          onClick={() => removeFolder(folder.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* 정상/승인 완료 시 - 규격 옵션 및 수량 */}
      {(canSelect || (hasValidStatus && (folder.availableSizes?.length ?? 0) > 0)) && (
        <div className="mt-3 pt-3 border-t">
          {/* 추가 주문 버튼 */}
          <div className="flex items-center justify-end">
            {(() => {
              // 메인 주문 규격 + 이미 추가된 규격 제외
              const usedKeys = new Set([
                `${folder.albumWidth}x${folder.albumHeight}`,
                ...folder.additionalOrders.map(o => `${o.albumWidth}x${o.albumHeight}`),
              ]);
              const remainingSizes = folder.availableSizes.filter(
                s => !usedKeys.has(`${s.width}x${s.height}`)
              );
              const nextSize = remainingSizes[0];
              return (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!nextSize}
                  onClick={() => {
                    if (nextSize) {
                      addAdditionalOrder(folder.id, {
                        width: nextSize.width,
                        height: nextSize.height,
                        label: nextSize.label,
                      });
                    }
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t('additionalOrder')}
                </Button>
              );
            })()}
          </div>

          {/* 추가 주문 목록 (같은 파일, 다른 규격 - 한 건의 JOB으로 묶임) */}
          {folder.additionalOrders.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-medium text-blue-700">{t('additionalOrderDescription')}</p>
                <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 ml-auto">
                  1 JOB · {1 + folder.additionalOrders.length}{t('specLabelShort')}
                </Badge>
              </div>
              <div className="space-y-2">
                {folder.additionalOrders.map((order) => {
                  const orderPrice = calculateAdditionalOrderPrice(order, folder);
                  // 메인 규격 + 다른 추가주문 규격 제외 (자기 자신은 포함)
                  const usedByOthers = new Set([
                    `${folder.albumWidth}x${folder.albumHeight}`,
                    ...folder.additionalOrders
                      .filter(o => o.id !== order.id)
                      .map(o => `${o.albumWidth}x${o.albumHeight}`),
                  ]);
                  const selectableSizes = folder.availableSizes.filter(
                    s => !usedByOthers.has(`${s.width}x${s.height}`)
                  );
                  return (
                    <div key={order.id} className="flex items-start gap-2 bg-white rounded border border-blue-100 px-3 py-2">
                      {/* 체크박스 */}
                      <Checkbox
                        checked={folder.isSelected}
                        disabled={!canSelect}
                        onCheckedChange={(checked) => setFolderSelected(folder.id, !!checked)}
                        className="h-4 w-4 mt-0.5 data-[state=checked]:bg-blue-600 flex-shrink-0"
                      />
                      {/* 폴더 아이콘 */}
                      <Folder className="h-3 w-3 text-orange-500 mt-1 flex-shrink-0" />
                      {/* 콘텐츠 */}
                      <div className="flex-1 min-w-0">
                        {/* 폴더명 */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">{t('additionalSetOrder')}</span>
                          <span className="text-[12pt] font-normal text-black truncate">{folder.orderTitle}</span>
                        </div>
                        {/* 편집 · 제본 (읽기 전용 - 원본 따라감) */}
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1.5 flex-wrap">
                          <span className="text-xs text-black">편집</span>
                          <span className="px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 bg-blue-500 text-white rounded">
                            {folder.pageLayout === 'single'
                              ? <><FileText className="w-2.5 h-2.5" />{t('single')}</>
                              : <><BookOpen className="w-2.5 h-2.5" />{t('spread')}</>
                            }
                          </span>
                          <span className="text-xs text-black ml-5">제본방향</span>
                          <span className="text-[12px] text-black border rounded px-1.5 py-0.5 bg-gray-50">
                            {{
                              LEFT_START_LEFT_END: '좌시작좌끝',
                              LEFT_START_RIGHT_END: '좌시작우끝',
                              RIGHT_START_LEFT_END: '우시작좌끝',
                              RIGHT_START_RIGHT_END: '우시작우끝',
                            }[folder.bindingDirection || 'LEFT_START_RIGHT_END']}
                          </span>
                          {folder.autoBindingDetected && (
                            <span className="text-[9px] text-green-600 bg-green-50 px-1 rounded">
                              {t('autoDetected')}
                            </span>
                          )}
                        </div>
                        {/* 출력방법 · 용지 (개별 변경 가능) */}
                        {(order.printMethod ?? folder.printMethod) && (() => {
                          const orderPrintMethod = order.printMethod ?? folder.printMethod;
                          const orderColorMode = order.colorMode ?? folder.colorMode;
                          const filteredPapersForOrder = availablePapers.filter(p => {
                            if (p.printMethod !== orderPrintMethod) return false;
                            if (p.printMethod === 'indigo') {
                              return orderColorMode === '6c' ? p.isActive6 !== false : p.isActive4 !== false;
                            }
                            return p.isActive !== false;
                          });
                          return (
                            <div className="flex items-center gap-1 flex-wrap text-[10px] text-gray-500 mb-1">
                              <span className="text-xs text-black">출력</span>
                              <select
                                value={orderPrintMethod === 'inkjet' ? 'inkjet' : `indigo_${orderColorMode || '4c'}`}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'inkjet') {
                                    const inkjetPapers = availablePapers.filter(p => p.printMethod === 'inkjet' && p.isActive !== false);
                                    const defaultPaper = inkjetPapers.find(p => p.isDefault) || inkjetPapers[0];
                                    updateAdditionalOrderPrint(folder.id, order.id, 'inkjet', '4c', defaultPaper?.id || null, defaultPaper?.name || null);
                                  } else {
                                    const [, cm] = val.split('_') as [string, '4c' | '6c'];
                                    const indigoPapers = availablePapers.filter(p =>
                                      p.printMethod === 'indigo' && (cm === '6c' ? p.isActive6 !== false : p.isActive4 !== false)
                                    );
                                    const defaultPaper = indigoPapers.find(p => p.isDefault) || indigoPapers[0];
                                    updateAdditionalOrderPrint(folder.id, order.id, 'indigo', cm, defaultPaper?.id || null, defaultPaper?.name || null);
                                  }
                                }}
                                className="text-[12px] border rounded px-1.5 py-0.5 bg-orange-50 text-black"
                              >
                                {availablePapers.some(p => p.printMethod === 'indigo' && p.isActive4 !== false) && (
                                  <option value="indigo_4c">인디고 4도</option>
                                )}
                                {availablePapers.some(p => p.printMethod === 'indigo' && p.isActive6 !== false) && (
                                  <option value="indigo_6c">인디고 6도</option>
                                )}
                                {availablePapers.some(p => p.printMethod === 'inkjet' && p.isActive !== false) && (
                                  <option value="inkjet">잉크젯</option>
                                )}
                              </select>
                              <span className="text-xs text-black ml-3">용지</span>
                              <select
                                value={order.selectedPaperId ?? folder.selectedPaperId ?? ''}
                                onChange={(e) => {
                                  const paper = availablePapers.find(p => p.id === e.target.value);
                                  if (paper) {
                                    updateAdditionalOrderPrint(folder.id, order.id, orderPrintMethod!, orderColorMode || '4c', paper.id, paper.name);
                                  }
                                }}
                                className="text-[12px] border rounded px-1.5 py-0.5 bg-emerald-50 text-black"
                              >
                                {filteredPapersForOrder.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}
                        {/* 패브릭/포일 편집 */}
                        {(order.selectedFabricName ?? folder.selectedFabricName ?? order.foilName ?? folder.foilName ?? order.foilColor ?? folder.foilColor) && (
                          <div className="flex items-center gap-1 flex-wrap text-[10px] text-gray-500 mb-1">
                            {/* 원단: 클릭 → FabricPickerDialog */}
                            {(order.selectedFabricName ?? folder.selectedFabricName) && (
                              <>
                                <span className="text-xs text-black">원단</span>
                                <button
                                  type="button"
                                  onClick={() => setFabricPickerOrderId(order.id)}
                                  className="bg-pink-50 text-black text-[12px] px-1.5 py-0.5 rounded border border-pink-200 flex items-center gap-1 hover:bg-pink-100 transition-colors"
                                >
                                  <Palette className="w-2.5 h-2.5" />
                                  {order.selectedFabricName ?? folder.selectedFabricName}
                                </button>
                              </>
                            )}
                            {/* 동판: DB 데이터 기반 드롭다운 */}
                            {(order.foilColor ?? folder.foilColor ?? order.foilName ?? folder.foilName ?? order.foilPosition ?? folder.foilPosition) && (
                              <>
                                <span className="text-xs text-black ml-5">동판정보</span>
                                <span className="text-[10px] text-gray-400">색상</span>
                                <select
                                  value={order.foilColor ?? folder.foilColor ?? ''}
                                  onChange={(e) => updateAdditionalOrderFoil(folder.id, order.id, order.foilName ?? folder.foilName ?? null, e.target.value || null, order.foilPosition ?? folder.foilPosition ?? null)}
                                  className="text-[12px] border rounded px-1.5 py-0.5 w-24 bg-yellow-50 text-black"
                                >
                                  <option value="">색상 선택</option>
                                  {copperPlateLabels?.foilColors?.filter(c => c.isActive).map(color => (
                                    <option key={color.id} value={color.name}>{color.name}</option>
                                  ))}
                                </select>
                                <span className="text-[10px] text-gray-400">동판</span>
                                <select
                                  value={order.foilName ?? folder.foilName ?? ''}
                                  onChange={(e) => updateAdditionalOrderFoil(folder.id, order.id, e.target.value || null, order.foilColor ?? folder.foilColor ?? null, order.foilPosition ?? folder.foilPosition ?? null)}
                                  className="text-[12px] border rounded px-1.5 py-0.5 bg-violet-50 text-black"
                                >
                                  <option value="">동판 선택</option>
                                  {availablePlateNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                                <span className="text-[10px] text-gray-400">위치</span>
                                <select
                                  value={order.foilPosition ?? folder.foilPosition ?? ''}
                                  onChange={(e) => updateAdditionalOrderFoil(folder.id, order.id, order.foilName ?? folder.foilName ?? null, order.foilColor ?? folder.foilColor ?? null, e.target.value || null)}
                                  className="text-[12px] border rounded px-1.5 py-0.5 w-20 bg-blue-50 text-black"
                                >
                                  <option value="">위치 선택</option>
                                  {copperPlateLabels?.platePositions?.filter(p => p.isActive).map(pos => (
                                    <option key={pos.id} value={pos.name}>{pos.name}</option>
                                  ))}
                                </select>
                              </>
                            )}
                          </div>
                        )}
                        {/* 규격 · 페이지 · 부수 */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-black">{t('specLabelShort')}</span>
                            <select
                              value={`${order.albumWidth}x${order.albumHeight}`}
                              onChange={(e) => {
                                const [w, h] = e.target.value.split('x').map(Number);
                                const selectedSize = folder.availableSizes.find(
                                  (s) => s.width === w && s.height === h
                                );
                                if (selectedSize) {
                                  updateAdditionalOrderSpec(folder.id, order.id, selectedSize);
                                }
                              }}
                              className="text-xs text-black border rounded px-2 py-0.5 bg-white font-normal"
                              aria-label={t('additionalOrderSpec')}
                            >
                              {selectableSizes.map((size) => (
                                <option key={size.label} value={`${size.width}x${size.height}`}>
                                  {size.label}
                                </option>
                              ))}
                            </select>
                            <span className="text-gray-300">|</span>
                            <span className="text-xs text-black">{t('pageLabelShort')}</span>
                            <span className="text-xs text-black">{folder.pageCount}p</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-xs text-black">{t('copiesLabelShort')}</span>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={order.quantity}
                              aria-label={t('copiesLabelShort')}
                              onChange={(e) => updateAdditionalOrderQuantity(folder.id, order.id, Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 h-8 text-xs text-black text-center border rounded px-2"
                            />
                            {/* 같은 비율 앨범규격 - hidden (드롭다운과 중복) */}
                            {false && selectableSizes.length > 1 && (
                              <div className="flex items-center gap-1 ml-2">
                                {selectableSizes.map((size) => (
                                  <button
                                    key={size.label}
                                    type="button"
                                    onClick={() => updateAdditionalOrderSpec(folder.id, order.id, size)}
                                    className={cn(
                                      'px-1.5 py-0.5 text-[9px] rounded border transition-colors',
                                      order.albumWidth === size.width && order.albumHeight === size.height
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                    )}
                                  >
                                    {size.label}
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                      {/* 가격 */}
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-bold text-primary">{t('priceWon', { price: orderPrice.totalPrice.toLocaleString() })}</span>
                        <div className="text-[10px] text-gray-400">
                          {t('priceFormulaUnit', {
                            perPage: orderPrice.pricePerPage.toLocaleString(),
                            pages: orderPrice.pageCount,
                            printPrice: orderPrice.printPrice.toLocaleString(),
                            cover: orderPrice.coverPrice.toLocaleString(),
                            binding: orderPrice.bindingPrice.toLocaleString(),
                            unitPrice: orderPrice.unitPrice.toLocaleString(),
                          })}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {t('priceFormulaTotal', {
                            unitPrice: orderPrice.unitPrice.toLocaleString(),
                            qty: order.quantity,
                            subtotal: orderPrice.subtotal.toLocaleString(),
                            tax: orderPrice.tax.toLocaleString(),
                            total: orderPrice.totalPrice.toLocaleString(),
                          })}
                        </div>
                      </div>
                      {/* 삭제 버튼 */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-400 hover:text-red-500 flex-shrink-0"
                        onClick={() => removeAdditionalOrder(folder.id, order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 승인·닫기 버튼 (하단) */}
      {isThumbnailOpen && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsThumbnailOpen(false);
              if (canSelect && !folder.isSelected) {
                setFolderSelected(folder.id, true);
              }
              setTimeout(() => {
                cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }}
            className="text-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            {t('approve')} • {tc('close')}
          </Button>
        </div>
      )}

      {/* 이미지 미리보기 모달 */}
      <Dialog open={!!previewImage} onOpenChange={(open) => { if (!open) { setPreviewImage(null); resetZoom(); } }}>
        <DialogContent className={cn(
          'p-0 overflow-hidden transition-all',
          isZoomed ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-4xl max-h-[90vh]'
        )}>
          <DialogHeader className="p-3 border-b bg-white">
            <DialogTitle className="text-sm flex items-center gap-2">
              {previewImage && (
                <>
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                    {previewImage.index + 1} / {folder.files.length}
                  </span>
                  <span className="truncate">{previewImage.fileName}</span>
                  {folder.files[previewImage.index]?.coverType !== 'INNER_PAGE' && (
                    <Badge className={cn(
                      'text-[10px]',
                      COVER_TYPE_BADGE[folder.files[previewImage.index]?.coverType]?.className
                    )}>
                      {coverLabels[folder.files[previewImage.index]?.coverType]}
                    </Badge>
                  )}
                  <div className="ml-auto flex gap-1">
                    {[
                      { level: 0, label: t('zoomOriginal') },
                      { level: 1, label: '150%' },
                      { level: 2, label: '200%' },
                      { level: 3, label: '300%' },
                    ].map(({ level, label }) => (
                      <button
                        key={level}
                        onClick={() => handleZoomButtonClick(level)}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                          zoomLevel === level ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {previewImage && (
            <div
              className={cn(
                'relative flex items-center justify-center bg-gray-100',
                isZoomed ? 'min-h-[80vh] overflow-hidden cursor-grab' : 'min-h-[400px] cursor-zoom-in',
                isDragging && 'cursor-grabbing'
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* 이전 버튼 */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/80 hover:bg-white shadow-md z-10"
                onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>

              {/* 이미지 */}
              <img
                src={previewImage.url}
                alt={previewImage.fileName}
                ref={imageRef}
                className={cn(
                  'object-contain select-none',
                  isZoomed ? 'max-w-none max-h-none' : 'max-w-full max-h-[70vh]'
                )}
                style={isZoomed ? {
                  transform: `translate(${zoomPos.x}px, ${zoomPos.y}px)`,
                  width: `${ZOOM_SCALES[zoomLevel] * 100}%`,
                  cursor: isDragging ? 'grabbing' : 'zoom-in', // 항상 돋보기 (드래그 중엔 grabbing)
                  transition: isDragging ? 'none' : 'all 0.6s ease-out'
                } : {
                  cursor: 'zoom-in',
                  transition: 'all 0.6s ease-out'
                }}
                onClick={(e) => {
                  if (hasDraggedRef.current) return; // 드래그였다면 클릭 무시
                  handleZoom(e.clientX, e.clientY, 'in');
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleZoom(e.clientX, e.clientY, 'out');
                }}
                draggable={false}
              />

              {/* 다음 버튼 */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/80 hover:bg-white shadow-md z-10"
                onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
              >
                <ChevronRightIcon className="h-8 w-8" />
              </Button>
            </div>
          )}

          {/* 하단 정보 */}
          {previewImage && folder.files[previewImage.index] && (
            <div className="p-3 border-t bg-white">
              <div className="flex items-center justify-center gap-4 text-gray-600 text-xs">
                <span>{folder.files[previewImage.index].widthPx}×{folder.files[previewImage.index].heightPx}px</span>
                <span>|</span>
                <span>{folder.files[previewImage.index].widthInch}×{folder.files[previewImage.index].heightInch}"</span>
                <span>|</span>
                <span>{folder.files[previewImage.index].dpi}dpi</span>
                {folder.files[previewImage.index].isSplit && (
                  <>
                    <span>|</span>
                    <span className="flex items-center gap-1 text-pink-500">
                      <Scissors className="w-3 h-3" />
                      {t('splitInfo', { side: folder.files[previewImage.index].splitSide ?? '' })}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 추가주문 원단 선택 다이얼로그 */}
      {fabricPickerOrderId !== null && (() => {
        const targetOrder = folder.additionalOrders.find(o => o.id === fabricPickerOrderId);
        return (
          <FabricPickerDialog
            open={true}
            onOpenChange={(open) => { if (!open) setFabricPickerOrderId(null); }}
            selectedFabricId={targetOrder?.selectedFabricId ?? folder.selectedFabricId ?? null}
            onSelect={(fabric) => {
              updateAdditionalOrderFabric(folder.id, fabricPickerOrderId, {
                id: fabric.id,
                name: fabric.name,
                thumbnail: fabric.thumbnailUrl ?? null,
                price: fabric.basePrice,
                category: fabric.category,
                colorCode: fabric.colorCode ?? null,
                colorName: fabric.colorName ?? null,
              });
              setFabricPickerOrderId(null);
            }}
          />
        );
      })()}

      {/* 기본 폴더 원단 선택 다이얼로그 */}
      {fabricPickerFolderId !== null && (
        <FabricPickerDialog
          open={true}
          onOpenChange={(open) => { if (!open) setFabricPickerFolderId(null); }}
          selectedFabricId={folder.selectedFabricId ?? null}
          onSelect={(fabric) => {
            setFolderFabric(
              folder.id,
              fabric.id,
              fabric.name,
              fabric.thumbnailUrl ?? null,
              fabric.basePrice,
              fabric.category,
              fabric.colorCode ?? null,
              fabric.colorName ?? null,
            );
            setFabricPickerFolderId(null);
          }}
        />
      )}
    </div>
  );
}
