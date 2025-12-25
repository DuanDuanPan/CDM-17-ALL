/**
 * Story 2.3: KanbanBoard Component
 * Main Kanban board container with drag-and-drop context
 *
 * Philosophy: This is a PROJECTION of Yjs data.
 * - DndContext manages drag state
 * - onDragEnd updates Yjs via moveCard
 * - Yjs changes trigger React re-render automatically
 */

'use client';

import React, { useState, useCallback, memo } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  MouseSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import type * as Y from 'yjs';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { useKanbanData } from './useKanbanData';
import type { KanbanCardData } from './useKanbanData';
import {
  useViewStore,
  useKanbanGroupBy,
  useCustomStages,
} from '../../stores/useViewStore';

// ==========================================
// Type Definitions
// ==========================================

export interface KanbanBoardProps {
  /** Yjs document instance (from useCollaboration) */
  yDoc: Y.Doc | null;
  /** Callback when a card is clicked */
  onCardClick?: (card: KanbanCardData) => void;
}

// ==========================================
// Component
// ==========================================

/**
 * KanbanBoard - Main Kanban board with drag-and-drop functionality
 *
 * Features:
 * - Drag and drop cards between columns
 * - Group by status or customStage
 * - Show/hide completed tasks
 * - Real-time sync via Yjs
 *
 * @example
 * ```tsx
 * const { yDoc } = useCollaboration({ graphId, user });
 *
 * <KanbanBoard
 *   yDoc={yDoc}
 *   onCardClick={(card) => setSelectedNode(card.id)}
 * />
 * ```
 */
function KanbanBoardBase({ yDoc, onCardClick }: KanbanBoardProps) {
  // Kanban data from Yjs
  const { columns, totalTasks, moveCard } = useKanbanData(yDoc);

  // View state
  const groupBy = useKanbanGroupBy();
  const customStages = useCustomStages();
  const { setKanbanGroupBy, setShowCompleted, addCustomStage, removeCustomStage } = useViewStore();
  const kanbanState = useViewStore((state) => state.kanban);
  const [newStage, setNewStage] = useState('');

  // Drag state
  const [activeCard, setActiveCard] = useState<KanbanCardData | null>(null);

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required to start drag
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // Match pointer sensor for consistent UX
      },
    })
  );

  const handleAddStage = useCallback(() => {
    const trimmed = newStage.trim();
    if (!trimmed) return;
    addCustomStage(trimmed);
    setNewStage('');
  }, [newStage, addCustomStage]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const cardData = active.data.current?.card as KanbanCardData | undefined;

    if (cardData) {
      setActiveCard(cardData);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    void over;
  }, [groupBy]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveCard(null);

      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      if (!activeData || activeData.type !== 'card') return;

      // Determine target column
      let targetColumnId: string;

      if (overData?.type === 'column') {
        // Dropped directly on a column
        targetColumnId = over.id as string;
      } else if (overData?.type === 'card') {
        // Dropped on another card - find its column
        const targetCard = overData.card as KanbanCardData;
        if (groupBy === 'customStage') {
          targetColumnId = targetCard.customStage || '__unassigned__';
        } else {
          targetColumnId = targetCard.status;
        }
      } else {
        return;
      }

      // Get source card
      const sourceCard = activeData.card as KanbanCardData;

      // Determine source column
      const sourceColumnId =
        groupBy === 'customStage'
          ? sourceCard.customStage || '__unassigned__'
          : sourceCard.status;

      // Only move if column changed
      if (sourceColumnId !== targetColumnId) {
        moveCard(sourceCard.id, targetColumnId);
      }
    },
    [moveCard, groupBy]
  );

  // Loading state
  if (!yDoc) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        正在加载看板数据...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Toolbar - Premium glassmorphism style */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm z-10 sticky top-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            {/* Group By Toggle */}
            <div className="flex items-center gap-2 px-1 py-1 bg-gray-100/80 rounded-lg p-1">
              <button
                onClick={() => setKanbanGroupBy('status')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${groupBy === 'status'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                状态视图
              </button>
              <button
                onClick={() => setKanbanGroupBy('customStage')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${groupBy === 'customStage'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                阶段视图
              </button>
            </div>

            {/* Show Completed Toggle */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`
                w-9 h-5 rounded-full p-1 transition-colors duration-200 ease-in-out
                ${kanbanState.showCompleted ? 'bg-blue-500' : 'bg-gray-200'}
              `}>
                <div className={`
                  w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out
                  ${kanbanState.showCompleted ? 'translate-x-4' : 'translate-x-0'}
                `} />
              </div>
              <input
                type="checkbox"
                checked={kanbanState.showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="hidden"
              />
              <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                显示已完成
              </span>
            </label>
          </div>

          {/* Custom Stage Management */}
          {groupBy === 'customStage' && (
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <div className="flex items-center gap-2">
                <input
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStage();
                    }
                  }}
                  placeholder="新阶段名称..."
                  className="w-32 text-xs border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                />
                <button
                  onClick={handleAddStage}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  添加
                </button>
              </div>
              {customStages.map((stage) => (
                <span
                  key={stage}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white border border-gray-100 text-gray-600 shadow-sm"
                >
                  {stage}
                  <button
                    type="button"
                    onClick={() => removeCustomStage(stage)}
                    className="text-gray-400 hover:text-red-500 transition-colors w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-50"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Task Count */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-100 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-gray-600">
            总任务 <span className="font-bold text-gray-900 ml-1">{totalTasks}</span>
          </span>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 h-full min-h-0 min-w-max pb-2">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                activeId={activeCard?.id}
                onCardClick={onCardClick}
                isFullWidth={columns.length <= 4}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}>
            {activeCard && (
              <div className="opacity-90 rotate-2 scale-105 cursor-grabbing">
                <KanbanCard card={activeCard!} isDragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

export const KanbanBoard = memo(
  KanbanBoardBase,
  (prev, next) => prev.yDoc === next.yDoc && prev.onCardClick === next.onCardClick
);

KanbanBoard.displayName = 'KanbanBoard';

export default KanbanBoard;
