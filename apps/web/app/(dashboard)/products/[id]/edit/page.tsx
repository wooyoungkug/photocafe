'use client';

import { useState, useEffect } from 'react';
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
  gradient = 'from-blue-500 to-blue-600',
  actions
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  gradient?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-t-xl p-4 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-white/70 text-sm">{subtitle}</p>}
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
  const updateProduct = useUpdateProduct();

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
  const [selectedPapers, setSelectedPapers] = useState<{ id: string; name: string; type: string; price: number }[]>([]);
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

  // 기존 상품 데이터 로드
  useEffect(() => {
    if (product && categories) {
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

      if (product.specifications && Array.isArray(product.specifications) && specifications) {
        const productSpecs = product.specifications as Array<{ name: string; widthMm: number; heightMm: number }>;
        const matchedSpecIds = productSpecs
          .map((productSpec) => {
            const matchedSpec = specifications.find(
              (s) => s.name === productSpec.name && s.widthMm === productSpec.widthMm && s.heightMm === productSpec.heightMm
            );
            return matchedSpec?.id;
          })
          .filter((id): id is string => !!id);
        setSelectedSpecs(matchedSpecIds);
      }

      if (product.bindings && Array.isArray(product.bindings)) {
        setSelectedBindings(product.bindings.map((b: { id: string; name: string; price: number }) => ({
          id: b.id, name: b.name, price: Number(b.price),
        })));
      }

      if (product.papers && Array.isArray(product.papers)) {
        setSelectedPapers(product.papers.map((p: { id: string; name: string; type: string; price: number }) => ({
          id: p.id, name: p.name, type: p.type, price: Number(p.price),
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
    }
  }, [product, categories, specifications]);

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
        specifications: selectedSpecs.map((specId, idx) => {
          const spec = specifications?.find(s => s.id === specId);
          return {
            name: spec?.name || '',
            widthMm: spec?.widthMm || 0,
            heightMm: spec?.heightMm || 0,
            price: 0,
            isDefault: idx === 0,
            sortOrder: idx,
          };
        }),
        bindings: selectedBindings.map((b, idx) => ({
          name: b.name, price: b.price, isDefault: idx === 0, sortOrder: idx,
        })),
        papers: selectedPapers.map((p, idx) => ({
          name: p.name, type: p.type, price: p.price, isDefault: idx === 0, sortOrder: idx,
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

      await updateProduct.mutateAsync({ id: productId, data: productData });
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
      <Card className="overflow-hidden border-0 shadow-lg">
        <SectionHeader
          icon={Package}
          title="기본정보"
          subtitle="상품의 기본 정보를 입력합니다"
          gradient="from-blue-500 to-indigo-600"
        />
        <CardContent className="p-6 space-y-1 bg-gradient-to-b from-slate-50/50 to-white">
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

          {/* 상품코드/부수이름 */}
          <FormRow label="상품코드">
            <div className="flex gap-6 items-center">
              <Input
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-48 font-mono"
                placeholder="자동생성"
              />
              <div className="flex items-center gap-3">
                <Label className="text-sm text-slate-600 whitespace-nowrap">부수이름</Label>
                <Input
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-20 text-center"
                />
                <span className="text-xs text-slate-400">ex) 부, EA</span>
              </div>
            </div>
          </FormRow>

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
      <Card className="overflow-hidden border-0 shadow-lg">
        <SectionHeader
          icon={Tag}
          title="가격정보 상세"
          subtitle="규격, 제본, 용지 등 가격 옵션을 설정합니다"
          gradient="from-emerald-500 to-teal-600"
        />
        <CardContent className="p-6 space-y-4 bg-gradient-to-b from-emerald-50/30 to-white">
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
              <div className="flex flex-wrap gap-2 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                {selectedSpecs.map(specId => {
                  const spec = specifications?.find(s => s.id === specId);
                  return spec ? (
                    <Badge key={specId} variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3 bg-white border shadow-sm">
                      <span className="font-medium">{spec.name}</span>
                      <span className="text-slate-400 text-xs">({spec.widthMm}×{spec.heightMm}mm)</span>
                      <button
                        type="button"
                        className="ml-1 hover:bg-red-100 rounded-full p-0.5 transition-colors"
                        onClick={() => setSelectedSpecs(prev => prev.filter(id => id !== specId))}
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </button>
                    </Badge>
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
                <div className="flex flex-wrap gap-2">
                  {selectedBindings.map((b, idx) => (
                    <Badge key={idx} variant="outline" className="bg-white">{b.name}</Badge>
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

            {/* 용지 선택 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  용지 선택
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setPaperDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  용지선택
                </Button>
              </div>
              {selectedPapers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedPapers.map((p, idx) => (
                    <Badge key={idx} variant="outline" className="bg-white">{p.name}</Badge>
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

            {/* 박 선택 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  박 선택
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setFoilDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  박선택
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
            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Settings className="h-4 w-4 text-emerald-600" />
              후가공 옵션
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {FINISHING_OPTIONS.map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    finishingOptions[opt.id]
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
      <Card className="overflow-hidden border-0 shadow-lg">
        <SectionHeader
          icon={Settings}
          title="옵션정보"
          subtitle="주문 시 선택 가능한 추가 옵션을 설정합니다"
          gradient="from-violet-500 to-purple-600"
          actions={
            <Button type="button" size="sm" variant="secondary" onClick={() => setOptionDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              옵션 추가
            </Button>
          }
        />
        <CardContent className="p-6 bg-gradient-to-b from-violet-50/30 to-white">
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
      <Card className="overflow-hidden border-0 shadow-lg">
        <SectionHeader
          icon={ImageIcon}
          title="상품 이미지"
          subtitle="썸네일 및 상세 이미지를 등록합니다"
          gradient="from-orange-500 to-amber-600"
        />
        <CardContent className="p-6 bg-gradient-to-b from-orange-50/30 to-white">
          <div className="grid grid-cols-5 gap-4">
            {/* 썸네일 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">썸네일</Label>
              <div
                className={`relative aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${
                  dragOver === -1 ? 'bg-orange-50 border-orange-400' : 'bg-slate-50 border-slate-200 hover:border-orange-300'
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
                    <span className="text-xs text-center">클릭 또는<br/>드래그</span>
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
                  className={`relative aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${
                    dragOver === idx ? 'bg-orange-50 border-orange-400' : 'bg-slate-50 border-slate-200 hover:border-orange-300'
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
                      <span className="text-xs text-center">클릭 또는<br/>드래그</span>
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
      <Card className="overflow-hidden border-0 shadow-lg">
        <SectionHeader
          icon={FileText}
          title="상세정보 편집"
          subtitle="상품 상세 설명을 작성합니다"
          gradient="from-slate-600 to-slate-700"
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
          className="px-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
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
