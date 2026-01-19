/**
 * Story 8.10: parentIdUtils Unit Tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocks commonly use any */
import { describe, expect, it } from 'vitest';
import {
  buildChildrenMap,
  getDirectChildrenByParentId,
  getRootNodes,
  getAncestorsByParentId,
  getAllDescendantsByParentId,
  isDescendant,
} from '@/lib/parentIdUtils';

type MockNode = {
  id: string;
  isNode: () => boolean;
  getData: () => Record<string, unknown>;
  setData: (next: Record<string, unknown>) => void;
};

function createMockNode(id: string, initialData: Record<string, unknown> = {}): MockNode {
  const data = { ...initialData };
  return {
    id,
    isNode: () => true,
    getData: () => data,
    setData: (next) => Object.assign(data, next),
  };
}

function createMockGraph(nodes: MockNode[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return {
    getNodes: () => nodes,
    getCellById: (id: string) => byId.get(id) ?? null,
  };
}

describe('parentIdUtils', () => {
  it('buildChildrenMap sorts by order then id', () => {
    const parent = createMockNode('p', { label: 'P' });
    const a = createMockNode('a', { parentId: 'p', order: 1 });
    const d = createMockNode('d', { parentId: 'p', order: 1 });
    const b = createMockNode('b', { parentId: 'p', order: 2 });
    const c = createMockNode('c', { parentId: 'p' }); // no order

    const graph = createMockGraph([parent, b, a, c, d]);
    const map = buildChildrenMap(graph as any);

    expect(map.get('p')?.map((n) => n.id)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('getDirectChildrenByParentId returns sorted children (scan mode)', () => {
    const parent = createMockNode('p', { label: 'P' });
    const a = createMockNode('a', { parentId: 'p', order: 2 });
    const b = createMockNode('b', { parentId: 'p', order: 0 });
    const c = createMockNode('c', { parentId: 'p', order: 1 });

    const graph = createMockGraph([parent, a, b, c]);
    const children = getDirectChildrenByParentId(graph as any, 'p');
    expect(children.map((n) => n.id)).toEqual(['b', 'c', 'a']);
  });

  it('getRootNodes returns nodes without parentId (sorted)', () => {
    const rootB = createMockNode('b', { label: 'B', order: 1 });
    const rootA = createMockNode('a', { label: 'A', order: 0 });
    const child = createMockNode('c', { parentId: 'a' });

    const graph = createMockGraph([rootB, child, rootA]);
    const roots = getRootNodes(graph as any);
    expect(roots.map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('getAncestorsByParentId walks up parentId chain and stops on cycles', () => {
    const a = createMockNode('a', { parentId: 'b' });
    const b = createMockNode('b', { parentId: 'a' }); // cycle

    const graph = createMockGraph([a, b]);
    const ancestors = getAncestorsByParentId(graph as any, 'a');
    expect(ancestors.map((n) => n.id)).toEqual(['b']);
  });

  it('getAllDescendantsByParentId returns all descendants (BFS)', () => {
    const p = createMockNode('p');
    const c1 = createMockNode('c1', { parentId: 'p', order: 0 });
    const c2 = createMockNode('c2', { parentId: 'p', order: 1 });
    const g1 = createMockNode('g1', { parentId: 'c1' });

    const graph = createMockGraph([p, c2, g1, c1]);
    const descendants = getAllDescendantsByParentId(graph as any, 'p');
    expect(new Set(descendants.map((n) => n.id))).toEqual(new Set(['c1', 'c2', 'g1']));
  });

  it('isDescendant returns true only when node is in subtree', () => {
    const p = createMockNode('p');
    const c = createMockNode('c', { parentId: 'p' });
    const other = createMockNode('other');
    const graph = createMockGraph([p, c, other]);

    expect(isDescendant(graph as any, 'p', 'c')).toBe(true);
    expect(isDescendant(graph as any, 'p', 'other')).toBe(false);
  });
});

