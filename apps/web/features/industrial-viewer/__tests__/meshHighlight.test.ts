'use client';

import { describe, it, expect } from 'vitest';
import { isMeshUserDataInNodeSubtree } from '../utils/meshHighlight';

function makeNode(id: number, parent: unknown = null) {
  return {
    GetId: () => id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GetParent: () => parent as any,
  };
}

describe('isMeshUserDataInNodeSubtree', () => {
  it('returns true when node id matches', () => {
    const node = makeNode(7);
    const meshUserData = { originalMeshInstance: { node } };
    expect(isMeshUserDataInNodeSubtree(meshUserData, 7)).toBe(true);
  });

  it('returns true when node is a descendant of the selected node', () => {
    const root = makeNode(1);
    const child = makeNode(2, root);
    const leaf = makeNode(3, child);
    const meshUserData = { originalMeshInstance: { node: leaf } };
    expect(isMeshUserDataInNodeSubtree(meshUserData, 1)).toBe(true);
  });

  it('returns false when node is not in the selected subtree', () => {
    const root = makeNode(1);
    const otherRoot = makeNode(99);
    const leaf = makeNode(3, root);
    const meshUserData = { originalMeshInstance: { node: leaf } };
    expect(isMeshUserDataInNodeSubtree(meshUserData, otherRoot.GetId())).toBe(false);
  });

  it('supports GetNode() fallback if present', () => {
    const node = makeNode(42);
    const meshUserData = { originalMeshInstance: { GetNode: () => node } };
    expect(isMeshUserDataInNodeSubtree(meshUserData, 42)).toBe(true);
  });

  it('returns false for missing/invalid mesh userData', () => {
    expect(isMeshUserDataInNodeSubtree(null, 0)).toBe(false);
    expect(isMeshUserDataInNodeSubtree({}, 0)).toBe(false);
  });
});

