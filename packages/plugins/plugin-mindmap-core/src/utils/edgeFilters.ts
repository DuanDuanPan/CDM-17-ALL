/**
 * @fileoverview Story 2.2: Edge Filtering Utilities
 *
 * This module provides utilities for filtering and querying edges by their kind
 * (hierarchical vs dependency). It is a critical part of the Task Dependency Network
 * feature, ensuring proper separation between structural and relationship edges.
 *
 * ## Edge Types
 *
 * - **Hierarchical Edges**: Structural edges representing parent-child relationships.
 *   Used for tree layout, navigation (arrow keys), and subtree operations.
 *   Created by: "Add Child", "Add Sibling", or drag-and-drop to change parent.
 *
 * - **Dependency Edges**: Relationship edges representing task execution logic.
 *   Types: FS (Finish-to-Start), SS (Start-to-Start), FF, SF.
 *   Created by: User manually drawing a line in "Dependency Mode".
 *   MUST NOT affect tree structure, layout, or navigation.
 *
 * ## CRITICAL Usage Rules
 *
 * - Tree operations (navigation, layout, subtree deletion) MUST ONLY traverse hierarchical edges
 * - Cycle detection MUST ONLY consider dependency edges
 * - Only TASK nodes can have dependency edges between them
 *
 * @module edgeFilters
 * @see {@link https://docs.cdm.io/story-2.2} Story 2.2 Documentation
 *
 * @example
 * ```typescript
 * import { getHierarchicalChildren, isDependencyEdge } from '@cdm/mindmap-core';
 *
 * // Get children for tree navigation (ignores dependency edges)
 * const children = getHierarchicalChildren(graph, parentNode);
 *
 * // Check edge type
 * if (isDependencyEdge(edge)) {
 *   // Handle dependency edge (e.g., show FS/SS badge)
 * }
 * ```
 */

import { Graph, Node, Edge } from '@antv/x6';
import type { EdgeKind, EdgeMetadata } from '@cdm/types';

/**
 * Extracts edge metadata from an X6 Edge object.
 *
 * Edge metadata can be stored in multiple locations depending on how the edge was created:
 * 1. `edge.getData()?.metadata` - Preferred location for Yjs-synced edges
 * 2. `edge.getData()?.kind` - Direct property for locally created edges
 * 3. Default - Falls back to `{ kind: 'hierarchical' }` for backward compatibility
 *
 * @param edge - The X6 Edge instance to extract metadata from
 * @returns The edge metadata containing `kind` and optionally `dependencyType`.
 *          Returns `{ kind: 'hierarchical' }` if no metadata is found.
 *
 * @example
 * ```typescript
 * const metadata = getEdgeMetadata(edge);
 * if (metadata.kind === 'dependency') {
 *   console.log(`Dependency type: ${metadata.dependencyType}`); // 'FS', 'SS', etc.
 * }
 * ```
 */
export function getEdgeMetadata(edge: Edge): EdgeMetadata {
  const data = edge.getData();

  // Check for metadata in data object (preferred location)
  if (data?.metadata && typeof data.metadata === 'object') {
    const metadata = data.metadata as EdgeMetadata;
    if (metadata.kind) {
      return metadata;
    }
  }

  // Check for kind directly in data (alternative location)
  if (data?.kind) {
    return {
      kind: data.kind as EdgeKind,
      dependencyType: data.dependencyType,
    };
  }

  // Fallback: assume hierarchical for backward compatibility
  return { kind: 'hierarchical' };
}

/**
 * Checks if an edge is a hierarchical edge (structural parent-child relationship).
 *
 * Hierarchical edges:
 * - Define the tree structure (parent-child relationships)
 * - Affect layout algorithms (MindmapLayout, TreeLayout)
 * - Used for keyboard navigation (arrow keys)
 * - Participate in subtree operations (delete subtree, collapse/expand)
 *
 * @param edge - The X6 Edge instance to check
 * @returns `true` if the edge is hierarchical (or has no kind set), `false` otherwise
 *
 * @example
 * ```typescript
 * if (isHierarchicalEdge(edge)) {
 *   // This edge represents a parent-child relationship
 *   // Safe to use for tree traversal
 * }
 * ```
 */
export function isHierarchicalEdge(edge: Edge): boolean {
  const metadata = getEdgeMetadata(edge);
  return metadata.kind === 'hierarchical' || metadata.kind === undefined;
}

/**
 * Checks if an edge is a dependency edge (task execution relationship).
 *
 * Dependency edges:
 * - Represent task execution logic (FS, SS, FF, SF types)
 * - Do NOT affect tree layout or structure
 * - Are NOT used for keyboard navigation
 * - Are only valid between TASK nodes
 * - Subject to cycle detection (no circular dependencies allowed)
 *
 * Visual distinction: Dependency edges are rendered with dashed lines.
 *
 * @param edge - The X6 Edge instance to check
 * @returns `true` if the edge is a dependency edge, `false` otherwise
 *
 * @example
 * ```typescript
 * if (isDependencyEdge(edge)) {
 *   const metadata = getEdgeMetadata(edge);
 *   console.log(`Task dependency: ${metadata.dependencyType}`); // 'FS', 'SS', 'FF', 'SF'
 * }
 * ```
 */
