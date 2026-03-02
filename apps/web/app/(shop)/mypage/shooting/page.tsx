'use client';

import { useState, useMemo } from 'react';
import {
  format,
  parseISO,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Camera,
  Plus,
  List,
  CalendarDays,
  MapPin,
  Loader2,
  Search,
  Eye,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import {
  useShootings,
  useCreateShooting,
  useDeleteShooting,
} from '@/hooks/use-shooting';
import type {
  Shooting,
  ShootingType,
  ShootingStatus,
  CreateShootingDto,
} from '@/hooks/use-shooting';
import { ShootingCalendar } from '@/components/shooting/shooting-calendar';
import { ShootingStatusBadge } from '@/components/shooting/shooting-status-badge';
import { ShootingTypeBadge } from '@/components/shooting/shooting-type-badge';
import { cn } from '@/lib/utils';

// ==================== Constants ====================

const SHOOTING_TYPES: { value: string; label: string }[] = [
  { value: 'wedding_main', label: '본식 촬영' },
  { value: 'wedding_rehearsal', label: '리허설 촬영' },
  { value: 'baby_dol', label: '돌 촬영' },
  { value: 'baby_growth', label: '성장 촬영' },
  { value: 'profile', label: '프로필 촬영' },
  { value: 'other', label: '기타' },
];

const SHOOTING_STATUSES: { value: string; label: string }[] = [
  { value: 'draft', label: '초안' },
  { value: 'recruiting', label: '모집중' },
  { value: 'bidding', label: '응찰중' },
  { value: 'confirmed', label: '확정' },
  { value: 'in_progress', label: '진행중' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
];

type ViewMode = 'list' | 'calendar';

// ==================== Page Component ====================

export default function MypageShootingPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<Shooting | null>(null);

  // Query with createdBy filter
  const userId = user?.id || user?.clientId;
  const { data: shootingsData, isLoading } = useShootings({
    createdBy: userId,
    search: search || undefined,
    shootingType: filterType !== 'all' ? (filterType as ShootingType) : undefined,
    status: filterStatus !== 'all' ? (filterStatus as ShootingStatus) : undefined,
    limit: 100,
  });

  const createShooting = useCreateShooting();
  const deleteShooting = useDeleteShooting();

  const shootings = shootingsData?.data || [];

  const handleDelete = (id: string) => {
    deleteShooting.mutate(id, {
      onSuccess: () => toast({ title: '촬영일정이 삭제되었습니다' }),
      onError: () => toast({ title: '삭제 실패', variant: 'destructive' }),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <h1 className="text-[18px] text-black font-bold">촬영일정</h1>
        </div>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'px-2.5 py-1.5 text-[12px] flex items-center gap-1',
                viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              <List className="h-3.5 w-3.5" />
              리스트
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={cn(
                'px-2.5 py-1.5 text-[12px] flex items-center gap-1',
                viewMode === 'calendar' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              캘린더
            </button>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            촬영 등록
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                className="text-[13px] pl-8 h-8"
                placeholder="고객명, 장소 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[120px] text-[13px] h-8">
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[13px]">전체 유형</SelectItem>
                {SHOOTING_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-[13px]">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px] text-[13px] h-8">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[13px]">전체 상태</SelectItem>
                {SHOOTING_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-[13px]">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : viewMode === 'list' ? (
        <ShootingListView
          shootings={shootings}
          onView={(s) => setDetailDialog(s)}
          onDelete={handleDelete}
        />
      ) : (
        <ShootingCalendarView
          shootings={shootings}
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          onMonthChange={setCurrentMonth}
          onDateSelect={setSelectedDate}
          onShootingClick={(s) => setDetailDialog(s)}
        />
      )}

      {/* Create dialog */}
      <ShootingCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={(data) => {
          createShooting.mutate(data, {
            onSuccess: () => {
              setDialogOpen(false);
              toast({ title: '촬영일정이 등록되었습니다' });
            },
            onError: () => toast({ title: '등록 실패', variant: 'destructive' }),
          });
        }}
        isPending={createShooting.isPending}
      />

      {/* Detail dialog */}
      <ShootingDetailDialog
        shooting={detailDialog}
        onClose={() => setDetailDialog(null)}
      />
    </div>
  );
}

// ==================== List View ====================

function ShootingListView({
  shootings,
  onView,
  onDelete,
}: {
  shootings: Shooting[];
  onView: (s: Shooting) => void;
  onDelete: (id: string) => void;
}) {
  if (shootings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Camera className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-[14px] text-gray-500">등록된 촬영일정이 없습니다</p>
          <p className="text-[12px] text-gray-400 mt-1">촬영 등록 버튼을 눌러 새 촬영을 등록하세요</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[13px] w-[100px]">날짜</TableHead>
            <TableHead className="text-[13px] w-[80px]">유형</TableHead>
            <TableHead className="text-[13px]">고객명</TableHead>
            <TableHead className="text-[13px]">장소</TableHead>
            <TableHead className="text-[13px] w-[80px]">상태</TableHead>
            <TableHead className="text-[13px] w-[80px] text-center">액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shootings.map((s) => (
            <TableRow key={s.id} className="cursor-pointer hover:bg-gray-50" onClick={() => onView(s)}>
              <TableCell className="text-[13px]">
                {s.shootingDate
                  ? format(parseISO(s.shootingDate), 'M/d (EEE)', { locale: ko })
                  : '-'}
              </TableCell>
              <TableCell>
                <ShootingTypeBadge type={s.shootingType} />
              </TableCell>
              <TableCell className="text-[13px]">{s.clientName || '-'}</TableCell>
              <TableCell className="text-[13px] text-gray-600">{s.venueName || '-'}</TableCell>
              <TableCell>
                <ShootingStatusBadge status={s.status} />
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(s);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-500"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ==================== Calendar View ====================

function ShootingCalendarView({
  shootings,
  currentMonth,
  selectedDate,
  onMonthChange,
  onDateSelect,
  onShootingClick,
}: {
  shootings: Shooting[];
  currentMonth: Date;
  selectedDate: Date;
  onMonthChange: (d: Date) => void;
  onDateSelect: (d: Date) => void;
  onShootingClick: (s: Shooting) => void;
}) {
  // Selected day shootings
  const selectedDayShootings = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return shootings.filter((s) => s.shootingDate?.substring(0, 10) === key);
  }, [shootings, selectedDate]);

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-4">
      <Card>
        <CardContent className="p-4">
          <ShootingCalendar
            shootings={shootings}
            selectedDate={selectedDate}
            currentMonth={currentMonth}
            viewMode="month"
            onDateSelect={onDateSelect}
            onMonthChange={onMonthChange}
            onShootingClick={onShootingClick}
          />
        </CardContent>
      </Card>

      {/* Selected date detail */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-[14px] font-bold">
            {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {selectedDayShootings.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-3 text-center">촬영 일정이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {selectedDayShootings.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onShootingClick(s)}
                  className="w-full text-left p-3 rounded-lg border hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <ShootingTypeBadge type={s.shootingType} />
                    <ShootingStatusBadge status={s.status} />
                  </div>
                  <p className="text-[14px] text-black font-medium mt-1">
                    {s.clientName}
                  </p>
                  {s.venueName && (
                    <div className="flex items-center gap-1 mt-1 text-[12px] text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {s.venueName}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Create Dialog ====================

function ShootingCreateDialog({
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: CreateShootingDto) => void;
  isPending: boolean;
}) {
  const [clientName, setClientName] = useState('');
  const [shootingType, setShootingType] = useState<string>('wedding_main');
  const [shootingDate, setShootingDate] = useState('');
  const [shootingTime, setShootingTime] = useState('');
  const [duration, setDuration] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [notes, setNotes] = useState('');

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setClientName('');
      setShootingType('wedding_main');
      setShootingDate(format(new Date(), 'yyyy-MM-dd'));
      setShootingTime('');
      setDuration('');
      setVenueName('');
      setVenueAddress('');
      setNotes('');
    }
    onOpenChange(v);
  };

  const handleSubmit = () => {
    if (!clientName.trim() || !shootingDate || !venueName.trim()) return;
    // Combine date + time into ISO datetime string
    const isoDateTime = shootingTime
      ? `${shootingDate}T${shootingTime}:00`
      : `${shootingDate}T00:00:00`;
    onSave({
      clientName: clientName.trim(),
      shootingType: shootingType as ShootingType,
      shootingDate: isoDateTime,
      duration: duration ? parseInt(duration, 10) : undefined,
      venueName: venueName.trim(),
      venueAddress: venueAddress.trim() || '',
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px]">촬영 등록</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[13px]">고객명</Label>
              <Input
                className="text-[13px]"
                placeholder="고객명"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[13px]">유형</Label>
              <Select value={shootingType} onValueChange={setShootingType}>
                <SelectTrigger className="text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHOOTING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-[13px]">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-[13px]">촬영일</Label>
              <Input
                type="date"
                className="text-[13px]"
                value={shootingDate}
                onChange={(e) => setShootingDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[13px]">시간 (선택)</Label>
              <Input
                type="time"
                className="text-[13px]"
                value={shootingTime}
                onChange={(e) => setShootingTime(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[13px]">소요 (분)</Label>
              <Input
                type="number"
                className="text-[13px]"
                placeholder="예: 120"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-[13px]">장소</Label>
            <Input
              className="text-[13px]"
              placeholder="장소명"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[13px]">주소 (선택)</Label>
            <Input
              className="text-[13px]"
              placeholder="주소"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[13px]">메모 (선택)</Label>
            <Textarea
              className="text-[13px] resize-none"
              rows={2}
              placeholder="메모"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            size="sm"
            disabled={!clientName.trim() || !shootingDate || !venueName.trim() || isPending}
            onClick={handleSubmit}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Detail Dialog ====================

function ShootingDetailDialog({
  shooting,
  onClose,
}: {
  shooting: Shooting | null;
  onClose: () => void;
}) {
  if (!shooting) return null;

  return (
    <Dialog open={!!shooting} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px]">촬영 상세</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShootingTypeBadge type={shooting.shootingType} />
            <ShootingStatusBadge status={shooting.status} />
          </div>
          <div>
            <h3 className="text-[16px] text-black font-bold">{shooting.clientName}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <span className="text-gray-500">촬영일</span>
              <p className="font-medium">
                {shooting.shootingDate
                  ? format(parseISO(shooting.shootingDate), 'yyyy년 M월 d일 (EEE)', {
                      locale: ko,
                    })
                  : '-'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">시간</span>
              <p className="font-medium">
                {shooting.shootingDate
                  ? format(parseISO(shooting.shootingDate), 'HH:mm') !== '00:00'
                    ? format(parseISO(shooting.shootingDate), 'HH:mm')
                    : '미정'
                  : '미정'}
              </p>
            </div>
          </div>
          {shooting.venueName && (
            <div className="text-[13px]">
              <span className="text-gray-500">장소</span>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <p className="font-medium">{shooting.venueName}</p>
              </div>
              {shooting.venueAddress && (
                <p className="text-gray-400 text-[12px] ml-5">{shooting.venueAddress}</p>
              )}
            </div>
          )}
          {shooting.duration && (
            <div className="text-[13px]">
              <span className="text-gray-500">소요시간</span>
              <p className="font-medium">{shooting.duration}분</p>
            </div>
          )}
          {shooting.notes && (
            <div className="text-[13px]">
              <span className="text-gray-500">메모</span>
              <p className="mt-0.5 whitespace-pre-wrap">{shooting.notes}</p>
            </div>
          )}
          {(shooting.assignedStaff?.name || shooting.assignedClient?.clientName) && (
            <div className="text-[13px]">
              <span className="text-gray-500">담당 작가</span>
              <p className="font-medium">
                {shooting.assignedStaff?.name || shooting.assignedClient?.clientName}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
