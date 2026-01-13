/**
 * Story 9.8: Node Tree Projection Hook
 * Task 2.1-2.6: Extracts PBS+TASK nodes from graph and builds projected tree
 * 
 * Projection algorithm:
 * 1. Collect all nodes from graph
 * 2. Filter to PBS/TASK semantic nodes only
 * 3. Find nearest semantic ancestor for each node (skip DATA/ORDINARY/etc)
 * 4. Build tree with proper parent-child relationships
 * 5. Maintain original sibling order (by NodeData.order)
 * 
 * Also provides:
 * - getOriginalPath(nodeId): Lazy path calculation for breadcrumb
 * - getNodeLabel(nodeId): Get node label for display
 */

'use client';

import { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { useGraphContextOptional } from '@/contexts/GraphContext';
import { NodeType } from '@cdm/types';
import type { MindNodeData } from '@cdm/types';

// ========================================
// Types
// ========================================

export interface ProjectedNode {
    id: string;
    label: string;
    nodeType: NodeType;
    /** Original parent ID from graph (may be non-semantic) */
    originalParentId: string | null;
    /** Display parent ID (nearest semantic ancestor) */
    displayParentId: string | null;
    children: ProjectedNode[];
    depth: number;
    /** Order for sibling sorting */
    order?: number;
}

export interface UseNodeTreeProjectionResult {
    /** Projected tree roots */
    projectedTree: ProjectedNode[];
    /** Whether graph is loading */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Get complete path from root to node (includes hidden nodes) */
    getOriginalPath: (nodeId: string) => string[];
    /** Get label for a node ID */
    getNodeLabel: (nodeId: string) => string;
    /** Get node type for a node ID */
    getNodeType: (nodeId: string) => NodeType | null;
}

// ========================================
// Constants
// ========================================

/** Semantic node types to include in projection */
const SEMANTIC_NODE_TYPES = new Set<NodeType>([NodeType.PBS, NodeType.TASK]);

/** Max depth for ancestor traversal (prevent infinite loops) */
const MAX_ANCESTOR_DEPTH = 100;

/** Warning threshold for root nodes */
const MAX_ROOTS_WARNING = 50;

// ========================================
// Hook
// ========================================

export function useNodeTreeProjection(): UseNodeTreeProjectionResult {
    const graphContext = useGraphContextOptional();
    const graph = graphContext?.graph;

    // Track version for re-render on graph changes
    const [version, setVersion] = useState(0);
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced refresh
    const refreshNodes = useCallback(() => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
            setVersion((v) => v + 1);
        }, 100);
    }, []);

    // Subscribe to graph node changes
    useEffect(() => {
        if (!graph) return;
        const events = ['node:added', 'node:removed', 'node:change:data'];
        events.forEach((event) => graph.on(event, refreshNodes));
        return () => {
            events.forEach((event) => graph.off(event, refreshNodes));
        };
    }, [graph, refreshNodes]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, []);

    // Build node map for efficient lookups
    const nodeMap = useMemo(() => {
        const map = new Map<string, MindNodeData>();
        if (!graph) return map;

        const allNodes = graph.getNodes();
        for (const node of allNodes) {
            const data = node.getData() as MindNodeData | undefined;
            if (data) {
                map.set(node.id, data);
            }
        }
        return map;
    }, [graph, version]);

    // Find nearest semantic ancestor
    const findSemanticAncestor = useCallback(
        (nodeId: string): string | null => {
            const data = nodeMap.get(nodeId);
            if (!data?.parentId) return null;

            let currentId = data.parentId;
            let depth = 0;

            while (currentId && depth < MAX_ANCESTOR_DEPTH) {
                const current = nodeMap.get(currentId);
                if (!current) break;

                if (current.nodeType && SEMANTIC_NODE_TYPES.has(current.nodeType)) {
                    return currentId;
                }

                if (!current.parentId) break;
                currentId = current.parentId;
                depth++;
            }

            if (depth >= MAX_ANCESTOR_DEPTH) {
                console.warn(
                    `[useNodeTreeProjection] Max ancestor depth reached for node ${nodeId}. ` +
                    `Possible circular reference or very deep tree.`
                );
            }

            return null;
        },
        [nodeMap]
    );

    // Build projected tree
    const projectedTree = useMemo(() => {
        if (!graph) return [];

        // Step 1: Collect semantic nodes
        const semanticNodes: Array<[string, MindNodeData]> = [];
        for (const [id, data] of nodeMap) {
            if (data.nodeType && SEMANTIC_NODE_TYPES.has(data.nodeType)) {
                semanticNodes.push([id, data]);
            }
        }

        // Step 2: Create projected nodes with display parents
        const projectedMap = new Map<string, ProjectedNode>();

        for (const [id, data] of semanticNodes) {
            const displayParentId = findSemanticAncestor(id);

            projectedMap.set(id, {
                id,
                label: data.label || '未命名',
                nodeType: data.nodeType!,
                originalParentId: data.parentId || null,
                displayParentId,
                children: [],
                depth: 0,
                order: (data as MindNodeData & { order?: number }).order,
            });
        }

        // Step 3: Build parent-child relationships
        const roots: ProjectedNode[] = [];

        for (const node of projectedMap.values()) {
            if (node.displayParentId && projectedMap.has(node.displayParentId)) {
                projectedMap.get(node.displayParentId)!.children.push(node);
            } else {
                roots.push(node);
            }
        }

        // Step 4: Warn if too many roots
        if (roots.length > MAX_ROOTS_WARNING) {
            console.warn(
                `[useNodeTreeProjection] Large number of root nodes: ${roots.length}. ` +
                `This may indicate orphaned nodes or data issues.`
            );
        }

        // Step 5: Sort siblings and calculate depth
        const sortAndSetDepth = (nodes: ProjectedNode[], depth = 0) => {
            // Sort by order first, then by label
            nodes.sort((a, b) => {
                const orderA = a.order;
                const orderB = b.order;

                if (orderA !== undefined && orderB !== undefined) {
                    const orderDiff = orderA - orderB;
                    if (orderDiff !== 0) return orderDiff;
                } else {
                    if (orderA !== undefined) return -1;
                    if (orderB !== undefined) return 1;
                }

                const labelDiff = a.label.localeCompare(b.label, 'zh-CN');
                if (labelDiff !== 0) return labelDiff;

                // Stable fallback when order+label are identical
                return a.id.localeCompare(b.id);
            });

            for (const node of nodes) {
                node.depth = depth;
                sortAndSetDepth(node.children, depth + 1);
            }
        };

        sortAndSetDepth(roots);

        return roots;
    }, [graph, nodeMap, findSemanticAncestor, version]);

    // Lazy path calculation for breadcrumb (includes hidden nodes)
    const getOriginalPath = useCallback(
        (nodeId: string): string[] => {
            const path: string[] = [];
            let currentId: string | null = nodeId;
            let depth = 0;

            while (currentId && depth < MAX_ANCESTOR_DEPTH) {
                path.unshift(currentId);
                const current = nodeMap.get(currentId);
                if (!current?.parentId) break;
                currentId = current.parentId;
                depth++;
            }

            return path;
        },
        [nodeMap]
    );

    // Get label for display
    const getNodeLabel = useCallback(
        (nodeId: string): string => {
            const data = nodeMap.get(nodeId);
            return data?.label || nodeId;
        },
        [nodeMap]
    );

    // Get node type
    const getNodeType = useCallback(
        (nodeId: string): NodeType | null => {
            const data = nodeMap.get(nodeId);
            return data?.nodeType || null;
        },
        [nodeMap]
    );

    return {
        projectedTree,
        isLoading: !graph,
        error: null,
        getOriginalPath,
        getNodeLabel,
        getNodeType,
    };
}

export default useNodeTreeProjection;
