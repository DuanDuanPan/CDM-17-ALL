'use client';

/**
 * Story 8.9: 子图下钻导航 (Subgraph Drill-Down Navigation)
 * useDrillDown hook - 封装下钻视图逻辑
 *
 * 技术决策:
 * - GR-3.1: 使用 hide()/show() 实现视图过滤，不移除 cells
 * - GR-3: 下钻是视图状态，不修改 Yjs 数据
 * - TD-3: 子图渲染通过视图过滤实现，不改变底层数据结构
 */

import { useCallback, useEffect, useRef } from 'react';
import type { Graph, Node, Edge } from '@antv/x6';
import {
    useDrillPath,
    pushPath,
    popPath,
    goToPath,
    resetPath,
    restoreFromUrl,
} from '@/lib/drillDownStore';
import { isDependencyEdge } from '@/lib/edgeValidation';

export interface UseDrillDownOptions {
    graph: Graph | null;
    isReady: boolean;
}

export interface UseDrillDownReturn {
    /** Current drill path */
    drillPath: readonly string[];
    /** Current subgraph root node ID (null if at main view) */
    currentRootId: string | null;
    /** Whether currently in drill mode */
    isDrillMode: boolean;
    /** Drill into a node's subgraph */
    drillInto: (nodeId: string) => void;
    /** Return to parent level (via breadcrumb click) */
    drillUp: () => void;
    /** Jump to specific path (via breadcrumb navigation) */
    drillToPath: (path: readonly string[]) => void;
    /** Return to main view (root) */
    drillToRoot: () => void;
    /** Check if a node has children (can be drilled into) */
    canDrillInto: (nodeId: string) => boolean;
}

/**
 * Hook to manage drill-down navigation in the graph.
 *
 * This hook:
 * 1. Subscribes to drill path changes
 * 2. Applies visibility filters based on current path
 * 3. Restores drill state on mount (from URL/sessionStorage)
 *
 * @param options Graph instance and ready state
 * @returns Drill-down navigation controls
 */
export function useDrillDown({ graph, isReady }: UseDrillDownOptions): UseDrillDownReturn {
    const drillPath = useDrillPath();
    const isInitialized = useRef(false);
    const currentRootIdRef = useRef<string | null>(null);
    const reapplyRafRef = useRef<number | null>(null);
    const viewportRafRef = useRef<number | null>(null);

    useEffect(() => {
        currentRootIdRef.current = drillPath.length > 0 ? drillPath[drillPath.length - 1] : null;
    }, [drillPath]);

    // Restore drill path from URL on mount
    useEffect(() => {
        if (!isReady || isInitialized.current) return;
        isInitialized.current = true;
        restoreFromUrl();
    }, [isReady]);

    // Apply visibility filter when drill path changes
    useEffect(() => {
        if (!graph || !isReady) return;

        const currentRootId = drillPath.length > 0 ? drillPath[drillPath.length - 1] : null;
        applyVisibilityFilter(graph, currentRootId);

        // Center/fit after visibility changes (cancel previous scheduled viewport updates)
        if (typeof window === 'undefined') return;
        if (viewportRafRef.current !== null) {
            window.cancelAnimationFrame(viewportRafRef.current);
        }
        viewportRafRef.current = window.requestAnimationFrame(() => {
            viewportRafRef.current = null;

            if (!graph) return;

            if (!currentRootId) {
                graph.zoomToFit({ padding: 60, maxScale: 1.2 });
                return;
            }

            const rootCell = graph.getCellById(currentRootId);
            if (rootCell && rootCell.isNode()) {
                graph.centerCell(rootCell as Node);
                graph.zoomToFit({ padding: 80, maxScale: 1.5 });
            }
        });
    }, [graph, isReady, drillPath]);

    // Re-apply visibility on graph mutations (collaboration, collapse/expand, add/remove)
    useEffect(() => {
        if (!graph || !isReady) return;
        if (typeof window === 'undefined') return;

        const scheduleReapply = () => {
            if (reapplyRafRef.current !== null) return;
            reapplyRafRef.current = window.requestAnimationFrame(() => {
                reapplyRafRef.current = null;
                applyVisibilityFilter(graph, currentRootIdRef.current);
            });
        };

        graph.on('node:added', scheduleReapply);
        graph.on('node:removed', scheduleReapply);
        graph.on('edge:added', scheduleReapply);
        graph.on('edge:removed', scheduleReapply);
        graph.on('node:change:data', scheduleReapply);

        return () => {
            graph.off('node:added', scheduleReapply);
            graph.off('node:removed', scheduleReapply);
            graph.off('edge:added', scheduleReapply);
            graph.off('edge:removed', scheduleReapply);
            graph.off('node:change:data', scheduleReapply);

            if (reapplyRafRef.current !== null) {
                window.cancelAnimationFrame(reapplyRafRef.current);
                reapplyRafRef.current = null;
            }
            if (viewportRafRef.current !== null) {
                window.cancelAnimationFrame(viewportRafRef.current);
                viewportRafRef.current = null;
            }
        };
    }, [graph, isReady]);

    /**
     * Check if a node has hierarchical children (can be drilled into)
     * Only considers hierarchy edges, not dependency edges
     */
    const canDrillInto = useCallback(
        (nodeId: string): boolean => {
            if (!graph) return false;

            const node = graph.getCellById(nodeId);
            if (!node || !node.isNode()) return false;

            // Get outgoing edges that are NOT dependency edges
            const outEdges = graph.getOutgoingEdges(node as Node) || [];
            const hierarchyChildren = outEdges.filter((edge) => !isDependencyEdge(edge));

            return hierarchyChildren.length > 0;
        },
        [graph]
    );

    /**
     * Drill into a node's subgraph
     */
    const drillInto = useCallback(
        (nodeId: string) => {
            if (!canDrillInto(nodeId)) {
                console.warn('[useDrillDown] Cannot drill into node without children:', nodeId);
                return;
            }
            pushPath(nodeId);
        },
        [canDrillInto]
    );

    /**
     * Return to parent level
     */
    const drillUp = useCallback(() => {
        popPath();
    }, []);

    /**
     * Jump to specific path (via breadcrumb navigation)
     */
    const drillToPath = useCallback((path: readonly string[]) => {
        goToPath(path);
    }, []);

    /**
     * Return to main view (root)
     */
    const drillToRoot = useCallback(() => {
        resetPath();
    }, []);

    return {
        drillPath,
        currentRootId: drillPath.length > 0 ? drillPath[drillPath.length - 1] : null,
        isDrillMode: drillPath.length > 0,
        drillInto,
        drillUp,
        drillToPath,
        drillToRoot,
        canDrillInto,
    };
}

