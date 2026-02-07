'use client';

import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type UploadedFolder,
  type FolderValidationStatus,
  type PageLayoutType,
  type BindingDirection,
  useMultiFolderUploadStore,
  calculateUploadedFolderPrice,
} from '@/stores/multi-folder-upload-store';
import { formatFileSize } from '@/lib/album-utils';

interface FolderCardProps {
  folder: UploadedFolder;
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

export function FolderCard({ folder }: FolderCardProps) {
  const [isFileListOpen, setIsFileListOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(folder.orderTitle);
  const [isThumbnailOpen, setIsThumbnailOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; fileName: string; index: number } | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(new Map());

  // 썸네일 URL 생성
  useEffect(() => {
    const urls = new Map<string, string>();
    const objectUrls: string[] = [];

    folder.files.forEach((file) => {
      if (file.canvasDataUrl) {
        // 분리된 이미지는 canvasDataUrl 사용
        urls.set(file.id, file.canvasDataUrl);
      } else if (file.file) {
        // File 객체가 있으면 ObjectURL 생성
        const url = URL.createObjectURL(file.file);
        urls.set(file.id, url);
        objectUrls.push(url);
      }
    });

    setThumbnailUrls(urls);

    // Cleanup
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [folder.files]);

  // 이미지 네비게이션
  const resetZoom = () => {
    setIsZoomed(false);
    setZoomPos({ x: 0, y: 0 });
  };

  const handlePrevImage = () => {
    if (!previewImage) return;
    resetZoom();
    const newIndex = previewImage.index > 0 ? previewImage.index - 1 : folder.files.length - 1;
    const file = folder.files[newIndex];
    const url = thumbnailUrls.get(file.id);
    if (url) {
      setPreviewImage({ url, fileName: file.fileName, index: newIndex });
    }
  };

  const handleNextImage = () => {
    if (!previewImage) return;
    resetZoom();
    const newIndex = previewImage.index < folder.files.length - 1 ? previewImage.index + 1 : 0;
    const file = folder.files[newIndex];
    const url = thumbnailUrls.get(file.id);
    if (url) {
      setPreviewImage({ url, fileName: file.fileName, index: newIndex });
    }
  };

  // 줌 이미지 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isZoomed) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - zoomPos.x, y: e.clientY - zoomPos.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isZoomed) return;
    setZoomPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
              {isCover ? coverBadge.label : String(file.pageNumber).padStart(2, '0')}
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

            {/* 상태 배지 */}
            <Badge className={cn('ml-auto', actualStatus.badgeColor)}>
              {actualStatus.icon}
              <span className="ml-1">
                {folder.isApproved && folder.validationStatus === 'RATIO_MATCH' ? '정상주문' : actualStatus.label}
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
                aria-label="앨범규격 선택"
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
                <FileText className="w-2.5 h-2.5" />낱장
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
                <BookOpen className="w-2.5 h-2.5" />펼침면
              </button>
            </div>
            {folder.pageLayout === 'spread' && (
              <>
                <span className="text-gray-300">|</span>
                <select
                  value={folder.bindingDirection || 'LEFT_START_RIGHT_END'}
                  onChange={(e) => setFolderBindingDirection(folder.id, e.target.value as BindingDirection)}
                  className="text-[10px] border rounded px-1 py-0.5 bg-white"
                  aria-label="제본방향 선택"
                >
                  <option value="LEFT_START_RIGHT_END">좌→우</option>
                  <option value="LEFT_START_LEFT_END">좌→좌</option>
                  <option value="RIGHT_START_LEFT_END">우→좌</option>
                  <option value="RIGHT_START_RIGHT_END">우→우</option>
                </select>
              </>
            )}
          </div>

          {/* 파일정보 · 페이지순서 (한 줄) */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
            <span>{folder.dpi}dpi</span>
            <span className="text-gray-300">/</span>
            <span>{folder.files.length}장→<span className="font-medium text-blue-600">{folder.pageCount}p</span></span>
            {folder.hasCombinedCover && <span className="text-pink-500 text-[10px]">(첫막장분리)</span>}
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
            {folderPrice.totalPrice.toLocaleString()}원
          </div>
          <div className="text-[10px] text-gray-400">
            (단가 {folderPrice.unitPrice.toLocaleString()}원 × {folder.quantity}부)
          </div>
          <div className="text-[10px] text-gray-400">
            VAT 포함
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
            첫막장 자동 분리 완료
          </div>
          {folder.splitCoverResults.map((result, idx) => (
            <div key={idx} className="bg-white rounded border border-blue-100 p-2 text-xs">
              <div className="text-gray-600 mb-1">원본: {result.originalFileName}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-1.5 bg-blue-50 rounded text-center">
                  <Badge className="bg-blue-500 text-white text-[10px] mb-1">첫장 → 1번</Badge>
                  <div className="text-gray-500">[빈페이지|왼쪽반]</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
                <div className="flex-1 p-1.5 bg-purple-50 rounded text-center">
                  <Badge className="bg-purple-500 text-white text-[10px] mb-1">막장 → 마지막</Badge>
                  <div className="text-gray-500">[오른쪽반|빈페이지]</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 비율 불일치 경고 */}
      {folder.validationStatus === 'RATIO_MISMATCH' && (
        <div className="mt-3 p-3 bg-red-100 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-2">
            <XCircle className="h-4 w-4" />
            접수불가 — 규격이 맞지 않는 파일 {folder.ratioMismatchCount}개
          </div>
          <div className="bg-white rounded border border-red-200 text-xs max-h-32 overflow-y-auto">
            {folder.mismatchFiles.slice(0, 10).map((file, idx) => (
              <div key={file.id} className="px-2 py-1 border-b last:border-b-0 flex justify-between">
                <span className="truncate">{file.fileName}</span>
                <span className="text-gray-500 ml-2">
                  {file.widthPx}×{file.heightPx} ({file.widthInch}×{file.heightInch}인치)
                </span>
              </div>
            ))}
            {folder.mismatchFiles.length > 10 && (
              <div className="px-2 py-1 text-gray-500 text-center">
                외 {folder.mismatchFiles.length - 10}개 더...
              </div>
            )}
          </div>
          <p className="text-xs text-red-600 mt-2">
            파일 규격을 수정 후 다시 업로드해주세요.
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
                비율은 일치하나 규격이 다릅니다
              </div>
              <p className="text-xs text-amber-600 mt-1">
                현재 앨범규격 {folder.albumLabel} → 표준규격 {folder.specLabel}로 자동 조정됩니다.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => approveFolder(folder.id)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              확인 및 승인
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
              썸네일 미리보기 ({folder.files.length}개)
            </span>
            {isThumbnailOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="grid grid-cols-4 gap-2 p-2 bg-gray-50 rounded-lg border">
            {folder.files.map((file, index) => {
              const url = thumbnailUrls.get(file.id);
              const coverBadge = COVER_TYPE_BADGE[file.coverType];
              // 이미지 비율 계산 (세로/가로 * 100 = 패딩%)
              const aspectRatio = file.widthPx > 0 && file.heightPx > 0
                ? (file.heightPx / file.widthPx) * 100
                : 133; // 기본값 4:3
              return (
                <div
                  key={file.id}
                  className={cn(
                    'relative rounded-md overflow-hidden border-2 cursor-pointer group',
                    'hover:border-blue-400 hover:shadow-md transition-all',
                    file.coverType === 'FRONT_COVER' && 'border-blue-400',
                    file.coverType === 'BACK_COVER' && 'border-purple-400',
                    file.coverType === 'COMBINED_COVER' && 'border-pink-400',
                    file.coverType === 'INNER_PAGE' && 'border-gray-200'
                  )}
                  style={{ paddingTop: `${aspectRatio}%` }}
                  onClick={() => {
                    if (url) {
                      setPreviewImage({ url, fileName: file.fileName, index });
                    }
                  }}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={file.fileName}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center">
                      <FileImage className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  {/* 페이지 번호 */}
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">
                    {file.pageNumber}
                  </div>
                  {/* 표지 타입 배지 */}
                  {file.coverType !== 'INNER_PAGE' && (
                    <div className={cn(
                      'absolute bottom-1 left-1 right-1 text-center text-[9px] px-1 py-0.5 rounded',
                      coverBadge.className
                    )}>
                      {coverBadge.label}
                      {file.isSplit && <Scissors className="inline w-2 h-2 ml-0.5" />}
                    </div>
                  )}
                  {/* 호버 시 확대 아이콘 */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 파일 목록 (접기/펼치기) */}
      <Collapsible open={isFileListOpen} onOpenChange={setIsFileListOpen} className="mt-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
            <span className="flex items-center gap-1">
              <FileImage className="h-3 w-3" />
              파일 목록 ({folder.files.length}개)
            </span>
            {isFileListOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 grid grid-cols-12 gap-2">
              <span className="col-span-1 text-center">#</span>
              <span className="col-span-3">파일명</span>
              <span className="col-span-2 text-center">크기(px)</span>
              <span className="col-span-1 text-center">용량</span>
              <span className="col-span-2 text-center">규격(인치)</span>
              <span className="col-span-2 text-center">타입</span>
              <span className="col-span-1 text-center">상태</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y">
              {folder.files.map((file, index) => {
                const coverBadge = COVER_TYPE_BADGE[file.coverType];
                const formatFileSize = (bytes: number) => {
                  if (bytes < 1024) return `${bytes}B`;
                  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
                  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
                };
                return (
                  <div
                    key={file.id}
                    className={cn(
                      'px-3 py-1.5 text-xs grid grid-cols-12 gap-2 items-center',
                      file.status === 'RATIO_MISMATCH' && 'bg-red-50 border-l-2 border-red-500',
                      file.status === 'RATIO_MATCH' && 'bg-yellow-50 border-l-2 border-yellow-500',
                      file.coverType === 'FRONT_COVER' && 'bg-blue-50/50',
                      file.coverType === 'BACK_COVER' && 'bg-purple-50/50'
                    )}
                  >
                    <span className="col-span-1 text-center text-gray-500">{file.pageNumber}</span>
                    <span className="col-span-3 truncate flex items-center gap-1" title={file.newFileName || file.fileName}>
                      {file.isSplit && <Scissors className="w-3 h-3 text-pink-500" />}
                      {file.isExtended && <Expand className="w-3 h-3 text-blue-500" />}
                      {file.newFileName || file.fileName}
                    </span>
                    <span className="col-span-2 text-center text-gray-500">
                      {file.widthPx}×{file.heightPx}
                      {file.isExtended && file.originalWidthPx && (
                        <span className="text-blue-500 text-[9px] ml-0.5">({file.originalWidthPx}→)</span>
                      )}
                    </span>
                    <span className="col-span-1 text-center text-gray-500">{formatFileSize(file.fileSize)}</span>
                    <span className="col-span-2 text-center">{file.widthInch}×{file.heightInch}"</span>
                    <span className="col-span-2 flex justify-center">
                      <Badge
                        className={cn('text-[10px] px-1 py-0', coverBadge.className)}
                      >
                        {coverBadge.label}
                      </Badge>
                    </span>
                    <span className="col-span-1 flex justify-center">
                      <Badge
                        variant={
                          file.status === 'EXACT' ? 'default' :
                          file.status === 'RATIO_MATCH' ? 'secondary' : 'destructive'
                        }
                        className="text-[10px] px-1 py-0"
                      >
                        {file.status === 'EXACT' ? 'OK' :
                         file.status === 'RATIO_MATCH' ? '비율' : 'NG'}
                      </Badge>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 정상/승인 완료 시 - 규격 옵션 및 수량 */}
      {canSelect && (
        <div className="mt-3 pt-3 border-t">
          {/* 같은 비율 앨범규격 */}
          {folder.availableSizes.length > 1 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">같은 비율로 제작 가능한 앨범규격:</p>
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
              <span className="text-sm">부수:</span>
              <Select
                value={folder.quantity.toString()}
                onValueChange={(val) => setFolderQuantity(folder.id, parseInt(val))}
              >
                <SelectTrigger className="w-20 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 10, 20, 30, 50, 100].map((num) => (
                    <SelectItem key={num} value={num.toString()}>{num}부</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 추가 주문 버튼 */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                // 현재 폴더와 같은 사이즈로 복제
                addAdditionalOrder(folder.id, {
                  width: folder.albumWidth,
                  height: folder.albumHeight,
                  label: folder.albumLabel,
                });
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              추가 주문
            </Button>
          </div>

          {/* 추가 주문 목록 */}
          {folder.additionalOrders.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-medium text-blue-700 mb-2">추가 주문 (같은 파일, 다른 규격)</p>
              <div className="space-y-2">
                {folder.additionalOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between bg-white rounded px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">규격:</span>
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
                        className="text-sm border rounded px-2 py-0.5 bg-white font-medium"
                        aria-label="추가 주문 규격 선택"
                      >
                        {folder.availableSizes.map((size) => (
                          <option key={size.label} value={`${size.width}x${size.height}`}>
                            {size.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={order.quantity.toString()}
                        onValueChange={(val) => updateAdditionalOrderQuantity(folder.id, order.id, parseInt(val))}
                      >
                        <SelectTrigger className="w-20 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 10, 20, 30, 50, 100].map((num) => (
                            <SelectItem key={num} value={num.toString()}>{num}부</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500"
                        onClick={() => removeAdditionalOrder(folder.id, order.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
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
                      {COVER_TYPE_BADGE[folder.files[previewImage.index]?.coverType]?.label}
                    </Badge>
                  )}
                  <button
                    onClick={() => { if (isZoomed) resetZoom(); else setIsZoomed(true); }}
                    className={cn(
                      'ml-auto px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                      isZoomed ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    )}
                  >
                    {isZoomed ? '축소' : '확대'}
                  </button>
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
                className={cn(
                  'object-contain select-none transition-transform',
                  isZoomed ? 'max-w-none max-h-none' : 'max-w-full max-h-[70vh]'
                )}
                style={isZoomed ? {
                  transform: `translate(${zoomPos.x}px, ${zoomPos.y}px)`,
                  width: '150%',
                } : undefined}
                onClick={(e) => {
                  if (!isZoomed) {
                    e.stopPropagation();
                    setIsZoomed(true);
                  }
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
                      분리됨 ({folder.files[previewImage.index].splitSide})
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
