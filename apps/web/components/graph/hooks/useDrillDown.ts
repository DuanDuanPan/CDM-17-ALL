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
import type { Graph, Node, Edge, Cell } from '@antv/x6';
import {
    useDrillPath,
    pushPath,
    popPath,
    goToPath,
    resetPath,
    restoreFromUrl,
    getCurrentRootId,
} from '@/lib/drillDownStore';

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
    }, [graph, isReady, drillPath]);

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
            const hierarchyChildren = outEdges.filter((edge) => {
                const edgeData = edge.getData() || {};
                return edgeData.edgeType !== 'dependency';
            });

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

    if (!rootNodeId) {
        // Main view: show all nodes and edges
        allNodes.forEach((node) => node.show());
        allEdges.forEach((edge) => edge.show());

        // AC2: Fit view to show all visible nodes with animation
        setTimeout(() => {
            graph.zoomToFit({ padding: 60, maxScale: 1.2 });
        }, 50);
        return;
    }

    // Find the root node
    const rootCell = graph.getCellById(rootNodeId);
    if (!rootCell || !rootCell.isNode()) {
        // Root node doesn't exist - reset to main view
        console.warn('[useDrillDown] Root node not found, resetting to main view:', rootNodeId);
        resetPath();
        return;
    }

    const rootNode = rootCell as Node;

    // Collect visible node IDs (root + all descendants via hierarchy edges)
    const visibleNodeIds = new Set<string>();
    collectDescendants(graph, rootNode, visibleNodeIds);

    // Apply visibility to nodes
    allNodes.forEach((node) => {
        if (visibleNodeIds.has(node.id)) {
            node.show();
        } else {
            node.hide();
        }
    });

    // Apply visibility to edges (only show if both source and target are visible)
    allEdges.forEach((edge) => {
        const sourceId = edge.getSourceCellId();
        const targetId = edge.getTargetCellId();

        if (sourceId && targetId && visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)) {
            edge.show();
        } else {
            edge.hide();
        }
    });

    // AC2: Center on subgraph root with smooth animation
    // Delay to allow DOM to update visibility first
    setTimeout(() => {
        graph.centerCell(rootNode);
        graph.zoomToFit({ padding: 80, maxScale: 1.5 });
    }, 50);
}

/**
 * Recursively collect all descendant node IDs starting from a root node.
 * Only follows hierarchy edges (not dependency edges).
 *
 * @param graph The X6 graph instance
 * @param node The current node to process
 * @param collected Set to collect node IDs
 */
function collectDescendants(graph: Graph, node: Node, collected: Set<string>): void {
    collected.add(node.id);

    // Get outgoing edges that are NOT dependency edges
    const outEdges = graph.getOutgoingEdges(node) || [];

    for (const edge of outEdges) {
        const edgeData = edge.getData() || {};

        // Skip dependency edges - only follow hierarchy edges
        if (edgeData.edgeType === 'dependency') {
            continue;
        }

        const targetCell = edge.getTargetCell();
        if (targetCell && targetCell.isNode() && !collected.has(targetCell.id)) {
            collectDescendants(graph, targetCell as Node, collected);
        }
    }
}
