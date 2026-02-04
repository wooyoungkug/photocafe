'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ProductEditor } from '@/components/ui/product-editor';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/hooks/use-categories';
import { useSpecifications } from '@/hooks/use-specifications';
import { useHalfProducts } from '@/hooks/use-half-products';
import { useProduct, useUpdateProduct } from '@/hooks/use-products';
import { useProductionGroupTree, useProductionSettings, type ProductionGroup, type ProductionSetting, type OutputPriceSelection, type IndigoUpPrice, type InkjetSpecPrice } from '@/hooks/use-production';
import { usePapers } from '@/hooks/use-paper';
import { useFoilColors, type FoilColorItem } from '@/hooks/use-copper-plates';
import { usePublicCopperPlates, useProductPublicCopperPlates, useLinkPublicCopperPlateToProduct, useUnlinkPublicCopperPlateFromProduct, type PublicCopperPlate } from '@/hooks/use-public-copper-plates';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { API_URL, API_BASE_URL } from '@/lib/api';

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

import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Settings,
  Package,
  Loader2,
  X,
  Check,
  Sparkles,
  Tag,
  Layers,
  Palette,
  FileText,
  Grid3X3,
  Users,
  Star,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Folder,
} from 'lucide-react';

// 제본방향 옵션
const BINDING_DIRECTION_OPTIONS = [
  { value: 'left', label: '왼쪽시작' },
  { value: 'right', label: '오른쪽시작' },
  { value: 'customer', label: '고객선택' },
];

// 출력구분 옵션
const PRINT_TYPE_OPTIONS = [
  { value: 'single', label: '단면출력' },
  { value: 'double', label: '양면출력' },
  { value: 'customer', label: '고객선택' },
];

// 후가공 옵션 목록
const FINISHING_OPTIONS = [
  { id: 'coating', label: '코팅선택', icon: '✨' },
  { id: 'foilColor', label: '박Color선택', icon: '🎨' },
  { id: 'coverSpine', label: '커버스프지선택', icon: '📚' },
  { id: 'hardcover', label: '양장선택', icon: '📖' },
  { id: 'coverPageFinish', label: '커버페이지처리금', icon: '💰' },
  { id: 'outerTab', label: '겉타바선택', icon: '📑' },
  { id: 'divider', label: '간지삽입선택', icon: '📄' },
  { id: 'frameMount', label: '액자지선택', icon: '🖼️' },
  { id: 'coverOi', label: '커버OI삽입', icon: '🏷️' },
];

interface ProductOption {
  id: string;
  name: string;
  type: 'select' | 'required';
  quantityType: 'auto' | 'manual';
  values: { name: string; price: number }[];
}

