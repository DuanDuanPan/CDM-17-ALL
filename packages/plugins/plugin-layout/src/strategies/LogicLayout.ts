import { Graph, type Node } from '@antv/x6';
import { compactBox } from '@antv/hierarchy';
import { BaseLayout, LayoutResult, TreeNode } from './BaseLayout';
import { sortNodesLeftToRightTopToBottom } from '../utils/sortNodes';

// Layout spacing constants for Logic layout (vertical tree)
const DEFAULT_HORIZONTAL_GAP = 50;
const DEFAULT_VERTICAL_GAP = 30;
const DEFAULT_NODE_WIDTH = 120;
const DEFAULT_NODE_HEIGHT = 40;

/**
 * Logic layout strategy
 * Vertical tree layout (top-to-bottom) with siblings aligned horizontally
 * Uses @antv/hierarchy's compactBox algorithm
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

    // Use compactBox algorithm for vertical tree layout
    const layoutTree = compactBox(tree, {
      direction: 'TB', // Top-to-Bottom
      getHGap: () => this.hGap, // Horizontal spacing between siblings
      getVGap: () => this.vGap, // Vertical spacing between levels
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

  protected override getChildSorter(): (a: Node, b: Node) => number {
    return sortNodesLeftToRightTopToBottom;
  }
}
