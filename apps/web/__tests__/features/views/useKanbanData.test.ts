/**
 * Story 2.3: useKanbanData Hook Unit Tests
 * Tests for Kanban data transformation and grouping logic
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as Y from 'yjs';
import { NodeType } from '@cdm/types';
import type { YjsNodeData } from '@/features/collab/GraphSyncManager';

// We need to mock the useViewStore before importing useKanbanData
vi.mock('@/features/views/stores/useViewStore', () => ({
  useKanbanState: vi.fn(() => ({
    groupBy: 'status',
    customStages: ['设计', '开发', '测试', '交付'],
    showCompleted: true,
  })),
  useViewStore: vi.fn((selector) => {
    const state = {
      kanban: {
        groupBy: 'status',
        customStages: ['设计', '开发', '测试', '交付'],
        showCompleted: true,
      },
    };
    return selector ? selector(state) : state;
  }),
}));

import { useKanbanData } from '@/features/views/components/KanbanView/useKanbanData';
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
  props: Record<string, unknown> = {}
): YjsNodeData {
  return {
    id,
    x: 0,
    y: 0,
    label,
    nodeType,
    props,
    mindmapType: 'topic',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a Yjs document with test nodes
 */
function createYDocWithNodes(nodes: YjsNodeData[]): Y.Doc {
  const yDoc = new Y.Doc();
  const yNodes = yDoc.getMap<YjsNodeData>('nodes');

  nodes.forEach((node) => {
    yNodes.set(node.id, node);
  });

  return yDoc;
}

// ==========================================
// Tests
// ==========================================

