'use client';

import { useState } from 'react';
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  GripVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  useConsultationCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/use-cs';
import { ConsultationCategory, CreateConsultationCategoryDto } from '@/lib/types/cs';

// 색상 프리셋
const COLOR_PRESETS = [
  { name: '빨강', value: '#EF4444' },
  { name: '주황', value: '#F97316' },
  { name: '노랑', value: '#EAB308' },
  { name: '초록', value: '#22C55E' },
  { name: '하늘', value: '#06B6D4' },
  { name: '파랑', value: '#3B82F6' },
  { name: '보라', value: '#8B5CF6' },
  { name: '분홍', value: '#EC4899' },
  { name: '회색', value: '#6B7280' },
];

// 한글을 영문 코드로 변환하는 함수
function generateCode(name: string): string {
  // 한글 -> 영문 매핑 (일반적인 상담 분류 용어)
  // 긴 단어를 먼저 처리하기 위해 배열로 순서 지정
  const koreanToEnglish: [string, string][] = [
    // 복합어 (먼저 처리)
    ['클레임', 'claim'],
    ['품질', 'quality'],
    ['배송', 'delivery'],
    ['결제', 'payment'],
    ['환불', 'refund'],
    ['교환', 'exchange'],
    ['문의', 'inquiry'],
    ['상담', 'consult'],
    ['일반', 'general'],
    ['긴급', 'urgent'],
    ['주문', 'order'],
    ['취소', 'cancel'],
    ['변경', 'change'],
    ['기타', 'etc'],
    ['제품', 'product'],
    ['서비스', 'service'],
    ['가격', 'price'],
    ['기술', 'tech'],
    ['앨범', 'album'],
    ['인쇄', 'print'],
    ['출력', 'output'],
    ['사진', 'photo'],
    ['파일', 'file'],
    // 추가 매핑
    ['표지', 'cover'],
    ['내지', 'inner'],
    ['커버', 'cover'],
    ['견적', 'quote'],
    ['디자인', 'design'],
    ['색상', 'color'],
    ['편집', 'edit'],
    ['수정', 'modify'],
    ['재작업', 'rework'],
    ['재주문', 'reorder'],
    ['고객', 'customer'],
    ['거래처', 'client'],
    ['정산', 'settle'],
    ['미수금', 'receivable'],
    ['입금', 'deposit'],
    ['포장', 'pack'],
    ['제본', 'binding'],
    ['코팅', 'coating'],
    ['후가공', 'finishing'],
    ['샘플', 'sample'],
    ['시안', 'draft'],
    ['확인', 'confirm'],
    ['승인', 'approve'],
    ['반려', 'reject'],
    ['보류', 'hold'],
    ['완료', 'done'],
    ['진행', 'progress'],
    ['대기', 'pending'],
  ];

  let code = name;

  // 한글 단어를 영문으로 변환 (언더스코어로 연결)
  koreanToEnglish.forEach(([korean, english]) => {
    code = code.replace(new RegExp(korean, 'g'), `_${english}_`);
  });

  // 정리
  code = code
    .toLowerCase()
    .replace(/[가-힣]/g, '') // 남은 한글 제거
    .replace(/\s+/g, '_')    // 공백을 언더스코어로
    .replace(/[^a-z0-9_]/g, '') // 영문, 숫자, 언더스코어만 유지
    .replace(/_+/g, '_')     // 연속된 언더스코어 제거
    .replace(/^_|_$/g, '');  // 앞뒤 언더스코어 제거

  return code || 'category';
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ConsultationCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConsultationCategory | null>(null);

  const [formData, setFormData] = useState<CreateConsultationCategoryDto>({
    code: '',
    name: '',
    colorCode: '#3B82F6',
    sortOrder: 0,
    isActive: true,
  });

  const { data: categories, isLoading } = useConsultationCategories(true);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      colorCode: '#3B82F6',
      sortOrder: categories ? categories.length : 0,
      isActive: true,
    });
    setEditingCategory(null);
  };

  // 새 분류 추가 모달 열기
  const handleOpenNew = () => {
    resetForm();
    setIsFormOpen(true);
  };

  // 분류 수정 모달 열기
  const handleOpenEdit = (category: ConsultationCategory) => {
    setEditingCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      colorCode: category.colorCode || '#3B82F6',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setIsFormOpen(true);
  };

  // 분류 저장
  const handleSave = async () => {
    if (!formData.code.trim()) {
      toast({ title: '분류 코드를 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!formData.name.trim()) {
      toast({ title: '분류명을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          data: formData,
        });
        toast({ title: '상담 분류가 수정되었습니다.' });
      } else {
        await createCategory.mutateAsync(formData);
        toast({ title: '상담 분류가 등록되었습니다.' });
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : '저장에 실패했습니다.';
      toast({ title: message, variant: 'destructive' });
    }
  };

  // 분류 활성화/비활성화 토글
  const handleToggleActive = async (category: ConsultationCategory) => {
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        data: { isActive: !category.isActive },
      });
      toast({ title: category.isActive ? '분류가 비활성화되었습니다.' : '분류가 활성화되었습니다.' });
    } catch (error) {
      toast({ title: '상태 변경에 실패했습니다.', variant: 'destructive' });
    }
  };

  // 분류 삭제
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      toast({ title: '상담 분류가 삭제되었습니다.' });
      setDeleteTarget(null);
    } catch (error) {
      toast({ title: '삭제에 실패했습니다. 이 분류를 사용하는 상담이 있는지 확인하세요.', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-indigo-600" />
            상담 분류 관리
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            상담 유형을 분류하여 관리합니다
          </p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus className="h-4 w-4" />
          새 분류 등록
        </Button>
      </div>

      {/* 분류 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">분류 목록</CardTitle>
          <CardDescription>총 {categories?.length || 0}개의 분류</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>등록된 분류가 없습니다</p>
              <Button variant="link" onClick={handleOpenNew} className="mt-2">
                첫 분류 등록하기
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">순서</TableHead>
                  <TableHead>분류명</TableHead>
                  <TableHead>코드</TableHead>
                  <TableHead className="text-center">색상</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((category, index) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: category.colorCode || '#6B7280' }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{category.code}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div
                          className="inline-block w-6 h-6 rounded border"
                          style={{ backgroundColor: category.colorCode || '#6B7280' }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(category)}
                          className="gap-1"
                        >
                          {category.isActive ? (
                            <>
                              <ToggleRight className="h-4 w-4 text-green-600" />
                              <span className="text-green-600">활성</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-400">비활성</span>
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(category)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsFormOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-indigo-600" />
              {editingCategory ? '상담 분류 수정' : '새 상담 분류 등록'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">분류명 *</Label>
              <Input
                id="name"
                placeholder="예: 품질 클레임"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  // 수정 모드가 아닐 때만 코드 자동 생성
                  if (!editingCategory) {
                    setFormData(prev => ({
                      ...prev,
                      name,
                      code: generateCode(name),
                    }));
                  } else {
                    setFormData(prev => ({ ...prev, name }));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">분류 코드</Label>
              <Input
                id="code"
                placeholder="자동 생성됩니다"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                disabled={!!editingCategory}
                className={editingCategory ? 'bg-slate-50' : ''}
              />
              <p className="text-xs text-muted-foreground">
                {editingCategory ? '코드는 수정할 수 없습니다' : '분류명 입력 시 자동 생성됩니다'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>색상</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.colorCode === color.value
                        ? 'border-gray-900 scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData(prev => ({ ...prev, colorCode: color.value }))}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">정렬 순서</Label>
              <Input
                id="sortOrder"
                type="number"
                min={0}
                value={formData.sortOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              {(createCategory.isPending || updateCategory.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCategory ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상담 분류 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" 분류를 삭제하시겠습니까?
              <br />
              <span className="text-red-600 font-medium">
                이 분류를 사용하는 상담이 있으면 삭제할 수 없습니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
