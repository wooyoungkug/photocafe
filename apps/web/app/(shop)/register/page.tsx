'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2, User, Building2, CheckCircle2 } from 'lucide-react';

// 개인 고객 폼 데이터
interface IndividualFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  mobile: string;
}

// 스튜디오 폼 데이터
interface StudioFormData {
  // 기본 정보
  studioName: string;
  representative: string;
  contactPerson: string;
  contactPhone: string;
  phone: string;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
  // 사업자 정보
  businessNumber: string;
  businessType: string;
  businessCategory: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  taxInvoiceEmail: string;
  taxInvoiceMethod: string;
  // 스튜디오 특성
  mainGenre: string;
  monthlyOrderVolume: string;
  colorProfile: string;
  acquisitionChannel: string;
  // 제품 선호도
  preferredSize: string;
  preferredFinish: string;
  hasLogo: boolean;
  deliveryNote: string;
}

// 사업자번호 포맷팅 (XXX-XX-XXXXX)
const formatBusinessNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 10);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
};


export default function RegisterPage() {
  const router = useRouter();
  const [memberType, setMemberType] = useState<'individual' | 'studio'>('individual');
  const [step, setStep] = useState(1); // 스튜디오는 2단계 폼

  // 개인 고객 폼
  const [individualForm, setIndividualForm] = useState<IndividualFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
  });

  // 스튜디오 폼
  const [studioForm, setStudioForm] = useState<StudioFormData>({
    studioName: '',
    representative: '',
    contactPerson: '',
    contactPhone: '',
    phone: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessNumber: '',
    businessType: '',
    businessCategory: '',
    postalCode: '',
    address: '',
    addressDetail: '',
    taxInvoiceEmail: '',
    taxInvoiceMethod: 'electronic',
    mainGenre: '',
    monthlyOrderVolume: '',
    colorProfile: 'sRGB',
    acquisitionChannel: '',
    preferredSize: '',
    preferredFinish: '',
    hasLogo: false,
    deliveryNote: '',
  });

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);
  const [businessNumberChecked, setBusinessNumberChecked] = useState(false);

  const handleIndividualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setIndividualForm(prev => ({ ...prev, [name]: value }));
    if (name === 'email') setEmailChecked(false);
  };

  const handleStudioChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // 사업자번호 자동 포맷팅
    if (name === 'businessNumber') {
      formattedValue = formatBusinessNumber(value);
      setBusinessNumberChecked(false);
    }

    setStudioForm(prev => ({ ...prev, [name]: formattedValue }));
    if (name === 'email') setEmailChecked(false);
  };

  const handleStudioSelectChange = (name: string, value: string) => {
    setStudioForm(prev => ({ ...prev, [name]: value }));
  };

  // 이메일 중복 확인
  const checkEmail = async (email: string) => {
    try {
      const res = await api.get<{ exists: boolean }>(`/auth/client/check-email?email=${encodeURIComponent(email)}`);
      if (res.exists) {
        setError('이미 등록된 이메일입니다.');
        return false;
      }
      setEmailChecked(true);
      setError(null);
      return true;
    } catch {
      setError('이메일 확인 중 오류가 발생했습니다.');
      return false;
    }
  };

  // 사업자등록번호 중복 확인
  const checkBusinessNumber = async (businessNumber: string) => {
    try {
      const res = await api.get<{ exists: boolean }>(`/auth/client/check-business-number?businessNumber=${encodeURIComponent(businessNumber)}`);
      if (res.exists) {
        setError('이미 등록된 사업자등록번호입니다.');
        return false;
      }
      setBusinessNumberChecked(true);
      setError(null);
      return true;
    } catch {
      setError('사업자등록번호 확인 중 오류가 발생했습니다.');
      return false;
    }
  };

  // 개인 고객 회원가입
  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (individualForm.password !== individualForm.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (individualForm.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (!agreeTerms) {
      setError('이용약관에 동의해주세요.');
      return;
    }

    if (!emailChecked) {
      const valid = await checkEmail(individualForm.email);
      if (!valid) return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/client/register/individual', {
        name: individualForm.name,
        email: individualForm.email,
        password: individualForm.password,
        mobile: individualForm.mobile || undefined,
      });

      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 스튜디오 회원가입
  const handleStudioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (studioForm.password !== studioForm.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (studioForm.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (!agreeTerms) {
      setError('이용약관에 동의해주세요.');
      return;
    }

    if (!emailChecked) {
      const valid = await checkEmail(studioForm.email);
      if (!valid) return;
    }

    if (!businessNumberChecked) {
      const valid = await checkBusinessNumber(studioForm.businessNumber);
      if (!valid) return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/client/register/studio', {
        studioName: studioForm.studioName,
        representative: studioForm.representative,
        contactPerson: studioForm.contactPerson || undefined,
        contactPhone: studioForm.contactPhone || undefined,
        phone: studioForm.phone || undefined,
        mobile: studioForm.mobile,
        email: studioForm.email,
        password: studioForm.password,
        businessNumber: studioForm.businessNumber,
        businessType: studioForm.businessType || undefined,
        businessCategory: studioForm.businessCategory || undefined,
        postalCode: studioForm.postalCode || undefined,
        address: studioForm.address || undefined,
        addressDetail: studioForm.addressDetail || undefined,
        taxInvoiceEmail: studioForm.taxInvoiceEmail || undefined,
        taxInvoiceMethod: studioForm.taxInvoiceMethod || undefined,
        mainGenre: studioForm.mainGenre || undefined,
        monthlyOrderVolume: studioForm.monthlyOrderVolume || undefined,
        colorProfile: studioForm.colorProfile || undefined,
        acquisitionChannel: studioForm.acquisitionChannel || undefined,
        preferredSize: studioForm.preferredSize || undefined,
        preferredFinish: studioForm.preferredFinish || undefined,
        hasLogo: studioForm.hasLogo,
        deliveryNote: studioForm.deliveryNote || undefined,
      });

      router.push('/login?registered=true&type=studio');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-300px)] flex items-center justify-center p-4 py-8">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="inline-block mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
          </Link>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>
            PhotoCafe 회원이 되어 다양한 혜택을 누리세요
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={memberType} onValueChange={(v) => { setMemberType(v as 'individual' | 'studio'); setStep(1); setError(null); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                개인 고객
              </TabsTrigger>
              <TabsTrigger value="studio" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                스튜디오 (B2B)
              </TabsTrigger>
            </TabsList>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md mb-4">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {/* 개인 고객 회원가입 */}
            <TabsContent value="individual">
              <form onSubmit={handleIndividualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ind-name">이름 *</Label>
                  <Input
                    id="ind-name"
                    name="name"
                    placeholder="홍길동"
                    value={individualForm.name}
                    onChange={handleIndividualChange}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ind-email">이메일 *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ind-email"
                      name="email"
                      type="email"
                      placeholder="example@email.com"
                      value={individualForm.email}
                      onChange={handleIndividualChange}
                      required
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant={emailChecked ? "default" : "outline"}
                      onClick={() => checkEmail(individualForm.email)}
                      disabled={!individualForm.email || isLoading}
                    >
                      {emailChecked ? <CheckCircle2 className="h-4 w-4" /> : '중복확인'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ind-password">비밀번호 *</Label>
                    <Input
                      id="ind-password"
                      name="password"
                      type="password"
                      placeholder="6자 이상"
                      value={individualForm.password}
                      onChange={handleIndividualChange}
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ind-confirmPassword">비밀번호 확인 *</Label>
                    <Input
                      id="ind-confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="비밀번호 재입력"
                      value={individualForm.confirmPassword}
                      onChange={handleIndividualChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ind-mobile">휴대폰 번호</Label>
                  <PhoneInput
                    id="ind-mobile"
                    placeholder="010-0000-0000"
                    value={individualForm.mobile}
                    onChange={(val) => setIndividualForm(prev => ({ ...prev, mobile: val }))}
                    disabled={isLoading}
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={agreeTerms}
                      onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                      className="mt-0.5"
                    />
                    <span className="text-sm">
                      <Link href="/terms" className="text-primary hover:underline">이용약관</Link>
                      {' 및 '}
                      <Link href="/privacy" className="text-primary hover:underline">개인정보처리방침</Link>
                      에 동의합니다. *
                    </span>
                  </label>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      가입 중...
                    </>
                  ) : (
                    '회원가입'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* 스튜디오 회원가입 */}
            <TabsContent value="studio">
              <form onSubmit={handleStudioSubmit}>
                {/* Step 1: 기본 정보 + 사업자 정보 */}
                {step === 1 && (
                  <div className="space-y-6">
                    {/* 기본 인적 사항 */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3 pb-2 border-b">기본 정보</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="studioName">스튜디오명 (상호) *</Label>
                          <Input
                            id="studioName"
                            name="studioName"
                            placeholder="행복스튜디오"
                            value={studioForm.studioName}
                            onChange={handleStudioChange}
                            required
                            disabled={isLoading}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="representative">대표자명 *</Label>
                            <Input
                              id="representative"
                              name="representative"
                              placeholder="홍길동"
                              value={studioForm.representative}
                              onChange={handleStudioChange}
                              required
                              disabled={isLoading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contactPerson">실무 담당자명</Label>
                            <Input
                              id="contactPerson"
                              name="contactPerson"
                              placeholder="김영희"
                              value={studioForm.contactPerson}
                              onChange={handleStudioChange}
                              disabled={isLoading}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="studio-mobile">휴대폰 번호 *</Label>
                            <PhoneInput
                              id="studio-mobile"
                              placeholder="010-0000-0000"
                              value={studioForm.mobile}
                              onChange={(val) => setStudioForm(prev => ({ ...prev, mobile: val }))}
                              required
                              disabled={isLoading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contactPhone">담당자 연락처</Label>
                            <PhoneInput
                              id="contactPhone"
                              placeholder="010-0000-0000"
                              value={studioForm.contactPhone}
                              onChange={(val) => setStudioForm(prev => ({ ...prev, contactPhone: val }))}
                              disabled={isLoading}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="studio-phone">대표 전화번호</Label>
                          <PhoneInput
                            id="studio-phone"
                            placeholder="02-000-0000"
                            value={studioForm.phone}
                            onChange={(val) => setStudioForm(prev => ({ ...prev, phone: val }))}
                            disabled={isLoading}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="studio-email">이메일 *</Label>
                          <div className="flex gap-2">
                            <Input
                              id="studio-email"
                              name="email"
                              type="email"
                              placeholder="studio@email.com"
                              value={studioForm.email}
                              onChange={handleStudioChange}
                              required
                              disabled={isLoading}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant={emailChecked ? "default" : "outline"}
                              onClick={() => checkEmail(studioForm.email)}
                              disabled={!studioForm.email || isLoading}
                            >
                              {emailChecked ? <CheckCircle2 className="h-4 w-4" /> : '중복확인'}
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="studio-password">비밀번호 *</Label>
                            <Input
                              id="studio-password"
                              name="password"
                              type="password"
                              placeholder="6자 이상"
                              value={studioForm.password}
                              onChange={handleStudioChange}
                              required
                              minLength={6}
                              disabled={isLoading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="studio-confirmPassword">비밀번호 확인 *</Label>
                            <Input
                              id="studio-confirmPassword"
                              name="confirmPassword"
                              type="password"
                              placeholder="비밀번호 재입력"
                              value={studioForm.confirmPassword}
                              onChange={handleStudioChange}
                              required
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 사업자 정보 */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3 pb-2 border-b">사업자 정보</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="businessNumber">사업자등록번호 *</Label>
                          <div className="flex gap-2">
                            <Input
                              id="businessNumber"
                              name="businessNumber"
                              placeholder="123-45-67890"
                              value={studioForm.businessNumber}
                              onChange={handleStudioChange}
                              required
                              disabled={isLoading}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant={businessNumberChecked ? "default" : "outline"}
                              onClick={() => checkBusinessNumber(studioForm.businessNumber)}
                              disabled={!studioForm.businessNumber || isLoading}
                            >
                              {businessNumberChecked ? <CheckCircle2 className="h-4 w-4" /> : '중복확인'}
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="businessType">업태</Label>
                            <Input
                              id="businessType"
                              name="businessType"
                              placeholder="사진촬영업"
                              value={studioForm.businessType}
                              onChange={handleStudioChange}
                              disabled={isLoading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="businessCategory">종목</Label>
                            <Input
                              id="businessCategory"
                              name="businessCategory"
                              placeholder="웨딩, 베이비"
                              value={studioForm.businessCategory}
                              onChange={handleStudioChange}
                              disabled={isLoading}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="postalCode">우편번호</Label>
                            <Input
                              id="postalCode"
                              name="postalCode"
                              placeholder="06234"
                              value={studioForm.postalCode}
                              onChange={handleStudioChange}
                              disabled={isLoading}
                            />
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label htmlFor="address">주소</Label>
                            <Input
                              id="address"
                              name="address"
                              placeholder="서울시 강남구 테헤란로 123"
                              value={studioForm.address}
                              onChange={handleStudioChange}
                              disabled={isLoading}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="addressDetail">상세주소</Label>
                          <Input
                            id="addressDetail"
                            name="addressDetail"
                            placeholder="456호"
                            value={studioForm.addressDetail}
                            onChange={handleStudioChange}
                            disabled={isLoading}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="taxInvoiceEmail">세금계산서 이메일</Label>
                            <Input
                              id="taxInvoiceEmail"
                              name="taxInvoiceEmail"
                              type="email"
                              placeholder="tax@email.com"
                              value={studioForm.taxInvoiceEmail}
                              onChange={handleStudioChange}
                              disabled={isLoading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>세금계산서 발행방법</Label>
                            <Select
                              value={studioForm.taxInvoiceMethod}
                              onValueChange={(v) => handleStudioSelectChange('taxInvoiceMethod', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="electronic">전자발행</SelectItem>
                                <SelectItem value="fax">팩스</SelectItem>
                                <SelectItem value="mail">우편</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      size="lg"
                      onClick={() => setStep(2)}
                    >
                      다음 단계
                    </Button>
                  </div>
                )}

                {/* Step 2: 스튜디오 특성 + 제품 선호도 */}
                {step === 2 && (
                  <div className="space-y-6">
                    {/* 스튜디오 특성 */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3 pb-2 border-b">스튜디오 특성 (선택)</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        맞춤형 서비스와 통계 분석을 위해 활용됩니다. 입력하지 않아도 됩니다.
                      </p>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>주력 촬영 장르</Label>
                            <Select
                              value={studioForm.mainGenre}
                              onValueChange={(v) => handleStudioSelectChange('mainGenre', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="wedding">웨딩</SelectItem>
                                <SelectItem value="baby">베이비/돌</SelectItem>
                                <SelectItem value="profile">프로필</SelectItem>
                                <SelectItem value="snap">스냅</SelectItem>
                                <SelectItem value="family">가족</SelectItem>
                                <SelectItem value="commercial">상업</SelectItem>
                                <SelectItem value="etc">기타</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>월 평균 주문 예상량</Label>
                            <Select
                              value={studioForm.monthlyOrderVolume}
                              onValueChange={(v) => handleStudioSelectChange('monthlyOrderVolume', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="under10">10권 미만</SelectItem>
                                <SelectItem value="10to50">10~50권</SelectItem>
                                <SelectItem value="over50">50권 이상</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>사용 색상 프로필</Label>
                            <Select
                              value={studioForm.colorProfile}
                              onValueChange={(v) => handleStudioSelectChange('colorProfile', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sRGB">sRGB</SelectItem>
                                <SelectItem value="AdobeRGB">Adobe RGB</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>유입 경로</Label>
                            <Select
                              value={studioForm.acquisitionChannel}
                              onValueChange={(v) => handleStudioSelectChange('acquisitionChannel', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="referral">지인 소개</SelectItem>
                                <SelectItem value="search">웹 검색</SelectItem>
                                <SelectItem value="exhibition">박람회</SelectItem>
                                <SelectItem value="sns">SNS 광고</SelectItem>
                                <SelectItem value="etc">기타</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 제품 선호도 */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3 pb-2 border-b">제품 선호도 (선택)</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="preferredSize">선호 앨범 규격</Label>
                            <Input
                              id="preferredSize"
                              name="preferredSize"
                              placeholder="예: 11x14, 12x12"
                              value={studioForm.preferredSize}
                              onChange={handleStudioChange}
                              disabled={isLoading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>선호 내지 재질</Label>
                            <Select
                              value={studioForm.preferredFinish}
                              onValueChange={(v) => handleStudioSelectChange('preferredFinish', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="glossy">유광</SelectItem>
                                <SelectItem value="matte">무광</SelectItem>
                                <SelectItem value="luster">러스터</SelectItem>
                                <SelectItem value="metallic">메탈</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={studioForm.hasLogo}
                              onCheckedChange={(checked) => setStudioForm(prev => ({ ...prev, hasLogo: checked as boolean }))}
                            />
                            <span className="text-sm">로고/낙관 데이터 삽입을 사용합니다</span>
                          </label>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="deliveryNote">배송 요청사항</Label>
                          <Textarea
                            id="deliveryNote"
                            name="deliveryNote"
                            placeholder="예: 박스에 '유리주의' 스티커 필수, 직접 수령 선호 등"
                            value={studioForm.deliveryNote}
                            onChange={handleStudioChange}
                            disabled={isLoading}
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <Checkbox
                          checked={agreeTerms}
                          onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                          className="mt-0.5"
                        />
                        <span className="text-sm">
                          <Link href="/terms" className="text-primary hover:underline">이용약관</Link>
                          {' 및 '}
                          <Link href="/privacy" className="text-primary hover:underline">개인정보처리방침</Link>
                          에 동의합니다. *
                        </span>
                      </label>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        size="lg"
                        onClick={() => setStep(1)}
                      >
                        이전
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        size="lg"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            가입 중...
                          </>
                        ) : (
                          '스튜디오 회원가입'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                간편 가입
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full bg-[#03C75A] hover:bg-[#02b351] text-white hover:text-white border-0"
            size="lg"
            onClick={() => {
              window.location.href = `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/auth/naver`;
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="mr-2 h-5 w-5"
              fill="currentColor"
            >
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
            </svg>
            네이버로 간편 가입
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              로그인
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
