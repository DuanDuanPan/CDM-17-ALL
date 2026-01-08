import type { Graph, Node } from '@antv/x6';
import { MindNodeData, NodeType } from '@cdm/types';
import { getHierarchicalChildren } from '../utils/edgeFilters';

const HIERARCHICAL_EDGE_SHAPE = 'cdm-hierarchical-edge';

/**
 * AddChildCommand - Create a child node
 *
 * Strategy:
 * - Create new node as child of selected node
 * - Position to the right of parent
 * - Create edge from parent to child
 * - Story 8.6: Assign order = max(siblings.order) + 1
 * - Auto-enter edit mode
 */
export class AddChildCommand {
  execute(graph: Graph, selectedNode: Node): Node | null {
    let newNode: Node | null = null;

    // Story 8.6: Ensure legacy children without order are normalized before appending,
    // so the new node doesn't get inserted ahead of unordered siblings.
    graph.batchUpdate(() => {
      this.normalizeLegacyChildOrders(graph, selectedNode);

      const position = this.calculateChildPosition(graph, selectedNode);
      const parentData = selectedNode.getData() || {};

      // Story 8.6: Calculate order for new child node
      const newOrder = this.calculateChildOrder(graph, selectedNode);

      // Create new child node
      newNode = graph.addNode({
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
          order: newOrder, // Story 8.6: Sibling order
        } as MindNodeData,
      });

      // Create edge from parent to child
      graph.addEdge({
        shape: HIERARCHICAL_EDGE_SHAPE,
        source: selectedNode.id,
        target: newNode!.id,
        connector: { name: 'smooth' },
      });
    });

    return newNode;
  }

  /**
   * Story 8.6: Calculate order for new child node
   * Returns max(siblings.order) + 1, or 0 if no siblings exist
   */
  private calculateChildOrder(graph: Graph, parentNode: Node): number {
    // Use getHierarchicalChildren to ignore dependency edges
    const children = getHierarchicalChildren(graph, parentNode);

    if (children.length === 0) {
      return 0;
    }

    // Find max order among existing children
    let maxOrder = -1;
    for (const child of children) {
      const childData = child.getData() as MindNodeData | undefined;
      const childOrder = typeof childData?.order === 'number' ? childData.order : -1;
      if (childOrder > maxOrder) {
        maxOrder = childOrder;
      }
    }

    return maxOrder + 1;
  }

  /**
   * Story 8.6: Normalize legacy children that are missing order.
   *
   * This prevents the next created child from receiving order=0 and being
   * inserted ahead of existing unordered siblings (because ordered nodes sort before unordered).
   *
   * Strategy:
   * - Keep existing numeric orders unchanged
   * - Assign missing orders after the current max order (stable by id)
   */
  private normalizeLegacyChildOrders(graph: Graph, parentNode: Node): void {
    const children = getHierarchicalChildren(graph, parentNode);
    if (children.length === 0) return;

    const missingOrder = children.filter((child) => {
      const data = child.getData() as MindNodeData | undefined;
      return typeof data?.order !== 'number';
    });

    if (missingOrder.length === 0) return;

    let maxOrder = -1;
    for (const child of children) {
      const data = child.getData() as MindNodeData | undefined;
      if (typeof data?.order === 'number' && data.order > maxOrder) {
        maxOrder = data.order;
      }
    }

    const sortedMissing = [...missingOrder].sort((a, b) => a.id.localeCompare(b.id));
    let nextOrder = maxOrder + 1;
    for (const child of sortedMissing) {
      const data = (child.getData() || {}) as MindNodeData;
      child.setData({ ...data, order: nextOrder });
      nextOrder += 1;
    }
  }

  /**
   * Calculate position for child node
   */
  private calculateChildPosition(
    graph: Graph,
    parentNode: Node
  ): { x: number; y: number } {
    const parentPos = parentNode.getPosition();
    // Story 2.2: Ignore dependency edges when positioning children
    const children = getHierarchicalChildren(graph, parentNode);

    const offsetX = 200; // Horizontal spacing
    const baseOffsetY = 0;
    const childSpacing = 80; // Vertical spacing between children

    // If parent already has children, position below the last child
    if (children.length > 0) {
      const lastChild = children.reduce((acc, child) => {
        return child.getPosition().y > acc.getPosition().y ? child : acc;
      }, children[0]);
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
}
