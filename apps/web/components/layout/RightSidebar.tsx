'use client';

/**
 * Story 2.1: Right Sidebar with Dynamic Property Panel
 * [AI-Review][HIGH-1,HIGH-2,LOW-1] Fixed: Integrated real API + Yjs sync + removed console.log
 */

import { useState, useEffect, useCallback } from 'react';
import { PropertyPanel } from '@/components/PropertyPanel';
import { NodeType, type EnhancedNodeData, type NodeProps } from '@cdm/types';
import type { Graph, Node } from '@antv/x6';
import { syncLogger as logger } from '@/lib/logger';

export interface RightSidebarProps {
  selectedNodeId: string | null;
  graph: Graph | null;  // X6 Graph reference for Yjs sync
  onClose?: () => void;
}

/**
 * API helper to fetch node data from backend
 */
async function fetchNodeData(nodeId: string): Promise<EnhancedNodeData | null> {
  try {
    const response = await fetch(`/api/nodes/${nodeId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch node: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    logger.error('Failed to fetch node data', { nodeId, error });
    return null;
  }
}

/**
 * API helper to update node type
 */
async function updateNodeTypeApi(nodeId: string, type: NodeType): Promise<boolean> {
  try {
    const response = await fetch(`/api/nodes/${nodeId}/type`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    return response.ok;
  } catch (error) {
    logger.error('Failed to update node type', { nodeId, type, error });
    return false;
  }
}

/**
 * API helper to update node properties
 */
async function updateNodePropsApi(
  nodeId: string,
  type: NodeType,
  props: NodeProps
): Promise<boolean> {
  try {
    const response = await fetch(`/api/nodes/${nodeId}/properties`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, props }),
    });
    return response.ok;
  } catch (error) {
    logger.error('Failed to update node properties', { nodeId, type, error });
    return false;
  }
}

function ensureNodeTimestamps(node: Node): { createdAt: string; updatedAt: string } {
  const data = node.getData() || {};
  if (data.createdAt && data.updatedAt) {
    return { createdAt: data.createdAt, updatedAt: data.updatedAt };
  }

  const now = new Date().toISOString();
  const createdAt = data.createdAt ?? now;
  const updatedAt = data.updatedAt ?? createdAt;
  node.setData({ ...data, createdAt, updatedAt });
  return { createdAt, updatedAt };
}

export function RightSidebar({ selectedNodeId, graph, onClose }: RightSidebarProps) {
  const [nodeData, setNodeData] = useState<EnhancedNodeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Get X6 Node reference from graph
  const getX6Node = useCallback((nodeId: string): Node | null => {
    if (!graph) return null;
    const cell = graph.getCellById(nodeId);
    if (cell && cell.isNode()) {
      return cell as Node;
    }
    return null;
  }, [graph]);

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
      const { createdAt, updatedAt } = ensureNodeTimestamps(x6Node);
      // Create EnhancedNodeData from X6 node data
      setNodeData({
        id: selectedNodeId,
        label: graphData.label || '未命名节点',
        type: graphData.nodeType || NodeType.ORDINARY,
        props: graphData.props || {},
        createdAt,
        updatedAt,
      });
      setFetchError(null);
      return;
    }

    // If not in graph, fetch from API
    setIsLoading(true);
    setFetchError(null);

    fetchNodeData(selectedNodeId)
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
  }, [selectedNodeId, getX6Node]);

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

    // Persist to backend API (background, non-blocking)
    updateNodeTypeApi(nodeId, newType).then((success) => {
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

    // Persist to backend API (background, non-blocking)
    updateNodePropsApi(nodeId, nodeType, props).then((success) => {
      if (!success) {
        logger.warn('Backend props update failed, but local/Yjs state updated', { nodeId, nodeType });
      }
    });
  }, [nodeData, syncToGraph]);

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
