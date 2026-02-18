'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ChevronDown, ChevronUp, Minus, Plus, ShoppingCart, Image as ImageIcon, Star, FolderHeart, Loader2, Upload, BookOpen, AlertTriangle, Palette, Check } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useProduct } from '@/hooks/use-products';
import { Button } from '@/components/ui/button';
// Card components removed - using plain divs for cleaner layout
import { Skeleton } from '@/components/ui/skeleton';
// Badge removed - using inline styled spans
import { Label } from '@/components/ui/label';
// RadioGroup removed - using pill buttons instead
import { Checkbox } from '@/components/ui/checkbox';
import { useCartStore, type CartItemOption } from '@/stores/cart-store';
import { useToast } from '@/hooks/use-toast';
import { cn, normalizeImageUrl } from '@/lib/utils';
import { api } from '@/lib/api';
import type { Product, ProductSpecification, ProductBinding, ProductPaper, ProductCover, ProductFoil, ProductFinishing, ProductPublicCopperPlate } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useCopperPlatesByClient, useCopperPlateLabels, type CopperPlate } from '@/hooks/use-copper-plates';
import { useMyProductsByClient, useMyProduct, useCreateMyProduct, useRecordMyProductUsage, type MyProduct, type MyProductOptions } from '@/hooks/use-my-products';
import { usePublicCopperPlates, type PublicCopperPlate } from '@/hooks/use-public-copper-plates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MultiFolderUpload } from '@/components/album-upload';
import { useMultiFolderUploadStore, type UploadedFolder, type CoverSourceType, calculateUploadedFolderPrice, calculateAdditionalOrderPrice } from '@/stores/multi-folder-upload-store';
import { useFabrics, FABRIC_CATEGORY_LABELS, FABRIC_CATEGORY_COLORS, type Fabric, type FabricCategory } from '@/hooks/use-fabrics';
import { useTranslations } from 'next-intl';
import { startBackgroundUpload, type FolderUploadData } from '@/lib/background-upload';
import { UploadProgressModal } from './_components/upload-progress-modal';

interface SelectedOptions {
  specification?: ProductSpecification;
  binding?: ProductBinding;
  paper?: ProductPaper;
  cover?: ProductCover;
  foil?: ProductFoil;
  finishings: ProductFinishing[];
  printSide?: 'single' | 'double';  // 단면/양면
  printMethod?: 'indigo' | 'inkjet';  // 출력방식 (인디고/잉크젯)
  // 페이지 편집 방식 및 제본 순서
  pageEditMode?: 'single' | 'spread';  // 낱장 / 펼침면
  bindingDirection?: string;  // 좌시작→우끝, 좌시작→좌끝, 우시작→좌끝, 우시작→우끝
  // 동판 관련
  copperPlateType?: 'none' | 'public' | 'owned';  // 동판 선택 타입
  publicCopperPlate?: PublicCopperPlate;          // 공용동판
  ownedCopperPlate?: CopperPlate;                 // 보유동판
  foilColor?: string;                              // 박 색상 (동판 선택 시)
  foilPosition?: string;                           // 박 위치 (동판 선택 시)
}

// 제본방법에 따른 기본 출력구분 결정
// 화보(핀화보, 스타화보, 포토북) → 양면출력
// 압축제본(압축제본, 맞장제본, 레이플릿제본) → 단면출력
const getDefaultPrintSideByBinding = (bindingName: string): 'single' | 'double' => {
  const lowerName = bindingName.toLowerCase();
  // 압축제본류 → 단면출력
  if (lowerName.includes('압축') || lowerName.includes('맞장') || lowerName.includes('레이플릿')) {
    return 'single'; // 단면출력
  }
  // 화보류 → 양면출력
  if (lowerName.includes('화보') || lowerName.includes('핀화보') || lowerName.includes('스타화보') || lowerName.includes('포토북')) {
    return 'double'; // 양면출력
  }
  return 'double'; // 기본값: 양면출력
};

