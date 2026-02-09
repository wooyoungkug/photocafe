import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ClientAlbumPreference, UpsertClientAlbumPreferenceDto } from '@/lib/types/client';

export function useClientAlbumPreference(clientId?: string) {
  return useQuery({
    queryKey: ['client-album-preference', clientId],
    queryFn: async () => {
      const response = await api.get<ClientAlbumPreference | null>(
        `/clients/${clientId}/album-preference`,
      );
      return response ?? null;
    },
    enabled: !!clientId,
  });
}

export function useUpsertClientAlbumPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      data,
    }: {
      clientId: string;
      data: UpsertClientAlbumPreferenceDto;
    }) => {
      return api.put<ClientAlbumPreference>(
        `/clients/${clientId}/album-preference`,
        data,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['client-album-preference', variables.clientId],
      });
    },
  });
}
