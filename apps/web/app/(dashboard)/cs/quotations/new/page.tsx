'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Loader2,
  Search,
  User,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useCreateQuotation, useQuotationPriceLookup } from '@/hooks/use-quotation';
import { useClients, useClientGroups } from '@/hooks/use-clients';
import { useCategoryTree } from '@/hooks/use-categories';
import { useSpecificationsByUsage } from '@/hooks/use-specifications';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  CreateQuotationItemDto,
  QUOTATION_TYPE_LABELS,
  CATEGORY_TO_SPEC_USAGE,
  CATEGORY_DEFAULT_PRINT_SIDE,
} from '@/lib/types/quotation';
import Link from 'next/link';

interface FormItem extends CreateQuotationItemDto {
  _key: string;
  _parentCategoryId?: string;
  _specUsage?: string | null;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createMutation = useCreateQuotation();

  // 기본 정보
  const [title, setTitle] = useState('');
  const [quotationType, setQuotationType] = useState<string>('');
  const [subType, setSubType] = useState<string>('');
  const [validUntil, setValidUntil] = useState('');
  const [memo, setMemo] = useState('');

  // 고객 정보
  const [clientType, setClientType] = useState<'member' | 'guest'>('guest');
  const [clientId, setClientId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientGroupName, setClientGroupName] = useState('');
  const [clientGroupId, setClientGroupId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchFocused, setClientSearchFocused] = useState(false);

  // 거래처 검색
  const { data: clientsData } = useClients({
    search: clientSearch || undefined,
    limit: 10,
    status: 'active',
  });
  const clients = clientsData?.data || [];

  // 거래처 그룹 목록 (비회원 그룹 선택용)
  const { data: groupsData } = useClientGroups({ isActive: true });
  const clientGroups = groupsData?.data || [];

  // 카테고리 트리
  const { data: categoryTree } = useCategoryTree();

  // 견적 항목
  const [items, setItems] = useState<FormItem[]>([
    { _key: crypto.randomUUID(), itemName: '', quantity: 1, unitPrice: 0 },
  ]);

  const addItem = () => {
    setItems([...items, { _key: crypto.randomUUID(), itemName: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (key: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item._key !== key));
  };

  const updateItem = (key: string, updates: Partial<FormItem>) => {
    setItems(items.map((item) =>
      item._key === key ? { ...item, ...updates } : item
    ));
  };

  // 회원 선택 핸들러
  const handleClientSelect = (client: any) => {
    setClientId(client.id);
    setClientName(client.clientName);
    setClientPhone(client.mobile || client.phone || '');
    setClientEmail(client.email || '');
    setClientGroupName(client.group?.groupName || '');
    setClientGroupId(client.group?.id || '');
    setClientSearchFocused(false);
    setClientSearch('');
  };

  // 회원/비회원 전환 시 초기화
  const handleClientTypeChange = (value: 'member' | 'guest') => {
    setClientType(value);
    if (value === 'guest') {
      setClientId('');
    }
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientGroupName('');
    setClientGroupId('');
  };

  // 세부분류 옵션
  const getSubTypeOptions = () => {
    switch (quotationType) {
      case 'album':
        return [
          { value: 'premium_photo', label: '고급화보' },
          { value: 'compressed', label: '압축앨범' },
          { value: 'photobook', label: '포토북' },
        ];
      case 'digital_print':
        return [
          { value: 'booklet', label: '책자디지털인쇄' },
          { value: 'single_item', label: '단품디지털인쇄' },
        ];
      default:
        return [];
    }
  };
  const subTypeOptions = getSubTypeOptions();

  // 1차 카테고리 목록 (트리 루트 노드)
  const parentCategories = categoryTree || [];

  // 합계 계산
  const totalAmount = items.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0), 0);
  const tax = Math.round(totalAmount * 0.1);
  const finalAmount = totalAmount + tax;
  const formatAmount = (amount: number) => amount.toLocaleString('ko-KR');

