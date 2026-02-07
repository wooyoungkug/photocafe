import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ClientAddress, CreateClientAddressDto, UpdateClientAddressDto } from '@/types/address';

export function useClientAddresses(clientId?: string) {
  return useQuery({
    queryKey: ['client-addresses', clientId],
    queryFn: async () => {
      const response = await api.get<ClientAddress[]>(`/clients/${clientId}/addresses`);
      return response;
    },
    enabled: !!clientId,
  });
}

export function useClientAddress(clientId?: string, addressId?: string) {
  return useQuery({
    queryKey: ['client-addresses', clientId, addressId],
    queryFn: async () => {
      const response = await api.get<ClientAddress>(`/clients/${clientId}/addresses/${addressId}`);
      return response;
    },
    enabled: !!clientId && !!addressId,
  });
}

export function useCreateClientAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, data }: { clientId: string; data: CreateClientAddressDto }) => {
      return api.post<ClientAddress>(`/clients/${clientId}/addresses`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-addresses', variables.clientId] });
    },
  });
}

export function useUpdateClientAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      addressId,
      data,
    }: {
      clientId: string;
      addressId: string;
      data: UpdateClientAddressDto;
    }) => {
      return api.patch<ClientAddress>(`/clients/${clientId}/addresses/${addressId}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-addresses', variables.clientId] });
      queryClient.invalidateQueries({
        queryKey: ['client-addresses', variables.clientId, variables.addressId],
      });
    },
  });
}

export function useDeleteClientAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, addressId }: { clientId: string; addressId: string }) => {
      return api.delete(`/clients/${clientId}/addresses/${addressId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-addresses', variables.clientId] });
    },
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, addressId }: { clientId: string; addressId: string }) => {
      return api.patch<ClientAddress>(`/clients/${clientId}/addresses/${addressId}/default`, {});
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-addresses', variables.clientId] });
    },
  });
}
