/**
 * Story 8.10: Edge Reconciler
 *
 * Reconciles hierarchical edges to match parentId relationships.
 * Hierarchical edges are derived from `parentId` and used only for rendering.
 *
 * Key principles:
 * - parentId is the single source of truth
 * - Hierarchical edges are local (not synced to Yjs)
 * - Dependency edges are independent (synced to Yjs as before)
 */

import type { Graph, Edge } from '@antv/x6';
import type { LayoutMode } from '@cdm/types';
import { isDependencyEdge } from './edgeValidation';
import { VERTICAL_SHARED_TRUNK_ROUTER } from './edgeRoutingConstants';
import { HIERARCHICAL_EDGE_SHAPE } from './edgeShapes';
import { HIERARCHICAL_EDGE_ATTRS } from './edgeStyles';
import { buildChildrenMap } from './parentIdUtils';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

interface ReconcileOptions {
    /** If true, log warnings for orphan nodes (parentId pointing to non-existent node) */
    warnOrphans?: boolean;
    /** Layout mode affects hierarchical edge routing/anchors (logic uses vertical trunk routing) */
    layoutMode?: LayoutMode | null;
}

// ─────────────────────────────────────────────────
// Full Reconcile
// ─────────────────────────────────────────────────

/**
 * Reconcile all hierarchical edges to match parentId relationships.
 * This should be called:
 * 1. After graph load (loadInitialState)
 * 2. After batch parentId changes
 *
 * The function:
 * - Creates missing hierarchical edges
 * - Removes stale hierarchical edges
 * - Preserves dependency edges (untouched)
 *
 * @param graph - X6 Graph instance
 * @param options - Reconcile options
 */
export function reconcileHierarchicalEdges(
    graph: Graph,
    options: ReconcileOptions = {}
): void {
    const { warnOrphans = true, layoutMode = null } = options;
    const useVerticalRouter = layoutMode === 'logic';

    try {
        const childrenMap = buildChildrenMap(graph);

        // Build expected edges: key = "parentId→childId"
        const expectedKeys = new Set<string>();
        const orphanNodes: string[] = [];

        childrenMap.forEach((children, parentId) => {
            // Verify parent node exists
            const parentCell = graph.getCellById(parentId);
            if (!parentCell?.isNode()) {
                // Parent doesn't exist - these are orphan children
                children.forEach((child) => orphanNodes.push(child.id));
                return;
            }

            children.forEach((child) => {
                expectedKeys.add(`${parentId}→${child.id}`);
            });
        });

        if (warnOrphans && orphanNodes.length > 0) {
            console.warn(
                `[edgeReconciler] Found ${orphanNodes.length} orphan node(s) with invalid parentId:`,
                orphanNodes
            );
        }

        // Get existing hierarchical edges
        const existingEdges = graph.getEdges().filter((e) => !isDependencyEdge(e));
        const existingByKey = new Map<string, Edge>();

        existingEdges.forEach((edge) => {
            const sourceId = edge.getSourceCellId();
            const targetId = edge.getTargetCellId();
            if (!sourceId || !targetId) return;
            existingByKey.set(`${sourceId}→${targetId}`, edge);
        });

        graph.batchUpdate(() => {
            // 1) Remove stale edges (exist in graph but not expected)
            existingByKey.forEach((edge, key) => {
                if (!expectedKeys.has(key)) {
                    graph.removeEdge(edge.id);
                }
            });

            // 2) Create missing edges
            expectedKeys.forEach((key) => {
                if (existingByKey.has(key)) return;

                const [sourceId, targetId] = key.split('→');
                if (!sourceId || !targetId) return;

                const hierarchicalSource = useVerticalRouter
                    ? { cell: sourceId, anchor: { name: 'bottom' } }
                    : { cell: sourceId };
                const hierarchicalTarget = useVerticalRouter
                    ? { cell: targetId, anchor: { name: 'top' } }
                    : { cell: targetId };
                const hierarchicalRouter = useVerticalRouter
                    ? { name: VERTICAL_SHARED_TRUNK_ROUTER }
                    : undefined;
                const hierarchicalConnector = useVerticalRouter
                    ? { name: 'rounded', args: { radius: 8 } }
                    : { name: 'smooth' };

                graph.addEdge({
                    shape: HIERARCHICAL_EDGE_SHAPE,
                    source: hierarchicalSource,
                    target: hierarchicalTarget,
                    router: hierarchicalRouter,
                    connector: hierarchicalConnector,
                    attrs: HIERARCHICAL_EDGE_ATTRS,
                    data: {
                        type: 'hierarchical',
                        metadata: { kind: 'hierarchical' },
                    },
                });
            });
        });
    } catch (error) {
        console.error('[edgeReconciler] Failed to reconcile hierarchical edges:', error);
    }
}

