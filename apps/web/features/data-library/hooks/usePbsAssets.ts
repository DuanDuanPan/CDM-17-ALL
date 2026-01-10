/**
 * Story 9.2: PBS Assets Hook
 * Fetches data assets linked to PBS node(s) via NodeDataLink
 * Uses TanStack Query for data fetching and caching
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchNodeAssets, fetchNodeAssetsByNodes } from '../api/data-assets';

interface UsePbsAssetsOptions {
  /** Selected PBS node ID (null if none selected) */
  selectedNodeId: string | null;
  /** Include assets from descendant nodes */
  includeSubNodes?: boolean;
  /** Function to get all descendant node IDs */
  getDescendantIds?: (nodeId: string) => string[];
}

/**
 * Hook to fetch data assets linked to PBS node(s)
 * Supports single node or batch query for "include sub-nodes" feature
 */
export function usePbsAssets({
  selectedNodeId,
  includeSubNodes = false,
  getDescendantIds,
}: UsePbsAssetsOptions) {
  // Determine which node IDs to query
  const nodeIds = selectedNodeId
    ? includeSubNodes && getDescendantIds
      ? getDescendantIds(selectedNodeId)
      : [selectedNodeId]
    : [];

  // Single node query
  const singleNodeQuery = useQuery({
    queryKey: ['data-assets', 'links', 'node', selectedNodeId],
    queryFn: () => fetchNodeAssets(selectedNodeId!),
    enabled: !!selectedNodeId && !includeSubNodes,
    staleTime: 30_000, // 30s cache
  });

  // Batch query for multiple nodes
  const batchQuery = useQuery({
    queryKey: ['data-assets', 'links', 'nodes', nodeIds.sort().join(',')],
    queryFn: () => fetchNodeAssetsByNodes(nodeIds),
    enabled: !!selectedNodeId && includeSubNodes && nodeIds.length > 0,
    staleTime: 30_000,
  });

  // Return appropriate query result based on mode
  const activeQuery = includeSubNodes ? batchQuery : singleNodeQuery;

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
