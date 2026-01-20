'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useConsultations,
  useConsultationCategories,
  useCreateConsultation,
  useUpdateConsultation,
  useDeleteConsultation,
  useUpdateConsultationStatus,
  useInitializeConsultationCategories,
  useAddFollowUp,
} from '@/hooks/use-consultations';
import { useClients } from '@/hooks/use-clients';
import {
  Consultation,
  ConsultationCategory,
  CreateConsultationDto,
  UpdateConsultationDto,
  ConsultationStatus,
  ConsultationPriority,
  CONSULTATION_CATEGORY_COLORS,
  CONSULTATION_STATUS_CONFIG,
  CONSULTATION_PRIORITY_CONFIG,
  FollowUpActionType,
} from '@/lib/types/consultation';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  MessageSquare,
  Phone,
  Calendar,
  User,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

export default function ConsultationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Consultation | null>(null);
  const [activeTab, setActiveTab] = useState('info');

  const { data: consultationsData, isLoading, error } = useConsultations({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter !== 'all' ? (statusFilter as ConsultationStatus) : undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    priority: priorityFilter !== 'all' ? (priorityFilter as ConsultationPriority) : undefined,
  });

  const { data: categories } = useConsultationCategories();
  const { data: clientsData } = useClients({ limit: 1000 });
  const createConsultation = useCreateConsultation();
  const updateConsultation = useUpdateConsultation();
  const deleteConsultation = useDeleteConsultation();
  const updateStatus = useUpdateConsultationStatus();
  const initCategories = useInitializeConsultationCategories();
  const addFollowUp = useAddFollowUp();

  const [formData, setFormData] = useState<CreateConsultationDto>({
    clientId: '',
    categoryId: '',
    title: '',
    content: '',
    counselorId: 'admin',
    counselorName: '관리자',
    status: 'open',
    priority: 'normal',
    kakaoScheduled: false,
  });

  const [followUpData, setFollowUpData] = useState({
    content: '',
    actionType: 'phone' as FollowUpActionType,
  });

  // 상담 분류 초기화 (처음 로딩시)
  useEffect(() => {
    if (categories && categories.length === 0) {
      initCategories.mutate();
    }
  }, [categories]);

  const handleOpenDialog = (consultation?: Consultation) => {
    if (consultation) {
      setEditingConsultation(consultation);
      setFormData({
        clientId: consultation.clientId,
        categoryId: consultation.categoryId,
        title: consultation.title,
        content: consultation.content,
        orderId: consultation.orderId,
        orderNumber: consultation.orderNumber,
        counselorId: consultation.counselorId,
        counselorName: consultation.counselorName,
        status: consultation.status,
        priority: consultation.priority,
        followUpDate: consultation.followUpDate ? consultation.followUpDate.split('T')[0] : undefined,
        followUpNote: consultation.followUpNote,
        kakaoScheduled: consultation.kakaoScheduled,
        kakaoSendAt: consultation.kakaoSendAt ? consultation.kakaoSendAt.slice(0, 16) : undefined,
        kakaoMessage: consultation.kakaoMessage,
        internalMemo: consultation.internalMemo,
      });
    } else {
      setEditingConsultation(null);
      setFormData({
        clientId: '',
        categoryId: categories?.[0]?.id || '',
        title: '',
        content: '',
        counselorId: 'admin',
        counselorName: '관리자',
        status: 'open',
        priority: 'normal',
        kakaoScheduled: false,
      });
    }
    setActiveTab('info');
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.clientId || !formData.categoryId || !formData.title || !formData.content) {
      toast({ title: '필수 항목을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      if (editingConsultation) {
        const updateData: UpdateConsultationDto = {
          categoryId: formData.categoryId,
          title: formData.title,
          content: formData.content,
          orderId: formData.orderId,
          orderNumber: formData.orderNumber,
          status: formData.status,
          priority: formData.priority,
          followUpDate: formData.followUpDate,
          followUpNote: formData.followUpNote,
          kakaoScheduled: formData.kakaoScheduled,
          kakaoSendAt: formData.kakaoSendAt,
          kakaoMessage: formData.kakaoMessage,
          internalMemo: formData.internalMemo,
        };
        await updateConsultation.mutateAsync({ id: editingConsultation.id, data: updateData });
        toast({ title: '상담이 수정되었습니다.' });
      } else {
        await createConsultation.mutateAsync(formData);
        toast({ title: '상담이 등록되었습니다.' });
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast({ title: '오류가 발생했습니다.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      try {
        await deleteConsultation.mutateAsync(deleteConfirm.id);
        toast({ title: '상담이 삭제되었습니다.' });
        setDeleteConfirm(null);
      } catch (err) {
        toast({ title: '삭제에 실패했습니다.', variant: 'destructive' });
      }
    }
  };

  const handleAddFollowUp = async () => {
    if (!editingConsultation || !followUpData.content) {
      toast({ title: '후속 조치 내용을 입력해주세요.', variant: 'destructive' });
      return;
    }

    try {
      await addFollowUp.mutateAsync({
        consultationId: editingConsultation.id,
        data: {
          content: followUpData.content,
          actionType: followUpData.actionType,
          staffId: 'admin',
          staffName: '관리자',
        },
      });
      toast({ title: '후속 조치가 등록되었습니다.' });
      setFollowUpData({ content: '', actionType: 'phone' });
    } catch (err) {
      toast({ title: '후속 조치 등록에 실패했습니다.', variant: 'destructive' });
    }
  };

  const getCategoryBadge = (category: ConsultationCategory) => {
    const colorClass = category.colorCode
      ? CONSULTATION_CATEGORY_COLORS[category.colorCode] || CONSULTATION_CATEGORY_COLORS.gray
      : CONSULTATION_CATEGORY_COLORS.gray;

    return (
      <Badge variant="outline" className={`text-xs ${colorClass}`}>
        {category.name}
      </Badge>
    );
  };

  const getStatusBadge = (status: ConsultationStatus) => {
    const config = CONSULTATION_STATUS_CONFIG[status];
    return (
      <Badge className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  const getPriorityIcon = (priority: ConsultationPriority) => {
    const config = CONSULTATION_PRIORITY_CONFIG[priority];
    const iconClass = `h-4 w-4 ${config.color}`;

    switch (priority) {
      case 'low':
        return <ArrowDown className={iconClass} />;
      case 'normal':
        return <Minus className={iconClass} />;
      case 'high':
        return <ArrowUp className={iconClass} />;
      case 'urgent':
        return <AlertTriangle className={iconClass} />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="고객 상담 관리"
        description="고객 상담 내역을 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '회사정보', href: '/company' },
          { label: '고객 상담 관리' },
        ]}
      />

      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-blue-50/50 to-transparent">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            상담 목록
          </CardTitle>
          <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            새 상담 등록
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {/* 필터 영역 */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-50/50 rounded-xl border">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="상담번호, 제목, 고객명 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36 bg-white">
                <SelectValue placeholder="분류" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 분류</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-white">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="open">접수</SelectItem>
                <SelectItem value="in_progress">처리중</SelectItem>
                <SelectItem value="resolved">해결</SelectItem>
                <SelectItem value="closed">종료</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32 bg-white">
                <SelectValue placeholder="우선순위" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
                <SelectItem value="normal">보통</SelectItem>
                <SelectItem value="high">높음</SelectItem>
                <SelectItem value="urgent">긴급</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 테이블 */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              데이터를 불러오는데 실패했습니다.
            </div>
          ) : (
            <>
              <div className="rounded-xl border overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="w-[140px]">상담번호</TableHead>
                      <TableHead className="w-[100px]">분류</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead className="w-[120px]">고객</TableHead>
                      <TableHead className="w-[100px]">상담자</TableHead>
                      <TableHead className="w-[130px]">상담일시</TableHead>
                      <TableHead className="w-[60px] text-center">우선</TableHead>
                      <TableHead className="w-[80px]">상태</TableHead>
                      <TableHead className="w-[100px] text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultationsData?.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          등록된 상담이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      consultationsData?.data?.map((consultation) => (
                        <TableRow key={consultation.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-mono text-sm text-blue-600">
                            {consultation.consultNumber}
                          </TableCell>
                          <TableCell>
                            {getCategoryBadge(consultation.category)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium truncate max-w-[300px]">{consultation.title}</span>
                              {consultation._count?.followUps ? (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  후속조치 {consultation._count.followUps}건
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{consultation.client.clientName}</span>
                              <span className="text-xs text-muted-foreground">{consultation.client.clientCode}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{consultation.counselorName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(consultation.consultedAt), 'MM/dd HH:mm', { locale: ko })}
                          </TableCell>
                          <TableCell className="text-center">
                            {getPriorityIcon(consultation.priority)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(consultation.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(consultation)}
                                className="hover:bg-blue-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm(consultation)}
                                className="hover:bg-red-50"
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

              {/* 페이지네이션 */}
              {consultationsData?.meta && consultationsData.meta.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    이전
                  </Button>
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    {page} / {consultationsData.meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === consultationsData.meta.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    다음
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 상담 등록/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              {editingConsultation ? '상담 수정' : '새 상담 등록'}
            </DialogTitle>
            <DialogDescription>
              {editingConsultation ? `상담번호: ${editingConsultation.consultNumber}` : '고객 상담 내용을 입력하세요.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="info" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                상담정보
              </TabsTrigger>
              <TabsTrigger value="followup" className="flex items-center gap-2" disabled={!editingConsultation}>
                <Clock className="h-4 w-4" />
                후속조치
              </TabsTrigger>
              <TabsTrigger value="kakao" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                카카오톡
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
              {/* 고객 정보 섹션 */}
              <div className="p-4 border rounded-xl bg-gradient-to-r from-blue-50 to-transparent">
                <h3 className="font-semibold mb-4 text-blue-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  고객 정보
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientId">고객 *</Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={(v) => setFormData({ ...formData, clientId: v })}
                      disabled={!!editingConsultation}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="고객 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientsData?.data?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.clientName} ({client.clientCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">상담 분류 *</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="분류 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orderNumber">관련 주문번호</Label>
                    <Input
                      id="orderNumber"
                      value={formData.orderNumber || ''}
                      onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                      placeholder="ORD-20260120-001"
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 상담 내용 섹션 */}
              <div className="p-4 border rounded-xl bg-gradient-to-r from-green-50 to-transparent">
                <h3 className="font-semibold mb-4 text-green-700 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  상담 내용
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">제목 *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="상담 제목을 입력하세요"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">내용 *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="상담 내용을 입력하세요"
                      rows={5}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 상담 설정 섹션 */}
              <div className="p-4 border rounded-xl bg-gradient-to-r from-purple-50 to-transparent">
                <h3 className="font-semibold mb-4 text-purple-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  상담 설정
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">상태</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v as ConsultationStatus })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">접수</SelectItem>
                        <SelectItem value="in_progress">처리중</SelectItem>
                        <SelectItem value="resolved">해결</SelectItem>
                        <SelectItem value="closed">종료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">우선순위</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData({ ...formData, priority: v as ConsultationPriority })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">낮음</SelectItem>
                        <SelectItem value="normal">보통</SelectItem>
                        <SelectItem value="high">높음</SelectItem>
                        <SelectItem value="urgent">긴급</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="followUpDate">후속 조치 예정일</Label>
                    <Input
                      id="followUpDate"
                      type="date"
                      value={formData.followUpDate || ''}
                      onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="internalMemo">내부 메모</Label>
                  <Textarea
                    id="internalMemo"
                    value={formData.internalMemo || ''}
                    onChange={(e) => setFormData({ ...formData, internalMemo: e.target.value })}
                    placeholder="내부 참고용 메모를 입력하세요"
                    rows={2}
                    className="bg-white"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="followup" className="space-y-6">
              {editingConsultation?.followUps && editingConsultation.followUps.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700">후속 조치 이력</h3>
                  <div className="space-y-3">
                    {editingConsultation.followUps.map((followUp) => (
                      <div key={followUp.id} className="p-4 border rounded-lg bg-slate-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {followUp.actionType === 'phone' && '전화'}
                            {followUp.actionType === 'visit' && '방문'}
                            {followUp.actionType === 'email' && '이메일'}
                            {followUp.actionType === 'kakao' && '카카오톡'}
                            {followUp.actionType === 'other' && '기타'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{followUp.staffName}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(followUp.createdAt), 'yyyy-MM-dd HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm">{followUp.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  후속 조치 이력이 없습니다.
                </div>
              )}

              {/* 새 후속 조치 등록 */}
              <div className="p-4 border rounded-xl bg-gradient-to-r from-orange-50 to-transparent">
                <h3 className="font-semibold mb-4 text-orange-700 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  새 후속 조치 등록
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>조치 유형</Label>
                    <Select
                      value={followUpData.actionType}
                      onValueChange={(v) => setFollowUpData({ ...followUpData, actionType: v as FollowUpActionType })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">전화</SelectItem>
                        <SelectItem value="visit">방문</SelectItem>
                        <SelectItem value="email">이메일</SelectItem>
                        <SelectItem value="kakao">카카오톡</SelectItem>
                        <SelectItem value="other">기타</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>조치 내용</Label>
                    <Textarea
                      value={followUpData.content}
                      onChange={(e) => setFollowUpData({ ...followUpData, content: e.target.value })}
                      placeholder="후속 조치 내용을 입력하세요"
                      rows={3}
                      className="bg-white"
                    />
                  </div>
                  <Button
                    onClick={handleAddFollowUp}
                    disabled={addFollowUp.isPending}
                    className="w-full"
                  >
                    {addFollowUp.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    후속 조치 등록
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="kakao" className="space-y-6">
              <div className="p-4 border rounded-xl bg-gradient-to-r from-yellow-50 to-transparent">
                <h3 className="font-semibold mb-4 text-yellow-700 flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  카카오톡 예약 전송
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="kakaoScheduled" className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="kakaoScheduled"
                        checked={formData.kakaoScheduled}
                        onChange={(e) => setFormData({ ...formData, kakaoScheduled: e.target.checked })}
                        className="rounded"
                      />
                      예약 전송 사용
                    </Label>
                  </div>
                  {formData.kakaoScheduled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="kakaoSendAt">전송 예약 시간</Label>
                        <Input
                          id="kakaoSendAt"
                          type="datetime-local"
                          value={formData.kakaoSendAt || ''}
                          onChange={(e) => setFormData({ ...formData, kakaoSendAt: e.target.value })}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kakaoMessage">메시지 내용</Label>
                        <Textarea
                          id="kakaoMessage"
                          value={formData.kakaoMessage || ''}
                          onChange={(e) => setFormData({ ...formData, kakaoMessage: e.target.value })}
                          placeholder="카카오톡으로 전송할 메시지를 입력하세요"
                          rows={4}
                          className="bg-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground p-4 bg-slate-50 rounded-lg">
                <AlertCircle className="h-4 w-4 inline-block mr-2" />
                카카오톡 예약 전송 기능은 카카오 알림톡 API 연동 후 사용 가능합니다.
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createConsultation.isPending || updateConsultation.isPending}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {(createConsultation.isPending || updateConsultation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingConsultation ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              상담 삭제
            </DialogTitle>
            <DialogDescription>
              &apos;{deleteConfirm?.consultNumber}&apos; 상담을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConsultation.isPending}
            >
              {deleteConsultation.isPending && (
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
