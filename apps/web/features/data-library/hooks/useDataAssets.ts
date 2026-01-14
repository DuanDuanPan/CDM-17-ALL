'use client';

/**
 * Story 9.1: Data Assets Hook
 * Fetches data assets using TanStack Query
 * Task 4.2: Create useDataAssets.ts hook based on TanStack Query
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { fetchDataAssets } from '../api/data-assets';
import type { DataAssetWithFolder, DataAssetFormat } from '@cdm/types';

interface UseDataAssetsOptions {
  graphId: string;
  search?: string;
  format?: DataAssetFormat;
  folderId?: string;
  tags?: string[];
  createdAfter?: string;
  createdBefore?: string;
  /** Story 9.9: Filter unlinked assets */
  linkStatus?: 'unlinked';
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

interface UseDataAssetsResult {
  assets: DataAssetWithFolder[];
  total: number;
  totalPages: number;
  page: number;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for fetching data assets
 * Uses TanStack Query for caching and automatic refetching
 * Story 9.9: Added linkStatus for unlinked assets filter
 */
export function useDataAssets(options: UseDataAssetsOptions): UseDataAssetsResult {
  const {
    graphId,
    search = '',
    format,
    folderId,
    tags,
    createdAfter,
    createdBefore,
    linkStatus,
    page = 1,
    pageSize = 50,
    enabled = true,
  } = options;

  const queryClient = useQueryClient();

  // Build query key that includes all filter params
  const queryKey = useMemo(
    () => [
      'data-assets',
      graphId,
      search,
      format,
      folderId,
      tags,
      createdAfter,
      createdBefore,
      linkStatus,
      page,
      pageSize,
    ],
    [graphId, search, format, folderId, tags, createdAfter, createdBefore, linkStatus, page, pageSize]
  );

  // Query function
  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchDataAssets({
        graphId,
        search: search || undefined,
        format: format || undefined,
        folderId,
        tags,
        createdAfter,
        createdBefore,
        linkStatus,
        page,
        pageSize,
      }),
    enabled: enabled && !!graphId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });

  // Refetch function
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['data-assets', graphId] });
  }, [queryClient, graphId]);

  return {
    assets: query.data?.assets ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 0,
    page: query.data?.page ?? page,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error?.message ?? null,
    refetch,
  };
}

export default useDataAssets;
