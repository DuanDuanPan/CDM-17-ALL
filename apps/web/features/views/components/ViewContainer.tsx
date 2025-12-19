/**
 * Story 2.3: ViewContainer Component (Task 5.3)
 * Renders the active view projection based on ViewStore
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { Graph } from '@antv/x6';
import type { CollabUser, UseCollaborationReturn } from '@/hooks/useCollaboration';
import { useViewMode } from '../stores/useViewStore';
import { GraphComponent } from '@/components/graph';
import type { KanbanBoardProps } from '@/features/views/components/KanbanView/KanbanBoard';
import type { GanttChartProps } from '@/features/views/components/GanttView/GanttChart';

const KanbanBoard = dynamic<KanbanBoardProps>(
  () => import('@/features/views/components/KanbanView').then((mod) => mod.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-gray-500">
        正在加载看板视图...
      </div>
    ),
  }
);

const GanttChart = dynamic<GanttChartProps>(
  () => import('@/features/views/components/GanttView').then((mod) => mod.GanttChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-gray-500">
        正在加载甘特视图...
      </div>
    ),
  }
);

export interface ViewContainerProps {
  /** Collaboration graph ID (shared across views) */
  graphId: string;
  /** Current user for collaboration */
  user: CollabUser;
  /** Callback when a node is selected in any view */
  onNodeSelect?: (nodeId: string | null) => void;
  /** Callback when graph is ready (Graph view only) */
  onGraphReady?: (graph: Graph | null) => void;
  /** Shared collaboration session */
  collaboration?: Pick<
    UseCollaborationReturn,
    | 'yDoc'
    | 'isConnected'
    | 'isSynced'
    | 'syncStatus'
    | 'remoteUsers'
    | 'updateCursor'
    | 'updateSelectedNode'
  >;
  /** Graph view props */
  currentLayout?: Parameters<typeof GraphComponent>[0]['currentLayout'];
  onLayoutChange?: Parameters<typeof GraphComponent>[0]['onLayoutChange'];
  onGridToggle?: Parameters<typeof GraphComponent>[0]['onGridToggle'];
  gridEnabled?: boolean;
  /** Dependency mode (Graph view only) */
  isDependencyMode?: boolean;
  onExitDependencyMode?: () => void;
}

export function ViewContainer({
  graphId,
  user,
  onNodeSelect,
  onGraphReady,
  collaboration,
  currentLayout,
  onLayoutChange,
  onGridToggle,
  gridEnabled,
  isDependencyMode,
  onExitDependencyMode,
}: ViewContainerProps) {
  const viewMode = useViewMode();

  if (viewMode === 'kanban') {
    return (
      <KanbanBoard
        yDoc={collaboration?.yDoc ?? null}
        onCardClick={(card) => onNodeSelect?.(card.id)}
      />
    );
  }

  if (viewMode === 'gantt') {
    return (
      <GanttChart
        yDoc={collaboration?.yDoc ?? null}
        onTaskClick={(taskId) => onNodeSelect?.(taskId)}
      />
    );
  }

  return (
    <GraphComponent
      onNodeSelect={onNodeSelect}
      onLayoutChange={onLayoutChange}
      onGridToggle={onGridToggle}
      currentLayout={currentLayout}
      gridEnabled={gridEnabled}
      onGraphReady={onGraphReady}
      graphId={graphId}
      user={user}
      collaboration={collaboration}
      isDependencyMode={isDependencyMode}
      onExitDependencyMode={onExitDependencyMode}
    />
  );
}

export default ViewContainer;
