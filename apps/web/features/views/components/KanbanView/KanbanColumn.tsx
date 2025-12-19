/**
 * Story 2.3: KanbanColumn Component
 * Sortable column for the Kanban board with droppable area
 *
 * Design: Subtle transparent columns with rounded corners
 * - Column header with count badge
 * - Scrollable card container
 * - Drop indicator when dragging over
 */

'use client';

import React, { memo } from 'react';
import {
  useDroppable,
} from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard';
import type { KanbanColumnData, KanbanCardData } from './useKanbanData';

// ==========================================
// Type Definitions
// ==========================================

export interface KanbanColumnProps {
  /** Column data */
  column: KanbanColumnData;
  /** Currently dragged card ID (for visual feedback) */
  activeId?: string | null;
  /** Click handler for card */
  onCardClick?: (card: KanbanCardData) => void;
  /** Whether columns should stretch to fill available width */
  isFullWidth?: boolean;
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get column header color based on column ID
 */
function getColumnColor(columnId: string): { bg: string; border: string; text: string } {
  switch (columnId) {
    case 'todo':
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
      };
    case 'in-progress':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
      };
    case 'done':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
      };
    default:
      // Custom stages use a subtle purple
      return {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
      };
  }
}

// ==========================================
// Component
// ==========================================

/**
 * KanbanColumn - Droppable column with sortable cards
 *
 * Features:
 * - Header with title and card count
 * - Droppable area for card reordering
 * - Visual feedback when dragging over
 * - Vertical list sorting strategy
 */
function KanbanColumnBase({ column, activeId, onCardClick, isFullWidth }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  const colors = getColumnColor(column.id);

  return (
    <div
      className={`
        flex flex-col
        ${isFullWidth ? 'flex-1 min-w-[280px]' : 'w-72 min-w-72 max-w-72'}
        bg-white rounded-xl
        border border-gray-200/80
        shadow-sm
        ${isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
        transition-all duration-200
      `}
      data-testid={`kanban-column-${column.id}`}
    >
      {/* Column Header */}
      <div
        className={`
          flex items-center justify-between
          px-3 py-2.5
          rounded-t-xl
          ${colors.bg}
          border-b ${colors.border}
        `}
      >
        <h3 className={`font-semibold text-sm ${colors.text}`}>{column.title}</h3>
        <span
          className={`
            inline-flex items-center justify-center
            w-6 h-6 rounded-full
            text-xs font-medium
            ${colors.bg} ${colors.text}
            border ${colors.border}
          `}
        >
          {column.cards.length}
        </span>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 overflow-y-auto
          p-2
          min-h-[200px]
          ${isOver ? 'bg-blue-50/30' : ''}
          transition-colors duration-200
        `}
        data-testid={`kanban-dropzone-${column.id}`}
      >
        {column.cards.length > 0 ? (
          column.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              isDragging={activeId === card.id}
              onClick={onCardClick}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
            无任务
          </div>
        )}
      </div>
    </div>
  );
}

// Story 2.3: Memoize KanbanColumn to prevent unnecessary re-renders
export const KanbanColumn = memo(KanbanColumnBase);
KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;
