import { afterEach, describe, expect, it } from 'vitest';
import { NodeType } from '@cdm/types';
import { AddChildCommand } from './AddChildCommand';
import { AddSiblingCommand } from './AddSiblingCommand';
import { RemoveNodeCommand } from './RemoveNodeCommand';

type Point = { x: number; y: number };

class FakeNode {
  constructor(
    public id: string,
    private position: Point,
    private data: Record<string, unknown> = {}
  ) { }

  isNode() {
    return true;
  }

  getPosition(): Point {
    return this.position;
  }

  getData(): Record<string, unknown> {
    return this.data;
  }

  setData(next: Record<string, unknown>) {
    this.data = next;
  }
}

class FakeEdge {
  constructor(
    private readonly sourceId: string,
    private readonly targetId: string,
    private readonly data: Record<string, unknown> = {}
  ) { }

  getSourceCellId(): string {
    return this.sourceId;
  }

  getTargetCellId(): string {
    return this.targetId;
  }

  getData(): Record<string, unknown> {
    return this.data;
  }
}

class FakeGraph {
  private nodes = new Map<string, FakeNode>();
  private edges: FakeEdge[] = [];
  private nextId = 0;

  addNode(config: {
    id?: string;
    x: number;
    y: number;
    data?: Record<string, unknown>;
  }): FakeNode {
    const id = config.id ?? `node-${++this.nextId}`;
    const node = new FakeNode(id, { x: config.x, y: config.y }, config.data ?? {});
    this.nodes.set(id, node);
    return node;
  }

  addEdge(config: { source: string; target: string; data?: Record<string, unknown> }): FakeEdge {
    const edge = new FakeEdge(config.source, config.target, config.data ?? {});
    this.edges.push(edge);
    return edge;
  }

  getOutgoingEdges(node: FakeNode): FakeEdge[] {
    return this.edges.filter((e) => e.getSourceCellId() === node.id);
  }

  getIncomingEdges(node: FakeNode): FakeEdge[] {
    return this.edges.filter((e) => e.getTargetCellId() === node.id);
  }

  getCellById(id: string): FakeNode | null {
    return this.nodes.get(id) ?? null;
  }

  removeNode(node: FakeNode): void {
    this.nodes.delete(node.id);
    this.edges = this.edges.filter(
      (e) => e.getSourceCellId() !== node.id && e.getTargetCellId() !== node.id
    );
  }
}

function createGraph() {
  return { graph: new FakeGraph() };
}

