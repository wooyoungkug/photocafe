'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User as UserIcon, AlertCircle, CheckCircle, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

// 읽기 전용 필드값 표시 컴포넌트
function FieldValue({ value }: { value: string }) {
  return (
    <p className="text-[13px] font-normal py-1.5 px-2.5 bg-gray-50 rounded border border-gray-100 min-h-[32px] flex items-center">
      {value || '-'}
    </p>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

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

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID가 없습니다');
      const data = await api.get<any>(`/clients/${user.id}`);
      setProfileData({
        clientName: data.clientName || '',
        email: data.email || '',
        mobile: data.mobile || '',
        phone: data.phone || '',
        postalCode: data.postalCode || '',
        address: data.address || '',
        addressDetail: data.addressDetail || '',
        businessNumber: data.businessNumber || '',
        representative: data.representative || '',
        contactPerson: data.contactPerson || '',
      });
      return data;
    },
    enabled: isAuthenticated && !!user?.id,
  });

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

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!profileData.clientName || !profileData.email) {
      setError('이름과 이메일은 필수 입력 항목입니다.');
      return;
    }
    updateProfileMutation.mutate(profileData);
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

  const inputCls = "h-8 text-[13px] font-normal";

  return (
    <div className="space-y-4 text-[13px] font-normal">
      {/* 알림 메시지 */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-[13px]">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200 py-2">
          <CheckCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-[13px]">{success}</AlertDescription>
        </Alert>
      )}

      {/* 회원 정보 카드 */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[15px] font-medium">
                <UserIcon className="h-4 w-4" />
                회원 정보
              </CardTitle>
              <CardDescription className="text-[12px] mt-0.5">
                {isEditMode ? '정보를 수정하세요' : '현재 회원님의 등록된 정보입니다'}
              </CardDescription>
            </div>
            {!isEditMode && (
              <Button onClick={() => setIsEditMode(true)} variant="outline" size="sm" className="h-7 text-[12px] px-3">
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
              <h3 className="text-[12px] font-medium text-gray-500 tracking-wide">기본 정보</h3>
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-3">
                <div className="space-y-1">
                  <Label htmlFor="clientName" className="text-[12px] font-normal text-gray-600">
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
                  <Label htmlFor="email" className="text-[12px] font-normal text-gray-600">
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
                  <Label htmlFor="mobile" className="text-[12px] font-normal text-gray-600">휴대전화</Label>
                  {isEditMode ? (
                    <Input id="mobile" className={inputCls} value={profileData.mobile}
                      onChange={(e) => setProfileData({ ...profileData, mobile: formatPhone(e.target.value) })}
                      placeholder="010-0000-0000" maxLength={13} />
                  ) : (
                    <FieldValue value={formatPhone(profile?.mobile || '')} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-[12px] font-normal text-gray-600">전화번호</Label>
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

            <Separator />

            {/* 주소 정보 */}
            <div className="space-y-3">
              <h3 className="text-[12px] font-medium text-gray-500 tracking-wide">주소 정보</h3>
              <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3">
                <div className="space-y-1">
                  <Label htmlFor="postalCode" className="text-[12px] font-normal text-gray-600">우편번호</Label>
                  {isEditMode ? (
                    <Input id="postalCode" className={inputCls} value={profileData.postalCode}
                      onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value })} />
                  ) : (
                    <FieldValue value={profile?.postalCode || ''} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="address" className="text-[12px] font-normal text-gray-600">주소</Label>
                  {isEditMode ? (
                    <Input id="address" className={inputCls} value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })} />
                  ) : (
                    <FieldValue value={profile?.address || ''} />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="addressDetail" className="text-[12px] font-normal text-gray-600">상세주소</Label>
                {isEditMode ? (
                  <Input id="addressDetail" className={inputCls} value={profileData.addressDetail}
                    onChange={(e) => setProfileData({ ...profileData, addressDetail: e.target.value })} />
                ) : (
                  <FieldValue value={profile?.addressDetail || ''} />
                )}
              </div>
            </div>

            <Separator />

            {/* 사업자 정보 */}
            <div className="space-y-3">
              <h3 className="text-[12px] font-medium text-gray-500 tracking-wide">사업자 정보 (선택)</h3>
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-3">
                <div className="space-y-1">
                  <Label htmlFor="businessNumber" className="text-[12px] font-normal text-gray-600">사업자등록번호</Label>
                  {isEditMode ? (
                    <Input id="businessNumber" className={inputCls} value={profileData.businessNumber}
                      onChange={(e) => setProfileData({ ...profileData, businessNumber: e.target.value })}
                      placeholder="000-00-00000" />
                  ) : (
                    <FieldValue value={profile?.businessNumber || ''} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="representative" className="text-[12px] font-normal text-gray-600">대표자명</Label>
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
                <Label htmlFor="contactPerson" className="text-[12px] font-normal text-gray-600">담당자</Label>
                {isEditMode ? (
                  <Input id="contactPerson" className={inputCls} value={profileData.contactPerson}
                    onChange={(e) => setProfileData({ ...profileData, contactPerson: e.target.value })}
                    placeholder="담당자명" />
                ) : (
                  <FieldValue value={profile?.contactPerson || ''} />
                )}
              </div>
            </div>

            {/* 버튼 */}
            {isEditMode && (
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" className="h-7 text-[12px]" onClick={handleCancelEdit}>
                  <X className="h-3 w-3 mr-1" />
                  취소
                </Button>
                <Button type="submit" size="sm" className="h-7 text-[12px]" disabled={updateProfileMutation.isPending}>
                  <Save className="h-3 w-3 mr-1" />
                  {updateProfileMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 카드 */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="flex items-center gap-2 text-[15px] font-medium">
            <Lock className="h-4 w-4" />
            비밀번호 변경
          </CardTitle>
          <CardDescription className="text-[12px] mt-0.5">
            비밀번호는 최소 8자 이상이어야 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="currentPassword" className="text-[12px] font-normal text-gray-600">
                현재 비밀번호 <span className="text-red-500">*</span>
              </Label>
              <Input id="currentPassword" type="password" className={inputCls}
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호" disabled={changePasswordMutation.isPending} />
            </div>
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-3">
              <div className="space-y-1">
                <Label htmlFor="newPassword" className="text-[12px] font-normal text-gray-600">
                  새 비밀번호 <span className="text-red-500">*</span>
                </Label>
                <Input id="newPassword" type="password" className={inputCls}
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 (최소 8자)" disabled={changePasswordMutation.isPending} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-[12px] font-normal text-gray-600">
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
    </div>
  );
}
