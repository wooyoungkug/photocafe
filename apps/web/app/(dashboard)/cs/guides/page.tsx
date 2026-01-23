'use client';

import { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  FileText,
  ThumbsUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  useConsultationGuides,
  useConsultationCategories,
  useCreateGuide,
  useUpdateGuide,
  useDeleteGuide,
} from '@/hooks/use-cs';
import { ConsultationGuide, CreateGuideDto, UpdateGuideDto } from '@/lib/types/cs';

export default function GuidesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<ConsultationGuide | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConsultationGuide | null>(null);

  const [formData, setFormData] = useState<CreateGuideDto>({
    title: '',
    problem: '',
    solution: '',
    categoryId: undefined,
    tagCodes: [],
  });

  const { data: guides, isLoading } = useConsultationGuides();
  const { data: categories } = useConsultationCategories();
  const createGuide = useCreateGuide();
  const updateGuide = useUpdateGuide();
  const deleteGuide = useDeleteGuide();

  // 필터링된 가이드 목록
  const filteredGuides = guides?.filter(guide => {
    const matchesSearch = !search ||
      guide.title.toLowerCase().includes(search.toLowerCase()) ||
      guide.problem.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || guide.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      title: '',
      problem: '',
      solution: '',
      categoryId: undefined,
      tagCodes: [],
    });
    setEditingGuide(null);
  };

  // 새 가이드 추가 모달 열기
  const handleOpenNew = () => {
    resetForm();
    setIsFormOpen(true);
  };

  // 가이드 수정 모달 열기
  const handleOpenEdit = (guide: ConsultationGuide) => {
    setEditingGuide(guide);
    setFormData({
      title: guide.title,
      problem: guide.problem,
      solution: guide.solution,
      categoryId: guide.categoryId || undefined,
      tagCodes: guide.tagCodes || [],
    });
    setIsFormOpen(true);
  };

  // 가이드 저장
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ title: '제목을 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!formData.problem.trim()) {
      toast({ title: '문제 설명을 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!formData.solution.trim()) {
      toast({ title: '해결 방법을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      if (editingGuide) {
        await updateGuide.mutateAsync({
          id: editingGuide.id,
          data: formData as UpdateGuideDto,
        });
        toast({ title: '상담 가이드가 수정되었습니다.' });
      } else {
        await createGuide.mutateAsync(formData);
        toast({ title: '상담 가이드가 등록되었습니다.' });
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: '저장에 실패했습니다.', variant: 'destructive' });
    }
  };

  // 가이드 활성화/비활성화 토글
  const handleToggleActive = async (guide: ConsultationGuide) => {
    try {
      await updateGuide.mutateAsync({
        id: guide.id,
        data: { isActive: !guide.isActive },
      });
      toast({ title: guide.isActive ? '가이드가 비활성화되었습니다.' : '가이드가 활성화되었습니다.' });
    } catch (error) {
      toast({ title: '상태 변경에 실패했습니다.', variant: 'destructive' });
    }
  };

  // 가이드 삭제
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGuide.mutateAsync(deleteTarget.id);
      toast({ title: '상담 가이드가 삭제되었습니다.' });
      setDeleteTarget(null);
    } catch (error) {
      toast({ title: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  // 카테고리명 조회
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return '-';
    const category = categories?.find(c => c.id === categoryId);
    return category?.name || '-';
  };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-purple-600" />
            상담 가이드
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            자주 사용하는 상담 템플릿을 관리합니다
          </p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus className="h-4 w-4" />
          새 가이드 등록
        </Button>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="제목, 문제 설명 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.colorCode || '#6B7280' }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 가이드 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">가이드 목록</CardTitle>
          <CardDescription>총 {filteredGuides.length}개의 가이드</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGuides.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>등록된 가이드가 없습니다</p>
              <Button variant="link" onClick={handleOpenNew} className="mt-2">
                첫 가이드 등록하기
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead className="text-center">사용횟수</TableHead>
                  <TableHead className="text-center">도움됨</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuides.map((guide) => (
                  <TableRow key={guide.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{guide.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {guide.problem}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {guide.categoryId && (
                        <Badge variant="outline">
                          {getCategoryName(guide.categoryId)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{guide.usageCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ThumbsUp className="h-3 w-3 text-green-600" />
                        {guide.helpfulCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(guide)}
                        className="gap-1"
                      >
                        {guide.isActive ? (
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
                          onClick={() => handleOpenEdit(guide)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(guide)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              {editingGuide ? '상담 가이드 수정' : '새 상담 가이드 등록'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">제목 *</Label>
              <Input
                id="title"
                placeholder="상담 가이드 제목"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Select
                value={formData.categoryId || ''}
                onValueChange={(v) => setFormData(prev => ({ ...prev, categoryId: v || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.colorCode || '#6B7280' }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="problem">문제 설명 *</Label>
              <Textarea
                id="problem"
                placeholder="고객이 겪는 문제 상황을 설명하세요"
                rows={3}
                value={formData.problem}
                onChange={(e) => setFormData(prev => ({ ...prev, problem: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="solution">해결 방법 *</Label>
              <Textarea
                id="solution"
                placeholder="문제를 해결하는 방법을 상세히 설명하세요"
                rows={5}
                value={formData.solution}
                onChange={(e) => setFormData(prev => ({ ...prev, solution: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={createGuide.isPending || updateGuide.isPending}
            >
              {(createGuide.isPending || updateGuide.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingGuide ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상담 가이드 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" 가이드를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
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
