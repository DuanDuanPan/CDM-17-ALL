'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Graph, Node } from '@antv/x6';
import { NodeType } from '@cdm/types';
import { isDependencyEdge } from '@/lib/edgeValidation';
import { HIERARCHICAL_EDGE_SHAPE } from '@/lib/edgeShapes';
import { HIERARCHICAL_EDGE_ATTRS } from '@/lib/edgeStyles';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

export interface OutlineNode {
    id: string;
    label: string;
    /** Mindmap structural type (root/topic/subtopic) */
    type: string;
    /** Semantic node type aligned to data model */
    nodeType?: NodeType;
    children: OutlineNode[];
    hasChildren: boolean;
    depth: number;
}

export interface UseOutlineDataOptions {
    graph: Graph | null;
    isReady: boolean;
}

export interface UseOutlineDataReturn {
    /** 树形大纲数据 */
    outlineData: OutlineNode[];
    /** 刷新数据（手动触发） */
    refresh: () => void;
    /** 重排节点：将 nodeId 移动到 newParentId 下的 siblingIndex 位置 */
    reorderNode: (nodeId: string, newParentId: string | null, siblingIndex: number) => void;
}

// ─────────────────────────────────────────────────
// Implementation
// ─────────────────────────────────────────────────

const MINDMAP_TYPES = new Set(['root', 'topic', 'subtopic']);

const isMindmapType = (value: unknown): value is 'root' | 'topic' | 'subtopic' =>
    typeof value === 'string' && MINDMAP_TYPES.has(value);

const isNodeType = (value: unknown): value is NodeType =>
    typeof value === 'string' && Object.values(NodeType).includes(value as NodeType);

/**
 * Story 8.4: Outline View Data Hook
 * Provides tree-structured data for outline view, derived from graph nodes and edges.
 */
