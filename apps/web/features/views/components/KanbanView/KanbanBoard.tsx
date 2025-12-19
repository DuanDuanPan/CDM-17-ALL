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
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

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

    if (over) {
      // Get the column ID being dragged over
      const overData = over.data.current;
      if (overData?.type === 'column') {
        setActiveColumnId(over.id as string);
      } else if (overData?.type === 'card') {
        // Find the column containing this card
        const card = overData.card as KanbanCardData;
        if (groupBy === 'customStage') {
          setActiveColumnId(card.customStage || '__unassigned__');
        } else {
          setActiveColumnId(card.status);
        }
      }
    } else {
      setActiveColumnId(null);
    }
  }, [groupBy]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveCard(null);
      setActiveColumnId(null);

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
    <div className="flex flex-col h-full">
      {/* Toolbar - Premium glassmorphism style */}
      <div className="flex items-start justify-between px-4 py-2.5 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            {/* Group By Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 rounded-lg">
              <span className="text-xs font-medium text-gray-500">分组:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setKanbanGroupBy('status')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 ${groupBy === 'status'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                >
                  状态
                </button>
                <button
                  onClick={() => setKanbanGroupBy('customStage')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 ${groupBy === 'customStage'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                >
                  阶段
                </button>
              </div>
            </div>

            {/* Show Completed Toggle */}
            <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 rounded-lg cursor-pointer hover:bg-gray-200/60 transition-colors">
              <input
                type="checkbox"
                checked={kanbanState.showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs font-medium text-gray-600">显示已完成</span>
            </label>
          </div>

          {/* Custom Stage Management */}
          {groupBy === 'customStage' && (
            <div className="flex items-center gap-2 flex-wrap">
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
                  placeholder="新增阶段"
                  className="w-28 text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddStage}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  添加
                </button>
              </div>
              {customStages.map((stage) => (
                <span
                  key={stage}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  {stage}
                  <button
                    type="button"
                    onClick={() => removeCustomStage(stage)}
                    className="text-emerald-600 hover:text-emerald-800"
                    aria-label={`移除阶段 ${stage}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Task Count */}
        <div className="text-xs text-gray-500 px-3 py-1.5 bg-gray-100/60 rounded-lg">
          共 <span className="font-semibold text-gray-700">{totalTasks}</span> 个任务
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 bg-gray-100/50">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-h-0">
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

          {/* Drag Overlay - Shows card being dragged */}
          <DragOverlay>
            {activeCard && (
              <div className="opacity-90 rotate-2">
                <KanbanCard card={activeCard} isDragging />
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
