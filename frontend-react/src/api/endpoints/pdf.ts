import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { ExtractPdfTextResponse } from '@/types';

export function useExtractPdfText() {
  return useMutation({
    mutationFn: async (file: File): Promise<ExtractPdfTextResponse> => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiClient.post<ExtractPdfTextResponse>(
        'extract-pdf-text',
        form,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      return data;
    },
  });
}
