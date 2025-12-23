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
import { archiveNode } from '@/lib/api/nodes';
import { useConfirmDialog } from '@cdm/ui';
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
    sanitizeNodeProps,
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
    /** Soft delete (archive) selected nodes and all their descendants (Story 2.6) */
    deleteNodes: () => void;
    /** Permanently delete selected nodes and all their descendants (Story 2.7) */
    hardDeleteNodes: () => void;
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


        // Expanded selection: includes explicitly selected nodes + all their descendants
        const allNodesMap = new Map<string, Node>();
        selectedNodes.forEach(node => allNodesMap.set(node.id, node));

        // Build a parent-child map from hierarchical edges for more reliable hierarchy detection
        // This fixes issues where data.parentId might not be synced correctly to X6 node data
        const allCells = graphRef.current.getCells();
        const graphEdgesForHierarchy = graphRef.current.getEdges();

        // Map: parentId -> Set of childIds (from hierarchical edges)
        const hierarchicalChildren = new Map<string, Set<string>>();
        graphEdgesForHierarchy.forEach(edge => {
            const edgeData = edge.getData() || {};
            const metadata = edgeData.metadata || {};
            // Only consider hierarchical edges (not dependency edges)
            if (metadata.kind === 'dependency') return;

            const sourceId = edge.getSourceCellId();
            const targetId = edge.getTargetCellId();
            if (sourceId && targetId) {
                // Source is parent, target is child for hierarchical edges
                if (!hierarchicalChildren.has(sourceId)) {
                    hierarchicalChildren.set(sourceId, new Set());
                }
                hierarchicalChildren.get(sourceId)!.add(targetId);
            }
        });

        // Recursively find descendants using BOTH data.parentId AND hierarchical edges
        let changed = true;
        while (changed) {
            changed = false;
            allCells.forEach(cell => {
                if (cell.isNode() && !allNodesMap.has(cell.id)) {
                    const data = cell.getData() || {};
                    const parentId = data.parentId;

                    // Method 1: Check via data.parentId
                    if (parentId && allNodesMap.has(parentId)) {
                        allNodesMap.set(cell.id, cell as Node);
                        changed = true;
                        return;
                    }

                    // Method 2: Check via hierarchical edges (more reliable for pasted nodes)
                    // If any selected node has this node as a child via hierarchical edge
                    for (const [potentialParentId] of allNodesMap) {
                        const children = hierarchicalChildren.get(potentialParentId);
                        if (children && children.has(cell.id)) {
                            allNodesMap.set(cell.id, cell as Node);
                            changed = true;
                            return;
                        }
                    }
                }
            });
        }

        const nodesToCopy = Array.from(allNodesMap.values());
        const selectedIds = new Set(nodesToCopy.map(n => n.id));

        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodesToCopy.forEach(node => {
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
        const nodes: ClipboardNodeData[] = nodesToCopy.map(node => {
            const { x, y } = node.getPosition();
            const { width, height } = node.getSize();
            const data = node.getData() || {};
            const nodeType = (data.nodeType || data.type || NodeType.ORDINARY) as NodeType;
            const rawProps = (data.props || data.metadata || {}) as Record<string, unknown>;
            const sanitizedProps = sanitizeNodeProps(nodeType, rawProps);

            return {
                originalId: node.id,
                label: data.label || node.getAttrByPath('text/text') as string || '',
                type: nodeType,
                x: x - center.x, // Relative position
                y: y - center.y,
                width,
                height,
                parentOriginalId: data.parentId,
                description: data.description,
                metadata: sanitizedProps,
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
     * Cut = Copy + Soft Delete (Archive)
     * AC4.1: Cut is equivalent to Copy + Archive
     * AC4.2: Undoable via Yjs
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

            // Soft delete (archive) via Yjs - including all descendants
            undoManager?.stopCapturing();
            const yNodes = yDoc.getMap('nodes');

            // Collect selected node IDs
            const selectedIds = new Set(selectedNodes.map(n => n.id));

            // Find all descendants (children, grandchildren, etc.) - same logic as deleteNodes
            const findAllDescendants = (parentIds: Set<string>): Set<string> => {
                const descendants = new Set<string>();
                const queue = [...parentIds];

                while (queue.length > 0) {
                    const currentId = queue.shift()!;
                    yNodes.forEach((nodeData, nodeId) => {
                        const nodeDataTyped = nodeData as { parentId?: string };
                        if (nodeDataTyped.parentId === currentId && !descendants.has(nodeId) && !selectedIds.has(nodeId)) {
                            descendants.add(nodeId);
                            queue.push(nodeId);
                        }
                    });
                }
                return descendants;
            };

            const descendantIds = findAllDescendants(selectedIds);
            const allNodesToArchive = new Set([...selectedIds, ...descendantIds]);

            yDoc.transact(() => {
                const now = new Date().toISOString();
                allNodesToArchive.forEach(nodeId => {
                    const existing = yNodes.get(nodeId) as any;
                    if (existing) {
                        yNodes.set(nodeId, {
                            ...existing,
                            isArchived: true,
                            archivedAt: now,
                            updatedAt: now
                        });
                        // Trigger backend archive
                        archiveNode(nodeId).catch(err =>
                            console.error(`[Clipboard] Failed to archive node ${nodeId} on server during cut`, err)
                        );
                    }
                });
                // Note: We don't need to explicitly delete edges; X6/UI should hide edges connected to hidden nodes.
            });

            // Update X6 local state (hide nodes and all their connected edges)
            if (graphRef.current) {
                const cellsToHide: any[] = [];
                allNodesToArchive.forEach(nodeId => {
                    const cell = graphRef.current!.getCellById(nodeId);
                    if (cell) {
                        cellsToHide.push(cell);
                        const edges = graphRef.current!.getConnectedEdges(cell as Node);
                        edges?.forEach(edge => cellsToHide.push(edge));
                    }
                });
                cellsToHide.forEach(cell => cell.setVisible(false));
            }

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
            // If a single node is selected at paste time, use it as the parent for "orphan" pasted nodes.
            // Otherwise, fall back to the current root so pasted nodes participate in auto-layout.
            const pasteTargetParentId = selectedNodes.length === 1 ? selectedNodes[0].id : undefined;
            const fallbackParentId = pasteTargetParentId ?? (() => {
                const graph = graphRef.current;
                if (!graph) return undefined;
                const nodes = graph.getNodes();
                const rootNode = nodes.find((node) => {
                    const data = node.getData() || {};
                    return data.type === 'root' || data.mindmapType === 'root';
                });
                if (rootNode) return rootNode.id;
                const topLevelNode = nodes.find((node) => {
                    const data = node.getData() || {};
                    return !data.parentId;
                });
                return topLevelNode?.id;
            })();

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
                        } else if (fallbackParentId) {
                            // Parent wasn't copied - attach to selection or root so layout includes the node
                            resolvedParentId = fallbackParentId;
                        }
                        // If no paste target and original parent not in clipboard, leave orphaned
                    } else if (fallbackParentId) {
                        // Node had no parent originally; attach to selection or root
                        resolvedParentId = fallbackParentId;
                    }

                    // Track parent-child relationship for edge creation
                    if (resolvedParentId) {
                        parentChildRelations.push({ parentId: resolvedParentId, childId: newId });
                    }

                    // CRITICAL: Match YjsNodeData structure expected by GraphSyncManager
                    // Story 2.6 Fix: Copy props but remove database-managed fields
                    // nodeId, createdAt, updatedAt are managed by the database, not the props JSON
                    const now = new Date().toISOString();
                    const rawProps = nodeData.metadata && typeof nodeData.metadata === 'object'
                        ? (nodeData.metadata as Record<string, unknown>)
                        : {};
                    const sanitizedProps = sanitizeNodeProps(nodeData.type, rawProps);
                    const updatedProps = Object.keys(sanitizedProps).length > 0 ? sanitizedProps : undefined;

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

                        // Fix: Use correct YjsEdgeData structure with type and metadata fields
                        // GraphSyncManager expects: type ('hierarchical' | 'reference'), metadata: { kind, dependencyType }
                        yEdges.set(edgeId, {
                            id: edgeId,
                            source: newSourceId,
                            target: newTargetId,
                            // Legacy 'type' field for backward compatibility
                            type: edgeData.kind === 'dependency' ? 'reference' : 'hierarchical',
                            // Story 2.2: Edge metadata for polymorphic edges
                            metadata: {
                                kind: edgeData.kind,
                                dependencyType: edgeData.dependencyType,
                            },
                            graphId: graphId,
                        });
                    }
                });

                // Story 2.6 Fix: Create hierarchical edges for parent-child relationships
                // This ensures pasted nodes are properly connected to their parents
                parentChildRelations.forEach(({ parentId, childId }) => {
                    // Fix: Check if a HIERARCHICAL edge already exists (not dependency edge)
                    // Dependency edges (FS/SS/FF/SF) represent logical relationships between siblings,
                    // NOT parent-child structure. We must create hierarchical edges for actual hierarchy.
                    const hierarchicalEdgeExists = data.edges.some(e => {
                        // Only consider hierarchical edges, skip dependency edges
                        if (e.kind === 'dependency') return false;
                        const mappedSource = idMap.get(e.sourceOriginalId);
                        const mappedTarget = idMap.get(e.targetOriginalId);
                        return (mappedSource === parentId && mappedTarget === childId) ||
                            (mappedSource === childId && mappedTarget === parentId);
                    });

                    if (!hierarchicalEdgeExists) {
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
     * Soft delete selected nodes and all their descendants
     * Story 2.6: Support Delete key to archive selected nodes and children
     */
    const deleteNodes = useCallback(() => {
        if (!graphRef.current || !yDoc || selectedNodes.length === 0) {
            return;
        }

        const yNodes = yDoc.getMap('nodes');

        // Collect selected node IDs
        const selectedIds = new Set(selectedNodes.map(n => n.id));

        // Protect center-node
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
        const allNodesToArchive = new Set([...selectedIds, ...descendantIds]);

        // Soft delete in Yjs transaction
        undoManager?.stopCapturing();
        yDoc.transact(() => {
            const now = new Date().toISOString();
            allNodesToArchive.forEach(nodeId => {
                const existing = yNodes.get(nodeId) as any;
                if (existing) {
                    yNodes.set(nodeId, {
                        ...existing,
                        isArchived: true,
                        archivedAt: now,
                        updatedAt: now
                    });
                    // Trigger backend archive
                    archiveNode(nodeId).catch(err =>
                        console.error(`[Clipboard] Failed to archive node ${nodeId} on server during delete`, err)
                    );
                }
            });
        });

        // Update X6 visibility locally
        if (graphRef.current) {
            const cellsToHide: any[] = [];
            allNodesToArchive.forEach(id => {
                const cell = graphRef.current!.getCellById(id);
                if (cell) {
                    cellsToHide.push(cell);
                    const edges = graphRef.current!.getConnectedEdges(cell as Node);
                    edges?.forEach(edge => cellsToHide.push(edge));
                }
            });
            cellsToHide.forEach(cell => cell.setVisible(false));
            graphRef.current.cleanSelection();
        }

        clearSelection();

        const childCount = descendantIds.size;
        if (childCount > 0) {
            toast.success(`已归档 ${selectedIds.size} 个节点及 ${childCount} 个子节点`);
        } else {
            toast.success(`已归档 ${selectedIds.size} 个节点`);
        }
    }, [yDoc, undoManager, selectedNodes, clearSelection]);

    /**
     * Permanently delete selected nodes and all their descendants
     * Story 2.7: Support Shift+Delete for permanent deletion with multi-client sync
     */
    const { showConfirm } = useConfirmDialog();

    const hardDeleteNodes = useCallback(() => {
        if (!graphRef.current || !yDoc || selectedNodes.length === 0) {
            return;
        }

        const yNodes = yDoc.getMap('nodes');
        const yEdges = yDoc.getMap('edges');

        // Collect selected node IDs
        const selectedIds = new Set(selectedNodes.map(n => n.id));

        // Protect center-node
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
        const allNodesToDelete = new Set([...selectedIds, ...descendantIds]);
        const totalCount = allNodesToDelete.size;

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
                    // Delete edges first
                    edgesToDelete.forEach(edgeId => {
                        yEdges.delete(edgeId);
                    });
                    // Then delete nodes
                    allNodesToDelete.forEach(nodeId => {
                        yNodes.delete(nodeId);
                    });
                });

                // 4. Manually remove cells from X6 Graph
                // IMPORTANT: GraphSyncManager's observe callback skips transactions with
                // LOCAL_ORIGIN marker (from GraphSyncManager itself), but propagates changes
                // from other sources (like this clipboard hook). However, we still manually
                // remove cells here for immediate UI feedback before Yjs sync completes.
                if (graphRef.current) {
                    // Remove edges first to avoid dangling references
                    edgesToDelete.forEach(edgeId => {
                        const cell = graphRef.current!.getCellById(edgeId);
                        if (cell) {
                            graphRef.current!.removeCell(cell);
                        }
                    });
                    // Then remove nodes
                    allNodesToDelete.forEach(nodeId => {
                        const cell = graphRef.current!.getCellById(nodeId);
                        if (cell) {
                            graphRef.current!.removeCell(cell);
                        }
                    });
                    graphRef.current.cleanSelection();
                }
                clearSelection();

                // 5. Show success message
                if (descendantIds.size > 0) {
                    toast.success(`已永久删除 ${selectedIds.size} 个节点及 ${descendantIds.size} 个子节点`);
                } else {
                    toast.success(`已永久删除 ${selectedIds.size} 个节点`);
                }
            },
        });
    }, [yDoc, selectedNodes, clearSelection, showConfirm]);

    return {
        copy,
        cut,
        paste,
        canPaste,
        deleteNodes,
        hardDeleteNodes,
    };
}
