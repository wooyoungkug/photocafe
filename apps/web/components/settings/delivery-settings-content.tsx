"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, Bike, Car, Package, Building2, Save, RotateCcw, Plus, Trash2, Calculator, Navigation, MapPin, Loader2 } from "lucide-react";

// 숫자 포맷 헬퍼 함수
const formatNumber = (value: number): string => {
  return value.toLocaleString();
};

const parseNumber = (value: string): number => {
  return Number(value.replace(/,/g, '')) || 0;
};

import {
  useProductionGroups,
  useProductionSettings,
  useCreateProductionSetting,
  useUpdateProductionSetting,
  useDeleteProductionSetting,
  type ProductionSetting,
} from "@/hooks/use-production";
import { toast } from "sonner";
import { useCalculateDeliveryFeeByAddress } from "@/hooks/use-delivery-pricing";

// 배송방법 타입
type DeliveryMethod = 'delivery_parcel' | 'delivery_motorcycle' | 'delivery_damas' | 'delivery_freight' | 'delivery_pickup';

// 할증조건 타입
type SurchargeType = 'night30_weekend20' | 'night20_weekend10' | 'free_condition' | 'none';

// 거리별 구간 단가
interface DistancePriceRange {
  minDistance: number;
  maxDistance: number;
  price: number;
}

// 배송방법 라벨
const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  delivery_parcel: '택배',
  delivery_motorcycle: '오토바이(퀵)',
  delivery_damas: '다마스',
  delivery_freight: '화물배송',
  delivery_pickup: '방문수령',
};

// 배송방법 아이콘
const DELIVERY_METHOD_ICONS: Record<DeliveryMethod, React.ReactNode> = {
  delivery_parcel: <Package className="h-4 w-4" />,
  delivery_motorcycle: <Bike className="h-4 w-4" />,
  delivery_damas: <Car className="h-4 w-4" />,
  delivery_freight: <Truck className="h-4 w-4" />,
  delivery_pickup: <Building2 className="h-4 w-4" />,
};

// 할증조건 라벨
const SURCHARGE_TYPE_LABELS: Record<SurchargeType, string> = {
  night30_weekend20: '야간 30% / 주말 20%',
  night20_weekend10: '야간 20% / 주말 10%',
  free_condition: '무료배송 조건',
  none: '할증 없음',
};

// 배송방법별 기본값
const DEFAULT_SETTINGS: Record<DeliveryMethod, {
  basePrice: number;
  surchargeType: SurchargeType;
  distancePriceRanges: DistancePriceRange[];
  extraPricePerKm: number;
  maxBaseDistance: number;
  freeThreshold: number;
  islandFee: number;
}> = {
  delivery_parcel: {
    basePrice: 5500,
    surchargeType: 'free_condition',
    distancePriceRanges: [],
    extraPricePerKm: 0,
    maxBaseDistance: 0,
    freeThreshold: 50000,
    islandFee: 3000,
  },
  delivery_motorcycle: {
    basePrice: 0,
    surchargeType: 'night30_weekend20',
    distancePriceRanges: [
      { minDistance: 0, maxDistance: 5, price: 8000 },
      { minDistance: 5, maxDistance: 10, price: 12000 },
      { minDistance: 10, maxDistance: 15, price: 16000 },
      { minDistance: 15, maxDistance: 20, price: 20000 },
    ],
    extraPricePerKm: 1000,
    maxBaseDistance: 20,
    freeThreshold: 0,
    islandFee: 0,
  },
  delivery_damas: {
    basePrice: 0,
    surchargeType: 'night30_weekend20',
    distancePriceRanges: [
      { minDistance: 0, maxDistance: 5, price: 15000 },
      { minDistance: 5, maxDistance: 10, price: 20000 },
      { minDistance: 10, maxDistance: 15, price: 25000 },
      { minDistance: 15, maxDistance: 20, price: 30000 },
    ],
    extraPricePerKm: 1500,
    maxBaseDistance: 20,
    freeThreshold: 0,
    islandFee: 0,
  },
  delivery_freight: {
    basePrice: 30000,
    surchargeType: 'night20_weekend10',
    distancePriceRanges: [],
    extraPricePerKm: 0,
    maxBaseDistance: 0,
    freeThreshold: 0,
    islandFee: 0,
  },
  delivery_pickup: {
    basePrice: 0,
    surchargeType: 'none',
    distancePriceRanges: [],
    extraPricePerKm: 0,
    maxBaseDistance: 0,
    freeThreshold: 0,
    islandFee: 0,
  },
};

