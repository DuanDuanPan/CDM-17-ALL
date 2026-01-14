'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { DataAssetFormat, DataLinkType } from '@cdm/types';
import { useBatchAssetBinding } from '../hooks/useBatchAssetBinding';
import { toast } from 'sonner';
import { useGraphContextOptional } from '@/contexts';

export type SelectedAssetSummary = {
  id: string;
  name: string;
  format: DataAssetFormat;
};

export interface BindingState {
  isBindingMode: boolean;
  targetNodeId: string | null;
  selectedAssetIds: Set<string>;
  selectedAssetsById: Map<string, SelectedAssetSummary>;
}

export interface BindingActions {
  openForBinding: (params: { nodeId: string; nodeLabel?: string }) => void;
  toggleAssetSelection: (asset: SelectedAssetSummary) => void;
  removeAsset: (assetId: string) => void;
  clearSelection: () => void;
  confirmBinding: (params?: { linkType?: DataLinkType }) => Promise<{ created: number; skipped: number }>;
  exitBindingMode: () => void;
}

export type DataLibraryBindingContextValue = BindingState & BindingActions;

const DataLibraryBindingContext = createContext<DataLibraryBindingContextValue | null>(null);

export interface DataLibraryBindingProviderProps {
  children: React.ReactNode;
}

export function DataLibraryBindingProvider({ children }: DataLibraryBindingProviderProps) {
  const [isBindingMode, setIsBindingMode] = useState(false);
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(() => new Set());
  const [selectedAssetsById, setSelectedAssetsById] = useState<Map<string, SelectedAssetSummary>>(
    () => new Map()
  );

  const { bindAssets } = useBatchAssetBinding();
  const graphContext = useGraphContextOptional();

  const targetNodeIdRef = useRef<string | null>(null);
  useEffect(() => {
    targetNodeIdRef.current = targetNodeId;
  }, [targetNodeId]);

  const openForBinding = useCallback(({ nodeId }: { nodeId: string; nodeLabel?: string }) => {
    setIsBindingMode(true);
    setTargetNodeId(nodeId);
  }, []);

  const toggleAssetSelection = useCallback((asset: SelectedAssetSummary) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.add(asset.id);
      return next;
    });

    setSelectedAssetsById((prev) => {
      const next = new Map(prev);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.set(asset.id, asset);
      return next;
    });
  }, []);

  const removeAsset = useCallback((assetId: string) => {
    setSelectedAssetIds((prev) => {
      if (!prev.has(assetId)) return prev;
      const next = new Set(prev);
      next.delete(assetId);
      return next;
    });
    setSelectedAssetsById((prev) => {
      if (!prev.has(assetId)) return prev;
      const next = new Map(prev);
      next.delete(assetId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAssetIds(new Set());
    setSelectedAssetsById(new Map());
  }, []);

  const exitBindingMode = useCallback(() => {
    setIsBindingMode(false);
    setTargetNodeId(null);
  }, []);

  // Story 9.10: Listen for target node deletion (AC5)
  useEffect(() => {
    const graph = graphContext?.graph;
    if (!graph) return;

    const handleCellRemoved = ({ cell }: { cell?: { id?: string; isNode?: () => boolean } }) => {
      const currentTarget = targetNodeIdRef.current;
      if (!currentTarget) return;
      if (!cell?.id) return;
      if (cell.id !== currentTarget) return;

      // Only respond to node deletions
      if (typeof cell.isNode === 'function' && !cell.isNode()) return;

      exitBindingMode();
      toast.error('目标节点已删除，已退出绑定模式');
    };

    graph.on('cell:removed', handleCellRemoved);
    return () => {
      graph.off('cell:removed', handleCellRemoved);
    };
  }, [exitBindingMode, graphContext?.graph]);

  const confirmBinding = useCallback(
    async (params?: { linkType?: DataLinkType }) => {
      if (!targetNodeId) {
        throw new Error('No target node selected');
      }

      const graph = graphContext?.graph;
      const targetExists = graph ? !!graph.getCellById(targetNodeId) : true;
      if (!targetExists) {
        exitBindingMode();
        toast.error('目标节点已删除，无法绑定');
        throw new Error('Target node not found');
      }

      const assetIds = Array.from(selectedAssetIds);
      if (assetIds.length === 0) {
        return { created: 0, skipped: 0 };
      }

      return bindAssets({
        nodeId: targetNodeId,
        assetIds,
        linkType: params?.linkType,
      });
    },
    [bindAssets, exitBindingMode, graphContext?.graph, selectedAssetIds, targetNodeId]
  );

  const value = useMemo<DataLibraryBindingContextValue>(
    () => ({
      isBindingMode,
      targetNodeId,
      selectedAssetIds,
      selectedAssetsById,
      openForBinding,
      toggleAssetSelection,
      removeAsset,
      clearSelection,
      confirmBinding,
      exitBindingMode,
    }),
    [
      isBindingMode,
      targetNodeId,
      selectedAssetIds,
      selectedAssetsById,
      openForBinding,
      toggleAssetSelection,
      removeAsset,
      clearSelection,
      confirmBinding,
      exitBindingMode,
    ]
  );

  return <DataLibraryBindingContext.Provider value={value}>{children}</DataLibraryBindingContext.Provider>;
}

export function useDataLibraryBinding(): DataLibraryBindingContextValue {
  const ctx = useContext(DataLibraryBindingContext);
  if (!ctx) {
    throw new Error('useDataLibraryBinding must be used within a DataLibraryBindingProvider');
  }
  return ctx;
}

export function useDataLibraryBindingOptional(): DataLibraryBindingContextValue | null {
  return useContext(DataLibraryBindingContext);
}
