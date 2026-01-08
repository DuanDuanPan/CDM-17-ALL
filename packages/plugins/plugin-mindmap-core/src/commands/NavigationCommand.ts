import type { Graph, Node } from '@antv/x6';
import type { MindNodeData } from '@cdm/types';
import {
    getHierarchicalParent,
    getHierarchicalChildren,
} from '../utils/edgeFilters';

/**
 * NavigationCommand - Keyboard navigation between nodes
 *
 * Provides navigation methods for arrow key navigation (VERTICAL LAYOUT):
 * - Up: Navigate to parent node
 * - Down: Navigate to first child node
 * - Left/Right: Navigate between sibling nodes (sorted by order)
 *
 * Story 2.2: CRITICAL - Navigation MUST only traverse hierarchical edges.
 * Dependency edges represent execution logic, not structural relationships,
 * and must be ignored during tree navigation.
 *
 * Story 8.6: Children are sorted by data.order (not X position).
 * X position is used as a fallback when order is not set.
 */
export class NavigationCommand {
    /**
     * Get the parent node of a given node (via hierarchical edge only).
     * Story 2.2: Uses getHierarchicalParent to exclude dependency edges.
     * @returns Parent node or null if root node
     */
    getParent(graph: Graph, node: Node): Node | null {
        return getHierarchicalParent(graph, node);
    }

    /**
     * Get all direct children of a node, sorted by order (Story 8.6).
     * Story 2.2: Uses getHierarchicalChildren to exclude dependency edges.
     * Story 8.6: Sorts by data.order first, falls back to X position if order is not set.
     * @returns Array of child nodes sorted by order (then X position as fallback for vertical layout)
     */
    getChildren(graph: Graph, node: Node): Node[] {
        const children = getHierarchicalChildren(graph, node);

        // Story 8.6: Sort by order first, then X position as fallback (vertical layout)
        return children.sort((a, b) => {
            const dataA = a.getData() as MindNodeData | undefined;
            const dataB = b.getData() as MindNodeData | undefined;
            const orderA = dataA?.order;
            const orderB = dataB?.order;

            // Both have order: compare by order
            if (orderA !== undefined && orderB !== undefined) {
                return orderA - orderB;
            }

            // One has order, one doesn't: ordered comes first
            if (orderA !== undefined) return -1;
            if (orderB !== undefined) return 1;

            // Neither has order: fallback to X position (vertical layout: siblings are horizontal)
            const posA = a.getPosition();
            const posB = b.getPosition();
            return posA.x - posB.x;
        });
    }

    /**
     * Get all sibling nodes (including the current node), sorted by order
     * @returns Array of sibling nodes sorted by order
     */
    getSiblings(graph: Graph, node: Node): Node[] {
        const parent = this.getParent(graph, node);
        if (!parent) {
            // Root node has no siblings, return only itself
            return [node];
        }
        return this.getChildren(graph, parent);
    }

    /**
     * Navigate to the parent node (VERTICAL LAYOUT: parent is above)
     * @returns Parent node or null if at root
     */
    navigateUp(graph: Graph, currentNode: Node): Node | null {
        return this.getParent(graph, currentNode);
    }

    /**
     * Navigate to the first child node (VERTICAL LAYOUT: children are below)
     * @returns First child node or null if no children
     */
    navigateDown(graph: Graph, currentNode: Node): Node | null {
        const children = this.getChildren(graph, currentNode);
        return children.length > 0 ? children[0] : null;
    }

    /**
     * Navigate to the previous sibling (VERTICAL LAYOUT: siblings are horizontal)
     * @returns Previous sibling node or null if at first sibling
     */
    navigateLeft(graph: Graph, currentNode: Node): Node | null {
        const siblings = this.getSiblings(graph, currentNode);
        const currentIndex = siblings.findIndex((s) => s.id === currentNode.id);

        if (currentIndex <= 0) {
            // Already at the first sibling, no navigation
            return null;
        }

        return siblings[currentIndex - 1];
    }

    /**
     * Navigate to the next sibling (VERTICAL LAYOUT: siblings are horizontal)
     * @returns Next sibling node or null if at last sibling
     */
    navigateRight(graph: Graph, currentNode: Node): Node | null {
        const siblings = this.getSiblings(graph, currentNode);
        const currentIndex = siblings.findIndex((s) => s.id === currentNode.id);

        if (currentIndex < 0 || currentIndex >= siblings.length - 1) {
            // Already at the last sibling, no navigation
            return null;
        }

        return siblings[currentIndex + 1];
    }
}
