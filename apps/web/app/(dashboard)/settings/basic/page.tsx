"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Building2, Printer, Truck, ListChecks, Save, RotateCcw } from "lucide-react";
import DeliverySettingsContent from "@/components/settings/delivery-settings-content";
import {
  useSystemSettings,
  useBulkUpdateSettings,
  settingsToMap,
  getNumericValue,
  PROCESS_STAGES,
  PROCESS_CATEGORIES,
} from "@/hooks/use-system-settings";
import { toast } from "sonner";

export default function BasicSettingsPage() {
  const { data: settings, isLoading } = useSystemSettings();
  const bulkUpdate = useBulkUpdateSettings();

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
                  <PhoneInput
                    id="phone"
                    value={companyInfo.phone}
                    onChange={(value) => setCompanyInfo({ ...companyInfo, phone: value })}
                    placeholder="02-1234-5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fax">팩스번호</Label>
                  <PhoneInput
                    id="fax"
                    value={companyInfo.fax}
                    onChange={(value) => setCompanyInfo({ ...companyInfo, fax: value })}
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
                  <PhoneInput
                    id="cs_phone"
                    value={companyInfo.csPhone}
                    onChange={(value) => setCompanyInfo({ ...companyInfo, csPhone: value })}
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
            <Button variant="outline" onClick={() => toast.success("초기화되었습니다.")}>
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
          <DeliverySettingsContent showHeader={false} showKakaoCalculator={true} />
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
