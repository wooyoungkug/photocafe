'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User as UserIcon, Mail, Phone, Building, AlertCircle, CheckCircle, Edit, Save, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  // 회원정보 수정 상태
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
  });

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 프로필 조회
  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      console.log('🔍 Profile Query - User ID:', user?.id);
      console.log('🔍 Profile Query - User Object:', user);
      console.log('🔍 Profile Query - isAuthenticated:', isAuthenticated);

      if (!user?.id) {
        throw new Error('User ID가 없습니다');
      }

      const data = await api.get<any>(`/clients/${user.id}`);
      console.log('✅ Profile Response:', data);

      // 조회된 데이터로 상태 업데이트
      setProfileData({
        clientName: data.clientName || '',
        email: data.email || '',
        mobile: data.mobile || '',
        phone: data.phone || '',
        postalCode: data.postalCode || '',
        address: data.address || '',
        addressDetail: data.addressDetail || '',
        businessNumber: data.businessNumber || '',
      });

      return data;
    },
    enabled: isAuthenticated && !!user?.id,
  });

  // 에러 로깅
  if (profileError) {
    console.error('❌ Profile Error:', profileError);
  }

  // 프로필 수정 mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const result = await api.put<any>(`/clients/${user?.id}`, data);
      return result;
    },
    onSuccess: (data) => {
      setSuccess('회원정보가 성공적으로 수정되었습니다.');
      setError('');
      if (data) {
        updateUser(data);
      }
      setIsEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });

      // 3초 후 성공 메시지 제거
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error: any) => {
      setError(error.message || '회원정보 수정에 실패했습니다.');
      setSuccess('');
    },
  });

  // 비밀번호 변경 mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await api.patch('/auth/change-password', data);
      return response;
    },
    onSuccess: () => {
      setSuccess('비밀번호가 성공적으로 변경되었습니다.');
      setError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // 3초 후 성공 메시지 제거
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

    // 유효성 검사
    if (!profileData.clientName || !profileData.email) {
      setError('이름과 이메일은 필수 입력 항목입니다.');
      return;
    }

    // API 호출
    updateProfileMutation.mutate(profileData);
  };

  const handleCancelEdit = () => {
    // 조회된 원본 데이터로 복원
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

    // 유효성 검사
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

    // API 호출
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">로그인이 필요한 서비스입니다.</p>
            <Button onClick={() => router.push('/login?redirect=/mypage/profile')}>
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 로딩 중
  if (isLoadingProfile) {
    return (
      <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 디버깅 정보 (개발 환경에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="text-xs space-y-1">
              <div>User ID: {user?.id || '❌ 없음'}</div>
              <div>User Email: {user?.email || '❌ 없음'}</div>
              <div>User Name: {user?.name || '❌ 없음'}</div>
              <div>Is Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
              <div>Access Token (localStorage): {typeof window !== 'undefined' && localStorage.getItem('accessToken') ? '✅ 있음' : '❌ 없음'}</div>
              <div>Access Token (sessionStorage): {typeof window !== 'undefined' && sessionStorage.getItem('accessToken') ? '✅ 있음' : '❌ 없음'}</div>
              <div>Profile Data: {profile ? '✅ 로드됨' : '❌ 없음'}</div>
              {profileError && <div className="text-red-600">Error: {String(profileError)}</div>}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 알림 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* 회원 정보 카드 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                회원 정보
              </CardTitle>
              <CardDescription>
                {isEditMode ? '정보를 수정하세요' : '현재 회원님의 등록된 정보입니다'}
              </CardDescription>
            </div>
            {!isEditMode && (
              <Button onClick={() => setIsEditMode(true)} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                수정
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">기본 정보</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">
                    이름/상호명 <span className="text-red-500">*</span>
                  </Label>
                  {isEditMode ? (
                    <Input
                      id="clientName"
                      value={profileData.clientName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, clientName: e.target.value })
                      }
                      required
                    />
                  ) : (
                    <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                      {profile?.clientName || '-'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    이메일 <span className="text-red-500">*</span>
                  </Label>
                  {isEditMode ? (
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({ ...profileData, email: e.target.value })
                      }
                      required
                    />
                  ) : (
                    <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                      {profile?.email || '-'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">휴대전화</Label>
                  {isEditMode ? (
                    <Input
                      id="mobile"
                      value={profileData.mobile}
                      onChange={(e) =>
                        setProfileData({ ...profileData, mobile: e.target.value })
                      }
                      placeholder="010-0000-0000"
                    />
                  ) : (
                    <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                      {profile?.mobile || '-'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  {isEditMode ? (
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({ ...profileData, phone: e.target.value })
                      }
                      placeholder="02-0000-0000"
                    />
                  ) : (
                    <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                      {profile?.phone || '-'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* 주소 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">주소 정보</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">우편번호</Label>
                  {isEditMode ? (
                    <Input
                      id="postalCode"
                      value={profileData.postalCode}
                      onChange={(e) =>
                        setProfileData({ ...profileData, postalCode: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                      {profile?.postalCode || '-'}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">주소</Label>
                  {isEditMode ? (
                    <Input
                      id="address"
                      value={profileData.address}
                      onChange={(e) =>
                        setProfileData({ ...profileData, address: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                      {profile?.address || '-'}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressDetail">상세주소</Label>
                {isEditMode ? (
                  <Input
                    id="addressDetail"
                    value={profileData.addressDetail}
                    onChange={(e) =>
                      setProfileData({ ...profileData, addressDetail: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                    {profile?.addressDetail || '-'}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* 사업자 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">사업자 정보 (선택)</h3>
              <div className="space-y-2">
                <Label htmlFor="businessNumber">사업자등록번호</Label>
                {isEditMode ? (
                  <Input
                    id="businessNumber"
                    value={profileData.businessNumber}
                    onChange={(e) =>
                      setProfileData({ ...profileData, businessNumber: e.target.value })
                    }
                    placeholder="000-00-00000"
                  />
                ) : (
                  <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                    {profile?.businessNumber || '-'}
                  </p>
                )}
              </div>
            </div>

            {/* 버튼 */}
            {isEditMode && (
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4 mr-2" />
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            비밀번호 변경
          </CardTitle>
          <CardDescription>
            비밀번호는 최소 8자 이상이어야 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                현재 비밀번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호를 입력하세요"
                disabled={changePasswordMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">
                새 비밀번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호를 입력하세요 (최소 8자)"
                disabled={changePasswordMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                새 비밀번호 확인 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호를 다시 입력하세요"
                disabled={changePasswordMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={changePasswordMutation.isPending}
            >
              <Lock className="h-4 w-4 mr-2" />
              {changePasswordMutation.isPending ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