export function useOutlineData({
    graph,
    isReady,
}: UseOutlineDataOptions): UseOutlineDataReturn {
    const [version, setVersion] = useState(0);

    // ═══════════════════════════════════════════════
    // Helper: Get direct children (follows useNodeCollapse pattern)
    // ═══════════════════════════════════════════════
    const getDirectChildren = useCallback((nodeId: string): Node[] => {
        if (!graph) return [];
        const cell = graph.getCellById(nodeId);
        if (!cell?.isNode()) return [];

        const node = cell as Node;
        const outgoingEdges = graph.getOutgoingEdges(node) ?? [];
        const children: Node[] = [];
        const seen = new Set<string>();

        outgoingEdges.forEach((edge) => {
            // Skip dependency edges - only hierarchical edges define the tree
            if (isDependencyEdge(edge)) return;
            const targetId = edge.getTargetCellId();
            if (!targetId || seen.has(targetId)) return;
            const targetCell = graph.getCellById(targetId);
            if (!targetCell?.isNode()) return;
            seen.add(targetId);
            children.push(targetCell as Node);
        });

        // Sort by data.order if available, otherwise stable by id
        children.sort((a, b) => {
            const orderA = a.getData()?.order ?? Infinity;
            const orderB = b.getData()?.order ?? Infinity;
            if (orderA !== orderB) return orderA - orderB;
            return a.id.localeCompare(b.id);
        });

        return children;
    }, [graph]);

    // ═══════════════════════════════════════════════
    // Helper: Find root nodes (nodes without a parent edge)
    // ═══════════════════════════════════════════════
    const getRootNodes = useCallback((): Node[] => {
        if (!graph) return [];
        const allNodes = graph.getNodes();

        // Build set of all node IDs that are children
        const childIds = new Set<string>();
        allNodes.forEach((node) => {
            const children = getDirectChildren(node.id);
            children.forEach((c) => childIds.add(c.id));
        });

        // Root nodes have no parent (not in childIds)
        const roots = allNodes.filter((n) => !childIds.has(n.id));

        // Sort roots by order or label
        roots.sort((a, b) => {
            const orderA = a.getData()?.order ?? Infinity;
            const orderB = b.getData()?.order ?? Infinity;
            if (orderA !== orderB) return orderA - orderB;
            const labelA = a.getData()?.label || '';
            const labelB = b.getData()?.label || '';
            return labelA.localeCompare(labelB);
        });

        return roots;
    }, [graph, getDirectChildren]);

    // ═══════════════════════════════════════════════
    // Build tree recursively
    // ═══════════════════════════════════════════════
    const buildTree = useCallback((nodeId: string, depth: number, visited: Set<string>): OutlineNode | null => {
        if (visited.has(nodeId)) return null;
        visited.add(nodeId);

        const cell = graph?.getCellById(nodeId);
        if (!cell?.isNode()) return null;

        const node = cell as Node;
        const data = node.getData() || {};
        const children = getDirectChildren(nodeId);
        const rawType = data.type;
        const nodeType = data.nodeType ?? (isNodeType(rawType) ? rawType : undefined);
        const mindmapType = data.mindmapType ?? (isMindmapType(rawType) ? rawType : undefined);

        const childNodes = children
            .map((c) => buildTree(c.id, depth + 1, visited))
            .filter((n): n is OutlineNode => n !== null);

        return {
            id: nodeId,
            label: data.label || 'Untitled',
            type: mindmapType ?? 'topic',
            nodeType,
            children: childNodes,
            hasChildren: children.length > 0,
            depth,
        };
    }, [graph, getDirectChildren]);

    // ═══════════════════════════════════════════════
    // Computed: Outline data (memoized)
    // Note: `version` in deps triggers recomputation on graph events
    // ═══════════════════════════════════════════════
    const outlineData = useMemo((): OutlineNode[] => {
        if (!graph || !isReady) return [];

        const roots = getRootNodes();
        const visited = new Set<string>();

        return roots
            .map((r) => buildTree(r.id, 0, visited))
            .filter((n): n is OutlineNode => n !== null);
    }, [graph, isReady, version, getRootNodes, buildTree]);

    // ═══════════════════════════════════════════════
    // Refresh trigger
    // ═══════════════════════════════════════════════
    const refresh = useCallback(() => {
        setVersion((v) => v + 1);
    }, []);

    // ═══════════════════════════════════════════════
    // Reorder node (update parent-child edge)
    // ═══════════════════════════════════════════════
    const reorderNode = useCallback((
        nodeId: string,
        newParentId: string | null,
        siblingIndex: number
    ) => {
        if (!graph || !isReady) return;

        const cell = graph.getCellById(nodeId);
        if (!cell?.isNode()) return;
        const node = cell as Node;

        if (newParentId === nodeId) return;

        // Guard: prevent cycles (cannot move under its own descendant)
        const isDescendant = (ancestorId: string, maybeDescendantId: string): boolean => {
            const visited = new Set<string>();
            const stack: string[] = [ancestorId];
            while (stack.length > 0) {
                const current = stack.pop();
                if (!current || visited.has(current)) continue;
                visited.add(current);
                const children = getDirectChildren(current);
                for (const child of children) {
                    if (child.id === maybeDescendantId) return true;
                    if (!visited.has(child.id)) stack.push(child.id);
                }
            }
            return false;
        };

        if (newParentId && isDescendant(nodeId, newParentId)) return;

        const parentCell = newParentId ? graph.getCellById(newParentId) : null;
        const nextParentId = parentCell?.isNode() ? newParentId : null;

        // Current hierarchical parent id (derived from incoming non-dependency edge)
        const incomingEdges = graph.getIncomingEdges(node) ?? [];
        const hierarchicalIncomingEdges = incomingEdges.filter((edge) => !isDependencyEdge(edge));
        const currentParentId = hierarchicalIncomingEdges[0]?.getSourceCellId?.() ?? null;

        const getSiblings = (parentId: string | null): Node[] => {
            if (!graph) return [];
            return parentId ? getDirectChildren(parentId) : getRootNodes();
        };

        const oldSiblings = getSiblings(currentParentId).filter((n) => n.id !== nodeId);
        const baseNewSiblings = getSiblings(nextParentId).filter((n) => n.id !== nodeId);
        const clampedIndex = Math.max(0, Math.min(siblingIndex, baseNewSiblings.length));
        const newSiblings = [
            ...baseNewSiblings.slice(0, clampedIndex),
            node,
            ...baseNewSiblings.slice(clampedIndex),
        ];

        const normalizeOrder = (siblings: Node[]) => {
            siblings.forEach((n, idx) => {
                const data = n.getData() || {};
                n.setData({ ...data, order: idx });
            });
        };

        graph.batchUpdate(() => {
            // 1) Update hierarchical edge only when parent changes
            if (currentParentId !== nextParentId) {
                // Remove existing hierarchical edges to this node (as target)
                hierarchicalIncomingEdges.forEach((edge) => {
                    graph.removeEdge(edge.id);
                });

                // Create new edge if nextParentId is provided
                if (nextParentId) {
                    graph.addEdge({
                        shape: HIERARCHICAL_EDGE_SHAPE,
                        source: { cell: nextParentId },
                        target: { cell: nodeId },
                        connector: { name: 'smooth' },
                        attrs: HIERARCHICAL_EDGE_ATTRS,
                        data: { type: 'hierarchical', metadata: { kind: 'hierarchical' } },
                    });
                }
            }

            // 2) Update node.data.parentId for consistency (always)
            const data = node.getData() || {};
            node.setData({ ...data, parentId: nextParentId || undefined });

            // 3) Normalize sibling order for old parent (when moved across parents)
            if (currentParentId !== nextParentId) {
                normalizeOrder(oldSiblings);
            }

            // 4) Normalize sibling order for new parent (apply siblingIndex)
            normalizeOrder(newSiblings);
        });

        // 4. Trigger refresh
        refresh();
    }, [graph, isReady, refresh, getDirectChildren, getRootNodes]);

    // ═══════════════════════════════════════════════
    // Listen to graph changes for auto-refresh (debounced)
    // ═══════════════════════════════════════════════
    useEffect(() => {
        if (!graph || !isReady) return;

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const handleChange = () => {
            // Debounce refresh to avoid high-frequency updates
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                refresh();
            }, 100);
        };

        graph.on('node:added', handleChange);
        graph.on('node:removed', handleChange);
        graph.on('edge:added', handleChange);
        graph.on('edge:removed', handleChange);
        graph.on('node:change:data', handleChange);

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            graph.off('node:added', handleChange);
            graph.off('node:removed', handleChange);
            graph.off('edge:added', handleChange);
            graph.off('edge:removed', handleChange);
            graph.off('node:change:data', handleChange);
        };
    }, [graph, isReady, refresh]);

    return {
        outlineData,
        refresh,
        reorderNode,
    };
}
