'use client';

/**
 * Story 7.8: RightSidebar Node Data Hook
 * Handles node data fetching, ensureNodeExists/backfill, and timestamps completion
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { NodeType, type EnhancedNodeData, type NodeProps, type Deliverable } from '@cdm/types';
import type { Graph, Node } from '@antv/x6';
import type * as Y from 'yjs';
import { syncLogger as logger } from '@/lib/logger';
import { fetchNode } from '@/lib/api/nodes';
import { DEFAULT_CREATOR_NAME } from '@/lib/constants';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';
import { ensureNodeExists as ensureNodeExistsInternal } from './ensureNodeExists';
import { ensureNodeTimestamps } from './nodeDataUtils';

export interface UseRightSidebarNodeDataProps {
  selectedNodeId: string | null;
  graph: Graph | null;
  graphId: string;
  yDoc?: Y.Doc | null;
  creatorName?: string;
}

export interface UseRightSidebarNodeDataResult {
  nodeData: EnhancedNodeData | null;
  setNodeData: React.Dispatch<React.SetStateAction<EnhancedNodeData | null>>;
  isLoading: boolean;
  fetchError: string | null;
  getX6Node: (nodeId: string) => Node | null;
  getYjsNode: (nodeId: string) => YjsNodeData | null;
  resolvedCreatorName: string;
}

/**
 * Hook for managing RightSidebar node data
 * Handles fetching, ensureNodeExists/backfill logic, and data subscriptions
 */
