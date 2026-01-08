import type { Graph, Node } from '@antv/x6';
import { MindNodeData, NodeType } from '@cdm/types';
import { getHierarchicalParent, getHierarchicalChildren } from '../utils/edgeFilters';

const HIERARCHICAL_EDGE_SHAPE = 'cdm-hierarchical-edge';

/**
 * AddSiblingCommand - Create a sibling node
 *
 * Strategy:
 * - Find parent via hierarchical edge (ignoring dependency edges)
 * - Create new node at same level
 * - Connect to same parent
 * - Story 8.6: Assign order = selectedNode.order + 1, reorder subsequent siblings
 * - Auto-enter edit mode
 * - Inherit nodeType from nearest sibling (or selected node if no other siblings)
 */
export class AddSiblingCommand {
  execute(graph: Graph, selectedNode: Node): Node | null {
    const selectedData = (selectedNode.getData() || {}) as MindNodeData;

    // Story 8.6: Use getHierarchicalParent to ignore dependency edges
    const parentNode = getHierarchicalParent(graph, selectedNode);

    // If root node (no parent), treat as AddChild
    if (!parentNode) {
      // Root node: pressing Enter should create a child instead
      return this.createChild(graph, selectedNode);
    }

    // Calculate position for new sibling
    const siblingPosition = this.calculateSiblingPosition(
      graph,
      parentNode,
      selectedNode
    );

    // Story 8.6: Use batchUpdate for atomic order updates + node creation
    let newNode: Node | null = null;

    graph.batchUpdate(() => {
      // Story 8.6: Ensure all siblings have numeric order before inserting,
      // so the new node doesn't jump ahead of legacy siblings with missing order.
      const siblings = getHierarchicalChildren(graph, parentNode);
      this.normalizeSiblingOrders(siblings, selectedNode);

      const selectedOrder = (selectedNode.getData() as MindNodeData | undefined)?.order;
      const insertOrder = (typeof selectedOrder === 'number' ? selectedOrder : 0) + 1;

      // Shift subsequent siblings (order >= insertOrder)
      for (const sibling of siblings) {
        if (sibling.id === selectedNode.id) continue;
        const siblingData = sibling.getData() as MindNodeData | undefined;
        if (!siblingData || typeof siblingData.order !== 'number') continue;
        if (siblingData.order >= insertOrder) {
          sibling.setData({ ...siblingData, order: siblingData.order + 1 });
        }
      }

      // Get nodeType from nearest sibling (selected node is the reference)
      const inheritedNodeType = this.getNearestSiblingNodeType(
        graph,
        parentNode,
        selectedNode
      );

      // Create new sibling node with calculated order
      newNode = graph.addNode({
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
          order: insertOrder, // Story 8.6: Sibling order
        } as MindNodeData,
      });

      // Create edge from parent to new sibling
      graph.addEdge({
        shape: HIERARCHICAL_EDGE_SHAPE,
        source: parentNode.id,
        target: newNode!.id,
        connector: { name: 'smooth' },
      });
    });

