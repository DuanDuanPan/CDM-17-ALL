import type { Graph, Node } from '@antv/x6';
import { MindNodeData, NodeType } from '@cdm/types';

/**
 * AddSiblingCommand - Create a sibling node
 *
 * Strategy:
 * - Find parent via incoming edge
 * - Create new node at same level
 * - Connect to same parent
 * - Auto-enter edit mode
 * - Inherit nodeType from nearest sibling (or selected node if no other siblings)
 */
export class AddSiblingCommand {
  execute(graph: Graph, selectedNode: Node): Node | null {
    // Get incoming edges to find parent
    const incomingEdges = graph.getIncomingEdges(selectedNode);
    const selectedData = selectedNode.getData() || {};

    // If root node (no parent), treat as AddChild
    if (!incomingEdges || incomingEdges.length === 0) {
      // Root node: pressing Enter should create a child instead
      return this.createChild(graph, selectedNode);
    }

    // Get parent node
    const parentEdge = incomingEdges[0];
    const parentNode = graph.getCellById(parentEdge.getSourceCellId()) as Node;

    if (!parentNode) {
      return null;
    }

    // Calculate position for new sibling
    const siblingPosition = this.calculateSiblingPosition(
      graph,
      parentNode,
      selectedNode
    );

    // Get nodeType from nearest sibling (selected node is the reference)
    const inheritedNodeType = this.getNearestSiblingNodeType(
      graph,
      parentNode,
      selectedNode
    );

    // Create new sibling node
    const newNode = graph.addNode({
      shape: 'mind-node',
      x: siblingPosition.x,
      y: siblingPosition.y,
      width: 220,
      height: 50,
      data: {
        id: `node-${Date.now()}`,
        label: '',
        isEditing: true,
        type: 'topic',
        nodeType: inheritedNodeType, // Inherit from nearest sibling
        parentId: parentNode.id, // Set parent ID for layout algorithm
        creator: selectedData.creator,
      } as MindNodeData,
    });

    // Create edge from parent to new sibling
    graph.addEdge({
      source: parentNode.id,
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
   * Create child node (fallback for root)
   * When root node presses Enter, create a child node that inherits type from siblings
   */
  private createChild(graph: Graph, parentNode: Node): Node {
    const position = this.calculateChildPosition(graph, parentNode);
    const parentData = parentNode.getData() || {};

    // Get nodeType from nearest sibling (existing children of parentNode)
    const inheritedNodeType = this.getNearestSiblingNodeType(
      graph,
      parentNode,
      null // No selected sibling reference, will use last child if exists
    );

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
        type: 'topic',
        nodeType: inheritedNodeType, // Inherit from nearest sibling
        parentId: parentNode.id, // Set parent ID for layout algorithm
        creator: parentData.creator,
      } as MindNodeData,
    });

    // Create edge
    graph.addEdge({
      source: parentNode.id,
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

  /**
   * Get nodeType from nearest sibling node
   * Strategy:
   * - If selectedNode is provided, use its nodeType (current selection is the "nearest")
   * - Otherwise, get the last child (most recently positioned) of the parent
   * - Default to ORDINARY if no siblings have nodeType set
   *
   * @param graph - The graph instance
   * @param parentNode - The parent node whose children are the siblings
   * @param selectedNode - The currently selected node (optional, null for root Enter)
   * @returns The nodeType to inherit
   */
  private getNearestSiblingNodeType(
    graph: Graph,
    parentNode: Node,
    selectedNode: Node | null
  ): NodeType {
    // If selectedNode is provided, use its nodeType as the reference
    if (selectedNode) {
      const selectedData = selectedNode.getData() as MindNodeData | undefined;
      if (selectedData?.nodeType) {
        return selectedData.nodeType;
      }
    }

    // Fall back to checking other siblings
    const siblings = this.getDirectChildren(graph, parentNode);
    if (siblings.length === 0) {
      return NodeType.ORDINARY; // No siblings, default to ORDINARY
    }

    // Get the last sibling (most recently added, positioned at bottom)
    // Exclude selectedNode if it exists in siblings
    const otherSiblings = selectedNode
      ? siblings.filter((s) => s.id !== selectedNode.id)
      : siblings;

    if (otherSiblings.length > 0) {
      const lastSibling = otherSiblings[otherSiblings.length - 1];
      const siblingData = lastSibling.getData() as MindNodeData | undefined;
      if (siblingData?.nodeType) {
        return siblingData.nodeType;
      }
    }

    // If no sibling has nodeType, default to ORDINARY
    return NodeType.ORDINARY;
  }
}
