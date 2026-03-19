'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, Ruler, Grid3x3, Calculator } from 'lucide-react';
import {
  useAlbumOrderStore,
  PRINT_METHOD_LABELS,
  COLOR_MODE_LABELS,
  PAGE_LAYOUT_LABELS,
} from '@/stores/album-order-store';
import {
  useIndigoSpecifications,
  useInkjetSpecifications,
  type Specification,
} from '@/hooks/use-specifications';
import { calculateAspectRatio, isRatioMatch } from '@/lib/album-utils';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function StepSpecification() {
  const {
    folders,
    printMethod,
    selectedSpecificationId,
    setSpecification,
  } = useAlbumOrderStore();

  // 출력기종에 따른 규격 조회
  const { data: indigoSpecs, isLoading: indigoLoading } = useIndigoSpecifications();
  const { data: inkjetSpecs, isLoading: inkjetLoading } = useInkjetSpecifications();

  const isLoading = printMethod === 'indigo' ? indigoLoading : inkjetLoading;
  const specifications = printMethod === 'indigo' ? indigoSpecs : inkjetSpecs;

  // 대표 규격 계산
  const representativeSpec = useMemo(() => {
    const allSpecs = folders
      .filter((f) => f.representativeSpec)
      .map((f) => f.representativeSpec!);

    if (allSpecs.length === 0) return null;

    // 가장 첫 번째 폴더의 대표 규격 사용
    return allSpecs[0];
  }, [folders]);

  // 비율 계산
  const representativeRatio = useMemo(() => {
    if (!representativeSpec) return null;
    return calculateAspectRatio(representativeSpec.widthInch, representativeSpec.heightInch);
  }, [representativeSpec]);

  // 규격 필터링 및 그룹화
  const { matchingSpecs, otherSpecs } = useMemo(() => {
    if (!specifications || !representativeRatio) {
      return {
        matchingSpecs: specifications || [],
        otherSpecs: [],
      };
    }

    const matching: Specification[] = [];
    const other: Specification[] = [];

    specifications.forEach((spec) => {
      const specRatio = calculateAspectRatio(spec.widthInch, spec.heightInch);
      if (isRatioMatch(representativeRatio, specRatio, 0.05)) {
        matching.push(spec);
      } else {
        other.push(spec);
      }
    });

    // 정렬: 면적 순
    matching.sort((a, b) => (a.widthInch * a.heightInch) - (b.widthInch * b.heightInch));
    other.sort((a, b) => (a.widthInch * a.heightInch) - (b.widthInch * b.heightInch));

    return { matchingSpecs: matching, otherSpecs: other };
  }, [specifications, representativeRatio]);

  // 규격 선택 핸들러
  const handleSelectSpec = (spec: Specification) => {
    setSpecification(spec.id, spec.name);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 현재 설정 정보 */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">출력기종:</span>{' '}
            <span className="font-medium">{PRINT_METHOD_LABELS[printMethod]}</span>
          </div>
          {representativeSpec && (
            <div>
              <span className="text-muted-foreground">업로드 규격:</span>{' '}
              <span className="font-medium">
                {representativeSpec.widthInch}x{representativeSpec.heightInch}"
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 비율 일치 규격 */}
      {matchingSpecs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Check className="w-5 h-5 text-green-500" />
            <h4 className="text-sm font-medium">추천 규격 (비율 일치)</h4>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {matchingSpecs.length}개
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {matchingSpecs.map((spec) => (
              <SpecificationCard
                key={spec.id}
                spec={spec}
                selected={selectedSpecificationId === spec.id}
                isRecommended
                onClick={() => handleSelectSpec(spec)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 기타 규격 */}
      {otherSpecs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Grid3x3 className="w-5 h-5 text-muted-foreground" />
            <h4 className="text-sm font-medium text-muted-foreground">
              기타 규격
            </h4>
            <Badge variant="outline">{otherSpecs.length}개</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {otherSpecs.map((spec) => (
              <SpecificationCard
                key={spec.id}
                spec={spec}
                selected={selectedSpecificationId === spec.id}
                onClick={() => handleSelectSpec(spec)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 규격이 없는 경우 */}
      {!matchingSpecs.length && !otherSpecs.length && (
        <div className="text-center py-12 text-muted-foreground">
          <Ruler className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>사용 가능한 규격이 없습니다.</p>
          <p className="text-sm">관리자에게 문의하세요.</p>
        </div>
      )}

      {/* 선택된 규격 및 견적 요약 */}
      {selectedSpecificationId && (
        <QuotationSummary
          specification={specifications?.find((s) => s.id === selectedSpecificationId)}
        />
      )}
    </div>
  );
}

// 견적 요약 컴포넌트 (DB 기반 가격 조회)
function QuotationSummary({ specification }: { specification?: Specification }) {
  const { folders, productId, colorMode, pageLayout } = useAlbumOrderStore();

  // 대표 폴더의 페이지 수로 DB 가격 조회
  const firstFolder = folders[0];
  const { data: priceData, isLoading } = useQuery({
    queryKey: ['pricing', 'album-order-preview', productId, specification?.id, firstFolder?.pageCount, colorMode, pageLayout],
    queryFn: () =>
      api.post<{
        bindingPrice: number; pricePerPage: number; printPrice: number;
        paperPrice: number; postProcessingPrice: number; unitPrice: number;
      }>('/pricing/calculate/album-order', {
        productId,
        widthInch: specification!.widthInch,
        heightInch: specification!.heightInch,
        pageCount: firstFolder?.pageCount || 10,
        colorMode,
        pageLayout,
      }),
    enabled: !!specification && !!productId && folders.length > 0,
  });

  if (!specification || folders.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 space-y-4">
      {/* 선택된 규격 */}
      <div className="flex items-center gap-2">
        <Check className="w-5 h-5 text-primary" />
        <span className="font-medium">선택된 규격:</span>
        <span className="text-primary font-semibold">
          {specification.widthInch}x{specification.heightInch}&quot;
        </span>
      </div>

      {/* 옵션 요약 */}
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="outline">{COLOR_MODE_LABELS[colorMode]}</Badge>
        <Badge variant="outline">{PAGE_LAYOUT_LABELS[pageLayout]}</Badge>
      </div>

      {/* 견적 상세 */}
      <div className="bg-white/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calculator className="w-4 h-4" />
          견적 요약
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">가격 조회 중...</div>
        ) : priceData ? (
          <>
            {/* 단가 산출근거 */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">출력비</span>
                <span className="font-medium">{priceData.printPrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">제본비</span>
                <span className="font-medium">{priceData.bindingPrice.toLocaleString()}원</span>
              </div>
              {priceData.postProcessingPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">후가공비</span>
                  <span className="font-medium">{priceData.postProcessingPrice.toLocaleString()}원</span>
                </div>
              )}
            </div>

            {/* 폴더별 합계 */}
            <div className="border-t pt-2 mt-2 space-y-1 text-sm">
              {folders.map((folder, idx) => {
                const folderTotal = priceData.unitPrice * folder.quantity;
                return (
                  <div key={idx} className="flex justify-between">
                    <span className="text-muted-foreground">
                      폴더 {idx + 1}: {folder.pageCount}p × {folder.quantity}부
                    </span>
                    <span className="font-medium">{folderTotal.toLocaleString()}원</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold mt-2 text-primary">
                <span>총 예상 금액 (VAT포함)</span>
                <span>
                  {folders.reduce((sum, f) => sum + priceData.unitPrice * f.quantity, 0).toLocaleString()}원
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm text-red-500">가격 미등록 - 관리자 문의</div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        * 위 금액은 예상 견적이며, 실제 금액은 옵션에 따라 달라질 수 있습니다.
      </p>
    </div>
  );
}

// 규격 카드 컴포넌트
function SpecificationCard({
  spec,
  selected,
  isRecommended,
  onClick,
}: {
  spec: Specification;
  selected: boolean;
  isRecommended?: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50',
        selected && 'border-primary ring-2 ring-primary/20',
        isRecommended && !selected && 'border-green-300 bg-green-50/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 text-center">
        {/* 선택 체크 */}
        {selected && (
          <div className="absolute top-2 right-2">
            <Check className="w-5 h-5 text-primary" />
          </div>
        )}

        {/* 규격 이름 */}
        <h5 className="font-medium text-lg">
          {spec.widthInch}x{spec.heightInch}"
        </h5>

        {/* mm 표시 */}
        <p className="text-xs text-muted-foreground mt-1">
          {spec.widthMm}x{spec.heightMm}mm
        </p>

        {/* 용도 태그 */}
        <div className="flex flex-wrap justify-center gap-1 mt-2">
          {spec.forAlbum && (
            <Badge variant="secondary" className="text-[10px] px-1">
              앨범
            </Badge>
          )}
          {spec.forFrame && (
            <Badge variant="secondary" className="text-[10px] px-1">
              액자
            </Badge>
          )}
          {spec.nup && (
            <Badge variant="outline" className="text-[10px] px-1">
              {spec.nup}
            </Badge>
          )}
        </div>

        {/* 추천 배지 */}
        {isRecommended && (
          <Badge className="mt-2 bg-green-500">추천</Badge>
        )}
      </CardContent>
    </Card>
  );
}
