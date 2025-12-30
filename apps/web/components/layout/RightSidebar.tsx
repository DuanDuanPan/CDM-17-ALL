'use client';

/**
 * Story 2.1: Right Sidebar with Dynamic Property Panel
 * [AI-Review][HIGH-1,HIGH-2,LOW-1] Fixed: Integrated real API + Yjs sync + removed console.log
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PropertyPanel } from '@/components/PropertyPanel';
import { NodeType, type EnhancedNodeData, type NodeProps, sanitizeNodeProps, type Deliverable, type ApprovalPipeline } from '@cdm/types';
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
    const persistLocalPropsAndTags = async (created: Awaited<ReturnType<typeof createNode>>) => {
      const localData = node.getData() || {};
      const nodeType = (localData.nodeType || created.type) as NodeType;
      const nodeProps = localData.props as NodeProps | undefined;
      const nodeTags = localData.tags as string[] | undefined;

      const hasNonEmptyProps =
        nodeProps &&
        typeof nodeProps === 'object' &&
        !Array.isArray(nodeProps) &&
        Object.keys(nodeProps as Record<string, unknown>).length > 0;

      // Save props/tags best-effort so pasted nodes persist correctly.
      if (hasNonEmptyProps && nodeType && nodeType !== NodeType.ORDINARY) {
        await updateNodeProps(nodeId, nodeType, nodeProps).catch((err) => {
          logger.warn('Failed to save props for new node', { nodeId, error: err });
        });
      }

      if (Array.isArray(nodeTags) && nodeTags.length > 0) {
        await updateNodeTags(nodeId, nodeTags).catch((err) => {
          logger.warn('Failed to save tags for new node', { nodeId, error: err });
        });
      }

      setNodeData((prev) => {
        const resolvedProps = hasNonEmptyProps
          ? nodeProps
          : ((created.props as NodeProps | undefined) ?? {});
        const resolvedTags = Array.isArray(nodeTags) ? nodeTags : (created.tags ?? []);
        return prev
          ? { ...created, ...prev, props: resolvedProps, tags: resolvedTags }
          : { ...created, props: resolvedProps, tags: resolvedTags };
      });
    };

    try {
      const existing = await fetchNode(nodeId);
      if (existing) {
        const existingNodeData = node.getData() || {};

        const apiProps = existing.props;
        const localProps = existingNodeData.props;
        const apiPropsIsEmptyObject =
          apiProps &&
          typeof apiProps === 'object' &&
          !Array.isArray(apiProps) &&
          Object.keys(apiProps as Record<string, unknown>).length === 0;
        const localPropsHasKeys =
          localProps &&
          typeof localProps === 'object' &&
          !Array.isArray(localProps) &&
          Object.keys(localProps as Record<string, unknown>).length > 0;

        // If API returns an empty props object but local graph has props, prefer local to avoid wiping pasted/copied props.
        const resolvedProps = apiPropsIsEmptyObject && localPropsHasKeys
          ? (localProps as NodeProps)
          : existing.props;

        // Same idea for tags: avoid overwriting non-empty local tags with empty API tags.
        const apiTags = existing.tags;
        const localTags = existingNodeData.tags;
        const resolvedTags = Array.isArray(apiTags) && apiTags.length === 0 && Array.isArray(localTags) && localTags.length > 0
          ? localTags
          : apiTags;

        setNodeData((prev) =>
          prev
            ? { ...prev, ...existing, props: resolvedProps, tags: resolvedTags }
            : { ...existing, props: resolvedProps, tags: resolvedTags }
        );

        // Story 2.6 Fix: Sync API data back to X6 node
        // This ensures props and tags from DB are available for clipboard copy
        // Story 2.8 Fix: Only sync if API data is NEWER than local data
        // This prevents stale API data from overwriting Yjs-synced updates
        const localUpdatedAt = existingNodeData.updatedAt;
        const apiUpdatedAt = existing.updatedAt;

        // Compare timestamps - only sync from API if API data is newer or local has no timestamp
        const apiIsNewer = !localUpdatedAt ||
          (apiUpdatedAt && new Date(apiUpdatedAt) > new Date(localUpdatedAt));

        // If API is missing props but local has them, best-effort push local props to backend.
        if (apiPropsIsEmptyObject && localPropsHasKeys && existing.type && existing.type !== NodeType.ORDINARY) {
          updateNodeProps(nodeId, existing.type, localProps as NodeProps).catch((err) => {
            logger.warn('Failed to backfill props to backend (API had empty props)', { nodeId, error: err });
          });
        }

        const needsSync = apiIsNewer && (
          JSON.stringify(existingNodeData.props) !== JSON.stringify(resolvedProps) ||
          JSON.stringify(existingNodeData.tags) !== JSON.stringify(resolvedTags) ||
          existingNodeData.nodeType !== existing.type
        );

        if (needsSync) {
          const now = new Date().toISOString();
          node.setData({
            ...existingNodeData,
            nodeType: existing.type ?? existingNodeData.nodeType,
            props: resolvedProps ?? existingNodeData.props,
            tags: resolvedTags ?? existingNodeData.tags,
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

      // Ensure parent exists first to avoid FK failures during paste (child selected before parent).
      const localData = node.getData() || {};
      if (localData.parentId && graph && localData.parentId !== nodeId) {
        const parentNode = graph.getCellById(localData.parentId);
        if (parentNode && parentNode.isNode()) {
          await ensureNodeExists(localData.parentId, parentNode as Node);
        }
      }

      const created = await createNode(
        buildCreatePayload(nodeId, graphId, resolvedCreatorName, node)
      );

      await persistLocalPropsAndTags(created);
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
            await persistLocalPropsAndTags(retryCreated);
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
        props: (yjsNode.props as NodeProps) || {},
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
          approval: yjsNode.approval ?? null,
          deliverables: Array.isArray(yjsNode.deliverables) ? yjsNode.deliverables : undefined,
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
      }
    } catch (error) {
      logger.error('Failed to sync deliverables after update', { nodeId, error });
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
