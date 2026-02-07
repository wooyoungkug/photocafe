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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  FileImage,
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
  ArrowRight,
  Expand,
  ZoomIn,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Image as ImageIcon,
  Clock,
  Truck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { FolderShippingSection, getShippingSummary } from './folder-shipping-section';
import type { CompanyShippingInfo, OrdererShippingInfo } from '@/hooks/use-shipping-data';
import type { DeliveryPricing } from '@/hooks/use-delivery-pricing';
import {
  type UploadedFolder,
  type FolderValidationStatus,
  type PageLayoutType,
  type BindingDirection,
  type FolderShippingInfo,
  useMultiFolderUploadStore,
  calculateUploadedFolderPrice,
  calculateAdditionalOrderPrice,
} from '@/stores/multi-folder-upload-store';
import { formatFileSize } from '@/lib/album-utils';

interface FolderCardProps {
  folder: UploadedFolder;
  companyInfo?: CompanyShippingInfo | null;
  clientInfo?: OrdererShippingInfo | null;
  pricingMap?: Record<string, DeliveryPricing>;
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
    badgeColor: 'bg-green-500',
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

const ZOOM_SCALES = [1, 2, 3, 4];

export function FolderCard({ folder, companyInfo, clientInfo, pricingMap }: FolderCardProps) {
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

  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(folder.orderTitle);
  const [isThumbnailOpen, setIsThumbnailOpen] = useState(true);
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
    changeFolderSpec,
    setFolderPageLayout,
    setFolderBindingDirection,
    reorderFolderFiles,
    setFolderShipping,
  } = useMultiFolderUploadStore();

  const config = STATUS_CONFIG[folder.validationStatus];
  const actualStatus = folder.isApproved && folder.validationStatus === 'RATIO_MATCH'
    ? STATUS_CONFIG.EXACT_MATCH
    : config;

  const canSelect =
    folder.validationStatus === 'EXACT_MATCH' ||
    (folder.validationStatus === 'RATIO_MATCH' && folder.isApproved);

  // 가격 계산
  const folderPrice = useMemo(() => calculateUploadedFolderPrice(folder), [folder]);

  const handleSaveTitle = () => {
    setFolderTitle(folder.id, editTitle);
    setIsEditingTitle(false);
  };

  // 페이지 순서 배지 표시
  const getPageOrderDisplay = () => {
    const pages = folder.files.slice(0, 8); // 처음 8개만 표시
    const hasMore = folder.files.length > 8;

    return (
      <div className="flex flex-wrap gap-1 items-center">
        {pages.map((file, idx) => {
          const coverBadge = COVER_TYPE_BADGE[file.coverType];
          const isCover = file.coverType !== 'INNER_PAGE';
          return (
            <span
              key={file.id}
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                isCover ? coverBadge.className : 'bg-gray-100 text-gray-600',
                file.isSplit && 'ring-1 ring-pink-400'
              )}
              title={file.fileName}
            >
              {isCover ? coverLabels[file.coverType] : String(file.pageNumber).padStart(2, '0')}
              {file.isSplit && <Scissors className="w-2.5 h-2.5 ml-0.5" />}
            </span>
          );
        })}
        {hasMore && (
          <span className="text-xs text-gray-400">...+{folder.files.length - 8}</span>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4 transition-all',
        actualStatus.borderColor,
        actualStatus.bgColor
      )}
    >
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        {/* 체크박스 */}
        <div className="pt-1">
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
                <span className="font-medium truncate">{folder.orderTitle}</span>
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

