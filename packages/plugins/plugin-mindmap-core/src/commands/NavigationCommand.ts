import type { Graph, Node } from '@antv/x6';
import type { LayoutMode, MindNodeData } from '@cdm/types';
import {
    getHierarchicalParent,
    getHierarchicalChildren,
    getDependencyIncomingEdges,
    getDependencyOutgoingEdges,
} from '../utils/edgeFilters';

/**
 * NavigationCommand - Keyboard navigation between nodes
 *
 * Provides layout-aware navigation for arrow keys across different layouts:
 * - logic: vertical tree (↑ parent, ↓ first child, ←/→ siblings)
 * - mindmap: horizontal tree (← parent, → first child, ↑/↓ siblings)
 * - free: spatial navigation (nearest node in arrow direction)
 * - network: dependency-edge navigation (← predecessors, → successors, ↑/↓ dependency neighbors)
 *
 * Story 2.2: CRITICAL - Navigation MUST only traverse hierarchical edges.
 * Dependency edges represent execution logic, not structural relationships,
 * and must be ignored during tree navigation.
 *
 * Story 8.6: Children are sorted by data.order (not X position).
 * X position is used as a fallback when order is not set.
 */
export class NavigationCommand {
    private static compareLexicographic(
        a: readonly (number | string)[],
        b: readonly (number | string)[]
    ): number {
        const len = Math.min(a.length, b.length);
        for (let i = 0; i < len; i += 1) {
            const av = a[i];
            const bv = b[i];
            if (av < bv) return -1;
            if (av > bv) return 1;
        }
        return a.length - b.length;
    }

    private isNavigableNode(node: Node | null | undefined): node is Node {
        if (!node) return false;
        const data = (node.getData?.() || {}) as { isArchived?: boolean };
        if (data?.isArchived) return false;
        if (typeof (node as any).isVisible === 'function' && !(node as any).isVisible()) return false;
        return true;
    }

    private getNodeCenter(node: Node): { x: number; y: number } {
        const bbox = typeof (node as any).getBBox === 'function' ? (node as any).getBBox() : null;
        if (bbox && bbox.center && typeof bbox.center.x === 'number' && typeof bbox.center.y === 'number') {
            return { x: bbox.center.x, y: bbox.center.y };
        }

        const pos = node.getPosition?.() ?? { x: 0, y: 0 };
        const size = typeof (node as any).getSize === 'function' ? (node as any).getSize() : null;
        const width = typeof size?.width === 'number' ? size.width : typeof bbox?.width === 'number' ? bbox.width : 0;
        const height =
            typeof size?.height === 'number' ? size.height : typeof bbox?.height === 'number' ? bbox.height : 0;

        return { x: pos.x + width / 2, y: pos.y + height / 2 };
    }

    private getSiblingFallbackAxis(layoutMode: LayoutMode): 'x' | 'y' {
        // mindmap layout arranges siblings vertically; logic layout arranges siblings horizontally
        return layoutMode === 'mindmap' ? 'y' : 'x';
    }

    /**
     * Get the parent node of a given node (via hierarchical edge only).
     * Story 2.2: Uses getHierarchicalParent to exclude dependency edges.
     * @returns Parent node or null if root node
     */
    getParent(graph: Graph, node: Node): Node | null {
        const parent = getHierarchicalParent(graph, node);
        return this.isNavigableNode(parent) ? parent : null;
    }

    /**
     * Get all direct children of a node, sorted by order (Story 8.6).
     * Story 2.2: Uses getHierarchicalChildren to exclude dependency edges.
     * Story 8.6: Sorts by data.order first, falls back to X position if order is not set.
     * @returns Array of child nodes sorted by order (then X position as fallback for vertical layout)
     */
    getChildren(graph: Graph, node: Node, options?: { layoutMode?: LayoutMode }): Node[] {
        const layoutMode = options?.layoutMode ?? 'logic';
        const fallbackAxis = this.getSiblingFallbackAxis(layoutMode);

        const children = getHierarchicalChildren(graph, node).filter((child) => this.isNavigableNode(child));

        // Story 8.6: Sort by order first, then positional fallback (axis depends on layout)
        return children.sort((a, b) => {
            const dataA = a.getData() as MindNodeData | undefined;
            const dataB = b.getData() as MindNodeData | undefined;
            const orderA = typeof dataA?.order === 'number' ? dataA.order : undefined;
            const orderB = typeof dataB?.order === 'number' ? dataB.order : undefined;

            // Both have order: compare by order
            if (orderA !== undefined && orderB !== undefined) {
                return orderA - orderB;
            }

            // One has order, one doesn't: ordered comes first
            if (orderA !== undefined) return -1;
            if (orderB !== undefined) return 1;

            // Neither has order: positional fallback
            const posA = a.getPosition();
            const posB = b.getPosition();
            return fallbackAxis === 'y' ? posA.y - posB.y : posA.x - posB.x;
        });
    }

