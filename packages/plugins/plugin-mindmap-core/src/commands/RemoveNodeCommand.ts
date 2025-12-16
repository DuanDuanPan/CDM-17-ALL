import { Graph, Node } from '@antv/x6';

/**
 * RemoveNodeCommand - Delete a node and its subtree
 *
 * Strategy:
 * - Remove selected node
 * - Recursively remove all descendants
 * - Clean up edges automatically (X6 handles this)
 */
export class RemoveNodeCommand {
  execute(graph: Graph, selectedNode: Node): void {
    // Prevent deleting root node
    const incomingEdges = graph.getIncomingEdges(selectedNode);
    if (!incomingEdges || incomingEdges.length === 0) {
      console.warn('Cannot delete root node');
      return;
    }

    // Get all descendant nodes
    const descendants = this.getAllDescendants(graph, selectedNode);

    // Remove all descendants first (bottom-up)
    descendants.reverse().forEach((node) => {
      graph.removeNode(node);
    });

    // Finally remove the selected node
    graph.removeNode(selectedNode);
  }

  /**
   * Get all descendant nodes recursively
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
   * Get direct children of a node
   */
  private getDirectChildren(graph: Graph, node: Node): Node[] {
    const outgoingEdges = graph.getOutgoingEdges(node);
    if (!outgoingEdges) return [];

    return outgoingEdges
      .map((edge) => graph.getCellById(edge.getTargetCellId()) as Node)
      .filter((child) => child != null);
  }
}
