'use client';

/**
 * Story 7.8: RightSidebar Component - Refactored
 * Orchestration + Rendering only. Data/actions logic extracted to hooks.
 */

import { PropertyPanel } from '@/components/PropertyPanel';
import type { Graph } from '@antv/x6';
import type * as Y from 'yjs';
import { useRightSidebarNodeData } from '@/hooks/right-sidebar/useRightSidebarNodeData';
import { useRightSidebarActions } from '@/hooks/right-sidebar/useRightSidebarActions';

// Story 4.1: FIX-9 - currentUserId removed, now uses context
export interface RightSidebarProps {
  selectedNodeId: string | null;
  graph: Graph | null;  // X6 Graph reference for Yjs sync
  graphId: string;
  yDoc?: Y.Doc | null; // Yjs doc for sync when graph is not available
  creatorName?: string; // Default creator name for new nodes
  onClose?: () => void;
}

export function RightSidebar({
  selectedNodeId,
  graph,
  graphId,
  yDoc = null,
  creatorName,
  onClose,
}: RightSidebarProps) {
  // Node data management (fetch, ensureNodeExists, subscriptions)
  const {
    nodeData,
    setNodeData,
    isLoading,
    fetchError,
    getX6Node,
    resolvedCreatorName,
  } = useRightSidebarNodeData({
    selectedNodeId,
    graph,
    graphId,
    yDoc,
    creatorName,
  });

  // Action handlers (type change, props update, tags, archive, approval)
  const {
    handleTypeChange,
    handlePropsUpdate,
    handleTagsUpdate,
    handleArchiveToggle,
    handleApprovalUpdate,
  } = useRightSidebarActions({
    nodeData,
    setNodeData,
    graph,
    yDoc,
    getX6Node,
    resolvedCreatorName,
    onClose,
  });

  if (!selectedNodeId) {
    return null;
  }

  if (isLoading) {
    return (
      <aside className="w-80 h-full bg-white/95 backdrop-blur-md border-l border-gray-200/50 flex items-center justify-center">
        <div className="text-sm text-gray-500">加载中...</div>
      </aside>
    );
  }

  if (fetchError) {
    return (
      <aside className="w-80 h-full bg-white/95 backdrop-blur-md border-l border-gray-200/50 flex items-center justify-center">
        <div className="text-sm text-red-500">{fetchError}</div>
      </aside>
    );
  }

  return (
    <PropertyPanel
      nodeId={selectedNodeId}
      nodeData={nodeData || undefined}
      onClose={onClose}
      onTypeChange={handleTypeChange}
      onPropsUpdate={handlePropsUpdate}
      onTagsUpdate={handleTagsUpdate}
      onArchiveToggle={handleArchiveToggle}
      onApprovalUpdate={handleApprovalUpdate}
    />
  );
}
