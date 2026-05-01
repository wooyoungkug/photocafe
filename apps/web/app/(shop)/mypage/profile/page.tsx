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
      });
    }
    setIsEditMode(false);
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
              <Button onClick={() => setIsEditMode(true)} variant="outline" size="sm" className="h-7 text-[14px] px-3">
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
            </div>

            {!isEmployee && <Separator />}

            {/* 주소 정보 - 직원은 비표시 */}
            {!isEmployee && <div className="space-y-3">
              <h3 className="text-[14px] font-medium text-gray-500 tracking-wide">주소 정보</h3>
              {isEditMode && (
                <AddressSearch
                  inline={true}
                  size="sm"
                  className="h-8 text-[14px]"
                  onComplete={(data) => {
                    setProfileData({
                      ...profileData,
                      postalCode: data.postalCode,
                      address: data.address,
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
                <Label htmlFor="addressDetail" className="text-[14px] font-normal text-gray-600">상세주소</Label>
                {isEditMode ? (
                  <Input id="addressDetail" className={inputCls} value={profileData.addressDetail}
                    onChange={(e) => setProfileData({ ...profileData, addressDetail: e.target.value })}
                    placeholder="상세주소를 입력하세요" />
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

      {/* 비밀번호 변경 카드 */}
      <Card>
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
      </Card>

      {/* 회원 탈퇴 카드 */}
      {isEmployee ? (
        <Card className="border-gray-200">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-[18px] text-black font-bold">
              <LogOut className="h-4 w-4 text-gray-400" />
              소속 해제
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-[13px] text-gray-600">
              소속 멤버는 직접 탈퇴할 수 없습니다.<br />
              소속 해제가 필요하면 <strong>소속 회사 관리자</strong>에게 요청하세요.<br />
              <span className="text-gray-400 text-[12px]">관리자: 마이페이지 → 직원 관리 → 내보내기</span>
            </div>
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
          <CardContent className="px-5 pb-5">
            <div className="bg-red-50 border border-red-100 rounded-md p-3 mb-4 text-[13px] text-red-700 space-y-1">
              <p className="font-medium">탈퇴 전 확인사항</p>
              <ul className="list-disc list-inside space-y-0.5 font-normal">
                <li>이름, 이메일, 연락처, 주소 등 개인정보가 즉시 삭제됩니다</li>
                <li>소속된 스튜디오에서 자동으로 탈퇴됩니다</li>
                <li>탈퇴 후 동일 계정으로 재가입이 불가능합니다</li>
                <li>주문·결제 내역은 세법에 따라 5년간 보존됩니다</li>
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

      {/* 탈퇴 확인 모달 */}
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
