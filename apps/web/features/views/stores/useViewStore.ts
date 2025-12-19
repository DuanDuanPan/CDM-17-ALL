/**
 * Story 2.3: Multi-View Synchronization
 * Zustand store for managing view mode and view-specific UI state
 */

'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ==========================================
// Type Definitions
// ==========================================

/**
 * View mode types - 'graph' | 'kanban' | 'gantt'
 * Task 2.2: ViewMode type definition
 */
export type ViewMode = 'graph' | 'kanban' | 'gantt';

/**
 * Gantt chart zoom levels for time scale
 */
export type GanttZoomLevel = 'day' | 'week' | 'month' | 'quarter';

/**
 * Kanban grouping options
 * - status: Group by task status (todo, in-progress, done)
 * - customStage: Group by custom stage field (Design, Development, Testing, etc.)
 */
export type KanbanGroupBy = 'status' | 'customStage';

/**
 * Task 2.3: Gantt view UI state
 */
export interface GanttViewState {
  /** Current zoom level for the time scale */
  zoomLevel: GanttZoomLevel;
  /** Set of expanded row IDs (for hierarchical display) */
  expandedRows: Set<string>;
  /** Whether to show unscheduled tasks sidebar */
  showUnscheduled: boolean;
  /** Whether to show dependency lines */
  showDependencies: boolean;
}

/**
 * Task 2.4: Kanban view UI state
 */
export interface KanbanViewState {
  /** Field to group tasks by */
  groupBy: KanbanGroupBy;
  /** Custom stage values for dynamic columns (when groupBy === 'customStage') */
  customStages: string[];
  /** Whether to show completed tasks */
  showCompleted: boolean;
}

/**
 * Complete view store state
 */
export interface ViewStoreState {
  // Current view mode
  viewMode: ViewMode;

  // Gantt view state (Task 2.3)
  gantt: GanttViewState;

  // Kanban view state (Task 2.4)
  kanban: KanbanViewState;
}

/**
 * View store actions
 */
export interface ViewStoreActions {
  // View mode actions
  setViewMode: (mode: ViewMode) => void;
  cycleViewMode: () => void;

  // Gantt actions (Task 2.3)
  setGanttZoomLevel: (level: GanttZoomLevel) => void;
  toggleGanttRow: (rowId: string) => void;
  expandAllGanttRows: () => void;
  collapseAllGanttRows: () => void;
  setShowUnscheduled: (show: boolean) => void;
  setShowDependencies: (show: boolean) => void;

  // Kanban actions (Task 2.4)
  setKanbanGroupBy: (groupBy: KanbanGroupBy) => void;
  setCustomStages: (stages: string[]) => void;
  addCustomStage: (stage: string) => void;
  removeCustomStage: (stage: string) => void;
  setShowCompleted: (show: boolean) => void;

  // Reset actions
  resetGanttState: () => void;
  resetKanbanState: () => void;
  resetAllViewState: () => void;
}

// ==========================================
// Default States
// ==========================================

const DEFAULT_GANTT_STATE: GanttViewState = {
  zoomLevel: 'week',
  expandedRows: new Set<string>(),
  showUnscheduled: true,
  showDependencies: true,
};

const DEFAULT_KANBAN_STATE: KanbanViewState = {
  groupBy: 'status',
  customStages: ['设计', '开发', '测试', '交付'], // Default Chinese stages
  showCompleted: true,
};

// ==========================================
// Zustand Store
// ==========================================

/**
 * Task 2.1: useViewStore - Zustand store for managing view state
 *
 * This store manages:
 * - Current view mode (graph, kanban, gantt)
 * - Gantt-specific UI state (zoom, expanded rows)
 * - Kanban-specific UI state (groupBy field, stages)
 *
 * Note: This is LOCAL UI state only. Graph data synchronization
 * is handled by Yjs via useGraphData hooks.
 */