    return newNode;
  }

  /**
   * Story 8.6: Normalize sibling orders for insertion.
   *
   * - If selected node is missing order (legacy), assign contiguous orders (stable by order/id).
   * - Otherwise, keep existing numeric orders and append missing orders after max order (stable by id).
   */
  private normalizeSiblingOrders(siblings: Node[], selectedNode: Node): void {
    if (siblings.length === 0) return;

    const selectedData = selectedNode.getData() as MindNodeData | undefined;
    const selectedOrder = selectedData?.order;

    const stableSort = (a: Node, b: Node) => {
      const orderA = (a.getData() as MindNodeData | undefined)?.order ?? Infinity;
      const orderB = (b.getData() as MindNodeData | undefined)?.order ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      return a.id.localeCompare(b.id);
    };

    const hasMissingOrder = siblings.some((s) => {
      const data = s.getData() as MindNodeData | undefined;
      return typeof data?.order !== 'number';
    });

    if (!hasMissingOrder) return;

    const sortedSiblings = [...siblings].sort(stableSort);

    // Legacy selected node has no order: normalize all to contiguous to make insertion deterministic.
    if (typeof selectedOrder !== 'number') {
      sortedSiblings.forEach((sibling, index) => {
        const data = (sibling.getData() || {}) as MindNodeData;
        sibling.setData({ ...data, order: index });
      });
      return;
    }

    // Selected node has order: keep existing orders, only backfill missing orders after current max.
    let maxOrder = -1;
    for (const sibling of sortedSiblings) {
      const data = sibling.getData() as MindNodeData | undefined;
      if (typeof data?.order === 'number' && data.order > maxOrder) {
        maxOrder = data.order;
      }
    }

    let nextOrder = maxOrder + 1;
    for (const sibling of sortedSiblings) {
      const data = sibling.getData() as MindNodeData | undefined;
      if (data && typeof data.order !== 'number') {
        sibling.setData({ ...data, order: nextOrder });
        nextOrder += 1;
      }
    }
  }

  /**
   * Create child node (fallback for root)
   * When root node presses Enter, create a child node that inherits type from siblings
   * Story 8.6: Assign order = max(siblings.order) + 1
   */
  private createChild(graph: Graph, parentNode: Node): Node {
    let newNode: Node | null = null;

    graph.batchUpdate(() => {
      // Normalize legacy children without order before appending a new child.
      const siblings = getHierarchicalChildren(graph, parentNode);
      this.normalizeMissingOrdersForAppend(siblings);

      const position = this.calculateChildPosition(graph, parentNode);
      const parentData = (parentNode.getData() || {}) as MindNodeData;

      // Story 8.6: Calculate order for new child node
      const newOrder = this.calculateChildOrder(graph, parentNode);

      // Get nodeType from nearest sibling (existing children of parentNode)
      const inheritedNodeType = this.getNearestSiblingNodeType(
        graph,
        parentNode,
        null // No selected sibling reference, will use last child if exists
      );

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
          type: 'topic',
          nodeType: inheritedNodeType, // Inherit from nearest sibling
          parentId: parentNode.id, // Set parent ID for layout algorithm
          creator: parentData.creator,
          order: newOrder, // Story 8.6: Sibling order
        } as MindNodeData,
      });

      // Create edge
      graph.addEdge({
        shape: HIERARCHICAL_EDGE_SHAPE,
        source: parentNode.id,
        target: newNode!.id,
        connector: { name: 'smooth' },
      });
    });

    return newNode!;
  }

  /**
   * Story 8.6: Backfill missing orders for an append operation.
   *
   * Keeps existing numeric orders unchanged, and assigns missing orders after the current max.
   */
  private normalizeMissingOrdersForAppend(siblings: Node[]): void {
    if (siblings.length === 0) return;

    const missingOrder = siblings.filter((sibling) => {
      const data = sibling.getData() as MindNodeData | undefined;
      return typeof data?.order !== 'number';
    });
    if (missingOrder.length === 0) return;

    let maxOrder = -1;
    for (const sibling of siblings) {
      const data = sibling.getData() as MindNodeData | undefined;
      if (typeof data?.order === 'number' && data.order > maxOrder) {
        maxOrder = data.order;
      }
    }

    const sortedMissing = [...missingOrder].sort((a, b) => a.id.localeCompare(b.id));
    let nextOrder = maxOrder + 1;
    for (const sibling of sortedMissing) {
      const data = (sibling.getData() || {}) as MindNodeData;
      sibling.setData({ ...data, order: nextOrder });
      nextOrder += 1;
    }
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

    // Story 2.2: Ignore dependency edges when positioning children
    const children = getHierarchicalChildren(graph, parentNode);
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

    return {
      x: parentPos.x + offsetX,
      y: parentPos.y,
    };
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
    // Story 2.2: Ignore dependency edges when inheriting from siblings
    const siblings = getHierarchicalChildren(graph, parentNode);
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
