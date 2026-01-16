"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Trash2, Calculator, Settings2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  PriceRoundingTier,
  ProductPriceType,
  DEFAULT_ROUNDING_TIERS,
  ROUNDING_PRICE_OPTIONS,
  ROUNDING_UNIT_OPTIONS,
  roundPriceByTier,
  getTierDescription,
} from "@/lib/utils/price-rounding";

// 상품 타입 라벨
const PRODUCT_TYPE_LABELS: Record<ProductPriceType, string> = {
  indigo: "인디고",
  inkjet: "잉크젯",
  album: "앨범",
  frame: "액자",
};

export default function PriceRoundingPage() {
  // 각 상품 타입별 구간 설정
  const [tierSettings, setTierSettings] = useState<Record<ProductPriceType, PriceRoundingTier[]>>({
    ...DEFAULT_ROUNDING_TIERS,
  });

  // 현재 편집 중인 타입
  const [activeType, setActiveType] = useState<ProductPriceType>("indigo");

  // 테스트용 가격
  const [testPrice, setTestPrice] = useState<string>("1234");

  // 구간 추가
  const handleAddTier = () => {
    const currentTiers = tierSettings[activeType];
    // 마지막 구간(Infinity) 앞에 추가
    const lastTier = currentTiers[currentTiers.length - 1];
    const secondLastTier = currentTiers[currentTiers.length - 2];

    const newMaxPrice = secondLastTier
      ? Math.round((secondLastTier.maxPrice + (lastTier.maxPrice === Infinity ? 100000 : lastTier.maxPrice)) / 2)
      : 10000;

    const newTiers = [
      ...currentTiers.slice(0, -1),
      { maxPrice: newMaxPrice, unit: 100 },
      lastTier,
    ];

    setTierSettings((prev) => ({
      ...prev,
      [activeType]: newTiers,
    }));
  };

  // 구간 삭제
  const handleRemoveTier = (index: number) => {
    const currentTiers = tierSettings[activeType];
    if (currentTiers.length <= 2) {
      toast({
        variant: "destructive",
        title: "삭제 불가",
        description: "최소 2개의 구간이 필요합니다.",
      });
      return;
    }

    // 마지막 구간(Infinity)은 삭제 불가
    if (index === currentTiers.length - 1) {
      toast({
        variant: "destructive",
        title: "삭제 불가",
        description: "기본 구간은 삭제할 수 없습니다.",
      });
      return;
    }

    setTierSettings((prev) => ({
      ...prev,
      [activeType]: currentTiers.filter((_, i) => i !== index),
    }));
  };

  // 구간 수정
  const handleUpdateTier = (index: number, field: "maxPrice" | "unit", value: number) => {
    setTierSettings((prev) => ({
      ...prev,
      [activeType]: prev[activeType].map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier
      ),
    }));
  };

  // 기본값으로 초기화
  const handleReset = () => {
    setTierSettings((prev) => ({
      ...prev,
      [activeType]: [...DEFAULT_ROUNDING_TIERS[activeType]],
    }));
    toast({
      title: "초기화 완료",
      description: `${PRODUCT_TYPE_LABELS[activeType]} 설정이 기본값으로 복원되었습니다.`,
    });
  };

  // 저장 (실제로는 API 호출)
  const handleSave = () => {
    // TODO: API 연동
    toast({
      title: "저장 완료",
      description: "단가조정 설정이 저장되었습니다.",
    });
  };

  // 테스트 결과 계산
  const testResult = testPrice ? roundPriceByTier(Number(testPrice), tierSettings[activeType]) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="단가조정 설정"
        description="자동 계산된 단가를 보기 좋게 반올림하는 규칙을 설정합니다."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 설정 영역 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 상품 타입 선택 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                상품 유형 선택
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PRODUCT_TYPE_LABELS) as ProductPriceType[]).map((type) => (
                  <Button
                    key={type}
                    variant={activeType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveType(type)}
                  >
                    {PRODUCT_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 구간 설정 테이블 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {PRODUCT_TYPE_LABELS[activeType]} 단가조정 구간
                  </CardTitle>
                  <CardDescription className="mt-1">
                    가격 구간별로 반올림 단위를 설정합니다.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    초기화
                  </Button>
                  <Button size="sm" onClick={handleAddTier}>
                    <Plus className="h-4 w-4 mr-1" />
                    구간 추가
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>기준 금액 (미만)</TableHead>
                    <TableHead>반올림 단위</TableHead>
                    <TableHead className="w-20 text-center">삭제</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tierSettings[activeType].map((tier, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        {tier.maxPrice === Infinity ? (
                          <Badge variant="secondary">그 이상 모두</Badge>
                        ) : (
                          <Select
                            value={String(tier.maxPrice)}
                            onValueChange={(v) => handleUpdateTier(index, "maxPrice", Number(v))}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROUNDING_PRICE_OPTIONS.map((price) => (
                                <SelectItem key={price} value={String(price)}>
                                  {price.toLocaleString()}원
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={String(tier.unit)}
                          onValueChange={(v) => handleUpdateTier(index, "unit", Number(v))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROUNDING_UNIT_OPTIONS.map((unit) => (
                              <SelectItem key={unit} value={String(unit)}>
                                {unit.toLocaleString()}원 단위
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        {tier.maxPrice !== Infinity && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveTier(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>현재 설정:</strong> {getTierDescription(tierSettings[activeType])}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 저장 버튼 */}
          <div className="flex justify-end">
            <Button onClick={handleSave}>
              설정 저장
            </Button>
          </div>
        </div>

        {/* 오른쪽: 테스트 영역 */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                단가조정 테스트
              </CardTitle>
              <CardDescription>
                설정한 규칙으로 가격이 어떻게 조정되는지 확인합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>원본 가격</Label>
                <Input
                  type="number"
                  value={testPrice}
                  onChange={(e) => setTestPrice(e.target.value)}
                  placeholder="가격 입력"
                />
              </div>

              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">조정 결과</p>
                <p className="text-2xl font-bold text-primary">
                  {testResult.toLocaleString()}원
                </p>
                {testPrice && Number(testPrice) !== testResult && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {Number(testPrice).toLocaleString()}원 → {testResult.toLocaleString()}원
                    <span className="ml-1">
                      ({Number(testPrice) > testResult ? "-" : "+"}
                      {Math.abs(Number(testPrice) - testResult).toLocaleString()}원)
                    </span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 모든 타입 미리보기 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">전체 설정 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(Object.keys(PRODUCT_TYPE_LABELS) as ProductPriceType[]).map((type) => (
                <div
                  key={type}
                  className={`p-3 rounded-lg border ${
                    type === activeType ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <p className="font-medium text-sm mb-1">{PRODUCT_TYPE_LABELS[type]}</p>
                  <p className="text-xs text-muted-foreground">
                    {getTierDescription(tierSettings[type])}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
