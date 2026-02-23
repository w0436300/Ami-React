import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  BehavioralMetricsResponse,
  QuizMixResponse,
  SessionMasteryStatusResponse,
} from '@/types';

export function behavioralMetricsKeys(userId: string | undefined, goalId?: number) {
  return ['behavioralMetrics', userId, goalId] as const;
}

export function useBehavioralMetrics(
  userId: string | undefined,
  goalId?: number,
  enabled = true
) {
  return useQuery({
    queryKey: behavioralMetricsKeys(userId, goalId),
    queryFn: async (): Promise<BehavioralMetricsResponse> => {
      const params = goalId != null ? { goal_id: goalId } : {};
      const { data } = await apiClient.get<BehavioralMetricsResponse>(
        `behavioral-metrics/${userId}`,
        { params }
      );
      return data;
    },
    enabled: Boolean(userId) && enabled,
  });
}

export function quizMixKeys(userId: string | undefined, goalId?: number, sessionIndex?: number) {
  return ['quizMix', userId, goalId, sessionIndex] as const;
}

export function useQuizMix(
  userId: string | undefined,
  goalId: number | undefined,
  sessionIndex: number | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: quizMixKeys(userId, goalId, sessionIndex),
    queryFn: async (): Promise<QuizMixResponse> => {
      const { data } = await apiClient.get<QuizMixResponse>(`quiz-mix/${userId}`, {
        params: { goal_id: goalId, session_index: sessionIndex },
      });
      return data;
    },
    enabled:
      Boolean(userId) && goalId != null && sessionIndex != null && enabled,
  });
}

export function sessionMasteryKeys(userId: string | undefined, goalId?: number) {
  return ['sessionMastery', userId, goalId] as const;
}

export function useSessionMasteryStatus(
  userId: string | undefined,
  goalId: number | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: sessionMasteryKeys(userId, goalId),
    queryFn: async (): Promise<SessionMasteryStatusResponse> => {
      const { data } = await apiClient.get<SessionMasteryStatusResponse>(
        `session-mastery-status/${userId}`,
        { params: { goal_id: goalId } }
      );
      return data;
    },
    enabled: Boolean(userId) && goalId != null && enabled,
  });
}
