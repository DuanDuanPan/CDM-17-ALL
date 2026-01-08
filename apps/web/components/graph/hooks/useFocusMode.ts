'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import type { Graph, Node, Edge } from '@antv/x6';
import { isDependencyEdge } from '@/lib/edgeValidation';
import { HIERARCHICAL_EDGE_GLOW_OPACITY } from '@/lib/edgeStyles';

/**
 * Story 8.5: Focus Mode
 * Hook to manage focus mode state and node opacity for visual focus.
 *
 * Architecture: Pure local visual state (not synced via Yjs)
 * - Focus mode is a personal visual preference
 * - Opacity changes are applied directly to X6 cells
 * - Uses BFS to calculate related nodes at configurable depth
 */

export interface UseFocusModeOptions {
    /** X6 Graph instance */
    graph: Graph | null;
    /** Whether the graph is ready */
    isReady: boolean;
    /** Currently selected node ID */
    selectedNodeId: string | null;
}

export interface UseFocusModeReturn {
    /** Whether focus mode is active */
    isFocusMode: boolean;
    /** Current focus level (1-3) */
    focusLevel: 1 | 2 | 3;
    /** Toggle focus mode on/off */
    toggleFocusMode: () => void;
    /** Exit focus mode */
    exitFocusMode: () => void;
    /** Set focus level */
    setFocusLevel: (level: 1 | 2 | 3) => void;
}

// Constants for opacity values
const FOCUSED_OPACITY = 1;
const DIMMED_OPACITY = 0.2;

/**
 * useFocusMode - Hook for managing focus mode functionality (Story 8.5)
 *
 * @param options - Configuration options
 * @returns Focus mode methods and state
 */
