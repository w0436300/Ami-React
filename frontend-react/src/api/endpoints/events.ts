import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { BehaviorEventRequest, LogEventResponse, GetEventsResponse } from '@/types';

export function eventsKeys(userId: string | undefined) {
  return ['events', userId] as const;
}

export function useLogEvent() {
  return useMutation({
    mutationFn: async (body: BehaviorEventRequest): Promise<LogEventResponse> => {
      const { data } = await apiClient.post<LogEventResponse>('events/log', body);
      return data;
    },
  });
}

export function useEvents(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: eventsKeys(userId),
    queryFn: async (): Promise<GetEventsResponse> => {
      const { data } = await apiClient.get<GetEventsResponse>(`events/${userId}`);
      return data;
    },
    enabled: Boolean(userId) && enabled,
  });
}
