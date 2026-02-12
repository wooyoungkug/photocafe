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
import { useCreateProduct } from '@/hooks/use-products';
import { useProductionGroupTree, type ProductionGroup } from '@/hooks/use-production';
import { useToast } from '@/hooks/use-toast';
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
  const [selectedBindings, setSelectedBindings] = useState<{ id: string; name: string; price: number }[]>([]);
  const [bindingDirection, setBindingDirection] = useState('left');
  const [printType, setPrintType] = useState('double');
  const [selectedCovers, setSelectedCovers] = useState<{ id: string; name: string; price: number }[]>([]);
  const [selectedFoils, setSelectedFoils] = useState<{ id: string; name: string; color: string; price: number }[]>([]);

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

  // 선택 다이얼로그
  const [specDialogOpen, setSpecDialogOpen] = useState(false);
  const [halfProductDialogOpen, setHalfProductDialogOpen] = useState(false);
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [foilDialogOpen, setFoilDialogOpen] = useState(false);

  // 규격 타입 선택
  const [specType, setSpecType] = useState<'indigo' | 'inkjet' | 'album' | 'frame' | 'booklet'>('album');

  // 규격 타입별 필터링 (면적 오름차순 정렬)
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

  // 자동 상품코드 생성
  useEffect(() => {
    if (!productCode) {
      const timestamp = Date.now().toString().slice(-6);
      setProductCode(`S${timestamp}`);
    }
  }, []);

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
          price: b.price,
          isDefault: idx === 0,
          sortOrder: idx,
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
      };

      await createProduct.mutateAsync(productData);
      toast({ variant: 'success', title: '상품이 등록되었습니다.' });
      router.push('/products');
    } catch (error) {
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
        title="앨범상품 등록"
        description="새로운 앨범 상품을 등록합니다."
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

            {/* 출력구분 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  출력구분
                </Label>
              </div>
              <div className="pt-2 space-y-1">
                <div className="flex gap-4 items-center">
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

            {/* 박 선택 */}
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
          </div>

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
              <span className="text-sm">선택옵션</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="optType" value="required" checked={type === 'required'} onChange={() => setType('required')} className="w-4 h-4" />
              <span className="text-sm">필수옵션</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>수량 타입</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="qtyType" value="auto" checked={quantityType === 'auto'} onChange={() => setQuantityType('auto')} className="w-4 h-4" />
              <span className="text-sm">자동수량</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="qtyType" value="manual" checked={quantityType === 'manual'} onChange={() => setQuantityType('manual')} className="w-4 h-4" />
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
        <Button onClick={() => onSubmit({ name, type, quantityType, values: values.filter(v => v.name) })}>
          추가
        </Button>
      </DialogFooter>
    </div>
  );
}
