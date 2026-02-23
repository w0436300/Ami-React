import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  MasteryEvaluationRequest,
  MasteryEvaluationResponse,
} from '@/types';

export function useEvaluateMastery() {
  return useMutation({
    mutationFn: async (
      body: MasteryEvaluationRequest
    ): Promise<MasteryEvaluationResponse> => {
      const { data } = await apiClient.post<MasteryEvaluationResponse>(
        'evaluate-mastery',
        body
      );
      return data;
    },
  });
}
