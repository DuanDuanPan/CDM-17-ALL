/**
 * Story 8.10: parentId Unified Source of Truth
 *
 * This module provides utility functions for tree traversal based on `node.data.parentId`.
 * All tree structure operations should use these functions instead of edge-based traversal.
 *
 * Core principle: `parentId` is the single source of truth for parent-child relationships.
 * Hierarchical edges are derived from `parentId` via reconcile and used only for rendering.
 */

import type { Graph, Node } from '@antv/x6';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

export interface NodeData {
    parentId?: string;
    order?: number;
    [key: string]: unknown;
}

// ─────────────────────────────────────────────────
// Core Functions
// ─────────────────────────────────────────────────

/**
 * Build a Map of parentId -> children[] for efficient lookups.
 * Children are sorted by `order` field, with `id` as stable fallback.
 *
 * @param graph - X6 Graph instance
 * @returns Map where key is parentId, value is sorted array of child nodes
 *
 * @example
 * const childrenMap = buildChildrenMap(graph);
 * const children = childrenMap.get(parentNode.id) ?? [];
 */
export function buildChildrenMap(graph: Graph): Map<string, Node[]> {
    const map = new Map<string, Node[]>();

    const sortByOrderThenId = (a: Node, b: Node) => {
        const orderA = (a.getData() as NodeData)?.order ?? Infinity;
        const orderB = (b.getData() as NodeData)?.order ?? Infinity;
        if (orderA !== orderB) return orderA - orderB;
        return a.id.localeCompare(b.id);
    };

    for (const node of graph.getNodes()) {
        const data = node.getData() as NodeData;
        const parentId = data?.parentId;
        if (!parentId) continue;

        const list = map.get(parentId);
        if (list) {
            list.push(node);
        } else {
            map.set(parentId, [node]);
        }
    }

    // Sort each children array
    for (const children of map.values()) {
        children.sort(sortByOrderThenId);
    }

    return map;
}

/**
 * Get direct children of a parent node based on `parentId`.
 *
 * @param graph - X6 Graph instance
 * @param parentId - ID of the parent node
 * @param childrenMap - Optional pre-built children map for performance
 * @returns Array of child nodes sorted by order
 *
 * @example
 * // Single lookup
 * const children = getDirectChildrenByParentId(graph, parentNode.id);
 *
 * // Batch operations (build map once, reuse)
 * const childrenMap = buildChildrenMap(graph);
 * const children1 = getDirectChildrenByParentId(graph, parent1.id, childrenMap);
 * const children2 = getDirectChildrenByParentId(graph, parent2.id, childrenMap);
 */
export function getDirectChildrenByParentId(
    graph: Graph,
    parentId: string,
    childrenMap?: Map<string, Node[]>
): Node[] {
    if (childrenMap) {
        return childrenMap.get(parentId) ?? [];
    }

    // Direct scan when no map provided
    const children: Node[] = [];

    for (const node of graph.getNodes()) {
        const data = node.getData() as NodeData;
        if (data?.parentId === parentId) {
            children.push(node);
        }
    }

    // Sort by order, then by id for stability
    children.sort((a, b) => {
        const orderA = (a.getData() as NodeData)?.order ?? Infinity;
        const orderB = (b.getData() as NodeData)?.order ?? Infinity;
        if (orderA !== orderB) return orderA - orderB;
        return a.id.localeCompare(b.id);
    });

    return children;
}

/**
 * Get all root nodes (nodes without a parentId or with empty parentId).
 *
 * @param graph - X6 Graph instance
 * @returns Array of root nodes sorted by order
 */
export function getRootNodes(graph: Graph): Node[] {
    const roots: Node[] = [];

    for (const node of graph.getNodes()) {
        const data = node.getData() as NodeData;
        const parentId = data?.parentId;
        // Root node: parentId is undefined, null, or empty string
        if (!parentId || parentId === '') {
            roots.push(node);
        }
    }

    // Sort by order, then by label, then by id
    roots.sort((a, b) => {
        const orderA = (a.getData() as NodeData)?.order ?? Infinity;
        const orderB = (b.getData() as NodeData)?.order ?? Infinity;
        if (orderA !== orderB) return orderA - orderB;

        const labelA = (a.getData() as { label?: string })?.label || '';
        const labelB = (b.getData() as { label?: string })?.label || '';
        if (labelA !== labelB) return labelA.localeCompare(labelB);

        return a.id.localeCompare(b.id);
    });

    return roots;
}

