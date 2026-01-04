/**
 * Story 5.2: Subtree Template Extractor
 * Extracts selected nodes from X6 graph as a reusable template structure
 *
 * Used by: NodeContextMenu -> "Save as Template" action
 *
 * Features:
 * - Auto-expand selection to include all descendant nodes (aligned with clipboard copy)
 * - Extract nodes with hierarchy (parent-child relationships)
 * - Preserve dependency edges between selected nodes
 * - Generate temporary IDs for edge references
 * - Sanitize metadata (remove sensitive/transient fields)
 */

import type { Cell, Node, Edge } from '@antv/x6';
import {
  DependencyTypeSchema,
  MAX_CLIPBOARD_NODES,
  NodeType,
  getDefaultDependencyType,
  sanitizeNodeProps,
} from '@cdm/types';
import type { TemplateNode, TemplateEdge, TemplateStructure, DependencyType } from '@cdm/types';

/** Return type for extractSubtreeAsTemplate with stats */
export interface ExtractSubtreeResult {
  structure: TemplateStructure;
  stats: {
    totalNodes: number;
    addedDescendants: number;
  };
}

/**
 * Generate a unique temporary ID for template nodes
 */
function generateTempId(): string {
  return `temp_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Expand selection to include all descendants
 * Reference: clipboardSerializer.ts lines 46-98
 */
function expandSelectionWithDescendants(
  selectedNodes: Node[],
  allNodes: Node[],
  allEdges: Edge[]
): { expandedMap: Map<string, Node>; addedCount: number } {
  const allNodesMap = new Map<string, Node>();
  selectedNodes.forEach((node) => allNodesMap.set(node.id, node));
  const initialCount = allNodesMap.size;

  // Build parent -> children map from hierarchical edges
  const hierarchicalChildren = new Map<string, Set<string>>();
  allEdges.forEach((edge) => {
    const edgeData = edge.getData() || {};
    const metadata = (edgeData as { metadata?: { kind?: string } }).metadata || {};
    // Skip dependency edges - only use hierarchical edges for expansion
    if (metadata.kind === 'dependency') return;

    const sourceId = edge.getSourceCellId();
    const targetId = edge.getTargetCellId();
    if (sourceId && targetId) {
      if (!hierarchicalChildren.has(sourceId)) {
        hierarchicalChildren.set(sourceId, new Set());
      }
      hierarchicalChildren.get(sourceId)!.add(targetId);
    }
  });

  // Recursively find all descendants
  let changed = true;
  while (changed) {
    changed = false;
    allNodes.forEach((node) => {
      if (allNodesMap.has(node.id)) return;

      const data = node.getData() || {};
      const parentId = data.parentId;

      // Method 1: Check via data.parentId
      if (parentId && allNodesMap.has(parentId)) {
        allNodesMap.set(node.id, node);
        changed = true;
        return;
      }

      // Method 2: Check via hierarchical edges
      for (const [potentialParentId] of allNodesMap) {
        const children = hierarchicalChildren.get(potentialParentId);
        if (children && children.has(node.id)) {
          allNodesMap.set(node.id, node);
          changed = true;
          return;
        }
      }
    });
  }

  return {
    expandedMap: allNodesMap,
    addedCount: allNodesMap.size - initialCount,
  };
}

/**
 * Build a TemplateNode from an X6 Node
 */
function buildTemplateNode(
  node: Node,
  allNodes: Node[],
  selectedIds: Set<string>,
  tempIdMap: Map<string, string>
): TemplateNode {
  const data = node.getData() || {};
  const tempId = generateTempId();
  tempIdMap.set(node.id, tempId);
  const nodeType = (data.nodeType || data.type || NodeType.ORDINARY) as NodeType;

  // Find children that are also in the selection
  const children = allNodes
    .filter((n) => {
      const nodeData = n.getData() || {};
      return nodeData.parentId === node.id && selectedIds.has(n.id);
    })
    .map((child) => buildTemplateNode(child, allNodes, selectedIds, tempIdMap));

  // Build template node
  const templateNode: TemplateNode = {
    label: data.label || node.id,
    _tempId: tempId,
  };

  // Add optional fields only if present
  if (nodeType !== NodeType.ORDINARY) {
    templateNode.type = nodeType;
  }

  if (data.description) {
    templateNode.description = data.description;
  }

  if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
    templateNode.tags = data.tags;
  }

  const rawProps = (data.props || data.metadata || {}) as Record<string, unknown>;
  const sanitizedProps = sanitizeNodeProps(nodeType, rawProps);
  if (Object.keys(sanitizedProps).length > 0) templateNode.metadata = sanitizedProps;

  if (children.length > 0) {
    templateNode.children = children;
  }

  return templateNode;
}

/**
 * Extract dependency edges that connect selected nodes
 */
function extractDependencyEdges(
  allEdges: Edge[],
  selectedIds: Set<string>,
  tempIdMap: Map<string, string>
): TemplateEdge[] {
  const edges: TemplateEdge[] = [];
  const normalizeDependencyType = (value: unknown): DependencyType => {
    const parsed = DependencyTypeSchema.safeParse(value);
    return parsed.success ? parsed.data : getDefaultDependencyType();
  };

  for (const edge of allEdges) {
    const edgeData = edge.getData() || {};
    const metadata = (edgeData as Record<string, unknown>).metadata as Record<string, unknown> | undefined;
    const kind = (metadata?.kind ?? (edgeData as Record<string, unknown>).kind) as string | undefined;
    const sourceId = edge.getSourceCellId();
    const targetId = edge.getTargetCellId();

    // Only include dependency edges where both nodes are in selection
    if (
      kind === 'dependency' &&
      sourceId &&
      targetId &&
      selectedIds.has(sourceId) &&
      selectedIds.has(targetId)
    ) {
      const sourceTempId = tempIdMap.get(sourceId);
      const targetTempId = tempIdMap.get(targetId);

      if (sourceTempId && targetTempId) {
        edges.push({
          sourceRef: sourceTempId,
          targetRef: targetTempId,
          kind: 'dependency',
          dependencyType: normalizeDependencyType(
            metadata?.dependencyType ?? (edgeData as Record<string, unknown>).dependencyType
          ),
        });
      }
    }
  }

  return edges;
}

/**
 * Extract a subtree from selected X6 cells as a template structure
 *
 * IMPORTANT: When nodes are selected, ALL their descendants are automatically included.
 * This aligns with clipboard copy behavior (clipboardSerializer.ts).
 *
 * @param selectedCells - Array of selected X6 cells (nodes and edges)
 * @param allNodes - All nodes in the graph
 * @param allEdges - All edges in the graph
 * @returns ExtractSubtreeResult with structure and stats
 * @throws Error if no valid nodes found in selection
 */
export function extractSubtreeAsTemplate(
  selectedCells: Cell[],
  allNodes: Node[],
  allEdges: Edge[]
): ExtractSubtreeResult {
  // Filter to only nodes
  const selectedNodes = selectedCells.filter((cell) => cell.isNode()) as Node[];

  if (selectedNodes.length === 0) {
    throw new Error('请先选择要保存的节点');
  }

  // Expand selection to include all descendants (align with clipboard copy)
  const { expandedMap, addedCount } = expandSelectionWithDescendants(
    selectedNodes,
    allNodes,
    allEdges
  );

  // Check size limit AFTER expansion
  if (expandedMap.size > MAX_CLIPBOARD_NODES) {
    throw new Error(
      `子树过大（展开后 ${expandedMap.size}/${MAX_CLIPBOARD_NODES} 节点），请选择更小的子树`
    );
  }

  const selectedIds = new Set(expandedMap.keys());
  const expandedNodes = Array.from(expandedMap.values());
  const tempIdMap = new Map<string, string>();

  // Find root nodes (nodes whose parent is not in the expanded selection)
  const rootNodes = expandedNodes.filter((node) => {
    const data = node.getData() || {};
    const parentId = data.parentId;
    return !parentId || !selectedIds.has(parentId);
  });

  if (rootNodes.length === 0) {
    throw new Error('无法确定根节点');
  }

  let rootNode: TemplateNode;

  if (rootNodes.length === 1) {
    // Single root: use it directly
    rootNode = buildTemplateNode(rootNodes[0], allNodes, selectedIds, tempIdMap);
  } else {
    // Multiple roots: create a virtual container
    const rootTempId = generateTempId();
    rootNode = {
      label: '模板',
      _tempId: rootTempId,
      children: rootNodes.map((n) =>
        buildTemplateNode(n, allNodes, selectedIds, tempIdMap)
      ),
    };
  }

  // Extract dependency edges
  const edges = extractDependencyEdges(allEdges, selectedIds, tempIdMap);

  return {
    structure: {
      rootNode,
      edges: edges.length > 0 ? edges : undefined,
    },
    stats: {
      totalNodes: expandedMap.size,
      addedDescendants: addedCount,
    },
  };
}

/**
 * Count total nodes in a template structure
 */
export function countTemplateNodes(node: TemplateNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countTemplateNodes(child);
    }
  }
  return count;
}

export default extractSubtreeAsTemplate;
