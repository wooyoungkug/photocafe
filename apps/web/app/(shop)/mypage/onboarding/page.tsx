'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, User, MapPin, Heart, Briefcase, Save, AlertCircle, Mail, Lock, Pencil } from 'lucide-react';
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
import { useCheckDuplicate } from '@/hooks/use-auth';

const PROVIDER_LABEL: Record<string, string> = { naver: '네이버', kakao: '카카오', google: 'Google' };

type DupHint = { maskedLoginId: string; provider?: string | null; createdAt?: string | null };

function DuplicateWarning({ kind, hint }: { kind: '전화번호' | '이메일'; hint: DupHint }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  const loginHref = hint.provider
    ? `${apiUrl}/auth/${hint.provider}-login`
    : '/login';
  const joinedDate = hint.createdAt
    ? new Date(hint.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="mt-1 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-[13px] text-yellow-800">
      <p>이미 가입된 {kind}입니다.</p>
      {hint.provider ? (
        <p>
          기존 계정: <strong>{PROVIDER_LABEL[hint.provider] || hint.provider}</strong> 소셜 로그인으로 가입 ({hint.maskedLoginId})
          {joinedDate && <span className="text-yellow-600"> · 가입일 {joinedDate}</span>}
        </p>
      ) : (
        <p>
          기존 계정: <strong>{hint.maskedLoginId}</strong> 아이디로 가입되어 있습니다.
          {joinedDate && <span className="text-yellow-600"> · 가입일 {joinedDate}</span>}
        </p>
      )}
      <p>
        <a href={loginHref} className="underline text-blue-700">기존 계정으로 로그인하기</a>
        {!hint.provider && (
          <>
            {' · '}
            <a href="/forgot-password" className="underline text-blue-700">비밀번호 찾기</a>
          </>
        )}
      </p>
    </div>
  );
}

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

const SIGNUP_PURPOSE_OPTIONS = [
  '본식앨범 제작',
  '리허설앨범 제작',
  '졸업앨범 제작',
  '액자 제작',
  '인디고출력의뢰',
  '잉크젯출력의뢰',
  '기타',
];

