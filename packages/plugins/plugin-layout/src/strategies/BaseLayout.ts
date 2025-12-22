import { Graph, Node, Edge } from '@antv/x6';
import { sortNodesRightToLeftTopToBottom } from '../utils/sortNodes';
import type { EdgeMetadata } from '@cdm/types';

// Animation constants
const LAYOUT_TRANSITION_DURATION = 500; // milliseconds
const LAYOUT_TRANSITION_TIMING = 'ease-out';

export interface LayoutResult {
  nodes: Array<{
    id: string;
    x: number;
    y: number;
  }>;
}

/**
 * Base class for layout strategies
 */
export abstract class BaseLayout {
  protected graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * Calculate layout positions for all nodes
   * @returns Layout result with node positions
   */
  abstract calculate(): LayoutResult;

  /**
   * Apply layout to graph
   * @param animate - Whether to animate the transition
   */
  async apply(animate: boolean = true): Promise<void> {
    const result = this.calculate();

    // Keep the current root position as the anchor. When the root is dragged and
    // we add a new node (Tab/Enter), the layout algorithm recomputes positions
    // from (0,0), which previously snapped the root back to the origin and caused
    // overlap. We offset the computed positions by the delta between the current
    // root position and the layout result.
    let offsetX = 0;
    let offsetY = 0;

    const rootNode = this.getRootNode();
    if (rootNode) {
      const currentPos = rootNode.getPosition?.();
      const layoutRoot = result.nodes.find((n) => n.id === rootNode.id);

      if (layoutRoot && currentPos) {
        offsetX = currentPos.x - layoutRoot.x;
        offsetY = currentPos.y - layoutRoot.y;
      }
    }

    if (animate) {
      // Use X6 model.startBatch() for animated transitions
      this.graph.model.startBatch('layout');
    }

    for (const nodePos of result.nodes) {
      const node = this.graph.getCellById(nodePos.id) as Node;
      if (!node) {
        console.warn('[BaseLayout] Node not found:', nodePos.id);
        continue;
      }

      const currentPos = node.getPosition();
      const targetX = nodePos.x + offsetX;
      const targetY = nodePos.y + offsetY;

      if (animate) {
        // Animate position change using prop with transition options
        node.prop('position', { x: targetX, y: targetY }, {
          transition: {
            duration: LAYOUT_TRANSITION_DURATION,
            timing: LAYOUT_TRANSITION_TIMING,
          },
        });
      } else {
        // Set position immediately
        node.setPosition({ x: targetX, y: targetY });
      }
    }

    if (animate) {
      this.graph.model.stopBatch('layout');
    }
  }

  /**
   * Get root node of the graph
   * Story 2.7: Excludes archived nodes from root selection
   */
  protected getRootNode(): Node | null {
    const nodes = this.graph.getNodes();
    const rootNode = nodes.find((node) => {
      const data = node.getData();
      // Story 2.7: Skip archived nodes - they should not be the root
      if (data?.isArchived) return false;
      return data?.type === 'root' || !data?.parentId;
    });
    return rootNode || null;
  }

  /**
   * Build tree hierarchy from graph nodes
   */
  protected buildHierarchy(rootNode: Node): TreeNode {
    const visited = new Set<string>();

    const buildTree = (node: Node): TreeNode => {
      const id = node.id;
      if (visited.has(id)) {
        // Prevent infinite loops in case of cycles
        console.warn('[BaseLayout] Cycle detected at node:', id);
        return {
          id,
          data: node.getData(),
          children: [],
        };
      }
      visited.add(id);

      // Try to find children by parentId first
      // Story 2.7: Filter out archived nodes - they should not be included in layout
      let children = this.graph.getNodes().filter((n) => {
        const data = n.getData();
        // Skip archived nodes completely
        if (data?.isArchived) return false;
        return data?.parentId === id;
      });

      // Fallback: If no children found by parentId, try to find by edges
      // This handles legacy nodes that don't have parentId set
      // Story 2.2: CRITICAL - Only use hierarchical edges, NOT dependency edges
      if (children.length === 0) {
        const outgoingEdges = this.graph.getOutgoingEdges(node);
        if (outgoingEdges && outgoingEdges.length > 0) {
          // Filter to only hierarchical edges (Story 2.2)
          const hierarchicalEdges = outgoingEdges.filter((edge) =>
            this.isHierarchicalEdge(edge)
          );
          children = hierarchicalEdges
            .map((edge) => this.graph.getCellById(edge.getTargetCellId()) as Node)
            // Story 2.7: Also filter out archived nodes from edge-based children
            .filter((child) => child != null && !child.getData()?.isArchived);
        }
      }



      // Sort children: right-to-left (X descending), top-to-bottom (Y ascending)
      children.sort(sortNodesRightToLeftTopToBottom);

      return {
        id,
        data: node.getData(),
        children: children.map((child) => buildTree(child)),
      };
    };

    const tree = buildTree(rootNode);
    return tree;
  }

  /**
   * Flatten tree hierarchy to list of node positions
   * Utility method used by layout strategies
   */
  protected flattenTree(tree: TreeNode): Array<{ id: string; x: number; y: number }> {
    const result: Array<{ id: string; x: number; y: number }> = [];

    const traverse = (node: TreeNode) => {
      if (node.x !== undefined && node.y !== undefined) {
        result.push({
          id: node.id,
          x: node.x,
          y: node.y,
        });
      }

      if (node.children) {
        node.children.forEach((child) => traverse(child));
      }
    };

    traverse(tree);
    return result;
  }

  /**
   * Story 2.2: Check if an edge is a hierarchical edge (not a dependency edge).
   * Used to filter edges during tree hierarchy building.
   *
   * @param edge - The edge to check
   * @returns true if the edge is hierarchical, false if it's a dependency edge
   */
  protected isHierarchicalEdge(edge: Edge): boolean {
    const data = edge.getData();

    // Check for metadata in data object (preferred location)
    if (data?.metadata && typeof data.metadata === 'object') {
      const metadata = data.metadata as EdgeMetadata;
      if (metadata.kind === 'dependency') {
        return false;
      }
    }

    // Check for kind directly in data (alternative location)
    if (data?.kind === 'dependency') {
      return false;
    }

    // Default: treat as hierarchical for backward compatibility
    return true;
  }
}

/**
 * Tree node structure for hierarchy calculation
 */
export interface TreeNode {
  id: string;
  data: any;
  children?: TreeNode[]; // Make children optional to match HierarchyNode
  x?: number;
  y?: number;
}