describe('Mindmap Commands', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('AddChildCommand', () => {
    it('creates first child at x+200, same y, and connects edge', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100 });

      const cmd = new AddChildCommand();
      const child = cmd.execute(graph as any, root as any)!;

      expect(child).toBeTruthy();
      expect(child.getPosition().x).toBe(300);
      expect(child.getPosition().y).toBe(100);
      expect((child.getData() as any).isEditing).toBe(true);
      expect((child.getData() as any).nodeType).toBe(NodeType.ORDINARY); // Fix: Ensure semantic type is set for clipboard compatibility

      const edges = graph.getOutgoingEdges(root) ?? [];
      expect(edges.length).toBe(1);
      expect(edges[0].getTargetCellId()).toBe(child.id);
    });

    it('stacks children vertically under the same parent', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100 });

      const cmd = new AddChildCommand();
      const child1 = cmd.execute(graph as any, root as any)!;
      const child2 = cmd.execute(graph as any, root as any)!;

      expect(child1.getPosition().x).toBe(300);
      expect(child2.getPosition().x).toBe(300);
      expect(child2.getPosition().y).toBe(child1.getPosition().y + 80);
    });
  });

  describe('AddSiblingCommand', () => {
    it('treats root Enter as AddChild and stacks correctly', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100 });

      const cmd = new AddSiblingCommand();
      const child1 = cmd.execute(graph as any, root as any)!;
      const child2 = cmd.execute(graph as any, root as any)!;

      expect(child1.getPosition().x).toBe(300);
      expect(child2.getPosition().x).toBe(300);
      expect(child2.getPosition().y).toBe(child1.getPosition().y + 80);
    });

    it('creates sibling under the same parent (x same, y + 80)', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100 });

      const addChild = new AddChildCommand();
      const first = addChild.execute(graph as any, root as any)!;

      const addSibling = new AddSiblingCommand();
      const sibling = addSibling.execute(graph as any, first as any)!;

      expect(sibling.getPosition().x).toBe(first.getPosition().x);
      expect(sibling.getPosition().y).toBe(first.getPosition().y + 80);

      const rootEdges = graph.getOutgoingEdges(root) ?? [];
      expect(rootEdges.length).toBe(2);
      const targets = rootEdges.map((e) => e.getTargetCellId()).sort();
      expect(targets).toEqual([first.id, sibling.id].sort());
    });

    it('inherits nodeType from selected sibling node (TASK)', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100 });

      const addChild = new AddChildCommand();
      const first = addChild.execute(graph as any, root as any)!;
      // Set first child as TASK type
      first.setData({ ...first.getData(), nodeType: NodeType.TASK });

      const addSibling = new AddSiblingCommand();
      const sibling = addSibling.execute(graph as any, first as any)!;

      expect((sibling.getData() as any).nodeType).toBe(NodeType.TASK);
    });

    it('inherits nodeType from selected sibling node (REQUIREMENT)', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100 });

      const addChild = new AddChildCommand();
      const first = addChild.execute(graph as any, root as any)!;
      // Set first child as REQUIREMENT type
      first.setData({ ...first.getData(), nodeType: NodeType.REQUIREMENT });

      const addSibling = new AddSiblingCommand();
      const sibling = addSibling.execute(graph as any, first as any)!;

      expect((sibling.getData() as any).nodeType).toBe(NodeType.REQUIREMENT);
    });

    it('defaults to ORDINARY when no nodeType is set on siblings', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100 });

      const addChild = new AddChildCommand();
      const first = addChild.execute(graph as any, root as any)!;
      // first has no nodeType set (default behavior)

      const addSibling = new AddSiblingCommand();
      const sibling = addSibling.execute(graph as any, first as any)!;

      expect((sibling.getData() as any).nodeType).toBe(NodeType.ORDINARY);
    });

    it('inherits nodeType from last sibling when creating child from root', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100 });

      // Create first child from root (Enter on root)
      const addSibling = new AddSiblingCommand();
      const first = addSibling.execute(graph as any, root as any)!;
      first.setData({ ...first.getData(), nodeType: NodeType.PBS });

      // Create second child from root (Enter on root again)
      const second = addSibling.execute(graph as any, root as any)!;

      expect((second.getData() as any).nodeType).toBe(NodeType.PBS);
    });
  });

  describe('RemoveNodeCommand', () => {
    it('removes a node and its subtree, but keeps root', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100 });

      const addChild = new AddChildCommand();
      const child1 = addChild.execute(graph as any, root as any)!;
      const child2 = addChild.execute(graph as any, root as any)!;
      const grandchild = addChild.execute(graph as any, child1 as any)!;

      const remove = new RemoveNodeCommand();
      remove.execute(graph as any, child1 as any);

      expect(graph.getCellById(root.id)).toBeTruthy();
      expect(graph.getCellById(child1.id)).toBeNull();
      expect(graph.getCellById(grandchild.id)).toBeNull();
      expect(graph.getCellById(child2.id)).toBeTruthy();

      const rootEdges = graph.getOutgoingEdges(root) ?? [];
      expect(rootEdges.length).toBe(1);
      expect(rootEdges[0].getTargetCellId()).toBe(child2.id);
    });

    it('does not remove root node', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100 });

      const remove = new RemoveNodeCommand();
      remove.execute(graph as any, root as any);

      expect(graph.getCellById(root.id)).toBeTruthy();
    });
  });
});
