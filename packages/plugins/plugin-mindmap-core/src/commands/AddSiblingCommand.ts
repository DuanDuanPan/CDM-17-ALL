import { Graph, Node } from '@antv/x6';
import { MindNodeData } from '@cdm/types';

/**
 * AddSiblingCommand - Create a sibling node
 *
 * Strategy:
 * - Find parent via incoming edge
 * - Create new node at same level
 * - Connect to same parent
 * - Auto-enter edit mode
 */
export class AddSiblingCommand {
  execute(graph: Graph, selectedNode: Node): Node | null {
    // Get incoming edges to find parent
    const incomingEdges = graph.getIncomingEdges(selectedNode);

    // If root node (no parent), treat as AddChild
    if (!incomingEdges || incomingEdges.length === 0) {
      // Root node: pressing Enter should create a child instead
      return this.createChild(graph, selectedNode);
    }

    // Get parent node
    const parentEdge = incomingEdges[0];
    const parentNode = graph.getCellById(parentEdge.getSourceCellId()) as Node;

    if (!parentNode) {
      console.warn('Parent node not found');
      return null;
    }

    // Calculate position for new sibling
    const siblingPosition = this.calculateSiblingPosition(
      graph,
      parentNode,
      selectedNode
    );

    // Create new sibling node
    const newNode = graph.addNode({
      shape: 'mind-node',
      x: siblingPosition.x,
      y: siblingPosition.y,
      width: 120,
      height: 50,
      data: {
        id: `node-${Date.now()}`,
        label: '',
        isEditing: true,
        type: 'topic',
      } as MindNodeData,
    });

    // Create edge from parent to new sibling
    graph.addEdge({
      source: parentNode.id,
      target: newNode.id,
      attrs: {
        line: {
          stroke: '#3b82f6',
          strokeWidth: 2,
          targetMarker: null,
        },
      },
    });

    return newNode;
  }

  /**
   * Create child node (fallback for root)
   */
  private createChild(graph: Graph, parentNode: Node): Node {
    const position = this.calculateChildPosition(graph, parentNode);

    const newNode = graph.addNode({
      shape: 'mind-node',
      x: position.x,
      y: position.y,
      width: 120,
      height: 50,
      data: {
        id: `node-${Date.now()}`,
        label: '',
        isEditing: true,
        type: 'topic',
      } as MindNodeData,
    });

    // Create edge
    graph.addEdge({
      source: parentNode.id,
      target: newNode.id,
      attrs: {
        line: {
          stroke: '#3b82f6',
          strokeWidth: 2,
          targetMarker: null,
        },
      },
    });

    return newNode;
  }

  /**
   * Calculate position for sibling node
   */
  private calculateSiblingPosition(
    graph: Graph,
    parentNode: Node,
    selectedNode: Node
  ): { x: number; y: number } {
    const selectedPos = selectedNode.getPosition();
    const offset = 80; // Vertical spacing between siblings

    // Position below the selected node
    return {
      x: selectedPos.x,
      y: selectedPos.y + offset,
    };
  }

  /**
   * Calculate position for child node
   */
  private calculateChildPosition(
    graph: Graph,
    parentNode: Node
  ): { x: number; y: number } {
    const parentPos = parentNode.getPosition();
    const offsetX = 200; // Horizontal spacing for children
    const childSpacing = 80;

    const children = this.getDirectChildren(graph, parentNode);
    if (children.length > 0) {
      const lastChild = children[children.length - 1];
      const lastChildPos = lastChild.getPosition();
      return {
        x: parentPos.x + offsetX,
        y: lastChildPos.y + childSpacing,
      };
    }

    return {
      x: parentPos.x + offsetX,
      y: parentPos.y,
    };
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
