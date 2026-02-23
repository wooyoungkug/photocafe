'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { useCategories } from '@/hooks/use-categories';
import { useSpecifications } from '@/hooks/use-specifications';
import { useHalfProducts } from '@/hooks/use-half-products';
import { useCreateProduct, useProductTypes, useProcessTemplates, useProductTypeOptions } from '@/hooks/use-products';
import { ProcessFlowSection } from '../components/ProcessFlowSection';
import { useProductionGroupTree, useProductionSettings, type ProductionGroup, type ProductionSetting, type OutputPriceSelection, type IndigoUpPrice, type InkjetSpecPrice } from '@/hooks/use-production';
import { useFabrics, FABRIC_CATEGORY_LABELS, type FabricCategory } from '@/hooks/use-fabrics';
import { useToast } from '@/hooks/use-toast';
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
  Factory,
  Printer,
  Shirt,
  MessageSquare,
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
  { value: 'customer', label: '단면/양면 고객선택' },
];

// 출력방법 옵션 (단품출력용)
const OUTPUT_METHOD_OPTIONS = [
  { value: 'inkjet', label: '잉크젯출력' },
  { value: 'indigo', label: '인디고출력' },
];


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

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: categories } = useCategories();
  const { data: specifications } = useSpecifications();
  const { data: halfProductsData } = useHalfProducts({ limit: 100 });
  const createProduct = useCreateProduct();
  const { data: productionGroupTree, isLoading: isTreeLoading } = useProductionGroupTree();
  const { data: fabricsData } = useFabrics({ forAlbumCover: true, isActive: true, limit: 200 });

  // 상품 유형 선택
  const [selectedProductType, setSelectedProductType] = useState<string>('');
  const { data: productTypes } = useProductTypes();
  const { data: processSteps } = useProcessTemplates(selectedProductType || undefined);
  const { data: typeOptions } = useProductTypeOptions(selectedProductType || undefined);

  // 후가공옵션 카테고리 (ProductionGroup 트리에서 동적 로딩)
  const finishingGroup = useMemo(() => {
    if (!productionGroupTree) return null;
    return productionGroupTree.find(g => g.name === '후가공옵션' || g.name === '후가공') || null;
  }, [productionGroupTree]);

  const finishingChildren: ProductionGroup[] = useMemo(() => {
    if (!finishingGroup?.children) return [];
    return finishingGroup.children.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [finishingGroup]);

  // 후가공 중분류별 세팅값 로딩
  const { data: allFinishingSettings } = useProductionSettings({ isActive: true });

  const finishingGroupSettings = useMemo(() => {
    if (!allFinishingSettings || !finishingChildren.length) return {} as Record<string, ProductionSetting[]>;
    const result: Record<string, ProductionSetting[]> = {};
    for (const group of finishingChildren) {
      result[group.id] = allFinishingSettings
        .filter(s => s.groupId === group.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return result;
  }, [allFinishingSettings, finishingChildren]);

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
  const [requiresUpload, setRequiresUpload] = useState(false);
  const [useCopperPlate, setUseCopperPlate] = useState(false);
  const [hasCoverFabric, setHasCoverFabric] = useState(false);
  const [showOrderMemo, setShowOrderMemo] = useState(false);
  const [showBinding, setShowBinding] = useState(true);
  const [showCover, setShowCover] = useState(false);
  const [memberType, setMemberType] = useState<'all' | 'member_only' | 'specific_groups'>('all');
  const [sortOrder, setSortOrder] = useState(0);

  // 가격정보
  const [basePrice, setBasePrice] = useState(0);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [selectedHalfProductId, setSelectedHalfProductId] = useState('');
  const [selectedBindings, setSelectedBindings] = useState<{ id: string; name: string; price: number }[]>([]);
  const [bindingDirection, setBindingDirection] = useState<'left' | 'right' | 'customer'>('left');
  const [printType, setPrintType] = useState<'single' | 'double' | 'customer'>('double');
  const [outputMethod, setOutputMethod] = useState<'inkjet' | 'indigo'>('inkjet');
  const [selectedCovers, setSelectedCovers] = useState<{ id: string; name: string; price: number }[]>([]);
  const [selectedFoils, setSelectedFoils] = useState<{ id: string; name: string; color: string; price: number }[]>([]);

  // 출력단가 선택
  const [outputPriceSelections, setOutputPriceSelections] = useState<OutputPriceSelection[]>([]);
  const [outputPriceDialogOpen, setOutputPriceDialogOpen] = useState(false);

  // 후가공정보: groupId → settingId[] (복수 선택, '__enabled__' = 세팅 없는 그룹용)
  const [finishingOptions, setFinishingOptions] = useState<Record<string, string[]>>({});

  // 앨범 표지 원단
  const [selectedFabricIds, setSelectedFabricIds] = useState<string[]>([]);

  // 옵션정보
  const [customOptions, setCustomOptions] = useState<ProductOption[]>([]);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);

  // 이미지
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [detailImages, setDetailImages] = useState<string[]>(['', '', '', '', '']);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // 상세정보
  const [description, setDescription] = useState('');

  // 선택 다이얼로그
  const [specDialogOpen, setSpecDialogOpen] = useState(false);
  const [halfProductDialogOpen, setHalfProductDialogOpen] = useState(false);
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [foilDialogOpen, setFoilDialogOpen] = useState(false);

  // 규격 타입 선택
  const [specType, setSpecType] = useState<'indigo' | 'indigoAlbum' | 'inkjet' | 'album' | 'frame' | 'booklet'>('album');

  // 규격 타입별 필터링 (면적 오름차순 정렬)
  const getFilteredSpecs = (type: typeof specType) => {
    if (!specifications) return [];
    let filtered: typeof specifications = [];
    switch (type) {
      case 'indigo': filtered = specifications.filter(s => s.forIndigo); break;
      case 'indigoAlbum': filtered = specifications.filter(s => s.forIndigoAlbum); break;
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

  // 자동 상품코드 생성
  useEffect(() => {
    if (!productCode) {
      const timestamp = Date.now().toString().slice(-6);
      setProductCode(`S${timestamp}`);
    }
  }, []);

  // 상품 유형 변경 시 기본값 자동 설정
  useEffect(() => {
    if (typeOptions) {
      if (typeOptions.printType) setPrintType(typeOptions.printType);
      if (typeOptions.bindingDirection) setBindingDirection(typeOptions.bindingDirection);
      if (typeOptions.paperPrintMethod) setOutputMethod(typeOptions.paperPrintMethod);
      // 규격 탭 자동 전환
      if (typeOptions.specFilterType) {
        const specTabMap: Record<string, typeof specType> = {
          indigoAlbum: 'indigoAlbum',
          inkjet: 'inkjet',
          frame: 'frame',
          booklet: 'booklet',
        };
        setSpecType(specTabMap[typeOptions.specFilterType] || 'album');
      }
    }
  }, [typeOptions]);

  // 섹션 표시 여부 판단 (범용 모드이면 모두 표시)
  const shouldShow = (option: string): boolean => {
    if (!selectedProductType || !typeOptions) return true; // 범용 모드
    return typeOptions[`show${option.charAt(0).toUpperCase()}${option.slice(1)}` as keyof typeof typeOptions] as boolean;
  };

  const handleImageUpload = async (file: File, index: number) => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (!token) {
      toast({ variant: 'destructive', title: '로그인이 필요합니다.' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/upload/product-image`, {
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
        productType: selectedProductType || undefined,
        productCode,
        productName,
        categoryId: finalCategoryId,
        basePrice,
        isActive,
        isNew,
        isBest,
        requiresUpload,
        useCopperPlate,
        hasCoverFabric,
        showOrderMemo,
        showBinding,
        showCover,
        memberType,
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
          price: Number(b.price) || 0,
          isDefault: idx === 0,
          sortOrder: idx,
        })),
        covers: selectedCovers.map((c, idx) => ({
          name: c.name, price: Number(c.price) || 0, isDefault: idx === 0, sortOrder: idx,
        })),
        foils: selectedFoils.map((f, idx) => ({
          name: f.name, color: f.color, price: Number(f.price) || 0, isDefault: idx === 0, sortOrder: idx,
        })),
        finishings: Object.entries(finishingOptions)
          .filter(([, values]) => values.length > 0)
          .flatMap(([groupId, values]) => {
            const group = finishingChildren.find(c => c.id === groupId);
            return values.map((value) => {
              if (value === '__enabled__') {
                return { name: group?.name || groupId, productionGroupId: groupId, price: 0, isDefault: false, sortOrder: 0 };
              }
              const setting = allFinishingSettings?.find(s => s.id === value);
              return {
                name: setting?.settingName || group?.name || groupId,
                productionGroupId: groupId,
                price: Number(setting?.basePrice) || 0,
                isDefault: false,
                sortOrder: 0,
              };
            });
          })
          .map((f, idx) => ({ ...f, sortOrder: idx })),
        fabricIds: selectedFabricIds,
        outputPriceSettings: outputPriceSelections.length > 0
          ? outputPriceSelections.map(sel => ({
              outputMethod: sel.outputMethod,
              productionSettingId: sel.productionSettingId,
              productionSettingName: sel.productionSettingName,
              colorType: sel.colorType,
              selectedUpPrices: sel.selectedUpPrices,
              specificationId: sel.specificationId,
              selectedSpecPrice: sel.selectedSpecPrice,
            }))
          : undefined,
      };

      console.log('[상품등록] 전송 데이터:', JSON.stringify(productData, null, 2));
      await createProduct.mutateAsync(productData);
      toast({ variant: 'success', title: '상품이 등록되었습니다.' });
      router.push('/products');
    } catch (error) {
      console.error('[상품등록] 오류:', error);
      toast({
        variant: 'destructive',
        title: '상품 등록 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
      });
    }
  };

  return (
    <div className="space-y-5 pb-10 max-w-[1200px] mx-auto">
      <PageHeader
        title={selectedProductType
          ? `${productTypes?.find(pt => pt.value === selectedProductType)?.label || ''} 상품 등록`
          : '상품 등록'}
        description="새로운 상품을 등록합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '상품관리', href: '/products' },
          { label: '상품등록' },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        }
      />

      {/* 상품 유형 선택 */}
      <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200/80 rounded-xl">
        <SectionHeader icon={Factory} title="상품 유형" subtitle="등록할 상품 유형을 선택하면 필요한 옵션만 표시됩니다" theme="violet" />
        <CardContent className="px-6 pb-5 pt-2">
          <div className="grid grid-cols-5 gap-3">
            {/* 범용(직접설정) 옵션 */}
            <button
              type="button"
              onClick={() => setSelectedProductType('')}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedProductType === '' ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-medium text-sm text-slate-700">범용 (직접설정)</div>
              <div className="text-xs text-slate-400 mt-0.5">모든 옵션 표시</div>
            </button>
            {/* 상품 유형 버튼들 */}
            {productTypes?.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => setSelectedProductType(pt.value)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedProductType === pt.value ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-medium text-sm text-slate-700">{pt.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{pt.stepCount}단계 공정</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 공정 프로세스 시각화 */}
      {processSteps && processSteps.length > 0 && (
        <ProcessFlowSection steps={processSteps} />
      )}

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
              <div className="space-y-2">
                {/* 1행: 판매 설정 */}
                <div className="flex gap-2">
                  <span className="text-[11px] text-slate-400 font-medium self-center w-12 shrink-0">판매</span>
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${isActive ? 'bg-emerald-50/80 border-emerald-200 ring-1 ring-emerald-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                      {isActive ? <Eye className="h-3 w-3 text-white" /> : <EyeOff className="h-3 w-3 text-slate-400" />}
                    </div>
                    <span className={`text-[12px] font-medium ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>활성화</span>
                    <Switch checked={isActive} onCheckedChange={setIsActive} className="ml-0.5 scale-90 data-[state=checked]:bg-emerald-500" />
                  </label>
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${isNew ? 'bg-blue-50/80 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isNew ? 'bg-blue-500' : 'bg-slate-200'}`}>
                      <Sparkles className={`h-3 w-3 ${isNew ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[12px] font-medium ${isNew ? 'text-blue-700' : 'text-slate-500'}`}>신상품</span>
                    <Switch checked={isNew} onCheckedChange={setIsNew} className="ml-0.5 scale-90 data-[state=checked]:bg-blue-500" />
                  </label>
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${isBest ? 'bg-amber-50/80 border-amber-200 ring-1 ring-amber-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isBest ? 'bg-amber-500' : 'bg-slate-200'}`}>
                      <Star className={`h-3 w-3 ${isBest ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[12px] font-medium ${isBest ? 'text-amber-700' : 'text-slate-500'}`}>베스트</span>
                    <Switch checked={isBest} onCheckedChange={setIsBest} className="ml-0.5 scale-90 data-[state=checked]:bg-amber-500" />
                  </label>
                </div>
                {/* 2행: 제작 옵션 */}
                <div className="flex gap-2">
                  <span className="text-[11px] text-slate-400 font-medium self-center w-12 shrink-0">제작</span>
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${showBinding ? 'bg-indigo-50/80 border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${showBinding ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                      <Layers className={`h-3 w-3 ${showBinding ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[12px] font-medium ${showBinding ? 'text-indigo-700' : 'text-slate-500'}`}>제본</span>
                    <Switch checked={showBinding} onCheckedChange={setShowBinding} className="ml-0.5 scale-90 data-[state=checked]:bg-indigo-500" />
                  </label>
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${requiresUpload ? 'bg-violet-50/80 border-violet-200 ring-1 ring-violet-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${requiresUpload ? 'bg-violet-500' : 'bg-slate-200'}`}>
                      <Upload className={`h-3 w-3 ${requiresUpload ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[12px] font-medium ${requiresUpload ? 'text-violet-700' : 'text-slate-500'}`}>업로드</span>
                    <Switch checked={requiresUpload} onCheckedChange={setRequiresUpload} className="ml-0.5 scale-90 data-[state=checked]:bg-violet-500" />
                  </label>
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${useCopperPlate ? 'bg-rose-50/80 border-rose-200 ring-1 ring-rose-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${useCopperPlate ? 'bg-rose-500' : 'bg-slate-200'}`}>
                      <Sparkles className={`h-3 w-3 ${useCopperPlate ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[12px] font-medium ${useCopperPlate ? 'text-rose-700' : 'text-slate-500'}`}>동판</span>
                    <Switch checked={useCopperPlate} onCheckedChange={setUseCopperPlate} className="ml-0.5 scale-90 data-[state=checked]:bg-rose-500" />
                  </label>
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${hasCoverFabric ? 'bg-teal-50/80 border-teal-200 ring-1 ring-teal-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${hasCoverFabric ? 'bg-teal-500' : 'bg-slate-200'}`}>
                      <Shirt className={`h-3 w-3 ${hasCoverFabric ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[12px] font-medium ${hasCoverFabric ? 'text-teal-700' : 'text-slate-500'}`}>표지원단</span>
                    <Switch checked={hasCoverFabric} onCheckedChange={setHasCoverFabric} className="ml-0.5 scale-90 data-[state=checked]:bg-teal-500" />
                  </label>
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${showCover ? 'bg-pink-50/80 border-pink-200 ring-1 ring-pink-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${showCover ? 'bg-pink-500' : 'bg-slate-200'}`}>
                      <Palette className={`h-3 w-3 ${showCover ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[12px] font-medium ${showCover ? 'text-pink-700' : 'text-slate-500'}`}>커버</span>
                    <Switch checked={showCover} onCheckedChange={setShowCover} className="ml-0.5 scale-90 data-[state=checked]:bg-pink-500" />
                  </label>
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${showOrderMemo ? 'bg-cyan-50/80 border-cyan-200 ring-1 ring-cyan-100' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${showOrderMemo ? 'bg-cyan-500' : 'bg-slate-200'}`}>
                      <MessageSquare className={`h-3 w-3 ${showOrderMemo ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[12px] font-medium ${showOrderMemo ? 'text-cyan-700' : 'text-slate-500'}`}>주문메모</span>
                    <Switch checked={showOrderMemo} onCheckedChange={setShowOrderMemo} className="ml-0.5 scale-90 data-[state=checked]:bg-cyan-500" />
                  </label>
                </div>
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
                    className="w-20 h-8 text-center text-[13px]"
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
                { key: 'indigoAlbum', label: '인디고앨범' },
                { key: 'indigo', label: '인디고출력' },
                { key: 'inkjet', label: '잉크젯출력' },
                { key: 'album', label: '잉크젯앨범' },
                { key: 'frame', label: '액자' },
                { key: 'booklet', label: '책자' },
              ].map(tab => {
                const tabSpecs = getFilteredSpecs(tab.key as typeof specType);
                const tabSelectedCount = selectedSpecs.filter(specId => tabSpecs.some(s => s.id === specId)).length;
                const isTabActive = specType === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`
                      relative h-8 px-3 text-xs font-medium rounded-md transition-all
                      ${isTabActive
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                      }
                    `}
                    onClick={() => setSpecType(tab.key as typeof specType)}
                  >
                    {tab.label}
                    <span className={`
                      ml-1.5 inline-flex items-center justify-center min-w-[32px] px-1 py-0.5 rounded text-[10px] font-semibold tabular-nums
                      ${isTabActive
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
                              title="규격 제거"
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
            {shouldShow('binding') && showBinding && (
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
                      <span className="font-medium text-[13px] flex-1">{b.name}</span>
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
              {shouldShow('bindingDirection') && (
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
                          onChange={(e) => setBindingDirection(e.target.value as 'left' | 'right' | 'customer')}
                          className="w-3.5 h-3.5 text-emerald-600"
                        />
                        <span className="text-xs">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* 출력단가 선택 */}
            {(shouldShow('outputMethod') || shouldShow('binding') || shouldShow('paper')) && (
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
              {outputPriceSelections.length > 0 && (() => {
                const groups = new Map<string, { name: string; method: string; colorTypes: string[]; specCount: number; ids: string[] }>();
                outputPriceSelections.forEach(sel => {
                  const key = `${sel.productionSettingId}-${sel.outputMethod}`;
                  if (!groups.has(key)) {
                    groups.set(key, { name: sel.productionSettingName, method: sel.outputMethod, colorTypes: [], specCount: 0, ids: [] });
                  }
                  const g = groups.get(key)!;
                  g.ids.push(sel.id);
                  if (sel.outputMethod === 'INDIGO' && sel.colorType) g.colorTypes.push(sel.colorType);
                  else g.specCount++;
                });
                return (
                  <div className="space-y-2 p-3 bg-slate-50 rounded border border-slate-200">
                    {Array.from(groups.values()).map((g, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{g.method === 'INDIGO' ? '🖨️' : '💧'}</span>
                          <div>
                            <p className="font-medium text-[13px]">{g.name}</p>
                            <p className="text-[12px] text-slate-500">
                              {g.method === 'INDIGO'
                                ? `인디고 ${g.colorTypes.join('/')}`
                                : `잉크젯 (${g.specCount}개 규격)`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          title="제거"
                          className="p-1 hover:bg-red-100 rounded-full"
                          onClick={() => setOutputPriceSelections(prev => prev.filter(p => !g.ids.includes(p.id)))}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="pt-2 space-y-1">
                <div className="flex gap-4 items-center">
                  <Label className="text-xs text-slate-500">출력구분</Label>
                  <div className="flex gap-3">
                    {PRINT_TYPE_OPTIONS.map(opt => (
                      <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="printType"
                          value={opt.value}
                          checked={printType === opt.value}
                          onChange={(e) => setPrintType(e.target.value as 'single' | 'double' | 'customer')}
                          className="w-3.5 h-3.5 text-emerald-600"
                        />
                        <span className="text-xs">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* 커버 선택 (커버 토글 ON일 때만 표시) */}
            {shouldShow('cover') && showCover && (
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
            )}

            {/* 박 선택 (동판 토글 ON일 때만 표시) */}
            {shouldShow('foil') && useCopperPlate && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    박 선택
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setFoilDialogOpen(true)} className="gap-1.5 h-7 text-xs border-slate-200">
                    <Plus className="h-3.5 w-3.5" />
                    등판선택
                  </Button>
                </div>
                {selectedFoils.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedFoils.map((f, idx) => (
                      <Badge key={idx} variant="outline" className="bg-white">{f.name}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 앨범 표지 원단 선택 (표지원단 토글 ON일 때만 표시) */}
            {shouldShow('fabric') && hasCoverFabric && (
              <div className="col-span-2 space-y-3">
                <Label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-emerald-500" />
                  앨범 표지 원단
                  {selectedFabricIds.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{selectedFabricIds.length}개 선택</Badge>
                  )}
                </Label>
                {(() => {
                  const allFabrics = fabricsData?.data || [];
                  const categories = [...new Set(allFabrics.map(f => f.category))] as FabricCategory[];
                  if (allFabrics.length === 0) {
                    return <p className="text-xs text-slate-400 py-2">등록된 앨범 커버용 원단이 없습니다. 기초정보 &gt; 표지원단 관리에서 원단을 등록하세요.</p>;
                  }
                  return (
                    <div className="space-y-3 p-3 bg-slate-50/60 rounded-lg border border-slate-200/60">
                      {categories.map(cat => {
                        const catFabrics = allFabrics.filter(f => f.category === cat);
                        const allCatSelected = catFabrics.every(f => selectedFabricIds.includes(f.id));
                        return (
                          <div key={cat} className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const catIds = catFabrics.map(f => f.id);
                                  if (allCatSelected) {
                                    setSelectedFabricIds(prev => prev.filter(id => !catIds.includes(id)));
                                  } else {
                                    setSelectedFabricIds(prev => [...new Set([...prev, ...catIds])]);
                                  }
                                }}
                                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                              >
                                {FABRIC_CATEGORY_LABELS[cat] || cat}
                              </button>
                              <span className="text-[10px] text-slate-400">{catFabrics.filter(f => selectedFabricIds.includes(f.id)).length}/{catFabrics.length}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {catFabrics.map(fabric => {
                                const isSelected = selectedFabricIds.includes(fabric.id);
                                return (
                                  <button
                                    key={fabric.id}
                                    type="button"
                                    onClick={() => setSelectedFabricIds(prev =>
                                      isSelected ? prev.filter(id => id !== fabric.id) : [...prev, fabric.id]
                                    )}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] border transition-all ${
                                      isSelected
                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                    }`}
                                  >
                                    {fabric.colorCode && (
                                      <span className="w-3 h-3 rounded-full border border-white/50 flex-shrink-0" style={{ backgroundColor: fabric.colorCode }} />
                                    )}
                                    {fabric.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {shouldShow('finishing') && (
            <>
              <Separator />

              {/* 후가공 옵션 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-emerald-500" />
                    후가공 옵션
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // 모든 후가공 그룹의 세팅을 전체 선택
                      const allOpts: Record<string, string[]> = {};
                      for (const group of finishingChildren) {
                        const groupSettings = finishingGroupSettings[group.id] ?? [];
                        if (groupSettings.length > 0) {
                          allOpts[group.id] = groupSettings.map(s => s.id);
                        } else {
                          allOpts[group.id] = ['__enabled__'];
                        }
                      }
                      setFinishingOptions(allOpts);
                      toast({ variant: 'success', title: '후가공 단가를 가져왔습니다.' });
                    }}
                    disabled={finishingChildren.length === 0}
                    className="gap-1.5 h-7 text-xs border-slate-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    후가공 단가 가져오기
                  </Button>
                </div>
                {finishingChildren.length > 0 ? (
                  <div className="space-y-2">
                    {finishingChildren.map(group => {
                      const groupSettings = finishingGroupSettings[group.id] ?? [];
                      const selectedValues = finishingOptions[group.id] ?? [];

                      if (groupSettings.length === 0) {
                        // 세팅 없는 그룹: 체크박스 방식
                        return (
                          <label
                            key={group.id}
                            className={`
                              flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all
                              ${selectedValues.includes('__enabled__')
                                ? 'border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-100'
                                : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300'
                              }
                            `}
                          >
                            <Checkbox
                              id={group.id}
                              checked={selectedValues.includes('__enabled__')}
                              onCheckedChange={(checked) =>
                                setFinishingOptions(prev => ({ ...prev, [group.id]: checked ? ['__enabled__'] : [] }))
                              }
                              className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                            <span className="text-[13px] font-medium text-slate-700">{group.name}</span>
                          </label>
                        );
                      }

                      // 세팅 있는 그룹: 중분류명 헤더 + 세팅값 체크박스
                      return (
                        <div key={group.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-[13px] font-medium text-slate-700">{group.name}</span>
                            <div className="flex items-center gap-2">
                              {selectedValues.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  {selectedValues.length}개 선택
                                </Badge>
                              )}
                              {selectedValues.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setFinishingOptions(prev => ({ ...prev, [group.id]: [] }))}
                                  className="text-slate-400 hover:text-slate-600 transition-colors"
                                  title="전체 해제"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 p-2">
                            {groupSettings.map(setting => {
                              const isChecked = selectedValues.includes(setting.id);
                              return (
                                <label
                                  key={setting.id}
                                  className={`
                                    flex items-center gap-1.5 px-2.5 py-1.5 rounded cursor-pointer transition-colors text-[12px]
                                    ${isChecked
                                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                                      : 'hover:bg-slate-100 text-slate-700'
                                    }
                                  `}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) =>
                                      setFinishingOptions(prev => {
                                        const current = prev[group.id] ?? [];
                                        return {
                                          ...prev,
                                          [group.id]: checked
                                            ? [...current, setting.id]
                                            : current.filter(id => id !== setting.id),
                                        };
                                      })
                                    }
                                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                  />
                                  <span>{setting.settingName ?? setting.codeName ?? '-'}</span>
                                  {Number(setting.basePrice) > 0 && (
                                    <span className="text-[10px] text-slate-400 ml-1">
                                      ({Number(setting.basePrice).toLocaleString()}원)
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">
                    {isTreeLoading ? '로딩 중...' : '후가공 옵션이 설정되지 않았습니다. 기초정보 > 가격관리에서 후가공옵션 그룹을 추가하세요.'}
                  </p>
                )}
              </div>
            </>
          )}
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
              <p className="text-[13px] font-medium text-slate-500">등록된 옵션이 없습니다</p>
              <p className="text-[12px] mt-1 text-slate-400">상단의 &apos;옵션 추가&apos; 버튼을 클릭하여 옵션을 추가하세요</p>
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
                    <img src={normalizeImageUrl(thumbnailUrl)} alt="썸네일" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
                      <img src={normalizeImageUrl(img)} alt={`상세${idx + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
          <ProductEditor
            value={description}
            onChange={setDescription}
            placeholder="상품 상세 설명을 입력하세요."
            onImageUpload={async (file: File) => {
              const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
              if (!token) throw new Error('로그인이 필요합니다.');

              const formData = new FormData();
              formData.append('file', file);

              const response = await fetch(`${API_URL}/upload/product-image`, {
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
      <div className="flex justify-center gap-3 pt-6 pb-2">
        <Button
          onClick={handleSubmit}
          disabled={createProduct.isPending}
          size="lg"
          className="px-10 h-11 bg-slate-900 hover:bg-slate-800 shadow-md text-sm font-medium rounded-lg"
        >
          {createProduct.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          상품 등록
        </Button>
        <Button variant="outline" size="lg" onClick={() => router.back()} className="h-11 px-8 text-sm rounded-lg">
          취소
        </Button>
      </div>

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

              // 잉크젯 출력 선택 시 해당 규격을 selectedSpecs에 자동 추가
              const inkjetSpecIds = prices
                .filter(p => p.outputMethod === 'INKJET' && p.specificationId)
                .map(p => p.specificationId as string);
              if (inkjetSpecIds.length > 0) {
                setSelectedSpecs(prev => [...new Set([...prev, ...inkjetSpecIds])]);
                if (specifications) {
                  const firstSpec = specifications.find(s => s.id === inkjetSpecIds[0]);
                  if (firstSpec) {
                    if (firstSpec.forAlbum) setSpecType('album');
                    else if (firstSpec.forInkjet) setSpecType('inkjet');
                    else if (firstSpec.forIndigo) setSpecType('indigo');
                  }
                }
              }

              setOutputPriceDialogOpen(false);
            }}
            onCancel={() => setOutputPriceDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

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
              { key: 'indigoAlbum', label: '인디고앨범' },
              { key: 'indigo', label: '인디고출력' },
              { key: 'inkjet', label: '잉크젯출력' },
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
              <p className="text-[13px] font-medium mb-2">선택된 규격 ({selectedSpecs.length}개)</p>
              <div className="flex flex-wrap gap-2">
                {selectedSpecs.map(specId => {
                  const spec = specifications?.find(s => s.id === specId);
                  return spec ? (
                    <Badge key={specId} variant="secondary" className="flex items-center gap-1">
                      {spec.name}
                      <button
                        type="button"
                        title="규격 제거"
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
                        title="반제품 선택"
                        aria-label={`${hp.name} 선택`}
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
    </div>
  );
}

// 옵션 폼 컴포넌트
// 출력단가 선택 폼 컴포넌트
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
  selectedBindings?: { id: string; name: string; price: number }[];
}) {
  const isHwaboBinding = selectedBindings?.some(b =>
    b.name.includes('화보') || b.name.includes('스타제본') || b.name.includes('포토북')
  ) || false;
  const [step, setStep] = useState(1);
  const [outputMethod, setOutputMethod] = useState<'INDIGO' | 'INKJET' | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedSettingId, setSelectedSettingId] = useState<string>('');
  const [selectedSetting, setSelectedSetting] = useState<ProductionSetting | null>(null);
  const [colorType, setColorType] = useState<'4도' | '6도'>('4도');
  const [selectedSpecId, setSelectedSpecId] = useState<string>('');
  const [localSelected, setLocalSelected] = useState<OutputPriceSelection[]>(selectedOutputPrices);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: specificationsList } = useSpecifications();
  const { data: productionSettings } = useProductionSettings({
    pricingType: 'paper_output_spec',
    isActive: true,
  });

  const getSpecName = (specId: string): string => {
    const spec = specificationsList?.find(s => s.id === specId);
    return spec ? spec.name : specId;
  };

  const getIndigoUpPrices = (setting: ProductionSetting): IndigoUpPrice[] => {
    if (setting.indigoUpPrices && setting.indigoUpPrices.length > 0) return setting.indigoUpPrices;
    if (setting.priceGroups && setting.priceGroups.length > 0) {
      const allUpPrices: IndigoUpPrice[] = [];
      setting.priceGroups.forEach(group => { if (group.upPrices && group.upPrices.length > 0) allUpPrices.push(...group.upPrices); });
      return allUpPrices;
    }
    return [];
  };

  const hasIndigoUpPrices = (setting: ProductionSetting): boolean => getIndigoUpPrices(setting).length > 0;

  const getInkjetSpecPrices = (setting: ProductionSetting): InkjetSpecPrice[] => {
    if (setting.inkjetSpecPrices && setting.inkjetSpecPrices.length > 0) return setting.inkjetSpecPrices;
    if (setting.priceGroups && setting.priceGroups.length > 0) {
      const allSpecPrices: InkjetSpecPrice[] = [];
      setting.priceGroups.forEach(group => { if (group.specPrices && group.specPrices.length > 0) allSpecPrices.push(...group.specPrices); });
      return allSpecPrices;
    }
    return [];
  };

  const hasInkjetSpecs = (setting: ProductionSetting): boolean => getInkjetSpecPrices(setting).length > 0;

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleAddSelection = () => {
    if (!outputMethod || !selectedSetting) return;

    if (outputMethod === 'INDIGO') {
      const exists4do = localSelected.some(s => s.productionSettingId === selectedSetting.id && s.colorType === '4도');
      const exists6do = localSelected.some(s => s.productionSettingId === selectedSetting.id && s.colorType === '6도');
      const newSelections: OutputPriceSelection[] = [];
      if (!exists4do) {
        newSelections.push({
          id: `${Date.now()}-4do-${Math.random().toString(36).substr(2, 9)}`,
          outputMethod, productionSettingId: selectedSetting.id,
          productionSettingName: selectedSetting.settingName || selectedSetting.codeName || '단가설정',
          colorType: '4도', selectedUpPrices: getIndigoUpPrices(selectedSetting),
        });
      }
      if (!exists6do) {
        newSelections.push({
          id: `${Date.now()}-6do-${Math.random().toString(36).substr(2, 9)}`,
          outputMethod, productionSettingId: selectedSetting.id,
          productionSettingName: selectedSetting.settingName || selectedSetting.codeName || '단가설정',
          colorType: '6도', selectedUpPrices: getIndigoUpPrices(selectedSetting),
        });
      }
      if (newSelections.length > 0) setLocalSelected(prev => [...prev, ...newSelections]);
    } else if (outputMethod === 'INKJET') {
      const inkjetSpecs = getInkjetSpecPrices(selectedSetting);
      const newSelections: OutputPriceSelection[] = [];
      inkjetSpecs.forEach(specPrice => {
        const existsInkjet = localSelected.some(s => s.productionSettingId === selectedSetting.id && s.specificationId === specPrice.specificationId);
        if (!existsInkjet) {
          newSelections.push({
            id: `${Date.now()}-${specPrice.specificationId}-${Math.random().toString(36).substr(2, 6)}`,
            outputMethod, productionSettingId: selectedSetting.id,
            productionSettingName: selectedSetting.settingName || selectedSetting.codeName || '단가설정',
            specificationId: specPrice.specificationId, selectedSpecPrice: specPrice,
          });
        }
      });
      if (newSelections.length > 0) setLocalSelected(prev => [...prev, ...newSelections]);
    }

    setStep(1); setOutputMethod(null); setSelectedSettingId(''); setSelectedSetting(null);
    setColorType('4도'); setSelectedSpecId('');
  };

  const renderGroupTreeCompact = (groups: ProductionGroup[], method: 'INDIGO' | 'INKJET', depth = 0): React.ReactNode[] => {
    return groups.map(group => {
      const filteredGroupSettings = group.settings?.filter(s => {
        if (s.pricingType !== 'paper_output_spec') return false;
        if (method === 'INDIGO') return s.printMethod === 'indigo' || hasIndigoUpPrices(s);
        else return s.printMethod === 'inkjet' || hasInkjetSpecs(s);
      }) || [];
      const hasSettings = filteredGroupSettings.length > 0;
      const childrenWithSettings = group.children?.filter(child => {
        const childSettings = child.settings?.filter(s => {
          if (s.pricingType !== 'paper_output_spec') return false;
          if (method === 'INDIGO') return s.printMethod === 'indigo' || hasIndigoUpPrices(s);
          else return s.printMethod === 'inkjet' || hasInkjetSpecs(s);
        }) || [];
        return childSettings.length > 0 || (child.children && child.children.length > 0);
      }) || [];
      if (!hasSettings && childrenWithSettings.length === 0) return null;
      const isExpanded = expandedGroups.has(group.id);
      return (
        <div key={group.id} style={{ marginLeft: depth * 12 }}>
          <div className="flex items-center gap-1.5 py-1.5 px-2 rounded cursor-pointer hover:bg-slate-100 text-xs" onClick={() => toggleGroup(group.id)}>
            {(group.children && group.children.length > 0) || childrenWithSettings.length > 0 ? (
              isExpanded ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />
            ) : <div className="w-3" />}
            <Folder className="h-3 w-3 text-amber-500" />
            <span className="font-medium">{group.name}</span>
            <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">{filteredGroupSettings.length}</Badge>
          </div>
          {isExpanded && filteredGroupSettings.length > 0 && (
            <div className="ml-5 space-y-0.5 mb-1">
              {filteredGroupSettings.map(setting => (
                <div key={setting.id}
                  className={`flex items-center gap-1.5 py-1.5 px-2 rounded cursor-pointer text-xs transition-all ${selectedSettingId === setting.id ? 'bg-emerald-100 border border-emerald-400 font-medium' : 'bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'}`}
                  onClick={() => { setSelectedSettingId(setting.id); setSelectedSetting(setting); setStep(3); }}>
                  <Settings className="h-3 w-3 text-emerald-600" />
                  <span className="truncate flex-1">{setting.settingName || setting.codeName}</span>
                </div>
              ))}
            </div>
          )}
          {isExpanded && childrenWithSettings.length > 0 && renderGroupTreeCompact(childrenWithSettings, method, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 mb-4 px-2">
        {[{ num: 1, label: '출력방식' }, { num: 3, label: '세부옵션' }].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${step >= s.num ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <span>{s.num}</span><span>{s.label}</span>
            </div>
            {idx < 1 && <ChevronRight className={`h-4 w-4 mx-1 ${step > s.num ? 'text-emerald-600' : 'text-slate-300'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex gap-2 mb-3">
            <button type="button"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${outputMethod === 'INDIGO' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50'}`}
              onClick={() => { setOutputMethod(outputMethod === 'INDIGO' ? null : 'INDIGO'); setSelectedSetting(null); setSelectedSettingId(''); }}>
              <span className="text-base">🖨️</span><span>인디고 출력</span><span className="text-xs text-slate-400 font-normal">4도/6도, Up별</span>
            </button>
            <button type="button" disabled={isHwaboBinding}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${isHwaboBinding ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : outputMethod === 'INKJET' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50'}`}
              onClick={() => { if (isHwaboBinding) return; setOutputMethod(outputMethod === 'INKJET' ? null : 'INKJET'); setSelectedSetting(null); setSelectedSettingId(''); }}>
              <span className="text-base">💧</span><span>잉크젯 출력</span><span className="text-xs text-slate-400 font-normal">규격별</span>
            </button>
            {isHwaboBinding && <span className="text-xs text-red-500 self-center ml-1">※ 화보/스타제본/포토북은 인디고만 가능</span>}
          </div>
          {outputMethod && (
            <div className={`border rounded-lg p-3 flex-1 overflow-y-auto ${outputMethod === 'INDIGO' ? 'bg-emerald-50/30 border-emerald-200' : 'bg-blue-50/30 border-blue-200'}`}>
              <p className="text-xs font-medium text-slate-500 mb-2">단가설정을 선택하세요</p>
              {productionGroupTree && productionGroupTree.length > 0 ? (
                <div className="space-y-0.5">{renderGroupTreeCompact(productionGroupTree, outputMethod)}</div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">등록된 단가설정이 없습니다.</p>
              )}
            </div>
          )}
          {!outputMethod && <div className="flex items-center justify-center py-12 text-slate-400 text-sm">출력방식을 선택해주세요.</div>}
        </div>
      )}

      {step === 3 && selectedSetting && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500">세부 옵션을 선택해주세요.</p>
              <p className="text-sm font-medium mt-1">선택된 설정: <span className="text-emerald-600">{selectedSetting.settingName || selectedSetting.codeName}</span></p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>← 이전</Button>
          </div>

          {outputMethod === 'INDIGO' && (
            <>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800"><span className="font-medium">4도/6도 자동 추가:</span> 추가 버튼 클릭 시 4도와 6도가 모두 등록됩니다.</p>
                <p className="text-xs text-blue-600 mt-1">고객이 주문 시 4도/6도 중 선택할 수 있습니다.</p>
              </div>
              {selectedSetting.indigoUpPrices && selectedSetting.indigoUpPrices.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader><TableRow className="bg-slate-50"><TableHead>Up</TableHead><TableHead className="text-right">단면 가격</TableHead><TableHead className="text-right">양면 가격</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selectedSetting.indigoUpPrices.map(upPrice => (
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
              <div className="mb-4">
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800"><span className="font-medium">전체 규격 일괄 추가:</span> 추가 버튼 클릭 시 아래 가격이 설정된 전체 규격이 자동 등록됩니다.</p>
                  <p className="text-xs text-blue-600 mt-1">단면출력 전용 · 규격은 상품 규격에도 자동으로 추가됩니다.</p>
                </div>
                <Label className="text-sm font-medium mb-2 block">등록될 규격 목록 ({getInkjetSpecPrices(selectedSetting).length}개)</Label>
                {(() => {
                  const inkjetSpecs = getInkjetSpecPrices(selectedSetting);
                  return inkjetSpecs.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader><TableRow className="bg-slate-50"><TableHead>규격명</TableHead><TableHead className="text-right">단면가격</TableHead><TableHead className="text-center">기준규격</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {inkjetSpecs.map(specPrice => (
                            <TableRow key={specPrice.specificationId} className="bg-blue-50/30">
                              <TableCell className="font-medium">{getSpecName(specPrice.specificationId)}</TableCell>
                              <TableCell className="text-right">{specPrice.singleSidedPrice.toLocaleString()}원</TableCell>
                              <TableCell className="text-center">{specPrice.isBaseSpec && <Badge variant="secondary">기준</Badge>}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : <p className="text-slate-400 text-sm">등록된 규격이 없습니다.</p>;
                })()}
              </div>
            </>
          )}

          <div className="mt-4">
            <Button type="button" onClick={handleAddSelection} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!selectedSetting}>
              <Plus className="h-4 w-4 mr-2" /> 출력단가 추가
            </Button>
          </div>
        </div>
      )}

      {localSelected.length > 0 && (() => {
        const groups = new Map<string, { name: string; method: string; colorTypes: string[]; specCount: number; ids: string[] }>();
        localSelected.forEach(sel => {
          const key = `${sel.productionSettingId}-${sel.outputMethod}`;
          if (!groups.has(key)) groups.set(key, { name: sel.productionSettingName, method: sel.outputMethod, colorTypes: [], specCount: 0, ids: [] });
          const g = groups.get(key)!;
          g.ids.push(sel.id);
          if (sel.outputMethod === 'INDIGO' && sel.colorType) g.colorTypes.push(sel.colorType);
          else g.specCount++;
        });
        return (
          <div className="p-4 border-t bg-emerald-50">
            <p className="text-sm font-medium mb-3">선택된 출력단가 ({groups.size}개 설정)</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {Array.from(groups.values()).map((g, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{g.method === 'INDIGO' ? '🖨️' : '💧'}</span>
                    <div>
                      <p className="font-medium text-sm">{g.name}</p>
                      <p className="text-xs text-slate-500">{g.method === 'INDIGO' ? `인디고 ${g.colorTypes.join('/')}` : `잉크젯 (${g.specCount}개 규격)`}</p>
                    </div>
                  </div>
                  <button type="button" title="제거" onClick={() => setLocalSelected(prev => prev.filter(p => !g.ids.includes(p.id)))} className="p-1 hover:bg-red-100 rounded-full">
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <DialogFooter className="mt-4 p-4 border-t">
        <Button variant="outline" onClick={() => setLocalSelected([])}>전체 해제</Button>
        <Button variant="outline" onClick={onCancel}>취소</Button>
        <Button onClick={() => onSelect(localSelected)} className="bg-emerald-600 hover:bg-emerald-700">선택 완료</Button>
      </DialogFooter>
    </div>
  );
}

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
          <Label>옵션 타입</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="optType" value="select" checked={type === 'select'} onChange={() => setType('select')} className="w-4 h-4" />
              <span className="text-[13px]">선택옵션</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="optType" value="required" checked={type === 'required'} onChange={() => setType('required')} className="w-4 h-4" />
              <span className="text-[13px]">필수옵션</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>수량 타입</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="qtyType" value="auto" checked={quantityType === 'auto'} onChange={() => setQuantityType('auto')} className="w-4 h-4" />
              <span className="text-[13px]">자동수량</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="qtyType" value="manual" checked={quantityType === 'manual'} onChange={() => setQuantityType('manual')} className="w-4 h-4" />
              <span className="text-[13px]">선택수량</span>
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
        <Button onClick={() => onSubmit({ name, type, quantityType, values: values.filter(v => v.name) })}>
          추가
        </Button>
      </DialogFooter>
    </div>
  );
}
