/**
 * Story 2.3: Multi-View Synchronization
 * Views feature barrel export
 */

// Stores
export {
  useViewStore,
  useViewMode,
  useGanttState,
  useKanbanState,
  useIsGanttRowExpanded,
  useKanbanGroupBy,
  useCustomStages,
} from './stores/useViewStore';

// Types
export type {
  ViewMode,
  GanttZoomLevel,
  KanbanGroupBy,
  GanttViewState,
  KanbanViewState,
  ViewStoreState,
  ViewStoreActions,
} from './stores/useViewStore';

// Kanban View Components (Task 3)
export {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  useKanbanData,
} from './components/KanbanView';

export type {
  KanbanCardData,
  KanbanColumnData,
  UseKanbanDataReturn,
  KanbanBoardProps,
  KanbanColumnProps,
  KanbanCardProps,
} from './components/KanbanView';

// Gantt View Components (Task 4)
export { GanttChart, useGanttData } from './components/GanttView';

export type {
  GanttTask,
  GanttLink,
  UnscheduledTask,
  UseGanttDataReturn,
  GanttChartProps,
} from './components/GanttView';

// Components to be implemented:
export { ViewSwitcher } from './components/ViewSwitcher';
export { ViewContainer } from './components/ViewContainer';
