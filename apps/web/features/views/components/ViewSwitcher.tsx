/**
 * Story 2.3: ViewSwitcher Component (Task 5.1)
 * Toggle between Graph, Kanban, and Gantt views
 */

'use client';

import React from 'react';
import { ListTree, KanbanSquare, GanttChart } from 'lucide-react';
import { useViewMode, useViewStore } from '../stores/useViewStore';
import type { ViewMode } from '../stores/useViewStore';

export interface ViewSwitcherProps {
  /** Optional override for current view mode */
  currentMode?: ViewMode;
  /** Optional handler for mode changes (falls back to store) */
  onModeChange?: (mode: ViewMode) => void;
  /** Disable interactions (e.g., while loading) */
  isLoading?: boolean;
}

/**
 * ViewSwitcher - UI component for switching between view projections
 */
export function ViewSwitcher({
  currentMode,
  onModeChange,
  isLoading = false,
}: ViewSwitcherProps) {
  const storeMode = useViewMode();
  const { setViewMode } = useViewStore();
  const mode = currentMode ?? storeMode;

  const handleModeChange = (nextMode: ViewMode) => {
    onModeChange?.(nextMode);
    if (!onModeChange) {
      setViewMode(nextMode);
    }
  };

  return (
    <div
      className="flex items-center gap-1 px-2 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg"
      data-testid="view-switcher"
    >
      {/* Graph/脑图 button */}
      <button
        onClick={() => handleModeChange('graph')}
        disabled={isLoading}
        className={`
          flex-shrink-0 px-3 py-1.5 rounded-md transition-all duration-200 flex items-center gap-2
          ${mode === 'graph'
            ? 'bg-gradient-to-r from-slate-600 to-slate-800 text-white shadow-[0_0_16px_rgba(15,23,42,0.4)]'
            : 'text-gray-500 hover:bg-gray-100/60 hover:text-gray-800'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        data-testid="view-graph"
        data-active={mode === 'graph'}
        title="脑图视图"
      >
        <ListTree className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium whitespace-nowrap">脑图</span>
      </button>

      {/* Kanban/看板 button */}
      <button
        onClick={() => handleModeChange('kanban')}
        disabled={isLoading}
        className={`
          flex-shrink-0 px-3 py-1.5 rounded-md transition-all duration-200 flex items-center gap-2
          ${mode === 'kanban'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.35)]'
            : 'text-gray-500 hover:bg-gray-100/60 hover:text-gray-800'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        data-testid="view-kanban"
        data-active={mode === 'kanban'}
        title="看板视图"
      >
        <KanbanSquare className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium whitespace-nowrap">看板</span>
      </button>

      {/* Gantt/甘特 button */}
      <button
        onClick={() => handleModeChange('gantt')}
        disabled={isLoading}
        className={`
          flex-shrink-0 px-3 py-1.5 rounded-md transition-all duration-200 flex items-center gap-2
          ${mode === 'gantt'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_0_18px_rgba(59,130,246,0.45)]'
            : 'text-gray-500 hover:bg-gray-100/60 hover:text-gray-800'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        data-testid="view-gantt"
        data-active={mode === 'gantt'}
        title="甘特视图"
      >
        <GanttChart className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium whitespace-nowrap">甘特</span>
      </button>
    </div>
  );
}

export default ViewSwitcher;
