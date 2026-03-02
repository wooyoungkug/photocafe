'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  Calendar,
  MapPin,
  Wallet,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Lock,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth-store';
import { useRecruitments } from '@/hooks/use-recruitment';
import {
  SHOOTING_TYPE_LABELS,
  RECRUITMENT_STATUS_LABELS,
  URGENCY_LABELS,
} from '@/lib/types/recruitment';
import type {
  Recruitment,
  RecruitmentStatus,
  ShootingType,
  RecruitmentQueryParams,
} from '@/lib/types/recruitment';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// 상태 배지 스타일
const STATUS_BADGE_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  private_recruiting: 'bg-blue-100 text-blue-700',
  public_recruiting: 'bg-green-100 text-green-700',
  filled: 'bg-purple-100 text-purple-700',
  expired: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-500 line-through',
};

// 긴급도 배지 스타일
const URGENCY_BADGE_STYLES: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  urgent: 'bg-orange-100 text-orange-700',
  emergency: 'bg-red-100 text-red-700',
};

// 진행별 대시보드 항목 정의
const STATUS_ITEMS: Array<{
  key: RecruitmentStatus | 'all';
  label: string;
  dot: string;
  active: string;
}> = [
  { key: 'all',               label: '전체',    dot: 'bg-gray-400',   active: 'bg-gray-100 text-gray-700 ring-gray-300' },
  { key: 'draft',             label: '초안',    dot: 'bg-gray-300',   active: 'bg-gray-100 text-gray-600 ring-gray-300' },
  { key: 'private_recruiting',label: '전속모집', dot: 'bg-blue-500',  active: 'bg-blue-50 text-blue-700 ring-blue-300' },
  { key: 'public_recruiting', label: '공개모집', dot: 'bg-green-500', active: 'bg-green-50 text-green-700 ring-green-300' },
  { key: 'filled',            label: '확정',    dot: 'bg-purple-500', active: 'bg-purple-50 text-purple-700 ring-purple-300' },
  { key: 'expired',           label: '만료',    dot: 'bg-yellow-400', active: 'bg-yellow-50 text-yellow-700 ring-yellow-300' },
  { key: 'cancelled',         label: '취소',    dot: 'bg-red-400',    active: 'bg-red-50 text-red-600 ring-red-200' },
];

