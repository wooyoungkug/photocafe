'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  ArrowLeft,
  User,
  Search,
  Phone,
  Smartphone,
  Mail,
  Tag,
  Calendar,
  AlertCircle,
  Loader2,
  Plus,
  X,
  FileText,
  Edit,
  Trash2,
  Settings,
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
  useCreateConsultation,
  useConsultationGuides,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/use-cs';
import { ConsultationCategory, CreateConsultationCategoryDto } from '@/lib/types/cs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { CreateConsultationDto, ConsultationPriority } from '@/lib/types/cs';
import { Client } from '@/lib/types/client';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

export default function NewConsultationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState<Partial<CreateConsultationDto>>({
    title: '',
    content: '',
    priority: 'normal',
    counselorId: '',
    counselorName: '',
  });

  // 로그인된 사용자 정보로 담당자 설정
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        counselorId: user.id,
        counselorName: user.name,
      }));
    }
  }, [user]);
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

  // 내부 직원 목록 (TODO: 실제 API에서 가져오기)
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

  // 부서별로 직원 그룹화
  const departmentGroups = staffList.reduce((acc, staff) => {
    if (!acc[staff.department]) {
      acc[staff.department] = [];
    }
    acc[staff.department].push(staff);
    return acc;
  }, {} as Record<string, typeof staffList>);

  // 부서 전체 선택/해제
  const toggleDepartment = (department: string) => {
    const deptStaffIds = departmentGroups[department].map(s => s.id);
    const allSelected = deptStaffIds.every(id => selectedStaff.includes(id));

    if (allSelected) {
      // 전체 해제
      setSelectedStaff(prev => prev.filter(id => !deptStaffIds.includes(id)));
    } else {
      // 전체 선택
      setSelectedStaff(prev => [...new Set([...prev, ...deptStaffIds])]);
    }
  };

  // 부서가 전체 선택되었는지 확인
  const isDepartmentAllSelected = (department: string) => {
    const deptStaffIds = departmentGroups[department].map(s => s.id);
    return deptStaffIds.every(id => selectedStaff.includes(id));
  };

  // 부서가 일부만 선택되었는지 확인
  const isDepartmentPartiallySelected = (department: string) => {
    const deptStaffIds = departmentGroups[department].map(s => s.id);
    const selectedCount = deptStaffIds.filter(id => selectedStaff.includes(id)).length;
    return selectedCount > 0 && selectedCount < deptStaffIds.length;
  };

  const { data: categories } = useConsultationCategories();
  const { data: tags } = useConsultationTags();
  const { data: clientsData } = useClients({ search: clientSearch, limit: 10 });
  const { data: guides } = useConsultationGuides();
  const createConsultation = useCreateConsultation();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  // 자주 하는 상담 선택 시 폼 자동 채우기
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

  // 분류 추가 다이얼로그 열기
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

  // 한글을 영문 코드로 변환 (항상 고유한 코드 생성)
  const generateCode = (name: string): string => {
    const koreanToEnglish: Record<string, string> = {
      '클레임': 'claim', '품질': 'quality', '배송': 'delivery', '결제': 'payment',
      '환불': 'refund', '교환': 'exchange', '문의': 'inquiry', '상담': 'consult',
      '일반': 'general', '긴급': 'urgent', '주문': 'order', '취소': 'cancel',
      '변경': 'change', '기타': 'etc', '제품': 'product', '서비스': 'service',
      '가격': 'price', '기술': 'tech', '앨범': 'album', '인쇄': 'print',
      '출력': 'output', '사진': 'photo', '파일': 'file', '상품': 'product',
      '등록': 'register', '수정': 'edit', '삭제': 'delete', '신규': 'new',
      '영업': 'sales', '불량': 'defect', '오염': 'stain', '제본': 'binding',
      '재단': 'cutting', '내지': 'inner', '커버': 'cover', '반품': 'return',
      '오류': 'error',
    };
    let code = name.toLowerCase();
    Object.entries(koreanToEnglish).forEach(([korean, english]) => {
      code = code.replace(new RegExp(korean, 'g'), english);
    });
    code = code.replace(/[가-힣]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '');
    // 고유성 보장을 위해 타임스탬프 추가
    const timestamp = Date.now().toString(36).slice(-4);
    return code ? `${code}_${timestamp}` : `category_${timestamp}`;
  };

  // 분류 저장
  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      toast({ title: '분류명을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, data: categoryFormData });
        toast({ title: '분류가 수정되었습니다.' });
      } else {
        // 새 분류 생성 시 코드 자동 생성
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

  // 분류 삭제
  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;

    try {
      await deleteCategoryMutation.mutateAsync(deleteCategory.id);
      toast({ title: '분류가 삭제되었습니다.' });
      setDeleteCategory(null);
      // 삭제된 분류가 선택된 분류였다면 선택 해제
      if (formData.categoryId === deleteCategory.id) {
        setFormData(prev => ({ ...prev, categoryId: undefined }));
      }
    } catch (error) {
      toast({ title: '분류 삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleSubmit = async () => {
    // 비회원인 경우 이름과 연락처만 필수
    if (isNonMember) {
      if (!nonMemberInfo.name.trim()) {
        toast({ title: '비회원 고객명을 입력해주세요.', variant: 'destructive' });
        return;
      }
      if (!nonMemberInfo.phone.trim()) {
        toast({ title: '비회원 연락처를 입력해주세요.', variant: 'destructive' });
        return;
      }
    } else {
      // 회원인 경우 기존 필수값 체크
      if (!selectedClient) {
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
    }

    try {
      // 비회원 정보를 internalMemo에 포함하고 title/content 자동 생성
      const nonMemberMemo = isNonMember
        ? `[비회원 고객 정보]\n이름: ${nonMemberInfo.name}\n연락처: ${nonMemberInfo.phone}${nonMemberInfo.email ? `\n이메일: ${nonMemberInfo.email}` : ''}${nonMemberInfo.memo ? `\n메모: ${nonMemberInfo.memo}` : ''}${formData.internalMemo ? `\n\n${formData.internalMemo}` : ''}`
        : formData.internalMemo;

      const consultationData = {
        ...formData,
        clientId: isNonMember ? undefined : selectedClient?.id,
        // 비회원은 title/content 미입력 시 자동 생성
        title: formData.title?.trim() || (isNonMember ? `${nonMemberInfo.name} 상담 문의` : undefined),
        content: formData.content?.trim() || (isNonMember
          ? `[비회원 문의]\n이름: ${nonMemberInfo.name}\n연락처: ${nonMemberInfo.phone}${nonMemberInfo.email ? `\n이메일: ${nonMemberInfo.email}` : ''}${nonMemberInfo.memo ? `\n메모: ${nonMemberInfo.memo}` : ''}`
          : undefined),
        internalMemo: nonMemberMemo,
        // 빈 문자열은 @IsDateString() 검증 실패하므로 undefined로 처리
        followUpDate: formData.followUpDate || undefined,
        orderNumber: formData.orderNumber || undefined,
        followUpNote: formData.followUpNote || undefined,
      };

      const result = await createConsultation.mutateAsync(consultationData as CreateConsultationDto);

      toast({ title: '상담이 등록되었습니다.' });
      router.push(`/cs/consultations/${result.id}`);
    } catch (error) {
      toast({ title: '상담 등록에 실패했습니다.', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link href="/cs/consultations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            상담 등록
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            새로운 고객 상담을 등록합니다
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
                {/* 회원/비회원 전환 */}
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
              {isNonMember && (
                <CardDescription className="text-orange-600">
                  비회원 고객 정보를 직접 입력합니다
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {isNonMember ? (
                /* 비회원 입력 폼 */
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
                  <div className="space-y-2">
                    <Label htmlFor="nonMemberMemo">메모</Label>
                    <Input
                      id="nonMemberMemo"
                      placeholder="추가 정보 (선택)"
                      value={nonMemberInfo.memo}
                      onChange={(e) => setNonMemberInfo(prev => ({ ...prev, memo: e.target.value }))}
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
                            <a href={`tel:${selectedClient.mobile}`} className="text-blue-600 hover:underline">
                              {selectedClient.mobile}
                            </a>
                            <span className="text-xs text-muted-foreground">(휴대폰)</span>
                          </div>
                        )}
                        {selectedClient.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            <a href={`tel:${selectedClient.phone}`} className="text-blue-600 hover:underline">
                              {selectedClient.phone}
                            </a>
                            <span className="text-xs text-muted-foreground">(전화)</span>
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
                  {/* 자주 하는 상담 드롭다운 - 템플릿 버튼 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        title="상담 템플릿"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <DropdownMenuLabel className="flex items-center justify-between">
                        <span>상담 템플릿 선택</span>
                        <Link href="/cs/guides" className="text-xs text-blue-600 hover:underline font-normal">
                          관리
                        </Link>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {guides && guides.length > 0 ? (
                        guides
                          .filter(g => g.isActive)
                          .sort((a, b) => b.usageCount - a.usageCount)
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
                              {guide.usageCount > 0 && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {guide.usageCount}회 사용
                                </Badge>
                              )}
                            </DropdownMenuItem>
                          ))
                      ) : (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          등록된 상담 가이드가 없습니다
                          <Link href="/cs/guides" className="block mt-2 text-blue-600 hover:underline">
                            상담 가이드 등록하기
                          </Link>
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
                <div className="space-y-2">
                  <Select
                    value=""
                    onValueChange={(solution) => setFormData(prev => ({ ...prev, followUpNote: solution }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="이전 처리 내역에서 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {guides && guides
                        .filter(g => g.isActive && g.solution)
                        .sort((a, b) => b.usageCount - a.usageCount)
                        .slice(0, 15)
                        .map((guide) => {
                          const category = categories?.find(c => c.id === guide.categoryId);
                          return (
                            <SelectItem
                              key={guide.id}
                              value={guide.solution}
                            >
                              <div className="flex items-center gap-2">
                                {category && (
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: category.colorCode || '#6B7280' }}
                                  />
                                )}
                                <span className="truncate">{guide.title}</span>
                                {guide.usageCount > 0 && (
                                  <span className="text-xs text-muted-foreground">({guide.usageCount}회)</span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      {(!guides || guides.filter(g => g.isActive && g.solution).length === 0) && (
                        <SelectItem value="none" disabled>
                          등록된 처리 내역이 없습니다
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Textarea
                    id="followUpNote"
                    placeholder="선택 후 내용을 수정하거나 직접 입력하세요"
                    rows={3}
                    value={formData.followUpNote || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, followUpNote: e.target.value }))}
                  />
                </div>
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
                  <div className="flex items-center gap-1">
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
                    {formData.categoryId && categories?.find(c => c.id === formData.categoryId) && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const cat = categories?.find(c => c.id === formData.categoryId);
                            if (cat) handleOpenCategoryDialog(cat);
                          }}
                          title="분류 수정"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => {
                            const cat = categories?.find(c => c.id === formData.categoryId);
                            if (cat) setDeleteCategory(cat);
                          }}
                          title="분류 삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
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
              <CardDescription>상담 내용에 해당하는 태그를 선택하세요</CardDescription>
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
              {tags?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  등록된 태그가 없습니다
                </p>
              )}
            </CardContent>
          </Card>

          {/* 카카오톡 내부 알림 */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-yellow-500" />
                  카카오톡 알림
                </CardTitle>
                <Switch
                  checked={kakaoNotify}
                  onCheckedChange={(checked) => {
                    setKakaoNotify(checked);
                    if (checked && !kakaoMessage && formData.title) {
                      // 알림 활성화 시 기본 메시지 생성
                      const clientName = isNonMember
                        ? `${nonMemberInfo.name || '비회원'}${nonMemberInfo.phone ? ` (${nonMemberInfo.phone})` : ''}`
                        : selectedClient?.clientName || '고객';
                      const categoryName = categories?.find(c => c.id === formData.categoryId)?.name || '일반';
                      setKakaoMessage(
                        `[상담 알림]\n` +
                        `고객: ${clientName}${isNonMember ? ' [비회원]' : ''}\n` +
                        `분류: ${categoryName}\n` +
                        `제목: ${formData.title}\n` +
                        `우선순위: ${priorityOptions.find(p => p.value === formData.priority)?.label || '보통'}`
                      );
                    }
                  }}
                />
              </div>
              <CardDescription>내부 직원에게 카카오톡으로 알림을 보냅니다</CardDescription>
            </CardHeader>
            {kakaoNotify && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      알림 받을 직원
                    </Label>
                    {selectedStaff.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedStaff.length}명 선택
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto p-3 border rounded-md bg-slate-50">
                    {Object.entries(departmentGroups).map(([department, staffs]) => (
                      <div key={department} className="space-y-1.5">
                        {/* 부서 헤더 */}
                        <div
                          className="flex items-center space-x-2 pb-1 border-b border-slate-200 cursor-pointer hover:bg-slate-100 rounded px-1 -mx-1"
                          onClick={() => toggleDepartment(department)}
                        >
                          <Checkbox
                            id={`dept-${department}`}
                            checked={isDepartmentAllSelected(department)}
                            className={isDepartmentPartiallySelected(department) ? 'data-[state=checked]:bg-indigo-400' : ''}
                            onCheckedChange={() => toggleDepartment(department)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label
                            htmlFor={`dept-${department}`}
                            className="text-sm font-semibold text-slate-700 cursor-pointer flex-1 flex items-center gap-2"
                          >
                            {department}
                            <span className="text-xs font-normal text-muted-foreground">
                              ({staffs.filter(s => selectedStaff.includes(s.id)).length}/{staffs.length})
                            </span>
                          </label>
                        </div>
                        {/* 부서 내 직원 목록 */}
                        <div className="pl-5 space-y-1">
                          {staffs.map((staff) => (
                            <div key={staff.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={staff.id}
                                checked={selectedStaff.includes(staff.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedStaff(prev =>
                                    checked
                                      ? [...prev, staff.id]
                                      : prev.filter(id => id !== staff.id)
                                  );
                                }}
                              />
                              <label
                                htmlFor={staff.id}
                                className="text-sm font-medium leading-none cursor-pointer text-slate-600"
                              >
                                {staff.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 전체 선택/해제 버튼 */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setSelectedStaff(staffList.map(s => s.id))}
                    >
                      전체 선택
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setSelectedStaff([])}
                    >
                      전체 해제
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kakaoMessage">알림 메시지</Label>
                  <Textarea
                    id="kakaoMessage"
                    placeholder="알림 메시지를 입력하세요"
                    rows={4}
                    value={kakaoMessage}
                    onChange={(e) => setKakaoMessage(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700"
                  onClick={async () => {
                    if (selectedStaff.length === 0) {
                      toast({ title: '알림 받을 직원을 선택해주세요.', variant: 'destructive' });
                      return;
                    }
                    if (!kakaoMessage.trim()) {
                      toast({ title: '알림 메시지를 입력해주세요.', variant: 'destructive' });
                      return;
                    }
                    setIsKakaoSending(true);
                    try {
                      // TODO: 실제 카카오톡 API 연동
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      toast({ title: `${selectedStaff.length}명에게 카카오톡 알림을 전송했습니다.` });
                    } catch (error) {
                      toast({ title: '카카오톡 전송에 실패했습니다.', variant: 'destructive' });
                    } finally {
                      setIsKakaoSending(false);
                    }
                  }}
                  disabled={isKakaoSending || selectedStaff.length === 0}
                >
                  {isKakaoSending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  카카오톡 전송
                </Button>
              </CardContent>
            )}
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
              disabled={createConsultation.isPending}
            >
              {createConsultation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              등록
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
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {clientsData?.data?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  검색 결과가 없습니다
                </div>
              )}
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
            <div className="space-y-2">
              <Label htmlFor="categoryDescription">설명</Label>
              <Textarea
                id="categoryDescription"
                placeholder="분류에 대한 설명"
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              {(createCategory.isPending || updateCategory.isPending) && (
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
              <br />
              이 분류에 속한 상담은 분류 없음 상태가 됩니다.
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
