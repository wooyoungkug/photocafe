'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ProductEditor } from '@/components/ui/product-editor';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { useToast } from '@/hooks/use-toast';
import { API_URL, API_BASE_URL } from '@/lib/api';

// 이미지 URL 정규화 함수
const normalizeImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';

  // 이미 전체 URL인 경우
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // 중복 /api/v1/api/v1/ 수정
    return url.replace(/\/api\/v1\/api\/v1\//g, '/api/v1/');
  }

  // /api/v1/upload/... 형식인 경우
  if (url.startsWith('/api/v1/')) {
    return `${API_BASE_URL}${url}`;
  }

  // /upload/... 형식인 경우 (API_URL에 /api/v1이 포함됨)
  if (url.startsWith('/upload')) {
    return `${API_URL}${url}`;
  }

  // /api/upload/... 형식인 경우
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
} from 'lucide-react';
import type { Category } from '@/lib/types';

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

// 후가공 옵션 목록
const FINISHING_OPTIONS = [
  { id: 'coating', label: '코팅선택' },
  { id: 'foilColor', label: '박Color선택' },
  { id: 'coverSpine', label: '커버스프지선택' },
  { id: 'hardcover', label: '양장선택' },
  { id: 'coverPageFinish', label: '커버페이지처리금선택' },
  { id: 'outerTab', label: '겉타바선택' },
  { id: 'divider', label: '간지삽입선택' },
  { id: 'frameMount', label: '액자지선택' },
  { id: 'coverOi', label: '커버OI삽입' },
];

