'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight,
  Upload,
  FolderOpen,
  Printer,
  BookOpen,
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  Info,
  Palette,
  Check,
  Settings2,
  Package,
  Calculator,
  ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import { cn } from '@/lib/utils';
import { useProduct } from '@/hooks/use-products';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore, type CartItemOption } from '@/stores/cart-store';
import { useToast } from '@/hooks/use-toast';
import {
  useMultiFolderUploadStore,
  type UploadedFolder,
  calculateUploadedFolderPrice,
  calculateTotalUploadedPrice,
} from '@/stores/multi-folder-upload-store';
import { MultiFolderUpload } from '@/components/album-upload';
import { FolderCard } from '@/components/album-upload/folder-card';
import { useFabrics, FABRIC_CATEGORY_LABELS, FABRIC_CATEGORY_COLORS, type Fabric, type FabricCategory } from '@/hooks/use-fabrics';
import { useCopperPlatesByClient, useCopperPlateLabels } from '@/hooks/use-copper-plates';
import { usePublicCopperPlates } from '@/hooks/use-public-copper-plates';
import { normalizeImageUrl } from '@/lib/utils';
import { startBackgroundUpload, type FolderUploadData } from '@/lib/background-upload';
import { UploadProgressModal } from '../product/[id]/_components/upload-progress-modal';

// ==================== Types ====================

type CompressedAlbumType = 'premium' | 'graduation';
type InnerPageThickness = '0.1mm' | '0.3mm' | '0.6mm' | '1mm';
type PrintMethod = 'indigo' | 'inkjet';
type CopperPlateType = 'none' | 'public' | 'owned';

interface OrderConfig {
  albumType: CompressedAlbumType;
  printMethod: PrintMethod;
  innerThickness: InnerPageThickness;
  copperPlateType: CopperPlateType;
  selectedPublicPlateId?: string;
  selectedOwnedPlateId?: string;
  foilColor?: string;
  foilPosition?: string;
}

// ==================== Constants ====================

const ALBUM_TYPES: { value: CompressedAlbumType; label: string; description: string; badge?: string }[] = [
  {
    value: 'premium',
    label: '고급 압축앨범',
    description: '최소 10p, 고급 원단 표지',
    badge: '인기',
  },
  {
    value: 'graduation',
    label: '졸업 압축앨범',
    description: '2p 단위, 경제적인 선택',
  },
];

const THICKNESS_OPTIONS: { value: InnerPageThickness; label: string; description: string }[] = [
  { value: '0.1mm', label: '0.1mm', description: '얇은 두께' },
  { value: '0.3mm', label: '0.3mm', description: '표준 두께' },
  { value: '0.6mm', label: '0.6mm', description: '두꺼운 두께' },
  { value: '1mm', label: '1mm', description: '최대 두께' },
];

const PRINT_METHODS: { value: PrintMethod; label: string; description: string }[] = [
  { value: 'indigo', label: '인디고', description: '고품질 디지털 인쇄' },
  { value: 'inkjet', label: '잉크젯', description: '경제적인 대형 인쇄' },
];

// ==================== Sub-components ====================

function SectionHeader({ icon, title, description, step }: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  step?: number;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      {step && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          {step}
        </div>
      )}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-primary">{icon}</span>
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionCard({ selected, onClick, children, className }: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center w-full',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card hover:border-primary/40 hover:shadow-sm',
        className,
      )}
    >
      {selected && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}
      {children}
    </button>
  );
}

function PriceSummaryRow({ label, value, highlight, sub }: {
  label: string;
  value: string;
  highlight?: boolean;
  sub?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between py-1.5',
      highlight && 'font-bold text-base',
      sub && 'text-sm text-muted-foreground',
    )}>
      <span>{label}</span>
      <span className={cn(highlight && 'text-primary')}>{value}</span>
    </div>
  );
}

