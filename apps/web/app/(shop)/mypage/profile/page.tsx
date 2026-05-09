'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User as UserIcon, AlertCircle, CheckCircle, Edit, Save, X, Bell, LogOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AddressSearch } from '@/components/address-search';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 전화번호 자동 하이픈 포맷
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

const SMS_STAGES = [
  { value: 'receipt_completed', label: '접수완료', description: '주문이 접수 확인됐을 때' },
  { value: 'in_production', label: '생산진행', description: '제작이 시작됐을 때' },
  { value: 'ready_for_shipping', label: '배송준비', description: '배송 준비가 완료됐을 때' },
  { value: 'shipped', label: '배송완료', description: '배송이 출고됐을 때' },
];

// 읽기 전용 필드값 표시 컴포넌트
function FieldValue({ value }: { value: string }) {
  return (
    <p className="text-[14px] font-normal py-1.5 px-2.5 bg-gray-50 rounded border border-gray-100 min-h-[32px] flex items-center">
      {value || '-'}
    </p>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const isEmployee = user?.type === 'employee';

  const [isEditMode, setIsEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    clientName: '',
    email: '',
    mobile: '',
    phone: '',
    postalCode: '',
    address: '',
    addressDetail: '',
    businessNumber: '',
    representative: '',
    contactPerson: '',
    fileRetentionDays: 90 as number,
    thumbnailRetentionMonths: 6 as number,
    acquisitionChannel: '',
    acquisitionChannelNote: '',
    practicalManagerName: '',
    practicalManagerPhone: '',
    approvalManagerName: '',
    approvalManagerPhone: '',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [smsStages, setSmsStages] = useState<string[]>([]);
  const [notificationChannel, setNotificationChannel] = useState<'sms' | 'kakao'>('sms');
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [withdrawConfirmText, setWithdrawConfirmText] = useState('');
  const [isApartmentAddress, setIsApartmentAddress] = useState(false);
  const [addressEmbedOpen, setAddressEmbedOpen] = useState(false);

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID가 없습니다');
      return await api.get<any>(`/clients/${user.id}`);
    },
    enabled: isAuthenticated && !!user?.id,
  });

  useEffect(() => {
    if (profile?.smsNotificationStages) {
      setSmsStages(profile.smsNotificationStages);
    }
    if (profile?.notificationChannel) {
      setNotificationChannel(profile.notificationChannel as 'sms' | 'kakao');
    }
  }, [profile]);

  // profile 데이터가 로드/변경되면 편집용 상태에 동기화
  useEffect(() => {
    if (profile) {
      setProfileData({
        clientName: profile.clientName || '',
        email: profile.email || '',
        mobile: profile.mobile || '',
        phone: profile.phone || '',
        postalCode: profile.postalCode || '',
        address: profile.address || '',
        addressDetail: profile.addressDetail || '',
        businessNumber: profile.businessNumber || '',
        representative: profile.representative || '',
        contactPerson: profile.contactPerson || '',
        fileRetentionDays: profile.fileRetentionDays ?? 90,
        thumbnailRetentionMonths: profile.thumbnailRetentionMonths ?? 6,
        acquisitionChannel: profile.acquisitionChannel || '',
        acquisitionChannelNote: profile.acquisitionChannelNote || '',
        practicalManagerName: profile.practicalManagerName || '',
        practicalManagerPhone: profile.practicalManagerPhone || '',
        approvalManagerName: profile.approvalManagerName || '',
        approvalManagerPhone: profile.approvalManagerPhone || '',
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      return await api.put<any>(`/clients/${user?.id}`, data);
    },
    onSuccess: (data) => {
      setSuccess('회원정보가 성공적으로 수정되었습니다.');
      setError('');
      if (data) updateUser(data);
      setIsEditMode(false);
      setIsApartmentAddress(false);
      setAddressEmbedOpen(false);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error: any) => {
      setError(error.message || '회원정보 수정에 실패했습니다.');
      setSuccess('');
    },
  });

  const updateSmsMutation = useMutation({
    mutationFn: async (data: { smsNotificationStages: string[]; notificationChannel: string }) => {
      return await api.put<any>(`/clients/${user?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const handleSmsToggle = (stage: string, checked: boolean) => {
    const next = checked ? [...smsStages, stage] : smsStages.filter((s) => s !== stage);
    setSmsStages(next);
    updateSmsMutation.mutate({ smsNotificationStages: next, notificationChannel });
  };

  const handleChannelChange = (channel: 'sms' | 'kakao') => {
    setNotificationChannel(channel);
    updateSmsMutation.mutate({ smsNotificationStages: smsStages, notificationChannel: channel });
  };

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await api.patch('/auth/change-password', data);
    },
    onSuccess: () => {
      setSuccess('비밀번호가 성공적으로 변경되었습니다.');
      setError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error: any) => {
      setError(error.message || '비밀번호 변경에 실패했습니다.');
      setSuccess('');
    },
  });

  const { logout } = useAuthStore();
  const withdrawMutation = useMutation({
    mutationFn: async () => {
      return await api.delete('/auth/me');
    },
    onSuccess: () => {
      logout();
      router.push('/');
    },
    onError: (error: any) => {
      setError(error.message || '회원 탈퇴에 실패했습니다.');
    },
  });

  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const leaveMutation = useMutation({
    mutationFn: async () => {
      return await api.delete('/employments/me');
    },
    onSuccess: () => {
      logout();
      router.push('/login');
    },
    onError: (error: any) => {
      setError(error.message || '소속 해제에 실패했습니다.');
    },
  });

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!profileData.clientName || !profileData.email) {
      setError('이름과 이메일은 필수 입력 항목입니다.');
      return;
    }
    if (!isEmployee && !profileData.address) {
      setError('주소는 필수 입력 항목입니다. 주소 검색으로 입력해 주세요.');
      return;
    }
    if (!isEmployee && isApartmentAddress && !profileData.addressDetail.trim()) {
      setError('아파트·연립주택은 동, 호수를 필수로 입력해야 합니다.');
      return;
    }
    // 직원은 개인 기본 정보만 저장 (주소/사업자 정보 제외)
    const dataToSave = isEmployee
      ? { clientName: profileData.clientName, email: profileData.email, mobile: profileData.mobile, phone: profileData.phone }
      : profileData;
    updateProfileMutation.mutate(dataToSave as typeof profileData);
  };

  const handleCancelEdit = () => {
    if (profile) {
      setProfileData({
        clientName: profile.clientName || '',
        email: profile.email || '',
        mobile: profile.mobile || '',
        phone: profile.phone || '',
        postalCode: profile.postalCode || '',
        address: profile.address || '',
        addressDetail: profile.addressDetail || '',
        businessNumber: profile.businessNumber || '',
        representative: profile.representative || '',
        contactPerson: profile.contactPerson || '',
        fileRetentionDays: profile.fileRetentionDays ?? 90,
        thumbnailRetentionMonths: profile.thumbnailRetentionMonths ?? 6,
        acquisitionChannel: profile.acquisitionChannel || '',
        acquisitionChannelNote: profile.acquisitionChannelNote || '',
        practicalManagerName: profile.practicalManagerName || '',
        practicalManagerPhone: profile.practicalManagerPhone || '',
        approvalManagerName: profile.approvalManagerName || '',
        approvalManagerPhone: profile.approvalManagerPhone || '',
      });
    }
    setIsEditMode(false);
    setIsApartmentAddress(false);
    setAddressEmbedOpen(false);
    setError('');
    setSuccess('');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    if (newPassword.length < 8) {
      setError('새 비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-[13px] font-normal text-gray-600 mb-4">로그인이 필요한 서비스입니다.</p>
            <Button size="sm" onClick={() => router.push('/login?redirect=/mypage/profile')}>
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5">
              <div className="h-5 bg-gray-200 rounded w-1/4 mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const inputCls = "h-8 text-[14px] font-normal";

  return (
    <div className="space-y-4 text-[14px] font-normal">
      <Breadcrumb items={[
        { label: '마이페이지', href: '/mypage/orders' },
        { label: '회원정보' },
      ]} />

      {/* 알림 메시지 */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-[14px]">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200 py-2">
          <CheckCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-[14px]">{success}</AlertDescription>
        </Alert>
      )}

      {/* 회원 정보 카드 */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[18px] text-black font-bold">
                <UserIcon className="h-4 w-4" />
                {isEmployee ? '개인 정보' : '회원 정보'}
              </CardTitle>
              <CardDescription className="text-[14px] mt-0.5">
                {isEditMode ? '정보를 수정하세요' : isEmployee ? '개인 정보를 확인하고 수정할 수 있습니다' : '현재 회원님의 등록된 정보입니다'}
              </CardDescription>
            </div>
            {!isEditMode && (
              <Button
                onClick={() => { setIsEditMode(true); if (!isEmployee) setAddressEmbedOpen(true); }}
                variant="outline" size="sm" className="h-7 text-[14px] px-3"
              >
                <Edit className="h-3 w-3 mr-1" />
                수정
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            {/* 기본 정보 */}
            <div className="space-y-3">
              <h3 className="text-[14px] font-medium text-gray-500 tracking-wide">기본 정보</h3>
              <div className="grid md:grid-cols-3 gap-x-6 gap-y-3">
                <div className="space-y-1">
                  <Label className="text-[14px] font-normal text-gray-600">회원코드</Label>
                  <FieldValue value={profile?.clientCode || ''} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="clientName" className="text-[14px] font-normal text-gray-600">
                    이름/상호명 <span className="text-red-500">*</span>
                  </Label>
                  {isEditMode ? (
                    <Input id="clientName" className={inputCls} value={profileData.clientName}
                      onChange={(e) => setProfileData({ ...profileData, clientName: e.target.value })} required />
                  ) : (
                    <FieldValue value={profile?.clientName || ''} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-[14px] font-normal text-gray-600">
                    이메일 <span className="text-red-500">*</span>
                  </Label>
                  {isEditMode ? (
                    <Input id="email" type="email" className={inputCls} value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} required />
                  ) : (
                    <FieldValue value={profile?.email || ''} />
                  )}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-3">
                <div className="space-y-1">
                  <Label htmlFor="mobile" className="text-[14px] font-normal text-gray-600">휴대전화</Label>
                  {isEditMode ? (
                    <Input id="mobile" className={inputCls} value={profileData.mobile}
                      onChange={(e) => setProfileData({ ...profileData, mobile: formatPhone(e.target.value) })}
                      placeholder="010-0000-0000" maxLength={13} />
                  ) : (
                    <FieldValue value={formatPhone(profile?.mobile || '')} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-[14px] font-normal text-gray-600">전화번호</Label>
                  {isEditMode ? (
                    <Input id="phone" className={inputCls} value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: formatPhone(e.target.value) })}
                      placeholder="02-0000-0000" maxLength={13} />
                  ) : (
                    <FieldValue value={formatPhone(profile?.phone || '')} />
                  )}
                </div>
              </div>
              {!isEmployee && (
                <div className="grid md:grid-cols-3 gap-x-6 gap-y-3">
                  <div className="space-y-1">
                    <Label className="text-[14px] font-normal text-gray-600">가입경로</Label>
                    {isEditMode ? (
                      <div className="space-y-1.5">
                        <Select
                          value={profileData.acquisitionChannel || 'none'}
                          onValueChange={(v) => setProfileData({ ...profileData, acquisitionChannel: v === 'none' ? '' : v, acquisitionChannelNote: v !== 'etc' ? '' : profileData.acquisitionChannelNote })}
                        >
                          <SelectTrigger className={inputCls}>
                            <SelectValue placeholder="선택 안함" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">선택 안함</SelectItem>
                            <SelectItem value="direct">직접가입</SelectItem>
                            <SelectItem value="referral">지인소개</SelectItem>
                            <SelectItem value="naver_search">네이버 검색</SelectItem>
                            <SelectItem value="google_search">구글 검색</SelectItem>
                            <SelectItem value="exhibition">전시회</SelectItem>
                            <SelectItem value="sns">SNS</SelectItem>
                            <SelectItem value="etc">기타</SelectItem>
                          </SelectContent>
                        </Select>
                        {profileData.acquisitionChannel === 'etc' && (
                          <Input
                            className={inputCls}
                            value={profileData.acquisitionChannelNote}
                            onChange={(e) => setProfileData({ ...profileData, acquisitionChannelNote: e.target.value })}
                            placeholder="기타 내용을 입력해 주세요"
                          />
                        )}
                      </div>
                    ) : (
                      <FieldValue value={
                        profile?.acquisitionChannel === 'etc'
                          ? `기타${profile?.acquisitionChannelNote ? `: ${profile.acquisitionChannelNote}` : ''}`
                          : ({ direct: '직접가입', referral: '지인소개', naver_search: '네이버 검색', google_search: '구글 검색', exhibition: '전시회', sns: 'SNS' } as Record<string, string>)[profile?.acquisitionChannel || ''] || '-'
                      } />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[14px] font-normal text-gray-600">
                      원본 데이터 보관기간 <span className="text-red-500">*</span>
                    </Label>
                    {isEditMode ? (
                      <Select
                        value={String(profileData.fileRetentionDays ?? 90)}
                        onValueChange={(v) => setProfileData({ ...profileData, fileRetentionDays: parseInt(v) })}
                      >
                        <SelectTrigger className={inputCls}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">1주일 (7일)</SelectItem>
                          <SelectItem value="30">1개월 (30일)</SelectItem>
                          <SelectItem value="60">2개월 (60일)</SelectItem>
                          <SelectItem value="90">3개월 (90일)</SelectItem>
                          <SelectItem value="180">6개월 (180일)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <FieldValue value={
                        ({ 7: '1주일 (7일)', 30: '1개월 (30일)', 60: '2개월 (60일)', 90: '3개월 (90일)', 180: '6개월 (180일)' } as Record<number, string>)[profile?.fileRetentionDays ?? 90] || '3개월 (90일)'
                      } />
                    )}
                    <p className="text-[12px] text-gray-400">제품 출고일로부터 원본 파일 보관 기간</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[14px] font-normal text-gray-600">
                      썸네일 보관기간 <span className="text-red-500">*</span>
                    </Label>
                    {isEditMode ? (
                      <Select
                        value={String(profileData.thumbnailRetentionMonths ?? 6)}
                        onValueChange={(v) => setProfileData({ ...profileData, thumbnailRetentionMonths: parseInt(v) })}
                      >
                        <SelectTrigger className={inputCls}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6개월 (180일)</SelectItem>
                          <SelectItem value="12">1년 (12개월)</SelectItem>
                          <SelectItem value="24">2년 (24개월)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <FieldValue value={
                        ({ 6: '6개월 (180일)', 12: '1년 (12개월)', 24: '2년 (24개월)' } as Record<number, string>)[profile?.thumbnailRetentionMonths ?? 6] || '6개월 (180일)'
                      } />
                    )}
                    <p className="text-[12px] text-gray-400">제품 출고일로부터 썸네일 파일 보관 기간</p>
                  </div>
                </div>
              )}
            </div>

            {!isEmployee && <Separator />}

            {/* 주소 정보 - 직원은 비표시 */}
            {!isEmployee && <div className="space-y-3">
              <h3 className="text-[14px] font-medium text-gray-500 tracking-wide">
                주소 정보 <span className="text-red-500">*</span>
              </h3>
              {isEditMode && (
                <AddressSearch
                  inline={true}
                  isOpen={addressEmbedOpen}
                  onOpenChange={setAddressEmbedOpen}
                  size="sm"
                  className="h-8 text-[14px]"
                  onComplete={(data) => {
                    const needsDetail = data.isApartment || (!!data.buildingCode && !!data.buildingName);
                    setIsApartmentAddress(needsDetail);
                    setProfileData({
                      ...profileData,
                      postalCode: data.postalCode,
                      address: data.address,
                      addressDetail: needsDetail ? '' : profileData.addressDetail,
                    });
                  }}
                />
              )}
              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-x-4 gap-y-3">
                <div className="space-y-1">
                  <Label htmlFor="postalCode" className="text-[14px] font-normal text-gray-600">우편번호</Label>
                  {isEditMode ? (
                    <Input id="postalCode" className={inputCls} value={profileData.postalCode} readOnly
                      placeholder="주소 검색을 이용하세요" />
                  ) : (
                    <FieldValue value={profile?.postalCode || ''} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="address" className="text-[14px] font-normal text-gray-600">주소</Label>
                  {isEditMode ? (
                    <Input id="address" className={inputCls} value={profileData.address} readOnly
                      placeholder="주소 검색을 이용하세요" />
                  ) : (
                    <FieldValue value={profile?.address || ''} />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="addressDetail" className="text-[14px] font-normal text-gray-600">
                  상세주소
                  {isEditMode && isApartmentAddress && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {isEditMode ? (
                  <>
                    <Input id="addressDetail" className={inputCls} value={profileData.addressDetail}
                      onChange={(e) => setProfileData({ ...profileData, addressDetail: e.target.value })}
                      placeholder={isApartmentAddress ? '동, 호수를 입력하세요 (예: 101동 1502호)' : '상세주소를 입력하세요'} />
                    {isApartmentAddress && (
                      <p className="text-[12px] text-orange-500">아파트·연립주택은 동, 호수 입력이 필수입니다.</p>
                    )}
                  </>
                ) : (
                  <FieldValue value={profile?.addressDetail || ''} />
                )}
              </div>
            </div>}

            {!isEmployee && <Separator />}

            {/* 사업자 정보 - 직원은 비표시 */}
            {!isEmployee && <div className="space-y-3">
              <h3 className="text-[14px] font-medium text-gray-500 tracking-wide">사업자 정보 (선택)</h3>
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-3">
                <div className="space-y-1">
                  <Label htmlFor="businessNumber" className="text-[14px] font-normal text-gray-600">사업자등록번호</Label>
                  {isEditMode ? (
                    <Input id="businessNumber" className={inputCls} value={profileData.businessNumber}
                      onChange={(e) => {
                        const numbers = e.target.value.replace(/\D/g, '').slice(0, 10);
                        let formatted = numbers;
                        if (numbers.length > 5) formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
                        else if (numbers.length > 3) formatted = `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
                        setProfileData({ ...profileData, businessNumber: formatted });
                      }}
                      placeholder="000-00-00000" maxLength={12} />
                  ) : (
                    <FieldValue value={profile?.businessNumber || ''} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="representative" className="text-[14px] font-normal text-gray-600">대표자명</Label>
                  {isEditMode ? (
                    <Input id="representative" className={inputCls} value={profileData.representative}
                      onChange={(e) => setProfileData({ ...profileData, representative: e.target.value })}
                      placeholder="대표자명" />
                  ) : (
                    <FieldValue value={profile?.representative || ''} />
                  )}
                </div>
              </div>
              <div className="md:w-1/2 space-y-1">
                <Label htmlFor="contactPerson" className="text-[14px] font-normal text-gray-600">담당자</Label>
                {isEditMode ? (
                  <Input id="contactPerson" className={inputCls} value={profileData.contactPerson}
                    onChange={(e) => setProfileData({ ...profileData, contactPerson: e.target.value })}
                    placeholder="담당자명" />
                ) : (
                  <FieldValue value={profile?.contactPerson || ''} />
                )}
              </div>
            </div>}

            {!isEmployee && <Separator />}

            {/* 담당자 정보 - 직원은 비표시 */}
            {!isEmployee && <div className="space-y-3">
              <h3 className="text-[14px] font-medium text-gray-500 tracking-wide">담당자 정보 (선택)</h3>
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-3">
                  <p className="text-[13px] font-medium text-gray-700">실무담당자</p>
                  <div className="space-y-1">
                    <Label className="text-[14px] font-normal text-gray-600">이름</Label>
                    {isEditMode ? (
                      <Input className={inputCls} value={profileData.practicalManagerName}
                        onChange={(e) => setProfileData({ ...profileData, practicalManagerName: e.target.value })}
                        placeholder="실무 담당자 이름" />
                    ) : (
                      <FieldValue value={profile?.practicalManagerName || ''} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[14px] font-normal text-gray-600">연락처</Label>
                    {isEditMode ? (
                      <Input className={inputCls} value={profileData.practicalManagerPhone}
                        onChange={(e) => setProfileData({ ...profileData, practicalManagerPhone: formatPhone(e.target.value) })}
                        placeholder="010-0000-0000" maxLength={13} />
                    ) : (
                      <FieldValue value={formatPhone(profile?.practicalManagerPhone || '')} />
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[13px] font-medium text-gray-700">결재담당자</p>
                  <div className="space-y-1">
                    <Label className="text-[14px] font-normal text-gray-600">이름</Label>
                    {isEditMode ? (
                      <Input className={inputCls} value={profileData.approvalManagerName}
                        onChange={(e) => setProfileData({ ...profileData, approvalManagerName: e.target.value })}
                        placeholder="결재 담당자 이름" />
                    ) : (
                      <FieldValue value={profile?.approvalManagerName || ''} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[14px] font-normal text-gray-600">연락처</Label>
                    {isEditMode ? (
                      <Input className={inputCls} value={profileData.approvalManagerPhone}
                        onChange={(e) => setProfileData({ ...profileData, approvalManagerPhone: formatPhone(e.target.value) })}
                        placeholder="010-0000-0000" maxLength={13} />
                    ) : (
                      <FieldValue value={formatPhone(profile?.approvalManagerPhone || '')} />
                    )}
                  </div>
                </div>
              </div>
            </div>}

            {/* 버튼 */}
            {isEditMode && (
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" className="h-7 text-[14px]" onClick={handleCancelEdit}>
                  <X className="h-3 w-3 mr-1" />
                  취소
                </Button>
                <Button type="submit" size="sm" className="h-7 text-[14px]" disabled={updateProfileMutation.isPending}>
                  <Save className="h-3 w-3 mr-1" />
                  {updateProfileMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* 소속/부서/비상연락처 카드 (온보딩에서 입력한 정보) */}
      <ProfileStatusCard onEdit={() => router.push('/mypage/onboarding')} />

      {/* 공정별 문자 알림 카드 */}
      <Card>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-[18px] text-black font-bold">
              <Bell className="h-4 w-4" />
              공정별 문자 알림
            </CardTitle>
            <CardDescription className="text-[14px] mt-0.5">
              알림 받고 싶은 공정 단계를 선택해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-5">

            {/* 알림 수신 채널 */}
            <div>
              <p className="text-[14px] font-medium text-gray-700 mb-2">알림 수신 방법</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleChannelChange('sms')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[14px] font-medium transition-colors ${
                    notificationChannel === 'sms'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>📱</span> 문자(SMS)
                </button>
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-[14px] font-medium cursor-not-allowed"
                >
                  <span>💬</span> 카카오 알림톡
                  <span className="ml-1 text-[11px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">준비 중</span>
                </button>
              </div>
              <p className="text-[12px] text-gray-400 mt-1.5">카카오 알림톡은 서비스 준비 중으로 추후 이용 가능합니다.</p>
            </div>

            <Separator />

            {/* 알림 받을 공정 선택 */}
            <div>
              <p className="text-[14px] font-medium text-gray-700 mb-2">알림 받을 공정 단계</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {SMS_STAGES.map((stage) => (
                  <label
                    key={stage.value}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      id={`sms-${stage.value}`}
                      checked={smsStages.includes(stage.value)}
                      onCheckedChange={(checked) => handleSmsToggle(stage.value, !!checked)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-[14px] font-medium text-black">{stage.label}</p>
                      <p className="text-[13px] text-gray-500">{stage.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {updateSmsMutation.isPending && (
              <p className="text-[13px] text-gray-400">저장 중...</p>
            )}
            {updateSmsMutation.isSuccess && (
              <p className="text-[13px] text-green-600">저장되었습니다.</p>
            )}
          </CardContent>
        </Card>

      {/* 비밀번호 변경 카드 — 소셜 로그인 사용자는 비밀번호가 없으므로 숨김 */}
      {!profile?.oauthProvider && !user?.oauthProvider && <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="flex items-center gap-2 text-[18px] text-black font-bold">
            <Lock className="h-4 w-4" />
            비밀번호 변경
          </CardTitle>
          <CardDescription className="text-[14px] mt-0.5">
            비밀번호는 최소 8자 이상이어야 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="currentPassword" className="text-[14px] font-normal text-gray-600">
                현재 비밀번호 <span className="text-red-500">*</span>
              </Label>
              <Input id="currentPassword" type="password" className={inputCls}
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호" disabled={changePasswordMutation.isPending} />
            </div>
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-3">
              <div className="space-y-1">
                <Label htmlFor="newPassword" className="text-[14px] font-normal text-gray-600">
                  새 비밀번호 <span className="text-red-500">*</span>
                </Label>
                <Input id="newPassword" type="password" className={inputCls}
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 (최소 8자)" disabled={changePasswordMutation.isPending} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-[14px] font-normal text-gray-600">
                  새 비밀번호 확인 <span className="text-red-500">*</span>
                </Label>
                <Input id="confirmPassword" type="password" className={inputCls}
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호 확인" disabled={changePasswordMutation.isPending} />
              </div>
            </div>
            <div className="pt-1">
              <Button type="submit" size="sm" className="h-8 text-[13px]" disabled={changePasswordMutation.isPending}>
                <Lock className="h-3 w-3 mr-1" />
                {changePasswordMutation.isPending ? '변경 중...' : '비밀번호 변경'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>}

      {/* 소속 해제 / 회원 탈퇴 카드 */}
      {isEmployee ? (
        <Card className="border-orange-100">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-[18px] text-black font-bold">
              <LogOut className="h-4 w-4 text-orange-500" />
              소속 해제
            </CardTitle>
            <CardDescription className="text-[14px] mt-0.5">
              소속을 해제하면 {user?.clientName || '현재 회사'}의 직원 권한이 즉시 사라집니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {/* 권리 */}
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-[13px] text-blue-800 space-y-1">
              <p className="font-medium">귀하의 권리</p>
              <ul className="list-disc list-inside space-y-0.5 font-normal">
                <li>언제든지 소속 해제를 자유롭게 신청할 수 있습니다</li>
                <li>개인 계정(이름·이메일·비밀번호)은 해제 후에도 그대로 유지됩니다</li>
                <li>본인이 직접 등록한 개인정보는 계속 보관되며 열람·수정할 수 있습니다</li>
                <li>재소속이 필요하면 회사 관리자에게 재초대를 요청할 수 있습니다</li>
              </ul>
            </div>
            {/* 책임사항 */}
            <div className="rounded-md border border-orange-100 bg-orange-50 p-3 text-[13px] text-orange-800 space-y-1">
              <p className="font-medium">소속 해제 후 변경사항</p>
              <ul className="list-disc list-inside space-y-0.5 font-normal">
                <li>해제 즉시 해당 회사의 주문·설정·통계 메뉴 접근이 차단됩니다</li>
                <li>진행 중인 업무는 해제 전 담당자에게 인수인계해 주세요</li>
                <li>재직 중 처리한 주문·이력은 회사 기록에 보존됩니다</li>
                <li>회사 내부 정보에 대한 기밀 유지 의무는 해제 후에도 유지됩니다</li>
              </ul>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
              onClick={() => setLeaveConfirmOpen(true)}
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              소속 해제 신청
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-red-100">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-[18px] text-black font-bold">
              <LogOut className="h-4 w-4 text-red-500" />
              회원 탈퇴
            </CardTitle>
            <CardDescription className="text-[14px] mt-0.5">
              탈퇴 시 개인정보는 즉시 삭제되며, 주문 내역은 법적 의무에 따라 보존됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {/* 권리 */}
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-[13px] text-blue-800 space-y-1">
              <p className="font-medium">귀하의 권리</p>
              <ul className="list-disc list-inside space-y-0.5 font-normal">
                <li>언제든지 탈퇴를 신청할 수 있으며 즉시 처리됩니다</li>
                <li>탈퇴 시 개인정보(이름·이메일·연락처·주소)는 즉시 삭제됩니다</li>
                <li>탈퇴 전 본인 데이터를 열람하거나 내보낼 수 있습니다</li>
              </ul>
            </div>
            {/* 책임사항 */}
            <div className="rounded-md border border-red-100 bg-red-50 p-3 text-[13px] text-red-700 space-y-1">
              <p className="font-medium">탈퇴 후 변경사항 (되돌릴 수 없음)</p>
              <ul className="list-disc list-inside space-y-0.5 font-normal">
                <li>소속 직원들의 고용 관계가 모두 즉시 해제됩니다</li>
                <li>탈퇴 후 동일 이메일·소셜 계정으로 재가입이 불가능합니다</li>
                <li>주문·결제 내역은 국세기본법에 따라 <strong>5년간 보존</strong>됩니다</li>
                <li>미정산 잔액·크레딧이 있을 경우 탈퇴 전 반환 요청을 하실 수 있으며, 반환 요청 없이 탈퇴 시 소멸될 수 있습니다</li>
              </ul>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => { setWithdrawConfirmText(''); setWithdrawConfirmOpen(true); }}
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              회원 탈퇴 신청
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 소속 해제 확인 모달 */}
      <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              소속 해제 확인
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              <strong>{user?.clientName || '현재 회사'}</strong>의 직원 소속을 해제합니다.
              해제 후에는 이 회사의 메뉴에 접근할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLeaveConfirmOpen(false)}
              disabled={leaveMutation.isPending}
            >
              취소
            </Button>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={leaveMutation.isPending}
              onClick={() => leaveMutation.mutate()}
            >
              {leaveMutation.isPending ? '처리 중...' : '소속 해제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 회원 탈퇴 확인 모달 */}
      <Dialog open={withdrawConfirmOpen} onOpenChange={setWithdrawConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              회원 탈퇴 확인
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              이 작업은 되돌릴 수 없습니다. 탈퇴를 원하시면 아래에 <strong>탈퇴합니다</strong>를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="탈퇴합니다"
              value={withdrawConfirmText}
              onChange={(e) => setWithdrawConfirmText(e.target.value)}
              className="text-[14px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWithdrawConfirmOpen(false)}
              disabled={withdrawMutation.isPending}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={withdrawConfirmText !== '탈퇴합니다' || withdrawMutation.isPending}
              onClick={() => withdrawMutation.mutate()}
            >
              {withdrawMutation.isPending ? '처리 중...' : '탈퇴 확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 소속/부서/가입일/비상연락처 카드 (온보딩에서 입력한 정보 표시)
function ProfileStatusCard({ onEdit }: { onEdit: () => void }) {
  const { data: status } = useQuery<{
    profile: {
      emergencyContactName: string;
      emergencyContactPhone: string;
      emergencyContactRelation: string;
    };
    employment: null | {
      companyName: string;
      department: string;
      joinedAt: string;
      role: string;
    };
  }>({
    queryKey: ['profile-status'],
    queryFn: async () => api.get('/clients/me/profile-status'),
  });

  if (!status) return null;

  const hasEmployment = !!status.employment;
  const hasEmergency =
    !!status.profile.emergencyContactName ||
    !!status.profile.emergencyContactPhone ||
    !!status.profile.emergencyContactRelation;

  if (!hasEmployment && !hasEmergency) return null;

  const formatPhoneDisplay = (v: string) => {
    if (!v) return '-';
    const nums = v.replace(/\D/g, '');
    if (nums.length === 11) return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
    if (nums.length === 10 && nums.startsWith('02'))
      return `${nums.slice(0, 2)}-${nums.slice(2, 6)}-${nums.slice(6)}`;
    if (nums.length === 10) return `${nums.slice(0, 3)}-${nums.slice(3, 6)}-${nums.slice(6)}`;
    return v;
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-[18px] text-black font-bold">
              <UserIcon className="h-4 w-4" />
              소속 · 비상연락처
            </CardTitle>
            <CardDescription className="text-[14px] mt-0.5">
              회원 등록 시 입력한 정보입니다. 수정은 우측 상단 버튼을 이용해주세요.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit} className="text-[12px]">
            <Edit className="h-3.5 w-3.5 mr-1" />
            수정
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-5">
        {hasEmployment && (
          <div className="space-y-2">
            <h3 className="text-[14px] font-medium text-gray-500 tracking-wide">소속 정보</h3>
            <div className="grid md:grid-cols-3 gap-x-6 gap-y-3">
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">소속 회사</Label>
                <FieldValue value={status.employment!.companyName} />
              </div>
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">부서</Label>
                <FieldValue value={status.employment!.department} />
              </div>
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">가입일</Label>
                <FieldValue
                  value={new Date(status.employment!.joinedAt).toLocaleDateString('ko-KR')}
                />
              </div>
            </div>
          </div>
        )}

        {hasEmployment && hasEmergency && <Separator />}

        {hasEmergency && (
          <div className="space-y-2">
            <h3 className="text-[14px] font-medium text-gray-500 tracking-wide">비상연락처</h3>
            <div className="grid md:grid-cols-3 gap-x-6 gap-y-3">
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">이름</Label>
                <FieldValue value={status.profile.emergencyContactName} />
              </div>
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">관계</Label>
                <FieldValue value={status.profile.emergencyContactRelation} />
              </div>
              <div className="space-y-1">
                <Label className="text-[14px] font-normal text-gray-600">전화번호</Label>
                <FieldValue value={formatPhoneDisplay(status.profile.emergencyContactPhone)} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