/**
 * Get ancestors by traversing the parentId chain from a node to the root.
 * Handles circular references gracefully with a visited set.
 *
 * @param graph - X6 Graph instance
 * @param nodeId - ID of the node to start from
 * @returns Array of ancestor nodes from immediate parent to root
 */
export function getAncestorsByParentId(graph: Graph, nodeId: string): Node[] {
    const ancestors: Node[] = [];
    // Seed with starting nodeId to avoid returning self as an ancestor in cyclic graphs (A → B → A).
    const visited = new Set<string>([nodeId]);
    let currentId: string | undefined = nodeId;

    while (currentId) {
        const cell = graph.getCellById(currentId);
        if (!cell?.isNode()) break;

        const node = cell as Node;
        const data = node.getData() as NodeData;
        const parentId = data?.parentId;

        // Stop if no parent or if we've seen this parent (cycle prevention)
        if (!parentId || visited.has(parentId)) break;
        visited.add(parentId);

        const parentCell = graph.getCellById(parentId);
        if (!parentCell?.isNode()) break;

        ancestors.push(parentCell as Node);
        currentId = parentId;
    }

    return ancestors;
}

/**
 * Get all descendants of a node recursively using BFS.
 *
 * @param graph - X6 Graph instance
 * @param nodeId - ID of the ancestor node
 * @param childrenMap - Optional pre-built children map for performance
 * @returns Array of all descendant nodes
 */
export function getAllDescendantsByParentId(
    graph: Graph,
    nodeId: string,
    childrenMap?: Map<string, Node[]>
): Node[] {
    const map = childrenMap ?? buildChildrenMap(graph);
    const descendants: Node[] = [];
    const queue: string[] = [nodeId];
    const visited = new Set<string>([nodeId]);

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = map.get(currentId) ?? [];

        for (const child of children) {
            if (visited.has(child.id)) continue;
            visited.add(child.id);
            descendants.push(child);
            queue.push(child.id);
        }
    }

    return descendants;
}

/**
 * Check if a node is a descendant of another node.
 *
 * @param graph - X6 Graph instance
 * @param ancestorId - Potential ancestor node ID
 * @param maybeDescendantId - Node ID to check
 * @returns true if maybeDescendantId is a descendant of ancestorId
 */
export function isDescendant(
    graph: Graph,
    ancestorId: string,
    maybeDescendantId: string
): boolean {
    const childrenMap = buildChildrenMap(graph);
    const visited = new Set<string>();
    const stack: string[] = [ancestorId];

    while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const children = childrenMap.get(currentId) ?? [];
        for (const child of children) {
            if (child.id === maybeDescendantId) return true;
            if (!visited.has(child.id)) stack.push(child.id);
        }
    }

    return false;
}

/**
 * Get siblings of a node (other children of the same parent).
 *
 * @param graph - X6 Graph instance
 * @param nodeId - ID of the node
 * @param includeSelf - Whether to include the node itself in the result
 * @param childrenMap - Optional pre-built children map for performance
 * @returns Array of sibling nodes sorted by order
 */
export function getSiblings(
    graph: Graph,
    nodeId: string,
    includeSelf: boolean = false,
    childrenMap?: Map<string, Node[]>
): Node[] {
    const cell = graph.getCellById(nodeId);
    if (!cell?.isNode()) return [];

    const node = cell as Node;
    const data = node.getData() as NodeData;
    const parentId = data?.parentId;

    const siblings = parentId
        ? getDirectChildrenByParentId(graph, parentId, childrenMap)
        : getRootNodes(graph);

    if (includeSelf) {
        return siblings;
    }

    return siblings.filter((n) => n.id !== nodeId);
}
