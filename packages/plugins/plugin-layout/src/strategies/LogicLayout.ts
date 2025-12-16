import { Graph } from '@antv/x6';
import { mindmap } from '@antv/hierarchy';
import { BaseLayout, LayoutResult, TreeNode } from './BaseLayout';

// Layout spacing constants for Logic layout
const DEFAULT_HORIZONTAL_GAP = 80;
const DEFAULT_VERTICAL_GAP = 20;
const DEFAULT_NODE_WIDTH = 120;
const DEFAULT_NODE_HEIGHT = 40;

/**
 * Logic layout strategy
 * Strict left-to-right horizontal hierarchy (like XMind "Logic Chart")
 * Uses @antv/hierarchy's mindmap algorithm with specific parameters
 */
export class LogicLayout extends BaseLayout {
  private hGap: number = DEFAULT_HORIZONTAL_GAP;
  private vGap: number = DEFAULT_VERTICAL_GAP;

  constructor(graph: Graph, options?: { hGap?: number; vGap?: number }) {
    super(graph);
    if (options?.hGap) this.hGap = options.hGap;
    if (options?.vGap) this.vGap = options.vGap;
  }

  calculate(): LayoutResult {
    const rootNode = this.getRootNode();
    if (!rootNode) {
      return { nodes: [] };
    }

    const tree = this.buildHierarchy(rootNode);

    // Use mindmap algorithm with H direction for strict left-to-right layout
    const layoutTree = mindmap(tree, {
      direction: 'H', // Horizontal: root on left, children on right
      getHGap: () => this.hGap,
      getVGap: () => this.vGap,
      getSide: () => 'right', // All children to the right (not radial)
      getWidth: (node: TreeNode) => {
        const graphNode = this.graph.getCellById(node.id);
        if (graphNode && 'getSize' in graphNode && typeof graphNode.getSize === 'function') {
          return (graphNode as any).getSize().width || DEFAULT_NODE_WIDTH;
        }
        return DEFAULT_NODE_WIDTH;
      },
      getHeight: (node: TreeNode) => {
        const graphNode = this.graph.getCellById(node.id);
        if (graphNode && 'getSize' in graphNode && typeof graphNode.getSize === 'function') {
          return (graphNode as any).getSize().height || DEFAULT_NODE_HEIGHT;
        }
        return DEFAULT_NODE_HEIGHT;
      },
    });

    return {
      nodes: this.flattenTree(layoutTree),
    };
  }
}
