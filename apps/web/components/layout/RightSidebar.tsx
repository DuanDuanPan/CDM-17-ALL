'use client';

/**
 * Story 2.1: Right Sidebar with Dynamic Property Panel
 * [AI-Review][HIGH-1,HIGH-2,LOW-1] Fixed: Integrated real API + Yjs sync + removed console.log
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PropertyPanel } from '@/components/PropertyPanel';
import { NodeType, type EnhancedNodeData, type NodeProps } from '@cdm/types';
import type { Graph, Node } from '@antv/x6';
import { syncLogger as logger } from '@/lib/logger';
import { createNode, fetchNode, updateNodeProps, updateNodeType } from '@/lib/api/nodes';
import { DEFAULT_CREATOR_NAME, PROPS_UPDATE_DEBOUNCE_MS } from '@/lib/constants';

export interface RightSidebarProps {
  selectedNodeId: string | null;
  graph: Graph | null;  // X6 Graph reference for Yjs sync
  graphId: string;
  creatorName?: string;
  onClose?: () => void;
}

function buildCreatePayload(
  nodeId: string,
  graphId: string,
  creatorName: string,
  node: Node
) {
  const data = node.getData() || {};
  const position = node.getPosition();
  return {
    id: nodeId,
    label: data.label || '未命名节点',
    type: data.nodeType || NodeType.ORDINARY,
    graphId,
    parentId: data.parentId,
    x: position.x,
    y: position.y,
    creatorName,
  };
}

function ensureNodeTimestamps(
  node: Node,
  creatorName: string
): { createdAt: string; updatedAt: string; creator: string } {
  const data = node.getData() || {};
  if (data.createdAt && data.updatedAt) {
    const creator = data.creator || creatorName;
    if (!data.creator && creator) {
      node.setData({ ...data, creator });
    }
    return { createdAt: data.createdAt, updatedAt: data.updatedAt, creator };
  }

  const now = new Date().toISOString();
  const createdAt = data.createdAt ?? now;
  const updatedAt = data.updatedAt ?? createdAt;
  const creator = data.creator || creatorName;
  node.setData({ ...data, createdAt, updatedAt, creator });
  return { createdAt, updatedAt, creator };
}

export function RightSidebar({ selectedNodeId, graph, graphId, creatorName, onClose }: RightSidebarProps) {
  const resolvedCreatorName = creatorName || DEFAULT_CREATOR_NAME;
  const [nodeData, setNodeData] = useState<EnhancedNodeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const propsUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get X6 Node reference from graph
  const getX6Node = useCallback((nodeId: string): Node | null => {
    if (!graph) return null;
    const cell = graph.getCellById(nodeId);
    if (cell && cell.isNode()) {
      return cell as Node;
    }
    return null;
  }, [graph]);

  const ensureNodeExists = useCallback(async (nodeId: string, node: Node) => {
    try {
      const existing = await fetchNode(nodeId);
      if (existing) {
        setNodeData((prev) => (prev ? { ...prev, ...existing } : existing));
        return;
      }

      const created = await createNode(
        buildCreatePayload(nodeId, graphId, resolvedCreatorName, node)
      );
      setNodeData((prev) => (prev ? { ...prev, ...created } : created));
    } catch (error) {
      const errorInfo = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { error };
      logger.error('Failed to ensure node exists', { nodeId, graphId, error: errorInfo });
    }
  }, [graphId, resolvedCreatorName]);

  // Sync node data changes to X6 Graph (triggers Yjs sync via GraphSyncManager)
  const syncToGraph = useCallback((nodeId: string, data: Partial<EnhancedNodeData>) => {
    const x6Node = getX6Node(nodeId);
    if (x6Node) {
      const existingData = x6Node.getData() || {};
      const now = new Date().toISOString();
      const createdAt = existingData.createdAt ?? now;
      const updatedAt = now;
      // Merge with existing data and update X6 node
      // This triggers 'node:change:data' event which GraphSyncManager observes
      x6Node.setData({
        ...existingData,
        nodeType: data.type ?? existingData.nodeType,  // Use nodeType field as defined in GraphSyncManager
        props: data.props ?? existingData.props,
        createdAt,
        updatedAt,
      });
      logger.debug('Synced node data to X6 graph', { nodeId, data });
    }
  }, [getX6Node]);

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

  useEffect(() => {
    return () => {
      if (propsUpdateTimer.current) {
        clearTimeout(propsUpdateTimer.current);
      }
    };
  }, []);

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
        type: graphData.nodeType || NodeType.ORDINARY,
        props: graphData.props || {},
        createdAt,
        updatedAt,
        creator,
      });
      setFetchError(null);
      void ensureNodeExists(selectedNodeId, x6Node);
      return;
    }

    // If not in graph, fetch from API
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
  }, [selectedNodeId, getX6Node, ensureNodeExists, resolvedCreatorName]);

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
  }, [nodeData, syncToGraph]);

  // Handle properties update - sync to both API and X6/Yjs
  const handlePropsUpdate = useCallback(async (nodeId: string, nodeType: NodeType, props: NodeProps) => {
    const now = new Date().toISOString();
    // Optimistic update
    if (nodeData) {
      setNodeData({
        ...nodeData,
        props,
        createdAt: nodeData.createdAt ?? now,
        updatedAt: now,
      });
    }

    // Sync to X6 Graph → triggers Yjs sync via GraphSyncManager
    syncToGraph(nodeId, { type: nodeType, props });

    // Persist to backend API (debounced)
    schedulePropsPersist(nodeId, nodeType, props);
  }, [nodeData, syncToGraph, schedulePropsPersist]);

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
    />
  );
}
