/**
 * Story 5.2: Subtree Extractor Tests
 * Tests for extracting selected nodes as template structure
 */

import { describe, it, expect, vi } from 'vitest';
import { extractSubtreeAsTemplate, countTemplateNodes } from '../subtree-extractor';
import type { Cell, Node, Edge } from '@antv/x6';

// Mock X6 Node and Edge
function createMockNode(id: string, data: Record<string, unknown> = {}): Node {
  return {
    id,
    isNode: () => true,
    isEdge: () => false,
    getData: () => data,
  } as unknown as Node;
}

function createMockEdge(
  id: string,
  sourceId: string,
  targetId: string,
  data: Record<string, unknown> = {}
): Edge {
  return {
    id,
    isNode: () => false,
    isEdge: () => true,
    getSourceCellId: () => sourceId,
    getTargetCellId: () => targetId,
    getData: () => data,
  } as unknown as Edge;
}

describe('extractSubtreeAsTemplate', () => {
  // TC-5.2-FE-1: Single node extraction
  it('TC-5.2-FE-1: extracts single node correctly', () => {
    const node = createMockNode('node-1', {
      label: 'Test Node',
      nodeType: 'TASK',
      description: 'A test task',
      tags: ['tag1', 'tag2'],
    });

    const result = extractSubtreeAsTemplate([node], [node], []);

    expect(result.structure.rootNode.label).toBe('Test Node');
    expect(result.structure.rootNode.type).toBe('TASK');
    expect(result.structure.rootNode.description).toBe('A test task');
    expect(result.structure.rootNode.tags).toEqual(['tag1', 'tag2']);
    expect(result.structure.rootNode._tempId).toBeDefined();
    expect(result.structure.edges).toBeUndefined();
    expect(result.stats.totalNodes).toBe(1);
    expect(result.stats.addedDescendants).toBe(0);
  });

  // TC-5.2-FE-2: Parent-child hierarchy extraction
  it('TC-5.2-FE-2: preserves parent-child hierarchy', () => {
    const parent = createMockNode('parent', { label: 'Parent' });
    const child1 = createMockNode('child-1', { label: 'Child 1', parentId: 'parent' });
    const child2 = createMockNode('child-2', { label: 'Child 2', parentId: 'parent' });

    const allNodes = [parent, child1, child2];
    const selectedCells = [parent, child1, child2] as Cell[];

    const result = extractSubtreeAsTemplate(selectedCells, allNodes, []);

    expect(result.structure.rootNode.label).toBe('Parent');
    expect(result.structure.rootNode.children).toHaveLength(2);
    expect(result.structure.rootNode.children?.[0].label).toBe('Child 1');
    expect(result.structure.rootNode.children?.[1].label).toBe('Child 2');
  });

  it('Story 8.6: writes TemplateNode.order and sorts children by order (stable)', () => {
    const parent = createMockNode('parent', { label: 'Parent' });
    const childA = createMockNode('child-a', { label: 'A', parentId: 'parent', order: 2 });
    const childB = createMockNode('child-b', { label: 'B', parentId: 'parent', order: 0 });
    const childC = createMockNode('child-c', { label: 'C', parentId: 'parent', order: 0 });

    const allNodes = [parent, childA, childB, childC];
    const selectedCells = [parent, childA, childB, childC] as Cell[];

    const result = extractSubtreeAsTemplate(selectedCells, allNodes, []);

    expect(result.structure.rootNode.label).toBe('Parent');
    expect(result.structure.rootNode.children).toHaveLength(3);

    const labels = result.structure.rootNode.children!.map((n) => n.label);
    expect(labels).toEqual(['B', 'C', 'A']); // order 0 (B,C), then order 2 (A)

    const orders = result.structure.rootNode.children!.map((n) => n.order);
    expect(orders).toEqual([0, 0, 2]);
  });

  // TC-5.2-FE-3: Dependency edge preservation
  it('TC-5.2-FE-3: preserves dependency edges between selected nodes', () => {
    const node1 = createMockNode('node-1', { label: 'Node 1' });
    const node2 = createMockNode('node-2', { label: 'Node 2' });
    const depEdge = createMockEdge('edge-1', 'node-1', 'node-2', {
      metadata: { kind: 'dependency', dependencyType: 'FS' },
    });

    const allNodes = [node1, node2];
    const allEdges = [depEdge];
    const selectedCells = [node1, node2] as Cell[];

    const result = extractSubtreeAsTemplate(selectedCells, allNodes, allEdges);

    // Should create virtual container for multiple roots
    expect(result.structure.rootNode.label).toBe('模板');
    expect(result.structure.rootNode.children).toHaveLength(2);
    expect(result.structure.edges).toHaveLength(1);
    expect(result.structure.edges?.[0].kind).toBe('dependency');
    expect(result.structure.edges?.[0].dependencyType).toBe('FS');
  });

  // TC-5.2-FE-4: Excludes edges to unselected nodes (but node is auto-included if descendant)
  it('TC-5.2-FE-4: excludes edges to nodes outside expanded selection', () => {
    const node1 = createMockNode('node-1', { label: 'Selected Node' });
    const node2 = createMockNode('node-2', { label: 'Not Selected - Not Descendant' });
    const depEdge = createMockEdge('edge-1', 'node-1', 'node-2', {
      metadata: { kind: 'dependency', dependencyType: 'FS' },
    });

    const allNodes = [node1, node2];
    const allEdges = [depEdge];
    const selectedCells = [node1] as Cell[]; // Only node-1 selected, node-2 not a descendant

    const result = extractSubtreeAsTemplate(selectedCells, allNodes, allEdges);

    expect(result.structure.edges).toBeUndefined();
  });

  // TC-5.2-FE-5: Sanitizes metadata
  it('TC-5.2-FE-5: sanitizes sensitive metadata fields', () => {
    const node = createMockNode('node-1', {
      label: 'Test',
      nodeType: 'REQUIREMENT',
      props: {
        priority: 'high',
        graphId: 'should-be-removed',
        creatorId: 'should-be-removed',
        createdAt: 'should-be-removed',
        updatedAt: 'should-be-removed',
        approval: { status: 'should-be-removed' },
        isEditing: true,
        isSelected: true,
      },
    });

    const result = extractSubtreeAsTemplate([node], [node], []);

    expect(result.structure.rootNode.metadata).toBeDefined();
    expect(result.structure.rootNode.metadata?.priority).toBe('high');
    expect(result.structure.rootNode.metadata?.graphId).toBeUndefined();
    expect(result.structure.rootNode.metadata?.creatorId).toBeUndefined();
    expect(result.structure.rootNode.metadata?.approval).toBeUndefined();
    expect(result.structure.rootNode.metadata?.isEditing).toBeUndefined();
  });

  // TC-5.2-FE-6: Multiple roots creates virtual container
  it('TC-5.2-FE-6: creates virtual container for multiple root nodes', () => {
    const root1 = createMockNode('root-1', { label: 'Root 1' });
    const root2 = createMockNode('root-2', { label: 'Root 2' });

    const selectedCells = [root1, root2] as Cell[];

    const result = extractSubtreeAsTemplate(selectedCells, [root1, root2], []);

    expect(result.structure.rootNode.label).toBe('模板');
    expect(result.structure.rootNode.children).toHaveLength(2);
    expect(result.structure.rootNode.children?.[0].label).toBe('Root 1');
    expect(result.structure.rootNode.children?.[1].label).toBe('Root 2');
  });

  // TC-5.2-FE-7: Throws on empty selection
  it('TC-5.2-FE-7: throws error when no nodes selected', () => {
    expect(() => extractSubtreeAsTemplate([], [], [])).toThrow('请先选择要保存的节点');
  });

  // TC-5.2-FE-8: Ignores ORDINARY node type
  it('TC-5.2-FE-8: omits type for ORDINARY nodes', () => {
    const node = createMockNode('node-1', {
      label: 'Ordinary Node',
      nodeType: 'ORDINARY',
    });

    const result = extractSubtreeAsTemplate([node], [node], []);

    expect(result.structure.rootNode.type).toBeUndefined();
  });

  // TC-5.2-FE-9: Deep nested hierarchy
  it('TC-5.2-FE-9: handles deeply nested hierarchy', () => {
    const grandparent = createMockNode('gp', { label: 'Grandparent' });
    const parent = createMockNode('p', { label: 'Parent', parentId: 'gp' });
    const child = createMockNode('c', { label: 'Child', parentId: 'p' });
    const grandchild = createMockNode('gc', { label: 'Grandchild', parentId: 'c' });

    const allNodes = [grandparent, parent, child, grandchild];
    const selectedCells = allNodes as Cell[];

    const result = extractSubtreeAsTemplate(selectedCells, allNodes, []);

    expect(result.structure.rootNode.label).toBe('Grandparent');
    expect(result.structure.rootNode.children?.[0].label).toBe('Parent');
    expect(result.structure.rootNode.children?.[0].children?.[0].label).toBe('Child');
    expect(result.structure.rootNode.children?.[0].children?.[0].children?.[0].label).toBe('Grandchild');
  });

  // TC-5.2-FE-10: Auto-includes descendants when selecting parent only
  it('TC-5.2-FE-10: auto-includes all descendants when selecting parent only', () => {
    const parent = createMockNode('parent', { label: 'Parent' });
    const child1 = createMockNode('child-1', { label: 'Child 1', parentId: 'parent' });
    const child2 = createMockNode('child-2', { label: 'Child 2', parentId: 'parent' });
    const grandchild = createMockNode('grandchild', { label: 'Grandchild', parentId: 'child-1' });

    const allNodes = [parent, child1, child2, grandchild];
    // Only select parent - children and grandchild should be auto-included
    const selectedCells = [parent] as Cell[];

    const result = extractSubtreeAsTemplate(selectedCells, allNodes, []);

    expect(result.structure.rootNode.label).toBe('Parent');
    expect(result.structure.rootNode.children).toHaveLength(2);
    expect(result.structure.rootNode.children?.[0].children?.[0].label).toBe('Grandchild');
    expect(result.stats.totalNodes).toBe(4);
    expect(result.stats.addedDescendants).toBe(3); // 3 nodes auto-added
  });

  // TC-5.2-FE-11: Returns correct stats for expansion
  it('TC-5.2-FE-11: returns correct stats for descendant expansion', () => {
    const root = createMockNode('root', { label: 'Root' });
    const child = createMockNode('child', { label: 'Child', parentId: 'root' });

    const result = extractSubtreeAsTemplate([root], [root, child], []);

    expect(result.stats.totalNodes).toBe(2);
    expect(result.stats.addedDescendants).toBe(1);
  });
});

describe('countTemplateNodes', () => {
  it('counts single node correctly', () => {
    const node = { label: 'Single' };
    expect(countTemplateNodes(node)).toBe(1);
  });

  it('counts nodes with children', () => {
    const node = {
      label: 'Root',
      children: [
        { label: 'Child 1' },
        { label: 'Child 2' },
      ],
    };
    expect(countTemplateNodes(node)).toBe(3);
  });

  it('counts deeply nested nodes', () => {
    const node = {
      label: 'Root',
      children: [
        {
          label: 'Level 1',
          children: [
            {
              label: 'Level 2',
              children: [{ label: 'Level 3' }],
            },
          ],
        },
      ],
    };
    expect(countTemplateNodes(node)).toBe(4);
  });
});
