'use client';

/**
 * Clipboard delete operation handlers.
 * Story 7.4: Extracted from useClipboard for single responsibility.
 */

import type { Cell, Node, Graph } from '@antv/x6';
import { toast } from 'sonner';
import type * as Y from 'yjs';
import type { UndoManager } from 'yjs';
import type { ConfirmDialogOptions } from '@cdm/ui';
import { archiveNode } from '@/lib/api/nodes';
import { findAllDescendants } from './clipboardCut';

export interface DeleteNodesOptions {
    graph: Graph;
    yDoc: Y.Doc;
    undoManager?: UndoManager | null;
    selectedNodes: Node[];
    clearSelection: () => void;
}

/**
 * Soft delete selected nodes and all their descendants.
 * Story 2.6: Support Delete key to archive selected nodes and children.
 */
export function softDeleteNodes({
    graph,
    yDoc,
    undoManager,
    selectedNodes,
    clearSelection,
}: DeleteNodesOptions): void {
    if (selectedNodes.length === 0) return;

    const yNodes = yDoc.getMap('nodes');

    // Collect selected node IDs
    const selectedIds = new Set(selectedNodes.map(n => n.id));

    // Protect center-node
    if (selectedIds.has('center-node')) {
        toast.warning('无法删除根节点');
        return;
    }

    // Find all descendants
    const descendantIds = findAllDescendants(yNodes, selectedIds);
    const allNodesToArchive = new Set([...selectedIds, ...descendantIds]);

    // Soft delete in Yjs transaction
    undoManager?.stopCapturing();
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
                    console.error(`[Clipboard] Failed to archive node ${nodeId}`, err)
                );
            }
        });
    });

    // Update X6 visibility locally
    const cellsToHide: Cell[] = [];
    allNodesToArchive.forEach(id => {
        const cell = graph.getCellById(id);
        if (cell) {
            cellsToHide.push(cell);
            const edges = graph.getConnectedEdges(cell as Node);
            edges?.forEach(edge => cellsToHide.push(edge));
        }
    });
    cellsToHide.forEach(cell => cell.setVisible(false));
    graph.cleanSelection();

    clearSelection();

    const childCount = descendantIds.size;
    if (childCount > 0) {
        toast.success(`已归档 ${selectedIds.size} 个节点及 ${childCount} 个子节点`);
    } else {
        toast.success(`已归档 ${selectedIds.size} 个节点`);
    }
}

export interface HardDeleteNodesOptions extends DeleteNodesOptions {
    showConfirm: (options: ConfirmDialogOptions) => void;
}

/**
 * Permanently delete selected nodes and all their descendants.
 * Story 2.7: Support Shift+Delete for permanent deletion with multi-client sync.
 */
export function hardDeleteNodes({
    graph,
    yDoc,
    selectedNodes,
    clearSelection,
    showConfirm,
}: HardDeleteNodesOptions): void {
    if (selectedNodes.length === 0) return;

    const yNodes = yDoc.getMap('nodes');
    const yEdges = yDoc.getMap('edges');

    // Collect selected node IDs
    const selectedIds = new Set(selectedNodes.map(n => n.id));

    // Protect center-node
    if (selectedIds.has('center-node')) {
        toast.warning('无法删除根节点');
        return;
    }

    // Find all descendants
    const descendantIds = findAllDescendants(yNodes, selectedIds);
    const allNodesToDelete = new Set([...selectedIds, ...descendantIds]);

    // Show confirmation dialog
    showConfirm({
        title: '确认永久删除',
        description: `将永久删除 ${selectedIds.size} 个节点${descendantIds.size > 0 ? `及 ${descendantIds.size} 个子节点` : ''}。此操作无法撤销。`,
        confirmText: '永久删除',
        cancelText: '取消',
        variant: 'danger',
        onConfirm: async () => {
            // 1. Find all edges to delete
            const edgesToDelete = new Set<string>();
            yEdges.forEach((edgeData, edgeId) => {
                const edge = edgeData as { source: string; target: string };
                if (allNodesToDelete.has(edge.source) || allNodesToDelete.has(edge.target)) {
                    edgesToDelete.add(edgeId);
                }
            });

            // 2. Call backend API to delete nodes
            try {
                await Promise.all(
                    Array.from(allNodesToDelete).map(id =>
                        fetch(`/api/nodes/${id}`, { method: 'DELETE' })
                    )
                );
            } catch (error) {
                console.error('[Clipboard] Failed to delete nodes on server:', error);
                toast.error('删除失败，请稍后重试');
                return;
            }

            // 3. Delete from Yjs to sync to other clients
            yDoc.transact(() => {
                edgesToDelete.forEach(edgeId => {
                    yEdges.delete(edgeId);
                });
                allNodesToDelete.forEach(nodeId => {
                    yNodes.delete(nodeId);
                });
            });

            // 4. Manually remove cells from X6 Graph for immediate UI feedback
            edgesToDelete.forEach(edgeId => {
                const cell = graph.getCellById(edgeId);
                if (cell) {
                    graph.removeCell(cell);
                }
            });
            allNodesToDelete.forEach(nodeId => {
                const cell = graph.getCellById(nodeId);
                if (cell) {
                    graph.removeCell(cell);
                }
            });
            graph.cleanSelection();
            clearSelection();

            // 5. Show success message
            if (descendantIds.size > 0) {
                toast.success(`已永久删除 ${selectedIds.size} 个节点及 ${descendantIds.size} 个子节点`);
            } else {
                toast.success(`已永久删除 ${selectedIds.size} 个节点`);
            }
        },
    });
}
