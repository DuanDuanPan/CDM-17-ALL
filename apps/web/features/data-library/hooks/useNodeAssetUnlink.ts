/**
 * Story 9.8: useNodeAssetUnlink Hook
 * Task 7.1-7.5: Handles unlinking assets from nodes with undo capability
 * 
 * Features:
 * - Single asset unlink from active node
 * - Batch unlink from multiple nodes (AC8)
 * - Sonner undo toast with restore action (AC7)
 * - Does NOT delete the asset entity - only removes NodeDataLink
 */

'use client';

import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DataLinkType } from '@cdm/types';
import { createNodeAssetLink, deleteNodeAssetLinksByNodes } from '../api/data-assets';

// ========================================
// Types
// ========================================

export interface UnlinkParams {
    nodeId: string;
    assetId: string;
}

export interface BatchUnlinkParams {
    nodeIds: string[];
    assetIds: string[];
}

export interface UnlinkResult {
    unlinked: Array<{
        nodeId: string;
        assetId: string;
        linkType: DataLinkType;
    }>;
}

export interface UseNodeAssetUnlinkOptions {
    /** Called after successful unlink (before undo timeout) */
    onSuccess?: () => void;
    /** Called after unlink is undone */
    onUndo?: () => void;
}

export interface UseNodeAssetUnlinkResult {
    /** Unlink single asset from a node */
    unlinkAsset: (params: UnlinkParams) => Promise<void>;
    /** Unlink multiple assets from multiple nodes */
    batchUnlink: (params: BatchUnlinkParams) => Promise<void>;
    /** Is currently unlinking */
    isUnlinking: boolean;
}

// ========================================
// API Functions
// ========================================

async function unlinkSingle(params: UnlinkParams): Promise<UnlinkResult> {
    return deleteNodeAssetLinksByNodes({ nodeIds: [params.nodeId], assetIds: [params.assetId] });
}

async function unlinkBatch(params: BatchUnlinkParams): Promise<UnlinkResult> {
    return deleteNodeAssetLinksByNodes(params);
}

async function relinkAssets(
    links: Array<{ nodeId: string; assetId: string; linkType: DataLinkType }>
): Promise<void> {
  // Re-create the links - uses existing link creation API
  for (const link of links) {
    await createNodeAssetLink({
      nodeId: link.nodeId,
      assetId: link.assetId,
      linkType: link.linkType,
    });
  }
}

// ========================================
// Hook
// ========================================

export function useNodeAssetUnlink(
    options: UseNodeAssetUnlinkOptions = {}
): UseNodeAssetUnlinkResult {
    const { onSuccess, onUndo } = options;
    const queryClient = useQueryClient();
    const pendingUndoRef = useRef<UnlinkResult | null>(null);

    const invalidateQueries = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['node-asset-links'] });
        queryClient.invalidateQueries({ queryKey: ['data-assets'] });
    }, [queryClient]);

    // Single unlink mutation
    const singleMutation = useMutation({
        mutationFn: unlinkSingle,
        onSuccess: (result) => {
            pendingUndoRef.current = result;
            onSuccess?.();
            invalidateQueries();

            // Show undo toast (AC7)
            toast('已解除关联', {
                description: '资产与节点的关联已移除',
                action: {
                    label: '撤销',
                    onClick: async () => {
                        if (pendingUndoRef.current) {
                            try {
                                await relinkAssets(pendingUndoRef.current.unlinked);
                                invalidateQueries();
                                onUndo?.();
                                toast.success('已恢复关联');
                            } catch (err) {
                                toast.error('恢复失败');
                            }
                        }
                    },
                },
                duration: 5000, // 5 seconds to undo
            });
        },
        onError: (error) => {
            toast.error(`解除关联失败: ${error instanceof Error ? error.message : '未知错误'}`);
        },
    });

    // Batch unlink mutation
    const batchMutation = useMutation({
        mutationFn: unlinkBatch,
        onSuccess: (result) => {
            pendingUndoRef.current = result;
            onSuccess?.();
            invalidateQueries();

            const count = result.unlinked.length;

            // Show undo toast (AC7, AC8)
            toast(`已解除 ${count} 条关联`, {
                description: '批量解除节点与资产的关联',
                action: {
                    label: '撤销',
                    onClick: async () => {
                        if (pendingUndoRef.current) {
                            try {
                                await relinkAssets(pendingUndoRef.current.unlinked);
                                invalidateQueries();
                                onUndo?.();
                                toast.success(`已恢复 ${count} 条关联`);
                            } catch (err) {
                                toast.error('恢复失败');
                            }
                        }
                    },
                },
                duration: 5000,
            });
        },
        onError: (error) => {
            toast.error(`批量解除关联失败: ${error instanceof Error ? error.message : '未知错误'}`);
        },
    });

    const unlinkAsset = useCallback(
        async (params: UnlinkParams) => {
            await singleMutation.mutateAsync(params);
        },
        [singleMutation]
    );

    const batchUnlink = useCallback(
        async (params: BatchUnlinkParams) => {
            await batchMutation.mutateAsync(params);
        },
        [batchMutation]
    );

    return {
        unlinkAsset,
        batchUnlink,
        isUnlinking: singleMutation.isPending || batchMutation.isPending,
    };
}

export default useNodeAssetUnlink;
