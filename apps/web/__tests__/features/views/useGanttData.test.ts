/**
 * Story 2.3: useGanttData Hook Unit Tests
 * Tests for Gantt data transformation and findGanttParent algorithm
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as Y from 'yjs';
import { NodeType } from '@cdm/types';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';

// Mock the useGanttState before importing useGanttData
vi.mock('@/features/views/stores/useViewStore', () => ({
  useGanttState: vi.fn(() => ({
    zoomLevel: 'week',
    expandedRows: new Set<string>(),
    showUnscheduled: true,
    showDependencies: true,
  })),
  useViewStore: vi.fn((selector) => {
    const state = {
      gantt: {
        zoomLevel: 'week',
        expandedRows: new Set<string>(),
        showUnscheduled: true,
        showDependencies: true,
      },
    };
    return selector ? selector(state) : state;
  }),
}));

import { useGanttData } from '@/features/views/components/GanttView/useGanttData';
import * as viewStore from '@/features/views/stores/useViewStore';

// ==========================================
// Test Utilities
// ==========================================

/**
 * Create a mock YjsNodeData for testing
 */
function createMockNode(
  id: string,
  label: string,
  nodeType: NodeType = NodeType.TASK,
  props: Record<string, unknown> = {},
  mindmapType: 'root' | 'topic' | 'subtopic' = 'topic'
): YjsNodeData {
  return {
    id,
    x: 0,
    y: 0,
    label,
    nodeType,
    props,
    mindmapType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a Yjs document with test nodes and edges
 */
function createYDocWithData(
  nodes: YjsNodeData[],
  edges: Array<{ id: string; source: string; target: string; metadata?: { kind: 'hierarchical' | 'dependency'; dependencyType?: string } }> = []
): Y.Doc {
  const yDoc = new Y.Doc();
  const yNodes = yDoc.getMap<YjsNodeData>('nodes');
  const yEdges = yDoc.getMap<{ id: string; source: string; target: string; type: string; metadata?: { kind: string; dependencyType?: string } }>('edges');

  nodes.forEach((node) => {
    yNodes.set(node.id, node);
  });

  edges.forEach((edge) => {
    yEdges.set(edge.id, {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.metadata?.kind === 'dependency' ? 'reference' : 'hierarchical',
      metadata: edge.metadata || { kind: 'hierarchical' },
    });
  });

  return yDoc;
}

// ==========================================
// Tests
// ==========================================

describe('useGanttData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should return empty data when yDoc is null', () => {
      const { result } = renderHook(() => useGanttData(null));

      expect(result.current.tasks).toHaveLength(0);
      expect(result.current.links).toHaveLength(0);
      expect(result.current.unscheduledTasks).toHaveLength(0);
      expect(result.current.totalTasks).toBe(0);
    });

    it('should return empty data when yDoc has no nodes', () => {
      const yDoc = new Y.Doc();

      const { result } = renderHook(() => useGanttData(yDoc));

      expect(result.current.tasks).toHaveLength(0);
      expect(result.current.totalTasks).toBe(0);
    });

    it('should only include TASK nodes', () => {
      const yDoc = createYDocWithData([
        createMockNode('task-1', 'Task 1', NodeType.TASK, {
          startDate: '2025-01-01T00:00:00Z',
          dueDate: '2025-01-05T00:00:00Z',
        }),
        createMockNode('ordinary-1', 'Regular Node', NodeType.ORDINARY),
        createMockNode('req-1', 'Requirement', NodeType.REQUIREMENT),
        createMockNode('task-2', 'Task 2', NodeType.TASK, {
          startDate: '2025-01-10T00:00:00Z',
          dueDate: '2025-01-15T00:00:00Z',
        }),
      ]);

      const { result } = renderHook(() => useGanttData(yDoc));

      expect(result.current.tasks).toHaveLength(2);
      expect(result.current.tasks.map((t) => t.id)).toContain('task-1');
      expect(result.current.tasks.map((t) => t.id)).toContain('task-2');
    });
  });

  describe('Date Handling', () => {
    it('should handle tasks with both startDate and dueDate', () => {
      const yDoc = createYDocWithData([
        createMockNode('t1', 'Full Date Task', NodeType.TASK, {
          startDate: '2025-01-01T00:00:00Z',
          dueDate: '2025-01-05T00:00:00Z',
        }),
      ]);

      const { result } = renderHook(() => useGanttData(yDoc));

      expect(result.current.tasks).toHaveLength(1);
      const task = result.current.tasks[0];
      expect(task.start_date.toISOString()).toContain('2025-01-01');
      expect(task.end_date.toISOString()).toContain('2025-01-05');
      expect(task.isDueDateOnly).toBeFalsy();
    });

    it('should fallback to 1-day duration when only dueDate exists', () => {
      const yDoc = createYDocWithData([
        createMockNode('t1', 'Due Date Only', NodeType.TASK, {
          dueDate: '2025-01-05T00:00:00Z',
        }),
      ]);

      const { result } = renderHook(() => useGanttData(yDoc));

      expect(result.current.tasks).toHaveLength(1);
      const task = result.current.tasks[0];
      expect(task.end_date.toISOString()).toContain('2025-01-05');
      expect(task.isDueDateOnly).toBe(true);
      expect(task.duration).toBe(1);
    });

    it('should put unscheduled tasks in sidebar when no dates', () => {
      const yDoc = createYDocWithData([
        createMockNode('t1', 'No Dates Task', NodeType.TASK, {}),
      ]);

      const { result } = renderHook(() => useGanttData(yDoc));

      expect(result.current.tasks).toHaveLength(0);
      expect(result.current.unscheduledTasks).toHaveLength(1);
      expect(result.current.unscheduledTasks[0].id).toBe('t1');
    });

    it('should hide unscheduled tasks when showUnscheduled is false', () => {
      vi.mocked(viewStore.useGanttState).mockReturnValue({
        zoomLevel: 'week',
        expandedRows: new Set<string>(),
        showUnscheduled: false, // Hide unscheduled
        showDependencies: true,
      });

      const yDoc = createYDocWithData([
        createMockNode('t1', 'No Dates Task', NodeType.TASK, {}),
      ]);

      const { result } = renderHook(() => useGanttData(yDoc));

      expect(result.current.unscheduledTasks).toHaveLength(0);
    });
  });

  describe('findGanttParent Algorithm', () => {
    it('should find direct TASK parent', () => {
      // Root -> Task A -> Task B
      const yDoc = createYDocWithData(
        [
          createMockNode('root', 'Root', NodeType.ORDINARY, {}, 'root'),
          createMockNode('task-a', 'Task A', NodeType.TASK, {
            startDate: '2025-01-01T00:00:00Z',
            dueDate: '2025-01-10T00:00:00Z',
          }),
          createMockNode('task-b', 'Task B', NodeType.TASK, {
            startDate: '2025-01-02T00:00:00Z',
            dueDate: '2025-01-05T00:00:00Z',
          }),
        ],
        [
          { id: 'e1', source: 'root', target: 'task-a' },
          { id: 'e2', source: 'task-a', target: 'task-b' },
        ]
      );

      const { result } = renderHook(() => useGanttData(yDoc));

      const taskB = result.current.tasks.find((t) => t.id === 'task-b');
      expect(taskB?.parent).toBe('task-a');
    });

    it('should skip non-TASK nodes to find parent', () => {
      // Root -> Task A -> PBS Node -> Detail Node -> Task B
      // In Gantt: Task B should have Task A as parent
      const yDoc = createYDocWithData(
        [
          createMockNode('root', 'Root', NodeType.ORDINARY, {}, 'root'),
          createMockNode('task-a', 'Task A', NodeType.TASK, {
            startDate: '2025-01-01T00:00:00Z',
            dueDate: '2025-01-20T00:00:00Z',
          }),
          createMockNode('pbs', 'PBS Node', NodeType.ORDINARY),
          createMockNode('detail', 'Detail Node', NodeType.ORDINARY),
          createMockNode('task-b', 'Task B', NodeType.TASK, {
            startDate: '2025-01-05T00:00:00Z',
            dueDate: '2025-01-10T00:00:00Z',
          }),
        ],
        [
          { id: 'e1', source: 'root', target: 'task-a' },
          { id: 'e2', source: 'task-a', target: 'pbs' },
          { id: 'e3', source: 'pbs', target: 'detail' },
          { id: 'e4', source: 'detail', target: 'task-b' },
        ]
      );

      const { result } = renderHook(() => useGanttData(yDoc));

      const taskB = result.current.tasks.find((t) => t.id === 'task-b');
      expect(taskB?.parent).toBe('task-a');
    });

    it('should use root as parent when no TASK ancestor', () => {
      // Root -> PBS Node -> Task A
      const yDoc = createYDocWithData(
        [
          createMockNode('root', 'Root', NodeType.ORDINARY, {}, 'root'),
          createMockNode('pbs', 'PBS Node', NodeType.ORDINARY),
          createMockNode('task-a', 'Task A', NodeType.TASK, {
            startDate: '2025-01-01T00:00:00Z',
            dueDate: '2025-01-10T00:00:00Z',
          }),
        ],
        [
          { id: 'e1', source: 'root', target: 'pbs' },
          { id: 'e2', source: 'pbs', target: 'task-a' },
        ]
      );

      const { result } = renderHook(() => useGanttData(yDoc));

      const taskA = result.current.tasks.find((t) => t.id === 'task-a');
      expect(taskA?.parent).toBe('root');
    });

    it('should handle complex hierarchy with multiple levels', () => {
      // Root -> Task A -> Ordinary -> Task B -> Ordinary -> Task C
      const yDoc = createYDocWithData(
        [
          createMockNode('root', 'Root', NodeType.ORDINARY, {}, 'root'),
          createMockNode('task-a', 'Task A', NodeType.TASK, {
            startDate: '2025-01-01T00:00:00Z',
            dueDate: '2025-01-30T00:00:00Z',
          }),
          createMockNode('ord-1', 'Ordinary 1', NodeType.ORDINARY),
          createMockNode('task-b', 'Task B', NodeType.TASK, {
            startDate: '2025-01-05T00:00:00Z',
            dueDate: '2025-01-20T00:00:00Z',
          }),
          createMockNode('ord-2', 'Ordinary 2', NodeType.ORDINARY),
          createMockNode('task-c', 'Task C', NodeType.TASK, {
            startDate: '2025-01-10T00:00:00Z',
            dueDate: '2025-01-15T00:00:00Z',
          }),
        ],
        [
          { id: 'e1', source: 'root', target: 'task-a' },
          { id: 'e2', source: 'task-a', target: 'ord-1' },
          { id: 'e3', source: 'ord-1', target: 'task-b' },
          { id: 'e4', source: 'task-b', target: 'ord-2' },
          { id: 'e5', source: 'ord-2', target: 'task-c' },
        ]
      );

      const { result } = renderHook(() => useGanttData(yDoc));

      const taskA = result.current.tasks.find((t) => t.id === 'task-a');
      const taskB = result.current.tasks.find((t) => t.id === 'task-b');
      const taskC = result.current.tasks.find((t) => t.id === 'task-c');

      expect(taskA?.parent).toBe('root');
      expect(taskB?.parent).toBe('task-a');
      expect(taskC?.parent).toBe('task-b');
    });

    it('should ignore dependency edges when determining hierarchy', () => {
      // Root -> Task A -> Task B (hierarchical)
      // Also add dependency edge Task B -> Task A (should be ignored for parent)
      const yDoc = createYDocWithData(
        [
          createMockNode('root', 'Root', NodeType.ORDINARY, {}, 'root'),
          createMockNode('task-a', 'Task A', NodeType.TASK, {
            startDate: '2025-01-01T00:00:00Z',
            dueDate: '2025-01-10T00:00:00Z',
          }),
          createMockNode('task-b', 'Task B', NodeType.TASK, {
            startDate: '2025-01-02T00:00:00Z',
            dueDate: '2025-01-05T00:00:00Z',
          }),
        ],
        [
          { id: 'dep-1', source: 'task-b', target: 'task-a', metadata: { kind: 'dependency', dependencyType: 'FS' } },
          { id: 'e1', source: 'root', target: 'task-a' },
          { id: 'e2', source: 'task-a', target: 'task-b' },
        ]
      );

      const { result } = renderHook(() => useGanttData(yDoc));

      const taskA = result.current.tasks.find((t) => t.id === 'task-a');
      const taskB = result.current.tasks.find((t) => t.id === 'task-b');

      expect(taskA?.parent).toBe('0');
      expect(taskB?.parent).toBe('task-a');
    });
  });

  describe('Dependency Links', () => {
    it('should create links between TASK nodes', () => {
      const yDoc = createYDocWithData(
        [
          createMockNode('root', 'Root', NodeType.ORDINARY, {}, 'root'),
          createMockNode('task-a', 'Task A', NodeType.TASK, {
            startDate: '2025-01-01T00:00:00Z',
            dueDate: '2025-01-05T00:00:00Z',
          }),
          createMockNode('task-b', 'Task B', NodeType.TASK, {
            startDate: '2025-01-06T00:00:00Z',
            dueDate: '2025-01-10T00:00:00Z',
          }),
        ],
        [
          { id: 'e1', source: 'root', target: 'task-a' }, // hierarchical (default)
          { id: 'e2', source: 'root', target: 'task-b' }, // hierarchical (default)
          // Dependency edge (task-a finishes before task-b)
          { id: 'dep-1', source: 'task-a', target: 'task-b', metadata: { kind: 'dependency', dependencyType: 'FS' } },
        ]
      );

      const { result } = renderHook(() => useGanttData(yDoc));

      // The dependency link should be included
      const depLink = result.current.links.find((l) => l.id === 'dep-1');
      expect(depLink).toBeDefined();
      expect(depLink?.source).toBe('task-a');
      expect(depLink?.target).toBe('task-b');
    });

    it('should not create links when showDependencies is false', () => {
      vi.mocked(viewStore.useGanttState).mockReturnValue({
        zoomLevel: 'week',
        expandedRows: new Set<string>(),
        showUnscheduled: true,
        showDependencies: false, // Hide dependencies
      });

      const yDoc = createYDocWithData(
        [
          createMockNode('task-a', 'Task A', NodeType.TASK, {
            startDate: '2025-01-01T00:00:00Z',
            dueDate: '2025-01-05T00:00:00Z',
          }),
          createMockNode('task-b', 'Task B', NodeType.TASK, {
            startDate: '2025-01-06T00:00:00Z',
            dueDate: '2025-01-10T00:00:00Z',
          }),
        ],
        [{ id: 'dep-1', source: 'task-a', target: 'task-b', metadata: { kind: 'dependency', dependencyType: 'FS' } }]
      );

      const { result } = renderHook(() => useGanttData(yDoc));

      expect(result.current.links).toHaveLength(0);
    });
  });

  describe('Task Properties', () => {
    it('should extract all task properties correctly', () => {
      const yDoc = createYDocWithData([
        createMockNode('t1', 'Full Task', NodeType.TASK, {
          startDate: '2025-01-01T00:00:00Z',
          dueDate: '2025-01-10T00:00:00Z',
          progress: 50,
          priority: 'high',
          assigneeId: 'user-123',
          status: 'in-progress',
        }),
      ]);

      const { result } = renderHook(() => useGanttData(yDoc));

      const task = result.current.tasks[0];
      expect(task.text).toBe('Full Task');
      expect(task.progress).toBe(0.5); // Converted to 0-1 range
      expect(task.priority).toBe('high');
      expect(task.assigneeId).toBe('user-123');
      expect(task.status).toBe('in-progress');
    });

    it('should calculate duration correctly', () => {
      const yDoc = createYDocWithData([
        createMockNode('t1', 'Week Task', NodeType.TASK, {
          startDate: '2025-01-01T00:00:00Z',
          dueDate: '2025-01-08T00:00:00Z', // 7 days
        }),
      ]);

      const { result } = renderHook(() => useGanttData(yDoc));

      const task = result.current.tasks[0];
      expect(task.duration).toBe(7);
    });
  });

  describe('Update Functions', () => {
    it('should provide updateTaskDates function', () => {
      const yDoc = createYDocWithData([
        createMockNode('t1', 'Task', NodeType.TASK, {
          startDate: '2025-01-01T00:00:00Z',
          dueDate: '2025-01-05T00:00:00Z',
        }),
      ]);

      const { result } = renderHook(() => useGanttData(yDoc));

      expect(typeof result.current.updateTaskDates).toBe('function');
    });

    it('should provide updateTaskProgress function', () => {
      const yDoc = createYDocWithData([
        createMockNode('t1', 'Task', NodeType.TASK, {
          startDate: '2025-01-01T00:00:00Z',
          dueDate: '2025-01-05T00:00:00Z',
        }),
      ]);

      const { result } = renderHook(() => useGanttData(yDoc));

      expect(typeof result.current.updateTaskProgress).toBe('function');
    });

    it('should update task dates in Yjs (Gantt -> Mindmap)', () => {
      const yDoc = createYDocWithData([
        createMockNode('t1', 'Task', NodeType.TASK, {
          startDate: '2025-01-01T00:00:00Z',
          dueDate: '2025-01-05T00:00:00Z',
        }),
      ]);

      const { result } = renderHook(() => useGanttData(yDoc));

      act(() => {
        result.current.updateTaskDates(
          't1',
          new Date('2025-02-01T00:00:00Z'),
          new Date('2025-02-03T00:00:00Z')
        );
      });

      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const updatedNode = yNodes.get('t1');

      expect(updatedNode?.props).toMatchObject({
        startDate: '2025-02-01T00:00:00Z',
        dueDate: '2025-02-03T00:00:00Z',
      });
    });
  });

  describe('Realtime Sync Verification', () => {
    it('should reflect date updates from Yjs (Mindmap -> Gantt)', async () => {
      const yDoc = createYDocWithData([
        createMockNode('t1', 'Task', NodeType.TASK, {
          startDate: '2025-01-01T00:00:00Z',
          dueDate: '2025-01-05T00:00:00Z',
        }),
      ]);

      const { result } = renderHook(() => useGanttData(yDoc));

      expect(result.current.tasks).toHaveLength(1);
      const initialEnd = result.current.tasks[0].end_date.toISOString();

      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const node = yNodes.get('t1')!;

      act(() => {
        yDoc.transact(() => {
          yNodes.set('t1', {
            ...node,
            props: {
              ...(node.props || {}),
              dueDate: '2025-01-20T00:00:00Z',
            },
            updatedAt: new Date().toISOString(),
          });
        });
      });

      await waitFor(() => {
        const updatedEnd = result.current.tasks[0].end_date.toISOString();
        expect(updatedEnd).not.toBe(initialEnd);
        expect(updatedEnd).toContain('2025-01-20');
      });
    });
  });

  describe('Performance', () => {
    it('should transform 500 tasks within 100ms', () => {
      const nodes = Array.from({ length: 500 }, (_, i) =>
        createMockNode(`t-${i}`, `Task ${i}`, NodeType.TASK, {
          startDate: '2025-01-01T00:00:00Z',
          dueDate: '2025-01-02T00:00:00Z',
        })
      );
      const yDoc = createYDocWithData(nodes);

      const start = performance.now();
      renderHook(() => useGanttData(yDoc));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