  // 제출
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: '견적 제목을 입력하세요.', variant: 'destructive' });
      return;
    }
    if (!quotationType) {
      toast({ title: '견적 분류를 선택하세요.', variant: 'destructive' });
      return;
    }
    if (items.some((item) => !item.itemName.trim())) {
      toast({ title: '모든 항목의 품목명을 입력하세요.', variant: 'destructive' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        title,
        quotationType,
        subType: subType || undefined,
        clientId: clientType === 'member' && clientId ? clientId : undefined,
        clientName: clientName || undefined,
        clientPhone: clientPhone || undefined,
        clientEmail: clientEmail || undefined,
        validUntil: validUntil || undefined,
        memo: memo || undefined,
        items: items.map(({ _key, _parentCategoryId, _specUsage, ...item }, idx) => ({
          ...item,
          sortOrder: idx,
        })),
      });
      toast({ title: '견적이 생성되었습니다.' });
      router.push('/cs/quotations');
    } catch {
      toast({ title: '견적 생성에 실패했습니다.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cs/quotations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-[24px] text-black font-normal flex items-center gap-2">
              <FileText className="h-7 w-7" />
              견적 작성
            </h1>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="bg-pink-500 hover:bg-pink-600"
        >
          {createMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          저장
        </Button>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[14px] text-black font-normal">견적 제목 *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 웨딩앨범 견적"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[14px] text-black font-normal">견적 분류 *</Label>
              <Select value={quotationType} onValueChange={(v) => { setQuotationType(v); setSubType(''); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="분류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUOTATION_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {subTypeOptions.length > 0 && (
              <div>
                <Label className="text-[14px] text-black font-normal">세부 분류</Label>
                <Select value={subType} onValueChange={setSubType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="세부분류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {subTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-[14px] text-black font-normal">유효기한</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 고객 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">고객 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 회원/비회원 구분 */}
          <RadioGroup
            value={clientType}
            onValueChange={(v) => handleClientTypeChange(v as 'member' | 'guest')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="member" id="member" />
              <Label htmlFor="member" className="text-[14px] text-black font-normal flex items-center gap-1">
                <User className="h-4 w-4" /> 회원 (거래처)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="guest" id="guest" />
              <Label htmlFor="guest" className="text-[14px] text-black font-normal flex items-center gap-1">
                <UserPlus className="h-4 w-4" /> 비회원
              </Label>
            </div>
          </RadioGroup>

          {clientType === 'member' ? (
            <div className="space-y-4">
              {/* 거래처 검색 */}
              <div className="relative">
                <Label className="text-[14px] text-black font-normal">거래처 검색</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setClientSearchFocused(true); }}
                    onFocus={() => setClientSearchFocused(true)}
                    onBlur={() => setTimeout(() => setClientSearchFocused(false), 200)}
                    placeholder="거래처명, 코드로 검색..."
                    className="pl-10"
                  />
                </div>
                {clientSearchFocused && clientSearch && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {clients.length === 0 ? (
                      <p className="p-3 text-[14px] text-gray-400">검색 결과가 없습니다.</p>
                    ) : (
                      clients.map((client: any) => (
                        <button
                          key={client.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleClientSelect(client)}
                        >
                          <div>
                            <span className="text-[14px] font-medium">{client.clientName}</span>
                            <span className="text-gray-400 ml-2 text-xs">{client.clientCode}</span>
                          </div>
                          {client.group && (
                            <Badge variant="outline" className="text-xs">
                              {client.group.groupName}
                            </Badge>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 선택된 거래처 정보 */}
              {clientId && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-[14px] text-black font-normal">고객명</Label>
                    <p className="text-[14px] text-black font-normal mt-1">{clientName}</p>
                  </div>
                  <div>
                    <Label className="text-[14px] text-black font-normal">연락처</Label>
                    <p className="text-[14px] text-black font-normal mt-1">{clientPhone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-[14px] text-black font-normal">이메일</Label>
                    <p className="text-[14px] text-black font-normal mt-1">{clientEmail || '-'}</p>
                  </div>
                  {clientGroupName && (
                    <div className="col-span-full">
                      <Badge className="bg-blue-100 text-blue-700">
                        그룹: {clientGroupName} (그룹단가 자동 적용)
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-[14px] text-black font-normal">고객명</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="고객명"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">연락처</Label>
                  <PhoneInput
                    value={clientPhone}
                    onChange={(v) => setClientPhone(v)}
                    placeholder="010-0000-0000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">이메일</Label>
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[14px] text-black font-normal">단가 그룹</Label>
                  <Select
                    value={clientGroupId}
                    onValueChange={(v) => {
                      setClientGroupId(v);
                      const group = clientGroups.find((g: any) => g.id === v);
                      setClientGroupName(group?.groupName || '');
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="그룹 선택 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientGroups.map((group: any) => (
                        <SelectItem key={group.id} value={group.id}>{group.groupName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {clientGroupName && (
                <Badge className="bg-blue-100 text-blue-700 mt-2">
                  그룹: {clientGroupName} (그룹단가 적용)
                </Badge>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 견적 항목 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[18px] text-black font-bold">견적 항목</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-4 w-4" /> 항목 추가
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead className="w-[140px]">1차 분류</TableHead>
                <TableHead className="w-[140px]">품목(2차) *</TableHead>
                <TableHead className="w-[140px]">규격</TableHead>
                <TableHead className="w-[70px]">양면/단면</TableHead>
                <TableHead className="w-[80px]">수량</TableHead>
                <TableHead className="w-[120px]">단가</TableHead>
                <TableHead className="w-[120px] text-right">소계</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <QuotationItemRow
                  key={item._key}
                  item={item}
                  index={idx}
                  parentCategories={parentCategories}
                  clientId={clientType === 'member' ? clientId : undefined}
                  groupId={clientGroupId || undefined}
                  onUpdate={(updates) => updateItem(item._key, updates)}
                  onRemove={() => removeItem(item._key)}
                  canRemove={items.length > 1}
                />
              ))}
            </TableBody>
          </Table>

          {/* 합계 */}
          <div className="border-t p-4 space-y-2">
            <div className="flex justify-between text-[14px] text-black font-normal">
              <span>공급가액</span>
              <span>{formatAmount(totalAmount)}원</span>
            </div>
            <div className="flex justify-between text-[14px] text-black font-normal">
              <span>부가세 (10%)</span>
              <span>{formatAmount(tax)}원</span>
            </div>
            <div className="flex justify-between text-[18px] text-black font-bold border-t pt-2">
              <span>총 견적금액</span>
              <span>{formatAmount(finalAmount)}원</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메모 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">메모</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="견적 관련 메모를 입력하세요..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* 하단 버튼 */}
      <div className="flex justify-end gap-3">
        <Link href="/cs/quotations">
          <Button variant="outline">취소</Button>
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="bg-pink-500 hover:bg-pink-600"
        >
          {createMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          견적 저장
        </Button>
      </div>
    </div>
  );
}

// ==================== 견적 항목 행 컴포넌트 ====================

function QuotationItemRow({
  item,
  index,
  parentCategories,
  clientId,
  groupId,
  onUpdate,
  onRemove,
  canRemove,
}: {
  item: FormItem;
  index: number;
  parentCategories: any[];
  clientId?: string;
  groupId?: string;
  onUpdate: (updates: Partial<FormItem>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [parentCatId, setParentCatId] = useState(item._parentCategoryId || '');
  const [specUsage, setSpecUsage] = useState<string | null>(item._specUsage || null);

  // 2차 카테고리 목록: 트리 구조에서 children 가져오기
  const parentCat = parentCategories.find((c: any) => c.id === parentCatId);
  const childCategories = parentCat?.children || [];

  // 용도별 규격 조회
  const { data: specs } = useSpecificationsByUsage(specUsage);

  // 단가 자동 조회
  const { data: priceData } = useQuotationPriceLookup({
    clientId: clientId || undefined,
    groupId: groupId || undefined,
    categoryId: item.categoryId || undefined,
    specificationId: item.specificationId || undefined,
  });

  // 단가 자동 적용 (가격 데이터 변경 시)
  useEffect(() => {
    if (priceData && priceData.unitPrice > 0 && item.specificationId) {
      onUpdate({ unitPrice: priceData.unitPrice });
    }
  }, [priceData?.unitPrice, item.specificationId]);

  // 1차 카테고리 선택
  const handleParentCategoryChange = (catId: string) => {
    setParentCatId(catId);
    onUpdate({
      _parentCategoryId: catId,
      categoryId: undefined,
      itemName: '',
      specificationId: undefined,
      specification: undefined,
      printSide: undefined,
      _specUsage: null,
    });
    setSpecUsage(null);
  };

  // 2차 카테고리 선택 → 양면/단면 자동 결정 + 규격 용도 매핑
  const handleCategoryChange = (catId: string) => {
    const category = childCategories.find((c: any) => c.id === catId);
    if (!category) return;

    const catName = category.name as string;
    const usage = CATEGORY_TO_SPEC_USAGE[catName] || null;

    // 양면/단면 자동 결정: 압축앨범=단면, 화보앨범/포토북=양면
    let defaultPrintSide: string | undefined;
    if (catName.includes('압축')) {
      defaultPrintSide = 'single';
    } else if (catName.includes('화보') || catName.includes('포토북')) {
      defaultPrintSide = 'double';
    }

    setSpecUsage(usage);
    onUpdate({
      categoryId: catId,
      itemName: catName,
      _specUsage: usage,
      specificationId: undefined,
      specification: undefined,
      printSide: defaultPrintSide,
    });
  };

  // 규격 선택
  const handleSpecChange = (specId: string) => {
    const spec = specs?.find((s: any) => s.id === specId);
    if (!spec) return;

    // 양면/단면: 카테고리에서 이미 결정된 값 유지
    onUpdate({
      specificationId: specId,
      specification: spec.name,
    });
  };

  const subtotal = (item.unitPrice || 0) * (item.quantity || 0);
  const formatAmount = (amount: number) => amount.toLocaleString('ko-KR');

  return (
    <TableRow>
      <TableCell className="text-[14px] text-black font-normal">{index + 1}</TableCell>

      {/* 1차 카테고리 */}
      <TableCell>
        <Select value={parentCatId} onValueChange={handleParentCategoryChange}>
          <SelectTrigger className="h-9 text-[13px]">
            <SelectValue placeholder="1차 분류" />
          </SelectTrigger>
          <SelectContent>
            {parentCategories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* 2차 카테고리 (품목명) */}
      <TableCell>
        {childCategories.length > 0 ? (
          <Select value={item.categoryId || ''} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-9 text-[13px]">
              <SelectValue placeholder="품목 선택" />
            </SelectTrigger>
            <SelectContent>
              {childCategories.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={item.itemName}
            onChange={(e) => onUpdate({ itemName: e.target.value })}
            placeholder="품목명"
            className="h-9 text-[13px]"
          />
        )}
      </TableCell>

      {/* 규격 */}
      <TableCell>
        {specs && specs.length > 0 ? (
          <Select value={item.specificationId || ''} onValueChange={handleSpecChange}>
            <SelectTrigger className="h-9 text-[13px]">
              <SelectValue placeholder="규격 선택" />
            </SelectTrigger>
            <SelectContent>
              {specs.map((spec: any) => (
                <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={item.specification || ''}
            onChange={(e) => onUpdate({ specification: e.target.value })}
            placeholder="규격"
            className="h-9 text-[13px]"
          />
        )}
      </TableCell>

      {/* 양면/단면 */}
      <TableCell className="text-center">
        {item.printSide && (
          <Badge
            variant="outline"
            className={item.printSide === 'double' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}
          >
            {item.printSide === 'double' ? '양면' : '단면'}
          </Badge>
        )}
      </TableCell>

      {/* 수량 */}
      <TableCell>
        <Input
          type="number"
          min={1}
          value={item.quantity}
          onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
          className="h-9 text-[13px]"
        />
      </TableCell>

      {/* 단가 */}
      <TableCell>
        <Input
          type="number"
          min={0}
          value={item.unitPrice}
          onChange={(e) => onUpdate({ unitPrice: parseFloat(e.target.value) || 0 })}
          className="h-9 text-[13px]"
        />
      </TableCell>

      {/* 소계 */}
      <TableCell className="text-[14px] text-black font-normal text-right">
        {formatAmount(subtotal)}원
      </TableCell>

      {/* 삭제 */}
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-red-500"
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
