'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  MessageSquare,
  ArrowLeft,
  User,
  Search,
  Phone,
  Smartphone,
  Mail,
  Tag,
  AlertCircle,
  Loader2,
  Plus,
  FileText,
  Edit,
  Trash2,
  Send,
  Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useClients } from '@/hooks/use-clients';
import {
  useConsultationCategories,
  useConsultationTags,
  useConsultation,
  useUpdateConsultation,
  useConsultationGuides,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/use-cs';
import { ConsultationCategory, CreateConsultationCategoryDto, UpdateConsultationDto, ConsultationPriority } from '@/lib/types/cs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Client } from '@/lib/types/client';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

export default function EditConsultationPage() {
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id as string;
  const { toast } = useToast();
  const { user } = useAuthStore();

  // 기존 상담 데이터 로드
  const { data: consultation, isLoading: isLoadingConsultation } = useConsultation(consultationId);

  const [formData, setFormData] = useState<Partial<UpdateConsultationDto>>({
    title: '',
    content: '',
    priority: 'normal',
  });

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);

  // 비회원 고객 상태
  const [isNonMember, setIsNonMember] = useState(false);
  const [nonMemberInfo, setNonMemberInfo] = useState({
    name: '',
    phone: '',
    email: '',
    memo: '',
  });

  // 분류 관리 상태
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ConsultationCategory | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<ConsultationCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<CreateConsultationCategoryDto>({
    code: '',
    name: '',
    colorCode: '#3B82F6',
    description: '',
    sortOrder: 0,
    isActive: true,
  });

  // 카카오톡 알림 상태
  const [kakaoNotify, setKakaoNotify] = useState(false);
  const [kakaoMessage, setKakaoMessage] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [isKakaoSending, setIsKakaoSending] = useState(false);

  // 내부 직원 목록
  const staffList = [
    { id: 'staff-1', name: '김영업', department: '영업팀' },
    { id: 'staff-2', name: '박영업', department: '영업팀' },
    { id: 'staff-3', name: '이생산', department: '생산팀' },
    { id: 'staff-4', name: '최생산', department: '생산팀' },
    { id: 'staff-5', name: '정생산', department: '생산팀' },
    { id: 'staff-6', name: '박관리', department: '관리팀' },
    { id: 'staff-7', name: '최배송', department: '배송팀' },
    { id: 'staff-8', name: '김배송', department: '배송팀' },
  ];

  const departmentGroups = staffList.reduce((acc, staff) => {
    if (!acc[staff.department]) {
      acc[staff.department] = [];
    }
    acc[staff.department].push(staff);
    return acc;
  }, {} as Record<string, typeof staffList>);

  const toggleDepartment = (department: string) => {
    const deptStaffIds = departmentGroups[department].map(s => s.id);
    const allSelected = deptStaffIds.every(id => selectedStaff.includes(id));

    if (allSelected) {
      setSelectedStaff(prev => prev.filter(id => !deptStaffIds.includes(id)));
    } else {
      setSelectedStaff(prev => [...new Set([...prev, ...deptStaffIds])]);
    }
  };

  const isDepartmentAllSelected = (department: string) => {
    const deptStaffIds = departmentGroups[department].map(s => s.id);
    return deptStaffIds.every(id => selectedStaff.includes(id));
  };

  const isDepartmentPartiallySelected = (department: string) => {
    const deptStaffIds = departmentGroups[department].map(s => s.id);
    const selectedCount = deptStaffIds.filter(id => selectedStaff.includes(id)).length;
    return selectedCount > 0 && selectedCount < deptStaffIds.length;
  };

  const { data: categories } = useConsultationCategories();
  const { data: tags } = useConsultationTags();
  const { data: clientsData } = useClients({ search: clientSearch, limit: 10 });
  const { data: guides } = useConsultationGuides();
  const updateConsultation = useUpdateConsultation();
  const createCategory = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  // 기존 상담 데이터로 폼 초기화
  useEffect(() => {
    if (consultation) {
      setFormData({
        title: consultation.title,
        content: consultation.content,
        priority: consultation.priority,
        categoryId: consultation.categoryId,
        orderNumber: consultation.orderNumber || '',
        followUpDate: consultation.followUpDate?.split('T')[0] || '',
        followUpNote: consultation.followUpNote || '',
        internalMemo: consultation.internalMemo || '',
      });

      // 고객 정보 설정
      if (consultation.client) {
        setSelectedClient(consultation.client as Client);
        setIsNonMember(false);
      } else {
        setIsNonMember(true);
        // 비회원 정보 파싱 (internalMemo에서)
        const internalMemo = consultation.internalMemo || '';
        if (internalMemo.includes('[비회원 고객 정보]')) {
          const match = internalMemo.match(/이름: (.+?)\n/);
          const phoneMatch = internalMemo.match(/연락처: (.+?)(\n|$)/);
          const emailMatch = internalMemo.match(/이메일: (.+?)(\n|$)/);
          setNonMemberInfo({
            name: match?.[1] || '',
            phone: phoneMatch?.[1] || '',
            email: emailMatch?.[1] || '',
            memo: '',
          });
        }
      }
    }
  }, [consultation]);

  const handleSelectGuide = (guide: { title: string; problem: string; solution: string; categoryId?: string }) => {
    setFormData(prev => ({
      ...prev,
      title: guide.title,
      content: `[문제]\n${guide.problem}\n\n[해결방법]\n${guide.solution}`,
      categoryId: guide.categoryId || prev.categoryId,
    }));
  };

  const priorityOptions: { value: ConsultationPriority; label: string; color: string }[] = [
    { value: 'low', label: '낮음', color: 'bg-gray-100 text-gray-600' },
    { value: 'normal', label: '보통', color: 'bg-blue-100 text-blue-600' },
    { value: 'high', label: '높음', color: 'bg-orange-100 text-orange-600' },
    { value: 'urgent', label: '긴급', color: 'bg-red-100 text-red-600' },
  ];

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setFormData(prev => ({ ...prev, clientId: client.id }));
    setIsClientDialogOpen(false);
    setClientSearch('');
  };

  const handleOpenCategoryDialog = (category?: ConsultationCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        code: category.code,
        name: category.name,
        colorCode: category.colorCode || '#3B82F6',
        description: (category as any).description || '',
        sortOrder: category.sortOrder || 0,
        isActive: category.isActive,
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        code: '',
        name: '',
        colorCode: '#3B82F6',
        description: '',
        sortOrder: (categories?.length || 0) + 1,
        isActive: true,
      });
    }
    setIsCategoryDialogOpen(true);
  };

  const generateCode = (name: string): string => {
    const koreanToEnglish: Record<string, string> = {
      '클레임': 'claim', '품질': 'quality', '배송': 'delivery', '결제': 'payment',
      '환불': 'refund', '교환': 'exchange', '문의': 'inquiry', '상담': 'consult',
      '일반': 'general', '긴급': 'urgent', '주문': 'order', '취소': 'cancel',
      '변경': 'change', '기타': 'etc', '제품': 'product', '서비스': 'service',
    };
    let code = name.toLowerCase();
    Object.entries(koreanToEnglish).forEach(([korean, english]) => {
      code = code.replace(new RegExp(korean, 'g'), english);
    });
    code = code.replace(/[가-힣]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const timestamp = Date.now().toString(36).slice(-4);
    return code ? `${code}_${timestamp}` : `category_${timestamp}`;
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      toast({ title: '분류명을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({ id: editingCategory.id, data: categoryFormData });
        toast({ title: '분류가 수정되었습니다.' });
      } else {
        const dataWithCode = {
          ...categoryFormData,
          code: generateCode(categoryFormData.name),
        };
        await createCategory.mutateAsync(dataWithCode);
        toast({ title: '분류가 추가되었습니다.' });
      }
      setIsCategoryDialogOpen(false);
    } catch (error) {
      toast({ title: '분류 저장에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;

    try {
      await deleteCategoryMutation.mutateAsync(deleteCategory.id);
      toast({ title: '분류가 삭제되었습니다.' });
      setDeleteCategory(null);
      if (formData.categoryId === deleteCategory.id) {
        setFormData(prev => ({ ...prev, categoryId: undefined }));
      }
    } catch (error) {
      toast({ title: '분류 삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleSubmit = async () => {
    if (isNonMember) {
      if (!nonMemberInfo.name.trim()) {
        toast({ title: '비회원 고객명을 입력해주세요.', variant: 'destructive' });
        return;
      }
      if (!nonMemberInfo.phone.trim()) {
        toast({ title: '비회원 연락처를 입력해주세요.', variant: 'destructive' });
        return;
      }
    } else if (!selectedClient) {
      toast({ title: '고객을 선택해주세요.', variant: 'destructive' });
      return;
    }
    if (!formData.categoryId) {
      toast({ title: '상담 분류를 선택해주세요.', variant: 'destructive' });
      return;
    }
    if (!formData.title?.trim()) {
      toast({ title: '상담 제목을 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (!formData.content?.trim()) {
      toast({ title: '상담 내용을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      const consultationData: UpdateConsultationDto = {
        ...formData,
        clientId: isNonMember ? undefined : selectedClient?.id,
        internalMemo: isNonMember
          ? `[비회원 고객 정보]\n이름: ${nonMemberInfo.name}\n연락처: ${nonMemberInfo.phone}${nonMemberInfo.email ? `\n이메일: ${nonMemberInfo.email}` : ''}${nonMemberInfo.memo ? `\n메모: ${nonMemberInfo.memo}` : ''}${formData.internalMemo ? `\n\n${formData.internalMemo}` : ''}`
          : formData.internalMemo,
      };

      await updateConsultation.mutateAsync({ id: consultationId, data: consultationData });

      toast({ title: '상담이 수정되었습니다.' });
      router.push(`/cs/consultations/${consultationId}`);
    } catch (error) {
      toast({ title: '상담 수정에 실패했습니다.', variant: 'destructive' });
    }
  };

  if (isLoadingConsultation) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">상담을 찾을 수 없습니다.</p>
        <Link href="/cs/consultations">
          <Button>목록으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link href={`/cs/consultations/${consultationId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            상담 수정
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            상담 내용을 수정합니다
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 폼 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 고객 선택 */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  고객 정보
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${!isNonMember ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>회원</span>
                  <Switch
                    checked={isNonMember}
                    onCheckedChange={(checked) => {
                      setIsNonMember(checked);
                      if (checked) {
                        setSelectedClient(null);
                      } else {
                        setNonMemberInfo({ name: '', phone: '', email: '', memo: '' });
                      }
                    }}
                  />
                  <span className={`text-xs ${isNonMember ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>비회원</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isNonMember ? (
                <div className="space-y-4 p-4 rounded-lg border border-orange-200 bg-orange-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                      비회원
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nonMemberName">고객명 *</Label>
                      <Input
                        id="nonMemberName"
                        placeholder="고객 이름"
                        value={nonMemberInfo.name}
                        onChange={(e) => setNonMemberInfo(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nonMemberPhone">연락처 *</Label>
                      <PhoneInput
                        id="nonMemberPhone"
                        placeholder="010-0000-0000"
                        value={nonMemberInfo.phone}
                        onChange={(value) => setNonMemberInfo(prev => ({ ...prev, phone: value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nonMemberEmail">이메일</Label>
                    <Input
                      id="nonMemberEmail"
                      type="email"
                      placeholder="email@example.com"
                      value={nonMemberInfo.email}
                      onChange={(e) => setNonMemberInfo(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
              ) : selectedClient ? (
                <div className="p-4 rounded-lg border bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-lg">{selectedClient.clientName}</span>
                        <Badge variant="outline">{selectedClient.clientCode}</Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {selectedClient.mobile && (
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-3.5 w-3.5" />
                            <span>{selectedClient.mobile}</span>
                          </div>
                        )}
                        {selectedClient.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{selectedClient.phone}</span>
                          </div>
                        )}
                        {selectedClient.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" />
                            {selectedClient.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsClientDialogOpen(true)}
                    >
                      변경
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-20 border-dashed"
                  onClick={() => setIsClientDialogOpen(true)}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  고객 선택
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 상담 내용 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                상담 내용
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">상담 제목 *</Label>
                <div className="flex gap-2">
                  <Input
                    id="title"
                    placeholder="상담 내용을 요약하는 제목을 입력하세요"
                    value={formData.title || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="flex-1"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" title="상담 템플릿">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <DropdownMenuLabel>상담 템플릿 선택</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {guides && guides.length > 0 ? (
                        guides
                          .filter(g => g.isActive)
                          .slice(0, 10)
                          .map((guide) => (
                            <DropdownMenuItem
                              key={guide.id}
                              onClick={() => handleSelectGuide(guide)}
                              className="flex flex-col items-start gap-1 py-2 cursor-pointer"
                            >
                              <span className="font-medium">{guide.title}</span>
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {guide.problem}
                              </span>
                            </DropdownMenuItem>
                          ))
                      ) : (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          등록된 상담 가이드가 없습니다
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">상담 내용 *</Label>
                <Textarea
                  id="content"
                  placeholder="고객의 문의 또는 클레임 내용을 상세히 기록하세요"
                  rows={8}
                  value={formData.content || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderId">관련 주문번호</Label>
                  <Input
                    id="orderId"
                    placeholder="관련 주문이 있다면 입력"
                    value={formData.orderNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followUpDate">후속 조치 예정일</Label>
                  <Input
                    id="followUpDate"
                    type="date"
                    value={formData.followUpDate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="followUpNote">후속 조치 메모</Label>
                <Textarea
                  id="followUpNote"
                  placeholder="후속 조치 내용"
                  rows={3}
                  value={formData.followUpNote || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, followUpNote: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internalMemo">내부 메모</Label>
                <Textarea
                  id="internalMemo"
                  placeholder="내부 참고용 메모 (고객에게 노출되지 않음)"
                  rows={3}
                  value={formData.internalMemo || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, internalMemo: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 분류 및 우선순위 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5 text-purple-600" />
                분류 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>상담 분류 *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleOpenCategoryDialog()}
                    title="분류 추가"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Select
                  value={formData.categoryId || ''}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, categoryId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="분류 선택" />
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
                <Label>우선순위</Label>
                <Select
                  value={formData.priority || 'normal'}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v as ConsultationPriority }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <Badge className={option.color}>{option.label}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 태그 선택 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5 text-indigo-600" />
                태그
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags?.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    style={selectedTags.includes(tag.id) ? {
                      backgroundColor: tag.colorCode || undefined,
                    } : undefined}
                    onClick={() => {
                      setSelectedTags(prev =>
                        prev.includes(tag.id)
                          ? prev.filter(id => id !== tag.id)
                          : [...prev, tag.id]
                      );
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 저장 버튼 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
            >
              취소
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700"
              onClick={handleSubmit}
              disabled={updateConsultation.isPending}
            >
              {updateConsultation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              저장
            </Button>
          </div>
        </div>
      </div>

      {/* 고객 선택 다이얼로그 */}
      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              고객 선택
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="고객명, 코드, 연락처 검색..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {clientsData?.data?.map((client) => (
                <div
                  key={client.id}
                  className="p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => handleSelectClient(client)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{client.clientName}</span>
                        <Badge variant="outline" className="text-xs">
                          {client.clientCode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 분류 추가/수정 다이얼로그 */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-600" />
              {editingCategory ? '분류 수정' : '분류 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">분류명 *</Label>
              <Input
                id="categoryName"
                placeholder="예: 배송문의"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryColor">색상</Label>
              <div className="flex gap-2">
                <Input
                  id="categoryColor"
                  type="color"
                  value={categoryFormData.colorCode}
                  onChange={(e) => setCategoryFormData(prev => ({ ...prev, colorCode: e.target.value }))}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={categoryFormData.colorCode}
                  onChange={(e) => setCategoryFormData(prev => ({ ...prev, colorCode: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={createCategory.isPending || updateCategoryMutation.isPending}
            >
              {(createCategory.isPending || updateCategoryMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCategory ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 분류 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              분류 삭제
            </DialogTitle>
            <DialogDescription>
              '{deleteCategory?.name}' 분류를 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategory(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCategory}
              disabled={deleteCategoryMutation.isPending}
            >
              {deleteCategoryMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