interface DeliverySettingsContentProps {
  showHeader?: boolean;
  showKakaoCalculator?: boolean;
}

export default function DeliverySettingsContent({
  showHeader = true,
  showKakaoCalculator = true
}: DeliverySettingsContentProps) {
  const [activeTab, setActiveTab] = useState<DeliveryMethod>('delivery_parcel');
  const [deliveryGroupId, setDeliveryGroupId] = useState<string | null>(null);

  // 각 배송방법별 폼 데이터
  const [formData, setFormData] = useState<Record<DeliveryMethod, {
    id?: string;
    settingName: string;
    basePrice: number;
    surchargeType: SurchargeType;
    distancePriceRanges: DistancePriceRange[];
    extraPricePerKm: number;
    maxBaseDistance: number;
    freeThreshold: number;
    islandFee: number;
    workDays: number;
  }>>({
    delivery_parcel: { settingName: '택배', ...DEFAULT_SETTINGS.delivery_parcel, workDays: 2 },
    delivery_motorcycle: { settingName: '오토바이(퀵)', ...DEFAULT_SETTINGS.delivery_motorcycle, workDays: 0 },
    delivery_damas: { settingName: '다마스', ...DEFAULT_SETTINGS.delivery_damas, workDays: 0 },
    delivery_freight: { settingName: '화물배송', ...DEFAULT_SETTINGS.delivery_freight, workDays: 1 },
    delivery_pickup: { settingName: '방문수령', ...DEFAULT_SETTINGS.delivery_pickup, workDays: 0 },
  });

  // 시뮬레이션 상태
  const [simData, setSimData] = useState({
    distance: 10,
    isNight: false,
    isWeekend: false,
    orderAmount: 30000,
    isIsland: false,
  });

  // 카카오맵 주소 기반 배송비 계산 상태
  const [addressCalc, setAddressCalc] = useState({
    startAddress: '경기도 고양시 덕양구 통일로 140',
    goalAddress: '',
    deliveryMethod: 'motorcycle' as 'motorcycle' | 'damas' | 'freight',
    isNight: false,
    isWeekend: false,
  });
  const [addressCalcResult, setAddressCalcResult] = useState<any>(null);

  // API Hooks
  const { data: groups } = useProductionGroups();
  const { data: settings, isLoading } = useProductionSettings({ groupId: deliveryGroupId || undefined });
  const createSetting = useCreateProductionSetting();
  const updateSetting = useUpdateProductionSetting();
  const deleteSetting = useDeleteProductionSetting();
  const calculateFeeByAddress = useCalculateDeliveryFeeByAddress();

  // 배송 그룹 찾기
  useEffect(() => {
    if (groups) {
      const deliveryGroup = groups.find(g => g.name === '배송' || g.name.includes('배송'));
      if (deliveryGroup) {
        setDeliveryGroupId(deliveryGroup.id);
      }
    }
  }, [groups]);

  // 설정 데이터 로드
  useEffect(() => {
    if (settings && settings.length > 0) {
      const newFormData = { ...formData };

      settings.forEach((setting: ProductionSetting) => {
        const method = setting.pricingType as DeliveryMethod;
        if (method in newFormData) {
          newFormData[method] = {
            id: setting.id,
            settingName: setting.settingName || DELIVERY_METHOD_LABELS[method],
            basePrice: Number(setting.basePrice) || 0,
            surchargeType: ((setting as any).surchargeType || 'none') as SurchargeType,
            distancePriceRanges: (setting as any).distancePriceRanges || [],
            extraPricePerKm: Number((setting as any).extraPricePerKm) || 0,
            maxBaseDistance: Number((setting as any).maxBaseDistance) || 0,
            freeThreshold: Number((setting as any).freeThreshold) || 0,
            islandFee: Number((setting as any).islandFee) || 0,
            workDays: Number(setting.workDays) || 0,
          };
        }
      });

      setFormData(newFormData);
    }
  }, [settings]);

  // 현재 탭의 폼 데이터
  const currentForm = formData[activeTab];

  // 폼 데이터 업데이트
  const updateForm = (updates: Partial<typeof currentForm>) => {
    setFormData(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], ...updates }
    }));
  };

  // 거리 구간 추가
  const addDistanceRange = () => {
    const ranges = [...currentForm.distancePriceRanges];
    const lastRange = ranges[ranges.length - 1];
    ranges.push({
      minDistance: lastRange ? lastRange.maxDistance : 0,
      maxDistance: lastRange ? lastRange.maxDistance + 5 : 5,
      price: lastRange ? lastRange.price + 2000 : 5000,
    });
    updateForm({ distancePriceRanges: ranges });
  };

  // 거리 구간 삭제
  const removeDistanceRange = (index: number) => {
    const ranges = currentForm.distancePriceRanges.filter((_, i) => i !== index);
    updateForm({ distancePriceRanges: ranges });
  };

  // 거리 구간 업데이트
  const updateDistanceRange = (index: number, field: keyof DistancePriceRange, value: number) => {
    const ranges = [...currentForm.distancePriceRanges];
    ranges[index] = { ...ranges[index], [field]: value };
    updateForm({ distancePriceRanges: ranges });
  };

  // 저장
  const handleSave = async () => {
    if (!deliveryGroupId) {
      toast.error('배송 그룹을 찾을 수 없습니다. 가격관리에서 "배송" 그룹을 먼저 생성해주세요.');
      return;
    }

    try {
      const data = {
        groupId: deliveryGroupId,
        pricingType: activeTab,
        settingName: currentForm.settingName,
        basePrice: currentForm.basePrice,
        surchargeType: currentForm.surchargeType,
        distancePriceRanges: currentForm.distancePriceRanges,
        extraPricePerKm: currentForm.extraPricePerKm,
        maxBaseDistance: currentForm.maxBaseDistance,
        freeThreshold: currentForm.freeThreshold,
        islandFee: currentForm.islandFee,
        workDays: currentForm.workDays,
        isActive: true,
      };

      if (currentForm.id) {
        await updateSetting.mutateAsync({ id: currentForm.id, ...data });
        toast.success(`${DELIVERY_METHOD_LABELS[activeTab]} 설정이 수정되었습니다.`);
      } else {
        await createSetting.mutateAsync(data);
        toast.success(`${DELIVERY_METHOD_LABELS[activeTab]} 설정이 저장되었습니다.`);
      }
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다.');
      console.error(error);
    }
  };

  // 초기화
  const handleReset = () => {
    updateForm({
      ...DEFAULT_SETTINGS[activeTab],
      settingName: DELIVERY_METHOD_LABELS[activeTab],
      workDays: activeTab === 'delivery_parcel' ? 2 : activeTab === 'delivery_freight' ? 1 : 0,
    });
    toast.success('기본값으로 초기화되었습니다.');
  };

  // 배송비 계산 (시뮬레이션)
  const calculateDeliveryFee = () => {
    let baseFee = 0;
    let distanceFee = 0;
    let surchargeFee = 0;
    let extraFee = 0;
    let isFree = false;
    let breakdown = '';

    if (activeTab === 'delivery_parcel') {
      baseFee = currentForm.basePrice;
      extraFee = simData.isIsland ? currentForm.islandFee : 0;
      isFree = currentForm.freeThreshold > 0 && simData.orderAmount >= currentForm.freeThreshold;
      breakdown = simData.isIsland ? '도서산간' : '일반';
    } else if (activeTab === 'delivery_motorcycle' || activeTab === 'delivery_damas') {
      const distance = simData.distance;
      const ranges = currentForm.distancePriceRanges;

      const range = ranges.find(r => distance >= r.minDistance && distance < r.maxDistance);
      if (range) {
        distanceFee = range.price;
        breakdown = `${range.minDistance}~${range.maxDistance}km`;
      } else if (ranges.length > 0) {
        const lastRange = ranges[ranges.length - 1];
        if (distance >= lastRange.maxDistance) {
          distanceFee = lastRange.price;
          const extraDist = distance - currentForm.maxBaseDistance;
          if (extraDist > 0) {
            distanceFee += extraDist * currentForm.extraPricePerKm;
          }
          breakdown = `${currentForm.maxBaseDistance}km 초과`;
        }
      }

      const subtotal = baseFee + distanceFee;
      if (currentForm.surchargeType === 'night30_weekend20') {
        if (simData.isNight) surchargeFee += subtotal * 0.3;
        if (simData.isWeekend) surchargeFee += subtotal * 0.2;
      } else if (currentForm.surchargeType === 'night20_weekend10') {
        if (simData.isNight) surchargeFee += subtotal * 0.2;
        if (simData.isWeekend) surchargeFee += subtotal * 0.1;
      }
    } else if (activeTab === 'delivery_freight') {
      baseFee = currentForm.basePrice;
      const subtotal = baseFee;
      if (currentForm.surchargeType === 'night20_weekend10') {
        if (simData.isNight) surchargeFee += subtotal * 0.2;
        if (simData.isWeekend) surchargeFee += subtotal * 0.1;
      }
    } else if (activeTab === 'delivery_pickup') {
      isFree = true;
    }

    const totalFee = isFree ? 0 : Math.round(baseFee + distanceFee + surchargeFee + extraFee);

    return { baseFee, distanceFee, surchargeFee, extraFee, totalFee, isFree, breakdown };
  };

  const simResult = calculateDeliveryFee();

  // 카카오맵 주소 기반 배송비 계산
  const handleCalculateByAddress = async () => {
    if (!addressCalc.startAddress || !addressCalc.goalAddress) {
      toast.error('출발지와 도착지 주소를 모두 입력해주세요.');
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

      if (result.success && result.data) {
        setAddressCalcResult(result.data);
        toast.success('배송비 계산 완료');
      } else {
        toast.error(result.message || '계산 실패');
      }
    } catch (error: any) {
      toast.error(error.message || '계산 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            배송비 설정
          </h1>
          <p className="text-muted-foreground">
            배송방법별 요금을 설정합니다.
          </p>
        </div>
      )}

      {!deliveryGroupId && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <p className="text-yellow-800">
              배송 그룹이 없습니다. <strong>가격관리 &gt; 기타 &gt; 배송</strong> 그룹을 먼저 생성해주세요.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DeliveryMethod)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-[700px]">
          {(Object.keys(DELIVERY_METHOD_LABELS) as DeliveryMethod[]).map((method) => (
            <TabsTrigger key={method} value={method} className="flex items-center gap-1 text-xs sm:text-sm">
              {DELIVERY_METHOD_ICONS[method]}
              <span className="hidden sm:inline">{DELIVERY_METHOD_LABELS[method]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(DELIVERY_METHOD_LABELS) as DeliveryMethod[]).map((method) => (
          <TabsContent key={method} value={method} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {DELIVERY_METHOD_ICONS[method]}
                  {DELIVERY_METHOD_LABELS[method]} 설정
                </CardTitle>
                <CardDescription>
                  {method === 'delivery_parcel' && '택배 기본요금, 도서산간, 무료배송 조건을 설정합니다.'}
                  {method === 'delivery_motorcycle' && '오토바이 퀵 서비스의 거리별 요금을 설정합니다.'}
                  {method === 'delivery_damas' && '다마스 배송의 거리별 요금을 설정합니다.'}
                  {method === 'delivery_freight' && '화물 배송의 기본요금을 설정합니다.'}
                  {method === 'delivery_pickup' && '방문수령은 배송비가 없습니다.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 기본 설정 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>설정명</Label>
                    <Input
                      value={formData[method].settingName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        [method]: { ...prev[method], settingName: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>기본요금</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={formatNumber(formData[method].basePrice)}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          [method]: { ...prev[method], basePrice: parseNumber(e.target.value) }
                        }))}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">원</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>작업일수</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={formData[method].workDays}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          [method]: { ...prev[method], workDays: Number(e.target.value) }
                        }))}
                        className="w-20"
                        step="0.5"
                      />
                      <span className="text-muted-foreground">일</span>
                    </div>
                  </div>
                </div>

                {/* 택배 전용 설정 */}
                {method === 'delivery_parcel' && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>도서산간 추가비용</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={formatNumber(formData[method].islandFee)}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              [method]: { ...prev[method], islandFee: parseNumber(e.target.value) }
                            }))}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">원</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>무료배송 기준금액</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={formatNumber(formData[method].freeThreshold)}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              [method]: { ...prev[method], freeThreshold: parseNumber(e.target.value) }
                            }))}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">원 이상</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 오토바이/다마스 전용 - 거리별 단가 */}
                {(method === 'delivery_motorcycle' || method === 'delivery_damas') && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">거리별 단가</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addDistanceRange}>
                          <Plus className="h-4 w-4 mr-1" />
                          구간 추가
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-4 gap-2 text-sm font-medium text-muted-foreground px-2">
                          <span>시작 (km)</span>
                          <span>종료 (km)</span>
                          <span>단가 (원)</span>
                          <span></span>
                        </div>
                        {formData[method].distancePriceRanges.map((range, idx) => (
                          <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                            <Input
                              type="number"
                              value={range.minDistance}
                              onChange={(e) => updateDistanceRange(idx, 'minDistance', Number(e.target.value))}
                            />
                            <Input
                              type="number"
                              value={range.maxDistance}
                              onChange={(e) => updateDistanceRange(idx, 'maxDistance', Number(e.target.value))}
                            />
                            <Input
                              type="text"
                              value={formatNumber(range.price)}
                              onChange={(e) => updateDistanceRange(idx, 'price', parseNumber(e.target.value))}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDistanceRange(idx)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>기본거리 (최대)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={formData[method].maxBaseDistance}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                [method]: { ...prev[method], maxBaseDistance: Number(e.target.value) }
                              }))}
                              className="w-24"
                            />
                            <span className="text-muted-foreground">km</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>km당 추가요금</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={formatNumber(formData[method].extraPricePerKm)}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                [method]: { ...prev[method], extraPricePerKm: parseNumber(e.target.value) }
                              }))}
                              className="w-24"
                            />
                            <span className="text-muted-foreground">원/km</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 할증조건 (방문수령 제외) */}
                {method !== 'delivery_pickup' && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>할증조건</Label>
                      <Select
                        value={formData[method].surchargeType}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          [method]: { ...prev[method], surchargeType: value as SurchargeType }
                        }))}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SURCHARGE_TYPE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* 방문수령 안내 */}
                {method === 'delivery_pickup' && (
                  <div className="text-center text-muted-foreground py-8 bg-muted/30 rounded-lg">
                    방문수령은 배송비가 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 시뮬레이션 */}
            {method !== 'delivery_pickup' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="h-4 w-4" />
                    배송비 시뮬레이션
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* 거리 (오토바이/다마스) */}
                    {(method === 'delivery_motorcycle' || method === 'delivery_damas') && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">거리</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={simData.distance}
                            onChange={(e) => setSimData(prev => ({ ...prev, distance: Number(e.target.value) }))}
                            className="w-20"
                          />
                          <span className="text-xs">km</span>
                        </div>
                      </div>
                    )}

                    {/* 주문금액 (택배) */}
                    {method === 'delivery_parcel' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">주문금액</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="text"
                            value={formatNumber(simData.orderAmount)}
                            onChange={(e) => setSimData(prev => ({ ...prev, orderAmount: parseNumber(e.target.value) }))}
                            className="w-28"
                          />
                          <span className="text-xs">원</span>
                        </div>
                      </div>
                    )}

                    {/* 야간 */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">야간</Label>
                      <div className="flex items-center h-9">
                        <Switch
                          checked={simData.isNight}
                          onCheckedChange={(v) => setSimData(prev => ({ ...prev, isNight: v }))}
                        />
                      </div>
                    </div>

                    {/* 주말 */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">주말</Label>
                      <div className="flex items-center h-9">
                        <Switch
                          checked={simData.isWeekend}
                          onCheckedChange={(v) => setSimData(prev => ({ ...prev, isWeekend: v }))}
                        />
                      </div>
                    </div>

                    {/* 도서산간 (택배) */}
                    {method === 'delivery_parcel' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">도서산간</Label>
                        <div className="flex items-center h-9">
                          <Switch
                            checked={simData.isIsland}
                            onCheckedChange={(v) => setSimData(prev => ({ ...prev, isIsland: v }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 계산 결과 */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      {simResult.baseFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">기본요금</span>
                          <span>{simResult.baseFee.toLocaleString()}원</span>
                        </div>
                      )}
                      {simResult.distanceFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">거리별 요금 ({simResult.breakdown})</span>
                          <span>{simResult.distanceFee.toLocaleString()}원</span>
                        </div>
                      )}
                      {simResult.surchargeFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">할증요금</span>
                          <span>+{Math.round(simResult.surchargeFee).toLocaleString()}원</span>
                        </div>
                      )}
                      {simResult.extraFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">추가요금 ({simResult.breakdown})</span>
                          <span>+{simResult.extraFee.toLocaleString()}원</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-base">
                        <span>총 배송비</span>
                        <span className={simResult.isFree ? "text-green-600" : "text-primary"}>
                          {simResult.isFree ? "무료" : `${simResult.totalFee.toLocaleString()}원`}
                        </span>
                      </div>
                      {simResult.isFree && method === 'delivery_parcel' && (
                        <p className="text-xs text-green-600">
                          {formData[method].freeThreshold.toLocaleString()}원 이상 주문으로 무료배송
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 저장 버튼 */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                초기화
              </Button>
              <Button onClick={handleSave} disabled={createSetting.isPending || updateSetting.isPending || !deliveryGroupId}>
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* 카카오맵 기반 배송비 계산기 */}
      {showKakaoCalculator && (
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
                        {method === 'motorcycle' && <Bike className="h-4 w-4 mr-1" />}
                        {method === 'damas' && <Car className="h-4 w-4 mr-1" />}
                        {method === 'freight' && <Truck className="h-4 w-4 mr-1" />}
                        <span className="hidden sm:inline">
                          {method === 'motorcycle' ? '오토바이(퀵)' : method === 'damas' ? '다마스' : '화물'}
                        </span>
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
                          {addressCalcResult.deliveryMethod === 'motorcycle' && <Bike className="h-3 w-3" />}
                          {addressCalcResult.deliveryMethod === 'damas' && <Car className="h-3 w-3" />}
                          {addressCalcResult.deliveryMethod === 'freight' && <Truck className="h-3 w-3" />}
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
                          {addressCalcResult.fee.breakdown.distanceRange && `구간: ${addressCalcResult.fee.breakdown.distanceRange}`}
                          {addressCalcResult.fee.breakdown.surchargeType && ` | ${addressCalcResult.fee.breakdown.surchargeType}`}
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
      )}
    </div>
  );
}
