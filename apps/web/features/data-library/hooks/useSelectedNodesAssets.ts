/**
 * Story 9.8: useSelectedNodesAssets Hook
 * Task 4.4-4.6: Fetches assets linked to multiple selected nodes and provides union/de-duplication
 * 
 * Features:
 * - Fetches links for multiple selected nodes
 * - De-duplicates assets by ID
 * - Groups by linkType (input/output/reference)
 * - Tracks provenance (which nodes link to each asset)
 */

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DataAssetWithFolder, DataLinkType, NodeDataLinkWithAsset } from '@cdm/types';
import { fetchNodeAssetLinksByNodes } from '../api/data-assets';

// ========================================
// Types
// ========================================

export interface AssetWithProvenance {
    asset: DataAssetWithFolder;
    /** Link types this asset has across all selected nodes */
    linkTypes: Set<DataLinkType>;
    /** Node IDs that link to this asset */
    sourceNodeIds: string[];
}

export interface GroupedAssets {
    input: AssetWithProvenance[];
    output: AssetWithProvenance[];
    reference: AssetWithProvenance[];
}

export interface UseSelectedNodesAssetsResult {
    /** All unique assets from selected nodes */
    assets: AssetWithProvenance[];
    /** Assets grouped by link type */
    groupedAssets: GroupedAssets;
    /** Total unique asset count */
    totalCount: number;
    /** Loading state */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Refetch function */
    refetch: () => void;
}

// ========================================
// API Fetch Function
// ========================================

async function fetchLinksForNodes(nodeIds: string[]): Promise<NodeDataLinkWithAsset[]> {
    if (nodeIds.length === 0) return [];
    const data = await fetchNodeAssetLinksByNodes(nodeIds);
    return data.links ?? [];
}

// ========================================
// Hook
// ========================================

export function useSelectedNodesAssets(
    selectedNodeIds: Set<string>
): UseSelectedNodesAssetsResult {
    const nodeIdArray = useMemo(() => Array.from(selectedNodeIds).sort(), [selectedNodeIds]);

    const {
        data: links = [] as NodeDataLinkWithAsset[],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['node-asset-links', nodeIdArray],
        queryFn: () => fetchLinksForNodes(nodeIdArray),
        enabled: nodeIdArray.length > 0,
        staleTime: 30000, // 30 seconds
    });

    // De-duplicate and group assets
    const { assets, groupedAssets } = useMemo(() => {
        const assetMap = new Map<string, AssetWithProvenance>();

        for (const link of links) {
            const existing = assetMap.get(link.assetId);
            if (existing) {
                // Add source node and link type
                existing.linkTypes.add(link.linkType);
                if (!existing.sourceNodeIds.includes(link.nodeId)) {
                    existing.sourceNodeIds.push(link.nodeId);
                }
            } else {
                // New asset
                assetMap.set(link.assetId, {
                    asset: link.asset,
                    linkTypes: new Set([link.linkType]),
                    sourceNodeIds: [link.nodeId],
                });
            }
        }

        const allAssets = Array.from(assetMap.values());

        // Group by link type
        const grouped: GroupedAssets = {
            input: [],
            output: [],
            reference: [],
        };

        for (const item of allAssets) {
            if (item.linkTypes.has('input')) {
                grouped.input.push(item);
            }
            if (item.linkTypes.has('output')) {
                grouped.output.push(item);
            }
            if (item.linkTypes.has('reference')) {
                grouped.reference.push(item);
            }
        }

        return { assets: allAssets, groupedAssets: grouped };
    }, [links]);

    return {
        assets,
        groupedAssets,
        totalCount: assets.length,
        isLoading,
        error: error instanceof Error ? error.message : null,
        refetch,
    };
}

export default useSelectedNodesAssets;
