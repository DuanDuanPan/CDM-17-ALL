'use client';

import { NodeType } from '@cdm/types';
import type { Node } from '@antv/x6';

/**
 * Builds payload for creating a new node in backend.
 */
export function buildCreatePayload(
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

/**
 * Ensures node has timestamps (createdAt, updatedAt, creator).
 * Returns the resolved timestamps and updates the X6 node if needed.
 */
export function ensureNodeTimestamps(
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

