/**
 * Story 2.2: Edge Validation Utilities
 * Frontend validation for dependency edge creation
 */

import { Graph, Node, Edge } from '@antv/x6';
import { NodeType, type EdgeKind, type EdgeMetadata } from '@cdm/types';

/**
 * Result of edge validation
 */
export interface EdgeValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Check if a node is a TASK type
 */
export function isTaskNode(node: Node): boolean {
  const data = node.getData();
  // Node data uses 'nodeType' property (not 'type')
  return data?.nodeType === NodeType.TASK;
}

/**
 * Get edge metadata from an X6 edge
 */
export function getEdgeMetadata(edge: Edge): EdgeMetadata {
  const data = edge.getData();

  // Check metadata object first
  if (data?.metadata && typeof data.metadata === 'object') {
    const metadata = data.metadata as EdgeMetadata;
    if (metadata.kind) {
      return metadata;
    }
  }

  // Check kind directly in data
  if (data?.kind) {
    return {
      kind: data.kind as EdgeKind,
      dependencyType: data.dependencyType,
    };
  }

  // Default to hierarchical
  return { kind: 'hierarchical' };
}

/**
 * Check if an edge is a dependency edge
 */
export function isDependencyEdge(edge: Edge): boolean {
  const metadata = getEdgeMetadata(edge);
  return metadata.kind === 'dependency';
}

/**
 * Validate if a dependency edge can be created between two nodes.
 *
 * Rules:
 * 1. Self-loops are not allowed
 * 2. Both source and target must be TASK nodes
 * 3. Creating this edge must not form a cycle in the dependency graph
 */
export function validateDependencyEdge(
  graph: Graph,
  sourceId: string,
  targetId: string
): EdgeValidationResult {
  // Rule 1: No self-loops
  if (sourceId === targetId) {
    return {
      isValid: false,
      errorMessage: '无法创建自循环依赖',
    };
  }

  // Get nodes
  const sourceNode = graph.getCellById(sourceId) as Node | null;
  const targetNode = graph.getCellById(targetId) as Node | null;

  if (!sourceNode || !targetNode) {
    return {
      isValid: false,
      errorMessage: '源节点或目标节点不存在',
    };
  }

  // Rule 2: Both must be TASK nodes
  if (!isTaskNode(sourceNode)) {
    return {
      isValid: false,
      errorMessage: '只能在任务节点之间创建依赖关系',
    };
  }

  if (!isTaskNode(targetNode)) {
    return {
      isValid: false,
      errorMessage: '只能在任务节点之间创建依赖关系',
    };
  }

  // Rule 3: Check for cycles
  const cycleResult = detectCycleIfCreated(graph, sourceId, targetId);
  if (cycleResult.hasCycle && cycleResult.cyclePath) {
    const pathLabels = cycleResult.cyclePath.map(id => {
      const cell = graph.getCellById(id);
      if (cell && cell.isNode()) {
        const data = cell.getData();
        return data?.label || 'Untitled';
      }
      return id; // Fallback to ID if node not found
    });

    return {
      isValid: false,
      errorMessage: `检测到循环依赖: ${pathLabels.join(' → ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Result of cycle detection
 */
export interface CycleDetectionResult {
  hasCycle: boolean;
  cyclePath?: string[];
}

/**
 * Detect if adding an edge from sourceId to targetId would create a cycle.
 * Uses DFS to check if target can reach source via existing dependency edges.
 *
 * Algorithm: If we can reach source from target following existing dependency edges,
 * then adding source->target would create a cycle.
 */
export function detectCycleIfCreated(
  graph: Graph,
  sourceId: string,
  targetId: string
): CycleDetectionResult {
  // Self-loop check
  if (sourceId === targetId) {
    return { hasCycle: true, cyclePath: [sourceId, targetId] };
  }

  // Build adjacency list from existing dependency edges
  const adjacencyList = new Map<string, string[]>();
  const edges = graph.getEdges();

  for (const edge of edges) {
    if (!isDependencyEdge(edge)) {
      continue; // Only consider dependency edges for cycle detection
    }

    const source = edge.getSourceCellId();
    const target = edge.getTargetCellId();

    if (source && target) {
      const targets = adjacencyList.get(source) ?? [];
      targets.push(target);
      adjacencyList.set(source, targets);
    }
  }

  // DFS from target to see if we can reach source
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(current: string): boolean {
    if (current === sourceId) {
      // Found a path from target back to source
      path.push(current);
      return true;
    }

    if (visited.has(current)) {
      return false;
    }

    visited.add(current);
    path.push(current);

    const neighbors = adjacencyList.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) {
        return true;
      }
    }

    path.pop();
    return false;
  }

  if (dfs(targetId)) {
    // Construct cycle path: source -> target -> ... -> source
    const cyclePath = [sourceId, ...path.reverse()];
    return { hasCycle: true, cyclePath };
  }

  return { hasCycle: false };
}

/**
 * Create a validateConnection function for X6 graph.connecting config.
 * This is used to validate edges *before* they are created.
 */
export function createEdgeValidator(isDependencyMode: boolean) {
  return ({
    sourceCell,
    targetCell,
  }: {
    sourceCell?: { id: string } | null;
    targetCell?: { id: string } | null;
  }) => {
    // Allow all edges in non-dependency mode (hierarchical edges are always valid)
    if (!isDependencyMode) {
      return true;
    }

    // In dependency mode, validate the edge
    if (!sourceCell || !targetCell) {
      return false;
    }

    // Note: Full validation requires graph access, which this callback doesn't have.
    // Basic validation only - full cycle detection happens after edge creation attempt.
    // The validateDependencyEdge function should be called separately with graph access.
    return sourceCell.id !== targetCell.id;
  };
}
