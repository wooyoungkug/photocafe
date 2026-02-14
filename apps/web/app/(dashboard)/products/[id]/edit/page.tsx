'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
import { useProductionGroupTree, useProductionSettings, type ProductionGroup, type ProductionSetting, type OutputPriceSelection, type IndigoUpPrice, type InkjetSpecPrice, type PriceGroup } from '@/hooks/use-production';
import { usePapers } from '@/hooks/use-paper';
import { useFoilColors, type FoilColorItem } from '@/hooks/use-copper-plates';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { API_URL } from '@/lib/api';
import { normalizeImageUrl } from '@/lib/utils';

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

// 제본방법에 따른 출력구분 자동 결정
// 압축제본류(압축, 맞장, 레이플릿) → 단면출력
// 화보류(핀화보, 스타화보, 포토북) → 양면출력
const getPrintTypeByBinding = (bindingName: string): 'single' | 'double' | 'customer' => {
  const lowerName = bindingName.toLowerCase();
  if (lowerName.includes('압축') || lowerName.includes('맞장') || lowerName.includes('레이플릿')) {
    return 'single';
  }
  if (lowerName.includes('화보') || lowerName.includes('포토북') || lowerName.includes('스타')) {
    return 'double';
  }
  return 'double'; // 기본값
};


interface ProductOption {
  id: string;
  name: string;
  type: 'select' | 'required';
  quantityType: 'auto' | 'manual';
  values: { name: string; price: number }[];
}

