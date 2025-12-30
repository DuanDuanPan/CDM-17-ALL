'use client';

/**
 * Clipboard cut operation handler.
 * Story 7.4: Extracted from useClipboard for single responsibility.
 */

import type { Cell, Node, Graph } from '@antv/x6';
import { toast } from 'sonner';
import type * as Y from 'yjs';
import type { UndoManager } from 'yjs';
import { archiveNode } from '@/lib/api/nodes';
import type { ClipboardData } from '@cdm/types';

export interface CutOptions {
    graph: Graph;
    yDoc: Y.Doc;
    undoManager?: UndoManager | null;
    selectedNodes: Node[];
    clearSelection: () => void;
    serializeSelection: () => ClipboardData | null;
}

/**
 * Cut = Copy + Soft Delete (Archive)
 * AC4.1: Cut is equivalent to Copy + Archive
 * AC4.2: Undoable via Yjs
 */
export async function cutToClipboard({
    graph,
    yDoc,
    undoManager,
    selectedNodes,
    clearSelection,
    serializeSelection,
}: CutOptions): Promise<void> {
    const data = serializeSelection();
    if (!data) {
        toast.warning('没有选中任何节点');
        return;
    }

    try {
        // Copy first
        const payload: ClipboardData = { ...data, operation: 'cut' };
        const jsonStr = JSON.stringify(payload);
        await navigator.clipboard.writeText(jsonStr);

        // Soft delete (archive) via Yjs - including all descendants
        undoManager?.stopCapturing();
        const yNodes = yDoc.getMap('nodes');

        // Collect selected node IDs
        const selectedIds = new Set(selectedNodes.map(n => n.id));

        // Find all descendants
        const descendantIds = findAllDescendants(yNodes, selectedIds);
        const allNodesToArchive = new Set([...selectedIds, ...descendantIds]);

        yDoc.transact(() => {
            const now = new Date().toISOString();
            allNodesToArchive.forEach(nodeId => {
                const existing = yNodes.get(nodeId);
                if (existing) {
                    yNodes.set(nodeId, {
                        ...existing,
                        isArchived: true,
                        archivedAt: now,
                        updatedAt: now,
                    });
                    // Trigger backend archive
                    archiveNode(nodeId).catch(err =>
                        console.error(`[Clipboard] Failed to archive node ${nodeId} during cut`, err)
                    );
                }
            });
        });

        // Update X6 local state (hide nodes and all their connected edges)
        const cellsToHide: Cell[] = [];
        allNodesToArchive.forEach(nodeId => {
            const cell = graph.getCellById(nodeId);
            if (cell) {
                cellsToHide.push(cell);
                const edges = graph.getConnectedEdges(cell as Node);
                edges?.forEach(edge => cellsToHide.push(edge));
            }
        });
        cellsToHide.forEach(cell => cell.setVisible(false));

        clearSelection();

        const childCount = descendantIds.size;
        if (childCount > 0) {
            toast.success(`已剪切 ${selectedIds.size} 个节点及 ${childCount} 个子节点`);
        } else {
            toast.success(`已剪切 ${selectedIds.size} 个节点`);
        }
    } catch (err) {
        console.error('[Clipboard] Cut failed:', err);
        toast.error('剪切失败');
    }
}

/**
 * Find all descendants (children, grandchildren, etc.) of given parent IDs.
 */
export function findAllDescendants(
    yNodes: Y.Map<unknown>,
    parentIds: Set<string>
): Set<string> {
    const descendants = new Set<string>();
    const queue = [...parentIds];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        yNodes.forEach((nodeData, nodeId) => {
            const data = nodeData as { parentId?: string };
            if (data.parentId === currentId && !descendants.has(nodeId) && !parentIds.has(nodeId)) {
                descendants.add(nodeId);
                queue.push(nodeId);
            }
        });
    }
    return descendants;
}
