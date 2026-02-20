'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ChevronDown, ChevronUp, Minus, Plus, ShoppingCart, Heart, Share2, Star, FolderHeart, Loader2, Upload, BookOpen, AlertTriangle, Pencil } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useProduct } from '@/hooks/use-products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCartStore, type CartItemOption } from '@/stores/cart-store';
import { useToast } from '@/hooks/use-toast';
import { cn, normalizeImageUrl } from '@/lib/utils';
import { api } from '@/lib/api';
import type { ProductSpecification, ProductBinding, ProductPaper, ProductCover, ProductFoil, ProductFinishing } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useLastProductOptions } from '@/hooks/use-orders';
import { useCopperPlatesByClient, useCopperPlateLabels, type CopperPlate } from '@/hooks/use-copper-plates';
import { useMyProductsByClient, useMyProduct, useCreateMyProduct, useRecordMyProductUsage, type MyProduct, type MyProductOptions } from '@/hooks/use-my-products';
import { usePublicCopperPlates, type PublicCopperPlate } from '@/hooks/use-public-copper-plates';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiFolderUpload } from '@/components/album-upload';
import { useMultiFolderUploadStore, type UploadedFolder, calculateUploadedFolderPrice, calculateAdditionalOrderPrice } from '@/stores/multi-folder-upload-store';
import { type FabricCategory } from '@/hooks/use-fabrics';
import { useTranslations } from 'next-intl';
import { startBackgroundUpload, type FolderUploadData } from '@/lib/background-upload';
import { UploadProgressModal } from './_components/upload-progress-modal';
import { ProductImageGallery } from './_components/product-image-gallery';
import { OptionCard } from './_components/option-card';
import { OptionBinding } from './_components/option-binding';
import { OptionCoverFabric } from './_components/option-cover-fabric';
import { OptionPaper } from './_components/option-paper';
import { OptionPrintSide } from './_components/option-print-side';
import { OptionFinishing } from './_components/option-finishing';
import { OptionCopperPlate } from './_components/option-copper-plate';
import { ProductSummaryBar } from './_components/product-summary-bar';

interface SelectedOptions {
  specification?: ProductSpecification;
  binding?: ProductBinding;
  paper?: ProductPaper;
  cover?: ProductCover;
  foil?: ProductFoil;
  finishings: ProductFinishing[];
  printSide?: 'single' | 'double';
  printMethod?: 'indigo' | 'inkjet';
  colorMode?: '4c' | '6c';
  copperPlateType?: 'none' | 'public' | 'owned';
  publicCopperPlate?: PublicCopperPlate;
  ownedCopperPlate?: CopperPlate;
  foilColor?: string;
  foilPosition?: string;
}

const getDefaultPrintSideByBinding = (bindingName: string): 'single' | 'double' => {
  const lowerName = bindingName.toLowerCase();
  if (lowerName.includes('압축') || lowerName.includes('맞장') || lowerName.includes('레이플릿')) {
    return 'single';
  }
  if (lowerName.includes('화보') || lowerName.includes('핀화보') || lowerName.includes('스타화보') || lowerName.includes('포토북')) {
    return 'double';
  }
  return 'double';
};