function isFakeProviderEmail(email: string, oauthProvider: string | null): boolean {
  if (!oauthProvider) return false;
  if (/^kakao_[a-z0-9_-]+@kakao\.com$/i.test(email)) return true;
  if (/^naver_[a-z0-9_-]+@naver\.com$/i.test(email)) return true;
  if (/^google_[a-z0-9_-]+@gmail\.com$/i.test(email)) return true;
  return false;
}

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
    email: string;
    contactEmail: string;
    oauthProvider: string | null;
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
    acquisitionChannel: '',
    acquisitionChannelNote: '',
    contactEmail: '',
    signupPurpose: '',
    signupPurposeNote: '',
  });
  // 소셜 로그인에서 넘어온 값은 잠금 표시 — '수정' 버튼으로 해제
  const [nameLocked, setNameLocked] = useState(true);
  const [mobileLocked, setMobileLocked] = useState(true);
  const [addressOpen, setAddressOpen] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mobileDupHint, setMobileDupHint] = useState<DupHint | null>(null);
  const [emailDupHint, setEmailDupHint] = useState<DupHint | null>(null);
  const checkDuplicate = useCheckDuplicate();
  const embedRef = useRef<HTMLDivElement>(null);

  const handleDuplicateBlur = async (field: 'mobile' | 'email', value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      if (field === 'mobile') setMobileDupHint(null);
      else setEmailDupHint(null);
      return;
    }
    try {
      const res = await checkDuplicate.mutateAsync({ field, value: trimmed });
      const hint = res?.exists && res.hint ? res.hint : null;
      if (field === 'mobile') setMobileDupHint(hint);
      else setEmailDupHint(hint);
    } catch {
      // 중복 확인 실패 시 경고를 표시하지 않음 (가입 흐름 방해 방지)
      if (field === 'mobile') setMobileDupHint(null);
      else setEmailDupHint(null);
    }
  };

  // 필드별 ref (스크롤 + 포커스용)
  const clientNameRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const contactEmailRef = useRef<HTMLInputElement>(null);
  const acquisitionChannelRef = useRef<HTMLDivElement>(null);
  const addressAreaRef = useRef<HTMLDivElement>(null);
  const departmentRef = useRef<HTMLDivElement>(null);

  const scrollToField = (ref: React.RefObject<HTMLElement | null>) => {
    if (!ref.current) return;
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const input = ref.current.querySelector('input,button,[tabindex]') as HTMLElement | null;
    setTimeout(() => input?.focus(), 300);
  };

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
    const seededName = status.profile.clientName || user?.name || '';
    const seededMobile = status.profile.mobile || user?.mobile || '';
    // 소셜에서 넘어온 값이 있으면 잠금 상태로 시작
    setNameLocked(!!seededName);
    setMobileLocked(!!seededMobile);
    setForm({
      clientName: seededName,
      mobile: seededMobile,
      postalCode: status.profile.postalCode ?? '',
      address: status.profile.address ?? '',
      addressDetail: status.profile.addressDetail ?? '',
      emergencyContactName: status.profile.emergencyContactName ?? '',
      emergencyContactPhone: status.profile.emergencyContactPhone ?? '',
      emergencyContactRelation: status.profile.emergencyContactRelation ?? '',
      department: status.employment?.department ?? '',
      acquisitionChannel: (status.profile as any).acquisitionChannel ?? '',
      acquisitionChannelNote: (status.profile as any).acquisitionChannelNote ?? '',
      contactEmail: status.profile.contactEmail ?? '',
      signupPurpose: (status.profile as any).signupPurpose ?? '',
      signupPurposeNote: (status.profile as any).signupPurposeNote ?? '',
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
      // 빈 문자열 optional 필드는 전송 제외 (API @IsEmail 등 검증 오류 방지)
      const body = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== ''),
      );
      return api.patch('/clients/me/onboarding', body);
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

  const needsContactEmail = !!status && isFakeProviderEmail(status.profile.email, status.profile.oauthProvider);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mobileDupHint) {
      setFieldErrors((p) => ({ ...p, mobile: '이미 가입된 전화번호입니다. 위 안내를 확인해 주세요.' }));
      scrollToField(mobileRef as React.RefObject<HTMLElement>);
      return;
    }
    if (emailDupHint) {
      setFieldErrors((p) => ({ ...p, contactEmail: '이미 가입된 이메일입니다. 위 안내를 확인해 주세요.' }));
      scrollToField(contactEmailRef as React.RefObject<HTMLElement>);
      return;
    }

    const errs: Record<string, string> = {};

    if (!form.clientName?.trim()) errs.clientName = '이름/상호명을 입력해주세요.';
    if (!form.mobile?.trim()) errs.mobile = '휴대전화를 입력해주세요.';
    if (needsContactEmail) {
      if (!form.contactEmail.trim()) errs.contactEmail = '이메일 주소를 입력해주세요.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim()))
        errs.contactEmail = '올바른 이메일 형식을 입력해주세요.';
    }
    if (!form.acquisitionChannel?.trim()) errs.acquisitionChannel = '가입경로를 선택해주세요.';
    if (!form.address?.trim()) errs.address = '주소를 입력해주세요.';
    if (status?.employment && !form.department?.trim()) errs.department = '부서를 입력해주세요.';

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      // 첫 번째 오류 필드로 스크롤 + 포커스
      const refMap: Record<string, React.RefObject<HTMLElement | null>> = {
        clientName: clientNameRef as React.RefObject<HTMLElement>,
        mobile: mobileRef as React.RefObject<HTMLElement>,
        contactEmail: contactEmailRef as React.RefObject<HTMLElement>,
        acquisitionChannel: acquisitionChannelRef as React.RefObject<HTMLElement>,
        address: addressAreaRef as React.RefObject<HTMLElement>,
        department: departmentRef as React.RefObject<HTMLElement>,
      };
      const firstKey = Object.keys(errs)[0];
      scrollToField(refMap[firstKey]);
      return;
    }

    setFieldErrors({});
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

        {error && Object.keys(fieldErrors).every(k => !fieldErrors[k]) && (
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
                <Label className="text-[14px] text-black font-normal flex items-center gap-2">
                  이름/상호명 <span className="text-red-500">*</span>
                  {nameLocked && form.clientName && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-normal text-gray-400">
                      <Lock className="h-3 w-3" /> 소셜 계정 정보
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    ref={clientNameRef}
                    value={form.clientName}
                    onChange={(e) => { setForm({ ...form, clientName: e.target.value }); if (fieldErrors.clientName) setFieldErrors(p => ({ ...p, clientName: '' })); }}
                    readOnly={nameLocked && !!form.clientName}
                    placeholder="홍길동 또는 (주)홍길동스튜디오"
                    className={`text-[14px] ${nameLocked && form.clientName ? 'bg-gray-50 text-gray-600 pr-16 cursor-default' : ''} ${fieldErrors.clientName ? 'border-red-500 ring-1 ring-red-400' : ''}`}
                    maxLength={100}
                  />
                  {nameLocked && form.clientName && (
                    <button
                      type="button"
                      onClick={() => { setNameLocked(false); setTimeout(() => clientNameRef.current?.focus(), 0); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
                    >
                      <Pencil className="h-3 w-3" /> 수정
                    </button>
                  )}
                </div>
                {fieldErrors.clientName && <p className="text-[12px] text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.clientName}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal flex items-center gap-2">
                  휴대전화 <span className="text-red-500">*</span>
                  {mobileLocked && form.mobile && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-normal text-gray-400">
                      <Lock className="h-3 w-3" /> 소셜 계정 정보
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    ref={mobileRef}
                    value={form.mobile}
                    onChange={(e) => { setForm({ ...form, mobile: formatPhone(e.target.value) }); if (fieldErrors.mobile) setFieldErrors(p => ({ ...p, mobile: '' })); if (mobileDupHint) setMobileDupHint(null); }}
                    onBlur={(e) => { if (!(mobileLocked && form.mobile)) handleDuplicateBlur('mobile', e.target.value); }}
                    readOnly={mobileLocked && !!form.mobile}
                    placeholder="010-1234-5678"
                    className={`text-[14px] ${mobileLocked && form.mobile ? 'bg-gray-50 text-gray-600 pr-16 cursor-default' : ''} ${fieldErrors.mobile ? 'border-red-500 ring-1 ring-red-400' : ''}`}
                    inputMode="tel"
                    maxLength={13}
                  />
                  {mobileLocked && form.mobile && (
                    <button
                      type="button"
                      onClick={() => { setMobileLocked(false); setTimeout(() => mobileRef.current?.focus(), 0); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
                    >
                      <Pencil className="h-3 w-3" /> 수정
                    </button>
                  )}
                </div>
                {fieldErrors.mobile && <p className="text-[12px] text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.mobile}</p>}
                {mobileDupHint && <DuplicateWarning kind="전화번호" hint={mobileDupHint} />}
              </div>

              {/* 연락 이메일 — 항상 표시. 소셜 로그인 시 카카오·네이버 등이 가짜 이메일을
                  자동 발급하는 경우가 있어 실제 연락받을 이메일을 별도로 받아둔다.
                  가짜 패턴이 감지되면 필수, 그 외에는 선택. */}
              <div className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-primary" />
                  {needsContactEmail ? (
                    <>이메일 주소 <span className="text-red-500">*</span></>
                  ) : (
                    <>연락 이메일 <span className="text-gray-400 text-[12px] font-normal">(선택)</span></>
                  )}
                </Label>
                <Input
                  ref={contactEmailRef}
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => { setForm({ ...form, contactEmail: e.target.value }); if (fieldErrors.contactEmail) setFieldErrors(p => ({ ...p, contactEmail: '' })); if (emailDupHint) setEmailDupHint(null); }}
                  onBlur={(e) => handleDuplicateBlur('email', e.target.value)}
                  placeholder={needsContactEmail ? '실제 이메일 주소를 입력해주세요' : '주문·견적 알림을 받을 이메일 (예: hong@example.com)'}
                  className={`text-[14px] ${fieldErrors.contactEmail ? 'border-red-500 ring-1 ring-red-400' : ''}`}
                  maxLength={200}
                />
                {fieldErrors.contactEmail ? (
                  <p className="text-[12px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{fieldErrors.contactEmail}
                  </p>
                ) : needsContactEmail ? (
                  <p className="text-[12px] text-gray-500">
                    소셜 로그인 계정 이메일이 임시 발급된 주소로 확인됩니다. 실제 받으실 수 있는 이메일을 입력해 주세요.
                  </p>
                ) : (
                  <p className="text-[12px] text-gray-500">
                    카카오·네이버 로그인은 임시 이메일이 저장될 수 있어, 주문·견적 등 안내를 받으실 실제 이메일을 별도로 입력해 두시면 좋습니다.
                  </p>
                )}
                {emailDupHint && <DuplicateWarning kind="이메일" hint={emailDupHint} />}
              </div>

              <div ref={acquisitionChannelRef} className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">
                  가입경로 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.acquisitionChannel || ''}
                  onValueChange={(v) => {
                    setForm({ ...form, acquisitionChannel: v, acquisitionChannelNote: v !== 'etc' ? '' : form.acquisitionChannelNote });
                    if (fieldErrors.acquisitionChannel) setFieldErrors(p => ({ ...p, acquisitionChannel: '' }));
                  }}
                >
                  <SelectTrigger className={`text-[14px] ${fieldErrors.acquisitionChannel ? 'border-red-500 ring-1 ring-red-400' : ''}`}>
                    <SelectValue placeholder="어떻게 알게 되셨나요?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct" className="text-[14px]">직접 가입</SelectItem>
                    <SelectItem value="referral" className="text-[14px]">지인 소개</SelectItem>
                    <SelectItem value="naver_search" className="text-[14px]">네이버 검색</SelectItem>
                    <SelectItem value="google_search" className="text-[14px]">구글 검색</SelectItem>
                    <SelectItem value="exhibition" className="text-[14px]">전시회 / 박람회</SelectItem>
                    <SelectItem value="sns" className="text-[14px]">SNS (인스타그램·유튜브 등)</SelectItem>
                    <SelectItem value="etc" className="text-[14px]">기타</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.acquisitionChannel && <p className="text-[12px] text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.acquisitionChannel}</p>}
                {form.acquisitionChannel === 'etc' && (
                  <Input
                    value={form.acquisitionChannelNote}
                    onChange={(e) => setForm({ ...form, acquisitionChannelNote: e.target.value })}
                    placeholder="어떻게 알게 되셨는지 알려주세요"
                    className="text-[14px]"
                    maxLength={200}
                  />
                )}
              </div>

              {/* 가입목적 */}
              <div className="space-y-2">
                <Label className="text-[14px] text-black font-normal">
                  가입목적 <span className="text-gray-400 text-[12px] font-normal">(복수 선택 가능)</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {SIGNUP_PURPOSE_OPTIONS.map((opt) => {
                    const selected = form.signupPurpose
                      ? form.signupPurpose.split(',').map((s) => s.trim()).includes(opt)
                      : false;
                    return (
                      <label
                        key={opt}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-[14px] transition-colors ${
                          selected
                            ? 'bg-primary/10 border-primary text-primary font-medium'
                            : 'border-gray-200 hover:border-gray-300 text-black'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 accent-primary"
                          checked={selected}
                          onChange={() => {
                            const current = form.signupPurpose
                              ? form.signupPurpose.split(',').map((s) => s.trim()).filter(Boolean)
                              : [];
                            const next = selected
                              ? current.filter((v) => v !== opt)
                              : [...current, opt];
                            setForm({
                              ...form,
                              signupPurpose: next.join(','),
                              signupPurposeNote: next.includes('기타') ? form.signupPurposeNote : '',
                            });
                          }}
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
                {form.signupPurpose.split(',').map((s) => s.trim()).includes('기타') && (
                  <Input
                    value={form.signupPurposeNote}
                    onChange={(e) => setForm({ ...form, signupPurposeNote: e.target.value })}
                    placeholder="기타 가입목적을 입력해주세요"
                    className="text-[14px]"
                    maxLength={200}
                    autoFocus
                  />
                )}
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
              <div ref={addressAreaRef} className="space-y-1.5">
                <Label className="text-[14px] text-black font-normal">
                  우편번호 / 도로명주소 <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-[120px_1fr_auto] gap-2">
                  <Input
                    value={form.postalCode}
                    placeholder="우편번호"
                    readOnly
                    onClick={() => { setAddressOpen(true); if (fieldErrors.address) setFieldErrors(p => ({ ...p, address: '' })); }}
                    className={`text-[14px] bg-gray-50 cursor-pointer hover:border-gray-400 ${fieldErrors.address ? 'border-red-500 ring-1 ring-red-400' : ''}`}
                  />
                  <Input
                    value={form.address}
                    placeholder="클릭하거나 검색 버튼을 누르세요"
                    readOnly
                    onClick={() => { setAddressOpen(true); if (fieldErrors.address) setFieldErrors(p => ({ ...p, address: '' })); }}
                    className={`text-[14px] bg-gray-50 cursor-pointer hover:border-gray-400 ${fieldErrors.address ? 'border-red-500 ring-1 ring-red-400' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setAddressOpen(true); if (fieldErrors.address) setFieldErrors(p => ({ ...p, address: '' })); }}
                    className={`text-[14px] ${fieldErrors.address ? 'border-red-500 text-red-600' : ''}`}
                  >
                    주소 검색
                  </Button>
                </div>
                {fieldErrors.address && <p className="text-[12px] text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.address}</p>}
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

          {/* 3. 비상연락처 (선택) */}
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-[18px] text-black font-bold flex items-center gap-1.5">
                <Heart className="h-5 w-5 text-primary" />
                담당자 연락처
                <span className="text-[13px] font-normal text-gray-400 ml-1">(선택)</span>
              </CardTitle>
              <CardDescription className="text-[14px] text-black font-normal leading-relaxed">
                촬영작가·편집작가 섭외 시 업무 조율에 활용됩니다.<br />
                <span className="text-gray-500 text-[13px]">
                  입력하시면 빠른 일정 조율과 원활한 커뮤니케이션에 도움이 됩니다. 언제든지 마이페이지에서 수정할 수 있습니다.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[14px] text-black font-normal">이름</Label>
                  <Input
                    value={form.emergencyContactName}
                    onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                    placeholder="담당자 이름 (예: 김미영)"
                    className="text-[14px]"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[14px] text-black font-normal">관계</Label>
                  <Select
                    value={form.emergencyContactRelation}
                    onValueChange={(v) => setForm({ ...form, emergencyContactRelation: v })}
                  >
                    <SelectTrigger className="text-[14px]">
                      <SelectValue placeholder="관계 선택 (예: 직장동료)" />
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
                <Label className="text-[14px] text-black font-normal">연락처</Label>
                <Input
                  value={form.emergencyContactPhone}
                  onChange={(e) =>
                    setForm({ ...form, emergencyContactPhone: formatPhone(e.target.value) })
                  }
                  placeholder="010-0000-0000"
                  className="text-[14px]"
                  inputMode="tel"
                  maxLength={13}
                />
              </div>
              <p className="text-[12px] text-gray-400">
                📌 입력하신 연락처는 작가 섭외 및 촬영 일정 조율 목적으로만 활용되며, 외부에 공개되지 않습니다.
              </p>
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
                <div ref={departmentRef} className="space-y-1.5">
                  <Label className="text-[14px] text-black font-normal">
                    부서 <span className="text-red-500">*</span>
                  </Label>
                  {hasCompanyDepartments ? (
                    <Select
                      value={form.department || undefined}
                      onValueChange={(v) => { setForm({ ...form, department: v }); if (fieldErrors.department) setFieldErrors(p => ({ ...p, department: '' })); }}
                    >
                      <SelectTrigger className={`text-[14px] ${fieldErrors.department ? 'border-red-500 ring-1 ring-red-400' : ''}`}>
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
                        onChange={(e) => { setForm({ ...form, department: e.target.value }); if (fieldErrors.department) setFieldErrors(p => ({ ...p, department: '' })); }}
                        placeholder="예: 사진작가, 디자이너"
                        className={`text-[14px] ${fieldErrors.department ? 'border-red-500 ring-1 ring-red-400' : ''}`}
                        maxLength={50}
                      />
                      <p className="text-[12px] text-gray-500">
                        ※ 회사가 아직 부서를 등록하지 않아 자유 입력입니다. 회사 관리자에게 부서 등록을 요청하세요.
                      </p>
                    </>
                  )}
                  {fieldErrors.department && <p className="text-[12px] text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.department}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="submit"
              disabled={submit.isPending || !!mobileDupHint || !!emailDupHint}
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