export function useFocusMode({
    graph,
    isReady,
    selectedNodeId,
}: UseFocusModeOptions): UseFocusModeReturn {
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [focusLevel, setFocusLevel] = useState<1 | 2 | 3>(1);

    // Track previous focus state to avoid redundant updates
    const prevFocusedIdsRef = useRef<Set<string>>(new Set());

    /**
     * Check if two sets are equal (same elements)
     */
    const areSetsEqual = useCallback((a: Set<string>, b: Set<string>): boolean => {
        if (a.size !== b.size) return false;
        for (const item of a) {
            if (!b.has(item)) return false;
        }
        return true;
    }, []);

    /**
     * Get node by ID helper
     */
    const getNodeById = useCallback(
        (nodeId: string): Node | null => {
            if (!graph) return null;
            const cell = graph.getCellById(nodeId);
            if (!cell || !cell.isNode()) return null;
            return cell as Node;
        },
        [graph]
    );

    /**
     * Get parent node ID from node data
     */
    const getParentId = useCallback(
        (nodeId: string): string | null => {
            const node = getNodeById(nodeId);
            if (!node) return null;
            const data = node.getData() || {};
            return typeof data.parentId === 'string' && data.parentId.length > 0
                ? data.parentId
                : null;
        },
        [getNodeById]
    );

    /**
     * Get direct children of a node (outgoing hierarchical edges only)
     */
    const getDirectChildren = useCallback(
        (nodeId: string): string[] => {
            if (!graph) return [];

            const node = getNodeById(nodeId);
            if (!node) return [];

            const outgoingEdges = graph.getOutgoingEdges(node) ?? [];
            const children: string[] = [];
            const seen = new Set<string>();

            outgoingEdges.forEach((edge) => {
                // Skip dependency edges - only hierarchical edges define the tree
                if (isDependencyEdge(edge)) return;

                const targetId = edge.getTargetCellId();
                if (!targetId || seen.has(targetId)) return;

                const targetCell = graph.getCellById(targetId);
                if (!targetCell || !targetCell.isNode()) return;

                seen.add(targetId);
                children.push(targetId);
            });

            return children;
        },
        [graph, getNodeById]
    );

    /**
     * Get siblings of a node (nodes with same parent)
     */
    const getSiblings = useCallback(
        (nodeId: string): string[] => {
            const parentId = getParentId(nodeId);
            if (!parentId) return [];

            const siblings = getDirectChildren(parentId);
            return siblings.filter((id) => id !== nodeId);
        },
        [getParentId, getDirectChildren]
    );

    /**
     * Get related node IDs using BFS traversal up to specified level
     * Uses graph distance (parent/child relationships as undirected edges)
     *
     * Level 1: parent + children + siblings
     * Level 2: Level 1 + grandparent + grandchildren + parent's siblings + children's children
     * Level 3: Level 2 + one more expansion
     */
    const getRelatedNodeIds = useCallback(
        (nodeId: string, level: number): Set<string> => {
            if (!graph) return new Set([nodeId]);

            const related = new Set<string>([nodeId]);
            const visited = new Set<string>([nodeId]);
            let currentLevel: string[] = [nodeId];

            for (let depth = 0; depth < level; depth++) {
                const nextLevel: string[] = [];

                for (const currentId of currentLevel) {
                    // Add parent
                    const parentId = getParentId(currentId);
                    if (parentId && !visited.has(parentId)) {
                        visited.add(parentId);
                        related.add(parentId);
                        nextLevel.push(parentId);
                    }

                    // Add children
                    const children = getDirectChildren(currentId);
                    for (const childId of children) {
                        if (!visited.has(childId)) {
                            visited.add(childId);
                            related.add(childId);
                            nextLevel.push(childId);
                        }
                    }

                    // Add siblings at each depth level
                    // Level 1: focal's siblings
                    // Level 2: + parent's siblings (uncle/aunt) + children's siblings
                    // Level 3: + further expansion
                    const siblings = getSiblings(currentId);
                    for (const siblingId of siblings) {
                        if (!visited.has(siblingId)) {
                            visited.add(siblingId);
                            related.add(siblingId);
                            nextLevel.push(siblingId);
                        }
                    }
                }

                currentLevel = nextLevel;
            }

            return related;
        },
        [graph, getParentId, getDirectChildren, getSiblings]
    );

    /**
     * Apply focus opacity to all nodes and edges
     */
    const applyFocusOpacity = useCallback(
        (focusedIds: Set<string>) => {
            if (!graph) return;

            // Performance guard: skip if focused IDs haven't changed
            if (areSetsEqual(focusedIds, prevFocusedIdsRef.current)) {
                return;
            }

            graph.batchUpdate(() => {
                // Apply opacity to nodes
                const nodes = graph.getNodes();
                nodes.forEach((node) => {
                    const isFocused = focusedIds.has(node.id);
                    const opacity = isFocused ? FOCUSED_OPACITY : DIMMED_OPACITY;

                    // Check for React Shape (foreignObject) BEFORE setting attr
                    // React Shape uses 'fo' selector, others use 'body'
                    const hasReactShape = node.getAttrByPath('fo') !== undefined;
                    if (hasReactShape) {
                        node.attr('fo/opacity', opacity);
                    } else {
                        node.attr('body/opacity', opacity);
                    }
                });

                // Apply opacity to edges
                const edges = graph.getEdges();
                edges.forEach((edge) => {
                    const sourceId = edge.getSourceCellId();
                    const targetId = edge.getTargetCellId();

                    // Edge is focused only if both endpoints are in focus range
                    const isFocused =
                        sourceId && targetId && focusedIds.has(sourceId) && focusedIds.has(targetId);
                    const opacity = isFocused ? FOCUSED_OPACITY : DIMMED_OPACITY;

                    // Check for hierarchical edge (has glow) BEFORE setting attr
                    const hasGlow = edge.getAttrByPath('glow') !== undefined;
                    if (hasGlow) {
                        // Hierarchical edge (cdm-hierarchical-edge markup)
                        edge.attr('line/strokeOpacity', opacity);
                        edge.attr('glow/strokeOpacity', opacity);
                    } else {
                        // Simple edge fallback
                        edge.attr('line/opacity', opacity);
                    }
                });
            });

            prevFocusedIdsRef.current = focusedIds;
        },
        [graph, areSetsEqual]
    );

    /**
     * Clear all focus opacity (restore to normal)
     */
    const clearFocusOpacity = useCallback(() => {
        if (!graph) return;

        graph.batchUpdate(() => {
            // Restore node opacity
            const nodes = graph.getNodes();
            nodes.forEach((node) => {
                // Check for React Shape (foreignObject) BEFORE setting attr
                const hasReactShape = node.getAttrByPath('fo') !== undefined;
                if (hasReactShape) {
                    node.attr('fo/opacity', FOCUSED_OPACITY);
                } else {
                    node.attr('body/opacity', FOCUSED_OPACITY);
                }
            });

            // Restore edge opacity
            const edges = graph.getEdges();
            edges.forEach((edge) => {
                // Check for hierarchical edge (has glow) BEFORE setting attr
                const hasGlow = edge.getAttrByPath('glow') !== undefined;
                if (hasGlow) {
                    edge.attr('line/strokeOpacity', FOCUSED_OPACITY);
                    // Restore glow to original opacity (not 1)
                    edge.attr('glow/strokeOpacity', HIERARCHICAL_EDGE_GLOW_OPACITY);
                } else {
                    edge.attr('line/opacity', FOCUSED_OPACITY);
                }
            });
        });

        prevFocusedIdsRef.current.clear();
    }, [graph]);

    /**
     * Toggle focus mode on/off
     */
    const toggleFocusMode = useCallback(() => {
        if (!graph || !isReady) return;

        // If no node selected, do nothing (AC5)
        if (!selectedNodeId) {
            return;
        }

        if (isFocusMode) {
            // Exit focus mode
            clearFocusOpacity();
            setIsFocusMode(false);
        } else {
            // Enter focus mode
            const focusedIds = getRelatedNodeIds(selectedNodeId, focusLevel);
            applyFocusOpacity(focusedIds);
            setIsFocusMode(true);
        }
    }, [
        graph,
        isReady,
        selectedNodeId,
        isFocusMode,
        focusLevel,
        getRelatedNodeIds,
        applyFocusOpacity,
        clearFocusOpacity,
    ]);

    /**
     * Exit focus mode
     */
    const exitFocusMode = useCallback(() => {
        if (!isFocusMode) return;
        clearFocusOpacity();
        setIsFocusMode(false);
    }, [isFocusMode, clearFocusOpacity]);

    /**
     * Handle focus level change
     */
    const handleSetFocusLevel = useCallback(
        (level: 1 | 2 | 3) => {
            setFocusLevel(level);

            // If focus mode is active, immediately reapply with new level
            if (isFocusMode && selectedNodeId && graph) {
                const focusedIds = getRelatedNodeIds(selectedNodeId, level);
                applyFocusOpacity(focusedIds);
            }
        },
        [isFocusMode, selectedNodeId, graph, getRelatedNodeIds, applyFocusOpacity]
    );

    /**
     * Update focus range when selected node changes (AC5)
     */
    useEffect(() => {
        if (!graph || !isReady || !isFocusMode) return;

        if (!selectedNodeId) {
            // No node selected - exit focus mode
            exitFocusMode();
            return;
        }

        // Recalculate and apply focus based on new selection
        const focusedIds = getRelatedNodeIds(selectedNodeId, focusLevel);
        applyFocusOpacity(focusedIds);
    }, [
        graph,
        isReady,
        isFocusMode,
        selectedNodeId,
        focusLevel,
        getRelatedNodeIds,
        applyFocusOpacity,
        exitFocusMode,
    ]);

    /**
     * Cleanup on unmount or when graph changes
     */
    useEffect(() => {
        return () => {
            if (isFocusMode) {
                clearFocusOpacity();
            }
        };
    }, [graph, isFocusMode, clearFocusOpacity]);

    return {
        isFocusMode,
        focusLevel,
        toggleFocusMode,
        exitFocusMode,
        setFocusLevel: handleSetFocusLevel,
    };
}
