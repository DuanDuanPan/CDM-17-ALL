'use client';

/**
 * Story 9.5: Asset Links Hook
 * Task 3.2: Encapsulates link CRUD operations
 * GR-2: Hook-First pattern for business logic
 *
 * @returns { linkAsset, unlinkAsset, isLinking }
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNodeAssetLinks,
  createNodeAssetLink,
  deleteNodeAssetLink,
} from '@/features/data-library/api/data-assets';
import type { NodeDataLinkWithAsset, DataLinkType } from '@cdm/types';

interface UseAssetLinksOptions {
  nodeId: string;
  enabled?: boolean;
  onLinkSuccess?: () => void;
  onUnlinkSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UseAssetLinksResult {
  links: NodeDataLinkWithAsset[];
  isLoading: boolean;
  isLinking: boolean;
  error: string | null;
  linkAsset: (assetId: string, linkType?: DataLinkType, note?: string) => Promise<boolean>;
  unlinkAsset: (assetId: string) => Promise<boolean>;
  refetch: () => void;
}

/**
 * Hook for managing node-asset links
 * AC#3, AC#4, AC#5: Link, display, and unlink assets
 */
export function useAssetLinks(options: UseAssetLinksOptions): UseAssetLinksResult {
  const { nodeId, enabled = true, onLinkSuccess, onUnlinkSuccess, onError } = options;

  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Query key for this node's links
  const queryKey = ['node-asset-links', nodeId];

  // Fetch links with asset details
  const query = useQuery({
    queryKey,
    queryFn: () => fetchNodeAssetLinks(nodeId),
    enabled: enabled && !!nodeId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  /**
   * Create link between node and asset
   * AC#3: Link asset with linkType
   */
  const linkAsset = useCallback(
    async (assetId: string, linkType: DataLinkType = 'reference', note?: string): Promise<boolean> => {
      if (!nodeId || !assetId) {
        setError('nodeId and assetId are required');
        return false;
      }

      setIsLinking(true);
      setError(null);

      try {
        await createNodeAssetLink({ nodeId, assetId, linkType, note });
        queryClient.invalidateQueries({ queryKey });
        onLinkSuccess?.();
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create link';
        setError(msg);
        onError?.(msg);
        return false;
      } finally {
        setIsLinking(false);
      }
    },
    [nodeId, queryClient, queryKey, onLinkSuccess, onError]
  );

  /**
   * Remove link between node and asset
   * AC#5: Unlink asset from node
   */
  const unlinkAsset = useCallback(
    async (assetId: string): Promise<boolean> => {
      if (!nodeId || !assetId) {
        setError('nodeId and assetId are required');
        return false;
      }

      setIsLinking(true);
      setError(null);

      try {
        await deleteNodeAssetLink(nodeId, assetId);
        queryClient.invalidateQueries({ queryKey });
        onUnlinkSuccess?.();
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to unlink asset';
        setError(msg);
        onError?.(msg);
        return false;
      } finally {
        setIsLinking(false);
      }
    },
    [nodeId, queryClient, queryKey, onUnlinkSuccess, onError]
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    links: query.data?.links ?? [],
    isLoading: query.isLoading,
    isLinking,
    error: error || (query.error?.message ?? null),
    linkAsset,
    unlinkAsset,
    refetch,
  };
}

export default useAssetLinks;
