'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Minus, Plus, ShoppingCart, Heart, Share2, Check, Eye, FileText, Image as ImageIcon, Calendar, MapPin, Star, FolderHeart, Loader2, Upload, BookOpen } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
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
import { API_URL, API_BASE_URL } from '@/lib/api';
import type { Product, ProductSpecification, ProductBinding, ProductPaper, ProductCover, ProductFoil, ProductFinishing, ProductPublicCopperPlate } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useCopperPlatesByClient, useCopperPlateLabels, type CopperPlate } from '@/hooks/use-copper-plates';
import { useMyProductsByClient, useCreateMyProduct, type MyProduct, type MyProductOptions } from '@/hooks/use-my-products';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlbumOrderWizard } from '@/components/album-order/album-order-wizard';
import { useAlbumOrderStore } from '@/stores/album-order-store';
import { calculateFolderQuotation, formatPrice } from '@/lib/album-pricing';
import { PhotobookOrderWizard } from '@/components/photobook-order';
import { usePhotobookOrderStore } from '@/stores/photobook-order-store';

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
  publicCopperPlate?: ProductPublicCopperPlate;   // 공용동판
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

  const { data: product, isLoading, error } = useProduct(productId);
  const { addItem } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  // 보유동판 조회 (로그인한 사용자의 거래처 동판)
  const { data: ownedCopperPlates } = useCopperPlatesByClient(isAuthenticated ? user?.id : undefined);
  // 박 색상/위치 라벨 조회
  const { data: copperPlateLabels } = useCopperPlateLabels();

  // 마이상품 조회 및 저장
  const { data: myProducts } = useMyProductsByClient(isAuthenticated ? user?.id : undefined);
  const createMyProduct = useCreateMyProduct();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({
    finishings: [],
  });

  // 마이상품 모달 상태
  const [showSaveMyProductModal, setShowSaveMyProductModal] = useState(false);
  const [showLoadMyProductModal, setShowLoadMyProductModal] = useState(false);
  const [myProductName, setMyProductName] = useState('');

  // 화보앨범 위자드 상태
  const [showAlbumWizard, setShowAlbumWizard] = useState(false);
  const albumOrderStore = useAlbumOrderStore();

  // 새로운 화보 위자드 상태
  const [showPhotobookWizard, setShowPhotobookWizard] = useState(false);
  const photobookOrderStore = usePhotobookOrderStore();

  // 화보/앨범 상품인지 확인
  const isAlbum = useMemo(() => {
    return isAlbumProduct(product?.bindings);
  }, [product?.bindings]);

  // Set default options when product loads
  useEffect(() => {
    if (product) {
      const defaultBinding = product.bindings?.find(b => b.isDefault) || product.bindings?.[0];
      const defaultPublicCopperPlate = product.publicCopperPlates?.find(p => p.isDefault) || product.publicCopperPlates?.[0];
      setSelectedOptions({
        specification: product.specifications?.find(s => s.isDefault) || product.specifications?.[0],
        binding: defaultBinding,
        paper: product.papers?.find(p => p.isDefault) || product.papers?.[0],
        cover: product.covers?.find(c => c.isDefault) || product.covers?.[0],
        foil: product.foils?.find(f => f.isDefault) || product.foils?.[0],
        finishings: product.finishings?.filter(f => f.isDefault) || [],
        printSide: defaultBinding ? getDefaultPrintSideByBinding(defaultBinding.name) : 'double',
        // 동판 기본값: 공용동판이 있으면 공용동판 선택, 없으면 선택 안 함
        copperPlateType: defaultPublicCopperPlate ? 'public' : 'none',
        publicCopperPlate: defaultPublicCopperPlate,
        ownedCopperPlate: undefined,
        foilColor: copperPlateLabels?.foilColors?.[0]?.code,
        foilPosition: copperPlateLabels?.platePositions?.[0]?.code,
      });
    }
  }, [product, copperPlateLabels]);

  if (isLoading) {
    return <ProductPageSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">상품을 찾을 수 없습니다</h1>
        <p className="text-gray-500 mb-8">요청하신 상품이 존재하지 않거나 삭제되었습니다.</p>
        <Link href="/">
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  const calculatePrice = () => {
    let price = product.basePrice;

    if (selectedOptions.specification) {
      price += selectedOptions.specification.price;
    }
    if (selectedOptions.binding) {
      price += selectedOptions.binding.price;
    }
    if (selectedOptions.paper) {
      price += selectedOptions.paper.price;
    }
    if (selectedOptions.cover) {
      price += selectedOptions.cover.price;
    }
    if (selectedOptions.foil) {
      price += selectedOptions.foil.price;
    }
    for (const finishing of selectedOptions.finishings) {
      price += finishing.price;
    }

    return price * quantity;
  };

  const handleAddToCart = () => {
    const options: CartItemOption[] = [];

    if (selectedOptions.specification) {
      options.push({
        name: '규격',
        value: selectedOptions.specification.name,
        price: selectedOptions.specification.price,
      });
    }
    if (selectedOptions.binding) {
      options.push({
        name: '제본',
        value: selectedOptions.binding.name,
        price: selectedOptions.binding.price,
      });
    }
    if (selectedOptions.paper) {
      options.push({
        name: '용지',
        value: selectedOptions.paper.name,
        price: selectedOptions.paper.price,
      });
    }
    if (selectedOptions.cover) {
      options.push({
        name: '커버',
        value: selectedOptions.cover.name,
        price: selectedOptions.cover.price,
      });
    }
    if (selectedOptions.foil) {
      options.push({
        name: '박',
        value: selectedOptions.foil.name,
        price: selectedOptions.foil.price,
      });
    }
    for (const finishing of selectedOptions.finishings) {
      options.push({
        name: '후가공',
        value: finishing.name,
        price: finishing.price,
      });
    }
    // 출력구분 추가
    options.push({
      name: '출력구분',
      value: selectedOptions.printSide === 'single' ? '단면출력' : '양면출력',
      price: 0,
    });

    // 동판 정보 추가 (항상 표시)
    if (selectedOptions.copperPlateType === 'none' || !selectedOptions.copperPlateType) {
      options.push({
        name: '동판',
        value: '없음',
        price: 0,
      });
    } else if (selectedOptions.copperPlateType === 'public' && selectedOptions.publicCopperPlate) {
      const plate = selectedOptions.publicCopperPlate.publicCopperPlate;
      const foilColorLabel = copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name || selectedOptions.foilColor;
      const foilPositionLabel = copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name || selectedOptions.foilPosition;
      options.push({
        name: '동판',
        value: `공용동판 - ${plate.plateName}`,
        price: 0,
      });
      if (selectedOptions.foilColor) {
        options.push({
          name: '박색상',
          value: foilColorLabel || '',
          price: 0,
        });
      }
      if (selectedOptions.foilPosition) {
        options.push({
          name: '박위치',
          value: foilPositionLabel || '',
          price: 0,
        });
      }
    } else if (selectedOptions.copperPlateType === 'owned' && selectedOptions.ownedCopperPlate) {
      const plate = selectedOptions.ownedCopperPlate;
      // 사용자가 수정한 색상/위치 또는 동판에 저장된 값 사용
      const foilColorLabel = copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name
        || copperPlateLabels?.foilColors?.find(c => c.code === plate.foilColor)?.name
        || plate.foilColorName;
      const foilPositionLabel = copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name
        || copperPlateLabels?.platePositions?.find(p => p.code === plate.foilPosition)?.name;
      options.push({
        name: '동판',
        value: `보유동판 - ${plate.plateName}`,
        price: 0,
      });
      if (foilColorLabel) {
        options.push({
          name: '박색상',
          value: foilColorLabel,
          price: 0,
        });
      }
      if (foilPositionLabel) {
        options.push({
          name: '박위치',
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
      totalPrice: calculatePrice(),
      copperPlateInfo,
    });

    toast({
      title: '장바구니에 담았습니다',
      description: `${product.productName} ${quantity}개가 장바구니에 추가되었습니다.`,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/cart');
  };

  // 마이상품 저장
  const handleSaveMyProduct = async () => {
    if (!isAuthenticated || !user?.id || !product) {
      toast({
        title: '로그인이 필요합니다',
        description: '마이상품 저장은 로그인 후 이용 가능합니다.',
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
          ? selectedOptions.publicCopperPlate?.publicCopperPlate?.plateName
          : undefined,
      foilColor: selectedOptions.foilColor,
      foilColorName: copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name,
      foilPosition: selectedOptions.foilPosition,
      foilPositionName: copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name,
      finishingIds: selectedOptions.finishings.map(f => f.id),
      finishingNames: selectedOptions.finishings.map(f => f.name),
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
        title: '마이상품 저장 완료',
        description: '선택한 옵션이 마이상품으로 저장되었습니다.',
      });
      setShowSaveMyProductModal(false);
      setMyProductName('');
    } catch {
      toast({
        title: '저장 실패',
        description: '마이상품 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 화보앨범 위자드 열기 (기존)
  const handleOpenAlbumWizard = () => {
    if (!product) return;
    albumOrderStore.reset();
    albumOrderStore.setProductInfo(product.id, product.productName);
    if (selectedOptions.binding) {
      albumOrderStore.setBindingInfo(selectedOptions.binding.id, selectedOptions.binding.name);
    }
    setShowAlbumWizard(true);
  };

  // 새 화보 위자드 열기
  const handleOpenPhotobookWizard = () => {
    if (!product) return;
    photobookOrderStore.reset();
    setShowPhotobookWizard(true);
  };

  // 화보앨범 위자드 완료 핸들러
  const handleAlbumWizardComplete = () => {
    const state = albumOrderStore;

    // 장바구니에 추가할 옵션 구성
    const options: CartItemOption[] = [];

    // 출력기종
    options.push({
      name: '출력기종',
      value: state.printMethod === 'indigo' ? '인디고' : '잉크젯',
      price: 0,
    });

    // 도수
    options.push({
      name: '도수',
      value: state.colorMode === '4c' ? '4도(CMYK)' : '6도(CMYK+OV)',
      price: 0,
    });

    // 페이지 레이아웃
    options.push({
      name: '레이아웃',
      value: state.pageLayout === 'single' ? '낱장' : '펼침면',
      price: 0,
    });

    // 제본방향
    const directionLabels: Record<string, string> = {
      'ltr-rend': '좌시작→우끝',
      'ltr-lend': '좌시작→좌끝',
      'rtl-lend': '우시작→좌끝',
      'rtl-rend': '우시작→우끝',
    };
    options.push({
      name: '제본방향',
      value: directionLabels[state.bindingDirection] || state.bindingDirection,
      price: 0,
    });

    // 규격
    if (state.selectedSpecificationName) {
      options.push({
        name: '규격',
        value: state.selectedSpecificationName,
        price: 0,
      });
    }

    // 제본방법
    if (state.bindingName) {
      options.push({
        name: '제본',
        value: state.bindingName,
        price: selectedOptions.binding?.price || 0,
      });
    }

    // 용지 (기존 선택 옵션 사용)
    if (selectedOptions.paper) {
      options.push({
        name: '용지',
        value: selectedOptions.paper.name,
        price: selectedOptions.paper.price,
      });
    }

    // 규격명 추출
    const specName = state.selectedSpecificationName || '12x12';

    // 각 폴더별로 장바구니 아이템 추가
    state.folders.forEach((folder, index) => {
      // 견적 계산
      const quotation = calculateFolderQuotation(folder, {
        albumType: 'premium-photo',
        coverType: 'hard-standard',
        printMethod: state.printMethod,
        colorMode: state.colorMode,
        pageLayout: state.pageLayout,
        specName,
      });

      const folderOptions = [...options];

      // 폴더별 파일 정보
      folderOptions.push({
        name: '폴더',
        value: folder.folderName,
        price: 0,
      });
      folderOptions.push({
        name: '파일수',
        value: `${folder.fileCount}개`,
        price: 0,
      });
      folderOptions.push({
        name: '페이지수',
        value: `${folder.pageCount}p`,
        price: 0,
      });

      // 대표 규격 정보
      if (folder.representativeSpec) {
        folderOptions.push({
          name: '원본규격',
          value: `${folder.representativeSpec.widthInch}x${folder.representativeSpec.heightInch}"`,
          price: 0,
        });
      }

      addItem({
        productId: product?.id || '',
        productType: 'album-order',
        name: `${product?.productName} - ${folder.folderName}`,
        thumbnailUrl: product?.thumbnailUrl || undefined,
        basePrice: quotation.unitPrice,
        quantity: folder.quantity,
        options: folderOptions,
        totalPrice: quotation.totalPrice,
        // 앨범 주문 추가 정보
        albumOrderInfo: {
          folderId: folder.id,
          folderName: folder.folderName,
          fileCount: folder.fileCount,
          pageCount: folder.pageCount,
          printMethod: state.printMethod,
          colorMode: state.colorMode,
          pageLayout: state.pageLayout,
          bindingDirection: state.bindingDirection,
          specificationId: state.selectedSpecificationId,
          specificationName: state.selectedSpecificationName,
        },
      });
    });

    toast({
      title: '장바구니에 담았습니다',
      description: `${state.folders.length}개 앨범이 장바구니에 추가되었습니다.`,
    });

    setShowAlbumWizard(false);
    albumOrderStore.reset();
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
      ? product?.publicCopperPlates?.find(p => p.id === opts.copperPlateId)
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

    setQuantity(myProduct.defaultQuantity);
    setShowLoadMyProductModal(false);

    toast({
      title: '마이상품 불러오기 완료',
      description: `"${myProduct.name}" 옵션이 적용되었습니다.`,
    });
  };

  const images = product.thumbnailUrl
    ? [normalizeImageUrl(product.thumbnailUrl), ...product.detailImages.map(img => normalizeImageUrl(img))]
    : product.detailImages.length > 0
      ? product.detailImages.map(img => normalizeImageUrl(img))
      : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-primary">홈</Link>
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

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-white rounded-lg border overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.productName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">
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
                      "w-20 h-20 flex-shrink-0 rounded-lg border-2 overflow-hidden",
                      selectedImage === idx ? "border-primary" : "border-transparent"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {product.isNew && <Badge className="bg-green-500">NEW</Badge>}
                {product.isBest && <Badge className="bg-red-500">BEST</Badge>}
                <span className="text-sm text-gray-500">{product.productCode}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.productName}</h1>
              {product.description && (
                <div
                  className="text-gray-600 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}
            </div>

            {/* Price */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">
                  {calculatePrice().toLocaleString()}
                </span>
                <span className="text-lg">원</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                기본가 {product.basePrice.toLocaleString()}원 + 옵션가
              </p>
            </div>

            {/* Options */}
            <div className="space-y-6">
              {/* 페이지 편집 방식 */}
              <OptionSection title="페이지 편집 방식">
                <RadioGroup
                  value={selectedOptions.pageEditMode || 'single'}
                  onValueChange={(value) => setSelectedOptions(prev => ({ ...prev, pageEditMode: value as 'single' | 'spread' }))}
                  className="grid grid-cols-2 gap-2"
                >
                  <Label className={cn(
                    "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                    (selectedOptions.pageEditMode || 'single') === 'single' ? "border-primary bg-primary/5" : "hover:border-gray-400"
                  )}>
                    <RadioGroupItem value="single" />
                    <div className="flex flex-col">
                      <span className="font-medium">낱장</span>
                      <span className="text-xs text-gray-500">1파일 = 1페이지</span>
                    </div>
                  </Label>
                  <Label className={cn(
                    "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                    selectedOptions.pageEditMode === 'spread' ? "border-primary bg-primary/5" : "hover:border-gray-400"
                  )}>
                    <RadioGroupItem value="spread" />
                    <div className="flex flex-col">
                      <span className="font-medium">펼침면</span>
                      <span className="text-xs text-gray-500">1파일 = 2페이지</span>
                    </div>
                  </Label>
                </RadioGroup>
              </OptionSection>

              {/* 제본 순서 */}
              <OptionSection title="제본 순서">
                <RadioGroup
                  value={selectedOptions.bindingDirection || 'left-to-right'}
                  onValueChange={(value) => setSelectedOptions(prev => ({ ...prev, bindingDirection: value }))}
                  className="grid grid-cols-2 gap-2"
                >
                  <Label className={cn(
                    "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                    (selectedOptions.bindingDirection || 'left-to-right') === 'left-to-right' ? "border-primary bg-primary/5" : "hover:border-gray-400"
                  )}>
                    <RadioGroupItem value="left-to-right" />
                    <div className="flex flex-col">
                      <span className="font-medium">좌시작→우끝</span>
                      <span className="text-xs text-gray-500">일반적인 좌철 (한국어 기본)</span>
                    </div>
                  </Label>
                  <Label className={cn(
                    "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                    selectedOptions.bindingDirection === 'left-to-left' ? "border-primary bg-primary/5" : "hover:border-gray-400"
                  )}>
                    <RadioGroupItem value="left-to-left" />
                    <div className="flex flex-col">
                      <span className="font-medium">좌시작→좌끝</span>
                      <span className="text-xs text-gray-500">좌철 인데 마지막도 왼쪽</span>
                    </div>
                  </Label>
                  <Label className={cn(
                    "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                    selectedOptions.bindingDirection === 'right-to-left' ? "border-primary bg-primary/5" : "hover:border-gray-400"
                  )}>
                    <RadioGroupItem value="right-to-left" />
                    <div className="flex flex-col">
                      <span className="font-medium">우시작→좌끝</span>
                      <span className="text-xs text-gray-500">우철 (일본어/아랍어)</span>
                    </div>
                  </Label>
                  <Label className={cn(
                    "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                    selectedOptions.bindingDirection === 'right-to-right' ? "border-primary bg-primary/5" : "hover:border-gray-400"
                  )}>
                    <RadioGroupItem value="right-to-right" />
                    <div className="flex flex-col">
                      <span className="font-medium">우시작→우끝</span>
                      <span className="text-xs text-gray-500">우철 인데 마지막도 오른쪽</span>
                    </div>
                  </Label>
                </RadioGroup>
              </OptionSection>

              {/* Specification */}
              {product.specifications && product.specifications.length > 0 && (
                <OptionSection title="규격" count={product.specifications.length}>
                  <div className="max-h-[240px] overflow-y-auto pr-1">
                    <RadioGroup
                      value={selectedOptions.specification?.id}
                      onValueChange={(value) => {
                        const spec = product.specifications?.find(s => s.id === value);
                        setSelectedOptions(prev => ({ ...prev, specification: spec }));
                      }}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-1.5"
                    >
                      {product.specifications.map((spec) => (
                        <Label
                          key={spec.id}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-2 border rounded-md cursor-pointer transition-colors text-sm",
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
                </OptionSection>
              )}

              {/* Binding */}
              {product.bindings && product.bindings.length > 0 && (
                <OptionSection title="제본방법">
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
                    className="grid grid-cols-2 gap-2"
                  >
                    {product.bindings.map((binding) => (
                      <Label
                        key={binding.id}
                        className={cn(
                          "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                          selectedOptions.binding?.id === binding.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-gray-400"
                        )}
                      >
                        <RadioGroupItem value={binding.id} />
                        <span className="flex-1">{binding.name.split(' - ')[0]}</span>
                        {binding.price > 0 && (
                          <span className="text-sm text-primary">+{binding.price.toLocaleString()}</span>
                        )}
                      </Label>
                    ))}
                  </RadioGroup>
                </OptionSection>
              )}

              {/* Paper - 종류별 그룹화 */}
              {product.papers && product.papers.length > 0 && (() => {
                // 용지 이름에서 종류 추출 (숫자와 g 제외)
                const getPaperType = (name: string) => {
                  return name.replace(/\s*\d+g?$/i, '').replace(/\s+\d+$/,'').trim();
                };
                // 용지를 종류별로 그룹화
                const paperGroups = product.papers.reduce((groups, paper) => {
                  const type = getPaperType(paper.name);
                  if (!groups[type]) groups[type] = [];
                  groups[type].push(paper);
                  return groups;
                }, {} as Record<string, typeof product.papers>);
                const groupEntries = Object.entries(paperGroups);

                return (
                  <OptionSection title="용지" count={product.papers.length}>
                    <div className="max-h-[280px] overflow-y-auto pr-1 space-y-3">
                      <RadioGroup
                        value={selectedOptions.paper?.id}
                        onValueChange={(value) => {
                          const paper = product.papers?.find(p => p.id === value);
                          setSelectedOptions(prev => ({ ...prev, paper }));
                        }}
                      >
                        {groupEntries.map(([type, papers]) => (
                          <div key={type} className="space-y-1.5">
                            <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded sticky top-0">
                              {type} <span className="text-gray-400">({papers.length})</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 pl-1">
                              {papers.map((paper) => (
                                <Label
                                  key={paper.id}
                                  className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-2 border rounded-md cursor-pointer transition-colors text-sm",
                                    selectedOptions.paper?.id === paper.id
                                      ? "border-primary bg-primary/5 font-medium"
                                      : "hover:border-gray-400"
                                  )}
                                >
                                  <RadioGroupItem value={paper.id} className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate flex-1">
                                    {paper.grammage ? `${paper.grammage}g` : paper.name}
                                  </span>
                                  <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                                    {paper.frontCoating && <Badge variant="outline" className="text-[10px] px-1 py-0">{paper.frontCoating}</Badge>}
                                    {paper.grade && <Badge variant="secondary" className="text-[10px] px-1 py-0">G{paper.grade}</Badge>}
                                  </div>
                                </Label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </OptionSection>
                );
              })()}

              {/* Finishings */}
              {product.finishings && product.finishings.length > 0 && (
                <OptionSection title="후가공">
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
              <OptionSection title="출력구분">
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-2 p-3 border rounded-lg transition-colors",
                      selectedOptions.printSide === 'single'
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 bg-gray-50 text-gray-400"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2",
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
                    <span className="flex-1">단면출력</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-2 p-3 border rounded-lg transition-colors",
                      selectedOptions.printSide === 'double'
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 bg-gray-50 text-gray-400"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2",
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
                    <span className="flex-1">양면출력</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {selectedOptions.binding?.name?.includes('압축') ||
                    selectedOptions.binding?.name?.includes('맞장') ||
                    selectedOptions.binding?.name?.includes('레이플릿')
                    ? '※ 압축제본류(압축, 맞장, 레이플릿)는 단면출력으로 고정됩니다.'
                    : selectedOptions.binding?.name?.includes('화보') ||
                      selectedOptions.binding?.name?.includes('포토북')
                      ? '※ 화보류(핀화보, 스타화보, 포토북)는 양면출력으로 고정됩니다.'
                      : '※ 제본방법에 따라 자동으로 설정됩니다.'}
                </p>
              </OptionSection>

              {/* 동판 선택 */}
              {(product.publicCopperPlates && product.publicCopperPlates.length > 0) || (isAuthenticated && ownedCopperPlates && ownedCopperPlates.length > 0) ? (
                <OptionSection title="동판">
                  {/* 동판 타입 선택 */}
                  <RadioGroup
                    value={selectedOptions.copperPlateType || 'none'}
                    onValueChange={(value) => {
                      const plateType = value as 'none' | 'public' | 'owned';
                      const firstOwnedPlate = ownedCopperPlates?.filter(cp => cp.status === 'stored')?.[0];
                      setSelectedOptions(prev => ({
                        ...prev,
                        copperPlateType: plateType,
                        publicCopperPlate: plateType === 'public' ? (product.publicCopperPlates?.[0] || prev.publicCopperPlate) : undefined,
                        ownedCopperPlate: plateType === 'owned' ? (firstOwnedPlate || prev.ownedCopperPlate) : undefined,
                        // 보유동판 선택 시 첫 번째 동판의 색상/위치 자동 로드
                        foilColor: plateType === 'owned' && firstOwnedPlate ? (firstOwnedPlate.foilColor || prev.foilColor) : prev.foilColor,
                        foilPosition: plateType === 'owned' && firstOwnedPlate ? (firstOwnedPlate.foilPosition || prev.foilPosition) : prev.foilPosition,
                      }));
                    }}
                    className="space-y-3"
                  >
                    {/* 동판 타입 가로 배치 */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* 동판 없음 */}
                      <Label
                        className={cn(
                          "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                          selectedOptions.copperPlateType === 'none'
                            ? "border-primary bg-primary/5"
                            : "hover:border-gray-400"
                        )}
                      >
                        <RadioGroupItem value="none" />
                        <span>동판 없음</span>
                      </Label>

                      {/* 공용동판 */}
                      {product.publicCopperPlates && product.publicCopperPlates.length > 0 && (
                        <Label
                          className={cn(
                            "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                            selectedOptions.copperPlateType === 'public'
                              ? "border-primary bg-primary/5"
                              : "hover:border-gray-400"
                          )}
                        >
                          <RadioGroupItem value="public" />
                          <span>공용동판</span>
                        </Label>
                      )}

                      {/* 보유동판 (로그인 시에만 표시) */}
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
                          <span>보유동판</span>
                          <Badge variant="secondary" className="ml-auto text-xs">{ownedCopperPlates.length}개</Badge>
                        </Label>
                      )}
                    </div>

                    {/* 공용동판 목록 (선택 시 표시) */}
                    {selectedOptions.copperPlateType === 'public' && product.publicCopperPlates && product.publicCopperPlates.length > 0 && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2">
                          {product.publicCopperPlates.map((pcp) => (
                            <Label
                              key={pcp.id}
                              className={cn(
                                "flex items-center gap-3 p-2 border rounded-md cursor-pointer transition-colors",
                                selectedOptions.publicCopperPlate?.id === pcp.id
                                  ? "border-primary bg-primary/5"
                                  : "hover:border-gray-400"
                              )}
                              onClick={() => setSelectedOptions(prev => ({ ...prev, publicCopperPlate: pcp }))}
                            >
                              {pcp.publicCopperPlate.imageUrl && (
                                <img
                                  src={normalizeImageUrl(pcp.publicCopperPlate.imageUrl)}
                                  alt={pcp.publicCopperPlate.plateName}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {pcp.publicCopperPlate.plateName}
                                  {(pcp.publicCopperPlate.widthMm || pcp.publicCopperPlate.heightMm) && (
                                    <span className="ml-1 text-xs text-blue-600">
                                      ({pcp.publicCopperPlate.widthMm}x{pcp.publicCopperPlate.heightMm}mm)
                                    </span>
                                  )}
                                </div>
                                {pcp.engravingText && (
                                  <div className="text-xs text-gray-500">각인: {pcp.engravingText}</div>
                                )}
                              </div>
                              <Checkbox
                                checked={selectedOptions.publicCopperPlate?.id === pcp.id}
                                className="pointer-events-none"
                              />
                            </Label>
                          ))}
                        </div>

                        {/* 박 색상 선택 */}
                        {copperPlateLabels?.foilColors && copperPlateLabels.foilColors.length > 0 && (
                          <div className="mt-3">
                            <Label className="text-xs text-gray-600 mb-1 block">박 색상</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {copperPlateLabels.foilColors.filter(c => c.isActive).map((color) => (
                                <button
                                  key={color.id}
                                  type="button"
                                  onClick={() => setSelectedOptions(prev => ({ ...prev, foilColor: color.code }))}
                                  className={cn(
                                    "px-2 py-1 text-xs rounded-md border transition-colors",
                                    selectedOptions.foilColor === color.code
                                      ? "border-primary bg-primary text-white"
                                      : "border-gray-300 hover:border-gray-400"
                                  )}
                                >
                                  {color.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 박 위치 선택 */}
                        {copperPlateLabels?.platePositions && copperPlateLabels.platePositions.length > 0 && (
                          <div className="mt-2">
                            <Label className="text-xs text-gray-600 mb-1 block">박 위치</Label>
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

                    {/* 보유동판 목록 (선택 시 표시) */}
                    {selectedOptions.copperPlateType === 'owned' && isAuthenticated && ownedCopperPlates && ownedCopperPlates.length > 0 && (
                      <div className="space-y-3">
                        <div className="max-h-[200px] overflow-y-auto">
                          <div className="grid grid-cols-1 gap-2">
                            {ownedCopperPlates.filter(cp => cp.status === 'stored').map((cp) => (
                              <Label
                                key={cp.id}
                                className={cn(
                                  "flex items-center gap-3 p-2 border rounded-md cursor-pointer transition-colors",
                                  selectedOptions.ownedCopperPlate?.id === cp.id
                                    ? "border-primary bg-primary/5"
                                    : "hover:border-gray-400"
                                )}
                                onClick={() => {
                                  // 보유동판 선택 시 저장된 색상/위치 자동 로드
                                  setSelectedOptions(prev => ({
                                    ...prev,
                                    ownedCopperPlate: cp,
                                    foilColor: cp.foilColor || prev.foilColor,
                                    foilPosition: cp.foilPosition || prev.foilPosition,
                                  }));
                                }}
                              >
                                {cp.imageUrl && (
                                  <img
                                    src={normalizeImageUrl(cp.imageUrl)}
                                    alt={cp.plateName}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{cp.plateName}</div>
                                  <div className="text-xs text-gray-500">
                                    {cp.foilColorName && <span className="mr-2">{cp.foilColorName}</span>}
                                    {cp.foilPosition && (
                                      <span className="mr-2">
                                        {copperPlateLabels?.platePositions?.find(p => p.code === cp.foilPosition)?.name || cp.foilPosition}
                                      </span>
                                    )}
                                    {cp.plateType === 'copper' ? '동판' : '연판'}
                                  </div>
                                </div>
                                <Checkbox
                                  checked={selectedOptions.ownedCopperPlate?.id === cp.id}
                                  className="pointer-events-none"
                                />
                              </Label>
                            ))}
                          </div>
                        </div>

                        {/* 선택된 보유동판 상세 정보 카드 */}
                        {selectedOptions.ownedCopperPlate && (
                          <div className="border-2 border-primary/30 rounded-lg p-4 bg-blue-50/50">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-primary/20">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm text-primary">선택된 동판 정보</h4>
                                <p className="text-xs text-gray-500">{selectedOptions.ownedCopperPlate.plateName}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {/* 동판 이미지 */}
                              {selectedOptions.ownedCopperPlate.imageUrl && (
                                <div className="col-span-2 sm:col-span-1">
                                  <Label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                                    <ImageIcon className="h-3 w-3" />
                                    동판 이미지
                                  </Label>
                                  <a
                                    href={normalizeImageUrl(selectedOptions.ownedCopperPlate.imageUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={normalizeImageUrl(selectedOptions.ownedCopperPlate.imageUrl)}
                                      alt="동판 이미지"
                                      className="w-full h-24 object-contain rounded border bg-white hover:border-primary transition-colors"
                                    />
                                  </a>
                                </div>
                              )}

                              {/* 앨범 이미지 */}
                              {selectedOptions.ownedCopperPlate.albumPhotoUrl && (
                                <div className="col-span-2 sm:col-span-1">
                                  <Label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                                    <ImageIcon className="h-3 w-3" />
                                    앨범 이미지
                                  </Label>
                                  <a
                                    href={normalizeImageUrl(selectedOptions.ownedCopperPlate.albumPhotoUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={normalizeImageUrl(selectedOptions.ownedCopperPlate.albumPhotoUrl)}
                                      alt="앨범 이미지"
                                      className="w-full h-24 object-contain rounded border bg-white hover:border-primary transition-colors"
                                    />
                                  </a>
                                </div>
                              )}

                              {/* 기본 정보 */}
                              <div className="col-span-2 grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border">
                                  <span className="text-gray-500 text-xs">박 컬러:</span>
                                  <span className="font-medium text-xs">
                                    {copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.ownedCopperPlate?.foilColor)?.name
                                      || selectedOptions.ownedCopperPlate.foilColorName
                                      || '-'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border">
                                  <span className="text-gray-500 text-xs">박 위치:</span>
                                  <span className="font-medium text-xs">
                                    {copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.ownedCopperPlate?.foilPosition)?.name
                                      || selectedOptions.ownedCopperPlate.foilPosition
                                      || '-'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border">
                                  <span className="text-gray-500 text-xs">종류:</span>
                                  <span className="font-medium text-xs">
                                    {selectedOptions.ownedCopperPlate.plateType === 'copper' ? '동판' : '연판'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border">
                                  <Calendar className="h-3 w-3 text-gray-400" />
                                  <span className="font-medium text-xs">
                                    {selectedOptions.ownedCopperPlate.registeredAt
                                      ? new Date(selectedOptions.ownedCopperPlate.registeredAt).toLocaleDateString('ko-KR')
                                      : '-'}
                                  </span>
                                </div>
                              </div>

                              {/* AI 파일 */}
                              {selectedOptions.ownedCopperPlate.aiFileUrl && (
                                <div className="col-span-2">
                                  <Label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    AI 파일
                                  </Label>
                                  <a
                                    href={normalizeImageUrl(selectedOptions.ownedCopperPlate.aiFileUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-white rounded border hover:border-primary hover:bg-primary/5 transition-colors text-xs"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-primary" />
                                    <span className="truncate flex-1">{selectedOptions.ownedCopperPlate.aiFileUrl.split('/').pop()}</span>
                                  </a>
                                </div>
                              )}

                              {/* 메모 */}
                              {selectedOptions.ownedCopperPlate.notes && (
                                <div className="col-span-2">
                                  <Label className="text-xs text-gray-600 mb-1">메모</Label>
                                  <div className="px-3 py-2 bg-white rounded border text-xs text-gray-700">
                                    {selectedOptions.ownedCopperPlate.notes}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 보유동판 선택 시 박 색상/위치 수정 가능 */}
                        {selectedOptions.ownedCopperPlate && (
                          <>
                            {/* 박 색상 선택 */}
                            {copperPlateLabels?.foilColors && copperPlateLabels.foilColors.length > 0 && (
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">박 색상</Label>
                                <div className="flex flex-wrap gap-1.5">
                                  {copperPlateLabels.foilColors.filter(c => c.isActive).map((color) => (
                                    <button
                                      key={color.id}
                                      type="button"
                                      onClick={() => setSelectedOptions(prev => ({ ...prev, foilColor: color.code }))}
                                      className={cn(
                                        "px-2 py-1 text-xs rounded-md border transition-colors",
                                        selectedOptions.foilColor === color.code
                                          ? "border-primary bg-primary text-white"
                                          : "border-gray-300 hover:border-gray-400"
                                      )}
                                    >
                                      {color.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 박 위치 선택 */}
                            {copperPlateLabels?.platePositions && copperPlateLabels.platePositions.length > 0 && (
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">박 위치</Label>
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
              ) : null}

              {/* Quantity */}
              <OptionSection title="수량">
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
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4 border-t">
              {/* 화보앨범 상품인 경우 데이터 업로드 주문 버튼 표시 */}
              {isAlbum && (
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  onClick={handleOpenPhotobookWizard}
                >
                  <Upload className="h-5 w-5 mr-2" />
                  화보 주문
                  <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
                    6단계
                  </Badge>
                </Button>
              )}

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={handleAddToCart}>
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  장바구니
                </Button>
                <Button size="lg" className="flex-1" onClick={handleBuyNow}>
                  바로 주문
                </Button>
              </div>
            </div>

            {/* 화보앨범 안내 */}
            {isAlbum && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-purple-900">화보/앨범 주문 안내</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      &quot;데이터 업로드 주문&quot; 버튼을 클릭하면 폴더별로 파일을 업로드하고
                      규격을 자동으로 분석하여 주문할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 마이상품 & Share & Wishlist */}
            <div className="flex flex-wrap gap-2 pt-2">
              {isAuthenticated && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMyProductName(`${product.productName} ${selectedOptions.specification?.name || ''}`.trim());
                      setShowSaveMyProductModal(true);
                    }}
                    className="text-primary border-primary hover:bg-primary/10"
                  >
                    <Star className="h-4 w-4 mr-1" />
                    마이상품 저장
                  </Button>
                  {myProducts && myProducts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLoadMyProductModal(true)}
                      className="text-orange-600 border-orange-600 hover:bg-orange-50"
                    >
                      <FolderHeart className="h-4 w-4 mr-1" />
                      마이상품 불러오기 ({myProducts.filter(mp => mp.productId === product.id).length})
                    </Button>
                  )}
                </>
              )}
              <Button variant="ghost" size="sm" className="text-gray-500">
                <Heart className="h-4 w-4 mr-1" />
                찜하기
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-500">
                <Share2 className="h-4 w-4 mr-1" />
                공유하기
              </Button>
            </div>
          </div>
        </div>

        {/* Product Detail Tabs */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>상품 상세정보</CardTitle>
            </CardHeader>
            <CardContent>
              {product.description ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              ) : (
                <p className="text-gray-500 text-center py-8">
                  상세 정보가 등록되지 않았습니다.
                </p>
              )}

              {product.detailImages.length > 0 && (
                <div className="mt-8 space-y-4">
                  {product.detailImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={normalizeImageUrl(img)}
                      alt={`${product.productName} 상세 ${idx + 1}`}
                      className="w-full rounded-lg"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 마이상품 저장 모달 */}
      <Dialog open={showSaveMyProductModal} onOpenChange={setShowSaveMyProductModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              마이상품으로 저장
            </DialogTitle>
            <DialogDescription>
              현재 선택한 옵션을 마이상품으로 저장하면 다음 주문 시 빠르게 불러올 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="myProductName">마이상품 이름</Label>
              <Input
                id="myProductName"
                value={myProductName}
                onChange={(e) => setMyProductName(e.target.value)}
                placeholder="예: 우리학교 졸업앨범"
              />
            </div>

            {/* 선택된 옵션 요약 */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              <p className="font-medium text-gray-700 mb-2">선택된 옵션</p>
              {selectedOptions.specification && (
                <p className="text-gray-600">규격: {selectedOptions.specification.name}</p>
              )}
              {selectedOptions.binding && (
                <p className="text-gray-600">제본: {selectedOptions.binding.name}</p>
              )}
              {selectedOptions.paper && (
                <p className="text-gray-600">용지: {selectedOptions.paper.name}</p>
              )}
              {selectedOptions.printSide && (
                <p className="text-gray-600">출력: {selectedOptions.printSide === 'single' ? '단면' : '양면'}</p>
              )}
              {/* 동판 정보 - 항상 표시 */}
              <p className="text-gray-600">
                동판: {selectedOptions.copperPlateType === 'none'
                  ? '없음'
                  : selectedOptions.copperPlateType === 'public'
                    ? `공용동판 - ${selectedOptions.publicCopperPlate?.publicCopperPlate?.plateName || ''}`
                    : `보유동판 - ${selectedOptions.ownedCopperPlate?.plateName || ''}`}
              </p>
              {selectedOptions.copperPlateType !== 'none' && (
                <>
                  {selectedOptions.foilColor && (
                    <p className="text-gray-600">
                      박 컬러: {copperPlateLabels?.foilColors?.find(c => c.code === selectedOptions.foilColor)?.name || selectedOptions.foilColor}
                    </p>
                  )}
                  {selectedOptions.foilPosition && (
                    <p className="text-gray-600">
                      박 위치: {copperPlateLabels?.platePositions?.find(p => p.code === selectedOptions.foilPosition)?.name || selectedOptions.foilPosition}
                    </p>
                  )}
                </>
              )}
              {selectedOptions.finishings.length > 0 && (
                <p className="text-gray-600">후가공: {selectedOptions.finishings.map(f => f.name).join(', ')}</p>
              )}
              <p className="text-gray-600">수량: {quantity}개</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveMyProductModal(false)}>
              취소
            </Button>
            <Button onClick={handleSaveMyProduct} disabled={createMyProduct.isPending}>
              {createMyProduct.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장하기
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
              마이상품 불러오기
            </DialogTitle>
            <DialogDescription>
              저장된 마이상품을 선택하면 해당 옵션이 자동으로 적용됩니다.
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
                        <p>규격: {myProduct.options.specificationName}</p>
                      )}
                      {myProduct.options.bindingName && (
                        <p>제본: {myProduct.options.bindingName}</p>
                      )}
                      {myProduct.options.paperName && (
                        <p>용지: {myProduct.options.paperName}</p>
                      )}
                      {myProduct.options.copperPlateName && (
                        <p>동판: {myProduct.options.copperPlateName}</p>
                      )}
                      {myProduct.options.foilColorName && (
                        <p>박 컬러: {myProduct.options.foilColorName}</p>
                      )}
                      {myProduct.options.foilPositionName && (
                        <p>박 위치: {myProduct.options.foilPositionName}</p>
                      )}
                      <p>수량: {myProduct.defaultQuantity}개</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {myProduct.usageCount > 0 && <p>{myProduct.usageCount}회 사용</p>}
                  </div>
                </div>
              </button>
            ))}

            {myProducts?.filter(mp => mp.productId === product.id).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FolderHeart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>이 상품에 저장된 마이상품이 없습니다.</p>
                <p className="text-sm">옵션을 선택한 후 마이상품으로 저장해보세요.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadMyProductModal(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 화보앨범 주문 위자드 모달 (기존) */}
      <Dialog open={showAlbumWizard} onOpenChange={setShowAlbumWizard}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <AlbumOrderWizard
            productId={product.id}
            productName={product.productName}
            bindingId={selectedOptions.binding?.id}
            bindingName={selectedOptions.binding?.name}
            onComplete={handleAlbumWizardComplete}
            onCancel={() => {
              setShowAlbumWizard(false);
              albumOrderStore.reset();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 새 화보 주문 위자드 (6단계) */}
      <PhotobookOrderWizard
        open={showPhotobookWizard}
        onClose={() => setShowPhotobookWizard(false)}
        productId={product.id}
        productName={product.productName}
      />
    </div>
  );
}

function OptionSection({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-medium mb-2 flex items-center gap-2">
        {title}
        {count !== undefined && count > 0 && (
          <span className="text-xs text-gray-500 font-normal">({count}개)</span>
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
