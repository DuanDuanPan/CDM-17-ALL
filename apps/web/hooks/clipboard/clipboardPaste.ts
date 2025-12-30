'use client';

/**
 * Clipboard paste operation handler.
 * Story 7.4: Extracted from useClipboard for single responsibility.
 */

import type { Node, Graph } from '@antv/x6';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import type * as Y from 'yjs';
import type { UndoManager } from 'yjs';
import { unarchiveNode } from '@/lib/api/nodes';
import { parseClipboardData, sanitizeNodeProps } from '@cdm/types';
import {
    getFallbackParentId,
    ensureHierarchicalEdges,
    createClipboardEdges,
    createParentChildEdges,
} from './pasteHelpers';

export interface PasteOptions {
    graph: Graph;
    graphId: string;
    yDoc: Y.Doc;
    undoManager?: UndoManager | null;
    selectedNodes: Node[];
    selectNodes: (nodeIds: string[]) => void;
    position?: { x: number; y: number };
}

/**
 * Paste from clipboard.
 * AC3.1: Cmd+V parses and validates clipboard content
 * AC3.2: Every pasted node gets a new unique ID
 * AC3.3: Relative positions and hierarchy preserved
 * AC3.4: Keyboard paste centers on viewport, context menu uses click position
 * AC3.5: Cross-graph paste supported (writes to current graph)
 */
export async function pasteFromClipboard({
    graph,
    graphId,
    yDoc,
    undoManager,
    selectedNodes,
    selectNodes,
    position,
}: PasteOptions): Promise<void> {
    try {
        const text = await navigator.clipboard.readText();
        const data = parseClipboardData(text);

        if (!data) {
            toast.warning('剪贴板内容不是有效的节点数据');
            return;
        }

        // Determine paste position (AC3.4)
        let pasteCenter: { x: number; y: number };
        if (position) {
            pasteCenter = position;
        } else {
            const graphArea = graph.getGraphArea();
            pasteCenter = {
                x: graphArea.center.x,
                y: graphArea.center.y,
            };
        }

        const operation = data.operation ?? 'copy';

        // Cut + paste within the same graph should MOVE nodes (unarchive + reposition)
        if (operation === 'cut' && data.sourceGraphId === graphId) {
            const moved = await handleCutPasteMove({
                graph,
                graphId,
                yDoc,
                undoManager,
                selectedNodes,
                selectNodes,
                data,
                pasteCenter,
            });
            if (moved) return;
        }

        // Standard copy paste: create new nodes
        await handleCopyPaste({
            graph,
            graphId,
            yDoc,
            undoManager,
            selectedNodes,
            selectNodes,
            data,
            pasteCenter,
        });
    } catch (err) {
        console.error('[Clipboard] Paste failed:', err);
        if ((err as Error).name === 'NotAllowedError') {
            toast.error('请允许访问剪贴板');
        } else {
            toast.error('粘贴失败');
        }
    }
}

interface HandlePasteCommonOptions {
    graph: Graph;
    graphId: string;
    yDoc: Y.Doc;
    undoManager?: UndoManager | null;
    selectedNodes: Node[];
    selectNodes: (nodeIds: string[]) => void;
    data: NonNullable<ReturnType<typeof parseClipboardData>>;
    pasteCenter: { x: number; y: number };
}

/**
 * Handle cut + paste within same graph (move operation).
 * Returns true if move was successful, false if fallback to copy is needed.
 */
