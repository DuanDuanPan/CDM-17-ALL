import { afterEach, describe, expect, it } from 'vitest';
import { Graph } from '@antv/x6';
import { NodeType } from '@cdm/types';
import { AddChildCommand } from './AddChildCommand';
import { AddSiblingCommand } from './AddSiblingCommand';
import { RemoveNodeCommand } from './RemoveNodeCommand';

const cleanups: Array<() => void> = [];

function createGraph() {
  Graph.registerNode('mind-node', { inherit: 'rect' }, true);

  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);

  const graph = new Graph({
    container,
    width: 800,
    height: 600,
  });

  cleanups.push(() => {
    graph.dispose();
    container.remove();
  });

  return { graph };
}

describe('Mindmap Commands', () => {
  afterEach(() => {
    cleanups.splice(0).forEach((fn) => fn());
    document.body.innerHTML = '';
  });

  describe('AddChildCommand', () => {
    it('creates first child at x+200, same y, and connects edge', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100, width: 120, height: 50 });

      const cmd = new AddChildCommand();
      const child = cmd.execute(graph, root)!;

      expect(child).toBeTruthy();
      expect(child.getPosition().x).toBe(300);
      expect(child.getPosition().y).toBe(100);
      expect((child.getData() as any).isEditing).toBe(true);

      const edges = graph.getOutgoingEdges(root) ?? [];
      expect(edges.length).toBe(1);
      expect(edges[0].getTargetCellId()).toBe(child.id);
    });

    it('stacks children vertically under the same parent', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100, width: 120, height: 50 });

      const cmd = new AddChildCommand();
      const child1 = cmd.execute(graph, root)!;
      const child2 = cmd.execute(graph, root)!;

      expect(child1.getPosition().x).toBe(300);
      expect(child2.getPosition().x).toBe(300);
      expect(child2.getPosition().y).toBe(child1.getPosition().y + 80);
    });
  });

  describe('AddSiblingCommand', () => {
    it('treats root Enter as AddChild and stacks correctly', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100, width: 120, height: 50 });

      const cmd = new AddSiblingCommand();
      const child1 = cmd.execute(graph, root)!;
      const child2 = cmd.execute(graph, root)!;

      expect(child1.getPosition().x).toBe(300);
      expect(child2.getPosition().x).toBe(300);
      expect(child2.getPosition().y).toBe(child1.getPosition().y + 80);
    });

    it('creates sibling under the same parent (x same, y + 80)', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100, width: 120, height: 50 });

      const addChild = new AddChildCommand();
      const first = addChild.execute(graph, root)!;

      const addSibling = new AddSiblingCommand();
      const sibling = addSibling.execute(graph, first)!;

      expect(sibling.getPosition().x).toBe(first.getPosition().x);
      expect(sibling.getPosition().y).toBe(first.getPosition().y + 80);

      const rootEdges = graph.getOutgoingEdges(root) ?? [];
      expect(rootEdges.length).toBe(2);
      const targets = rootEdges.map((e) => e.getTargetCellId()).sort();
      expect(targets).toEqual([first.id, sibling.id].sort());
    });

    it('inherits nodeType from selected sibling node (TASK)', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100, width: 120, height: 50 });

      const addChild = new AddChildCommand();
      const first = addChild.execute(graph, root)!;
      // Set first child as TASK type
      first.setData({ ...first.getData(), nodeType: NodeType.TASK });

      const addSibling = new AddSiblingCommand();
      const sibling = addSibling.execute(graph, first)!;

      expect((sibling.getData() as any).nodeType).toBe(NodeType.TASK);
    });

    it('inherits nodeType from selected sibling node (REQUIREMENT)', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100, width: 120, height: 50 });

      const addChild = new AddChildCommand();
      const first = addChild.execute(graph, root)!;
      // Set first child as REQUIREMENT type
      first.setData({ ...first.getData(), nodeType: NodeType.REQUIREMENT });

      const addSibling = new AddSiblingCommand();
      const sibling = addSibling.execute(graph, first)!;

      expect((sibling.getData() as any).nodeType).toBe(NodeType.REQUIREMENT);
    });

    it('defaults to ORDINARY when no nodeType is set on siblings', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100, width: 120, height: 50 });

      const addChild = new AddChildCommand();
      const first = addChild.execute(graph, root)!;
      // first has no nodeType set (default behavior)

      const addSibling = new AddSiblingCommand();
      const sibling = addSibling.execute(graph, first)!;

      expect((sibling.getData() as any).nodeType).toBe(NodeType.ORDINARY);
    });

    it('inherits nodeType from last sibling when creating child from root', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100, width: 120, height: 50 });

      // Create first child from root (Enter on root)
      const addSibling = new AddSiblingCommand();
      const first = addSibling.execute(graph, root)!;
      first.setData({ ...first.getData(), nodeType: NodeType.PBS });

      // Create second child from root (Enter on root again)
      const second = addSibling.execute(graph, root)!;

      expect((second.getData() as any).nodeType).toBe(NodeType.PBS);
    });
  });

  describe('RemoveNodeCommand', () => {
    it('removes a node and its subtree, but keeps root', () => {
      const { graph } = createGraph();
      const root = graph.addNode({ id: 'root', x: 100, y: 100, width: 120, height: 50 });

      const addChild = new AddChildCommand();
      const child1 = addChild.execute(graph, root)!;
      const child2 = addChild.execute(graph, root)!;
      const grandchild = addChild.execute(graph, child1)!;

      const remove = new RemoveNodeCommand();
      remove.execute(graph, child1);

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
      const root = graph.addNode({ id: 'root', x: 100, y: 100, width: 120, height: 50 });

      const remove = new RemoveNodeCommand();
      remove.execute(graph, root);

      expect(graph.getCellById(root.id)).toBeTruthy();
    });
  });
});