function EmptyUploadState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Upload className="w-8 h-8 text-muted-foreground" />
      </div>
      <h4 className="text-lg font-medium mb-2">데이터를 업로드해주세요</h4>
      <p className="text-sm text-muted-foreground max-w-md">
        앨범 원판 폴더를 드래그 앤 드롭하거나 위 업로드 영역을 클릭하여
        파일을 선택해주세요. 폴더별로 자동 분석됩니다.
      </p>
    </div>
  );
}

// ==================== Main Page ====================

export default function AlbumOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId') || '';
  const { toast } = useToast();

  // Auth & Product data
  const { user, isAuthenticated } = useAuthStore();
  const { data: product, isLoading: productLoading } = useProduct(productId);
  const { addItem, items: cartItems } = useCartStore();

  // Copper plates
  const { data: ownedCopperPlates } = useCopperPlatesByClient(isAuthenticated ? user?.id : undefined);
  const { data: copperPlateLabels } = useCopperPlateLabels();
  const { data: allPublicCopperPlates } = usePublicCopperPlates({ status: 'active' });

  // Multi-folder upload store
  const {
    folders: uploadFolders,
    defaultPageLayout,
    defaultBindingDirection,
    defaultCoverSourceType,
    clearFolders,
    applyGlobalCoverSource,
    setFolderFabric,
    setAllFoldersFoil,
  } = useMultiFolderUploadStore();

  // Order configuration
  const [config, setConfig] = useState<OrderConfig>({
    albumType: 'premium',
    printMethod: 'indigo',
    innerThickness: '0.3mm',
    copperPlateType: 'none',
  });

  // Fabric selection
  const [selectedFabricCategory, setSelectedFabricCategory] = useState<FabricCategory | null>(null);
  const { data: categoryFabricsData } = useFabrics(
    selectedFabricCategory
      ? { category: selectedFabricCategory, forAlbumCover: true, isActive: true, limit: 100 }
      : undefined,
  );
  const categoryFabrics = selectedFabricCategory ? (categoryFabricsData?.data || []) : [];

  const selectedFabricInfo = uploadFolders.length > 0
    ? {
        id: uploadFolders[0].selectedFabricId,
        name: uploadFolders[0].selectedFabricName,
        thumbnail: uploadFolders[0].selectedFabricThumbnail,
      }
    : null;

  const handleCoverFabricSelect = (fabric: Fabric) => {
    uploadFolders.forEach((f) => {
      setFolderFabric(
        f.id,
        fabric.id,
        fabric.name,
        fabric.thumbnailUrl || null,
        fabric.basePrice,
        fabric.category,
        fabric.colorCode || null,
        fabric.colorName || null,
      );
    });
  };

  // Upload progress modal
  const [uploadModalState, setUploadModalState] = useState<{
    isOpen: boolean;
    newCartItemIds: string[];
    primaryIds: string[];
  } | null>(null);

  // Section collapse state
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'settings',
    'upload',
    'folders',
    'cover',
  ]);

  // Product data helpers
  const productBindings = product?.bindings || [];
  const selectedBinding = useMemo(() => {
    const compressed = productBindings.find(
      (b) => b.name.includes('압축'),
    );
    return compressed || productBindings[0];
  }, [productBindings]);

  const activePapers = useMemo(() => {
    return (product?.papers || []).filter((p) => p.isActive !== false);
  }, [product?.papers]);

  const filteredPapers = useMemo(() => {
    return activePapers.filter((p) => p.printMethod === config.printMethod);
  }, [activePapers, config.printMethod]);

  const selectedPaper = useMemo(() => {
    return filteredPapers.find((p) => p.isDefault) || filteredPapers[0];
  }, [filteredPapers]);

  // Sync foil settings to folders
  useEffect(() => {
    if (uploadFolders.length === 0) return;
    if (config.copperPlateType === 'none') {
      setAllFoldersFoil(null, null, null);
      return;
    }
    const publicPlates = allPublicCopperPlates?.data || [];
    const plate =
      config.copperPlateType === 'public'
        ? publicPlates.find((p) => p.id === config.selectedPublicPlateId)
        : ownedCopperPlates?.find((cp) => cp.id === config.selectedOwnedPlateId);
    const foilColorName = copperPlateLabels?.foilColors?.find(
      (c) => c.code === config.foilColor,
    )?.name ?? null;
    const foilPositionName = copperPlateLabels?.platePositions?.find(
      (p) => p.code === config.foilPosition,
    )?.name ?? null;
    const plateName = plate
      ? ('plateName' in plate ? plate.plateName : '')
      : null;
    setAllFoldersFoil(plateName, foilColorName, foilPositionName);
  }, [
    config.copperPlateType,
    config.selectedPublicPlateId,
    config.selectedOwnedPlateId,
    config.foilColor,
    config.foilPosition,
    copperPlateLabels,
    uploadFolders.length,
    setAllFoldersFoil,
    allPublicCopperPlates,
    ownedCopperPlates,
  ]);

  // Price calculation
  const priceData = useMemo(() => {
    if (uploadFolders.length === 0) return null;
    return calculateTotalUploadedPrice(uploadFolders);
  }, [uploadFolders]);

  // Add all folders to cart
  const handleAddToCart = useCallback(() => {
    if (!product || uploadFolders.length === 0) return;

    try {
      const itemIdsBefore = new Set(useCartStore.getState().items.map((i) => i.id));

      // Collect file data before clearing
      const folderUploadMap = new Map<string, FolderUploadData>();
      uploadFolders.forEach((folder) => {
        if (!folderUploadMap.has(folder.id)) {
          folderUploadMap.set(folder.id, {
            folderId: folder.id,
            folderName: folder.orderTitle,
            files: folder.files.map((f, idx) => ({
              file: f.file,
              canvasDataUrl: f.canvasDataUrl,
              fileName: f.newFileName || f.fileName,
              sortOrder: idx,
              widthPx: f.widthPx,
              heightPx: f.heightPx,
              widthInch: f.widthInch,
              heightInch: f.heightInch,
              dpi: f.dpi,
              fileSize: f.fileSize,
            })),
          });
        }
      });

      // Resolve copper plate info
      const copperPlateName =
        config.copperPlateType === 'owned'
          ? ownedCopperPlates?.find((cp) => cp.id === config.selectedOwnedPlateId)?.plateName
          : config.copperPlateType === 'public'
            ? allPublicCopperPlates?.data?.find((p) => p.id === config.selectedPublicPlateId)?.plateName
            : undefined;
      const foilColorName = copperPlateLabels?.foilColors?.find(
        (c) => c.code === config.foilColor,
      )?.name;
      const foilPositionName = copperPlateLabels?.platePositions?.find(
        (p) => p.code === config.foilPosition,
      )?.name;

      uploadFolders.forEach((folder) => {
        folder.foilName = copperPlateName || null;
        folder.foilColor = foilColorName || null;
        folder.foilPosition = foilPositionName || null;
      });

      // Add items to cart
      uploadFolders.forEach((folder) => {
        const options: CartItemOption[] = [
          { name: '규격', value: folder.specLabel, price: 0 },
          { name: '페이지', value: `${folder.pageCount}p`, price: 0 },
        ];
        const allThumbnailUrls = folder.files
          .map((f) => f.thumbnailUrl)
          .filter((url): url is string => !!url);
        const folderPrice = calculateUploadedFolderPrice(folder);
        const shippingInfoData = folder.shippingInfo
          ? {
              senderType: folder.shippingInfo.senderType,
              senderName: folder.shippingInfo.senderName,
              senderPhone: folder.shippingInfo.senderPhone,
              senderPostalCode: folder.shippingInfo.senderPostalCode,
              senderAddress: folder.shippingInfo.senderAddress,
              senderAddressDetail: folder.shippingInfo.senderAddressDetail,
              receiverType: folder.shippingInfo.receiverType,
              recipientName: folder.shippingInfo.recipientName,
              recipientPhone: folder.shippingInfo.recipientPhone,
              recipientPostalCode: folder.shippingInfo.recipientPostalCode,
              recipientAddress: folder.shippingInfo.recipientAddress,
              recipientAddressDetail: folder.shippingInfo.recipientAddressDetail,
              deliveryMethod: folder.shippingInfo.deliveryMethod,
              deliveryFee: folder.shippingInfo.deliveryFee,
              deliveryFeeType: folder.shippingInfo.deliveryFeeType,
            }
          : undefined;

        addItem({
          productId: product.id,
          productType: 'album-order',
          name: `${product.productName} - ${folder.orderTitle}`,
          thumbnailUrl: folder.files[0]?.thumbnailUrl || product.thumbnailUrl,
          thumbnailUrls: allThumbnailUrls,
          basePrice: folderPrice.unitPrice,
          quantity: folder.quantity,
          options,
          totalPrice: folderPrice.totalPrice,
          albumOrderInfo: {
            folderId: folder.id,
            folderName: folder.orderTitle,
            fileCount: folder.files.length,
            pageCount: folder.pageCount,
            printMethod: config.printMethod,
            colorMode: '4c',
            pageLayout: folder.pageLayout || 'single',
            bindingDirection: folder.bindingDirection || 'LEFT_START_RIGHT_END',
            specificationId: '',
            specificationName: folder.specLabel,
            bindingName: selectedBinding?.name || undefined,
            paperName: selectedPaper?.name || undefined,
            totalSize: folder.totalFileSize || 0,
            foilName: folder.foilName || undefined,
            foilColor: folder.foilColor || undefined,
            foilPosition: folder.foilPosition || undefined,
            shippingInfo: shippingInfoData,
            coverSourceType: folder.coverSourceType || undefined,
            fabricId: folder.selectedFabricId || undefined,
            fabricName: folder.selectedFabricName || undefined,
            fabricThumbnail: folder.selectedFabricThumbnail || undefined,
          },
          uploadStatus: 'pending',
          totalFileCount: folder.files.length,
        });
      });

      // Identify new cart items
      const allItems = useCartStore.getState().items;
      const newItems = allItems.filter((i) => !itemIdsBefore.has(i.id));

      // Start background upload per folder
      const primaryIds: string[] = [];
      folderUploadMap.forEach((folderData, folderId) => {
        const relatedCartItems = newItems.filter(
          (item) => item.albumOrderInfo?.folderId === folderId,
        );
        if (relatedCartItems.length > 0) {
          const ids = relatedCartItems.map((i) => i.id);
          primaryIds.push(ids[0]);
          startBackgroundUpload(ids, folderData);
        }
      });

      clearFolders();
      setUploadModalState({
        isOpen: true,
        newCartItemIds: newItems.map((i) => i.id),
        primaryIds,
      });
    } catch {
      toast({
        title: '오류 발생',
        description: '장바구니에 담는 중 문제가 발생했습니다.',
        variant: 'destructive',
      });
    }
  }, [
    product,
    uploadFolders,
    addItem,
    clearFolders,
    config,
    selectedBinding,
    selectedPaper,
    ownedCopperPlates,
    allPublicCopperPlates,
    copperPlateLabels,
    toast,
  ]);

  // Loading state
  if (productLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-48 bg-muted rounded-xl" />
                <div className="h-48 bg-muted rounded-xl" />
              </div>
              <div className="h-64 bg-muted rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Card className="w-full max-w-md text-center p-8">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">상품을 찾을 수 없습니다</h2>
          <p className="text-muted-foreground mb-6">
            상품 정보를 불러올 수 없습니다. 상품 목록에서 다시 선택해주세요.
          </p>
          <Button asChild>
            <Link href="/">상품 목록으로</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Breadcrumb */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">
              홈
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              href={`/product/${productId}`}
              className="hover:text-primary transition-colors"
            >
              {product.productName}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">압축앨범 주문</span>
          </nav>
        </div>
      </div>

      {/* Page Header */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              압축앨범 주문
            </h1>
            <p className="text-muted-foreground mt-1">
              {product.productName} - 주문 설정 및 데이터 업로드
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Package className="w-3.5 h-3.5" />
              압축제본
            </Badge>
            {uploadFolders.length > 0 && (
              <Badge variant="default" className="gap-1">
                <FolderOpen className="w-3.5 h-3.5" />
                {uploadFolders.length}건
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Settings & Upload */}
          <div className="flex-1 space-y-6 min-w-0">
            {/* Section 1: Order Settings */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
                <SectionHeader
                  icon={<Settings2 className="w-5 h-5" />}
                  title="주문 설정"
                  description="앨범 타입, 출력방식, 속지 두께를 선택하세요"
                  step={1}
                />
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Album Type */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">앨범 타입</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {ALBUM_TYPES.map((type) => (
                      <OptionCard
                        key={type.value}
                        selected={config.albumType === type.value}
                        onClick={() =>
                          setConfig((prev) => ({ ...prev, albumType: type.value }))
                        }
                      >
                        <BookOpen
                          className={cn(
                            'w-8 h-8',
                            config.albumType === type.value
                              ? 'text-primary'
                              : 'text-muted-foreground',
                          )}
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm">{type.label}</span>
                          {type.badge && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700"
                            >
                              {type.badge}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {type.description}
                        </span>
                      </OptionCard>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Print Method */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">출력방식</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {PRINT_METHODS.map((method) => (
                      <OptionCard
                        key={method.value}
                        selected={config.printMethod === method.value}
                        onClick={() =>
                          setConfig((prev) => ({ ...prev, printMethod: method.value }))
                        }
                        className="py-3"
                      >
                        <Printer
                          className={cn(
                            'w-6 h-6',
                            config.printMethod === method.value
                              ? 'text-primary'
                              : 'text-muted-foreground',
                          )}
                        />
                        <span className="font-semibold text-sm">{method.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {method.description}
                        </span>
                      </OptionCard>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Inner Page Thickness */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">속지 두께</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {THICKNESS_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        selected={config.innerThickness === opt.value}
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            innerThickness: opt.value,
                          }))
                        }
                        className="py-3"
                      >
                        <div className="flex flex-col items-center gap-1">
                          {/* Visual thickness indicator */}
                          <div
                            className={cn(
                              'w-10 rounded-sm transition-all',
                              config.innerThickness === opt.value
                                ? 'bg-primary'
                                : 'bg-muted-foreground/30',
                            )}
                            style={{
                              height:
                                opt.value === '0.1mm'
                                  ? '2px'
                                  : opt.value === '0.3mm'
                                    ? '4px'
                                    : opt.value === '0.6mm'
                                      ? '6px'
                                      : '8px',
                            }}
                          />
                          <span className="font-bold text-sm mt-1">{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {opt.description}
                          </span>
                        </div>
                      </OptionCard>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Album Cover (Fabric Selection) */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 pb-4">
                <SectionHeader
                  icon={<Palette className="w-5 h-5" />}
                  title="앨범 표지"
                  description="원단 카테고리를 선택하고 표지를 고르세요"
                  step={2}
                />
              </CardHeader>
              <CardContent className="pt-6">
                {/* Selected fabric preview */}
                {selectedFabricInfo?.id && (
                  <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg border border-amber-200 bg-amber-50/50">
                    {selectedFabricInfo.thumbnail && (
                      <div
                        className="w-12 h-12 rounded-lg border border-amber-300 bg-cover bg-center flex-shrink-0 shadow-sm"
                        style={{
                          backgroundImage: `url(${normalizeImageUrl(selectedFabricInfo.thumbnail)})`,
                        }}
                      />
                    )}
                    <div>
                      <span className="text-sm font-semibold text-foreground">
                        {selectedFabricInfo.name}
                      </span>
                      <p className="text-xs text-muted-foreground">선택된 표지 원단</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                  </div>
                )}

                {/* Fabric categories */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(Object.keys(FABRIC_CATEGORY_LABELS) as FabricCategory[]).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedFabricCategory((prev) =>
                            prev === cat ? null : cat,
                          );
                          applyGlobalCoverSource('fabric');
                        }}
                        className={cn(
                          'px-4 py-2 text-sm font-medium rounded-lg border transition-all',
                          selectedFabricCategory === cat
                            ? FABRIC_CATEGORY_COLORS[cat]
                            : 'border-border bg-card text-muted-foreground hover:bg-accent',
                        )}
                      >
                        {FABRIC_CATEGORY_LABELS[cat]}
                      </button>
                    ),
                  )}
                </div>

                {/* Fabric grid */}
                {selectedFabricCategory && categoryFabrics.length > 0 && (
                  <div className="mt-4 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {categoryFabrics.map((fabric) => {
                      const isSelected = selectedFabricInfo?.id === fabric.id;
                      return (
                        <button
                          key={fabric.id}
                          type="button"
                          onClick={() => handleCoverFabricSelect(fabric)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all text-center relative',
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-transparent hover:border-border hover:bg-accent/50',
                          )}
                        >
                          {isSelected && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm z-10">
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </div>
                          )}
                          {fabric.thumbnailUrl ? (
                            <div
                              className={cn(
                                'w-14 h-14 rounded-lg border bg-cover bg-center flex-shrink-0',
                                isSelected && 'ring-2 ring-primary',
                              )}
                              style={{
                                backgroundImage: `url(${normalizeImageUrl(fabric.thumbnailUrl)})`,
                              }}
                            />
                          ) : fabric.colorCode ? (
                            <div
                              className={cn(
                                'w-14 h-14 rounded-lg border flex-shrink-0',
                                isSelected && 'ring-2 ring-primary',
                              )}
                              style={{ backgroundColor: fabric.colorCode }}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg border bg-muted flex items-center justify-center flex-shrink-0">
                              <Palette className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <span
                            className={cn(
                              'text-[10px] font-medium leading-tight line-clamp-2',
                              isSelected ? 'text-primary' : 'text-foreground',
                            )}
                          >
                            {fabric.name}
                          </span>
                          {fabric.colorName && (
                            <span className="text-[10px] text-muted-foreground leading-tight">
                              {fabric.colorName}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedFabricCategory && categoryFabrics.length === 0 && (
                  <div className="mt-4 text-center py-8 text-muted-foreground text-sm">
                    해당 카테고리에 등록된 원단이 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 3: Data Upload */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-4">
                <SectionHeader
                  icon={<Upload className="w-5 h-5" />}
                  title="데이터 업로드"
                  description="앨범 원판 폴더를 업로드하세요 (폴더 = 1건)"
                  step={3}
                />
              </CardHeader>
              <CardContent className="pt-6">
                <MultiFolderUpload />
              </CardContent>
            </Card>

            {/* Section 4: Uploaded Folders */}
            {uploadFolders.length > 0 && (
              <Card className="overflow-hidden border-0 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 pb-4">
                  <SectionHeader
                    icon={<FolderOpen className="w-5 h-5" />}
                    title={`업로드된 원판 (${uploadFolders.length}건)`}
                    description="각 폴더의 상세 정보를 확인하고 수정하세요"
                    step={4}
                  />
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {uploadFolders.map((folder) => (
                    <FolderCard key={folder.id} folder={folder} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {uploadFolders.length === 0 && (
              <Card className="border-dashed border-2 border-muted bg-muted/20">
                <CardContent className="p-0">
                  <EmptyUploadState />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sticky Summary */}
          <div className="lg:w-[360px] flex-shrink-0">
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* Price Summary Card */}
              <Card className="overflow-hidden border-0 shadow-md">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">주문 요약</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {/* Config Summary */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">앨범 타입</span>
                      <Badge variant="outline" className="font-medium">
                        {config.albumType === 'premium'
                          ? '고급 압축'
                          : '졸업 압축'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">출력방식</span>
                      <Badge variant="outline" className="font-medium">
                        {config.printMethod === 'indigo' ? '인디고' : '잉크젯'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">속지 두께</span>
                      <Badge variant="outline" className="font-medium">
                        {config.innerThickness}
                      </Badge>
                    </div>
                    {selectedFabricInfo?.name && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">표지 원단</span>
                        <span className="font-medium text-xs truncate max-w-[160px]">
                          {selectedFabricInfo.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator className="my-3" />

                  {/* Price Breakdown */}
                  {priceData ? (
                    <div className="space-y-1">
                      <PriceSummaryRow
                        label={`주문 건수`}
                        value={`${priceData.totalOrderCount}건`}
                        sub
                      />
                      <PriceSummaryRow
                        label="총 수량"
                        value={`${priceData.totalQuantity}권`}
                        sub
                      />
                      <Separator className="my-2" />

                      {priceData.folderPrices.map((fp, idx) => {
                        const folder = uploadFolders.find(
                          (f) => f.id === fp.folderId,
                        );
                        return (
                          <div key={fp.folderId} className="text-sm">
                            <div className="flex items-center justify-between py-1">
                              <span className="text-muted-foreground truncate max-w-[180px]">
                                {folder?.orderTitle || `원판 ${idx + 1}`}
                              </span>
                              <span className="font-medium">
                                {fp.price.subtotal.toLocaleString()}원
                              </span>
                            </div>
                            {folder && folder.additionalOrders.length > 0 && (
                              <div className="ml-3 space-y-0.5">
                                {folder.additionalOrders.map((ao) => (
                                  <div
                                    key={ao.id}
                                    className="flex items-center justify-between text-xs text-muted-foreground"
                                  >
                                    <span>+ {ao.albumLabel}</span>
                                    <span>
                                      {(
                                        calculateUploadedFolderPrice({
                                          ...folder,
                                          albumWidth: ao.albumWidth,
                                          albumHeight: ao.albumHeight,
                                          quantity: ao.quantity,
                                        } as UploadedFolder).subtotal
                                      ).toLocaleString()}
                                      원
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <Separator className="my-2" />
                      <PriceSummaryRow
                        label="공급가"
                        value={`${priceData.subtotal.toLocaleString()}원`}
                      />
                      <PriceSummaryRow
                        label="부가세 (10%)"
                        value={`${priceData.tax.toLocaleString()}원`}
                        sub
                      />
                      <Separator className="my-2" />
                      <PriceSummaryRow
                        label="합계"
                        value={`${priceData.totalPrice.toLocaleString()}원`}
                        highlight
                      />
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      <Calculator className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      데이터 업로드 후<br />
                      견적이 자동 계산됩니다
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  size="lg"
                  className="w-full gap-2 h-12 text-base font-bold shadow-lg"
                  disabled={uploadFolders.length === 0}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="w-5 h-5" />
                  장바구니에 담기
                  {priceData && (
                    <span className="text-primary-foreground/80 text-sm font-normal ml-1">
                      ({priceData.totalPrice.toLocaleString()}원)
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 h-10"
                  asChild
                >
                  <Link href={`/product/${productId}`}>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    상품 페이지로 돌아가기
                  </Link>
                </Button>
              </div>

              {/* Quick Info */}
              <Card className="border-0 shadow-sm bg-blue-50/50">
                <CardContent className="p-4">
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span>
                        고급 압축앨범은 최소 10페이지부터 주문 가능합니다.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span>
                        졸업 압축앨범은 2페이지 단위로 주문됩니다.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span>
                        폴더 1개 = 앨범 1건으로 접수됩니다.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress Modal */}
      {uploadModalState?.isOpen && (
        <UploadProgressModal
          isOpen={uploadModalState.isOpen}
          onClose={() => setUploadModalState(null)}
          newCartItemIds={uploadModalState.newCartItemIds}
          primaryIds={uploadModalState.primaryIds}
        />
      )}
    </div>
  );
}
