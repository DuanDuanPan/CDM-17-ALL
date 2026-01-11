/**
 * Story 9.2: Data Folders Hook
 * Fetches folder tree structure for organizing data assets
 * Uses TanStack Query for data fetching and caching
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  fetchDataFolders,
  createDataFolder,
  updateDataFolder,
  deleteDataFolder,
  updateDataAsset,
} from '../api/data-assets';
import type { DataFolderTreeNode } from '@cdm/types';

interface UseDataFoldersOptions {
  /** Graph ID for context */
  graphId: string;
  /** Enable/disable fetching (mutations still available) */
  enabled?: boolean;
}

/**
 * Hook for managing folder tree data
 * Provides CRUD operations and tree structure
 */
export function useDataFolders({ graphId, enabled = true }: UseDataFoldersOptions) {
  const queryClient = useQueryClient();

  // Query keys
  const foldersKey = ['data-folders', graphId];
  const assetsKey = ['data-assets', graphId];

  // Fetch folder tree
  const foldersQuery = useQuery({
    queryKey: foldersKey,
    queryFn: () => fetchDataFolders(graphId),
    enabled: enabled && !!graphId,
    staleTime: 30_000, // 30s cache
  });

  // Create folder mutation
  const createMutation = useMutation({
    mutationFn: createDataFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: foldersKey });
    },
  });

  // Update folder mutation
  const updateMutation = useMutation({
    mutationFn: updateDataFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: foldersKey });
    },
  });

  // Delete folder mutation
  const deleteMutation = useMutation({
    mutationFn: deleteDataFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: foldersKey });
    },
  });

  // Move asset to folder mutation
  const moveAssetMutation = useMutation({
    mutationFn: ({ assetId, folderId }: { assetId: string; folderId: string | null }) =>
      updateDataAsset({ id: assetId, folderId }),
    onSuccess: () => {
      // Invalidate both folders and assets queries
      queryClient.invalidateQueries({ queryKey: foldersKey });
      queryClient.invalidateQueries({ queryKey: assetsKey });
    },
  });

  // Create a new folder
  const handleCreateFolder = useCallback(
    async (name: string, parentId?: string) => {
      return createMutation.mutateAsync({
        graphId,
        name,
        parentId,
      });
    },
    [createMutation, graphId]
  );

  // Rename a folder
  const handleRenameFolder = useCallback(
    async (id: string, name: string) => {
      return updateMutation.mutateAsync({ id, name });
    },
    [updateMutation]
  );

  // Delete a folder
  const handleDeleteFolder = useCallback(
    async (id: string) => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  // Move asset to folder (drag-drop)
  const handleMoveAsset = useCallback(
    async (assetId: string, folderId: string | null) => {
      return moveAssetMutation.mutateAsync({ assetId, folderId });
    },
    [moveAssetMutation]
  );

  // Get flattened folder list for dropdown
  const flatFolders = useCallback(() => {
    const result: Array<{ id: string; name: string; depth: number }> = [];
    const traverse = (nodes: DataFolderTreeNode[], depth: number) => {
      for (const node of nodes) {
        result.push({ id: node.id, name: node.name, depth });
        if (node.children && node.children.length > 0) {
          traverse(node.children, depth + 1);
        }
      }
    };
    if (foldersQuery.data?.folders) {
      traverse(foldersQuery.data.folders, 0);
    }
    return result;
  }, [foldersQuery.data?.folders]);

  return {
    // Data
    folders: foldersQuery.data?.folders ?? [],
    flatFolders,

    // Loading states
    isLoading: foldersQuery.isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMovingAsset: moveAssetMutation.isPending,

    // Errors
    error: foldersQuery.error?.message ?? null,
    createError: createMutation.error?.message ?? null,
    updateError: updateMutation.error?.message ?? null,
    deleteError: deleteMutation.error?.message ?? null,
    moveAssetError: moveAssetMutation.error?.message ?? null,

    // Actions
    createFolder: handleCreateFolder,
    renameFolder: handleRenameFolder,
    deleteFolder: handleDeleteFolder,
    moveAsset: handleMoveAsset,
    refetch: foldersQuery.refetch,
  };
}
