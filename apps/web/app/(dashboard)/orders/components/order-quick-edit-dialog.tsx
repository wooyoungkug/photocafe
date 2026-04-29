'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Order,
  useOrder,
  useAdjustOrder,
  useEditOrderWithAudit,
  ORDER_REPRINT_REQUIRED_STATUSES,
} from '@/hooks/use-orders';
import { toast } from '@/hooks/use-toast';
import { resolveOrderFileAccessUrl } from '@/lib/order-file-access';
import {
  ImageIcon,
  Save,
  Loader2,
  FolderOpen,
  FileText,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  History,
  Bell,
  Printer,
  AlertTriangle,
} from 'lucide-react';
import { cn, normalizeImageUrl } from '@/lib/utils';
import { ItemSpecsEditor } from './item-specs-editor';
import { OrderItemPriceBreakdown } from './order-item-price-breakdown';
import { useProduct } from '@/hooks/use-products';
import { useCurrentUser } from '@/hooks/use-auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { PrintOperatorSelector } from './print-operator-selector';
import {
  ReprintConfirmDialog,
  ReprintChangedItemInput,
} from './reprint-confirm-dialog';
import { OrderEditHistoryDrawer } from './order-edit-history-drawer';

// ==================== 편집스타일 / 제본순서 라벨 ====================

function getPageLayoutLabel(layout?: string): string {
  if (!layout) return '-';
  return layout === 'spread' ? '펼침면' : '낱장';
}

const BINDING_DIRECTION_OPTIONS = [
  { value: 'LEFT_START_RIGHT_END', label: '좌시우끝' },
  { value: 'LEFT_START_LEFT_END', label: '좌시좌끝' },
  { value: 'RIGHT_START_LEFT_END', label: '우시좌끝' },
  { value: 'RIGHT_START_RIGHT_END', label: '우시우끝' },
] as const;

function getBindingDirectionLabel(direction?: string): string {
  if (!direction) return '-';
  const found = BINDING_DIRECTION_OPTIONS.find((o) => o.value === direction);
  return found?.label || direction;
}

// ==================== 펼침면 페이지 번호 계산 ====================

type BindingDirectionType =
  | 'LEFT_START_RIGHT_END'
  | 'LEFT_START_LEFT_END'
  | 'RIGHT_START_LEFT_END'
  | 'RIGHT_START_RIGHT_END';

function getSpreadPageNumbers(
  fileIndex: number,
  totalFiles: number,
  direction: BindingDirectionType | null
): { left: number | null; right: number | null } {
  const dir = direction || 'LEFT_START_RIGHT_END';
  switch (dir) {
    case 'LEFT_START_RIGHT_END':
      return { left: fileIndex * 2 + 1, right: fileIndex * 2 + 2 };
    case 'LEFT_START_LEFT_END':
      if (fileIndex === totalFiles - 1) {
        return { left: fileIndex * 2 + 1, right: null };
      }
      return { left: fileIndex * 2 + 1, right: fileIndex * 2 + 2 };
    case 'RIGHT_START_LEFT_END':
      if (fileIndex === 0) {
        return { left: null, right: 1 };
      }
      if (fileIndex === totalFiles - 1 && totalFiles > 1) {
        return { left: fileIndex * 2, right: null };
      }
      return { left: fileIndex * 2, right: fileIndex * 2 + 1 };
    case 'RIGHT_START_RIGHT_END':
      if (fileIndex === 0) {
        return { left: null, right: 1 };
      }
      return { left: fileIndex * 2, right: fileIndex * 2 + 1 };
  }
}

// 후가공 옵션 배열 동등성 비교 (순서 무관)
function finishingsDiffer(
  a?: string[],
  b?: string[],
): boolean {
  const aa = (a ?? []).slice().sort();
  const bb = (b ?? []).slice().sort();
  if (aa.length !== bb.length) return true;
  return aa.some((v, i) => v !== bb[i]);
}

// ==================== Types ====================

interface OrderQuickEditDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ItemEdit {
  quantity: number;
  unitPrice: number;
  pageLayout?: string;
  bindingDirection?: string;
  fabricName?: string;
  foilName?: string;
  foilColor?: string;
  foilPosition?: string;
  // 관리자 사양 편집 (2026-05-01)
  paper?: string;
  printMethod?: string;
  colorIntentId?: string;
  printSide?: string;
  fileSpecId?: string;
  // 상품옵션 한정 사양 편집 (2026-04-29)
  bindingType?: string;
  finishingOptions?: string[];
  // 수동 단가 사용 여부 (false=auto: breakdown 계산값, true=admin 수동입력)
  manualUnitPrice?: boolean;
}

// ==================== ThumbnailGrid 서브 컴포넌트 ====================

interface ThumbnailFile {
  id: string;
  thumbnailUrl?: string | null;
  fileUrl?: string;
  fileName: string;
  sortOrder: number;
  pageRange?: string;
  pageStart?: number;
}

