'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Building2,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

import {
  usePapers,
  usePaperManufacturers,
  usePaperSuppliers,
  useCreatePaper,
  useUpdatePaper,
  useDeletePaper,
  useCreatePaperManufacturer,
  useUpdatePaperManufacturer,
  useDeletePaperManufacturer,
  useCreatePaperSupplier,
  useUpdatePaperSupplier,
  useDeletePaperSupplier,
} from '@/hooks/use-paper';

import type {
  Paper,
  PaperManufacturer,
  PaperSupplier,
  CreatePaperDto,
  CreatePaperManufacturerDto,
  CreatePaperSupplierDto,
  PaperType,
  Finish,
} from '@/lib/types/paper';

import {
  PAPER_TYPE_OPTIONS,
  SHEET_SIZE_OPTIONS,
  ROLL_WIDTH_OPTIONS,
  ROLL_LENGTH_OPTIONS,
  FINISH_OPTIONS,
  PRINT_METHOD_OPTIONS,
  UNIT_TYPE_OPTIONS,
} from '@/lib/types/paper';

// 빈 문자열이나 NaN을 undefined로 변환하는 헬퍼
const optionalNumber = z.preprocess(
  (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
  z.number().optional()
);

const requiredNumber = (defaultVal: number) => z.preprocess(
  (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? defaultVal : Number(val)),
  z.number().min(0)
);

// 용지 폼 스키마
const paperSchema = z.object({
  code: z.string().optional(), // 자동 생성
  name: z.string().min(1, '용지명을 입력하세요'),
  manufacturerId: z.string().optional(),
  supplierId: z.string().optional(),
  paperType: z.enum(['roll', 'sheet']),
  sheetSize: z.string().optional(),
  customSheetName: z.string().optional(), // 별사이즈 규격명
  sheetWidthMm: optionalNumber,
  sheetHeightMm: optionalNumber,
  rollWidth: z.string().optional(),
  rollWidthInch: optionalNumber,
  rollLength: z.string().optional(),
  rollLengthM: optionalNumber,
  grammage: optionalNumber,
  finish: z.string().optional(),
  printMethods: z.array(z.string()).default([]),
  colorType: z.string().optional(),
  thickness: optionalNumber,
  basePrice: requiredNumber(0),
  unitType: z.string().default('sheet'),
  discountRate: requiredNumber(0),
  stockQuantity: requiredNumber(0),
  minStockLevel: requiredNumber(0),
  description: z.string().optional(),
  memo: z.string().optional(),
  sortOrder: requiredNumber(0),
  isActive: z.boolean().default(true),
});

type PaperFormData = z.infer<typeof paperSchema>;

// 제지사 폼 스키마
const manufacturerSchema = z.object({
  code: z.string().optional(), // 자동 생성
  name: z.string().min(1, '제지사명을 입력하세요'),
  country: z.string().optional(),
  website: z.string().optional(),
  contactInfo: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

type ManufacturerFormData = z.infer<typeof manufacturerSchema>;

// 용지대리점 폼 스키마
const supplierSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, '대리점명을 입력하세요'),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
  fax: z.string().optional(),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  addressDetail: z.string().optional(),
  representative: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  memo: z.string().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export default function PapersPage() {
  const [activeTab, setActiveTab] = useState('papers');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');

  // 용지 다이얼로그
  const [paperDialogOpen, setPaperDialogOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null);
  const [deletePaperId, setDeletePaperId] = useState<string | null>(null);

  // 제지사 다이얼로그
  const [manufacturerDialogOpen, setManufacturerDialogOpen] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState<PaperManufacturer | null>(null);
  const [deleteManufacturerId, setDeleteManufacturerId] = useState<string | null>(null);

  // 용지대리점 다이얼로그
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<PaperSupplier | null>(null);
  const [deleteSupplierId, setDeleteSupplierId] = useState<string | null>(null);

  // 데이터 조회
  const { data: papersData, isLoading: papersLoading } = usePapers({
    search: searchTerm || undefined,
    paperType: filterType !== 'all' ? filterType : undefined,
    printMethod: filterMethod !== 'all' ? filterMethod : undefined,
  });
  const { data: manufacturers, isLoading: manufacturersLoading } = usePaperManufacturers();
  const { data: suppliers, isLoading: suppliersLoading } = usePaperSuppliers();

  // 뮤테이션
  const createPaper = useCreatePaper();
  const updatePaper = useUpdatePaper();
  const deletePaper = useDeletePaper();
  const createManufacturer = useCreatePaperManufacturer();
  const updateManufacturer = useUpdatePaperManufacturer();
  const deleteManufacturer = useDeletePaperManufacturer();
  const createSupplier = useCreatePaperSupplier();
  const updateSupplier = useUpdatePaperSupplier();
  const deleteSupplier = useDeletePaperSupplier();

  // 용지 폼
  const paperForm = useForm<PaperFormData>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      paperType: 'sheet',
      basePrice: 0,
      unitType: 'sheet',
      discountRate: 0,
      stockQuantity: 0,
      minStockLevel: 0,
      sortOrder: 0,
      isActive: true,
    },
  });

  // 제지사 폼
  const manufacturerForm = useForm<ManufacturerFormData>({
    resolver: zodResolver(manufacturerSchema),
    defaultValues: {
      sortOrder: 0,
      isActive: true,
    },
  });

  // 용지대리점 폼
  const supplierForm = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      sortOrder: 0,
      isActive: true,
    },
  });

  const watchPaperType = paperForm.watch('paperType');

  // 용지 다이얼로그 열기
  const openPaperDialog = (paper?: Paper) => {
    if (paper) {
      setEditingPaper(paper);
      paperForm.reset({
        code: paper.code,
        name: paper.name,
        manufacturerId: paper.manufacturerId || undefined,
        supplierId: paper.supplierId || undefined,
        paperType: paper.paperType,
        sheetSize: paper.sheetSize || undefined,
        sheetWidthMm: paper.sheetWidthMm || undefined,
        sheetHeightMm: paper.sheetHeightMm || undefined,
        rollWidth: paper.rollWidth || undefined,
        rollWidthInch: paper.rollWidthInch || undefined,
        rollLength: paper.rollLength || undefined,
        rollLengthM: paper.rollLengthM || undefined,
        grammage: paper.grammage || undefined,
        finish: paper.finish || undefined,
        printMethods: paper.printMethods || [],
        colorType: paper.colorType || undefined,
        thickness: paper.thickness || undefined,
        basePrice: paper.basePrice || 0,
        unitType: paper.unitType || 'sheet',
        discountRate: paper.discountRate || 0,
        stockQuantity: paper.stockQuantity || 0,
        minStockLevel: paper.minStockLevel || 0,
        description: paper.description || undefined,
        memo: paper.memo || undefined,
        sortOrder: paper.sortOrder || 0,
        isActive: paper.isActive,
      });
    } else {
      setEditingPaper(null);
      // 자동 코드 생성
      const autoCode = `PAPER${Date.now().toString(36).toUpperCase()}`;
      paperForm.reset({
        code: autoCode,
        paperType: 'sheet',
        printMethods: [],
        basePrice: 0,
        unitType: 'sheet',
        discountRate: 0,
        stockQuantity: 0,
        minStockLevel: 0,
        sortOrder: 0,
        isActive: true,
      });
    }
    setPaperDialogOpen(true);
  };

  // 용지 저장
  const handlePaperSubmit = async (data: PaperFormData) => {
    console.log('폼 데이터:', data);
    try {
      if (editingPaper) {
        console.log('수정 요청:', { id: editingPaper.id, ...data });
        await updatePaper.mutateAsync({ id: editingPaper.id, ...data } as CreatePaperDto & { id: string });
      } else {
        console.log('등록 요청:', data);
        await createPaper.mutateAsync(data as CreatePaperDto);
      }
      setPaperDialogOpen(false);
      paperForm.reset();
    } catch (error: any) {
      console.error('용지 저장 실패:', error);
      console.error('에러 상세:', error.response?.data || error.message);
      alert(`저장 실패: ${error.response?.data?.message || error.message}`);
    }
  };

  // 용지 삭제
  const handleDeletePaper = async () => {
    if (!deletePaperId) return;
    try {
      await deletePaper.mutateAsync(deletePaperId);
      setDeletePaperId(null);
    } catch (error) {
      console.error('용지 삭제 실패:', error);
    }
  };

  // 제지사 다이얼로그 열기
  const openManufacturerDialog = (manufacturer?: PaperManufacturer) => {
    if (manufacturer) {
      setEditingManufacturer(manufacturer);
      manufacturerForm.reset({
        code: manufacturer.code,
        name: manufacturer.name,
        country: manufacturer.country || undefined,
        website: manufacturer.website || undefined,
        contactInfo: manufacturer.contactInfo || undefined,
        description: manufacturer.description || undefined,
        sortOrder: manufacturer.sortOrder || 0,
        isActive: manufacturer.isActive,
      });
    } else {
      setEditingManufacturer(null);
      // 자동 코드 생성
      const autoCode = `MF${Date.now().toString(36).toUpperCase()}`;
      manufacturerForm.reset({
        code: autoCode,
        sortOrder: 0,
        isActive: true,
      });
    }
    setManufacturerDialogOpen(true);
  };

  // 제지사 저장
  const handleManufacturerSubmit = async (data: ManufacturerFormData) => {
    console.log('handleManufacturerSubmit called with:', data);
    try {
      if (editingManufacturer) {
        console.log('Updating manufacturer:', editingManufacturer.id);
        await updateManufacturer.mutateAsync({ id: editingManufacturer.id, ...data });
      } else {
        // 코드 자동 생성: 제지사명 기반 + 타임스탬프
        const code = data.code || `MF${Date.now().toString(36).toUpperCase()}`;
        console.log('Creating new manufacturer with code:', code);
        const payload = { ...data, code } as CreatePaperManufacturerDto;
        console.log('Payload:', payload);
        const result = await createManufacturer.mutateAsync(payload);
        console.log('Create result:', result);
      }
      setManufacturerDialogOpen(false);
      manufacturerForm.reset();
    } catch (error: any) {
      console.error('제지사 저장 실패:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      alert(`제지사 저장 실패: ${error.response?.data?.message || error.message}`);
    }
  };

  // 제지사 삭제
  const handleDeleteManufacturer = async () => {
    if (!deleteManufacturerId) return;
    try {
      await deleteManufacturer.mutateAsync(deleteManufacturerId);
      setDeleteManufacturerId(null);
    } catch (error) {
      console.error('제지사 삭제 실패:', error);
    }
  };

  // 용지대리점 다이얼로그 열기
  const openSupplierDialog = (supplier?: PaperSupplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      supplierForm.reset({
        code: supplier.code,
        name: supplier.name,
        phone: supplier.phone || undefined,
        mobile: supplier.mobile || undefined,
        email: supplier.email || undefined,
        fax: supplier.fax || undefined,
        postalCode: supplier.postalCode || undefined,
        address: supplier.address || undefined,
        addressDetail: supplier.addressDetail || undefined,
        representative: supplier.representative || undefined,
        website: supplier.website || undefined,
        description: supplier.description || undefined,
        memo: supplier.memo || undefined,
        sortOrder: supplier.sortOrder || 0,
        isActive: supplier.isActive,
      });
    } else {
      setEditingSupplier(null);
      const autoCode = `SP${Date.now().toString(36).toUpperCase()}`;
      supplierForm.reset({
        code: autoCode,
        sortOrder: 0,
        isActive: true,
      });
    }
    setSupplierDialogOpen(true);
  };

  // 용지대리점 저장
  const handleSupplierSubmit = async (data: SupplierFormData) => {
    try {
      if (editingSupplier) {
        await updateSupplier.mutateAsync({ id: editingSupplier.id, ...data });
      } else {
        const code = data.code || `SP${Date.now().toString(36).toUpperCase()}`;
        const payload = { ...data, code } as CreatePaperSupplierDto;
        await createSupplier.mutateAsync(payload);
      }
      setSupplierDialogOpen(false);
      supplierForm.reset();
    } catch (error: any) {
      console.error('용지대리점 저장 실패:', error);
      alert(`용지대리점 저장 실패: ${error.message}`);
    }
  };

  // 용지대리점 삭제
  const handleDeleteSupplier = async () => {
    if (!deleteSupplierId) return;
    try {
      await deleteSupplier.mutateAsync(deleteSupplierId);
      setDeleteSupplierId(null);
    } catch (error) {
      console.error('용지대리점 삭제 실패:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">용지 관리</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="papers" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            용지 목록
          </TabsTrigger>
          <TabsTrigger value="manufacturers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            제지사 관리
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            용지대리점 관리
          </TabsTrigger>
        </TabsList>

        {/* 용지 목록 탭 */}
        <TabsContent value="papers" className="space-y-4">
          {/* 상단 필터 영역 */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="용지명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[120px] bg-white">
                  <SelectValue placeholder="구분" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {PAPER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger className="w-[130px] bg-white">
                  <SelectValue placeholder="인쇄방식" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {PRINT_METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button onClick={() => openPaperDialog()} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                용지 추가
              </Button>
            </div>
          </div>

          {/* 간소화된 테이블 */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">용지명</TableHead>
                  <TableHead>평량</TableHead>
                  <TableHead>제지사</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>규격</TableHead>
                  <TableHead>인쇄방식</TableHead>
                  <TableHead className="text-right">단가</TableHead>
                  <TableHead className="text-right">4절 장당</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="w-[80px] text-center">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {papersLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                        로딩 중...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !papersData?.data?.length ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        등록된 용지가 없습니다
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  papersData.data.map((paper: Paper) => (
                    <TableRow key={paper.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{paper.name}</TableCell>
                      <TableCell className="text-slate-600">
                        {paper.grammage ? `${paper.grammage}g` : '-'}
                      </TableCell>
                      <TableCell className="text-slate-600">{paper.manufacturer?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={paper.paperType === 'roll' ? 'default' : 'secondary'} className="text-xs">
                          {paper.paperType === 'roll' ? '롤지' : '낱장지'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {paper.paperType === 'sheet'
                          ? paper.sheetSize || '-'
                          : `${paper.rollWidth || ''} × ${paper.rollLength || ''}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {paper.printMethods?.length ? (
                            paper.printMethods.map((method) => (
                              <Badge key={method} variant="outline" className="text-xs">
                                {PRINT_METHOD_OPTIONS.find((m) => m.value === method)?.label || method}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {paper.basePrice?.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {paper.unitType === 'ream'
                          ? `${(paper.basePrice / 2000).toFixed(1)}원`
                          : paper.unitType === 'sheet'
                          ? `${(paper.basePrice / 4).toFixed(1)}원`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={paper.isActive ? 'default' : 'outline'} className="text-xs">
                          {paper.isActive ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openPaperDialog(paper)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => setDeletePaperId(paper.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {papersData?.meta && (
            <div className="text-sm text-muted-foreground text-center">
              전체 {papersData.meta.total}개 중 {papersData.data.length}개 표시
            </div>
          )}
        </TabsContent>

        {/* 제지사 관리 탭 */}
        <TabsContent value="manufacturers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openManufacturerDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              제지사 추가
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">코드</TableHead>
                  <TableHead>제지사명</TableHead>
                  <TableHead>국가</TableHead>
                  <TableHead>웹사이트</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead className="text-right">용지 수</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-[100px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manufacturersLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : !manufacturers?.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      등록된 제지사가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  manufacturers.map((manufacturer) => (
                    <TableRow key={manufacturer.id}>
                      <TableCell className="font-mono text-sm">{manufacturer.code}</TableCell>
                      <TableCell className="font-medium">{manufacturer.name}</TableCell>
                      <TableCell>{manufacturer.country || '-'}</TableCell>
                      <TableCell>
                        {manufacturer.website ? (
                          <a
                            href={manufacturer.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {manufacturer.website}
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{manufacturer.contactInfo || '-'}</TableCell>
                      <TableCell className="text-right">{manufacturer._count?.papers || 0}개</TableCell>
                      <TableCell>
                        <Badge variant={manufacturer.isActive ? 'default' : 'outline'}>
                          {manufacturer.isActive ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openManufacturerDialog(manufacturer)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteManufacturerId(manufacturer.id)}
                            disabled={(manufacturer._count?.papers || 0) > 0}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 용지대리점 관리 탭 */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openSupplierDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              대리점 추가
            </Button>
          </div>

          {suppliersLoading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : !suppliers?.length ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              등록된 대리점이 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{supplier.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{supplier.code}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openSupplierDialog(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteSupplierId(supplier.id)}
                        disabled={(supplier._count?.papers || 0) > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    {supplier.representative && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-16">담당자</span>
                        <span>{supplier.representative}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-16">전화</span>
                        <span>{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.mobile && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-16">휴대폰</span>
                        <span>{supplier.mobile}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-16">이메일</span>
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge variant={supplier.isActive ? 'default' : 'outline'} className="text-xs">
                      {supplier.isActive ? '활성' : '비활성'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      용지 {supplier._count?.papers || 0}개
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 용지 등록/수정 다이얼로그 */}
      <Dialog open={paperDialogOpen} onOpenChange={setPaperDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPaper ? '용지 수정' : '용지 등록'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={paperForm.handleSubmit(handlePaperSubmit, (errors) => {
            console.error('폼 검증 에러:', errors);
          })} className="space-y-4">
            {/* 용지 코드 숨김 - 자동 생성 */}
            <input type="hidden" {...paperForm.register('code')} />

            <div className="space-y-2">
              <Label htmlFor="name">용지명 *</Label>
              <Input
                id="name"
                {...paperForm.register('name')}
                placeholder="프리미엄 광택지"
              />
              {paperForm.formState.errors.name && (
                <p className="text-sm text-destructive">{paperForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>제지사</Label>
                <div className="flex gap-2">
                  <Select
                    value={paperForm.watch('manufacturerId') || ''}
                    onValueChange={(v) => paperForm.setValue('manufacturerId', v || undefined)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="제지사 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {manufacturersLoading ? (
                        <SelectItem value="_loading" disabled>로딩 중...</SelectItem>
                      ) : !manufacturers?.length ? (
                        <SelectItem value="_empty" disabled>등록된 제지사가 없습니다</SelectItem>
                      ) : (
                        manufacturers.map((m: PaperManufacturer) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => openManufacturerDialog()}
                    title="제지사 추가"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>용지대리점</Label>
                <div className="flex gap-2">
                  <Select
                    value={paperForm.watch('supplierId') || ''}
                    onValueChange={(v) => paperForm.setValue('supplierId', v || undefined)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="대리점 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliersLoading ? (
                        <SelectItem value="_loading" disabled>로딩 중...</SelectItem>
                      ) : !suppliers?.length ? (
                        <SelectItem value="_empty" disabled>등록된 대리점이 없습니다</SelectItem>
                      ) : (
                        suppliers.map((s: PaperSupplier) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => openSupplierDialog()}
                    title="대리점 추가"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>용지 구분 *</Label>
                <Select
                  value={paperForm.watch('paperType')}
                  onValueChange={(v) => {
                    paperForm.setValue('paperType', v as PaperType);
                    // 용지 구분 변경 시 단가 단위 자동 변경
                    if (v === 'roll') {
                      paperForm.setValue('unitType', 'roll');
                    } else {
                      paperForm.setValue('unitType', 'sheet');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 낱장지 규격 */}
            {watchPaperType === 'sheet' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>용지 규격</Label>
                    <Select
                      value={paperForm.watch('sheetSize') || ''}
                      onValueChange={(v) => {
                        paperForm.setValue('sheetSize', v);
                        // 자동 MM 입력
                        const selected = SHEET_SIZE_OPTIONS.find(opt => opt.value === v);
                        if (selected && selected.width > 0) {
                          paperForm.setValue('sheetWidthMm', selected.width);
                          paperForm.setValue('sheetHeightMm', selected.height);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="규격 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {SHEET_SIZE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>가로 (mm)</Label>
                    <Input
                      type="number"
                      {...paperForm.register('sheetWidthMm', { valueAsNumber: true })}
                      placeholder="788"
                      readOnly={paperForm.watch('sheetSize') !== 'custom'}
                      className={paperForm.watch('sheetSize') !== 'custom' ? 'bg-gray-100' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>세로 (mm)</Label>
                    <Input
                      type="number"
                      {...paperForm.register('sheetHeightMm', { valueAsNumber: true })}
                      placeholder="1091"
                      readOnly={paperForm.watch('sheetSize') !== 'custom'}
                      className={paperForm.watch('sheetSize') !== 'custom' ? 'bg-gray-100' : ''}
                    />
                  </div>
                </div>
                {/* 별사이즈 규격명 입력 */}
                {paperForm.watch('sheetSize') === 'custom' && (
                  <div className="space-y-2">
                    <Label>별사이즈 규격명</Label>
                    <Input
                      {...paperForm.register('customSheetName')}
                      placeholder="예: 특수규격 500x700"
                    />
                  </div>
                )}
              </>
            )}

            {/* 롤지 규격 */}
            {watchPaperType === 'roll' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>용지폭</Label>
                  <Select
                    value={paperForm.watch('rollWidth') || ''}
                    onValueChange={(v) => paperForm.setValue('rollWidth', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="용지폭 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLL_WIDTH_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>용지길이</Label>
                  <Select
                    value={paperForm.watch('rollLength') || ''}
                    onValueChange={(v) => paperForm.setValue('rollLength', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="용지길이 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLL_LENGTH_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>평량 (g/m²)</Label>
                <Input
                  type="number"
                  {...paperForm.register('grammage', { valueAsNumber: true })}
                  placeholder="210"
                />
              </div>
              <div className="space-y-2">
                <Label>표면 질감</Label>
                <Select
                  value={paperForm.watch('finish') || ''}
                  onValueChange={(v) => paperForm.setValue('finish', v as Finish)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {FINISH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>인쇄방식 (복수선택)</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white">
                  {PRINT_METHOD_OPTIONS.filter(opt => opt.value !== 'both').map((opt) => {
                    const currentMethods = paperForm.watch('printMethods') || [];
                    const isChecked = currentMethods.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer border transition-colors ${
                          isChecked
                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newMethods = e.target.checked
                              ? [...currentMethods, opt.value]
                              : currentMethods.filter((m: string) => m !== opt.value);
                            paperForm.setValue('printMethods', newMethods);
                          }}
                          className="sr-only"
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>단가 단위</Label>
                <Select
                  value={paperForm.watch('unitType') || 'sheet'}
                  onValueChange={(v) => paperForm.setValue('unitType', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {paperForm.watch('unitType') === 'ream' ? '연당 가격 (원)' :
                   paperForm.watch('unitType') === 'roll' ? '롤당 가격 (원)' :
                   paperForm.watch('unitType') === 'sqm' ? '㎡당 가격 (원)' :
                   '장당 가격 (원)'}
                </Label>
                <Input
                  type="number"
                  {...paperForm.register('basePrice', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>할인율 (%)</Label>
                <Input
                  type="number"
                  {...paperForm.register('discountRate', { valueAsNumber: true })}
                  placeholder="0"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* 연당 가격 선택시 절수별 계산 표시 */}
            {paperForm.watch('unitType') === 'ream' && paperForm.watch('basePrice') > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">절수별 장당 가격 계산 (1연 = 500장 기준)</h4>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  {[
                    { name: '전지', sheets: 1 },
                    { name: '2절', sheets: 2 },
                    { name: '4절', sheets: 4 },
                    { name: '8절', sheets: 8 },
                    { name: '16절', sheets: 16 },
                    { name: '32절', sheets: 32 },
                  ].map((cut) => {
                    const reamsPrice = paperForm.watch('basePrice') || 0;
                    const sheetsPerReam = 500;
                    const totalSheets = sheetsPerReam * cut.sheets;
                    const pricePerSheet = reamsPrice / totalSheets;
                    return (
                      <div key={cut.name} className="bg-white rounded p-2 border">
                        <div className="font-medium text-blue-800">{cut.name}</div>
                        <div className="text-gray-600">{totalSheets.toLocaleString()}장</div>
                        <div className="text-blue-600 font-semibold">
                          {parseFloat(pricePerSheet.toFixed(1))}원/장
                        </div>
                      </div>
                    );
                  })}
                </div>
                {paperForm.watch('sheetSize') && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="text-blue-800">
                      <span className="font-medium">선택된 규격({paperForm.watch('sheetSize')}) 기준:</span>
                      {(() => {
                        const selectedSize = SHEET_SIZE_OPTIONS.find(s => s.value === paperForm.watch('sheetSize'));
                        if (!selectedSize || selectedSize.value === 'custom') return null;

                        // 국전지(788x1091) 기준 절수 계산
                        const fullSheetArea = 788 * 1091;
                        const selectedArea = selectedSize.width * selectedSize.height;
                        const cutsFromFullSheet = Math.floor(fullSheetArea / selectedArea);

                        const reamsPrice = paperForm.watch('basePrice') || 0;
                        const sheetsPerReam = 500;
                        const totalSheets = sheetsPerReam * cutsFromFullSheet;
                        const pricePerSheet = reamsPrice / totalSheets;

                        return (
                          <span className="ml-2">
                            국전지 1장당 약 <strong>{cutsFromFullSheet}장</strong> 절단 가능,
                            1연당 <strong>{totalSheets.toLocaleString()}장</strong>,
                            장당 <strong className="text-blue-600">{parseFloat(pricePerSheet.toFixed(1))}원</strong>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                {...paperForm.register('description')}
                placeholder="용지에 대한 설명을 입력하세요"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>관리자 메모</Label>
              <Textarea
                {...paperForm.register('memo')}
                placeholder="관리자 메모"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={paperForm.watch('isActive')}
                  onCheckedChange={(v) => paperForm.setValue('isActive', v)}
                />
                <Label>활성화</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setPaperDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={createPaper.isPending || updatePaper.isPending}>
                  {editingPaper ? '수정' : '등록'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 제지사 등록/수정 다이얼로그 */}
      <Dialog open={manufacturerDialogOpen} onOpenChange={setManufacturerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingManufacturer ? '제지사 수정' : '제지사 등록'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={manufacturerForm.handleSubmit(handleManufacturerSubmit)} className="space-y-4">
            {/* 제지사 코드 숨김 - 자동 생성 */}
            <input type="hidden" {...manufacturerForm.register('code')} />

            <div className="space-y-2">
              <Label htmlFor="mfName">제지사명 *</Label>
              <Input
                id="mfName"
                {...manufacturerForm.register('name')}
                placeholder="신호제지"
              />
              {manufacturerForm.formState.errors.name && (
                <p className="text-sm text-destructive">{manufacturerForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>국가</Label>
              <Input {...manufacturerForm.register('country')} placeholder="한국" />
            </div>
            <div className="space-y-2">
              <Label>웹사이트</Label>
              <Input {...manufacturerForm.register('website')} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>연락처</Label>
              <Input {...manufacturerForm.register('contactInfo')} placeholder="02-000-0000" />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea {...manufacturerForm.register('description')} rows={2} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={manufacturerForm.watch('isActive')}
                  onCheckedChange={(v) => manufacturerForm.setValue('isActive', v)}
                />
                <Label>활성화</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setManufacturerDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={createManufacturer.isPending || updateManufacturer.isPending}>
                  {editingManufacturer ? '수정' : '등록'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 용지 삭제 확인 */}
      <AlertDialog open={!!deletePaperId} onOpenChange={() => setDeletePaperId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>용지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 용지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePaper} className="bg-destructive text-destructive-foreground">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 제지사 삭제 확인 */}
      <AlertDialog open={!!deleteManufacturerId} onOpenChange={() => setDeleteManufacturerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>제지사 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 제지사를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteManufacturer} className="bg-destructive text-destructive-foreground">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 용지대리점 등록/수정 다이얼로그 */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? '용지대리점 수정' : '용지대리점 등록'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={supplierForm.handleSubmit(handleSupplierSubmit)} className="space-y-4">
            <input type="hidden" {...supplierForm.register('code')} />

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spName">대리점명 *</Label>
                <Input
                  id="spName"
                  {...supplierForm.register('name')}
                  placeholder="대한용지"
                />
                {supplierForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{supplierForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>담당자</Label>
                <Input {...supplierForm.register('representative')} placeholder="홍길동" />
              </div>
              <div className="space-y-2">
                <Label>웹사이트</Label>
                <Input {...supplierForm.register('website')} placeholder="https://..." />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>전화번호</Label>
                <Input {...supplierForm.register('phone')} placeholder="02-000-0000" />
              </div>
              <div className="space-y-2">
                <Label>휴대폰</Label>
                <Input {...supplierForm.register('mobile')} placeholder="010-0000-0000" />
              </div>
              <div className="space-y-2">
                <Label>팩스</Label>
                <Input {...supplierForm.register('fax')} placeholder="02-000-0001" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input {...supplierForm.register('email')} placeholder="example@email.com" />
              </div>
              <div className="space-y-2">
                <Label>우편번호</Label>
                <Input {...supplierForm.register('postalCode')} placeholder="12345" />
              </div>
              <div className="space-y-2">
                <Label>주소</Label>
                <Input {...supplierForm.register('address')} placeholder="주소" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>상세주소</Label>
              <Input {...supplierForm.register('addressDetail')} placeholder="상세주소" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea {...supplierForm.register('description')} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>관리자 메모</Label>
                <Textarea {...supplierForm.register('memo')} rows={2} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={supplierForm.watch('isActive')}
                  onCheckedChange={(v) => supplierForm.setValue('isActive', v)}
                />
                <Label>활성화</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setSupplierDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending}>
                  {editingSupplier ? '수정' : '등록'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 용지대리점 삭제 확인 */}
      <AlertDialog open={!!deleteSupplierId} onOpenChange={() => setDeleteSupplierId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>용지대리점 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 대리점을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSupplier} className="bg-destructive text-destructive-foreground">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
