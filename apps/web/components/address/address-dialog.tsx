'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AddressSearch } from '@/components/address-search';
import { Save, X, AlertCircle } from 'lucide-react';
import type { ClientAddress, CreateClientAddressDto } from '@/types/address';

function detectApartmentFromAddress(address: string): boolean {
  if (!address) return false;
  return /아파트|APT|apt|\(.*동.*\)/.test(address);
}

interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: ClientAddress | null;
  onSave: (data: CreateClientAddressDto) => Promise<void>;
  isPending?: boolean;
}

export function AddressDialog({ open, onOpenChange, address, onSave, isPending }: AddressDialogProps) {
  const [formData, setFormData] = useState<CreateClientAddressDto>({
    addressName: '',
    recipientName: '',
    phone: '',
    postalCode: '',
    address: '',
    addressDetail: '',
    isDefault: false,
  });
  const [isApartment, setIsApartment] = useState(false);

  useEffect(() => {
    if (address) {
      setFormData({
        addressName: address.addressName || '',
        recipientName: address.recipientName,
        phone: address.phone,
        postalCode: address.postalCode,
        address: address.address,
        addressDetail: address.addressDetail || '',
        isDefault: address.isDefault,
      });
      setIsApartment(detectApartmentFromAddress(address.address || ''));
    } else {
      setFormData({
        addressName: '',
        recipientName: '',
        phone: '',
        postalCode: '',
        address: '',
        addressDetail: '',
        isDefault: false,
      });
      setIsApartment(false);
    }
  }, [address, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isApartment && !formData.addressDetail.trim()) {
      alert('아파트/연립은 동호수 입력이 필수입니다.');
      return;
    }
    await onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{address ? '배송지 수정' : '배송지 추가'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Address Name */}
          <div className="space-y-2">
            <Label htmlFor="addressName">배송지 별칭 (선택)</Label>
            <Input
              id="addressName"
              value={formData.addressName}
              onChange={(e) => setFormData({ ...formData, addressName: e.target.value })}
              placeholder="예: 집, 사무실, 본점"
              maxLength={50}
            />
          </div>

          {/* Recipient Name */}
          <div className="space-y-2">
            <Label htmlFor="recipientName">
              수령인 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="recipientName"
              value={formData.recipientName}
              onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              placeholder="수령인 이름"
              required
              maxLength={100}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              연락처 <span className="text-red-500">*</span>
            </Label>
            <PhoneInput
              id="phone"
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              placeholder="010-0000-0000"
              required
            />
          </div>

          {/* Address Search */}
          <div className="space-y-2">
            <Label>
              주소 <span className="text-red-500">*</span>
            </Label>
            <AddressSearch
              inline={true}
              onComplete={(data) => {
                setFormData({
                  ...formData,
                  postalCode: data.postalCode,
                  address: data.address,
                  addressDetail: '',
                });
                setIsApartment(!!data.isApartment);
              }}
            />
          </div>

          {/* Address (read-only display) */}
          <div className="space-y-2">
            <Label htmlFor="address">주소</Label>
            <Input
              id="address"
              value={formData.address}
              readOnly
              placeholder="검색해주세요"
              required
            />
          </div>

          {/* Address Detail */}
          <div className="space-y-2">
            <Label htmlFor="addressDetail">
              {isApartment ? '동/호수' : '상세주소'}
              {isApartment && <span className="text-red-500"> *</span>}
            </Label>
            <Input
              id="addressDetail"
              value={formData.addressDetail}
              onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
              placeholder={isApartment ? '동호수 입력 (필수)' : '상세주소를 입력하세요'}
              maxLength={255}
              className={isApartment && !formData.addressDetail.trim() ? 'border-red-400 focus-visible:ring-red-400' : ''}
            />
            {isApartment && !formData.addressDetail.trim() && (
              <p className="flex items-center gap-1 text-[12px] text-red-500">
                <AlertCircle className="h-3 w-3" />
                아파트/연립은 동호수 입력이 필수입니다
              </p>
            )}
          </div>

          {/* Is Default */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
            />
            <Label htmlFor="isDefault" className="cursor-pointer">
              기본 배송지로 설정
            </Label>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
