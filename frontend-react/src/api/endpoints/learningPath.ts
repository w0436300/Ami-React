import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  ScheduleLearningPathRequest,
  ScheduleLearningPathResponse,
  RescheduleLearningPathRequest,
  RescheduleLearningPathResponse,
  AgenticLearningPathRequest,
  ScheduleLearningPathAgenticResponse,
  AdaptLearningPathRequest,
  AdaptLearningPathResponse,
} from '@/types';

export function useScheduleLearningPath() {
  return useMutation({
    mutationFn: async (
      body: ScheduleLearningPathRequest
    ): Promise<ScheduleLearningPathResponse> => {
      const { data } = await apiClient.post<ScheduleLearningPathResponse>(
        'schedule-learning-path',
        body
      );
      return data;
    },
  });
}

export function useRescheduleLearningPath() {
  return useMutation({
    mutationFn: async (
      body: RescheduleLearningPathRequest
    ): Promise<RescheduleLearningPathResponse> => {
      const { data } = await apiClient.post<RescheduleLearningPathResponse>(
        'reschedule-learning-path',
        body
      );
      return data;
    },
  });
}

export function useScheduleLearningPathAgentic() {
  return useMutation({
    mutationFn: async (
      body: AgenticLearningPathRequest
    ): Promise<ScheduleLearningPathAgenticResponse> => {
      const { data } = await apiClient.post<ScheduleLearningPathAgenticResponse>(
        'schedule-learning-path-agentic',
        body
      );
      return data;
    },
  });
}

export function useAdaptLearningPath() {
  return useMutation({
    mutationFn: async (
      body: AdaptLearningPathRequest
    ): Promise<AdaptLearningPathResponse> => {
      const { data } = await apiClient.post<AdaptLearningPathResponse>(
        'adapt-learning-path',
        body
      );
      return data;
    },
  });
}