    /**
     * Get all sibling nodes (including the current node), sorted by order
     * @returns Array of sibling nodes sorted by order
     */
    getSiblings(graph: Graph, node: Node, options?: { layoutMode?: LayoutMode }): Node[] {
        const parent = this.getParent(graph, node);
        if (!parent) {
            // Root node has no siblings, return only itself
            return [node];
        }
        const siblings = this.getChildren(graph, parent, options);
        // If the current node is not navigable (hidden/archived), it won't be in siblings; fall back to itself.
        return siblings.some((s) => s.id === node.id) ? siblings : [node];
    }

    /**
     * Navigate to the parent node (hierarchical)
     * @returns Parent node or null if at root
     */
    navigateToParent(graph: Graph, currentNode: Node): Node | null {
        return this.getParent(graph, currentNode);
    }

    /**
     * Navigate to the first child node (hierarchical)
     * @returns First child node or null if no children
     */
    navigateToFirstChild(graph: Graph, currentNode: Node, options?: { layoutMode?: LayoutMode }): Node | null {
        const children = this.getChildren(graph, currentNode, options);
        return children.length > 0 ? children[0] : null;
    }

    /**
     * Navigate to the previous sibling (hierarchical)
     * @returns Previous sibling node or null if at first sibling
     */
    navigateToPrevSibling(graph: Graph, currentNode: Node, options?: { layoutMode?: LayoutMode }): Node | null {
        const siblings = this.getSiblings(graph, currentNode, options);
        const currentIndex = siblings.findIndex((s) => s.id === currentNode.id);

        if (currentIndex <= 0) {
            // Already at the first sibling, no navigation
            return null;
        }

        return siblings[currentIndex - 1];
    }

    /**
     * Navigate to the next sibling (hierarchical)
     * @returns Next sibling node or null if at last sibling
     */
    navigateToNextSibling(graph: Graph, currentNode: Node, options?: { layoutMode?: LayoutMode }): Node | null {
        const siblings = this.getSiblings(graph, currentNode, options);
        const currentIndex = siblings.findIndex((s) => s.id === currentNode.id);

        if (currentIndex < 0 || currentIndex >= siblings.length - 1) {
            // Already at the last sibling, no navigation
            return null;
        }

        return siblings[currentIndex + 1];
    }

    // Backwards-compatible aliases (logic/vertical semantics)
    navigateUp(graph: Graph, currentNode: Node): Node | null {
        return this.navigateToParent(graph, currentNode);
    }

    navigateDown(graph: Graph, currentNode: Node): Node | null {
        return this.navigateToFirstChild(graph, currentNode, { layoutMode: 'logic' });
    }

    navigateLeft(graph: Graph, currentNode: Node): Node | null {
        return this.navigateToPrevSibling(graph, currentNode, { layoutMode: 'logic' });
    }

    navigateRight(graph: Graph, currentNode: Node): Node | null {
        return this.navigateToNextSibling(graph, currentNode, { layoutMode: 'logic' });
    }

    private getDependencyPredecessors(graph: Graph, node: Node): Node[] {
        const incoming = getDependencyIncomingEdges(graph, node);
        const byId = new Map<string, Node>();
        for (const edge of incoming) {
            const sourceId = edge.getSourceCellId?.();
            if (!sourceId) continue;
            const cell = graph.getCellById(sourceId);
            if (!cell || !cell.isNode()) continue;
            const sourceNode = cell as Node;
            if (this.isNavigableNode(sourceNode)) {
                byId.set(sourceNode.id, sourceNode);
            }
        }
        return [...byId.values()];
    }

    private getDependencySuccessors(graph: Graph, node: Node): Node[] {
        const outgoing = getDependencyOutgoingEdges(graph, node);
        const byId = new Map<string, Node>();
        for (const edge of outgoing) {
            const targetId = edge.getTargetCellId?.();
            if (!targetId) continue;
            const cell = graph.getCellById(targetId);
            if (!cell || !cell.isNode()) continue;
            const targetNode = cell as Node;
            if (this.isNavigableNode(targetNode)) {
                byId.set(targetNode.id, targetNode);
            }
        }
        return [...byId.values()];
    }