export function useRightSidebarNodeData({
  selectedNodeId,
  graph,
  graphId,
  yDoc = null,
  creatorName,
}: UseRightSidebarNodeDataProps): UseRightSidebarNodeDataResult {
  const resolvedCreatorName = creatorName || DEFAULT_CREATOR_NAME;
  const [nodeData, setNodeData] = useState<EnhancedNodeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const selectedNodeIdRef = useRef<string | null>(selectedNodeId);

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  const isSelectedNodeId = useCallback((nodeId: string) => selectedNodeIdRef.current === nodeId, []);

  // Get X6 Node reference from graph
  const getX6Node = useCallback((nodeId: string): Node | null => {
    if (!graph) return null;
    const cell = graph.getCellById(nodeId);
    if (cell && cell.isNode()) {
      return cell as Node;
    }
    return null;
  }, [graph]);

  const getYjsNode = useCallback((nodeId: string): YjsNodeData | null => {
    if (!yDoc) return null;
    const yNodes = yDoc.getMap<YjsNodeData>('nodes');
    return yNodes.get(nodeId) ?? null;
  }, [yDoc]);

  const ensureNodeExists = useCallback(async (nodeId: string, node: Node) => {
    await ensureNodeExistsInternal({
      nodeId,
      node,
      graph,
      graphId,
      resolvedCreatorName,
      setNodeData,
      isSelectedNodeId,
    });
  }, [graph, graphId, resolvedCreatorName, isSelectedNodeId]);

  // Fetch node data when selectedNodeId changes
  useEffect(() => {
    if (!selectedNodeId) {
      setNodeData(null);
      setFetchError(null);
      return;
    }

    // First, try to get data from X6 graph (local state)
    const x6Node = getX6Node(selectedNodeId);
    if (x6Node) {
      const graphData = x6Node.getData() || {};
      const { createdAt, updatedAt, creator } = ensureNodeTimestamps(x6Node, resolvedCreatorName);
      // Create EnhancedNodeData from X6 node data
      setNodeData({
        id: selectedNodeId,
        label: graphData.label || '未命名节点',
        description: typeof graphData.description === 'string' ? graphData.description : undefined,
        type: graphData.nodeType || NodeType.ORDINARY,
        props: graphData.props || {},
        tags: Array.isArray(graphData.tags) ? graphData.tags : [],
        approval: graphData.approval ?? null,
        deliverables: Array.isArray(graphData.deliverables) ? graphData.deliverables : undefined,
        isArchived: typeof graphData.isArchived === 'boolean' ? graphData.isArchived : false,
        archivedAt:
          typeof graphData.archivedAt === 'string' || graphData.archivedAt === null
            ? graphData.archivedAt
            : null,
        createdAt,
        updatedAt,
        creator,
      });
      setFetchError(null);
      void ensureNodeExists(selectedNodeId, x6Node);
      return;
    }

    // If not in graph, try Yjs
    const yjsNode = getYjsNode(selectedNodeId);
    if (yjsNode) {
      setNodeData({
        id: selectedNodeId,
        label: yjsNode.label || '未命名节点',
        description: undefined,
        type: (yjsNode.nodeType as NodeType) || NodeType.ORDINARY,
        props: yjsNode.props !== undefined ? (yjsNode.props as NodeProps) : {},
        tags: Array.isArray(yjsNode.tags) ? yjsNode.tags : [],
        approval: yjsNode.approval ?? null,
        deliverables: Array.isArray(yjsNode.deliverables) ? yjsNode.deliverables : undefined,
        isArchived: typeof yjsNode.isArchived === 'boolean' ? yjsNode.isArchived : false,
        archivedAt: yjsNode.archivedAt ?? null,
        createdAt: yjsNode.createdAt,
        updatedAt: yjsNode.updatedAt,
        creator: yjsNode.creator || resolvedCreatorName,
      });
      setFetchError(null);
      return;
    }

    // If not in graph or Yjs, fetch from API
    setIsLoading(true);
    setFetchError(null);

    fetchNode(selectedNodeId)
      .then((data) => {
        if (data) {
          setNodeData(data);
        } else {
          // Fallback: create minimal node data for new nodes
          setNodeData({
            id: selectedNodeId,
            label: '新节点',
            type: NodeType.ORDINARY,
            props: {},
            creator: resolvedCreatorName,
          });
        }
      })
      .catch((err) => {
        setFetchError('无法加载节点数据');
        logger.error('Fetch node error', { nodeId: selectedNodeId, error: err });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedNodeId, getX6Node, getYjsNode, ensureNodeExists, resolvedCreatorName]);

  // Subscribe to data changes for the selected node
  useEffect(() => {
    if (!selectedNodeId) return;

    // Prefer graph updates when available
    const x6Node = getX6Node(selectedNodeId);
    if (x6Node) {
      const handleNodeDataChange = () => {
        const data = x6Node.getData() || {};

        // Guard: ignore stale updates (older than current nodeData.updatedAt)
        setNodeData((prev) => {
          const incomingUpdatedAt = data.updatedAt as string | undefined;
          if (prev?.updatedAt && incomingUpdatedAt) {
            const incomingTime = new Date(incomingUpdatedAt).getTime();
            const prevTime = new Date(prev.updatedAt).getTime();
            if (incomingTime < prevTime) {
              return prev; // stale payload, skip
            }
          }

          // IMPORTANT: do not fall back to previous props when data.props is an empty array; only fallback when undefined
          const nextProps = data.props !== undefined
            ? (data.props as NodeProps)
            : (prev?.props || {});

          return {
            id: selectedNodeId,
            label: data.label || prev?.label || '未命名节点',
            description: typeof data.description === 'string' ? data.description : prev?.description,
            type: (data.nodeType as NodeType) || prev?.type || NodeType.ORDINARY,
            props: nextProps,
            tags: Array.isArray(data.tags) ? data.tags : prev?.tags ?? [],
            approval: data.approval !== undefined ? data.approval : prev?.approval,
            deliverables: data.deliverables !== undefined
              ? (Array.isArray(data.deliverables) ? data.deliverables as Deliverable[] : [])
              : prev?.deliverables,
            isArchived: typeof data.isArchived === 'boolean' ? data.isArchived : prev?.isArchived,
            archivedAt:
              typeof data.archivedAt === 'string' || data.archivedAt === null
                ? data.archivedAt
                : prev?.archivedAt,
            createdAt: data.createdAt ?? prev?.createdAt,
            updatedAt: data.updatedAt ?? prev?.updatedAt,
            creator: data.creator ?? prev?.creator ?? resolvedCreatorName,
          } as EnhancedNodeData;
        });
      };

      x6Node.on('change:data', handleNodeDataChange);
      return () => {
        x6Node.off('change:data', handleNodeDataChange);
      };
    }

    // Fall back to Yjs updates
    if (yDoc) {
      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const handleYjsChange = () => {
        const yjsNode = yNodes.get(selectedNodeId);
        if (!yjsNode) return;
        setNodeData({
          id: selectedNodeId,
          label: yjsNode.label || '未命名节点',
          type: (yjsNode.nodeType as NodeType) || NodeType.ORDINARY,
          // Fix: Use props directly, fallback to empty object only when undefined
          props: yjsNode.props !== undefined ? (yjsNode.props as NodeProps) : {},
          tags: Array.isArray(yjsNode.tags) ? yjsNode.tags : [],
          approval: yjsNode.approval ?? null,
          deliverables: Array.isArray(yjsNode.deliverables) ? yjsNode.deliverables : undefined,
          isArchived: typeof yjsNode.isArchived === 'boolean' ? yjsNode.isArchived : false,
          archivedAt: yjsNode.archivedAt ?? null,
          createdAt: yjsNode.createdAt,
          updatedAt: yjsNode.updatedAt,
          creator: yjsNode.creator || resolvedCreatorName,
        });
      };

      yNodes.observe(handleYjsChange);
      return () => {
        yNodes.unobserve(handleYjsChange);
      };
    }
  }, [selectedNodeId, getX6Node, yDoc, resolvedCreatorName]);

  return {
    nodeData,
    setNodeData,
    isLoading,
    fetchError,
    getX6Node,
    getYjsNode,
    resolvedCreatorName,
  };
}
