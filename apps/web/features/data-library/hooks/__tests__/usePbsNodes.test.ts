/**
 * Story 9.2: PBS Nodes Hook Tests
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock GraphContext
vi.mock('@/contexts/GraphContext', () => ({
  useGraphContextOptional: vi.fn(),
}));

import { usePbsNodes } from '../usePbsNodes';
import { useGraphContextOptional } from '@/contexts/GraphContext';
import { NodeType } from '@cdm/types';

const mockUseGraphContextOptional = vi.mocked(useGraphContextOptional);

describe('usePbsNodes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no graph context', () => {
    mockUseGraphContextOptional.mockReturnValue(null);

    const { result } = renderHook(() => usePbsNodes());

    expect(result.current.pbsNodes).toEqual([]);
  });

  it('returns empty array when graph has no nodes', () => {
    const mockGraph = {
      getNodes: vi.fn().mockReturnValue([]),
      on: vi.fn(),
      off: vi.fn(),
    };
    mockUseGraphContextOptional.mockReturnValue({ graph: mockGraph } as any);

    const { result } = renderHook(() => usePbsNodes());

    expect(result.current.pbsNodes).toEqual([]);
  });

  it('filters and returns only PBS nodes', () => {
    const mockNodes = [
      {
        id: 'pbs-1',
        getData: () => ({ nodeType: NodeType.PBS, label: 'PBS 1' }),
      },
      {
        id: 'task-1',
        getData: () => ({ nodeType: NodeType.TASK, label: 'Task 1' }),
      },
      {
        id: 'pbs-2',
        getData: () => ({ nodeType: NodeType.PBS, label: 'PBS 2' }),
      },
    ];

    const mockGraph = {
      getNodes: vi.fn().mockReturnValue(mockNodes),
      on: vi.fn(),
      off: vi.fn(),
    };
    mockUseGraphContextOptional.mockReturnValue({ graph: mockGraph } as any);

    const { result } = renderHook(() => usePbsNodes());

    expect(result.current.pbsNodes).toHaveLength(2);
    expect(result.current.pbsNodes[0].label).toBe('PBS 1');
    expect(result.current.pbsNodes[1].label).toBe('PBS 2');
  });

  it('builds tree structure from parent-child relationships', () => {
    const mockNodes = [
      {
        id: 'parent',
        getData: () => ({ nodeType: NodeType.PBS, label: 'Parent', parentId: null }),
      },
      {
        id: 'child',
        getData: () => ({ nodeType: NodeType.PBS, label: 'Child', parentId: 'parent' }),
      },
    ];

    const mockGraph = {
      getNodes: vi.fn().mockReturnValue(mockNodes),
      on: vi.fn(),
      off: vi.fn(),
    };
    mockUseGraphContextOptional.mockReturnValue({ graph: mockGraph } as any);

    const { result } = renderHook(() => usePbsNodes());

    expect(result.current.pbsNodes).toHaveLength(1);
    expect(result.current.pbsNodes[0].id).toBe('parent');
    expect(result.current.pbsNodes[0].children).toHaveLength(1);
    expect(result.current.pbsNodes[0].children[0].id).toBe('child');
  });

  it('getDescendantIds returns all descendants including self', () => {
    const mockNodes = [
      {
        id: 'root',
        getData: () => ({ nodeType: NodeType.PBS, label: 'Root' }),
      },
      {
        id: 'child1',
        getData: () => ({ nodeType: NodeType.PBS, label: 'Child 1', parentId: 'root' }),
      },
      {
        id: 'grandchild',
        getData: () => ({ nodeType: NodeType.PBS, label: 'Grandchild', parentId: 'child1' }),
      },
    ];

    const mockGraph = {
      getNodes: vi.fn().mockReturnValue(mockNodes),
      on: vi.fn(),
      off: vi.fn(),
    };
    mockUseGraphContextOptional.mockReturnValue({ graph: mockGraph } as any);

    const { result } = renderHook(() => usePbsNodes());

    const descendants = result.current.getDescendantIds('root');
    expect(descendants).toContain('root');
    expect(descendants).toContain('child1');
    expect(descendants).toContain('grandchild');
    expect(descendants).toHaveLength(3);
  });
});
