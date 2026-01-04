'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Graph, Node } from '@antv/x6';
import { isDependencyEdge } from '@/lib/edgeValidation';

/**
 * Story 8.1: Node Collapse & Expand
 * Hook to manage node collapse/expand state and visibility
 * 
 * Architecture: Follows Yjs-first data flow
 * - Node.setData({ collapsed }) → GraphSyncManager → Yjs → all clients
 * - Visibility changes are local (not synced) - each client applies visibility based on collapsed state
 */

export interface UseNodeCollapseOptions {
    /** X6 Graph instance */
    graph: Graph | null;
    /** Whether the graph is ready */
    isReady: boolean;
}

export interface UseNodeCollapseReturn {
    /** Check if a node is collapsed */
    isCollapsed: (nodeId: string) => boolean;
    /** Toggle collapse state of a node */
    toggleCollapse: (nodeId: string) => void;
    /** Collapse a node (hide descendants) */
    collapseNode: (nodeId: string) => void;
    /** Expand a node (show descendants) */
    expandNode: (nodeId: string) => void;
    /** Recursively collapse all descendants */
    collapseDescendants: (nodeId: string) => void;
    /** Expand all ancestors to make a node visible (for search navigation) */
    expandPathToNode: (nodeId: string) => void;
    /** Get the total count of hidden descendants for a collapsed node */
    getHiddenDescendantCount: (nodeId: string) => number;
    /** Get direct child count for a node */
    getChildCount: (nodeId: string) => number;
    /** Check if a node has children */
    hasChildren: (nodeId: string) => boolean;
}

/**
 * useNodeCollapse - Hook for managing node collapse/expand functionality
 * 
 * @param options - Configuration options
 * @returns Collapse/expand methods and utilities
 */
