import { Graph, Node } from '@antv/x6';
import { MindNodeData, NodeType } from '@cdm/types';

/**
 * AddChildCommand - Create a child node
 *
 * Strategy:
 * - Create new node as child of selected node
 * - Position to the right of parent
 * - Create edge from parent to child
 * - Auto-enter edit mode
 */
export class AddChildCommand {
  execute(graph: Graph, selectedNode: Node): Node | null {
    const position = this.calculateChildPosition(graph, selectedNode);
    const parentData = selectedNode.getData() || {};

    // Create new child node
    const newNode = graph.addNode({
      shape: 'mind-node',
      x: position.x,
      y: position.y,
      width: 220,
      height: 50,
      data: {
        id: `node-${Date.now()}`,
        label: '',
        isEditing: true,
        type: 'subtopic',
        nodeType: NodeType.ORDINARY, // Fix: Explicitly set semantic type for clipboard compatibility
        parentId: selectedNode.id, // Set parent ID for layout algorithm
        creator: parentData.creator,
      } as MindNodeData,
    });

    // Create edge from parent to child
    graph.addEdge({
      source: selectedNode.id,
      target: newNode.id,
      connector: { name: 'smooth' },
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
   * Calculate position for child node
   */
  private calculateChildPosition(
    graph: Graph,
    parentNode: Node
  ): { x: number; y: number } {
    const parentPos = parentNode.getPosition();
    const children = this.getDirectChildren(graph, parentNode);

    const offsetX = 200; // Horizontal spacing
    const baseOffsetY = 0;
    const childSpacing = 80; // Vertical spacing between children

    // If parent already has children, position below the last child
    if (children.length > 0) {
      const lastChild = children[children.length - 1];
      const lastChildPos = lastChild.getPosition();
      return {
        x: parentPos.x + offsetX,
        y: lastChildPos.y + childSpacing,
      };
    }

    // First child - position at same level as parent
    return {
      x: parentPos.x + offsetX,
      y: parentPos.y + baseOffsetY,
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
