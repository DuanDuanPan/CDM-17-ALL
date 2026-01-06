/**
 * Edge Shapes Registration Unit Tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocks commonly use any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('edgeShapes', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('registers hierarchical edge shape with glow path', async () => {
    const registerEdgeMock = vi.fn();

    const { registerEdgeShapes } = await import('@/lib/edgeShapes');

    registerEdgeShapes({ registerEdge: registerEdgeMock });
    registerEdgeShapes({ registerEdge: registerEdgeMock });

    expect(registerEdgeMock).toHaveBeenCalledTimes(1);

    const [shapeName, shapeDef] = registerEdgeMock.mock.calls[0] as any[];
    expect(shapeName).toBe('cdm-hierarchical-edge');
    expect(Array.isArray(shapeDef?.markup)).toBe(true);
    expect(shapeDef.markup.some((m: any) => m?.selector === 'glow')).toBe(true);
  });
});
