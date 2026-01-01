'use client';

/**
 * Story 7.8: RightSidebar Actions Hook
 * Handles Graph/Yjs sync, debounced persistence, and all action handlers
 */

import { useCallback, useRef, useEffect } from 'react';
import { NodeType, type EnhancedNodeData, type NodeProps, sanitizeNodeProps, type Deliverable, type ApprovalPipeline } from '@cdm/types';
import type { Graph, Node } from '@antv/x6';
import type * as Y from 'yjs';
import { syncLogger as logger } from '@/lib/logger';
import {
  archiveNode,
  unarchiveNode,
  updateNodeProps,
  updateNodeTags,
  updateNodeType,
} from '@/lib/api/nodes';
import { PROPS_UPDATE_DEBOUNCE_MS } from '@/lib/constants';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';
import { syncApprovalToYDoc, syncArchiveToYDoc, syncTagsToYDoc } from './yDocSync';

export interface UseRightSidebarActionsProps {
  nodeData: EnhancedNodeData | null;
  setNodeData: React.Dispatch<React.SetStateAction<EnhancedNodeData | null>>;
  graph: Graph | null;
  yDoc?: Y.Doc | null;
  getX6Node: (nodeId: string) => Node | null;
  resolvedCreatorName: string;
  onClose?: () => void;
}

export interface UseRightSidebarActionsResult {
  handleTypeChange: (nodeId: string, newType: NodeType) => Promise<void>;
  handlePropsUpdate: (nodeId: string, nodeType: NodeType, props: NodeProps) => Promise<void>;
  handleTagsUpdate: (nodeId: string, tags: string[]) => void;
  handleArchiveToggle: (nodeId: string, nextIsArchived: boolean) => Promise<void>;
  handleApprovalUpdate: (nodeId: string, payload: { approval: ApprovalPipeline | null; deliverables: Deliverable[] }) => Promise<void>;
}

/**
 * Hook for managing RightSidebar actions
 * Handles syncToGraph, debounced persistence, and all handlers
 */
