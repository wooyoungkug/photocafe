'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, User, Phone, MapPin, Heart, Briefcase, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
// AddressSearch 컴포넌트 미사용 — 페이지 레벨에서 직접 Daum 위젯 구현
import { useToast } from '@/hooks/use-toast';

function formatPhone(value: string): string {
  const nums = value.replace(/\D/g, '');
  if (nums.startsWith('02')) {
    if (nums.length <= 2) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 2)}-${nums.slice(2)}`;
    if (nums.length <= 9) return `${nums.slice(0, 2)}-${nums.slice(2, 5)}-${nums.slice(5)}`;
    return `${nums.slice(0, 2)}-${nums.slice(2, 6)}-${nums.slice(6, 10)}`;
  }
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  if (nums.length <= 10) return `${nums.slice(0, 3)}-${nums.slice(3, 6)}-${nums.slice(6)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
}

const RELATION_OPTIONS = ['배우자', '부모', '자녀', '형제/자매', '친척', '지인', '직장동료', '기타'];

interface ProfileStatusResponse {
  clientId: string;
  profileCompletedAt: string | null;
  isComplete: boolean;
  profile: {
    clientName: string;
    mobile: string;
    postalCode: string;
    address: string;
    addressDetail: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
  };
  employment: null | {
    employmentId: string;
    companyId: string;
    companyName: string;
    department: string;
    joinedAt: string;
    role: string;
  };
  companyDepartments: Array<{ id: string; name: string }>;
  missingFields: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const { toast } = useToast();

  const [form, setForm] = useState({
    clientName: '',
    mobile: '',
    postalCode: '',
    address: '',
    addressDetail: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    department: '',
  });
  const [addressOpen, setAddressOpen] = useState(false);
  const [error, setError] = useState('');
  const embedRef = useRef<HTMLDivElement>(null);