function AdaptiveThumbnail({
  file,
  index,
  pageLayout,
  totalFiles,
  direction,
  onOpenOriginal,
  openingFileId,
}: {
  file: ThumbnailFile;
  index: number;
  pageLayout?: string;
  totalFiles: number;
  direction: BindingDirectionType;
  onOpenOriginal?: (file: ThumbnailFile) => void;
  openingFileId?: string | null;
}) {
  const [aspectStyle, setAspectStyle] = useState<string>('aspect-[3/4]');
  const [imgSrc, setImgSrc] = useState<string | null>(
    normalizeImageUrl(file.thumbnailUrl) || normalizeImageUrl(file.fileUrl) || null
  );

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const { naturalWidth, naturalHeight } = img;
    if (naturalWidth && naturalHeight) {
      const ratio = naturalWidth / naturalHeight;
      if (ratio > 1) {
        setAspectStyle('aspect-[4/3]');
      } else if (ratio > 0.9) {
        setAspectStyle('aspect-square');
      } else {
        setAspectStyle('');
      }
    }
  };

  const handleImageError = () => {
    // thumbnailUrl 실패 시 fileUrl로 폴백, fileUrl도 실패 시 포기
    const normalizedThumb = normalizeImageUrl(file.thumbnailUrl);
    const normalizedFile = normalizeImageUrl(file.fileUrl);
    if (imgSrc === normalizedThumb && normalizedFile) {
      setImgSrc(normalizedFile);
    } else {
      setImgSrc(null);
    }
  };

  return (
    <div className="flex flex-col">
      <div className={cn(
        'relative rounded-t-md overflow-hidden border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all bg-gray-100',
        aspectStyle || 'aspect-auto'
      )}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={file.fileName}
            className={cn(
              'w-full object-contain',
              aspectStyle ? 'h-full' : 'h-auto'
            )}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center min-h-[80px]">
            <ImageIcon className="h-6 w-6 text-gray-300" />
          </div>
        )}
        {/* 스프레드 모드의 빈 절반(첫장 왼쪽/끝장 오른쪽)에 X 대각선 + 空 오버레이 */}
        {pageLayout === 'spread' && (() => {
          const pages = getSpreadPageNumbers(index, totalFiles, direction);
          const leftBlank = pages.left === null;
          const rightBlank = pages.right === null;
          if (!leftBlank && !rightBlank) return null;
          return (
            <div
              className={cn(
                'absolute inset-y-1 w-[calc(50%-4px)] pointer-events-none flex items-center justify-center bg-blue-50/85 border-2 border-dashed border-blue-400 overflow-hidden rounded-md',
                leftBlank ? 'left-1' : 'right-1'
              )}
              aria-label="빈 페이지"
            >
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <line x1="0" y1="0" x2="100" y2="100" stroke="rgb(96 165 250 / 0.6)" strokeWidth="1.5" />
                <line x1="100" y1="0" x2="0" y2="100" stroke="rgb(96 165 250 / 0.6)" strokeWidth="1.5" />
              </svg>
              <span className="relative text-xs font-bold text-blue-600 select-none bg-white/95 rounded px-1.5 py-0.5 whitespace-nowrap shadow-sm">빈페이지</span>
            </div>
          );
        })()}
        {/* Page number badges — 빈쪽은 "空" 한자로 표시 */}
        {pageLayout === 'spread' ? (() => {
          const pages = getSpreadPageNumbers(index, totalFiles, direction);
          return (
            <>
              <div className={cn(
                'absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium',
                pages.left !== null ? 'bg-red-600' : 'bg-blue-500'
              )}
                title={pages.left !== null ? undefined : '빈 페이지(空)'}
              >
                {pages.left !== null ? pages.left : '空'}
              </div>
              <div className={cn(
                'absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium',
                pages.right !== null ? 'bg-red-600' : 'bg-blue-500'
              )}
                title={pages.right !== null ? undefined : '빈 페이지(空)'}
              >
                {pages.right !== null ? pages.right : '空'}
              </div>
            </>
          );
        })() : (
          <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center bg-red-600 text-white text-[10px] font-medium">
            {index + 1}
          </div>
        )}
      </div>
      <div className="text-[9px] leading-tight p-1 border border-t-0 rounded-b-md bg-white border-gray-200">
        <div className="truncate font-medium" title={file.fileName}>{file.fileName}</div>
        <div className="text-gray-500">
          {file.pageRange || `${file.pageStart}p`}
        </div>
        {!!onOpenOriginal && (
          <button
            type="button"
            className="mt-1 w-full h-5 rounded bg-gray-100 hover:bg-gray-200 text-[9px] flex items-center justify-center gap-1 transition-colors"
            onClick={() => onOpenOriginal(file)}
            disabled={openingFileId === file.id}
            title="원본 열기"
          >
            <Download className="h-2.5 w-2.5" />
            {openingFileId === file.id ? '열는 중...' : '원본'}
          </button>
        )}
      </div>
    </div>
  );
}

