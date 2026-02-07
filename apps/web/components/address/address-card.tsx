'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Edit, Trash2, Star } from 'lucide-react';
import type { ClientAddress } from '@/types/address';

interface AddressCardProps {
  address: ClientAddress;
  onEdit: (address: ClientAddress) => void;
  onDelete: (addressId: string) => void;
  onSetDefault: (addressId: string) => void;
}

export function AddressCard({ address, onEdit, onDelete, onSetDefault }: AddressCardProps) {
  return (
    <Card className={address.isDefault ? 'border-primary border-2' : ''}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            {address.addressName && (
              <h3 className="font-semibold text-lg">{address.addressName}</h3>
            )}
            {address.isDefault && (
              <Badge variant="default" className="gap-1">
                <Star className="h-3 w-3 fill-current" />
                기본 배송지
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(address)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(address.id)}
              disabled={address.isDefault}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
            <div>
              <p className="font-medium">{address.recipientName}</p>
              <p className="text-gray-600">
                ({address.postalCode}) {address.address}
              </p>
              {address.addressDetail && (
                <p className="text-gray-600">{address.addressDetail}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <p className="text-gray-600">{address.phone}</p>
          </div>
        </div>

        {!address.isDefault && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => onSetDefault(address.id)}
          >
            기본 배송지로 설정
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
