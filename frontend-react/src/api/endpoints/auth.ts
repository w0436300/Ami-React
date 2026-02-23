import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  AuthRegisterRequest,
  AuthLoginRequest,
  AuthTokenResponse,
  AuthMeResponse,
} from '@/types';

const AUTH_TOKEN_KEY = 'auth_token';

function saveToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export const authKeys = {
  me: ['auth', 'me'] as const,
};

export function useAuthMe(enabled = true) {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async (): Promise<AuthMeResponse> => {
      const { data } = await apiClient.get<AuthMeResponse>('auth/me');
      return data;
    },
    enabled,
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AuthRegisterRequest): Promise<AuthTokenResponse> => {
      const { data } = await apiClient.post<AuthTokenResponse>('auth/register', body);
      return data;
    },
    onSuccess: (data) => {
      saveToken(data.token);
      qc.setQueryData(authKeys.me, { username: data.username });
    },
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AuthLoginRequest): Promise<AuthTokenResponse> => {
      const { data } = await apiClient.post<AuthTokenResponse>('auth/login', body);
      return data;
    },
    onSuccess: (data) => {
      saveToken(data.token);
      qc.setQueryData(authKeys.me, { username: data.username });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ ok: boolean }> => {
      const { data } = await apiClient.delete<{ ok: boolean }>('auth/user');
      return data;
    },
    onSuccess: () => {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      qc.removeQueries({ queryKey: authKeys.me });
    },
  });
}
