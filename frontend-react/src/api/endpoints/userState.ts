import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { UserStateResponse, UserStatePutRequest, UserState } from '@/types';

export function userStateKeys(userId: string | undefined) {
  return ['userState', userId] as const;
}

export function useUserState(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: userStateKeys(userId),
    queryFn: async (): Promise<UserStateResponse> => {
      const { data } = await apiClient.get<UserStateResponse>(`user-state/${userId}`);
      return data;
    },
    enabled: Boolean(userId) && enabled,
  });
}

export function usePutUserState(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (state: UserState): Promise<{ ok: boolean }> => {
      const { data } = await apiClient.put<{ ok: boolean }>(`user-state/${userId}`, { state });
      return data;
    },
    onSuccess: (_, state) => {
      if (userId) qc.setQueryData(userStateKeys(userId), { state });
    },
  });
}

export function useDeleteUserState(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ ok: boolean }> => {
      const { data } = await apiClient.delete<{ ok: boolean }>(`user-state/${userId}`);
      return data;
    },
    onSuccess: () => {
      if (userId) qc.removeQueries({ queryKey: userStateKeys(userId) });
    },
  });
}
