/**
 * Story 9.2: Task Assets Hook
 * Fetches data assets linked to TASK node(s) via NodeDataLink
 * Uses TanStack Query for data fetching and caching
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchNodeAssets, fetchNodeAssetsByNodes } from '../api/data-assets';

interface UseTaskAssetsOptions {
  /** Selected task node ID (null if none selected) */
  selectedTaskId: string | null;
  /** Optional: fetch assets for all tasks in a status group */
  taskIdsInGroup?: string[];
}

/**
 * Hook to fetch data assets linked to task node(s)
 * Supports single task or batch query for status group
 */
export function useTaskAssets({
  selectedTaskId,
  taskIdsInGroup,
}: UseTaskAssetsOptions) {
  // Determine query mode
  const isBatchMode = taskIdsInGroup && taskIdsInGroup.length > 0;
  const nodeIds = isBatchMode ? taskIdsInGroup : selectedTaskId ? [selectedTaskId] : [];

  // Single task query
  const singleTaskQuery = useQuery({
    queryKey: ['data-assets', 'links', 'task', selectedTaskId],
    queryFn: () => fetchNodeAssets(selectedTaskId!),
    enabled: !!selectedTaskId && !isBatchMode,
    staleTime: 30_000, // 30s cache
  });

  // Batch query for task group
  const batchQuery = useQuery({
    queryKey: ['data-assets', 'links', 'tasks', nodeIds.sort().join(',')],
    queryFn: () => fetchNodeAssetsByNodes(nodeIds),
    enabled: isBatchMode && nodeIds.length > 0,
    staleTime: 30_000,
  });

  // Return appropriate query result based on mode
  const activeQuery = isBatchMode ? batchQuery : singleTaskQuery;

  // Return asset IDs as Set for efficient filtering
  const assetIds = new Set<string>(
    activeQuery.data?.assets?.map((a) => a.id) ?? []
  );

  return {
    assets: activeQuery.data?.assets ?? [],
    assetIds,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error?.message ?? null,
    refetch: activeQuery.refetch,
  };
}
