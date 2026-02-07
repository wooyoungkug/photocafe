'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AddressCard } from '@/components/address/address-card';
import { AddressDialog } from '@/components/address/address-dialog';
import { useAuthStore } from '@/stores/auth-store';
import {
  useClientAddresses,
  useCreateClientAddress,
  useUpdateClientAddress,
  useDeleteClientAddress,
  useSetDefaultAddress,
} from '@/hooks/use-client-addresses';
import type { ClientAddress, CreateClientAddressDto } from '@/types/address';

export default function AddressesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ClientAddress | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Queries
  const { data: addresses = [], isLoading } = useClientAddresses(user?.id);
  const createMutation = useCreateClientAddress();
  const updateMutation = useUpdateClientAddress();
  const deleteMutation = useDeleteClientAddress();
  const setDefaultMutation = useSetDefaultAddress();

  // Handlers
  const handleAdd = () => {
    setEditingAddress(null);
    setDialogOpen(true);
  };

  const handleEdit = (address: ClientAddress) => {
    setEditingAddress(address);
    setDialogOpen(true);
  };

  const handleSave = async (data: CreateClientAddressDto) => {
    try {
      if (editingAddress) {
        await updateMutation.mutateAsync({
          clientId: user!.id,
          addressId: editingAddress.id,
          data,
        });
        setSuccess('배송지가 수정되었습니다.');
      } else {
        await createMutation.mutateAsync({
          clientId: user!.id,
          data,
        });
        setSuccess('배송지가 추가되었습니다.');
      }
      setDialogOpen(false);
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || '배송지 저장에 실패했습니다.');
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm('이 배송지를 삭제하시겠습니까?')) return;

    try {
      await deleteMutation.mutateAsync({
        clientId: user!.id,
        addressId,
      });
      setSuccess('배송지가 삭제되었습니다.');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || '배송지 삭제에 실패했습니다.');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultMutation.mutateAsync({
        clientId: user!.id,
        addressId,
      });
      setSuccess('기본 배송지가 변경되었습니다.');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || '기본 배송지 설정에 실패했습니다.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">로그인이 필요한 서비스입니다.</p>
            <Button onClick={() => router.push('/login?redirect=/mypage/addresses')}>
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
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

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                배송지 관리
              </CardTitle>
              <CardDescription>
                자주 사용하는 배송지를 등록하고 관리하세요 (최대 10개)
              </CardDescription>
            </div>
            <Button onClick={handleAdd} disabled={addresses.length >= 10}>
              <Plus className="h-4 w-4 mr-2" />
              배송지 추가
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Address List */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-24 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">등록된 배송지가 없습니다.</p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              첫 배송지 추가하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {/* Address Dialog */}
      <AddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        address={editingAddress}
        onSave={handleSave}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