function ThumbnailGrid({
  files,
  pageLayout,
  bindingDirection,
  onOpenOriginal,
  openingFileId,
}: {
  files: ThumbnailFile[];
  pageLayout?: string;
  bindingDirection?: BindingDirectionType;
  onOpenOriginal?: (file: ThumbnailFile) => void;
  openingFileId?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const direction = bindingDirection || 'LEFT_START_RIGHT_END';
  const totalFiles = files.length;

  const renderSingleThumbnail = (file: ThumbnailFile, index: number) => (
    <AdaptiveThumbnail
      key={file.id}
      file={file}
      index={index}
      pageLayout={pageLayout}
      totalFiles={totalFiles}
      direction={direction}
      onOpenOriginal={onOpenOriginal}
      openingFileId={openingFileId}
    />
  );

  // 낱장 모드: 2p씩 묶어서 스프레드 표시
  if (pageLayout === 'single' || !pageLayout) {
    const startsRight = direction.startsWith('RIGHT');

    type SpreadSlot = { type: 'page'; fileIndex: number } | { type: 'blank' };
    const spreads: Array<{ left: SpreadSlot; right: SpreadSlot }> = [];
    let i = 0;

    if (startsRight && totalFiles > 0) {
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
        spreads.push({
          left: { type: 'page', fileIndex: i },
          right: { type: 'blank' },
        });
        i++;
      }
    }

    const renderBlankSlot = () => (
      <div className="flex flex-col">
        <div className="relative rounded-md border-2 border-dashed border-blue-400 bg-blue-50/20 aspect-[3/4] flex items-center justify-center overflow-hidden">
          {/* 대각선 X 표식 — 인쇄 표준의 "의도적 빈 페이지" 마크 */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line x1="0" y1="0" x2="100" y2="100" stroke="rgb(96 165 250 / 0.5)" strokeWidth="1.2" />
            <line x1="100" y1="0" x2="0" y2="100" stroke="rgb(96 165 250 / 0.5)" strokeWidth="1.2" />
          </svg>
          <span className="relative text-sm font-bold text-blue-600 select-none bg-white/95 rounded px-2 py-0.5 whitespace-nowrap shadow-sm">빈페이지</span>
        </div>
      </div>
    );

    return (
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5 hover:text-gray-700 transition-colors"
        >
          <ImageIcon className="h-3 w-3" />
          이미지 미리보기 ({totalFiles}장)
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {isOpen && (
          <div className="grid grid-cols-4 gap-3 p-2 bg-gray-50 rounded-lg border">
            {spreads.map((spread, spreadIdx) => {
              const leftFile = spread.left.type === 'page' ? files[spread.left.fileIndex] : null;
              const rightFile = spread.right.type === 'page' ? files[spread.right.fileIndex] : null;
              const hasBoth = !!leftFile && !!rightFile;
              const label = hasBoth
                ? `S${spreadIdx + 1} (p${spread.left.type === 'page' ? spread.left.fileIndex + 1 : '?'}-${spread.right.type === 'page' ? spread.right.fileIndex + 1 : '?'})`
                : leftFile
                  ? `p${(spread.left as { type: 'page'; fileIndex: number }).fileIndex + 1}`
                  : rightFile
                    ? `p${(spread.right as { type: 'page'; fileIndex: number }).fileIndex + 1}`
                    : '';

              return (
                <div
                  key={spreadIdx}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-1',
                    !hasBoth ? 'border-blue-400 bg-blue-50/30' : 'border-orange-300 bg-orange-50/20'
                  )}
                >
                  <div className="text-[8px] text-center text-orange-500 mb-0.5 font-medium">
                    {label}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {spread.left.type === 'page'
                      ? renderSingleThumbnail(files[spread.left.fileIndex], spread.left.fileIndex)
                      : renderBlankSlot()}
                    {spread.right.type === 'page'
                      ? renderSingleThumbnail(files[spread.right.fileIndex], spread.right.fileIndex)
                      : renderBlankSlot()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 펼침면 모드: 그리드 레이아웃
  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5 hover:text-gray-700 transition-colors"
      >
        <ImageIcon className="h-3 w-3" />
        이미지 미리보기 ({totalFiles}장)
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {isOpen && (
        <div className="grid gap-2 p-2 bg-gray-50 rounded-lg border grid-cols-4">
          {files.map((file, index) => renderSingleThumbnail(file, index))}
        </div>
      )}
    </div>
  );
}

// ==================== Component ====================

export function OrderQuickEditDialog({
  order,
  open,
  onOpenChange,
}: OrderQuickEditDialogProps) {
  const adjustOrder = useAdjustOrder();
  const editWithAudit = useEditOrderWithAudit();
  // 권한 체크 — super_admin 만 출력대기 이후 상태에서 사양 편집 가능.
  const { user: currentUser } = useCurrentUser();
  const isSuperAdmin =
    currentUser?.isSuperAdmin === true || currentUser?.role === 'admin';

  // Fetch full order detail with ALL files when dialog opens
  const {
    data: fullOrder,
    isLoading: isLoadingDetail,
  } = useOrder(order?.id || '');

  // Item-level edit state
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdit>>({});
  // Discount
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);

  // PR3: 메시지/담당자/알림 + 재출력 인터셉트 + 이력 보기
  const [editMessage, setEditMessage] = useState('');
  const [assignPrintOperatorId, setAssignPrintOperatorId] = useState<string | null>(null);
  const [notifyOperator, setNotifyOperator] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reprintOpen, setReprintOpen] = useState(false);
  const [pendingReprintChanges, setPendingReprintChanges] = useState<ReprintChangedItemInput[]>([]);

  // Initialize edit state when full order data loads
  useEffect(() => {
    if (fullOrder) {
      const edits: Record<string, ItemEdit> = {};
      fullOrder.items.forEach((item) => {
        edits[item.id] = {
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          pageLayout: item.pageLayout || undefined,
          bindingDirection: item.bindingDirection || undefined,
          fabricName: item.fabricName || undefined,
          foilName: item.foilName || undefined,
          foilColor: item.foilColor || undefined,
          foilPosition: item.foilPosition || undefined,
          // 신규 사양 필드
          paper: item.paper || undefined,
          printMethod: item.printMethod || undefined,
          colorIntentId: item.colorIntentId || undefined,
          printSide: item.printSide || undefined,
          fileSpecId: item.fileSpecId || undefined,
          bindingType: item.bindingType || undefined,
          finishingOptions: item.finishingOptions || undefined,
          manualUnitPrice: false,
        };
      });
      setItemEdits(edits);
      setDiscountAmount(0);
      setDiscountReason('');
      setEditMessage('');
      setAssignPrintOperatorId(null);
      setNotifyOperator(true);
    }
  }, [fullOrder]);

  if (!order) return null;

  // Use full order data when available, fall back to list order
  const displayOrder = fullOrder || order;

  // ==================== Price calculations ====================

  const calcProductTotal = () => {
    return displayOrder.items.reduce((sum, item) => {
      const edit = itemEdits[item.id];
      if (!edit) return sum + Number(item.unitPrice) * item.quantity;
      return sum + edit.unitPrice * edit.quantity;
    }, 0);
  };

  const productTotal = calcProductTotal();
  const tax = Math.round(productTotal * 0.1);
  const shippingFee = Number(displayOrder.shippingFee) || 0;
  const totalBeforeDiscount = productTotal + tax + shippingFee;
  const finalTotal = Math.max(0, totalBeforeDiscount - discountAmount);

  // ==================== Change detection ====================

  const hasChanges = () => {
    if (discountAmount > 0) return true;
    if (editMessage.trim()) return true;
    if (assignPrintOperatorId !== null) return true;
    return displayOrder.items.some((item) => {
      const edit = itemEdits[item.id];
      if (!edit) return false;
      return (
        edit.quantity !== item.quantity ||
        edit.unitPrice !== Number(item.unitPrice) ||
        edit.pageLayout !== (item.pageLayout || undefined) ||
        edit.bindingDirection !== (item.bindingDirection || undefined) ||
        edit.fabricName !== (item.fabricName || undefined) ||
        edit.foilName !== (item.foilName || undefined) ||
        edit.foilColor !== (item.foilColor || undefined) ||
        edit.foilPosition !== (item.foilPosition || undefined) ||
        edit.paper !== (item.paper || undefined) ||
        edit.printMethod !== (item.printMethod || undefined) ||
        edit.colorIntentId !== (item.colorIntentId || undefined) ||
        edit.printSide !== (item.printSide || undefined) ||
        edit.fileSpecId !== (item.fileSpecId || undefined) ||
        edit.bindingType !== (item.bindingType || undefined) ||
        finishingsDiffer(edit.finishingOptions, item.finishingOptions)
      );
    });
  };

  // ==================== Save handler ====================

  // 사양/페이지 영향 변경 감지 (재출력 트리거 대상 필드만)
  const collectReprintRelevantChanges = (): ReprintChangedItemInput[] => {
    const changes: ReprintChangedItemInput[] = [];
    displayOrder.items.forEach((item) => {
      const edit = itemEdits[item.id];
      if (!edit) return;
      const specChanged =
        edit.pageLayout !== (item.pageLayout || undefined) ||
        edit.bindingDirection !== (item.bindingDirection || undefined) ||
        edit.fabricName !== (item.fabricName || undefined) ||
        edit.foilName !== (item.foilName || undefined) ||
        edit.foilColor !== (item.foilColor || undefined) ||
        edit.foilPosition !== (item.foilPosition || undefined) ||
        edit.paper !== (item.paper || undefined) ||
        edit.printMethod !== (item.printMethod || undefined) ||
        edit.colorIntentId !== (item.colorIntentId || undefined) ||
        edit.printSide !== (item.printSide || undefined) ||
        edit.fileSpecId !== (item.fileSpecId || undefined) ||
        edit.bindingType !== (item.bindingType || undefined) ||
        finishingsDiffer(edit.finishingOptions, item.finishingOptions);
      if (specChanged) {
        // 사양 변경은 모든 페이지 재출력 — 페이지 단위 부분 재출력은 향후 UI에서 별도 선택
        const pages = (item.files || [])
          .map((f) => f.sortOrder + 1)
          .sort((a, b) => a - b);
        changes.push({
          itemId: item.id,
          pages: pages.length > 0 ? pages : Array.from({ length: item.pages }, (_, i) => i + 1),
        });
      }
    });
    return changes;
  };

  const buildItemUpdates = () =>
    displayOrder.items
      .filter((item) => {
        const edit = itemEdits[item.id];
        if (!edit) return false;
        return (
          edit.quantity !== item.quantity ||
          edit.unitPrice !== Number(item.unitPrice) ||
          edit.pageLayout !== (item.pageLayout || undefined) ||
          edit.bindingDirection !== (item.bindingDirection || undefined) ||
          edit.fabricName !== (item.fabricName || undefined) ||
          edit.foilName !== (item.foilName || undefined) ||
          edit.foilColor !== (item.foilColor || undefined) ||
          edit.foilPosition !== (item.foilPosition || undefined) ||
          edit.paper !== (item.paper || undefined) ||
          edit.printMethod !== (item.printMethod || undefined) ||
          edit.colorIntentId !== (item.colorIntentId || undefined) ||
          edit.printSide !== (item.printSide || undefined) ||
          edit.fileSpecId !== (item.fileSpecId || undefined) ||
          edit.bindingType !== (item.bindingType || undefined) ||
          finishingsDiffer(edit.finishingOptions, item.finishingOptions)
        );
      })
      .map((item) => ({
        itemId: item.id,
        quantity: itemEdits[item.id].quantity,
        unitPrice: itemEdits[item.id].unitPrice,
        pageLayout: itemEdits[item.id].pageLayout,
        bindingDirection: itemEdits[item.id].bindingDirection,
        fabricName: itemEdits[item.id].fabricName,
        foilName: itemEdits[item.id].foilName,
        foilColor: itemEdits[item.id].foilColor,
        foilPosition: itemEdits[item.id].foilPosition,
        paper: itemEdits[item.id].paper,
        printMethod: itemEdits[item.id].printMethod,
        colorIntentId: itemEdits[item.id].colorIntentId,
        printSide: itemEdits[item.id].printSide,
        fileSpecId: itemEdits[item.id].fileSpecId,
        // bindingType, finishingOptions 는 백엔드 AdjustOrderItemDto 미지원 → 별도 PR 필요
      }));

  // 실제 백엔드 저장 호출 (재출력 인터셉트 통과 후 또는 일반 상태에서)
  const performSave = async () => {
    const itemUpdates = buildItemUpdates();

    try {
      await editWithAudit.mutateAsync({
        id: displayOrder.id,
        data: {
          adjustmentAmount: discountAmount > 0 ? discountAmount : undefined,
          adjustmentReason: discountReason || undefined,
          itemUpdates: itemUpdates.length > 0 ? itemUpdates : undefined,
          message: editMessage.trim() || undefined,
          notifyOperator,
          assignPrintOperatorId: assignPrintOperatorId,
        },
      });
      toast({ title: '주문이 수정되었습니다.' });
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : undefined;
      toast({
        title: '주문 수정에 실패했습니다.',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    // ±20% 변동 시 사용자 확인 1단계 (관리자 사양 편집 안전장치)
    const previousFinalAmount = Number(displayOrder.finalAmount) || 0;
    const newFinalAmount = finalTotal;
    if (previousFinalAmount > 0) {
      const ratio = (newFinalAmount - previousFinalAmount) / previousFinalAmount;
      if (Math.abs(ratio) >= 0.2) {
        const sign = ratio > 0 ? '+' : '';
        const ok = window.confirm(
          `주문 금액이 ${sign}${(ratio * 100).toFixed(1)}% 변동됩니다.\n` +
            `이전: ${previousFinalAmount.toLocaleString()}원\n` +
            `신규: ${newFinalAmount.toLocaleString()}원\n\n` +
            `정말 저장하시겠습니까?`,
        );
        if (!ok) return;
      }
    }

    // 재출력 인터셉트 — 출력완료 이후 상태에서 사양 변경이 감지되면 ReprintConfirmDialog 띄움
    const orderStatus = displayOrder.status;
    if (ORDER_REPRINT_REQUIRED_STATUSES.includes(orderStatus)) {
      const reprintChanges = collectReprintRelevantChanges();
      if (reprintChanges.length > 0) {
        setPendingReprintChanges(reprintChanges);
        setReprintOpen(true);
        return; // 저장 보류 — ReprintConfirmDialog onConfirm 에서 performSave 호출
      }
    }

    await performSave();
  };

  const handleOpenOriginal = async (file: ThumbnailFile) => {
    if (!file?.id) return;
    setOpeningFileId(file.id);
    try {
      const finalUrl = await resolveOrderFileAccessUrl(file);
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      const fallback = normalizeImageUrl(file.fileUrl) || file.fileUrl;
      if (fallback) {
        window.open(fallback, '_blank', 'noopener,noreferrer');
      } else {
        toast({ title: e?.message || '원본 파일 열기에 실패했습니다.', variant: 'destructive' });
      }
    } finally {
      setOpeningFileId(null);
    }
  };

  // ==================== Render ====================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-[18px] text-black font-bold">
                주문 검증 및 수정
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <span className="font-medium">{displayOrder.orderNumber}</span>
                <span className="text-muted-foreground">-</span>
                <span>{displayOrder.client?.clientName}</span>
                {displayOrder.isUrgent && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    긴급
                  </Badge>
                )}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="shrink-0"
            >
              <History className="h-4 w-4 mr-1" />
              이력 보기
            </Button>
          </div>
        </DialogHeader>

        {/* 상태별 경고 배너 (PR3) */}
        {(() => {
          const status = displayOrder.status;
          if (status === 'shipped' || status === 'cancelled') {
            return (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-[14px] font-normal">
                  {status === 'shipped' ? '배송 완료' : '취소'}된 주문은 편집할 수 없습니다.
                </AlertDescription>
              </Alert>
            );
          }
          if (
            status === 'printed' ||
            status === 'ready_for_shipping' ||
            status === 'reprint_requested' ||
            status === 'reprint_in_production'
          ) {
            return (
              <Alert className="mt-2 border-amber-300 bg-amber-50">
                <Printer className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-[14px] text-black font-normal">
                  출력완료된 주문입니다. 사양 변경 시 재출력 비용이 다음 주문에 자동 청구됩니다.
                </AlertDescription>
              </Alert>
            );
          }
          if (status === 'in_production') {
            return (
              <Alert className="mt-2 border-blue-300 bg-blue-50">
                <Bell className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-[14px] text-black font-normal">
                  생산진행 중입니다. 변경 사항은 출력 담당자에게 알림이 전송됩니다.
                </AlertDescription>
              </Alert>
            );
          }
          return null;
        })()}

        <div className="space-y-4 mt-2">
          {/* Loading skeleton */}
          {isLoadingDetail ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="border-2 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-12 ml-auto" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="bg-gray-50 rounded-lg border p-2">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} className="w-16 h-16 rounded" />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-40" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Order item cards */}
              {displayOrder.items.map((item, itemIndex) => {
                const edit = itemEdits[item.id] || {
                  quantity: item.quantity,
                  unitPrice: Number(item.unitPrice),
                  pageLayout: item.pageLayout || undefined,
                  bindingDirection: item.bindingDirection || undefined,
                };

                // Collect all file thumbnails sorted by sortOrder
                const allFiles = [...(item.files || [])].sort(
                  (a, b) => a.sortOrder - b.sortOrder
                );

                return (
                  <div
                    key={item.id}
                    className="border-2 rounded-xl overflow-hidden"
                  >
                    {/* Card Header - folder name & specs */}
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen className="h-4 w-4 text-blue-600 shrink-0" />
                          <span className="font-semibold text-sm truncate">
                            {item.folderName || item.productName}
                          </span>
                          {itemIndex > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 shrink-0"
                            >
                              항목 {itemIndex + 1}
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs shrink-0 ml-2"
                        >
                          {item.pages}p
                        </Badge>
                      </div>

                      {/* Product specs line 1 */}
                      <div className="text-xs text-muted-foreground mt-1.5 truncate">
                        {[
                          item.productName,
                          item.size,
                          item.printMethod,
                          item.paper,
                        ]
                          .filter(Boolean)
                          .join(' \u00B7 ')}
                      </div>

                      {/* Product specs line 2 (optional) */}
                      {(item.bindingType ||
                        item.coverMaterial ||
                        item.fabricName ||
                        item.foilColor) && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[
                            item.bindingType,
                            item.coverMaterial,
                            item.fabricName
                              ? `원단:${item.fabricName}`
                              : null,
                            item.foilColor
                              ? `박:${item.foilColor}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' \u00B7 ')}
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Thumbnail gallery - grid layout */}
                      {allFiles.length > 0 ? (
                        <ThumbnailGrid
                          files={allFiles}
                          pageLayout={edit.pageLayout}
                          bindingDirection={edit.bindingDirection as BindingDirectionType | undefined}
                          onOpenOriginal={handleOpenOriginal}
                          openingFileId={openingFileId}
                        />
                      ) : item.thumbnailUrl ? (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            대표 이미지
                          </div>
                          <div className="bg-gray-50 rounded-lg border p-2">
                            <div className="flex gap-2">
                              <div className="w-16 h-16 rounded border bg-white overflow-hidden relative shrink-0">
                                <Image
                                  src={normalizeImageUrl(item.thumbnailUrl)}
                                  alt={item.folderName || item.productName}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg border p-3 flex items-center justify-center text-xs text-muted-foreground gap-1.5">
                          <ImageIcon className="h-4 w-4 text-gray-300" />
                          업로드된 이미지가 없습니다
                        </div>
                      )}

                      {/* ===== 관리자 사양 편집 ===== */}
                      {/* PR3: 차단 해제됨. shipped/cancelled 만 차단(상단 배너로 안내) */}
                      {(() => {
                        const orderStatus = displayOrder.status;
                        const blocked =
                          orderStatus === 'shipped' || orderStatus === 'cancelled';
                        return (
                          <div className="space-y-2">
                            <ItemSpecsEditor
                              item={item}
                              value={{
                                paper: edit.paper,
                                printMethod: edit.printMethod,
                                colorIntentId: edit.colorIntentId,
                                printSide: edit.printSide,
                                fabricName: edit.fabricName,
                                fileSpecId: edit.fileSpecId,
                                bindingType: edit.bindingType,
                                finishingOptions: edit.finishingOptions,
                                foilName: edit.foilName,
                              }}
                              onChange={(next) =>
                                setItemEdits((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], ...next },
                                }))
                              }
                              readonly={blocked}
                            />
                          </div>
                        );
                      })()}

                      {/* Verification controls: Size · Page Layout · Binding Direction (한 줄) */}
                      <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                        {/* Size label */}
                        {item.size && (
                          <>
                            <span className="text-blue-600 font-medium">{item.size}</span>
                            <span className="text-gray-300">|</span>
                          </>
                        )}

                        {/* Page layout toggle (compact) */}
                        <div className="flex border rounded overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], pageLayout: 'single' },
                              }))
                            }
                            className={cn(
                              'px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 transition-colors',
                              (edit.pageLayout === 'single' || !edit.pageLayout)
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            )}
                          >
                            <FileText className="w-2.5 h-2.5" />낱장
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], pageLayout: 'spread' },
                              }))
                            }
                            className={cn(
                              'px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 transition-colors',
                              edit.pageLayout === 'spread'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            )}
                          >
                            <BookOpen className="w-2.5 h-2.5" />펼침면
                          </button>
                        </div>

                        {/* Binding direction visual icons */}
                        {edit.pageLayout === 'spread' ? (
                          <>
                            <span className="text-gray-300">|</span>
                            <div className="flex gap-1">
                              {(['LEFT_START_RIGHT_END', 'LEFT_START_LEFT_END', 'RIGHT_START_LEFT_END', 'RIGHT_START_RIGHT_END'] as BindingDirectionType[]).map((dir) => {
                                const isSelected = (edit.bindingDirection || 'LEFT_START_RIGHT_END') === dir;
                                const startLeft = dir.startsWith('LEFT_START');
                                const endRight = dir.endsWith('RIGHT_END');
                                const label = dir === 'LEFT_START_RIGHT_END' ? '좌→우' : dir === 'LEFT_START_LEFT_END' ? '좌→좌' : dir === 'RIGHT_START_LEFT_END' ? '우→좌' : '우→우';
                                return (
                                  <button
                                    key={dir}
                                    type="button"
                                    onClick={() =>
                                      setItemEdits((prev) => ({
                                        ...prev,
                                        [item.id]: { ...prev[item.id], bindingDirection: dir },
                                      }))
                                    }
                                    className={cn(
                                      'flex flex-col items-center gap-0.5 px-1 py-0.5 rounded border transition-colors',
                                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                                    )}
                                  >
                                    <span className="flex items-center gap-1">
                                      <span className="flex gap-px">
                                        <span className={cn('w-4 h-6 rounded-sm', startLeft ? 'bg-blue-500' : 'bg-gray-200')} />
                                        <span className={cn('w-4 h-6 rounded-sm', startLeft ? 'bg-gray-200' : 'bg-blue-500')} />
                                      </span>
                                      <span className="flex gap-px">
                                        <span className={cn('w-4 h-6 rounded-sm', endRight ? 'bg-gray-200' : 'bg-blue-500')} />
                                        <span className={cn('w-4 h-6 rounded-sm', endRight ? 'bg-blue-500' : 'bg-gray-200')} />
                                      </span>
                                    </span>
                                    <span className={cn('text-[8px] leading-none', isSelected ? 'text-blue-600 font-medium' : 'text-gray-400')}>{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-300">|</span>
                            <div className="flex gap-1">
                              {(['LEFT', 'RIGHT'] as const).map((side) => {
                                const currentSide = (edit.bindingDirection || 'LEFT_START_RIGHT_END').startsWith('RIGHT') ? 'RIGHT' : 'LEFT';
                                const isSelected = currentSide === side;
                                const label = side === 'LEFT' ? '좌시작' : '우시작';
                                return (
                                  <button
                                    key={side}
                                    type="button"
                                    onClick={() => {
                                      const newDir: BindingDirectionType = side === 'RIGHT' ? 'RIGHT_START_LEFT_END' : 'LEFT_START_RIGHT_END';
                                      setItemEdits((prev) => ({
                                        ...prev,
                                        [item.id]: { ...prev[item.id], bindingDirection: newDir },
                                      }));
                                    }}
                                    className={cn(
                                      'flex flex-col items-center gap-0.5 px-1 py-0.5 rounded border transition-colors',
                                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                                    )}
                                  >
                                    <span className="flex gap-px">
                                      <span className={cn('w-4 h-6 rounded-sm', side === 'LEFT' ? 'bg-blue-500' : 'bg-gray-200')} />
                                      <span className={cn('w-4 h-6 rounded-sm', side === 'RIGHT' ? 'bg-blue-500' : 'bg-gray-200')} />
                                    </span>
                                    <span className={cn('text-[8px] leading-none', isSelected ? 'text-blue-600 font-medium' : 'text-gray-400')}>{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      <Separator />

                      {/* Fabric name */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">원단명</Label>
                        <Input
                          value={edit.fabricName || ''}
                          onChange={(e) =>
                            setItemEdits((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                fabricName: e.target.value || undefined,
                              },
                            }))
                          }
                          placeholder="원단명 입력"
                          className="w-48 h-8 text-sm"
                        />
                      </div>

                      {/* Foil information (동판 정보) */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">박 동판명</Label>
                          <Input
                            value={edit.foilName || ''}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  foilName: e.target.value || undefined,
                                },
                              }))
                            }
                            placeholder="동판명 입력"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">박 색상</Label>
                          <Input
                            value={edit.foilColor || ''}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  foilColor: e.target.value || undefined,
                                },
                              }))
                            }
                            placeholder="박 색상"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">박 위치</Label>
                          <Input
                            value={edit.foilPosition || ''}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  foilPosition: e.target.value || undefined,
                                },
                              }))
                            }
                            placeholder="박 위치"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* 단가 breakdown (상품옵션 기반 자동 계산) */}
                      <div className="rounded-md border p-3 bg-white">
                        <ItemPriceBreakdownPanel
                          item={item}
                          edit={edit}
                          clientId={displayOrder.clientId}
                          onUnitPriceCalculated={(calculated) => {
                            setItemEdits((prev) => {
                              const cur = prev[item.id];
                              if (!cur || cur.manualUnitPrice) return prev;
                              if (cur.unitPrice === calculated) return prev;
                              return {
                                ...prev,
                                [item.id]: { ...cur, unitPrice: calculated },
                              };
                            });
                          }}
                        />
                      </div>

                      {/* Quantity / Unit price / Subtotal */}
                      <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            부수
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={edit.quantity}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  quantity: Math.max(
                                    1,
                                    Number(e.target.value)
                                  ),
                                },
                              }))
                            }
                            className="w-24 h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">단가</Label>
                            <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer select-none">
                              <Checkbox
                                checked={edit.manualUnitPrice ?? false}
                                onCheckedChange={(checked) =>
                                  setItemEdits((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      manualUnitPrice: checked === true,
                                    },
                                  }))
                                }
                              />
                              수동 단가
                            </label>
                          </div>
                          <Input
                            type="number"
                            min={0}
                            value={edit.unitPrice}
                            readOnly={!edit.manualUnitPrice}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  unitPrice: Math.max(
                                    0,
                                    Number(e.target.value)
                                  ),
                                },
                              }))
                            }
                            className={cn(
                              'w-32 h-8 text-sm',
                              !edit.manualUnitPrice && 'bg-slate-50 text-slate-700',
                            )}
                          />
                        </div>
                        <div className="text-sm font-medium text-right flex-1 whitespace-nowrap">
                          소계:{' '}
                          <span className="text-blue-600">
                            {(edit.unitPrice * edit.quantity).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Separator />

              {/* Discount section */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">할인/금액 조정</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">할인금액</Label>
                    <Input
                      type="number"
                      min={0}
                      value={discountAmount}
                      onChange={(e) =>
                        setDiscountAmount(Math.max(0, Number(e.target.value)))
                      }
                      placeholder="0"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">할인사유</Label>
                    <Textarea
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="예: VIP 고객 할인, 재주문 할인 등"
                      rows={1}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Price summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">상품금액</span>
                  <span className="text-right">
                    {productTotal.toLocaleString()}원
                  </span>
                  <span className="text-muted-foreground">부가세 (10%)</span>
                  <span className="text-right">
                    {tax.toLocaleString()}원
                  </span>
                  <span className="text-muted-foreground">배송비</span>
                  <span className="text-right">
                    {shippingFee.toLocaleString()}원
                  </span>
                  {discountAmount > 0 && (
                    <>
                      <span className="text-red-600">할인금액</span>
                      <span className="text-right text-red-600">
                        -{discountAmount.toLocaleString()}원
                      </span>
                    </>
                  )}
                  <Separator className="col-span-2 my-1" />
                  <span className="font-bold">최종금액</span>
                  <span className="text-right font-bold text-blue-600 text-base">
                    {finalTotal.toLocaleString()}원
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ===== 가격 차액 라이브 미리보기 (관리자 사양 편집) ===== */}
        {(() => {
          const previousFinalAmount = Number(displayOrder.finalAmount) || 0;
          const delta = finalTotal - previousFinalAmount;
          const ratio = previousFinalAmount > 0 ? delta / previousFinalAmount : 0;
          const hasChange = hasChanges();
          if (!hasChange || delta === 0) return null;
          const isLarge = Math.abs(ratio) >= 0.2;
          const sign = delta > 0 ? '+' : '';
          return (
            <div
              className={cn(
                'mt-3 px-3 py-2 rounded-md border text-[13px] flex items-center justify-between',
                isLarge
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800',
              )}
            >
              <span>
                {isLarge && '⚠️ '}
                금액 변동: <strong>{sign}{delta.toLocaleString()}원</strong>{' '}
                ({sign}{(ratio * 100).toFixed(1)}%)
                {isLarge && ' — 저장 시 재확인'}
              </span>
              <span className="text-xs opacity-80">
                {previousFinalAmount.toLocaleString()} → {finalTotal.toLocaleString()}원
              </span>
            </div>
          );
        })()}

        {/* PR3: 메시지/담당자/알림 입력 영역 */}
        {!isLoadingDetail && displayOrder.status !== 'shipped' && displayOrder.status !== 'cancelled' && (
          <div className="mt-4 border-t pt-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-[14px] text-black font-bold">
                변경 메시지 <span className="text-[12px] text-gray-500 font-normal">(담당자에게 전달, 최대 500자)</span>
              </Label>
              <Textarea
                value={editMessage}
                maxLength={500}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder="예: 색상 톤다운 부탁드립니다 / 사양 변경 사유 등"
                rows={2}
                className="text-[14px] text-black font-normal resize-none"
              />
              <div className="text-right text-[12px] text-gray-500">
                {editMessage.length}/500
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[14px] text-black font-bold">
                  출력 담당자 지정
                </Label>
                <PrintOperatorSelector
                  value={assignPrintOperatorId}
                  onChange={setAssignPrintOperatorId}
                  orderId={displayOrder.id}
                  allowClear
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={notifyOperator}
                    onCheckedChange={(checked) => setNotifyOperator(checked === true)}
                  />
                  <span className="text-[14px] text-black font-normal flex items-center gap-1">
                    <Bell className="h-3.5 w-3.5" />
                    담당자 알림 발송
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isLoadingDetail ||
              !hasChanges() ||
              editWithAudit.isPending ||
              displayOrder.status === 'shipped' ||
              displayOrder.status === 'cancelled'
            }
          >
            {editWithAudit.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {editWithAudit.isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* 재출력 인터셉트 다이얼로그 */}
      <ReprintConfirmDialog
        open={reprintOpen}
        onOpenChange={setReprintOpen}
        orderId={displayOrder.id}
        items={displayOrder.items}
        changedItems={pendingReprintChanges}
        onConfirm={() => {
          // 재출력 작업 생성 후 사양 편집(메시지/담당자 포함) 함께 저장
          performSave();
        }}
      />

      {/* 편집 이력 드로어 */}
      <OrderEditHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        orderId={displayOrder.id}
      />
    </Dialog>
  );
}

// ==================== ItemPriceBreakdownPanel ====================
// OrderItem 별로 useProduct 를 호출해야 하므로 별도 서브 컴포넌트로 분리.

function ItemPriceBreakdownPanel({
  item,
  edit,
  clientId,
  onUnitPriceCalculated,
}: {
  item: import('@/hooks/use-orders').OrderItem;
  edit: ItemEdit;
  clientId: string;
  onUnitPriceCalculated: (unitPrice: number) => void;
}) {
  const productQuery = useProduct(item.productId);
  return (
    <OrderItemPriceBreakdown
      orderItem={item}
      edit={{
        printMethod: edit.printMethod,
        colorIntentId: edit.colorIntentId,
        paper: edit.paper,
        printSide: edit.printSide,
        fabricName: edit.fabricName,
        fileSpecId: edit.fileSpecId,
        bindingType: edit.bindingType,
        finishingOptions: edit.finishingOptions,
        foilName: edit.foilName,
      }}
      product={productQuery.data}
      clientId={clientId}
      onUnitPriceCalculated={onUnitPriceCalculated}
    />
  );
}
