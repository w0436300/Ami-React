import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { AppConfig, PersonasResponse, ListLlmModelsResponse } from '@/types';

export const configKeys = {
  app: ['config', 'app'] as const,
  personas: ['config', 'personas'] as const,
  llmModels: ['config', 'llmModels'] as const,
};

export function useAppConfig() {
  return useQuery({
    queryKey: configKeys.app,
    queryFn: async (): Promise<AppConfig> => {
      const { data } = await apiClient.get<AppConfig>('config');
      return data;
    },
  });
}

export function usePersonas() {
  return useQuery({
    queryKey: configKeys.personas,
    queryFn: async (): Promise<PersonasResponse> => {
      const { data } = await apiClient.get<PersonasResponse>('personas');
      return data;
    },
  });
}

export function useLlmModels() {
  return useQuery({
    queryKey: configKeys.llmModels,
    queryFn: async (): Promise<ListLlmModelsResponse> => {
      const { data } = await apiClient.get<ListLlmModelsResponse>('list-llm-models');
      return data;
    },
  });
}
