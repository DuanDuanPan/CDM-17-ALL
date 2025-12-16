import { describe, it, expect, vi } from 'vitest';
import { BaseLayout } from '../strategies/BaseLayout';

// Test layout that returns predefined positions
class TestLayout extends BaseLayout {
  constructor(graph: any, private positions: Array<{ id: string; x: number; y: number }>) {
    super(graph);
  }

  calculate() {
    return { nodes: this.positions };
  }
}

describe('BaseLayout - root anchoring', () => {
  it('keeps the dragged root position when reapplying layout', async () => {
    const rootNode = {
      id: 'root',
      getData: () => ({ type: 'root' }),
      getPosition: vi.fn().mockReturnValue({ x: 200, y: 150 }),
      setPosition: vi.fn(),
      prop: vi.fn(),
    };

    const childNode = {
      id: 'child',
      getData: () => ({ parentId: 'root' }),
      getPosition: vi.fn().mockReturnValue({ x: 100, y: 0 }),
      setPosition: vi.fn(),
      prop: vi.fn(),
    };

    const nodes = [rootNode, childNode];

    const graph = {
      getNodes: vi.fn().mockReturnValue(nodes),
      getCellById: vi.fn((id: string) => nodes.find((n) => n.id === id)),
      getOutgoingEdges: vi.fn().mockReturnValue([]),
      model: {
        startBatch: vi.fn(),
        stopBatch: vi.fn(),
      },
    } as any;

    const layout = new TestLayout(graph, [
      { id: 'root', x: 0, y: 0 },
      { id: 'child', x: 100, y: 0 },
    ]);

    await layout.apply(false);

    // BaseLayout.apply() uses setPosition when animate=false, prop when animate=true
    expect(rootNode.setPosition).toHaveBeenCalledWith({ x: 200, y: 150 });
    expect(childNode.setPosition).toHaveBeenCalledWith({ x: 300, y: 150 });
  });
});