            {/* 업로드 시각 */}
            {folder.uploadedAt && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
                <Clock className="h-3 w-3" />
                {new Date(folder.uploadedAt).toLocaleString(undefined, {
                  month: '2-digit', day: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}

            {/* 상태 배지 */}
            <Badge className={cn(folder.uploadedAt ? '' : 'ml-auto', actualStatus.badgeColor)}>
              {actualStatus.icon}
              <span className="ml-1">
                {folder.isApproved && folder.validationStatus === 'RATIO_MATCH' ? t('normalOrder') : statusLabels[folder.validationStatus]}
              </span>
            </Badge>
          </div>

          {/* 규격 · 편집 · 제본 (한 줄) */}
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1 flex-wrap">
            <span>{folder.fileSpecLabel}</span>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            {folder.availableSizes.length > 1 ? (
              <select
                value={`${folder.albumWidth}x${folder.albumHeight}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number);
                  const selectedSize = folder.availableSizes.find(
                    (s) => s.width === w && s.height === h
                  );
                  if (selectedSize) {
                    changeFolderSpec(folder.id, selectedSize);
                  }
                }}
                className="text-xs border rounded px-2 py-0.5 bg-white text-blue-600 font-medium"
                aria-label={t('albumSpecSelect')}
              >
                {folder.availableSizes.map((size) => (
                  <option key={size.label} value={`${size.width}x${size.height}`}>
                    {size.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-blue-600 font-medium">{folder.albumLabel}</span>
            )}
            <span className="text-gray-300">|</span>
            {folder.isAutoDetected && (
              <span className="text-[9px] text-blue-500 bg-blue-50 px-1 rounded">{tc('auto')}</span>
            )}
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
                <span className="text-gray-300">|</span>
                <select
                  value={folder.bindingDirection || 'LEFT_START_RIGHT_END'}
                  onChange={(e) => setFolderBindingDirection(folder.id, e.target.value as BindingDirection)}
                  className="text-[10px] border rounded px-1 py-0.5 bg-white"
                  aria-label={t('bindingSelect')}
                >
                  <option value="LEFT_START_RIGHT_END">{t('bindingLeftRight')}</option>
                  <option value="LEFT_START_LEFT_END">{t('bindingLeftLeft')}</option>
                  <option value="RIGHT_START_LEFT_END">{t('bindingRightLeft')}</option>
                  <option value="RIGHT_START_RIGHT_END">{t('bindingRightRight')}</option>
                </select>
                {folder.autoBindingDetected && (
                  <span className="text-[9px] text-green-600 bg-green-50 px-1 rounded" title={`${t('firstPage')} ${folder.firstPageBlank ? t('blankPageLabel') : t('normalPageLabel')} / ${t('lastPage')} ${folder.lastPageBlank ? t('blankPageLabel') : t('normalPageLabel')}`}>
                    {t('autoDetected')}
                  </span>
                )}
              </>
            )}
          </div>

          {/* 파일정보 · 페이지순서 (한 줄) */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
            <span>{folder.dpi}dpi</span>
            <span className="text-gray-300">/</span>
            <span>{t('pageCount', { count: folder.files.length })}→<span className="font-medium text-blue-600">{t('pages', { count: folder.pageCount })}</span></span>
            {folder.hasCombinedCover && <span className="text-pink-500 text-[10px]">({t('combinedCoverSplit')})</span>}
            <span className="text-gray-300">/</span>
            <span>{formatFileSize(folder.totalFileSize)}</span>
            <span className="text-gray-300 ml-1">|</span>
            <span className="text-[10px] text-blue-500">■</span>
            <span className="text-[10px] text-purple-500">■</span>
            {getPageOrderDisplay()}
          </div>
        </div>

        {/* 가격 표시 */}
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold text-primary">
            {t('priceWon', { price: folderPrice.totalPrice.toLocaleString() })}
          </div>
          <div className="text-[10px] text-gray-400">
            {t('priceFormulaUnit', {
              perPage: folderPrice.pricePerPage.toLocaleString(),
              pages: folderPrice.pageCount,
              printPrice: folderPrice.printPrice.toLocaleString(),
              cover: folderPrice.coverPrice.toLocaleString(),
              unitPrice: folderPrice.unitPrice.toLocaleString(),
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

      {/* 첫막장 분리 결과 표시 */}
      {folder.hasCombinedCover && folder.splitCoverResults.length > 0 && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-2">
            <Scissors className="h-4 w-4" />
            {t('combinedCoverSplitComplete')}
          </div>
          {folder.splitCoverResults.map((result, idx) => (
            <div key={idx} className="bg-white rounded border border-blue-100 p-2 text-xs">
              <div className="text-gray-600 mb-1">{t('originalFile')} {result.originalFileName}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-1.5 bg-blue-50 rounded text-center">
                  <Badge className="bg-blue-500 text-white text-[10px] mb-1">{t('frontCoverPosition')}</Badge>
                  <div className="text-gray-500">{t('frontCoverDetail')}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
                <div className="flex-1 p-1.5 bg-purple-50 rounded text-center">
                  <Badge className="bg-purple-500 text-white text-[10px] mb-1">{t('backCoverPosition')}</Badge>
                  <div className="text-gray-500">{t('backCoverDetail')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 빈페이지 자동감지 결과 */}
      {folder.autoBindingDetected && (folder.firstPageBlank || folder.lastPageBlank) && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            {t('blankPageDetected')}
          </div>
          <div className="mt-1 text-xs text-green-600">
            {folder.firstPageBlank && <span className="mr-3">{t('blankPageFirstDetected')}</span>}
            {folder.lastPageBlank && <span>{t('blankPageLastDetected')}</span>}
          </div>
        </div>
      )}

      {/* 비율 불일치 경고 */}
      {folder.validationStatus === 'RATIO_MISMATCH' && (
        <div className="mt-3 p-3 bg-red-100 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-2">
            <XCircle className="h-4 w-4" />
            {t('rejectMismatchFiles', { count: folder.ratioMismatchCount })}
          </div>
          <div className="bg-white rounded border border-red-200 text-xs max-h-32 overflow-y-auto">
            {folder.mismatchFiles.slice(0, 10).map((file, idx) => (
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
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
            <span className="flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              {t('thumbnailPreviewCount', { count: folder.files.length })}
            </span>
            {isThumbnailOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className={cn(
            "grid gap-2 p-2 bg-gray-50 rounded-lg border",
            folder.pageLayout === 'single' ? "grid-cols-8" : "grid-cols-4"
          )}>
            {folder.files.map((file, index) => {
              const thumbUrl = file.thumbnailUrl;
              const coverBadge = COVER_TYPE_BADGE[file.coverType];
              // 이미지 비율 계산 (세로/가로 * 100 = 패딩%)
              const aspectRatio = file.widthPx > 0 && file.heightPx > 0
                ? (file.heightPx / file.widthPx) * 100
                : 133; // 기본값 4:3
              const fileSizeStr = (() => {
                const bytes = file.fileSize;
                if (bytes < 1024) return `${bytes}B`;
                if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
                return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
              })();
              return (
                <div
                  key={file.id}
                  className={cn(
                    'flex flex-col transition-all',
                    dragIndex === index && 'opacity-40 scale-95',
                    dropIndex === index && dragIndex !== null && dragIndex !== index && 'ring-2 ring-blue-400 rounded-md'
                  )}
                  draggable
                  onDragStart={(e) => {
                    setDragIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                    // 드래그 이미지를 썸네일로 설정
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
                  onDragLeave={() => {
                    setDropIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null && dragIndex !== index) {
                      reorderFolderFiles(folder.id, dragIndex, index);
                    }
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
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
                      // 모달용 풀사이즈 URL 생성
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
                      <img
                        src={thumbUrl}
                        alt={file.fileName}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
                        <span className="text-6xl font-black text-gray-300">X</span>
                      </div>
                    )}
                    {/* 페이지 번호 (펼침면: 좌/우 페이지 번호, 낱장: 단일 번호) */}
                    {folder.pageLayout === 'spread' ? (() => {
                      const pages = getSpreadPageNumbers(index, folder.files.length, folder.bindingDirection);
                      return (
                        <>
                          <div className={cn(
                            'absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium',
                            pages.left !== null ? 'bg-red-600' : 'bg-yellow-500'
                          )}>
                            {pages.left !== null ? pages.left : t('blank')}
                          </div>
                          <div className={cn(
                            'absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium',
                            pages.right !== null ? 'bg-red-600' : 'bg-yellow-500'
                          )}>
                            {pages.right !== null ? pages.right : t('blank')}
                          </div>
                        </>
                      );
                    })() : (
                      <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center bg-red-600 text-white text-[10px] font-medium">
                        {file.pageNumber}
                      </div>
                    )}
                    {/* 호버 시 확대 아이콘 */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  {/* 사진 정보 */}
                  <div className={cn(
                    'text-[9px] leading-tight p-1 border border-t-0 rounded-b-md',
                    file.status === 'RATIO_MISMATCH' ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'
                  )}>
                    <div className="truncate font-medium" title={file.newFileName || file.fileName}>{file.newFileName || file.fileName}</div>
                    <div className="text-gray-500 flex items-center gap-0.5">
                      <span>{fileSizeStr} | {file.widthInch}×{file.heightInch}" | {file.dpi}dpi</span>
                      <span className={cn(
                        'inline-block px-1 py-0 rounded text-[8px] font-medium ml-auto',
                        file.status === 'EXACT' ? 'bg-green-100 text-green-700' :
                          file.status === 'RATIO_MATCH' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                      )}>
                        {file.status === 'EXACT' ? t('exact') : file.status === 'RATIO_MATCH' ? t('ratioMatch') : t('mismatch')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 썸네일 검토 완료 버튼 */}
      {isThumbnailOpen && (
        <div className="mt-2 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsThumbnailOpen(false)}
            className="text-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            {t('approve')} • {tc('close')}
          </Button>
        </div>
      )}

      {/* 배송 정보 섹션 */}
      <Collapsible open={isShippingOpen} onOpenChange={setIsShippingOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 border-t bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-3.5 w-3.5 text-gray-500" />
            <span className="font-medium">{t('shippingInfo')}</span>
            <span className="text-xs text-gray-500">
              {getShippingSummary(folder.shippingInfo)}
            </span>
          </div>
          {isShippingOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 py-3 border-t">
          <FolderShippingSection
            shippingInfo={folder.shippingInfo}
            companyInfo={companyInfo ?? null}
            clientInfo={clientInfo ?? null}
            pricingMap={pricingMap ?? {}}
            onChange={(shipping) => setFolderShipping(folder.id, shipping)}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* 정상/승인 완료 시 - 규격 옵션 및 수량 */}
      {canSelect && (
        <div className="mt-3 pt-3 border-t">
          {/* 같은 비율 앨범규격 */}
          {folder.availableSizes.length > 1 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">{t('availableSizes')}</p>
              <div className="flex flex-wrap gap-1">
                {folder.availableSizes.map((size) => (
                  <Button
                    key={size.label}
                    variant={folder.albumWidth === size.width && folder.albumHeight === size.height ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => changeFolderSpec(folder.id, size)}
                  >
                    {size.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 수량 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{t('copiesLabel')}</span>
              <Select
                value={folder.quantity.toString()}
                onValueChange={(val) => setFolderQuantity(folder.id, parseInt(val))}
              >
                <SelectTrigger className="w-20 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 10, 20, 30, 50, 100].map((num) => (
                    <SelectItem key={num} value={num.toString()}>{t('copies', { count: num })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 추가 주문 버튼 */}
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

          {/* 추가 주문 목록 */}
          {folder.additionalOrders.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-medium text-blue-700 mb-2">{t('additionalOrderDescription')}</p>
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
                    <div key={order.id} className="bg-white rounded border border-blue-100 px-3 py-2">
                      {/* 폴더명 + 가격 */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Folder className="h-3 w-3 text-orange-500" />
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">{t('additionalSetOrder')}</span>
                          <span className="text-xs font-medium text-gray-700 truncate">{folder.orderTitle}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{t('priceWon', { price: orderPrice.totalPrice.toLocaleString() })}</span>
                          <div className="text-[10px] text-gray-400">
                            {t('priceFormulaUnit', {
                              perPage: orderPrice.pricePerPage.toLocaleString(),
                              pages: orderPrice.pageCount,
                              printPrice: orderPrice.printPrice.toLocaleString(),
                              cover: orderPrice.coverPrice.toLocaleString(),
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
                      </div>
                      {/* 규격 · 페이지 · 부수 */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-gray-400">{t('specLabelShort')}</span>
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
                            className="text-xs border rounded px-2 py-0.5 bg-white font-medium"
                            aria-label={t('additionalOrderSpec')}
                          >
                            {selectableSizes.map((size) => (
                              <option key={size.label} value={`${size.width}x${size.height}`}>
                                {size.label}
                              </option>
                            ))}
                          </select>
                          <span className="text-gray-300">|</span>
                          <span className="text-[10px] text-gray-400">{t('pageLabelShort')}</span>
                          <span className="text-xs font-medium text-blue-600">{folder.pageCount}p</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-[10px] text-gray-400">{t('copiesLabelShort')}</span>
                          <Select
                            value={order.quantity.toString()}
                            onValueChange={(val) => updateAdditionalOrderQuantity(folder.id, order.id, parseInt(val))}
                          >
                            <SelectTrigger className="w-18 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 10, 20, 30, 50, 100].map((num) => (
                                <SelectItem key={num} value={num.toString()}>{t('copies', { count: num })}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 flex-shrink-0"
                          onClick={() => removeAdditionalOrder(folder.id, order.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                      { level: 1, label: '200%' },
                      { level: 2, label: '300%' },
                      { level: 3, label: '400%' },
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
    </div>
  );
}
