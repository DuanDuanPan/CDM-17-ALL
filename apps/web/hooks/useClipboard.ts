'use client';

/**
 * Story 2.6: Multi-Select & Clipboard
 * Hook for copy/cut/paste operations on selected nodes
 * Uses Yjs for undo support and system clipboard for cross-graph paste
 */

import { useCallback, useRef } from 'react';
import type { Node, Graph } from '@antv/x6';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import type * as Y from 'yjs';
import type { UndoManager } from 'yjs';
import {
    ClipboardData,
    ClipboardNodeData,
    ClipboardEdgeData,
    ClipboardLayout,
    parseClipboardData,
    CLIPBOARD_VERSION,
    CLIPBOARD_SOURCE,
    MAX_CLIPBOARD_NODES,
    NodeType,
} from '@cdm/types';
import type { EdgeKind, DependencyType } from '@cdm/types';

export interface UseClipboardOptions {
    /** The X6 Graph instance */
    graph: Graph | null;
    /** Current graph ID (for cross-graph paste detection) */
    graphId: string;
    /** Yjs document for collaborative operations */
    yDoc: Y.Doc | null;
    /** Yjs UndoManager for undo support (AC4.2) */
    undoManager?: UndoManager | null;
    /** Currently selected nodes */
    selectedNodes: Node[];
    /** Function to select nodes after paste */
    selectNodes: (nodeIds: string[]) => void;
    /** Function to clear selection */
    clearSelection: () => void;
}

export interface UseClipboardReturn {
    /** Copy selected nodes to system clipboard (AC2.1-AC2.3) */
    copy: () => Promise<void>;
    /** Cut selected nodes (Copy + Delete with undo support) (AC4.1-AC4.2) */
    cut: () => Promise<void>;
    /** Paste from clipboard (AC3.1-AC3.5) */
    paste: (position?: { x: number; y: number }) => Promise<void>;
    /** Check if clipboard has valid paste data */
    canPaste: () => Promise<boolean>;
    /** Delete selected nodes and all their descendants (Story 2.6) */
    deleteNodes: () => void;
}

/**
 * Hook for clipboard operations (copy/cut/paste) on graph nodes
 * 
 * Features:
 * - Copies selected nodes and internal edges to system clipboard (AC2.2)
 * - Pastes with new IDs to avoid conflicts (AC3.2)
 * - Preserves relative positions and hierarchy (AC3.3)
 * - Cut operation is undoable via Yjs (AC4.2)
 * - Cross-graph paste support (AC3.5)
 * 
 * @example
 * ```tsx
 * const { selectedNodes, selectNodes, clearSelection } = useSelection({ graph });
 * const { copy, cut, paste } = useClipboard({
 *   graph,
 *   graphId: 'my-graph',
 *   yDoc,
 *   selectedNodes,
 *   selectNodes,
 *   clearSelection,
 * });
 * 
 * // Copy selected nodes
 * await copy();
 * 
 * // Paste at cursor position
 * await paste({ x: 100, y: 100 });
 * ```
 */
