import { Graph } from '@antv/x6';
import { mindmap } from '@antv/hierarchy';
import { BaseLayout, LayoutResult, TreeNode } from './BaseLayout';

// Layout spacing constants
const DEFAULT_HORIZONTAL_GAP = 20;
const DEFAULT_VERTICAL_GAP = 6;
const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 40;

/**
 * Mindmap layout strategy
 * Uses @antv/hierarchy's mindmap algorithm for radial/tree structure
 */
export class MindmapLayout extends BaseLayout {
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
    const layoutTree = mindmap(tree, {
      direction: 'H', // Horizontal (can be changed to 'V' for vertical)
      getHGap: () => this.hGap,
      getVGap: () => this.vGap,
      getWidth: (node: TreeNode) => {
        // Get node width from graph or use default
        const graphNode = this.graph.getCellById(node.id);
        if (graphNode && 'getSize' in graphNode && typeof graphNode.getSize === 'function') {
          return (graphNode as any).getSize().width || DEFAULT_NODE_WIDTH;
        }
        return DEFAULT_NODE_WIDTH;
      },
      getHeight: (node: TreeNode) => {
        // Get node height from graph or use default
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