interface ProductOption {
  id: string;
  name: string;
  type: 'select' | 'required';
  quantityType: 'auto' | 'manual';
  values: { name: string; price: number }[];
}

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: categories } = useCategories();
  const { data: specifications } = useSpecifications();
  const { data: halfProductsData } = useHalfProducts({ limit: 100 });
  const createProduct = useCreateProduct();

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
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null);

  // 이미지
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [detailImages, setDetailImages] = useState<string[]>(['', '', '', '']);

  // 상세정보
  const [description, setDescription] = useState('');

  // 선택 다이얼로그
  const [specDialogOpen, setSpecDialogOpen] = useState(false);
  const [halfProductDialogOpen, setHalfProductDialogOpen] = useState(false);
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [paperDialogOpen, setPaperDialogOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [foilDialogOpen, setFoilDialogOpen] = useState(false);

  // 규격 타입 선택 (인디고, 잉크젯, 앨범, 액자, 책자)
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
    // 면적(widthMm * heightMm) 기준 오름차순 정렬
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

  const handleSubmit = async () => {
    // 최종 카테고리 ID 결정
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
        thumbnailUrl: thumbnailUrl || undefined,
        detailImages: detailImages.filter(url => url),
        description: description || undefined,
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
        })),
        papers: selectedPapers.map((p, idx) => ({
          name: p.name,
          type: p.type,
          price: p.price,
          isDefault: idx === 0,
          sortOrder: idx,
        })),
        covers: selectedCovers.map((c, idx) => ({
          name: c.name,
          price: c.price,
          isDefault: idx === 0,
          sortOrder: idx,
        })),
        foils: selectedFoils.map((f, idx) => ({
          name: f.name,
          color: f.color,
          price: f.price,
          isDefault: idx === 0,
          sortOrder: idx,
        })),
        finishings: Object.entries(finishingOptions)
          .filter(([, enabled]) => enabled)
          .map(([key], idx) => {
            const opt = FINISHING_OPTIONS.find(o => o.id === key);
            return {
              name: opt?.label || key,
              price: 0,
              isDefault: false,
              sortOrder: idx,
            };
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
    <div className="space-y-6 pb-10">
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

      {/* 판매제품상품 기본정보 */}
      <Card>
        <CardHeader className="bg-blue-600 text-white py-3 rounded-t-lg">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            판매제품상품 등록
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* 카테고리 선택 */}
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right font-medium">판매카테고리</Label>
            <Select value={largeCategoryId} onValueChange={(v) => { setLargeCategoryId(v); setMediumCategoryId(''); setSmallCategoryId(''); }}>
              <SelectTrigger className="bg-blue-50 border-blue-200">
                <SelectValue placeholder="※대분류※" />
              </SelectTrigger>
              <SelectContent>
                {largeCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mediumCategoryId} onValueChange={(v) => { setMediumCategoryId(v); setSmallCategoryId(''); }} disabled={!largeCategoryId}>
              <SelectTrigger className="bg-green-50 border-green-200">
                <SelectValue placeholder="※중분류※" />
              </SelectTrigger>
              <SelectContent>
                {mediumCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={smallCategoryId} onValueChange={setSmallCategoryId} disabled={!mediumCategoryId}>
              <SelectTrigger className="bg-orange-50 border-orange-200">
                <SelectValue placeholder="※소분류※" />
              </SelectTrigger>
              <SelectContent>
                {smallCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 상품코드/상품명 */}
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right font-medium">상품코드</Label>
            <div className="col-span-1">
              <Input value={productCode} onChange={(e) => setProductCode(e.target.value)} />
            </div>
            <Label className="text-right font-medium">부수이름</Label>
            <div className="flex gap-2 items-center">
              <Input value={unitName} onChange={(e) => setUnitName(e.target.value)} className="w-20" />
              <span className="text-sm text-muted-foreground">ex) 부, EA</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right font-medium">상품명</Label>
            <div className="col-span-3">
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="상품명을 입력하세요" />
            </div>
          </div>

          {/* 활성/회원적용 */}
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right font-medium">활성</Label>
            <RadioGroup value={isActive ? 'active' : 'inactive'} onValueChange={(v) => setIsActive(v === 'active')} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active" className="font-normal">활성</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="inactive" id="inactive" />
                <Label htmlFor="inactive" className="font-normal">비활성</Label>
              </div>
            </RadioGroup>
            <Label className="text-right font-medium">회원적용</Label>
            <div>
              <Button type="button" variant="outline" size="sm" className="bg-green-600 text-white hover:bg-green-700">회원선택</Button>
            </div>
          </div>

          {/* 신상품/베스트상품 */}
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right font-medium">신상품</Label>
            <RadioGroup value={isNew ? 'yes' : 'no'} onValueChange={(v) => setIsNew(v === 'yes')} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="isNewYes" />
                <Label htmlFor="isNewYes" className="font-normal">노출</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="isNewNo" />
                <Label htmlFor="isNewNo" className="font-normal text-red-500">X</Label>
              </div>
            </RadioGroup>
            <Label className="text-right font-medium">베스트상품</Label>
            <RadioGroup value={isBest ? 'yes' : 'no'} onValueChange={(v) => setIsBest(v === 'yes')} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="isBestYes" />
                <Label htmlFor="isBestYes" className="font-normal">노출</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="isBestNo" />
                <Label htmlFor="isBestNo" className="font-normal text-red-500">X</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* 가격정보상세 */}
      <Card>
        <CardHeader className="bg-green-600 text-white py-3 rounded-t-lg">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            가격정보상세
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* 앨범규격/반제품 */}
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right font-medium">앨범규격</Label>
            <div className="col-span-2 flex gap-2 items-center">
              <Button type="button" variant="outline" size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => setSpecDialogOpen(true)}>
                규격선택
              </Button>
              {/* 규격 타입 탭 */}
              <div className="flex gap-1 border rounded-md p-1">
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
                    className={`h-7 px-2 text-xs ${specType === tab.key ? 'bg-primary' : ''}`}
                    onClick={() => setSpecType(tab.key as typeof specType)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
              {/* 규격 드롭다운 */}
              <Select
                value=""
                onValueChange={(specId) => {
                  if (specId && !selectedSpecs.includes(specId)) {
                    setSelectedSpecs(prev => [...prev, specId]);
                  }
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="규격 추가" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredSpecs(specType).map(spec => (
                    <SelectItem key={spec.id} value={spec.id} disabled={selectedSpecs.includes(spec.id)}>
                      {spec.name} ({spec.widthMm}x{spec.heightMm}mm)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 items-center">
              <Label className="font-medium whitespace-nowrap">반제품</Label>
              <Button type="button" variant="outline" size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => setHalfProductDialogOpen(true)}>
                반제품선택
              </Button>
            </div>
          </div>

          {/* 선택된 규격 표시 */}
          {selectedSpecs.length > 0 && (
            <div className="grid grid-cols-4 gap-4 items-start">
              <div></div>
              <div className="col-span-3 flex flex-wrap gap-2">
                {selectedSpecs.map(specId => {
                  const spec = specifications?.find(s => s.id === specId);
                  return spec ? (
                    <Badge key={specId} variant="outline" className="flex items-center gap-1 py-1 px-2">
                      {spec.name} ({spec.widthMm}x{spec.heightMm}mm)
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-red-100"
                        onClick={() => setSelectedSpecs(prev => prev.filter(id => id !== specId))}
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </Button>
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* 제본선택/제본방향 */}
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right font-medium">제본선택</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => setBindingDialogOpen(true)}>
                제본선택
              </Button>
              {selectedBindings.length > 0 && (
                <Badge variant="secondary">{selectedBindings.length}개 선택</Badge>
              )}
            </div>
            <Label className="text-right font-medium">제본방향</Label>
            <RadioGroup value={bindingDirection} onValueChange={setBindingDirection} className="flex gap-4">
              {BINDING_DIRECTION_OPTIONS.map(opt => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`binding-${opt.value}`} />
                  <Label htmlFor={`binding-${opt.value}`} className="font-normal">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 용지선택/출력구분 */}
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right font-medium">용지선택</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => setPaperDialogOpen(true)}>
                용지선택
              </Button>
              {selectedPapers.length > 0 && (
                <Badge variant="secondary">{selectedPapers.length}개 선택</Badge>
              )}
            </div>
            <Label className="text-right font-medium">출력구분</Label>
            <RadioGroup value={printType} onValueChange={setPrintType} className="flex gap-4">
              {PRINT_TYPE_OPTIONS.map(opt => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`print-${opt.value}`} />
                  <Label htmlFor={`print-${opt.value}`} className="font-normal">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 커버선택/박이름선택 */}
          <div className="grid grid-cols-4 gap-4 items-center">
            <Label className="text-right font-medium">커버선택</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => setCoverDialogOpen(true)}>
                커버선택
              </Button>
              <Button type="button" variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                커버관리
              </Button>
              {selectedCovers.length > 0 && (
                <Badge variant="secondary">{selectedCovers.length}개 선택</Badge>
              )}
            </div>
            <Label className="text-right font-medium">박이름선택</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => setFoilDialogOpen(true)}>
                등판선택
              </Button>
              {selectedFoils.length > 0 && (
                <Badge variant="secondary">{selectedFoils.length}개 선택</Badge>
              )}
            </div>
          </div>

          {/* 후가공 옵션 체크박스 */}
          <div className="grid grid-cols-4 gap-4 items-start pt-4 border-t">
            <div></div>
            <div className="col-span-3 grid grid-cols-3 gap-3">
              {FINISHING_OPTIONS.map(opt => (
                <div key={opt.id} className="flex items-center gap-2">
                  <Checkbox
                    id={opt.id}
                    checked={finishingOptions[opt.id] || false}
                    onCheckedChange={(checked) => setFinishingOptions(prev => ({ ...prev, [opt.id]: !!checked }))}
                  />
                  <Label htmlFor={opt.id} className="font-normal">
                    <Badge variant="outline" className="bg-green-600 text-white border-green-600">
                      {opt.label}
                    </Badge>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 옵션정보 */}
      <Card>
        <CardHeader className="bg-purple-600 text-white py-3 rounded-t-lg">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            옵션정보
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-medium">주문옵션</span>
            <Button type="button" variant="outline" size="sm" onClick={() => { setEditingOption(null); setOptionDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {customOptions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>옵션명</TableHead>
                  <TableHead>타입</TableHead>
                  <TableHead>수량</TableHead>
                  <TableHead>옵션값</TableHead>
                  <TableHead className="w-20">삭제</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customOptions.map((opt) => (
                  <TableRow key={opt.id}>
                    <TableCell>{opt.name}</TableCell>
                    <TableCell>{opt.type === 'select' ? '선택옵션' : '필수옵션'}</TableCell>
                    <TableCell>{opt.quantityType === 'auto' ? '자동수량' : '선택수량'}</TableCell>
                    <TableCell>
                      {opt.values.map(v => `${v.name}(${v.price.toLocaleString()}원)`).join(', ')}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCustomOptions(prev => prev.filter(o => o.id !== opt.id))}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            ※ 자동수량 (주문수량으로 자동인식), 선택수량 (고객입력 수량으로 인식)
          </p>
        </CardContent>
      </Card>

      {/* 상세정보 (이미지) */}
      <Card>
        <CardHeader className="bg-orange-600 text-white py-3 rounded-t-lg">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            상세정보
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            이미지관리 (상세이미지 1번은 메치 순서대 이미지로 만들어주세요)
          </p>

          <div className="grid grid-cols-5 gap-4">
            {/* 썸네일 */}
            <div className="space-y-2">
              <Label className="text-sm">썸네일이미지<br />[190x190]</Label>
              <div className="relative w-full aspect-square bg-gray-100 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
                {thumbnailUrl ? (
                  <>
                    <img src={normalizeImageUrl(thumbnailUrl)} alt="썸네일" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => setThumbnailUrl('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 text-gray-400">
                    <Upload className="h-8 w-8" />
                    <span className="text-xs">파일 선택</span>
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
                <Label className="text-sm">상세이미지{idx + 1}<br />[420x420]</Label>
                <div className="relative w-full aspect-square bg-gray-100 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
                  {img ? (
                    <>
                      <img src={normalizeImageUrl(img)} alt={`상세${idx + 1}`} className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => {
                          const newImages = [...detailImages];
                          newImages[idx] = '';
                          setDetailImages(newImages);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2 text-gray-400">
                      <Upload className="h-8 w-8" />
                      <span className="text-xs">파일 선택</span>
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

      {/* 상세정보 편집 */}
      <Card>
        <CardHeader className="bg-gray-600 text-white py-3 rounded-t-lg">
          <CardTitle className="text-sm font-medium">상세정보 편집</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ProductEditor
            value={description}
            onChange={setDescription}
            placeholder="상품 상세 설명을 입력하세요. 이미지와 텍스트를 자유롭게 편집할 수 있습니다."
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
      <div className="flex justify-center gap-4">
        <Button
          onClick={handleSubmit}
          disabled={createProduct.isPending}
          className="bg-blue-600 hover:bg-blue-700 px-8"
        >
          {createProduct.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          상품등록
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          목록으로
        </Button>
      </div>

      {/* 규격 선택 다이얼로그 */}
      <Dialog open={specDialogOpen} onOpenChange={setSpecDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>규격 선택</DialogTitle>
          </DialogHeader>
          {/* 규격 타입 탭 */}
          <div className="flex gap-1 border-b pb-2">
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
                variant={specType === tab.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSpecType(tab.key as typeof specType)}
              >
                {tab.label}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {getFilteredSpecs(tab.key as typeof specType).length}
                </Badge>
              </Button>
            ))}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={getFilteredSpecs(specType).length > 0 && getFilteredSpecs(specType).every(s => selectedSpecs.includes(s.id))}
                      onCheckedChange={(checked) => {
                        const filteredIds = getFilteredSpecs(specType).map(s => s.id);
                        if (checked) {
                          // 현재 타입의 모든 규격 선택
                          setSelectedSpecs(prev => [...new Set([...prev, ...filteredIds])]);
                        } else {
                          // 현재 타입의 모든 규격 해제
                          setSelectedSpecs(prev => prev.filter(id => !filteredIds.includes(id)));
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>규격명</TableHead>
                  <TableHead>크기(inch)</TableHead>
                  <TableHead>크기(mm)</TableHead>
                  <TableHead>용도</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredSpecs(specType).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      해당 타입의 규격이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  getFilteredSpecs(specType).map(spec => (
                    <TableRow key={spec.id} className={selectedSpecs.includes(spec.id) ? 'bg-primary/10' : ''}>
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
                      <TableCell>{spec.widthInch} x {spec.heightInch}</TableCell>
                      <TableCell>{spec.widthMm} x {spec.heightMm}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {spec.forIndigo && <Badge variant="outline" className="text-xs bg-blue-50">인디고</Badge>}
                          {spec.forInkjet && <Badge variant="outline" className="text-xs bg-purple-50">잉크젯</Badge>}
                          {spec.forAlbum && <Badge variant="outline" className="text-xs bg-green-50">앨범</Badge>}
                          {spec.forFrame && <Badge variant="outline" className="text-xs bg-orange-50">액자</Badge>}
                          {spec.forBooklet && <Badge variant="outline" className="text-xs bg-pink-50">책자</Badge>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {selectedSpecs.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">선택된 규격 ({selectedSpecs.length}개)</p>
              <div className="flex flex-wrap gap-2">
                {selectedSpecs.map(specId => {
                  const spec = specifications?.find(s => s.id === specId);
                  return spec ? (
                    <Badge key={specId} variant="secondary" className="flex items-center gap-1">
                      {spec.name}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-red-100"
                        onClick={() => setSelectedSpecs(prev => prev.filter(id => id !== specId))}
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </Button>
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
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">선택</TableHead>
                  <TableHead>코드</TableHead>
                  <TableHead>반제품명</TableHead>
                  <TableHead>기본가</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {halfProductsData?.data?.map(hp => (
                  <TableRow key={hp.id}>
                    <TableCell>
                      <RadioGroupItem
                        value={hp.id}
                        checked={selectedHalfProductId === hp.id}
                        onClick={() => setSelectedHalfProductId(hp.id)}
                      />
                    </TableCell>
                    <TableCell>{hp.code}</TableCell>
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
          <RadioGroup value={type} onValueChange={(v) => setType(v as 'select' | 'required')} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="select" id="optTypeSelect" />
              <Label htmlFor="optTypeSelect" className="font-normal">선택옵션</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="required" id="optTypeRequired" />
              <Label htmlFor="optTypeRequired" className="font-normal">필수옵션</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>수량 타입</Label>
          <RadioGroup value={quantityType} onValueChange={(v) => setQuantityType(v as 'auto' | 'manual')} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="auto" id="qtyAuto" />
              <Label htmlFor="qtyAuto" className="font-normal">자동수량</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="manual" id="qtyManual" />
              <Label htmlFor="qtyManual" className="font-normal">선택수량</Label>
            </div>
          </RadioGroup>
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