// ==================== 진행별 대시보드 ====================
function StatusDashboard({
  counts,
  total,
  activeStatus,
  onSelect,
}: {
  counts: Record<string, number>;
  total: number;
  activeStatus: string;
  onSelect: (s: string) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {STATUS_ITEMS.map((item) => {
        const count = item.key === 'all' ? total : (counts[item.key] ?? 0);
        const isActive = activeStatus === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] ring-1 ring-inset transition-all',
              isActive
                ? item.active
                : 'bg-white text-gray-500 ring-gray-200 hover:ring-gray-300 hover:text-gray-700',
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', item.dot)} />
            <span>{item.label}</span>
            <span className={cn('tabular-nums font-semibold', isActive ? '' : 'text-gray-400')}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// 시작시간 + 소요시간으로 종료시간 계산
function calcEndTime(shootingTime?: string, duration?: number): string | null {
  if (!shootingTime || !duration) return null;
  const [h, m] = shootingTime.split(':').map(Number);
  const totalMin = h * 60 + m + duration;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

// 주소에서 시·구·동 수준 추출
// "서울특별시 강남구 청담동 11-1" → "서울특별시 강남구 청담동"
// "경기도 성남시 분당구 정자동 111" → "성남시 분당구 정자동"
// "대구광역시 서구 내당4동" → "대구광역시 서구 내당4동"
function extractLocationSummary(address?: string): string | null {
  if (!address) return null;
  // 시/도 + 구/군 + 동/읍/면 전체 추출
  const fullMatch = address.match(
    /([가-힣]+(?:특별시|광역시|특별자치시|특별자치도|시|도))\s+([가-힣]+(?:시|구|군))\s+([가-힣0-9]+(?:동|읍|면))/
  );
  if (fullMatch) return `${fullMatch[1]} ${fullMatch[2]} ${fullMatch[3]}`;
  // 구/군 + 동/읍/면
  const dongMatch = address.match(/([가-힣]+(?:구|군))\s+([가-힣0-9]+(?:동|읍|면))/);
  if (dongMatch) return `${dongMatch[1]} ${dongMatch[2]}`;
  // 동/읍/면만
  const dongOnly = address.match(/([가-힣0-9]+(?:동|읍|면))(?:\s|$)/);
  if (dongOnly) return dongOnly[1];
  // 구/군만
  const guMatch = address.match(/([가-힣]+(?:구|군))/);
  if (guMatch) return guMatch[1];
  return null;
}

// ==================== 내 구인 리스트 행 ====================
function MyRecruitmentRow({ recruitment }: { recruitment: Recruitment }) {
  const shootingDate = new Date(recruitment.shootingDate);
  const isPrivate = recruitment.recruitmentPhase === 'private';
  const locationSummary = extractLocationSummary(recruitment.venueAddress);
  const endTime = calcEndTime(recruitment.shootingTime, recruitment.duration);

  return (
    <Link href={`/mypage/recruitment/${recruitment.id}`}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0 cursor-pointer">
        {/* 상태 */}
        <div className="shrink-0 w-[90px]">
          <Badge className={cn('text-[11px]', STATUS_BADGE_STYLES[recruitment.status])}>
            {RECRUITMENT_STATUS_LABELS[recruitment.status]}
          </Badge>
        </div>

        {/* 긴급도 */}
        <div className="shrink-0 w-[50px]">
          {recruitment.urgencyLevel !== 'normal' && (
            <Badge className={cn('text-[11px]', URGENCY_BADGE_STYLES[recruitment.urgencyLevel])}>
              {URGENCY_LABELS[recruitment.urgencyLevel]}
            </Badge>
          )}
        </div>

        {/* 모집 유형 아이콘 */}
        <div className="shrink-0 w-[20px]">
          {isPrivate ? (
            <Lock className="h-3.5 w-3.5 text-blue-500" />
          ) : (
            <Globe className="h-3.5 w-3.5 text-green-500" />
          )}
        </div>

        {/* 제목 + 촬영유형 + 스튜디오/개인명 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-black font-normal truncate">
              {recruitment.title}
            </span>
            <Badge variant="outline" className="text-[11px] shrink-0">
              {SHOOTING_TYPE_LABELS[recruitment.shootingType]}
            </Badge>
          </div>
          {(recruitment.client?.clientName || recruitment.customerName) && (
            <div className="flex items-center gap-1 mt-0.5">
              {recruitment.client?.clientName && (
                <span className="text-[12px] text-gray-400 truncate">
                  {recruitment.client.clientName}
                </span>
              )}
              {recruitment.client?.clientName && recruitment.customerName && (
                <span className="text-[12px] text-gray-300">·</span>
              )}
              {recruitment.customerName && (
                <span className="text-[12px] text-gray-400 truncate">
                  {recruitment.customerName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 촬영일 */}
        <div className="shrink-0 w-[120px] hidden sm:flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-[13px] text-gray-600">
              {format(shootingDate, 'MM.dd (EEE)', { locale: ko })}
              {recruitment.shootingTime && ` ${recruitment.shootingTime.substring(0, 5)}`}
            </span>
          </div>
          {endTime && (
            <span className="text-[11px] text-gray-400 pl-5">~ {endTime}</span>
          )}
        </div>

        {/* 장소 */}
        <div className="shrink-0 w-[140px] hidden md:flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-[13px] text-gray-600 truncate">{recruitment.venueName}</span>
          </div>
          {locationSummary && (
            <span className="text-[11px] text-gray-400 pl-5 truncate">{locationSummary}</span>
          )}
        </div>

        {/* 보수 */}
        <div className="shrink-0 w-[90px] hidden lg:flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[13px] text-gray-600">
            {recruitment.budget
              ? `${Number(recruitment.budget).toLocaleString()}원`
              : '-'}
          </span>
        </div>

        {/* 응찰수 */}
        <div className="shrink-0 w-[60px] flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[12px] text-gray-500">
            {recruitment._count?.bids ?? 0}
          </span>
        </div>

        {/* 등록일 */}
        <div className="shrink-0 w-[70px] hidden sm:block">
          <span className="text-[12px] text-gray-400">
            {format(new Date(recruitment.createdAt), 'MM.dd HH:mm')}
          </span>
        </div>

        <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
      </div>
    </Link>
  );
}

// ==================== 공개 구인방 리스트 행 ====================
function PublicRecruitmentRow({ recruitment }: { recruitment: Recruitment }) {
  const shootingDate = new Date(recruitment.shootingDate);
  const daysLeft = Math.ceil(
    (shootingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const locationSummary = extractLocationSummary(recruitment.venueAddress);
  const endTime = calcEndTime(recruitment.shootingTime, recruitment.duration);

  return (
    <Link href={`/mypage/recruitment/${recruitment.id}`}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0 cursor-pointer">
        {/* 상태 */}
        <div className="shrink-0 w-[80px]">
          <Badge className="bg-green-100 text-green-700 text-[11px]">공개모집</Badge>
        </div>

        {/* 긴급/D-day */}
        <div className="shrink-0 w-[60px]">
          {recruitment.urgencyLevel !== 'normal' ? (
            <Badge className={cn('text-[11px]', URGENCY_BADGE_STYLES[recruitment.urgencyLevel])}>
              {URGENCY_LABELS[recruitment.urgencyLevel]}
            </Badge>
          ) : daysLeft >= 0 && daysLeft <= 7 ? (
            <Badge variant="outline" className="text-[11px] text-orange-600 border-orange-300">
              D-{daysLeft}
            </Badge>
          ) : null}
        </div>

        {/* 제목 + 촬영유형 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-black font-normal truncate">
              {recruitment.title}
            </span>
            <Badge variant="outline" className="text-[11px] shrink-0">
              {SHOOTING_TYPE_LABELS[recruitment.shootingType]}
            </Badge>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {recruitment.client?.clientName && (
              <span className="text-[12px] text-gray-400 truncate">
                {recruitment.client.clientName}
              </span>
            )}
            {recruitment.client?.clientName && recruitment.customerName && (
              <span className="text-[12px] text-gray-300">·</span>
            )}
            {recruitment.customerName && (
              <span className="text-[12px] text-gray-400 truncate">
                {recruitment.customerName}
              </span>
            )}
          </div>
        </div>

        {/* 촬영일 */}
        <div className="shrink-0 w-[130px] hidden sm:flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-[13px] text-gray-600">
              {format(shootingDate, 'MM.dd (EEE)', { locale: ko })}
              {recruitment.shootingTime && ` ${recruitment.shootingTime.substring(0, 5)}`}
            </span>
          </div>
          {endTime && (
            <span className="text-[11px] text-gray-400 pl-5">~ {endTime}</span>
          )}
        </div>

        {/* 장소 */}
        <div className="shrink-0 w-[140px] hidden md:flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-[13px] text-gray-600 truncate">{recruitment.venueName}</span>
          </div>
          {locationSummary && (
            <span className="text-[11px] text-gray-400 pl-5 truncate">{locationSummary}</span>
          )}
        </div>

        {/* 보수 */}
        <div className="shrink-0 w-[90px] hidden lg:flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[13px] text-black font-bold">
            {recruitment.budget
              ? `${Number(recruitment.budget).toLocaleString()}원`
              : '-'}
          </span>
        </div>

        {/* 응찰수 */}
        <div className="shrink-0 w-[50px] flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[12px] text-gray-500">
            {recruitment._count?.bids ?? 0}
          </span>
        </div>

        <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
      </div>
    </Link>
  );
}

// ==================== 메인 페이지 ====================
export default function RecruitmentListPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // 내 구인 탭 표시: 직원이거나 clientId가 있는 사용자
  const isStaff = user?.role === 'admin' || user?.role === 'staff';
  const canManageRecruitment = isStaff || !!user?.clientId;

  const [activeTab, setActiveTab] = useState<'my' | 'public'>(canManageRecruitment ? 'my' : 'public');
  const [statusFilter, setStatusFilter] = useState<RecruitmentStatus | 'all'>('all');
  const [shootingTypeFilter, setShootingTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('latest');
  const [page, setPage] = useState(1);

  // ── 내 구인: 전체 한 번 로드 → 클라이언트 필터/페이징
  const { data: myResponse, isLoading: myLoading } = useRecruitments(
    canManageRecruitment
      ? {
          clientId: user?.clientId || '',
          shootingType: shootingTypeFilter !== 'all' ? (shootingTypeFilter as ShootingType) : undefined,
          sort: sortBy as RecruitmentQueryParams['sort'],
          limit: 200,
        }
      : undefined,
  );

  const allMyRecruitments = myResponse?.data ?? [];

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allMyRecruitments.forEach((r) => {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    });
    return counts;
  }, [allMyRecruitments]);

  const filteredMyRecruitments = useMemo(
    () =>
      statusFilter === 'all'
        ? allMyRecruitments
        : allMyRecruitments.filter((r) => r.status === statusFilter),
    [allMyRecruitments, statusFilter],
  );

  const ITEMS_PER_PAGE = 20;
  const myPageItems = filteredMyRecruitments.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );
  const myTotalPages = Math.ceil(filteredMyRecruitments.length / ITEMS_PER_PAGE);

  // ── 공개 구인방: 서버사이드 페이징 유지
  const { data: publicResponse, isLoading: publicLoading } = useRecruitments(
    activeTab === 'public'
      ? {
          publicOnly: 'true',
          shootingType: shootingTypeFilter !== 'all' ? (shootingTypeFilter as ShootingType) : undefined,
          sort: sortBy as RecruitmentQueryParams['sort'],
          page,
          limit: 12,
        }
      : undefined,
  );

  // 탭별 데이터 통합
  const isLoading = activeTab === 'my' ? myLoading : publicLoading;
  const recruitments = activeTab === 'my' ? myPageItems : (publicResponse?.data ?? []);
  const meta = activeTab === 'my'
    ? (myTotalPages > 1 ? { totalPages: myTotalPages } : undefined)
    : publicResponse?.meta;

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'my' | 'public');
    setStatusFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-gray-700" />
          <h2 className="text-[18px] text-black font-bold">구인방</h2>
        </div>
      </div>

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList className="rounded-lg">
            {/* 내 구인 탭: 직원 또는 clientId 보유 사용자 */}
            {canManageRecruitment && (
              <TabsTrigger value="my" className="text-[13px] rounded-md px-4">
                <Lock className="h-3.5 w-3.5 mr-1" />
                내 구인
              </TabsTrigger>
            )}
            <TabsTrigger value="public" className="text-[13px] rounded-md px-4">
              <Globe className="h-3.5 w-3.5 mr-1" />
              공개 구인방
            </TabsTrigger>
          </TabsList>

          {/* 구인 등록 버튼 (내 구인 탭) */}
          {activeTab === 'my' && canManageRecruitment && (
            <Button
              size="sm"
              onClick={() => router.push('/mypage/recruitment/new')}
              className="text-[13px]"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              구인 등록
            </Button>
          )}
        </div>

        {/* 필터 */}
        <Card className="mt-3">
          <CardContent className="py-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <Search className="h-3.5 w-3.5 text-gray-400" />
              <Select
                value={shootingTypeFilter}
                onValueChange={(v) => { setShootingTypeFilter(v); setPage(1); }}
              >
                <SelectTrigger className="text-[12px] h-8 w-[140px]">
                  <SelectValue placeholder="촬영유형 전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">촬영유형 전체</SelectItem>
                  {Object.entries(SHOOTING_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={(v) => { setSortBy(v); setPage(1); }}
              >
                <SelectTrigger className="text-[12px] h-8 w-[140px]">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="deadline">마감임박순</SelectItem>
                  <SelectItem value="budget_high">보수 높은순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ==================== 내 구인 목록 (리스트 형태) ==================== */}
        {canManageRecruitment && (
          <TabsContent value="my">
            {/* 진행별 대시보드 */}
            <div className="mt-3">
              <StatusDashboard
                counts={statusCounts}
                total={allMyRecruitments.length}
                activeStatus={statusFilter}
                onSelect={(s) => {
                  setStatusFilter(s as RecruitmentStatus | 'all');
                  setPage(1);
                }}
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : recruitments.length > 0 ? (
              <Card className="mt-3 overflow-hidden">
                {/* 리스트 헤더 */}
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b text-[12px] text-gray-500 font-medium">
                  <div className="w-[90px]">상태</div>
                  <div className="w-[50px]">긴급</div>
                  <div className="w-[20px]"></div>
                  <div className="flex-1">제목</div>
                  <div className="w-[120px] hidden sm:block">촬영일</div>
                  <div className="w-[140px] hidden md:block">장소</div>
                  <div className="w-[90px] hidden lg:block">보수</div>
                  <div className="w-[60px]">응찰</div>
                  <div className="w-[70px] hidden sm:block">등록일</div>
                  <div className="w-[14px]"></div>
                </div>
                {/* 리스트 아이템 */}
                {recruitments.map((r) => (
                  <MyRecruitmentRow key={r.id} recruitment={r} />
                ))}
              </Card>
            ) : (
              <Card className="mt-3">
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-[16px] font-medium text-gray-900 mb-2">등록된 구인이 없습니다</h3>
                  <p className="text-[13px] text-gray-500 mb-6">촬영 작가를 구인해보세요</p>
                  <Button onClick={() => router.push('/mypage/recruitment/new')}>
                    <Plus className="h-4 w-4 mr-1" />
                    구인 등록
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* ==================== 공개 구인방 목록 (리스트 형태) ==================== */}
        <TabsContent value="public">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : recruitments.length > 0 ? (
            <Card className="mt-3 overflow-hidden">
              {/* 리스트 헤더 */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b text-[12px] text-gray-500 font-medium">
                <div className="w-[80px]">상태</div>
                <div className="w-[60px]">긴급/D-day</div>
                <div className="flex-1">제목</div>
                <div className="w-[130px] hidden sm:block">촬영일</div>
                <div className="w-[140px] hidden md:block">장소</div>
                <div className="w-[90px] hidden lg:block">보수</div>
                <div className="w-[50px]">응찰</div>
                <div className="w-[14px]"></div>
              </div>
              {recruitments.map((r) => (
                <PublicRecruitmentRow key={r.id} recruitment={r} />
              ))}
            </Card>
          ) : (
            <Card className="mt-3">
              <CardContent className="py-12 text-center">
                <Search className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-[16px] font-medium text-gray-900 mb-2">공개 구인이 없습니다</h3>
                <p className="text-[13px] text-gray-500">현재 공개 모집 중인 구인이 없습니다</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 페이지네이션 */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={page === p ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0 text-xs"
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
            disabled={page === meta.totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