const isAlbumProduct = (bindings?: ProductBinding[], categoryName?: string): boolean => {
  // 카테고리 이름으로 앨범 감지 (가장 신뢰도 높음)
  if (categoryName) {
    const cat = categoryName.toLowerCase();
    if (cat.includes('앨범') || cat.includes('포토북') || cat.includes('화보')) return true;
  }
  // 제본 이름으로 앨범 감지 (fallback)
  if (!bindings || bindings.length === 0) return false;
  return bindings.some(binding => {
    const name = binding.name.toLowerCase();
    return name.includes('화보') || name.includes('포토북') || name.includes('스타화보') ||
           name.includes('핀화보') || name.includes('스타제본') || name.includes('압축');
  });
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = params.id as string;
  const myProductIdParam = searchParams.get('myProductId');
  const { toast } = useToast();
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  const t = useTranslations('product');
  const tc = useTranslations('common');
  const { data: product, isLoading, error } = useProduct(productId);
  const { addItem } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const { data: ownedCopperPlates } = useCopperPlatesByClient(isAuthenticated ? user?.clientId : undefined);
  const { data: copperPlateLabels } = useCopperPlateLabels();
  const { data: allPublicCopperPlates } = usePublicCopperPlates({ status: 'active' });

  const { data: myProducts } = useMyProductsByClient(isAuthenticated ? user?.clientId : undefined);
  const { data: myProductFromParam } = useMyProduct(myProductIdParam || undefined);
  const createMyProduct = useCreateMyProduct();
  const recordMyProductUsage = useRecordMyProductUsage();

  const { data: lastProductOptions } = useLastProductOptions(
    isAuthenticated && !myProductIdParam ? user?.clientId : undefined,
    isAuthenticated && !myProductIdParam ? productId : undefined,
  );

  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({ finishings: [] });
  const [isSpecExpanded, setIsSpecExpanded] = useState(false);
  const [showSaveMyProductModal, setShowSaveMyProductModal] = useState(false);
  const [showLoadMyProductModal, setShowLoadMyProductModal] = useState(false);
  const [myProductName, setMyProductName] = useState('');

  const {
    defaultPageLayout, defaultBindingDirection,
    folders: uploadFolders, clearFolders,
    applyGlobalCoverSource, setFolderFabric, setAllFoldersFoil,
  } = useMultiFolderUploadStore();

  const [selectedFabricCategory, setSelectedFabricCategory] = useState<FabricCategory | null>(null);
  const [fabricSelection, setFabricSelection] = useState<{
    id: string; name: string; thumbnail: string | null;
    basePrice: number; category: string;
    colorCode: string | null; colorName: string | null;
  } | null>(null);
  const [isEditingFabric, setIsEditingFabric] = useState(false);

  // 원단이 실제로 선택된 폴더에서만 읽어옴 (id가 없으면 null 반환)
  const selectedFabricInfo = (() => {
    const f = uploadFolders.find(folder => folder.selectedFabricId);
    return f ? { id: f.selectedFabricId, name: f.selectedFabricName, thumbnail: f.selectedFabricThumbnail } : null;
  })();

  const effectiveFabricInfo = selectedFabricInfo ?? fabricSelection;

  // 새 폴더가 추가될 때 fabricSelection을 원단이 없는 폴더에 자동 적용
  useEffect(() => {
    if (!fabricSelection) return;
    const foldersWithoutFabric = uploadFolders.filter(f => !f.selectedFabricId);
    if (foldersWithoutFabric.length === 0) return;
    foldersWithoutFabric.forEach(f => {
      setFolderFabric(
        f.id, fabricSelection.id, fabricSelection.name, fabricSelection.thumbnail,
        fabricSelection.basePrice, fabricSelection.category,
        fabricSelection.colorCode, fabricSelection.colorName
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadFolders.length]);

  const handleCoverFabricSelect = (fabric: { id: string; name: string; thumbnailUrl?: string | null; basePrice?: number; category: string; colorCode?: string | null; colorName?: string | null }) => {
    setFabricSelection({
      id: fabric.id, name: fabric.name, thumbnail: fabric.thumbnailUrl || null,
      basePrice: fabric.basePrice ?? 0, category: fabric.category,
      colorCode: fabric.colorCode || null, colorName: fabric.colorName || null,
    });
    uploadFolders.forEach(f => {
      setFolderFabric(f.id, fabric.id, fabric.name, fabric.thumbnailUrl || null, fabric.basePrice ?? 0, fabric.category, fabric.colorCode || null, fabric.colorName || null);
    });
    setIsEditingFabric(false);
  };

  const [uploadModalState, setUploadModalState] = useState<{
    isOpen: boolean; newCartItemIds: string[]; primaryIds: string[];
  } | null>(null);

  const [duplicateCheckResult, setDuplicateCheckResult] = useState<{
    duplicates: { folderName: string; orderNumber: string; orderedAt: string; status: string }[];
    pendingFolders: UploadedFolder[]; months: number;
  } | null>(null);

  // --- addFoldersToCart (unchanged logic) ---
  const addFoldersToCart = useCallback((folders: UploadedFolder[], isDuplicateOverride = false) => {
    if (!product) return;
    setTimeout(() => {
      try {
        const itemIdsBefore = new Set(useCartStore.getState().items.map(i => i.id));
        const folderUploadMap = new Map<string, FolderUploadData>();
        folders.forEach((folder) => {
          if (!folderUploadMap.has(folder.id)) {
            folderUploadMap.set(folder.id, {
              folderId: folder.id, folderName: folder.orderTitle,
              files: folder.files.map((f, idx) => ({
                file: f.file, canvasDataUrl: f.canvasDataUrl, fileName: f.newFileName || f.fileName,
                sortOrder: idx, widthPx: f.widthPx, heightPx: f.heightPx,
                widthInch: f.widthInch, heightInch: f.heightInch, dpi: f.dpi, fileSize: f.fileSize,
              })),
            });
          }
        });

        const copperPlateName = selectedOptions.copperPlateType === 'owned'
          ? selectedOptions.ownedCopperPlate?.plateName
          : selectedOptions.copperPlateType === 'public' ? selectedOptions.publicCopperPlate?.plateName : undefined;
        const foilColorName = copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name;
        const foilPositionName = copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name;

        folders.forEach((folder) => {
          folder.foilName = copperPlateName || null;
          folder.foilColor = foilColorName || null;
          folder.foilPosition = foilPositionName || null;
        });

        folders.forEach((folder) => {
          const options: CartItemOption[] = [
            { name: '규격', value: folder.specLabel, price: 0 },
            { name: '페이지', value: `${folder.pageCount}p`, price: 0 },
          ];
          const allThumbnailUrls = folder.files.map(f => f.thumbnailUrl).filter((url): url is string => !!url);
          const folderPrice = calculateUploadedFolderPrice(folder);
          const shippingInfoData = folder.shippingInfo ? {
            senderType: folder.shippingInfo.senderType, senderName: folder.shippingInfo.senderName,
            senderPhone: folder.shippingInfo.senderPhone, senderPostalCode: folder.shippingInfo.senderPostalCode,
            senderAddress: folder.shippingInfo.senderAddress, senderAddressDetail: folder.shippingInfo.senderAddressDetail,
            receiverType: folder.shippingInfo.receiverType, recipientName: folder.shippingInfo.recipientName,
            recipientPhone: folder.shippingInfo.recipientPhone, recipientPostalCode: folder.shippingInfo.recipientPostalCode,
            recipientAddress: folder.shippingInfo.recipientAddress, recipientAddressDetail: folder.shippingInfo.recipientAddressDetail,
            deliveryMethod: folder.shippingInfo.deliveryMethod, deliveryFee: folder.shippingInfo.deliveryFee,
            deliveryFeeType: folder.shippingInfo.deliveryFeeType,
          } : undefined;

          addItem({
            productId: product.id, productType: 'album-order',
            name: `${product.productName} - ${folder.orderTitle}`,
            thumbnailUrl: folder.files[0]?.thumbnailUrl || product.thumbnailUrl,
            thumbnailUrls: allThumbnailUrls, basePrice: folderPrice.unitPrice,
            quantity: folder.quantity, options, totalPrice: folderPrice.totalPrice,
            albumOrderInfo: {
              folderId: folder.id, folderName: folder.orderTitle,
              fileCount: folder.files.length, pageCount: folder.pageCount,
              printMethod: selectedOptions.printMethod || 'indigo', colorMode: selectedOptions.colorMode || '4c',
              pageLayout: folder.pageLayout || 'single',
              bindingDirection: folder.bindingDirection || 'LEFT_START_RIGHT_END',
              specificationId: '', specificationName: folder.specLabel,
              bindingName: selectedOptions.binding?.name, paperName: selectedOptions.paper?.name,
              coverMaterial: selectedOptions.cover?.name, totalSize: folder.totalFileSize || 0,
              foilName: folder.foilName || undefined, foilColor: folder.foilColor || undefined,
              foilPosition: folder.foilPosition || undefined, shippingInfo: shippingInfoData,
              coverSourceType: folder.coverSourceType || undefined,
              fabricId: folder.selectedFabricId || undefined,
              fabricName: folder.selectedFabricName || undefined,
              fabricThumbnail: folder.selectedFabricThumbnail || undefined,
              fabricColorCode: folder.selectedFabricColorCode || undefined,
              fabricColorName: folder.selectedFabricColorName || undefined,
              fabricCategory: folder.selectedFabricCategory || undefined,
              fabricBasePrice: folder.selectedFabricPrice || undefined,
            },
            uploadStatus: 'pending', totalFileCount: folder.files.length, isDuplicateOverride,
          });

          folder.additionalOrders.forEach((additional) => {
            const additionalPrice = calculateAdditionalOrderPrice(additional, folder);
            addItem({
              productId: product.id, productType: 'album-order',
              name: `${product.productName} - ${folder.orderTitle} (${additional.albumLabel})`,
              thumbnailUrl: folder.files[0]?.thumbnailUrl || product.thumbnailUrl,
              thumbnailUrls: allThumbnailUrls, basePrice: additionalPrice.unitPrice,
              quantity: additional.quantity,
              options: [
                { name: '규격', value: additional.albumLabel, price: 0 },
                { name: '페이지', value: `${folder.pageCount}p`, price: 0 },
              ],
              totalPrice: additionalPrice.totalPrice,
              albumOrderInfo: {
                folderId: folder.id, folderName: folder.orderTitle,
                fileCount: folder.files.length, pageCount: folder.pageCount,
                printMethod: selectedOptions.printMethod || 'indigo', colorMode: selectedOptions.colorMode || '4c',
                pageLayout: folder.pageLayout || 'single',
                bindingDirection: folder.bindingDirection || 'LEFT_START_RIGHT_END',
                specificationId: '', specificationName: additional.albumLabel,
                bindingName: selectedOptions.binding?.name, paperName: selectedOptions.paper?.name,
                coverMaterial: selectedOptions.cover?.name, totalSize: folder.totalFileSize || 0,
                foilName: (additional.foilName ?? folder.foilName) || undefined,
                foilColor: (additional.foilColor ?? folder.foilColor) || undefined,
                foilPosition: (additional.foilPosition ?? folder.foilPosition) || undefined,
                shippingInfo: shippingInfoData,
                coverSourceType: folder.coverSourceType || undefined,
                fabricId: (additional.selectedFabricId ?? folder.selectedFabricId) || undefined,
                fabricName: (additional.selectedFabricName ?? folder.selectedFabricName) || undefined,
                fabricThumbnail: (additional.selectedFabricThumbnail ?? folder.selectedFabricThumbnail) || undefined,
                fabricColorCode: (additional.selectedFabricColorCode ?? folder.selectedFabricColorCode) || undefined,
                fabricColorName: (additional.selectedFabricColorName ?? folder.selectedFabricColorName) || undefined,
                fabricCategory: (additional.selectedFabricCategory ?? folder.selectedFabricCategory) || undefined,
                fabricBasePrice: (additional.selectedFabricPrice ?? folder.selectedFabricPrice) || undefined,
              },
              uploadStatus: 'pending', totalFileCount: folder.files.length, isDuplicateOverride,
            });
          });
        });

        const allItems = useCartStore.getState().items;
        const newItems = allItems.filter((i) => !itemIdsBefore.has(i.id));
        const primaryIds: string[] = [];
        folderUploadMap.forEach((folderData, folderId) => {
          const relatedCartItems = newItems.filter((item) => item.albumOrderInfo?.folderId === folderId);
          if (relatedCartItems.length > 0) {
            const ids = relatedCartItems.map((i) => i.id);
            primaryIds.push(ids[0]);
            startBackgroundUpload(ids, folderData);
          }
        });

        clearFolders();
        setUploadModalState({ isOpen: true, newCartItemIds: newItems.map((i) => i.id), primaryIds });
      } catch (error) {
        toast({ title: '오류 발생', description: '장바구니에 담는 중 문제가 발생했습니다. 다시 시도해주세요.', variant: 'destructive' });
      }
    }, 50);
  }, [product, addItem, clearFolders, router, toast, defaultPageLayout, defaultBindingDirection, selectedOptions, copperPlateLabels]);

  const isAlbum = useMemo(() => isAlbumProduct(product?.bindings, product?.category?.name), [product?.bindings, product?.category?.name]);

  useEffect(() => {
    if (product) {
      const defaultBinding = product.bindings?.find(b => b.isDefault) || product.bindings?.[0];
      // 인디고는 4도 기준(isActive4), 그 외는 isActive로 활성 여부 판단
      const allPapers = product.papers || [];
      const has4doPapers = allPapers.some(p => p.printMethod === 'indigo' && p.isActive4 !== false);
      const defaultColorMode: '4c' | '6c' = '4c';
      const hasIndigo = has4doPapers || allPapers.some(p => p.printMethod === 'indigo' && p.isActive6 !== false);
      const defaultPrintMethod: 'indigo' | 'inkjet' = hasIndigo ? 'indigo' : 'inkjet';
      const filteredPapers = allPapers.filter(p => {
        if (p.printMethod !== defaultPrintMethod) return false;
        if (p.printMethod === 'indigo') return p.isActive4 !== false;
        return p.isActive !== false;
      });
      const defaultPaper = filteredPapers.find(p => p.isDefault) || filteredPapers[0];

      setSelectedOptions({
        specification: product.specifications?.find(s => s.isDefault) || product.specifications?.[0],
        binding: defaultBinding,
        paper: defaultPaper, printMethod: defaultPrintMethod, colorMode: defaultColorMode,
        cover: product.covers?.find(c => c.isDefault) || product.covers?.[0],
        foil: product.foils?.find(f => f.isDefault) || product.foils?.[0],
        finishings: product.finishings?.filter(f => f.isDefault) || [],
        printSide: defaultBinding ? getDefaultPrintSideByBinding(defaultBinding.name) : 'double',
        copperPlateType: 'none',
        publicCopperPlate: undefined,
        ownedCopperPlate: undefined,
        foilColor: undefined,
        foilPosition: undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // ===== 최근 주문 옵션 자동 적용 =====
  const [lastOptionsApplied, setLastOptionsApplied] = useState(false);
  useEffect(() => {
    if (!product || !lastProductOptions || lastOptionsApplied || myProductIdParam) return;

    const matchedBinding = product.bindings?.find(b => b.name === lastProductOptions.bindingType);
    const matchedPaper = product.papers?.find(p => p.name === lastProductOptions.paper);
    const matchedCover = product.covers?.find(c => c.name === lastProductOptions.coverMaterial);
    const matchedFinishings = product.finishings?.filter(f => lastProductOptions.finishingOptions.includes(f.name)) || [];
    const printMethod = (lastProductOptions.printMethod === 'indigo' || lastProductOptions.printMethod === 'inkjet')
      ? lastProductOptions.printMethod as 'indigo' | 'inkjet' : 'indigo';

    // 동판(박) 복원: foilName으로 보유 동판 또는 공용 동판 매칭
    // 동판이 있는 경우 ownedCopperPlates 데이터가 로드될 때까지 대기
    if (lastProductOptions.foilName && ownedCopperPlates === undefined) return;
    let copperPlateType: 'none' | 'public' | 'owned' = 'none';
    let matchedOwnedPlate: CopperPlate | undefined;
    let matchedPublicPlate: PublicCopperPlate | undefined;
    if (lastProductOptions.foilName) {
      const owned = ownedCopperPlates?.find(cp => cp.plateName === lastProductOptions.foilName);
      if (owned) { copperPlateType = 'owned'; matchedOwnedPlate = owned; }
      else {
        const pub = allPublicCopperPlates?.data?.find(p => p.plateName === lastProductOptions.foilName);
        if (pub) { copperPlateType = 'public'; matchedPublicPlate = pub; }
      }
    }

    setSelectedOptions(prev => ({
      ...prev,
      binding: matchedBinding || prev.binding,
      paper: matchedPaper || prev.paper,
      printMethod,
      cover: matchedCover || prev.cover,
      finishings: matchedFinishings.length > 0 ? matchedFinishings : prev.finishings,
      printSide: matchedBinding ? getDefaultPrintSideByBinding(matchedBinding.name) : prev.printSide,
      copperPlateType,
      ownedCopperPlate: matchedOwnedPlate,
      publicCopperPlate: matchedPublicPlate,
      foilColor: lastProductOptions.foilColor || undefined,
      foilPosition: lastProductOptions.foilPosition || undefined,
    }));

    // 원단 복원 (fabricSnapshot에 id가 있을 때)
    const snap = lastProductOptions.fabricSnapshot as { id: string; name: string; thumbnailUrl?: string | null; basePrice?: number; category?: string; colorCode?: string | null; colorName?: string | null } | null;
    if (snap?.id && snap?.name) {
      setFabricSelection({
        id: snap.id, name: snap.name, thumbnail: snap.thumbnailUrl || null,
        basePrice: snap.basePrice ?? 0, category: snap.category || '',
        colorCode: snap.colorCode || null, colorName: snap.colorName || null,
      });
    }

    setLastOptionsApplied(true);
  }, [product, lastProductOptions, lastOptionsApplied, myProductIdParam, ownedCopperPlates, allPublicCopperPlates]);

  const [myProductApplied, setMyProductApplied] = useState(false);
  useEffect(() => {
    if (!myProductIdParam || !myProductFromParam || !product || myProductApplied) return;
    const opts = myProductFromParam.options;
    // 보유 동판을 사용하는 경우 ownedCopperPlates 데이터가 로드될 때까지 대기
    if (opts.copperPlateType === 'owned' && ownedCopperPlates === undefined) return;
    // 공용 동판을 사용하는 경우 allPublicCopperPlates 데이터가 로드될 때까지 대기
    if (opts.copperPlateType === 'public' && allPublicCopperPlates === undefined) return;
    setSelectedOptions({
      specification: undefined,
      binding: product.bindings?.find(b => b.id === opts.bindingId),
      paper: product.papers?.find(p => p.id === opts.paperId),
      cover: product.covers?.find(c => c.id === opts.coverId),
      finishings: (opts.finishingIds || []).map((fId, idx) => {
        const base = product.finishings?.find(f => f.id === fId);
        if (!base) return null;
        const savedName = opts.finishingNames?.[idx];
        if (savedName && savedName !== base.name) {
          return { ...base, name: savedName } as ProductFinishing;
        }
        return base;
      }).filter((f): f is ProductFinishing => f !== null),
      printSide: opts.printSide,
      printMethod: (product.papers?.find(p => p.id === opts.paperId)?.printMethod === 'indigo' || product.papers?.find(p => p.id === opts.paperId)?.printMethod === 'inkjet')
        ? product.papers?.find(p => p.id === opts.paperId)?.printMethod as 'indigo' | 'inkjet' : 'indigo',
      copperPlateType: opts.copperPlateType,
      ownedCopperPlate: opts.copperPlateType === 'owned' ? ownedCopperPlates?.find(cp => cp.id === opts.copperPlateId) : undefined,
      publicCopperPlate: opts.copperPlateType === 'public'
        ? allPublicCopperPlates?.data?.find(p => p.id === opts.copperPlateId) : undefined,
      foilColor: opts.foilColor, foilPosition: opts.foilPosition,
    });
    if (opts.coverSourceType) applyGlobalCoverSource(opts.coverSourceType);
    if (opts.fabricId && opts.fabricName) {
      setFabricSelection({ id: opts.fabricId, name: opts.fabricName, thumbnail: opts.fabricThumbnail || null, basePrice: 0, category: '', colorCode: null, colorName: null });
      uploadFolders.forEach(f => {
        setFolderFabric(f.id, opts.fabricId!, opts.fabricName!, opts.fabricThumbnail || null, 0, '', null, null);
      });
    }
    if (myProductFromParam.defaultQuantity) setQuantity(myProductFromParam.defaultQuantity);
    setMyProductApplied(true);
    recordMyProductUsage.mutate(myProductFromParam.id);
    toast({ title: t('myProductLoaded'), description: t('myProductLoadedDesc', { name: myProductFromParam.name }) });
  }, [myProductIdParam, myProductFromParam, product, myProductApplied, ownedCopperPlates, allPublicCopperPlates]);

  useEffect(() => {
    if (uploadFolders.length === 0) return;
    const cpName = selectedOptions.copperPlateType === 'owned' ? selectedOptions.ownedCopperPlate?.plateName
      : selectedOptions.copperPlateType === 'public' ? selectedOptions.publicCopperPlate?.plateName : null;
    const fcName = selectedOptions.copperPlateType !== 'none'
      ? (copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name ?? null) : null;
    const fpName = selectedOptions.copperPlateType !== 'none'
      ? (copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name ?? null) : null;
    setAllFoldersFoil(cpName ?? null, fcName, fpName);
  }, [selectedOptions.copperPlateType, selectedOptions.ownedCopperPlate, selectedOptions.publicCopperPlate,
    selectedOptions.foilColor, selectedOptions.foilPosition, copperPlateLabels, uploadFolders.length, setAllFoldersFoil]);

  const totalPrice = useMemo(() => {
    if (!product) return 0;
    let price = product.basePrice;
    if (selectedOptions.specification) price += selectedOptions.specification.price;
    if (selectedOptions.binding) price += selectedOptions.binding.price;
    if (selectedOptions.paper) price += selectedOptions.paper.price;
    if (selectedOptions.cover) price += selectedOptions.cover.price;
    if (selectedOptions.foil) price += selectedOptions.foil.price;
    const specId = selectedOptions.specification?.specificationId;
    for (const finishing of selectedOptions.finishings) {
      const settings = finishing.productionGroup?.settings;
      const setting = settings?.find((s) => s.settingName === finishing.name);
      if (setting) {
        const specPrice = specId ? setting.prices?.find((p) => p.specificationId === specId) : undefined;
        price += specPrice ? specPrice.price : (setting.basePrice > 0 ? setting.basePrice : finishing.price);
      } else {
        price += finishing.price;
      }
    }
    return price * quantity;
  }, [product, selectedOptions, quantity]);

  const images = useMemo(() => {
    if (!product) return [];
    if (product.thumbnailUrl) return [normalizeImageUrl(product.thumbnailUrl), ...product.detailImages.map(img => normalizeImageUrl(img))];
    if (product.detailImages.length > 0) return product.detailImages.map(img => normalizeImageUrl(img));
    return [];
  }, [product]);

  if (isLoading) return <ProductPageSkeleton />;
  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">{t('notFound')}</h1>
        <p className="text-gray-500 mb-8">{t('notFoundDescription')}</p>
        <Link href="/"><Button>{t('goHome')}</Button></Link>
      </div>
    );
  }

  const hasPublicPlates = allPublicCopperPlates?.data && allPublicCopperPlates.data.length > 0;
  const hasOwnedPlates = isAuthenticated && ownedCopperPlates && ownedCopperPlates.length > 0;
  const hasCopperPlates = hasPublicPlates || hasOwnedPlates;

  // --- handleAddToCart ---
  const handleAddToCart = () => {
    const options: CartItemOption[] = [];
    if (selectedOptions.specification) options.push({ name: t('spec'), value: selectedOptions.specification.name, price: selectedOptions.specification.price });
    if (selectedOptions.binding) options.push({ name: t('binding'), value: selectedOptions.binding.name, price: selectedOptions.binding.price });
    if (selectedOptions.paper) options.push({ name: t('paper'), value: selectedOptions.paper.name, price: selectedOptions.paper.price });
    if (selectedOptions.cover) options.push({ name: t('cover'), value: selectedOptions.cover.name, price: selectedOptions.cover.price });
    if (selectedOptions.foil) options.push({ name: t('foilStamping'), value: selectedOptions.foil.name, price: selectedOptions.foil.price });
    for (const finishing of selectedOptions.finishings) options.push({ name: t('finishing'), value: finishing.name, price: finishing.price });
    options.push({ name: t('printSection'), value: selectedOptions.printSide === 'single' ? t('singleSided') : t('doubleSided'), price: 0 });

    if (selectedOptions.copperPlateType === 'none' || !selectedOptions.copperPlateType) {
      options.push({ name: t('copperPlate'), value: t('none'), price: 0 });
    } else if (selectedOptions.copperPlateType === 'public' && selectedOptions.publicCopperPlate) {
      const plate = selectedOptions.publicCopperPlate;
      options.push({ name: t('copperPlate'), value: `${t('publicCopperPlate')} - ${plate.plateName}`, price: 0 });
      if (selectedOptions.foilColor) options.push({ name: t('foilColor'), value: copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name || '', price: 0 });
      if (selectedOptions.foilPosition) options.push({ name: t('foilPosition'), value: copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name || '', price: 0 });
    } else if (selectedOptions.copperPlateType === 'owned' && selectedOptions.ownedCopperPlate) {
      const plate = selectedOptions.ownedCopperPlate;
      const foilColorLabel = copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name
        || copperPlateLabels?.foilColors?.find(c => c.code === plate.foilColor)?.name || plate.foilColorName;
      const foilPositionLabel = copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name
        || copperPlateLabels?.platePositions?.find(p => p.code === plate.foilPosition)?.name;
      options.push({ name: t('copperPlate'), value: `${t('ownedCopperPlate')} - ${plate.plateName}`, price: 0 });
      if (foilColorLabel) options.push({ name: t('foilColor'), value: foilColorLabel, price: 0 });
      if (foilPositionLabel) options.push({ name: t('foilPosition'), value: foilPositionLabel, price: 0 });
    }

    const copperPlateInfo = selectedOptions.copperPlateType === 'owned' && selectedOptions.ownedCopperPlate ? {
      copperPlateId: selectedOptions.ownedCopperPlate.id, plateName: selectedOptions.ownedCopperPlate.plateName,
      originalFoilColor: selectedOptions.ownedCopperPlate.foilColor || '',
      originalFoilColorName: selectedOptions.ownedCopperPlate.foilColorName || '',
      originalFoilPosition: selectedOptions.ownedCopperPlate.foilPosition || '',
      originalFoilPositionName: copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.ownedCopperPlate?.foilPosition)?.name || '',
      selectedFoilColor: selectedOptions.foilColor || selectedOptions.ownedCopperPlate.foilColor || '',
      selectedFoilColorName: copperPlateLabels?.foilColors?.find(c => c.code === (selectedOptions.foilColor || selectedOptions.ownedCopperPlate?.foilColor))?.name || selectedOptions.ownedCopperPlate.foilColorName || '',
      selectedFoilPosition: selectedOptions.foilPosition || selectedOptions.ownedCopperPlate.foilPosition || '',
      selectedFoilPositionName: copperPlateLabels?.platePositions?.find(p => p.code === (selectedOptions.foilPosition || selectedOptions.ownedCopperPlate?.foilPosition))?.name || '',
    } : undefined;

    addItem({ productId: product.id, productType: 'product', name: product.productName, thumbnailUrl: product.thumbnailUrl, basePrice: product.basePrice, quantity, options, totalPrice, copperPlateInfo });
    toast({ title: t('addedToCart'), description: t('addedToCartDesc', { name: product.productName, qty: quantity }) });
    router.push('/cart');
  };

  // --- handleSaveMyProduct ---
  const handleSaveMyProduct = async () => {
    if (!isAuthenticated || !user?.clientId || !product) {
      toast({ title: t('loginRequired'), description: t('loginRequiredDesc'), variant: 'destructive' });
      return;
    }
    const opts: MyProductOptions = {
      bindingId: selectedOptions.binding?.id, bindingName: selectedOptions.binding?.name,
      paperId: selectedOptions.paper?.id, paperName: selectedOptions.paper?.name,
      coverId: selectedOptions.cover?.id, coverName: selectedOptions.cover?.name,
      printSide: selectedOptions.printSide, copperPlateType: selectedOptions.copperPlateType,
      copperPlateId: selectedOptions.copperPlateType === 'owned' ? selectedOptions.ownedCopperPlate?.id : selectedOptions.copperPlateType === 'public' ? selectedOptions.publicCopperPlate?.id : undefined,
      copperPlateName: selectedOptions.copperPlateType === 'owned' ? selectedOptions.ownedCopperPlate?.plateName : selectedOptions.copperPlateType === 'public' ? selectedOptions.publicCopperPlate?.plateName : undefined,
      foilColor: selectedOptions.foilColor ?? (selectedOptions.copperPlateType === 'owned' ? selectedOptions.ownedCopperPlate?.foilColor : undefined),
      foilColorName: copperPlateLabels?.foilColors?.find(c => c.code === (selectedOptions.foilColor ?? selectedOptions.ownedCopperPlate?.foilColor))?.name,
      foilPosition: selectedOptions.foilPosition ?? (selectedOptions.copperPlateType === 'owned' ? selectedOptions.ownedCopperPlate?.foilPosition : undefined),
      foilPositionName: copperPlateLabels?.platePositions?.find(p => p.code === (selectedOptions.foilPosition ?? selectedOptions.ownedCopperPlate?.foilPosition))?.name,
      finishingIds: selectedOptions.finishings.map(f => f.id), finishingNames: selectedOptions.finishings.map(f => f.name),
      finishingSettingIds: selectedOptions.finishings.map(f => {
        // 후가공 설정(세팅)에서 선택된 경우, settingName이 finishing.name과 일치하는 setting의 ID를 저장
        const settings = f.productionGroup?.settings;
        if (!settings) return undefined;
        const matched = settings.find(s => s.settingName === f.name);
        return matched?.id;
      }).filter((id): id is string => !!id),
      coverSourceType: uploadFolders[0]?.coverSourceType || undefined,
      fabricId: effectiveFabricInfo?.id || undefined, fabricName: effectiveFabricInfo?.name || undefined,
      fabricThumbnail: effectiveFabricInfo?.thumbnail || undefined,
    };
    try {
      await createMyProduct.mutateAsync({
        clientId: user.clientId, productId: product.id,
        name: myProductName || product.productName,
        thumbnailUrl: product.thumbnailUrl || undefined, options: opts, defaultQuantity: quantity,
      });
      toast({ title: t('myProductSaved'), description: t('myProductSavedDesc') });
      setShowSaveMyProductModal(false); setMyProductName('');
    } catch { toast({ title: t('saveFailed'), description: t('saveFailedDesc'), variant: 'destructive' }); }
  };

  // --- handleLoadMyProduct ---
  const handleLoadMyProduct = (myProduct: MyProduct) => {
    const opts = myProduct.options;
    setSelectedOptions({
      specification: undefined,
      binding: product?.bindings?.find(b => b.id === opts.bindingId),
      paper: product?.papers?.find(p => p.id === opts.paperId),
      cover: product?.covers?.find(c => c.id === opts.coverId),
      finishings: (opts.finishingIds || []).map((fId, idx) => {
        const base = product?.finishings?.find(f => f.id === fId);
        if (!base) return null;
        // 저장된 이름이 있으면 virtual finishing으로 복원 (설정 세팅에서 선택된 경우)
        const savedName = opts.finishingNames?.[idx];
        if (savedName && savedName !== base.name) {
          return { ...base, name: savedName } as ProductFinishing;
        }
        return base;
      }).filter((f): f is ProductFinishing => f !== null),
      printSide: opts.printSide, copperPlateType: opts.copperPlateType,
      ownedCopperPlate: opts.copperPlateType === 'owned' ? ownedCopperPlates?.find(cp => cp.id === opts.copperPlateId) : undefined,
      publicCopperPlate: opts.copperPlateType === 'public' ? allPublicCopperPlates?.data?.find(p => p.id === opts.copperPlateId) : undefined,
      foilColor: opts.foilColor, foilPosition: opts.foilPosition,
    });
    if (opts.coverSourceType) applyGlobalCoverSource(opts.coverSourceType);
    if (opts.fabricId && opts.fabricName) {
      setFabricSelection({ id: opts.fabricId, name: opts.fabricName, thumbnail: opts.fabricThumbnail || null, basePrice: 0, category: '', colorCode: null, colorName: null });
      uploadFolders.forEach(f => setFolderFabric(f.id, opts.fabricId!, opts.fabricName!, opts.fabricThumbnail || null, 0, '', null, null));
      setSelectedFabricCategory(null);
    }
    setQuantity(myProduct.defaultQuantity);
    setShowLoadMyProductModal(false);
    toast({ title: t('myProductLoaded'), description: t('myProductLoadedDesc', { name: myProduct.name }) });
  };

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-primary">{tc('home')}</Link>
            <ChevronRight className="h-4 w-4" />
            {product.category && (
              <>
                <Link href={`/category/${product.category.id}`} className="hover:text-primary">{product.category.name}</Link>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
            <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.productName}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* A. Layout: Image LEFT, Options RIGHT */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Images - LEFT (mobile first, desktop sticky) */}
          <div className="w-full lg:w-[440px] lg:sticky lg:top-4 lg:self-start flex-shrink-0 order-first">
            <ProductImageGallery images={images} productName={product.productName} />
          </div>

          {/* Options - RIGHT */}
          <div className="flex-1 min-w-0">
            {/* Product name */}
            <h1 className="text-xl md:text-2xl font-bold">{product.productName}</h1>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-2 mb-4">
              {isAuthenticated && user?.clientId && (
                <>
                  <button type="button" onClick={() => { setMyProductName(product.productName); setShowSaveMyProductModal(true); }}
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Star className="h-3 w-3" />{t('saveMyProduct')}
                  </button>
                  {myProducts && myProducts.length > 0 && (
                    <button type="button" onClick={() => setShowLoadMyProductModal(true)}
                      className="text-xs text-orange-600 hover:underline flex items-center gap-1">
                      <FolderHeart className="h-3 w-3" />{t('loadMyProduct')} ({myProducts.filter(mp => mp.productId === product.id).length})
                    </button>
                  )}
                </>
              )}
              <button type="button" className="text-xs text-gray-400 hover:underline flex items-center gap-1"><Heart className="h-3 w-3" />{tc('wishlist')}</button>
              <button type="button" className="text-xs text-gray-400 hover:underline flex items-center gap-1"><Share2 className="h-3 w-3" />{tc('share')}</button>
            </div>

            {/* Price (non-album) */}
            {!isAlbum && (
              <div className="mb-4">
                <span className="text-2xl font-bold text-primary">{totalPrice.toLocaleString()}</span>
                <span className="text-sm text-gray-500 ml-1">{tc('won')}</span>
              </div>
            )}

            {/* Options - simple text sections */}
            <div className="bg-white border py-2 px-4 space-y-0">
              {product.bindings && product.bindings.length > 0 && (
                <OptionCard title={t('binding')} summary={selectedOptions.binding?.name?.split(' - ')[0].replace(/\s*\(.*?\)$/, '')}>
                  <OptionBinding bindings={product.bindings} selectedBindingId={selectedOptions.binding?.id}
                    onSelect={(binding) => setSelectedOptions(prev => ({ ...prev, binding, printSide: getDefaultPrintSideByBinding(binding.name) }))} />
                </OptionCard>
              )}

              {product.covers && product.covers.length > 0 && (
                <OptionCard title={t('albumCover')} summary={selectedOptions.cover?.name}>
                  <Select
                    value={selectedOptions.cover?.id || ''}
                    onValueChange={(value) => {
                      const cover = product.covers!.find(c => c.id === value);
                      if (cover) setSelectedOptions(prev => ({ ...prev, cover }));
                    }}
                  >
                    <SelectTrigger className="h-9 text-[11pt]">
                      <SelectValue placeholder="표지를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {product.covers.map(cover => (
                        <SelectItem key={cover.id} value={cover.id} className="text-[11pt]">
                          {cover.name}{cover.price > 0 ? ` (+${cover.price.toLocaleString()}원)` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </OptionCard>
              )}

              {isAlbum && product.fabrics && product.fabrics.length > 0 && (
                effectiveFabricInfo?.id && !isEditingFabric ? (
                  <OptionCard title={t('albumCover')} inline>
                    <div className="flex items-center gap-1.5 flex-1">
                      <div className="flex items-center gap-1.5 border border-gray-900 bg-transparent text-gray-900 rounded px-2 h-9 text-[10pt]">
                        {effectiveFabricInfo.thumbnail && (
                          <img src={normalizeImageUrl(effectiveFabricInfo.thumbnail)} alt={effectiveFabricInfo.name ?? ''}
                            className="w-5 h-5 rounded border object-cover flex-shrink-0" />
                        )}
                        <span>{effectiveFabricInfo.name}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingFabric(true)}
                      className="ml-2 text-xs text-primary hover:underline flex items-center gap-0.5 flex-shrink-0"
                    >
                      <Pencil className="h-3 w-3" />변경
                    </button>
                  </OptionCard>
                ) : (
                  <OptionCard title={t('albumCover')} count={product.fabrics.filter(pf => pf.fabric.isActive).length}>
                    <OptionCoverFabric
                      productFabrics={product.fabrics}
                      selectedFabricCategory={selectedFabricCategory}
                      onCategoryChange={setSelectedFabricCategory}
                      selectedFabricInfo={effectiveFabricInfo}
                      onFabricSelect={handleCoverFabricSelect}
                    />
                  </OptionCard>
                )
              )}

              {product.papers && product.papers.length > 0 && (
                <OptionCard title={t('paper')} inline>
                  <OptionPaper papers={product.papers} selectedPaperId={selectedOptions.paper?.id}
                    printMethod={selectedOptions.printMethod || 'indigo'}
                    colorMode={selectedOptions.colorMode || '4c'}
                    onSelectPaper={(paper) => setSelectedOptions(prev => ({ ...prev, paper }))}
                    onChangePrintMethod={(method, colorMode, defaultPaper) => setSelectedOptions(prev => ({ ...prev, printMethod: method, colorMode, paper: defaultPaper }))} />
                  <OptionPrintSide printSide={selectedOptions.printSide} bindingName={selectedOptions.binding?.name} />
                </OptionCard>
              )}

              {hasCopperPlates && (
                <OptionCard title={t('copperPlate')} inline>
                  <OptionCopperPlate
                    copperPlateType={selectedOptions.copperPlateType || 'none'}
                    publicCopperPlates={allPublicCopperPlates?.data} ownedCopperPlates={ownedCopperPlates}
                    selectedPublicPlate={selectedOptions.publicCopperPlate} selectedOwnedPlate={selectedOptions.ownedCopperPlate}
                    foilColor={selectedOptions.foilColor} foilPosition={selectedOptions.foilPosition}
                    copperPlateLabels={copperPlateLabels} isAuthenticated={isAuthenticated}
                    onTypeChange={(type) => {
                      setSelectedOptions(prev => ({
                        ...prev,
                        copperPlateType: type,
                        publicCopperPlate: undefined,
                        ownedCopperPlate: undefined,
                        foilColor: undefined,
                        foilPosition: undefined,
                      }));
                    }}
                    onPublicPlateSelect={(plate) => setSelectedOptions(prev => ({ ...prev, publicCopperPlate: plate }))}
                    onOwnedPlateSelect={(cp) => setSelectedOptions(prev => ({ ...prev, ownedCopperPlate: cp, foilColor: cp.foilColor || undefined, foilPosition: cp.foilPosition || undefined }))}
                    onFoilColorChange={(code) => setSelectedOptions(prev => ({ ...prev, foilColor: code }))}
                    onFoilPositionChange={(code) => setSelectedOptions(prev => ({ ...prev, foilPosition: code }))}
                  />
                </OptionCard>
              )}

              {product.finishings && product.finishings.length > 0 && (
                <OptionCard title={t('finishing')} inline>
                  <OptionFinishing
                    finishings={product.finishings}
                    selectedFinishings={selectedOptions.finishings}
                    selectedSpecificationId={selectedOptions.specification?.id}
                    onToggle={(finishing, checked) => setSelectedOptions(prev => ({
                      ...prev, finishings: checked ? [...prev.finishings, finishing] : prev.finishings.filter(f => f.id !== finishing.id),
                    }))}
                  />
                </OptionCard>
              )}

              {!isAlbum && (
                <OptionCard title={tc('quantity')}>
                  <div className="flex items-center">
                    <div className="flex items-center border rounded">
                      <button type="button" title="수량 감소" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-2.5 py-1 hover:bg-gray-100 text-gray-500">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input type="number" title="수량" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-12 text-center text-sm border-x py-1" min="1" />
                      <button type="button" title="수량 증가" onClick={() => setQuantity(quantity + 1)} className="px-2.5 py-1 hover:bg-gray-100 text-gray-500">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </OptionCard>
              )}
            </div>

            {/* Add to cart (non-album) */}
            {!isAlbum && (
              <Button size="lg" className="w-full mt-4" onClick={handleAddToCart}>
                <ShoppingCart className="h-4 w-4 mr-2" />{t('addToCart')}
              </Button>
            )}
          </div>
        </div>

        {/* Data upload (album only) */}
        {isAlbum && (
          <div ref={uploadSectionRef} className="mt-8 border rounded-lg p-4 md:p-6 bg-white">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5" />{t('dataUpload')}
            </h3>
            <MultiFolderUpload onAddToCart={async (folders) => {
              if (user?.clientId) {
                try {
                  const result = await api.post<{ duplicates: { folderName: string; orderNumber: string; orderedAt: string; status: string }[]; months: number }>(
                    '/orders/check-duplicates', { clientId: user.clientId, folderNames: folders.map(f => f.orderTitle) });
                  if (result.duplicates.length > 0) { setDuplicateCheckResult({ duplicates: result.duplicates, pendingFolders: folders, months: result.months }); return; }
                } catch {}
              }
              addFoldersToCart(folders);
            }} />
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-pink-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-pink-900">{t('albumOrderGuide')}</h4>
                  <p className="text-sm text-pink-700 mt-1">{t('albumOrderDescription')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Detail */}
        <div className="mt-12">
          <Card>
            <CardHeader><CardTitle>{t('detailInfo')}</CardTitle></CardHeader>
            <CardContent>
              {product.specifications && product.specifications.length > 0 && (() => {
                const sortedSpecs = [...product.specifications].sort((a, b) => ((a.widthMm || 0) * (a.heightMm || 0)) - ((b.widthMm || 0) * (b.heightMm || 0)));
                const hasInkjetPapers = product.papers?.some(p => p.isActive !== false && p.printMethod === 'inkjet') ?? false;
                const indigoSpecs = sortedSpecs.filter(s => s.forIndigo);
                const inkjetSpecs = hasInkjetPapers ? sortedSpecs.filter(s => s.forInkjet || (!s.forIndigo && !s.forInkjet)) : [];
                const hasBothGroups = indigoSpecs.length > 0 && inkjetSpecs.length > 0;
                const renderSpecGroup = (specs: typeof sortedSpecs) => (
                  <RadioGroup value={selectedOptions.specification?.id}
                    onValueChange={(value) => setSelectedOptions(prev => ({ ...prev, specification: product.specifications?.find(s => s.id === value) }))}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {specs.map((spec) => (
                      <Label key={spec.id} className={cn('flex items-center gap-1.5 px-2.5 py-2 border rounded-md cursor-pointer transition-colors text-sm bg-white min-h-[44px]',
                        selectedOptions.specification?.id === spec.id ? 'border-primary bg-primary/5 font-medium' : 'hover:border-gray-400')}>
                        <RadioGroupItem value={spec.id} className="h-3.5 w-3.5 flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium">{spec.name}</span>
                          {spec.widthMm && spec.heightMm && <span className="text-xs text-gray-500">{spec.widthMm}x{spec.heightMm}mm</span>}
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                );
                return (
                  <div className="mb-8">
                    <button type="button" onClick={() => setIsSpecExpanded(!isSpecExpanded)}
                      className="w-full flex items-center justify-between font-medium mb-2 hover:text-primary transition-colors">
                      <span className="flex items-center gap-2">
                        {t('availableSpecs')}
                        <span className="text-xs text-gray-500 font-normal">({t('countUnit', { count: product.specifications.length })})</span>
                      </span>
                      {isSpecExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                    </button>
                    {isSpecExpanded && (
                      <div className="border rounded-lg p-3 bg-gray-50 space-y-4">
                        {hasBothGroups ? (
                          <>
                            {indigoSpecs.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-blue-600 mb-2">인디고앨범 제작가능규격 <span className="text-gray-400 font-normal">({indigoSpecs.length}개)</span></p>
                                {renderSpecGroup(indigoSpecs)}
                              </div>
                            )}
                            {inkjetSpecs.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-emerald-600 mb-2">잉크젯앨범 제작가능규격 <span className="text-gray-400 font-normal">({inkjetSpecs.length}개)</span></p>
                                {renderSpecGroup(inkjetSpecs)}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {indigoSpecs.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-blue-600 mb-2">인디고앨범 제작가능규격</p>
                                {renderSpecGroup(indigoSpecs)}
                              </div>
                            )}
                            {inkjetSpecs.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-emerald-600 mb-2">잉크젯앨범 제작가능규격</p>
                                {renderSpecGroup(inkjetSpecs)}
                              </div>
                            )}
                            {indigoSpecs.length === 0 && inkjetSpecs.length === 0 && renderSpecGroup(sortedSpecs)}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
              {product.description ? (
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
              ) : (
                <p className="text-gray-500 text-center py-8">{t('noDetailInfo')}</p>
              )}
              {product.detailImages.length > 0 && (
                <div className="mt-8 grid grid-cols-2 gap-4">
                  {product.detailImages.map((img, idx) => (
                    <img key={idx} src={normalizeImageUrl(img)} alt={`${product.productName} ${idx + 1}`} className="w-full rounded-lg" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* H. Sticky Bottom Bar */}
      <ProductSummaryBar isAlbum={isAlbum} bindingName={selectedOptions.binding?.name} paperName={selectedOptions.paper?.name}
        fabricName={effectiveFabricInfo?.name || undefined} copperPlateType={selectedOptions.copperPlateType}
        onAddToCart={handleAddToCart} onScrollToUpload={() => uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        hasUploadedFolders={uploadFolders.length > 0} />

      {/* Dialogs */}
      <Dialog open={!!duplicateCheckResult} onOpenChange={(open) => { if (!open) setDuplicateCheckResult(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="h-5 w-5" />중복 주문 경고</DialogTitle>
            <DialogDescription>다음 폴더는 {duplicateCheckResult?.months || 3}개월 이내 주문 이력이 있습니다.</DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2 py-2">
            {duplicateCheckResult?.duplicates.map((dup, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-amber-50 rounded-md border border-amber-200 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div><p className="font-medium">{dup.folderName}</p><p className="text-muted-foreground text-xs">주문번호: {dup.orderNumber} / {new Date(dup.orderedAt).toLocaleDateString('ko-KR')}</p></div>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDuplicateCheckResult(null)}>취소</Button>
            {duplicateCheckResult && duplicateCheckResult.pendingFolders.length > duplicateCheckResult.duplicates.length && (
              <Button variant="secondary" onClick={() => {
                const dupNames = new Set(duplicateCheckResult.duplicates.map(d => d.folderName));
                const nonDup = duplicateCheckResult.pendingFolders.filter(f => !dupNames.has(f.orderTitle));
                setDuplicateCheckResult(null); if (nonDup.length > 0) addFoldersToCart(nonDup);
              }}>중복 제외하고 담기 ({(duplicateCheckResult?.pendingFolders.length || 0) - (duplicateCheckResult?.duplicates.length || 0)}건)</Button>
            )}
            <Button variant="default" onClick={() => { const folders = duplicateCheckResult!.pendingFolders; setDuplicateCheckResult(null); addFoldersToCart(folders, true); }}>전체 담기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveMyProductModal} onOpenChange={setShowSaveMyProductModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-primary" />{t('saveAsMyProduct')}</DialogTitle>
            <DialogDescription>{t('saveMyProductDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="myProductName">{t('myProductName')}</Label>
              <Input id="myProductName" value={myProductName} onChange={(e) => setMyProductName(e.target.value)} placeholder={t('myProductNameExample')} />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              <p className="font-medium text-gray-700 mb-2">{t('selectedOptions')}</p>
              {selectedOptions.binding && <p className="text-gray-600">{t('binding')}: {selectedOptions.binding.name}</p>}
              {effectiveFabricInfo?.name && <p className="text-gray-600">{t('albumCover')}: {effectiveFabricInfo.name}</p>}
              {selectedOptions.paper && <p className="text-gray-600">{t('paper')}: {selectedOptions.paper.name}</p>}
              {selectedOptions.printSide && <p className="text-gray-600">{t('printSection')}: {selectedOptions.printSide === 'single' ? t('singleSided') : t('doubleSided')}</p>}
              <p className="text-gray-600">{t('copperPlate')}: {selectedOptions.copperPlateType === 'none' ? t('none') : selectedOptions.copperPlateType === 'public' ? `${t('publicCopperPlate')} - ${selectedOptions.publicCopperPlate?.plateName || ''}` : `${t('ownedCopperPlate')} - ${selectedOptions.ownedCopperPlate?.plateName || ''}`}</p>
              {selectedOptions.copperPlateType !== 'none' && (<>
                {selectedOptions.foilColor && <p className="text-gray-600">{t('foilColorColon')} {copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name || selectedOptions.foilColor}</p>}
                {selectedOptions.foilPosition && <p className="text-gray-600">{t('foilPositionColon')} {copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name || selectedOptions.foilPosition}</p>}
              </>)}
              {selectedOptions.finishings.length > 0 && <p className="text-gray-600">{t('finishing')}: {selectedOptions.finishings.map(f => f.name).join(', ')}</p>}
              <p className="text-gray-600">{tc('quantity')}: {t('countUnit', { count: quantity })}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveMyProductModal(false)}>{tc('cancel')}</Button>
            <Button onClick={handleSaveMyProduct} disabled={createMyProduct.isPending}>
              {createMyProduct.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLoadMyProductModal} onOpenChange={setShowLoadMyProductModal}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FolderHeart className="h-5 w-5 text-orange-600" />{t('loadMyProduct')}</DialogTitle>
            <DialogDescription>{t('loadMyProductDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-2">
            {myProducts?.filter(mp => mp.productId === product.id).map((mp) => (
              <button key={mp.id} onClick={() => handleLoadMyProduct(mp)}
                className="w-full text-left p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors min-h-[44px]">
                <div className="flex items-start gap-3">
                  {mp.thumbnailUrl ? <img src={normalizeImageUrl(mp.thumbnailUrl)} alt={mp.name} className="w-12 h-12 object-cover rounded" />
                    : <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center"><Star className="h-5 w-5 text-gray-400" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{mp.name}</p>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {mp.options.bindingName && <p>{t('binding')}: {mp.options.bindingName}</p>}
                      {mp.options.paperName && <p>{t('paper')}: {mp.options.paperName}</p>}
                      {mp.options.copperPlateName && <p>{t('copperPlate')}: {mp.options.copperPlateName}</p>}
                      {mp.options.finishingNames && mp.options.finishingNames.length > 0 && <p>{t('finishing')}: {mp.options.finishingNames.join(', ')}</p>}
                      <p>{tc('quantity')}: {t('countUnit', { count: mp.defaultQuantity })}</p>
                    </div>
                  </div>
                  {mp.usageCount > 0 && <div className="text-xs text-gray-400"><p>{t('usedCount', { count: mp.usageCount })}</p></div>}
                </div>
              </button>
            ))}
            {myProducts?.filter(mp => mp.productId === product.id).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FolderHeart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>{t('noMyProductForThis')}</p><p className="text-sm">{t('noMyProductHint')}</p>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowLoadMyProductModal(false)}>{tc('close')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {uploadModalState?.isOpen && (
        <UploadProgressModal isOpen={uploadModalState.isOpen} newCartItemIds={uploadModalState.newCartItemIds}
          primaryIds={uploadModalState.primaryIds} onClose={() => setUploadModalState(null)} />
      )}
    </div>
  );
}

function ProductPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b"><div className="container mx-auto px-4 py-3"><Skeleton className="h-4 w-64" /></div></div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-[440px] flex-shrink-0">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="flex gap-2 mt-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="w-16 h-16 rounded-lg flex-shrink-0" />)}</div>
          </div>
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-full" /><Skeleton className="h-6 w-48" />
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
            <Skeleton className="h-12 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