// 화보/앨범 상품인지 확인 (위자드 모드 필요한 상품)
const isAlbumProduct = (bindings?: ProductBinding[]): boolean => {
  if (!bindings || bindings.length === 0) return false;
  return bindings.some(binding => {
    const name = binding.name.toLowerCase();
    return name.includes('화보') ||
           name.includes('포토북') ||
           name.includes('스타화보') ||
           name.includes('핀화보') ||
           name.includes('스타제본');  // 스타제본 추가
  });
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = params.id as string;
  const myProductIdParam = searchParams.get('myProductId');
  const { toast } = useToast();

  const t = useTranslations('product');
  const tc = useTranslations('common');
  const { data: product, isLoading, error } = useProduct(productId);
  const { addItem, items: cartItems } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  // 보유동판 조회 (로그인한 사용자의 거래처 동판)
  const { data: ownedCopperPlates } = useCopperPlatesByClient(isAuthenticated ? user?.id : undefined);
  // 박 색상/위치 라벨 조회
  const { data: copperPlateLabels } = useCopperPlateLabels();
  // 공용동판 전체 조회 (공용동판관리에 등록된 모든 동판)
  const { data: allPublicCopperPlates } = usePublicCopperPlates({ status: 'active' });

  // 마이상품 조회 및 저장
  const { data: myProducts } = useMyProductsByClient(isAuthenticated ? user?.id : undefined);
  const { data: myProductFromParam } = useMyProduct(myProductIdParam || undefined);
  const createMyProduct = useCreateMyProduct();
  const recordMyProductUsage = useRecordMyProductUsage();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({
    finishings: [],
  });

  // 제작가능규격 섹션 펼침 상태
  const [isSpecExpanded, setIsSpecExpanded] = useState(false);
  // (동판 펼침 상태는 JSX return 직전에서 관리)

  // 마이상품 모달 상태
  const [showSaveMyProductModal, setShowSaveMyProductModal] = useState(false);
  const [showLoadMyProductModal, setShowLoadMyProductModal] = useState(false);
  const [myProductName, setMyProductName] = useState('');

  // 데이터 업로드 스토어에서 편집스타일/제본순서/표지유형 가져오기
  const {
    defaultPageLayout,
    defaultBindingDirection,
    defaultCoverSourceType,
    folders: uploadFolders,
    clearFolders,
    applyGlobalCoverSource,
    setFolderFabric,
    setAllFoldersFoil,
  } = useMultiFolderUploadStore();

  // 표지 원단 카테고리 선택
  const [selectedFabricCategory, setSelectedFabricCategory] = useState<FabricCategory | null>(null);

  // 카테고리별 원단 목록 조회 (카테고리 선택 시에만)
  const { data: categoryFabricsData } = useFabrics(
    selectedFabricCategory
      ? { category: selectedFabricCategory, forAlbumCover: true, isActive: true, limit: 100 }
      : undefined
  );
  const categoryFabrics = selectedFabricCategory ? (categoryFabricsData?.data || []) : [];

  // 현재 선택된 원단 (첫 번째 폴더 기준)
  const selectedFabricInfo = uploadFolders.length > 0 ? {
    id: uploadFolders[0].selectedFabricId,
    name: uploadFolders[0].selectedFabricName,
    thumbnail: uploadFolders[0].selectedFabricThumbnail,
  } : null;

  const handleCoverFabricSelect = (fabric: Fabric) => {
    uploadFolders.forEach(f => {
      setFolderFabric(f.id, fabric.id, fabric.name, fabric.thumbnailUrl || null, fabric.basePrice, fabric.category, fabric.colorCode || null, fabric.colorName || null);
    });
  };

  // 업로드 진행 모달 상태
  const [uploadModalState, setUploadModalState] = useState<{
    isOpen: boolean;
    newCartItemIds: string[];
    primaryIds: string[];
  } | null>(null);

  // 중복 주문 체크 상태
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<{
    duplicates: { folderName: string; orderNumber: string; orderedAt: string; status: string }[];
    pendingFolders: UploadedFolder[];
    months: number;
  } | null>(null);

  // 폴더들을 장바구니에 추가하는 함수
  const addFoldersToCart = useCallback((folders: UploadedFolder[], isDuplicateOverride = false) => {
    if (!product) return;
    setTimeout(() => {
      try {
        // 1. 업로드 전 기존 장바구니 아이템 ID 스냅샷
        const itemIdsBefore = new Set(useCartStore.getState().items.map(i => i.id));

        // 2. 폴더별 파일 데이터 수집 (clearFolders 전에 File 참조 확보)
        const folderUploadMap = new Map<string, FolderUploadData>();
        folders.forEach((folder) => {
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

        // 2.5. 동판 정보를 selectedOptions에서 가져와 폴더에 주입
        const copperPlateName = selectedOptions.copperPlateType === 'owned'
          ? selectedOptions.ownedCopperPlate?.plateName
          : selectedOptions.copperPlateType === 'public'
            ? selectedOptions.publicCopperPlate?.plateName
            : undefined;
        const foilColorName = copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name;
        const foilPositionName = copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name;

        folders.forEach((folder) => {
          folder.foilName = copperPlateName || null;
          folder.foilColor = foilColorName || null;
          folder.foilPosition = foilPositionName || null;
        });

        // 3. 장바구니에 아이템 추가 (uploadStatus: 'pending')
        folders.forEach((folder) => {
          const options: CartItemOption[] = [
            { name: '규격', value: folder.specLabel, price: 0 },
            { name: '페이지', value: `${folder.pageCount}p`, price: 0 },
          ];
          const allThumbnailUrls = folder.files
            .map(f => f.thumbnailUrl)
            .filter((url): url is string => !!url);
          const folderPrice = calculateUploadedFolderPrice(folder);
          const shippingInfoData = folder.shippingInfo ? {
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
          } : undefined;

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
              printMethod: selectedOptions.printMethod || 'indigo',
              colorMode: '4c',
              pageLayout: folder.pageLayout || 'single',
              bindingDirection: folder.bindingDirection || 'LEFT_START_RIGHT_END',
              specificationId: '',
              specificationName: folder.specLabel,
              bindingName: selectedOptions.binding?.name || undefined,
              paperName: selectedOptions.paper?.name || undefined,
              coverMaterial: selectedOptions.cover?.name || undefined,
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
            isDuplicateOverride,
          });

          folder.additionalOrders.forEach((additional) => {
            const additionalPrice = calculateAdditionalOrderPrice(additional, folder);
            addItem({
              productId: product.id,
              productType: 'album-order',
              name: `${product.productName} - ${folder.orderTitle} (${additional.albumLabel})`,
              thumbnailUrl: folder.files[0]?.thumbnailUrl || product.thumbnailUrl,
              thumbnailUrls: allThumbnailUrls,
              basePrice: additionalPrice.unitPrice,
              quantity: additional.quantity,
              options: [
                { name: '규격', value: additional.albumLabel, price: 0 },
                { name: '페이지', value: `${folder.pageCount}p`, price: 0 },
              ],
              totalPrice: additionalPrice.totalPrice,
              albumOrderInfo: {
                folderId: folder.id,
                folderName: folder.orderTitle,
                fileCount: folder.files.length,
                pageCount: folder.pageCount,
                printMethod: selectedOptions.printMethod || 'indigo',
                colorMode: '4c',
                pageLayout: folder.pageLayout || 'single',
                bindingDirection: folder.bindingDirection || 'LEFT_START_RIGHT_END',
                specificationId: '',
                specificationName: additional.albumLabel,
                bindingName: selectedOptions.binding?.name || undefined,
                paperName: selectedOptions.paper?.name || undefined,
                coverMaterial: selectedOptions.cover?.name || undefined,
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
              isDuplicateOverride,
            });
          });
        });

        // 4. 새로 추가된 카트 아이템 식별
        const allItems = useCartStore.getState().items;
        const newItems = allItems.filter((i) => !itemIdsBefore.has(i.id));

        // 5. 폴더별로 백그라운드 업로드 시작 + primaryId 수집
        const primaryIds: string[] = [];
        folderUploadMap.forEach((folderData, folderId) => {
          const relatedCartItems = newItems.filter(
            (item) => item.albumOrderInfo?.folderId === folderId
          );
          if (relatedCartItems.length > 0) {
            const ids = relatedCartItems.map((i) => i.id);
            primaryIds.push(ids[0]);
            startBackgroundUpload(ids, folderData);
          }
        });

        // 6. 업로드 스토어 정리 + 업로드 진행 모달 표시
        clearFolders();
        setUploadModalState({
          isOpen: true,
          newCartItemIds: newItems.map((i) => i.id),
          primaryIds,
        });
      } catch (error) {
        toast({
          title: '오류 발생',
          description: '장바구니에 담는 중 문제가 발생했습니다. 다시 시도해주세요.',
          variant: 'destructive',
        });
      }
    }, 50);
  }, [product, addItem, clearFolders, router, toast, defaultPageLayout, defaultBindingDirection, selectedOptions, copperPlateLabels]);

  // 화보/앨범 상품인지 확인
  const isAlbum = useMemo(() => {
    return isAlbumProduct(product?.bindings);
  }, [product?.bindings]);

  // Set default options when product loads
  useEffect(() => {
    if (product) {
      const defaultBinding = product.bindings?.find(b => b.isDefault) || product.bindings?.[0];
      const publicPlates = allPublicCopperPlates?.data || [];
      const defaultPublicCopperPlate = publicPlates[0];

      // 출력방식 기본값 결정: 인디고 용지가 있으면 인디고, 아니면 잉크젯
      const activePapers = product.papers?.filter(p => p.isActive !== false) || [];
      const hasIndigo = activePapers.some(p => p.printMethod === 'indigo');
      const defaultPrintMethod: 'indigo' | 'inkjet' = hasIndigo ? 'indigo' : 'inkjet';

      // 해당 출력방식의 용지 중에서 기본값 선택
      const filteredPapers = activePapers.filter(p => p.printMethod === defaultPrintMethod);
      const defaultPaper = filteredPapers.find(p => p.isDefault) || filteredPapers[0] || activePapers.find(p => p.isDefault) || activePapers[0];

      setSelectedOptions({
        specification: product.specifications?.find(s => s.isDefault) || product.specifications?.[0],
        binding: defaultBinding,
        paper: defaultPaper,
        printMethod: defaultPrintMethod,
        cover: product.covers?.find(c => c.isDefault) || product.covers?.[0],
        foil: product.foils?.find(f => f.isDefault) || product.foils?.[0],
        finishings: product.finishings?.filter(f => f.isDefault) || [],
        printSide: defaultBinding ? getDefaultPrintSideByBinding(defaultBinding.name) : 'double',
        // 동판 기본값: 저장파일/즐겨찾기 불러오기가 아니면 '동판 없음'
        copperPlateType: 'none',
        publicCopperPlate: defaultPublicCopperPlate,
        ownedCopperPlate: undefined,
        foilColor: copperPlateLabels?.foilColors?.[0]?.code,
        foilPosition: copperPlateLabels?.platePositions?.[0]?.code,
      });
    }
  }, [product, copperPlateLabels, allPublicCopperPlates]);

  // 마이상품에서 진입 시 저장된 옵션 자동 적용
  const [myProductApplied, setMyProductApplied] = useState(false);
  useEffect(() => {
    if (!myProductIdParam || !myProductFromParam || !product || myProductApplied) return;

    const opts = myProductFromParam.options;
    const spec = product.specifications?.find(s => s.id === opts.specificationId);
    const binding = product.bindings?.find(b => b.id === opts.bindingId);
    const paper = product.papers?.find(p => p.id === opts.paperId);
    const cover = product.covers?.find(c => c.id === opts.coverId);
    const finishings = product.finishings?.filter(f => opts.finishingIds?.includes(f.id)) || [];
    const ownedPlate = opts.copperPlateType === 'owned'
      ? ownedCopperPlates?.find(cp => cp.id === opts.copperPlateId)
      : undefined;
    const publicPlate = opts.copperPlateType === 'public'
      ? product.publicCopperPlates?.find(p => p.id === opts.copperPlateId)?.publicCopperPlate
      : undefined;

    setSelectedOptions({
      specification: spec,
      binding,
      paper,
      cover,
      finishings,
      printSide: opts.printSide,
      printMethod: paper?.printMethod || 'indigo',
      copperPlateType: opts.copperPlateType,
      ownedCopperPlate: ownedPlate,
      publicCopperPlate: publicPlate,
      foilColor: opts.foilColor,
      foilPosition: opts.foilPosition,
    });

    // 원단 정보 복원
    if (opts.coverSourceType) {
      applyGlobalCoverSource(opts.coverSourceType);
    }
    if (opts.fabricId && opts.fabricName) {
      uploadFolders.forEach(f => {
        setFolderFabric(f.id, opts.fabricId!, opts.fabricName!, opts.fabricThumbnail || null, 0, '', null, null);
      });
    }

    if (myProductFromParam.defaultQuantity) {
      setQuantity(myProductFromParam.defaultQuantity);
    }

    setMyProductApplied(true);
    recordMyProductUsage.mutate(myProductFromParam.id);

    toast({
      title: t('myProductLoaded'),
      description: t('myProductLoadedDesc', { name: myProductFromParam.name }),
    });
  }, [myProductIdParam, myProductFromParam, product, myProductApplied, ownedCopperPlates]);

  // 동판 옵션 변경 시 업로드된 폴더에 동기화
  useEffect(() => {
    if (uploadFolders.length === 0) return;
    const copperPlateName = selectedOptions.copperPlateType === 'owned'
      ? selectedOptions.ownedCopperPlate?.plateName
      : selectedOptions.copperPlateType === 'public'
        ? selectedOptions.publicCopperPlate?.plateName
        : null;
    const foilColorName = selectedOptions.copperPlateType !== 'none'
      ? (copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name ?? null)
      : null;
    const foilPositionName = selectedOptions.copperPlateType !== 'none'
      ? (copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name ?? null)
      : null;
    setAllFoldersFoil(copperPlateName ?? null, foilColorName, foilPositionName);
  }, [
    selectedOptions.copperPlateType,
    selectedOptions.ownedCopperPlate,
    selectedOptions.publicCopperPlate,
    selectedOptions.foilColor,
    selectedOptions.foilPosition,
    copperPlateLabels,
    uploadFolders.length,
    setAllFoldersFoil,
  ]);

  // 가격 계산 (early return 위에 배치)
  const totalPrice = useMemo(() => {
    if (!product) return 0;
    let price = product.basePrice;
    if (selectedOptions.specification) price += selectedOptions.specification.price;
    if (selectedOptions.binding) price += selectedOptions.binding.price;
    if (selectedOptions.paper) price += selectedOptions.paper.price;
    if (selectedOptions.cover) price += selectedOptions.cover.price;
    if (selectedOptions.foil) price += selectedOptions.foil.price;
    for (const finishing of selectedOptions.finishings) {
      price += finishing.price;
    }
    return price * quantity;
  }, [product, selectedOptions, quantity]);

  // 이미지 목록 (early return 위에 배치)
  const images = useMemo(() => {
    if (!product) return [];
    if (product.thumbnailUrl) {
      return [normalizeImageUrl(product.thumbnailUrl), ...product.detailImages.map(img => normalizeImageUrl(img))];
    }
    if (product.detailImages.length > 0) {
      return product.detailImages.map(img => normalizeImageUrl(img));
    }
    return [];
  }, [product]);

  // 동판 섹션 펼침/접힘 상태 (기본 접힘)
  const [isCopperPlateExpanded, setIsCopperPlateExpanded] = useState(false);
  // 상세정보 섹션 펼침/접힘 상태 (기본 접힘)
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);

  // 동판 요약 텍스트
  const copperPlateSummary = useMemo(() => {
    if (!selectedOptions.copperPlateType || selectedOptions.copperPlateType === 'none') return t('noCopperPlate');
    if (selectedOptions.copperPlateType === 'public' && selectedOptions.publicCopperPlate) {
      return `${t('publicCopperPlate')} - ${selectedOptions.publicCopperPlate.plateName}`;
    }
    if (selectedOptions.copperPlateType === 'owned' && selectedOptions.ownedCopperPlate) {
      return `${t('ownedCopperPlate')} - ${selectedOptions.ownedCopperPlate.plateName}`;
    }
    return t('noCopperPlate');
  }, [selectedOptions.copperPlateType, selectedOptions.publicCopperPlate, selectedOptions.ownedCopperPlate, t]);

  // 동판 존재 여부
  const hasCopperPlateOptions = ((allPublicCopperPlates?.data && allPublicCopperPlates.data.length > 0) || (isAuthenticated && ownedCopperPlates && ownedCopperPlates.length > 0));

  if (isLoading) {
    return <ProductPageSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">{t('notFound')}</h1>
        <p className="text-gray-500 mb-8">{t('notFoundDescription')}</p>
        <Link href="/">
          <Button>{t('goHome')}</Button>
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    const options: CartItemOption[] = [];

    if (selectedOptions.specification) {
      options.push({
        name: t('spec'),
        value: selectedOptions.specification.name,
        price: selectedOptions.specification.price,
      });
    }
    if (selectedOptions.binding) {
      options.push({
        name: t('binding'),
        value: selectedOptions.binding.name,
        price: selectedOptions.binding.price,
      });
    }
    if (selectedOptions.paper) {
      options.push({
        name: t('paper'),
        value: selectedOptions.paper.name,
        price: selectedOptions.paper.price,
      });
    }
    if (selectedOptions.cover) {
      options.push({
        name: t('cover'),
        value: selectedOptions.cover.name,
        price: selectedOptions.cover.price,
      });
    }
    if (selectedOptions.foil) {
      options.push({
        name: t('foilStamping'),
        value: selectedOptions.foil.name,
        price: selectedOptions.foil.price,
      });
    }
    for (const finishing of selectedOptions.finishings) {
      options.push({
        name: t('finishing'),
        value: finishing.name,
        price: finishing.price,
      });
    }
    options.push({
      name: t('printSection'),
      value: selectedOptions.printSide === 'single' ? t('singleSided') : t('doubleSided'),
      price: 0,
    });

    if (selectedOptions.copperPlateType === 'none' || !selectedOptions.copperPlateType) {
      options.push({
        name: t('copperPlate'),
        value: t('none'),
        price: 0,
      });
    } else if (selectedOptions.copperPlateType === 'public' && selectedOptions.publicCopperPlate) {
      const plate = selectedOptions.publicCopperPlate;
      const foilColorLabel = copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name || selectedOptions.foilColor;
      const foilPositionLabel = copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name || selectedOptions.foilPosition;
      options.push({
        name: t('copperPlate'),
        value: `${t('publicCopperPlate')} - ${plate.plateName}`,
        price: 0,
      });
      if (selectedOptions.foilColor) {
        options.push({
          name: t('foilColor'),
          value: foilColorLabel || '',
          price: 0,
        });
      }
      if (selectedOptions.foilPosition) {
        options.push({
          name: t('foilPosition'),
          value: foilPositionLabel || '',
          price: 0,
        });
      }
    } else if (selectedOptions.copperPlateType === 'owned' && selectedOptions.ownedCopperPlate) {
      const plate = selectedOptions.ownedCopperPlate;
      const foilColorLabel = copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name
        || copperPlateLabels?.foilColors?.find(c => c.code === plate.foilColor)?.name
        || plate.foilColorName;
      const foilPositionLabel = copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name
        || copperPlateLabels?.platePositions?.find(p => p.code === plate.foilPosition)?.name;
      options.push({
        name: t('copperPlate'),
        value: `${t('ownedCopperPlate')} - ${plate.plateName}`,
        price: 0,
      });
      if (foilColorLabel) {
        options.push({
          name: t('foilColor'),
          value: foilColorLabel,
          price: 0,
        });
      }
      if (foilPositionLabel) {
        options.push({
          name: t('foilPosition'),
          value: foilPositionLabel,
          price: 0,
        });
      }
    }

    // 보유동판 정보 준비 (변경 감지용)
    const copperPlateInfo = selectedOptions.copperPlateType === 'owned' && selectedOptions.ownedCopperPlate
      ? {
          copperPlateId: selectedOptions.ownedCopperPlate.id,
          plateName: selectedOptions.ownedCopperPlate.plateName,
          // 원래 동판에 저장된 값
          originalFoilColor: selectedOptions.ownedCopperPlate.foilColor || '',
          originalFoilColorName: selectedOptions.ownedCopperPlate.foilColorName || '',
          originalFoilPosition: selectedOptions.ownedCopperPlate.foilPosition || '',
          originalFoilPositionName: copperPlateLabels?.platePositions?.find(
            p => p.code === selectedOptions.ownedCopperPlate?.foilPosition
          )?.name || '',
          // 사용자가 선택한 값
          selectedFoilColor: selectedOptions.foilColor || selectedOptions.ownedCopperPlate.foilColor || '',
          selectedFoilColorName: copperPlateLabels?.foilColors?.find(
            c => c.code === (selectedOptions.foilColor || selectedOptions.ownedCopperPlate?.foilColor)
          )?.name || selectedOptions.ownedCopperPlate.foilColorName || '',
          selectedFoilPosition: selectedOptions.foilPosition || selectedOptions.ownedCopperPlate.foilPosition || '',
          selectedFoilPositionName: copperPlateLabels?.platePositions?.find(
            p => p.code === (selectedOptions.foilPosition || selectedOptions.ownedCopperPlate?.foilPosition)
          )?.name || '',
        }
      : undefined;

    addItem({
      productId: product.id,
      productType: 'product',
      name: product.productName,
      thumbnailUrl: product.thumbnailUrl,
      basePrice: product.basePrice,
      quantity,
      options,
      totalPrice: totalPrice,
      copperPlateInfo,
    });

    toast({
      title: t('addedToCart'),
      description: t('addedToCartDesc', { name: product.productName, qty: quantity }),
    });

    router.push('/cart');
  };


  // 마이상품 저장
  const handleSaveMyProduct = async () => {
    if (!isAuthenticated || !user?.id || !product) {
      toast({
        title: t('loginRequired'),
        description: t('loginRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    const options: MyProductOptions = {
      bindingId: selectedOptions.binding?.id,
      bindingName: selectedOptions.binding?.name,
      paperId: selectedOptions.paper?.id,
      paperName: selectedOptions.paper?.name,
      coverId: selectedOptions.cover?.id,
      coverName: selectedOptions.cover?.name,
      printSide: selectedOptions.printSide,
      copperPlateType: selectedOptions.copperPlateType,
      copperPlateId: selectedOptions.copperPlateType === 'owned'
        ? selectedOptions.ownedCopperPlate?.id
        : selectedOptions.copperPlateType === 'public'
          ? selectedOptions.publicCopperPlate?.id
          : undefined,
      copperPlateName: selectedOptions.copperPlateType === 'owned'
        ? selectedOptions.ownedCopperPlate?.plateName
        : selectedOptions.copperPlateType === 'public'
          ? selectedOptions.publicCopperPlate?.plateName
          : undefined,
      foilColor: selectedOptions.foilColor,
      foilColorName: copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name,
      foilPosition: selectedOptions.foilPosition,
      foilPositionName: copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name,
      finishingIds: selectedOptions.finishings.map(f => f.id),
      finishingNames: selectedOptions.finishings.map(f => f.name),
      // 원단 (앨범 표지)
      coverSourceType: uploadFolders[0]?.coverSourceType || undefined,
      fabricId: selectedFabricInfo?.id || undefined,
      fabricName: selectedFabricInfo?.name || undefined,
      fabricThumbnail: selectedFabricInfo?.thumbnail || undefined,
    };

    try {
      await createMyProduct.mutateAsync({
        clientId: user.id,
        productId: product.id,
        name: myProductName || `${product.productName} ${selectedOptions.specification?.name || ''}`.trim(),
        thumbnailUrl: product.thumbnailUrl || undefined,
        options,
        defaultQuantity: quantity,
      });

      toast({
        title: t('myProductSaved'),
        description: t('myProductSavedDesc'),
      });
      setShowSaveMyProductModal(false);
      setMyProductName('');
    } catch {
      toast({
        title: t('saveFailed'),
        description: t('saveFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  // 마이상품 불러오기
  const handleLoadMyProduct = (myProduct: MyProduct) => {
    const opts = myProduct.options;

    // 규격 찾기
    const spec = product?.specifications?.find(s => s.id === opts.specificationId);
    // 제본방법 찾기
    const binding = product?.bindings?.find(b => b.id === opts.bindingId);
    // 용지 찾기
    const paper = product?.papers?.find(p => p.id === opts.paperId);
    // 커버 찾기
    const cover = product?.covers?.find(c => c.id === opts.coverId);
    // 후가공 찾기
    const finishings = product?.finishings?.filter(f => opts.finishingIds?.includes(f.id)) || [];
    // 보유동판 찾기
    const ownedPlate = opts.copperPlateType === 'owned'
      ? ownedCopperPlates?.find(cp => cp.id === opts.copperPlateId)
      : undefined;
    // 공용동판 찾기
    const publicPlate = opts.copperPlateType === 'public'
      ? product?.publicCopperPlates?.find(p => p.id === opts.copperPlateId)?.publicCopperPlate
      : undefined;

    setSelectedOptions({
      specification: spec,
      binding,
      paper,
      cover,
      finishings,
      printSide: opts.printSide,
      copperPlateType: opts.copperPlateType,
      ownedCopperPlate: ownedPlate,
      publicCopperPlate: publicPlate,
      foilColor: opts.foilColor,
      foilPosition: opts.foilPosition,
    });

    // 원단 정보 복원 (표지 유형 및 원단 선택)
    if (opts.coverSourceType) {
      applyGlobalCoverSource(opts.coverSourceType);
    }
    if (opts.fabricId && opts.fabricName) {
      uploadFolders.forEach(f => {
        setFolderFabric(f.id, opts.fabricId!, opts.fabricName!, opts.fabricThumbnail || null, 0, '', null, null);
      });
      setSelectedFabricCategory(null);
    }

    setQuantity(myProduct.defaultQuantity);

    setShowLoadMyProductModal(false);

    toast({
      title: t('myProductLoaded'),
      description: t('myProductLoadedDesc', { name: myProduct.name }),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Breadcrumb - compact */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/" className="hover:text-primary">{tc('home')}</Link>
            <ChevronRight className="h-3 w-3" />
            {product.category && (
              <>
                <Link href={`/category/${product.category.id}`} className="hover:text-primary">
                  {product.category.name}
                </Link>
                <ChevronRight className="h-3 w-3" />
              </>
            )}
            <span className="text-gray-900 font-medium truncate max-w-[200px]">
              {product.productName}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Main two-column: Image LEFT, Options RIGHT */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT: Product Image */}
          <div className="w-full lg:w-[360px] lg:sticky lg:top-4 lg:self-start flex-shrink-0 space-y-2">
            <div className="aspect-square bg-white rounded-lg border overflow-hidden shadow-sm">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.productName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <ImageIcon className="h-16 w-16 text-gray-300" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      "w-14 h-14 flex-shrink-0 rounded border-2 overflow-hidden transition-all",
                      selectedImage === idx ? "border-primary ring-1 ring-primary/20" : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Options - scrollable */}
          <div className="flex-1 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-1">
            {/* Title + Action buttons row */}
            <div className="mb-4">
              <h1 className="text-xl md:text-2xl font-bold mb-2">{product.productName}</h1>
              <div className="flex flex-wrap gap-1.5">
                {isAuthenticated && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMyProductName(`${product.productName} ${selectedOptions.specification?.name || ''}`.trim());
                        setShowSaveMyProductModal(true);
                      }}
                      className="text-xs h-7 px-2 text-primary border-primary hover:bg-primary/10"
                    >
                      <Star className="h-3.5 w-3.5 mr-1" />
                      {t('saveMyProduct')}
                    </Button>
                    {myProducts && myProducts.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLoadMyProductModal(true)}
                        className="text-xs h-7 px-2 text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        <FolderHeart className="h-3.5 w-3.5 mr-1" />
                        {t('loadMyProduct')} ({myProducts.filter(mp => mp.productId === product.id).length})
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Options - compact spacing */}
            <div className="space-y-4">
              {/* Binding - pill buttons */}
              {product.bindings && product.bindings.length > 0 && (
                <OptionSection title={t('bindingMethod')}>
                  <div className="flex flex-wrap gap-1.5">
                    {product.bindings.map((binding) => (
                      <button
                        key={binding.id}
                        type="button"
                        onClick={() => {
                          setSelectedOptions(prev => ({
                            ...prev,
                            binding,
                            printSide: getDefaultPrintSideByBinding(binding.name),
                          }));
                        }}
                        className={cn(
                          "px-3 py-1.5 text-xs rounded-full border transition-all",
                          selectedOptions.binding?.id === binding.id
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "border-gray-300 hover:border-gray-400 bg-white"
                        )}
                      >
                        {binding.name.split(' - ')[0]}
                        {binding.price > 0 && ` +${binding.price.toLocaleString()}`}
                      </button>
                    ))}
                  </div>
                  {/* Print side as small text below binding */}
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    {selectedOptions.printSide === 'single' ? t('singleSided') : t('doubleSided')}
                    {' '}({t('autoByBinding')})
                  </p>
                </OptionSection>
              )}

              {/* 앨범표지 - 화보/앨범 상품만 */}
              {isAlbum && (
                <OptionSection title={t('albumCover')}>
                  {/* 선택된 원단 표시 */}
                  {selectedFabricInfo?.id && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 mb-2 rounded-md border border-amber-200 bg-amber-50">
                      {selectedFabricInfo.thumbnail && (
                        <div
                          className="w-8 h-8 rounded border border-amber-300 bg-cover bg-center flex-shrink-0"
                          style={{ backgroundImage: `url(${normalizeImageUrl(selectedFabricInfo.thumbnail)})` }}
                        />
                      )}
                      <span className="text-xs font-medium text-gray-800">{selectedFabricInfo.name}</span>
                    </div>
                  )}

                  {/* 카테고리 pill buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(Object.keys(FABRIC_CATEGORY_LABELS) as FabricCategory[]).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedFabricCategory(prev => prev === cat ? null : cat);
                          applyGlobalCoverSource('fabric');
                        }}
                        className={cn(
                          'px-2.5 py-1 text-xs font-medium rounded-full border transition-all',
                          selectedFabricCategory === cat
                            ? FABRIC_CATEGORY_COLORS[cat]
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        {FABRIC_CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>

                  {/* Fabric grid - smaller thumbnails */}
                  {selectedFabricCategory && categoryFabrics.length > 0 && (
                    <div className="mt-2 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 max-h-[240px] overflow-y-auto pr-1">
                      {categoryFabrics.map((fabric) => {
                          const isSelected = selectedFabricInfo?.id === fabric.id;
                          return (
                          <button
                            key={fabric.id}
                            type="button"
                            onClick={() => handleCoverFabricSelect(fabric)}
                            className={cn(
                              'flex flex-col items-center gap-0.5 p-1.5 rounded-lg border-2 transition-all text-center relative',
                              isSelected
                                ? 'border-pink-500 bg-pink-50'
                                : 'border-transparent hover:border-gray-300 hover:bg-gray-50'
                            )}
                          >
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-sm z-10">
                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                              </div>
                            )}
                            <div className="relative">
                              {fabric.thumbnailUrl ? (
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded border bg-cover bg-center flex-shrink-0",
                                    isSelected && "ring-2 ring-pink-400"
                                  )}
                                  style={{ backgroundImage: `url(${normalizeImageUrl(fabric.thumbnailUrl)})` }}
                                />
                              ) : fabric.colorCode ? (
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded border flex-shrink-0",
                                    isSelected && "ring-2 ring-pink-400"
                                  )}
                                  style={{ backgroundColor: fabric.colorCode }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded border bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <Palette className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <span className={cn(
                              "text-[10px] font-medium leading-tight line-clamp-2",
                              isSelected ? "text-primary" : "text-gray-800"
                            )}>
                              {fabric.name}
                            </span>
                            {fabric.colorName && (
                              <span className={cn(
                                "text-[10px] leading-tight",
                                isSelected ? "text-primary/70" : "text-gray-500"
                              )}>
                                {fabric.colorName}
                              </span>
                            )}
                          </button>
                          );
                        })}
                    </div>
                  )}
                </OptionSection>
              )}

              {/* Paper - 출력방식별 필터링 + 종류별 그룹화 */}
              {product.papers && product.papers.length > 0 && (() => {
                const activePapers = product.papers.filter(p => p.isActive !== false);
                if (activePapers.length === 0) return null;

                const hasIndigoPapers = activePapers.some(p => p.printMethod === 'indigo');
                const hasInkjetPapers = activePapers.some(p => p.printMethod === 'inkjet');
                const hasPrintMethodInfo = hasIndigoPapers || hasInkjetPapers;
                const currentPrintMethod = selectedOptions.printMethod || 'indigo';

                const filteredPapers = hasPrintMethodInfo
                  ? activePapers.filter(p => p.printMethod === currentPrintMethod)
                  : activePapers;

                const getPaperType = (name: string) => {
                  return name.replace(/\s*\d+g?$/i, '').replace(/\s+\d+$/,'').trim();
                };
                const paperGroups = filteredPapers.reduce((groups, paper) => {
                  const type = getPaperType(paper.name);
                  if (!groups[type]) groups[type] = [];
                  groups[type].push(paper);
                  return groups;
                }, {} as Record<string, typeof filteredPapers>);
                const groupEntries = Object.entries(paperGroups);

                return (
                  <OptionSection title={t('paper')}>
                    {/* Print method tabs - compact */}
                    {hasPrintMethodInfo && hasIndigoPapers && hasInkjetPapers && (
                      <div className="flex gap-0.5 mb-2 p-0.5 bg-gray-100 rounded-md w-fit">
                        <button
                          type="button"
                          onClick={() => {
                            const indigoPapers = activePapers.filter(p => p.printMethod === 'indigo');
                            const defaultPaper = indigoPapers.find(p => p.isDefault) || indigoPapers[0];
                            setSelectedOptions(prev => ({ ...prev, printMethod: 'indigo', paper: defaultPaper }));
                          }}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded transition-all",
                            currentPrintMethod === 'indigo'
                              ? "bg-white text-primary shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          인디고출력
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const inkjetPapers = activePapers.filter(p => p.printMethod === 'inkjet');
                            const defaultPaper = inkjetPapers.find(p => p.isDefault) || inkjetPapers[0];
                            setSelectedOptions(prev => ({ ...prev, printMethod: 'inkjet', paper: defaultPaper }));
                          }}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded transition-all",
                            currentPrintMethod === 'inkjet'
                              ? "bg-white text-primary shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          잉크젯출력
                        </button>
                      </div>
                    )}
                    {/* Paper groups with pill buttons */}
                    <div className="space-y-2">
                      {filteredPapers.length === 0 ? (
                        <p className="text-xs text-gray-400 py-1 text-center">
                          해당 출력방식의 용지가 없습니다
                        </p>
                      ) : (
                        groupEntries.map(([type, papers]) => (
                          <div key={type} className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-gray-600 min-w-[50px]">
                              {type}
                            </span>
                            {papers.map((paper) => (
                              <button
                                key={paper.id}
                                type="button"
                                onClick={() => {
                                  setSelectedOptions(prev => ({ ...prev, paper }));
                                }}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all",
                                  selectedOptions.paper?.id === paper.id
                                    ? "bg-primary text-white border-primary shadow-sm"
                                    : "border-gray-300 hover:border-gray-400 bg-white"
                                )}
                              >
                                {paper.grammage ? `${paper.grammage}g` : paper.name}
                                {paper.frontCoating && <span className="text-[10px] opacity-80">({paper.frontCoating})</span>}
                                {paper.grade && <span className="text-[10px] opacity-80">G{paper.grade}</span>}
                              </button>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </OptionSection>
                );
              })()}

              {/* Finishings - checkbox pills */}
              {product.finishings && product.finishings.length > 0 && (
                <OptionSection title={t('finishing')}>
                  <div className="flex flex-wrap gap-1.5">
                    {product.finishings.map((finishing) => {
                      const isChecked = selectedOptions.finishings.some(f => f.id === finishing.id);
                      return (
                        <button
                          key={finishing.id}
                          type="button"
                          onClick={() => {
                            setSelectedOptions(prev => ({
                              ...prev,
                              finishings: isChecked
                                ? prev.finishings.filter(f => f.id !== finishing.id)
                                : [...prev.finishings, finishing],
                            }));
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all",
                            isChecked
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "border-gray-300 hover:border-gray-400 bg-white"
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            className={cn("h-3 w-3 pointer-events-none", isChecked && "border-white data-[state=checked]:bg-transparent data-[state=checked]:text-white")}
                            tabIndex={-1}
                          />
                          {finishing.name}
                          {finishing.price > 0 && ` +${finishing.price.toLocaleString()}`}
                        </button>
                      );
                    })}
                  </div>
                </OptionSection>
              )}

              {/* Quantity - non-album only */}
              {!isAlbum && (
                <OptionSection title={tc('quantity')}>
                  <div className="flex items-center">
                    <div className="flex items-center border rounded-lg">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-center border-x py-1.5 text-sm"
                        min="1"
                      />
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-2 hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </OptionSection>
              )}

              {/* Cart button inline for non-album (also in sticky bar) */}
              {!isAlbum && (
                <div className="pt-2">
                  <Button size="default" className="w-full" onClick={handleAddToCart}>
                    <ShoppingCart className="h-4 w-4 mr-1.5" />
                    {t('addToCart')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Copper Plate - Collapsible full width section */}
        {hasCopperPlateOptions && (
          <div className="mt-4 border rounded-lg bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setIsCopperPlateExpanded(!isCopperPlateExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">{t('copperPlate')}</h3>
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{copperPlateSummary}</span>
              </div>
              {isCopperPlateExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>

            {isCopperPlateExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t">
                {/* Type pills */}
                <div className="flex flex-wrap gap-1.5 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOptions(prev => ({ ...prev, copperPlateType: 'none', publicCopperPlate: undefined, ownedCopperPlate: undefined }));
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full border transition-all",
                      selectedOptions.copperPlateType === 'none'
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "border-gray-300 hover:border-gray-400 bg-white"
                    )}
                  >
                    {t('noCopperPlate')}
                  </button>

                  {allPublicCopperPlates?.data && allPublicCopperPlates.data.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const firstOwnedPlate = ownedCopperPlates?.filter(cp => cp.status === 'stored')?.[0];
                        setSelectedOptions(prev => ({
                          ...prev,
                          copperPlateType: 'public',
                          publicCopperPlate: undefined,
                          ownedCopperPlate: undefined,
                        }));
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full border transition-all",
                        selectedOptions.copperPlateType === 'public'
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "border-gray-300 hover:border-gray-400 bg-white"
                      )}
                    >
                      {t('publicCopperPlate')}
                    </button>
                  )}

                  {isAuthenticated && ownedCopperPlates && ownedCopperPlates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const firstOwnedPlate = ownedCopperPlates?.filter(cp => cp.status === 'stored')?.[0];
                        setSelectedOptions(prev => ({
                          ...prev,
                          copperPlateType: 'owned',
                          publicCopperPlate: undefined,
                          ownedCopperPlate: firstOwnedPlate || prev.ownedCopperPlate,
                          foilColor: firstOwnedPlate ? (firstOwnedPlate.foilColor || prev.foilColor) : prev.foilColor,
                          foilPosition: firstOwnedPlate ? (firstOwnedPlate.foilPosition || prev.foilPosition) : prev.foilPosition,
                        }));
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full border transition-all",
                        selectedOptions.copperPlateType === 'owned'
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "border-gray-300 hover:border-gray-400 bg-white"
                      )}
                    >
                      {t('ownedCopperPlate')}
                      {ownedCopperPlates && <span className="ml-1 opacity-80">({ownedCopperPlates.length})</span>}
                    </button>
                  )}
                </div>

                {/* Public copper plate grid */}
                {selectedOptions.copperPlateType === 'public' && allPublicCopperPlates?.data && allPublicCopperPlates.data.length > 0 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {allPublicCopperPlates.data.map((plate) => (
                        <button
                          key={plate.id}
                          type="button"
                          onClick={() => setSelectedOptions(prev => ({ ...prev, publicCopperPlate: plate }))}
                          className={cn(
                            "flex items-center gap-2 p-2 border rounded-md text-left transition-colors",
                            selectedOptions.publicCopperPlate?.id === plate.id
                              ? "border-primary bg-primary/5"
                              : "hover:border-gray-400"
                          )}
                        >
                          <div className="relative group/logo shrink-0">
                            {plate.imageUrl ? (
                              <>
                                <img
                                  src={normalizeImageUrl(plate.imageUrl)}
                                  alt={plate.plateName}
                                  className="w-10 h-10 object-cover rounded border"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                                />
                                <div className="hidden w-10 h-10 rounded border bg-gray-100 flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="hidden group-hover/logo:block absolute z-50 left-full top-0 ml-2 p-1 bg-white border rounded-lg shadow-xl">
                                  <img src={normalizeImageUrl(plate.imageUrl)} alt={plate.plateName} className="w-48 h-48 object-contain rounded" />
                                </div>
                              </>
                            ) : (
                              <div className="w-10 h-10 rounded border bg-gray-100 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs truncate">
                              {plate.plateName}
                              {(plate.widthMm || plate.heightMm) && (
                                <span className="ml-1 text-[10px] text-blue-600">({plate.widthMm}x{plate.heightMm}mm)</span>
                              )}
                            </div>
                            {plate.defaultEngravingText && (
                              <div className="text-[10px] text-gray-500 truncate">{t('engraving')} {plate.defaultEngravingText}</div>
                            )}
                          </div>
                          {selectedOptions.publicCopperPlate?.id === plate.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Foil color */}
                    {copperPlateLabels?.foilColors && copperPlateLabels.foilColors.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">{t('foilColor')}</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {copperPlateLabels.foilColors.filter(c => c.isActive).map((color) => (
                            <button
                              key={color.id}
                              type="button"
                              onClick={() => setSelectedOptions(prev => ({ ...prev, foilColor: color.code }))}
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border transition-colors",
                                selectedOptions.foilColor === color.code
                                  ? "border-primary bg-primary/10 ring-2 ring-primary"
                                  : "border-gray-300 hover:border-gray-400"
                              )}
                            >
                              <span
                                className={cn(
                                  "w-3.5 h-3.5 rounded-sm border",
                                  color.code === 'hologram' && "bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300",
                                  color.colorHex === '#FFFFFF' && "border-gray-400"
                                )}
                                style={{
                                  backgroundColor: color.code !== 'hologram' ? color.colorHex : undefined,
                                  borderColor: color.colorHex === '#FFFFFF' ? '#9ca3af' : color.colorHex
                                }}
                              />
                              {color.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Foil position */}
                    {copperPlateLabels?.platePositions && copperPlateLabels.platePositions.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">{t('foilPosition')}</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {copperPlateLabels.platePositions.filter(p => p.isActive).map((pos) => (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => setSelectedOptions(prev => ({ ...prev, foilPosition: pos.code }))}
                              className={cn(
                                "px-2 py-1 text-xs rounded-md border transition-colors",
                                selectedOptions.foilPosition === pos.code
                                  ? "border-primary bg-primary text-white"
                                  : "border-gray-300 hover:border-gray-400"
                              )}
                            >
                              {pos.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Owned copper plate grid */}
                {selectedOptions.copperPlateType === 'owned' && isAuthenticated && ownedCopperPlates && ownedCopperPlates.length > 0 && (
                  <div className="space-y-2">
                    <div className="max-h-[200px] overflow-y-auto">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ownedCopperPlates.filter(cp => cp.status === 'stored').map((cp) => {
                          const isSelected = selectedOptions.ownedCopperPlate?.id === cp.id;
                          return (
                            <button
                              key={cp.id}
                              type="button"
                              onClick={() => {
                                setSelectedOptions(prev => ({
                                  ...prev,
                                  ownedCopperPlate: cp,
                                  foilColor: cp.foilColor || prev.foilColor,
                                  foilPosition: cp.foilPosition || prev.foilPosition,
                                }));
                              }}
                              className={cn(
                                "flex items-center gap-2 p-2 border rounded-md text-left transition-colors",
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "hover:border-gray-400"
                              )}
                            >
                              <div className="relative group/logo shrink-0">
                                {cp.imageUrl ? (
                                  <>
                                    <img
                                      src={normalizeImageUrl(cp.imageUrl)}
                                      alt={cp.plateName}
                                      className="w-10 h-10 object-cover rounded border"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                                    />
                                    <div className="hidden w-10 h-10 rounded border bg-gray-100 flex items-center justify-center">
                                      <ImageIcon className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div className="hidden group-hover/logo:block absolute z-50 left-full top-0 ml-2 p-1 bg-white border rounded-lg shadow-xl">
                                      <img src={normalizeImageUrl(cp.imageUrl)} alt={cp.plateName} className="w-48 h-48 object-contain rounded" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-10 h-10 rounded border bg-gray-100 flex items-center justify-center">
                                    <ImageIcon className="w-4 h-4 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-xs truncate block">{cp.plateName}</span>
                                <span className="text-[10px] text-gray-500">
                                  {cp.plateType === 'copper' ? t('copperType') : t('leadType')}
                                  {cp.registeredAt && (
                                    <span className="ml-1 text-gray-400">({new Date(cp.registeredAt).toLocaleDateString('ko-KR')})</span>
                                  )}
                                </span>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Foil color/position for owned plates */}
                    {selectedOptions.ownedCopperPlate && (
                      <>
                        {copperPlateLabels?.foilColors && copperPlateLabels.foilColors.length > 0 && (
                          <div>
                            <Label className="text-xs text-gray-600 mb-1 block">{t('foilColor')}</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {copperPlateLabels.foilColors.filter(c => c.isActive).map((color) => (
                                <button
                                  key={color.id}
                                  type="button"
                                  onClick={() => setSelectedOptions(prev => ({ ...prev, foilColor: color.code }))}
                                  className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border transition-colors",
                                    selectedOptions.foilColor === color.code
                                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                                      : "border-gray-300 hover:border-gray-400"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "w-3.5 h-3.5 rounded-sm border",
                                      color.code === 'hologram' && "bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300",
                                      color.colorHex === '#FFFFFF' && "border-gray-400"
                                    )}
                                    style={{
                                      backgroundColor: color.code !== 'hologram' ? color.colorHex : undefined,
                                      borderColor: color.colorHex === '#FFFFFF' ? '#9ca3af' : color.colorHex
                                    }}
                                  />
                                  {color.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {copperPlateLabels?.platePositions && copperPlateLabels.platePositions.length > 0 && (
                          <div>
                            <Label className="text-xs text-gray-600 mb-1 block">{t('foilPosition')}</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {copperPlateLabels.platePositions.filter(p => p.isActive).map((pos) => (
                                <button
                                  key={pos.id}
                                  type="button"
                                  onClick={() => setSelectedOptions(prev => ({ ...prev, foilPosition: pos.code }))}
                                  className={cn(
                                    "px-2 py-1 text-xs rounded-md border transition-colors",
                                    selectedOptions.foilPosition === pos.code
                                      ? "border-primary bg-primary text-white"
                                      : "border-gray-300 hover:border-gray-400"
                                  )}
                                >
                                  {pos.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Data Upload - album only, full width */}
        {isAlbum && (
          <div className="mt-4 border rounded-lg p-4 bg-white">
            <h3 className="font-medium mb-3 flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4" />
              {t('dataUpload')}
            </h3>
            <MultiFolderUpload
              onAddToCart={async (folders) => {
                if (user?.clientId) {
                  try {
                    const folderNames = folders.map(f => f.orderTitle);
                    const result = await api.post<{ duplicates: { folderName: string; orderNumber: string; orderedAt: string; status: string }[]; months: number }>(
                      '/orders/check-duplicates',
                      { clientId: user.clientId, folderNames }
                    );
                    if (result.duplicates.length > 0) {
                      setDuplicateCheckResult({ duplicates: result.duplicates, pendingFolders: folders, months: result.months });
                      return;
                    }
                  } catch (error) {
                    // check failed, proceed anyway
                  }
                }
                addFoldersToCart(folders);
              }}
            />
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 mt-3">
              <div className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-pink-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium text-pink-900 text-xs">{t('albumOrderGuide')}</h4>
                  <p className="text-xs text-pink-700 mt-0.5">{t('albumOrderDescription')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Info - Collapsible */}
        <div className="mt-4 border rounded-lg bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setIsDetailExpanded(!isDetailExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-bold text-sm">{t('detailInfo')}</h3>
            {isDetailExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>

          {isDetailExpanded && (
            <div className="px-4 pb-4 border-t">
              {/* Specifications */}
              {product.specifications && product.specifications.length > 0 && (
                <div className="py-3">
                  <button
                    type="button"
                    onClick={() => setIsSpecExpanded(!isSpecExpanded)}
                    className="w-full flex items-center justify-between text-sm font-medium mb-2 hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      {t('availableSpecs')}
                      <span className="text-xs text-gray-500 font-normal">({t('countUnit', { count: product.specifications.length })})</span>
                    </span>
                    {isSpecExpanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-500" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
                  </button>

                  {isSpecExpanded && (
                    <div className="border rounded-lg p-2.5 bg-gray-50">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[...product.specifications]
                          .sort((a, b) => {
                            const areaA = (a.widthMm || 0) * (a.heightMm || 0);
                            const areaB = (b.widthMm || 0) * (b.heightMm || 0);
                            return areaA - areaB;
                          })
                          .map((spec) => (
                          <button
                            key={spec.id}
                            type="button"
                            onClick={() => setSelectedOptions(prev => ({ ...prev, specification: spec }))}
                            className={cn(
                              "flex flex-col px-2 py-1.5 border rounded-md text-left transition-colors text-xs bg-white",
                              selectedOptions.specification?.id === spec.id
                                ? "border-primary bg-primary/5 font-medium"
                                : "hover:border-gray-400"
                            )}
                          >
                            <span className="truncate font-medium">{spec.name}</span>
                            {spec.widthMm && spec.heightMm && (
                              <span className="text-[10px] text-gray-500">{spec.widthMm}x{spec.heightMm}mm</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {product.description ? (
                <div
                  className="prose prose-sm max-w-none pt-3"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              ) : (
                <p className="text-gray-500 text-center py-6 text-sm">{t('noDetailInfo')}</p>
              )}

              {product.detailImages.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {product.detailImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={normalizeImageUrl(img)}
                      alt={`${product.productName} ${idx + 1}`}
                      className="w-full rounded-lg"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
            {selectedOptions.binding && (
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700 whitespace-nowrap">{selectedOptions.binding.name.split(' - ')[0]}</span>
            )}
            {selectedOptions.paper && (
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700 whitespace-nowrap">{selectedOptions.paper.name}</span>
            )}
            {selectedOptions.printSide && (
              <span className="px-2 py-0.5 bg-blue-50 rounded text-xs text-blue-700 whitespace-nowrap">
                {selectedOptions.printSide === 'single' ? t('singleSided') : t('doubleSided')}
              </span>
            )}
            {selectedOptions.finishings.length > 0 && selectedOptions.finishings.map(f => (
              <span key={f.id} className="px-2 py-0.5 bg-green-50 rounded text-xs text-green-700 whitespace-nowrap">{f.name}</span>
            ))}
            {selectedOptions.copperPlateType && selectedOptions.copperPlateType !== 'none' && (
              <span className="px-2 py-0.5 bg-amber-50 rounded text-xs text-amber-700 whitespace-nowrap">{copperPlateSummary}</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {!isAlbum && (
              <>
                <span className="text-lg font-bold whitespace-nowrap">{totalPrice.toLocaleString()}{tc('won')}</span>
                <Button size="sm" onClick={handleAddToCart}>
                  <ShoppingCart className="h-4 w-4 mr-1.5" />
                  {t('addToCart')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 중복 주문 경고 다이얼로그 */}
      <Dialog open={!!duplicateCheckResult} onOpenChange={(open) => { if (!open) setDuplicateCheckResult(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              중복 주문 경고
            </DialogTitle>
            <DialogDescription>
              다음 폴더는 {duplicateCheckResult?.months || 3}개월 이내 주문 이력이 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2 py-2">
            {duplicateCheckResult?.duplicates.map((dup, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-amber-50 rounded-md border border-amber-200 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{dup.folderName}</p>
                  <p className="text-muted-foreground text-xs">
                    주문번호: {dup.orderNumber} / {new Date(dup.orderedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDuplicateCheckResult(null)}>
              취소
            </Button>
            {duplicateCheckResult && duplicateCheckResult.pendingFolders.length > duplicateCheckResult.duplicates.length && (
              <Button
                variant="secondary"
                onClick={() => {
                  const dupNames = new Set(duplicateCheckResult.duplicates.map(d => d.folderName));
                  const nonDupFolders = duplicateCheckResult.pendingFolders.filter(f => !dupNames.has(f.orderTitle));
                  setDuplicateCheckResult(null);
                  if (nonDupFolders.length > 0) addFoldersToCart(nonDupFolders);
                }}
              >
                중복 제외하고 담기 ({(duplicateCheckResult?.pendingFolders.length || 0) - (duplicateCheckResult?.duplicates.length || 0)}건)
              </Button>
            )}
            <Button
              variant="default"
              onClick={() => {
                const folders = duplicateCheckResult!.pendingFolders;
                setDuplicateCheckResult(null);
                addFoldersToCart(folders, true);
              }}
            >
              전체 담기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 마이상품 저장 모달 */}
      <Dialog open={showSaveMyProductModal} onOpenChange={setShowSaveMyProductModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              {t('saveAsMyProduct')}
            </DialogTitle>
            <DialogDescription>
              {t('saveMyProductDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="myProductName">{t('myProductName')}</Label>
              <Input
                id="myProductName"
                value={myProductName}
                onChange={(e) => setMyProductName(e.target.value)}
                placeholder={t('myProductNameExample')}
              />
            </div>

            {/* 선택된 옵션 요약 */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              <p className="font-medium text-gray-700 mb-2">{t('selectedOptions')}</p>
              {selectedOptions.specification && (
                <p className="text-gray-600">{t('spec')}: {selectedOptions.specification.name}</p>
              )}
              {selectedOptions.binding && (
                <p className="text-gray-600">{t('binding')}: {selectedOptions.binding.name}</p>
              )}
              {selectedOptions.paper && (
                <p className="text-gray-600">{t('paper')}: {selectedOptions.paper.name}</p>
              )}
              {selectedOptions.printSide && (
                <p className="text-gray-600">{t('printSection')}: {selectedOptions.printSide === 'single' ? t('singleSided') : t('doubleSided')}</p>
              )}
              <p className="text-gray-600">
                {t('copperPlate')}: {selectedOptions.copperPlateType === 'none'
                  ? t('none')
                  : selectedOptions.copperPlateType === 'public'
                    ? `${t('publicCopperPlate')} - ${selectedOptions.publicCopperPlate?.plateName || ''}`
                    : `${t('ownedCopperPlate')} - ${selectedOptions.ownedCopperPlate?.plateName || ''}`}
              </p>
              {selectedOptions.copperPlateType !== 'none' && (
                <>
                  {selectedOptions.foilColor && (
                    <p className="text-gray-600">
                      {t('foilColorColon')} {copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name || selectedOptions.foilColor}
                    </p>
                  )}
                  {selectedOptions.foilPosition && (
                    <p className="text-gray-600">
                      {t('foilPositionColon')} {copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name || selectedOptions.foilPosition}
                    </p>
                  )}
                </>
              )}
              {selectedOptions.finishings.length > 0 && (
                <p className="text-gray-600">{t('finishing')}: {selectedOptions.finishings.map(f => f.name).join(', ')}</p>
              )}
              <p className="text-gray-600">{tc('quantity')}: {t('countUnit', { count: quantity })}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveMyProductModal(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSaveMyProduct} disabled={createMyProduct.isPending}>
              {createMyProduct.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 마이상품 불러오기 모달 */}
      <Dialog open={showLoadMyProductModal} onOpenChange={setShowLoadMyProductModal}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderHeart className="h-5 w-5 text-orange-600" />
              {t('loadMyProduct')}
            </DialogTitle>
            <DialogDescription>
              {t('loadMyProductDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-2">
            {myProducts?.filter(mp => mp.productId === product.id).map((myProduct) => (
              <button
                key={myProduct.id}
                onClick={() => handleLoadMyProduct(myProduct)}
                className="w-full text-left p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {myProduct.thumbnailUrl ? (
                    <img
                      src={normalizeImageUrl(myProduct.thumbnailUrl)}
                      alt={myProduct.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{myProduct.name}</p>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {myProduct.options.specificationName && (
                        <p>{t('spec')}: {myProduct.options.specificationName}</p>
                      )}
                      {myProduct.options.bindingName && (
                        <p>{t('binding')}: {myProduct.options.bindingName}</p>
                      )}
                      {myProduct.options.paperName && (
                        <p>{t('paper')}: {myProduct.options.paperName}</p>
                      )}
                      {myProduct.options.copperPlateName && (
                        <p>{t('copperPlate')}: {myProduct.options.copperPlateName}</p>
                      )}
                      {myProduct.options.foilColorName && (
                        <p>{t('foilColorColon')} {myProduct.options.foilColorName}</p>
                      )}
                      {myProduct.options.foilPositionName && (
                        <p>{t('foilPositionColon')} {myProduct.options.foilPositionName}</p>
                      )}
                      <p>{tc('quantity')}: {t('countUnit', { count: myProduct.defaultQuantity })}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {myProduct.usageCount > 0 && <p>{t('usedCount', { count: myProduct.usageCount })}</p>}
                  </div>
                </div>
              </button>
            ))}

            {myProducts?.filter(mp => mp.productId === product.id).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FolderHeart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>{t('noMyProductForThis')}</p>
                <p className="text-sm">{t('noMyProductHint')}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadMyProductModal(false)}>
              {tc('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 업로드 진행 모달 */}
      {uploadModalState?.isOpen && (
        <UploadProgressModal
          isOpen={uploadModalState.isOpen}
          newCartItemIds={uploadModalState.newCartItemIds}
          primaryIds={uploadModalState.primaryIds}
          onClose={() => setUploadModalState(null)}
        />
      )}
    </div>
  );
}

function OptionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-bold text-xs uppercase tracking-wide text-gray-500 mb-1.5">{title}</h3>
      {children}
    </div>
  );
}

function ProductPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-6">
          <Skeleton className="w-full lg:w-[360px] aspect-square rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-6 w-48" />
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
