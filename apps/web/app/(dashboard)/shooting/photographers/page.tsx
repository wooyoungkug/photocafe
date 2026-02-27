'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Camera,
  Search,
  RefreshCw,
  User,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Loader2,
  BarChart2,
  Clock,
  Star as StarIcon,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import {
  PhotographerGradeBadge,
  GRADE_LABELS,
  type PhotographerGrade,
} from '@/components/shooting/photographer-grade-badge';
import { StarRating } from '@/components/shooting/star-rating';

// ==================== 타입 ====================

interface Photographer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  grade: PhotographerGrade;
  reliabilityScore: number;
  averageRating: number;
  onTimeRate: number;
  totalShootings: number;
  completedShootings: number;
  cancelledShootings: number;
  createdAt: string;
}

type SortField = 'reliabilityScore' | 'averageRating' | 'totalShootings' | 'onTimeRate';
type SortDirection = 'asc' | 'desc';

const ALL_GRADES: PhotographerGrade[] = ['NEW', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

// ==================== 페이지 ====================

export default function PhotographersPage() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();

  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('reliabilityScore');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedPhotographer, setSelectedPhotographer] = useState<Photographer | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // TODO: usePhotographers() 훅 연결
  // 임시 빈 배열 사용
  const photographers: Photographer[] = [];
  const isLoading = false;

  // 필터링 + 정렬
  const filteredPhotographers = useMemo(() => {
    let result = [...photographers];

    // 검색 필터
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.phone?.includes(q)
      );
    }

    // 등급 필터
    if (gradeFilter !== 'all') {
      result = result.filter((p) => p.grade === gradeFilter);
    }

    // 정렬
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [photographers, search, gradeFilter, sortField, sortDir]);

  // 정렬 토글
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
      } else {
        setSortField(field);
        setSortDir('desc');
      }
    },
    [sortField]
  );

  // 신뢰도 재계산
  const handleRecalculate = useCallback(async () => {
    setIsRecalculating(true);
    try {
      // TODO: useRecalculateReliability() 뮤테이션 연결
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: '재계산 완료',
        description: '모든 작가의 신뢰도 지수가 재계산되었습니다.',
      });
    } catch {
      toast({
        title: '재계산 실패',
        description: '신뢰도 재계산 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsRecalculating(false);
    }
  }, [toast]);

  // 상세 다이얼로그
  const handlePhotographerClick = useCallback((photographer: Photographer) => {
    setSelectedPhotographer(photographer);
    setDetailDialogOpen(true);
  }, []);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-gray-300" />;
    return sortDir === 'desc' ? (
      <ChevronDown className="h-3 w-3" />
    ) : (
      <ChevronUp className="h-3 w-3" />
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="h-6 w-6 text-gray-700" />
          <h1 className="text-[24px] text-black font-normal">작가 관리</h1>
        </div>
        <Button
          variant="outline"
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className="text-[14px]"
        >
          {isRecalculating ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          신뢰도 재계산
        </Button>
      </div>

      {/* 필터 바 */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            {/* 검색 */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="작가 이름, 이메일, 연락처 검색"
                className="pl-9 text-[14px] h-9"
              />
            </div>

            {/* 등급 필터 */}
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[140px] text-[14px] h-9">
                <SelectValue placeholder="등급 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 등급</SelectItem>
                {ALL_GRADES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {GRADE_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredPhotographers.length === 0 ? (
            <div className="text-center py-16">
              <User className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-[14px] text-gray-400">등록된 작가가 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left py-3 px-4 text-[12px] text-gray-500 font-medium">
                      작가
                    </th>
                    <th className="text-center py-3 px-3 text-[12px] text-gray-500 font-medium">
                      등급
                    </th>
                    <th
                      className="text-center py-3 px-3 text-[12px] text-gray-500 font-medium cursor-pointer select-none"
                      onClick={() => handleSort('reliabilityScore')}
                    >
                      <span className="inline-flex items-center gap-1">
                        신뢰도 <SortIcon field="reliabilityScore" />
                      </span>
                    </th>
                    <th
                      className="text-center py-3 px-3 text-[12px] text-gray-500 font-medium cursor-pointer select-none"
                      onClick={() => handleSort('averageRating')}
                    >
                      <span className="inline-flex items-center gap-1">
                        평균 별점 <SortIcon field="averageRating" />
                      </span>
                    </th>
                    <th
                      className="text-center py-3 px-3 text-[12px] text-gray-500 font-medium cursor-pointer select-none"
                      onClick={() => handleSort('onTimeRate')}
                    >
                      <span className="inline-flex items-center gap-1">
                        정시율 <SortIcon field="onTimeRate" />
                      </span>
                    </th>
                    <th
                      className="text-center py-3 px-3 text-[12px] text-gray-500 font-medium cursor-pointer select-none"
                      onClick={() => handleSort('totalShootings')}
                    >
                      <span className="inline-flex items-center gap-1">
                        촬영 수 <SortIcon field="totalShootings" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPhotographers.map((photographer) => (
                    <tr
                      key={photographer.id}
                      onClick={() => handlePhotographerClick(photographer)}
                      className="border-b cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      {/* 작가 정보 */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {photographer.profileImage ? (
                              <img
                                src={photographer.profileImage}
                                alt={photographer.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-[14px] text-black font-normal">
                              {photographer.name}
                            </p>
                            {photographer.email && (
                              <p className="text-[12px] text-gray-500">
                                {photographer.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 등급 */}
                      <td className="py-3 px-3 text-center">
                        <PhotographerGradeBadge grade={photographer.grade} />
                      </td>

                      {/* 신뢰도 */}
                      <td className="py-3 px-3 text-center">
                        <span className="text-[14px] text-black font-bold">
                          {photographer.reliabilityScore.toFixed(1)}
                        </span>
                      </td>

                      {/* 별점 */}
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <StarRating
                            value={Math.round(photographer.averageRating)}
                            size="sm"
                            readOnly
                          />
                          <span className="text-[12px] text-gray-500">
                            ({photographer.averageRating.toFixed(1)})
                          </span>
                        </div>
                      </td>

                      {/* 정시율 */}
                      <td className="py-3 px-3 text-center">
                        <span className="text-[14px] text-black font-normal">
                          {photographer.onTimeRate}%
                        </span>
                      </td>

                      {/* 촬영 수 */}
                      <td className="py-3 px-3 text-center">
                        <span className="text-[14px] text-black font-normal">
                          {photographer.totalShootings}건
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세 통계 다이얼로그 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-black font-bold">작가 상세 통계</DialogTitle>
          </DialogHeader>

          {selectedPhotographer && (
            <div className="space-y-5">
              {/* 프로필 */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {selectedPhotographer.profileImage ? (
                    <img
                      src={selectedPhotographer.profileImage}
                      alt={selectedPhotographer.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[18px] text-black font-bold">
                      {selectedPhotographer.name}
                    </span>
                    <PhotographerGradeBadge grade={selectedPhotographer.grade} />
                  </div>
                  {selectedPhotographer.email && (
                    <p className="text-[14px] text-gray-500">{selectedPhotographer.email}</p>
                  )}
                  {selectedPhotographer.phone && (
                    <p className="text-[14px] text-gray-500">{selectedPhotographer.phone}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* 통계 카드 */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={Shield}
                  label="신뢰도 지수"
                  value={selectedPhotographer.reliabilityScore.toFixed(1)}
                  color="text-blue-600"
                />
                <StatCard
                  icon={StarIcon}
                  label="평균 별점"
                  value={selectedPhotographer.averageRating.toFixed(1)}
                  color="text-yellow-500"
                />
                <StatCard
                  icon={Clock}
                  label="정시 도착률"
                  value={`${selectedPhotographer.onTimeRate}%`}
                  color="text-emerald-600"
                />
                <StatCard
                  icon={Camera}
                  label="총 촬영 수"
                  value={`${selectedPhotographer.totalShootings}건`}
                  color="text-violet-600"
                />
              </div>

              {/* 상세 정보 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-gray-500">완료 촬영</span>
                  <span className="text-black font-normal">
                    {selectedPhotographer.completedShootings}건
                  </span>
                </div>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-gray-500">취소 촬영</span>
                  <span className="text-black font-normal">
                    {selectedPhotographer.cancelledShootings}건
                  </span>
                </div>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-gray-500">별점 분포</span>
                  <StarRating
                    value={Math.round(selectedPhotographer.averageRating)}
                    size="sm"
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 통계 카드 서브컴포넌트 ====================

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-[12px] text-gray-500">{label}</span>
      </div>
      <p className="text-[18px] text-black font-bold">{value}</p>
    </div>
  );
}