export function useClipboard({
    graph,
    graphId,
    yDoc,
    undoManager,
    selectedNodes,
    selectNodes,
    clearSelection,
}: UseClipboardOptions): UseClipboardReturn {

    // Ref for graph to avoid stale closures
    const graphRef = useRef<Graph | null>(null);
    graphRef.current = graph;

    /**
     * Serialize selected nodes to clipboard format
     * AC2.2: Only copies selected nodes and edges between them
     */
    const serializeSelection = useCallback((): ClipboardData | null => {
        if (!graphRef.current || selectedNodes.length === 0) return null;

        // Check selection size limit (performance)
        if (selectedNodes.length > MAX_CLIPBOARD_NODES) {
            toast.warning(`选择过多节点 (${selectedNodes.length}/${MAX_CLIPBOARD_NODES})，请减少选择数量`);
            return null;
        }

        const selectedIds = new Set(selectedNodes.map(n => n.id));

        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selectedNodes.forEach(node => {
            const { x, y } = node.getPosition();
            const { width, height } = node.getSize();
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });

        const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        const layout: ClipboardLayout = {
            minX,
            minY,
            width: maxX - minX,
            height: maxY - minY,
            center,
        };

        // Serialize nodes (relative to center)
        const nodes: ClipboardNodeData[] = selectedNodes.map(node => {
            const { x, y } = node.getPosition();
            const { width, height } = node.getSize();
            const data = node.getData() || {};

            return {
                originalId: node.id,
                label: data.label || node.getAttrByPath('text/text') as string || '',
                type: (data.nodeType || data.type || NodeType.ORDINARY) as NodeType,
                x: x - center.x, // Relative position
                y: y - center.y,
                width,
                height,
                parentOriginalId: data.parentId,
                description: data.description,
                metadata: data.props || data.metadata || {},
                tags: data.tags || [],
            };
        });

        // Serialize edges between selected nodes only (AC2.2)
        const allEdges = graphRef.current.getEdges();
        const edges: ClipboardEdgeData[] = allEdges
            .filter(edge => {
                const sourceId = edge.getSourceCellId();
                const targetId = edge.getTargetCellId();
                // Only include edges where BOTH source and target are selected
                return sourceId && targetId && selectedIds.has(sourceId) && selectedIds.has(targetId);
            })
            .map(edge => {
                const data = edge.getData() || {};
                const metadata = data.metadata || {};
                return {
                    sourceOriginalId: edge.getSourceCellId()!,
                    targetOriginalId: edge.getTargetCellId()!,
                    kind: (metadata.kind || 'hierarchical') as EdgeKind,
                    dependencyType: metadata.dependencyType as DependencyType | undefined,
                    label: edge.getLabels()?.[0]?.attrs?.label?.text as string | undefined,
                };
            });

        return {
            version: CLIPBOARD_VERSION,
            source: CLIPBOARD_SOURCE,
            timestamp: Date.now(),
            sourceGraphId: graphId,
            nodes,
            edges,
            layout,
        };
    }, [selectedNodes, graphId]);

    /**
     * Copy selected nodes to system clipboard
     * AC2.1: Cmd+C copies node data structure
     * AC2.3: Content is JSON with format version
     */
    const copy = useCallback(async () => {
        const data = serializeSelection();
        if (!data) {
            toast.warning('没有选中任何节点');
            return;
        }

        try {
            const jsonStr = JSON.stringify(data);
            await navigator.clipboard.writeText(jsonStr);
            toast.success(`已复制 ${data.nodes.length} 个节点`);
        } catch (err) {
            console.error('[Clipboard] Copy failed:', err);
            toast.error('复制失败，请检查剪贴板权限');
        }
    }, [serializeSelection]);

    /**
     * Cut = Copy + Delete (with undo support)
     * AC4.1: Cut is equivalent to Copy + Delete
     * AC4.2: Must be undoable via Yjs UndoManager
     */
    const cut = useCallback(async () => {
        if (!graphRef.current || !yDoc) return;

        const data = serializeSelection();
        if (!data) {
            toast.warning('没有选中任何节点');
            return;
        }

        try {
            // Copy first
            const jsonStr = JSON.stringify(data);
            await navigator.clipboard.writeText(jsonStr);

            // Delete via Yjs for undo support (AC4.2)
            undoManager?.stopCapturing();
            const yNodes = yDoc.getMap('nodes');
            const yEdges = yDoc.getMap('edges');

            yDoc.transact(() => {
                // Delete nodes
                selectedNodes.forEach(node => {
                    yNodes.delete(node.id);
                });
                // Delete edges between selected nodes
                data.edges.forEach(edge => {
                    // Find edge by source-target pattern
                    const edgeId = `${edge.sourceOriginalId}-${edge.targetOriginalId}`;
                    yEdges.delete(edgeId);
                });
            });

            // Also remove from X6 graph (will be synced from Yjs observer)
            graphRef.current.removeCells(selectedNodes);
            clearSelection();

            toast.success(`已剪切 ${data.nodes.length} 个节点`);
        } catch (err) {
            console.error('[Clipboard] Cut failed:', err);
            toast.error('剪切失败');
        }
    }, [serializeSelection, yDoc, undoManager, selectedNodes, clearSelection]);

    /**
     * Paste from clipboard
     * AC3.1: Cmd+V parses and validates clipboard content
     * AC3.2: Every pasted node gets a new unique ID
     * AC3.3: Relative positions and hierarchy preserved
     * AC3.4: Keyboard paste centers on viewport, context menu uses click position
     * AC3.5: Cross-graph paste supported (writes to current graph)
     */
    const paste = useCallback(async (position?: { x: number; y: number }) => {
        if (!graphRef.current || !yDoc) return;

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
                // Context menu paste: use click position
                pasteCenter = position;
            } else {
                // Keyboard paste: center of viewport
                const graphArea = graphRef.current.getGraphArea();
                pasteCenter = {
                    x: graphArea.center.x,
                    y: graphArea.center.y,
                };
            }

            // Create ID mapping for new nodes (AC3.2)
            const idMap = new Map<string, string>();
            data.nodes.forEach(node => {
                idMap.set(node.originalId, nanoid());
            });

            // Batch updates via Yjs transaction (for undo grouping)
            undoManager?.stopCapturing();
            const yNodes = yDoc.getMap('nodes');
            const yEdges = yDoc.getMap('edges');

            const newNodeIds: string[] = [];
            const newEdgeIds: string[] = [];

            // Track parent-child relationships for edge creation
            const parentChildRelations: Array<{ parentId: string; childId: string }> = [];

            // Story 2.6 Fix: Determine paste target parent
            // If a single node is selected at paste time, use it as the parent for "orphan" pasted nodes
            // (nodes whose original parent was not in the clipboard)
            const pasteTargetParentId = selectedNodes.length === 1 ? selectedNodes[0].id : undefined;

            yDoc.transact(() => {
                // Create nodes with new IDs (AC3.3: preserve relative positions)
                data.nodes.forEach(nodeData => {
                    const newId = idMap.get(nodeData.originalId)!;
                    newNodeIds.push(newId);

                    // Map parent ID if exists (hierarchy preservation)
                    // Priority:
                    // 1. If parent was also copied → use mapped parent ID (preserve internal hierarchy)
                    // 2. If parent wasn't copied AND we have a paste target → use paste target as parent
                    // 3. Otherwise → leave orphaned
                    let resolvedParentId: string | undefined;

                    if (nodeData.parentOriginalId) {
                        // First try: parent was also copied (use mapped ID to preserve internal structure)
                        const mappedParentId = idMap.get(nodeData.parentOriginalId);
                        if (mappedParentId) {
                            resolvedParentId = mappedParentId;
                        } else if (pasteTargetParentId) {
                            // Parent wasn't copied - use the selected node as the new parent
                            // This is the expected behavior: paste as child of selected node
                            resolvedParentId = pasteTargetParentId;
                        }
                        // If no paste target and original parent not in clipboard, leave orphaned
                    } else if (pasteTargetParentId) {
                        // Node had no parent originally, but we have a paste target
                        // Make it a child of the paste target
                        resolvedParentId = pasteTargetParentId;
                    }

                    // Track parent-child relationship for edge creation
                    if (resolvedParentId) {
                        parentChildRelations.push({ parentId: resolvedParentId, childId: newId });
                    }

                    // CRITICAL: Match YjsNodeData structure expected by GraphSyncManager
                    // Story 2.6 Fix: Copy props but remove database-managed fields
                    // nodeId, createdAt, updatedAt are managed by the database, not the props JSON
                    const now = new Date().toISOString();
                    let updatedProps: Record<string, unknown> | undefined;
                    if (nodeData.metadata && typeof nodeData.metadata === 'object') {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { nodeId: _nodeId, createdAt: _createdAt, updatedAt: _updatedAt, ...cleanProps } = nodeData.metadata as Record<string, unknown>;
                        updatedProps = Object.keys(cleanProps).length > 0 ? cleanProps : undefined;
                    }

                    const newNode = {
                        id: newId,
                        label: nodeData.label,
                        // GraphSyncManager expects 'mindmapType' for structure (root/topic/subtopic)
                        mindmapType: 'topic' as const, // Pasted nodes are always topics
                        // GraphSyncManager expects 'nodeType' for semantic type (TASK/ORDINARY etc)
                        nodeType: nodeData.type, // This is NodeType from clipboard
                        description: nodeData.description,
                        x: nodeData.x + pasteCenter.x,
                        y: nodeData.y + pasteCenter.y,
                        width: nodeData.width,
                        height: nodeData.height,
                        parentId: resolvedParentId,
                        metadata: updatedProps,
                        props: updatedProps, // Copy metadata to props with updated nodeId
                        tags: nodeData.tags || [],
                        graphId: graphId, // Use current graph, not source graph (AC3.5)
                        createdAt: now,
                        updatedAt: now,
                    };

                    yNodes.set(newId, newNode);
                });

                // Create edges from clipboard (between copied nodes)
                data.edges.forEach(edgeData => {
                    const newSourceId = idMap.get(edgeData.sourceOriginalId);
                    const newTargetId = idMap.get(edgeData.targetOriginalId);

                    if (newSourceId && newTargetId) {
                        const edgeId = nanoid();
                        newEdgeIds.push(edgeId);

                        yEdges.set(edgeId, {
                            id: edgeId,
                            source: newSourceId,
                            target: newTargetId,
                            kind: edgeData.kind,
                            dependencyType: edgeData.dependencyType,
                            label: edgeData.label,
                            graphId: graphId,
                        });
                    }
                });

                // Story 2.6 Fix: Create hierarchical edges for parent-child relationships
                // This ensures pasted nodes are properly connected to their parents
                parentChildRelations.forEach(({ parentId, childId }) => {
                    // Check if edge already exists in clipboard edges (avoid duplicates)
                    const edgeExists = data.edges.some(e => {
                        const mappedSource = idMap.get(e.sourceOriginalId);
                        const mappedTarget = idMap.get(e.targetOriginalId);
                        return (mappedSource === parentId && mappedTarget === childId) ||
                               (mappedSource === childId && mappedTarget === parentId);
                    });

                    if (!edgeExists) {
                        const edgeId = nanoid();
                        newEdgeIds.push(edgeId);

                        yEdges.set(edgeId, {
                            id: edgeId,
                            source: parentId,
                            target: childId,
                            type: 'hierarchical',
                            metadata: { kind: 'hierarchical' },
                            graphId: graphId,
                        });
                    }
                });
            });

            // Wait for Yjs sync to update X6 graph, then select new nodes
            setTimeout(() => {
                selectNodes(newNodeIds);
                // Center view on first pasted node
                if (newNodeIds.length > 0 && graphRef.current) {
                    const firstNode = graphRef.current.getCellById(newNodeIds[0]);
                    if (firstNode) {
                        graphRef.current.centerCell(firstNode);
                    }
                }
            }, 100);

            toast.success(`已粘贴 ${data.nodes.length} 个节点`);

        } catch (err) {
            console.error('[Clipboard] Paste failed:', err);
            if ((err as Error).name === 'NotAllowedError') {
                toast.error('请允许访问剪贴板');
            } else {
                toast.error('粘贴失败');
            }
        }
    }, [yDoc, undoManager, graphId, selectNodes, selectedNodes]);

    /**
     * Check if clipboard has valid paste data
     * Useful for enabling/disabling paste button in UI
     */
    const canPaste = useCallback(async (): Promise<boolean> => {
        try {
            const text = await navigator.clipboard.readText();
            const data = parseClipboardData(text);
            return data !== null;
        } catch {
            return false;
        }
    }, []);

    /**
     * Delete selected nodes and all their descendants
     * Story 2.6: Support Delete key to remove selected nodes and children
     * - Finds all descendant nodes recursively
     * - Deletes all associated edges
     * - Uses Yjs transaction for undo support
     * - Protects center-node from deletion
     */
    const deleteNodes = useCallback(() => {
        if (!graphRef.current || !yDoc || selectedNodes.length === 0) {
            return;
        }

        const yNodes = yDoc.getMap('nodes');
        const yEdges = yDoc.getMap('edges');

        // Collect selected node IDs
        const selectedIds = new Set(selectedNodes.map(n => n.id));

        // Protect center-node from deletion
        if (selectedIds.has('center-node')) {
            toast.warning('无法删除根节点');
            return;
        }

        // Find all descendants (children, grandchildren, etc.)
        const findAllDescendants = (parentIds: Set<string>): Set<string> => {
            const descendants = new Set<string>();
            const queue = [...parentIds];

            while (queue.length > 0) {
                const currentId = queue.shift()!;

                // Find all nodes whose parentId equals currentId
                yNodes.forEach((nodeData, nodeId) => {
                    const data = nodeData as { parentId?: string };
                    if (data.parentId === currentId && !descendants.has(nodeId) && !selectedIds.has(nodeId)) {
                        descendants.add(nodeId);
                        queue.push(nodeId);
                    }
                });
            }

            return descendants;
        };

        const descendantIds = findAllDescendants(selectedIds);

        // Combine: selected nodes + all descendants
        const allNodesToDelete = new Set([...selectedIds, ...descendantIds]);

        // Find all edges connected to nodes being deleted
        const edgesToDelete: string[] = [];
        yEdges.forEach((edgeData, edgeId) => {
            const edge = edgeData as { source?: string; target?: string };
            if (
                (edge.source && allNodesToDelete.has(edge.source)) ||
                (edge.target && allNodesToDelete.has(edge.target))
            ) {
                edgesToDelete.push(edgeId);
            }
        });

        // Delete in Yjs transaction (supports Undo)
        undoManager?.stopCapturing();
        yDoc.transact(() => {
            // Delete nodes
            allNodesToDelete.forEach(nodeId => {
                yNodes.delete(nodeId);
            });
            // Delete edges
            edgesToDelete.forEach(edgeId => {
                yEdges.delete(edgeId);
            });
        });

        // Clear selection
        clearSelection();

        // Show feedback
        const childCount = descendantIds.size;
        if (childCount > 0) {
            toast.success(`已删除 ${selectedIds.size} 个节点及 ${childCount} 个子节点`);
        } else {
            toast.success(`已删除 ${selectedIds.size} 个节点`);
        }
    }, [yDoc, undoManager, selectedNodes, clearSelection]);

    return {
        copy,
        cut,
        paste,
        canPaste,
        deleteNodes,
    };
}
