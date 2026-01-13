'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useConfirmDialog } from '@cdm/ui';
import type { DataAssetWithFolder } from '@cdm/types';
import {
  softDeleteDataAsset,
  softDeleteDataAssets,
  restoreDataAsset,
  hardDeleteDataAsset,
  emptyTrash,
} from '../api/data-assets';

type ConfirmOptions = { onSuccess?: () => void };

export function useAssetDelete(graphId: string) {
  const queryClient = useQueryClient();
  const { showConfirm } = useConfirmDialog();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['data-assets'] });
    if (graphId) {
      queryClient.invalidateQueries({ queryKey: ['data-folders', graphId] });
    }
  }, [graphId, queryClient]);

  const softDeleteMutation = useMutation({
    mutationFn: (id: string) => softDeleteDataAsset(id),
    onSuccess: invalidate,
  });

  const softDeleteBatchMutation = useMutation({
    mutationFn: (ids: string[]) => softDeleteDataAssets(ids),
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreDataAsset(id),
    onSuccess: invalidate,
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => hardDeleteDataAsset(id),
    onSuccess: invalidate,
  });

  const emptyTrashMutation = useMutation({
    mutationFn: () => emptyTrash(graphId),
    onSuccess: invalidate,
  });

  const softDelete = useCallback(
    async (id: string) => softDeleteMutation.mutateAsync(id),
    [softDeleteMutation]
  );

  const softDeleteBatch = useCallback(
    async (ids: string[]) => softDeleteBatchMutation.mutateAsync(ids),
    [softDeleteBatchMutation]
  );

  const restore = useCallback(
    async (id: string) => restoreMutation.mutateAsync(id),
    [restoreMutation]
  );

  const hardDelete = useCallback(
    async (id: string) => hardDeleteMutation.mutateAsync(id),
    [hardDeleteMutation]
  );

  const empty = useCallback(async () => emptyTrashMutation.mutateAsync(), [emptyTrashMutation]);

  const confirmSoftDelete = useCallback(
    (asset: DataAssetWithFolder, options?: ConfirmOptions) => {
      showConfirm({
        title: '删除资产',
        description: `确定要删除“${asset.name}”吗？删除后将移入回收站，可在回收站恢复。`,
        confirmText: '删除',
        cancelText: '取消',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await softDelete(asset.id);
            toast.success('已移入回收站');
            options?.onSuccess?.();
          } catch (err) {
            const message = err instanceof Error ? err.message : '删除失败';
            toast.error(message);
          }
        },
      });
    },
    [showConfirm, softDelete]
  );

  const confirmSoftDeleteBatch = useCallback(
    (ids: string[], options?: ConfirmOptions) => {
      const count = ids.length;
      if (count === 0) return;

      showConfirm({
        title: '批量删除资产',
        description: `确定要删除这 ${count} 个资产吗？删除后将移入回收站，可在回收站恢复。`,
        confirmText: `删除 (${count})`,
        cancelText: '取消',
        variant: 'danger',
        onConfirm: async () => {
          try {
            const res = await softDeleteBatch(ids);
            toast.success(`已删除 ${res.deletedCount} 个资产`);
            options?.onSuccess?.();
          } catch (err) {
            const message = err instanceof Error ? err.message : '删除失败';
            toast.error(message);
          }
        },
      });
    },
    [showConfirm, softDeleteBatch]
  );

  const confirmHardDelete = useCallback(
    (asset: DataAssetWithFolder, linkedNodeCount = 0, options?: ConfirmOptions) => {
      const linkHint =
        linkedNodeCount > 0
          ? `该资产与 ${linkedNodeCount} 个节点存在关联，永久删除将自动解除关联并删除物理文件。`
          : '永久删除将删除物理文件。';

      showConfirm({
        title: '永久删除资产',
        description: `${linkHint}\n此操作无法撤销。`,
        confirmText: '永久删除',
        cancelText: '取消',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await hardDelete(asset.id);
            toast.success('已永久删除');
            options?.onSuccess?.();
          } catch (err) {
            const message = err instanceof Error ? err.message : '删除失败';
            toast.error(message);
          }
        },
      });
    },
    [hardDelete, showConfirm]
  );

  const confirmEmptyTrash = useCallback(
    (count: number, options?: ConfirmOptions) => {
      if (count <= 0) return;

      showConfirm({
        title: '清空回收站',
        description: `确定要永久删除回收站内的 ${count} 个资产吗？此操作无法撤销。`,
        confirmText: '清空回收站',
        cancelText: '取消',
        variant: 'danger',
        onConfirm: async () => {
          try {
            const res = await empty();
            toast.success(`已永久删除 ${res.deletedCount} 个资产`);
            options?.onSuccess?.();
          } catch (err) {
            const message = err instanceof Error ? err.message : '清空失败';
            toast.error(message);
          }
        },
      });
    },
    [empty, showConfirm]
  );

  const isDeleting = useMemo(
    () =>
      softDeleteMutation.isPending ||
      softDeleteBatchMutation.isPending ||
      hardDeleteMutation.isPending ||
      emptyTrashMutation.isPending,
    [
      emptyTrashMutation.isPending,
      hardDeleteMutation.isPending,
      softDeleteBatchMutation.isPending,
      softDeleteMutation.isPending,
    ]
  );

  const isRestoring = restoreMutation.isPending;

  return {
    softDelete,
    softDeleteBatch,
    restore,
    hardDelete,
    emptyTrash: empty,
    confirmSoftDelete,
    confirmSoftDeleteBatch,
    confirmHardDelete,
    confirmEmptyTrash,
    isDeleting,
    isRestoring,
  };
}

export default useAssetDelete;

