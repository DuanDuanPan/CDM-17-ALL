/**
 * Story 9.2: Task Nodes Hook Tests
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock GraphContext
vi.mock('@/contexts/GraphContext', () => ({
  useGraphContextOptional: vi.fn(),
}));

import { useTaskNodes } from '../useTaskNodes';
import { useGraphContextOptional } from '@/contexts/GraphContext';
import { NodeType } from '@cdm/types';

const mockUseGraphContextOptional = vi.mocked(useGraphContextOptional);

describe('useTaskNodes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty groups when no graph context', () => {
    mockUseGraphContextOptional.mockReturnValue(null);

    const { result } = renderHook(() => useTaskNodes());

    expect(result.current.tasksByStatus.todo).toEqual([]);
    expect(result.current.tasksByStatus['in-progress']).toEqual([]);
    expect(result.current.tasksByStatus.done).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('returns empty groups when graph has no task nodes', () => {
    const mockGraph = {
      getNodes: vi.fn().mockReturnValue([]),
      on: vi.fn(),
      off: vi.fn(),
    };
    mockUseGraphContextOptional.mockReturnValue({ graph: mockGraph } as any);

    const { result } = renderHook(() => useTaskNodes());

    expect(result.current.totalCount).toBe(0);
  });

  it('groups tasks by status', () => {
    const mockNodes = [
      {
        id: 'task-1',
        getData: () => ({
          nodeType: NodeType.TASK,
          label: 'Todo Task',
          props: { status: 'todo' },
        }),
      },
      {
        id: 'task-2',
        getData: () => ({
          nodeType: NodeType.TASK,
          label: 'In Progress Task',
          props: { status: 'in-progress' },
        }),
      },
      {
        id: 'task-3',
        getData: () => ({
          nodeType: NodeType.TASK,
          label: 'Done Task',
          props: { status: 'done' },
        }),
      },
      {
        id: 'pbs-1',
        getData: () => ({
          nodeType: NodeType.PBS,
          label: 'PBS Node',
        }),
      },
    ];

    const mockGraph = {
      getNodes: vi.fn().mockReturnValue(mockNodes),
      on: vi.fn(),
      off: vi.fn(),
    };
    mockUseGraphContextOptional.mockReturnValue({ graph: mockGraph } as any);

    const { result } = renderHook(() => useTaskNodes());

    expect(result.current.tasksByStatus.todo).toHaveLength(1);
    expect(result.current.tasksByStatus['in-progress']).toHaveLength(1);
    expect(result.current.tasksByStatus.done).toHaveLength(1);
    expect(result.current.totalCount).toBe(3);
  });

  it('defaults to todo status when no status provided', () => {
    const mockNodes = [
      {
        id: 'task-1',
        getData: () => ({
          nodeType: NodeType.TASK,
          label: 'Task without status',
          props: {},
        }),
      },
    ];

    const mockGraph = {
      getNodes: vi.fn().mockReturnValue(mockNodes),
      on: vi.fn(),
      off: vi.fn(),
    };
    mockUseGraphContextOptional.mockReturnValue({ graph: mockGraph } as any);

    const { result } = renderHook(() => useTaskNodes());

    expect(result.current.tasksByStatus.todo).toHaveLength(1);
    expect(result.current.tasksByStatus.todo[0].label).toBe('Task without status');
  });

  it('extracts task properties correctly', () => {
    const mockNodes = [
      {
        id: 'task-1',
        getData: () => ({
          nodeType: NodeType.TASK,
          label: 'Full Task',
          props: {
            status: 'in-progress',
            priority: 'high',
            assigneeId: 'user-1',
            dueDate: '2024-12-31',
            deliverables: [{ name: 'Doc 1' }],
          },
        }),
      },
    ];

    const mockGraph = {
      getNodes: vi.fn().mockReturnValue(mockNodes),
      on: vi.fn(),
      off: vi.fn(),
    };
    mockUseGraphContextOptional.mockReturnValue({ graph: mockGraph } as any);

    const { result } = renderHook(() => useTaskNodes());

    const task = result.current.tasksByStatus['in-progress'][0];
    expect(task.priority).toBe('high');
    expect(task.assigneeId).toBe('user-1');
    expect(task.dueDate).toBe('2024-12-31');
    expect(task.deliverables).toHaveLength(1);
  });

  it('sorts tasks alphabetically within each group', () => {
    const mockNodes = [
      {
        id: 'task-z',
        getData: () => ({
          nodeType: NodeType.TASK,
          label: 'Z Task',
          props: { status: 'todo' },
        }),
      },
      {
        id: 'task-a',
        getData: () => ({
          nodeType: NodeType.TASK,
          label: 'A Task',
          props: { status: 'todo' },
        }),
      },
    ];

    const mockGraph = {
      getNodes: vi.fn().mockReturnValue(mockNodes),
      on: vi.fn(),
      off: vi.fn(),
    };
    mockUseGraphContextOptional.mockReturnValue({ graph: mockGraph } as any);

    const { result } = renderHook(() => useTaskNodes());

    expect(result.current.tasksByStatus.todo[0].label).toBe('A Task');
    expect(result.current.tasksByStatus.todo[1].label).toBe('Z Task');
  });
});
