/**
 * Story 2.3: useViewStore Unit Tests
 * Tests for view mode and view-specific UI state management
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useViewStore,
  useViewMode,
  useGanttState,
  useKanbanState,
  useIsGanttRowExpanded,
  useKanbanGroupBy,
  useCustomStages,
} from '@/features/views/stores/useViewStore';

describe('useViewStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const { result } = renderHook(() => useViewStore());
    act(() => {
      result.current.resetAllViewState();
    });
  });

  describe('Initial State', () => {
    it('should initialize with graph view mode', () => {
      const { result } = renderHook(() => useViewStore());
      expect(result.current.viewMode).toBe('graph');
    });

    it('should initialize Gantt state with defaults', () => {
      const { result } = renderHook(() => useViewStore());
      expect(result.current.gantt.zoomLevel).toBe('week');
      expect(result.current.gantt.expandedRows.size).toBe(0);
      expect(result.current.gantt.showUnscheduled).toBe(true);
      expect(result.current.gantt.showDependencies).toBe(true);
    });

    it('should initialize Kanban state with defaults', () => {
      const { result } = renderHook(() => useViewStore());
      expect(result.current.kanban.groupBy).toBe('status');
      expect(result.current.kanban.customStages).toEqual(['设计', '开发', '测试', '交付']);
      expect(result.current.kanban.showCompleted).toBe(true);
    });
  });

  describe('View Mode Actions', () => {
    it('should set view mode to kanban', () => {
      const { result } = renderHook(() => useViewStore());

      act(() => {
        result.current.setViewMode('kanban');
      });

      expect(result.current.viewMode).toBe('kanban');
    });

    it('should set view mode to gantt', () => {
      const { result } = renderHook(() => useViewStore());

      act(() => {
        result.current.setViewMode('gantt');
      });

      expect(result.current.viewMode).toBe('gantt');
    });

    it('should cycle through view modes', () => {
      const { result } = renderHook(() => useViewStore());

      // graph -> kanban
      act(() => {
        result.current.cycleViewMode();
      });
      expect(result.current.viewMode).toBe('kanban');

      // kanban -> gantt
      act(() => {
        result.current.cycleViewMode();
      });
      expect(result.current.viewMode).toBe('gantt');

      // gantt -> graph (wrap around)
      act(() => {
        result.current.cycleViewMode();
      });
      expect(result.current.viewMode).toBe('graph');
    });
  });

  describe('Gantt Actions (Task 2.3)', () => {
    it('should set zoom level', () => {
      const { result } = renderHook(() => useViewStore());

      act(() => {
        result.current.setGanttZoomLevel('month');
      });

      expect(result.current.gantt.zoomLevel).toBe('month');
    });

    it('should support all zoom levels', () => {
      const { result } = renderHook(() => useViewStore());
      const zoomLevels = ['day', 'week', 'month', 'quarter'] as const;

      zoomLevels.forEach((level) => {
        act(() => {
          result.current.setGanttZoomLevel(level);
        });
        expect(result.current.gantt.zoomLevel).toBe(level);
      });
    });

    it('should toggle Gantt row expansion', () => {
      const { result } = renderHook(() => useViewStore());

      // Expand row
      act(() => {
        result.current.toggleGanttRow('task-1');
      });
      expect(result.current.gantt.expandedRows.has('task-1')).toBe(true);

      // Collapse row
      act(() => {
        result.current.toggleGanttRow('task-1');
      });
      expect(result.current.gantt.expandedRows.has('task-1')).toBe(false);
    });

    it('should expand multiple rows independently', () => {
      const { result } = renderHook(() => useViewStore());

      act(() => {
        result.current.toggleGanttRow('task-1');
        result.current.toggleGanttRow('task-2');
      });

      expect(result.current.gantt.expandedRows.has('task-1')).toBe(true);
      expect(result.current.gantt.expandedRows.has('task-2')).toBe(true);
    });

    it('should expand all Gantt rows', () => {
      const { result } = renderHook(() => useViewStore());

      act(() => {
        result.current.expandAllGanttRows();
      });

      expect(result.current.gantt.expandedRows.has('__all__')).toBe(true);
    });

    it('should collapse all Gantt rows', () => {
      const { result } = renderHook(() => useViewStore());

      // First expand some rows
      act(() => {
        result.current.toggleGanttRow('task-1');
        result.current.toggleGanttRow('task-2');
      });

      // Then collapse all
      act(() => {
        result.current.collapseAllGanttRows();
      });

      expect(result.current.gantt.expandedRows.size).toBe(0);
    });

    it('should toggle show unscheduled', () => {
      const { result } = renderHook(() => useViewStore());

      act(() => {
        result.current.setShowUnscheduled(false);
      });

      expect(result.current.gantt.showUnscheduled).toBe(false);
    });

    it('should toggle show dependencies', () => {
      const { result } = renderHook(() => useViewStore());

      act(() => {
        result.current.setShowDependencies(false);
      });

      expect(result.current.gantt.showDependencies).toBe(false);
    });
  });

  describe('Kanban Actions (Task 2.4)', () => {
    it('should set group by to customStage', () => {
      const { result } = renderHook(() => useViewStore());

      act(() => {
        result.current.setKanbanGroupBy('customStage');
      });

      expect(result.current.kanban.groupBy).toBe('customStage');
    });

    it('should set group by to status', () => {
      const { result } = renderHook(() => useViewStore());

      // First change to customStage
      act(() => {
        result.current.setKanbanGroupBy('customStage');
      });

      // Then back to status
      act(() => {
        result.current.setKanbanGroupBy('status');
      });

      expect(result.current.kanban.groupBy).toBe('status');
    });

    it('should set custom stages', () => {
      const { result } = renderHook(() => useViewStore());
      const newStages = ['Planning', 'Development', 'QA', 'Done'];

      act(() => {
        result.current.setCustomStages(newStages);
      });

      expect(result.current.kanban.customStages).toEqual(newStages);
    });

    it('should add custom stage', () => {
      const { result } = renderHook(() => useViewStore());

      act(() => {
        result.current.addCustomStage('审核');
      });

      expect(result.current.kanban.customStages).toContain('审核');
      expect(result.current.kanban.customStages.length).toBe(5);
    });

    it('should not add duplicate custom stage', () => {
      const { result } = renderHook(() => useViewStore());
      const initialLength = result.current.kanban.customStages.length;

      act(() => {
        result.current.addCustomStage('设计'); // Already exists
      });

      expect(result.current.kanban.customStages.length).toBe(initialLength);
    });

    it('should remove custom stage', () => {
      const { result } = renderHook(() => useViewStore());

      act(() => {
        result.current.removeCustomStage('测试');
      });

      expect(result.current.kanban.customStages).not.toContain('测试');
      expect(result.current.kanban.customStages.length).toBe(3);
    });

    it('should toggle show completed', () => {
      const { result } = renderHook(() => useViewStore());

      act(() => {
        result.current.setShowCompleted(false);
      });

      expect(result.current.kanban.showCompleted).toBe(false);
    });
  });

  describe('Reset Actions', () => {
    it('should reset Gantt state', () => {
      const { result } = renderHook(() => useViewStore());

      // Modify state
      act(() => {
        result.current.setGanttZoomLevel('day');
        result.current.toggleGanttRow('task-1');
        result.current.setShowUnscheduled(false);
      });

      // Reset
      act(() => {
        result.current.resetGanttState();
      });

      expect(result.current.gantt.zoomLevel).toBe('week');
      expect(result.current.gantt.expandedRows.size).toBe(0);
      expect(result.current.gantt.showUnscheduled).toBe(true);
    });

    it('should reset Kanban state', () => {
      const { result } = renderHook(() => useViewStore());

      // Modify state
      act(() => {
        result.current.setKanbanGroupBy('customStage');
        result.current.setCustomStages(['A', 'B', 'C']);
        result.current.setShowCompleted(false);
      });

      // Reset
      act(() => {
        result.current.resetKanbanState();
      });

      expect(result.current.kanban.groupBy).toBe('status');
      expect(result.current.kanban.customStages).toEqual(['设计', '开发', '测试', '交付']);
      expect(result.current.kanban.showCompleted).toBe(true);
    });

    it('should reset all view state', () => {
      const { result } = renderHook(() => useViewStore());

      // Modify all state
      act(() => {
        result.current.setViewMode('gantt');
        result.current.setGanttZoomLevel('month');
        result.current.setKanbanGroupBy('customStage');
      });

      // Reset all
      act(() => {
        result.current.resetAllViewState();
      });

      expect(result.current.viewMode).toBe('graph');
      expect(result.current.gantt.zoomLevel).toBe('week');
      expect(result.current.kanban.groupBy).toBe('status');
    });
  });

  describe('Selector Hooks', () => {
    it('useViewMode should return only view mode', () => {
      const { result } = renderHook(() => useViewMode());
      expect(result.current).toBe('graph');
    });

    it('useGanttState should return Gantt state', () => {
      const { result } = renderHook(() => useGanttState());
      expect(result.current.zoomLevel).toBe('week');
      expect(result.current.showUnscheduled).toBe(true);
    });

    it('useKanbanState should return Kanban state', () => {
      const { result } = renderHook(() => useKanbanState());
      expect(result.current.groupBy).toBe('status');
      expect(result.current.showCompleted).toBe(true);
    });

    it('useIsGanttRowExpanded should check row expansion', () => {
      const store = renderHook(() => useViewStore());

      // Expand a row
      act(() => {
        store.result.current.toggleGanttRow('task-1');
      });

      const { result: expanded } = renderHook(() => useIsGanttRowExpanded('task-1'));
      const { result: notExpanded } = renderHook(() => useIsGanttRowExpanded('task-2'));

      expect(expanded.current).toBe(true);
      expect(notExpanded.current).toBe(false);
    });

    it('useIsGanttRowExpanded should return true when all expanded', () => {
      const store = renderHook(() => useViewStore());

      act(() => {
        store.result.current.expandAllGanttRows();
      });

      const { result } = renderHook(() => useIsGanttRowExpanded('any-row'));
      expect(result.current).toBe(true);
    });

    it('useKanbanGroupBy should return groupBy value', () => {
      const { result } = renderHook(() => useKanbanGroupBy());
      expect(result.current).toBe('status');
    });

    it('useCustomStages should return custom stages', () => {
      const { result } = renderHook(() => useCustomStages());
      expect(result.current).toEqual(['设计', '开发', '测试', '交付']);
    });
  });

  describe('State Isolation', () => {
    it('changing Gantt state should not affect Kanban state', () => {
      const { result } = renderHook(() => useViewStore());
      const initialKanbanState = { ...result.current.kanban };

      act(() => {
        result.current.setGanttZoomLevel('day');
        result.current.toggleGanttRow('task-1');
      });

      expect(result.current.kanban.groupBy).toBe(initialKanbanState.groupBy);
      expect(result.current.kanban.showCompleted).toBe(initialKanbanState.showCompleted);
    });

    it('changing Kanban state should not affect Gantt state', () => {
      const { result } = renderHook(() => useViewStore());
      const initialGanttZoom = result.current.gantt.zoomLevel;

      act(() => {
        result.current.setKanbanGroupBy('customStage');
        result.current.addCustomStage('New Stage');
      });

      expect(result.current.gantt.zoomLevel).toBe(initialGanttZoom);
      expect(result.current.gantt.showDependencies).toBe(true);
    });
  });
});
