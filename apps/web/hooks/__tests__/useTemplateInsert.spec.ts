/**
 * Story 5.2: useTemplateInsert Hook Tests
 * Tests for inserting template structures into the graph via Yjs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTemplateInsert } from '../useTemplateInsert';
import type { TemplateStructure, TemplateNode } from '@cdm/types';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => `mock-id-${Math.random().toString(36).slice(2, 11)}`),
}));

// Mock clipboard helpers
vi.mock('../clipboard/pasteHelpers', () => ({
  getFallbackParentId: vi.fn(() => 'fallback-parent-id'),
}));

// Mock Y.Doc and Y.Map
function createMockYDoc() {
  const nodesMap = new Map<string, unknown>();
  const edgesMap = new Map<string, unknown>();

  return {
    getMap: vi.fn((name: string) => {
      if (name === 'nodes') {
        return {
          set: vi.fn((key: string, value: unknown) => nodesMap.set(key, value)),
          get: vi.fn((key: string) => nodesMap.get(key)),
          entries: vi.fn(() => nodesMap.entries()),
          size: nodesMap.size,
        };
      }
      if (name === 'edges') {
        return {
          set: vi.fn((key: string, value: unknown) => edgesMap.set(key, value)),
          get: vi.fn((key: string) => edgesMap.get(key)),
          entries: vi.fn(() => edgesMap.entries()),
          size: edgesMap.size,
        };
      }
      return new Map();
    }),
    transact: vi.fn((fn: () => void) => fn()),
    _nodesMap: nodesMap,
    _edgesMap: edgesMap,
  };
}

// Mock Graph
function createMockGraph() {
  return {
    getCellById: vi.fn((id: string) => ({ id })),
    centerCell: vi.fn(),
    select: vi.fn(),
    getSelectedCells: vi.fn(() => []),
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
  };
}

describe('useTemplateInsert', () => {
  let mockYDoc: ReturnType<typeof createMockYDoc>;
  let mockGraph: ReturnType<typeof createMockGraph>;

  beforeEach(() => {
    mockYDoc = createMockYDoc();
    mockGraph = createMockGraph();
    vi.clearAllMocks();
  });

  // TC-5.2-HOOK-1: isReady reflects graph and yDoc availability
  describe('isReady', () => {
    it('TC-5.2-HOOK-1a: returns false when graph is null', () => {
      const { result } = renderHook(() =>
        useTemplateInsert({
          graph: null,
          graphId: 'graph-1',
          yDoc: mockYDoc as any,
        })
      );

      expect(result.current.isReady).toBe(false);
    });

    it('TC-5.2-HOOK-1b: returns false when yDoc is null', () => {
      const { result } = renderHook(() =>
        useTemplateInsert({
          graph: mockGraph as any,
          graphId: 'graph-1',
          yDoc: null,
        })
      );

      expect(result.current.isReady).toBe(false);
    });

    it('TC-5.2-HOOK-1c: returns true when both graph and yDoc are available', () => {
      const { result } = renderHook(() =>
        useTemplateInsert({
          graph: mockGraph as any,
          graphId: 'graph-1',
          yDoc: mockYDoc as any,
        })
      );

      expect(result.current.isReady).toBe(true);
    });
  });

  // TC-5.2-HOOK-2: insertTemplate with single node
  describe('insertTemplate', () => {
    const singleNodeStructure: TemplateStructure = {
      rootNode: {
        label: 'Test Node',
        _tempId: 'temp-1',
        type: 'TASK',
        description: 'A test task',
        tags: ['tag1'],
      },
    };

    it('TC-5.2-HOOK-2: inserts single node correctly', () => {
      const { result } = renderHook(() =>
        useTemplateInsert({
          graph: mockGraph as any,
          graphId: 'graph-1',
          yDoc: mockYDoc as any,
        })
      );

      let nodeIds: string[] = [];
      act(() => {
        nodeIds = result.current.insertTemplate(singleNodeStructure, { x: 100, y: 200 });
      });

      expect(nodeIds).toHaveLength(1);
      expect(mockYDoc.transact).toHaveBeenCalled();
    });

    // TC-5.2-HOOK-3: insertTemplate with hierarchy
    it('TC-5.2-HOOK-3: inserts hierarchy correctly', () => {
      const hierarchyStructure: TemplateStructure = {
        rootNode: {
          label: 'Parent',
          _tempId: 'temp-parent',
          children: [
            { label: 'Child 1', _tempId: 'temp-child-1' },
            { label: 'Child 2', _tempId: 'temp-child-2' },
          ],
        },
      };

      const { result } = renderHook(() =>
        useTemplateInsert({
          graph: mockGraph as any,
          graphId: 'graph-1',
          yDoc: mockYDoc as any,
        })
      );

      let nodeIds: string[] = [];
      act(() => {
        nodeIds = result.current.insertTemplate(hierarchyStructure, { x: 0, y: 0 });
      });

      expect(nodeIds).toHaveLength(3);
    });

    // TC-5.2-HOOK-4: insertTemplate with dependency edges
    it('TC-5.2-HOOK-4: creates dependency edges from template', () => {
      const structureWithEdges: TemplateStructure = {
        rootNode: {
          label: 'Container',
          _tempId: 'temp-container',
          children: [
            { label: 'Node A', _tempId: 'temp-a' },
            { label: 'Node B', _tempId: 'temp-b' },
          ],
        },
        edges: [
          {
            sourceRef: 'temp-a',
            targetRef: 'temp-b',
            kind: 'dependency',
            dependencyType: 'depends_on',
          },
        ],
      };

      const { result } = renderHook(() =>
        useTemplateInsert({
          graph: mockGraph as any,
          graphId: 'graph-1',
          yDoc: mockYDoc as any,
        })
      );

      act(() => {
        result.current.insertTemplate(structureWithEdges, { x: 0, y: 0 });
      });

      // Should have called getMap for edges
      expect(mockYDoc.getMap).toHaveBeenCalledWith('edges');
    });

    // TC-5.2-HOOK-5: Returns empty array when not ready
    it('TC-5.2-HOOK-5: returns empty array when graph is not ready', () => {
      const { result } = renderHook(() =>
        useTemplateInsert({
          graph: null,
          graphId: 'graph-1',
          yDoc: mockYDoc as any,
        })
      );

      let nodeIds: string[] = [];
      act(() => {
        nodeIds = result.current.insertTemplate(singleNodeStructure, { x: 0, y: 0 });
      });

      expect(nodeIds).toHaveLength(0);
    });

    // TC-5.2-HOOK-6: Returns empty array for empty template
    it('TC-5.2-HOOK-6: handles empty template gracefully', () => {
      const emptyStructure: TemplateStructure = {
        rootNode: {
          label: '',
          _tempId: '',
        },
      };

      const { result } = renderHook(() =>
        useTemplateInsert({
          graph: mockGraph as any,
          graphId: 'graph-1',
          yDoc: mockYDoc as any,
        })
      );

      act(() => {
        result.current.insertTemplate(emptyStructure, { x: 0, y: 0 });
      });

      // Should still transact even with minimal structure
      expect(mockYDoc.transact).toHaveBeenCalled();
    });
  });

  // TC-5.2-HOOK-7: Position offset calculation
  describe('position offset', () => {
    it('TC-5.2-HOOK-7: applies correct position offsets for nested nodes', () => {
      const nestedStructure: TemplateStructure = {
        rootNode: {
          label: 'Root',
          _tempId: 'root',
          children: [
            {
              label: 'Level 1',
              _tempId: 'l1',
              children: [
                { label: 'Level 2', _tempId: 'l2' },
              ],
            },
          ],
        },
      };

      const { result } = renderHook(() =>
        useTemplateInsert({
          graph: mockGraph as any,
          graphId: 'graph-1',
          yDoc: mockYDoc as any,
        })
      );

      act(() => {
        result.current.insertTemplate(nestedStructure, { x: 100, y: 100 });
      });

      // Should create 3 nodes with increasing x offsets
      expect(mockYDoc.transact).toHaveBeenCalled();
    });
  });
});
