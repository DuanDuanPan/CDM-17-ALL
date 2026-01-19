'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Graph, Node } from '@antv/x6';
import { NodeType, LayoutMode } from '@cdm/types';
import {
    getDirectChildrenByParentId,
    getRootNodes as getRootNodesByParentId,
    buildChildrenMap,
    isDescendant,
} from '@/lib/parentIdUtils';
import { reconcileSingleNodeEdge } from '@/lib/edgeReconciler';

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
    /** Current layout mode (needed for correct edge routing during reconcile) */
    layoutMode?: LayoutMode | null;
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
    layoutMode = null,
}: UseOutlineDataOptions): UseOutlineDataReturn {
    const [version, setVersion] = useState(0);

    // ═══════════════════════════════════════════════
    // Helper: Get direct children (Story 8.10: parentId-based)
    // ═══════════════════════════════════════════════
    const getDirectChildren = useCallback((nodeId: string): Node[] => {
        if (!graph) return [];
        return getDirectChildrenByParentId(graph, nodeId);
    }, [graph]);

    // ═══════════════════════════════════════════════
    // Helper: Find root nodes (Story 8.10: parentId-based)
    // ═══════════════════════════════════════════════
    const getRootNodes = useCallback((): Node[] => {
        if (!graph) return [];
        return getRootNodesByParentId(graph);
    }, [graph]);

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
    // Reorder node (Story 8.10: parentId-first, edge via reconcile)
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
        if (newParentId && isDescendant(graph, nodeId, newParentId)) return;

        const parentCell = newParentId ? graph.getCellById(newParentId) : null;
        const nextParentId = parentCell?.isNode() ? newParentId : null;

        // Current parentId from node data (Story 8.10: single source of truth)
        const currentData = node.getData() || {};
        const currentParentId = currentData.parentId || null;

        // Build children map once for efficiency
        const childrenMap = buildChildrenMap(graph);

        const getSiblings = (parentId: string | null): Node[] => {
            if (!graph) return [];
            return parentId
                ? getDirectChildrenByParentId(graph, parentId, childrenMap)
                : getRootNodesByParentId(graph);
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
            // 1) Update parentId (single source of truth)
            node.setData({ ...currentData, parentId: nextParentId || undefined });

            // 2) Normalize sibling order for old parent (when moved across parents)
            if (currentParentId !== nextParentId) {
                normalizeOrder(oldSiblings);
            }

            // 3) Normalize sibling order for new parent (apply siblingIndex)
            normalizeOrder(newSiblings);
        });

        // 4) Reconcile edge (Story 8.10: edge follows parentId)
        if (currentParentId !== nextParentId) {
            reconcileSingleNodeEdge(graph, nodeId, currentParentId || undefined, nextParentId || undefined, { layoutMode });
        }

        // 5) Trigger refresh
        refresh();
    }, [graph, isReady, refresh]);

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
