'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Palette, BookOpen, FoldVertical, FileCheck, Shield, FileType, RefreshCw, Search } from 'lucide-react';
import {
  useColorIntents,
  useCreateColorIntent,
  useUpdateColorIntent,
  useDeleteColorIntent,
  useBindingIntents,
  useCreateBindingIntent,
  useUpdateBindingIntent,
  useDeleteBindingIntent,
  useFoldingIntents,
  useCreateFoldingIntent,
  useUpdateFoldingIntent,
  useDeleteFoldingIntent,
  useProofingIntents,
  useCreateProofingIntent,
  useUpdateProofingIntent,
  useDeleteProofingIntent,
  useFileSpecs,
  useCreateFileSpec,
  useUpdateFileSpec,
  useDeleteFileSpec,
  useQualityControls,
  useCreateQualityControl,
  useUpdateQualityControl,
  useDeleteQualityControl,
} from '@/hooks/use-jdf';
import type {
  ColorIntent,
  BindingIntent,
  FoldingIntent,
  ProofingIntent,
  FileSpec,
  QualityControl,
} from '@/lib/types/jdf';

export default function JdfManagementPage() {
  const [activeTab, setActiveTab] = useState('color');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">JDF 표준 관리</h1>
            <p className="text-sm text-slate-500 mt-1">
              CIP4 JDF Product Intent 규격에 맞는 인쇄 표준 설정을 관리합니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              CIP4 JDF 1.7
            </Badge>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border border-slate-200 p-1 h-auto flex-wrap">
            <TabsTrigger
              value="color"
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Palette className="h-4 w-4" />
              <span>색상 의도</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">ColorIntent</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="binding"
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <BookOpen className="h-4 w-4" />
              <span>제본 의도</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">BindingIntent</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="folding"
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <FoldVertical className="h-4 w-4" />
              <span>접지 의도</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">FoldingIntent</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="proofing"
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <FileCheck className="h-4 w-4" />
              <span>교정 의도</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">ProofingIntent</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="filespec"
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <FileType className="h-4 w-4" />
              <span>파일 규격</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">FileSpec</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="quality"
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Shield className="h-4 w-4" />
              <span>품질 기준</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">QualityControl</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="color" className="mt-4">
            <ColorIntentTab />
          </TabsContent>

          <TabsContent value="binding" className="mt-4">
            <BindingIntentTab />
          </TabsContent>

          <TabsContent value="folding" className="mt-4">
            <FoldingIntentTab />
          </TabsContent>

          <TabsContent value="proofing" className="mt-4">
            <ProofingIntentTab />
          </TabsContent>

          <TabsContent value="filespec" className="mt-4">
            <FileSpecTab />
          </TabsContent>

          <TabsContent value="quality" className="mt-4">
            <QualityControlTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ==================== ColorIntent Tab ====================
function ColorIntentTab() {
  const { data: colorIntents = [], isLoading, refetch } = useColorIntents(true);
  const createMutation = useCreateColorIntent();
  const updateMutation = useUpdateColorIntent();
  const deleteMutation = useDeleteColorIntent();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ColorIntent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    numColorsFront: 4,
    numColorsBack: 0,
    colorType: 'Process',
    displayNameKo: '',
    isActive: true,
  });

  const filteredData = colorIntents.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      numColorsFront: 4,
      numColorsBack: 0,
      colorType: 'Process',
      displayNameKo: '',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: ColorIntent) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      numColorsFront: item.numColorsFront,
      numColorsBack: item.numColorsBack,
      colorType: item.colorType,
      displayNameKo: item.displayNameKo || '',
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteMutation.mutateAsync(deletingId);
      setIsDeleteOpen(false);
      setDeletingId(null);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-600" />
              ColorIntent (색상 의도)
            </CardTitle>
            <CardDescription className="mt-1">인쇄 도수 및 색상 설정을 관리합니다</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" />
              추가
            </Button>
          </div>
        </div>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="코드 또는 이름으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">로딩 중...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">코드</TableHead>
                <TableHead className="font-semibold">이름</TableHead>
                <TableHead className="font-semibold text-center">앞면</TableHead>
                <TableHead className="font-semibold text-center">뒷면</TableHead>
                <TableHead className="font-semibold">색상유형</TableHead>
                <TableHead className="font-semibold">한국어명</TableHead>
                <TableHead className="font-semibold text-center">상태</TableHead>
                <TableHead className="font-semibold text-center w-[100px]">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    데이터가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm text-indigo-600 font-medium">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                        {item.numColorsFront}도
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {item.numColorsBack}도
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">{item.colorType}</TableCell>
                    <TableCell className="text-slate-600">{item.displayNameKo || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={item.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}>
                        {item.isActive ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-indigo-600" onClick={() => handleOpenEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-red-600" onClick={() => { setDeletingId(item.id); setIsDeleteOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-600" />
              {editingItem ? '색상 의도 수정' : '색상 의도 추가'}
            </DialogTitle>
            <DialogDescription>색상 도수 및 코팅 설정을 입력하세요</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">코드 *</Label>
                <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="CI-4C-2S" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="4도 양면" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numColorsFront">앞면 도수</Label>
                <Select value={String(formData.numColorsFront)} onValueChange={(v) => setFormData({ ...formData, numColorsFront: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 4, 6, 8].map(n => <SelectItem key={n} value={String(n)}>{n}도</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numColorsBack">뒷면 도수</Label>
                <Select value={String(formData.numColorsBack)} onValueChange={(v) => setFormData({ ...formData, numColorsBack: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 4, 6, 8].map(n => <SelectItem key={n} value={String(n)}>{n}도</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="colorType">색상 유형</Label>
                <Select value={formData.colorType} onValueChange={(v) => setFormData({ ...formData, colorType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Process">Process (CMYK)</SelectItem>
                    <SelectItem value="Spot">Spot (별색)</SelectItem>
                    <SelectItem value="Mixed">Mixed (혼합)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayNameKo">한국어명</Label>
                <Input id="displayNameKo" value={formData.displayNameKo} onChange={(e) => setFormData({ ...formData, displayNameKo: e.target.value })} placeholder="4도 풀컬러 양면" />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch id="isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
              <Label htmlFor="isActive">활성화</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>이 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ==================== BindingIntent Tab ====================
function BindingIntentTab() {
  const { data: bindingIntents = [], isLoading, refetch } = useBindingIntents(true);
  const createMutation = useCreateBindingIntent();
  const updateMutation = useUpdateBindingIntent();
  const deleteMutation = useDeleteBindingIntent();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BindingIntent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    jdfBindingType: 'SoftCover',
    jdfBindingSide: 'Left',
    displayNameKo: '',
    basePrice: 0,
    isActive: true,
  });

  const filteredData = bindingIntents.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', jdfBindingType: 'SoftCover', jdfBindingSide: 'Left', displayNameKo: '', basePrice: 0, isActive: true });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: BindingIntent) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      jdfBindingType: item.jdfBindingType,
      jdfBindingSide: item.jdfBindingSide,
      displayNameKo: item.displayNameKo || '',
      basePrice: Number(item.basePrice) || 0,
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteMutation.mutateAsync(deletingId);
      setIsDeleteOpen(false);
      setDeletingId(null);
    }
  };

  const bindingTypeLabels: Record<string, string> = {
    SoftCover: '무선제본',
    HardCover: '양장제본',
    Saddle: '중철제본',
    Ring: '링제본',
    Wire: '와이어제본',
    Perfect: 'PUR제본',
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              BindingIntent (제본 의도)
            </CardTitle>
            <CardDescription className="mt-1">제본 방식 설정을 관리합니다</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
            <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" />추가
            </Button>
          </div>
        </div>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">로딩 중...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">코드</TableHead>
                <TableHead className="font-semibold">이름</TableHead>
                <TableHead className="font-semibold">JDF 유형</TableHead>
                <TableHead className="font-semibold">위치</TableHead>
                <TableHead className="font-semibold">한국어명</TableHead>
                <TableHead className="font-semibold text-right">기본가격</TableHead>
                <TableHead className="font-semibold text-center">상태</TableHead>
                <TableHead className="font-semibold text-center w-[100px]">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">데이터가 없습니다</TableCell></TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm text-indigo-600 font-medium">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {bindingTypeLabels[item.jdfBindingType] || item.jdfBindingType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">{item.jdfBindingSide}</TableCell>
                    <TableCell className="text-slate-600">{item.displayNameKo || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{Number(item.basePrice).toLocaleString()}원</TableCell>
                    <TableCell className="text-center">
                      <Badge className={item.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}>
                        {item.isActive ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-indigo-600" onClick={() => handleOpenEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-red-600" onClick={() => { setDeletingId(item.id); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-600" />{editingItem ? '제본 의도 수정' : '제본 의도 추가'}</DialogTitle>
            <DialogDescription>제본 방식 설정을 입력하세요</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>코드 *</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="BI-SOFT" /></div>
              <div className="space-y-2"><Label>이름 *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="무선제본" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>JDF 제본 유형</Label>
                <Select value={formData.jdfBindingType} onValueChange={(v) => setFormData({ ...formData, jdfBindingType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SoftCover">SoftCover (무선)</SelectItem>
                    <SelectItem value="HardCover">HardCover (양장)</SelectItem>
                    <SelectItem value="Saddle">Saddle (중철)</SelectItem>
                    <SelectItem value="Ring">Ring (링)</SelectItem>
                    <SelectItem value="Wire">Wire (와이어)</SelectItem>
                    <SelectItem value="Perfect">Perfect (PUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>제본 위치</Label>
                <Select value={formData.jdfBindingSide} onValueChange={(v) => setFormData({ ...formData, jdfBindingSide: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Left">Left (좌철)</SelectItem>
                    <SelectItem value="Right">Right (우철)</SelectItem>
                    <SelectItem value="Top">Top (상철)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>한국어명</Label><Input value={formData.displayNameKo} onChange={(e) => setFormData({ ...formData, displayNameKo: e.target.value })} placeholder="무선(소프트커버) 제본" /></div>
              <div className="space-y-2"><Label>기본가격 (원)</Label><Input type="number" value={formData.basePrice} onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center gap-3 pt-2"><Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} /><Label>활성화</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button><Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">저장</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>삭제 확인</AlertDialogTitle><AlertDialogDescription>이 항목을 삭제하시겠습니까?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ==================== FoldingIntent Tab ====================
function FoldingIntentTab() {
  const { data: foldingIntents = [], isLoading, refetch } = useFoldingIntents(true);
  const createMutation = useCreateFoldingIntent();
  const updateMutation = useUpdateFoldingIntent();
  const deleteMutation = useDeleteFoldingIntent();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoldingIntent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ code: '', name: '', jdfFoldCatalog: '', foldCount: 1, displayNameKo: '', basePrice: 0, isActive: true });

  const filteredData = foldingIntents.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpenCreate = () => { setEditingItem(null); setFormData({ code: '', name: '', jdfFoldCatalog: '', foldCount: 1, displayNameKo: '', basePrice: 0, isActive: true }); setIsDialogOpen(true); };
  const handleOpenEdit = (item: FoldingIntent) => { setEditingItem(item); setFormData({ code: item.code, name: item.name, jdfFoldCatalog: item.jdfFoldCatalog || '', foldCount: item.foldCount, displayNameKo: item.displayNameKo || '', basePrice: Number(item.basePrice) || 0, isActive: item.isActive }); setIsDialogOpen(true); };
  const handleSave = async () => { if (editingItem) { await updateMutation.mutateAsync({ id: editingItem.id, data: formData }); } else { await createMutation.mutateAsync(formData); } setIsDialogOpen(false); };
  const handleDelete = async () => { if (deletingId) { await deleteMutation.mutateAsync(deletingId); setIsDeleteOpen(false); setDeletingId(null); } };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2"><FoldVertical className="h-5 w-5 text-indigo-600" />FoldingIntent (접지 의도)</CardTitle>
            <CardDescription className="mt-1">접지 방식 설정을 관리합니다</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
            <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-2" />추가</Button>
          </div>
        </div>
        <div className="mt-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white" /></div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-12 text-slate-500">로딩 중...</div> : (
          <Table>
            <TableHeader><TableRow className="bg-slate-50"><TableHead className="font-semibold">코드</TableHead><TableHead className="font-semibold">이름</TableHead><TableHead className="font-semibold">JDF 카탈로그</TableHead><TableHead className="font-semibold text-center">접지 횟수</TableHead><TableHead className="font-semibold">한국어명</TableHead><TableHead className="font-semibold text-right">기본가격</TableHead><TableHead className="font-semibold text-center">상태</TableHead><TableHead className="font-semibold text-center w-[100px]">관리</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredData.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">데이터가 없습니다</TableCell></TableRow> : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm text-indigo-600 font-medium">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">{item.jdfFoldCatalog || '-'}</Badge></TableCell>
                    <TableCell className="text-center">{item.foldCount}회</TableCell>
                    <TableCell className="text-slate-600">{item.displayNameKo || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{Number(item.basePrice).toLocaleString()}원</TableCell>
                    <TableCell className="text-center"><Badge className={item.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}>{item.isActive ? '활성' : '비활성'}</Badge></TableCell>
                    <TableCell><div className="flex justify-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-indigo-600" onClick={() => handleOpenEdit(item)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-red-600" onClick={() => { setDeletingId(item.id); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FoldVertical className="h-5 w-5 text-indigo-600" />{editingItem ? '접지 의도 수정' : '접지 의도 추가'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>코드 *</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} /></div><div className="space-y-2"><Label>이름 *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div></div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>JDF 카탈로그</Label><Input value={formData.jdfFoldCatalog} onChange={(e) => setFormData({ ...formData, jdfFoldCatalog: e.target.value })} placeholder="F2-1, Z, Gate" /></div><div className="space-y-2"><Label>접지 횟수</Label><Input type="number" value={formData.foldCount} onChange={(e) => setFormData({ ...formData, foldCount: Number(e.target.value) })} /></div></div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>한국어명</Label><Input value={formData.displayNameKo} onChange={(e) => setFormData({ ...formData, displayNameKo: e.target.value })} /></div><div className="space-y-2"><Label>기본가격</Label><Input type="number" value={formData.basePrice} onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })} /></div></div>
            <div className="flex items-center gap-3 pt-2"><Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} /><Label>활성화</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button><Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">저장</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>삭제 확인</AlertDialogTitle><AlertDialogDescription>이 항목을 삭제하시겠습니까?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </Card>
  );
}

// ==================== ProofingIntent Tab ====================
function ProofingIntentTab() {
  const { data: proofingIntents = [], isLoading, refetch } = useProofingIntents(true);
  const createMutation = useCreateProofingIntent();
  const updateMutation = useUpdateProofingIntent();
  const deleteMutation = useDeleteProofingIntent();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProofingIntent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ code: '', name: '', jdfProofType: '', isColorProof: false, isContractProof: false, displayNameKo: '', isActive: true });

  const filteredData = proofingIntents.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpenCreate = () => { setEditingItem(null); setFormData({ code: '', name: '', jdfProofType: '', isColorProof: false, isContractProof: false, displayNameKo: '', isActive: true }); setIsDialogOpen(true); };
  const handleOpenEdit = (item: ProofingIntent) => { setEditingItem(item); setFormData({ code: item.code, name: item.name, jdfProofType: item.jdfProofType || '', isColorProof: item.isColorProof, isContractProof: item.isContractProof, displayNameKo: item.displayNameKo || '', isActive: item.isActive }); setIsDialogOpen(true); };
  const handleSave = async () => { if (editingItem) { await updateMutation.mutateAsync({ id: editingItem.id, data: formData }); } else { await createMutation.mutateAsync(formData); } setIsDialogOpen(false); };
  const handleDelete = async () => { if (deletingId) { await deleteMutation.mutateAsync(deletingId); setIsDeleteOpen(false); setDeletingId(null); } };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div><CardTitle className="text-lg flex items-center gap-2"><FileCheck className="h-5 w-5 text-indigo-600" />ProofingIntent (교정 의도)</CardTitle><CardDescription className="mt-1">교정쇄 설정을 관리합니다</CardDescription></div>
          <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button><Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-2" />추가</Button></div>
        </div>
        <div className="mt-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white" /></div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-12 text-slate-500">로딩 중...</div> : (
          <Table>
            <TableHeader><TableRow className="bg-slate-50"><TableHead className="font-semibold">코드</TableHead><TableHead className="font-semibold">이름</TableHead><TableHead className="font-semibold">JDF 유형</TableHead><TableHead className="font-semibold text-center">컬러교정</TableHead><TableHead className="font-semibold text-center">계약교정</TableHead><TableHead className="font-semibold">한국어명</TableHead><TableHead className="font-semibold text-center">상태</TableHead><TableHead className="font-semibold text-center w-[100px]">관리</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredData.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">데이터가 없습니다</TableCell></TableRow> : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm text-indigo-600 font-medium">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{item.jdfProofType || '-'}</Badge></TableCell>
                    <TableCell className="text-center">{item.isColorProof ? <Badge className="bg-blue-100 text-blue-700">Yes</Badge> : <span className="text-slate-400">-</span>}</TableCell>
                    <TableCell className="text-center">{item.isContractProof ? <Badge className="bg-blue-100 text-blue-700">Yes</Badge> : <span className="text-slate-400">-</span>}</TableCell>
                    <TableCell className="text-slate-600">{item.displayNameKo || '-'}</TableCell>
                    <TableCell className="text-center"><Badge className={item.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}>{item.isActive ? '활성' : '비활성'}</Badge></TableCell>
                    <TableCell><div className="flex justify-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-indigo-600" onClick={() => handleOpenEdit(item)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-red-600" onClick={() => { setDeletingId(item.id); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5 text-indigo-600" />{editingItem ? '교정 의도 수정' : '교정 의도 추가'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>코드 *</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} /></div><div className="space-y-2"><Label>이름 *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>JDF 유형</Label><Select value={formData.jdfProofType} onValueChange={(v) => setFormData({ ...formData, jdfProofType: v })}><SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger><SelectContent><SelectItem value="None">None</SelectItem><SelectItem value="Digital">Digital</SelectItem><SelectItem value="Proof">Proof</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>한국어명</Label><Input value={formData.displayNameKo} onChange={(e) => setFormData({ ...formData, displayNameKo: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2"><Switch checked={formData.isColorProof} onCheckedChange={(checked) => setFormData({ ...formData, isColorProof: checked })} /><Label>컬러교정</Label></div>
              <div className="flex items-center gap-2"><Switch checked={formData.isContractProof} onCheckedChange={(checked) => setFormData({ ...formData, isContractProof: checked })} /><Label>계약교정</Label></div>
              <div className="flex items-center gap-2"><Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} /><Label>활성화</Label></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button><Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">저장</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>삭제 확인</AlertDialogTitle><AlertDialogDescription>이 항목을 삭제하시겠습니까?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </Card>
  );
}

// ==================== FileSpec Tab ====================
function FileSpecTab() {
  const { data: fileSpecs = [], isLoading, refetch } = useFileSpecs(true);
  const createMutation = useCreateFileSpec();
  const updateMutation = useUpdateFileSpec();
  const deleteMutation = useDeleteFileSpec();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FileSpec | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ code: '', name: '', mimeType: 'application/pdf', resolutionX: 300, resolutionY: 300, colorSpace: 'CMYK', displayNameKo: '', isActive: true });

  const filteredData = fileSpecs.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpenCreate = () => { setEditingItem(null); setFormData({ code: '', name: '', mimeType: 'application/pdf', resolutionX: 300, resolutionY: 300, colorSpace: 'CMYK', displayNameKo: '', isActive: true }); setIsDialogOpen(true); };
  const handleOpenEdit = (item: FileSpec) => { setEditingItem(item); setFormData({ code: item.code, name: item.name, mimeType: item.mimeType, resolutionX: item.resolutionX, resolutionY: item.resolutionY, colorSpace: item.colorSpace, displayNameKo: item.displayNameKo || '', isActive: item.isActive }); setIsDialogOpen(true); };
  const handleSave = async () => { if (editingItem) { await updateMutation.mutateAsync({ id: editingItem.id, data: formData }); } else { await createMutation.mutateAsync(formData); } setIsDialogOpen(false); };
  const handleDelete = async () => { if (deletingId) { await deleteMutation.mutateAsync(deletingId); setIsDeleteOpen(false); setDeletingId(null); } };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div><CardTitle className="text-lg flex items-center gap-2"><FileType className="h-5 w-5 text-indigo-600" />FileSpec (파일 규격)</CardTitle><CardDescription className="mt-1">입고 파일 규격을 관리합니다</CardDescription></div>
          <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button><Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-2" />추가</Button></div>
        </div>
        <div className="mt-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white" /></div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-12 text-slate-500">로딩 중...</div> : (
          <Table>
            <TableHeader><TableRow className="bg-slate-50"><TableHead className="font-semibold">코드</TableHead><TableHead className="font-semibold">이름</TableHead><TableHead className="font-semibold">MIME</TableHead><TableHead className="font-semibold text-center">해상도</TableHead><TableHead className="font-semibold">색상공간</TableHead><TableHead className="font-semibold">한국어명</TableHead><TableHead className="font-semibold text-center">상태</TableHead><TableHead className="font-semibold text-center w-[100px]">관리</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredData.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">데이터가 없습니다</TableCell></TableRow> : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm text-indigo-600 font-medium">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{item.mimeType}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">{item.resolutionX}×{item.resolutionY}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">{item.colorSpace}</Badge></TableCell>
                    <TableCell className="text-slate-600">{item.displayNameKo || '-'}</TableCell>
                    <TableCell className="text-center"><Badge className={item.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}>{item.isActive ? '활성' : '비활성'}</Badge></TableCell>
                    <TableCell><div className="flex justify-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-indigo-600" onClick={() => handleOpenEdit(item)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-red-600" onClick={() => { setDeletingId(item.id); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileType className="h-5 w-5 text-indigo-600" />{editingItem ? '파일 규격 수정' : '파일 규격 추가'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>코드 *</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} /></div><div className="space-y-2"><Label>이름 *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div></div>
            <div className="space-y-2"><Label>MIME 유형</Label><Input value={formData.mimeType} onChange={(e) => setFormData({ ...formData, mimeType: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>X 해상도</Label><Input type="number" value={formData.resolutionX} onChange={(e) => setFormData({ ...formData, resolutionX: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Y 해상도</Label><Input type="number" value={formData.resolutionY} onChange={(e) => setFormData({ ...formData, resolutionY: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>색상공간</Label><Select value={formData.colorSpace} onValueChange={(v) => setFormData({ ...formData, colorSpace: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CMYK">CMYK</SelectItem><SelectItem value="sRGB">sRGB</SelectItem><SelectItem value="AdobeRGB">AdobeRGB</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>한국어명</Label><Input value={formData.displayNameKo} onChange={(e) => setFormData({ ...formData, displayNameKo: e.target.value })} /></div><div className="flex items-center gap-3 pt-6"><Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} /><Label>활성화</Label></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button><Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">저장</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>삭제 확인</AlertDialogTitle><AlertDialogDescription>이 항목을 삭제하시겠습니까?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </Card>
  );
}

// ==================== QualityControl Tab ====================
function QualityControlTab() {
  const { data: qualityControls = [], isLoading, refetch } = useQualityControls(true);
  const createMutation = useCreateQualityControl();
  const updateMutation = useUpdateQualityControl();
  const deleteMutation = useDeleteQualityControl();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QualityControl | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ code: '', name: '', deltaE: 5, colorTolerance: 'Standard', trimTolerance: 0.5, displayNameKo: '', isActive: true });

  const filteredData = qualityControls.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpenCreate = () => { setEditingItem(null); setFormData({ code: '', name: '', deltaE: 5, colorTolerance: 'Standard', trimTolerance: 0.5, displayNameKo: '', isActive: true }); setIsDialogOpen(true); };
  const handleOpenEdit = (item: QualityControl) => { setEditingItem(item); setFormData({ code: item.code, name: item.name, deltaE: Number(item.deltaE) || 5, colorTolerance: item.colorTolerance || 'Standard', trimTolerance: Number(item.trimTolerance) || 0.5, displayNameKo: item.displayNameKo || '', isActive: item.isActive }); setIsDialogOpen(true); };
  const handleSave = async () => { if (editingItem) { await updateMutation.mutateAsync({ id: editingItem.id, data: formData }); } else { await createMutation.mutateAsync(formData); } setIsDialogOpen(false); };
  const handleDelete = async () => { if (deletingId) { await deleteMutation.mutateAsync(deletingId); setIsDeleteOpen(false); setDeletingId(null); } };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div><CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5 text-indigo-600" />QualityControl (품질 기준)</CardTitle><CardDescription className="mt-1">인쇄 품질 허용 기준을 관리합니다</CardDescription></div>
          <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button><Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-2" />추가</Button></div>
        </div>
        <div className="mt-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white" /></div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-12 text-slate-500">로딩 중...</div> : (
          <Table>
            <TableHeader><TableRow className="bg-slate-50"><TableHead className="font-semibold">코드</TableHead><TableHead className="font-semibold">이름</TableHead><TableHead className="font-semibold text-center">ΔE</TableHead><TableHead className="font-semibold">색상허용</TableHead><TableHead className="font-semibold text-center">재단허용</TableHead><TableHead className="font-semibold">한국어명</TableHead><TableHead className="font-semibold text-center">상태</TableHead><TableHead className="font-semibold text-center w-[100px]">관리</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredData.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">데이터가 없습니다</TableCell></TableRow> : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm text-indigo-600 font-medium">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">ΔE ≤ {item.deltaE}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">{item.colorTolerance || '-'}</Badge></TableCell>
                    <TableCell className="text-center">±{item.trimTolerance}mm</TableCell>
                    <TableCell className="text-slate-600">{item.displayNameKo || '-'}</TableCell>
                    <TableCell className="text-center"><Badge className={item.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}>{item.isActive ? '활성' : '비활성'}</Badge></TableCell>
                    <TableCell><div className="flex justify-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-indigo-600" onClick={() => handleOpenEdit(item)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-red-600" onClick={() => { setDeletingId(item.id); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-indigo-600" />{editingItem ? '품질 기준 수정' : '품질 기준 추가'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>코드 *</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} /></div><div className="space-y-2"><Label>이름 *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>ΔE 허용치</Label><Input type="number" step="0.1" value={formData.deltaE} onChange={(e) => setFormData({ ...formData, deltaE: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>색상허용</Label><Select value={formData.colorTolerance} onValueChange={(v) => setFormData({ ...formData, colorTolerance: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Tight">Tight (엄격)</SelectItem><SelectItem value="Standard">Standard (표준)</SelectItem><SelectItem value="Loose">Loose (관대)</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>재단허용(mm)</Label><Input type="number" step="0.1" value={formData.trimTolerance} onChange={(e) => setFormData({ ...formData, trimTolerance: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>한국어명</Label><Input value={formData.displayNameKo} onChange={(e) => setFormData({ ...formData, displayNameKo: e.target.value })} /></div><div className="flex items-center gap-3 pt-6"><Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} /><Label>활성화</Label></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button><Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">저장</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>삭제 확인</AlertDialogTitle><AlertDialogDescription>이 항목을 삭제하시겠습니까?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </Card>
  );
}