/**
 * Apply visibility filter to show only the subgraph rooted at the given node.
 * Uses hide()/show() to toggle visibility without removing cells.
 * Includes animation support via graph viewport transition.
 *
 * @param graph The X6 graph instance
 * @param rootNodeId The current subgraph root (null for main view)
 */
function applyVisibilityFilter(graph: Graph, rootNodeId: string | null): void {
    const allNodes = graph.getNodes();
    const allEdges = graph.getEdges();

    const nodesById = new Map<string, Node>(allNodes.map((node) => [node.id, node]));
    const hierarchyChildrenMap = buildHierarchyChildrenMap(allEdges);

    // Validate root if in drill mode
    if (rootNodeId) {
        const rootCell = graph.getCellById(rootNodeId);
        if (!rootCell || !rootCell.isNode()) {
            console.warn('[useDrillDown] Root node not found, resetting to main view:', rootNodeId);
            resetPath();
            return;
        }
    }

    const visibleNodeIds = rootNodeId
        ? computeVisibleInDrillMode(rootNodeId, nodesById, hierarchyChildrenMap)
        : computeVisibleInMainView(nodesById, hierarchyChildrenMap);

    // Apply visibility in a single batch to reduce expensive reflows
    graph.batchUpdate(() => {
        allNodes.forEach((node) => {
            if (visibleNodeIds.has(node.id)) node.show();
            else node.hide();
        });

        allEdges.forEach((edge) => {
            const sourceId = edge.getSourceCellId();
            const targetId = edge.getTargetCellId();
            const visible = Boolean(sourceId && targetId && visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId));
            if (visible) edge.show();
            else edge.hide();
        });
    });
}

/**
 * Build a map of hierarchy (non-dependency) children from current edge list.
 */
function buildHierarchyChildrenMap(edges: Edge[]): Map<string, string[]> {
    const map = new Map<string, string[]>();

    for (const edge of edges) {
        if (isDependencyEdge(edge)) continue;
        const sourceId = edge.getSourceCellId();
        const targetId = edge.getTargetCellId();
        if (!sourceId || !targetId) continue;
        const list = map.get(sourceId);
        if (list) list.push(targetId);
        else map.set(sourceId, [targetId]);
    }

    return map;
}

function isNodeCollapsed(node: Node): boolean {
    const data = node.getData() as { collapsed?: unknown } | null;
    return data?.collapsed === true;
}

/**
 * Main view visibility:
 * - Show all nodes except descendants of any collapsed node (Story 8.1 compatibility)
 */
function computeVisibleInMainView(
    nodesById: Map<string, Node>,
    hierarchyChildrenMap: Map<string, string[]>
): Set<string> {
    const hiddenByCollapse = new Set<string>();

    const collapsedNodes = Array.from(nodesById.values()).filter((node) => isNodeCollapsed(node));
    for (const collapsedNode of collapsedNodes) {
        const stack = [...(hierarchyChildrenMap.get(collapsedNode.id) ?? [])];
        while (stack.length > 0) {
            const id = stack.pop()!;
            if (hiddenByCollapse.has(id)) continue;
            hiddenByCollapse.add(id);
            const children = hierarchyChildrenMap.get(id);
            if (children) stack.push(...children);
        }
    }

    const visible = new Set<string>();
    nodesById.forEach((_, id) => {
        if (!hiddenByCollapse.has(id)) visible.add(id);
    });
    return visible;
}

/**
 * Drill mode visibility:
 * - Include root + descendants via hierarchy edges
 * - Stop descending when a node is collapsed (collapse hides descendants)
 */
function computeVisibleInDrillMode(
    rootNodeId: string,
    nodesById: Map<string, Node>,
    hierarchyChildrenMap: Map<string, string[]>
): Set<string> {
    const visible = new Set<string>();
    const visited = new Set<string>();
    const queue: string[] = [rootNodeId];

    for (let i = 0; i < queue.length; i++) {
        const currentId = queue[i];
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const node = nodesById.get(currentId);
        if (!node) continue;

        visible.add(currentId);
        if (isNodeCollapsed(node)) continue;

        const children = hierarchyChildrenMap.get(currentId);
        if (!children) continue;
        for (const childId of children) {
            if (!visited.has(childId)) queue.push(childId);
        }
    }

    return visible;
}