// 섹션 헤더 컴포넌트
const SECTION_THEMES = {
  blue: {
    iconBg: 'bg-blue-50 ring-1 ring-blue-100',
    iconColor: 'text-blue-600',
    accentBar: 'from-blue-500 to-blue-400',
  },
  emerald: {
    iconBg: 'bg-emerald-50 ring-1 ring-emerald-100',
    iconColor: 'text-emerald-600',
    accentBar: 'from-emerald-500 to-teal-400',
  },
  violet: {
    iconBg: 'bg-violet-50 ring-1 ring-violet-100',
    iconColor: 'text-violet-600',
    accentBar: 'from-violet-500 to-purple-400',
  },
  amber: {
    iconBg: 'bg-amber-50 ring-1 ring-amber-100',
    iconColor: 'text-amber-600',
    accentBar: 'from-amber-500 to-orange-400',
  },
  slate: {
    iconBg: 'bg-slate-100 ring-1 ring-slate-200',
    iconColor: 'text-slate-600',
    accentBar: 'from-slate-500 to-slate-400',
  },
} as const;

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  theme = 'slate',
  actions
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  theme?: keyof typeof SECTION_THEMES;
  actions?: React.ReactNode;
}) {
  const t = SECTION_THEMES[theme];
  return (
    <div className="relative">
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${t.accentBar} rounded-t-lg`} />
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-3.5">
          <div className={`p-2 rounded-lg ${t.iconBg}`}>
            <Icon className={`h-[18px] w-[18px] ${t.iconColor}`} />
          </div>
          <div>
            <h3 className="font-semibold text-[15px] text-slate-900 leading-tight tracking-tight">{title}</h3>
            {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </div>
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
    <div className={`grid grid-cols-12 gap-x-6 items-center py-3.5 ${className}`}>
      <Label className="col-span-2 text-right text-[13px] font-medium text-slate-500 select-none">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
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
  const { data: product, isLoading: isProductLoading, refetch: refetchProduct } = useProduct(productId);
  const { data: productionGroupTree, isLoading: isTreeLoading } = useProductionGroupTree();
  const updateProduct = useUpdateProduct();

  // 후가공옵션 카테고리 (ProductionGroup 트리에서 동적 로딩)
  const finishingGroup = useMemo(() => {
    if (!productionGroupTree) return null;
    return productionGroupTree.find(g => g.name === '후가공옵션' || g.name === '후가공') || null;
  }, [productionGroupTree]);

  const finishingChildren: ProductionGroup[] = useMemo(() => {
    if (!finishingGroup?.children) return [];
    return finishingGroup.children.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [finishingGroup]);

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
  // 출력단가 선택 (새로운 방식)
  const [outputPriceSelections, setOutputPriceSelections] = useState<OutputPriceSelection[]>([]);
  const [outputPriceDialogOpen, setOutputPriceDialogOpen] = useState(false);
  const [printType, setPrintType] = useState('double');
  const [selectedCovers, setSelectedCovers] = useState<{ id: string; name: string; price: number }[]>([]);
  const [selectedFoils, setSelectedFoils] = useState<{ id: string; name: string; color: string; price: number }[]>([]);
  // 용지 사용 여부 관리
  const [paperActiveMap, setPaperActiveMap] = useState<Record<string, boolean>>({});
  // 기본 용지 ID
  const [defaultPaperId, setDefaultPaperId] = useState<string>('');

  // 후가공정보
  const [finishingOptions, setFinishingOptions] = useState<Record<string, boolean>>({});

  // 옵션정보
  const [customOptions, setCustomOptions] = useState<ProductOption[]>([]);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);

  // 이미지
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [detailImages, setDetailImages] = useState<string[]>(['', '', '', '', '']);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // 상세정보
  const [description, setDescription] = useState('');
  const [isFormReady, setIsFormReady] = useState(false);

  // 선택 다이얼로그
  const [specDialogOpen, setSpecDialogOpen] = useState(false);
  const [halfProductDialogOpen, setHalfProductDialogOpen] = useState(false);
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [foilDialogOpen, setFoilDialogOpen] = useState(false);

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

      try {
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
          while (images.length < 5) images.push('');
          setDetailImages(images.slice(0, 5));
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

        // 용지 사용 여부 로드
        if (product.papers && Array.isArray(product.papers)) {
          const activeMap: Record<string, boolean> = {};
          let foundDefaultId = '';
          product.papers.forEach((p: { id: string; isActive?: boolean; isDefault?: boolean }) => {
            activeMap[p.id] = p.isActive !== false; // 기본값 true
            if (p.isDefault) foundDefaultId = p.id;
          });
          setPaperActiveMap(activeMap);
          setDefaultPaperId(foundDefaultId || (product.papers[0] as any)?.id || '');
        }

        // 후가공 옵션은 별도 useEffect에서 처리 (productionGroupTree 로딩 타이밍 대응)

        // 제본 방향 및 출력 타입 로드
        if ((product as any).bindingDirection) {
          setBindingDirection((product as any).bindingDirection);
        }
        if ((product as any).printType) {
          setPrintType((product as any).printType);
        }
        // 출력단가 설정 로드
        if ((product as any).outputPriceSettings && Array.isArray((product as any).outputPriceSettings)) {
          setOutputPriceSelections((product as any).outputPriceSettings);
          // 규격이 없는 경우에만 outputMethod 기반 specType fallback
          if (!product.specifications || product.specifications.length === 0) {
            const hasIndigo = (product as any).outputPriceSettings.some((s: any) => s?.outputMethod === 'INDIGO');
            const hasInkjet = (product as any).outputPriceSettings.some((s: any) => s?.outputMethod === 'INKJET');
            if (hasIndigo && !hasInkjet) {
              setSpecType('indigo');
            } else if (hasInkjet && !hasIndigo) {
              setSpecType('album');
            }
          }
        }

        setIsFormReady(true);
      } catch (error) {
        console.error('Failed to initialize product data:', error);
        toast({
          variant: 'destructive',
          title: '데이터 로드 오류',
          description: '상품 정보를 불러오는 중 오류가 발생했습니다. (일부 정보가 누락될 수 있습니다)',
        });
        // 오류가 발생해도 폼은 보여주도록 함
        setIsFormReady(true);
      }
    }
  }, [product, categories]);

  // 후가공 옵션 로딩 (productionGroupTree 로딩 완료 후)
  useEffect(() => {
    if (!product?.finishings || !Array.isArray(product.finishings) || !finishingChildren.length) return;
    const opts: Record<string, boolean> = {};
    product.finishings.forEach((f: { name: string; productionGroupId?: string }) => {
      if (f.productionGroupId) {
        opts[f.productionGroupId] = true;
      } else {
        const group = finishingChildren.find(c => c.name === f.name);
        if (group) opts[group.id] = true;
      }
    });
    setFinishingOptions(opts);
  }, [product?.finishings, finishingChildren]);

  // 규격 매칭 (specifications가 로드된 후 실행)
  useEffect(() => {
    if (product?.specifications && Array.isArray(product.specifications) && specifications && specifications.length > 0) {
      const productSpecs = product.specifications as Array<{ specificationId?: string; name: string; widthMm: number; heightMm: number }>;
      const matchedSpecIds = productSpecs
        .map((productSpec) => {
          // specificationId가 있으면 우선 사용 (정확한 매칭)
          if (productSpec.specificationId) {
            const exists = specifications.find(s => s.id === productSpec.specificationId);
            if (exists) return exists.id;
          }
          // fallback: name + dimensions 매칭
          const matchedSpec = specifications.find(
            (s) => s.name === productSpec.name &&
              Number(s.widthMm) === Number(productSpec.widthMm) &&
              Number(s.heightMm) === Number(productSpec.heightMm)
          );
          return matchedSpec?.id;
        })
        .filter((id): id is string => !!id);
      setSelectedSpecs(matchedSpecIds);

      // 저장된 규격의 타입을 감지하여 specType 자동 설정
      if (matchedSpecIds.length > 0) {
        const matchedGlobalSpecs = matchedSpecIds
          .map(id => specifications.find(s => s.id === id))
          .filter((s): s is NonNullable<typeof s> => !!s);

        const typeCounts = [
          { key: 'indigo' as const, count: matchedGlobalSpecs.filter(s => s.forIndigo).length },
          { key: 'inkjet' as const, count: matchedGlobalSpecs.filter(s => s.forInkjet).length },
          { key: 'album' as const, count: matchedGlobalSpecs.filter(s => s.forAlbum).length },
          { key: 'frame' as const, count: matchedGlobalSpecs.filter(s => s.forFrame).length },
          { key: 'booklet' as const, count: matchedGlobalSpecs.filter(s => s.forBooklet).length },
        ];
        const bestMatch = typeCounts.reduce((max, curr) => curr.count > max.count ? curr : max);
        if (bestMatch.count > 0) {
          setSpecType(bestMatch.key);
        }
      }
    }
  }, [product?.specifications, specifications]);

  // 제본 선택에 따른 출력구분 자동 설정
  useEffect(() => {
    if (selectedBindings.length > 0) {
      // 첫 번째 제본의 이름으로 출력구분 결정
      const firstBinding = selectedBindings[0];
      const autoPrintType = getPrintTypeByBinding(firstBinding.name);
      setPrintType(autoPrintType);
    }
  }, [selectedBindings]);

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
      // outputPriceSelections를 DTO 형식에 맞게 변환
      const outputPriceSettings = outputPriceSelections.length > 0
        ? outputPriceSelections.map(sel => ({
          id: sel.id,
          outputMethod: sel.outputMethod,
          productionSettingId: sel.productionSettingId,
          productionSettingName: sel.productionSettingName,
          deviceId: sel.deviceId,
          deviceName: sel.deviceName,
          colorType: sel.colorType,
          specificationId: sel.specificationId,
          specificationName: sel.specificationName,
          selectedUpPrices: sel.selectedUpPrices,
          selectedSpecPrice: sel.selectedSpecPrice,
        }))
        : undefined;

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
            specificationId: specId,
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
        papers: product?.papers?.map((p: any, idx: number) => ({
          name: p.name,
          type: p.type || 'normal',
          printMethod: p.printMethod,
          grammage: p.grammage,
          frontCoating: p.frontCoating,
          grade: p.grade,
          price: Number(p.price) || 0,
          isDefault: p.id === defaultPaperId,
          isActive: paperActiveMap[p.id] !== false,
          sortOrder: p.sortOrder ?? idx,
        })),
        covers: selectedCovers.map((c, idx) => ({
          name: c.name, price: c.price, isDefault: idx === 0, sortOrder: idx,
        })),
        foils: selectedFoils.map((f, idx) => ({
          name: f.name, color: f.color, price: f.price, isDefault: idx === 0, sortOrder: idx,
        })),
        finishings: Object.entries(finishingOptions)
          .filter(([, enabled]) => enabled)
          .map(([groupId], idx) => {
            const group = finishingChildren.find(c => c.id === groupId);
            return { name: group?.name || groupId, productionGroupId: groupId, price: 0, isDefault: false, sortOrder: idx };
          }),
        outputPriceSettings,
      };

      console.log('=== 상품 수정 요청 데이터 ===');
      console.log('outputPriceSelections (현재 state):', JSON.stringify(outputPriceSelections, null, 2));
      console.log('outputPriceSettings (전송할 데이터):', JSON.stringify(outputPriceSettings, null, 2));

      const result = await updateProduct.mutateAsync({ id: productId, data: productData });
      console.log('=== 상품 수정 응답 ===', result);

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
      <div className="space-y-5 pb-10 max-w-[1200px] mx-auto">
        <PageHeader
          title="앨범상품 수정"
          description="상품 정보를 불러오는 중..."
          breadcrumbs={[
            { label: '홈', href: '/' },
            { label: '상품관리', href: '/products' },
            { label: '상품수정' },
          ]}
        />
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/80 rounded-xl">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-3/4 rounded-lg" />
            <Skeleton className="h-10 w-1/2 rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 max-w-[1200px] mx-auto">
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
      <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200/80 rounded-xl">
        <SectionHeader
          icon={Package}
          title="기본정보"
          subtitle="상품의 기본 정보를 입력합니다"
          theme="blue"
        />
        <CardContent className="px-6 pb-6 pt-2">
          <div className="divide-y divide-slate-100">
            {/* 카테고리 선택 */}
            <FormRow label="판매카테고리" required>
              <div className="flex gap-2.5">
                <Select value={largeCategoryId} onValueChange={(v) => { setLargeCategoryId(v); setMediumCategoryId(''); setSmallCategoryId(''); }}>
                  <SelectTrigger className="w-44 h-9 text-[13px] bg-white border-slate-200 hover:border-slate-300 focus:ring-blue-500/20 transition-colors">
                    <SelectValue placeholder="대분류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {largeCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-slate-300 self-center">/</span>
                <Select value={mediumCategoryId} onValueChange={(v) => { setMediumCategoryId(v); setSmallCategoryId(''); }} disabled={!largeCategoryId}>
                  <SelectTrigger className="w-44 h-9 text-[13px] bg-white border-slate-200 hover:border-slate-300 focus:ring-blue-500/20 transition-colors">
                    <SelectValue placeholder="중분류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediumCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-slate-300 self-center">/</span>
                <Select value={smallCategoryId} onValueChange={setSmallCategoryId} disabled={!mediumCategoryId}>
                  <SelectTrigger className="w-44 h-9 text-[13px] bg-white border-slate-200 hover:border-slate-300 focus:ring-blue-500/20 transition-colors">
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

            {/* 상품명 */}
            <FormRow label="상품명" required>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="상품명을 입력하세요"
                className="max-w-2xl h-9 text-[14px]"
              />
            </FormRow>

            {/* 상태 토글 */}
            <FormRow label="상품상태">
              <div className="flex gap-3">
                <label
                  className={`
                    flex items-center gap-2.5 px-4 py-2 rounded-lg border cursor-pointer transition-all
                    ${isActive
                      ? 'bg-emerald-50/80 border-emerald-200 ring-1 ring-emerald-100'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                    {isActive ? <Eye className="h-3.5 w-3.5 text-white" /> : <EyeOff className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                  <span className={`text-sm font-medium ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>활성화</span>
                  <Switch checked={isActive} onCheckedChange={setIsActive} className="ml-1 data-[state=checked]:bg-emerald-500" />
                </label>
                <label
                  className={`
                    flex items-center gap-2.5 px-4 py-2 rounded-lg border cursor-pointer transition-all
                    ${isNew
                      ? 'bg-blue-50/80 border-blue-200 ring-1 ring-blue-100'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${isNew ? 'bg-blue-500' : 'bg-slate-200'}`}>
                    <Sparkles className={`h-3.5 w-3.5 ${isNew ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-sm font-medium ${isNew ? 'text-blue-700' : 'text-slate-500'}`}>신상품</span>
                  <Switch checked={isNew} onCheckedChange={setIsNew} className="ml-1 data-[state=checked]:bg-blue-500" />
                </label>
                <label
                  className={`
                    flex items-center gap-2.5 px-4 py-2 rounded-lg border cursor-pointer transition-all
                    ${isBest
                      ? 'bg-amber-50/80 border-amber-200 ring-1 ring-amber-100'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${isBest ? 'bg-amber-500' : 'bg-slate-200'}`}>
                    <Star className={`h-3.5 w-3.5 ${isBest ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-sm font-medium ${isBest ? 'text-amber-700' : 'text-slate-500'}`}>베스트</span>
                  <Switch checked={isBest} onCheckedChange={setIsBest} className="ml-1 data-[state=checked]:bg-amber-500" />
                </label>
              </div>
            </FormRow>

            {/* 회원적용 / 정렬순서 */}
            <FormRow label="회원적용">
              <div className="flex gap-6 items-center">
                <Button type="button" variant="outline" size="sm" className="gap-2 h-8 text-xs">
                  <Users className="h-3.5 w-3.5" />
                  회원선택
                </Button>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-500 whitespace-nowrap">정렬순서</Label>
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-20 h-8 text-center text-sm"
                  />
                </div>
              </div>
            </FormRow>
          </div>
        </CardContent>
      </Card>

      {/* 가격정보 섹션 */}
      <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200/80 rounded-xl">
        <SectionHeader
          icon={Tag}
          title="가격정보 상세"
          subtitle="규격, 제본, 용지 등 가격 옵션을 설정합니다"
          theme="emerald"
        />
        <CardContent className="px-6 pb-6 pt-2 space-y-5">
          {/* 규격 선택 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-emerald-500" />
                앨범 규격
              </Label>
            </div>

            {/* 규격 타입 탭 */}
            <div className="flex gap-0.5 p-0.5 bg-slate-100/80 rounded-lg w-fit border border-slate-200/60">
              {[
                { key: 'indigo', label: '인디고앨범' },
                { key: 'inkjet', label: '잉크젯' },
                { key: 'album', label: '잉크젯앨범' },
                { key: 'frame', label: '액자' },
                { key: 'booklet', label: '책자' },
              ].map(tab => {
                const tabSpecs = getFilteredSpecs(tab.key as typeof specType);
                const tabSelectedCount = selectedSpecs.filter(specId => tabSpecs.some(s => s.id === specId)).length;
                const isActive = specType === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`
                      relative h-8 px-3 text-xs font-medium rounded-md transition-all
                      ${isActive
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                      }
                    `}
                    onClick={() => setSpecType(tab.key as typeof specType)}
                  >
                    {tab.label}
                    <span className={`
                      ml-1.5 inline-flex items-center justify-center min-w-[32px] px-1 py-0.5 rounded text-[10px] font-semibold tabular-nums
                      ${isActive
                        ? 'bg-emerald-500 text-white'
                        : tabSelectedCount > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200/80 text-slate-400'
                      }
                    `}>
                      {tabSelectedCount}/{tabSpecs.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 선택된 규격 - 탭별로 필터링 */}
            {(() => {
              const filteredSpecs = getFilteredSpecs(specType);
              const filteredSelectedSpecs = selectedSpecs.filter(specId =>
                filteredSpecs.some(s => s.id === specId)
              );
              const allSelected = filteredSpecs.length > 0 && filteredSpecs.every(s => selectedSpecs.includes(s.id));

              return (
                <div className="space-y-2">
                  {/* 전체 선택/삭제 버튼 */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-slate-200"
                      onClick={() => {
                        const filteredIds = filteredSpecs.map(s => s.id);
                        if (allSelected) {
                          setSelectedSpecs(prev => prev.filter(id => !filteredIds.includes(id)));
                        } else {
                          setSelectedSpecs(prev => [...new Set([...prev, ...filteredIds])]);
                        }
                      }}
                    >
                      {allSelected ? '전체 해제' : '전체 선택'}
                    </Button>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {filteredSelectedSpecs.length} / {filteredSpecs.length}개 선택
                    </span>
                  </div>

                  {/* 규격 목록 */}
                  {filteredSelectedSpecs.length > 0 ? (
                    <div className="grid grid-cols-6 gap-1.5 p-3 bg-slate-50/60 rounded-lg border border-slate-200/60">
                      {[...filteredSelectedSpecs]
                        .sort((a, b) => {
                          const specA = specifications?.find(s => s.id === a);
                          const specB = specifications?.find(s => s.id === b);
                          const areaA = (specA?.widthMm || 0) * (specA?.heightMm || 0);
                          const areaB = (specB?.widthMm || 0) * (specB?.heightMm || 0);
                          return areaA - areaB;
                        })
                        .map(specId => {
                          const spec = specifications?.find(s => s.id === specId);
                          return spec ? (
                            <div key={specId} className="group flex items-center justify-between py-1 px-2 bg-white border border-slate-150 rounded-md text-[12px] hover:border-slate-300 transition-colors">
                              <span className="font-medium text-slate-700 truncate">
                                {spec.name}
                                {spec.nup && <span className="ml-1 text-[10px] text-emerald-600 font-semibold">({spec.nup})</span>}
                              </span>
                              <button
                                type="button"
                                className="ml-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded p-0.5 flex-shrink-0 transition-opacity"
                                onClick={() => setSelectedSpecs(prev => prev.filter(id => id !== specId))}
                              >
                                <X className="h-3 w-3 text-red-400" />
                              </button>
                            </div>
                          ) : null;
                        })}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-[13px] text-slate-400 bg-slate-50/40 rounded-lg border border-dashed border-slate-200">
                      선택된 규격이 없습니다. 규격선택 버튼을 클릭하세요.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <Separator className="my-1" />

          {/* 제본/용지 선택 - 2열 그리드 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 제본 선택 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-500" />
                  제본 선택
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setBindingDialogOpen(true)} className="gap-1.5 h-7 text-xs border-slate-200">
                  <Plus className="h-3.5 w-3.5" />
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
                <Label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  출력단가 설정
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setOutputPriceDialogOpen(true)} className="gap-1.5 h-7 text-xs border-slate-200">
                  <Plus className="h-3.5 w-3.5" />
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
              <div className="pt-2 space-y-1">
                <div className="flex gap-4 items-center">
                  <Label className="text-xs text-slate-500">출력구분</Label>
                  <div className="flex gap-3">
                    {PRINT_TYPE_OPTIONS.filter(opt => opt.value !== 'customer').map(opt => (
                      <label key={opt.value} className={`flex items-center gap-1.5 ${selectedBindings.length === 0 ? 'opacity-50' : ''}`}>
                        <input
                          type="radio"
                          name="printType"
                          value={opt.value}
                          checked={printType === opt.value}
                          disabled
                          className="w-3.5 h-3.5 text-emerald-600"
                        />
                        <span className="text-xs">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  ※ 제본방법에 따라 자동으로 설정됩니다
                </p>
              </div>
            </div>

            {/* 커버 선택 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-emerald-500" />
                  커버 선택
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setCoverDialogOpen(true)} className="gap-1.5 h-7 text-xs border-slate-200">
                  <Plus className="h-3.5 w-3.5" />
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
          </div>

          {/* 용지 사용 여부 */}
          {product?.papers && product.papers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-500" />
                용지 사용 여부
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{product.papers.length}개</Badge>
                <span className="text-[11px] text-slate-400 font-normal ml-1">
                  (체크 해제 시 주문 페이지에 표시되지 않습니다)
                </span>
              </Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-16 text-center">사용</TableHead>
                      <TableHead className="w-16 text-center">기본</TableHead>
                      <TableHead>용지명</TableHead>
                      <TableHead className="w-24">평량</TableHead>
                      <TableHead className="w-24">코팅</TableHead>
                      <TableHead className="w-24 text-right">가격</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // 용지 이름에서 종류 추출 (숫자와 g 제외)
                      const getPaperType = (name: string) => {
                        return name.replace(/\s*\d+g?$/i, '').replace(/\s+\d+$/, '').trim();
                      };
                      // 용지를 종류별로 그룹화
                      const paperGroups = (product.papers as any[]).reduce((groups: Record<string, any[]>, paper: any) => {
                        const type = getPaperType(paper.name);
                        if (!groups[type]) groups[type] = [];
                        groups[type].push(paper);
                        return groups;
                      }, {} as Record<string, any[]>);
                      const groupEntries = Object.entries(paperGroups);

                      return groupEntries.map(([type, papers]) => (
                        papers.map((paper: any, pIdx: number) => (
                          <TableRow
                            key={paper.id}
                            className={paperActiveMap[paper.id] === false ? 'opacity-50 bg-slate-50' : ''}
                          >
                            <TableCell className="text-center">
                              <Checkbox
                                checked={paperActiveMap[paper.id] !== false}
                                onCheckedChange={(checked) => {
                                  setPaperActiveMap(prev => ({
                                    ...prev,
                                    [paper.id]: !!checked,
                                  }));
                                }}
                                className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="radio"
                                name="defaultPaper"
                                checked={defaultPaperId === paper.id}
                                onChange={() => setDefaultPaperId(paper.id)}
                                className="h-4 w-4 accent-blue-600 cursor-pointer"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {pIdx === 0 && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {type}
                                  </Badge>
                                )}
                                <span className={`text-sm ${paperActiveMap[paper.id] === false ? 'line-through text-slate-400' : 'font-medium'}`}>
                                  {paper.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {paper.grammage ? `${paper.grammage}g` : '-'}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {paper.frontCoating || '-'}
                            </TableCell>
                            <TableCell className="text-sm text-right text-slate-600">
                              {Number(paper.price) > 0 ? `+${Number(paper.price).toLocaleString()}원` : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allActive: Record<string, boolean> = {};
                    (product.papers as any[]).forEach((p: any) => { allActive[p.id] = true; });
                    setPaperActiveMap(allActive);
                  }}
                >
                  전체 선택
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allInactive: Record<string, boolean> = {};
                    (product.papers as any[]).forEach((p: any) => { allInactive[p.id] = false; });
                    setPaperActiveMap(allInactive);
                  }}
                >
                  전체 해제
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* 후가공 옵션 */}
          <div className="space-y-3">
            <Label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
              <Settings className="h-4 w-4 text-emerald-500" />
              후가공 옵션
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {finishingChildren.length > 0 ? (
                finishingChildren.map(group => (
                  <label
                    key={group.id}
                    className={`
                      flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all
                      ${finishingOptions[group.id]
                        ? 'border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-100'
                        : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300'
                      }
                    `}
                  >
                    <Checkbox
                      id={group.id}
                      checked={finishingOptions[group.id] || false}
                      onCheckedChange={(checked) => setFinishingOptions(prev => ({ ...prev, [group.id]: !!checked }))}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <span className="text-[13px] font-medium text-slate-700">{group.name}</span>
                    {(group._count?.children ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-auto">
                        {group._count?.children}
                      </Badge>
                    )}
                  </label>
                ))
              ) : (
                <p className="text-xs text-slate-400 col-span-3 text-center py-4">
                  {isTreeLoading ? '로딩 중...' : '후가공 옵션이 설정되지 않았습니다. 기초정보 > 가격관리에서 후가공옵션 그룹을 추가하세요.'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 옵션정보 섹션 */}
      <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200/80 rounded-xl">
        <SectionHeader
          icon={Settings}
          title="옵션정보"
          subtitle="주문 시 선택 가능한 추가 옵션을 설정합니다"
          theme="violet"
          actions={
            <Button type="button" size="sm" variant="outline" onClick={() => setOptionDialogOpen(true)} className="gap-1.5 h-8 text-xs border-slate-200">
              <Plus className="h-3.5 w-3.5" />
              옵션 추가
            </Button>
          }
        />
        <CardContent className="px-6 pb-6 pt-2">
          {customOptions.length > 0 ? (
            <div className="rounded-lg border border-slate-200/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-medium">옵션명</TableHead>
                    <TableHead className="text-xs font-medium">타입</TableHead>
                    <TableHead className="text-xs font-medium">수량</TableHead>
                    <TableHead className="text-xs font-medium">옵션값</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customOptions.map((opt) => (
                    <TableRow key={opt.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-[13px]">{opt.name}</TableCell>
                      <TableCell>
                        <Badge variant={opt.type === 'required' ? 'default' : 'secondary'} className="text-[10px] h-5">
                          {opt.type === 'select' ? '선택옵션' : '필수옵션'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[13px] text-slate-500">
                        {opt.quantityType === 'auto' ? '자동수량' : '선택수량'}
                      </TableCell>
                      <TableCell className="text-[13px] text-slate-600">
                        {opt.values.map(v => `${v.name}(${v.price.toLocaleString()}원)`).join(', ')}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCustomOptions(prev => prev.filter(o => o.id !== opt.id))}
                          className="h-7 w-7 p-0 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                <Settings className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">등록된 옵션이 없습니다</p>
              <p className="text-xs mt-1 text-slate-400">상단의 &apos;옵션 추가&apos; 버튼을 클릭하여 옵션을 추가하세요</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세이미지 섹션 */}
      <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200/80 rounded-xl">
        <SectionHeader
          icon={ImageIcon}
          title="상품 이미지"
          subtitle="썸네일 및 상세 이미지를 등록합니다"
          theme="amber"
        />
        <CardContent className="px-6 pb-6 pt-2">
          <div className="grid grid-cols-6 gap-3">
            {/* 썸네일 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Thumbnail</span>
              </div>
              <div
                className={`
                  relative aspect-square rounded-lg overflow-hidden transition-all
                  ${thumbnailUrl
                    ? 'ring-2 ring-amber-200 shadow-sm'
                    : dragOver === -1
                      ? 'bg-amber-50 border-2 border-dashed border-amber-300 shadow-inner'
                      : 'bg-slate-50 border-2 border-dashed border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
                  }
                `}
                onDragOver={(e) => handleDragOver(e, -1)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, -1)}
              >
                {thumbnailUrl ? (
                  <>
                    <img src={normalizeImageUrl(thumbnailUrl)} alt="썸네일" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center group">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={() => setThumbnailUrl('')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center h-full gap-1.5 text-slate-400 p-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Upload className="h-4 w-4 text-amber-500" />
                    </div>
                    <span className="text-[10px] text-center leading-tight text-slate-400">클릭 또는 드래그</span>
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

            {/* 상세이미지 1~5 */}
            {detailImages.map((img, idx) => (
              <div key={idx} className="space-y-1.5">
                <span className="text-[11px] font-medium text-slate-400">상세 {idx + 1}</span>
                <div
                  className={`
                    relative aspect-square rounded-lg overflow-hidden transition-all
                    ${img
                      ? 'ring-1 ring-slate-200 shadow-sm'
                      : dragOver === idx
                        ? 'bg-blue-50 border-2 border-dashed border-blue-300 shadow-inner'
                        : 'bg-slate-50/60 border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                >
                  {img ? (
                    <>
                      <img src={normalizeImageUrl(img)} alt={`상세${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center group">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          onClick={() => {
                            const newImages = [...detailImages];
                            newImages[idx] = '';
                            setDetailImages(newImages);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center h-full gap-1.5 text-slate-400 p-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-slate-300" />
                      </div>
                      <span className="text-[10px] text-center leading-tight text-slate-400">클릭 또는 드래그</span>
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
      <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200/80 rounded-xl">
        <SectionHeader
          icon={FileText}
          title="상세정보 편집"
          subtitle="상품 상세 설명을 작성합니다"
          theme="slate"
        />
        <CardContent className="px-6 pb-6 pt-2">
          {isFormReady ? (
            <ProductEditor
              key={product?.id || 'new'}
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
          ) : (
            <div className="h-[300px] bg-slate-50 animate-pulse rounded-lg flex items-center justify-center text-slate-400">
              데이터 로딩 중...
            </div>
          )}
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-center gap-3 pt-6 pb-2">
        <Button
          onClick={handleSubmit}
          disabled={updateProduct.isPending}
          size="lg"
          className="px-10 h-11 bg-slate-900 hover:bg-slate-800 shadow-md text-sm font-medium rounded-lg"
        >
          {updateProduct.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          상품 수정
        </Button>
        <Button variant="outline" size="lg" onClick={() => router.back()} className="h-11 px-8 text-sm rounded-lg">
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
              { key: 'indigo', label: '인디고앨범' },
              { key: 'inkjet', label: '잉크젯' },
              { key: 'album', label: '잉크젯앨범' },
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
            selectedBindings={selectedBindings}
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
    </div>
  );
}

// 출력단가 선택 폼 컴포넌트 (새로운 방식)
function OutputPriceSelectionForm({
  selectedOutputPrices,
  onSelect,
  onCancel,
  productionGroupTree,
  selectedBindings,
}: {
  selectedOutputPrices: OutputPriceSelection[];
  onSelect: (prices: OutputPriceSelection[]) => void;
  onCancel: () => void;
  productionGroupTree?: ProductionGroup[];
  selectedBindings?: { id: string; name: string; price: number; productionSettingId?: string; pricingType?: string }[];
}) {
  // 스타화보 등 화보류 제본이 선택되었는지 확인 (화보류는 인디고만 가능)
  const isHwaboBinding = selectedBindings?.some(b =>
    b.name.includes('화보') || b.name.includes('스타제본') || b.name.includes('포토북')
  ) || false;
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

  // 규격 목록 로드 (규격명 표시용)
  const { data: specificationsList } = useSpecifications();

  // 규격명 찾기 헬퍼
  const getSpecName = (specId: string): string => {
    const spec = specificationsList?.find(s => s.id === specId);
    return spec ? spec.name : specId;
  };

  // 인디고 Up별 가격 가져오기 헬퍼 함수 (indigoUpPrices 또는 priceGroups.upPrices)
  const getIndigoUpPrices = (setting: ProductionSetting): IndigoUpPrice[] => {
    if (setting.indigoUpPrices && setting.indigoUpPrices.length > 0) {
      return setting.indigoUpPrices;
    }
    if (setting.priceGroups && setting.priceGroups.length > 0) {
      const allUpPrices: IndigoUpPrice[] = [];
      setting.priceGroups.forEach(group => {
        if (group.upPrices && group.upPrices.length > 0) {
          allUpPrices.push(...group.upPrices);
        }
      });
      return allUpPrices;
    }
    return [];
  };

  // 설정에 인디고 Up별 가격이 있는지 확인
  const hasIndigoUpPrices = (setting: ProductionSetting): boolean => {
    return getIndigoUpPrices(setting).length > 0;
  };

  // 잉크젯 규격 가격 가져오기 헬퍼 함수 (inkjetSpecPrices 또는 priceGroups.specPrices)
  const getInkjetSpecPrices = (setting: ProductionSetting): InkjetSpecPrice[] => {
    // 직접 inkjetSpecPrices가 있으면 사용
    if (setting.inkjetSpecPrices && setting.inkjetSpecPrices.length > 0) {
      return setting.inkjetSpecPrices;
    }
    // priceGroups에서 specPrices 추출
    if (setting.priceGroups && setting.priceGroups.length > 0) {
      const allSpecPrices: InkjetSpecPrice[] = [];
      setting.priceGroups.forEach(group => {
        if (group.specPrices && group.specPrices.length > 0) {
          allSpecPrices.push(...group.specPrices);
        }
      });
      return allSpecPrices;
    }
    return [];
  };

  // 설정에 잉크젯 규격이 있는지 확인
  const hasInkjetSpecs = (setting: ProductionSetting): boolean => {
    return getInkjetSpecPrices(setting).length > 0;
  };

  // paper_output_spec 타입의 설정만 필터링
  const { data: productionSettings } = useProductionSettings({
    pricingType: 'paper_output_spec',
    isActive: true,
  });

  // 출력방식에 따라 필터링된 설정 목록
  const filteredSettings = productionSettings?.filter(setting => {
    if (!outputMethod) return false;
    if (outputMethod === 'INDIGO') {
      return setting.printMethod === 'indigo' || hasIndigoUpPrices(setting);
    } else {
      return setting.printMethod === 'inkjet' || hasInkjetSpecs(setting);
    }
  }) || [];

  // 그룹 트리에서 설정 찾기
  const findSettingsInGroup = (group: ProductionGroup): ProductionSetting[] => {
    const settings: ProductionSetting[] = [];
    if (group.settings) {
      const filtered = group.settings.filter(s => {
        if (s.pricingType !== 'paper_output_spec') return false;
        if (outputMethod === 'INDIGO') {
          return s.printMethod === 'indigo' || hasIndigoUpPrices(s);
        } else if (outputMethod === 'INKJET') {
          return s.printMethod === 'inkjet' || hasInkjetSpecs(s);
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
    setStep(3); // 세부 옵션 선택으로 이동
  };

  // 추가 버튼
  const handleAddSelection = () => {
    if (!outputMethod || !selectedSetting) return;

    if (outputMethod === 'INDIGO') {
      // 인디고 출력: 4도와 6도 둘 다 자동 추가 (고객이 선택)
      // 중복 체크: 같은 productionSettingId + colorType 조합이 있으면 추가하지 않음
      const exists4do = localSelected.some(
        s => s.productionSettingId === selectedSetting.id && s.colorType === '4도'
      );
      const exists6do = localSelected.some(
        s => s.productionSettingId === selectedSetting.id && s.colorType === '6도'
      );

      const newSelections: OutputPriceSelection[] = [];

      if (!exists4do) {
        newSelections.push({
          id: `${Date.now()}-4do-${Math.random().toString(36).substr(2, 9)}`,
          outputMethod,
          productionSettingId: selectedSetting.id,
          productionSettingName: selectedSetting.settingName || selectedSetting.codeName || '단가설정',
          colorType: '4도',
          selectedUpPrices: getIndigoUpPrices(selectedSetting),
        });
      }

      if (!exists6do) {
        newSelections.push({
          id: `${Date.now()}-6do-${Math.random().toString(36).substr(2, 9)}`,
          outputMethod,
          productionSettingId: selectedSetting.id,
          productionSettingName: selectedSetting.settingName || selectedSetting.codeName || '단가설정',
          colorType: '6도',
          selectedUpPrices: getIndigoUpPrices(selectedSetting),
        });
      }

      if (newSelections.length > 0) {
        setLocalSelected(prev => [...prev, ...newSelections]);
      }
    } else if (outputMethod === 'INKJET' && selectedSpecId) {
      // 잉크젯 출력 - 헬퍼 함수를 사용해서 규격 가격 찾기
      // 중복 체크: 같은 productionSettingId + specificationId 조합이 있으면 추가하지 않음
      const existsInkjet = localSelected.some(
        s => s.productionSettingId === selectedSetting.id && s.specificationId === selectedSpecId
      );

      if (!existsInkjet) {
        const inkjetSpecs = getInkjetSpecPrices(selectedSetting);
        const specPrice = inkjetSpecs.find(p => p.specificationId === selectedSpecId);
        if (specPrice) {
          const newSelection: OutputPriceSelection = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            outputMethod,
            productionSettingId: selectedSetting.id,
            productionSettingName: selectedSetting.settingName || selectedSetting.codeName || '단가설정',
            specificationId: selectedSpecId,
            selectedSpecPrice: specPrice,
          };
          setLocalSelected(prev => [...prev, newSelection]);
        }
      }
    }

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

  // 컴팩트 그룹 트리 렌더링 (Step 1에서 출력방식 선택 시 하단에 표시)
  const renderGroupTreeCompact = (groups: ProductionGroup[], method: 'INDIGO' | 'INKJET', depth = 0): React.ReactNode[] => {
    return groups.map(group => {
      // 해당 출력방식에 맞는 설정만 필터링
      const filteredGroupSettings = group.settings?.filter(s => {
        if (s.pricingType !== 'paper_output_spec') return false;
        if (method === 'INDIGO') {
          return s.printMethod === 'indigo' || hasIndigoUpPrices(s);
        } else {
          return s.printMethod === 'inkjet' || hasInkjetSpecs(s);
        }
      }) || [];

      const hasSettings = filteredGroupSettings.length > 0;
      const hasChildren = group.children && group.children.length > 0;
      const childrenWithSettings = group.children?.filter(child => {
        const childSettings = child.settings?.filter(s => {
          if (s.pricingType !== 'paper_output_spec') return false;
          if (method === 'INDIGO') {
            return s.printMethod === 'indigo' || hasIndigoUpPrices(s);
          } else {
            return s.printMethod === 'inkjet' || hasInkjetSpecs(s);
          }
        }) || [];
        return childSettings.length > 0 || (child.children && child.children.length > 0);
      }) || [];

      if (!hasSettings && childrenWithSettings.length === 0) return null;

      const isExpanded = expandedGroups.has(group.id);

      return (
        <div key={group.id} style={{ marginLeft: depth * 12 }}>
          {/* 그룹 헤더 */}
          <div
            className="flex items-center gap-1.5 py-1.5 px-2 rounded cursor-pointer hover:bg-slate-100 text-xs"
            onClick={() => toggleGroup(group.id)}
          >
            {(hasChildren || childrenWithSettings.length > 0) ? (
              isExpanded ? (
                <ChevronDown className="h-3 w-3 text-slate-400" />
              ) : (
                <ChevronRight className="h-3 w-3 text-slate-400" />
              )
            ) : (
              <div className="w-3" />
            )}
            <Folder className="h-3 w-3 text-amber-500" />
            <span className="font-medium">{group.name}</span>
            <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
              {filteredGroupSettings.length}
            </Badge>
          </div>

          {/* 설정 목록 */}
          {isExpanded && filteredGroupSettings.length > 0 && (
            <div className="ml-5 space-y-0.5 mb-1">
              {filteredGroupSettings.map(setting => (
                <div
                  key={setting.id}
                  className={`flex items-center gap-1.5 py-1.5 px-2 rounded cursor-pointer text-xs transition-all ${selectedSettingId === setting.id
                    ? 'bg-emerald-100 border border-emerald-400 font-medium'
                    : 'bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  onClick={() => {
                    setSelectedSettingId(setting.id);
                    setSelectedSetting(setting);
                    setStep(3); // 세부 옵션으로 이동
                  }}
                >
                  <Settings className="h-3 w-3 text-emerald-600" />
                  <span className="truncate flex-1">{setting.settingName || setting.codeName}</span>
                </div>
              ))}
            </div>
          )}

          {/* 하위 그룹 */}
          {isExpanded && childrenWithSettings.length > 0 && renderGroupTreeCompact(childrenWithSettings, method, depth + 1)}
        </div>
      );
    });
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
            className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-slate-100 ${selectedGroupId === group.id ? 'bg-blue-50' : ''
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
                    return s.printMethod === 'indigo' || hasIndigoUpPrices(s);
                  } else if (outputMethod === 'INKJET') {
                    return s.printMethod === 'inkjet' || hasInkjetSpecs(s);
                  }
                  return false;
                })
                .map(setting => (
                  <div
                    key={setting.id}
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-emerald-50 ${selectedSettingId === setting.id ? 'bg-emerald-100 border border-emerald-300' : 'bg-white border border-slate-200'
                      }`}
                    onClick={() => handleSelectSetting(setting)}
                  >
                    <Settings className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">{setting.settingName || setting.codeName}</span>
                    {setting.printMethod && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {setting.printMethod === 'indigo' ? '인디고앨범' : '잉크젯'}
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
          { num: 3, label: '세부옵션' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${step >= s.num
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
            <div className="space-y-3">
              <button
                type="button"
                className={`w-full p-6 rounded-xl border-2 transition-all ${outputMethod === 'INDIGO'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                  }`}
                onClick={() => {
                  setOutputMethod(outputMethod === 'INDIGO' ? null : 'INDIGO');
                  setSelectedSetting(null);
                  setSelectedSettingId('');
                }}
              >
                <div className="text-3xl mb-2">🖨️</div>
                <div className="font-semibold text-lg">인디고 출력</div>
                <div className="text-sm text-slate-500 mt-1">4도/6도 선택, Up별 가격</div>
              </button>
              {/* 인디고 출력 선택 시 하단에 세팅 목록 표시 */}
              {outputMethod === 'INDIGO' && (
                <div className="border rounded-lg p-3 bg-emerald-50/50 max-h-[250px] overflow-y-auto">
                  <p className="text-xs font-medium text-slate-600 mb-2">단가설정 선택</p>
                  {productionGroupTree && productionGroupTree.length > 0 ? (
                    <div className="space-y-1">
                      {renderGroupTreeCompact(productionGroupTree, 'INDIGO')}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">등록된 단가설정이 없습니다.</p>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <button
                type="button"
                disabled={isHwaboBinding}
                className={`w-full p-6 rounded-xl border-2 transition-all ${isHwaboBinding
                  ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                  : outputMethod === 'INKJET'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                onClick={() => {
                  if (isHwaboBinding) return;
                  setOutputMethod(outputMethod === 'INKJET' ? null : 'INKJET');
                  setSelectedSetting(null);
                  setSelectedSettingId('');
                }}
              >
                <div className="text-3xl mb-2">💧</div>
                <div className="font-semibold text-lg">잉크젯 출력</div>
                <div className="text-sm text-slate-500 mt-1">규격별 가격</div>
                {isHwaboBinding && (
                  <div className="text-xs text-red-500 mt-2">※ 화보/스타제본/포토북은 인디고만 가능</div>
                )}
              </button>
              {/* 잉크젯 출력 선택 시 하단에 세팅 목록 표시 */}
              {outputMethod === 'INKJET' && !isHwaboBinding && (
                <div className="border rounded-lg p-3 bg-blue-50/50 max-h-[250px] overflow-y-auto">
                  <p className="text-xs font-medium text-slate-600 mb-2">단가설정 선택</p>
                  {productionGroupTree && productionGroupTree.length > 0 ? (
                    <div className="space-y-1">
                      {renderGroupTreeCompact(productionGroupTree, 'INKJET')}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">등록된 단가설정이 없습니다.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: 단가설정 선택 (트리) */}
      {step === 2 && outputMethod && (
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">
              {outputMethod === 'INDIGO' ? '인디고앨범' : '잉크젯'} 출력 단가설정을 선택해주세요.
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
      {step === 3 && selectedSetting && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500">세부 옵션을 선택해주세요.</p>
              <p className="text-sm font-medium mt-1">
                선택된 설정: <span className="text-emerald-600">{selectedSetting.settingName || selectedSetting.codeName}</span>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> 이전
            </Button>
          </div>

          {outputMethod === 'INDIGO' && (
            <>
              {/* 4도/6도 자동 추가 안내 */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">💡 4도/6도 자동 추가:</span> 추가 버튼 클릭 시 4도와 6도가 모두 등록됩니다.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  고객이 주문 시 4도/6도 중 선택할 수 있습니다.
                </p>
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
                {(() => {
                  const inkjetSpecs = getInkjetSpecPrices(selectedSetting);
                  return inkjetSpecs.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="w-12">선택</TableHead>
                            <TableHead>규격명</TableHead>
                            <TableHead className="text-right">가격</TableHead>
                            <TableHead className="text-center">기준규격</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inkjetSpecs.map((specPrice) => (
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
                              <TableCell className="font-medium">{getSpecName(specPrice.specificationId)}</TableCell>
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
                  );
                })()}
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
                        : `잉크젯 - ${selection.specificationId ? getSpecName(selection.specificationId) : '규격 미선택'}`}
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

  // 가격타입 라벨
  const getPricingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      nup_page_range: '구간별 Nup/1p가격',
      binding_page: '제본 페이지당',
      paper_output_spec: '용지별출력단가',
    };
    return labels[type] || type;
  };

  // 설정 선택/해제
  const toggleSetting = (setting: ProductionSetting, groupName: string) => {
    setLocalSelected(prev => {
      const exists = prev.find(b => b.productionSettingId === setting.id);
      if (exists) {
        return prev.filter(b => b.productionSettingId !== setting.id);
      } else {
        const bindingName = setting.settingName || setting.codeName || '설정';
        const pricingLabel = getPricingTypeLabel(setting.pricingType);
        return [...prev, {
          id: Date.now().toString(),
          name: `${bindingName} (${pricingLabel})`,
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
                      {setting.settingName || setting.codeName || '설정'}
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

