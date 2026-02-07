export interface ClientAddress {
  id: string;
  clientId: string;
  addressName?: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientAddressDto {
  addressName?: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail?: string;
  isDefault?: boolean;
}

export interface UpdateClientAddressDto extends Partial<CreateClientAddressDto> {}
