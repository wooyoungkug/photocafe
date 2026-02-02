'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Plus, Trash2, Calculator, RotateCcw, Bike, Truck, Package, Box, MapPin, Navigation, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  useDeliveryPricings,
  useUpdateDeliveryPricing,
  useInitializeDeliveryPricing,
  useCalculateDeliveryFee,
  useCalculateDeliveryFeeByAddress,
  DeliveryMethod,
  DistanceRange,
  SizeRange,
  DELIVERY_METHOD_LABELS,
} from '@/hooks/use-delivery-pricing';

// 아이콘 매핑
const METHOD_ICONS: Record<DeliveryMethod, React.ReactNode> = {
  parcel: <Package className="h-4 w-4" />,
  motorcycle: <Bike className="h-4 w-4" />,
  damas: <Truck className="h-4 w-4" />,
  freight: <Box className="h-4 w-4" />,
  pickup: <MapPin className="h-4 w-4" />,
};

export default function DeliverySettingsPage() {
  const { data: pricings, isLoading } = useDeliveryPricings();
  const updatePricing = useUpdateDeliveryPricing();
  const initializePricing = useInitializeDeliveryPricing();
  const calculateFee = useCalculateDeliveryFee();
  const calculateFeeByAddress = useCalculateDeliveryFeeByAddress();

  const [activeTab, setActiveTab] = useState<DeliveryMethod>('motorcycle');
  const [formData, setFormData] = useState<Record<DeliveryMethod, any>>({
    parcel: { baseFee: 3500, islandFee: 3000, freeThreshold: 50000, isActive: true },
    motorcycle: {
      baseFee: 0,
      distanceRanges: [
        { minDistance: 0, maxDistance: 5, price: 8000 },
        { minDistance: 5, maxDistance: 10, price: 12000 },
        { minDistance: 10, maxDistance: 15, price: 16000 },
        { minDistance: 15, maxDistance: 20, price: 20000 },
      ],
      extraPricePerKm: 1000,
      maxBaseDistance: 20,
      nightSurchargeRate: 0.3,
      nightStartHour: 22,
      nightEndHour: 6,
      weekendSurchargeRate: 0.2,
      isActive: true,
    },
    damas: {
      baseFee: 0,
      distanceRanges: [
        { minDistance: 0, maxDistance: 5, price: 15000 },
        { minDistance: 5, maxDistance: 10, price: 20000 },
        { minDistance: 10, maxDistance: 15, price: 25000 },
        { minDistance: 15, maxDistance: 20, price: 30000 },
      ],
      extraPricePerKm: 1500,
      maxBaseDistance: 20,
      nightSurchargeRate: 0.3,
      weekendSurchargeRate: 0.2,
      isActive: true,
    },
    freight: {
      baseFee: 30000,
      sizeRanges: [
        { name: '소형', maxWeight: 30, maxVolume: 0.1, price: 0 },
        { name: '중형', maxWeight: 100, maxVolume: 0.5, price: 20000 },
        { name: '대형', maxWeight: 300, maxVolume: 1.0, price: 50000 },
        { name: '특대형', maxWeight: null, maxVolume: null, price: 100000 },
      ],
      nightSurchargeRate: 0.2,
      weekendSurchargeRate: 0.1,
      isActive: true,
    },
    pickup: {
      baseFee: 0,
      isActive: true,
    },
  });

  // 계산기 상태
  const [calcParams, setCalcParams] = useState({
    distance: 10,
    isNight: false,
    isWeekend: false,
  });
  const [calcResult, setCalcResult] = useState<any>(null);

  // 주소 기반 계산기 상태
  const [addressCalc, setAddressCalc] = useState({
    startAddress: '경기도 고양시 덕양구 통일로 140',  // 포토미 공장 기본 주소
    goalAddress: '',
    deliveryMethod: 'motorcycle' as 'motorcycle' | 'damas' | 'freight',
    isNight: false,
    isWeekend: false,
  });
  const [addressCalcResult, setAddressCalcResult] = useState<any>(null);

  // distanceRanges 유효성 검증 함수
  const isValidDistanceRanges = (ranges: any): ranges is DistanceRange[] => {
    if (!Array.isArray(ranges) || ranges.length === 0) return false;
    return ranges.every(
      (r) => r && typeof r === 'object' && 'minDistance' in r && 'maxDistance' in r && 'price' in r
    );
  };

  // sizeRanges 유효성 검증 함수
  const isValidSizeRanges = (ranges: any): ranges is SizeRange[] => {
    if (!Array.isArray(ranges) || ranges.length === 0) return false;
    return ranges.every((r) => r && typeof r === 'object' && 'name' in r && 'price' in r);
  };

  // 서버 데이터 로드
  useEffect(() => {
    if (pricings) {
      setFormData((prev) => {
        const newFormData = { ...prev };
        pricings.forEach((p) => {
          const method = p.deliveryMethod as DeliveryMethod;

          // distanceRanges 검증 - 유효하지 않으면 기본값 유지
          const distanceRanges = isValidDistanceRanges(p.distanceRanges)
            ? p.distanceRanges
            : prev[method].distanceRanges;

          // sizeRanges 검증 - 유효하지 않으면 기본값 유지
          const sizeRanges = isValidSizeRanges(p.sizeRanges)
            ? p.sizeRanges
            : prev[method].sizeRanges;

          newFormData[method] = {
            ...prev[method],
            ...p,
            distanceRanges,
            sizeRanges,
            baseFee: Number(p.baseFee) || 0,
            islandFee: p.islandFee ? Number(p.islandFee) : undefined,
            freeThreshold: p.freeThreshold ? Number(p.freeThreshold) : undefined,
            extraPricePerKm: p.extraPricePerKm ? Number(p.extraPricePerKm) : undefined,
            nightSurchargeRate: p.nightSurchargeRate ? Number(p.nightSurchargeRate) : undefined,
            weekendSurchargeRate: p.weekendSurchargeRate ? Number(p.weekendSurchargeRate) : undefined,
          };
        });
        return newFormData;
      });
    }
  }, [pricings]);

  const handleSave = async (method: DeliveryMethod) => {
    try {
      await updatePricing.mutateAsync({
        method,
        dto: formData[method],
      });
      toast({ title: '저장되었습니다' });
    } catch (error) {
      toast({ title: '저장 실패', variant: 'destructive' });
    }
  };

  const handleInitialize = async () => {
    try {
      await initializePricing.mutateAsync();
      toast({ title: '기본값으로 초기화되었습니다' });
    } catch (error) {
      toast({ title: '초기화 실패', variant: 'destructive' });
    }
  };

  const handleCalculate = async () => {
    try {
      const result = await calculateFee.mutateAsync({
        deliveryMethod: activeTab,
        distance: calcParams.distance,
        isNight: calcParams.isNight,
        isWeekend: calcParams.isWeekend,
      });
      setCalcResult(result);
    } catch (error) {
      toast({ title: '계산 실패', variant: 'destructive' });
    }
  };

  // 주소 기반 배송비 계산
  const handleCalculateByAddress = async () => {
    if (!addressCalc.goalAddress.trim()) {
      toast({ title: '도착지 주소를 입력해주세요', variant: 'destructive' });
      return;
    }
    try {
      const result = await calculateFeeByAddress.mutateAsync({
        startAddress: addressCalc.startAddress,
        goalAddress: addressCalc.goalAddress,
        deliveryMethod: addressCalc.deliveryMethod,
        isNight: addressCalc.isNight,
        isWeekend: addressCalc.isWeekend,
      });
      if (result.success) {
        setAddressCalcResult(result.data);
      } else {
        toast({ title: result.message || '계산 실패', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: error.message || '계산 실패', variant: 'destructive' });
    }
  };

  // 거리 구간 추가
  const addDistanceRange = (method: DeliveryMethod) => {
    setFormData(prev => {
      const ranges = prev[method].distanceRanges || [];
      const lastMax = ranges.length > 0 ? ranges[ranges.length - 1].maxDistance : 0;
      return {
        ...prev,
        [method]: {
          ...prev[method],
          distanceRanges: [
            ...ranges,
            { minDistance: lastMax, maxDistance: lastMax + 5, price: 0 },
          ],
        },
      };
    });
  };

  // 거리 구간 삭제
  const removeDistanceRange = (method: DeliveryMethod, index: number) => {
    setFormData(prev => {
      const ranges = [...(prev[method].distanceRanges || [])];
      ranges.splice(index, 1);
      return {
        ...prev,
        [method]: {
          ...prev[method],
          distanceRanges: ranges,
        },
      };
    });
  };

  // 거리 구간 수정
  const updateDistanceRange = (
    method: DeliveryMethod,
    index: number,
    field: keyof DistanceRange,
    value: number
  ) => {
    setFormData(prev => {
      const ranges = [...(prev[method].distanceRanges || [])];
      ranges[index] = { ...ranges[index], [field]: value };
      return {
        ...prev,
        [method]: {
          ...prev[method],
          distanceRanges: ranges,
        },
      };
    });
  };

  if (isLoading) {
    return <div className="p-8">로딩 중...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">배송비 설정</h1>
          <p className="text-muted-foreground">배송방법별 요금을 설정합니다</p>
        </div>
        <Button variant="outline" onClick={handleInitialize}>
          <RotateCcw className="h-4 w-4 mr-2" />
          기본값 초기화
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DeliveryMethod)}>
        <TabsList className="grid w-full grid-cols-5">
          {(['motorcycle', 'damas', 'parcel', 'freight', 'pickup'] as DeliveryMethod[]).map((method) => (
            <TabsTrigger key={method} value={method} className="flex items-center gap-2">
              {METHOD_ICONS[method]}
              {DELIVERY_METHOD_LABELS[method]}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 오토바이(퀵) 설정 */}
        <TabsContent value="motorcycle" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 거리별 단가 설정 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bike className="h-5 w-5" />
                  오토바이(퀵) 거리별 단가
                </CardTitle>
                <CardDescription>
                  거리 구간별 배송비를 설정합니다. 야간/주말 할증이 자동 적용됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 거리 구간표 */}
                <div className="border rounded-lg">
                  <div className="grid grid-cols-4 gap-2 p-3 bg-muted/50 text-sm font-medium border-b">
                    <div>시작 (km)</div>
                    <div>종료 (km)</div>
                    <div>단가 (원)</div>
                    <div></div>
                  </div>
                  {(formData.motorcycle.distanceRanges || []).map(
                    (range: DistanceRange, idx: number) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 p-3 border-b last:border-0 items-center">
                        <Input
                          type="number"
                          value={range.minDistance}
                          onChange={(e) =>
                            updateDistanceRange('motorcycle', idx, 'minDistance', Number(e.target.value))
                          }
                          className="h-9"
                        />
                        <Input
                          type="number"
                          value={range.maxDistance}
                          onChange={(e) =>
                            updateDistanceRange('motorcycle', idx, 'maxDistance', Number(e.target.value))
                          }
                          className="h-9"
                        />
                        <Input
                          type="number"
                          value={range.price}
                          onChange={(e) =>
                            updateDistanceRange('motorcycle', idx, 'price', Number(e.target.value))
                          }
                          className="h-9"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDistanceRange('motorcycle', idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  )}
                </div>

                <Button variant="outline" size="sm" onClick={() => addDistanceRange('motorcycle')}>
                  <Plus className="h-4 w-4 mr-1" />
                  구간 추가
                </Button>

                <Separator />

                {/* 초과거리 설정 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>최대거리 (km)</Label>
                    <Input
                      type="number"
                      value={formData.motorcycle.maxBaseDistance || 20}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          motorcycle: {
                            ...prev.motorcycle,
                            maxBaseDistance: Number(e.target.value),
                          },
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      이 거리 초과 시 km당 추가요금 적용
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>km당 추가요금 (원)</Label>
                    <Input
                      type="number"
                      value={formData.motorcycle.extraPricePerKm || 1000}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          motorcycle: {
                            ...prev.motorcycle,
                            extraPricePerKm: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <Separator />

                {/* 할증 설정 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>야간할증 비율</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={(formData.motorcycle.nightSurchargeRate || 0) * 100}
                        onChange={(e) =>
                          setFormData(prev => ({
                            ...prev,
                            motorcycle: {
                              ...prev.motorcycle,
                              nightSurchargeRate: Number(e.target.value) / 100,
                            },
                          }))
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formData.motorcycle.nightStartHour || 22}시 ~ {formData.motorcycle.nightEndHour || 6}시
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>주말/공휴일 할증 비율</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={(formData.motorcycle.weekendSurchargeRate || 0) * 100}
                        onChange={(e) =>
                          setFormData(prev => ({
                            ...prev,
                            motorcycle: {
                              ...prev.motorcycle,
                              weekendSurchargeRate: Number(e.target.value) / 100,
                            },
                          }))
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={() => handleSave('motorcycle')} disabled={updatePricing.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    저장
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 계산기 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  배송비 계산기
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>거리 (km)</Label>
                  <Input
                    type="number"
                    value={calcParams.distance}
                    onChange={(e) => setCalcParams({ ...calcParams, distance: Number(e.target.value) })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>야간 (22시~06시)</Label>
                  <Switch
                    checked={calcParams.isNight}
                    onCheckedChange={(checked) => setCalcParams({ ...calcParams, isNight: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>주말/공휴일</Label>
                  <Switch
                    checked={calcParams.isWeekend}
                    onCheckedChange={(checked) => setCalcParams({ ...calcParams, isWeekend: checked })}
                  />
                </div>

                <Button className="w-full" onClick={handleCalculate}>
                  계산하기
                </Button>

                {calcResult && (
                  <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>거리별 단가</span>
                      <span>{calcResult.distanceFee.toLocaleString()}원</span>
                    </div>
                    {calcResult.surchargeFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>할증요금 ({calcResult.breakdown?.surchargeType})</span>
                        <span>+{calcResult.surchargeFee.toLocaleString()}원</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>총 배송비</span>
                      <span className="text-primary">{calcResult.totalFee.toLocaleString()}원</span>
                    </div>
                    {calcResult.breakdown?.distanceRange && (
                      <Badge variant="outline" className="mt-2">
                        {calcResult.breakdown.distanceRange}
                      </Badge>
                    )}
                  </div>
                )}

                {/* 공식 설명 */}
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium mb-1">계산 공식:</p>
                  <p>총 배송비 = 거리별단가 + 할증요금</p>
                  <p className="mt-1">• 야간(22~06시): +30%</p>
                  <p>• 주말/공휴일: +20%</p>
                  <p>• 20km 초과: +1,000원/km</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 다마스 설정 */}
        <TabsContent value="damas" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  다마스 거리별 단가
                </CardTitle>
                <CardDescription>
                  다마스 배송 거리 구간별 요금을 설정합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 거리 구간표 */}
                <div className="border rounded-lg">
                  <div className="grid grid-cols-4 gap-2 p-3 bg-muted/50 text-sm font-medium border-b">
                    <div>시작 (km)</div>
                    <div>종료 (km)</div>
                    <div>단가 (원)</div>
                    <div></div>
                  </div>
                  {(formData.damas.distanceRanges || []).map((range: DistanceRange, idx: number) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 p-3 border-b last:border-0 items-center">
                      <Input
                        type="number"
                        value={range.minDistance}
                        onChange={(e) =>
                          updateDistanceRange('damas', idx, 'minDistance', Number(e.target.value))
                        }
                        className="h-9"
                      />
                      <Input
                        type="number"
                        value={range.maxDistance}
                        onChange={(e) =>
                          updateDistanceRange('damas', idx, 'maxDistance', Number(e.target.value))
                        }
                        className="h-9"
                      />
                      <Input
                        type="number"
                        value={range.price}
                        onChange={(e) =>
                          updateDistanceRange('damas', idx, 'price', Number(e.target.value))
                        }
                        className="h-9"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDistanceRange('damas', idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button variant="outline" size="sm" onClick={() => addDistanceRange('damas')}>
                  <Plus className="h-4 w-4 mr-1" />
                  구간 추가
                </Button>

                <Separator />

                {/* 초과거리 및 할증 설정 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>최대거리 (km)</Label>
                    <Input
                      type="number"
                      value={formData.damas.maxBaseDistance || 20}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          damas: { ...prev.damas, maxBaseDistance: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>km당 추가요금 (원)</Label>
                    <Input
                      type="number"
                      value={formData.damas.extraPricePerKm || 1500}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          damas: { ...prev.damas, extraPricePerKm: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>야간할증 비율 (%)</Label>
                    <Input
                      type="number"
                      value={(formData.damas.nightSurchargeRate || 0) * 100}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          damas: { ...prev.damas, nightSurchargeRate: Number(e.target.value) / 100 },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>주말할증 비율 (%)</Label>
                    <Input
                      type="number"
                      value={(formData.damas.weekendSurchargeRate || 0) * 100}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          damas: { ...prev.damas, weekendSurchargeRate: Number(e.target.value) / 100 },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={() => handleSave('damas')} disabled={updatePricing.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    저장
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 다마스 요금표 요약 */}
            <Card>
              <CardHeader>
                <CardTitle>요금표 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {(formData.damas.distanceRanges || []).map((range: DistanceRange, idx: number) => (
                    <div key={idx} className="flex justify-between py-1 border-b last:border-0">
                      <span>
                        {range.minDistance}~{range.maxDistance}km
                      </span>
                      <span className="font-medium">{range.price.toLocaleString()}원</span>
                    </div>
                  ))}
                  <div className="pt-2 text-muted-foreground">
                    <p>• {formData.damas.maxBaseDistance || 20}km 초과: +{(formData.damas.extraPricePerKm || 1500).toLocaleString()}원/km</p>
                    <p>• 야간할증: +{((formData.damas.nightSurchargeRate || 0) * 100).toFixed(0)}%</p>
                    <p>• 주말할증: +{((formData.damas.weekendSurchargeRate || 0) * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 택배 설정 */}
        <TabsContent value="parcel" className="space-y-4">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                택배 요금 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>기본 택배비 (원)</Label>
                  <Input
                    type="number"
                    value={formData.parcel.baseFee || 3500}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        parcel: { ...prev.parcel, baseFee: Number(e.target.value) },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>도서산간 추가요금 (원)</Label>
                  <Input
                    type="number"
                    value={formData.parcel.islandFee || 3000}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        parcel: { ...prev.parcel, islandFee: Number(e.target.value) },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>무료배송 기준금액 (원)</Label>
                <Input
                  type="number"
                  value={formData.parcel.freeThreshold || 50000}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      parcel: { ...prev.parcel, freeThreshold: Number(e.target.value) },
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  주문금액이 이 금액 이상이면 무료배송
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => handleSave('parcel')} disabled={updatePricing.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  저장
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 화물 설정 */}
        <TabsContent value="freight" className="space-y-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                화물 요금 설정
              </CardTitle>
              <CardDescription>크기/무게별 요금을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>기본요금 (원)</Label>
                <Input
                  type="number"
                  value={formData.freight.baseFee || 30000}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      freight: { ...prev.freight, baseFee: Number(e.target.value) },
                    }))
                  }
                  className="w-48"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>크기별 추가요금</Label>
                <div className="border rounded-lg">
                  <div className="grid grid-cols-5 gap-2 p-3 bg-muted/50 text-sm font-medium border-b">
                    <div>구간명</div>
                    <div>최대무게 (kg)</div>
                    <div>최대부피 (m³)</div>
                    <div>추가요금 (원)</div>
                    <div></div>
                  </div>
                  {(formData.freight.sizeRanges || []).map((range: SizeRange, idx: number) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 p-3 border-b last:border-0 items-center">
                      <Input
                        value={range.name}
                        onChange={(e) => {
                          const newName = e.target.value;
                          setFormData(prev => {
                            const ranges = [...(prev.freight.sizeRanges || [])];
                            ranges[idx] = { ...ranges[idx], name: newName };
                            return {
                              ...prev,
                              freight: { ...prev.freight, sizeRanges: ranges },
                            };
                          });
                        }}
                        className="h-9"
                      />
                      <Input
                        type="number"
                        value={range.maxWeight ?? ''}
                        placeholder="무제한"
                        onChange={(e) => {
                          const newMaxWeight = e.target.value ? Number(e.target.value) : null;
                          setFormData(prev => {
                            const ranges = [...(prev.freight.sizeRanges || [])];
                            ranges[idx] = {
                              ...ranges[idx],
                              maxWeight: newMaxWeight,
                            };
                            return {
                              ...prev,
                              freight: { ...prev.freight, sizeRanges: ranges },
                            };
                          });
                        }}
                        className="h-9"
                      />
                      <Input
                        type="number"
                        step="0.1"
                        value={range.maxVolume ?? ''}
                        placeholder="무제한"
                        onChange={(e) => {
                          const newMaxVolume = e.target.value ? Number(e.target.value) : null;
                          setFormData(prev => {
                            const ranges = [...(prev.freight.sizeRanges || [])];
                            ranges[idx] = {
                              ...ranges[idx],
                              maxVolume: newMaxVolume,
                            };
                            return {
                              ...prev,
                              freight: { ...prev.freight, sizeRanges: ranges },
                            };
                          });
                        }}
                        className="h-9"
                      />
                      <Input
                        type="number"
                        value={range.price}
                        onChange={(e) => {
                          const newPrice = Number(e.target.value);
                          setFormData(prev => {
                            const ranges = [...(prev.freight.sizeRanges || [])];
                            ranges[idx] = { ...ranges[idx], price: newPrice };
                            return {
                              ...prev,
                              freight: { ...prev.freight, sizeRanges: ranges },
                            };
                          });
                        }}
                        className="h-9"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => {
                            const ranges = [...(prev.freight.sizeRanges || [])];
                            ranges.splice(idx, 1);
                            return {
                              ...prev,
                              freight: { ...prev.freight, sizeRanges: ranges },
                            };
                          });
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>야간할증 비율 (%)</Label>
                  <Input
                    type="number"
                    value={(formData.freight.nightSurchargeRate || 0) * 100}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        freight: { ...prev.freight, nightSurchargeRate: Number(e.target.value) / 100 },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>주말할증 비율 (%)</Label>
                  <Input
                    type="number"
                    value={(formData.freight.weekendSurchargeRate || 0) * 100}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        freight: { ...prev.freight, weekendSurchargeRate: Number(e.target.value) / 100 },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => handleSave('freight')} disabled={updatePricing.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  저장
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 방문수령 설정 */}
        <TabsContent value="pickup" className="space-y-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                방문수령 설정
              </CardTitle>
              <CardDescription>고객이 직접 방문하여 수령하는 경우의 설정입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  방문수령은 고객이 공장/매장으로 직접 방문하여 제품을 수령하는 방식입니다.
                  배송비가 발생하지 않습니다.
                </p>
              </div>

              <div className="space-y-2">
                <Label>기본요금 (원)</Label>
                <Input
                  type="number"
                  value={formData.pickup?.baseFee || 0}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      pickup: { ...prev.pickup, baseFee: Number(e.target.value) },
                    }))
                  }
                  className="w-48"
                />
                <p className="text-xs text-muted-foreground">
                  일반적으로 0원으로 설정합니다
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => handleSave('pickup')} disabled={updatePricing.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  저장
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 주소 기반 배송비 계산기 */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            카카오맵 기반 배송비 계산
          </CardTitle>
          <CardDescription>
            출발지와 도착지 주소를 입력하면 실제 도로 거리를 계산하여 배송비를 산출합니다. (월 30만 건 무료)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 입력 섹션 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  출발지 (공장 주소)
                </Label>
                <Input
                  placeholder="예: 경기도 고양시 덕양구 통일로 140"
                  value={addressCalc.startAddress}
                  onChange={(e) => setAddressCalc({ ...addressCalc, startAddress: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-600" />
                  도착지 (배송지 주소)
                </Label>
                <Input
                  placeholder="예: 서울특별시 강남구 테헤란로 152"
                  value={addressCalc.goalAddress}
                  onChange={(e) => setAddressCalc({ ...addressCalc, goalAddress: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>배송 방법</Label>
                <div className="flex gap-2">
                  {(['motorcycle', 'damas', 'freight'] as const).map((method) => (
                    <Button
                      key={method}
                      type="button"
                      variant={addressCalc.deliveryMethod === method ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAddressCalc({ ...addressCalc, deliveryMethod: method })}
                      className="flex-1"
                    >
                      {METHOD_ICONS[method]}
                      <span className="ml-1">{DELIVERY_METHOD_LABELS[method]}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="addr-night"
                    checked={addressCalc.isNight}
                    onCheckedChange={(checked) => setAddressCalc({ ...addressCalc, isNight: checked })}
                  />
                  <Label htmlFor="addr-night" className="text-sm">야간 (22시~06시)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="addr-weekend"
                    checked={addressCalc.isWeekend}
                    onCheckedChange={(checked) => setAddressCalc({ ...addressCalc, isWeekend: checked })}
                  />
                  <Label htmlFor="addr-weekend" className="text-sm">주말/공휴일</Label>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleCalculateByAddress}
                disabled={calculateFeeByAddress.isPending}
              >
                {calculateFeeByAddress.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    계산 중...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    배송비 계산하기
                  </>
                )}
              </Button>
            </div>

            {/* 결과 섹션 */}
            <div>
              {addressCalcResult ? (
                <div className="space-y-4">
                  {/* 경로 정보 */}
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Navigation className="h-4 w-4" />
                      경로 정보
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">거리</span>
                        <p className="font-bold text-lg text-primary">{addressCalcResult.route.distanceText}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">예상 소요시간</span>
                        <p className="font-bold text-lg">{addressCalcResult.route.durationText}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      <p className="truncate">출발: {addressCalcResult.route.start}</p>
                      <p className="truncate">도착: {addressCalcResult.route.goal}</p>
                    </div>
                  </div>

                  {/* 요금 정보 */}
                  <div className="p-4 bg-primary/10 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">배송 방법</span>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {METHOD_ICONS[addressCalcResult.deliveryMethod as DeliveryMethod]}
                        {addressCalcResult.deliveryMethodLabel}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>거리별 단가</span>
                        <span>{addressCalcResult.fee.distanceFee?.toLocaleString() || 0}원</span>
                      </div>
                      {addressCalcResult.fee.surcharge > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <span>할증요금</span>
                          <span>+{addressCalcResult.fee.surcharge.toLocaleString()}원</span>
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-bold">총 배송비</span>
                      <span className="text-2xl font-bold text-primary">
                        {addressCalcResult.fee.totalFee.toLocaleString()}원
                      </span>
                    </div>
                    {addressCalcResult.fee.breakdown && (
                      <div className="text-xs text-muted-foreground">
                        {addressCalcResult.fee.breakdown}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <Navigation className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>주소를 입력하고 계산하기 버튼을 누르세요</p>
                    <p className="text-xs mt-1">카카오 모빌리티 API로 실제 도로 거리를 계산합니다</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
