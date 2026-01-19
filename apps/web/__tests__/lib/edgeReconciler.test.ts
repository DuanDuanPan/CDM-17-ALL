/**
 * Story 8.10: edgeReconciler Unit Tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocks commonly use any */
import { describe, expect, it } from 'vitest';
import { reconcileHierarchicalEdges } from '@/lib/edgeReconciler';

type MockNode = {
  id: string;
  isNode: () => boolean;
  getData: () => Record<string, unknown>;
};

type MockEdge = {
  id: string;
  getSourceCellId: () => string | null;
  getTargetCellId: () => string | null;
  getData: () => Record<string, unknown>;
};

function createMockNode(id: string, data: Record<string, unknown> = {}): MockNode {
  return {
    id,
    isNode: () => true,
    getData: () => data,
  };
}

function createMockEdge(
  id: string,
  source: string,
  target: string,
  kind: 'hierarchical' | 'dependency' = 'hierarchical'
): MockEdge {
  return {
    id,
    getSourceCellId: () => source,
    getTargetCellId: () => target,
    getData: () => ({ metadata: { kind } }),
  };
}

function createMockGraph(nodes: MockNode[], edges: MockEdge[]) {
  const byId = new Map<string, any>();
  nodes.forEach((n) => byId.set(n.id, n));
  edges.forEach((e) => byId.set(e.id, e));

  const state = {
    nodes: [...nodes],
    edges: [...edges],
    addedEdges: [] as any[],
    removedEdgeIds: [] as string[],
  };

  const graph = {
    getNodes: () => state.nodes,
    getEdges: () => state.edges,
    getCellById: (id: string) => byId.get(id) ?? null,
    batchUpdate: (fn: () => void) => fn(),
    addEdge: (config: any) => {
      state.addedEdges.push(config);
      const sourceId = typeof config.source === 'string' ? config.source : config.source?.cell;
      const targetId = typeof config.target === 'string' ? config.target : config.target?.cell;
      const edgeId = config.id ?? `${sourceId}→${targetId}`;
      const edge = createMockEdge(edgeId, sourceId, targetId, 'hierarchical');
      state.edges.push(edge);
      byId.set(edgeId, edge);
      return edge;
    },
    removeEdge: (edgeId: string) => {
      state.removedEdgeIds.push(edgeId);
      state.edges = state.edges.filter((e) => e.id !== edgeId);
      byId.delete(edgeId);
    },
  };

  return { graph, state };
}

describe('edgeReconciler', () => {
  it('reconcileHierarchicalEdges creates missing hierarchical edges from parentId', () => {
    const parent = createMockNode('p');
    const child = createMockNode('c', { parentId: 'p' });
    const { graph, state } = createMockGraph([parent, child], []);

    reconcileHierarchicalEdges(graph as any, { warnOrphans: false, layoutMode: 'free' });

    expect(state.addedEdges).toHaveLength(1);
    expect(state.addedEdges[0]).toEqual(
      expect.objectContaining({
        shape: 'cdm-hierarchical-edge',
        source: { cell: 'p' },
        target: { cell: 'c' },
        router: undefined,
        connector: expect.objectContaining({ name: 'smooth' }),
      })
    );
  });

  it('reconcileHierarchicalEdges removes stale hierarchical edges but preserves dependency edges', () => {
    const p = createMockNode('p');
    const c = createMockNode('c', { parentId: 'p' });
    const x = createMockNode('x'); // root

    const staleHier = createMockEdge('stale', 'p', 'x', 'hierarchical');
    const dep = createMockEdge('dep', 'c', 'x', 'dependency');
    const { graph, state } = createMockGraph([p, c, x], [staleHier, dep]);

    reconcileHierarchicalEdges(graph as any, { warnOrphans: false, layoutMode: 'logic' });

    // stale removed, expected p->c added
    expect(state.removedEdgeIds).toContain('stale');
    expect(state.addedEdges.some((cfg) => cfg.source?.cell === 'p' && cfg.target?.cell === 'c')).toBe(true);
    // dependency edge remains
    expect(state.edges.some((e) => e.id === 'dep')).toBe(true);
  });
});