// ─────────────────────────────────────────────────
// Single Node Reconcile
// ─────────────────────────────────────────────────

/**
 * Reconcile a single node's hierarchical edge after parentId change.
 * More efficient than full reconcile for incremental updates.
 *
 * @param graph - X6 Graph instance
 * @param nodeId - ID of the node whose parentId changed
 * @param oldParentId - Previous parentId (undefined if was root)
 * @param newParentId - New parentId (undefined if now root)
 */
export function reconcileSingleNodeEdge(
    graph: Graph,
    nodeId: string,
    oldParentId: string | undefined,
    newParentId: string | undefined,
    options: ReconcileOptions = {}
): void {
    const { layoutMode = null } = options;
    const useVerticalRouter = layoutMode === 'logic';

    try {
        graph.batchUpdate(() => {
            // 1) Remove old hierarchical edge if exists
            if (oldParentId) {
                const oldEdge = graph.getEdges().find((e) => {
                    if (isDependencyEdge(e)) return false;
                    return (
                        e.getSourceCellId() === oldParentId &&
                        e.getTargetCellId() === nodeId
                    );
                });
                if (oldEdge) {
                    graph.removeEdge(oldEdge.id);
                }
            }

            // 2) Create new hierarchical edge if needed
            if (newParentId) {
                const parentCell = graph.getCellById(newParentId);
                if (!parentCell?.isNode()) {
                    console.warn(
                        `[edgeReconciler] Cannot create edge: parent node ${newParentId} not found`
                    );
                    return;
                }

                // Check if edge already exists (shouldn't, but defensive)
                const existingEdge = graph.getEdges().find((e) => {
                    if (isDependencyEdge(e)) return false;
                    return (
                        e.getSourceCellId() === newParentId &&
                        e.getTargetCellId() === nodeId
                    );
                });

                if (!existingEdge) {
                    const hierarchicalSource = useVerticalRouter
                        ? { cell: newParentId, anchor: { name: 'bottom' } }
                        : { cell: newParentId };
                    const hierarchicalTarget = useVerticalRouter
                        ? { cell: nodeId, anchor: { name: 'top' } }
                        : { cell: nodeId };
                    const hierarchicalRouter = useVerticalRouter
                        ? { name: VERTICAL_SHARED_TRUNK_ROUTER }
                        : undefined;
                    const hierarchicalConnector = useVerticalRouter
                        ? { name: 'rounded', args: { radius: 8 } }
                        : { name: 'smooth' };

                    graph.addEdge({
                        shape: HIERARCHICAL_EDGE_SHAPE,
                        source: hierarchicalSource,
                        target: hierarchicalTarget,
                        router: hierarchicalRouter,
                        connector: hierarchicalConnector,
                        attrs: HIERARCHICAL_EDGE_ATTRS,
                        data: {
                            type: 'hierarchical',
                            metadata: { kind: 'hierarchical' },
                        },
                    });
                }
            }
        });
    } catch (error) {
        console.error(
            `[edgeReconciler] Failed to reconcile edge for node ${nodeId}:`,
            error
        );
    }
}

/**
 * Check if a hierarchical edge needs reconciliation.
 * Useful for determining if reconcile is needed after graph changes.
 *
 * @param graph - X6 Graph instance
 * @returns true if edges don't match parentId relationships
 */
export function needsReconcile(graph: Graph): boolean {
    const childrenMap = buildChildrenMap(graph);

    // Count expected edges
    let expectedEdgeCount = 0;
    childrenMap.forEach((children, parentId) => {
        const parentCell = graph.getCellById(parentId);
        if (parentCell?.isNode()) {
            expectedEdgeCount += children.length;
        }
    });

    // Count existing hierarchical edges
    const hierarchicalEdges = graph.getEdges().filter((e) => !isDependencyEdge(e));
    const existingEdgeCount = hierarchicalEdges.length;

    // Quick count check
    if (expectedEdgeCount !== existingEdgeCount) {
        return true;
    }

    // Verify each expected edge exists
    const existingEdgeKeys = new Set<string>();
    hierarchicalEdges.forEach((edge) => {
        const sourceId = edge.getSourceCellId();
        const targetId = edge.getTargetCellId();
        if (sourceId && targetId) {
            existingEdgeKeys.add(`${sourceId}→${targetId}`);
        }
    });

    let needsUpdate = false;
    childrenMap.forEach((children, parentId) => {
        const parentCell = graph.getCellById(parentId);
        if (!parentCell?.isNode()) return;

        children.forEach((child) => {
            const key = `${parentId}→${child.id}`;
            if (!existingEdgeKeys.has(key)) {
                needsUpdate = true;
            }
        });
    });

    return needsUpdate;
}
