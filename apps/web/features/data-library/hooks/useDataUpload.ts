'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { uploadDataAsset } from '@/features/data-library/api/data-assets';
import type { DataAsset } from '@cdm/types';

interface UseDataUploadOptions {
  graphId: string;
  folderId?: string;
  onSuccess?: (asset: DataAsset) => void;
  onError?: (error: string) => void;
}

interface UseDataUploadResult {
  upload: (file: File) => Promise<DataAsset | null>;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

export function useDataUpload(options: UseDataUploadOptions): UseDataUploadResult {
  const { graphId, folderId, onSuccess, onError } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const upload = useCallback(
    async (file: File): Promise<DataAsset | null> => {
      if (!graphId) {
        const msg = 'graphId is required';
        setError(msg);
        onError?.(msg);
        return null;
      }

      setIsUploading(true);
      setError(null);

      try {
        const result = await uploadDataAsset(file, graphId, folderId);
        const asset = result.asset;

        // Invalidate data-assets queries to refresh list
        queryClient.invalidateQueries({ queryKey: ['data-assets', graphId] });

        onSuccess?.(asset);
        return asset;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setError(msg);
        onError?.(msg);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [graphId, folderId, queryClient, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsUploading(false);
  }, []);

  return {
    upload,
    isUploading,
    error,
    reset,
  };
}

export default useDataUpload;
