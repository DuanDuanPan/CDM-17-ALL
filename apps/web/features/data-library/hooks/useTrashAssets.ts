'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { fetchTrashAssets } from '../api/data-assets';
import type { TrashAsset } from '../api/data-assets';

interface UseTrashAssetsResult {
  assets: TrashAsset[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTrashAssets(graphId: string, enabled = true): UseTrashAssetsResult {
  const queryClient = useQueryClient();

  const queryKey = ['data-assets', 'trash', graphId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTrashAssets(graphId),
    enabled: enabled && !!graphId,
    staleTime: 30_000,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    assets: query.data?.assets ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error?.message ?? null,
    refetch,
  };
}

export default useTrashAssets;