// 섹션 헤더 컴포넌트
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  gradient = 'text-slate-800', // gradient prop retained for backward compatibility but treated as text color/theme hint
  actions
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  gradient?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-6 pb-2">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-slate-100 rounded-xl">
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-900 leading-tight">{title}</h3>
          {subtitle && <p className="text-slate-500 text-sm mt-0.5 font-medium">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

// 폼 행 컴포넌트
function FormRow({ label, required, children, className = '' }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-12 gap-4 items-center py-3 ${className}`}>
      <Label className="col-span-2 text-right text-sm font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="col-span-10">{children}</div>
    </div>
  );
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { toast } = useToast();
  const { data: categories } = useCategories();
  const { data: specifications } = useSpecifications();
  const { data: halfProductsData } = useHalfProducts({ limit: 100 });
  const { data: product, isLoading: isProductLoading } = useProduct(productId);
  const { data: productionGroupTree } = useProductionGroupTree();
  const updateProduct = useUpdateProduct();
  const { data: productPublicPlates } = useProductPublicCopperPlates(productId);

  // 카테고리 분류
  const [largeCategoryId, setLargeCategoryId] = useState('');
  const [mediumCategoryId, setMediumCategoryId] = useState('');
  const [smallCategoryId, setSmallCategoryId] = useState('');

  // 기본정보
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [unitName, setUnitName] = useState('부');
  const [isActive, setIsActive] = useState(true);
  const [isNew, setIsNew] = useState(false);
  const [isBest, setIsBest] = useState(false);
  const [memberType, setMemberType] = useState<'all' | 'member_only' | 'specific_groups'>('all');
  const [sortOrder, setSortOrder] = useState(0);

  // 가격정보
  const [basePrice, setBasePrice] = useState(0);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [selectedHalfProductId, setSelectedHalfProductId] = useState('');
  const [selectedBindings, setSelectedBindings] = useState<{ id: string; name: string; price: number; productionSettingId?: string; pricingType?: string }[]>([]);
  const [bindingDirection, setBindingDirection] = useState('left');
  const [selectedPapers, setSelectedPapers] = useState<{ id: string; name: string; type: string; price: number; grammage?: number; printMethod?: string }[]>([]);
  // 출력단가 선택 (새로운 방식)
  const [outputPriceSelections, setOutputPriceSelections] = useState<OutputPriceSelection[]>([]);
  const [outputPriceDialogOpen, setOutputPriceDialogOpen] = useState(false);
  const [printType, setPrintType] = useState('double');
  const [selectedCovers, setSelectedCovers] = useState<{ id: string; name: string; price: number }[]>([]);
  const [selectedFoils, setSelectedFoils] = useState<{ id: string; name: string; color: string; price: number }[]>([]);
  const [selectedPublicPlates, setSelectedPublicPlates] = useState<{
    id: string;
    plateId: string;
    plateName: string;
    foilColor: string;
    foilColorName: string;
    engravingText: string;
  }[]>([]);

  // 후가공정보
  const [finishingOptions, setFinishingOptions] = useState<Record<string, boolean>>({});

  // 옵션정보
  const [customOptions, setCustomOptions] = useState<ProductOption[]>([]);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);

  // 이미지
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [detailImages, setDetailImages] = useState<string[]>(['', '', '', '']);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // 상세정보
  const [description, setDescription] = useState('');

  // 선택 다이얼로그
  const [specDialogOpen, setSpecDialogOpen] = useState(false);
  const [halfProductDialogOpen, setHalfProductDialogOpen] = useState(false);
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [paperDialogOpen, setPaperDialogOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [foilDialogOpen, setFoilDialogOpen] = useState(false);
  const [publicPlateDialogOpen, setPublicPlateDialogOpen] = useState(false);

  // 규격 타입 선택
  const [specType, setSpecType] = useState<'indigo' | 'inkjet' | 'album' | 'frame' | 'booklet'>('album');

  // 규격 타입별 필터링
  const getFilteredSpecs = (type: typeof specType) => {
    if (!specifications) return [];
    let filtered: typeof specifications = [];
    switch (type) {
      case 'indigo': filtered = specifications.filter(s => s.forIndigo); break;
      case 'inkjet': filtered = specifications.filter(s => s.forInkjet); break;
      case 'album': filtered = specifications.filter(s => s.forAlbum); break;
      case 'frame': filtered = specifications.filter(s => s.forFrame); break;
      case 'booklet': filtered = specifications.filter(s => s.forBooklet); break;
      default: filtered = specifications;
    }
    return filtered.sort((a, b) => (a.widthMm * a.heightMm) - (b.widthMm * b.heightMm));
  };

  // 카테고리 필터링
  const largeCategories = categories?.filter(c => c.level === 'large') || [];
  const mediumCategories = categories?.filter(c => c.level === 'medium' && c.parentId === largeCategoryId) || [];
  const smallCategories = categories?.filter(c => c.level === 'small' && c.parentId === mediumCategoryId) || [];

  // 초기 데이터 로드 여부 추적
  const isInitialLoadDone = useRef(false);

  // 기존 상품 데이터 로드 (초기 1회만 실행)
  useEffect(() => {
    if (product && categories && !isInitialLoadDone.current) {
      isInitialLoadDone.current = true;

      setProductCode(product.productCode);
      setProductName(product.productName);
      setIsActive(product.isActive);
      setIsNew(product.isNew);
      setIsBest(product.isBest);
      setMemberType(product.memberType);
      setSortOrder(product.sortOrder);
      setBasePrice(Number(product.basePrice));
      setThumbnailUrl(product.thumbnailUrl || '');
      setDescription(product.description || '');

      const category = categories.find(c => c.id === product.categoryId);
      if (category) {
        if (category.level === 'small') {
          setSmallCategoryId(category.id);
          const mediumCat = categories.find(c => c.id === category.parentId);
          if (mediumCat) {
            setMediumCategoryId(mediumCat.id);
            const largeCat = categories.find(c => c.id === mediumCat.parentId);
            if (largeCat) setLargeCategoryId(largeCat.id);
          }
        } else if (category.level === 'medium') {
          setMediumCategoryId(category.id);
          const largeCat = categories.find(c => c.id === category.parentId);
          if (largeCat) setLargeCategoryId(largeCat.id);
        } else if (category.level === 'large') {
          setLargeCategoryId(category.id);
        }
      }

      if (product.detailImages && Array.isArray(product.detailImages)) {
        const images = [...product.detailImages];
        while (images.length < 4) images.push('');
        setDetailImages(images.slice(0, 4));
      }

      if (product.bindings && Array.isArray(product.bindings)) {
        setSelectedBindings(product.bindings.map((b: { id: string; name: string; price: number; productionSettingId?: string; pricingType?: string }) => ({
          id: b.id,
          name: b.name,
          price: Number(b.price),
          productionSettingId: b.productionSettingId,
          pricingType: b.pricingType,
        })));
      }

      if (product.papers && Array.isArray(product.papers)) {
        setSelectedPapers(product.papers.map((p: { id: string; name: string; type: string; price: number; grammage?: number; printMethod?: string }) => ({
          id: p.id, name: p.name, type: p.type, price: Number(p.price), grammage: p.grammage, printMethod: p.printMethod,
        })));
      }

      if (product.covers && Array.isArray(product.covers)) {
        setSelectedCovers(product.covers.map((c: { id: string; name: string; price: number }) => ({
          id: c.id, name: c.name, price: Number(c.price),
        })));
      }

      if (product.foils && Array.isArray(product.foils)) {
        setSelectedFoils(product.foils.map((f: { id: string; name: string; color?: string; price: number }) => ({
          id: f.id, name: f.name, color: f.color || '', price: Number(f.price),
        })));
      }

      if (product.finishings && Array.isArray(product.finishings)) {
        const opts: Record<string, boolean> = {};
        product.finishings.forEach((f: { name: string }) => {
          const opt = FINISHING_OPTIONS.find(o => o.label === f.name);
          if (opt) opts[opt.id] = true;
        });
        setFinishingOptions(opts);
      }

      // 제본 방향 및 출력 타입 로드
      if ((product as any).bindingDirection) {
        setBindingDirection((product as any).bindingDirection);
      }
      if ((product as any).printType) {
        setPrintType((product as any).printType);
      }
    }
  }, [product, categories]);

  // 규격 매칭 (specifications가 로드된 후 실행)
  useEffect(() => {
    if (product?.specifications && Array.isArray(product.specifications) && specifications && specifications.length > 0) {
      const productSpecs = product.specifications as Array<{ name: string; widthMm: number; heightMm: number }>;
      const matchedSpecIds = productSpecs
        .map((productSpec) => {
          const matchedSpec = specifications.find(
            (s) => s.name === productSpec.name &&
                   Number(s.widthMm) === Number(productSpec.widthMm) &&
                   Number(s.heightMm) === Number(productSpec.heightMm)
          );
          return matchedSpec?.id;
        })
        .filter((id): id is string => !!id);
      setSelectedSpecs(matchedSpecIds);
    }
  }, [product?.specifications, specifications]);

  // 공용동판 로드
  useEffect(() => {
    if (productPublicPlates && Array.isArray(productPublicPlates)) {
      setSelectedPublicPlates(productPublicPlates.map((pp: { id: string; publicCopperPlateId: string; publicCopperPlate: { plateName: string; plateType: string }; engravingText?: string | null }) => ({
        id: pp.id,
        plateId: pp.publicCopperPlateId,
        plateName: pp.publicCopperPlate.plateName,
        foilColor: pp.publicCopperPlate.plateType || '',
        foilColorName: pp.publicCopperPlate.plateType || '기본',
        engravingText: pp.engravingText || '',
      })));
    }
  }, [productPublicPlates]);

  const handleImageUpload = async (file: File, index: number) => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (!token) {
      toast({ variant: 'destructive', title: '로그인이 필요합니다.' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/upload/category-icon`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('업로드 실패');

      const result = await response.json();
      const imageUrl = result.url;

      if (index === -1) {
        setThumbnailUrl(imageUrl);
      } else {
        const newImages = [...detailImages];
        newImages[index] = imageUrl;
        setDetailImages(newImages);
      }

      toast({ variant: 'success', title: '이미지 업로드 완료' });
    } catch {
      toast({ variant: 'destructive', title: '이미지 업로드 실패' });
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
  };

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: '이미지 파일만 업로드 가능합니다.' });
        return;
      }
      await handleImageUpload(file, index);
    }
  };

  const handleSubmit = async () => {
    const finalCategoryId = smallCategoryId || mediumCategoryId || largeCategoryId;

    if (!finalCategoryId) {
      toast({ variant: 'destructive', title: '카테고리를 선택해주세요.' });
      return;
    }

    if (!productName) {
      toast({ variant: 'destructive', title: '상품명을 입력해주세요.' });
      return;
    }

    try {
      const productData = {
        productCode,
        productName,
        categoryId: finalCategoryId,
        basePrice,
        isActive,
        isNew,
        isBest,
        memberType: memberType as 'all' | 'member_only' | 'specific_groups',
        sortOrder,
        thumbnailUrl: thumbnailUrl || undefined,
        detailImages: detailImages.filter(url => url),
        description: description || undefined,
        bindingDirection,
        printType,
        specifications: selectedSpecs.map((specId, idx) => {
          const spec = specifications?.find(s => s.id === specId);
          return {
            name: spec?.name || '',
            widthMm: Number(spec?.widthMm) || 0,
            heightMm: Number(spec?.heightMm) || 0,
            price: 0,
            isDefault: idx === 0,
            sortOrder: idx,
          };
        }),
        bindings: selectedBindings.map((b, idx) => ({
          name: b.name,
          price: b.price,
          isDefault: idx === 0,
          sortOrder: idx,
          productionSettingId: b.productionSettingId,
          pricingType: b.pricingType,
        })),
        papers: selectedPapers.map((p, idx) => ({
          name: p.name, type: p.type, printMethod: p.printMethod, grammage: p.grammage, price: p.price, isDefault: idx === 0, sortOrder: idx,
        })),
        covers: selectedCovers.map((c, idx) => ({
          name: c.name, price: c.price, isDefault: idx === 0, sortOrder: idx,
        })),
        foils: selectedFoils.map((f, idx) => ({
          name: f.name, color: f.color, price: f.price, isDefault: idx === 0, sortOrder: idx,
        })),
        finishings: Object.entries(finishingOptions)
          .filter(([, enabled]) => enabled)
          .map(([key], idx) => {
            const opt = FINISHING_OPTIONS.find(o => o.id === key);
            return { name: opt?.label || key, price: 0, isDefault: false, sortOrder: idx };
          }),
      };

      console.log('=== 상품 수정 데이터 ===');
      console.log('Specifications:', productData.specifications);
      console.log('Bindings:', productData.bindings);
      console.log('Papers:', productData.papers);

      await updateProduct.mutateAsync({ id: productId, data: productData });

      // 공용동판 동기화
      const existingPlateIds = (productPublicPlates || []).map((pp: { publicCopperPlateId: string }) => pp.publicCopperPlateId);
      const newPlateIds = selectedPublicPlates.map(p => p.plateId);

      // 삭제된 동판 연결 해제
      const platesToUnlink = existingPlateIds.filter((id: string) => !newPlateIds.includes(id));
      for (const plateId of platesToUnlink) {
        try {
          await api.delete(`/public-copper-plates/product/${productId}/unlink/${plateId}`);
        } catch (e) {
          console.error('공용동판 연결 해제 실패:', e);
        }
      }

      // 새로 추가된 동판 연결
      for (const plate of selectedPublicPlates) {
        try {
          await api.post(`/public-copper-plates/product/${productId}/link/${plate.plateId}`, {
            engravingText: plate.engravingText || '',
          });
        } catch (e) {
          console.error('공용동판 연결 실패:', e);
        }
      }

      toast({ variant: 'success', title: '상품이 수정되었습니다.' });
      router.push('/products');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '상품 수정 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
      });
    }
  };

  if (isProductLoading) {
    return (
      <div className="space-y-6 pb-10">
        <PageHeader
          title="앨범상품 수정"
          description="상품 정보를 불러오는 중..."
          breadcrumbs={[
            { label: '홈', href: '/' },
            { label: '상품관리', href: '/products' },
            { label: '상품수정' },
          ]}
        />
        <Card>
          <CardContent className="p-8 space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="앨범상품 수정"
        description="상품 정보를 수정합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '상품관리', href: '/products' },
          { label: '상품수정' },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        }
      />

      {/* 기본정보 섹션 */}
      <Card className="overflow-hidden border shadow-sm">
        <SectionHeader
          icon={Package}
          title="기본정보"
          subtitle="상품의 기본 정보를 입력합니다"
          gradient="text-blue-600"
        />
        <CardContent className="p-6 space-y-1">
          {/* 카테고리 선택 */}
          <FormRow label="판매카테고리" required>
            <div className="flex gap-3">
              <Select value={largeCategoryId} onValueChange={(v) => { setLargeCategoryId(v); setMediumCategoryId(''); setSmallCategoryId(''); }}>
                <SelectTrigger className="w-48 bg-blue-50 border-blue-200 hover:border-blue-400 transition-colors">
                  <SelectValue placeholder="대분류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {largeCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={mediumCategoryId} onValueChange={(v) => { setMediumCategoryId(v); setSmallCategoryId(''); }} disabled={!largeCategoryId}>
                <SelectTrigger className="w-48 bg-emerald-50 border-emerald-200 hover:border-emerald-400 transition-colors">
                  <SelectValue placeholder="중분류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {mediumCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={smallCategoryId} onValueChange={setSmallCategoryId} disabled={!mediumCategoryId}>
                <SelectTrigger className="w-48 bg-amber-50 border-amber-200 hover:border-amber-400 transition-colors">
                  <SelectValue placeholder="소분류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {smallCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormRow>

          <Separator className="my-2" />

          {/* 상품명 */}
          <FormRow label="상품명" required>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="상품명을 입력하세요"
              className="max-w-2xl text-base"
            />
          </FormRow>

          <Separator className="my-2" />

          {/* 상태 토글 */}
          <FormRow label="상품상태">
            <div className="flex gap-8">
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg">
                <div className={`p-1.5 rounded-full ${isActive ? 'bg-green-100' : 'bg-slate-200'}`}>
                  {isActive ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                </div>
                <span className="text-sm font-medium">활성화</span>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg">
                <div className={`p-1.5 rounded-full ${isNew ? 'bg-blue-100' : 'bg-slate-200'}`}>
                  <Sparkles className={`h-4 w-4 ${isNew ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <span className="text-sm font-medium">신상품</span>
                <Switch checked={isNew} onCheckedChange={setIsNew} />
              </div>
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg">
                <div className={`p-1.5 rounded-full ${isBest ? 'bg-yellow-100' : 'bg-slate-200'}`}>
                  <Star className={`h-4 w-4 ${isBest ? 'text-yellow-600' : 'text-slate-400'}`} />
                </div>
                <span className="text-sm font-medium">베스트</span>
                <Switch checked={isBest} onCheckedChange={setIsBest} />
              </div>
            </div>
          </FormRow>

          {/* 회원적용 / 정렬순서 */}
          <FormRow label="회원적용">
            <div className="flex gap-6 items-center">
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                회원선택
              </Button>
              <div className="flex items-center gap-3">
                <Label className="text-sm text-slate-600 whitespace-nowrap">정렬순서</Label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-24 text-center"
                />
              </div>
            </div>
          </FormRow>
        </CardContent>
      </Card>

      {/* 가격정보 섹션 */}
      <Card className="overflow-hidden border shadow-sm">
        <SectionHeader
          icon={Tag}
          title="가격정보 상세"
          subtitle="규격, 제본, 용지 등 가격 옵션을 설정합니다"
          gradient="text-emerald-600"
        />
        <CardContent className="p-6 space-y-4">
          {/* 규격 선택 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-emerald-600" />
                앨범 규격
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setSpecDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                규격선택
              </Button>
            </div>

            {/* 규격 타입 탭 */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
              {[
                { key: 'indigo', label: '인디고' },
                { key: 'inkjet', label: '잉크젯' },
                { key: 'album', label: '앨범' },
                { key: 'frame', label: '액자' },
                { key: 'booklet', label: '책자' },
              ].map(tab => (
                <Button
                  key={tab.key}
                  type="button"
                  variant={specType === tab.key ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-8 px-3 text-xs ${specType === tab.key ? 'shadow-sm' : ''}`}
                  onClick={() => setSpecType(tab.key as typeof specType)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* 선택된 규격 */}
            {selectedSpecs.length > 0 && (
              <div className="grid grid-cols-6 gap-2 p-3 bg-slate-50 rounded-lg border">
                {selectedSpecs.map(specId => {
                  const spec = specifications?.find(s => s.id === specId);
                  return spec ? (
                    <div key={specId} className="flex items-center justify-between py-1.5 px-2 bg-white border rounded text-sm">
                      <span className="font-medium text-slate-900 truncate">{spec.name}</span>
                      <button
                        type="button"
                        className="ml-1 hover:bg-red-100 rounded-full p-0.5 flex-shrink-0"
                        onClick={() => setSelectedSpecs(prev => prev.filter(id => id !== specId))}
                      >
                        <X className="h-3 w-3 text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* 제본/용지 선택 - 2열 그리드 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 제본 선택 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  제본 선택
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setBindingDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  제본선택
                </Button>
              </div>
              {selectedBindings.length > 0 && (
                <div className="space-y-2">
                  {selectedBindings.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white border rounded-lg">
                      <span className="font-medium text-sm flex-1">{b.name}</span>
                      <button
                        type="button"
                        title="제거"
                        className="ml-1 hover:bg-red-100 rounded-full p-1"
                        onClick={() => setSelectedBindings(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-4 pt-2">
                <Label className="text-xs text-slate-500">제본방향</Label>
                <div className="flex gap-3">
                  {BINDING_DIRECTION_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="bindingDirection"
                        value={opt.value}
                        checked={bindingDirection === opt.value}
                        onChange={(e) => setBindingDirection(e.target.value)}
                        className="w-3.5 h-3.5 text-emerald-600"
                      />
                      <span className="text-xs">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 출력단가 선택 (새로운 방식) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  출력단가 설정
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setOutputPriceDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  출력단가 선택
                </Button>
              </div>
              {outputPriceSelections.length > 0 && (
                <div className="space-y-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  {outputPriceSelections.map((selection, idx) => (
                    <div key={selection.id} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{selection.outputMethod === 'INDIGO' ? '🖨️' : '💧'}</span>
                        <div>
                          <p className="font-medium text-sm">{selection.productionSettingName}</p>
                          <p className="text-xs text-slate-500">
                            {selection.outputMethod === 'INDIGO'
                              ? `인디고 ${selection.colorType}`
                              : `잉크젯 - ${selection.specificationId || '규격 미선택'}`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        title="제거"
                        className="p-1 hover:bg-red-100 rounded-full"
                        onClick={() => setOutputPriceSelections(prev => prev.filter(p => p.id !== selection.id))}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-4 pt-2">
                <Label className="text-xs text-slate-500">출력구분</Label>
                <div className="flex gap-3">
                  {PRINT_TYPE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="printType"
                        value={opt.value}
                        checked={printType === opt.value}
                        onChange={(e) => setPrintType(e.target.value)}
                        className="w-3.5 h-3.5 text-emerald-600"
                      />
                      <span className="text-xs">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 커버 선택 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-emerald-600" />
                  커버 선택
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setCoverDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  커버선택
                </Button>
              </div>
              {selectedCovers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCovers.map((c, idx) => (
                    <Badge key={idx} variant="outline" className="bg-white">{c.name}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 공용동판 선택 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  공용동판 (박 각인)
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setPublicPlateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  공용동판선택
                </Button>
              </div>
              {selectedPublicPlates.length > 0 && (
                <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  {selectedPublicPlates.map((plate, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2 bg-white rounded border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{plate.plateName}</span>
                          <Badge variant="outline" className="text-xs">{plate.foilColorName}</Badge>
                        </div>
                        {plate.engravingText && (
                          <p className="text-xs text-slate-500">각인문구: {plate.engravingText}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        title="제거"
                        className="hover:bg-red-100 rounded-full p-1"
                        onClick={() => setSelectedPublicPlates(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* 후가공 옵션 */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Settings className="h-4 w-4 text-emerald-600" />
              후가공 옵션
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {FINISHING_OPTIONS.map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${finishingOptions[opt.id]
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                  <Checkbox
                    id={opt.id}
                    checked={finishingOptions[opt.id] || false}
                    onCheckedChange={(checked) => setFinishingOptions(prev => ({ ...prev, [opt.id]: !!checked }))}
                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 옵션정보 섹션 */}
      <Card className="overflow-hidden border shadow-sm">
        <SectionHeader
          icon={Settings}
          title="옵션정보"
          subtitle="주문 시 선택 가능한 추가 옵션을 설정합니다"
          gradient="text-violet-600"
          actions={
            <Button type="button" size="sm" variant="secondary" onClick={() => setOptionDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              옵션 추가
            </Button>
          }
        />
        <CardContent className="p-6">
          {customOptions.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>옵션명</TableHead>
                    <TableHead>타입</TableHead>
                    <TableHead>수량</TableHead>
                    <TableHead>옵션값</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customOptions.map((opt) => (
                    <TableRow key={opt.id}>
                      <TableCell className="font-medium">{opt.name}</TableCell>
                      <TableCell>
                        <Badge variant={opt.type === 'required' ? 'default' : 'secondary'}>
                          {opt.type === 'select' ? '선택옵션' : '필수옵션'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {opt.quantityType === 'auto' ? '자동수량' : '선택수량'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {opt.values.map(v => `${v.name}(${v.price.toLocaleString()}원)`).join(', ')}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCustomOptions(prev => prev.filter(o => o.id !== opt.id))}
                          className="h-8 w-8 p-0 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>등록된 옵션이 없습니다</p>
              <p className="text-sm mt-1">상단의 &apos;옵션 추가&apos; 버튼을 클릭하여 옵션을 추가하세요</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세이미지 섹션 */}
      <Card className="overflow-hidden border shadow-sm">
        <SectionHeader
          icon={ImageIcon}
          title="상품 이미지"
          subtitle="썸네일 및 상세 이미지를 등록합니다"
          gradient="text-orange-600"
        />
        <CardContent className="p-6">
          <div className="grid grid-cols-5 gap-4">
            {/* 썸네일 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">썸네일</Label>
              <div
                className={`relative aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${dragOver === -1 ? 'bg-slate-50 border-slate-400' : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                onDragOver={(e) => handleDragOver(e, -1)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, -1)}
              >
                {thumbnailUrl ? (
                  <>
                    <img src={normalizeImageUrl(thumbnailUrl)} alt="썸네일" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full"
                      onClick={() => setThumbnailUrl('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 text-slate-400 p-4">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <Upload className="h-6 w-6 text-orange-500" />
                    </div>
                    <span className="text-xs text-center">클릭 또는<br />드래그</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], -1)}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* 상세이미지 1~4 */}
            {detailImages.map((img, idx) => (
              <div key={idx} className="space-y-2">
                <Label className="text-sm font-medium text-slate-600">상세 {idx + 1}</Label>
                <div
                  className={`relative aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${dragOver === idx ? 'bg-slate-50 border-slate-400' : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                >
                  {img ? (
                    <>
                      <img src={normalizeImageUrl(img)} alt={`상세${idx + 1}`} className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full"
                        onClick={() => {
                          const newImages = [...detailImages];
                          newImages[idx] = '';
                          setDetailImages(newImages);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2 text-slate-400 p-4">
                      <div className="p-3 bg-slate-100 rounded-full">
                        <Upload className="h-6 w-6 text-slate-400" />
                      </div>
                      <span className="text-xs text-center">클릭 또는<br />드래그</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], idx)}
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 상세설명 섹션 */}
      <Card className="overflow-hidden border shadow-sm">
        <SectionHeader
          icon={FileText}
          title="상세정보 편집"
          subtitle="상품 상세 설명을 작성합니다"
          gradient="text-slate-600"
        />
        <CardContent className="p-6">
          <ProductEditor
            value={description}
            onChange={setDescription}
            placeholder="상품 상세 설명을 입력하세요."
            onImageUpload={async (file: File) => {
              const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
              if (!token) throw new Error('로그인이 필요합니다.');

              const formData = new FormData();
              formData.append('file', file);

              const response = await fetch(`${API_URL}/upload/category-icon`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
              });

              if (!response.ok) throw new Error('업로드 실패');

              const result = await response.json();
              return normalizeImageUrl(result.url);
            }}
          />
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-center gap-4 pt-4">
        <Button
          onClick={handleSubmit}
          disabled={updateProduct.isPending}
          size="lg"
          className="px-12 bg-slate-900 hover:bg-slate-800 shadow-md"
        >
          {updateProduct.isPending ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Check className="h-5 w-5 mr-2" />
          )}
          상품 수정
        </Button>
        <Button variant="outline" size="lg" onClick={() => router.back()}>
          취소
        </Button>
      </div>

      {/* 규격 선택 다이얼로그 */}
      <Dialog open={specDialogOpen} onOpenChange={setSpecDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-emerald-600" />
              규격 선택
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            {[
              { key: 'indigo', label: '인디고' },
              { key: 'inkjet', label: '잉크젯' },
              { key: 'album', label: '앨범' },
              { key: 'frame', label: '액자' },
              { key: 'booklet', label: '책자' },
            ].map(tab => (
              <Button
                key={tab.key}
                type="button"
                variant={specType === tab.key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSpecType(tab.key as typeof specType)}
              >
                {tab.label}
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {getFilteredSpecs(tab.key as typeof specType).length}
                </Badge>
              </Button>
            ))}
          </div>
          <div className="max-h-[400px] overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={getFilteredSpecs(specType).length > 0 && getFilteredSpecs(specType).every(s => selectedSpecs.includes(s.id))}
                      onCheckedChange={(checked) => {
                        const filteredIds = getFilteredSpecs(specType).map(s => s.id);
                        if (checked) {
                          setSelectedSpecs(prev => [...new Set([...prev, ...filteredIds])]);
                        } else {
                          setSelectedSpecs(prev => prev.filter(id => !filteredIds.includes(id)));
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>규격명</TableHead>
                  <TableHead>크기(inch)</TableHead>
                  <TableHead>크기(mm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredSpecs(specType).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      해당 타입의 규격이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  getFilteredSpecs(specType).map(spec => (
                    <TableRow key={spec.id} className={selectedSpecs.includes(spec.id) ? 'bg-emerald-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSpecs.includes(spec.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSpecs(prev => [...prev, spec.id]);
                            } else {
                              setSelectedSpecs(prev => prev.filter(id => id !== spec.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{spec.name}</TableCell>
                      <TableCell>{spec.widthInch} × {spec.heightInch}</TableCell>
                      <TableCell>{spec.widthMm} × {spec.heightMm}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {selectedSpecs.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium mb-2">선택된 규격 ({selectedSpecs.length}개)</p>
              <div className="flex flex-wrap gap-2">
                {selectedSpecs.map(specId => {
                  const spec = specifications?.find(s => s.id === specId);
                  return spec ? (
                    <Badge key={specId} variant="secondary" className="flex items-center gap-1">
                      {spec.name}
                      <button
                        type="button"
                        className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                        onClick={() => setSelectedSpecs(prev => prev.filter(id => id !== specId))}
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSpecs([])}>전체 해제</Button>
            <Button onClick={() => setSpecDialogOpen(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 반제품 선택 다이얼로그 */}
      <Dialog open={halfProductDialogOpen} onOpenChange={setHalfProductDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>반제품 선택</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">선택</TableHead>
                  <TableHead>코드</TableHead>
                  <TableHead>반제품명</TableHead>
                  <TableHead>기본가</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {halfProductsData?.data?.map(hp => (
                  <TableRow key={hp.id} className={selectedHalfProductId === hp.id ? 'bg-emerald-50' : ''}>
                    <TableCell>
                      <input
                        type="radio"
                        name="halfProduct"
                        checked={selectedHalfProductId === hp.id}
                        onChange={() => setSelectedHalfProductId(hp.id)}
                        className="w-4 h-4"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{hp.code}</TableCell>
                    <TableCell>{hp.name}</TableCell>
                    <TableCell>{Number(hp.basePrice).toLocaleString()}원</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setHalfProductDialogOpen(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 옵션 추가 다이얼로그 */}
      <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>옵션 추가</DialogTitle>
          </DialogHeader>
          <OptionForm
            onSubmit={(opt) => {
              setCustomOptions(prev => [...prev, { ...opt, id: Date.now().toString() }]);
              setOptionDialogOpen(false);
            }}
            onCancel={() => setOptionDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 제본 선택 다이얼로그 */}
      <Dialog open={bindingDialogOpen} onOpenChange={setBindingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" />
              제본 선택 (단가 구조에서 선택)
            </DialogTitle>
          </DialogHeader>
          <BindingSelectionForm
            productionGroupTree={productionGroupTree || []}
            selectedBindings={selectedBindings}
            onSelect={(bindings) => {
              setSelectedBindings(bindings);
              setBindingDialogOpen(false);
            }}
            onCancel={() => setBindingDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 출력단가 선택 다이얼로그 */}
      <Dialog open={outputPriceDialogOpen} onOpenChange={setOutputPriceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              출력단가 선택 (표준단가설정에서 선택)
            </DialogTitle>
          </DialogHeader>
          <OutputPriceSelectionForm
            selectedOutputPrices={outputPriceSelections}
            productionGroupTree={productionGroupTree || []}
            onSelect={(prices) => {
              setOutputPriceSelections(prices);
              setOutputPriceDialogOpen(false);
            }}
            onCancel={() => setOutputPriceDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 박 선택 다이얼로그 (기존 - 유지) */}
      <Dialog open={foilDialogOpen} onOpenChange={setFoilDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              박 선택 (거래처정보에서 선택)
            </DialogTitle>
          </DialogHeader>
          <FoilSelectionForm
            selectedFoils={selectedFoils}
            onSelect={(foils) => {
              setSelectedFoils(foils);
              setFoilDialogOpen(false);
            }}
            onCancel={() => setFoilDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 공용동판 선택 다이얼로그 */}
      <Dialog open={publicPlateDialogOpen} onOpenChange={setPublicPlateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              공용동판 선택 (박 각인용)
            </DialogTitle>
          </DialogHeader>
          <PublicCopperPlateSelectionForm
            selectedPlates={selectedPublicPlates}
            onSelect={(plates) => {
              setSelectedPublicPlates(plates);
              setPublicPlateDialogOpen(false);
            }}
            onCancel={() => setPublicPlateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 용지 선택 폼 컴포넌트
function PaperSelectionForm({
  selectedPapers,
  onSelect,
  onCancel,
}: {
  selectedPapers: { id: string; name: string; type: string; price: number; grammage?: number; printMethod?: string }[];
  onSelect: (papers: { id: string; name: string; type: string; price: number; grammage?: number; printMethod?: string }[]) => void;
  onCancel: () => void;
}) {
  const [localSelected, setLocalSelected] = useState<{ id: string; name: string; type: string; price: number; grammage?: number; printMethod?: string }[]>(selectedPapers);
  const [printMethodFilter, setPrintMethodFilter] = useState<string>('indigo');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: papersData, isLoading } = usePapers({
    limit: 100,
    isActive: true,
    printMethod: printMethodFilter === 'all' ? undefined : printMethodFilter,
    search: searchTerm || undefined,
  });

  const papers = papersData?.data || [];

  const togglePaper = (paper: any) => {
    setLocalSelected(prev => {
      const exists = prev.find(p => p.id === paper.id);
      if (exists) {
        return prev.filter(p => p.id !== paper.id);
      } else {
        // 현재 필터에서 선택된 인쇄방식 저장
        const selectedPrintMethod = printMethodFilter === 'all'
          ? (paper.printMethods?.[0] || 'indigo')
          : printMethodFilter;
        return [...prev, {
          id: paper.id,
          name: paper.name,
          type: paper.paperType || 'sheet',
          price: Number(paper.basePrice) || 0,
          grammage: paper.grammage,
          printMethod: selectedPrintMethod,
        }];
      }
    });
  };

  // 전체 선택/해제
  const isAllSelected = papers.length > 0 && papers.every((paper: any) => localSelected.some(p => p.id === paper.id));
  const isSomeSelected = papers.some((paper: any) => localSelected.some(p => p.id === paper.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // 현재 필터된 용지들만 선택 해제
      const paperIds = papers.map((p: any) => p.id);
      setLocalSelected(prev => prev.filter(p => !paperIds.includes(p.id)));
    } else {
      // 현재 필터된 용지들 모두 선택 (기존 선택 유지)
      const selectedPrintMethod = printMethodFilter === 'all' ? 'indigo' : printMethodFilter;
      const newPapers = papers
        .filter((paper: any) => !localSelected.some(p => p.id === paper.id))
        .map((paper: any) => ({
          id: paper.id,
          name: paper.name,
          type: paper.paperType || 'sheet',
          price: Number(paper.basePrice) || 0,
          grammage: paper.grammage,
          printMethod: printMethodFilter === 'all' ? (paper.printMethods?.[0] || 'indigo') : selectedPrintMethod,
        }));
      setLocalSelected(prev => [...prev, ...newPapers]);
    }
  };

  // 선택된 용지를 인쇄방식별로 그룹화
  const groupedSelected = {
    indigo: localSelected.filter(p => p.printMethod === 'indigo'),
    inkjet: localSelected.filter(p => p.printMethod === 'inkjet'),
    offset: localSelected.filter(p => p.printMethod === 'offset'),
    other: localSelected.filter(p => !p.printMethod || !['indigo', 'inkjet', 'offset'].includes(p.printMethod)),
  };

  const printMethodLabels: Record<string, string> = {
    indigo: '🖨️ 인디고',
    inkjet: '💧 잉크젯',
    offset: '📰 오프셋',
    other: '📋 기타',
  };

  const getFinishLabel = (finish: string) => {
    const finishMap: Record<string, string> = {
      glossy: '광택',
      matte: '무광',
      lustre: '반광',
      canvas: '캔버스',
      satin: '새틴',
      silk: '실크',
    };
    return finishMap[finish] || finish;
  };

  const getPrintMethodLabel = (methods: string[]) => {
    const methodMap: Record<string, string> = {
      indigo: '인디고',
      inkjet: '잉크젯',
      offset: '오프셋',
      both: '모두',
    };
    return methods?.map(m => methodMap[m] || m).join(', ') || '-';
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="text-sm text-slate-500 mb-3">
        인쇄방식을 먼저 선택한 후 용지를 선택합니다.
      </div>

      {/* 인쇄방식 선택 탭 */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-4">
        {[
          { key: 'indigo', label: '인디고', icon: '🖨️' },
          { key: 'inkjet', label: '잉크젯', icon: '💧' },
          { key: 'offset', label: '오프셋', icon: '📰' },
          { key: 'all', label: '전체', icon: '📋' },
        ].map(tab => (
          <Button
            key={tab.key}
            type="button"
            variant={printMethodFilter === tab.key ? 'default' : 'ghost'}
            size="sm"
            className={`flex-1 h-9 gap-1.5 ${printMethodFilter === tab.key ? 'shadow-sm' : ''}`}
            onClick={() => setPrintMethodFilter(tab.key)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </Button>
        ))}
      </div>

      {/* 검색 */}
      <div className="mb-4">
        <Input
          placeholder="용지명 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9"
        />
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : papers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>등록된 용지가 없습니다.</p>
            <p className="text-sm mt-1">용지관리 메뉴에서 용지를 먼저 등록해주세요.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) {
                        (el as any).indeterminate = !isAllSelected && isSomeSelected;
                      }
                    }}
                    onCheckedChange={toggleSelectAll}
                    className="data-[state=checked]:bg-emerald-600"
                    title="전체 선택"
                  />
                </TableHead>
                <TableHead>용지명</TableHead>
                <TableHead>타입</TableHead>
                <TableHead>규격</TableHead>
                <TableHead>평량</TableHead>
                <TableHead>질감</TableHead>
                <TableHead>출력방식</TableHead>
                <TableHead className="text-right">기본가</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {papers.map((paper: any) => {
                const isSelected = localSelected.some(p => p.id === paper.id);
                return (
                  <TableRow
                    key={paper.id}
                    className={`cursor-pointer ${isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                    onClick={() => togglePaper(paper)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePaper(paper)}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{paper.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {paper.paperType === 'roll' ? '롤지' : '시트지'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {paper.paperType === 'roll'
                        ? `${paper.rollWidth || '-'} × ${paper.rollLength || '-'}`
                        : paper.sheetSize || `${paper.sheetWidthMm || '-'} × ${paper.sheetHeightMm || '-'}mm`
                      }
                    </TableCell>
                    <TableCell className="text-sm">{paper.grammageDisplay || (paper.grammage ? `${paper.grammage}g/m²` : '-')}</TableCell>
                    <TableCell className="text-sm">{paper.finish ? getFinishLabel(paper.finish) : '-'}</TableCell>
                    <TableCell className="text-sm">{getPrintMethodLabel(paper.printMethods)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {Number(paper.basePrice).toLocaleString()}원
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 전체 선택 버튼 */}
      {papers.length > 0 && (
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="text-xs"
          >
            {isAllSelected ? `현재 목록 전체 해제 (${papers.length}개)` : `현재 목록 전체 선택 (${papers.length}개)`}
          </Button>
        </div>
      )}

      {localSelected.length > 0 && (
        <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
          <p className="text-sm font-medium mb-3">선택된 용지 ({localSelected.length}개)</p>
          <div className="space-y-3">
            {(['indigo', 'inkjet', 'offset', 'other'] as const).map(method => {
              const papers = groupedSelected[method];
              if (papers.length === 0) return null;
              return (
                <div key={method} className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">{printMethodLabels[method]} ({papers.length}개)</p>
                  <div className="flex flex-wrap gap-2">
                    {papers.map((paper) => (
                      <Badge key={paper.id} variant="secondary" className="flex items-center gap-1 bg-white">
                        {paper.name}{paper.grammage ? ` ${paper.grammage}g` : ''}
                        <button
                          type="button"
                          title="제거"
                          className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocalSelected(prev => prev.filter(p => p.id !== paper.id));
                          }}
                        >
                          <X className="h-3 w-3 text-red-500" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={() => setLocalSelected([])}>전체 해제</Button>
        <Button variant="outline" onClick={onCancel}>취소</Button>
        <Button onClick={() => onSelect(localSelected)} className="bg-emerald-600 hover:bg-emerald-700">
          선택 완료
        </Button>
      </DialogFooter>
    </div>
  );
}

// 출력단가 선택 폼 컴포넌트 (새로운 방식)
function OutputPriceSelectionForm({
  selectedOutputPrices,
  onSelect,
  onCancel,
  productionGroupTree,
}: {
  selectedOutputPrices: OutputPriceSelection[];
  onSelect: (prices: OutputPriceSelection[]) => void;
  onCancel: () => void;
  productionGroupTree?: ProductionGroup[];
}) {
  // 단계: 1=출력방식, 2=단가설정, 3=기종, 4=세부옵션
  const [step, setStep] = useState(1);
  const [outputMethod, setOutputMethod] = useState<'INDIGO' | 'INKJET' | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedSettingId, setSelectedSettingId] = useState<string>('');
  const [selectedSetting, setSelectedSetting] = useState<ProductionSetting | null>(null);
  const [colorType, setColorType] = useState<'4도' | '6도'>('4도');
  const [selectedSpecId, setSelectedSpecId] = useState<string>('');
  const [localSelected, setLocalSelected] = useState<OutputPriceSelection[]>(selectedOutputPrices);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // paper_output_spec 타입의 설정만 필터링
  const { data: productionSettings } = useProductionSettings({
    pricingType: 'paper_output_spec',
    isActive: true,
  });

  // 출력방식에 따라 필터링된 설정 목록
  const filteredSettings = productionSettings?.filter(setting => {
    if (!outputMethod) return false;
    if (outputMethod === 'INDIGO') {
      return setting.printMethod === 'indigo' || setting.indigoUpPrices?.length;
    } else {
      return setting.printMethod === 'inkjet' || setting.inkjetSpecPrices?.length;
    }
  }) || [];

  // 그룹 트리에서 설정 찾기
  const findSettingsInGroup = (group: ProductionGroup): ProductionSetting[] => {
    const settings: ProductionSetting[] = [];
    if (group.settings) {
      const filtered = group.settings.filter(s => {
        if (s.pricingType !== 'paper_output_spec') return false;
        if (outputMethod === 'INDIGO') {
          return s.printMethod === 'indigo' || (s.indigoUpPrices && s.indigoUpPrices.length > 0);
        } else if (outputMethod === 'INKJET') {
          return s.printMethod === 'inkjet' || (s.inkjetSpecPrices && s.inkjetSpecPrices.length > 0);
        }
        return false;
      });
      settings.push(...filtered);
    }
    if (group.children) {
      group.children.forEach(child => {
        settings.push(...findSettingsInGroup(child));
      });
    }
    return settings;
  };

  // 트리 토글
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // 설정 선택 시
  const handleSelectSetting = (setting: ProductionSetting) => {
    setSelectedSettingId(setting.id);
    setSelectedSetting(setting);
    setStep(4); // 세부 옵션 선택으로 이동
  };

  // 추가 버튼
  const handleAddSelection = () => {
    if (!outputMethod || !selectedSetting) return;

    const newSelection: OutputPriceSelection = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      outputMethod,
      productionSettingId: selectedSetting.id,
      productionSettingName: selectedSetting.settingName || selectedSetting.codeName || '단가설정',
    };

    if (outputMethod === 'INDIGO') {
      newSelection.colorType = colorType;
      newSelection.selectedUpPrices = selectedSetting.indigoUpPrices?.filter(p => {
        // 4도 또는 6도에 해당하는 가격만 선택
        return true; // 모든 Up 가격 포함
      });
    } else if (outputMethod === 'INKJET' && selectedSpecId) {
      const specPrice = selectedSetting.inkjetSpecPrices?.find(p => p.specificationId === selectedSpecId);
      if (specPrice) {
        newSelection.specificationId = selectedSpecId;
        newSelection.selectedSpecPrice = specPrice;
      }
    }

    setLocalSelected(prev => [...prev, newSelection]);

    // 초기화
    setStep(1);
    setOutputMethod(null);
    setSelectedSettingId('');
    setSelectedSetting(null);
    setColorType('4도');
    setSelectedSpecId('');
  };

  // 선택 제거
  const removeSelection = (id: string) => {
    setLocalSelected(prev => prev.filter(p => p.id !== id));
  };

  // 그룹 트리 렌더링
  const renderGroupTree = (groups: ProductionGroup[], depth = 0) => {
    return groups.map(group => {
      const hasSettings = findSettingsInGroup(group).length > 0;
      const hasChildren = group.children && group.children.length > 0;
      const isExpanded = expandedGroups.has(group.id);

      if (!hasSettings && !hasChildren) return null;

      return (
        <div key={group.id} style={{ marginLeft: depth * 16 }}>
          <div
            className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-slate-100 ${
              selectedGroupId === group.id ? 'bg-blue-50' : ''
            }`}
            onClick={() => {
              if (hasChildren) {
                toggleGroup(group.id);
              }
              setSelectedGroupId(group.id);
            }}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )
            ) : (
              <div className="w-4" />
            )}
            <Folder className="h-4 w-4 text-amber-500" />
            <span className="text-sm">{group.name}</span>
            {group.settings && group.settings.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {findSettingsInGroup(group).length}
              </Badge>
            )}
          </div>

          {/* 해당 그룹의 설정 목록 */}
          {isExpanded && group.settings && (
            <div className="ml-8 space-y-1 mb-2">
              {group.settings
                .filter(s => {
                  if (s.pricingType !== 'paper_output_spec') return false;
                  if (outputMethod === 'INDIGO') {
                    return s.printMethod === 'indigo' || (s.indigoUpPrices && s.indigoUpPrices.length > 0);
                  } else if (outputMethod === 'INKJET') {
                    return s.printMethod === 'inkjet' || (s.inkjetSpecPrices && s.inkjetSpecPrices.length > 0);
                  }
                  return false;
                })
                .map(setting => (
                  <div
                    key={setting.id}
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-emerald-50 ${
                      selectedSettingId === setting.id ? 'bg-emerald-100 border border-emerald-300' : 'bg-white border border-slate-200'
                    }`}
                    onClick={() => handleSelectSetting(setting)}
                  >
                    <Settings className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">{setting.settingName || setting.codeName}</span>
                    {setting.printMethod && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {setting.printMethod === 'indigo' ? '인디고' : '잉크젯'}
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* 하위 그룹 */}
          {isExpanded && hasChildren && renderGroupTree(group.children!, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Step 표시 */}
      <div className="flex items-center gap-2 mb-4 px-2">
        {[
          { num: 1, label: '출력방식' },
          { num: 2, label: '단가설정' },
          { num: 3, label: '세부옵션' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                step >= s.num
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <span>{s.num}</span>
              <span>{s.label}</span>
            </div>
            {idx < 2 && (
              <ChevronRight className={`h-4 w-4 mx-1 ${step > s.num ? 'text-emerald-600' : 'text-slate-300'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: 출력방식 선택 */}
      {step === 1 && (
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-slate-500 mb-4">출력방식을 선택해주세요.</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className={`p-6 rounded-xl border-2 transition-all ${
                outputMethod === 'INDIGO'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
              onClick={() => {
                setOutputMethod('INDIGO');
                setStep(2);
              }}
            >
              <div className="text-3xl mb-2">🖨️</div>
              <div className="font-semibold text-lg">인디고 출력</div>
              <div className="text-sm text-slate-500 mt-1">4도/6도 선택, Up별 가격</div>
            </button>
            <button
              type="button"
              className={`p-6 rounded-xl border-2 transition-all ${
                outputMethod === 'INKJET'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
              onClick={() => {
                setOutputMethod('INKJET');
                setStep(2);
              }}
            >
              <div className="text-3xl mb-2">💧</div>
              <div className="font-semibold text-lg">잉크젯 출력</div>
              <div className="text-sm text-slate-500 mt-1">규격별 가격</div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 단가설정 선택 (트리) */}
      {step === 2 && outputMethod && (
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">
              {outputMethod === 'INDIGO' ? '인디고' : '잉크젯'} 출력 단가설정을 선택해주세요.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> 이전
            </Button>
          </div>

          <div className="border rounded-lg p-2 max-h-[400px] overflow-y-auto bg-slate-50">
            {productionGroupTree && productionGroupTree.length > 0 ? (
              renderGroupTree(productionGroupTree)
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Settings className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>등록된 단가설정이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: 세부 옵션 (인디고: 4도/6도, 잉크젯: 규격 선택) */}
      {step === 4 && selectedSetting && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500">세부 옵션을 선택해주세요.</p>
              <p className="text-sm font-medium mt-1">
                선택된 설정: <span className="text-emerald-600">{selectedSetting.settingName || selectedSetting.codeName}</span>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> 이전
            </Button>
          </div>

          {outputMethod === 'INDIGO' && (
            <>
              {/* 4도/6도 선택 */}
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">색상 타입</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={colorType === '4도' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setColorType('4도')}
                    className={colorType === '4도' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  >
                    4도
                  </Button>
                  <Button
                    type="button"
                    variant={colorType === '6도' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setColorType('6도')}
                    className={colorType === '6도' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  >
                    6도
                  </Button>
                </div>
              </div>

              {/* Up별 가격 테이블 */}
              {selectedSetting.indigoUpPrices && selectedSetting.indigoUpPrices.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Up</TableHead>
                        <TableHead className="text-right">단면 가격</TableHead>
                        <TableHead className="text-right">양면 가격</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSetting.indigoUpPrices.map((upPrice) => (
                        <TableRow key={upPrice.up}>
                          <TableCell className="font-medium">{upPrice.up}Up</TableCell>
                          <TableCell className="text-right">{upPrice.singleSidedPrice.toLocaleString()}원</TableCell>
                          <TableCell className="text-right">{upPrice.doubleSidedPrice.toLocaleString()}원</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}

          {outputMethod === 'INKJET' && (
            <>
              {/* 규격 선택 */}
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">규격 선택</Label>
                {selectedSetting.inkjetSpecPrices && selectedSetting.inkjetSpecPrices.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="w-12">선택</TableHead>
                          <TableHead>규격 ID</TableHead>
                          <TableHead className="text-right">가격</TableHead>
                          <TableHead className="text-center">기준규격</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSetting.inkjetSpecPrices.map((specPrice) => (
                          <TableRow
                            key={specPrice.specificationId}
                            className={`cursor-pointer ${selectedSpecId === specPrice.specificationId ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                            onClick={() => setSelectedSpecId(specPrice.specificationId)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedSpecId === specPrice.specificationId}
                                onCheckedChange={() => setSelectedSpecId(specPrice.specificationId)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{specPrice.specificationId}</TableCell>
                            <TableCell className="text-right">{specPrice.singleSidedPrice.toLocaleString()}원</TableCell>
                            <TableCell className="text-center">
                              {specPrice.isBaseSpec && <Badge variant="secondary">기준</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">등록된 규격이 없습니다.</p>
                )}
              </div>
            </>
          )}

          {/* 추가 버튼 */}
          <div className="mt-4">
            <Button
              type="button"
              onClick={handleAddSelection}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={outputMethod === 'INKJET' && !selectedSpecId}
            >
              <Plus className="h-4 w-4 mr-2" />
              출력단가 추가
            </Button>
          </div>
        </div>
      )}

      {/* 선택된 출력단가 목록 */}
      {localSelected.length > 0 && (
        <div className="p-4 border-t bg-emerald-50">
          <p className="text-sm font-medium mb-3">선택된 출력단가 ({localSelected.length}개)</p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {localSelected.map((selection) => (
              <div
                key={selection.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{selection.outputMethod === 'INDIGO' ? '🖨️' : '💧'}</span>
                  <div>
                    <p className="font-medium text-sm">{selection.productionSettingName}</p>
                    <p className="text-xs text-slate-500">
                      {selection.outputMethod === 'INDIGO'
                        ? `인디고 ${selection.colorType}`
                        : `잉크젯 - ${selection.specificationId || '규격 미선택'}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeSelection(selection.id)}
                  className="p-1 hover:bg-red-100 rounded-full"
                >
                  <X className="h-4 w-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <DialogFooter className="mt-4 p-4 border-t">
        <Button variant="outline" onClick={() => setLocalSelected([])}>전체 해제</Button>
        <Button variant="outline" onClick={onCancel}>취소</Button>
        <Button onClick={() => onSelect(localSelected)} className="bg-emerald-600 hover:bg-emerald-700">
          선택 완료
        </Button>
      </DialogFooter>
    </div>
  );
}

// 옵션 폼 컴포넌트
function OptionForm({ onSubmit, onCancel }: { onSubmit: (opt: Omit<ProductOption, 'id'>) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'select' | 'required'>('select');
  const [quantityType, setQuantityType] = useState<'auto' | 'manual'>('auto');
  const [values, setValues] = useState<{ name: string; price: number }[]>([{ name: '', price: 0 }]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>옵션명</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="옵션명 입력" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">옵션 타입</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="optType" checked={type === 'select'} onChange={() => setType('select')} className="w-4 h-4" />
              <span className="text-sm">선택옵션</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="optType" checked={type === 'required'} onChange={() => setType('required')} className="w-4 h-4" />
              <span className="text-sm">필수옵션</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">수량 타입</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="qtyType" checked={quantityType === 'auto'} onChange={() => setQuantityType('auto')} className="w-4 h-4" />
              <span className="text-sm">자동수량</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="qtyType" checked={quantityType === 'manual'} onChange={() => setQuantityType('manual')} className="w-4 h-4" />
              <span className="text-sm">선택수량</span>
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>옵션값</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setValues(prev => [...prev, { name: '', price: 0 }])}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {values.map((v, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Input
              value={v.name}
              onChange={(e) => {
                const newValues = [...values];
                newValues[idx].name = e.target.value;
                setValues(newValues);
              }}
              placeholder="옵션값"
              className="flex-1"
            />
            <Input
              type="number"
              value={v.price}
              onChange={(e) => {
                const newValues = [...values];
                newValues[idx].price = Number(e.target.value);
                setValues(newValues);
              }}
              placeholder="가격"
              className="w-32"
            />
            {values.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setValues(prev => prev.filter((_, i) => i !== idx))}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>취소</Button>
        <Button onClick={() => onSubmit({ name, type, quantityType, values: values.filter(v => v.name) })}>추가</Button>
      </DialogFooter>
    </div>
  );
}

// 제본 선택 폼 컴포넌트 (단가 구조에서 선택)
function BindingSelectionForm({
  productionGroupTree,
  selectedBindings,
  onSelect,
  onCancel,
}: {
  productionGroupTree: ProductionGroup[];
  selectedBindings: { id: string; name: string; price: number; productionSettingId?: string; pricingType?: string }[];
  onSelect: (bindings: { id: string; name: string; price: number; productionSettingId?: string; pricingType?: string }[]) => void;
  onCancel: () => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [localSelected, setLocalSelected] = useState<{ id: string; name: string; price: number; productionSettingId?: string; pricingType?: string }[]>(selectedBindings);

  // "제본" 그룹 찾기 (대분류에서)
  const bindingGroup = productionGroupTree.find(g => g.name === '제본');

  // 그룹 펼치기/접기
  const toggleExpand = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // 설정 선택/해제
  const toggleSetting = (setting: ProductionSetting, groupName: string) => {
    setLocalSelected(prev => {
      const exists = prev.find(b => b.productionSettingId === setting.id);
      if (exists) {
        return prev.filter(b => b.productionSettingId !== setting.id);
      } else {
        return [...prev, {
          id: Date.now().toString(),
          name: `${groupName} - ${setting.codeName || setting.settingName || '설정'}`,
          price: Number(setting.basePrice) || 0,
          productionSettingId: setting.id,
          pricingType: setting.pricingType,
        }];
      }
    });
  };

  // 재귀적으로 그룹과 설정을 렌더링
  const renderGroup = (group: ProductionGroup, level: number = 0) => {
    const isExpanded = expandedGroups.has(group.id);
    const hasChildren = group.children && group.children.length > 0;
    const hasSettings = group.settings && group.settings.length > 0;

    return (
      <div key={group.id} className="border-b last:border-b-0">
        <div
          className={`flex items-center gap-2 p-3 cursor-pointer hover:bg-slate-50 ${level > 0 ? 'pl-' + (level * 4 + 3) : ''}`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => toggleExpand(group.id)}
        >
          {(hasChildren || hasSettings) ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )
          ) : (
            <div className="w-4" />
          )}
          <Folder className={`h-4 w-4 ${isExpanded ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="font-medium text-sm">{group.name}</span>
          {group._count?.settings && (
            <Badge variant="secondary" className="text-xs">
              {group._count.settings}개 설정
            </Badge>
          )}
        </div>

        {isExpanded && (
          <div>
            {/* 하위 그룹 */}
            {hasChildren && group.children!.map(child => renderGroup(child, level + 1))}

            {/* 설정 목록 */}
            {hasSettings && group.settings!.map(setting => {
              const isSelected = localSelected.some(b => b.productionSettingId === setting.id);
              return (
                <div
                  key={setting.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer border-l-2 ${isSelected
                    ? 'bg-emerald-50 border-l-emerald-500'
                    : 'hover:bg-slate-50 border-l-transparent'
                    }`}
                  style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
                  onClick={() => toggleSetting(setting, group.name)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSetting(setting, group.name)}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                  <Settings className="h-4 w-4 text-slate-400" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {setting.codeName || setting.settingName || '설정'}
                    </div>
                    <div className="text-xs text-slate-500 flex gap-2">
                      <span>{getPricingTypeLabel(setting.pricingType)}</span>
                      {setting.basePrice > 0 && (
                        <span className="text-emerald-600">
                          기본가: {Number(setting.basePrice).toLocaleString()}원
                        </span>
                      )}
                      {setting.workDays > 0 && (
                        <span>작업일: {setting.workDays}일</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 가격타입 라벨
  const getPricingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      nup_page_range: '구간별 Nup/1p가격',
      binding_page: '제본 페이지당',
      paper_output_spec: '용지별출력단가',
    };
    return labels[type] || type;
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="text-sm text-slate-500 mb-3">
        가격관리 &gt; 표준단가에서 설정된 제본 단가 구조를 선택합니다.
      </div>

      {!bindingGroup ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <Layers className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>&quot;제본&quot; 분류가 없습니다.</p>
            <p className="text-sm mt-1">가격관리 &gt; 표준단가에서 제본 분류를 먼저 추가해주세요.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto border rounded-lg">
          {renderGroup(bindingGroup)}
        </div>
      )}

      {localSelected.length > 0 && (
        <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
          <p className="text-sm font-medium mb-2">선택된 제본 설정 ({localSelected.length}개)</p>
          <div className="flex flex-wrap gap-2">
            {localSelected.map((binding, idx) => (
              <Badge key={idx} variant="secondary" className="flex items-center gap-1 bg-white">
                {binding.name}
                <button
                  type="button"
                  title="제거"
                  className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                  onClick={() => setLocalSelected(prev => prev.filter((_, i) => i !== idx))}
                >
                  <X className="h-3 w-3 text-red-500" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={() => setLocalSelected([])}>전체 해제</Button>
        <Button variant="outline" onClick={onCancel}>취소</Button>
        <Button onClick={() => onSelect(localSelected)} className="bg-emerald-600 hover:bg-emerald-700">
          선택 완료
        </Button>
      </DialogFooter>
    </div>
  );
}

// 박 선택 폼 컴포넌트 (거래처정보 > 박 컬러에서 선택)
function FoilSelectionForm({
  selectedFoils,
  onSelect,
  onCancel,
}: {
  selectedFoils: { id: string; name: string; color: string; price: number }[];
  onSelect: (foils: { id: string; name: string; color: string; price: number }[]) => void;
  onCancel: () => void;
}) {
  const [localSelected, setLocalSelected] = useState<{ id: string; name: string; color: string; price: number }[]>(selectedFoils);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: foilColors, isLoading } = useFoilColors();

  // 검색 필터링
  const filteredFoils = foilColors?.filter(foil =>
    foil.isActive &&
    (searchTerm === '' || foil.name.toLowerCase().includes(searchTerm.toLowerCase()) || foil.code.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const toggleFoil = (foil: FoilColorItem) => {
    setLocalSelected(prev => {
      const exists = prev.find(f => f.id === foil.id);
      if (exists) {
        return prev.filter(f => f.id !== foil.id);
      } else {
        return [...prev, {
          id: foil.id,
          name: foil.name,
          color: foil.colorHex || '',
          price: 0,
        }];
      }
    });
  };

  // 전체 선택/해제
  const isAllSelected = filteredFoils.length > 0 && filteredFoils.every(foil => localSelected.some(f => f.id === foil.id));
  const isSomeSelected = filteredFoils.some(foil => localSelected.some(f => f.id === foil.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const foilIds = filteredFoils.map(f => f.id);
      setLocalSelected(prev => prev.filter(f => !foilIds.includes(f.id)));
    } else {
      const newFoils = filteredFoils
        .filter(foil => !localSelected.some(f => f.id === foil.id))
        .map(foil => ({
          id: foil.id,
          name: foil.name,
          color: foil.colorHex || '',
          price: 0,
        }));
      setLocalSelected(prev => [...prev, ...newFoils]);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="text-sm text-slate-500 mb-3">
        거래처정보 &gt; 동판관리에서 등록된 박 컬러를 선택합니다.
      </div>

      {/* 검색 */}
      <div className="mb-4">
        <Input
          placeholder="박 이름 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9"
        />
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filteredFoils.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>등록된 박 컬러가 없습니다.</p>
            <p className="text-sm mt-1">거래처정보 &gt; 동판관리에서 박 컬러를 먼저 등록해주세요.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) {
                        (el as any).indeterminate = !isAllSelected && isSomeSelected;
                      }
                    }}
                    onCheckedChange={toggleSelectAll}
                    className="data-[state=checked]:bg-emerald-600"
                    title="전체 선택"
                  />
                </TableHead>
                <TableHead>컬러</TableHead>
                <TableHead>박 이름</TableHead>
                <TableHead>코드</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFoils.map((foil) => {
                const isSelected = localSelected.some(f => f.id === foil.id);
                return (
                  <TableRow
                    key={foil.id}
                    className={`cursor-pointer ${isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                    onClick={() => toggleFoil(foil)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleFoil(foil)}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                    </TableCell>
                    <TableCell>
                      {foil.colorHex ? (
                        <div
                          className="w-8 h-8 rounded-lg border border-slate-300 shadow-inner"
                          style={{ backgroundColor: foil.colorHex }}
                          title={foil.colorHex}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                          N/A
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{foil.name}</TableCell>
                    <TableCell className="text-sm text-slate-500">{foil.code}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 전체 선택 버튼 */}
      {filteredFoils.length > 0 && (
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="text-xs"
          >
            {isAllSelected ? `전체 해제 (${filteredFoils.length}개)` : `전체 선택 (${filteredFoils.length}개)`}
          </Button>
        </div>
      )}

      {localSelected.length > 0 && (
        <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
          <p className="text-sm font-medium mb-2">선택된 박 컬러 ({localSelected.length}개)</p>
          <div className="flex flex-wrap gap-2">
            {localSelected.map((foil) => (
              <Badge key={foil.id} variant="secondary" className="flex items-center gap-2 bg-white">
                {foil.color && (
                  <div
                    className="w-4 h-4 rounded border border-slate-300"
                    style={{ backgroundColor: foil.color }}
                  />
                )}
                {foil.name}
                <button
                  type="button"
                  title="제거"
                  className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocalSelected(prev => prev.filter(f => f.id !== foil.id));
                  }}
                >
                  <X className="h-3 w-3 text-red-500" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={() => setLocalSelected([])}>전체 해제</Button>
        <Button variant="outline" onClick={onCancel}>취소</Button>
        <Button onClick={() => onSelect(localSelected)} className="bg-emerald-600 hover:bg-emerald-700">
          선택 완료
        </Button>
      </DialogFooter>
    </div>
  );
}

// 공용동판 선택 폼 컴포넌트
function PublicCopperPlateSelectionForm({
  selectedPlates,
  onSelect,
  onCancel,
}: {
  selectedPlates: {
    id: string;
    plateId: string;
    plateName: string;
    foilColor: string;
    foilColorName: string;
    engravingText: string;
  }[];
  onSelect: (plates: {
    id: string;
    plateId: string;
    plateName: string;
    foilColor: string;
    foilColorName: string;
    engravingText: string;
  }[]) => void;
  onCancel: () => void;
}) {
  const [localSelected, setLocalSelected] = useState(selectedPlates);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: platesData, isLoading } = usePublicCopperPlates({
    limit: 100,
    status: 'active',
    search: searchTerm || undefined,
  });

  const plates = platesData?.data || [];

  // 박색상 이름 매핑
  const FOIL_COLORS: Record<string, { name: string; color: string }> = {
    gold_glossy: { name: '금박(유광)', color: '#FFD700' },
    gold_matte: { name: '금박(무광)', color: '#DAA520' },
    silver_glossy: { name: '은박(유광)', color: '#C0C0C0' },
    silver_matte: { name: '은박(무광)', color: '#A9A9A9' },
    brown: { name: '밤박(브라운)', color: '#8B4513' },
    black: { name: '먹박(블랙)', color: '#000000' },
    white: { name: '백박(화이트)', color: '#FFFFFF' },
    rose_gold: { name: '로즈골드', color: '#B76E79' },
  };

  const togglePlate = (plate: PublicCopperPlate) => {
    setLocalSelected(prev => {
      const exists = prev.find(p => p.plateId === plate.id);
      if (exists) {
        return prev.filter(p => p.plateId !== plate.id);
      } else {
        return [...prev, {
          id: Date.now().toString(),
          plateId: plate.id,
          plateName: plate.plateName,
          foilColor: plate.plateType || '',
          foilColorName: FOIL_COLORS[plate.plateType]?.name || plate.plateType || '기본',
          engravingText: plate.defaultEngravingText || '',
        }];
      }
    });
  };

  const updateEngravingText = (plateId: string, text: string) => {
    setLocalSelected(prev => prev.map(p =>
      p.plateId === plateId ? { ...p, engravingText: text } : p
    ));
  };

  // 전체 선택 관련
  const isAllSelected = plates.length > 0 && plates.every((plate) => localSelected.some(p => p.plateId === plate.id));
  const isSomeSelected = plates.some((plate) => localSelected.some(p => p.plateId === plate.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // 현재 필터된 동판들만 선택 해제
      const plateIds = plates.map((p) => p.id);
      setLocalSelected(prev => prev.filter(p => !plateIds.includes(p.plateId)));
    } else {
      // 현재 필터된 동판들 모두 선택 (기존 선택 유지)
      const newPlates = plates
        .filter((plate) => !localSelected.some(p => p.plateId === plate.id))
        .map((plate) => ({
          id: Date.now().toString() + plate.id,
          plateId: plate.id,
          plateName: plate.plateName,
          foilColor: plate.plateType || '',
          foilColorName: FOIL_COLORS[plate.plateType]?.name || plate.plateType || '기본',
          engravingText: plate.defaultEngravingText || '',
        }));
      setLocalSelected(prev => [...prev, ...newPlates]);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[60vh]">
      <div className="text-sm text-slate-500 mb-3 flex-shrink-0">
        기초정보 &gt; 공용동판관리에서 등록된 공용동판을 선택합니다. 상품별 각인문구를 설정할 수 있습니다.
      </div>

      {/* 검색 */}
      <div className="mb-4 flex-shrink-0">
        <Input
          placeholder="동판명 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9"
        />
      </div>

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : plates.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>등록된 공용동판이 없습니다.</p>
              <p className="text-sm mt-1">기초정보 &gt; 공용동판관리에서 먼저 등록해주세요.</p>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) {
                        (el as unknown as HTMLInputElement).indeterminate = !isAllSelected && isSomeSelected;
                      }
                    }}
                    onCheckedChange={toggleSelectAll}
                    className="data-[state=checked]:bg-amber-600"
                    title="전체 선택"
                  />
                </TableHead>
                <TableHead>동판명</TableHead>
                <TableHead>박색상</TableHead>
                <TableHead>기본 각인문구</TableHead>
                <TableHead>크기</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plates.map((plate) => {
                const isSelected = localSelected.some(p => p.plateId === plate.id);
                const foilInfo = FOIL_COLORS[plate.plateType];
                return (
                  <TableRow
                    key={plate.id}
                    className={`cursor-pointer ${isSelected ? 'bg-amber-50' : 'hover:bg-slate-50'}`}
                    onClick={() => togglePlate(plate)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePlate(plate)}
                        className="data-[state=checked]:bg-amber-600"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{plate.plateName}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="gap-1.5"
                        style={{
                          borderColor: foilInfo?.color || '#ccc',
                          backgroundColor: foilInfo ? `${foilInfo.color}20` : '#f5f5f5',
                        }}
                      >
                        {foilInfo && (
                          <span
                            className="w-3 h-3 rounded-full border"
                            style={{ backgroundColor: foilInfo.color }}
                          />
                        )}
                        {foilInfo?.name || plate.plateType || '기본'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">
                      {plate.defaultEngravingText || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {plate.widthMm && plate.heightMm
                        ? `${plate.widthMm}×${plate.heightMm}mm`
                        : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        )}

        {/* 전체 선택 버튼 */}
        {plates.length > 0 && (
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="text-xs"
            >
              {isAllSelected ? `현재 목록 전체 해제 (${plates.length}개)` : `현재 목록 전체 선택 (${plates.length}개)`}
            </Button>
          </div>
        )}

        {localSelected.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium mb-3">선택된 공용동판 ({localSelected.length}개) - 각인문구 설정</p>
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {localSelected.map((plate) => (
                <div key={plate.plateId} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="text-xs">{plate.foilColorName}</Badge>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="font-medium text-sm">{plate.plateName}</div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-500 whitespace-nowrap">각인문구:</Label>
                      <Input
                        value={plate.engravingText}
                        onChange={(e) => updateEngravingText(plate.plateId, e.target.value)}
                        placeholder="각인문구 입력 (선택)"
                        className="h-8 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    title="제거"
                    className="hover:bg-red-100 rounded-full p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalSelected(prev => prev.filter(p => p.plateId !== plate.plateId));
                    }}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 버튼 - 항상 표시 */}
      <DialogFooter className="mt-4 flex-shrink-0 border-t pt-4">
        <Button variant="outline" onClick={() => setLocalSelected([])}>전체 해제</Button>
        <Button variant="outline" onClick={onCancel}>취소</Button>
        <Button onClick={() => onSelect(localSelected)} className="bg-amber-600 hover:bg-amber-700">
          선택 완료
        </Button>
      </DialogFooter>
    </div>
  );
}

