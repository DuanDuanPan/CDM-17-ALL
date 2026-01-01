'use client';

import type * as Y from 'yjs';
import type { ApprovalPipeline, Deliverable, NodeProps } from '@cdm/types';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function updateYDocNode(
  yDoc: Y.Doc,
  nodeId: string,
  resolvedCreatorName: string,
  updater: (existing: YjsNodeData, now: string, base: { createdAt: string; creator: string }) => YjsNodeData
): void {
  const yNodes = yDoc.getMap<YjsNodeData>('nodes');
  const existing = yNodes.get(nodeId);
  if (!existing) return;

  const now = new Date().toISOString();
  const createdAt = existing.createdAt ?? now;
  const creator = existing.creator ?? resolvedCreatorName;

  yDoc.transact(() => {
    yNodes.set(nodeId, updater(existing, now, { createdAt, creator }));
  });
}

export function syncTagsToYDoc(
  yDoc: Y.Doc,
  nodeId: string,
  tags: string[],
  resolvedCreatorName: string
): void {
  updateYDocNode(yDoc, nodeId, resolvedCreatorName, (existing, now, base) => ({
    ...existing,
    tags,
    createdAt: base.createdAt,
    updatedAt: now,
    creator: base.creator,
  }));
}

export function syncArchiveToYDoc(
  yDoc: Y.Doc,
  nodeId: string,
  nextIsArchived: boolean,
  archivedAt: string | null,
  resolvedCreatorName: string
): void {
  updateYDocNode(yDoc, nodeId, resolvedCreatorName, (existing, now, base) => ({
    ...existing,
    isArchived: nextIsArchived,
    archivedAt,
    createdAt: base.createdAt,
    updatedAt: now,
    creator: base.creator,
  }));
}

export function syncApprovalToYDoc(
  yDoc: Y.Doc,
  nodeId: string,
  payload: { approval: ApprovalPipeline | null; deliverables: Deliverable[] },
  resolvedCreatorName: string
): void {
  updateYDocNode(yDoc, nodeId, resolvedCreatorName, (existing, now, base) => {
    const { approval, deliverables } = payload;
    const existingProps = existing.props;
    const nextProps = isPlainObject(existingProps)
      ? { ...(existingProps as Record<string, unknown>), deliverables }
      : { deliverables };

    return {
      ...existing,
      deliverables,
      // Convert null to undefined to match YjsNodeData type
      approval: approval ?? undefined,
      props: nextProps as NodeProps,
      createdAt: base.createdAt,
      updatedAt: now,
      creator: base.creator,
    };
  });
}