    private navigateDependency(graph: Graph, currentNode: Node, key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): Node | null {
        const current = this.getNodeCenter(currentNode);

        const predecessors = this.getDependencyPredecessors(graph, currentNode);
        const successors = this.getDependencySuccessors(graph, currentNode);

        const candidates =
            key === 'ArrowLeft'
                ? predecessors
                : key === 'ArrowRight'
                    ? successors
                    : [...predecessors, ...successors];

        if (candidates.length === 0) return null;

        const filtered = candidates.filter((candidate) => {
            const c = this.getNodeCenter(candidate);
            const dy = c.y - current.y;
            if (key === 'ArrowUp') return dy < 0;
            if (key === 'ArrowDown') return dy > 0;
            return true;
        });

        if ((key === 'ArrowUp' || key === 'ArrowDown') && filtered.length === 0) {
            return null;
        }

        const usable = key === 'ArrowUp' || key === 'ArrowDown' ? filtered : candidates;

        let best: Node | null = null;
        let bestScore: [number, number, number, string] | null = null;

        for (const candidate of usable) {
            const c = this.getNodeCenter(candidate);
            const dx = c.x - current.x;
            const dy = c.y - current.y;
            const score: [number, number, number, string] = [
                Math.abs(dy),
                Math.abs(dx),
                Math.hypot(dx, dy),
                candidate.id,
            ];

            if (!bestScore || NavigationCommand.compareLexicographic(score, bestScore) < 0) {
                bestScore = score;
                best = candidate;
            }
        }

        return best;
    }

    private navigateSpatial(graph: Graph, currentNode: Node, key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): Node | null {
        const allNodes = typeof (graph as any).getNodes === 'function' ? (graph as any).getNodes() as Node[] : [];
        const candidates = allNodes.filter((n) => n.id !== currentNode.id && this.isNavigableNode(n));
        if (candidates.length === 0) return null;

        const current = this.getNodeCenter(currentNode);

        let best: Node | null = null;
        let bestScore: [number, number, number, string] | null = null;

        for (const candidate of candidates) {
            const c = this.getNodeCenter(candidate);
            const dx = c.x - current.x;
            const dy = c.y - current.y;

            let parallel = 0;
            let perpendicular = 0;

            if (key === 'ArrowUp') {
                parallel = -dy;
                perpendicular = Math.abs(dx);
            } else if (key === 'ArrowDown') {
                parallel = dy;
                perpendicular = Math.abs(dx);
            } else if (key === 'ArrowLeft') {
                parallel = -dx;
                perpendicular = Math.abs(dy);
            } else {
                parallel = dx;
                perpendicular = Math.abs(dy);
            }

            // Must be in the intended half-plane
            if (parallel <= 0) continue;

            const angle = perpendicular / parallel;
            const dist = Math.hypot(dx, dy);
            const score: [number, number, number, string] = [angle, parallel, dist, candidate.id];

            if (!bestScore || NavigationCommand.compareLexicographic(score, bestScore) < 0) {
                bestScore = score;
                best = candidate;
            }
        }

        return best;
    }

    navigateByArrowKey(
        graph: Graph,
        currentNode: Node,
        key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
        layoutMode: LayoutMode
    ): Node | null {
        if (layoutMode === 'free') {
            return this.navigateSpatial(graph, currentNode, key);
        }

        if (layoutMode === 'network') {
            return this.navigateDependency(graph, currentNode, key);
        }

        if (layoutMode === 'mindmap') {
            if (key === 'ArrowLeft') return this.navigateToParent(graph, currentNode);
            if (key === 'ArrowRight') return this.navigateToFirstChild(graph, currentNode, { layoutMode });
            if (key === 'ArrowUp') return this.navigateToPrevSibling(graph, currentNode, { layoutMode });
            return this.navigateToNextSibling(graph, currentNode, { layoutMode });
        }

        // Default: logic layout
        if (key === 'ArrowUp') return this.navigateToParent(graph, currentNode);
        if (key === 'ArrowDown') return this.navigateToFirstChild(graph, currentNode, { layoutMode: 'logic' });
        if (key === 'ArrowLeft') return this.navigateToPrevSibling(graph, currentNode, { layoutMode: 'logic' });
        return this.navigateToNextSibling(graph, currentNode, { layoutMode: 'logic' });
    }
}
