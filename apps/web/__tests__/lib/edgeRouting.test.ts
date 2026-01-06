/**
 * Edge Routing Utilities Unit Tests
 * Regression: keep hierarchical edge visible when child aligns with parent center.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocks commonly use any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('edgeRouting', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns empty vertices (not null) when target aligns with source', async () => {
    const registerRouterMock = vi.fn();

    vi.doMock('@antv/x6', () => ({
      Graph: {
        registerRouter: registerRouterMock,
      },
    }));

    // Keep the test focused on router behavior.
    vi.doMock('@/lib/edgeValidation', () => ({
      isDependencyEdge: () => false,
    }));

    const { registerEdgeRouters } = await import('@/lib/edgeRouting');

    registerEdgeRouters();

    expect(registerRouterMock).toHaveBeenCalledTimes(1);
    const routerFn = registerRouterMock.mock.calls[0]?.[1] as any;
    expect(typeof routerFn).toBe('function');

    const sourceNode = {
      isNode: () => true,
      isVisible: () => true,
      getBBox: () => ({ x: 0, y: 0, width: 100, height: 40 }),
    };

    const targetNode = {
      isNode: () => true,
      isVisible: () => true,
      // Same x + width as source => center aligns (deltaX === 0)
      getBBox: () => ({ x: 0, y: 120, width: 100, height: 40 }),
    };

    const edge = {
      getSourceCellId: () => 'source',
      getTargetCellId: () => 'target',
    };

    const graph = {
      getCellById: (id: string) => (id === 'source' ? sourceNode : id === 'target' ? targetNode : null),
      getOutgoingEdges: () => [edge],
    };

    const edgeView = {
      cell: edge,
      graph,
    };

    const result = routerFn([], {}, edgeView);

    expect(result).toEqual([]);
  });
});

