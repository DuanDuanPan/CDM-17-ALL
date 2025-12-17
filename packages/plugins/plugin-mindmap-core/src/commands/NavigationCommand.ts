import { Graph, Node } from '@antv/x6';

/**
 * NavigationCommand - Keyboard navigation between nodes
 *
 * Provides navigation methods for arrow key navigation:
 * - Up/Down: Navigate between sibling nodes (sorted by Y position)
 * - Left: Navigate to parent node
 * - Right: Navigate to first child node
 */
export class NavigationCommand {
    /**
     * Get the parent node of a given node
     * @returns Parent node or null if root node
     */
    getParent(graph: Graph, node: Node): Node | null {
        const incomingEdges = graph.getIncomingEdges(node);
        if (!incomingEdges || incomingEdges.length === 0) {
            return null;
        }
        const parentEdge = incomingEdges[0];
        const parentCell = graph.getCellById(parentEdge.getSourceCellId());
        if (parentCell && parentCell.isNode()) {
            return parentCell as Node;
        }
        return null;
    }

    /**
     * Get all direct children of a node, sorted by Y position (top to bottom)
     * @returns Array of child nodes sorted by vertical position
     */
    getChildren(graph: Graph, node: Node): Node[] {
        const outgoingEdges = graph.getOutgoingEdges(node);
        if (!outgoingEdges || outgoingEdges.length === 0) {
            return [];
        }

        const children = outgoingEdges
            .map((edge) => graph.getCellById(edge.getTargetCellId()))
            .filter((cell): cell is Node => cell != null && cell.isNode());

        // Sort by Y position (top to bottom)
        return children.sort((a, b) => {
            const posA = a.getPosition();
            const posB = b.getPosition();
            return posA.y - posB.y;
        });
    }

    /**
     * Get all sibling nodes (including the current node), sorted by Y position
     * @returns Array of sibling nodes sorted by vertical position
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
     * Navigate to the previous sibling (above current node)
     * @returns Previous sibling node or null if at top
     */
    navigateUp(graph: Graph, currentNode: Node): Node | null {
        const siblings = this.getSiblings(graph, currentNode);
        const currentIndex = siblings.findIndex((s) => s.id === currentNode.id);

        if (currentIndex <= 0) {
            // Already at the top sibling, no navigation
            return null;
        }

        return siblings[currentIndex - 1];
    }

    /**
     * Navigate to the next sibling (below current node)
     * @returns Next sibling node or null if at bottom
     */
    navigateDown(graph: Graph, currentNode: Node): Node | null {
        const siblings = this.getSiblings(graph, currentNode);
        const currentIndex = siblings.findIndex((s) => s.id === currentNode.id);

        if (currentIndex < 0 || currentIndex >= siblings.length - 1) {
            // Already at the bottom sibling, no navigation
            return null;
        }

        return siblings[currentIndex + 1];
    }

    /**
     * Navigate to the parent node
     * @returns Parent node or null if root
     */
    navigateLeft(graph: Graph, currentNode: Node): Node | null {
        return this.getParent(graph, currentNode);
    }

    /**
     * Navigate to the first child node
     * @returns First child node (by Y position) or null if no children
     */
    navigateRight(graph: Graph, currentNode: Node): Node | null {
        const children = this.getChildren(graph, currentNode);
        return children.length > 0 ? children[0] : null;
    }
}
