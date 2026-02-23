import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  ProfileGetResponse,
  ProfilePutRequest,
  SyncProfileResponse,
  AutoProfileUpdateRequest,
  AutoProfileUpdateResponse,
  LearnerProfile,
} from '@/types';

export function profileKeys(userId: string | undefined, goalId?: number) {
  return ['profile', userId, goalId] as const;
}

export function useProfile(userId: string | undefined, goalId?: number, enabled = true) {
  return useQuery({
    queryKey: profileKeys(userId, goalId),
    queryFn: async (): Promise<ProfileGetResponse> => {
      const params = goalId != null ? { goal_id: goalId } : {};
      const { data } = await apiClient.get<ProfileGetResponse>(`profile/${userId}`, { params });
      return data;
    },
    enabled: Boolean(userId) && enabled,
  });
}

export function usePutProfile(userId: string | undefined, goalId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ProfilePutRequest): Promise<{ ok: boolean }> => {
      const { data } = await apiClient.put<{ ok: boolean }>(
        `profile/${userId}/${goalId}`,
        body
      );
      return data;
    },
    onSuccess: (_, body) => {
      if (userId && goalId != null) {
        qc.setQueryData(profileKeys(userId, goalId), (old: ProfileGetResponse | undefined) =>
          old ? { ...old, learner_profile: body.learner_profile } : undefined
        );
      }
    },
  });
}

export function useSyncProfile(userId: string | undefined, goalId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<SyncProfileResponse> => {
      const { data } = await apiClient.post<SyncProfileResponse>(
        `sync-profile/${userId}/${goalId}`
      );
      return data;
    },
    onSuccess: (data) => {
      if (userId && goalId != null) {
        qc.setQueryData(profileKeys(userId, goalId), (old: ProfileGetResponse | undefined) =>
          old ? { ...old, learner_profile: data.learner_profile } : undefined
        );
      }
    },
  });
}

export function useAutoUpdateProfile() {
  return useMutation({
    mutationFn: async (
      body: AutoProfileUpdateRequest
    ): Promise<AutoProfileUpdateResponse> => {
      const { data } = await apiClient.post<AutoProfileUpdateResponse>(
        'profile/auto-update',
        body
      );
      return data;
    },
  });
}
