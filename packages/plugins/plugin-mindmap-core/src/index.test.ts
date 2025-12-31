import { describe, expect, it, vi } from 'vitest';
import { MindmapCorePlugin } from './index';

function createGraph() {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);

  const graph = {
    container,
    bindKey: () => { },
    dispose: () => { },
  };

  return { graph, container };
}

describe('MindmapCorePlugin', () => {
  it('initialize does not bind keyboard shortcuts (handled by app layer)', () => {
    const { graph, container } = createGraph();

    const plugin = new MindmapCorePlugin();
    const bindKeySpy = vi.spyOn(graph, 'bindKey');
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');

    plugin.initialize(graph as any);

    expect(bindKeySpy).not.toHaveBeenCalled();
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'mindmap:node-operation',
      expect.any(Function)
    );

    graph.dispose();
    container.remove();
  });
});
