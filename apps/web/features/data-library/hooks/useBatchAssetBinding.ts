/**
 * Story 9.10: useBatchAssetBinding Hook
 * Handles batch binding assets to a target node via /api/data-assets/links:batch
 */

'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DataLinkType } from '@cdm/types';
import { createNodeAssetLinksBatch } from '../api/data-assets';

export interface BatchAssetBindingParams {
  nodeId: string;
  assetIds: string[];
  linkType?: DataLinkType;
}

export interface BatchAssetBindingResult {
  created: number;
  skipped: number;
}

export function useBatchAssetBinding() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: BatchAssetBindingParams): Promise<BatchAssetBindingResult> => {
      return createNodeAssetLinksBatch(params);
    },
    onSuccess: (result, params) => {
      queryClient.invalidateQueries({ queryKey: ['node-asset-links', params.nodeId] });

      const created = result.created ?? 0;
      const skipped = result.skipped ?? 0;

      if (created > 0) {
        toast.success(
          skipped > 0 ? `已绑定 ${created} 个资产（跳过 ${skipped} 个已存在关联）` : `已绑定 ${created} 个资产`
        );
        return;
      }

      if (skipped > 0) {
        toast.info(`资产已全部关联（跳过 ${skipped} 个）`);
        return;
      }

      toast.info('未绑定任何资产');
    },
    onError: (error) => {
      toast.error(`绑定失败: ${error instanceof Error ? error.message : '未知错误'}`);
    },
  });

  const bindAssets = useCallback(
    async (params: BatchAssetBindingParams): Promise<BatchAssetBindingResult> => {
      return mutation.mutateAsync(params);
    },
    [mutation]
  );

  return {
    bindAssets,
    isBinding: mutation.isPending,
  };
}

export default useBatchAssetBinding;

