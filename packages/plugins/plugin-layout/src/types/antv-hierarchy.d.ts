declare module '@antv/hierarchy' {
  export interface HierarchyNode {
    id: string;
    data: any;
    children?: HierarchyNode[];
    x?: number;
    y?: number;
  }

  export interface MindmapOptions {
    direction?: 'H' | 'V';
    getHGap?: (node: HierarchyNode) => number;
    getVGap?: (node: HierarchyNode) => number;
    getSide?: (node: HierarchyNode) => 'left' | 'right';
    getWidth?: (node: HierarchyNode) => number;
    getHeight?: (node: HierarchyNode) => number;
  }

  export function mindmap<T extends HierarchyNode>(
    data: T,
    options?: MindmapOptions
  ): T;

  export function compactBox<T extends HierarchyNode>(
    data: T,
    options?: any
  ): T;
}