describe('useKanbanData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should return empty columns when yDoc is null', () => {
      const { result } = renderHook(() => useKanbanData(null));

      expect(result.current.columns).toHaveLength(3); // status columns
      expect(result.current.totalTasks).toBe(0);
      result.current.columns.forEach((col) => {
        expect(col.cards).toHaveLength(0);
      });
    });

    it('should return empty columns when yDoc has no nodes', () => {
      const yDoc = new Y.Doc();

      const { result } = renderHook(() => useKanbanData(yDoc));

      expect(result.current.columns).toHaveLength(3);
      expect(result.current.totalTasks).toBe(0);
    });

    it('should only include TASK nodes', () => {
      const yDoc = createYDocWithNodes([
        createMockNode('task-1', 'Task 1', NodeType.TASK, { status: 'todo' }),
        createMockNode('ordinary-1', 'Regular Node', NodeType.ORDINARY),
        createMockNode('req-1', 'Requirement', NodeType.REQUIREMENT),
        createMockNode('task-2', 'Task 2', NodeType.TASK, { status: 'done' }),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      expect(result.current.totalTasks).toBe(2);
    });
  });

  describe('Status Grouping', () => {
    it('should group tasks by status', () => {
      const yDoc = createYDocWithNodes([
        createMockNode('t1', 'Todo Task', NodeType.TASK, { status: 'todo' }),
        createMockNode('t2', 'In Progress Task', NodeType.TASK, { status: 'in-progress' }),
        createMockNode('t3', 'Done Task', NodeType.TASK, { status: 'done' }),
        createMockNode('t4', 'Another Todo', NodeType.TASK, { status: 'todo' }),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      const todoColumn = result.current.columns.find((c) => c.id === 'todo');
      const inProgressColumn = result.current.columns.find((c) => c.id === 'in-progress');
      const doneColumn = result.current.columns.find((c) => c.id === 'done');

      expect(todoColumn?.cards).toHaveLength(2);
      expect(inProgressColumn?.cards).toHaveLength(1);
      expect(doneColumn?.cards).toHaveLength(1);
    });

    it('should default to todo status when status is missing', () => {
      const yDoc = createYDocWithNodes([
        createMockNode('t1', 'No Status Task', NodeType.TASK, {}),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      const todoColumn = result.current.columns.find((c) => c.id === 'todo');
      expect(todoColumn?.cards).toHaveLength(1);
    });

    it('should return all three status columns in order', () => {
      const yDoc = new Y.Doc();

      const { result } = renderHook(() => useKanbanData(yDoc));

      expect(result.current.columns).toHaveLength(3);
      expect(result.current.columns[0].id).toBe('todo');
      expect(result.current.columns[0].title).toBe('待办');
      expect(result.current.columns[1].id).toBe('in-progress');
      expect(result.current.columns[1].title).toBe('进行中');
      expect(result.current.columns[2].id).toBe('done');
      expect(result.current.columns[2].title).toBe('已完成');
    });
  });

  describe('Custom Stage Grouping', () => {
    beforeEach(() => {
      // Mock groupBy as customStage
      vi.mocked(viewStore.useKanbanState).mockReturnValue({
        groupBy: 'customStage',
        customStages: ['设计', '开发', '测试'],
        showCompleted: true,
      });
    });

    it('should group tasks by customStage', () => {
      const yDoc = createYDocWithNodes([
        createMockNode('t1', 'Design Task', NodeType.TASK, { customStage: '设计' }),
        createMockNode('t2', 'Dev Task', NodeType.TASK, { customStage: '开发' }),
        createMockNode('t3', 'Test Task', NodeType.TASK, { customStage: '测试' }),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      expect(result.current.columns).toHaveLength(3);
      expect(result.current.columns.find((c) => c.id === '设计')?.cards).toHaveLength(1);
      expect(result.current.columns.find((c) => c.id === '开发')?.cards).toHaveLength(1);
      expect(result.current.columns.find((c) => c.id === '测试')?.cards).toHaveLength(1);
    });

    it('should put unassigned tasks in unassigned column', () => {
      const yDoc = createYDocWithNodes([
        createMockNode('t1', 'Design Task', NodeType.TASK, { customStage: '设计' }),
        createMockNode('t2', 'No Stage Task', NodeType.TASK, {}),
        createMockNode('t3', 'Unknown Stage', NodeType.TASK, { customStage: '未知阶段' }),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      const unassignedColumn = result.current.columns.find(
        (c) => c.id === '__unassigned__'
      );
      expect(unassignedColumn).toBeDefined();
      expect(unassignedColumn?.cards).toHaveLength(1);
      expect(unassignedColumn?.title).toBe('未分配');

      const unknownStageColumn = result.current.columns.find(
        (c) => c.id === '未知阶段'
      );
      expect(unknownStageColumn).toBeDefined();
      expect(unknownStageColumn?.cards).toHaveLength(1);
    });
  });

  describe('Show Completed Filter', () => {
    beforeEach(() => {
      vi.mocked(viewStore.useKanbanState).mockReturnValue({
        groupBy: 'status',
        customStages: ['设计', '开发', '测试', '交付'],
        showCompleted: false, // Hide completed
      });
    });

    it('should filter out done tasks when showCompleted is false', () => {
      const yDoc = createYDocWithNodes([
        createMockNode('t1', 'Todo Task', NodeType.TASK, { status: 'todo' }),
        createMockNode('t2', 'Done Task', NodeType.TASK, { status: 'done' }),
        createMockNode('t3', 'In Progress', NodeType.TASK, { status: 'in-progress' }),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      expect(result.current.totalTasks).toBe(2);
      const doneColumn = result.current.columns.find((c) => c.id === 'done');
      expect(doneColumn?.cards).toHaveLength(0);
    });
  });

  describe('Card Data Extraction', () => {
    it('should extract all task properties correctly', () => {
      const dueDate = '2025-01-15T00:00:00Z';
      const startDate = '2025-01-01T00:00:00Z';

      const yDoc = createYDocWithNodes([
        createMockNode('t1', 'Full Task', NodeType.TASK, {
          status: 'in-progress',
          assigneeId: 'user-123',
          dueDate,
          startDate,
          priority: 'high',
          customStage: '开发',
          progress: 50,
        }),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      const card = result.current.columns
        .flatMap((c) => c.cards)
        .find((c) => c.id === 't1');

      expect(card).toBeDefined();
      expect(card?.label).toBe('Full Task');
      expect(card?.status).toBe('in-progress');
      expect(card?.assigneeId).toBe('user-123');
      expect(card?.dueDate).toBe(dueDate);
      expect(card?.startDate).toBe(startDate);
      expect(card?.priority).toBe('high');
      expect(card?.customStage).toBe('开发');
      expect(card?.progress).toBe(50);
    });
  });

  describe('moveCard Action', () => {
    it('should update node status in Yjs when moving card', () => {
      vi.mocked(viewStore.useKanbanState).mockReturnValue({
        groupBy: 'status',
        customStages: ['设计', '开发', '测试', '交付'],
        showCompleted: true,
      });

      const yDoc = createYDocWithNodes([
        createMockNode('t1', 'Todo Task', NodeType.TASK, { status: 'todo' }),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      // Move card from todo to in-progress
      act(() => {
        result.current.moveCard('t1', 'in-progress');
      });

      // Check Yjs was updated
      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const updatedNode = yNodes.get('t1');

      expect(updatedNode?.props).toHaveProperty('status', 'in-progress');
    });

    it('should update customStage in Yjs when moving card (customStage groupBy)', () => {
      vi.mocked(viewStore.useKanbanState).mockReturnValue({
        groupBy: 'customStage',
        customStages: ['设计', '开发', '测试'],
        showCompleted: true,
      });

      const yDoc = createYDocWithNodes([
        createMockNode('t1', 'Design Task', NodeType.TASK, {
          status: 'todo',
          customStage: '设计',
        }),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      // Move card from 设计 to 开发
      act(() => {
        result.current.moveCard('t1', '开发');
      });

      // Check Yjs was updated
      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const updatedNode = yNodes.get('t1');

      expect(updatedNode?.props).toHaveProperty('customStage', '开发');
    });

    it('should not update if card does not exist', () => {
      const yDoc = createYDocWithNodes([]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      // Should not throw
      act(() => {
        result.current.moveCard('non-existent', 'done');
      });
    });

    it('should not update non-TASK nodes', () => {
      const yDoc = createYDocWithNodes([
        createMockNode('n1', 'Ordinary Node', NodeType.ORDINARY),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      act(() => {
        result.current.moveCard('n1', 'done');
      });

      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const node = yNodes.get('n1');
      expect(node?.props).not.toHaveProperty('status');
    });
  });

  describe('updateCard Action', () => {
    it('should update card properties in Yjs', () => {
      vi.mocked(viewStore.useKanbanState).mockReturnValue({
        groupBy: 'status',
        customStages: ['设计', '开发', '测试', '交付'],
        showCompleted: true,
      });

      const yDoc = createYDocWithNodes([
        createMockNode('t1', 'Task', NodeType.TASK, { status: 'todo' }),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      act(() => {
        result.current.updateCard('t1', {
          priority: 'high',
          progress: 25,
          dueDate: '2025-02-01T00:00:00Z',
        });
      });

      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const updatedNode = yNodes.get('t1');

      expect(updatedNode?.props).toMatchObject({
        status: 'todo',
        priority: 'high',
        progress: 25,
        dueDate: '2025-02-01T00:00:00Z',
      });
    });

    it('should preserve existing properties when updating', () => {
      const yDoc = createYDocWithNodes([
        createMockNode('t1', 'Task', NodeType.TASK, {
          status: 'in-progress',
          priority: 'low',
          assigneeId: 'user-1',
        }),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      act(() => {
        result.current.updateCard('t1', { progress: 50 });
      });

      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const updatedNode = yNodes.get('t1');

      // Existing properties should be preserved
      expect(updatedNode?.props).toMatchObject({
        status: 'in-progress',
        priority: 'low',
        assigneeId: 'user-1',
        progress: 50,
      });
    });
  });

  describe('Realtime Sync Verification', () => {
    it('should reflect status changes from Yjs (Mindmap -> Kanban)', async () => {
      const yDoc = createYDocWithNodes([
        createMockNode('t1', 'Task 1', NodeType.TASK, { status: 'todo' }),
      ]);

      const { result } = renderHook(() => useKanbanData(yDoc));

      const todoColumn = result.current.columns.find((c) => c.id === 'todo');
      expect(todoColumn?.cards).toHaveLength(1);

      const yNodes = yDoc.getMap<YjsNodeData>('nodes');
      const node = yNodes.get('t1')!;

      act(() => {
        yDoc.transact(() => {
          yNodes.set('t1', {
            ...node,
            props: {
              ...(node.props || {}),
              status: 'done',
            },
            updatedAt: new Date().toISOString(),
          });
        });
      });

      await waitFor(() => {
        const doneColumn = result.current.columns.find((c) => c.id === 'done');
        expect(doneColumn?.cards).toHaveLength(1);
      });
    });
  });

  describe('Performance', () => {
    it('should transform 500 tasks within 100ms', () => {
      const tasks = Array.from({ length: 500 }, (_, i) =>
        createMockNode(`t-${i}`, `Task ${i}`, NodeType.TASK, { status: 'todo' })
      );
      const yDoc = createYDocWithNodes(tasks);

      const start = performance.now();
      renderHook(() => useKanbanData(yDoc));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
