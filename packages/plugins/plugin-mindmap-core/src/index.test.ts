import { describe, expect, it, vi } from 'vitest';
import { Graph } from '@antv/x6';
import { MindmapCorePlugin } from './index';

function createGraph() {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);

  const graph = new Graph({
    container,
    width: 800,
    height: 600,
  });

  return { graph, container };
}

describe('MindmapCorePlugin', () => {
  it('initialize does not bind keyboard shortcuts or DOM events (handled by app layer)', () => {
    const { graph, container } = createGraph();

    const plugin = new MindmapCorePlugin();
    const bindKeySpy = vi.spyOn(graph, 'bindKey');
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');

    plugin.initialize(graph);

    expect(bindKeySpy).not.toHaveBeenCalled();
    expect(addEventListenerSpy).not.toHaveBeenCalled();

    graph.dispose();
    container.remove();
  });
});

