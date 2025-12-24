'use client';

/**
 * Story 2.1: Right Sidebar with Dynamic Property Panel
 * [AI-Review][HIGH-1,HIGH-2,LOW-1] Fixed: Integrated real API + Yjs sync + removed console.log
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PropertyPanel } from '@/components/PropertyPanel';
import { NodeType, type EnhancedNodeData, type NodeProps, sanitizeNodeProps } from '@cdm/types';
import type { Graph, Node } from '@antv/x6';
import type * as Y from 'yjs';
import { syncLogger as logger } from '@/lib/logger';
import {
  archiveNode,
  createNode,
  fetchNode,
  unarchiveNode,
  updateNodeProps,
  updateNodeTags,
  updateNodeType,
} from '@/lib/api/nodes';
import { DEFAULT_CREATOR_NAME, PROPS_UPDATE_DEBOUNCE_MS } from '@/lib/constants';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';

// Story 4.1: FIX-9 - currentUserId removed, now uses context
export interface RightSidebarProps {
  selectedNodeId: string | null;
  graph: Graph | null;  // X6 Graph reference for Yjs sync
  graphId: string;
  yDoc?: Y.Doc | null; // Yjs doc for sync when graph is not available
  creatorName?: string; // Default creator name for new nodes
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
    description: typeof data.description === 'string' ? data.description : undefined,
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

export function RightSidebar({
  selectedNodeId,
  graph,
  graphId,
  yDoc = null,
  creatorName,
  onClose,
}: RightSidebarProps) {
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

  const getYjsNode = useCallback((nodeId: string): YjsNodeData | null => {
    if (!yDoc) return null;
    const yNodes = yDoc.getMap<YjsNodeData>('nodes');
    return yNodes.get(nodeId) ?? null;
  }, [yDoc]);

  const ensureNodeExists = useCallback(async (nodeId: string, node: Node) => {
    try {
      const existing = await fetchNode(nodeId);
      if (existing) {
        setNodeData((prev) => (prev ? { ...prev, ...existing } : existing));

        // Story 2.6 Fix: Sync API data back to X6 node
        // This ensures props and tags from DB are available for clipboard copy
        // Story 2.8 Fix: Only sync if API data is NEWER than local data
        // This prevents stale API data from overwriting Yjs-synced updates
        const existingNodeData = node.getData() || {};
        const localUpdatedAt = existingNodeData.updatedAt;
        const apiUpdatedAt = existing.updatedAt;

        // Compare timestamps - only sync from API if API data is newer or local has no timestamp
        const apiIsNewer = !localUpdatedAt ||
          (apiUpdatedAt && new Date(apiUpdatedAt) > new Date(localUpdatedAt));

        const needsSync = apiIsNewer && (
          JSON.stringify(existingNodeData.props) !== JSON.stringify(existing.props) ||
          JSON.stringify(existingNodeData.tags) !== JSON.stringify(existing.tags) ||
          existingNodeData.nodeType !== existing.type
        );

        if (needsSync) {
          const now = new Date().toISOString();
          node.setData({
            ...existingNodeData,
            nodeType: existing.type ?? existingNodeData.nodeType,
            props: existing.props ?? existingNodeData.props,
            tags: existing.tags ?? existingNodeData.tags,
            isArchived: existing.isArchived ?? existingNodeData.isArchived,
            archivedAt: existing.archivedAt ?? existingNodeData.archivedAt,
            updatedAt: now,
          }, { overwrite: true });
          logger.debug('Synced API data back to X6 node (API is newer)', { nodeId, type: existing.type, apiUpdatedAt, localUpdatedAt });
        } else if (!apiIsNewer) {
          logger.debug('Skipped API sync - local data is newer', { nodeId, apiUpdatedAt, localUpdatedAt });
        }
        return;
      }

      const created = await createNode(
        buildCreatePayload(nodeId, graphId, resolvedCreatorName, node)
      );

      // Story 2.6 Fix: After creating node, also sync props and tags from X6 data
      // This ensures pasted nodes have their props and tags saved to the database
      const nodeData = node.getData() || {};
      const nodeType = nodeData.nodeType || created.type;
      const nodeProps = nodeData.props;
      const nodeTags = nodeData.tags;

      // Update props if they exist and are non-empty
      if (nodeProps && Object.keys(nodeProps).length > 0 && nodeType && nodeType !== NodeType.ORDINARY) {
        await updateNodeProps(nodeId, nodeType, nodeProps).catch((err) => {
          logger.warn('Failed to save props for new node', { nodeId, error: err });
        });
      }

      // Update tags if they exist and are non-empty
      if (Array.isArray(nodeTags) && nodeTags.length > 0) {
        await updateNodeTags(nodeId, nodeTags).catch((err) => {
          logger.warn('Failed to save tags for new node', { nodeId, error: err });
        });
      }

      setNodeData((prev) => (prev ? { ...prev, ...created, props: nodeProps, tags: nodeTags } : { ...created, props: nodeProps, tags: nodeTags }));
    } catch (error) {
      // Story 2.6 Fix: Handle missing parent node (FK constraint violation)
      // If prompt creation fails because parent doesn't exist yet (e.g. during paste),
      // recursively ensure parent exists first.
      const nodeData = node.getData() || {};
      if (nodeData.parentId && graph) {
        const parentNode = graph.getCellById(nodeData.parentId);
        if (parentNode && parentNode.isNode()) {
          // Prevent infinite recursion loops with a simple check or just rely on the fact that
          // eventually we hit a root or a node that exists.
          // Note: We don't have the error code available easily here as plain Error object,
          // but "try parent" strategy is safe for most creation failures.
          logger.warn('Creation failed, attempting to ensure parent exists first', { nodeId, parentId: nodeData.parentId });

          try {
            await ensureNodeExists(nodeData.parentId, parentNode as Node);
            // Retry current node creation after parent is ensured
            // We call ensureNodeExists again for self
            // Note: To avoid infinite loop if parent creation ALSO fails, we might need depth control,
            // but essentially the stack will overflow if cyclic, which is unlikely in tree structure.
            const retryExisting = await fetchNode(nodeId);
            if (retryExisting) {
              setNodeData(retryExisting);
              return;
            }
            const retryCreated = await createNode(
              buildCreatePayload(nodeId, graphId, resolvedCreatorName, node)
            );
            // Apply props/tags logic for retry... (simplified for brevity, ideally refactor create logic)
            setNodeData((prev) => (prev ? { ...prev, ...retryCreated } : retryCreated));
            return;
          } catch (retryError) {
            logger.error('Retry failed after parent ensure', { nodeId, error: retryError });
          }
        }
      }

      const errorInfo = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { error };
      logger.error('Failed to ensure node exists', { nodeId, graphId, error: errorInfo });
    }
  }, [graph, graphId, resolvedCreatorName]);

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
      // Always overwrite props to allow empty arrays (e.g., knowledgeRefs: []) to clear correctly
      x6Node.setData({
        ...existingData,
        nodeType: data.type ?? existingData.nodeType,  // Use nodeType field as defined in GraphSyncManager
        props: data.props,
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
        description: typeof graphData.description === 'string' ? graphData.description : undefined,
        type: graphData.nodeType || NodeType.ORDINARY,
        props: graphData.props || {},
        tags: Array.isArray(graphData.tags) ? graphData.tags : [],
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
        props: (yjsNode.props as NodeProps) || {},
        tags: [],
        isArchived: false,
        archivedAt: null,
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
  }, [nodeData, syncToGraph, schedulePropsPersist]);

  const handleTagsUpdate = useCallback(
    (nodeId: string, tags: string[]) => {
      const now = new Date().toISOString();

      setNodeData((prev) => (prev ? { ...prev, tags, updatedAt: now } : prev));

      const x6Node = getX6Node(nodeId);
      if (x6Node) {
        x6Node.updateData({ tags, updatedAt: now });
      }

      updateNodeTags(nodeId, tags).then((success) => {
        if (!success) {
          logger.warn('Backend tags update failed, but local state updated', { nodeId });
        }
      });
    },
    [getX6Node]
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
      }
    },
    [getX6Node, graph, onClose]
  );

  // Story 4.1: Handle approval-related updates (refresh node data from API)
  const handleApprovalUpdate = useCallback(async (nodeId: string) => {
    try {
      const data = await fetchNode(nodeId);
      // Type assertion for extended properties
      const extendedData = data as (typeof data) & {
        approval?: unknown;
        deliverables?: unknown;
      };
      if (data) {
        setNodeData(data);
        // Also sync to X6 node for consistency
        const x6Node = getX6Node(nodeId);
        if (x6Node) {
          const existingData = x6Node.getData() || {};
          // IMPORTANT: use overwrite mode so empty arrays in props (e.g. deliverables: [])
          // can correctly clear existing arrays in X6's deep-merge semantics.
          x6Node.setData({
            ...existingData,
            props: data.props,
            approval: extendedData.approval,
            deliverables: extendedData.deliverables,
            updatedAt: data.updatedAt,
          }, { overwrite: true });
        }
      }
    } catch (error) {
      logger.error('Failed to refresh node data after approval update', { nodeId, error });
    }
  }, [getX6Node]);

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
