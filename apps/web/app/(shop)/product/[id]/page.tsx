'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ChevronDown, ChevronUp, Minus, Plus, ShoppingCart, Heart, Share2, Eye, FileText, Image as ImageIcon, Calendar, Star, FolderHeart, Loader2, Upload, BookOpen, AlertTriangle, Palette } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useProduct } from '@/hooks/use-products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useCartStore, type CartItemOption } from '@/stores/cart-store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { API_URL, API_BASE_URL, api } from '@/lib/api';
import type { Product, ProductSpecification, ProductBinding, ProductPaper, ProductCover, ProductFoil, ProductFinishing, ProductPublicCopperPlate } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useCopperPlatesByClient, useCopperPlateLabels, type CopperPlate } from '@/hooks/use-copper-plates';
import { useMyProductsByClient, useCreateMyProduct, type MyProduct, type MyProductOptions } from '@/hooks/use-my-products';
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
import { FabricPickerDialog } from '@/components/album-upload/fabric-picker-dialog';
import type { Fabric } from '@/hooks/use-fabrics';
import { useTranslations } from 'next-intl';

// 이미지 URL 정규화 함수
const normalizeImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace(/\/api\/v1\/api\/v1\//g, '/api/v1/');
  }
  if (url.startsWith('/api/v1/')) {
    return `${API_BASE_URL}${url}`;
  }
  if (url.startsWith('/upload')) {
    return `${API_URL}${url}`;
  }
  if (url.startsWith('/api/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
};

interface SelectedOptions {
  specification?: ProductSpecification;
  binding?: ProductBinding;
  paper?: ProductPaper;
  cover?: ProductCover;
  foil?: ProductFoil;
  finishings: ProductFinishing[];
  printSide?: 'single' | 'double';  // 단면/양면
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
  const productId = params.id as string;
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
  const createMyProduct = useCreateMyProduct();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({
    finishings: [],
  });

  // 제작가능규격 섹션 펼침 상태
  const [isSpecExpanded, setIsSpecExpanded] = useState(false);
  // 동판 리스트 펼침 상태
  const [isCopperPlateListExpanded, setIsCopperPlateListExpanded] = useState(true);

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
  } = useMultiFolderUploadStore();

  // 표지 원단 선택 다이얼로그
  const [showCoverFabricDialog, setShowCoverFabricDialog] = useState(false);

  // 선택된 원단 로컬 상태 (폴더 유무와 무관하게 유지)
  const [selectedFabric, setSelectedFabric] = useState<{
    id: string;
    name: string;
    thumbnail: string | null;
    price: number;
  } | null>(null);

  // 현재 선택된 원단 (로컬 상태 우선, 폴더 기준 fallback)
  const selectedFabricInfo = selectedFabric
    ? { id: selectedFabric.id, name: selectedFabric.name, thumbnail: selectedFabric.thumbnail }
    : uploadFolders.length > 0 && uploadFolders[0].selectedFabricId
      ? {
          id: uploadFolders[0].selectedFabricId,
          name: uploadFolders[0].selectedFabricName,
          thumbnail: uploadFolders[0].selectedFabricThumbnail,
        }
      : null;

  const handleCoverFabricSelect = (fabric: Fabric) => {
    const fabricName = fabric.name;
    // 로컬 상태에 저장 (폴더 없어도 화면에 표시)
    setSelectedFabric({
      id: fabric.id,
      name: fabricName,
      thumbnail: fabric.thumbnailUrl || null,
      price: fabric.basePrice,
    });
    // 기존 폴더에도 적용
    uploadFolders.forEach(f => {
      setFolderFabric(f.id, fabric.id, fabricName, fabric.thumbnailUrl || null, fabric.basePrice);
    });
  };

  // 새 폴더가 추가되면 선택된 원단 자동 적용
  useEffect(() => {
    if (selectedFabric && uploadFolders.length > 0) {
      uploadFolders.forEach(f => {
        if (!f.selectedFabricId) {
          setFolderFabric(f.id, selectedFabric.id, selectedFabric.name, selectedFabric.thumbnail, selectedFabric.price);
        }
      });
    }
  }, [uploadFolders.length, selectedFabric, setFolderFabric]);

  // 장바구니 담기 로딩 상태
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // 중복 주문 체크 상태
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<{
    duplicates: { folderName: string; orderNumber: string; orderedAt: string; status: string }[];
    pendingFolders: UploadedFolder[];
    months: number;
  } | null>(null);

  // 폴더들을 장바구니에 추가하는 함수
  const addFoldersToCart = useCallback((folders: UploadedFolder[], isDuplicateOverride = false) => {
    if (!product) return;
    setIsAddingToCart(true);
    setTimeout(() => {
      try {
        folders.forEach((folder) => {
          const options: CartItemOption[] = [
            { name: '규격', value: folder.specLabel, price: 0 },
            { name: '페이지', value: `${folder.pageCount}p`, price: 0 },
            { name: '파일수', value: `${folder.files.length}건`, price: 0 },
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
              printMethod: 'indigo',
              colorMode: '4c',
              pageLayout: defaultPageLayout || 'single',
              bindingDirection: defaultBindingDirection || 'LEFT_START_RIGHT_END',
              specificationId: '',
              specificationName: folder.specLabel,
              fabricName: folder.selectedFabricName || undefined,
              shippingInfo: shippingInfoData,
            },
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
                { name: '파일수', value: `${folder.files.length}건`, price: 0 },
              ],
              totalPrice: additionalPrice.totalPrice,
              albumOrderInfo: {
                folderId: folder.id,
                folderName: folder.orderTitle,
                fileCount: folder.files.length,
                pageCount: folder.pageCount,
                printMethod: 'indigo',
                colorMode: '4c',
                pageLayout: defaultPageLayout || 'single',
                bindingDirection: defaultBindingDirection || 'LEFT_START_RIGHT_END',
                specificationId: '',
                specificationName: additional.albumLabel,
                fabricName: folder.selectedFabricName || undefined,
                shippingInfo: shippingInfoData,
              },
              isDuplicateOverride,
            });
          });
        });
        clearFolders();
        router.push('/cart');
      } catch (error) {
        console.error('장바구니 담기 오류:', error);
        setIsAddingToCart(false);
        toast({
          title: '오류 발생',
          description: '장바구니에 담는 중 문제가 발생했습니다. 다시 시도해주세요.',
          variant: 'destructive',
        });
      }
    }, 50);
  }, [product, addItem, clearFolders, router, toast, defaultPageLayout, defaultBindingDirection]);

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
      setSelectedOptions({
        specification: product.specifications?.find(s => s.isDefault) || product.specifications?.[0],
        binding: defaultBinding,
        paper: product.papers?.filter(p => p.isActive !== false).find(p => p.isDefault) || product.papers?.filter(p => p.isActive !== false)[0],
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
      specificationId: selectedOptions.specification?.id,
      specificationName: selectedOptions.specification?.name,
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
      coverSourceType: defaultCoverSourceType || undefined,
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

    // 원단 복원
    if (opts.coverSourceType) {
      applyGlobalCoverSource(opts.coverSourceType);
    }
    if (opts.fabricId && opts.fabricName) {
      setSelectedFabric({
        id: opts.fabricId,
        name: opts.fabricName,
        thumbnail: opts.fabricThumbnail || null,
        price: 0,
      });
      // 기존 폴더에도 적용
      uploadFolders.forEach(f => {
        setFolderFabric(f.id, opts.fabricId!, opts.fabricName!, opts.fabricThumbnail || null, 0);
      });
    }

    setQuantity(myProduct.defaultQuantity);
    setShowLoadMyProductModal(false);

    toast({
      title: t('myProductLoaded'),
      description: t('myProductLoadedDesc', { name: myProduct.name }),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-primary">{tc('home')}</Link>
            <ChevronRight className="h-4 w-4" />
            {product.category && (
              <>
                <Link href={`/category/${product.category.id}`} className="hover:text-primary">
                  {product.category.name}
                </Link>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
            <span className="text-gray-900 font-medium truncate max-w-[200px]">
              {product.productName}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Product Info - 나머지 공간 사용 */}
          <div className="flex-1 space-y-5">
            {/* Header */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.productName}</h1>
            </div>

            {/* Price - 화보 상품은 데이터 업로드 후 폴더별로 계산하므로 숨김 */}
            {!isAlbum && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    {totalPrice.toLocaleString()}
                  </span>
                  <span className="text-lg">{tc('won')}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {t('basePrice')} {product.basePrice.toLocaleString()}{tc('won')} + {t('optionPrice')}
                </p>
              </div>
            )}

            {/* Options */}
            <div className="space-y-6">
              {/* Binding */}
              {product.bindings && product.bindings.length > 0 && (
                <OptionSection title={t('bindingMethod')}>
                  <div className="grid grid-cols-2 gap-2">
                    <RadioGroup
                      value={selectedOptions.binding?.id}
                      onValueChange={(value) => {
                        const binding = product.bindings?.find(b => b.id === value);
                        setSelectedOptions(prev => ({
                          ...prev,
                          binding,
                          printSide: binding ? getDefaultPrintSideByBinding(binding.name) : prev.printSide,
                        }));
                      }}
                      className="grid grid-cols-2 gap-2 col-span-2"
                    >
                      {product.bindings.map((binding) => (
                        <Label
                          key={binding.id}
                          className={cn(
                            "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors bg-white",
                            selectedOptions.binding?.id === binding.id
                              ? "border-primary bg-primary/5"
                              : "hover:border-gray-400"
                          )}
                        >
                          <RadioGroupItem value={binding.id} />
                          <span className="flex-1 text-xs">{binding.name.split(' - ')[0]}</span>
                          {binding.price > 0 && (
                            <span className="text-xs text-primary">+{binding.price.toLocaleString()}</span>
                          )}
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                </OptionSection>
              )}

              {/* 앨범표지 - 화보/앨범 상품만 (제본방법 바로 아래) */}
              {isAlbum && (
                <OptionSection title={t('albumCover')}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => applyGlobalCoverSource('fabric')}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
                          defaultCoverSourceType === 'fabric'
                            ? 'bg-white text-gray-900 shadow-sm border-2 border-primary'
                            : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        <Palette className="w-3.5 h-3.5" />
                        {t('fabricCover')}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyGlobalCoverSource('design')}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
                          defaultCoverSourceType === 'design'
                            ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                            : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        {t('designCover')}
                      </button>
                    </div>

                    {/* 원단표지 선택 시 원단 선택 버튼 */}
                    {defaultCoverSourceType === 'fabric' && (
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-primary hover:bg-primary/90 flex-shrink-0"
                          onClick={() => setShowCoverFabricDialog(true)}
                        >
                          선택원단
                        </Button>
                        {selectedFabricInfo?.id && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-primary/40 bg-primary/5">
                            {selectedFabricInfo.thumbnail && (
                              <div
                                className="w-12 h-12 rounded border-2 border-primary bg-cover bg-center flex-shrink-0"
                                style={{ backgroundImage: `url(${selectedFabricInfo.thumbnail})` }}
                              />
                            )}
                            <span className="text-sm font-medium text-gray-800">{selectedFabricInfo.name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <FabricPickerDialog
                    open={showCoverFabricDialog}
                    onOpenChange={setShowCoverFabricDialog}
                    selectedFabricId={selectedFabricInfo?.id || null}
                    onSelect={handleCoverFabricSelect}
                  />
                </OptionSection>
              )}

              {/* Paper - 종류별 그룹화 (isActive인 용지만 표시) */}
              {product.papers && product.papers.length > 0 && (() => {
                const activePapers = product.papers.filter(p => p.isActive !== false);
                if (activePapers.length === 0) return null;
                // 용지 이름에서 종류 추출 (숫자와 g 제외)
                const getPaperType = (name: string) => {
                  return name.replace(/\s*\d+g?$/i, '').replace(/\s+\d+$/,'').trim();
                };
                // 용지를 종류별로 그룹화
                const paperGroups = activePapers.reduce((groups, paper) => {
                  const type = getPaperType(paper.name);
                  if (!groups[type]) groups[type] = [];
                  groups[type].push(paper);
                  return groups;
                }, {} as Record<string, typeof activePapers>);
                const groupEntries = Object.entries(paperGroups);

                return (
                  <OptionSection title={t('paper')} count={activePapers.length}>
                    <div className="max-h-[280px] overflow-y-auto pr-1 space-y-3">
                      <RadioGroup
                        value={selectedOptions.paper?.id}
                        onValueChange={(value) => {
                          const paper = product.papers?.find(p => p.id === value);
                          setSelectedOptions(prev => ({ ...prev, paper }));
                        }}
                      >
                        {groupEntries.map(([type, papers]) => (
                          <div key={type} className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-gray-700 min-w-[60px]">
                              {type}
                            </span>
                            {papers.map((paper) => (
                              <Label
                                key={paper.id}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 border rounded-md cursor-pointer transition-colors text-xs",
                                  selectedOptions.paper?.id === paper.id
                                    ? "border-primary bg-primary/5 font-medium"
                                    : "hover:border-gray-400"
                                )}
                              >
                                <RadioGroupItem value={paper.id} className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="whitespace-nowrap">
                                  {paper.grammage ? `${paper.grammage}g` : paper.name}
                                </span>
                                {paper.frontCoating && <Badge variant="outline" className="text-[10px] px-1 py-0">{paper.frontCoating}</Badge>}
                                {paper.grade && <Badge variant="secondary" className="text-[10px] px-1 py-0">G{paper.grade}</Badge>}
                              </Label>
                            ))}
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </OptionSection>
                );
              })()}

              {/* Finishings */}
              {product.finishings && product.finishings.length > 0 && (
                <OptionSection title={t('finishing')}>
                  <div className="grid grid-cols-2 gap-2">
                    {product.finishings.map((finishing) => (
                      <Label
                        key={finishing.id}
                        className={cn(
                          "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                          selectedOptions.finishings.some(f => f.id === finishing.id)
                            ? "border-primary bg-primary/5"
                            : "hover:border-gray-400"
                        )}
                      >
                        <Checkbox
                          checked={selectedOptions.finishings.some(f => f.id === finishing.id)}
                          onCheckedChange={(checked) => {
                            setSelectedOptions(prev => ({
                              ...prev,
                              finishings: checked
                                ? [...prev.finishings, finishing]
                                : prev.finishings.filter(f => f.id !== finishing.id),
                            }));
                          }}
                        />
                        <span className="flex-1">{finishing.name}</span>
                        {finishing.price > 0 && (
                          <span className="text-sm text-primary">+{finishing.price.toLocaleString()}</span>
                        )}
                      </Label>
                    ))}
                  </div>
                </OptionSection>
              )}

              {/* 출력구분 - 제본방법에 따라 자동 설정 (읽기 전용) */}
              <OptionSection title={t('printSection')}>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-2 p-3 border rounded-lg transition-colors",
                      selectedOptions.printSide === 'single'
                        ? "border-primary bg-primary/5"
                        : "text-gray-400 border-gray-200"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex-shrink-0",
                      selectedOptions.printSide === 'single'
                        ? "border-primary bg-primary"
                        : "border-gray-300"
                    )}>
                      {selectedOptions.printSide === 'single' && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs">{t('singleSided')}</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-2 p-3 border rounded-lg transition-colors",
                      selectedOptions.printSide === 'double'
                        ? "border-primary bg-primary/5"
                        : "text-gray-400 border-gray-200"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex-shrink-0",
                      selectedOptions.printSide === 'double'
                        ? "border-primary bg-primary"
                        : "border-gray-300"
                    )}>
                      {selectedOptions.printSide === 'double' && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs">{t('doubleSided')}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {selectedOptions.binding?.name?.includes('압축') ||
                    selectedOptions.binding?.name?.includes('맞장') ||
                    selectedOptions.binding?.name?.includes('레이플릿')
                    ? `※ ${t('singleSidedFixed')}`
                    : selectedOptions.binding?.name?.includes('화보') ||
                      selectedOptions.binding?.name?.includes('포토북')
                      ? `※ ${t('doubleSidedFixed')}`
                      : `※ ${t('autoByBinding')}`}
                </p>
              </OptionSection>

              {/* 동판 선택은 아래 전체 너비 영역으로 이동 */}

              {/* Quantity - 화보 상품은 데이터 업로드 후 폴더별로 수량 결정 */}
              {!isAlbum && (
              <OptionSection title={tc('quantity')}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center border-x py-2"
                      min="1"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-3 hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </OptionSection>
              )}
            </div>

            {/* Action Buttons - 화보 상품이 아닌 경우만 여기에 표시 (화보는 업로드 섹션 하단에) */}
            {!isAlbum && (
              <div className="flex flex-col gap-3 pt-4 border-t">
                <Button size="lg" className="w-full" onClick={handleAddToCart}>
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {t('addToCart')}
                </Button>
              </div>
            )}

          </div>

          {/* Product Images - 고정 너비 */}
          <div className="w-full lg:w-[400px] lg:sticky lg:top-4 lg:self-start flex-shrink-0 space-y-3">
            {/* 마이상품 & 찜하기 & 공유하기 - 이미지 상단 */}
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
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-gray-500">
                <Heart className="h-3.5 w-3.5 mr-1" />
                {tc('wishlist')}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-gray-500">
                <Share2 className="h-3.5 w-3.5 mr-1" />
                {tc('share')}
              </Button>
            </div>

            {/* Main Image */}
            <div className="aspect-square bg-white rounded-lg border overflow-hidden shadow-sm">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.productName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  📦
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      "w-16 h-16 flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all",
                      selectedImage === idx ? "border-primary ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 동판 선택 - 전체 너비 사용 */}
        {((allPublicCopperPlates?.data && allPublicCopperPlates.data.length > 0) || (isAuthenticated && ownedCopperPlates && ownedCopperPlates.length > 0)) && (
          <div className="mt-6">
            <OptionSection title={t('copperPlate')}>
              <RadioGroup
                value={selectedOptions.copperPlateType || 'none'}
                onValueChange={(value) => {
                  const plateType = value as 'none' | 'public' | 'owned';
                  const firstOwnedPlate = ownedCopperPlates?.filter(cp => cp.status === 'stored')?.[0];
                  setIsCopperPlateListExpanded(true);
                  setSelectedOptions(prev => ({
                    ...prev,
                    copperPlateType: plateType,
                    publicCopperPlate: undefined,
                    ownedCopperPlate: plateType === 'owned' ? (firstOwnedPlate || prev.ownedCopperPlate) : undefined,
                    foilColor: plateType === 'owned' && firstOwnedPlate ? (firstOwnedPlate.foilColor || prev.foilColor) : prev.foilColor,
                    foilPosition: plateType === 'owned' && firstOwnedPlate ? (firstOwnedPlate.foilPosition || prev.foilPosition) : prev.foilPosition,
                  }));
                }}
                className="space-y-3"
              >
                {/* 동판 타입 가로 배치 */}
                <div className="grid grid-cols-3 gap-2">
                  <Label
                    className={cn(
                      "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                      selectedOptions.copperPlateType === 'none'
                        ? "border-primary bg-primary/5"
                        : "hover:border-gray-400"
                    )}
                  >
                    <RadioGroupItem value="none" />
                    <span className="text-xs">{t('noCopperPlate')}</span>
                  </Label>

                  {allPublicCopperPlates?.data && allPublicCopperPlates.data.length > 0 && (
                    <Label
                      className={cn(
                        "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                        selectedOptions.copperPlateType === 'public'
                          ? "border-primary bg-primary/5"
                          : "hover:border-gray-400"
                      )}
                    >
                      <RadioGroupItem value="public" />
                      <span className="text-xs">{t('publicCopperPlate')}</span>
                    </Label>
                  )}

                  {isAuthenticated && ownedCopperPlates && ownedCopperPlates.length > 0 && (
                    <Label
                      className={cn(
                        "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                        selectedOptions.copperPlateType === 'owned'
                          ? "border-primary bg-primary/5"
                          : "hover:border-gray-400"
                      )}
                    >
                      <RadioGroupItem value="owned" />
                      <span className="text-xs">{t('ownedCopperPlate')}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{t('countUnit', { count: ownedCopperPlates.length })}</Badge>
                    </Label>
                  )}
                </div>

                {/* 공용동판 목록 */}
                {selectedOptions.copperPlateType === 'public' && allPublicCopperPlates?.data && allPublicCopperPlates.data.length > 0 && (
                  <div className="space-y-2">
                    {/* 선택된 동판 요약 + 토글 */}
                    {selectedOptions.publicCopperPlate && !isCopperPlateListExpanded && (
                      <button
                        type="button"
                        onClick={() => setIsCopperPlateListExpanded(true)}
                        className="w-full flex items-center gap-3 p-2 border-2 border-primary rounded-md bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                      >
                        {selectedOptions.publicCopperPlate.imageUrl && (
                          <div className="relative group/logo shrink-0">
                            <img
                              src={normalizeImageUrl(selectedOptions.publicCopperPlate.imageUrl)}
                              alt={selectedOptions.publicCopperPlate.plateName}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="hidden group-hover/logo:block absolute z-50 left-full top-0 ml-2 p-1 bg-white border rounded-lg shadow-xl">
                              <img
                                src={normalizeImageUrl(selectedOptions.publicCopperPlate.imageUrl)}
                                alt={selectedOptions.publicCopperPlate.plateName}
                                className="w-48 h-48 object-contain rounded"
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {selectedOptions.publicCopperPlate.plateName}
                            {(selectedOptions.publicCopperPlate.widthMm || selectedOptions.publicCopperPlate.heightMm) && (
                              <span className="ml-1 text-xs text-blue-600">
                                ({selectedOptions.publicCopperPlate.widthMm}x{selectedOptions.publicCopperPlate.heightMm}mm)
                              </span>
                            )}
                          </div>
                          {selectedOptions.publicCopperPlate.defaultEngravingText && (
                            <div className="text-xs text-gray-500">{t('engraving')} {selectedOptions.publicCopperPlate.defaultEngravingText}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <span>{t('change')}</span>
                          <ChevronDown className="h-3 w-3" />
                        </div>
                      </button>
                    )}

                    {isCopperPlateListExpanded && (
                    <div className="grid grid-cols-3 gap-2">
                      {allPublicCopperPlates.data.map((plate) => (
                        <Label
                          key={plate.id}
                          className={cn(
                            "flex items-center gap-3 p-2 border rounded-md cursor-pointer transition-colors",
                            selectedOptions.publicCopperPlate?.id === plate.id
                              ? "border-primary bg-primary/5"
                              : "hover:border-gray-400"
                          )}
                          onClick={() => {
                            setSelectedOptions(prev => ({ ...prev, publicCopperPlate: plate }));
                            setIsCopperPlateListExpanded(false);
                          }}
                        >
                          {plate.imageUrl && (
                            <div className="relative group/logo shrink-0">
                              <img
                                src={normalizeImageUrl(plate.imageUrl)}
                                alt={plate.plateName}
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div className="hidden group-hover/logo:block absolute z-50 left-full top-0 ml-2 p-1 bg-white border rounded-lg shadow-xl">
                                <img
                                  src={normalizeImageUrl(plate.imageUrl)}
                                  alt={plate.plateName}
                                  className="w-48 h-48 object-contain rounded"
                                />
                              </div>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {plate.plateName}
                              {(plate.widthMm || plate.heightMm) && (
                                <span className="ml-1 text-xs text-blue-600">
                                  ({plate.widthMm}x{plate.heightMm}mm)
                                </span>
                              )}
                            </div>
                            {plate.defaultEngravingText && (
                              <div className="text-xs text-gray-500">{t('engraving')} {plate.defaultEngravingText}</div>
                            )}
                          </div>
                          <Checkbox
                            checked={selectedOptions.publicCopperPlate?.id === plate.id}
                            className="pointer-events-none"
                          />
                        </Label>
                      ))}
                    </div>
                    )}

                    {/* 박 색상 선택 */}
                    {copperPlateLabels?.foilColors && copperPlateLabels.foilColors.length > 0 && (
                      <div className="mt-3">
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
                                  "w-4 h-4 rounded-sm border",
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

                    {/* 박 위치 선택 */}
                    {copperPlateLabels?.platePositions && copperPlateLabels.platePositions.length > 0 && (
                      <div className="mt-2">
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

                {/* 보유동판 목록 */}
                {selectedOptions.copperPlateType === 'owned' && isAuthenticated && ownedCopperPlates && ownedCopperPlates.length > 0 && (
                  <div className="space-y-3">
                    {/* 선택된 보유동판 요약 + 토글 */}
                    {selectedOptions.ownedCopperPlate && !isCopperPlateListExpanded && (
                      <button
                        type="button"
                        onClick={() => setIsCopperPlateListExpanded(true)}
                        className="w-full flex items-center gap-2 p-2 border-2 border-primary rounded-md bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                      >
                        {selectedOptions.ownedCopperPlate.imageUrl && (
                          <div className="relative group/logo shrink-0">
                            <img
                              src={normalizeImageUrl(selectedOptions.ownedCopperPlate.imageUrl)}
                              alt={selectedOptions.ownedCopperPlate.plateName}
                              className="w-8 h-8 object-cover rounded"
                            />
                            <div className="hidden group-hover/logo:block absolute z-50 left-full top-0 ml-2 p-1 bg-white border rounded-lg shadow-xl">
                              <img
                                src={normalizeImageUrl(selectedOptions.ownedCopperPlate.imageUrl)}
                                alt={selectedOptions.ownedCopperPlate.plateName}
                                className="w-48 h-48 object-contain rounded"
                              />
                            </div>
                          </div>
                        )}
                        <span className="font-medium text-sm">{selectedOptions.ownedCopperPlate.plateName}</span>
                        {selectedOptions.ownedCopperPlate.foilColorName && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="text-xs text-gray-500">{selectedOptions.ownedCopperPlate.foilColorName}</span>
                          </>
                        )}
                        <span className="text-gray-300">|</span>
                        <span className="text-xs text-gray-500">{selectedOptions.ownedCopperPlate.plateType === 'copper' ? t('copperType') : t('leadType')}</span>
                        {selectedOptions.ownedCopperPlate.registeredAt && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="text-xs text-gray-400">{new Date(selectedOptions.ownedCopperPlate.registeredAt).toLocaleDateString('ko-KR')}</span>
                          </>
                        )}
                        <div className="flex items-center gap-1 text-xs text-primary ml-auto">
                          <span>{t('change')}</span>
                          <ChevronDown className="h-3 w-3" />
                        </div>
                      </button>
                    )}

                    {isCopperPlateListExpanded && (
                    <div className="max-h-[200px] overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2">
                        {ownedCopperPlates.filter(cp => cp.status === 'stored').map((cp) => {
                          const isSelected = selectedOptions.ownedCopperPlate?.id === cp.id;
                          return (
                          <Label
                            key={cp.id}
                            className={cn(
                              "flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:border-gray-400"
                            )}
                            onClick={() => {
                              setSelectedOptions(prev => ({
                                ...prev,
                                ownedCopperPlate: cp,
                                foilColor: cp.foilColor || prev.foilColor,
                                foilPosition: cp.foilPosition || prev.foilPosition,
                              }));
                              setIsCopperPlateListExpanded(false);
                            }}
                          >
                            {cp.imageUrl && (
                              <div className="relative group/logo shrink-0">
                                <img
                                  src={normalizeImageUrl(cp.imageUrl)}
                                  alt={cp.plateName}
                                  className="w-8 h-8 object-cover rounded"
                                />
                                <div className="hidden group-hover/logo:block absolute z-50 left-full top-0 ml-2 p-1 bg-white border rounded-lg shadow-xl">
                                  <img
                                    src={normalizeImageUrl(cp.imageUrl)}
                                    alt={cp.plateName}
                                    className="w-48 h-48 object-contain rounded"
                                  />
                                </div>
                              </div>
                            )}
                            <span className="font-medium text-sm">{cp.plateName}</span>
                            {isSelected ? (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="text-xs text-gray-600">
                                  {copperPlateLabels?.foilColors?.find(c => c.code === cp.foilColor)?.name || cp.foilColorName || '-'}
                                </span>
                                <span className="text-gray-300">|</span>
                                <span className="text-xs text-gray-600">
                                  {copperPlateLabels?.platePositions?.find(p => p.code === cp.foilPosition)?.name || cp.foilPosition || '-'}
                                </span>
                                <span className="text-gray-300">|</span>
                                <span className="text-xs text-gray-600">
                                  {cp.plateType === 'copper' ? t('copperType') : t('leadType')}
                                </span>
                                {cp.registeredAt && (
                                  <>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-xs text-gray-400">{new Date(cp.registeredAt).toLocaleDateString('ko-KR')}</span>
                                  </>
                                )}
                                {cp.notes && (
                                  <>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-xs text-gray-500 truncate max-w-[200px]" title={cp.notes}>{cp.notes}</span>
                                  </>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">
                                {cp.foilColorName && <span className="mr-1">{cp.foilColorName}</span>}
                                {cp.plateType === 'copper' ? t('copperType') : t('leadType')}
                                {cp.registeredAt && (
                                  <span className="ml-1 text-gray-400">({new Date(cp.registeredAt).toLocaleDateString('ko-KR')})</span>
                                )}
                              </span>
                            )}
                            <Checkbox
                              checked={isSelected}
                              className="pointer-events-none ml-auto"
                            />
                          </Label>
                          );
                        })}
                      </div>
                    </div>
                    )}

                    {/* 보유동판 선택 시 박 색상/위치 수정 가능 */}
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
                                      "w-4 h-4 rounded-sm border",
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
              </RadioGroup>
            </OptionSection>
          </div>
        )}

        {/* 데이터 업로드 섹션 - 화보 상품만 (전체 너비 사용) */}
        {isAlbum && (
          <div className="mt-6 border rounded-lg p-4 bg-white">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {t('dataUpload')}
            </h3>
            <MultiFolderUpload
              onAddToCart={async (folders) => {
                // 3개월 이내 중복 주문 체크
                if (user?.clientId) {
                  try {
                    const folderNames = folders.map(f => f.orderTitle);
                    const result = await api.post<{ duplicates: { folderName: string; orderNumber: string; orderedAt: string; status: string }[]; months: number }>(
                      '/orders/check-duplicates',
                      { clientId: user.clientId, folderNames }
                    );
                    if (result.duplicates.length > 0) {
                      // 중복 발견 - 경고 다이얼로그 표시
                      setDuplicateCheckResult({ duplicates: result.duplicates, pendingFolders: folders, months: result.months });
                      return;
                    }
                  } catch (error) {
                    console.error('중복 체크 실패:', error);
                    // 체크 실패 시 그냥 진행
                  }
                }

                // 중복 없으면 바로 장바구니 담기
                addFoldersToCart(folders);
              }}
            />

            {/* 화보/앨범 주문 안내 */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">{t('albumOrderGuide')}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('albumOrderDescription')}
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Product Detail Tabs */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>{t('detailInfo')}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 제작가능규격 */}
              {product.specifications && product.specifications.length > 0 && (
                <div className="mb-8">
                  <button
                    type="button"
                    onClick={() => setIsSpecExpanded(!isSpecExpanded)}
                    className="w-full flex items-center justify-between font-medium mb-2 hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {t('availableSpecs')}
                      <span className="text-xs text-gray-500 font-normal">({t('countUnit', { count: product.specifications.length })})</span>
                    </span>
                    {isSpecExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </button>

                  {isSpecExpanded && (
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <RadioGroup
                        value={selectedOptions.specification?.id}
                        onValueChange={(value) => {
                          const spec = product.specifications?.find(s => s.id === value);
                          setSelectedOptions(prev => ({ ...prev, specification: spec }));
                        }}
                        className="grid grid-cols-2 sm:grid-cols-4 gap-1.5"
                      >
                        {[...product.specifications]
                          .sort((a, b) => {
                            const areaA = (a.widthMm || 0) * (a.heightMm || 0);
                            const areaB = (b.widthMm || 0) * (b.heightMm || 0);
                            return areaA - areaB;
                          })
                          .map((spec) => (
                          <Label
                            key={spec.id}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-2 border rounded-md cursor-pointer transition-colors text-sm bg-white",
                              selectedOptions.specification?.id === spec.id
                                ? "border-primary bg-primary/5 font-medium"
                                : "hover:border-gray-400"
                            )}
                          >
                            <RadioGroupItem value={spec.id} className="h-3.5 w-3.5 flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="truncate font-medium">{spec.name}</span>
                              {spec.widthMm && spec.heightMm && (
                                <span className="text-xs text-gray-500">{spec.widthMm}x{spec.heightMm}mm</span>
                              )}
                            </div>
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              )}
              {product.description ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              ) : (
                <p className="text-gray-500 text-center py-8">
                  {t('noDetailInfo')}
                </p>
              )}

              {product.detailImages.length > 0 && (
                <div className="mt-8 space-y-4">
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
            </CardContent>
          </Card>
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
              {selectedFabricInfo?.name && (
                <p className="text-gray-600">원단: {selectedFabricInfo.name}</p>
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
                      {myProduct.options.fabricName && (
                        <p>원단: {myProduct.options.fabricName}</p>
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

      {/* 장바구니 담기 로딩 오버레이 */}
      {isAddingToCart && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <ShoppingCart className="absolute inset-0 m-auto h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              장바구니에 담는 중...
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              주문 데이터를 준비하고 있습니다.<br />
              잠시만 기다려 주세요.
            </p>
            <div className="mt-4 flex justify-center gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OptionSection({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4">
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-gray-800">
        {title}
        {count !== undefined && count > 0 && (
          <span className="text-xs text-gray-500 font-normal">({count})</span>
        )}
      </h3>
      {children}
    </div>
  );
}

function ProductPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-6">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-24 rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-12 flex-1 rounded-lg" />
              <Skeleton className="h-12 flex-1 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