export function isDependencyEdge(edge: Edge): boolean {
  const metadata = getEdgeMetadata(edge);
  return metadata.kind === 'dependency';
}

/**
 * Filter edges to only include hierarchical edges.
 * Use this when traversing tree structure (navigation, layout, subtree operations).
 */
export function filterHierarchicalEdges(edges: Edge[] | null | undefined): Edge[] {
  if (!edges || edges.length === 0) {
    return [];
  }
  return edges.filter(isHierarchicalEdge);
}

/**
 * Filter edges to only include dependency edges.
 * Use this for dependency-specific operations (cycle detection, critical path).
 */
export function filterDependencyEdges(edges: Edge[] | null | undefined): Edge[] {
  if (!edges || edges.length === 0) {
    return [];
  }
  return edges.filter(isDependencyEdge);
}

/**
 * Get hierarchical incoming edges for a node (edges where node is the target).
 * Use this to find parent nodes in tree structure.
 */
export function getHierarchicalIncomingEdges(graph: Graph, node: Node): Edge[] {
  const incomingEdges = graph.getIncomingEdges(node);
  return filterHierarchicalEdges(incomingEdges);
}

/**
 * Get hierarchical outgoing edges for a node (edges where node is the source).
 * Use this to find child nodes in tree structure.
 */
export function getHierarchicalOutgoingEdges(graph: Graph, node: Node): Edge[] {
  const outgoingEdges = graph.getOutgoingEdges(node);
  return filterHierarchicalEdges(outgoingEdges);
}

/**
 * Get dependency incoming edges for a node.
 * Use this for dependency analysis (predecessors in execution order).
 */
export function getDependencyIncomingEdges(graph: Graph, node: Node): Edge[] {
  const incomingEdges = graph.getIncomingEdges(node);
  return filterDependencyEdges(incomingEdges);
}

/**
 * Get dependency outgoing edges for a node.
 * Use this for dependency analysis (successors in execution order).
 */
export function getDependencyOutgoingEdges(graph: Graph, node: Node): Edge[] {
  const outgoingEdges = graph.getOutgoingEdges(node);
  return filterDependencyEdges(outgoingEdges);
}

/**
 * Gets the parent node via hierarchical edge only.
 *
 * **CRITICAL**: Tree navigation MUST use this function instead of raw `getIncomingEdges()`.
 * Using raw edge queries would incorrectly treat dependency edges as parent relationships.
 *
 * @param graph - The X6 Graph instance
 * @param node - The node to find the parent of
 * @returns The parent node if found via hierarchical edge, or `null` if this is a root node
 *
 * @example
 * ```typescript
 * // Correct: Use for navigation
 * const parent = getHierarchicalParent(graph, currentNode);
 * if (parent) {
 *   graph.select(parent); // Navigate to parent
 * }
 *
 * // WRONG: Don't use raw edge queries
 * // const edges = graph.getIncomingEdges(node); // May include dependency edges!
 * ```
 */
export function getHierarchicalParent(graph: Graph, node: Node): Node | null {
  const hierarchicalEdges = getHierarchicalIncomingEdges(graph, node);
  if (hierarchicalEdges.length === 0) {
    return null;
  }

  // A node should only have one hierarchical parent
  const parentEdge = hierarchicalEdges[0];
  const parentCell = graph.getCellById(parentEdge.getSourceCellId());

  if (parentCell && parentCell.isNode()) {
    return parentCell as Node;
  }
  return null;
}

/**
 * Gets child nodes via hierarchical edges only.
 *
 * **CRITICAL**: Tree traversal MUST use this function instead of raw `getOutgoingEdges()`.
 * Using raw edge queries would incorrectly include dependency edge targets as children.
 *
 * @param graph - The X6 Graph instance
 * @param node - The parent node to find children of
 * @returns Array of child nodes connected via hierarchical edges
 *
 * @example
 * ```typescript
 * // Correct: Use for tree traversal
 * const children = getHierarchicalChildren(graph, parentNode);
 * children.forEach(child => {
 *   // Process each child in the tree structure
 * });
 *
 * // WRONG: Don't use raw edge queries
 * // const edges = graph.getOutgoingEdges(node); // May include dependency edges!
 * ```
 */
export function getHierarchicalChildren(graph: Graph, node: Node): Node[] {
  const hierarchicalEdges = getHierarchicalOutgoingEdges(graph, node);

  return hierarchicalEdges
    .map((edge) => graph.getCellById(edge.getTargetCellId()))
    .filter((cell): cell is Node => cell != null && cell.isNode());
}

/**
 * Check if a node is a root node (no hierarchical parent).
 */
export function isRootNode(graph: Graph, node: Node): boolean {
  const hierarchicalParent = getHierarchicalParent(graph, node);
  return hierarchicalParent === null;
}