export function useRightSidebarActions({
  nodeData,
  setNodeData,
  graph,
  yDoc = null,
  getX6Node,
  resolvedCreatorName,
  onClose,
}: UseRightSidebarActionsProps): UseRightSidebarActionsResult {
  const propsUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (propsUpdateTimer.current) {
        clearTimeout(propsUpdateTimer.current);
      }
    };
  }, []);

  // Sync node data changes to X6 Graph (triggers Yjs sync via GraphSyncManager)
  const syncToGraph = useCallback((nodeId: string, data: Partial<EnhancedNodeData>) => {
    const x6Node = getX6Node(nodeId);
    if (x6Node) {
      const existingData = x6Node.getData() || {};
      const now = new Date().toISOString();
      const createdAt = existingData.createdAt ?? now;
      const updatedAt = now;
      const nextProps = data.props !== undefined ? data.props : existingData.props;
      // Merge with existing data and update X6 node
      // This triggers 'node:change:data' event which GraphSyncManager observes
      // Always overwrite props to allow empty arrays (e.g., knowledgeRefs: []) to clear correctly
      x6Node.setData({
        ...existingData,
        nodeType: data.type ?? existingData.nodeType,  // Use nodeType field as defined in GraphSyncManager
        props: nextProps,
        createdAt,
        updatedAt,
      }, { overwrite: true });
      logger.debug('Synced node data to X6 graph', { nodeId, data });
      return;
    }

    if (yDoc) {
      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const existing = yNodes.get(nodeId);
      if (!existing) return;
      const now = new Date().toISOString();
      const createdAt = existing.createdAt ?? now;
      const creator = existing.creator ?? resolvedCreatorName;

      yDoc.transact(() => {
        yNodes.set(nodeId, {
          ...existing,
          nodeType: (data.type ?? existing.nodeType) as NodeType,
          props: data.props ?? existing.props,
          createdAt,
          updatedAt: now,
          creator,
        });
      });
      logger.debug('Synced node data to Yjs', { nodeId, data });
    }
  }, [getX6Node, yDoc, resolvedCreatorName]);

  const schedulePropsPersist = useCallback((nodeId: string, nodeType: NodeType, props: NodeProps) => {
    if (propsUpdateTimer.current) {
      clearTimeout(propsUpdateTimer.current);
    }
    propsUpdateTimer.current = setTimeout(() => {
      updateNodeProps(nodeId, nodeType, props)
        .then((success) => {
          if (!success) {
            logger.warn('Backend props update failed, but local/Yjs state updated', { nodeId, nodeType });
          }
        })
        .catch((error) => {
          logger.error('Failed to update node properties', { nodeId, nodeType, error });
        });
    }, PROPS_UPDATE_DEBOUNCE_MS);
  }, []);

  // Handle type change - sync to both API and X6/Yjs
  const handleTypeChange = useCallback(async (nodeId: string, newType: NodeType) => {
    const now = new Date().toISOString();
    // Optimistic update
    if (nodeData) {
      setNodeData({
        ...nodeData,
        type: newType,
        props: {}, // Reset props when type changes
        createdAt: nodeData.createdAt ?? now,
        updatedAt: now,
      });
    }

    // Sync to X6 Graph → triggers Yjs sync via GraphSyncManager
    syncToGraph(nodeId, { type: newType, props: {} });

    if (propsUpdateTimer.current) {
      clearTimeout(propsUpdateTimer.current);
      propsUpdateTimer.current = null;
    }

    // Persist to backend API (background, non-blocking)
    updateNodeType(nodeId, newType).then((success) => {
      if (!success) {
        logger.warn('Backend type update failed, but local/Yjs state updated', { nodeId, newType });
      }
    });
  }, [nodeData, setNodeData, syncToGraph]);

  // Handle properties update - sync to both API and X6/Yjs
  const handlePropsUpdate = useCallback(async (nodeId: string, nodeType: NodeType, props: NodeProps) => {
    const sanitizedProps = sanitizeNodeProps(nodeType, props as Record<string, unknown>) as NodeProps;
    const now = new Date().toISOString();
    // Optimistic update
    if (nodeData) {
      setNodeData({
        ...nodeData,
        props: sanitizedProps,
        createdAt: nodeData.createdAt ?? now,
        updatedAt: now,
      });
    }

    // Sync to X6 Graph → triggers Yjs sync via GraphSyncManager
    syncToGraph(nodeId, { type: nodeType, props: sanitizedProps });

    // Persist to backend API (debounced)
    schedulePropsPersist(nodeId, nodeType, sanitizedProps);
  }, [nodeData, setNodeData, syncToGraph, schedulePropsPersist]);

  const handleTagsUpdate = useCallback(
    (nodeId: string, tags: string[]) => {
      const now = new Date().toISOString();

      setNodeData((prev) => (prev ? { ...prev, tags, updatedAt: now } : prev));

      const x6Node = getX6Node(nodeId);
      if (x6Node) {
        x6Node.updateData({ tags, updatedAt: now });
      } else if (yDoc) {
        syncTagsToYDoc(yDoc, nodeId, tags, resolvedCreatorName);
      }

      updateNodeTags(nodeId, tags).then((success) => {
        if (!success) {
          logger.warn('Backend tags update failed, but local state updated', { nodeId });
        }
      });
    },
    [getX6Node, setNodeData, yDoc, resolvedCreatorName]
  );

  const handleArchiveToggle = useCallback(
    async (nodeId: string, nextIsArchived: boolean) => {
      const success = nextIsArchived ? await archiveNode(nodeId) : await unarchiveNode(nodeId);
      if (!success) {
        logger.warn('Backend archive toggle failed', { nodeId, nextIsArchived });
        return;
      }

      const now = new Date().toISOString();
      const archivedAt = nextIsArchived ? now : null;

      setNodeData((prev) =>
        prev
          ? {
            ...prev,
            isArchived: nextIsArchived,
            archivedAt,
            updatedAt: now,
          }
          : prev
      );

      const x6Node = getX6Node(nodeId);
      if (x6Node) {
        const existingData = x6Node.getData() || {};
        x6Node.setData({
          ...existingData,
          isArchived: nextIsArchived,
          archivedAt,
          updatedAt: now,
        });

        if (nextIsArchived) {
          x6Node.hide();
          graph?.cleanSelection();
          onClose?.();
        } else {
          x6Node.show();
        }
      } else if (yDoc) {
        syncArchiveToYDoc(yDoc, nodeId, nextIsArchived, archivedAt, resolvedCreatorName);
        if (nextIsArchived) {
          onClose?.();
        }
      }
    },
    [getX6Node, graph, onClose, setNodeData, yDoc, resolvedCreatorName]
  );

  // Story 4.1 + Story 7.2: Handle approval-related updates (sync deliverables to X6/Yjs)
  const handleApprovalUpdate = useCallback(async (nodeId: string, payload: { approval: ApprovalPipeline | null; deliverables: Deliverable[] }) => {
    try {
      // Sync deliverables directly to X6 node for Yjs propagation
      const x6Node = getX6Node(nodeId);
      if (x6Node) {
        const existingData = x6Node.getData() || {};
        const now = new Date().toISOString();
        const existingProps = existingData.props;
        const { approval, deliverables } = payload;
        const nextProps = (existingProps && typeof existingProps === 'object' && !Array.isArray(existingProps))
          ? { ...(existingProps as Record<string, unknown>), deliverables }
          : { deliverables };
        // IMPORTANT: use overwrite mode so deliverables array syncs correctly to Yjs
        x6Node.setData({
          ...existingData,
          deliverables,
          approval,
          props: nextProps as NodeProps,
          updatedAt: now,
        }, { overwrite: true });
        logger.debug('Synced deliverables to X6 for Yjs propagation', { nodeId, deliverablesCount: deliverables.length });
      } else if (yDoc) {
        syncApprovalToYDoc(yDoc, nodeId, payload, resolvedCreatorName);
        logger.debug('Synced deliverables to Yjs (graph not ready)', { nodeId, deliverablesCount: payload.deliverables.length });
      }
    } catch (error) {
      logger.error('Failed to sync deliverables after update', { nodeId, error });
    }
  }, [getX6Node, yDoc, resolvedCreatorName]);

  return {
    handleTypeChange,
    handlePropsUpdate,
    handleTagsUpdate,
    handleArchiveToggle,
    handleApprovalUpdate,
  };
}