  // Daum 우편번호 스크립트 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).daum?.Postcode) return;
    const existing = document.querySelector('script[src*="postcode.v2.js"]');
    if (existing) return;
    const s = document.createElement('script');
    s.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    s.async = true;
    document.head.appendChild(s);
  }, []);

  // addressOpen이 true가 되면 위젯 embed
  useEffect(() => {
    if (!addressOpen || !embedRef.current) return;
    const doEmbed = () => {
      if (!(window as any).daum?.Postcode || !embedRef.current) return;
      embedRef.current.innerHTML = '';
      new (window as any).daum.Postcode({
        width: '100%',
        height: '100%',
        oncomplete: (data: any) => {
          const addr = data.roadAddress || data.jibunAddress;
          setForm((f) => ({ ...f, postalCode: data.zonecode, address: addr }));
          setAddressOpen(false);
        },
      }).embed(embedRef.current, { autoClose: false });
    };
    // 스크립트가 이미 로드됐으면 바로, 아니면 load 이벤트 대기
    if ((window as any).daum?.Postcode) {
      doEmbed();
    } else {
      const script = document.querySelector('script[src*="postcode.v2.js"]') as HTMLScriptElement | null;
      if (script) {
        script.addEventListener('load', doEmbed, { once: true });
      } else {
        // 혹시 스크립트가 없으면 삽입
        const s = document.createElement('script');
        s.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
        s.async = true;
        s.addEventListener('load', doEmbed, { once: true });
        document.head.appendChild(s);
      }
    }
  }, [addressOpen]);

  const { data: status, isLoading } = useQuery<ProfileStatusResponse>({
    queryKey: ['profile-status', user?.id],
    queryFn: async () => api.get<ProfileStatusResponse>('/clients/me/profile-status'),
    enabled: isAuthenticated,
  });

  // 초기값 세팅
  useEffect(() => {
    if (!status) return;
    setForm({
      clientName: status.profile.clientName ?? '',
      mobile: status.profile.mobile ?? '',
      postalCode: status.profile.postalCode ?? '',
      address: status.profile.address ?? '',
      addressDetail: status.profile.addressDetail ?? '',
      emergencyContactName: status.profile.emergencyContactName ?? '',
      emergencyContactPhone: status.profile.emergencyContactPhone ?? '',
      emergencyContactRelation: status.profile.emergencyContactRelation ?? '',
      department: status.employment?.department ?? '',
    });
  }, [status]);

  // 이미 완료된 경우 마이페이지로 우회
  useEffect(() => {
    if (status?.isComplete) {
      router.replace('/mypage/profile');
    }
  }, [status?.isComplete, router]);

  const submit = useMutation({
    mutationFn: async (payload: typeof form) => {
      return api.patch('/clients/me/onboarding', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile-status'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      toast({ title: '회원정보 등록 완료', description: '이제 모든 기능을 이용하실 수 있습니다.' });
      router.replace('/mypage/profile');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err?.message || '저장 중 오류가 발생했습니다.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 필수 필드 검증
    const required: Array<[keyof typeof form, string]> = [
      ['clientName', '이름/상호명'],
      ['mobile', '휴대전화'],
      ['address', '주소'],
      ['emergencyContactName', '비상연락처 이름'],
      ['emergencyContactPhone', '비상연락처 전화'],
      ['emergencyContactRelation', '비상연락처와의 관계'],
    ];
    if (status?.employment) required.push(['department', '부서']);

    for (const [key, label] of required) {
      if (!form[key]?.trim()) {
        setError(`${label}을(를) 입력해주세요.`);
        return;
      }
    }

    submit.mutate(form);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-[18px] text-black font-bold mb-2">로그인이 필요합니다</h2>
            <Button size="sm" onClick={() => router.push('/login?redirect=/mypage/onboarding')}>
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const hasCompanyDepartments = (status?.companyDepartments?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-[24px] text-black font-normal mb-2">회원정보 등록</h1>
          <p className="text-[14px] text-black font-normal">
            서비스 이용 전에 아래 정보를 입력해주세요. 모두 채우셔야 마이페이지를 이용할 수 있습니다.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. 기본 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[18px] text-black font-bold flex items-center gap-1.5">
                <User className="h-5 w-5 text-primary" />
                기본 정보
              </CardTitle>
              <CardDescription className="text-[14px] text-black font-normal">
                본인 또는 대표자 명의로 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">
                  이름/상호명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  placeholder="홍길동 또는 (주)홍길동스튜디오"
                  className="text-[14px]"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">
                  휴대전화 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: formatPhone(e.target.value) })}
                  placeholder="010-1234-5678"
                  className="text-[14px]"
                  inputMode="tel"
                  maxLength={13}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. 주소 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[18px] text-black font-bold flex items-center gap-1.5">
                <MapPin className="h-5 w-5 text-primary" />
                주소
              </CardTitle>
              <CardDescription className="text-[14px] text-black font-normal">
                기본 배송지로 사용됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">
                  우편번호 / 도로명주소 <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-[120px_1fr_auto] gap-2">
                  <Input
                    value={form.postalCode}
                    placeholder="우편번호"
                    readOnly
                    onClick={() => setAddressOpen(true)}
                    className="text-[14px] bg-gray-50 cursor-pointer hover:border-gray-400"
                  />
                  <Input
                    value={form.address}
                    placeholder="클릭하거나 검색 버튼을 누르세요"
                    readOnly
                    onClick={() => setAddressOpen(true)}
                    className="text-[14px] bg-gray-50 cursor-pointer hover:border-gray-400"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddressOpen(true)}
                    className="text-[14px]"
                  >
                    주소 검색
                  </Button>
                </div>
              </div>

              {addressOpen && (
                <div className="border rounded-md overflow-hidden relative">
                  <button
                    type="button"
                    title="닫기"
                    onClick={() => setAddressOpen(false)}
                    className="absolute top-1 right-1 z-10 bg-white rounded-full p-0.5 shadow hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  <div ref={embedRef} className="h-[420px]" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">상세주소</Label>
                <Input
                  value={form.addressDetail}
                  onChange={(e) => setForm({ ...form, addressDetail: e.target.value })}
                  placeholder="동/호수 등"
                  className="text-[14px]"
                  maxLength={255}
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. 비상연락처 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[18px] text-black font-bold flex items-center gap-1.5">
                <Heart className="h-5 w-5 text-primary" />
                비상연락처
              </CardTitle>
              <CardDescription className="text-[14px] text-black font-normal">
                긴급상황 발생 시 연락드릴 가족이나 지인의 연락처입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[14px] text-black font-normal">
                    이름 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.emergencyContactName}
                    onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                    placeholder="홍길동"
                    className="text-[14px]"
                    maxLength={50}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[14px] text-black font-normal">
                    관계 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.emergencyContactRelation}
                    onValueChange={(v) => setForm({ ...form, emergencyContactRelation: v })}
                  >
                    <SelectTrigger className="text-[14px]">
                      <SelectValue placeholder="관계 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATION_OPTIONS.map((rel) => (
                        <SelectItem key={rel} value={rel} className="text-[14px]">
                          {rel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">
                  전화번호 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.emergencyContactPhone}
                  onChange={(e) =>
                    setForm({ ...form, emergencyContactPhone: formatPhone(e.target.value) })
                  }
                  placeholder="010-1234-5678"
                  className="text-[14px]"
                  inputMode="tel"
                  maxLength={13}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. 소속/부서 (Employment 있는 경우만) */}
          {status?.employment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[18px] text-black font-bold flex items-center gap-1.5">
                  <Briefcase className="h-5 w-5 text-primary" />
                  소속 / 부서
                </CardTitle>
                <CardDescription className="text-[14px] text-black font-normal">
                  소속 회사: <strong>{status.employment.companyName}</strong> ·{' '}
                  가입일:{' '}
                  {new Date(status.employment.joinedAt).toLocaleDateString('ko-KR')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[14px] text-black font-normal">
                    부서 <span className="text-red-500">*</span>
                  </Label>
                  {hasCompanyDepartments ? (
                    <Select
                      value={form.department || undefined}
                      onValueChange={(v) => setForm({ ...form, department: v })}
                    >
                      <SelectTrigger className="text-[14px]">
                        <SelectValue placeholder="부서 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {status!.companyDepartments.map((d) => (
                          <SelectItem key={d.id} value={d.name} className="text-[14px]">
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      <Input
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        placeholder="예: 사진작가, 디자이너"
                        className="text-[14px]"
                        maxLength={50}
                      />
                      <p className="text-[12px] text-gray-500">
                        ※ 회사가 아직 부서를 등록하지 않아 자유 입력입니다. 회사 관리자에게 부서 등록을 요청하세요.
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="submit"
              disabled={submit.isPending}
              className="text-[14px] min-w-[140px]"
            >
              {submit.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  저장하고 시작하기
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