export const useViewStore = create<ViewStoreState & ViewStoreActions>()(
  devtools(
    (set, get) => ({
      // ==========================================
      // Initial State
      // ==========================================
      viewMode: 'graph',
      gantt: { ...DEFAULT_GANTT_STATE },
      kanban: { ...DEFAULT_KANBAN_STATE },

      // ==========================================
      // View Mode Actions
      // ==========================================

      setViewMode: (mode: ViewMode) => set({ viewMode: mode }, false, 'setViewMode'),

      cycleViewMode: () => {
        const modes: ViewMode[] = ['graph', 'kanban', 'gantt'];
        const currentIndex = modes.indexOf(get().viewMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        set({ viewMode: modes[nextIndex] }, false, 'cycleViewMode');
      },

      // ==========================================
      // Gantt Actions (Task 2.3)
      // ==========================================

      setGanttZoomLevel: (level: GanttZoomLevel) =>
        set(
          (state) => ({
            gantt: { ...state.gantt, zoomLevel: level },
          }),
          false,
          'setGanttZoomLevel'
        ),

      toggleGanttRow: (rowId: string) =>
        set(
          (state) => {
            const newExpandedRows = new Set(state.gantt.expandedRows);
            if (newExpandedRows.has(rowId)) {
              newExpandedRows.delete(rowId);
            } else {
              newExpandedRows.add(rowId);
            }
            return {
              gantt: { ...state.gantt, expandedRows: newExpandedRows },
            };
          },
          false,
          'toggleGanttRow'
        ),

      expandAllGanttRows: () =>
        set(
          (state) => ({
            gantt: { ...state.gantt, expandedRows: new Set(['__all__']) },
          }),
          false,
          'expandAllGanttRows'
        ),

      collapseAllGanttRows: () =>
        set(
          (state) => ({
            gantt: { ...state.gantt, expandedRows: new Set() },
          }),
          false,
          'collapseAllGanttRows'
        ),

      setShowUnscheduled: (show: boolean) =>
        set(
          (state) => ({
            gantt: { ...state.gantt, showUnscheduled: show },
          }),
          false,
          'setShowUnscheduled'
        ),

      setShowDependencies: (show: boolean) =>
        set(
          (state) => ({
            gantt: { ...state.gantt, showDependencies: show },
          }),
          false,
          'setShowDependencies'
        ),

      // ==========================================
      // Kanban Actions (Task 2.4)
      // ==========================================

      setKanbanGroupBy: (groupBy: KanbanGroupBy) =>
        set(
          (state) => ({
            kanban: { ...state.kanban, groupBy },
          }),
          false,
          'setKanbanGroupBy'
        ),

      setCustomStages: (stages: string[]) =>
        set(
          (state) => ({
            kanban: { ...state.kanban, customStages: stages },
          }),
          false,
          'setCustomStages'
        ),

      addCustomStage: (stage: string) =>
        set(
          (state) => {
            if (state.kanban.customStages.includes(stage)) {
              return state; // Don't add duplicates
            }
            return {
              kanban: {
                ...state.kanban,
                customStages: [...state.kanban.customStages, stage],
              },
            };
          },
          false,
          'addCustomStage'
        ),

      removeCustomStage: (stage: string) =>
        set(
          (state) => ({
            kanban: {
              ...state.kanban,
              customStages: state.kanban.customStages.filter((s) => s !== stage),
            },
          }),
          false,
          'removeCustomStage'
        ),

      setShowCompleted: (show: boolean) =>
        set(
          (state) => ({
            kanban: { ...state.kanban, showCompleted: show },
          }),
          false,
          'setShowCompleted'
        ),

      // ==========================================
      // Reset Actions
      // ==========================================

      resetGanttState: () =>
        set({ gantt: { ...DEFAULT_GANTT_STATE } }, false, 'resetGanttState'),

      resetKanbanState: () =>
        set({ kanban: { ...DEFAULT_KANBAN_STATE } }, false, 'resetKanbanState'),

      resetAllViewState: () =>
        set(
          {
            viewMode: 'graph',
            gantt: { ...DEFAULT_GANTT_STATE },
            kanban: { ...DEFAULT_KANBAN_STATE },
          },
          false,
          'resetAllViewState'
        ),
    }),
    { name: 'view-store' }
  )
);

// ==========================================
// Selector Hooks (for performance optimization)
// ==========================================

/**
 * Select only the view mode (prevents re-renders from other state changes)
 */
export const useViewMode = () => useViewStore((state) => state.viewMode);

/**
 * Select only the Gantt state
 */
export const useGanttState = () => useViewStore((state) => state.gantt);

/**
 * Select only the Kanban state
 */
export const useKanbanState = () => useViewStore((state) => state.kanban);

/**
 * Check if a specific Gantt row is expanded
 */
export const useIsGanttRowExpanded = (rowId: string) =>
  useViewStore(
    (state) => state.gantt.expandedRows.has('__all__') || state.gantt.expandedRows.has(rowId)
  );

/**
 * Get current Kanban group by setting
 */
export const useKanbanGroupBy = () => useViewStore((state) => state.kanban.groupBy);

/**
 * Get available custom stages for Kanban
 */
export const useCustomStages = () => useViewStore((state) => state.kanban.customStages);
