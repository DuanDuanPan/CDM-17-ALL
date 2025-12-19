import { Graph, Node } from '@antv/x6';
import {
  getHierarchicalParent,
  getHierarchicalChildren,
  isRootNode,
} from '../utils/edgeFilters';

/**
 * RemoveNodeCommand - Delete a node and its subtree
 *
 * Strategy:
 * - Remove selected node
 * - Recursively remove all descendants (via hierarchical edges ONLY)
 * - Clean up edges automatically (X6 handles this)
 *
 * Story 2.2: CRITICAL - Subtree deletion MUST only cascade via hierarchical edges.
 * Dependency edges connected to deleted nodes should be removed, but they should NOT
 * cause additional nodes to be deleted.
 */
export class RemoveNodeCommand {
  execute(graph: Graph, selectedNode: Node): void {
    // Prevent deleting root node
    // Story 2.2: Use hierarchical parent check, not raw incoming edges
    if (isRootNode(graph, selectedNode)) {
      console.warn('Cannot delete root node');
      return;
    }

    // Get all descendant nodes via hierarchical edges only
    const descendants = this.getAllDescendants(graph, selectedNode);

    // Remove all descendants first (bottom-up)
    descendants.reverse().forEach((node) => {
      graph.removeNode(node);
    });

    // Finally remove the selected node
    graph.removeNode(selectedNode);
  }

  /**
   * Get all descendant nodes recursively (via hierarchical edges only).
   * Story 2.2: Uses getHierarchicalChildren to exclude dependency edges.
   */
  private getAllDescendants(graph: Graph, node: Node): Node[] {
    const descendants: Node[] = [];
    const children = this.getDirectChildren(graph, node);

    for (const child of children) {
      descendants.push(child);
      // Recursively get children's descendants
      descendants.push(...this.getAllDescendants(graph, child));
    }

    return descendants;
  }

  /**
   * Get direct children of a node (via hierarchical edges only).
   * Story 2.2: Uses getHierarchicalChildren to exclude dependency edges.
   */
  private getDirectChildren(graph: Graph, node: Node): Node[] {
    return getHierarchicalChildren(graph, node);
  }
}
