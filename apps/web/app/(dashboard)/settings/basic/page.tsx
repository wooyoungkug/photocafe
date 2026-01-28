"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, Printer, Truck, ListChecks, Save, RotateCcw, Plus, Trash2, Package, Bike, Box } from "lucide-react";
import {
  useSystemSettings,
  useBulkUpdateSettings,
  settingsToMap,
  getNumericValue,
  PROCESS_STAGES,
  PROCESS_CATEGORIES,
} from "@/hooks/use-system-settings";
import {
  useDeliveryPricings,
  useUpdateDeliveryPricing,
  useInitializeDeliveryPricing,
  DeliveryMethod,
  DELIVERY_METHOD_LABELS,
  DELIVERY_METHODS,
  DeliveryPricing,
} from "@/hooks/use-delivery-pricing";
import { toast } from "sonner";

export default function BasicSettingsPage() {
  const { data: settings, isLoading } = useSystemSettings();
  const bulkUpdate = useBulkUpdateSettings();
  const { data: deliveryPricings, isLoading: isLoadingDelivery } = useDeliveryPricings();
  const updateDeliveryPricing = useUpdateDeliveryPricing();
  const initializeDeliveryPricing = useInitializeDeliveryPricing();

  // 회사정보 상태
  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    ceo: "",
    businessNumber: "",
    businessType: "",
    businessCategory: "",
    ecommerceNumber: "",
    phone: "",
    fax: "",
    email: "",
    csPhone: "",
    csHours: "",
    postalCode: "",
    address: "",
    addressDetail: "",
    domain: "",
    adminDomain: "",
    serverInfo: "",
  });

  // 인쇄비 상태
  const [printingInfo, setPrintingInfo] = useState({
    indigo1ColorCost: 0,
  });

  // 택배비 상태 (레거시)
  const [shippingInfo, setShippingInfo] = useState({
    standardFee: 3500,
    islandFee: 6000,
    freeThreshold: 50000,
    includeJeju: true,
    includeIslands: true,
    includeMountain: true,
  });

  // 배송비 상태 (새로운 delivery pricing 시스템)
  const [deliveryFormData, setDeliveryFormData] = useState<Record<DeliveryMethod, Partial<DeliveryPricing>>>({
    parcel: {},
    motorcycle: {},
    damas: {},
    freight: {},
  });

  // 방금 저장한 배송 방법을 추적하는 ref (폼 리셋 방지용)
  const justSavedMethodRef = useRef<DeliveryMethod | null>(null);

  // 공정단계 상태
  const [enabledStages, setEnabledStages] = useState<string[]>([
    "reception_waiting",
    "payment_waiting",
    "reception_complete",
    "print_waiting",
    "printing",
    "print_complete",
    "binding_waiting",
    "binding",
    "binding_complete",
    "shipping_waiting",
    "shipping",
    "delivered",
    "transaction_complete",
  ]);

  // 설정 로드
  useEffect(() => {
    if (settings) {
      const map = settingsToMap(settings);

      // 회사정보 로드
      setCompanyInfo({
        name: map.company_name || "",
        ceo: map.company_ceo || "",
        businessNumber: map.company_business_number || "",
        businessType: map.company_business_type || "",
        businessCategory: map.company_business_category || "",
        ecommerceNumber: map.company_ecommerce_number || "",
        phone: map.company_phone || "",
        fax: map.company_fax || "",
        email: map.company_email || "",
        csPhone: map.company_cs_phone || "",
        csHours: map.company_cs_hours || "",
        postalCode: map.company_postal_code || "",
        address: map.company_address || "",
        addressDetail: map.company_address_detail || "",
        domain: map.company_domain || "",
        adminDomain: map.company_admin_domain || "",
        serverInfo: map.company_server_info || "",
      });

      // 인쇄비 로드
      setPrintingInfo({
        indigo1ColorCost: getNumericValue(map, "printing_indigo_1color_cost", 0),
      });

      // 택배비 로드
      setShippingInfo({
        standardFee: getNumericValue(map, "shipping_standard_fee", 3500),
        islandFee: getNumericValue(map, "shipping_island_fee", 6000),
        freeThreshold: getNumericValue(map, "shipping_free_threshold", 50000),
        includeJeju: map.shipping_include_jeju !== "false",
        includeIslands: map.shipping_include_islands !== "false",
        includeMountain: map.shipping_include_mountain !== "false",
      });

      // 공정단계 로드
      if (map.process_enabled_stages) {
        try {
          setEnabledStages(JSON.parse(map.process_enabled_stages));
        } catch {
          // 기본값 유지
        }
      }
    }
  }, [settings]);

  // 배송비 데이터 로드
  useEffect(() => {
    if (deliveryPricings) {
      const formData: Record<DeliveryMethod, Partial<DeliveryPricing>> = {
        parcel: {},
        motorcycle: {},
        damas: {},
        freight: {},
      };

      deliveryPricings.forEach((pricing) => {
        // 방금 저장한 배송 방법이면 현재 폼 데이터 유지 (리셋 방지)
        if (justSavedMethodRef.current === pricing.deliveryMethod) {
          formData[pricing.deliveryMethod] = deliveryFormData[pricing.deliveryMethod];
        } else {
          formData[pricing.deliveryMethod] = {
            ...pricing,
            // 모든 숫자 필드를 명시적으로 Number로 변환
            baseFee: Number(pricing.baseFee) || 0,
            packagingFee: Number(pricing.packagingFee) || 0,
            shippingFee: Number(pricing.shippingFee) || 0,
            islandFee: pricing.islandFee ? Number(pricing.islandFee) : undefined,
            freeThreshold: pricing.freeThreshold ? Number(pricing.freeThreshold) : undefined,
            maxBaseDistance: pricing.maxBaseDistance ? Number(pricing.maxBaseDistance) : undefined,
            extraPricePerKm: pricing.extraPricePerKm ? Number(pricing.extraPricePerKm) : undefined,
            nightSurchargeRate: pricing.nightSurchargeRate ? Number(pricing.nightSurchargeRate) : undefined,
            weekendSurchargeRate: pricing.weekendSurchargeRate ? Number(pricing.weekendSurchargeRate) : undefined,
            // 거리별 구간 데이터도 숫자로 변환
            distanceRanges: pricing.distanceRanges?.map(range => ({
              minDistance: Number(range.minDistance) || 0,
              maxDistance: Number(range.maxDistance) || 0,
              price: Number(range.price) || 0,
            })),
            // 크기별 구간 데이터도 숫자로 변환
            sizeRanges: pricing.sizeRanges?.map(range => ({
              name: range.name,
              maxWeight: range.maxWeight ? Number(range.maxWeight) : undefined,
              maxVolume: range.maxVolume ? Number(range.maxVolume) : undefined,
              price: Number(range.price) || 0,
            })),
          };
        }
      });

      // ref 초기화
      if (justSavedMethodRef.current) {
        justSavedMethodRef.current = null;
      }

      setDeliveryFormData(formData);
    }
  }, [deliveryPricings]);

  // 회사정보 저장
  const saveCompanyInfo = async () => {
    const settingsToSave = [
      { key: "company_name", value: companyInfo.name, category: "company", label: "회사명" },
      { key: "company_ceo", value: companyInfo.ceo, category: "company", label: "대표자" },
      { key: "company_business_number", value: companyInfo.businessNumber, category: "company", label: "사업자번호" },
      { key: "company_business_type", value: companyInfo.businessType, category: "company", label: "업태" },
      { key: "company_business_category", value: companyInfo.businessCategory, category: "company", label: "종목" },
      { key: "company_ecommerce_number", value: companyInfo.ecommerceNumber, category: "company", label: "통신판매번호" },
      { key: "company_phone", value: companyInfo.phone, category: "company", label: "대표전화" },
      { key: "company_fax", value: companyInfo.fax, category: "company", label: "팩스" },
      { key: "company_email", value: companyInfo.email, category: "company", label: "이메일" },
      { key: "company_cs_phone", value: companyInfo.csPhone, category: "company", label: "고객센터" },
      { key: "company_cs_hours", value: companyInfo.csHours, category: "company", label: "운영시간" },
      { key: "company_postal_code", value: companyInfo.postalCode, category: "company", label: "우편번호" },
      { key: "company_address", value: companyInfo.address, category: "company", label: "주소" },
      { key: "company_address_detail", value: companyInfo.addressDetail, category: "company", label: "상세주소" },
      { key: "company_domain", value: companyInfo.domain, category: "company", label: "도메인" },
      { key: "company_admin_domain", value: companyInfo.adminDomain, category: "company", label: "관리자도메인" },
      { key: "company_server_info", value: companyInfo.serverInfo, category: "company", label: "서버정보" },
    ];
    await bulkUpdate.mutateAsync(settingsToSave);
  };

  // 인쇄비 저장
  const savePrintingInfo = async () => {
    const settingsToSave = [
      { key: "printing_indigo_1color_cost", value: String(printingInfo.indigo1ColorCost), category: "printing", label: "인디고 1도 인쇄비" },
    ];
    await bulkUpdate.mutateAsync(settingsToSave);
  };

  // 택배비 저장
  const saveShippingInfo = async () => {
    const settingsToSave = [
      { key: "shipping_standard_fee", value: String(shippingInfo.standardFee), category: "shipping", label: "일반 택배비" },
      { key: "shipping_island_fee", value: String(shippingInfo.islandFee), category: "shipping", label: "도서산간 택배비" },
      { key: "shipping_free_threshold", value: String(shippingInfo.freeThreshold), category: "shipping", label: "무료배송 기준금액" },
      { key: "shipping_include_jeju", value: String(shippingInfo.includeJeju), category: "shipping", label: "제주도 포함" },
      { key: "shipping_include_islands", value: String(shippingInfo.includeIslands), category: "shipping", label: "섬지역 포함" },
      { key: "shipping_include_mountain", value: String(shippingInfo.includeMountain), category: "shipping", label: "산간지역 포함" },
    ];
    await bulkUpdate.mutateAsync(settingsToSave);
  };

  // 배송비 저장 (새로운 delivery pricing 시스템)
  const saveDeliveryPricing = async (method: DeliveryMethod) => {
    try {
      const pricingData = deliveryFormData[method];

      // id, createdAt, updatedAt 필드 제외하고 전송
      const { id, createdAt, updatedAt, ...dataToSend } = pricingData as any;

      console.log('[배송비 저장] 요청 데이터:', { method, dataToSend });

      // 저장한 배송 방법을 ref에 기록 (useEffect에서 리셋 방지용)
      justSavedMethodRef.current = method;

      await updateDeliveryPricing.mutateAsync({
        method,
        dto: dataToSend,
      });

      console.log('[배송비 저장] 성공');
      toast.success(`${DELIVERY_METHOD_LABELS[method]} 저장 완료`);
    } catch (error) {
      console.error('[배송비 저장] 실패:', error);
      toast({
        title: "저장 실패",
        description: error instanceof Error ? error.message : "배송비 저장에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 배송비 초기화
  const initializeDelivery = async () => {
    try {
      await initializeDeliveryPricing.mutateAsync();
      toast({
        title: "초기화 완료",
        description: "기본 배송비 설정이 초기화되었습니다.",
      });
    } catch (error) {
      console.error('[배송비 초기화] 실패:', error);
      toast({
        title: "초기화 실패",
        description: error instanceof Error ? error.message : "배송비 초기화에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 공정단계 저장
  const saveProcessStages = async () => {
    const settingsToSave = [
      { key: "process_enabled_stages", value: JSON.stringify(enabledStages), category: "process", label: "활성화된 공정단계" },
    ];
    await bulkUpdate.mutateAsync(settingsToSave);
  };

  // 공정단계 토글
  const toggleStage = (stageCode: string) => {
    setEnabledStages((prev) =>
      prev.includes(stageCode)
        ? prev.filter((code) => code !== stageCode)
        : [...prev, stageCode]
    );
  };

  // 카테고리별 공정단계 그룹화
  const stagesByCategory = Object.entries(PROCESS_STAGES).reduce((acc, [code, stage]) => {
    if (!acc[stage.category]) {
      acc[stage.category] = [];
    }
    acc[stage.category].push({ code, ...stage });
    return acc;
  }, {} as Record<string, { code: string; name: string; category: string; order: number }[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">기초정보 설정</h1>
        <p className="text-muted-foreground">시스템 기본 설정을 관리합니다.</p>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">회사정보</span>
          </TabsTrigger>
          <TabsTrigger value="printing" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">인쇄비</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">배송비</span>
          </TabsTrigger>
          <TabsTrigger value="process" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">공정단계</span>
          </TabsTrigger>
        </TabsList>

        {/* 회사정보 탭 */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>회사 기본정보</CardTitle>
              <CardDescription>사업자 등록 정보를 입력합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">회사명</Label>
                  <Input
                    id="company_name"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                    placeholder="(주)포토카페"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_ceo">대표자</Label>
                  <Input
                    id="company_ceo"
                    value={companyInfo.ceo}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, ceo: e.target.value })}
                    placeholder="홍길동"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_number">사업자등록번호</Label>
                  <Input
                    id="business_number"
                    value={companyInfo.businessNumber}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, businessNumber: e.target.value })}
                    placeholder="123-45-67890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ecommerce_number">통신판매신고번호</Label>
                  <Input
                    id="ecommerce_number"
                    value={companyInfo.ecommerceNumber}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, ecommerceNumber: e.target.value })}
                    placeholder="제2024-서울강남-12345호"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_type">업태</Label>
                  <Input
                    id="business_type"
                    value={companyInfo.businessType}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, businessType: e.target.value })}
                    placeholder="제조업, 서비스업"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_category">종목</Label>
                  <Input
                    id="business_category"
                    value={companyInfo.businessCategory}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, businessCategory: e.target.value })}
                    placeholder="인쇄, 사진"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>연락처 정보</CardTitle>
              <CardDescription>전화번호, 이메일 등 연락처 정보를 입력합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">대표전화</Label>
                  <Input
                    id="phone"
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                    placeholder="02-1234-5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fax">팩스번호</Label>
                  <Input
                    id="fax"
                    value={companyInfo.fax}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, fax: e.target.value })}
                    placeholder="02-1234-5679"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">대표이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                    placeholder="info@printing114.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cs_phone">고객센터 전화</Label>
                  <Input
                    id="cs_phone"
                    value={companyInfo.csPhone}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, csPhone: e.target.value })}
                    placeholder="1588-1234"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="cs_hours">고객센터 운영시간</Label>
                  <Input
                    id="cs_hours"
                    value={companyInfo.csHours}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, csHours: e.target.value })}
                    placeholder="평일 09:00~18:00 (점심시간 12:00~13:00)"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>주소 정보</CardTitle>
              <CardDescription>사업장 주소를 입력합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">우편번호</Label>
                  <Input
                    id="postal_code"
                    value={companyInfo.postalCode}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, postalCode: e.target.value })}
                    placeholder="06234"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">기본주소</Label>
                  <Input
                    id="address"
                    value={companyInfo.address}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                    placeholder="서울시 강남구 테헤란로 123"
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="address_detail">상세주소</Label>
                  <Input
                    id="address_detail"
                    value={companyInfo.addressDetail}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, addressDetail: e.target.value })}
                    placeholder="4층 401호"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>서버/도메인 정보</CardTitle>
              <CardDescription>웹사이트 및 서버 정보를 입력합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">메인 도메인</Label>
                  <Input
                    id="domain"
                    value={companyInfo.domain}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, domain: e.target.value })}
                    placeholder="www.printing114.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin_domain">관리자 도메인</Label>
                  <Input
                    id="admin_domain"
                    value={companyInfo.adminDomain}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, adminDomain: e.target.value })}
                    placeholder="admin.printing114.com"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="server_info">서버정보</Label>
                  <Input
                    id="server_info"
                    value={companyInfo.serverInfo}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, serverInfo: e.target.value })}
                    placeholder="AWS ap-northeast-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => toast({ title: "초기화되었습니다." })}>
              <RotateCcw className="h-4 w-4 mr-2" />
              초기화
            </Button>
            <Button onClick={saveCompanyInfo} disabled={bulkUpdate.isPending}>
              <Save className="h-4 w-4 mr-2" />
              저장
            </Button>
          </div>
        </TabsContent>

        {/* 인쇄비 탭 */}
        <TabsContent value="printing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>인디고 인쇄비</CardTitle>
              <CardDescription>인디고 출력비 원가계산에 사용되는 기본 인쇄비입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="indigo_1color">인디고 1도(1color) 인쇄비</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="indigo_1color"
                      type="number"
                      value={printingInfo.indigo1ColorCost}
                      onChange={(e) => setPrintingInfo({ ...printingInfo, indigo1ColorCost: Number(e.target.value) })}
                      placeholder="0"
                      className="w-40"
                    />
                    <span className="text-muted-foreground">원</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">원가 계산 예시</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>4도(CMYK) 원가 = 1도 인쇄비 x 4 = {(printingInfo.indigo1ColorCost * 4).toLocaleString()}원</li>
                  <li>6도(CMYKOG) 원가 = 1도 인쇄비 x 6 = {(printingInfo.indigo1ColorCost * 6).toLocaleString()}원</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPrintingInfo({ indigo1ColorCost: 0 })}>
              <RotateCcw className="h-4 w-4 mr-2" />
              초기화
            </Button>
            <Button onClick={savePrintingInfo} disabled={bulkUpdate.isPending}>
              <Save className="h-4 w-4 mr-2" />
              저장
            </Button>
          </div>
        </TabsContent>

        {/* 배송비 탭 */}
        <TabsContent value="shipping" className="space-y-4">
          {isLoadingDelivery ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>배송비 관리</CardTitle>
                      <CardDescription>
                        {deliveryPricings && deliveryPricings.length > 0
                          ? '배송 방법별로 요금을 설정하세요.'
                          : '배송비 데이터가 없습니다. 초기화 버튼을 클릭하여 기본 설정을 생성하세요.'}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={initializeDelivery}
                      disabled={initializeDeliveryPricing.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      기본 설정 초기화
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {DELIVERY_METHODS.map((method) => {
                      const pricing = deliveryFormData[method];
                      const label = DELIVERY_METHOD_LABELS[method];

                      // 배송 방법별 아이콘 설정
                      const getIcon = () => {
                        switch (method) {
                          case 'parcel': return <Package className="h-5 w-5 text-muted-foreground" />;
                          case 'motorcycle': return <Bike className="h-5 w-5 text-muted-foreground" />;
                          case 'damas': return <Truck className="h-5 w-5 text-muted-foreground" />;
                          case 'freight': return <Box className="h-5 w-5 text-muted-foreground" />;
                          default: return <Truck className="h-5 w-5 text-muted-foreground" />;
                        }
                      };

                      return (
                        <AccordionItem key={method} value={method}>
                          <div className="flex items-center border-b">
                            <AccordionTrigger className="hover:no-underline flex-1">
                              <div className="flex items-center gap-3">
                                {getIcon()}
                                <div className="text-left">
                                  <div className="font-semibold">{label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {method === 'parcel' && '일반 택배 배송비 설정'}
                                    {method === 'motorcycle' && '오토바이 퀵서비스 배송비 설정'}
                                    {method === 'damas' && '다마스 차량 배송비 설정'}
                                    {method === 'freight' && '화물 배송비 설정'}
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <div className="flex items-center gap-2 px-4">
                              <span className="text-xs text-muted-foreground">
                                {pricing.isActive ?? true ? '활성화' : '비활성화'}
                              </span>
                              <Checkbox
                                checked={pricing.isActive ?? true}
                                onCheckedChange={(checked) => {
                                  setDeliveryFormData({
                                    ...deliveryFormData,
                                    [method]: { ...pricing, isActive: !!checked },
                                  });
                                }}
                              />
                            </div>
                          </div>
                          <AccordionContent>
                            <div className="pt-4 space-y-4">
                      {method === 'parcel' && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>포장비(박스+포장)</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={(pricing?.packagingFee ?? 0).toLocaleString()}
                                  onChange={(e) => {
                                    const packagingFee = Number(e.target.value.replace(/,/g, '')) || 0;
                                    const shippingFee = Number(pricing?.shippingFee) || 0;
                                    setDeliveryFormData({
                                      ...deliveryFormData,
                                      [method]: {
                                        ...pricing,
                                        packagingFee,
                                        baseFee: packagingFee + shippingFee,
                                      },
                                    });
                                  }}
                                  className="w-32"
                                />
                                <span className="text-sm text-muted-foreground">원</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>택배비</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={(pricing?.shippingFee ?? 0).toLocaleString()}
                                  onChange={(e) => {
                                    const shippingFee = Number(e.target.value.replace(/,/g, '')) || 0;
                                    const packagingFee = Number(pricing?.packagingFee) || 0;
                                    setDeliveryFormData({
                                      ...deliveryFormData,
                                      [method]: {
                                        ...pricing,
                                        shippingFee,
                                        baseFee: packagingFee + shippingFee,
                                      },
                                    });
                                  }}
                                  className="w-32"
                                />
                                <span className="text-sm text-muted-foreground">원</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-900">택배비 합계 (포장비(박스+포장) + 택배비)</span>
                              <span className="text-lg font-bold text-blue-600">
                                {(Number(pricing?.packagingFee ?? 0) + Number(pricing?.shippingFee ?? 0)).toLocaleString()}원
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>도서산간 추가요금</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={(pricing?.islandFee ?? 0).toLocaleString()}
                                  onChange={(e) => {
                                    setDeliveryFormData({
                                      ...deliveryFormData,
                                      [method]: { ...pricing, islandFee: Number(e.target.value.replace(/,/g, '')) || 0 },
                                    });
                                  }}
                                  className="w-32"
                                />
                                <span className="text-sm text-muted-foreground">원</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>무료배송 기준금액</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={(pricing?.freeThreshold ?? 0).toLocaleString()}
                                  onChange={(e) => {
                                    setDeliveryFormData({
                                      ...deliveryFormData,
                                      [method]: { ...pricing, freeThreshold: Number(e.target.value.replace(/,/g, '')) || 0 },
                                    });
                                  }}
                                  className="w-32"
                                />
                                <span className="text-sm text-muted-foreground">원 이상</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {(method === 'motorcycle' || method === 'damas') && (
                        <>
                          <div className="space-y-2">
                            <Label>거리별 요금 구간</Label>
                            <div className="space-y-2">
                              {(pricing.distanceRanges ?? []).map((range, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    placeholder="최소거리"
                                    value={range?.minDistance ?? 0}
                                    onChange={(e) => {
                                      const newRanges = [...(pricing.distanceRanges ?? [])];
                                      newRanges[idx] = { ...range, minDistance: Number(e.target.value) || 0 };
                                      setDeliveryFormData({
                                        ...deliveryFormData,
                                        [method]: { ...pricing, distanceRanges: newRanges },
                                      });
                                    }}
                                    className="w-24"
                                  />
                                  <span className="text-sm">~</span>
                                  <Input
                                    type="number"
                                    placeholder="최대거리"
                                    value={range?.maxDistance ?? 0}
                                    onChange={(e) => {
                                      const newRanges = [...(pricing.distanceRanges ?? [])];
                                      newRanges[idx] = { ...range, maxDistance: Number(e.target.value) || 0 };
                                      setDeliveryFormData({
                                        ...deliveryFormData,
                                        [method]: { ...pricing, distanceRanges: newRanges },
                                      });
                                    }}
                                    className="w-24"
                                  />
                                  <span className="text-sm">km</span>
                                  <Input
                                    type="text"
                                    placeholder="요금"
                                    value={(range?.price ?? 0).toLocaleString()}
                                    onChange={(e) => {
                                      const newRanges = [...(pricing.distanceRanges ?? [])];
                                      newRanges[idx] = { ...range, price: Number(e.target.value.replace(/,/g, '')) || 0 };
                                      setDeliveryFormData({
                                        ...deliveryFormData,
                                        [method]: { ...pricing, distanceRanges: newRanges },
                                      });
                                    }}
                                    className="w-32"
                                  />
                                  <span className="text-sm text-muted-foreground">원</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const newRanges = (pricing.distanceRanges ?? []).filter((_, i) => i !== idx);
                                      setDeliveryFormData({
                                        ...deliveryFormData,
                                        [method]: { ...pricing, distanceRanges: newRanges },
                                      });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentRanges = pricing.distanceRanges ?? [];

                                  // 기존 구간이 있는지 확인
                                  if (currentRanges.length === 0) {
                                    // 첫 번째 구간 추가
                                    const newRanges = [{ minDistance: 0, maxDistance: 10, price: 0 }];
                                    setDeliveryFormData({
                                      ...deliveryFormData,
                                      [method]: { ...pricing, distanceRanges: newRanges },
                                    });
                                    return;
                                  }

                                  // 마지막 구간 검증
                                  const lastRange = currentRanges[currentRanges.length - 1];
                                  const minDist = Number(lastRange.minDistance) || 0;
                                  const maxDist = Number(lastRange.maxDistance) || 0;

                                  // 최대거리가 유효한지 확인 (0보다 크고 최소거리보다 커야 함)
                                  if (maxDist <= 0) {
                                    toast({
                                      title: "입력 오류",
                                      description: "마지막 구간의 최대거리는 0보다 커야 합니다.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  if (maxDist <= minDist) {
                                    toast({
                                      title: "입력 오류",
                                      description: "최대거리는 최소거리보다 커야 합니다.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }

                                  // 새 구간 자동 생성 (마지막 구간의 최대거리부터 시작)
                                  const newMinDistance = maxDist;
                                  const newMaxDistance = newMinDistance + 10; // 기본 10km 간격

                                  const newRanges = [
                                    ...currentRanges,
                                    { minDistance: newMinDistance, maxDistance: newMaxDistance, price: 0 },
                                  ];
                                  setDeliveryFormData({
                                    ...deliveryFormData,
                                    [method]: { ...pricing, distanceRanges: newRanges },
                                  });
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                구간 추가
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>최대 기본거리 (km)</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={pricing?.maxBaseDistance ?? 0}
                                  onChange={(e) => {
                                    setDeliveryFormData({
                                      ...deliveryFormData,
                                      [method]: { ...pricing, maxBaseDistance: Number(e.target.value) || 0 },
                                    });
                                  }}
                                  className="w-32"
                                />
                                <span className="text-sm text-muted-foreground">km</span>
                              </div>
                              <p className="text-xs text-muted-foreground">이 거리를 초과하면 km당 추가요금이 적용됩니다</p>
                            </div>
                            <div className="space-y-2">
                              <Label>초과거리 추가요금 (원/km)</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={(pricing?.extraPricePerKm ?? 0).toLocaleString()}
                                  onChange={(e) => {
                                    setDeliveryFormData({
                                      ...deliveryFormData,
                                      [method]: { ...pricing, extraPricePerKm: Number(e.target.value.replace(/,/g, '')) || 0 },
                                    });
                                  }}
                                  className="w-32"
                                />
                                <span className="text-sm text-muted-foreground">원/km</span>
                              </div>
                              <p className="text-xs text-muted-foreground">최대 기본거리 초과 시 km당 요금</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>야간할증률 (%)</Label>
                              <Input
                                type="number"
                                value={(pricing?.nightSurchargeRate ?? 0) * 100}
                                onChange={(e) => {
                                  setDeliveryFormData({
                                    ...deliveryFormData,
                                    [method]: { ...pricing, nightSurchargeRate: (Number(e.target.value) || 0) / 100 },
                                  });
                                }}
                                className="w-32"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>주말할증률 (%)</Label>
                              <Input
                                type="number"
                                value={(pricing?.weekendSurchargeRate ?? 0) * 100}
                                onChange={(e) => {
                                  setDeliveryFormData({
                                    ...deliveryFormData,
                                    [method]: { ...pricing, weekendSurchargeRate: (Number(e.target.value) || 0) / 100 },
                                  });
                                }}
                                className="w-32"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {method === 'freight' && (
                        <>
                          <div className="space-y-2">
                            <Label>기본요금</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={(pricing.baseFee ?? 0).toLocaleString()}
                                onChange={(e) => {
                                  setDeliveryFormData({
                                    ...deliveryFormData,
                                    [method]: { ...pricing, baseFee: Number(e.target.value.replace(/,/g, '')) || 0 },
                                  });
                                }}
                                className="w-32"
                              />
                              <span className="text-sm text-muted-foreground">원</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label>크기별 추가요금</Label>
                            <div className="space-y-3">
                              {(pricing.sizeRanges ?? []).map((range, idx) => (
                                <div key={idx} className="border rounded-lg p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Label className="text-sm font-medium">구간 {idx + 1}</Label>
                                      <Input
                                        placeholder="크기명 (예: 소형, 중형)"
                                        value={range?.name ?? ''}
                                        onChange={(e) => {
                                          const newRanges = [...(pricing.sizeRanges ?? [])];
                                          newRanges[idx] = { ...range, name: e.target.value };
                                          setDeliveryFormData({
                                            ...deliveryFormData,
                                            [method]: { ...pricing, sizeRanges: newRanges },
                                          });
                                        }}
                                        className="w-40"
                                      />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const newRanges = (pricing.sizeRanges ?? []).filter((_, i) => i !== idx);
                                        setDeliveryFormData({
                                          ...deliveryFormData,
                                          [method]: { ...pricing, sizeRanges: newRanges },
                                        });
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">최대 무게 (kg)</Label>
                                      <Input
                                        type="number"
                                        placeholder="무게 제한 (선택)"
                                        value={range?.maxWeight ?? ''}
                                        onChange={(e) => {
                                          const newRanges = [...(pricing.sizeRanges ?? [])];
                                          newRanges[idx] = {
                                            ...range,
                                            maxWeight: e.target.value ? Number(e.target.value) : undefined
                                          };
                                          setDeliveryFormData({
                                            ...deliveryFormData,
                                            [method]: { ...pricing, sizeRanges: newRanges },
                                          });
                                        }}
                                        className="w-full"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">최대 부피 (m³)</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="부피 제한 (선택)"
                                        value={range?.maxVolume ?? ''}
                                        onChange={(e) => {
                                          const newRanges = [...(pricing.sizeRanges ?? [])];
                                          newRanges[idx] = {
                                            ...range,
                                            maxVolume: e.target.value ? Number(e.target.value) : undefined
                                          };
                                          setDeliveryFormData({
                                            ...deliveryFormData,
                                            [method]: { ...pricing, sizeRanges: newRanges },
                                          });
                                        }}
                                        className="w-full"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">추가요금 (원)</Label>
                                      <Input
                                        type="text"
                                        placeholder="추가요금"
                                        value={(range?.price ?? 0).toLocaleString()}
                                        onChange={(e) => {
                                          const newRanges = [...(pricing.sizeRanges ?? [])];
                                          newRanges[idx] = { ...range, price: Number(e.target.value.replace(/,/g, '')) || 0 };
                                          setDeliveryFormData({
                                            ...deliveryFormData,
                                            [method]: { ...pricing, sizeRanges: newRanges },
                                          });
                                        }}
                                        className="w-full"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newRanges = [
                                    ...(pricing.sizeRanges ?? []),
                                    { name: '', price: 0 },
                                  ];
                                  setDeliveryFormData({
                                    ...deliveryFormData,
                                    [method]: { ...pricing, sizeRanges: newRanges },
                                  });
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                크기 구간 추가
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>야간할증률 (%)</Label>
                              <Input
                                type="number"
                                value={(pricing.nightSurchargeRate ?? 0) * 100}
                                onChange={(e) => {
                                  setDeliveryFormData({
                                    ...deliveryFormData,
                                    [method]: { ...pricing, nightSurchargeRate: Number(e.target.value) / 100 },
                                  });
                                }}
                                className="w-32"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>주말할증률 (%)</Label>
                              <Input
                                type="number"
                                value={(pricing.weekendSurchargeRate ?? 0) * 100}
                                onChange={(e) => {
                                  setDeliveryFormData({
                                    ...deliveryFormData,
                                    [method]: { ...pricing, weekendSurchargeRate: Number(e.target.value) / 100 },
                                  });
                                }}
                                className="w-32"
                              />
                            </div>
                          </div>

                          <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                            <p className="font-medium mb-2">💡 화물 요금 계산 방법</p>
                            <ul className="space-y-1 text-xs">
                              <li>• 총 요금 = 기본요금 + 크기별 추가요금 + 할증(야간/주말)</li>
                              <li>• 무게 또는 부피 중 하나라도 기준을 만족하면 해당 구간 적용</li>
                              <li>• 모든 구간을 초과하면 마지막 구간 요금 적용</li>
                            </ul>
                          </div>
                        </>
                      )}

                              <div className="flex justify-end pt-2">
                                <Button
                                  onClick={() => saveDeliveryPricing(method)}
                                  disabled={updateDeliveryPricing.isPending}
                                >
                                  <Save className="h-4 w-4 mr-2" />
                                  {label} 저장
                                </Button>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* 공정단계 탭 */}
        <TabsContent value="process" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>공정단계 사용 설정</CardTitle>
              <CardDescription>
                사용할 공정단계를 선택하세요. 선택한 단계만 주문 처리에 표시됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(PROCESS_CATEGORIES).map(([categoryKey, categoryName]) => {
                const stages = stagesByCategory[categoryKey] || [];
                if (stages.length === 0) return null;

                return (
                  <div key={categoryKey} className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">{categoryName} 단계</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {stages
                        .sort((a, b) => a.order - b.order)
                        .map((stage) => (
                          <div key={stage.code} className="flex items-center space-x-2">
                            <Checkbox
                              id={stage.code}
                              checked={enabledStages.includes(stage.code)}
                              onCheckedChange={() => toggleStage(stage.code)}
                            />
                            <Label htmlFor={stage.code} className="cursor-pointer text-sm">
                              {stage.name}
                            </Label>
                          </div>
                        ))}
                    </div>
                    <Separator />
                  </div>
                );
              })}

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  선택된 공정단계: {enabledStages.length}개
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setEnabledStages([
                  "reception_waiting",
                  "payment_waiting",
                  "reception_complete",
                  "print_waiting",
                  "printing",
                  "print_complete",
                  "binding_waiting",
                  "binding",
                  "binding_complete",
                  "shipping_waiting",
                  "shipping",
                  "delivered",
                  "transaction_complete",
                ])
              }
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              초기화
            </Button>
            <Button onClick={saveProcessStages} disabled={bulkUpdate.isPending}>
              <Save className="h-4 w-4 mr-2" />
              저장
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