export function useNodeCollapse({
    graph,
    isReady,
}: UseNodeCollapseOptions): UseNodeCollapseReturn {
    // Track locally applied visibility to avoid redundant updates
    const visibilityMapRef = useRef<Map<string, boolean>>(new Map());

    const getNodeById = useCallback((nodeId: string): Node | null => {
        if (!graph) return null;

        const cell = graph.getCellById(nodeId);
        if (!cell || !cell.isNode()) return null;
        return cell as Node;
    }, [graph]);

    /**
     * Get direct children of a node (outgoing hierarchical edges only)
     */
    const getDirectChildren = useCallback((nodeId: string): Node[] => {
        if (!graph) return [];

        const node = getNodeById(nodeId);
        if (!node) return [];

        const outgoingEdges = graph.getOutgoingEdges(node) ?? [];
        const children: Node[] = [];
        const seen = new Set<string>();

        outgoingEdges.forEach((edge) => {
            // Skip dependency edges - only hierarchical edges define the tree
            if (isDependencyEdge(edge)) return;

            const targetId = edge.getTargetCellId();
            if (!targetId || seen.has(targetId)) return;

            const targetCell = graph.getCellById(targetId);
            if (!targetCell || !targetCell.isNode()) return;

            seen.add(targetId);
            children.push(targetCell as Node);
        });

        return children;
    }, [graph, getNodeById]);

    /**
     * Get all descendants of a node recursively
     */
    const getAllDescendants = useCallback((nodeId: string): Node[] => {
        if (!graph) return [];

        const root = getNodeById(nodeId);
        if (!root) return [];

        const descendants: Node[] = [];
        const visited = new Set<string>([nodeId]);
        const queue: string[] = [nodeId];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const children = getDirectChildren(currentId);

            children.forEach((child) => {
                if (visited.has(child.id)) return;
                visited.add(child.id);
                descendants.push(child);
                queue.push(child.id);
            });
        }

        return descendants;
    }, [graph, getNodeById, getDirectChildren]);

    /**
     * Get all ancestors of a node (path to root)
     */
    const getAncestors = useCallback((nodeId: string): Node[] => {
        if (!graph) return [];

        const ancestors: Node[] = [];
        const visited = new Set<string>();
        let currentId: string | null = nodeId;

        while (currentId) {
            const node = getNodeById(currentId);
            if (!node) break;

            const data = node.getData() || {};
            const parentId = data.parentId;
            if (typeof parentId !== 'string' || parentId.length === 0) break;
            if (visited.has(parentId)) break;
            visited.add(parentId);

            const parentNode = getNodeById(parentId);
            if (!parentNode) break;

            ancestors.push(parentNode);
            currentId = parentId;
        }

        return ancestors;
    }, [graph, getNodeById]);

    /**
     * Check if a node should currently be visible based on its ancestors' collapse state.
     * (A node is hidden if any ancestor is collapsed.)
     */
    const isVisibleByAncestors = useCallback((nodeId: string): boolean => {
        const ancestors = getAncestors(nodeId);
        return ancestors.every((ancestor) => {
            const data = ancestor.getData() || {};
            return data.collapsed !== true;
        });
    }, [getAncestors]);

    /**
     * Check if a node is collapsed
     */
    const isCollapsed = useCallback((nodeId: string): boolean => {
        const node = getNodeById(nodeId);
        if (!node) return false;

        const data = node.getData() || {};
        return data.collapsed === true;
    }, [getNodeById]);

    /**
     * Check if a node has children
     */
    const hasChildren = useCallback((nodeId: string): boolean => {
        return getDirectChildren(nodeId).length > 0;
    }, [getDirectChildren]);

    /**
     * Get direct child count
     */
    const getChildCount = useCallback((nodeId: string): number => {
        return getDirectChildren(nodeId).length;
    }, [getDirectChildren]);

    /**
     * Get hidden descendant count for a collapsed node
     */
    const getHiddenDescendantCount = useCallback((nodeId: string): number => {
        if (!isCollapsed(nodeId)) return 0;
        return getAllDescendants(nodeId).length;
    }, [isCollapsed, getAllDescendants]);

    /**
     * Apply visibility to descendants based on collapse state
     * This is called after collapse state changes to update the visual representation
     */
    const applyDescendantVisibility = useCallback((nodeId: string, visible: boolean) => {
        if (!graph) return;

        const descendants = getAllDescendants(nodeId);
        if (descendants.length === 0) return;

        // Batch update for performance
        graph.batchUpdate(() => {
            descendants.forEach((descendant) => {
                // Check if any ancestor of this descendant is collapsed
                // If so, it should remain hidden even when expanding parent
                let shouldBeVisible = visible;

                if (visible) {
                    // When expanding, keep descendant hidden if any intermediate ancestor is still collapsed
                    let currentId: string | null = descendant.id;
                    const visited = new Set<string>();
                    while (currentId && currentId !== nodeId) {
                        if (visited.has(currentId)) break;
                        visited.add(currentId);

                        const current = getNodeById(currentId);
                        if (!current) break;
                        const data = current.getData() || {};
                        const parentId = data.parentId;
                        if (typeof parentId !== 'string' || parentId.length === 0) break;

                        if (parentId === nodeId) break;

                        const parentNode = getNodeById(parentId);
                        const parentData = parentNode?.getData() || {};
                        if (parentData.collapsed === true) {
                            shouldBeVisible = false;
                            break;
                        }

                        currentId = parentId;
                    }
                }

                // Update node visibility
                if (shouldBeVisible) {
                    descendant.show();
                } else {
                    descendant.hide();
                }
                visibilityMapRef.current.set(descendant.id, shouldBeVisible);

                // Update connected edges visibility
                const edges = graph.getConnectedEdges(descendant);
                edges?.forEach((edge) => {
                    const source = edge.getSourceCell();
                    const target = edge.getTargetCell();
                    // Show edge only if both endpoints are visible
                    if (source?.isVisible() && target?.isVisible()) {
                        edge.show();
                    } else {
                        edge.hide();
                    }
                });
            });
        });
    }, [graph, getAllDescendants, getNodeById]);

    /**
     * Collapse a node - hide all descendants
     */
    const collapseNode = useCallback((nodeId: string) => {
        if (!graph || !isReady) return;

        const node = getNodeById(nodeId);
        if (!node) return;

        // Check if already collapsed or has no children
        const data = node.getData() || {};
        if (data.collapsed || !hasChildren(nodeId)) return;

        // Update collapsed state - this triggers Yjs sync via node:change:data
        node.setData({ ...data, collapsed: true });

        // Apply visibility (local operation, not synced)
        applyDescendantVisibility(nodeId, false);
    }, [graph, isReady, getNodeById, hasChildren, applyDescendantVisibility]);

    /**
     * Expand a node - show direct descendants (respecting their own collapse state)
     */
    const expandNode = useCallback((nodeId: string) => {
        if (!graph || !isReady) return;

        const node = getNodeById(nodeId);
        if (!node) return;

        // Check if already expanded
        const data = node.getData() || {};
        if (!data.collapsed) return;

        // Update collapsed state - this triggers Yjs sync via node:change:data
        node.setData({ ...data, collapsed: false });

        // If this node is currently hidden by a collapsed ancestor, do not reveal its subtree yet.
        if (!isVisibleByAncestors(nodeId)) return;

        // Apply visibility - show direct children, but respect their collapse states
        // Direct children become visible
        const directChildren = getDirectChildren(nodeId);
        graph.batchUpdate(() => {
            directChildren.forEach((child) => {
                child.show();
                visibilityMapRef.current.set(child.id, true);

                // Update edges
                const edges = graph.getConnectedEdges(child);
                edges?.forEach((edge) => {
                    const source = edge.getSourceCell();
                    const target = edge.getTargetCell();
                    if (source?.isVisible() && target?.isVisible()) {
                        edge.show();
                    } else {
                        edge.hide();
                    }
                });

                // If this child is NOT collapsed, recursively show its descendants
                const childData = child.getData() || {};
                if (!childData.collapsed) {
                    applyDescendantVisibility(child.id, true);
                }
            });
        });
    }, [graph, isReady, getNodeById, isVisibleByAncestors, getDirectChildren, applyDescendantVisibility]);

    /**
     * Toggle collapse state
     */
    const toggleCollapse = useCallback((nodeId: string) => {
        if (isCollapsed(nodeId)) {
            expandNode(nodeId);
        } else {
            collapseNode(nodeId);
        }
    }, [isCollapsed, collapseNode, expandNode]);

    /**
     * Recursively collapse all descendants (AC3)
     */
    const collapseDescendants = useCallback((nodeId: string) => {
        if (!graph || !isReady) return;

        const node = getNodeById(nodeId);
        if (!node) return;

        const descendants = getAllDescendants(nodeId);

        graph.batchUpdate(() => {
            // First, mark all descendants as collapsed
            descendants.forEach((descendant) => {
                const data = descendant.getData() || {};
                if (hasChildren(descendant.id)) {
                    descendant.setData({ ...data, collapsed: true });
                }
            });

            // Then collapse the root node
            const data = node.getData() || {};
            node.setData({ ...data, collapsed: true });
        });

        // Apply visibility
        applyDescendantVisibility(nodeId, false);
    }, [graph, isReady, getNodeById, getAllDescendants, hasChildren, applyDescendantVisibility]);

    /**
     * Expand path to a specific node (AC5: for search navigation)
     * Expands all collapsed ancestors to make the target node visible
     */
    const expandPathToNode = useCallback((nodeId: string) => {
        if (!graph || !isReady) return;

        const node = getNodeById(nodeId);
        if (!node) return;

        const ancestors = getAncestors(nodeId);

        // Expand ancestors from root to target (reverse order for proper visibility)
        const collapsedAncestors = ancestors
            .filter((ancestor) => {
                const data = ancestor.getData() || {};
                return data.collapsed === true;
            })
            .reverse(); // Start from root

        collapsedAncestors.forEach((ancestor) => {
            expandNode(ancestor.id);
        });
    }, [graph, isReady, getNodeById, getAncestors, expandNode]);

    /**
     * Listen for remote collapse state changes (via node:change:data)
     * When another collaborator collapses/expands a node, apply visibility locally
     */
    useEffect(() => {
        if (!graph || !isReady) return;

        const handleDataChange = ({ node }: { node: Node }) => {
            const data = node.getData() || {};
            const key = node.id + ':collapsed';
            const isNowCollapsed = data.collapsed === true;

            const wasCollapsed = visibilityMapRef.current.get(key);
            // If we don't have a previous value yet, initialize and do nothing.
            // This prevents unrelated data changes from being misinterpreted as expand/collapse.
            if (wasCollapsed === undefined) {
                visibilityMapRef.current.set(key, isNowCollapsed);
                return;
            }

            // Only react if collapse state actually changed
            if (wasCollapsed !== isNowCollapsed) {
                visibilityMapRef.current.set(key, isNowCollapsed);

                // Apply visibility based on new state
                if (isNowCollapsed) {
                    applyDescendantVisibility(node.id, false);
                } else {
                    // If this node is hidden by a collapsed ancestor, keep subtree hidden.
                    if (!isVisibleByAncestors(node.id)) return;

                    // When expanding, show direct children
                    const directChildren = getDirectChildren(node.id);
                    graph.batchUpdate(() => {
                        directChildren.forEach((child) => {
                            child.show();
                            const edges = graph.getConnectedEdges(child);
                            edges?.forEach((edge) => {
                                const source = edge.getSourceCell();
                                const target = edge.getTargetCell();
                                if (source?.isVisible() && target?.isVisible()) {
                                    edge.show();
                                } else {
                                    edge.hide();
                                }
                            });

                            // If child is not collapsed, show its descendants too
                            const childData = child.getData() || {};
                            if (!childData.collapsed) {
                                applyDescendantVisibility(child.id, true);
                            }
                        });
                    });
                }
            }
        };

        graph.on('node:change:data', handleDataChange);

        return () => {
            graph.off('node:change:data', handleDataChange);
        };
    }, [graph, isReady, applyDescendantVisibility, getDirectChildren, isVisibleByAncestors]);

    /**
     * On initial load, apply visibility based on existing collapse states
     */
    useEffect(() => {
        if (!graph || !isReady) return;

        const nodes = graph.getNodes();
        // Reset tracked state for this graph instance
        visibilityMapRef.current.clear();

        nodes.forEach((node) => {
            const data = node.getData() || {};
            visibilityMapRef.current.set(node.id + ':collapsed', data.collapsed === true);
        });

        // Apply initial visibility for any collapsed nodes
        nodes.forEach((node) => {
            const data = node.getData() || {};
            if (data.collapsed) {
                applyDescendantVisibility(node.id, false);
            }
        });
    }, [graph, isReady, applyDescendantVisibility]);

    /**
     * Ensure nodes added after initial load (e.g. via collaboration sync) respect ancestor collapse state.
     * This prevents a collapsed ancestor from "leaking" newly loaded descendants as visible after refresh.
     */
    useEffect(() => {
        if (!graph || !isReady) return;

        const handleNodeAdded = ({ node }: { node: Node }) => {
            if (isVisibleByAncestors(node.id)) return;

            graph.batchUpdate(() => {
                node.hide();
                const edges = graph.getConnectedEdges(node);
                edges?.forEach((edge) => edge.hide());
            });
        };

        graph.on('node:added', handleNodeAdded);
        return () => {
            graph.off('node:added', handleNodeAdded);
        };
    }, [graph, isReady, isVisibleByAncestors]);

    /**
     * Story 8.1: Listen for custom events from MindNode UI
     * These events are dispatched when user clicks collapse toggle or child count badge
     */
    useEffect(() => {
        if (!graph || !isReady) return;

        const handleToggleCollapse = (e: Event) => {
            const detail = (e as CustomEvent).detail as { nodeId: string };
            if (detail?.nodeId) {
                toggleCollapse(detail.nodeId);
            }
        };

        const handleExpandNode = (e: Event) => {
            const detail = (e as CustomEvent).detail as { nodeId: string };
            if (detail?.nodeId) {
                expandNode(detail.nodeId);
            }
        };

        const handleExpandPathToNode = (e: Event) => {
            const detail = (e as CustomEvent).detail as { nodeId: string };
            if (detail?.nodeId) {
                expandPathToNode(detail.nodeId);
            }
        };

        window.addEventListener('mindmap:toggle-collapse', handleToggleCollapse);
        window.addEventListener('mindmap:expand-node', handleExpandNode);
        window.addEventListener('mindmap:expand-path-to-node', handleExpandPathToNode);

        return () => {
            window.removeEventListener('mindmap:toggle-collapse', handleToggleCollapse);
            window.removeEventListener('mindmap:expand-node', handleExpandNode);
            window.removeEventListener('mindmap:expand-path-to-node', handleExpandPathToNode);
        };
    }, [graph, isReady, toggleCollapse, expandNode, expandPathToNode]);

    return {
        isCollapsed,
        toggleCollapse,
        collapseNode,
        expandNode,
        collapseDescendants,
        expandPathToNode,
        getHiddenDescendantCount,
        getChildCount,
        hasChildren,
    };
}