async function handleCutPasteMove({
    graph,
    graphId,
    yDoc,
    undoManager,
    selectedNodes,
    selectNodes,
    data,
    pasteCenter,
}: HandlePasteCommonOptions): Promise<boolean> {
    const yNodes = yDoc.getMap('nodes');
    const yEdges = yDoc.getMap('edges');
    const selectedOriginalIds = new Set(data.nodes.map(node => node.originalId));
    const missingOriginalIds = data.nodes
        .filter(node => !yNodes.get(node.originalId))
        .map(node => node.originalId);

    if (missingOriginalIds.length > 0) {
        console.warn('[Clipboard] Cut paste fallback to copy (missing nodes)', { missingOriginalIds });
        return false;
    }

    const fallbackParentId = getFallbackParentId(graph, selectedNodes);
    const parentChildRelations: Array<{ parentId: string; childId: string }> = [];

    undoManager?.stopCapturing();
    yDoc.transact(() => {
        // Remove edges that connect moved nodes to outside nodes
        const edgesToDelete: string[] = [];
        yEdges.forEach((edgeData, edgeId) => {
            const edge = edgeData as { source?: string; target?: string };
            if (!edge.source || !edge.target) return;
            const sourceIn = selectedOriginalIds.has(edge.source);
            const targetIn = selectedOriginalIds.has(edge.target);
            if (sourceIn !== targetIn) {
                edgesToDelete.push(edgeId);
            }
        });
        edgesToDelete.forEach(edgeId => yEdges.delete(edgeId));

        const now = new Date().toISOString();
        data.nodes.forEach(nodeData => {
            const existing = yNodes.get(nodeData.originalId);
            if (!existing) return;

            let resolvedParentId: string | undefined;
            if (nodeData.parentOriginalId && selectedOriginalIds.has(nodeData.parentOriginalId)) {
                resolvedParentId = nodeData.parentOriginalId;
            } else if (fallbackParentId) {
                resolvedParentId = fallbackParentId;
            }

            if (resolvedParentId) {
                parentChildRelations.push({ parentId: resolvedParentId, childId: nodeData.originalId });
            }

            yNodes.set(nodeData.originalId, {
                ...existing,
                x: nodeData.x + pasteCenter.x,
                y: nodeData.y + pasteCenter.y,
                parentId: resolvedParentId,
                isArchived: false,
                archivedAt: null,
                updatedAt: now,
            });
        });

        ensureHierarchicalEdges(yEdges, parentChildRelations, graphId);
    });

    // Unarchive on backend
    selectedOriginalIds.forEach(nodeId => {
        unarchiveNode(nodeId).catch(err =>
            console.error(`[Clipboard] Failed to unarchive node ${nodeId}`, err)
        );
    });

    // Select moved nodes
    setTimeout(() => {
        const movedIds = Array.from(selectedOriginalIds);
        selectNodes(movedIds);
        if (movedIds.length > 0) {
            const firstNode = graph.getCellById(movedIds[0]);
            if (firstNode) graph.centerCell(firstNode);
        }
    }, 100);

    toast.success(`已移动 ${data.nodes.length} 个节点`);
    return true;
}

/**
 * Handle standard copy paste (create new nodes).
 */
async function handleCopyPaste({
    graph,
    graphId,
    yDoc,
    undoManager,
    selectedNodes,
    selectNodes,
    data,
    pasteCenter,
}: HandlePasteCommonOptions): Promise<void> {
    // Create ID mapping for new nodes (AC3.2)
    const idMap = new Map<string, string>();
    data.nodes.forEach(node => {
        idMap.set(node.originalId, nanoid());
    });

    undoManager?.stopCapturing();
    const yNodes = yDoc.getMap('nodes');
    const yEdges = yDoc.getMap('edges');

    const newNodeIds: string[] = [];
    const newEdgeIds: string[] = [];
    const parentChildRelations: Array<{ parentId: string; childId: string }> = [];
    const fallbackParentId = getFallbackParentId(graph, selectedNodes);

    yDoc.transact(() => {
        // Create nodes with new IDs
        data.nodes.forEach(nodeData => {
            const newId = idMap.get(nodeData.originalId)!;
            newNodeIds.push(newId);

            let resolvedParentId: string | undefined;
            if (nodeData.parentOriginalId) {
                const mappedParentId = idMap.get(nodeData.parentOriginalId);
                resolvedParentId = mappedParentId ?? fallbackParentId;
            } else if (fallbackParentId) {
                resolvedParentId = fallbackParentId;
            }

            if (resolvedParentId) {
                parentChildRelations.push({ parentId: resolvedParentId, childId: newId });
            }

            const now = new Date().toISOString();
            const rawProps = nodeData.metadata && typeof nodeData.metadata === 'object'
                ? (nodeData.metadata as Record<string, unknown>)
                : {};
            const sanitizedProps = sanitizeNodeProps(nodeData.type, rawProps);
            const updatedProps = Object.keys(sanitizedProps).length > 0 ? sanitizedProps : undefined;

            yNodes.set(newId, {
                id: newId,
                label: nodeData.label,
                mindmapType: 'topic' as const,
                nodeType: nodeData.type,
                description: nodeData.description,
                x: nodeData.x + pasteCenter.x,
                y: nodeData.y + pasteCenter.y,
                width: nodeData.width,
                height: nodeData.height,
                parentId: resolvedParentId,
                metadata: updatedProps,
                props: updatedProps,
                tags: nodeData.tags || [],
                graphId: graphId,
                createdAt: now,
                updatedAt: now,
            });
        });

        // Create edges from clipboard
        createClipboardEdges(yEdges, data.edges, idMap, graphId, newEdgeIds);

        // Create hierarchical edges for parent-child relationships
        createParentChildEdges(yEdges, parentChildRelations, data.edges, idMap, graphId, newEdgeIds);
    });

    // Select new nodes
    setTimeout(() => {
        selectNodes(newNodeIds);
        if (newNodeIds.length > 0) {
            const firstNode = graph.getCellById(newNodeIds[0]);
            if (firstNode) graph.centerCell(firstNode);
        }
    }, 100);

    toast.success(`已粘贴 ${data.nodes.length} 个节点`);
}
