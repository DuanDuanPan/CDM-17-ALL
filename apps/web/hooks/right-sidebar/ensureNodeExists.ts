'use client';

import { NodeType, type EnhancedNodeData, type NodeProps } from '@cdm/types';
import type { Graph, Node } from '@antv/x6';
import { syncLogger as logger } from '@/lib/logger';
import { createNode, fetchNode, updateNodeProps, updateNodeTags } from '@/lib/api/nodes';
import { buildCreatePayload } from './nodeDataUtils';

type NodeDataSetter = React.Dispatch<React.SetStateAction<EnhancedNodeData | null>>;

export interface EnsureNodeExistsParams {
  nodeId: string;
  node: Node;
  graph: Graph | null;
  graphId: string;
  resolvedCreatorName: string;
  setNodeData: NodeDataSetter;
  isSelectedNodeId: (nodeId: string) => boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (!a || !b) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a)) {
    if (!isPlainObject(b)) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

export async function ensureNodeExists({
  nodeId,
  node,
  graph,
  graphId,
  resolvedCreatorName,
  setNodeData,
  isSelectedNodeId,
}: EnsureNodeExistsParams): Promise<void> {
  const persistLocalPropsAndTags = async (created: Awaited<ReturnType<typeof createNode>>) => {
    const localData = node.getData() || {};
    const nodeType = (localData.nodeType || created.type) as NodeType;
    const nodeProps = localData.props as NodeProps | undefined;
    const nodeTags = localData.tags as string[] | undefined;

    const hasNonEmptyProps =
      isPlainObject(nodeProps) && Object.keys(nodeProps).length > 0;

    // Save props/tags best-effort so pasted nodes persist correctly.
    if (hasNonEmptyProps && nodeType && nodeType !== NodeType.ORDINARY) {
      await Promise.resolve(updateNodeProps(nodeId, nodeType, nodeProps)).catch((err) => {
        logger.warn('Failed to save props for new node', { nodeId, error: err });
      });
    }

    if (Array.isArray(nodeTags) && nodeTags.length > 0) {
      await Promise.resolve(updateNodeTags(nodeId, nodeTags)).catch((err) => {
        logger.warn('Failed to save tags for new node', { nodeId, error: err });
      });
    }

    if (!isSelectedNodeId(nodeId)) return;

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
      const apiPropsIsEmptyObject = isPlainObject(apiProps) && Object.keys(apiProps).length === 0;
      const localPropsHasKeys = isPlainObject(localProps) && Object.keys(localProps).length > 0;

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

      if (isSelectedNodeId(nodeId)) {
        setNodeData((prev) =>
          prev
            ? { ...prev, ...existing, props: resolvedProps, tags: resolvedTags }
            : { ...existing, props: resolvedProps, tags: resolvedTags }
        );
      }

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
        void Promise.resolve(updateNodeProps(nodeId, existing.type, localProps as NodeProps)).catch((err) => {
          logger.warn('Failed to backfill props to backend (API had empty props)', { nodeId, error: err });
        });
      }

      const needsSync = apiIsNewer && (
        !deepEqual(existingNodeData.props, resolvedProps) ||
        !deepEqual(existingNodeData.tags, resolvedTags) ||
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
        await ensureNodeExists({
          nodeId: localData.parentId,
          node: parentNode as Node,
          graph,
          graphId,
          resolvedCreatorName,
          setNodeData,
          isSelectedNodeId,
        });
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
    const local = node.getData() || {};
    if (local.parentId && graph) {
      const parentNode = graph.getCellById(local.parentId);
      if (parentNode && parentNode.isNode()) {
        logger.warn('Creation failed, attempting to ensure parent exists first', { nodeId, parentId: local.parentId });

        try {
          await ensureNodeExists({
            nodeId: local.parentId,
            node: parentNode as Node,
            graph,
            graphId,
            resolvedCreatorName,
            setNodeData,
            isSelectedNodeId,
          });

          const retryExisting = await fetchNode(nodeId);
          if (retryExisting) {
            if (isSelectedNodeId(nodeId)) {
              setNodeData(retryExisting);
            }
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
}

